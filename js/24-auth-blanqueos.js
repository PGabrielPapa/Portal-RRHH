// ═══════════════════════════════════════════════════════════════════════
// ═══   AUTH — BLANQUEO DE CONTRASEÑAS                                 ═══
// ═══   Solicitud de blanqueo por empleado → aprobación RRHH           ═══
// ═══   Módulo 24                                                       ═══
// ═══════════════════════════════════════════════════════════════════════

function togglePwd(inputId, btnId){
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if(!inp) return;
  if(inp.type === 'password'){
    inp.type = 'text';
    if(btn) btn.style.color = 'var(--accent2)';
  } else {
    inp.type = 'password';
    if(btn) btn.style.color = 'var(--t3)';
  }
}

// ─── OLVIDÉ CONTRASEÑA ───
function getSolicitudesBlanqueo(){
  try{ return JSON.parse(localStorage.getItem('lsg_blanqueo')||'[]'); }catch(e){ return []; }
}
function saveSolicitudesBlanqueo(lista){
  localStorage.setItem('lsg_blanqueo', JSON.stringify(lista));
}

function olvidéContraseña(){
  // El empleado actual está identificado por el DNI ingresado en step1
  const dni = document.getElementById('ls-dni')?.value?.trim();
  if(!dni) return;
  const emp = getNomina().find(e=>e.dni===dni);
  if(!emp) return;
  if(emp._deBaja || emp.egreso) return;

  // Verificar si ya tiene solicitud pendiente
  const lista = getSolicitudesBlanqueo();
  if(lista.some(s=>s.dni===dni && s.estado==='pendiente')){
    // Mostrar step especial de "solicitud enviada"
    mostrarSolicitudEnviada(emp, true);
    return;
  }

  // Registrar solicitud
  const now = new Date();
  lista.push({
    dni: emp.dni,
    leg: emp.leg,
    nom: emp.nom,
    emp: emp.emp,
    estado: 'pendiente',
    fecha: now.toLocaleDateString('es-AR'),
    hora: now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
  });
  saveSolicitudesBlanqueo(lista);
  actualizarCntBlanqueo();
  // ── Auditoría: el empleado solicita blanqueo (no hay currentUser todavía) ──
  if(typeof auditAuth === 'function'){
    auditAuth('solicitud_blanqueo', emp);
  }
  mostrarSolicitudEnviada(emp, false);
}

function mostrarSolicitudEnviada(emp, yaExistia){
  const step2 = document.getElementById('ls-step2');
  step2.innerHTML = `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:32px;margin-bottom:12px">📬</div>
      <div style="font-size:15px;font-weight:600;color:var(--t1);margin-bottom:8px">
        ${yaExistia ? 'Solicitud ya registrada' : 'Solicitud enviada a RR.HH.'}
      </div>
      <div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:20px">
        El equipo de Recursos Humanos fue notificado.<br>
        Una vez que blanqueen tu contraseña, podrás crear una nueva al ingresar con tu DNI.
      </div>
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);background:var(--bg2);padding:8px 12px;border-radius:var(--r);margin-bottom:20px">
        ${emp.nom} · Legajo ${emp.leg}
      </div>
    </div>
    <button class="login-back" onclick="backToStep1()" style="margin-top:0">← Volver</button>`;
}

async function actualizarCntBlanqueo(){
  const lista = getSolicitudesBlanqueo();
  const pendientes = lista.filter(s=>s.estado==='pendiente');
  const cnt = document.getElementById('cnt-blanqueo');
  if(!cnt) return;
  if(pendientes.length){
    cnt.style.display='inline-block';
    cnt.textContent = `${pendientes.length} pendiente${pendientes.length>1?'s':''}`;
  } else {
    cnt.style.display='none';
  }
  // Actualizar badge en nav sidebar
  actualizarDotRRHH();
}

function actualizarDotRRHH(){
  const lista = getSolicitudesBlanqueo();
  const dot = document.getElementById('dot-rrhh');
  if(dot && lista.some(s=>s.estado==='pendiente')){
    dot.style.background='var(--red)';
    dot.style.boxShadow='0 0 6px var(--red)';
  } else if(dot){
    dot.style.background='var(--green)';
    dot.style.boxShadow='';
  }
}

