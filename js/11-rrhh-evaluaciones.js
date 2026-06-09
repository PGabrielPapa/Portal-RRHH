// ═══════════════════════════════════════════════════════════════════════
// ═══   EVALUACIONES — Desempeño, período de prueba, objetivos         ═══
// ═══   Módulo 11                                                       ═══
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// ═══   MÓDULO: EVALUACIONES DE DESEMPEÑO                             ═══
// ═══════════════════════════════════════════════════════════════════════

// ── Ítems de evaluación (del formulario) ──
const EVAL_ITEMS = {
  tecnicas: [
    'Conocimiento del producto/servicio',
    'Habilidades técnicas específicas',
    'Uso de herramientas/computacionales',
    'Calidad del trabajo (precisión, detalle)',
    'Cumplimiento con normas de seguridad y salud',
    'Reportes y documentación',
    'Gestión del tiempo y priorización',
    'Mantenimiento de equipos e infraestructura',
    'Innovación en procesos y mejora continua',
    'Análisis y resolución de problemas'
  ],
  interpersonales: [
    'Trabajo en equipo',
    'Comunicación efectiva',
    'Manejo de conflictos',
    'Empatía y relaciones interpersonales',
    'Escucha activa',
    'Colaboración entre departamentos',
    'Capacitación y mentoría a compañeros',
    'Adaptabilidad a la diversidad cultural',
    'Networking y construcción de relaciones profesionales',
    'Influencia y persuasión'
  ],
  desempeno: [
    'Cumplimiento de objetivos a corto plazo',
    'Cumplimiento de objetivos a largo plazo',
    'Iniciativa y proactividad',
    'Adaptabilidad a cambios',
    'Capacidad para asumir responsabilidades adicionales',
    'Contribución a la cultura organizacional',
    'Innovación y creatividad',
    'Gestión de estrés y presión',
    'Contribución a proyectos o iniciativas especiales',
    'Cumplimiento de plazos y entrega de trabajo'
  ],
  liderazgo: [
    'Visión y establecimiento de metas',
    'Motivación y desarrollo del equipo',
    'Toma de decisiones efectiva',
    'Evaluación del desempeño del equipo',
    'Gestión de cambios y transiciones',
    'Fomento de un ambiente inclusivo y diverso',
    'Desarrollo del plan de carrera de los colaboradores',
    'Establecimiento de un clima de confianza y respeto',
    'Gestión de conflictos dentro del equipo',
    'Visibilidad en la organización (representación y liderazgo)'
  ]
};

// Etiquetas de calificación
const EVAL_LABELS = {1:'Muy Deficiente',2:'Deficiente',3:'Satisfactorio',4:'Bueno',5:'Excelente'};

// Parse fecha ingreso (DD/MM/YYYY o YYYY-MM-DD) → Date
function parseFechaIng(ing){
  if(!ing) return null;
  if(ing.includes('/')){
    const p = ing.split('/'); if(p.length!==3) return null;
    return new Date(+p[2], +p[1]-1, +p[0]);
  }
  if(ing.includes('-')){
    const p = ing.split('-'); if(p.length!==3) return null;
    return new Date(+p[0], +p[1]-1, +p[2]);
  }
  return null;
}

