// ─── NORMATIVA VACACIONES (Ley 20.744 — actualizada Ley 27.802 B.O. 06/03/2026) ───
const REGLAMENTO_VACACIONES = {
  // Días corridos según antigüedad al 31/12 del año en curso
  diasPorAntigüedad: [
    { hasta: 5,  dias: 14 },   // hasta 5 años: 14 días
    { hasta: 10, dias: 21 },   // 5-10 años:   21 días
    { hasta: 20, dias: 28 },   // 10-20 años:  28 días
    { hasta: Infinity, dias: 35 } // más de 20:  35 días
  ],
  // Reglas clave
  reglas: {
    periodoOtorgamiento: 'Entre el 1° de octubre y el 30 de abril del año siguiente',
    notificacionMinima:  30,   // días de anticipación mínima
    inicioLunes:         true, // deben comenzar en día lunes (o siguiente hábil)
    fraccionamientoMin:  7,    // tramos mínimos de 7 días si se fracciona
    proporcional:        '1 día por cada 20 días de trabajo efectivo (si no alcanza el mínimo)',
    omision:             'Si el empleador no notifica, el trabajador puede tomarlas y deben concluir antes del 31 de mayo',
    verano:              'Al menos 1 vez cada 3 años en temporada de verano',
    interrupcionEnfermedad: 'Si se interrumpen por enfermedad, el saldo se reprograma'
  }
};

/**
 * Calcula los días de vacaciones que corresponden según antigüedad.
 * @param {string} fechaIngreso - Formato DD/MM/YYYY o YYYY-MM-DD
 * @param {number} anio - Año de referencia (cálculo al 31/12 de ese año)
 * @returns {number} días corridos de vacaciones
 */
async function calcularDiasVacaciones(fechaIngreso, anio){
  if(!fechaIngreso) return 14;
  let partes;
  if(fechaIngreso.includes('-')){ partes = fechaIngreso.split('-'); }
  else { partes = fechaIngreso.split('/').reverse(); }
  const ingreso = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10)-1, parseInt(partes[2], 10));
  const al31dic = new Date(anio, 11, 31);
  const años = (al31dic - ingreso) / (1000 * 60 * 60 * 24 * 365.25);
  for(const t of REGLAMENTO_VACACIONES.diasPorAntigüedad){
    if(años < t.hasta) return t.dias;
  }
  return 35;
}

const REGLAMENTO_LICENCIAS = {
  'Enfermedad':                    { max: null,  tipo: 'corridos',  nota: '' },
  'Matrimonio':                    { max: 12,    tipo: 'corridos',  nota: '12 días corridos' },
  'Nacimiento de hijo':            { max: 2,     tipo: 'corridos',  nota: '2 días corridos (al menos 1 hábil)' },
  'Fallecimiento familiar directo':{ max: 4,     tipo: 'corridos',  nota: '4 días corridos — padres, cónyuge, hermanos/as' },
  'Fallecimiento familiar político':{ max: 2,    tipo: 'corridos',  nota: '2 días corridos (al menos 1 hábil) — abuelos, suegros, cuñados, hijastros' },
  'Examen':                        { max: 4,     tipo: 'corridos',  nota: 'Hasta 4 días corridos por examen (máx. 20 días por año)' },
  'Donación de sangre':            { max: 1,     tipo: 'corridos',  nota: '1 día' },
  'Trámites prematrimoniales':     { max: 1,     tipo: 'hábil',     nota: '1 día hábil' },
  'Matrimonio de hijo':            { max: 1,     tipo: 'hábil',     nota: '1 día hábil' },
  'Mudanza':                       { max: 2,     tipo: 'corridos',  nota: '2 días corridos' },
  'Trámites personales':           { max: null,  tipo: 'corridos',  nota: '' },
};

// ═══════════════════════════════════════════════════════════════
// SISTEMA UNIFICADO DE HISTORIAL DE LICENCIAS
// Consolida las 4 fuentes: comprobantes + informes + anuales + especiales
// Calcula saldos para vacaciones y licencia por examen
// ═══════════════════════════════════════════════════════════════

