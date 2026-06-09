// ═══════════════════════════════════════════════════════════════════════
// ═══   HISTÓRICO GERENTE: EVALUACIONES DE SU EQUIPO                   ═══
// ═══════════════════════════════════════════════════════════════════════

async function renderEvalHistorialGerente(){
  const div = document.getElementById('eval-hist-lista');
  if(!div) return;
  const q = (document.getElementById('eval-hist-search')?.value||'').toLowerCase();
  const filtroTipo = document.getElementById('eval-hist-tipo')?.value || '';
  const filtroEstado = document.getElementById('eval-hist-estado')?.value || '';

  const equipo = _getEquipoDelGerente(true); // incluir ex-empleados en historial
  const equipoLegs = new Set(equipo.map(e=>e.leg));
  const evals = await getEvaluaciones();

  let filas = evals.filter(ev=>equipoLegs.has(ev.leg)).map(ev=>{
    const emp = equipo.find(e=>e.leg===ev.leg);
    return { ev, emp };
  }).filter(r=>r.emp);

  if(q) filas = filas.filter(({emp})=>emp.nom.toLowerCase().includes(q) || emp.leg.includes(q));
  if(filtroTipo){
    if(filtroTipo === 'prueba') filas = filas.filter(({ev})=>ev.tipo.startsWith('prueba_'));
    else filas = filas.filter(({ev})=>ev.tipo===filtroTipo);
  }
  if(filtroEstado) filas = filas.filter(({ev})=>ev.estado===filtroEstado);

  if(!filas.length){
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Sin evaluaciones registradas</div>';
    return;
  }

  // Agrupar por empleado
  const porEmpleado = {};
  for(const f of filas){
    if(!porEmpleado[f.emp.leg]) porEmpleado[f.emp.leg] = {emp:f.emp, evals:[]};
    porEmpleado[f.emp.leg].evals.push(f.ev);
  }

  // Ordenar empleados por nombre
  const empleadosOrdenados = Object.values(porEmpleado).sort((a,b)=>a.emp.nom.localeCompare(b.emp.nom));
  for(const g of empleadosOrdenados){
    g.evals.sort((a,b)=>{
      const fa = a.fechaRealizada || a.fechaProgramada || '';
      const fb = b.fechaRealizada || b.fechaProgramada || '';
      return fb.localeCompare(fa);
    });
  }

  const estadoLabel = (ev)=>{
    if(ev.estado==='registrada') return `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)">✓ Registrada</span>`;
    if(ev.estado==='realizada')  return `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(61,127,255,.1);border:1px solid rgba(61,127,255,.3);color:var(--accent2);font-family:var(--font-mono)">📤 En RR.HH.</span>`;
    if(ev.estado==='pendiente')  return `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:var(--yellow);font-family:var(--font-mono)">⏳ Pendiente</span>`;
    if(ev.estado==='no_aplica')  return `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(115,115,115,.1);border:1px solid rgba(115,115,115,.3);color:var(--t3);font-family:var(--font-mono)">— No aplica</span>`;
    return '';
  };

  div.innerHTML = empleadosOrdenados.map(g=>{
    const iniciales = g.emp.nom.split(',')[0].trim().substring(0,2).toUpperCase();
    const esBaja = g.emp._deBaja || g.emp.egreso;
    return `<div style="border-bottom:1px solid var(--border);padding:14px 18px;${esBaja?'opacity:.75':''}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-glow);border:1px solid rgba(61,127,255,.25);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent2);flex-shrink:0">${iniciales}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--t1);display:flex;align-items:center;gap:8px">${g.emp.nom}${esBaja?'<span style="font-size:9px;padding:1px 6px;border-radius:6px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:var(--red);font-family:var(--font-mono);font-weight:500">EX-EMPLEADO</span>':''}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">Legajo ${legD(g.emp.leg)} · ${g.emp.emp||''} · ${g.emp.tarea||''}${esBaja && g.emp.egreso ? ' · Egreso '+(g.emp.egreso.includes('-')?fechaDDMMYYYY(g.emp.egreso):g.emp.egreso) : ''}</div>
        </div>
        <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${g.evals.length} evaluación${g.evals.length!==1?'es':''}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:48px">
        ${g.evals.map(ev=>{
          const fecha = ev.estado==='registrada' ? ev.fechaRegistro : ev.fechaRealizada || ev.fechaProgramada;
          return `<div style="display:grid;grid-template-columns:160px 120px 120px 1fr 80px;gap:10px;align-items:center;padding:6px 0;font-size:11px">
            <div style="color:var(--t1)">${_tipoLabel(ev.tipo, ev.anio)}</div>
            <div style="color:var(--t3);font-family:var(--font-mono)">${fechaDDMMYYYY(fecha)}</div>
            <div>${estadoLabel(ev)}</div>
            <div style="color:var(--t3);font-family:var(--font-mono);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.evaluadorNom ? 'Por '+ev.evaluadorNom.split(',')[0] : ''}</div>
            <div style="text-align:right">
              ${ev.datos ? `<button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