function fechaISO(d){ return d.toISOString().slice(0,10); }
function fechaDDMMYYYY(iso){
  if(!iso) return '—';
  const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`;
}

// ── IDB CRUD ──
async function getEvaluaciones(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('evaluaciones_desempeno','readonly');
    const req = tx.objectStore('evaluaciones_desempeno').getAll();
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}

async function addEvaluacion(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx  = db.transaction('evaluaciones_desempeno','readwrite');
    const req = tx.objectStore('evaluaciones_desempeno').add(rec);
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}

async function updateEvaluacion(rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx  = db.transaction('evaluaciones_desempeno','readwrite');
    const req = tx.objectStore('evaluaciones_desempeno').put(rec);
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}

async function getEvaluacionesEmpleado(leg){
  const all = await getEvaluaciones();
  return all.filter(e=>e.leg===leg).sort((a,b)=>(a.fechaProgramada||'').localeCompare(b.fechaProgramada||''));
}

// ── Generar evaluaciones del período de prueba automáticamente ──
// Se llama al entrar al panel o al dar de alta un empleado
async function generarEvalPrueba(leg){
  const emp = getNomina().find(e=>e.leg===leg);
  if(!emp) return;
  const fIng = parseFechaIng(emp.ing);
  if(!fIng) return;
  const existentes = await getEvaluacionesEmpleado(leg);
  const dias = [30, 60, 80];
  for(const d of dias){
    const tipo = `prueba_${d}`;
    if(existentes.some(e=>e.tipo===tipo)) continue;
    const fProg = new Date(fIng); fProg.setDate(fProg.getDate() + d);
    await addEvaluacion({
      leg,
      tipo,
      periodo: `prueba_${d}_${emp.leg}_${emp.ing}`,
      fechaProgramada: fechaISO(fProg),
      fechaRealizada: null,
      estado: 'pendiente',
      evaluador: null,
      datos: null,
      creadoEn: new Date().toISOString()
    });
  }
}

// Inicializa evaluaciones anuales para un año dado (octubre).
// Si lo ejecuta un gerente → solo su equipo.
// Si lo ejecuta RR.HH. → toda la nómina activa.
async function inicializarEvalAnual(){
  const anioSel = document.getElementById('eval-anual-anio')?.value;
  const anio = anioSel ? parseInt(anioSel, 10) : new Date().getFullYear();
  if(isNaN(anio) || anio < 2000 || anio > 2100){ toast('⚠ Año inválido','var(--red)'); return; }

  const esRRHH = currentUser?.role === 'rrhh';
  const alcance = esRRHH
    ? getNomina().filter(e=>!e._deBaja && !e.egreso)
    : _getEquipoDelGerente();
  const alcanceTxt = esRRHH ? `todos los empleados activos (${alcance.length})` : `tu equipo (${alcance.length} empleados a tu cargo)`;

  if(!alcance.length){ toast('⚠ No hay empleados en el alcance','var(--yellow)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Inicializar evaluaciones anuales ${anio} para ${alcanceTxt}?<br><br>Se creará una evaluación pendiente para octubre ${anio} por cada empleado sin evaluación ese año. No se duplica nada existente.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;

  const existentes = await getEvaluaciones();
  const existePorLegAnio = new Set(
    existentes.filter(e=>e.tipo==='anual' && e.anio===anio).map(e=>e.leg)
  );
  const fProg = `${anio}-10-01`; // 1 de octubre
  let creadas = 0;
  for(const emp of alcance){
    if(existePorLegAnio.has(emp.leg)) continue;
    await addEvaluacion({
      leg: emp.leg,
      tipo: 'anual',
      anio,
      periodo: `anual_${anio}_${emp.leg}`,
      fechaProgramada: fProg,
      fechaRealizada: null,
      estado: 'pendiente',
      evaluador: null,
      datos: null,
      creadoEn: new Date().toISOString()
    });
    creadas++;
  }
  toast(`✓ ${creadas} evaluación${creadas!==1?'es':''} anual${creadas!==1?'es':''} ${anio} creada${creadas!==1?'s':''}`, 'var(--green)', 4000);
  renderEvalAnualGerente();
  actualizarBadgesEval();
}

// Calcula estado de alerta de una eval en período de prueba
async function getAlertaEvalPrueba(ev){
  if(ev.estado === 'realizada' || ev.estado === 'registrada' || ev.estado === 'no_aplica') return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const prog = new Date(ev.fechaProgramada + 'T00:00:00');
  const diffDias = Math.floor((prog - hoy)/(1000*60*60*24));
  if(diffDias < 0) return {nivel:'vencida', dias:Math.abs(diffDias), color:'var(--red)', icon:'🚨'};
  if(diffDias <= 7) return {nivel:'proxima', dias:diffDias, color:'var(--yellow)', icon:'⚠️'};
  return {nivel:'pendiente', dias:diffDias, color:'var(--t3)', icon:'📅'};
}

// ── Filtrar empleados a cargo del gerente actual ──
function _getEquipoDelGerente(incluirBajas){
  if(!currentUser) return [];
  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
  return getNomina().filter(e=>{
    if(!incluirBajas && (e._deBaja || e.egreso)) return false;
    if(e.leg === currentUser.emp.leg) return false;
    const v = getValidador(e);
    if(!v || !v.validador) return false;
    if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
    return v.validador.toUpperCase() === gerNom;
  });
}

// ── RENDER principal ──
async function renderEvaluaciones(){
  // Poblar selector de año (año actual ± 2)
  const selAnio = document.getElementById('eval-anual-anio');
  if(selAnio && !selAnio.options.length){
    const añoActual = new Date().getFullYear();
    selAnio.innerHTML = '';
    for(let y=añoActual+1; y>=añoActual-3; y--){
      const opt = document.createElement('option');
      opt.value=y; opt.textContent=y;
      if(y===añoActual) opt.selected=true;
      selAnio.appendChild(opt);
    }
  }
  // Generar evaluaciones de prueba para empleados nuevos del equipo
  const equipo = _getEquipoDelGerente();
  for(const emp of equipo){
    const fIng = parseFechaIng(emp.ing);
    if(!fIng) continue;
    const hoy = new Date();
    const diasDesdeIng = Math.floor((hoy - fIng)/(1000*60*60*24));
    if(diasDesdeIng >= 0 && diasDesdeIng <= 120){ // dentro de ventana período de prueba
      await generarEvalPrueba(emp.leg);
    }
  }
  await renderEvalAnualGerente();
  await renderEvalPruebaGerente();
  await actualizarBadgesEval();
}

async function evalSubTab(sub){
  ['anual','prueba','historial'].forEach(s=>{
    const p = document.getElementById('eval-pane-'+s);
    const b = document.getElementById('eval-subtab-'+s);
    if(p) p.style.display = s===sub ? 'block' : 'none';
    if(b){
      const col = s==='anual'?'rgb(168,85,247)':s==='prueba'?'var(--red)':'var(--accent)';
      b.style.borderBottomColor = s===sub ? col : 'transparent';
      b.style.color = s===sub ? col : 'var(--t3)';
      b.style.fontWeight = s===sub ? '600' : '400';
    }
  });
  if(sub==='anual')     renderEvalAnualGerente();
  if(sub==='prueba')    renderEvalPruebaGerente();
  if(sub==='historial') renderEvalHistorialGerente();
}

// ── Render lista ANUAL ──
async function renderEvalAnualGerente(){
  const div = document.getElementById('eval-anual-lista');
  if(!div) return;
  // Defensive: poblar selector de año si aún no se hizo
  const selAnio = document.getElementById('eval-anual-anio');
  if(selAnio && !selAnio.options.length){
    const anioActual = new Date().getFullYear();
    for(let y=anioActual+1; y>=anioActual-3; y--){
      const opt = document.createElement('option');
      opt.value=y; opt.textContent=y;
      if(y===anioActual) opt.selected=true;
      selAnio.appendChild(opt);
    }
  }
  const anio = parseInt(selAnio?.value, 10) || new Date().getFullYear();
  const q = (document.getElementById('eval-anual-search')?.value||'').toLowerCase();
  const filtroEstado = document.getElementById('eval-anual-estado')?.value || '';

  const equipo = _getEquipoDelGerente();
  const evals = await getEvaluaciones();
  const evalsMap = new Map();
  evals.filter(e=>e.tipo==='anual' && e.anio===anio).forEach(e=>evalsMap.set(e.leg, e));

  let filas = equipo.map(emp => {
    const ev = evalsMap.get(emp.leg);
    return { emp, ev };
  });

  if(q) filas = filas.filter(({emp})=>emp.nom.toLowerCase().includes(q) || emp.leg.includes(q));
  if(filtroEstado){
    filas = filas.filter(({ev})=>{
      if(filtroEstado==='pendiente')  return !ev || ev.estado==='pendiente';
      if(filtroEstado==='realizada')  return ev && (ev.estado==='realizada' || ev.estado==='registrada');
      if(filtroEstado==='registrada') return ev && ev.estado==='registrada';
      return ev && ev.estado===filtroEstado;
    });
  }

  if(!filas.length){
    div.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin empleados a cargo o sin resultados</div>';
    return;
  }

  filas.sort((a,b)=>a.emp.nom.localeCompare(b.emp.nom));

  const fmtEstado = (ev)=>{
    if(!ev || ev.estado==='pendiente') return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:var(--yellow);font-family:var(--font-mono)">⏳ Pendiente</span>`;
    if(ev.estado==='realizada') return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(61,127,255,.1);border:1px solid rgba(61,127,255,.3);color:var(--accent2);font-family:var(--font-mono)">📤 En RR.HH.</span>`;
    if(ev.estado==='registrada') return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)">✓ Registrada</span>`;
    if(ev.estado==='no_aplica') return `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(115,115,115,.1);border:1px solid rgba(115,115,115,.3);color:var(--t3);font-family:var(--font-mono)">— No aplica</span>`;
    return '';
  };

  div.innerHTML = `<div style="display:grid;grid-template-columns:80px 1fr 140px 120px 110px 240px;padding:8px 18px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">
    <span>Legajo</span><span>Empleado</span><span>Área</span><span>Ingreso</span><span>Estado</span><span style="text-align:right">Acciones</span>
  </div>`+filas.map(({emp, ev})=>{
    const v = getValidador(emp);
    const area = v?.area || '—';
    return `<div style="display:grid;grid-template-columns:80px 1fr 140px 120px 110px 240px;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border);gap:6px">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3)">${legD(emp.leg)}</div>
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--t1)">${emp.nom}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${emp.emp||''}</div>
      </div>
      <div style="font-size:11px;color:var(--t3)">${area}</div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${emp.ing||'—'}</div>
      <div>${fmtEstado(ev)}</div>
      <div style="text-align:right;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        ${ev && (ev.estado==='realizada' || ev.estado==='registrada')
          ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>`
          : `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="abrirEvalForm(${ev?.id||'null'},'editar','${emp.leg}','anual',${anio})">✎ ${ev && ev.estado!=='pendiente'?'Editar':'Evaluar'}</button>`
        }
        ${ev && ev.estado==='no_aplica'
          ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--yellow)" onclick="marcarEvalNoAplica(${ev.id}, false)">↩ Reactivar</button>`
          : ev && !['realizada','registrada'].includes(ev.estado)
            ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--t3)" onclick="marcarEvalNoAplica(${ev.id}, true)">— No aplica</button>`
            : ''
        }
      </div>
    </div>`;
  }).join('');
}

// ── Render lista PRUEBA ──
async function renderEvalPruebaGerente(){
  const div = document.getElementById('eval-prueba-lista');
  if(!div) return;
  const q = (document.getElementById('eval-prueba-search')?.value||'').toLowerCase();
  const filtroEstado = document.getElementById('eval-prueba-estado')?.value || '';

  const equipo = _getEquipoDelGerente();
  const equipoLegs = new Set(equipo.map(e=>e.leg));
  const evals = await getEvaluaciones();
  const pruebas = evals.filter(e=>e.tipo.startsWith('prueba_') && equipoLegs.has(e.leg));

  let filas = pruebas.map(ev=>{
    const emp = equipo.find(e=>e.leg===ev.leg);
    const alerta = getAlertaEvalPrueba(ev);
    return { ev, emp, alerta };
  });

  if(q) filas = filas.filter(({emp})=>emp && (emp.nom.toLowerCase().includes(q) || emp.leg.includes(q)));
  if(filtroEstado){
    filas = filas.filter(({ev, alerta})=>{
      if(filtroEstado==='vencida')    return alerta?.nivel==='vencida';
      if(filtroEstado==='proxima')    return alerta?.nivel==='proxima';
      if(filtroEstado==='pendiente')  return ev.estado==='pendiente';
      if(filtroEstado==='realizada')  return ev.estado==='realizada' || ev.estado==='registrada';
      if(filtroEstado==='registrada') return ev.estado==='registrada';
      if(filtroEstado==='no_aplica')  return ev.estado==='no_aplica';
      return true;
    });
  }

  if(!filas.length){
    div.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin evaluaciones en período de prueba</div>';
    return;
  }

  // Ordenar: vencidas primero, luego próximas, pendientes sin alerta, terminales (realizada/registrada), no_aplica al final
  filas.sort((a,b)=>{
    const pri = x => {
      if(x.alerta?.nivel==='vencida') return 0;
      if(x.alerta?.nivel==='proxima') return 1;
      if(x.ev.estado==='no_aplica')   return 4;
      if(x.ev.estado==='realizada' || x.ev.estado==='registrada') return 3;
      return 2;
    };
    const pa = pri(a), pb = pri(b);
    if(pa!==pb) return pa-pb;
    return (a.ev.fechaProgramada||'').localeCompare(b.ev.fechaProgramada||'');
  });

  div.innerHTML = `<div style="display:grid;grid-template-columns:80px 1fr 110px 100px 130px 160px 150px;padding:8px 18px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">
    <span>Legajo</span><span>Empleado</span><span>Ingreso</span><span>Evaluación</span><span>Programada</span><span>Alerta</span><span style="text-align:right">Acciones</span>
  </div>`+filas.map(({ev, emp, alerta})=>{
    if(!emp) return '';
    const diasEv = ev.tipo.split('_')[1];
    const esTerminada = ev.estado==='realizada' || ev.estado==='registrada';
    const esNoAplica  = ev.estado==='no_aplica';
    const iconTerm = ev.estado==='registrada' ? '✓' : '📤';
    const labelTerm = ev.estado==='registrada' ? `Registrada ${fechaDDMMYYYY(ev.fechaRegistro)}` : `En RR.HH. (${fechaDDMMYYYY(ev.fechaRealizada)})`;
    const alertaHTML = esTerminada
      ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:${ev.estado==='registrada'?'rgba(34,197,94,.1)':'rgba(61,127,255,.1)'};border:1px solid ${ev.estado==='registrada'?'rgba(34,197,94,.3)':'rgba(61,127,255,.3)'};color:${ev.estado==='registrada'?'var(--green)':'var(--accent2)'};font-family:var(--font-mono)">${iconTerm} ${labelTerm}</span>`
      : esNoAplica
        ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(115,115,115,.08);border:1px solid var(--border);color:var(--t3);font-family:var(--font-mono)" title="${(ev.motivoNoAplica||'').replace(/"/g,'&quot;')}">— No aplica</span>`
        : alerta?.nivel==='vencida'
          ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35);color:var(--red);font-family:var(--font-mono);font-weight:600">🚨 ${alerta.dias} día${alerta.dias!==1?'s':''} de atraso</span>`
          : alerta?.nivel==='proxima'
            ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);color:var(--yellow);font-family:var(--font-mono)">⚠️ En ${alerta.dias} día${alerta.dias!==1?'s':''}</span>`
            : `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(115,115,115,.1);border:1px solid var(--border);color:var(--t3);font-family:var(--font-mono)">📅 En ${alerta?.dias||'—'} días</span>`;
    return `<div style="display:grid;grid-template-columns:80px 1fr 110px 100px 130px 160px 180px;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border);gap:6px;${alerta?.nivel==='vencida'?'background:rgba(239,68,68,.03)':''}${esNoAplica?'opacity:.7':''}">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3)">${legD(emp.leg)}</div>
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--t1)">${emp.nom}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${emp.emp||''}</div>
      </div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${emp.ing||'—'}</div>
      <div><span style="font-size:10px;padding:2px 7px;border-radius:8px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.3);color:rgb(168,85,247);font-family:var(--font-mono);font-weight:600">${diasEv} días</span></div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${fechaDDMMYYYY(ev.fechaProgramada)}</div>
      <div>${alertaHTML}</div>
      <div style="text-align:right;display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">
        ${esTerminada
          ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abrirEvalForm(${ev.id}, 'ver')">👁 Ver</button>`
          : esNoAplica
            ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--yellow)" onclick="marcarEvalNoAplica(${ev.id}, false)">↩ Reactivar</button>`
            : `<button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="abrirEvalForm(${ev.id},'editar','${emp.leg}','${ev.tipo}')">✎ Evaluar</button>
               <button class="btn btn-ghost" style="font-size:11px;padding:3px 10px;color:var(--t3)" onclick="marcarEvalNoAplica(${ev.id}, true)" title="No evaluar este período">— No aplica</button>`
        }
      </div>
    </div>`;
  }).join('');
}

// ── No aplica / reactivar (anual y prueba) ──
async function marcarEvalNoAplica(evId, marcar){
  if(!evId) return;
  const evals = await getEvaluaciones();
  const ev = evals.find(e=>e.id===evId);
  if(!ev){ toast('⚠ Evaluación no encontrada','var(--red)'); return; }
  if(!_puedeEditarEval(ev)){ toast('⚠ No tenés permiso para modificar esta evaluación','var(--red)'); return; }
  if(ev.estado === 'realizada' || ev.estado === 'registrada'){
    toast('⚠ No se puede marcar "No aplica" a una evaluación finalizada','var(--yellow)'); return;
  }
  const motivo = marcar ? (await showPrompt({titulo:'Motivo requerido',mensaje:'Indicá por qué no aplica esta evaluación.',placeholder:'Motivo...',requerido:true,labelOk:'Confirmar'}) ?? '') : '';
  if(marcar && !motivo) { toast('⚠ Indicá el motivo','var(--yellow)'); return; }
  ev.estado = marcar ? 'no_aplica' : 'pendiente';
  ev.motivoNoAplica = marcar ? motivo : null;
  ev.marcadoPor = marcar ? currentUser?.emp?.leg : null;
  ev.marcadoEn = marcar ? new Date().toISOString() : null;
  await updateEvaluacion(ev);
  toast(marcar ? '✓ Marcada como "No aplica"' : '✓ Evaluación reactivada', 'var(--green)');
  // Refrescar la tab correcta según el tipo
  if(ev.tipo === 'anual')              renderEvalAnualGerente();
  else if(ev.tipo?.startsWith('prueba_')) renderEvalPruebaGerente();
  actualizarBadgesEval();
}

// ── FORMULARIO DE EVALUACIÓN (modal) ──
async function abrirEvalForm(evId, modo, legParam, tipoParam, anioParam){
  // Si no hay evId (anual aún no inicializada individualmente), lo creamos on-the-fly
  (async ()=>{
    let ev = null;
    if(evId && evId !== 'null'){
      const evals = await getEvaluaciones();
      ev = evals.find(e=>e.id===evId);
    }
    if(!ev && legParam){
      // Crear evaluación anual nueva si no existía
      const fProg = anioParam ? `${anioParam}-10-01` : fechaISO(new Date());
      const newId = await addEvaluacion({
        leg: legParam,
        tipo: tipoParam || 'anual',
        anio: anioParam || new Date().getFullYear(),
        periodo: `${tipoParam||'anual'}_${anioParam||new Date().getFullYear()}_${legParam}`,
        fechaProgramada: fProg,
        fechaRealizada: null,
        estado: 'pendiente',
        evaluador: null,
        datos: null,
        creadoEn: new Date().toISOString()
      });
      const evals2 = await getEvaluaciones();
      ev = evals2.find(e=>e.id===newId);
    }
    if(!ev){ toast('⚠ No se encontró la evaluación','var(--red)'); return; }
    _mostrarEvalForm(ev, modo);
  })();
}

function _mostrarEvalForm(ev, modo){
  const emp = getNomina().find(e=>e.leg===ev.leg);
  if(!emp){ toast('⚠ Empleado no encontrado','var(--red)'); return; }
  const soloLectura = modo === 'ver' || (['realizada','registrada'].includes(ev.estado) && modo !== 'editar_rehacer');
  const datos = ev.datos || {tecnicas:{},interpersonales:{},desempeno:{},liderazgo:{},fortalezas:['','',''],areasMejora:['','',''],objetivos:['','',''],planDesarrollo:['','',''],comentarios:''};

  const v = getValidador(emp);
  const esGerente = emp.cat === 'GER';

  let tipoLabel, tipoColor;
  if(ev.tipo==='anual'){
    tipoLabel = `Evaluación Anual ${ev.anio}`;
    tipoColor = 'rgb(168,85,247)';
  } else {
    const dias = ev.tipo.split('_')[1];
    tipoLabel = `Período de prueba — ${dias} días`;
    tipoColor = 'var(--red)';
  }

  // Helper para tabla de ítems
  const tablaItems = (seccion, titulo, items, icon) => `
    <div style="margin-bottom:22px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:10px;display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">${icon}</span>${titulo}
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--r);overflow:hidden">
        <div style="display:grid;grid-template-columns:1fr 200px 2fr;padding:8px 12px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em">
          <span>Competencia</span><span>Calificación</span><span>Comentarios</span>
        </div>
        ${items.map((item, idx)=>{
          const key = `item_${idx}`;
          const val = datos[seccion]?.[key] || {calif:'',comment:''};
          return `<div style="display:grid;grid-template-columns:1fr 200px 2fr;gap:8px;padding:8px 12px;border-top:1px solid var(--border);align-items:center">
            <div style="font-size:12px;color:var(--t1)">${item}</div>
            <select data-eval-section="${seccion}" data-eval-item="${idx}" data-eval-field="calif" ${soloLectura?'disabled':''}
              style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px;color:var(--t1);font-size:11px;font-family:var(--font-mono);outline:none">
              <option value="">—</option>
              ${[1,2,3,4,5].map(n=>`<option value="${n}" ${val.calif==String(n)||val.calif===n?'selected':''}>${n} · ${EVAL_LABELS[n]}</option>`).join('')}
            </select>
            <input type="text" data-eval-section="${seccion}" data-eval-item="${idx}" data-eval-field="comment" value="${(val.comment||'').replace(/"/g,'&quot;')}" ${soloLectura?'disabled':''}
              placeholder="Comentario..." style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:5px 8px;color:var(--t1);font-size:11px;outline:none">
          </div>`;
        }).join('')}
      </div>
    </div>`;

  const listaCampo = (seccion, titulo, icon, hint) => `
    <div style="margin-bottom:18px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">${icon}</span>${titulo}
      </div>
      ${hint?`<div style="font-size:10px;color:var(--t3);margin-bottom:6px">${hint}</div>`:''}
      ${[0,1,2].map(i=>`<input type="text" data-eval-lista="${seccion}" data-eval-idx="${i}" value="${(datos[seccion]?.[i]||'').replace(/"/g,'&quot;')}" ${soloLectura?'disabled':''}
        placeholder="${i+1}." style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 10px;color:var(--t1);font-size:12px;outline:none;margin-bottom:6px">`).join('')}
    </div>`;

  const modal = document.createElement('div');
  modal.id = 'eval-form-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
  modal.innerHTML = `
    <div class="card" style="max-width:1100px;width:100%;max-height:90vh;overflow-y:auto;padding:0">
      <div style="position:sticky;top:0;background:var(--bg1);padding:18px 24px;border-bottom:1px solid var(--border);z-index:2;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--t1)">Formulario de Evaluación de Desempeño</div>
          <div style="font-size:11px;color:${tipoColor};font-family:var(--font-mono);margin-top:2px;font-weight:600">${tipoLabel}</div>
        </div>
        <button class="btn btn-ghost" onclick="document.getElementById('eval-form-modal').remove()" style="font-size:12px;padding:5px 12px">✕ Cerrar</button>
      </div>
      <div style="padding:20px 24px">

        <!-- INFO EMPLEADO -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;padding:14px;background:var(--bg2);border-radius:var(--r);border:1px solid var(--border)">
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Empleado</div><div style="font-size:13px;color:var(--t1);font-weight:500">${emp.nom}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Puesto</div><div style="font-size:12px;color:var(--t1)">${emp.tarea||'—'}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Área</div><div style="font-size:12px;color:var(--t1)">${v?.area||'—'}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Fecha programada</div><div style="font-size:12px;color:var(--t1);font-family:var(--font-mono)">${fechaDDMMYYYY(ev.fechaProgramada)}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Legajo</div><div style="font-size:12px;color:var(--t1);font-family:var(--font-mono)">${legD(emp.leg)}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Ingreso</div><div style="font-size:12px;color:var(--t1);font-family:var(--font-mono)">${emp.ing||'—'}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Empresa</div><div style="font-size:12px;color:var(--t1)">${emp.emp||'—'}</div></div>
          <div><div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin-bottom:3px">Evaluador</div><div style="font-size:12px;color:var(--t1)">${currentUser?.emp?.nom||'—'}</div></div>
        </div>

        ${tablaItems('tecnicas',       '1. Competencias Técnicas',        EVAL_ITEMS.tecnicas,        '🔧')}
        ${tablaItems('interpersonales','2. Competencias Interpersonales', EVAL_ITEMS.interpersonales, '🤝')}
        ${tablaItems('desempeno',      '3. Desempeño General',            EVAL_ITEMS.desempeno,       '📊')}

        ${esGerente ? tablaItems('liderazgo', '4. Habilidades de Liderazgo', EVAL_ITEMS.liderazgo, '👑') : `
          <div style="margin-bottom:22px;padding:14px;background:var(--bg2);border:1px dashed var(--border);border-radius:var(--r);text-align:center">
            <div style="font-size:12px;color:var(--t3)">4. Habilidades de Liderazgo — <em>No aplica (el empleado no tiene categoría GER)</em></div>
          </div>
        `}

        <!-- 5. Fortalezas y Áreas de Mejora -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px">
          ${listaCampo('fortalezas','5a. Fortalezas','💪','Principales fortalezas observadas')}
          ${listaCampo('areasMejora','5b. Áreas de Mejora','🎯','Áreas a desarrollar')}
        </div>

        <!-- 6. Objetivos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px">
          ${listaCampo('objetivos','6a. Objetivos Propuestos','🎯','Para el próximo período')}
          ${listaCampo('planDesarrollo','6b. Plan de Desarrollo','📚','Formación, capacitación, etc.')}
        </div>

        <!-- 7. Comentarios adicionales -->
        <div style="margin-bottom:18px">
          <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:8px;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">💬</span>7. Comentarios adicionales del evaluador
          </div>
          <textarea id="eval-comentarios" ${soloLectura?'disabled':''} rows="4" placeholder="Observaciones finales, contexto, recomendaciones..." style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;color:var(--t1);font-size:12px;outline:none;resize:vertical;font-family:inherit">${datos.comentarios||''}</textarea>
        </div>

        ${ev.estado==='realizada' ? `<div style="padding:10px 14px;background:rgba(234,179,8,.05);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);margin-bottom:12px;font-size:11px;color:var(--yellow)">
          ⏳ Evaluación finalizada el ${fechaDDMMYYYY(ev.fechaRealizada)} por ${ev.evaluadorNom||'—'} — <strong>pendiente de registro por RR.HH.</strong>
        </div>`:''}
        ${ev.estado==='registrada' ? `<div style="padding:10px 14px;background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);margin-bottom:12px;font-size:11px;color:var(--green)">
          ✓ Evaluación registrada en el legajo digital el ${fechaDDMMYYYY(ev.fechaRegistro)} por ${ev.registradoPorNom||'RR.HH.'} · Evaluador: ${ev.evaluadorNom||'—'} (${fechaDDMMYYYY(ev.fechaRealizada)})
        </div>`:''}

        ${!soloLectura ? `<div style="display:flex;justify-content:flex-end;gap:10px;padding-top:16px;border-top:1px solid var(--border)">
          <button class="btn btn-ghost" onclick="guardarEvalBorrador(${ev.id})" style="font-size:12px">💾 Guardar borrador</button>
          <button class="btn btn-primary" onclick="guardarEvalFinal(${ev.id})" style="font-size:12px">✓ Finalizar evaluación</button>
        </div>`:''}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ── Recolecta datos del formulario ──
