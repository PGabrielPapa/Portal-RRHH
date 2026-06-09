// ═══════════════════════════════════════════════════════════════════════
// ═══   LEGAJO DIGITAL: MIS EVALUACIONES (empleado)                    ═══
// ═══════════════════════════════════════════════════════════════════════

function toggleMisEvaluaciones(){
  const w = document.getElementById('mis-evaluaciones-wrap');
  if(!w) return;
  const abierto = w.style.display === 'block';
  if(!abierto) renderMisEvaluaciones();
  w.style.display = abierto ? 'none' : 'block';
}

async function renderMisEvaluaciones(){
  const cont = document.getElementById('mis-evaluaciones-content');
  if(!cont || !currentUser) return;
  const leg = currentUser.emp.leg;
  const evals = await getEvaluaciones();
  // Solo las registradas van al legajo digital (visible al empleado)
  const mias = evals.filter(e=>e.leg===leg && e.estado==='registrada');
  if(!mias.length){
    cont.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Aún no tenés evaluaciones registradas en tu legajo digital</div>';
    return;
  }
  mias.sort((a,b)=>(b.fechaRegistro||'').localeCompare(a.fechaRegistro||''));

  // Helper: calcula promedio de calificaciones por sección
  const promedioSec = (datosSec)=>{
    if(!datosSec) return null;
    const vals = Object.values(datosSec).map(v=>parseFloat(v.calif)).filter(n=>!isNaN(n));
    if(!vals.length) return null;
    return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
  };

  cont.innerHTML = mias.map(ev=>{
    const d = ev.datos || {};
    const pT = promedioSec(d.tecnicas);
    const pI = promedioSec(d.interpersonales);
    const pD = promedioSec(d.desempeno);
    const pL = promedioSec(d.liderazgo);
    const badge = (lbl, prom) => prom==null ? '' : `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:var(--bg2);border:1px solid var(--border);color:var(--t2);font-family:var(--font-mono)">${lbl}: <strong style="color:${prom>=4?'var(--green)':prom>=3?'var(--yellow)':'var(--red)'}">${prom}</strong>/5</span>`;
    return `<div style="border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;background:var(--bg2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${_tipoLabel(ev.tipo, ev.anio)}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">Registrada el ${fechaDDMMYYYY(ev.fechaRegistro)} · Evaluada por ${ev.evaluadorNom||'—'}</div>
        </div>
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 12px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver completa</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        ${badge('Técnicas', pT)}
        ${badge('Interpersonales', pI)}
        ${badge('Desempeño', pD)}
        ${pL ? badge('Liderazgo', pL) : ''}
      </div>
    </div>`;
  }).join('');
}

async function calcularDiasAnual(){
  const desde = document.getElementById('la-desde')?.value;
  const hasta  = document.getElementById('la-hasta')?.value;
  const wrap   = document.getElementById('la-dias-wrap');
  const num    = document.getElementById('la-dias-num');
  if(!desde || !hasta || hasta < desde){ if(wrap) wrap.style.display='none'; return; }

  const dias = Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1;

  // Calcular días que corresponden según antigüedad
  const ing  = currentUser?.emp?.ing || '';
  const anio = new Date().getFullYear();
  const diasCorresponden = await calcularDiasVacaciones(ing, anio);

  if(num) num.textContent = `${dias} día${dias!==1?'s':''}`;
  if(wrap) wrap.style.display = 'block';

  // Advertencia si excede los días correspondientes
  let avisoEl = document.getElementById('la-dias-aviso');
  if(!avisoEl){
    avisoEl = document.createElement('div');
    avisoEl.id = 'la-dias-aviso';
    avisoEl.style.cssText = 'margin-top:8px;padding:10px 14px;border-radius:var(--r);font-size:12px;';
    wrap.appendChild(avisoEl);
  }
  if(dias > diasCorresponden){
    avisoEl.style.display='block';
    avisoEl.style.background='rgba(239,68,68,.07)';
    avisoEl.style.border='1px solid rgba(239,68,68,.25)';
    avisoEl.style.color='var(--red)';
    avisoEl.innerHTML=`⚠ Superás los <strong>${diasCorresponden} días</strong> que te corresponden según tu antigüedad (Art. 150, Ley 20.744).`;
  } else {
    avisoEl.style.display='block';
    avisoEl.style.background='rgba(34,197,94,.06)';
    avisoEl.style.border='1px solid rgba(34,197,94,.2)';
    avisoEl.style.color='var(--green)';
    avisoEl.innerHTML=`✓ Te corresponden <strong>${diasCorresponden} días</strong> de vacaciones según tu antigüedad.`;
  }
}

