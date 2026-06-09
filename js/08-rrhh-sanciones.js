// ═══════════════════════════════════════════════════════════════

const SANC_STORAGE_KEY = 'lsg_sanciones';

// Catálogo de motivos
const SANC_MOTIVOS = [
  { v:'llegadas_tarde',          label:'Llegadas tarde reiteradas' },
  { v:'ausencias_injustificadas',label:'Ausencias injustificadas' },
  { v:'falta_respeto',            label:'Falta de respeto al superior o compañeros' },
  { v:'falta_cuidado_elementos',  label:'Falta de cuidado de elementos de trabajo' },
  { v:'incumplimiento_ordenes',   label:'Incumplimiento de órdenes e instrucciones' },
  { v:'incumplimiento_normas',    label:'Incumplimiento de normas internas / convenio' },
  { v:'uso_indebido_recursos',    label:'Uso indebido de recursos de la empresa' },
  { v:'fraude_documentacion',     label:'Adulteración de documentación / fraude' },
  { v:'inconducta_laboral',       label:'Inconducta laboral / agresión' },
  { v:'incumplimiento_seguridad', label:'Incumplimiento de normas de seguridad' },
  { v:'rendimiento_deficiente',   label:'Bajo rendimiento o productividad' },
  { v:'otro',                     label:'Otro motivo (especificar en descripción)' }
];

// Catálogo de tipos de sanción (en orden de severidad)
const SANC_TIPOS = [
  { v:'llamado_atencion',     label:'Llamado de atención',      severidad:1, color:'rgb(94,194,255)' },
  { v:'apercibimiento',       label:'Apercibimiento',            severidad:2, color:'rgb(234,179,8)' },
  { v:'severo_apercibimiento',label:'Severo apercibimiento',     severidad:3, color:'rgb(251,146,60)' },
  { v:'suspension',           label:'Suspensión',                 severidad:4, color:'rgb(239,68,68)' },
  { v:'desvinculacion',       label:'Desvinculación',             severidad:5, color:'rgb(176,32,32)' }
];

// Estados
// solicitada    → la solicitó el gerente, pendiente RR.HH.
// procedente    → RR.HH. la aprobó y aplicó (con sanción definitiva)
// improcedente  → RR.HH. la rechazó
// aplicada_directa → la aplicó RR.HH. directamente (sin solicitud previa)
const SANC_ESTADOS = {
  solicitada:        { label:'Pendiente RR.HH.',  color:'rgb(234,179,8)',   bg:'rgba(234,179,8,.1)' },
  procedente:        { label:'Procedente · aplicada', color:'rgb(34,197,94)', bg:'rgba(34,197,94,.1)' },
  improcedente:      { label:'Improcedente',      color:'rgb(239,68,68)',   bg:'rgba(239,68,68,.1)' },
  aplicada_directa:  { label:'Aplicada por RR.HH.', color:'rgb(34,197,94)', bg:'rgba(34,197,94,.1)' }
};