async function _recolectarDatosEval(){
  const datos = {tecnicas:{}, interpersonales:{}, desempeno:{}, liderazgo:{}, fortalezas:[], areasMejora:[], objetivos:[], planDesarrollo:[], comentarios:''};
  document.querySelectorAll('[data-eval-section]').forEach(el=>{
    const sec = el.dataset.evalSection, idx = el.dataset.evalItem, f = el.dataset.evalField;
    if(!datos[sec][`item_${idx}`]) datos[sec][`item_${idx}`] = {calif:'',comment:''};
    datos[sec][`item_${idx}`][f] = el.value;
  });
  document.querySelectorAll('[data-eval-lista]').forEach(el=>{
    const sec = el.dataset.evalLista, idx = parseInt(el.dataset.evalIdx, 10);
    if(!datos[sec]) datos[sec] = [];
    datos[sec][idx] = el.value;
  });
  const txt = document.getElementById('eval-comentarios');
  if(txt) datos.comentarios = txt.value;
  return datos;
}

async function guardarEvalBorrador(evId){
  const evals = await getEvaluaciones();
  const ev = evals.find(e=>e.id===evId);
  if(!ev){ toast('⚠ Evaluación no encontrada','var(--red)'); return; }
  // Seguridad: solo el validador real o RR.HH. puede guardar cambios
  if(!_puedeEditarEval(ev)){ toast('⚠ No tenés permiso para editar esta evaluación','var(--red)'); return; }
  ev.datos = _recolectarDatosEval();
  ev.estado = 'pendiente'; // sigue pendiente hasta "finalizar"
  ev.actualizadoEn = new Date().toISOString();
  ev.editadoPor = currentUser?.emp?.leg || null;
  await updateEvaluacion(ev);
  toast('💾 Borrador guardado','var(--green)');
}