// Retorna array unificado ordenado cronológicamente (más reciente primero).
// Cada item: {tipo, desde, hasta, dias, estado, origen, motivo, id, _raw}
async function obtenerHistorialLicenciasEmpleado(leg, anio){
  const [comprobantes, informes, anuales, especiales] = await Promise.all([
    getLicencias(),
    getInformesLicencias(),
    getLicAnuales(),
    getLicenciasEspeciales()
  ]);

  const unif = [];
  const enAnio = (desde, hasta) => {
    if(!anio) return true;
    const y1 = (desde||'').slice(0,4);
    const y2 = (hasta||'').slice(0,4);
    return y1 === String(anio) || y2 === String(anio) || (y1 < String(anio) && y2 > String(anio));
  };
  const calcDias = (d, h) => {
    if(!d || !h) return 0;
    return Math.round((new Date(h+'T12:00:00') - new Date(d+'T12:00:00'))/86400000) + 1;
  };

  // 1. Comprobantes (con archivo)
  comprobantes.filter(l => l.leg === leg).forEach(l => {
    const desde = l.fecha_desde || l.desde || '';
    const hasta = l.fecha_hasta || l.hasta || '';
    if(!enAnio(desde, hasta)) return;
    unif.push({
      tipo:  l.tipo || 'Licencia',
      desde, hasta,
      dias:  l.dias || calcDias(desde, hasta),
      estado: l.estado || 'pendiente',
      origen: 'comprobante',
      motivo: l.motivo || '',
      id:     'c'+l.id,
      tieneArchivo: !!l.archivo,
      _raw: l
    });
  });

  // 2. Informes (sin archivo)
  informes.filter(l => l.leg === leg).forEach(l => {
    const desde = l.desde || '';
    const hasta = l.hasta || '';
    if(!enAnio(desde, hasta)) return;
    unif.push({
      tipo:  l.tipo || 'Licencia (informada)',
      desde, hasta,
      dias:  l.dias || calcDias(desde, hasta),
      estado: l.tomada_rrhh ? 'tomada_rrhh' : 'informada',
      origen: 'informe',
      motivo: l.motivo || '',
      id:     'i'+l.id,
      _raw: l
    });
  });

  // 3. Licencias anuales (vacaciones)
  anuales.filter(l => l.leg === leg).forEach(l => {
    if(!enAnio(l.desde, l.hasta)) return;
    unif.push({
      tipo:  'Licencia Anual (Vacaciones)',
      desde: l.desde, hasta: l.hasta,
      dias:  l.dias || calcDias(l.desde, l.hasta),
      estado: l.estado || 'pendiente',
      origen: 'anual',
      motivo: l.observaciones || l.motivo || '',
      id:     'a'+l.id,
      _raw: l
    });
  });

  // 4. Licencias especiales (sin goce, maternidad, excedencia)
  especiales.filter(l => l.leg === leg).forEach(l => {
    if(!enAnio(l.desde, l.hasta)) return;
    const meta = TIPOS_LIC_ESPECIAL[l.tipoLicencia] || {};
    unif.push({
      tipo:  `Lic. ${meta.label || l.tipoLicencia}`,
      desde: l.desde, hasta: l.hasta,
      dias:  l.dias || calcDias(l.desde, l.hasta),
      estado: l.estado || 'pendiente',
      origen: 'especial',
      motivo: l.motivo || '',
      id:     'e'+l.id,
      sinGoce: true,
      tipoEspecial: l.tipoLicencia,
      _raw: l
    });
  });

  return unif.sort((a,b) => (b.desde||'').localeCompare(a.desde||''));
}

// Calcula saldos por tipo de licencia con tope anual
async function calcularSaldoLicencias(leg, anio){
  anio = anio || new Date().getFullYear();
  const emp = getNomina().find(e => e.leg === leg);
  if(!emp) return null;

  const historial = await obtenerHistorialLicenciasEmpleado(leg, anio);

  // Solo considerar licencias aprobadas/registradas para saldo
  const esComputable = (h) => {
    if(h.origen === 'anual')     return h.estado === 'aprobada' || h.estado === 'aprobada_gerente';
    if(h.origen === 'especial')  return h.estado === 'aprobada' || h.estado === 'aprobada_gerente';
    if(h.origen === 'comprobante') return h.estado !== 'rechazada';
    if(h.origen === 'informe')   return true; // todas se consideran computadas
    return false;
  };

  // Vacaciones — calculadas por antigüedad al 31/12 del año
  const diasVacTotal   = calcularDiasVacaciones(emp.ing, anio);
  const diasVacTomados = historial
    .filter(h => h.origen === 'anual' && esComputable(h))
    .reduce((s,h) => s + (h.dias||0), 0);
  const diasVacPend = historial
    .filter(h => h.origen === 'anual' && h.estado === 'pendiente')
    .reduce((s,h) => s + (h.dias||0), 0);

  // Examen — Art. 158 LCT inc. d · máx. 20 días por año (4 días × 5 exámenes)
  const diasExamenTomados = historial
    .filter(h => (h.tipo||'').toLowerCase().includes('examen') && esComputable(h))
    .reduce((s,h) => s + (h.dias||0), 0);
  const EXAMEN_MAX_ANUAL = 20;

  // Matrimonio — 12 días corridos (1 vez por matrimonio, no por año)
  const diasMatrimonioTomados = historial
    .filter(h => (h.tipo||'').toLowerCase().includes('matrimonio') && !((h.tipo||'').toLowerCase().includes('hijo')) && esComputable(h))
    .reduce((s,h) => s + (h.dias||0), 0);

  return {
    anio,
    vacaciones: {
      total: diasVacTotal,
      tomados: diasVacTomados,
      pendientes: diasVacPend,
      saldo: diasVacTotal - diasVacTomados,
      saldoNetoConPend: diasVacTotal - diasVacTomados - diasVacPend
    },
    examen: {
      total: EXAMEN_MAX_ANUAL,
      tomados: diasExamenTomados,
      saldo: Math.max(0, EXAMEN_MAX_ANUAL - diasExamenTomados)
    },
    matrimonio: {
      total: 12,
      tomados: diasMatrimonioTomados,
      saldo: Math.max(0, 12 - diasMatrimonioTomados)
    }
  };
}