async function renderSolicitudesBlanqueo(){
  const lista = getSolicitudesBlanqueo();
  const div = document.getElementById('list-solicitudes-blanqueo');
  if(!div) return;
  actualizarCntBlanqueo();
  const pendientes = lista.filter(s=>s.estado==='pendiente');
  if(!pendientes.length){
    div.innerHTML='<div style="padding:14px 18px;color:var(--t3);font-size:13px">Sin solicitudes pendientes</div>';
    return;
  }
  div.innerHTML = pendientes.map(s=>`
    <div style="display:flex;align-items:center;padding:12px 18px;border-bottom:1px solid var(--border);gap:12px">
      <div style="width:36px;height:36px;border-radius:50%;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--red);flex-shrink:0">${s.nom.split(',')[0].trim().substring(0,2)}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--t1)">${s.nom}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${s.leg} · ${s.emp} · Solicitado: ${s.fecha} ${s.hora}</div>
      </div>
      <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" onclick="blanquearDesdeSolicitud('${s.dni}','${s.nom.replace(/'/g,"\\'")}')">🔓 Blanquear y resolver</button>
    </div>`).join('');
}

async function blanquearDesdeSolicitud(dni, nom){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Blanquear la contraseña de ${nom}?<br><br>El empleado podrá crear una nueva contraseña al próximo ingreso.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  // Blanquear contraseña
  const pwds = getPasswords();
  delete pwds[dni];
  try{localStorage.setItem('lsg_passwords', JSON.stringify(pwds));}catch(e){}
  // Marcar solicitud como resuelta
  const lista = getSolicitudesBlanqueo();
  const idx = lista.findIndex(s=>s.dni===dni && s.estado==='pendiente');
  if(idx>=0) lista[idx].estado='resuelto';
  saveSolicitudesBlanqueo(lista);
  toast(`✓ Contraseña de ${nom.split(',')[0].trim()} blanqueada`, 'var(--green)');
  // ── Auditoría: RR.HH. resolvió el blanqueo ──
  if(typeof auditRRHH === 'function'){
    auditRRHH('blanqueo_resuelto', { dni, nom }, { detail: 'Blanqueo desde panel de solicitudes' });
  }
  renderSolicitudesBlanqueo();
  renderPwdTable();
}
function exportarTXT(){
  const aprobadas = solicitudes.filter(s => s.status === 'approved');
  if(!aprobadas.length){
    toast('⚠ No hay solicitudes aprobadas para exportar', 'var(--yellow)');
    return;
  }

  // Helper: avanzar mes/año saltándose meses bloqueados (Ene/Jun/Jul/Dic) si fuera
  // necesario. Acá NO los salteamos para mantener simetría con la liquidación
  // (RR.HH. ya validó el plan al aprobar). Solo expandimos en N meses consecutivos.
  function avanzarMes(mes, anio, n){
    let m = mes + n;
    let y = anio;
    while(m > 12){ m -= 12; y += 1; }
    return [m, y];
  }

  const lineas = [];
  let totalCuotas = 0;

  aprobadas.forEach(s => {
    // BUGFIX 1: usar el monto APROBADO por RR.HH. (puede diferir del solicitado
    // cuando hubo exceso). Antes se exportaba siempre s.monto (el original).
    const montoTotal = (typeof s.montoAprobado === 'number' && s.montoAprobado > 0)
      ? s.montoAprobado
      : s.monto;

    // BUGFIX 2: respetar la cantidad de cuotas definida por RR.HH. Antes se
    // generaba siempre UNA fila ignorando s.cuotas, lo que mandaba el descuento
    // completo en un solo mes en vez de distribuirlo.
    const nCuotas = (s.cuotas && s.cuotas > 1) ? Math.min(24, parseInt(s.cuotas, 10)) : 1;
    const montoPorCuota = montoTotal / nCuotas;

    // Mes base: el mes/año de la creación de la solicitud (formato dd/mm/yyyy)
    const partes = (s.created || '').split('/');
    const mesBase  = partes[1] ? parseInt(partes[1], 10) : (new Date().getMonth() + 1);
    const anioBase = partes[2] ? parseInt(partes[2], 10) : (new Date().getFullYear());

    for(let i = 0; i < nCuotas; i++){
      const [m, y] = avanzarMes(mesBase, anioBase, i);
      const mesAnio = `${String(m).padStart(2,'0')}/${y}`;
      // Monto en negativo (es un descuento) con 2 decimales
      const monto = (-Math.abs(montoPorCuota)).toFixed(2);
      lineas.push(`${s.emp.leg};${mesAnio};${monto};40000;${s.emp.emp}`);
      totalCuotas++;
    }
  });

  const contenido = lineas.join('\r\n');
  const hoy = new Date();
  const fechaArchivo = `${String(hoy.getDate()).padStart(2,'0')}${String(hoy.getMonth()+1).padStart(2,'0')}${hoy.getFullYear()}`;
  const nombreArchivo = `adelantos_${fechaArchivo}.txt`;

  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);

  const detalle = totalCuotas !== aprobadas.length
    ? `${aprobadas.length} solicitudes · ${totalCuotas} cuotas`
    : `${aprobadas.length} registros`;
  toast(`✓ ${nombreArchivo} exportado (${detalle})`, 'var(--green)');
}