// Determina si el usuario actual puede editar/finalizar una evaluación específica
async function _puedeEditarEval(ev){
  if(!currentUser) return false;
  if(currentUser.role === 'rrhh') return true;
  // El gerente actual debe ser el validador del empleado evaluado
  const emp = getNomina().find(e=>e.leg===ev.leg);
  if(!emp) return false;
  const v = getValidador(emp);
  if(!v || !v.validador) return false;
  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  if(gerNom.includes('PAPA, PABLO GABRIEL')) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
  return v.validador.toUpperCase() === gerNom;
}

async function guardarEvalFinal(evId){
  const evals0 = await getEvaluaciones();
  const ev0 = evals0.find(e=>e.id===evId);
  if(!ev0){ toast('⚠ Evaluación no encontrada','var(--red)'); return; }
  if(!_puedeEditarEval(ev0)){ toast('⚠ No tenés permiso para finalizar esta evaluación','var(--red)'); return; }

  const datos = _recolectarDatosEval();
  // Validación mínima: al menos una calificación en cada sección principal
  const secciones = ['tecnicas','interpersonales','desempeno'];
  for(const sec of secciones){
    const algunaCalif = Object.values(datos[sec]||{}).some(v=>v.calif);
    if(!algunaCalif){
      toast(`⚠ Completá al menos una calificación en ${sec==='tecnicas'?'Técnicas':sec==='interpersonales'?'Interpersonales':'Desempeño General'}`,'var(--yellow)');
      return;
    }
  }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Finalizar la evaluación?<br><br>Una vez finalizada, la evaluación queda pendiente de registro por RR.HH. y no podés modificarla. RR.HH. la registrará en el legajo digital del empleado.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const evals = await getEvaluaciones();
  const ev = evals.find(e=>e.id===evId);
  if(!ev) return;
  ev.datos = datos;
  ev.estado = 'realizada';
  ev.fechaRealizada = new Date().toISOString().slice(0,10);
  ev.evaluador = currentUser?.emp?.leg || null;
  ev.evaluadorNom = currentUser?.emp?.nom || null;
  ev.actualizadoEn = new Date().toISOString();
  await updateEvaluacion(ev);
  // ── Auditoría: evaluación finalizada ──
  if(typeof auditRRHH === 'function'){
    const empEv = getNomina().find(e=>e.leg===ev.leg);
    auditRRHH('evaluacion_final', empEv || { dni: ev.leg, nom: ev.leg }, {
      detail: `Tipo: ${ev.tipo}${ev.anio?' · Año '+ev.anio:''}`
    });
  }
  toast('✓ Evaluación finalizada · Enviada a RR.HH. para registro','var(--green)', 5000);
  document.getElementById('eval-form-modal')?.remove();
  if(ev.tipo==='anual') renderEvalAnualGerente();
  else renderEvalPruebaGerente();
  actualizarBadgesEval();
}