async function solicitarLicenciaAnual(){
  const desde = document.getElementById('la-desde').value;
  const hasta  = document.getElementById('la-hasta').value;
  const obs    = document.getElementById('la-obs').value.trim();
  if(!desde){ toast('⚠ Ingresá la fecha desde','var(--yellow)'); return; }
  if(!hasta){ toast('⚠ Ingresá la fecha hasta','var(--yellow)'); return; }
  if(hasta < desde){ toast('⚠ La fecha hasta debe ser posterior a la fecha desde','var(--yellow)'); return; }
  const dias   = Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1;
  const emp    = currentUser.emp;
  const vInfo  = getValidador(emp);
  const btn    = document.querySelector('#la-form-card .btn-primary');
  if(btn){ btn.disabled=true; btn.textContent='Enviando...'; }

  await addLicAnual({
    leg:      emp.leg,
    nom:      emp.nom,
    emp:      emp.emp,
    lugar:    emp.lugar || '',
    area:     vInfo?.area || '',
    validador:vInfo?.validador || 'RR.HH.',
    desde,
    hasta,
    dias,
    obs,
    estado:   'pendiente',
    solicitadoEl:   new Date().toLocaleDateString('es-AR'),
    solicitadoHora: new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
  });

  if(btn){ btn.disabled=false; btn.textContent='📤 Enviar solicitud'; }
  document.getElementById('la-form-card').style.display = 'none';
  document.getElementById('la-confirmacion').style.display = 'block';
  renderMisLicAnuales();
  // Badge RRHH
  actualizarRRHHBadges();
}