async function renderHistorialLicenciasUI(contenedorId, leg, opciones){
  opciones = opciones || {};
  const cont = document.getElementById(contenedorId);
  if(!cont) return;

  const anioActual = opciones.anio || new Date().getFullYear();
  const [historial, saldos] = await Promise.all([
    obtenerHistorialLicenciasEmpleado(leg, opciones.todosLosAnios ? null : anioActual),
    calcularSaldoLicencias(leg, anioActual)
  ]);

  const fmtD = iso => { if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  const estadoLabel = (h) => {
    const map = {
      pendiente: '⏳ Pendiente',
      aprobada: '✅ Aprobada',
      aprobada_gerente: '✓ Aprobada (Gerente)',
      rechazada: '✕ Rechazada',
      tomada_rrhh: '✓ Conocida por RR.HH.',
      informada: '📝 Informada',
      registrado: '✓ Registrado'
    };
    return map[h.estado] || h.estado;
  };
  const estadoColor = (h) => {
    if(h.estado === 'aprobada' || h.estado === 'tomada_rrhh' || h.estado === 'registrado') return 'var(--green)';
    if(h.estado === 'aprobada_gerente') return 'var(--accent2)';
    if(h.estado === 'rechazada') return 'var(--red)';
    return 'var(--yellow)';
  };
  const origenIcon = {comprobante:'📎', informe:'📝', anual:'🏖', especial:'📋'};

  // Cards de saldos
  const saldoCard = (label, saldos) => {
    const pct = saldos.total > 0 ? Math.round((saldos.tomados / saldos.total) * 100) : 0;
    const barColor = saldos.saldo <= 0 ? 'var(--red)' : saldos.saldo < saldos.total * 0.3 ? 'var(--yellow)' : 'var(--green)';
    return `<div style="flex:1;min-width:180px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r)">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${label} · ${saldos.anio || anioActual}</div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
        <span style="font-size:22px;font-weight:600;color:${barColor};font-family:var(--font-mono)">${saldos.saldo}</span>
        <span style="font-size:11px;color:var(--t3)">/ ${saldos.total} días</span>
      </div>
      <div style="height:4px;background:var(--bg1);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${barColor};transition:width .25s"></div>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-top:5px;font-family:var(--font-mono)">
        Tomados: ${saldos.tomados} ${saldos.pendientes ? `· Pendientes: ${saldos.pendientes}` : ''}
      </div>
    </div>`;
  };

  const saldosHTML = saldos ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
    ${saldoCard('🏖 Vacaciones', {...saldos.vacaciones, anio: saldos.anio})}
    ${saldoCard('📚 Examen (Art. 158 LCT)', {...saldos.examen, anio: saldos.anio})}
    ${saldoCard('💍 Matrimonio', {...saldos.matrimonio, anio: saldos.anio})}
  </div>` : '';

  // Filtros
  const filtroAnio = opciones.mostrarFiltroAnio !== false ? `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Año:</label>
      <select onchange="renderHistorialLicenciasUI('${contenedorId}','${leg}',{anio:parseInt(this.value, 10)||null,todosLosAnios:!this.value,mostrarFiltroAnio:${opciones.mostrarFiltroAnio!==false},titulo:${JSON.stringify(opciones.titulo||'')}})" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:4px 10px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono)">
        ${[anioActual, anioActual-1, anioActual-2, anioActual-3].map(y => `<option value="${y}"${y===anioActual?' selected':''}>${y}</option>`).join('')}
        <option value="">Todos los años</option>
      </select>
      <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:8px">${historial.length} licencia${historial.length!==1?'s':''}</span>
    </div>` : '';

  let filas;
  if(!historial.length){
    filas = '<div style="padding:24px;color:var(--t3);font-size:12px;text-align:center;font-style:italic">Sin licencias registradas en el período</div>';
  } else {
    filas = `<div style="border:1px solid var(--border);border-radius:var(--r);overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg2)">
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">Tipo</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">Desde</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">Hasta</th>
            <th style="padding:8px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">Días</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">Estado</th>
            <th style="padding:8px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">Origen</th>
          </tr>
        </thead>
        <tbody>
          ${historial.map(h => `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 12px;color:var(--t1)">${origenIcon[h.origen]||'•'} ${h.tipo}${h.motivo?`<div style="font-size:10px;color:var(--t3);font-style:italic;margin-top:2px">${h.motivo}</div>`:''}</td>
            <td style="padding:8px 12px;color:var(--t2);font-family:var(--font-mono);font-size:11px">${fmtD(h.desde)}</td>
            <td style="padding:8px 12px;color:var(--t2);font-family:var(--font-mono);font-size:11px">${fmtD(h.hasta)}</td>
            <td style="padding:8px 12px;color:var(--t1);text-align:right;font-family:var(--font-mono);font-weight:600">${h.dias}${h.sinGoce?' <span style="font-size:9px;color:rgb(168,85,247)" title="Sin goce de haberes">SG</span>':''}</td>
            <td style="padding:8px 12px"><span style="font-size:10px;color:${estadoColor(h)};font-family:var(--font-mono);padding:2px 8px;border:1px solid ${estadoColor(h)};border-radius:10px;opacity:.9">${estadoLabel(h)}</span></td>
            <td style="padding:8px 12px;color:var(--t3);font-family:var(--font-mono);font-size:10px;text-transform:capitalize">${h.origen}${h.tieneArchivo?' 📎':''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  cont.innerHTML = `${opciones.titulo?`<div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:10px">${opciones.titulo}</div>`:''}${saldosHTML}${filtroAnio}${filas}`;
}


function calcularDiasLicencia(){
  const desde = document.getElementById('lic-desde').value;
  const hasta  = document.getElementById('lic-hasta').value;
  const tipo   = document.getElementById('lic-tipo').value;
  const wrap   = document.getElementById('lic-dias-wrap');
  const num    = document.getElementById('lic-dias-num');
  const aviso  = document.getElementById('lic-dias-aviso');

  if(!desde || !hasta || hasta < desde){ wrap.style.display='none'; return; }

  const dias = Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1;
  num.textContent = `${dias} día${dias !== 1 ? 's' : ''}`;
  wrap.style.display = 'block';

  // Validar contra el reglamento
  if(aviso) aviso.style.display = 'none';
  const reg = REGLAMENTO_LICENCIAS[tipo];
  if(reg && reg.max !== null && dias > reg.max){
    if(aviso){
      aviso.style.display = 'block';
      aviso.innerHTML = `⚠ Según el reglamento, la licencia por <strong>${tipo}</strong> tiene un máximo de <strong>${reg.max} día${reg.max!==1?'s':''} ${reg.tipo}</strong>. Revisá las fechas.`;
    }
  }
}

// ── Empleado: subir comprobante ──
async function subirLicencia(){
  const tipo   = document.getElementById('lic-tipo').value;
  const desde  = document.getElementById('lic-desde').value;
  const hasta  = document.getElementById('lic-hasta').value;
  const file   = document.getElementById('lic-archivo').files[0];
  if(!tipo)  { toast('⚠ Seleccioná el tipo de licencia','var(--yellow)'); return; }
  if(!desde) { toast('⚠ Ingresá la fecha desde','var(--yellow)'); return; }
  if(!hasta) { toast('⚠ Ingresá la fecha hasta','var(--yellow)'); return; }
  if(hasta < desde){ toast('⚠ La fecha hasta debe ser posterior a la fecha desde','var(--yellow)'); return; }
  if(!file)  { toast('⚠ Adjuntá el comprobante','var(--yellow)'); return; }

  // Validar contra el reglamento
  const d1=new Date(desde), d2=new Date(hasta);
  const dias = Math.round((d2-d1)/86400000)+1;
  const reg = REGLAMENTO_LICENCIAS[tipo];
  if(reg && reg.max !== null && dias > reg.max){
    toast(`⚠ Excede el máximo permitido: ${tipo} admite hasta ${reg.max} día${reg.max!==1?'s':''} ${reg.tipo}`, 'var(--red)');
    return;
  }

  const btn = document.querySelector('#lic-form-card .btn-primary');
  btn.disabled=true; btn.textContent='Enviando...';

  const reader = new FileReader();
  reader.onload = async function(ev){
    const emp = currentUser.emp;
    const area = getValidador(emp)?.area || '';
    // Calcular días
    const d1=new Date(desde), d2=new Date(hasta);
    const dias = Math.round((d2-d1)/86400000)+1;
    const fmtD = iso=>{ const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };
    await addLicencia({
      leg:emp.leg, dni:emp.dni, nom:emp.nom, emp:emp.emp,
      lugar:emp.lugar||'', area,
      tipo, desde, hasta, dias,
      archivo: ev.target.result,  // base64 con data URL
      mimeType: file.type,
      fileName: file.name,
      estado: 'pendiente',
      presentadoEl: new Date().toLocaleDateString('es-AR'),
      presentadoHora: new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
    });
    // Mostrar confirmación
    document.getElementById('lic-form-card').style.display='none';
    document.getElementById('lic-confirmacion').style.display='block';
    btn.disabled=false; btn.textContent='↑ Enviar comprobante';
    renderMisLicencias();
  };
  reader.onerror=()=>{ toast('⚠ Error al leer el archivo','var(--red)'); btn.disabled=false; btn.textContent='↑ Enviar comprobante'; };
  reader.readAsDataURL(file);
}

async function nuevaLicencia(){
  document.getElementById('lic-form-card').style.display='block';
  document.getElementById('lic-confirmacion').style.display='none';
  document.getElementById('lic-tipo').value='';
  document.getElementById('lic-desde').value='';
  document.getElementById('lic-hasta').value='';
  document.getElementById('lic-archivo').value='';
  document.getElementById('lic-dias-wrap').style.display='none';
  const avisoMud = document.getElementById('lic-aviso-mudanza');
  if(avisoMud) avisoMud.style.display='none';
}

// ── Empleado: ver sus licencias ──
async function renderMisLicencias(){
  // Renderizar referencia del reglamento
  const ref = document.getElementById('reglamento-ref');
  if(ref && !ref.innerHTML){
    ref.innerHTML = Object.entries(REGLAMENTO_LICENCIAS)
      .filter(([,r])=>r.nota)
      .map(([tipo,r])=>`<div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--border)">
        <span style="color:var(--t1)">${tipo}</span>
        <span style="font-family:var(--font-mono);color:var(--accent2);text-align:right">${r.nota}</span>
      </div>`).join('');
  }
  const div=document.getElementById('list-mis-licencias');
  if(!div) return;
  const todas=await getLicencias();
  const mias=todas.filter(l=>l.leg===currentUser?.emp?.leg).sort((a,b)=>b.id-a.id);
  if(!mias.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No presentaste licencias aún</div></div>';
    return;
  }
  const fmtD=iso=>{ const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  div.innerHTML=`<div class="card" style="padding:0;overflow:hidden">`+
    mias.map(l=>`
      <div style="display:flex;align-items:center;padding:12px 18px;border-bottom:1px solid var(--border);gap:12px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500;color:var(--t1)">${l.tipo}</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">${fmtD(l.desde)} → ${fmtD(l.hasta)} · ${l.dias} día${l.dias!==1?'s':''} · ${l.presentadoEl}</div>
        </div>
        <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${l.estado==='aprobada'?'rgba(34,197,94,.3)':l.estado==='rechazada'?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)'};color:${l.estado==='aprobada'?'var(--green)':l.estado==='rechazada'?'var(--red)':'var(--yellow)'}">${l.estado}</span>
      </div>`).join('')+`</div>`;
}

// ── RR.HH.: ver todas las licencias ──
function rrhhLicTab(tab){
  ['comp','inf','emp'].forEach(t=>{
    const p=document.getElementById('rrhh-lic-pane-'+t);
    const b=document.getElementById('rrhh-lic-tab-'+t);
    if(p) p.style.display=t===tab?'block':'none';
    if(b){
      b.style.borderBottomColor=t===tab?'var(--accent)':'transparent';
      b.style.color=t===tab?'var(--accent2)':'var(--t3)';
      b.style.fontWeight=t===tab?'600':'400';
    }
  });
  if(tab==='comp') renderLicenciasAdmin();
  if(tab==='inf')  renderInformesAdmin();
  if(tab==='emp')  rrhhLicPoblarEmpleados();
}

async function rrhhLicPoblarEmpleados(){
  const sel = document.getElementById('rrhh-lic-emp-sel');
  if(!sel) return;
  const q = (document.getElementById('rrhh-lic-emp-search')?.value||'').toLowerCase();
  let nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  if(q) nomina = nomina.filter(e =>
    (e.nom||'').toLowerCase().includes(q) ||
    (e.leg||'').includes(q) ||
    (e.cuil||'').includes(q)
  );
  nomina.sort((a,b) => (a.nom||'').localeCompare(b.nom||''));
  sel.innerHTML = `<option value="">— Seleccioná un empleado (${nomina.length}) —</option>` +
    nomina.map(e => `<option value="${e.leg}">${e.nom} · Leg. ${e.leg} · ${e.emp}</option>`).join('');
  // Reset contenido
  const cont = document.getElementById('rrhh-lic-emp-content');
  if(cont) cont.innerHTML = '<div style="padding:40px;color:var(--t3);font-size:12px;text-align:center;font-style:italic">Seleccioná un empleado para ver su historial de licencias</div>';
}

function rrhhLicFiltrarEmpleados(){
  rrhhLicPoblarEmpleados();
}

async function rrhhLicCargarEmpleado(){
  const sel = document.getElementById('rrhh-lic-emp-sel');
  const leg = sel?.value;
  if(!leg){
    const cont = document.getElementById('rrhh-lic-emp-content');
    if(cont) cont.innerHTML = '<div style="padding:40px;color:var(--t3);font-size:12px;text-align:center;font-style:italic">Seleccioná un empleado para ver su historial de licencias</div>';
    return;
  }
  const emp = getNomina().find(e => e.leg === leg);
  const titulo = emp ? `${emp.nom} · ${emp.emp} · ${emp.lugar||''}` : '';
  renderHistorialLicenciasUI('rrhh-lic-emp-content', leg, {
    anio: new Date().getFullYear(),
    titulo: titulo
  });
}

async function renderInformesAdmin(){
  const div=document.getElementById('list-informes-admin');
  if(!div) return;
  const q=(document.getElementById('inf-admin-search')?.value||'').toLowerCase();
  const filtroTipo=document.getElementById('inf-admin-filtro')?.value||'';
  const todos=await getInformesLicencias();
  let lista=[...todos].sort((a,b)=>b.id-a.id);
  if(q) lista=lista.filter(l=>(l.nom||'').toLowerCase().includes(q)||(l.emp||'').toLowerCase().includes(q)||(l.tipo||'').toLowerCase().includes(q));
  if(filtroTipo) lista=lista.filter(l=>l.tipo===filtroTipo);
  if(!lista.length){
    div.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">Sin licencias informadas</div>';
    return;
  }
  const fmtD=iso=>{ if(!iso) return '—'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  div.innerHTML=lista.map(l=>{
    const tomada = !!l.tomada_rrhh;
    return `
    <div style="padding:14px 18px;border-bottom:1px solid var(--border);${tomada?'background:rgba(34,197,94,.03)':''}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom||'—'}</span>
            <span style="font-size:10px;font-family:var(--font-mono);background:rgba(234,179,8,.1);color:var(--yellow);padding:1px 7px;border-radius:8px">📝 Informada</span>
            <span style="font-size:10px;font-family:var(--font-mono);background:var(--accent-glow);color:var(--accent2);padding:1px 7px;border-radius:8px">${l.tipo||'—'}</span>
            ${tomada?`<span style="font-size:10px;font-family:var(--font-mono);background:rgba(34,197,94,.12);color:var(--green);padding:1px 7px;border-radius:8px;border:1px solid rgba(34,197,94,.3)">✓ Tomada — impacta liquidación</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:4px">
            Leg. ${l.leg} · ${l.emp||'—'} · ${l.area||'—'} · ${l.lugar||'—'}
          </div>
          <div style="font-size:11px;color:var(--t2)">
            📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong> · Informado: ${l.presentadoEl||'—'} ${l.presentadoHora||''}
            ${tomada?` · <span style="color:var(--green)">Tomada conocimiento: ${l.tomadaEl||''}</span>`:''}
          </div>
          ${l.obs?`<div style="font-size:11px;color:var(--t3);margin-top:3px;font-style:italic">Obs: ${l.obs}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          ${tomada
            ? `<button onclick="desmarcarInformeLicencia(${l.id})" class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--yellow);border-color:rgba(234,179,8,.3)">↺ Revertir</button>`
            : `<button onclick="tomarConocimientoInforme(${l.id})" class="btn btn-primary" style="font-size:11px;padding:4px 12px">✓ Tomar conocimiento</button>`
          }
        </div>
      </div>
    </div>`;}).join('');
}

async function tomarConocimientoInforme(id){
  const todos = await getInformesLicencias();
  const l = todos.find(x=>x.id===id);
  if(!l){ toast('⚠ Informe no encontrado','var(--yellow)'); return; }
  l.tomada_rrhh = true;
  l.tomadaEl = new Date().toLocaleDateString('es-AR');
  l.tomadaHora = new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  await updateInformeLicencia(l);
  toast(`✓ Licencia de ${l.nom.split(',')[0]} tomada — impactará en la próxima liquidación`,'var(--green)');
  renderInformesAdmin();
}

async function desmarcarInformeLicencia(id){
  const todos = await getInformesLicencias();
  const l = todos.find(x=>x.id===id);
  if(!l) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Revertir "Tomado conocimiento"? La licencia dejará de impactar en la liquidación.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  l.tomada_rrhh = false;
  delete l.tomadaEl; delete l.tomadaHora;
  await updateInformeLicencia(l);
  toast('↺ Conocimiento revertido','var(--yellow)');
  renderInformesAdmin();
}

async function renderLicenciasAdmin(){
  const div=document.getElementById('list-licencias-admin');
  if(!div) return;
  const q=(document.getElementById('lic-admin-search')?.value||'').toLowerCase();
  const filtroTipo=document.getElementById('lic-admin-filtro')?.value||'';
  const todas=await getLicencias();
  let lista=todas.sort((a,b)=>b.id-a.id);
  if(q) lista=lista.filter(l=>l.nom.toLowerCase().includes(q)||l.emp.toLowerCase().includes(q)||l.tipo.toLowerCase().includes(q)||l.area.toLowerCase().includes(q));
  if(filtroTipo) lista=lista.filter(l=>l.tipo===filtroTipo);
  if(!lista.length){
    div.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">Sin comprobantes presentados</div>';
    return;
  }
  const fmtD=iso=>{ const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  div.innerHTML=lista.map(l=>`
    <div style="display:grid;grid-template-columns:1fr auto;padding:14px 18px;border-bottom:1px solid var(--border);gap:14px;align-items:center">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom}</span>
          <span style="font-size:10px;font-family:var(--font-mono);background:var(--accent-glow);color:var(--accent2);padding:1px 7px;border-radius:8px">${l.tipo}</span>
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          ${l.emp} · ${l.area||'—'} · ${l.lugar||'—'}
        </div>
        <div style="font-size:11px;color:var(--t2);margin-top:3px">
          📅 ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong>${l.dias} día${l.dias!==1?'s':''}</strong> a justificar · Presentado: ${l.presentadoEl} ${l.presentadoHora}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="descargarComprobante(${l.id})">↓ Comprobante</button>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="font-size:10px;padding:3px 8px;color:var(--green);border-color:rgba(34,197,94,.3)" onclick="cambiarEstadoLicencia(${l.id},'aprobada')">✓ Aprobar</button>
          <button class="btn btn-ghost" style="font-size:10px;padding:3px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="cambiarEstadoLicencia(${l.id},'rechazada')">✕ Rechazar</button>
        </div>
        <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${l.estado==='aprobada'?'rgba(34,197,94,.3)':l.estado==='rechazada'?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)'};color:${l.estado==='aprobada'?'var(--green)':l.estado==='rechazada'?'var(--red)':'var(--yellow)'}">${l.estado}</span>
      </div>
    </div>`).join('');
}

async function descargarComprobante(id){
  const todas=await getLicencias();
  const l=todas.find(x=>x.id===id);
  if(!l){ toast('⚠ Comprobante no encontrado','var(--yellow)'); return; }
  const a=document.createElement('a');
  a.href=l.archivo;
  a.download=`licencia_${l.leg}_${l.tipo.replace(/\s/g,'_')}_${l.desde}.${l.fileName.split('.').pop()}`;
  a.click();
  toast('✓ Comprobante descargado','var(--green)');
}

async function cambiarEstadoLicencia(id, estado){
  const db=await abrirIDB();
  const todas=await getLicencias();
  const l=todas.find(x=>x.id===id);
  if(!l) return;
  l.estado=estado;
  await new Promise((res,rej)=>{
    const tx=db.transaction('licencias','readwrite');
    const req=tx.objectStore('licencias').put(l);
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });
  toast(`✓ Licencia ${estado}`,'var(--green)');
  renderLicenciasAdmin();
}

// ─── LICENCIAS: TABS ───
async function licTab(tab){
  ['comprobante','informar'].forEach(t=>{
    const p=document.getElementById('lic-pane-'+t);
    if(p) p.style.display=t===tab?'block':'none';
  });
  // Resincronizar sidebar: si la sección activa es Licencias, marcamos el
  // sb-item que corresponde al tab elegido (Comprobante vs Informar).
  const secLic = document.getElementById('sec-licencias');
  if(secLic && secLic.classList.contains('active')){
    _setSidebarActive('licencias', tab);
  }
  // Actualizar título según pestaña
  const title = document.getElementById('lic-page-title');
  const sub   = document.getElementById('lic-page-sub');
  if(tab==='comprobante'){
    if(title) title.textContent='Presentar comprobante';
    if(sub)   sub.textContent='Cargá el justificativo de tu licencia';
    renderMisLicencias();
  } else {
    if(title) title.textContent='Informar licencia';
    if(sub)   sub.textContent='Informá licencias que no requieren comprobante';
    renderMisInformes();
  }
}

// ─── INFORMES DE LICENCIAS IDB ───
async function getInformesLicencias(){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('informes_licencias','readonly');
    const req=tx.objectStore('informes_licencias').getAll();
    req.onsuccess=()=>res(req.result); req.onerror=e=>rej(e.target.error);
  });
}
async function addInformeLicencia(rec){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('informes_licencias','readwrite');
    const req=tx.objectStore('informes_licencias').add(rec);
    req.onsuccess=()=>res(req.result); req.onerror=e=>rej(e.target.error);
  });
}
async function updateInformeLicencia(rec){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('informes_licencias','readwrite');
    const req=tx.objectStore('informes_licencias').put(rec);
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });
}

async function calcularDiasInforme(){
  const desde=document.getElementById('inf-lic-desde').value;
  const hasta=document.getElementById('inf-lic-hasta').value;
  const tipo=document.getElementById('inf-lic-tipo').value;
  const wrap=document.getElementById('inf-dias-wrap');
  const num=document.getElementById('inf-dias-num');
  const aviso=document.getElementById('inf-dias-aviso');
  if(!desde||!hasta||hasta<desde){wrap.style.display='none';return;}
  const dias=Math.round((new Date(hasta)-new Date(desde))/86400000)+1;
  num.textContent=`${dias} día${dias!==1?'s':''}`;
  wrap.style.display='block';
  if(aviso) aviso.style.display='none';
  const reg=REGLAMENTO_LICENCIAS[tipo];
  if(reg&&reg.max!==null&&dias>reg.max&&aviso){
    aviso.style.display='block';
    aviso.innerHTML=`⚠ Según el reglamento, <strong>${tipo}</strong> permite hasta <strong>${reg.max} día${reg.max!==1?'s':''} ${reg.tipo}</strong>.`;
  }
}

async function informarLicencia(){
  const tipo=document.getElementById('inf-lic-tipo').value;
  const desde=document.getElementById('inf-lic-desde').value;
  const hasta=document.getElementById('inf-lic-hasta').value;
  const obs=document.getElementById('inf-lic-obs').value.trim();
  if(!tipo){toast('⚠ Seleccioná el tipo de licencia','var(--yellow)');return;}
  if(!desde){toast('⚠ Ingresá la fecha desde','var(--yellow)');return;}
  if(!hasta){toast('⚠ Ingresá la fecha hasta','var(--yellow)');return;}
  if(hasta<desde){toast('⚠ La fecha hasta debe ser posterior a la fecha desde','var(--yellow)');return;}
  const dias=Math.round((new Date(hasta)-new Date(desde))/86400000)+1;
  const reg=REGLAMENTO_LICENCIAS[tipo];
  if(reg&&reg.max!==null&&dias>reg.max){
    toast(`⚠ Excede el máximo permitido: ${tipo} admite hasta ${reg.max} día${reg.max!==1?'s':''} ${reg.tipo}`,'var(--red)');
    return;
  }
  const emp=currentUser.emp;
  const area=getValidador(emp)?.area||'';
  const btn=document.querySelector('#inf-lic-form-card .btn-primary');
  btn.disabled=true; btn.textContent='Enviando...';
  await addInformeLicencia({
    leg:emp.leg, nom:emp.nom, emp:emp.emp, lugar:emp.lugar||'', area,
    tipo, desde, hasta, dias, obs,
    estado:'informado',
    presentadoEl:new Date().toLocaleDateString('es-AR'),
    presentadoHora:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
  });
  btn.disabled=false; btn.textContent='↑ Informar';
  document.getElementById('inf-lic-form-card').style.display='none';
  document.getElementById('inf-lic-confirmacion').style.display='block';
  renderMisInformes();
}

async function nuevoInformeLicencia(){
  document.getElementById('inf-lic-form-card').style.display='block';
  document.getElementById('inf-lic-confirmacion').style.display='none';
  document.getElementById('inf-lic-tipo').value='';
  document.getElementById('inf-lic-desde').value='';
  document.getElementById('inf-lic-hasta').value='';
  document.getElementById('inf-lic-obs').value='';
  document.getElementById('inf-dias-wrap').style.display='none';
}

async function renderMisInformes(){
  const div=document.getElementById('list-mis-informes');
  if(!div) return;
  const todos=await getInformesLicencias();
  const mios=todos.filter(l=>l.leg===currentUser?.emp?.leg).sort((a,b)=>b.id-a.id);
  if(!mios.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">📝</div><div class="empty-text">No informaste licencias aún</div></div>';
    return;
  }
  const fmtD=iso=>{const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;};
  div.innerHTML=`<div class="card" style="padding:0;overflow:hidden">`+
    mios.map(l=>`
      <div style="padding:12px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:500;color:var(--t1)">${l.tipo}</span>
          <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">${l.presentadoEl}</span>
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          ${fmtD(l.desde)} → ${fmtD(l.hasta)} · <strong style="color:var(--t2)">${l.dias} día${l.dias!==1?'s':''}</strong>
          ${l.obs?` · ${l.obs}`:''}
        </div>
      </div>`).join('')+`</div>`;
}