// ── Badges ──
async function actualizarBadgesEval(){
  if(!currentUser) return;
  const equipo = _getEquipoDelGerente();
  if(!equipo.length){
    const el = document.getElementById('ger-tab-eval-badge'); if(el) el.style.display='none';
    return;
  }
  const equipoLegs = new Set(equipo.map(e=>e.leg));
  const evals = await getEvaluaciones();

  // Vencidas o próximas del período de prueba
  const pruebas = evals.filter(e=>e.tipo.startsWith('prueba_') && equipoLegs.has(e.leg) && e.estado==='pendiente');
  let vencidas = 0, proximas = 0;
  for(const ev of pruebas){
    const al = getAlertaEvalPrueba(ev);
    if(al?.nivel==='vencida') vencidas++;
    else if(al?.nivel==='proxima') proximas++;
  }

  // Anuales pendientes del año actual
  const anioActual = new Date().getFullYear();
  const anualesPend = evals.filter(e=>e.tipo==='anual' && e.anio===anioActual && e.estado==='pendiente' && equipoLegs.has(e.leg)).length;

  const tabBadge = document.getElementById('ger-tab-eval-badge');
  const totalTab = vencidas + proximas;
  if(tabBadge){
    if(totalTab > 0){
      tabBadge.style.display = 'inline-block';
      tabBadge.textContent = totalTab;
      tabBadge.style.background = vencidas > 0 ? 'var(--red)' : 'var(--yellow)';
      tabBadge.style.color = vencidas > 0 ? '#fff' : '#000';
    } else {
      tabBadge.style.display = 'none';
    }
  }

  const anualBadge = document.getElementById('eval-anual-badge');
  if(anualBadge){
    if(anualesPend > 0){
      anualBadge.style.display = 'inline-block';
      anualBadge.textContent = anualesPend;
    } else anualBadge.style.display = 'none';
  }
  const pruebaBadge = document.getElementById('eval-prueba-badge');
  if(pruebaBadge){
    if(totalTab > 0){
      pruebaBadge.style.display = 'inline-block';
      pruebaBadge.textContent = totalTab;
      pruebaBadge.style.background = vencidas > 0 ? 'var(--red)' : 'var(--yellow)';
      pruebaBadge.style.color = vencidas > 0 ? '#fff' : '#000';
    } else pruebaBadge.style.display = 'none';
  }

  // Banner proactivo en el home (solo si hay vencidas o próximas)
  const banner = document.getElementById('banner-eval-alertas');
  if(banner){
    if(vencidas > 0 || proximas > 0 || anualesPend > 0){
      const partes = [];
      if(vencidas > 0) partes.push(`<span style="color:var(--red);font-weight:600">🚨 ${vencidas} vencida${vencidas>1?'s':''}</span>`);
      if(proximas > 0) partes.push(`<span style="color:var(--yellow);font-weight:600">⚠️ ${proximas} próxima${proximas>1?'s':''}</span>`);
      if(anualesPend > 0) partes.push(`<span style="color:rgb(168,85,247);font-weight:600">📅 ${anualesPend} anual${anualesPend>1?'es':''} pendiente${anualesPend>1?'s':''}</span>`);
      const colorBorde = vencidas>0 ? 'rgba(239,68,68,.35)' : proximas>0 ? 'rgba(234,179,8,.35)' : 'rgba(168,85,247,.35)';
      const colorBg = vencidas>0 ? 'rgba(239,68,68,.05)' : proximas>0 ? 'rgba(234,179,8,.05)' : 'rgba(168,85,247,.05)';
      banner.innerHTML = `
        <div class="card" style="padding:12px 16px;background:${colorBg};border:1px solid ${colorBorde};display:flex;align-items:center;gap:12px;flex-wrap:wrap;cursor:pointer" onclick="nav('pendientes');setTimeout(()=>gerTab('evaluaciones'),100)">
          <span style="font-size:18px">📝</span>
          <div style="flex:1;min-width:200px">
            <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">Evaluaciones de desempeño pendientes</div>
            <div style="font-size:11px;color:var(--t3)">${partes.join(' · ')}</div>
          </div>
          <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Ir al panel →</span>
        </div>`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
      banner.innerHTML = '';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ═══   FLUJO RR.HH.: REGISTRAR EVALUACIONES + HISTÓRICO               ═══
// ═══════════════════════════════════════════════════════════════════════

function rrhhEvalTab(tab){
  ['pend','hist'].forEach(t=>{
    const p = document.getElementById('rrhh-eval-pane-'+t);
    const b = document.getElementById('rrhh-eval-tab-'+t);
    if(p) p.style.display = t===tab ? 'block' : 'none';
    if(b){
      b.style.borderBottomColor = t===tab ? 'var(--accent)' : 'transparent';
      b.style.color = t===tab ? 'var(--accent2)' : 'var(--t3)';
      b.style.fontWeight = t===tab ? '600' : '400';
    }
  });
  if(tab==='pend') renderEvalPendientesRRHH();
  if(tab==='hist') renderEvalHistoricoRRHH();
}