async function nuevaSolicitudAnual(){
  const form = document.getElementById('la-form-card');
  const conf = document.getElementById('la-confirmacion');
  if(form) form.style.display='block';
  if(conf) conf.style.display='none';
  const dW = document.getElementById('la-dias-wrap');
  if(dW) dW.style.display='none';
  ['la-desde','la-hasta','la-obs'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  // Mostrar info de días correspondientes
  const ing  = currentUser?.emp?.ing || '';
  const anio = new Date().getFullYear();
  const dias = await calcularDiasVacaciones(ing, anio);
  const infoEl = document.getElementById('la-info-reglamento');
  if(infoEl) infoEl.innerHTML = `🏖 Te corresponden <strong>${dias} días corridos</strong> de licencia anual (antigüedad al 31/12/${anio} — Art. 150, Ley 20.744). <span style="color:var(--t3)">Período: 1° oct → 30 abr. Las vacaciones deben comenzar en día lunes.</span>`;
}

async function renderMisLicAnuales(){
  const div = document.getElementById('list-mis-lic-anuales');
  if(!div) return;
  const todos = await getLicAnuales();
  const mias  = todos.filter(l=>l.leg===currentUser?.emp?.leg).sort((a,b)=>b.id-a.id);
  if(!mias.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">🏖</div><div class="empty-text">No tenés solicitudes de licencia anual</div></div>';
    return;
  }
  const fmtD = iso => { if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  const estadoColor = e => e==='aprobada'?'var(--green)':e==='rechazada'?'var(--red)':'var(--yellow)';
  const estadoBorder = e => e==='aprobada'?'rgba(34,197,94,.3)':e==='rechazada'?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)';
  const estadoLabel = e => ({pendiente:'⏳ Pendiente',aprobada_gerente:'✓ Aprobada por Gerente',aprobada:'✅ Aprobada',rechazada:'✕ Rechazada'}[e]||e);
  div.innerHTML = `<div class="card" style="padding:0;overflow:hidden">` +
    mias.map(l=>`
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <div style="font-size:13px;font-weight:500;color:var(--t1);margin-bottom:4px">
              📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong>
            </div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
              Solicitado: ${l.solicitadoEl} ${l.solicitadoHora}
              ${l.obs?` · ${l.obs}`:''}
            </div>
            ${l.comentario?`<div style="font-size:11px;color:var(--t3);margin-top:3px;font-style:italic">Comentario: ${l.comentario}</div>`:''}
          </div>
          <span style="flex-shrink:0;font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${estadoBorder(l.estado)};color:${estadoColor(l.estado)};white-space:nowrap">
            ${estadoLabel(l.estado)}
          </span>
        </div>
      </div>`).join('') + `</div>`;
}

// Panel Gerente: licencias anuales de su área
async function renderLicAnualGerente(){
  const div = document.getElementById('list-lic-anual-gerente');
  if(!div || !currentUser) return;
  const q      = (document.getElementById('ger-anual-search')?.value||'').toLowerCase();
  const estado = document.getElementById('ger-anual-estado')?.value||'';
  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');

  const empleadosACargo = new Set(
    getNomina().filter(e=>{
      const v = getValidador(e);
      if(!v||!v.validador) return false;
      if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
      return v.validador.toUpperCase() === gerNom;
    }).map(e=>e.leg)
  );

  const todos = await getLicAnuales();
  let lista = todos.filter(l=>empleadosACargo.has(l.leg));
  if(q)      lista = lista.filter(l=>(l.nom||'').toLowerCase().includes(q));
  if(estado) lista = lista.filter(l=>l.estado===estado);
  lista.sort((a,b)=>b.id-a.id);

  if(!lista.length){
    div.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">No hay solicitudes de licencia anual para tu área.</div>';
    return;
  }
  const fmtD = iso=>{ if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  // Precalcular días de vacaciones para cada empleado (calcularDiasVacaciones es async)
  const _anioRef = new Date().getFullYear();
  await Promise.all(lista.map(async l => {
    l._diasCorresponden = await calcularDiasVacaciones(l.ing||'', _anioRef);
  }));
  div.innerHTML = lista.map(l=>`
    <div data-lic-leg="${l.leg||''}" data-lic-desde="${l.desde||''}" data-lic-hasta="${l.hasta||''}" data-lic-estado="${l.estado||''}" style="padding:14px 18px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom}</span>
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">${l.emp} · ${l.lugar}</span>
          </div>
          <div style="font-size:12px;color:var(--t2);margin-bottom:4px">
            📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong>
            · <span style="color:var(--t3)">Corresponden: ${l._diasCorresponden||14} días</span>
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
            Solicitado: ${l.solicitadoEl} ${l.solicitadoHora}${l.obs?' · '+l.obs:''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${l.estado==='aprobada'||l.estado==='aprobada_gerente'?'rgba(34,197,94,.3)':l.estado==='rechazada'?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)'};color:${l.estado==='aprobada'||l.estado==='aprobada_gerente'?'var(--green)':l.estado==='rechazada'?'var(--red)':'var(--yellow)'}">
            ${l.estado==='aprobada_gerente'?'✓ Aprobada':l.estado==='pendiente'?'⏳ Pendiente':l.estado==='rechazada'?'✕ Rechazada':'✅ Aprobada'}
          </span>
          ${l.estado==='pendiente'?`
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--green);border-color:rgba(34,197,94,.3)" onclick="aprobarLicAnualGerente(${l.id})">✓ Aprobar</button>
            <button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="rechazarLicAnualGerente(${l.id})">✕ Rechazar</button>
          </div>`:''}
          ${(l.estado==='aprobada' || l.estado==='aprobada_gerente') ? `<button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="imprimirComprobanteLicencia(${l.id}, 'anual')" title="Comprobante oficial firmado">📄 Comprobante</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

// ═════════════════════════════════════════════════════════════
// LICENCIAS ESPECIALES (sin goce · maternidad · excedencia)
// ═════════════════════════════════════════════════════════════

function leOnTipoChange(){
  const tipo  = document.getElementById('le-tipo').value;
  const meta  = TIPOS_LIC_ESPECIAL[tipo];
  const mWrap = document.getElementById('le-motivo-wrap');
  const desde = document.getElementById('le-desde');
  const hasta = document.getElementById('le-hasta');

  if(!meta){ if(mWrap) mWrap.style.display='none'; return; }

  // Motivo solo requerido en sin_goce
  if(mWrap) mWrap.style.display = meta.requiereMotivo ? 'block' : 'none';

  // Sugerir fechas: si es maternidad, auto-completar 90 días desde hoy; excedencia 90 días
  if(tipo === 'maternidad' && desde.value){
    const d = new Date(desde.value);
    d.setDate(d.getDate() + 89);
    hasta.value = d.toISOString().slice(0,10);
  }
  leCalcDias();
}

function leCalcDias(){
  const tipo  = document.getElementById('le-tipo').value;
  const desde = document.getElementById('le-desde').value;
  const hasta = document.getElementById('le-hasta').value;
  const wrap  = document.getElementById('le-dias-wrap');
  const num   = document.getElementById('le-dias-num');
  const aviso = document.getElementById('le-dias-aviso');
  if(!desde || !hasta || hasta < desde){ if(wrap) wrap.style.display='none'; return; }
  const dias = Math.round((new Date(hasta)-new Date(desde))/86400000)+1;
  num.textContent = `${dias} día${dias!==1?'s':''}` + (dias>=30 ? ` (~${(dias/30).toFixed(1)} meses)` : '');
  wrap.style.display='block';
  if(aviso) aviso.style.display='none';
  const meta = TIPOS_LIC_ESPECIAL[tipo];
  if(meta && (dias < meta.minDias || dias > meta.maxDias) && aviso){
    aviso.textContent = `⚠ ${meta.label} admite entre ${meta.minDias} y ${meta.maxDias} días`;
    aviso.style.display='inline';
  }
}

async function solicitarLicEspecial(){
  const tipo    = document.getElementById('le-tipo').value;
  const desde   = document.getElementById('le-desde').value;
  const hasta   = document.getElementById('le-hasta').value;
  const motivo  = document.getElementById('le-motivo').value.trim();
  if(!tipo)  { toast('⚠ Seleccioná el tipo de licencia','var(--yellow)'); return; }
  if(!desde) { toast('⚠ Ingresá la fecha desde','var(--yellow)'); return; }
  if(!hasta) { toast('⚠ Ingresá la fecha hasta','var(--yellow)'); return; }
  if(hasta < desde){ toast('⚠ La fecha hasta debe ser posterior','var(--yellow)'); return; }
  const dias = Math.round((new Date(hasta)-new Date(desde))/86400000)+1;
  const meta = TIPOS_LIC_ESPECIAL[tipo];
  if(dias < meta.minDias || dias > meta.maxDias){
    toast(`⚠ ${meta.label} admite entre ${meta.minDias} y ${meta.maxDias} días`,'var(--red)');
    return;
  }
  if(meta.requiereMotivo && !motivo){
    toast('⚠ Ingresá el motivo de la licencia','var(--yellow)'); return;
  }

  const emp  = currentUser.emp;
  const area = getValidador(emp)?.area || '';

  await addLicenciaEspecial({
    leg:emp.leg, nom:emp.nom, emp:emp.emp, lugar:emp.lugar||'', area,
    tipoLicencia: tipo,
    desde, hasta, dias,
    motivo: motivo || '',
    estado: 'pendiente',
    presentadoEl: new Date().toLocaleDateString('es-AR'),
    presentadoHora: new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
  });

  document.getElementById('le-form-card').style.display='none';
  const conf = document.getElementById('le-confirmacion');
  const msg  = document.getElementById('le-conf-msg');
  if(msg){
    const flujo = meta.flujo === 'autorizacion'
      ? 'Tu gerente deberá <strong>autorizar</strong> la solicitud y luego RR.HH. la <strong>aprobará</strong>.'
      : 'Tu gerente <strong>tomará conocimiento</strong> y luego RR.HH. <strong>registrará</strong> la licencia.';
    msg.innerHTML = `Solicitaste <strong>${meta.label}</strong> por ${dias} día${dias!==1?'s':''}.<br>${flujo}`;
  }
  conf.style.display='block';
  renderMisLicEspeciales();
  actualizarRRHHBadges && actualizarRRHHBadges();
}

function leNuevo(){
  const form = document.getElementById('le-form-card');
  const conf = document.getElementById('le-confirmacion');
  if(form) form.style.display='block';
  if(conf) conf.style.display='none';
  ['le-tipo','le-desde','le-hasta','le-motivo'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const dW = document.getElementById('le-dias-wrap');  if(dW) dW.style.display='none';
  const mW = document.getElementById('le-motivo-wrap'); if(mW) mW.style.display='none';
}

async function renderMisLicEspeciales(){
  const div = document.getElementById('le-mis-solicitudes');
  if(!div) return;
  const todos = await getLicenciasEspeciales();
  const mias  = todos.filter(l=>l.leg===currentUser?.emp?.leg).sort((a,b)=>b.id-a.id);
  if(!mias.length){
    div.innerHTML='<div class="empty" style="padding:28px 16px"><div class="empty-icon">📋</div><div class="empty-text">No tenés solicitudes de licencia especial</div></div>';
    return;
  }
  const fmtD = iso => { if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  const labelEstado = l => {
    const flujo = TIPOS_LIC_ESPECIAL[l.tipoLicencia]?.flujo;
    return ({
      pendiente: flujo==='autorizacion' ? '⏳ Pend. Gerente' : '⏳ Pend. conoc. Gerente',
      aprobada_gerente: flujo==='autorizacion' ? '✓ Autorizada por Gerente · Pend. RR.HH.' : '✓ Gerente tomó conocimiento · Pend. RR.HH.',
      aprobada: flujo==='autorizacion' ? '✅ Aprobada por RR.HH.' : '✅ Registrada por RR.HH.',
      rechazada:'✕ Rechazada'
    }[l.estado]||l.estado);
  };
  const estadoColor = e => e==='aprobada'?'var(--green)':e==='rechazada'?'var(--red)':e==='aprobada_gerente'?'var(--accent2)':'var(--yellow)';
  const estadoBorder = e => e==='aprobada'?'rgba(34,197,94,.3)':e==='rechazada'?'rgba(239,68,68,.3)':e==='aprobada_gerente'?'rgba(61,127,255,.3)':'rgba(234,179,8,.3)';
  div.innerHTML = `<div class="card" style="padding:0;overflow:hidden">` +
    mias.map(l=>`
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:240px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:600;color:var(--t1)">${TIPOS_LIC_ESPECIAL[l.tipoLicencia]?.label||l.tipoLicencia}</span>
              <span style="font-size:10px;font-family:var(--font-mono);background:rgba(168,85,247,.08);color:rgb(168,85,247);padding:1px 8px;border-radius:10px;border:1px solid rgba(168,85,247,.25)">Sin goce</span>
            </div>
            <div style="font-size:12px;color:var(--t2);margin-bottom:2px">
              📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong>
            </div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
              Presentada: ${l.presentadoEl||'—'} ${l.presentadoHora||''}
            </div>
            ${l.motivo?`<div style="font-size:11px;color:var(--t3);margin-top:4px;font-style:italic">Motivo: ${l.motivo}</div>`:''}
            ${l.motivoRechazo?`<div style="font-size:11px;color:var(--red);margin-top:4px">Rechazo: ${l.motivoRechazo}</div>`:''}
          </div>
          <span style="font-size:10px;font-family:var(--font-mono);padding:3px 10px;border-radius:10px;border:1px solid ${estadoBorder(l.estado)};color:${estadoColor(l.estado)};white-space:nowrap">
            ${labelEstado(l)}
          </span>
        </div>
      </div>`).join('') + `</div>`;
}

// ── Panel Gerente: licencias especiales del área ──────────────
async function renderLicEspecialGerente(){
  const div = document.getElementById('ger-pane-especiales-list');
  if(!div) return;
  const q = (document.getElementById('ger-esp-search')?.value||'').toLowerCase();

  const nomina = getNomina().filter(e=>!e._deBaja&&!e.egreso);
  const empleadosACargo = new Set(
    nomina.filter(e => (getValidador(e)?.nom||'') === (currentUser?.emp?.nom||'')).map(e=>e.leg)
  );
  const todos = await getLicenciasEspeciales();
  let lista = todos.filter(l => empleadosACargo.has(l.leg));
  if(q) lista = lista.filter(l => (l.nom||'').toLowerCase().includes(q));
  lista.sort((a,b)=>b.id-a.id);

  // Badge gerente
  const badge = document.getElementById('ger-tab-especiales-badge');
  const pend = todos.filter(l=>empleadosACargo.has(l.leg) && l.estado==='pendiente').length;
  if(badge){ badge.style.display=pend?'inline-block':'none'; badge.textContent=pend; }

  if(!lista.length){
    div.innerHTML='<div style="padding:20px 18px;color:var(--t3);font-size:13px;text-align:center">No hay licencias especiales para tu área.</div>';
    return;
  }
  const fmtD = iso => { if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  div.innerHTML = lista.map(l=>{
    const meta = TIPOS_LIC_ESPECIAL[l.tipoLicencia] || {};
    const pending = l.estado === 'pendiente';
    const btnLabel = meta.flujo==='autorizacion' ? '✓ Autorizar' : '✓ Tomar conocimiento';
    const btnReject = meta.flujo==='autorizacion' ? '✕ Rechazar' : '';
    return `
      <div data-lic-leg="${l.leg||''}" data-lic-desde="${l.desde||''}" data-lic-hasta="${l.hasta||''}" data-lic-tipo="${l.tipoLicencia||''}" data-lic-estado="${l.estado||''}" style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:240px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom}</span>
              <span style="font-size:10px;font-family:var(--font-mono);background:rgba(168,85,247,.08);color:rgb(168,85,247);padding:1px 8px;border-radius:10px;border:1px solid rgba(168,85,247,.25)">${meta.label||l.tipoLicencia}</span>
              <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">Leg. ${legD(l.leg)} · ${l.emp}</span>
            </div>
            <div style="font-size:12px;color:var(--t2)">
              📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong> · Pres.: ${l.presentadoEl||''}
            </div>
            ${l.motivo?`<div style="font-size:11px;color:var(--t3);margin-top:4px;font-style:italic">Motivo: ${l.motivo}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${l.estado==='aprobada'?'rgba(34,197,94,.3)':l.estado==='rechazada'?'rgba(239,68,68,.3)':l.estado==='aprobada_gerente'?'rgba(61,127,255,.3)':'rgba(234,179,8,.3)'};color:${l.estado==='aprobada'?'var(--green)':l.estado==='rechazada'?'var(--red)':l.estado==='aprobada_gerente'?'var(--accent2)':'var(--yellow)'}">
              ${({pendiente:'⏳ Pendiente',aprobada_gerente:'✓ Pasó a RR.HH.',aprobada:'✅ Aprobada',rechazada:'✕ Rechazada'})[l.estado]||l.estado}
            </span>
            ${pending?`<div style="display:flex;gap:6px">
              <button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--green);border-color:rgba(34,197,94,.3)" onclick="aprobarLicEspGerente(${l.id})">${btnLabel}</button>
              ${btnReject?`<button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="rechazarLicEspGerente(${l.id})">${btnReject}</button>`:''}
            </div>`:''}
            ${(l.estado==='aprobada'||l.estado==='aprobada_gerente') ? `<button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="imprimirComprobanteLicencia(${l.id}, 'especial')" title="Comprobante oficial firmado">📄 Comprobante</button>`:''}
          </div>
        </div>
      </div>`;
  }).join('');
}

async function aprobarLicEspGerente(id){
  const todos = await getLicenciasEspeciales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'aprobada_gerente';
  l.aprobadoGerente = currentUser.emp.nom;
  l.aprobadoGerenteEl = new Date().toLocaleDateString('es-AR');
  await updateLicenciaEspecial(l);
  const meta = TIPOS_LIC_ESPECIAL[l.tipoLicencia];
  toast(meta.flujo==='autorizacion' ? '✓ Autorizada — pasa a RR.HH.' : '✓ Conocimiento tomado — pasa a RR.HH.','var(--green)');
  renderLicEspecialGerente();
  actualizarRRHHBadges && actualizarRRHHBadges();
}

async function rechazarLicEspGerente(id){
  const motivo = await showPrompt({titulo:'Rechazar licencia',mensaje:'Indicá el motivo del rechazo (se notificará al empleado).',placeholder:'Motivo del rechazo...',requerido:true,labelOk:'Rechazar'});
  if(!motivo) return;
  const todos = await getLicenciasEspeciales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'rechazada';
  l.motivoRechazo = motivo;
  l.rechazadoGerente = currentUser.emp.nom;
  l.rechazadoGerenteEl = new Date().toLocaleDateString('es-AR');
  await updateLicenciaEspecial(l);
  toast('Licencia rechazada','var(--red)');
  renderLicEspecialGerente();
}

// ── Panel RR.HH.: aprobación/registro final ──────────────────
async function renderLicEspecialRRHH(){
  const div = document.getElementById('rrhh-list-lic-esp');
  if(!div) return;
  const q = (document.getElementById('rrhh-esp-search')?.value||'').toLowerCase();
  const filtroEstado = document.getElementById('rrhh-esp-estado')?.value || '';
  const todos = await getLicenciasEspeciales();
  let lista = [...todos];
  if(q) lista = lista.filter(l => (l.nom||'').toLowerCase().includes(q) || (l.emp||'').toLowerCase().includes(q));
  if(filtroEstado) lista = lista.filter(l => l.estado===filtroEstado);
  lista.sort((a,b)=>b.id-a.id);

  if(!lista.length){
    div.innerHTML='<div style="padding:20px 18px;color:var(--t3);font-size:13px;text-align:center">Sin licencias especiales</div>';
    return;
  }
  const fmtD = iso => { if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  div.innerHTML = lista.map(l=>{
    const meta = TIPOS_LIC_ESPECIAL[l.tipoLicencia] || {};
    const readyRRHH = l.estado === 'aprobada_gerente';
    const btnLabel = meta.flujo==='autorizacion' ? '✓ Aprobar' : '✓ Registrar';
    return `
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:260px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom}</span>
              <span style="font-size:10px;font-family:var(--font-mono);background:rgba(168,85,247,.08);color:rgb(168,85,247);padding:1px 8px;border-radius:10px;border:1px solid rgba(168,85,247,.25)">${meta.label||l.tipoLicencia}</span>
            </div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:4px">
              Leg. ${legD(l.leg)} · ${l.emp} · ${l.area||''} · ${l.lugar||''}
            </div>
            <div style="font-size:12px;color:var(--t2)">
              📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong>
              ${l.aprobadoGerenteEl?` · <span style="color:var(--accent2)">Gerente: ${l.aprobadoGerente||''} (${l.aprobadoGerenteEl})</span>`:''}
            </div>
            ${l.motivo?`<div style="font-size:11px;color:var(--t3);margin-top:4px;font-style:italic">Motivo: ${l.motivo}</div>`:''}
            ${l.motivoRechazo?`<div style="font-size:11px;color:var(--red);margin-top:4px">Rechazo: ${l.motivoRechazo}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${l.estado==='aprobada'?'rgba(34,197,94,.3)':l.estado==='rechazada'?'rgba(239,68,68,.3)':l.estado==='aprobada_gerente'?'rgba(61,127,255,.3)':'rgba(234,179,8,.3)'};color:${l.estado==='aprobada'?'var(--green)':l.estado==='rechazada'?'var(--red)':l.estado==='aprobada_gerente'?'var(--accent2)':'var(--yellow)'}">
              ${({pendiente:'⏳ Pend. Gerente',aprobada_gerente:'✓ Pend. RR.HH.',aprobada:'✅ Aprobada',rechazada:'✕ Rechazada'})[l.estado]||l.estado}
            </span>
            ${readyRRHH?`<button class="btn btn-primary" style="font-size:11px;padding:4px 12px" onclick="aprobarLicEspRRHH(${l.id})">${btnLabel}</button>`:''}
            ${l.estado==='aprobada' ? `<button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="imprimirComprobanteLicencia(${l.id}, 'especial')" title="Comprobante oficial firmado">📄 Comprobante</button>`:''}
          </div>
        </div>
      </div>`;
  }).join('');
}

async function aprobarLicEspRRHH(id){
  const todos = await getLicenciasEspeciales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'aprobada';
  l.aprobadoRRHH = currentUser.emp.nom;
  l.aprobadoRRHHEl = new Date().toLocaleDateString('es-AR');
  await updateLicenciaEspecial(l);
  const meta = TIPOS_LIC_ESPECIAL[l.tipoLicencia];
  toast(meta.flujo==='autorizacion' ? '✅ Licencia aprobada — impactará en la liquidación' : '✅ Licencia registrada — impactará en la liquidación','var(--green)');
  renderLicEspecialRRHH();
}


async function aprobarLicAnualGerente(id){
  const todos = await getLicAnuales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'aprobada_gerente';
  l.aprobadoGerente = currentUser.emp.nom;
  l.aprobadoGerenteEl = new Date().toLocaleDateString('es-AR');
  await updateLicAnual(l);
  toast('✓ Licencia aprobada — pasa a RR.HH.','var(--green)');
  renderLicAnualGerente();
  actualizarRRHHBadges();
}

async function rechazarLicAnualGerente(id){
  const motivo = await showPrompt({titulo:'Rechazar licencia',mensaje:'Motivo del rechazo (obligatorio).',placeholder:'Motivo del rechazo...',requerido:true,labelOk:'Rechazar'});
  if(!motivo?.trim()){ toast('⚠ Ingresá el motivo','var(--yellow)'); return; }
  const todos = await getLicAnuales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'rechazada';
  l.comentario = motivo.trim();
  l.rechazadoPor = currentUser.emp.nom;
  await updateLicAnual(l);
  toast('Licencia rechazada','var(--red)');
  renderLicAnualGerente();
}

// Panel RR.HH.: todas las solicitudes
async function renderLicAnualRRHH(){
  const div = document.getElementById('list-lic-anual-rrhh');
  if(!div) return;
  const q      = (document.getElementById('rrhh-anual-search')?.value||'').toLowerCase();
  const estado = document.getElementById('rrhh-anual-estado')?.value||'';
  const todos  = await getLicAnuales();
  let lista = [...todos].sort((a,b)=>b.id-a.id);
  if(q)      lista = lista.filter(l=>(l.nom||'').toLowerCase().includes(q)||(l.emp||'').toLowerCase().includes(q));
  if(estado) lista = lista.filter(l=>l.estado===estado);
  if(!lista.length){
    div.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">No hay solicitudes de licencia anual.</div>';
    return;
  }
  const fmtD = iso=>{ if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  const estadoLabel = e=>({pendiente:'⏳ Pend. Gerente',aprobada_gerente:'✓ Aprobada por Gerente',aprobada:'✅ Aprobada',rechazada:'✕ Rechazada'}[e]||e);
  const estadoColor = e=> e==='aprobada'?'var(--green)':e==='aprobada_gerente'?'var(--accent2)':e==='rechazada'?'var(--red)':'var(--yellow)';
  const estadoBorder= e=> e==='aprobada'?'rgba(34,197,94,.3)':e==='aprobada_gerente'?'rgba(61,127,255,.3)':e==='rechazada'?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)';
  div.innerHTML = lista.map(l=>`
    <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom}</span>
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">${l.emp} · ${l.lugar}</span>
          </div>
          <div style="font-size:12px;color:var(--t2);margin-bottom:4px">
            📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong>
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
            Solicitado: ${l.solicitadoEl} · Gerente: ${l.validador||'—'}
            ${l.obs?' · '+l.obs:''}
          </div>
          ${l.comentario?`<div style="font-size:11px;color:var(--t3);margin-top:2px;font-style:italic">Comentario: ${l.comentario}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${estadoBorder(l.estado)};color:${estadoColor(l.estado)};white-space:nowrap">
            ${estadoLabel(l.estado)}
          </span>
          ${l.estado==='aprobada_gerente'?`
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--green);border-color:rgba(34,197,94,.3)" onclick="aprobarLicAnualRRHH(${l.id})">✅ Aprobar</button>
            <button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="rechazarLicAnualRRHH(${l.id})">✕ Rechazar</button>
          </div>`:''}
          ${l.estado==='aprobada' ? `<button class="btn btn-ghost" style="font-size:10px;padding:3px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="imprimirComprobanteLicencia(${l.id}, 'anual')" title="Comprobante oficial firmado">📄 Comprobante</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

async function aprobarLicAnualRRHH(id){
  const todos = await getLicAnuales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'aprobada';
  l.aprobadoRRHH = currentUser.emp.nom;
  l.aprobadoRRHHEl = new Date().toLocaleDateString('es-AR');
  await updateLicAnual(l);
  toast('✅ Licencia anual aprobada','var(--green)');
  renderLicAnualRRHH();
}

async function rechazarLicAnualRRHH(id){
  const motivo = await showPrompt({titulo:'Rechazar licencia',mensaje:'Motivo del rechazo (obligatorio).',placeholder:'Motivo del rechazo...',requerido:true,labelOk:'Rechazar'});
  if(!motivo?.trim()){ toast('⚠ Ingresá el motivo','var(--yellow)'); return; }
  const todos = await getLicAnuales();
  const l = todos.find(x=>x.id===id); if(!l) return;
  l.estado = 'rechazada';
  l.comentario = motivo.trim();
  l.rechazadoPor = currentUser.emp.nom;
  await updateLicAnual(l);
  toast('Licencia rechazada','var(--red)');
  renderLicAnualRRHH();
}