// ─── GESTIÓN DE CONTRASEÑAS (RR.HH.) ───
async function renderPwdTable(){
  const q = (document.getElementById('pwd-search')?.value || '').toLowerCase();
  const pwds = getPasswords();
  const wrap = document.getElementById('pwd-table-wrap');
  if(!wrap) return;
  // BUGFIX: usar getNomina() también cuando no hay búsqueda. Antes caía a `DB`,
  // lo que dejaba afuera las altas del ABM y no reflejaba ediciones (overrides).
  // Excluimos bajas para no listar empleados que ya no están.
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  let lista = q ? nomina.filter(e =>
    e.nom.toLowerCase().includes(q) ||
    e.leg.toLowerCase().includes(q) ||
    e.dni.includes(q)
  ) : nomina;
  if(!lista.length){
    wrap.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Sin resultados</div>';
    return;
  }
  wrap.innerHTML = lista.map(e => {
    const tiene = !!pwds[e.dni];
    return `<div class="pwd-row">
      <div class="pwd-info">
        <div class="pwd-name">${e.nom}</div>
        <div class="pwd-meta">${e.leg} · ${e.emp} · DNI ${e.dni}</div>
      </div>
      <span class="pwd-status ${tiene?'set':'unset'}">${tiene?'● Con contraseña':'○ Sin contraseña'}</span>
      <button class="btn-blanquear" onclick="blanquearPasswordPorDni('${e.dni}','${e.nom.replace(/'/g,"\\'")}',this)"
        ${!tiene?'disabled':''}>Blanquear</button>
    </div>`;
  }).join('');
}

async function blanquearPasswordPorDni(dni, nom){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Blanquear la contraseña de ${nom}?<br><br>El empleado deberá crear una nueva contraseña en su próximo ingreso.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const pwds = getPasswords();
  delete pwds[dni];
  try{localStorage.setItem('lsg_passwords', JSON.stringify(pwds));}catch(e){}
  toast(`✓ Contraseña de ${nom.split(',')[0].trim()} blanqueada`, 'var(--green)');
  renderPwdTable();
}

function renderRRHH(){
  const pend = solicitudes.filter(s=>s.status==='pending_hr');
  const div=document.getElementById('list-rrhh');
  if(!pend.length){div.innerHTML='<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">No hay solicitudes para autorizar</div></div>';return;}
  div.innerHTML=pend.map(s=>`
    <div class="sol-item" onclick="openApproval('${s.id}','hr')">
      <div class="sol-status manager"></div>
      <div class="sol-info">
        <div class="sol-name">${s.emp.nom}</div>
        <div class="sol-meta">${s.emp.leg} · ${s.emp.emp} · Validado por Gerente</div>
        <div class="sol-meta" style="margin-top:2px">Motivo: ${s.motivo}</div>
      </div>
      <div>
        <div class="sol-amount">${fmt(s.monto)}</div>
        <div style="text-align:right;margin-top:4px"><span class="sol-tag manager">En RR.HH.</span></div>
        ${s.exceso?'<div style="text-align:right;margin-top:3px"><span class="sol-tag pending">Exceso</span></div>':''}
      </div>
    </div>`).join('');
}

// ─── HISTORIAL ───
function renderHistorial(){
  const div=document.getElementById('list-hist');
  let lista = [...solicitudes].reverse();
  // Employees see only their own
  if(currentUser?.role === 'employee'){
    lista = lista.filter(s => s.emp.dni === currentUser.emp.dni);
  }
  if(!lista.length){div.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Sin solicitudes registradas</div></div>';return;}
  const map={pending_manager:'Pendiente Gerente',pending_hr:'En RR.HH.',approved:'Aprobada',rejected:'Rechazada'};
  const cls={pending_manager:'pending',pending_hr:'manager',approved:'approved',rejected:'rejected'};
  div.innerHTML=lista.map(s=>`
    <div class="sol-item">
      <div class="sol-status ${cls[s.status]}"></div>
      <div class="sol-info">
        <div class="sol-name">${s.emp.nom}</div>
        <div class="sol-meta">${s.emp.leg} · ${s.emp.emp} · ${s.created}</div>
        <div class="sol-meta">${s.id}</div>
      </div>
      <div>
        <div class="sol-amount">${fmt(s.monto)}</div>
        <div style="text-align:right;margin-top:4px"><span class="sol-tag ${cls[s.status]}">${map[s.status]}</span></div>
      </div>
    </div>`).join('');
}