function getSanciones(){
  try { const r = localStorage.getItem(SANC_STORAGE_KEY); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}
function setSanciones(arr){ localStorage.setItem(SANC_STORAGE_KEY, JSON.stringify(arr)); }
function getSancionesEmp(leg){ return getSanciones().filter(s => s.leg === leg); }

function _sancMotivoInfo(v){ return SANC_MOTIVOS.find(m => m.v === v) || { v, label:v }; }
function _sancTipoInfo(v){ return SANC_TIPOS.find(t => t.v === v) || { v, label:v, severidad:0, color:'var(--t2)' }; }
function _sancEstadoInfo(v){ return SANC_ESTADOS[v] || { label:v, color:'var(--t2)', bg:'var(--bg2)' }; }
function _sancFmt(iso){
  if(!iso) return '—';
  if(iso.includes('T')) iso = iso.slice(0,10);
  if(iso.includes('-')){ const p=iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
  return iso;
}
function _sancFmtDT(iso){
  if(!iso) return '—';
  try { return new Date(iso).toLocaleString('es-AR'); } catch(e){ return iso; }
}

// ═══════════════════════════════════════════════════════════════
// PANEL GERENTE — Sanciones
// ═══════════════════════════════════════════════════════════════
let _gerSancTab = 'mis-solicitudes';

function renderSancionesPanelGerente(){
  const cont = document.getElementById('ger-sanciones-content');
  if(!cont || !currentUser) return;

  // Identificar equipo del gerente
  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
  const equipo = getNomina().filter(e => {
    if(e._deBaja || e.egreso) return false;
    const v = (typeof getValidador === 'function') ? getValidador(e) : null;
    if(!v || !v.validador) return false;
    if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
    return v.validador.toUpperCase() === gerNom;
  });
  const legsEquipo = new Set(equipo.map(e => e.leg));

  // Filtrar sanciones que involucren a empleados del equipo
  const todas = getSanciones();
  const delEquipo = todas.filter(s => legsEquipo.has(s.leg));

  // Métricas
  const pendientes = delEquipo.filter(s => s.estado === 'solicitada');
  const aplicadas = delEquipo.filter(s => s.estado === 'procedente' || s.estado === 'aplicada_directa');
  const rechazadas = delEquipo.filter(s => s.estado === 'improcedente');
  const noVistas = delEquipo.filter(s => (s.estado === 'procedente' || s.estado === 'improcedente') && !s.gerente_visto);

  let html = `
    <div class="card" style="padding:14px 16px;background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.2);margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:18px">⚖️</span>
        <div style="flex:1;min-width:200px">
          <div style="font-size:13px;font-weight:600;color:var(--t1)">Sanciones disciplinarias de tu equipo</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Visualizá el histórico, solicitá nuevas sanciones y consultá el resultado de RR.HH.</div>
        </div>
        <button class="btn btn-primary" onclick="abrirFormSolicitudSancion({modo:'gerente'})" style="font-size:12px;padding:7px 14px;background:rgb(239,68,68);border-color:rgb(239,68,68)">+ Enviar solicitud</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;margin-bottom:14px">
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Total</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:3px">${delEquipo.length}</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Pendientes RR.HH.</div>
        <div style="font-size:22px;font-weight:600;color:${pendientes.length>0?'rgb(234,179,8)':'var(--t1)'};font-family:var(--font-mono);margin-top:3px">${pendientes.length}</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Aplicadas</div>
        <div style="font-size:22px;font-weight:600;color:rgb(34,197,94);font-family:var(--font-mono);margin-top:3px">${aplicadas.length}</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Improcedentes</div>
        <div style="font-size:22px;font-weight:600;color:${rechazadas.length>0?'rgb(239,68,68)':'var(--t1)'};font-family:var(--font-mono);margin-top:3px">${rechazadas.length}</div>
      </div>
    </div>`;

  // Sub-tabs
  html += `
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:14px">
      <button onclick="_gerSancSetTab('mis-solicitudes')" id="gersanc-tab-mis-solicitudes"
        style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${_gerSancTab==='mis-solicitudes'?'var(--accent)':'transparent'};margin-bottom:-1px;color:${_gerSancTab==='mis-solicitudes'?'var(--accent2)':'var(--t3)'};font-size:12px;font-weight:${_gerSancTab==='mis-solicitudes'?'600':'400'};cursor:pointer;font-family:var(--font-mono);position:relative">
        📤 Mis solicitudes
        ${noVistas.length>0?`<span style="background:var(--green);color:#fff;font-size:9px;padding:1px 6px;border-radius:8px;margin-left:4px;font-weight:700">${noVistas.length} nuev${noVistas.length===1?'a':'as'}</span>`:''}
      </button>
      <button onclick="_gerSancSetTab('historial')" id="gersanc-tab-historial"
        style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${_gerSancTab==='historial'?'var(--accent)':'transparent'};margin-bottom:-1px;color:${_gerSancTab==='historial'?'var(--accent2)':'var(--t3)'};font-size:12px;font-weight:${_gerSancTab==='historial'?'600':'400'};cursor:pointer;font-family:var(--font-mono)">
        📜 Histórico del equipo
      </button>
    </div>`;

  // Lista según tab
  let listaMostrar;
  if(_gerSancTab === 'mis-solicitudes'){
    // Solicitadas por este gerente, en cualquier estado
    listaMostrar = delEquipo
      .filter(s => s.solicitante_leg === currentUser.emp.leg)
      .sort((a,b)=>(b.fecha_solicitud||'').localeCompare(a.fecha_solicitud||''));
  } else {
    // Histórico completo del equipo
    listaMostrar = delEquipo.slice().sort((a,b) => {
      const fa = a.fecha_aplicacion || a.fecha_solicitud || '';
      const fb = b.fecha_aplicacion || b.fecha_solicitud || '';
      return fb.localeCompare(fa);
    });
  }

  if(listaMostrar.length === 0){
    html += `
      <div class="card" style="padding:36px;text-align:center;color:var(--t3);font-size:13px">
        <div style="font-size:30px;margin-bottom:8px">⚖️</div>
        ${_gerSancTab==='mis-solicitudes' ?
          '<div style="font-size:14px;color:var(--t2);margin-bottom:4px">Aún no enviaste solicitudes</div><div style="font-size:11px">Tocá <b>+ Enviar solicitud</b> si necesitás iniciar un proceso disciplinario.</div>' :
          '<div style="font-size:14px;color:var(--t2);margin-bottom:4px">No hay sanciones registradas para tu equipo</div>'
        }
      </div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px">`;
    for(const s of listaMostrar){
      html += _sancRenderFila(s, 'gerente');
    }
    html += `</div>`;
  }

  cont.innerHTML = html;

  // Marcar como vistas las que tenía pendientes de revisar este gerente
  if(noVistas.length > 0){
    setTimeout(() => {
      const all = getSanciones();
      let cambios = 0;
      for(const s of all){
        if((s.estado === 'procedente' || s.estado === 'improcedente') &&
           s.solicitante_leg === currentUser.emp.leg && !s.gerente_visto){
          s.gerente_visto = new Date().toISOString();
          cambios++;
        }
      }
      if(cambios > 0){ setSanciones(all); _gerSancActualizarBadge(); }
    }, 1500);
  }
}

function _gerSancSetTab(tab){
  _gerSancTab = tab;
  renderSancionesPanelGerente();
}

// Badge en el tab de sanciones del gerente (cuenta novedades sin ver)
function _gerSancActualizarBadge(){
  const badge = document.getElementById('ger-tab-sanc-badge');
  if(!badge || !currentUser) return;
  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
  const equipo = getNomina().filter(e => {
    if(e._deBaja || e.egreso) return false;
    const v = (typeof getValidador === 'function') ? getValidador(e) : null;
    if(!v || !v.validador) return false;
    if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
    return v.validador.toUpperCase() === gerNom;
  });
  const legs = new Set(equipo.map(e => e.leg));
  const nov = getSanciones().filter(s =>
    legs.has(s.leg) && s.solicitante_leg === currentUser.emp.leg &&
    (s.estado === 'procedente' || s.estado === 'improcedente') && !s.gerente_visto
  );
  if(nov.length > 0){
    badge.textContent = nov.length;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// FILA DE SANCIÓN (común a gerente y RR.HH.)
// ═══════════════════════════════════════════════════════════════
function _sancRenderFila(s, contexto){
  const emp = empByLeg(s.leg);
  const motivo = _sancMotivoInfo(s.motivo);
  const tipoSol = _sancTipoInfo(s.tipo_solicitado);
  const tipoApl = s.tipo_aplicado ? _sancTipoInfo(s.tipo_aplicado) : null;
  const estado = _sancEstadoInfo(s.estado);
  const noVista = (s.estado === 'procedente' || s.estado === 'improcedente') &&
                  s.solicitante_leg === currentUser?.emp?.leg && !s.gerente_visto;

  // Acciones según contexto
  let acciones = '';
  if(contexto === 'rrhh' && s.estado === 'solicitada'){
    acciones = `
      <button class="btn btn-ghost" onclick="abrirResolverSancion('${s.id}')" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)">⚖️ Resolver</button>`;
  } else if(contexto === 'rrhh'){
    acciones = `
      <button class="btn btn-ghost" onclick="abrirDetalleSancion('${s.id}')" style="font-size:11px;padding:5px 10px;color:var(--t2)">👁 Ver</button>
      ${s.estado === 'solicitada' || s.estado === 'aplicada_directa' || s.estado === 'procedente' || s.estado === 'improcedente' ?
        `<button class="btn btn-ghost" onclick="eliminarSancion('${s.id}')" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)">✕</button>` : ''}`;
  } else {
    acciones = `<button class="btn btn-ghost" onclick="abrirDetalleSancion('${s.id}')" style="font-size:11px;padding:5px 10px;color:var(--t2)">👁 Ver</button>`;
  }

  return `
    <div class="card" style="background:var(--bg2);padding:12px 14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;${noVista?'border:1px solid rgba(34,197,94,.4);box-shadow:0 0 0 2px rgba(34,197,94,.15)':''}">
      <div style="min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">${emp?.nom || s.leg}</span>
          <span style="font-size:10px;font-family:var(--font-mono);padding:2px 7px;border-radius:10px;background:var(--bg3);color:var(--t3);border:1px solid var(--border)">${legD(s.leg)}</span>
          <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:${estado.bg};color:${estado.color};border:1px solid ${estado.color}40;text-transform:uppercase">${estado.label}</span>
          ${noVista?'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.15);color:rgb(34,197,94);border:1px solid rgb(34,197,94);text-transform:uppercase">★ NOVEDAD</span>':''}
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:4px">
          📋 ${motivo.label}
        </div>
        <div style="font-size:11px;color:var(--t2);margin-bottom:6px;line-height:1.4">
          ${s.descripcion ? (s.descripcion.length > 180 ? s.descripcion.slice(0,180)+'…' : s.descripcion) : '<i style="color:var(--t3)">Sin descripción</i>'}
        </div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);display:flex;flex-wrap:wrap;gap:14px">
          <span>📤 Solicitada: ${_sancFmt(s.fecha_solicitud)} ${s.solicitante_nom?` · por ${s.solicitante_nom.split(',')[0]}`:''}</span>
          ${tipoSol ? `<span>📝 Pidió: <b style="color:${tipoSol.color}">${tipoSol.label}</b></span>` : ''}
          ${tipoApl ? `<span>⚖️ Aplicó: <b style="color:${tipoApl.color}">${tipoApl.label}</b></span>` : ''}
          ${s.fecha_notificacion ? `<span>🔔 Notif: ${_sancFmt(s.fecha_notificacion)}</span>` : ''}
          ${s.fecha_cumplimiento ? `<span>✅ Cumple: ${_sancFmt(s.fecha_cumplimiento)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${acciones}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// FORMULARIO: solicitar sanción (gerente) o aplicar directa (RR.HH.)
// ═══════════════════════════════════════════════════════════════
function abrirFormSolicitudSancion(opts){
  // opts = { modo: 'gerente' | 'rrhh', leg?: 'XXXXXX' }
  opts = opts || {};
  // modo: siempre debe venir explícito desde el contexto de llamada.
  // 'gerente' → solicitud al equipo, SIN fechas de notificación/cumplimiento.
  // 'rrhh'    → aplicación directa desde panel RR.HH., CON fechas.
  // Fallback por compatibilidad: si no se pasa modo, se infiere por rol.
  const modo = opts.modo || (currentUser?.role === 'rrhh' ? 'rrhh' : 'gerente');
  const legPreSel = opts.leg || '';

  // El CEO (Parera Martín) tiene los mismos privilegios que RRHH:
  // puede solicitar sanciones para cualquier empleado.
  const _userNom = (currentUser?.emp?.nom || '').toUpperCase();
  const esCEO = _userNom.includes('PARERA, MARTIN') || _userNom.includes('PARERA MARTIN');

  // Determinar empleados disponibles para seleccionar
  let empleadosDisp;
  if(modo === 'gerente' && !esCEO){
    const gerNom = currentUser.emp.nom.toUpperCase().trim();
    const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
    empleadosDisp = getNomina().filter(e => {
      if(e._deBaja || e.egreso) return false;
      const v = (typeof getValidador === 'function') ? getValidador(e) : null;
      if(!v || !v.validador) return false;
      if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
      return v.validador.toUpperCase() === gerNom;
    });
  } else {
    // RR.HH. y CEO pueden sancionar a cualquiera
    empleadosDisp = getNomina().filter(e => !e._deBaja && !e.egreso);
  }
  empleadosDisp = empleadosDisp.sort((a,b)=>a.nom.localeCompare(b.nom));

  if(empleadosDisp.length === 0){
    toast('⚠ No hay empleados disponibles', 'var(--red)');
    return;
  }

  const prev = document.getElementById('modal-sancion-form');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-sancion-form';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  const empOpts = empleadosDisp.map(e =>
    `<option value="${e.leg}" ${legPreSel===e.leg?'selected':''}>${legD(e.leg)} · ${e.nom}${e.lugar?' · '+e.lugar:''}</option>`
  ).join('');

  const motivoOpts = SANC_MOTIVOS.map(m =>
    `<option value="${m.v}">${m.label}</option>`
  ).join('');

  const tipoOpts = SANC_TIPOS.map(t =>
    `<option value="${t.v}">${t.label}</option>`
  ).join('');

  const titulo = modo === 'rrhh' ? '+ Aplicar sanción directa' : '+ Enviar solicitud de sanción';
  const submitLabel = modo === 'rrhh' ? '⚖️ Aplicar sanción' : '📤 Enviar solicitud';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⚖️ ${titulo}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${modo==='rrhh' ? 'RR.HH. registra y aplica directamente la sanción' : 'La solicitud queda pendiente de revisión por RR.HH.'}</div>
        </div>
        <button onclick="document.getElementById('modal-sancion-form').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Empleado a sancionar *</label>
          <select id="sanc-leg"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="">— Seleccionar —</option>
            ${empOpts}
          </select>
          <div style="font-size:10px;color:var(--t3);margin-top:3px">${modo==='gerente' && !esCEO ? `🔒 Solo aparecen los ${empleadosDisp.length} empleados que tenés a cargo directo. Para sancionar fuera de tu área, contactá a RR.HH. o al CEO.` : esCEO ? `Como CEO podés sancionar a cualquiera (${empleadosDisp.length} empleados)` : `Cualquier empleado activo del grupo (${empleadosDisp.length})`}</div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Motivo de la sanción *</label>
          <select id="sanc-motivo"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="">— Seleccionar motivo —</option>
            ${motivoOpts}
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Descripción del incumplimiento *</label>
          <textarea id="sanc-descripcion" rows="5" maxlength="500"
            placeholder="Describí en detalle lo sucedido: cuándo, dónde, cómo, qué dijo o hizo el empleado, qué consecuencias tuvo..."
            oninput="document.getElementById('sanc-desc-count').textContent = this.value.length"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit;line-height:1.5"></textarea>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-top:3px;font-family:var(--font-mono)">
            <span>Máximo 500 caracteres</span>
            <span><span id="sanc-desc-count">0</span> / 500</span>
          </div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">${modo==='rrhh' ? 'Sanción a aplicar *' : 'Sanción solicitada *'}</label>
          <select id="sanc-tipo"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="">— Seleccionar —</option>
            ${tipoOpts}
          </select>
          <div style="font-size:10px;color:var(--t3);margin-top:3px">${modo==='gerente' ? 'Es la sanción que sugerís. RR.HH. evaluará y decidirá la sanción definitiva.' : 'Esta sanción quedará registrada como aplicada al empleado.'}</div>
        </div>

        ${modo === 'rrhh' ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Fecha de notificación *</label>
              <input type="date" id="sanc-fecha-notif" value="${new Date().toISOString().slice(0,10)}" max="${new Date().toISOString().slice(0,10)}"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Fecha cumplimiento</label>
              <input type="date" id="sanc-fecha-cumpl"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
              <div style="font-size:10px;color:var(--t3);margin-top:3px">Si aplica (ej: días de suspensión)</div>
            </div>
          </div>
        ` : ''}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-sancion-form').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarSolicitudSancion('${modo}')" style="font-size:13px;padding:8px 18px;background:rgb(239,68,68);border-color:rgb(239,68,68)">${submitLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>{
    const el = document.getElementById('sanc-leg');
    if(el && !legPreSel) el.focus();
  }, 50);
}

function guardarSolicitudSancion(modo){
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const leg = gv('sanc-leg');
  const motivo = gv('sanc-motivo');
  const descripcion = gv('sanc-descripcion');
  const tipo = gv('sanc-tipo');

  if(!leg){ showAlert('Seleccioná el empleado a sancionar.', 'warning'); return; }
  if(!motivo){ showAlert('Seleccioná el motivo de la sanción.', 'warning'); return; }
  if(!descripcion){ showAlert('La descripción del incumplimiento es obligatoria.', 'warning'); return; }
  if(descripcion.length > 500){ showAlert('La descripción no puede superar los 500 caracteres.', 'warning'); return; }
  if(!tipo){ showAlert(`Seleccioná la sanción ${modo==='rrhh'?'a aplicar':'solicitada'}.`, 'warning'); return; }

  const emp = empByLeg(leg);
  if(!emp){ showAlert('Empleado no encontrado.', 'warning'); return; }

  // ═════════════════════════════════════════════════════════════════════
  // VALIDACIÓN DE PERMISOS — backend
  // ───────────────────────────────────────────────────────────────────────
  // Defensa en profundidad: el dropdown ya filtra, pero si alguien manipula
  // el DOM o llama directo a la función con un legajo arbitrario, lo bloqueamos.
  //
  // Reglas:
  //   - RR.HH. (role === 'rrhh')          → puede sancionar a cualquiera
  //   - CEO (Parera Martín)               → puede sancionar a cualquiera
  //   - Papa, Pablo Gabriel (top del árbol) → puede sancionar a cualquiera del árbol
  //   - Resto de los gerentes              → solo a empleados a cargo directo
  // ═════════════════════════════════════════════════════════════════════
  const userRole = currentUser?.role || '';
  const userNom  = (currentUser?.emp?.nom || '').toUpperCase();
  const esRRHH  = userRole === 'rrhh';
  const esCEO   = userNom.includes('PARERA, MARTIN') || userNom.includes('PARERA MARTIN');
  const esPapa  = userNom.includes('PAPA, PABLO GABRIEL') || userNom.includes('PAPA PABLO GABRIEL');

  if(!esRRHH && !esCEO){
    // Es un gerente regular o Papa — verificar que el empleado esté bajo su cargo
    const v = (typeof getValidador === 'function') ? getValidador(emp) : null;
    const validadorNom = (v?.validador || '').toUpperCase();
    let autorizado = false;
    if(esPapa){
      // Papa puede sancionar a cualquiera que tenga su nombre en el árbol de validación
      autorizado = validadorNom.includes('PAPA, PABLO GABRIEL');
    } else {
      // Gerente regular: solo subordinados directos
      autorizado = (validadorNom === userNom.trim());
    }
    if(!autorizado){
      showAlert('⚠ Solo podés solicitar sanciones para empleados que tengas a cargo.\n\nEste empleado no figura como tu subordinado directo. Si necesitás sancionar a alguien fuera de tu área, contactá a RR.HH. o al CEO.', 'warning');
      if(typeof logAuditX === 'function'){
        logAuditX('sanciones', 'intento_no_autorizado', {
          solicitante_leg: currentUser?.emp?.leg,
          solicitante_nom: currentUser?.emp?.nom,
          objetivo_leg: leg,
          objetivo_nom: emp.nom,
          validador_real: v?.validador || '(sin validador)'
        });
      }
      return;
    }
  }

  let fechaNotif = '', fechaCumpl = '';
  if(modo === 'rrhh'){
    fechaNotif = gv('sanc-fecha-notif');
    fechaCumpl = gv('sanc-fecha-cumpl');
    if(!fechaNotif){ showAlert('La fecha de notificación es obligatoria.', 'warning'); return; }
    if(fechaNotif > new Date().toISOString().slice(0,10)){ showAlert('La fecha de notificación no puede ser futura.', 'warning'); return; }
    if(fechaCumpl && fechaCumpl < fechaNotif){ showAlert('La fecha de cumplimiento no puede ser anterior a la de notificación.', 'warning'); return; }
  }

  const ahora = new Date().toISOString();
  const nueva = {
    id: 'sanc_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    leg,
    motivo,
    descripcion,
    tipo_solicitado: tipo,
    fecha_solicitud: ahora,
    solicitante_leg: currentUser?.emp?.leg || '',
    solicitante_nom: currentUser?.emp?.nom || '',
    estado: modo === 'rrhh' ? 'aplicada_directa' : 'solicitada',
    creado: ahora
  };

  if(modo === 'rrhh'){
    nueva.tipo_aplicado = tipo;
    nueva.fecha_aplicacion = ahora;
    nueva.fecha_notificacion = fechaNotif;
    nueva.fecha_cumplimiento = fechaCumpl;
    nueva.aplicador_leg = currentUser?.emp?.leg || '';
    nueva.aplicador_nom = currentUser?.emp?.nom || '';
  }

  const all = getSanciones();
  all.push(nueva);
  setSanciones(all);

  // ── Auditoría: alta de sanción (solicitada por gerente o aplicada por RR.HH.) ──
  if(typeof auditRRHH === 'function'){
    const tipoLabel = (typeof _sancTipoInfo === 'function') ? (_sancTipoInfo(tipo)?.label || tipo) : tipo;
    const motivoLabel = (typeof _sancMotivoInfo === 'function') ? (_sancMotivoInfo(motivo)?.label || motivo) : motivo;
    auditRRHH('sancion_alta', emp, {
      detail: `${modo==='rrhh'?'Aplicada directo por RR.HH.':'Solicitada por gerente'} · Tipo: ${tipoLabel} · Motivo: ${motivoLabel}`
    });
  }

  document.getElementById('modal-sancion-form').remove();
  toast(modo==='rrhh' ? '✓ Sanción aplicada y registrada' : '✓ Solicitud enviada a RR.HH.', 'var(--green)');

  // Refrescar vistas según contexto
  if(document.getElementById('ger-sanciones-content')) renderSancionesPanelGerente();
  if(document.getElementById('sanciones-content')) renderSancionesPanelRRHH();
  _rrhhSancActualizarBadge();
  _gerSancActualizarBadge();
}

// ═══════════════════════════════════════════════════════════════
// MODAL: Resolver solicitud (RR.HH.)
// ═══════════════════════════════════════════════════════════════
function abrirResolverSancion(id){
  const s = getSanciones().find(x => x.id === id);
  if(!s){ toast('⚠ Solicitud no encontrada', 'var(--red)'); return; }
  if(s.estado !== 'solicitada'){ abrirDetalleSancion(id); return; }

  const emp = empByLeg(s.leg);
  const motivo = _sancMotivoInfo(s.motivo);
  const tipoSol = _sancTipoInfo(s.tipo_solicitado);

  const prev = document.getElementById('modal-sancion-resolver');
  if(prev) prev.remove();

  const tipoOpts = SANC_TIPOS.map(t =>
    `<option value="${t.v}" ${s.tipo_solicitado===t.v?'selected':''}>${t.label}</option>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-sancion-resolver';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:680px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⚖️ Resolver solicitud disciplinaria</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${emp?.nom || s.leg} · ${legD(s.leg)}</div>
        </div>
        <button onclick="document.getElementById('modal-sancion-resolver').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <!-- Datos de la solicitud (read-only) -->
        <div class="card" style="background:var(--bg2);padding:12px 14px">
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:8px">Solicitud original</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">SOLICITANTE</span><br><span style="color:var(--t1)">${s.solicitante_nom || '—'}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">FECHA</span><br><span style="color:var(--t1);font-family:var(--font-mono)">${_sancFmtDT(s.fecha_solicitud)}</span></div>
            <div style="grid-column:1/-1"><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">MOTIVO</span><br><span style="color:var(--t1)">${motivo.label}</span></div>
            <div style="grid-column:1/-1"><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">DESCRIPCIÓN</span><br><span style="color:var(--t2);line-height:1.5;display:block;margin-top:3px;padding:8px 10px;background:var(--bg3);border-radius:6px;font-size:12px">${s.descripcion || '—'}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">SANCIÓN PEDIDA</span><br><span style="color:${tipoSol.color};font-weight:600">${tipoSol.label}</span></div>
          </div>
        </div>

        <!-- Resolución -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Decisión de RR.HH. *</label>
          <select id="resolver-decision" onchange="_resolverDecisionCambio()"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="">— Seleccionar —</option>
            <option value="procedente">✓ Procedente — aplicar sanción</option>
            <option value="improcedente">✗ Improcedente — rechazar solicitud</option>
          </select>
        </div>

        <!-- Bloque de aplicación (solo si procedente) -->
        <div id="resolver-aplicar-bloque" style="display:none;padding:14px 16px;background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.25);border-radius:var(--r)">
          <div style="font-size:11px;font-weight:600;color:rgb(34,197,94);margin-bottom:10px;font-family:var(--font-mono);text-transform:uppercase">⚖️ Sanción a aplicar</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Sanción definitiva *</label>
              <select id="resolver-tipo-aplicado"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
                ${tipoOpts}
              </select>
              <div style="font-size:10px;color:var(--t3);margin-top:3px">Podés mantener la sanción solicitada o aplicar una distinta (más leve o más grave)</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Fecha de notificación *</label>
                <input type="date" id="resolver-fecha-notif" value="${new Date().toISOString().slice(0,10)}" max="${new Date().toISOString().slice(0,10)}"
                  style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
              </div>
              <div>
                <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Fecha cumplimiento</label>
                <input type="date" id="resolver-fecha-cumpl"
                  style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
                <div style="font-size:10px;color:var(--t3);margin-top:3px">Si aplica</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comentario -->
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Comentario / fundamento de RR.HH.</label>
          <textarea id="resolver-comentario" rows="3" maxlength="500"
            placeholder="Fundamentación de la decisión, observaciones para el gerente, contexto adicional..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit"></textarea>
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-sancion-resolver').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="ejecutarResolucionSancion('${s.id}')" style="font-size:13px;padding:8px 18px">💾 Resolver</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _resolverDecisionCambio(){
  const dec = document.getElementById('resolver-decision')?.value;
  const bloque = document.getElementById('resolver-aplicar-bloque');
  if(!bloque) return;
  bloque.style.display = (dec === 'procedente') ? 'block' : 'none';
}

function ejecutarResolucionSancion(id){
  const all = getSanciones();
  const i = all.findIndex(x => x.id === id);
  if(i < 0){ toast('⚠ Solicitud no encontrada', 'var(--red)'); return; }
  const s = all[i];

  const decision = document.getElementById('resolver-decision')?.value;
  const comentario = (document.getElementById('resolver-comentario')?.value || '').trim();

  if(!decision){ showAlert('Seleccioná la decisión.', 'warning'); return; }

  const ahora = new Date().toISOString();

  if(decision === 'procedente'){
    const tipoApl = document.getElementById('resolver-tipo-aplicado')?.value;
    const fechaNotif = document.getElementById('resolver-fecha-notif')?.value;
    const fechaCumpl = document.getElementById('resolver-fecha-cumpl')?.value;
    if(!tipoApl){ showAlert('Seleccioná la sanción a aplicar.', 'warning'); return; }
    if(!fechaNotif){ showAlert('La fecha de notificación es obligatoria.', 'warning'); return; }
    if(fechaNotif > new Date().toISOString().slice(0,10)){ showAlert('La fecha de notificación no puede ser futura.', 'warning'); return; }
    if(fechaCumpl && fechaCumpl < fechaNotif){ showAlert('La fecha de cumplimiento no puede ser anterior a la de notificación.', 'warning'); return; }

    s.estado = 'procedente';
    s.tipo_aplicado = tipoApl;
    s.fecha_notificacion = fechaNotif;
    s.fecha_cumplimiento = fechaCumpl;
  } else {
    s.estado = 'improcedente';
  }

  s.fecha_aplicacion = ahora;
  s.aplicador_leg = currentUser?.emp?.leg || '';
  s.aplicador_nom = currentUser?.emp?.nom || '';
  s.comentario_rrhh = comentario;
  s.gerente_visto = null; // resetear: el gerente debe verla

  setSanciones(all);
  document.getElementById('modal-sancion-resolver').remove();
  toast(decision==='procedente' ? '✓ Sanción aplicada y notificada al gerente' : '✓ Solicitud marcada improcedente', 'var(--green)');

  if(document.getElementById('sanciones-content')) renderSancionesPanelRRHH();
  _rrhhSancActualizarBadge();
}

// ═══════════════════════════════════════════════════════════════
// MODAL: ver detalle (cualquier rol)
// ═══════════════════════════════════════════════════════════════
function abrirDetalleSancion(id){
  const s = getSanciones().find(x => x.id === id);
  if(!s){ toast('⚠ Sanción no encontrada', 'var(--red)'); return; }
  const emp = empByLeg(s.leg);
  const motivo = _sancMotivoInfo(s.motivo);
  const tipoSol = _sancTipoInfo(s.tipo_solicitado);
  const tipoApl = s.tipo_aplicado ? _sancTipoInfo(s.tipo_aplicado) : null;
  const estado = _sancEstadoInfo(s.estado);

  // Marcar como visto si es el gerente solicitante
  if((s.estado === 'procedente' || s.estado === 'improcedente') &&
     s.solicitante_leg === currentUser?.emp?.leg && !s.gerente_visto){
    const all = getSanciones();
    const idx = all.findIndex(x => x.id === id);
    if(idx >= 0){ all[idx].gerente_visto = new Date().toISOString(); setSanciones(all); }
    setTimeout(()=>{ _gerSancActualizarBadge(); if(document.getElementById('ger-sanciones-content')) renderSancionesPanelGerente(); }, 100);
  }

  const prev = document.getElementById('modal-sancion-detalle');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-sancion-detalle';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⚖️ Detalle de la sanción</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${emp?.nom || s.leg} · ${legD(s.leg)}</div>
        </div>
        <button onclick="document.getElementById('modal-sancion-detalle').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:center">
          <span style="font-size:12px;font-family:var(--font-mono);padding:6px 14px;border-radius:99px;background:${estado.bg};color:${estado.color};border:1px solid ${estado.color}40;text-transform:uppercase;font-weight:600">${estado.label}</span>
        </div>

        <div class="card" style="background:var(--bg2);padding:14px 16px">
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:10px">Empleado</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">NOMBRE</span><br><span style="color:var(--t1)">${emp?.nom || '—'}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">LEGAJO</span><br><span style="color:var(--t1);font-family:var(--font-mono)">${legD(s.leg)}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">EMPRESA</span><br><span style="color:var(--t2)">${emp?.emp || '—'}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">CENTRO</span><br><span style="color:var(--t2)">${emp?.lugar || '—'}</span></div>
          </div>
        </div>

        <div class="card" style="background:var(--bg2);padding:14px 16px">
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:10px">Solicitud${s.estado==='aplicada_directa'?' (directa por RR.HH.)':''}</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">SOLICITANTE</span><br><span style="color:var(--t1)">${s.solicitante_nom || '—'}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">FECHA SOLICITUD</span><br><span style="color:var(--t1);font-family:var(--font-mono)">${_sancFmtDT(s.fecha_solicitud)}</span></div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">MOTIVO</span><br><span style="color:var(--t1)">${motivo.label}</span></div>
            <div>
              <span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">DESCRIPCIÓN</span>
              <div style="color:var(--t2);line-height:1.55;margin-top:5px;padding:10px 12px;background:var(--bg3);border-radius:6px;font-size:12px;white-space:pre-wrap">${s.descripcion || '—'}</div>
            </div>
            <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">SANCIÓN ${s.estado==='aplicada_directa'?'APLICADA':'SOLICITADA'}</span><br><span style="color:${tipoSol.color};font-weight:600">${tipoSol.label}</span></div>
          </div>
        </div>

        ${(s.estado==='procedente' || s.estado==='improcedente' || s.estado==='aplicada_directa') ? `
          <div class="card" style="background:${s.estado==='improcedente'?'rgba(239,68,68,.05)':'rgba(34,197,94,.05)'};padding:14px 16px;border:1px solid ${s.estado==='improcedente'?'rgba(239,68,68,.25)':'rgba(34,197,94,.25)'}">
            <div style="font-size:10px;color:${s.estado==='improcedente'?'rgb(239,68,68)':'rgb(34,197,94)'};font-family:var(--font-mono);text-transform:uppercase;margin-bottom:10px;font-weight:600">${s.estado==='improcedente'?'❌ Resolución de RR.HH. — Improcedente':'✓ Resolución de RR.HH. — Aplicada'}</div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
              ${tipoApl ? `<div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">SANCIÓN APLICADA</span><br><span style="color:${tipoApl.color};font-weight:600">${tipoApl.label}</span>${tipoApl.v !== s.tipo_solicitado && s.estado!=='aplicada_directa'?'<span style="font-size:10px;color:var(--t3);margin-left:8px">(distinta a la solicitada)</span>':''}</div>` : ''}
              ${s.fecha_notificacion ? `<div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">FECHA NOTIFICACIÓN</span><br><span style="color:var(--t1);font-family:var(--font-mono)">${_sancFmt(s.fecha_notificacion)}</span></div>` : ''}
              ${s.fecha_cumplimiento ? `<div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">FECHA CUMPLIMIENTO</span><br><span style="color:var(--t1);font-family:var(--font-mono)">${_sancFmt(s.fecha_cumplimiento)}</span></div>` : ''}
              <div><span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">RESUELTO POR</span><br><span style="color:var(--t1)">${s.aplicador_nom || '—'}</span> · <span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">${_sancFmtDT(s.fecha_aplicacion)}</span></div>
              ${s.comentario_rrhh ? `<div>
                <span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">COMENTARIO DE RR.HH.</span>
                <div style="color:var(--t2);line-height:1.55;margin-top:5px;padding:10px 12px;background:var(--bg2);border-radius:6px;font-size:12px;white-space:pre-wrap">${s.comentario_rrhh}</div>
              </div>` : ''}
            </div>
          </div>
        ` : ''}
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${(s.estado==='procedente' || s.estado==='aplicada_directa') ? `
          <button class="btn btn-ghost" onclick="imprimirNotifSancion('${s.id}', { skipEdit: true })" style="font-size:13px;padding:8px 14px;color:var(--t3)" title="Imprimir la notificación directamente sin pasar por el editor">🖨 Imprimir directo</button>
          <button class="btn btn-primary" onclick="imprimirNotifSancion('${s.id}')" style="font-size:13px;padding:8px 16px;background:var(--accent2)" title="Editar el texto del escrito antes de imprimir">📝 Editar y notificar</button>
        ` : ''}
        ${s.estado==='solicitada' && currentUser?.role==='rrhh' ? `<button class="btn btn-primary" onclick="document.getElementById('modal-sancion-detalle').remove();abrirResolverSancion('${s.id}')" style="font-size:13px;padding:8px 18px">⚖️ Resolver</button>` : ''}
        <button class="btn btn-ghost" onclick="document.getElementById('modal-sancion-detalle').remove()" style="font-size:13px;padding:8px 14px">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function eliminarSancion(id){
  const s = getSanciones().find(x => x.id === id);
  if(!s) return;
  const emp = empByLeg(s.leg);
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar la sanción de ${emp?.nom || s.leg}?<br><br>Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const all = getSanciones().filter(x => x.id !== id);
  setSanciones(all);
  toast('✓ Sanción eliminada', 'var(--red)');
  if(document.getElementById('sanciones-content')) renderSancionesPanelRRHH();
  if(document.getElementById('ger-sanciones-content')) renderSancionesPanelGerente();
  _rrhhSancActualizarBadge();
  _gerSancActualizarBadge();
}

// ═══════════════════════════════════════════════════════════════
// PANEL RR.HH. — Sanciones
// ═══════════════════════════════════════════════════════════════
let _rrhhSancFiltro = { busqueda:'', empresa:'', estado:'', tipo:'', desde:'', hasta:'' };
let _rrhhSancTab = 'pendientes';

function renderSancionesPanelRRHH(){
  const cont = document.getElementById('sanciones-content');
  if(!cont) return;

  const todas = getSanciones();
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const empresas = [...new Set(nomina.map(e => e.emp).filter(Boolean))].sort();

  // Métricas
  const pendientes = todas.filter(s => s.estado === 'solicitada');
  const aplicadas = todas.filter(s => s.estado === 'procedente' || s.estado === 'aplicada_directa');
  const improcedentes = todas.filter(s => s.estado === 'improcedente');

  let html = `
    <div class="card" style="padding:14px 16px;background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.2);margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:18px">⚖️</span>
        <div style="flex:1;min-width:200px">
          <div style="font-size:13px;font-weight:600;color:var(--t1)">Sanciones disciplinarias del grupo</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Solicitudes de gerentes pendientes de resolver y aplicación directa de sanciones</div>
        </div>
        <button class="btn btn-primary" onclick="abrirFormSolicitudSancion({modo:'rrhh'})" style="font-size:12px;padding:7px 14px;background:rgb(239,68,68);border-color:rgb(239,68,68)">+ Aplicar sanción directa</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;margin-bottom:14px">
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Total</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:3px">${todas.length}</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Pendientes</div>
        <div style="font-size:22px;font-weight:600;color:${pendientes.length>0?'rgb(234,179,8)':'var(--t1)'};font-family:var(--font-mono);margin-top:3px">${pendientes.length}</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Aplicadas</div>
        <div style="font-size:22px;font-weight:600;color:rgb(34,197,94);font-family:var(--font-mono);margin-top:3px">${aplicadas.length}</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Improcedentes</div>
        <div style="font-size:22px;font-weight:600;color:${improcedentes.length>0?'rgb(239,68,68)':'var(--t1)'};font-family:var(--font-mono);margin-top:3px">${improcedentes.length}</div>
      </div>
    </div>`;

  // Tabs
  html += `
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:14px;overflow-x:auto">
      <button onclick="_rrhhSancSetTab('pendientes')" id="rrhhsanc-tab-pendientes"
        style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${_rrhhSancTab==='pendientes'?'var(--accent)':'transparent'};margin-bottom:-1px;color:${_rrhhSancTab==='pendientes'?'var(--accent2)':'var(--t3)'};font-size:12px;font-weight:${_rrhhSancTab==='pendientes'?'600':'400'};cursor:pointer;font-family:var(--font-mono);white-space:nowrap">
        ⏳ Pendientes${pendientes.length>0?` (${pendientes.length})`:''}
      </button>
      <button onclick="_rrhhSancSetTab('historial')" id="rrhhsanc-tab-historial"
        style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${_rrhhSancTab==='historial'?'var(--accent)':'transparent'};margin-bottom:-1px;color:${_rrhhSancTab==='historial'?'var(--accent2)':'var(--t3)'};font-size:12px;font-weight:${_rrhhSancTab==='historial'?'600':'400'};cursor:pointer;font-family:var(--font-mono);white-space:nowrap">
        📜 Histórico completo
      </button>
      <button onclick="_rrhhSancSetTab('por-empleado')" id="rrhhsanc-tab-por-empleado"
        style="padding:8px 16px;background:none;border:none;border-bottom:2px solid ${_rrhhSancTab==='por-empleado'?'var(--accent)':'transparent'};margin-bottom:-1px;color:${_rrhhSancTab==='por-empleado'?'var(--accent2)':'var(--t3)'};font-size:12px;font-weight:${_rrhhSancTab==='por-empleado'?'600':'400'};cursor:pointer;font-family:var(--font-mono);white-space:nowrap">
        👤 Consulta por empleado
      </button>
    </div>`;

  if(_rrhhSancTab === 'pendientes'){
    if(pendientes.length === 0){
      html += `
        <div class="card" style="padding:36px;text-align:center;color:var(--t3);font-size:13px">
          <div style="font-size:30px;margin-bottom:8px">✓</div>
          <div style="font-size:14px;color:var(--t2)">No hay solicitudes pendientes</div>
          <div style="font-size:11px;margin-top:4px">Todas las solicitudes de los gerentes fueron resueltas</div>
        </div>`;
    } else {
      const orden = pendientes.slice().sort((a,b)=>(a.fecha_solicitud||'').localeCompare(b.fecha_solicitud||''));
      html += `<div style="display:flex;flex-direction:column;gap:8px">`;
      for(const s of orden) html += _sancRenderFila(s, 'rrhh');
      html += `</div>`;
    }
  } else if(_rrhhSancTab === 'historial'){
    // Filtros
    let lista = todas.slice();
    if(_rrhhSancFiltro.busqueda){
      const q = _rrhhSancFiltro.busqueda.toLowerCase();
      lista = lista.filter(s => {
        const e = empByLeg(s.leg);
        return (s.leg||'').includes(q) ||
               (e?.nom||'').toLowerCase().includes(q) ||
               (s.solicitante_nom||'').toLowerCase().includes(q);
      });
    }
    if(_rrhhSancFiltro.empresa) lista = lista.filter(s => empByLeg(s.leg)?.emp === _rrhhSancFiltro.empresa);
    if(_rrhhSancFiltro.estado) lista = lista.filter(s => s.estado === _rrhhSancFiltro.estado);
    if(_rrhhSancFiltro.tipo) lista = lista.filter(s => s.tipo_aplicado === _rrhhSancFiltro.tipo || s.tipo_solicitado === _rrhhSancFiltro.tipo);
    if(_rrhhSancFiltro.desde){
      lista = lista.filter(s => (s.fecha_notificacion || s.fecha_solicitud || '').slice(0,10) >= _rrhhSancFiltro.desde);
    }
    if(_rrhhSancFiltro.hasta){
      lista = lista.filter(s => (s.fecha_notificacion || s.fecha_solicitud || '').slice(0,10) <= _rrhhSancFiltro.hasta);
    }
    lista.sort((a,b) => {
      const fa = a.fecha_aplicacion || a.fecha_solicitud || '';
      const fb = b.fecha_aplicacion || b.fecha_solicitud || '';
      return fb.localeCompare(fa);
    });

    html += `
      <div class="card" style="padding:12px 14px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <input type="text" placeholder="Buscar por nombre, legajo o solicitante..." value="${_rrhhSancFiltro.busqueda}"
          oninput="_rrhhSancSetFiltro('busqueda', this.value)"
          style="flex:1;min-width:200px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none">
        <select onchange="_rrhhSancSetFiltro('empresa', this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
          <option value="">Todas las empresas</option>
          ${empresas.map(e=>`<option value="${e}" ${_rrhhSancFiltro.empresa===e?'selected':''}>${e}</option>`).join('')}
        </select>
        <select onchange="_rrhhSancSetFiltro('estado', this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
          <option value="">Todos los estados</option>
          ${Object.keys(SANC_ESTADOS).map(k=>`<option value="${k}" ${_rrhhSancFiltro.estado===k?'selected':''}>${SANC_ESTADOS[k].label}</option>`).join('')}
        </select>
        <select onchange="_rrhhSancSetFiltro('tipo', this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
          <option value="">Todos los tipos</option>
          ${SANC_TIPOS.map(t=>`<option value="${t.v}" ${_rrhhSancFiltro.tipo===t.v?'selected':''}>${t.label}</option>`).join('')}
        </select>
        <input type="date" value="${_rrhhSancFiltro.desde}" onchange="_rrhhSancSetFiltro('desde', this.value)" title="Desde" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
        <input type="date" value="${_rrhhSancFiltro.hasta}" onchange="_rrhhSancSetFiltro('hasta', this.value)" title="Hasta" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
        <button class="btn btn-ghost" onclick="exportarSancionesExcel()" style="font-size:11px;padding:6px 12px;color:rgb(34,197,94);border-color:rgba(34,197,94,.3)">⬇ Excel</button>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${lista.length} resultado${lista.length!==1?'s':''}</span>
      </div>`;

    if(lista.length === 0){
      html += `<div class="card" style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Sin sanciones que coincidan con los filtros aplicados.</div>`;
    } else {
      html += `<div style="display:flex;flex-direction:column;gap:8px">`;
      for(const s of lista) html += _sancRenderFila(s, 'rrhh');
      html += `</div>`;
    }
  } else if(_rrhhSancTab === 'por-empleado'){
    // Consulta por empleado: vista agregada
    html += _renderSancPorEmpleado();
  }

  cont.innerHTML = html;
}

function _rrhhSancSetTab(tab){
  _rrhhSancTab = tab;
  renderSancionesPanelRRHH();
}

function _rrhhSancSetFiltro(campo, valor){
  _rrhhSancFiltro[campo] = valor;
  renderSancionesPanelRRHH();
  if(campo === 'busqueda'){
    setTimeout(()=>{
      const inp = document.querySelector('#sanciones-content input[placeholder*="Buscar por nombre"]');
      if(inp){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }, 0);
  }
}

// Vista agregada por empleado (consulta puntual)
let _rrhhSancEmpQuery = '';

function _renderSancPorEmpleado(){
  const todas = getSanciones();
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);

  // Solo empleados con al menos una sanción
  const conSanciones = nomina.filter(e => todas.some(s => s.leg === e.leg));

  let lista = conSanciones;
  if(_rrhhSancEmpQuery){
    const q = _rrhhSancEmpQuery.toLowerCase();
    lista = lista.filter(e =>
      (e.nom||'').toLowerCase().includes(q) ||
      (e.leg||'').includes(q) ||
      (e.cuil||'').includes(q)
    );
  }
  lista.sort((a,b)=>a.nom.localeCompare(b.nom));

  let html = `
    <div class="card" style="padding:12px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <input type="text" placeholder="🔍 Buscar empleado por nombre, legajo o CUIL..." value="${_rrhhSancEmpQuery}"
        oninput="_rrhhSancEmpQuery=this.value;renderSancionesPanelRRHH()"
        style="flex:1;min-width:200px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 11px;color:var(--t1);font-size:12px;outline:none">
      <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${lista.length} empleado${lista.length!==1?'s':''} con sanciones</span>
    </div>`;

  if(lista.length === 0){
    html += `<div class="card" style="padding:30px;text-align:center;color:var(--t3);font-size:13px">${_rrhhSancEmpQuery ? 'Sin empleados que coincidan con la búsqueda' : 'No hay empleados con sanciones registradas'}</div>`;
    return html;
  }

  html += `<div class="card" style="padding:0;overflow:hidden">
    <div style="overflow-x:auto">
      <table style="width:100%;min-width:780px;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Legajo</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Apellido y Nombre</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Última sanción aplicada</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">F. notificación</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">F. cumplimiento</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Total</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase"></th>
          </tr>
        </thead>
        <tbody>`;

  for(const e of lista){
    const sanEmp = todas.filter(s => s.leg === e.leg)
      .sort((a,b)=>(b.fecha_aplicacion||b.fecha_solicitud||'').localeCompare(a.fecha_aplicacion||a.fecha_solicitud||''));
    const ultima = sanEmp.find(s => s.estado==='procedente' || s.estado==='aplicada_directa');
    const tipoUlt = ultima?.tipo_aplicado ? _sancTipoInfo(ultima.tipo_aplicado) : null;
    html += `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:9px 12px;font-family:var(--font-mono);color:var(--t1);font-size:11px">${legD(e.leg)}</td>
        <td style="padding:9px 12px;color:var(--t1);font-size:12px">${e.nom}</td>
        <td style="padding:9px 12px;font-size:11px">${tipoUlt ? `<span style="color:${tipoUlt.color};font-weight:600">${tipoUlt.label}</span>` : '<span style="color:var(--t3);font-style:italic">sin sanciones aplicadas</span>'}</td>
        <td style="padding:9px 12px;font-family:var(--font-mono);color:var(--t2);font-size:11px">${ultima?.fecha_notificacion ? _sancFmt(ultima.fecha_notificacion) : '—'}</td>
        <td style="padding:9px 12px;font-family:var(--font-mono);color:var(--t2);font-size:11px">${ultima?.fecha_cumplimiento ? _sancFmt(ultima.fecha_cumplimiento) : '—'}</td>
        <td style="padding:9px 12px;text-align:center;font-family:var(--font-mono);color:var(--t1);font-weight:600">${sanEmp.length}</td>
        <td style="padding:8px;text-align:center"><button class="btn btn-ghost" onclick="abrirHistoricoEmpSanciones('${e.leg}')" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)">📜 Ver histórico</button></td>
      </tr>`;
  }
  html += `</tbody></table></div></div>`;
  return html;
}

// Modal: histórico completo de un empleado
function abrirHistoricoEmpSanciones(leg){
  const emp = empByLeg(leg);
  if(!emp){ toast('⚠ Empleado no encontrado','var(--red)'); return; }

  const sanciones = getSanciones().filter(s => s.leg === leg)
    .sort((a,b)=>(b.fecha_aplicacion||b.fecha_solicitud||'').localeCompare(a.fecha_aplicacion||a.fecha_solicitud||''));

  const prev = document.getElementById('modal-sanc-historico-emp');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-sanc-historico-emp';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  let body = '';
  if(sanciones.length === 0){
    body = `<div style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Sin sanciones registradas</div>`;
  } else {
    body = `<div class="card" style="padding:0;overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Fecha solicitud</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Sanción aplicada</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Motivo</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">F. notif.</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">F. cumpl.</th>
              <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Estado</th>
              <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase"></th>
            </tr>
          </thead>
          <tbody>`;
    for(const s of sanciones){
      const motivo = _sancMotivoInfo(s.motivo);
      const tipoApl = s.tipo_aplicado ? _sancTipoInfo(s.tipo_aplicado) : null;
      const tipoSol = _sancTipoInfo(s.tipo_solicitado);
      const estado = _sancEstadoInfo(s.estado);
      body += `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;font-family:var(--font-mono);color:var(--t2);font-size:11px;white-space:nowrap">${_sancFmt(s.fecha_solicitud)}</td>
          <td style="padding:9px 12px;font-size:11px">${tipoApl ? `<span style="color:${tipoApl.color};font-weight:600">${tipoApl.label}</span>` : `<span style="color:var(--t3);font-size:10px">solicitada: ${tipoSol.label}</span>`}</td>
          <td style="padding:9px 12px;color:var(--t2);font-size:11px">${motivo.label}</td>
          <td style="padding:9px 12px;font-family:var(--font-mono);color:var(--t2);font-size:11px;white-space:nowrap">${s.fecha_notificacion ? _sancFmt(s.fecha_notificacion) : '—'}</td>
          <td style="padding:9px 12px;font-family:var(--font-mono);color:var(--t2);font-size:11px;white-space:nowrap">${s.fecha_cumplimiento ? _sancFmt(s.fecha_cumplimiento) : '—'}</td>
          <td style="padding:9px 12px"><span style="font-size:9px;font-family:var(--font-mono);padding:2px 7px;border-radius:10px;background:${estado.bg};color:${estado.color};border:1px solid ${estado.color}40;text-transform:uppercase">${estado.label}</span></td>
          <td style="padding:8px;text-align:center"><button class="btn btn-ghost" onclick="abrirDetalleSancion('${s.id}')" style="font-size:11px;padding:4px 9px">👁</button></td>
        </tr>`;
    }
    body += `</tbody></table></div></div>`;
  }

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:980px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📜 Histórico de sanciones</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${emp.nom} · ${legD(emp.leg)} · ${emp.emp || ''}</div>
        </div>
        <button onclick="document.getElementById('modal-sanc-historico-emp').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 22px">
        ${body}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        ${currentUser?.role==='rrhh'?`<button class="btn btn-primary" onclick="document.getElementById('modal-sanc-historico-emp').remove();abrirFormSolicitudSancion({modo:'rrhh',leg:'${leg}'})" style="font-size:13px;padding:8px 18px;background:rgb(239,68,68);border-color:rgb(239,68,68)">+ Aplicar nueva sanción</button>`:''}
        <button class="btn btn-ghost" onclick="document.getElementById('modal-sanc-historico-emp').remove()" style="font-size:13px;padding:8px 14px">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// Badge en card del home RR.HH.
function _rrhhSancActualizarBadge(){
  const badge = document.getElementById('rrhh-card-sanciones-badge');
  if(!badge) return;
  const pend = getSanciones().filter(s => s.estado === 'solicitada').length;
  if(pend > 0){
    badge.textContent = pend;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN A EXCEL
// ═══════════════════════════════════════════════════════════════
function exportarSancionesExcel(){
  const cargarYExportar = () => {
    const XLSX = window.XLSX;
    if(!XLSX){ toast('⚠ Librería Excel no disponible','var(--red)'); return; }

    const wb = XLSX.utils.book_new();
    const todas = getSanciones();
    const nomina = getNomina();

    // Hoja 1: Detalle de sanciones
    const filas = [['LEGAJO','EMPLEADO','EMPRESA','CENTRO','MOTIVO','DESCRIPCION','SANCION_SOLICITADA','SANCION_APLICADA','ESTADO','FECHA_SOLICITUD','SOLICITANTE','FECHA_NOTIFICACION','FECHA_CUMPLIMIENTO','FECHA_RESOLUCION','RESOLVIO','COMENTARIO_RRHH']];
    for(const s of todas){
      const e = nomina.find(x => x.leg === s.leg) || {};
      filas.push([
        s.leg, e.nom||'', e.emp||'', e.lugar||'',
        _sancMotivoInfo(s.motivo).label,
        s.descripcion || '',
        _sancTipoInfo(s.tipo_solicitado).label,
        s.tipo_aplicado ? _sancTipoInfo(s.tipo_aplicado).label : '',
        _sancEstadoInfo(s.estado).label,
        _sancFmt(s.fecha_solicitud),
        s.solicitante_nom || '',
        s.fecha_notificacion ? _sancFmt(s.fecha_notificacion) : '',
        s.fecha_cumplimiento ? _sancFmt(s.fecha_cumplimiento) : '',
        s.fecha_aplicacion ? _sancFmt(s.fecha_aplicacion) : '',
        s.aplicador_nom || '',
        s.comentario_rrhh || ''
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [{wch:10},{wch:32},{wch:20},{wch:20},{wch:30},{wch:50},{wch:22},{wch:22},{wch:22},{wch:14},{wch:28},{wch:14},{wch:14},{wch:14},{wch:28},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws, 'Sanciones');

    // Hoja 2: Resumen por empleado
    const filasRes = [['LEGAJO','EMPLEADO','EMPRESA','TOTAL','APLICADAS','PENDIENTES','IMPROCEDENTES','ULTIMA_SANCION','ULTIMA_FECHA_NOTIF']];
    const empSet = [...new Set(todas.map(s => s.leg))];
    for(const leg of empSet){
      const e = nomina.find(x => x.leg === leg) || {};
      const sanEmp = todas.filter(s => s.leg === leg);
      const aplicadas = sanEmp.filter(s => s.estado==='procedente' || s.estado==='aplicada_directa');
      const pend = sanEmp.filter(s => s.estado==='solicitada');
      const impr = sanEmp.filter(s => s.estado==='improcedente');
      const ultima = aplicadas.sort((a,b)=>(b.fecha_aplicacion||'').localeCompare(a.fecha_aplicacion||''))[0];
      filasRes.push([
        leg, e.nom||'', e.emp||'',
        sanEmp.length, aplicadas.length, pend.length, impr.length,
        ultima?.tipo_aplicado ? _sancTipoInfo(ultima.tipo_aplicado).label : '',
        ultima?.fecha_notificacion ? _sancFmt(ultima.fecha_notificacion) : ''
      ]);
    }
    const wsR = XLSX.utils.aoa_to_sheet(filasRes);
    wsR['!cols'] = [{wch:10},{wch:32},{wch:20},...Array(4).fill({wch:12}),{wch:22},{wch:14}];
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumen por empleado');

    XLSX.writeFile(wb, `sanciones_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast('✓ Excel descargado','var(--green)');
  };

  if(window.XLSX){ cargarYExportar(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = cargarYExportar;
  s.onerror = () => showAlert('No se pudo cargar la librería de Excel.', 'warning');
  document.head.appendChild(s);
}


async function toggleMiHistorial(){
  const w = document.getElementById('mi-historial-wrap');
  if(!w) return;
  if(w.style.display === 'none' || !w.style.display){
    w.style.display = 'block';
    // Mostrar loading inmediato para feedback visual
    const cont = document.getElementById('mi-historial-content');
    const cnt  = document.getElementById('mi-historial-count');
    if(cont) cont.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">⏳ Cargando historial...</div>';
    if(cnt) cnt.textContent = '';
    // Scroll suave al wrap para que el usuario lo vea
    setTimeout(() => w.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    try {
      await renderMiHistorial();
    } catch(err){
      console.error('Error renderMiHistorial:', err);
      if(cont) cont.innerHTML = `<div style="padding:24px;text-align:center;color:var(--red);font-size:12px;line-height:1.5">⚠ Error al cargar el historial.<br><span style="color:var(--t3);font-size:10px">${(err.message||err).toString().slice(0,200)}</span><br><br><button class="btn btn-ghost" onclick="renderMiHistorial()" style="font-size:11px;padding:5px 10px">Reintentar</button></div>`;
    }
  } else {
    w.style.display = 'none';
  }
}

async function toggleMisLicenciasHist(){
  const w = document.getElementById('mis-licencias-wrap');
  if(!w || !currentUser) return;
  if(w.style.display === 'none' || !w.style.display){
    w.style.display = 'block';
    await renderHistorialLicenciasUI('mis-licencias-content', currentUser.emp.leg, {
      anio: new Date().getFullYear(),
      titulo: ''
    });
  } else {
    w.style.display = 'none';
  }
}

async function renderMiHistorial(){
  const cont = document.getElementById('mi-historial-content');
  const cnt  = document.getElementById('mi-historial-count');
  if(!cont || !currentUser) return;
  const leg = currentUser.emp.leg;

  let historial = [];
  try {
    historial = await getHistorialEmpleado(leg);
  } catch(err){
    console.error('getHistorialEmpleado falló:', err);
    if(cnt) cnt.textContent = 'error';
    cont.innerHTML = `<div style="padding:24px 16px;color:var(--red);font-size:12px;text-align:center;line-height:1.5">
      ⚠ No se pudo cargar el historial.<br>
      <span style="color:var(--t3);font-size:10px">${(err.message||err).toString().slice(0,200)}</span><br><br>
      <span style="color:var(--t3);font-size:11px">Si el problema persiste, cerrá todas las pestañas del portal y volvé a entrar para actualizar la base local.</span>
    </div>`;
    return;
  }

  if(cnt) cnt.textContent = historial.length ? `${historial.length} cambio${historial.length!==1?'s':''}` : 'sin cambios';
  if(!historial.length){
    cont.innerHTML = `<div style="padding:24px 16px;color:var(--t3);font-size:12px;text-align:center;font-style:italic">Todavía no tenés cambios registrados. Cuando RR.HH. actualice tus datos, vas a verlos acá.</div>`;
    return;
  }
  const porCampo = {};
  historial.forEach(h => {
    if(!porCampo[h.campo]) porCampo[h.campo] = [];
    porCampo[h.campo].push(h);
  });
  const fmtD = iso => { if(!iso) return 'vigente'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  const partes = [];
  // Recorrer primero los campos del whitelist (orden controlado)
  const camposRecorridos = new Set();
  for(const c of CAMPOS_HISTORIAL){
    const regs = porCampo[c.key];
    if(!regs) continue;
    camposRecorridos.add(c.key);
    regs.sort((a,b) => (b.desde||'').localeCompare(a.desde||''));
    const render = c.render ? c.render : (v => v == null ? '—' : String(v));
    const rows = regs.map((r, i) => {
      const vigente = !r.hasta;
      return `<div style="padding:10px 0;${i<regs.length-1?'border-bottom:1px solid var(--border);':''}display:flex;gap:14px;align-items:flex-start">
        <div style="min-width:140px;font-family:var(--font-mono);color:${vigente?'var(--green)':'var(--t3)'};font-size:10px;line-height:1.5">
          ${fmtD(r.desde)} →<br>${fmtD(r.hasta)}${vigente?'<br><span style="font-weight:600">✓ vigente</span>':''}
        </div>
        <div style="flex:1;font-size:12px">
          <div style="color:var(--t1);line-height:1.5">${render(r.valorNuevo)}</div>
          ${r.motivo ? `<div style="color:var(--t3);font-size:10px;margin-top:3px;font-style:italic">Motivo: ${r.motivo}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    partes.push(`<div style="margin-bottom:16px">
      <div style="padding:6px 10px;background:var(--bg2);border-radius:4px;font-size:11px;font-weight:600;color:var(--t1);margin-bottom:6px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">${c.icon||'•'} ${c.label}</div>
      ${rows}
    </div>`);
  }
  // Fallback: si hay registros con campos NO whitelisted, mostrarlos también
  // (puede pasar con cambios viejos de claves obsoletas o nuevas no listadas)
  for(const campo of Object.keys(porCampo)){
    if(camposRecorridos.has(campo)) continue;
    const regs = porCampo[campo];
    regs.sort((a,b) => (b.desde||'').localeCompare(a.desde||''));
    const rows = regs.map((r, i) => {
      const vigente = !r.hasta;
      const valor = r.valorNuevo;
      const valorStr = valor == null ? '—' :
                       typeof valor === 'object' ? JSON.stringify(valor) :
                       String(valor);
      return `<div style="padding:10px 0;${i<regs.length-1?'border-bottom:1px solid var(--border);':''}display:flex;gap:14px;align-items:flex-start">
        <div style="min-width:140px;font-family:var(--font-mono);color:${vigente?'var(--green)':'var(--t3)'};font-size:10px;line-height:1.5">
          ${fmtD(r.desde)} →<br>${fmtD(r.hasta)}${vigente?'<br><span style="font-weight:600">✓ vigente</span>':''}
        </div>
        <div style="flex:1;font-size:12px">
          <div style="color:var(--t1);line-height:1.5">${valorStr.replace(/</g,'&lt;')}</div>
          ${r.motivo ? `<div style="color:var(--t3);font-size:10px;margin-top:3px;font-style:italic">Motivo: ${r.motivo}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    partes.push(`<div style="margin-bottom:16px">
      <div style="padding:6px 10px;background:var(--bg2);border-radius:4px;font-size:11px;font-weight:600;color:var(--t1);margin-bottom:6px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">• ${campo}</div>
      ${rows}
    </div>`);
  }
  cont.innerHTML = partes.length ? partes.join('') : `<div style="padding:24px 16px;color:var(--t3);font-size:12px;text-align:center;font-style:italic">Hay ${historial.length} cambio${historial.length!==1?'s':''} registrado${historial.length!==1?'s':''} pero ninguno se puede mostrar (campos no soportados).</div>`;
}

// ═══════════════════════════════════════════════════════════════
// MÓDULO: SIMULACIÓN DE LIQUIDACIÓN DE HABERES
