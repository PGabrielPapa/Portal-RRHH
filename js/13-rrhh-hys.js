// ═══════════════════════════════════════════════════════════════════════
// HIGIENE Y SEGURIDAD · Ley 19.587 + Res. SRT 905/2015
// Etapa 1: estructura base, listado de empleados, indicadores
// ═══════════════════════════════════════════════════════════════════════

// ── Catálogo precargado de tipos de capacitación obligatorios LRT ──
const HYS_CAPACITACIONES_TIPOS_DEFAULT = [
  { codigo: 'INDUCCION',    nombre: 'Inducción inicial al puesto',           obligatorio: true,  vigencia_meses: null, descripcion: 'Inducción al ingresar al puesto. Res. SRT 905/2015' },
  { codigo: 'EPP',          nombre: 'Uso correcto de Elementos de Protección Personal', obligatorio: true, vigencia_meses: 12, descripcion: 'Uso, mantenimiento y reposición de EPP' },
  { codigo: 'CARGAS',       nombre: 'Manejo manual de cargas',                obligatorio: true,  vigencia_meses: 24, descripcion: 'Levantamiento, traslado y descarga seguros' },
  { codigo: 'INCENDIOS',    nombre: 'Prevención y lucha contra incendios',    obligatorio: true,  vigencia_meses: 12, descripcion: 'Uso de matafuegos, plan de evacuación' },
  { codigo: 'EMERGENCIAS',  nombre: 'Plan de emergencias y evacuación',       obligatorio: true,  vigencia_meses: 12, descripcion: 'Roles, recorridos, puntos de encuentro' },
  { codigo: 'PRIMEROS_AUX', nombre: 'Primeros auxilios y RCP',                obligatorio: false, vigencia_meses: 24, descripcion: 'Atención inicial de heridas, RCP básico' },
  { codigo: 'ELECTRICO',    nombre: 'Riesgo eléctrico',                       obligatorio: true,  vigencia_meses: 24, descripcion: 'Trabajos con tensión, bloqueo y etiquetado' },
  { codigo: 'ALTURA',       nombre: 'Trabajo en altura',                      obligatorio: true,  vigencia_meses: 12, descripcion: 'Arnés, andamios, escaleras. Res. SRT 503/2014' },
  { codigo: 'ESPACIOS',     nombre: 'Trabajo en espacios confinados',         obligatorio: true,  vigencia_meses: 12, descripcion: 'Atmósferas peligrosas, ventilación, rescate' },
  { codigo: 'QUIMICOS',     nombre: 'Manipulación de productos químicos',     obligatorio: true,  vigencia_meses: 24, descripcion: 'Hojas de seguridad (FDS), derrames' },
  { codigo: 'AUTOELEVADOR', nombre: 'Manejo de autoelevador / montacargas',   obligatorio: true,  vigencia_meses: 12, descripcion: 'Habilitación específica del operador' },
  { codigo: 'ERGONOMIA',    nombre: 'Ergonomía y posturas de trabajo',        obligatorio: false, vigencia_meses: 24, descripcion: 'Riesgos posturales, pausas activas' },
  { codigo: 'VIAL',         nombre: 'Seguridad vial / manejo defensivo',      obligatorio: false, vigencia_meses: 24, descripcion: 'Para personal con vehículo asignado' },
  { codigo: 'SOLDADURA',    nombre: 'Soldadura y oxicorte',                   obligatorio: true,  vigencia_meses: 24, descripcion: 'Riesgos del proceso, EPP específico' },
  { codigo: 'RUIDO',        nombre: 'Exposición a ruido',                     obligatorio: false, vigencia_meses: 24, descripcion: 'Audiometrías, protección auditiva' }
];

// ── Catálogo precargado de elementos de EPP típicos ──
const HYS_EPP_CATALOGO_DEFAULT = [
  { codigo: 'CASCO',        nombre: 'Casco de seguridad',           categoria: 'Cabeza',   vida_util_meses: 60 },
  { codigo: 'ANTEOJOS',     nombre: 'Anteojos / antiparras',        categoria: 'Ojos',     vida_util_meses: 12 },
  { codigo: 'TAPONES',      nombre: 'Tapones auditivos',            categoria: 'Oídos',    vida_util_meses: 6 },
  { codigo: 'AURICULARES',  nombre: 'Protección auditiva tipo copa', categoria: 'Oídos',    vida_util_meses: 24 },
  { codigo: 'BARBIJO',      nombre: 'Barbijo / mascarilla',          categoria: 'Vías resp.', vida_util_meses: 1 },
  { codigo: 'SEMIMASCARA',  nombre: 'Semimáscara con filtros',       categoria: 'Vías resp.', vida_util_meses: 24 },
  { codigo: 'GUANTES',      nombre: 'Guantes',                       categoria: 'Manos',    vida_util_meses: 6 },
  { codigo: 'GUANTES_DIEL', nombre: 'Guantes dieléctricos',          categoria: 'Manos',    vida_util_meses: 12 },
  { codigo: 'BOTINES',      nombre: 'Calzado de seguridad',          categoria: 'Pies',     vida_util_meses: 12 },
  { codigo: 'BOTAS',        nombre: 'Botas de goma',                 categoria: 'Pies',     vida_util_meses: 24 },
  { codigo: 'PANTALON',     nombre: 'Pantalón de trabajo',           categoria: 'Cuerpo',   vida_util_meses: 12 },
  { codigo: 'CAMISA',       nombre: 'Camisa de trabajo',             categoria: 'Cuerpo',   vida_util_meses: 12 },
  { codigo: 'REMERA',       nombre: 'Remera de trabajo',             categoria: 'Cuerpo',   vida_util_meses: 12 },
  { codigo: 'BUZO',         nombre: 'Buzo / pulóver de trabajo',     categoria: 'Cuerpo',   vida_util_meses: 24 },
  { codigo: 'CAMPERA',      nombre: 'Campera de trabajo',            categoria: 'Cuerpo',   vida_util_meses: 36 },
  { codigo: 'CHALECO',      nombre: 'Chaleco refractario',           categoria: 'Cuerpo',   vida_util_meses: 24 },
  { codigo: 'IMPERMEABLE',  nombre: 'Equipo impermeable / lluvia',   categoria: 'Cuerpo',   vida_util_meses: 36 },
  { codigo: 'ARNES',        nombre: 'Arnés de seguridad',            categoria: 'Altura',   vida_util_meses: 60 },
  { codigo: 'CINTURON',     nombre: 'Cinturón ergonómico',           categoria: 'Cuerpo',   vida_util_meses: 24 },
  { codigo: 'ROPA_FR',      nombre: 'Ropa ignífuga / FR',            categoria: 'Cuerpo',   vida_util_meses: 36 }
];

// Storage keys
const HYS_KEYS = {
  TALLES:           'lsg_hys_talles',
  CAPACITACIONES:   'lsg_hys_capacitaciones',
  EPP_ENTREGAS:     'lsg_hys_epp_entregas',
  TIPOS_CAP:        'lsg_hys_capacitaciones_tipos',
  CATALOGO_EPP:     'lsg_hys_epp_catalogo',
  FILTROS:          'lsg_hys_filtros'
};

// ── Helpers de storage ──
function _hysGet(key, def){
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch(e){ return def; }
}
function _hysSet(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){ console.error(e); } }

function getHysTalles(){ return _hysGet(HYS_KEYS.TALLES, {}); }
function setHysTalles(o){ _hysSet(HYS_KEYS.TALLES, o); }
function getHysTallesEmp(leg){ return getHysTalles()[leg] || null; }

function getHysCapacitaciones(){ return _hysGet(HYS_KEYS.CAPACITACIONES, []); }
function setHysCapacitaciones(arr){ _hysSet(HYS_KEYS.CAPACITACIONES, arr); }
function getHysCapacitacionesEmp(leg){ return getHysCapacitaciones().filter(c => c.leg === leg); }

function getHysEppEntregas(){ return _hysGet(HYS_KEYS.EPP_ENTREGAS, []); }
function setHysEppEntregas(arr){ _hysSet(HYS_KEYS.EPP_ENTREGAS, arr); }
function getHysEppEntregasEmp(leg){ return getHysEppEntregas().filter(e => e.leg === leg); }

function getHysCapacitacionesTipos(){
  const u = _hysGet(HYS_KEYS.TIPOS_CAP, null);
  return u || JSON.parse(JSON.stringify(HYS_CAPACITACIONES_TIPOS_DEFAULT));
}
function getHysEppCatalogo(){
  const u = _hysGet(HYS_KEYS.CATALOGO_EPP, null);
  return u || JSON.parse(JSON.stringify(HYS_EPP_CATALOGO_DEFAULT));
}

// ── Métricas por empleado ──
function _hysMetricasEmp(leg){
  const hoy = new Date();
  const en30 = new Date(hoy); en30.setDate(en30.getDate()+30);
  const tipos = getHysCapacitacionesTipos();
  const caps = getHysCapacitacionesEmp(leg);
  const epps = getHysEppEntregasEmp(leg);
  const talles = getHysTallesEmp(leg);

  // Última capacitación registrada
  let ultimaCap = null;
  for(const c of caps){
    if(!c.fecha) continue;
    if(!ultimaCap || c.fecha > ultimaCap.fecha) ultimaCap = c;
  }

  // Capacitaciones próximas a vencer / vencidas
  let porVencer = 0, vencidas = 0;
  for(const c of caps){
    if(!c.vencimiento) continue;
    const v = new Date(c.vencimiento);
    if(v < hoy) vencidas++;
    else if(v < en30) porVencer++;
  }

  // EPP entregado en los últimos 12 meses
  const haceUnAnio = new Date(hoy); haceUnAnio.setFullYear(haceUnAnio.getFullYear()-1);
  let eppUlt12 = 0;
  for(const e of epps){
    if(!e.fecha) continue;
    if(new Date(e.fecha) >= haceUnAnio) eppUlt12++;
  }

  // ¿Tiene inducción inicial registrada?
  const tieneInduccion = caps.some(c => (c.tipo||'').toUpperCase() === 'INDUCCION');

  return {
    talles, tieneTalles: !!talles && Object.keys(talles).filter(k => talles[k]).length > 0,
    capsTotal: caps.length,
    ultimaCap,
    porVencer, vencidas,
    eppTotal: epps.length, eppUlt12,
    tieneInduccion
  };
}

// ── Render principal ──
function renderHysPanel(){
  const cont = document.getElementById('hys-content');
  if(!cont) return;
  const filtros = _hysGet(HYS_KEYS.FILTROS, { empresa:'', centro:'', busqueda:'', soloAlertas:false });

  // Empresas únicas presentes en la nómina activa
  const nomina = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
  const empresasUnicas = [...new Set(nomina.map(e => e.emp).filter(Boolean))].sort();

  // Centros disponibles según empresa elegida
  let centrosUnicos = [];
  if(filtros.empresa){
    centrosUnicos = [...new Set(nomina.filter(e => e.emp === filtros.empresa).map(e => (e.lugar||'').trim()).filter(Boolean))].sort();
  } else {
    centrosUnicos = [...new Set(nomina.map(e => (e.lugar||'').trim()).filter(Boolean))].sort();
  }

  // Aplicar filtros
  let lista = nomina.slice();
  if(filtros.empresa) lista = lista.filter(e => e.emp === filtros.empresa);
  if(filtros.centro)  lista = lista.filter(e => (e.lugar||'').trim() === filtros.centro);
  if(filtros.busqueda){
    const q = filtros.busqueda.toLowerCase();
    lista = lista.filter(e =>
      (e.nom||'').toLowerCase().includes(q) ||
      (e.leg||'').toLowerCase().includes(q) ||
      (e.cuil||'').includes(q)
    );
  }

  // Pre-calcular métricas para cada empleado
  const conMetricas = lista.map(e => ({ emp: e, m: _hysMetricasEmp(e.leg) }));
  if(filtros.soloAlertas){
    lista = conMetricas.filter(x => x.m.vencidas > 0 || x.m.porVencer > 0 || !x.m.tieneInduccion).map(x => x.emp);
  }

  // Métricas globales
  const totalGlobal = nomina.length;
  let sinTalles = 0, sinInduccion = 0, conVencidas = 0, conPorVencer = 0;
  for(const x of nomina.map(e => ({ leg: e.leg, m: _hysMetricasEmp(e.leg) }))){
    if(!x.m.tieneTalles) sinTalles++;
    if(!x.m.tieneInduccion) sinInduccion++;
    if(x.m.vencidas > 0) conVencidas++;
    if(x.m.porVencer > 0) conPorVencer++;
  }

  let html = `
    <!-- Toolbar HyS -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="hysAbrirDashboard()" style="font-size:12px;padding:7px 14px">📊 Dashboard</button>
        <button class="btn btn-ghost" onclick="hysAbrirCatalogos()" style="font-size:12px;padding:7px 14px">📚 Catálogos</button>
        <button class="btn btn-ghost" onclick="hysAbrirManuales()" style="font-size:12px;padding:7px 14px;color:rgb(168,85,247);border-color:rgba(168,85,247,.3)">📁 Manuales</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="hysAbrirImportacion()" style="font-size:12px;padding:7px 14px;color:rgb(34,197,94);border-color:rgba(34,197,94,.3)">⬆ Importar Excel</button>
        <button class="btn btn-ghost" onclick="hysExportarConsolidado()" style="font-size:12px;padding:7px 14px;color:var(--accent2);border-color:rgba(61,127,255,.3)">⬇ Exportar consolidado</button>
      </div>
    </div>

    <!-- Banner LRT informativo -->
    <div style="padding:12px 16px;background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.25);border-radius:var(--r);margin-bottom:14px;font-size:11px;color:var(--t2);line-height:1.55">
      <strong style="color:rgb(251,146,60)">🦺 Marco normativo:</strong> Ley 19.587 (Higiene y Seguridad en el Trabajo) ·
      Ley 24.557 (Riesgos del Trabajo) · Res. SRT 905/2015 (capacitaciones obligatorias) · Res. SRT 299/2011 (constancia de entrega de EPP).
    </div>

    <!-- Indicadores globales -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;margin-bottom:18px">
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">Total empleados</div>
        <div style="font-size:24px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:4px">${totalGlobal}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">Sin talles cargados</div>
        <div style="font-size:24px;font-weight:600;color:${sinTalles>0?'rgb(251,191,36)':'var(--t1)'};font-family:var(--font-mono);margin-top:4px">${sinTalles}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">Sin inducción inicial</div>
        <div style="font-size:24px;font-weight:600;color:${sinInduccion>0?'rgb(251,191,36)':'var(--t1)'};font-family:var(--font-mono);margin-top:4px">${sinInduccion}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">Capacit. por vencer</div>
        <div style="font-size:24px;font-weight:600;color:${conPorVencer>0?'rgb(234,179,8)':'var(--t1)'};font-family:var(--font-mono);margin-top:4px">${conPorVencer}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px">Empleados afectados (≤30 días)</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:.05em">Capacit. vencidas</div>
        <div style="font-size:24px;font-weight:600;color:${conVencidas>0?'rgb(239,68,68)':'var(--t1)'};font-family:var(--font-mono);margin-top:4px">${conVencidas}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px">Empleados afectados</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card" style="padding:14px 16px;margin-bottom:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <select id="hys-filtro-empresa" onchange="hysCambiarFiltro('empresa', this.value)"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;min-width:200px">
        <option value="">Todas las empresas</option>
        ${empresasUnicas.map(e => `<option value="${e}" ${filtros.empresa===e?'selected':''}>${e}</option>`).join('')}
      </select>
      <select id="hys-filtro-centro" onchange="hysCambiarFiltro('centro', this.value)"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;min-width:200px">
        <option value="">Todos los centros</option>
        ${centrosUnicos.map(c => `<option value="${c}" ${filtros.centro===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <input type="text" id="hys-filtro-busq" placeholder="Buscar por nombre, legajo o CUIL..." value="${filtros.busqueda||''}"
        oninput="hysCambiarFiltro('busqueda', this.value)"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;color:var(--t1);font-size:13px;outline:none;flex:1;min-width:200px">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);cursor:pointer">
        <input type="checkbox" id="hys-filtro-alertas" ${filtros.soloAlertas?'checked':''} onchange="hysCambiarFiltro('soloAlertas', this.checked)" style="width:16px;height:16px;cursor:pointer">
        <span>Solo con alertas</span>
      </label>
      <span style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${lista.length} resultado${lista.length!==1?'s':''}</span>
    </div>`;

  // Listado de empleados — agrupado por empresa si no hay filtro
  if(lista.length === 0){
    html += `<div class="card" style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Sin empleados que coincidan con los filtros aplicados.</div>`;
  } else {
    // Agrupar por empresa
    const grupos = {};
    for(const e of lista){
      const k = e.emp || '(sin empresa)';
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(e);
    }

    for(const empresa of Object.keys(grupos).sort()){
      const empleadosEmp = grupos[empresa];
      html += `
        <div style="margin-bottom:18px">
          <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding:0 4px">
            🏢 ${empresa} <span style="color:var(--t3);font-weight:normal">· ${empleadosEmp.length} empleado${empleadosEmp.length!==1?'s':''}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${empleadosEmp.map(e => _renderHysEmpleadoFila(e)).join('')}
          </div>
        </div>`;
    }
  }

  cont.innerHTML = html;
}

function _renderHysEmpleadoFila(emp){
  const m = _hysMetricasEmp(emp.leg);
  const fmt = iso => {
    if(!iso) return '—';
    if(iso.includes('-')){ const p=iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
    return iso;
  };

  // Badges de alerta
  const badges = [];
  if(m.vencidas > 0) badges.push(`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.1);color:rgb(239,68,68);border:1px solid rgba(239,68,68,.3)" title="${m.vencidas} capacitación${m.vencidas!==1?'es':''} vencida${m.vencidas!==1?'s':''}">⚠ ${m.vencidas} VENCIDA${m.vencidas!==1?'S':''}</span>`);
  if(m.porVencer > 0) badges.push(`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(234,179,8,.1);color:rgb(234,179,8);border:1px solid rgba(234,179,8,.3)" title="${m.porVencer} próxima${m.porVencer!==1?'s':''} a vencer en 30 días">⏱ ${m.porVencer} POR VENCER</span>`);
  if(!m.tieneInduccion) badges.push(`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)" title="No registra inducción inicial al puesto">⚠ SIN INDUCCIÓN</span>`);
  if(m.tieneInduccion && m.vencidas===0) badges.push(`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)" title="Inducción inicial registrada">✓ INDUCIDO</span>`);

  return `
    <div onclick="abrirModalHysEmpleado('${emp.leg}')" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:grid;grid-template-columns:1fr auto auto auto auto;gap:14px;align-items:center;cursor:pointer;transition:all .15s"
      onmouseover="this.style.borderColor='rgba(251,146,60,.4)';this.style.background='var(--bg3)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg2)'">
      <div style="min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:600;color:var(--t1)">${emp.nom||'(sin nombre)'}</span>
          ${badges.join('')}
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          ${emp.leg||'—'} · ${emp.cuil||'—'}${emp.lugar?' · 📍 '+emp.lugar:''}${emp.tarea?' · '+emp.tarea:''}
        </div>
      </div>
      <div style="text-align:center;min-width:80px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Talles</div>
        <div style="font-size:13px;color:${m.tieneTalles?'rgb(34,197,94)':'rgb(251,191,36)'};font-weight:600;margin-top:2px">${m.tieneTalles?'✓':'—'}</div>
      </div>
      <div style="text-align:center;min-width:90px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Capacit.</div>
        <div style="font-size:13px;color:var(--t1);font-weight:600;font-family:var(--font-mono);margin-top:2px">${m.capsTotal}</div>
      </div>
      <div style="text-align:center;min-width:90px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">EPP (12m)</div>
        <div style="font-size:13px;color:var(--t1);font-weight:600;font-family:var(--font-mono);margin-top:2px">${m.eppUlt12}</div>
      </div>
      <div style="text-align:center;min-width:100px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Última cap.</div>
        <div style="font-size:11px;color:var(--t2);font-family:var(--font-mono);margin-top:2px">${m.ultimaCap?fmt(m.ultimaCap.fecha):'—'}</div>
      </div>
    </div>`;
}

function hysCambiarFiltro(campo, valor){
  const f = _hysGet(HYS_KEYS.FILTROS, { empresa:'', centro:'', busqueda:'', soloAlertas:false });
  f[campo] = valor;
  // Si cambia empresa, resetear centro
  if(campo === 'empresa') f.centro = '';
  _hysSet(HYS_KEYS.FILTROS, f);
  renderHysPanel();
  // Restaurar foco en búsqueda
  if(campo === 'busqueda'){
    setTimeout(()=>{
      const el = document.getElementById('hys-filtro-busq');
      if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
  }
}

// ═══════════════════════════════════════════════════════════════
// HIGIENE Y SEGURIDAD · ETAPA 2 — Modal completo + CRUD
// ═══════════════════════════════════════════════════════════════

// Tabs estado
let _hysTabActual = 'resumen';

function abrirModalHysEmpleado(leg){
  const emp = empByLeg(leg);
  if(!emp){ toast('⚠ Empleado no encontrado','var(--red)'); return; }
  _hysTabActual = 'resumen';
  _renderModalHysEmpleado(emp);
}

function _renderModalHysEmpleado(emp){
  const prev = document.getElementById('modal-hys-emp');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-hys-emp';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:920px;width:100%;max-height:94vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2);position:sticky;top:0;z-index:2">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">🦺 ${emp.nom||'(sin nombre)'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${legD(emp.leg)} · ${emp.cuil||''} · ${emp.emp||''}${emp.lugar?' · '+emp.lugar:''}${emp.tarea?' · '+emp.tarea:''}</div>
        </div>
        <button onclick="cerrarModalHysEmp()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);background:var(--bg2);overflow-x:auto">
        ${[
          ['resumen','📊 Resumen'],
          ['talles','👕 Talles'],
          ['epp','🦺 EPP entregado'],
          ['capacitaciones','📚 Capacitaciones']
        ].map(([k,l])=>`
          <button onclick="hysTabModal('${emp.leg}','${k}')" id="hys-tab-${k}"
            style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;color:${_hysTabActual===k?'var(--t1)':'var(--t3)'};font-weight:${_hysTabActual===k?'600':'400'};border-bottom:2px solid ${_hysTabActual===k?'var(--accent2)':'transparent'};margin-bottom:-2px;white-space:nowrap">
            ${l}
          </button>
        `).join('')}
      </div>

      <div id="hys-modal-body" style="padding:20px 22px;min-height:300px"></div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0">
        <button class="btn btn-ghost" onclick="cerrarModalHysEmp()" style="font-size:13px;padding:8px 16px">Cerrar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', ev => { if(ev.target === modal) cerrarModalHysEmp(); });

  _hysRenderTabBody(emp);
}

function hysTabModal(leg, tab){
  _hysTabActual = tab;
  const emp = empByLeg(leg);
  if(!emp) return;
  // Actualizar estilos de tabs
  ['resumen','talles','epp','capacitaciones'].forEach(k=>{
    const b = document.getElementById('hys-tab-'+k);
    if(!b) return;
    const sel = (k===tab);
    b.style.color = sel ? 'var(--t1)' : 'var(--t3)';
    b.style.fontWeight = sel ? '600' : '400';
    b.style.borderBottom = '2px solid ' + (sel ? 'var(--accent2)' : 'transparent');
  });
  _hysRenderTabBody(emp);
}

function _hysRenderTabBody(emp){
  const body = document.getElementById('hys-modal-body');
  if(!body) return;
  if(_hysTabActual==='resumen') body.innerHTML = _hysTabResumenHTML(emp);
  if(_hysTabActual==='talles') body.innerHTML = _hysTabTallesHTML(emp);
  if(_hysTabActual==='epp') body.innerHTML = _hysTabEppHTML(emp);
  if(_hysTabActual==='capacitaciones') body.innerHTML = _hysTabCapHTML(emp);
}

// ── TAB RESUMEN ──
function _hysTabResumenHTML(emp){
  const m = _hysMetricasEmp(emp.leg);
  const tipos = getHysCapacitacionesTipos();
  const fmt = iso => iso && iso.includes('-') ? iso.split('-').reverse().join('/') : (iso||'—');

  const caps = getHysCapacitacionesEmp(emp.leg);
  const epps = getHysEppEntregasEmp(emp.leg);

  // Capacitaciones por tipo: cuáles tiene y cuáles le faltan (de las obligatorias)
  const tieneTipo = {};
  caps.forEach(c => { if(c.tipo) tieneTipo[c.tipo.toUpperCase()] = c; });
  const obligs = tipos.filter(t => t.obligatorio);
  const cumplidas = obligs.filter(t => tieneTipo[t.codigo]);
  const faltantes = obligs.filter(t => !tieneTipo[t.codigo]);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="padding:12px;background:var(--bg2);border-radius:var(--r);border:1px solid var(--border);text-align:center">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Capacitaciones</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:3px">${m.capsTotal}</div>
        ${m.vencidas>0?`<div style="font-size:10px;color:rgb(239,68,68);margin-top:2px">⚠ ${m.vencidas} vencida${m.vencidas!==1?'s':''}</div>`:''}
        ${m.porVencer>0?`<div style="font-size:10px;color:rgb(234,179,8);margin-top:2px">⏱ ${m.porVencer} por vencer</div>`:''}
      </div>
      <div style="padding:12px;background:var(--bg2);border-radius:var(--r);border:1px solid var(--border);text-align:center">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">EPP entregados</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono);margin-top:3px">${m.eppTotal}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px">${m.eppUlt12} en últ. 12 meses</div>
      </div>
      <div style="padding:12px;background:var(--bg2);border-radius:var(--r);border:1px solid var(--border);text-align:center">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Talles cargados</div>
        <div style="font-size:22px;font-weight:600;color:${m.tieneTalles?'rgb(34,197,94)':'rgb(251,191,36)'};font-family:var(--font-mono);margin-top:3px">${m.tieneTalles?'✓':'—'}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:2px">${m.tieneTalles?'Datos completos':'Pendientes'}</div>
      </div>
    </div>

    <div class="card" style="padding:14px 16px;margin-bottom:14px">
      <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Cumplimiento de capacitaciones obligatorias (LRT)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <div style="font-size:11px;color:rgb(34,197,94);margin-bottom:6px;font-weight:600">✓ Cumplidas (${cumplidas.length})</div>
          ${cumplidas.length===0?'<div style="font-size:11px;color:var(--t3);font-style:italic">Ninguna registrada</div>':cumplidas.map(t=>`
            <div style="font-size:11px;color:var(--t2);padding:3px 0">• ${t.nombre}</div>
          `).join('')}
        </div>
        <div>
          <div style="font-size:11px;color:rgb(239,68,68);margin-bottom:6px;font-weight:600">⚠ Faltantes (${faltantes.length})</div>
          ${faltantes.length===0?'<div style="font-size:11px;color:var(--t3);font-style:italic">Todas cubiertas</div>':faltantes.map(t=>`
            <div style="font-size:11px;color:var(--t2);padding:3px 0">• ${t.nombre}</div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card" style="padding:14px 16px">
      <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Últimas actividades</div>
      ${(() => {
        const items = [
          ...caps.map(c=>({ tipo:'cap', fecha:c.fecha, label: `📚 ${c.titulo||(getHysCapacitacionesTipos().find(t=>t.codigo===c.tipo)?.nombre)||c.tipo}`, sub: c.dictada_por||'' })),
          ...epps.map(e=>({ tipo:'epp', fecha:e.fecha, label: `🦺 ${(getHysEppCatalogo().find(x=>x.codigo===e.elemento)?.nombre)||e.elemento}`, sub: `Talle ${e.talle||'—'} · cant. ${e.cantidad||1}` }))
        ].filter(x=>x.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,8);
        if(items.length===0) return '<div style="font-size:12px;color:var(--t3);font-style:italic;text-align:center;padding:12px">Sin actividades registradas todavía.</div>';
        return items.map(x=>`
          <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;font-size:12px">
            <div>
              <div style="color:var(--t1)">${x.label}</div>
              ${x.sub?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${x.sub}</div>`:''}
            </div>
            <div style="font-family:var(--font-mono);color:var(--t3);font-size:11px;white-space:nowrap">${fmt(x.fecha)}</div>
          </div>
        `).join('');
      })()}
    </div>`;
}

// ── TAB TALLES ──
function _hysTabTallesHTML(emp){
  const t = getHysTallesEmp(emp.leg) || {};
  return `
    <div class="card" style="padding:18px 20px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:4px">Talles del empleado</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:18px">Datos para preparar la entrega de EPP. Se actualizan cada vez que se agrega o modifica un valor.</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Calzado / Botín</label>
          <input type="text" id="t-calzado" value="${(t.calzado||'').replace(/"/g,'&quot;')}" placeholder="Ej: 42 / 9 USA"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Pantalón</label>
          <input type="text" id="t-pantalon" value="${(t.pantalon||'').replace(/"/g,'&quot;')}" placeholder="Ej: 42, M, L"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Buzo / Pulóver</label>
          <input type="text" id="t-buzo" value="${(t.buzo||'').replace(/"/g,'&quot;')}" placeholder="Ej: M, L, XL"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Remera</label>
          <input type="text" id="t-remera" value="${(t.remera||'').replace(/"/g,'&quot;')}" placeholder="Ej: M, L, XL"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Campera</label>
          <input type="text" id="t-campera" value="${(t.campera||'').replace(/"/g,'&quot;')}" placeholder="Ej: M, L, XL"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Camisa</label>
          <input type="text" id="t-camisa" value="${(t.camisa||'').replace(/"/g,'&quot;')}" placeholder="Ej: 42, M, L"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Casco</label>
          <input type="text" id="t-casco" value="${(t.casco||'').replace(/"/g,'&quot;')}" placeholder="Ej: M, L, Único"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Guantes</label>
          <input type="text" id="t-guantes" value="${(t.guantes||'').replace(/"/g,'&quot;')}" placeholder="Ej: 9, M, L"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
      </div>

      <div style="margin-top:14px">
        <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Observaciones</label>
        <textarea id="t-obs" rows="2" placeholder="Particularidades, talles especiales, alergias a materiales, etc."
          style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(t.observaciones||'').replace(/</g,'&lt;')}</textarea>
      </div>

      ${t.actualizado ? `
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:14px;padding-top:10px;border-top:1px solid var(--border)">
          Última actualización: ${new Date(t.actualizado).toLocaleString('es-AR')}${t.actualizado_por?' · por '+t.actualizado_por:''}
        </div>
      ` : ''}

      <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        ${Object.keys(t).filter(k=>!['actualizado','actualizado_por'].includes(k) && t[k]).length > 0 ? `<button class="btn btn-ghost" onclick="hysBorrarTalles('${emp.leg}')" style="font-size:12px;padding:7px 14px;color:rgb(239,68,68);border-color:rgba(239,68,68,.3)">✕ Borrar todo</button>`:''}
        <button class="btn btn-primary" onclick="hysGuardarTalles('${emp.leg}')" style="font-size:12px;padding:7px 16px">💾 Guardar talles</button>
      </div>
    </div>`;
}

async function hysGuardarTalles(leg){
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const data = {
    calzado: gv('t-calzado'),
    pantalon: gv('t-pantalon'),
    buzo: gv('t-buzo'),
    remera: gv('t-remera'),
    campera: gv('t-campera'),
    camisa: gv('t-camisa'),
    casco: gv('t-casco'),
    guantes: gv('t-guantes'),
    observaciones: gv('t-obs'),
    actualizado: new Date().toISOString(),
    actualizado_por: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'RR.HH.'
  };
  const all = getHysTalles();
  all[leg] = data;
  setHysTalles(all);
  toast('✓ Talles guardados','var(--green)');
  const emp = empByLeg(leg);
  if(emp) _hysRenderTabBody(emp);
}

async function hysBorrarTalles(leg){
  const emp = empByLeg(leg);
  if(!emp) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Borrar todos los talles cargados para ${emp.nom}?<br><br>Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const all = getHysTalles();
  delete all[leg];
  setHysTalles(all);
  toast('✓ Talles borrados','var(--red)');
  _hysRenderTabBody(emp);
}

// ── TAB EPP ──
function _hysTabEppHTML(emp){
  const entregas = getHysEppEntregasEmp(emp.leg).slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const catalogo = getHysEppCatalogo();
  const fmt = iso => iso && iso.includes('-') ? iso.split('-').reverse().join('/') : (iso||'—');

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1)">EPP entregados</div>
        <div style="font-size:11px;color:var(--t3)">Constancias de entrega — Res. SRT 299/2011</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${entregas.length>0?`<button class="btn btn-ghost" onclick="hysImprimirConstanciaEpp('${emp.leg}')" style="font-size:12px;padding:7px 14px">🖨 Imprimir constancia</button>`:''}
        <button class="btn btn-primary" onclick="hysAbrirFormEpp('${emp.leg}',null)" style="font-size:12px;padding:7px 14px">+ Registrar entrega</button>
      </div>
    </div>

    ${entregas.length === 0 ? `
      <div class="card" style="padding:30px;text-align:center;color:var(--t3);font-size:13px">
        Sin entregas registradas todavía.<br>
        <span style="font-size:11px">Tocá <b>+ Registrar entrega</b> para empezar.</span>
      </div>
    ` : `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="overflow-x:auto">
          <table style="width:100%;min-width:680px;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Fecha</th>
                <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Elemento</th>
                <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Talle</th>
                <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Cant.</th>
                <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Conformidad</th>
                <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px"></th>
              </tr>
            </thead>
            <tbody>
              ${entregas.map(e=>{
                const elem = catalogo.find(x => x.codigo === e.elemento);
                const nombre = elem?.nombre || e.elemento || '—';
                return `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:10px 12px;font-family:var(--font-mono);color:var(--t2)">${fmt(e.fecha)}</td>
                  <td style="padding:10px 12px;color:var(--t1)">
                    <div>${nombre}</div>
                    ${elem?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${elem.categoria}</div>`:''}
                    ${e.observaciones?`<div style="font-size:10px;color:var(--t3);font-style:italic;margin-top:3px">${e.observaciones}</div>`:''}
                  </td>
                  <td style="padding:10px 12px;text-align:center;font-family:var(--font-mono);color:var(--t2)">${e.talle||'—'}</td>
                  <td style="padding:10px 12px;text-align:center;font-family:var(--font-mono);color:var(--t1)">${e.cantidad||1}</td>
                  <td style="padding:10px 12px;text-align:center">
                    ${e.recibido_ok?'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)">✓ FIRMADO</span>':'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(234,179,8,.1);color:rgb(234,179,8);border:1px solid rgba(234,179,8,.3)">PENDIENTE</span>'}
                  </td>
                  <td style="padding:8px;text-align:center;white-space:nowrap">
                    <button class="btn btn-ghost" onclick="hysAbrirFormEpp('${emp.leg}','${e.id}')" style="font-size:11px;padding:4px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)">✎</button>
                    <button class="btn btn-ghost" onclick="hysEliminarEpp('${emp.leg}','${e.id}')" style="font-size:11px;padding:4px 9px;color:var(--red);border-color:rgba(239,68,68,.3);margin-left:4px">✕</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}`;
}

function hysAbrirFormEpp(leg, idEdit){
  const emp = empByLeg(leg); if(!emp) return;
  const entregas = getHysEppEntregas();
  const existing = idEdit ? entregas.find(x=>x.id===idEdit) : null;
  const editing = !!existing;
  const catalogo = getHysEppCatalogo();
  const talles = getHysTallesEmp(leg) || {};

  const prev = document.getElementById('modal-hys-epp-form');
  if(prev) prev.remove();

  const e = existing || {};
  const hoy = new Date().toISOString().slice(0,10);

  // Sugerir talle si conocemos el elemento
  const sugerirTalle = cod => {
    const map = {
      'BOTINES':talles.calzado, 'BOTAS':talles.calzado,
      'PANTALON':talles.pantalon, 'CAMISA':talles.camisa,
      'REMERA':talles.remera, 'BUZO':talles.buzo,
      'CAMPERA':talles.campera, 'IMPERMEABLE':talles.campera,
      'CASCO':talles.casco, 'GUANTES':talles.guantes, 'GUANTES_DIEL':talles.guantes
    };
    return map[cod] || '';
  };

  // Categorías agrupadas
  const cats = [...new Set(catalogo.map(x=>x.categoria))];
  const opts = cats.map(c => `
    <optgroup label="${c}">
      ${catalogo.filter(x=>x.categoria===c).map(x=>`<option value="${x.codigo}" ${e.elemento===x.codigo?'selected':''}>${x.nombre}</option>`).join('')}
    </optgroup>
  `).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-hys-epp-form';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:540px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${editing?'✎ Editar entrega':'+ Registrar entrega de EPP'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${emp.nom} · ${legD(emp.leg)}</div>
        </div>
        <button onclick="document.getElementById('modal-hys-epp-form').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Elemento *</label>
          <select id="epp-elem" data-talles='${JSON.stringify(talles).replace(/'/g, "&apos;")}' onchange="hysSugerirTalleEpp(event.target)"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="">— Seleccionar —</option>
            ${opts}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Talle</label>
            <input type="text" id="epp-talle" value="${(e.talle||'').replace(/"/g,'&quot;')}" placeholder="—"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Cantidad</label>
            <input type="number" id="epp-cant" min="1" value="${e.cantidad||1}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Fecha *</label>
            <input type="date" id="epp-fecha" value="${e.fecha||hoy}" max="${hoy}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Motivo</label>
          <select id="epp-motivo"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="entrega_inicial" ${e.motivo==='entrega_inicial'?'selected':''}>Entrega inicial / Ingreso</option>
            <option value="reposicion" ${(e.motivo==='reposicion'||!e.motivo)?'selected':''}>Reposición periódica</option>
            <option value="cambio_talle" ${e.motivo==='cambio_talle'?'selected':''}>Cambio de talle</option>
            <option value="rotura" ${e.motivo==='rotura'?'selected':''}>Reposición por rotura/desgaste</option>
            <option value="extraviado" ${e.motivo==='extraviado'?'selected':''}>Reposición por extravío</option>
            <option value="otro" ${e.motivo==='otro'?'selected':''}>Otro</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Observaciones</label>
          <textarea id="epp-obs" rows="2" placeholder="Marca/modelo, número de lote, particularidades..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(e.observaciones||'').replace(/</g,'&lt;')}</textarea>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--t2);cursor:pointer;padding:8px 0">
          <input type="checkbox" id="epp-conforme" ${e.recibido_ok?'checked':''} style="width:16px;height:16px;cursor:pointer">
          <span>Empleado firmó la conformidad de recepción</span>
        </label>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hys-epp-form').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="hysGuardarEpp('${emp.leg}',${editing?`'${e.id}'`:'null'})" style="font-size:13px;padding:8px 18px">${editing?'Guardar cambios':'Registrar entrega'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>{ const el=document.getElementById('epp-elem'); if(el && !editing) el.focus(); },50);
}

// Auto-completa el talle según el elemento seleccionado y los talles cargados del empleado.
// Solo sugiere si el campo está vacío (no pisa lo que el usuario ya tipeó).
function hysSugerirTalleEpp(selectEl){
  if(!selectEl) return;
  const t = document.getElementById('epp-talle');
  if(!t || t.value) return;
  let talles = {};
  try { talles = JSON.parse((selectEl.dataset.talles||'{}').replace(/&apos;/g,"'")); } catch(e){}
  const cod = selectEl.value;
  const map = {
    'BOTINES': talles.calzado, 'BOTAS': talles.calzado,
    'PANTALON': talles.pantalon, 'CAMISA': talles.camisa,
    'REMERA': talles.remera, 'BUZO': talles.buzo,
    'CAMPERA': talles.campera, 'IMPERMEABLE': talles.campera,
    'CASCO': talles.casco, 'GUANTES': talles.guantes,
    'GUANTES_DIEL': talles.guantes
  };
  if(map[cod]) t.value = map[cod];
}

async function hysGuardarEpp(leg, idEdit){
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const elemento = gv('epp-elem');
  const fecha = gv('epp-fecha');
  if(!elemento){ showAlert('Seleccioná un elemento.', 'warning'); return; }
  if(!fecha){ showAlert('La fecha de entrega es obligatoria.', 'warning'); return; }
  if(fecha > new Date().toISOString().slice(0,10)){
    showAlert('La fecha no puede ser futura.', 'warning'); return;
  }

  const all = getHysEppEntregas();
  const data = {
    id: idEdit || 'epp_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
    leg, elemento,
    talle: gv('epp-talle'),
    cantidad: parseInt(gv('epp-cant'),10) || 1,
    fecha,
    motivo: gv('epp-motivo') || 'reposicion',
    observaciones: gv('epp-obs'),
    recibido_ok: !!document.getElementById('epp-conforme')?.checked,
    creado: idEdit ? (all.find(x=>x.id===idEdit)?.creado || new Date().toISOString()) : new Date().toISOString(),
    creado_por: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'RR.HH.'
  };

  if(idEdit){
    const i = all.findIndex(x=>x.id===idEdit);
    if(i>=0) all[i] = data;
  } else {
    all.push(data);
  }
  setHysEppEntregas(all);
  document.getElementById('modal-hys-epp-form').remove();
  toast('✓ '+(idEdit?'Entrega actualizada':'Entrega registrada'),'var(--green)');
  const emp = empByLeg(leg);
  if(emp) _hysRenderTabBody(emp);
}

async function hysEliminarEpp(leg, id){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Eliminar este registro de entrega?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const all = getHysEppEntregas().filter(x => x.id !== id);
  setHysEppEntregas(all);
  toast('✓ Registro eliminado','var(--red)');
  const emp = empByLeg(leg);
  if(emp) _hysRenderTabBody(emp);
}

// ── TAB CAPACITACIONES ──
function _hysTabCapHTML(emp){
  const caps = getHysCapacitacionesEmp(emp.leg).slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const tipos = getHysCapacitacionesTipos();
  const fmt = iso => iso && iso.includes('-') ? iso.split('-').reverse().join('/') : (iso||'—');
  const hoy = new Date().toISOString().slice(0,10);

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1)">Capacitaciones</div>
        <div style="font-size:11px;color:var(--t3)">Registro nominal — Res. SRT 905/2015</div>
      </div>
      <button class="btn btn-primary" onclick="hysAbrirFormCap('${emp.leg}',null)" style="font-size:12px;padding:7px 14px">+ Registrar capacitación</button>
    </div>

    ${caps.length === 0 ? `
      <div class="card" style="padding:30px;text-align:center;color:var(--t3);font-size:13px">
        Sin capacitaciones registradas todavía.<br>
        <span style="font-size:11px">Tocá <b>+ Registrar capacitación</b> para agregar la primera.</span>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${caps.map(c=>{
          const tipo = tipos.find(t => t.codigo === (c.tipo||'').toUpperCase());
          const venc = c.vencimiento;
          const vencido = venc && venc < hoy;
          const en30 = new Date(); en30.setDate(en30.getDate()+30);
          const porVencer = venc && !vencido && new Date(venc) <= en30;
          return `
          <div class="card" style="padding:12px 14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:flex-start">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                <span style="font-size:13px;font-weight:600;color:var(--t1)">${c.titulo || tipo?.nombre || c.tipo || '—'}</span>
                ${tipo?.obligatorio?'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)">OBLIGATORIA</span>':''}
                ${vencido?'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.1);color:rgb(239,68,68);border:1px solid rgba(239,68,68,.3)">⚠ VENCIDA</span>':''}
                ${porVencer?'<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(234,179,8,.1);color:rgb(234,179,8);border:1px solid rgba(234,179,8,.3)">⏱ POR VENCER</span>':''}
              </div>
              <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:flex;flex-wrap:wrap;gap:14px">
                <span>📅 Realizada: ${fmt(c.fecha)}</span>
                ${venc?`<span>⏱ Vence: ${fmt(venc)}</span>`:''}
                ${c.duracion_hs?`<span>⏱ ${c.duracion_hs} hs</span>`:''}
                ${c.dictada_por?`<span>👤 ${c.dictada_por}</span>`:''}
                ${c.modalidad?`<span>${c.modalidad==='presencial'?'🏢':'💻'} ${c.modalidad}</span>`:''}
              </div>
              ${c.observaciones?`<div style="font-size:11px;color:var(--t3);margin-top:6px;font-style:italic">${c.observaciones}</div>`:''}
              ${c.constancia?`<div style="font-size:10px;color:var(--accent2);margin-top:4px;font-family:var(--font-mono)">📎 Constancia: ${c.constancia}</div>`:''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" onclick="hysAbrirFormCap('${emp.leg}','${c.id}')" style="font-size:11px;padding:4px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)">✎</button>
              <button class="btn btn-ghost" onclick="hysEliminarCap('${emp.leg}','${c.id}')" style="font-size:11px;padding:4px 9px;color:var(--red);border-color:rgba(239,68,68,.3)">✕</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `}`;
}

function hysAbrirFormCap(leg, idEdit){
  const emp = empByLeg(leg); if(!emp) return;
  const caps = getHysCapacitaciones();
  const existing = idEdit ? caps.find(x=>x.id===idEdit) : null;
  const editing = !!existing;
  const tipos = getHysCapacitacionesTipos();

  const prev = document.getElementById('modal-hys-cap-form');
  if(prev) prev.remove();

  const c = existing || {};
  const hoy = new Date().toISOString().slice(0,10);

  const opts = tipos.map(t => `<option value="${t.codigo}" ${(c.tipo||'').toUpperCase()===t.codigo?'selected':''}>${t.obligatorio?'★ ':''}${t.nombre}</option>`).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-hys-cap-form';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${editing?'✎ Editar capacitación':'+ Registrar capacitación'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${emp.nom} · ${legD(emp.leg)}</div>
        </div>
        <button onclick="document.getElementById('modal-hys-cap-form').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Tipo de capacitación *</label>
          <select id="cap-tipo" onchange="hysSugerirVencimiento(); hysActualizarManualesVinculados();"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="">— Seleccionar tipo —</option>
            ${opts}
          </select>
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Las marcadas con ★ son obligatorias por LRT</div>
          <div id="cap-manuales-box" style="display:none;margin-top:10px"></div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Título / Tema específico</label>
          <input type="text" id="cap-titulo" value="${(c.titulo||'').replace(/"/g,'&quot;')}" placeholder="Ej: Manejo de autoelevador modelo X"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          <div style="font-size:10px;color:var(--t3);margin-top:4px">Si lo dejás vacío, se usa el nombre del tipo</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Fecha realizada *</label>
            <input type="date" id="cap-fecha" value="${c.fecha||hoy}" onchange="hysSugerirVencimiento()" max="${hoy}"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Duración (hs)</label>
            <input type="number" id="cap-duracion" min="0" step="0.5" value="${c.duracion_hs||''}" placeholder="2"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Vencimiento</label>
            <input type="date" id="cap-vencimiento" value="${c.vencimiento||''}" oninput="this.dataset.userEdited='1'"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <div style="font-size:10px;color:var(--t3);margin-top:4px">Se sugiere automático según tipo</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Dictada por</label>
            <input type="text" id="cap-dictante" value="${(c.dictada_por||'').replace(/"/g,'&quot;')}" placeholder="ART, técnico, profesional..."
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Modalidad</label>
            <select id="cap-modalidad"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              <option value="presencial" ${(c.modalidad||'presencial')==='presencial'?'selected':''}>🏢 Presencial</option>
              <option value="virtual" ${c.modalidad==='virtual'?'selected':''}>💻 Virtual / e-learning</option>
              <option value="mixta" ${c.modalidad==='mixta'?'selected':''}>🔀 Mixta</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Constancia / Certificado nº</label>
          <input type="text" id="cap-constancia" value="${(c.constancia||'').replace(/"/g,'&quot;')}" placeholder="Nº de constancia, código del certificado"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Observaciones</label>
          <textarea id="cap-obs" rows="2" placeholder="Aprobado/desaprobado, evaluación, notas..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(c.observaciones||'').replace(/</g,'&lt;')}</textarea>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hys-cap-form').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="hysGuardarCap('${emp.leg}',${editing?`'${c.id}'`:'null'})" style="font-size:13px;padding:8px 18px">${editing?'Guardar cambios':'Registrar capacitación'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>{ const el=document.getElementById('cap-tipo'); if(el && !editing) el.focus(); hysActualizarManualesVinculados(); },50);
}

function hysSugerirVencimiento(){
  const tipoCod = document.getElementById('cap-tipo')?.value;
  const fecha = document.getElementById('cap-fecha')?.value;
  const vencEl = document.getElementById('cap-vencimiento');
  if(!tipoCod || !fecha || !vencEl) return;
  // No pisar valor del usuario si ya cargó algo distinto al sugerido previo
  if(vencEl.dataset.userEdited === '1' && vencEl.value) return;
  const tipo = getHysCapacitacionesTipos().find(t => t.codigo === tipoCod);
  if(!tipo || !tipo.vigencia_meses){ vencEl.value=''; return; }
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + tipo.vigencia_meses);
  vencEl.value = d.toISOString().slice(0,10);
}

// ═══════════════════════════════════════════════════════════════
// VINCULACIÓN MANUAL ↔ TIPO DE CAPACITACIÓN
// Busca manuales que tengan el código del tipo en sus tags
// ═══════════════════════════════════════════════════════════════

// Devuelve los manuales vinculados a un código de tipo
function getManualesPorTipo(codigoTipo){
  if(!codigoTipo) return [];
  const cod = String(codigoTipo).trim().toUpperCase();
  if(!cod) return [];
  const meta = (typeof getHysManualesMeta==='function') ? getHysManualesMeta() : [];
  return meta.filter(m => Array.isArray(m.tags) && m.tags.some(t => String(t).trim().toUpperCase() === cod));
}

// Refresca el bloque de manuales asociados dentro del form de capacitación
function hysActualizarManualesVinculados(){
  const tipoCod = document.getElementById('cap-tipo')?.value;
  const box = document.getElementById('cap-manuales-box');
  if(!box) return;
  if(!tipoCod){ box.style.display='none'; box.innerHTML=''; return; }

  const manuales = getManualesPorTipo(tipoCod);
  const tipo = getHysCapacitacionesTipos().find(t => t.codigo === tipoCod);
  const tipoNom = tipo?.nombre || tipoCod;

  if(manuales.length === 0){
    box.style.display = 'block';
    box.innerHTML = `
      <div style="padding:10px 12px;background:var(--bg2);border:1px dashed var(--border);border-radius:var(--r);font-size:11px;color:var(--t3);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span>📁 No hay manuales vinculados a "<b>${tipoNom}</b>". Podés cargar uno desde Manuales con el tag <code style="font-family:var(--font-mono);background:var(--bg3);padding:1px 5px;border-radius:4px">${tipoCod}</code>.</span>
        <button type="button" onclick="hysAbrirManualesYCerrarFormCap()" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:4px 10px;color:var(--accent2);font-size:11px;cursor:pointer">📁 Ir a Manuales</button>
      </div>`;
    return;
  }

  box.style.display = 'block';
  box.innerHTML = `
    <div style="padding:10px 12px;background:rgba(168,85,247,.06);border:1px solid rgba(168,85,247,.25);border-radius:var(--r)">
      <div style="font-size:11px;font-family:var(--font-mono);color:rgb(168,85,247);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
        📁 ${manuales.length} manual${manuales.length!==1?'es':''} vinculado${manuales.length!==1?'s':''} a este tipo
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${manuales.map(m => {
          const ico = (typeof _hysIconByMime==='function') ? _hysIconByMime(m.mime, m.fileName) : '📎';
          const tam = (typeof _hysFmtSize==='function') ? _hysFmtSize(m.size||0) : '';
          return `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0">
              <div style="font-size:18px;line-height:1">${ico}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:var(--t1);font-weight:500">${m.titulo||m.fileName}</div>
                <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${m.fileName} · ${tam}${m.version?' · v'+m.version:''}</div>
              </div>
              <button type="button" onclick="hysDescargarManual('${m.id}')" style="background:var(--bg3);border:1px solid rgba(34,197,94,.3);border-radius:var(--r);padding:4px 10px;color:rgb(34,197,94);font-size:11px;cursor:pointer;white-space:nowrap" title="Descargar manual">⬇ Descargar</button>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

// Cierra el form de capacitación y abre la biblioteca de manuales
function hysAbrirManualesYCerrarFormCap(){
  const m = document.getElementById('modal-hys-cap-form');
  if(m) m.remove();
  if(typeof hysAbrirManuales==='function') hysAbrirManuales();
}

async function hysGuardarCap(leg, idEdit){
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const tipo = gv('cap-tipo');
  const fecha = gv('cap-fecha');
  if(!tipo){ showAlert('Seleccioná el tipo de capacitación.', 'warning'); return; }
  if(!fecha){ showAlert('La fecha es obligatoria.', 'warning'); return; }
  if(fecha > new Date().toISOString().slice(0,10)){ showAlert('La fecha realizada no puede ser futura.', 'warning'); return; }
  const venc = gv('cap-vencimiento');
  if(venc && venc <= fecha){ showAlert('El vencimiento debe ser posterior a la fecha de realización.', 'warning'); return; }

  const all = getHysCapacitaciones();
  const data = {
    id: idEdit || 'cap_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
    leg,
    tipo,
    titulo: gv('cap-titulo'),
    fecha,
    vencimiento: venc,
    duracion_hs: parseFloat(gv('cap-duracion')) || null,
    dictada_por: gv('cap-dictante'),
    modalidad: gv('cap-modalidad') || 'presencial',
    constancia: gv('cap-constancia'),
    observaciones: gv('cap-obs'),
    creado: idEdit ? (all.find(x=>x.id===idEdit)?.creado || new Date().toISOString()) : new Date().toISOString(),
    creado_por: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'RR.HH.'
  };

  if(idEdit){
    const i = all.findIndex(x=>x.id===idEdit);
    if(i>=0) all[i] = data;
  } else {
    all.push(data);
  }
  setHysCapacitaciones(all);
  document.getElementById('modal-hys-cap-form').remove();
  toast('✓ '+(idEdit?'Capacitación actualizada':'Capacitación registrada'),'var(--green)');
  const emp = empByLeg(leg);
  if(emp) _hysRenderTabBody(emp);
}

async function hysEliminarCap(leg, id){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Eliminar este registro de capacitación?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const all = getHysCapacitaciones().filter(x => x.id !== id);
  setHysCapacitaciones(all);
  toast('✓ Capacitación eliminada','var(--red)');
  const emp = empByLeg(leg);
  if(emp) _hysRenderTabBody(emp);
}

// ── Constancia imprimible de entrega de EPP (Res. SRT 299/2011) ──
function hysImprimirConstanciaEpp(leg){
  const emp = empByLeg(leg);
  if(!emp) return;
  const entregas = getHysEppEntregasEmp(leg).slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  if(entregas.length === 0){ toast('⚠ No hay entregas registradas','var(--yellow)'); return; }
  const catalogo = getHysEppCatalogo();
  const fmt = iso => iso && iso.includes('-') ? iso.split('-').reverse().join('/') : (iso||'—');

  const w = window.open('', '_blank');
  if(!w){ toast('⚠ Habilitá pop-ups para imprimir','var(--red)'); return; }

  const filas = entregas.map(e => {
    const elem = catalogo.find(x => x.codigo === e.elemento);
    const nombre = elem?.nombre || e.elemento || '—';
    return `<tr>
      <td>${fmt(e.fecha)}</td>
      <td>${nombre}</td>
      <td style="text-align:center">${e.talle||'—'}</td>
      <td style="text-align:center">${e.cantidad||1}</td>
      <td style="text-align:center">${e.recibido_ok?'✓ Sí':'—'}</td>
      <td>${e.observaciones||''}</td>
    </tr>`;
  }).join('');

  w.document.write(`
<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Constancia EPP - ${emp.nom}</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#111;font-size:12px}
  h1{font-size:14px;margin:0 0 4px;text-align:center;text-transform:uppercase}
  h2{font-size:11px;margin:0 0 18px;text-align:center;color:#666;font-weight:normal}
  .meta{border:1px solid #999;padding:10px 14px;margin-bottom:18px}
  .meta-row{display:flex;gap:24px;margin-bottom:4px}
  .meta-row b{display:inline-block;min-width:100px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px}
  th,td{border:1px solid #999;padding:5px 8px;text-align:left;vertical-align:top}
  th{background:#eee;font-size:10px;text-transform:uppercase}
  .legal{font-size:10px;color:#444;margin:24px 0;text-align:justify;line-height:1.5}
  .firma{margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:60px}
  .firma-box{border-top:1px solid #000;padding-top:6px;text-align:center;font-size:10px}
  @media print { body{padding:15px} .noprint{display:none} }
  .noprint{position:fixed;top:10px;right:10px;background:#000;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:12px}
</style></head><body>
<button class="noprint" onclick="window.print()">🖨 Imprimir</button>
<h1>Constancia de Entrega de Elementos de Protección Personal</h1>
<h2>Ley 19.587 · Ley 24.557 · Res. SRT 299/2011</h2>
<div class="meta">
  <div class="meta-row"><b>Empresa:</b> ${emp.emp||''}</div>
  <div class="meta-row"><b>Empleado:</b> ${emp.nom||''}</div>
  <div class="meta-row"><b>Legajo:</b> ${emp.leg||''}<span style="margin-left:30px"></span><b>CUIL:</b> ${emp.cuil||''}</div>
  <div class="meta-row"><b>Centro:</b> ${emp.lugar||''}<span style="margin-left:30px"></span><b>Tarea:</b> ${emp.tarea||''}</div>
</div>
<table>
  <thead><tr>
    <th style="width:90px">Fecha</th>
    <th>Elemento de protección</th>
    <th style="width:60px">Talle</th>
    <th style="width:50px">Cant.</th>
    <th style="width:80px">Conformidad</th>
    <th>Observaciones</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="legal">
  Por la presente dejo constancia que recibí los elementos de protección personal detallados en el cuadro precedente, los cuales me fueron entregados en perfecto estado de conservación y uso. Asimismo, declaro haber sido capacitado/a respecto a su correcta utilización, conservación y reposición conforme lo establece la Resolución SRT 299/2011 y la Ley 19.587. Me comprometo a su uso obligatorio durante toda la jornada laboral y a notificar de inmediato cualquier deterioro, pérdida o necesidad de reposición.
</div>
<div class="firma">
  <div class="firma-box">Firma del empleado<br>Aclaración: ${emp.nom||''}<br>DNI: ${emp.dni||''}</div>
  <div class="firma-box">Firma y sello de RR.HH. / Higiene y Seguridad</div>
</div>
</body></html>`);
  w.document.close();
}

function cerrarModalHysEmp(){
  const m = document.getElementById('modal-hys-emp');
  if(m) m.remove();
}

// ═══════════════════════════════════════════════════════════════
// HIGIENE Y SEGURIDAD · ETAPA 3 · Parte 1
// Dashboard de cumplimiento + ABM de catálogos
// ═══════════════════════════════════════════════════════════════

// ── DASHBOARD ──
function hysAbrirDashboard(){
  const prev = document.getElementById('modal-hys-dash');
  if(prev) prev.remove();

  const nomina = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
  const tipos = getHysCapacitacionesTipos();
  const obligs = tipos.filter(t => t.obligatorio);
  const empresas = [...new Set(nomina.map(e => e.emp).filter(Boolean))].sort();

  // Métricas por empresa
  const porEmpresa = {};
  for(const emp of empresas){
    const empleadosEmp = nomina.filter(x => x.emp === emp);
    let conTalles=0, conInduccion=0, vencidas=0, porVencer=0, capsTotal=0, eppTotal=0;
    for(const x of empleadosEmp){
      const m = _hysMetricasEmp(x.leg);
      if(m.tieneTalles) conTalles++;
      if(m.tieneInduccion) conInduccion++;
      if(m.vencidas > 0) vencidas++;
      if(m.porVencer > 0) porVencer++;
      capsTotal += m.capsTotal;
      eppTotal += m.eppTotal;
    }
    porEmpresa[emp] = { total: empleadosEmp.length, conTalles, conInduccion, vencidas, porVencer, capsTotal, eppTotal };
  }

  // Cumplimiento por tipo de capacitación obligatoria
  const cumplimientoTipo = {};
  for(const t of obligs){
    let cumplen = 0;
    for(const e of nomina){
      const caps = getHysCapacitacionesEmp(e.leg);
      if(caps.some(c => (c.tipo||'').toUpperCase() === t.codigo)){ cumplen++; }
    }
    cumplimientoTipo[t.codigo] = { tipo: t, cumplen, total: nomina.length };
  }

  // Próximos vencimientos (todas las capacitaciones que vencen en los próximos 90 días)
  const hoy = new Date();
  const en90 = new Date(hoy); en90.setDate(en90.getDate()+90);
  const todasLasCaps = getHysCapacitaciones();
  const proximas = todasLasCaps
    .filter(c => c.vencimiento && new Date(c.vencimiento) >= hoy && new Date(c.vencimiento) <= en90)
    .sort((a,b) => a.vencimiento.localeCompare(b.vencimiento))
    .slice(0, 30);

  const fmt = iso => iso && iso.includes('-') ? iso.split('-').reverse().join('/') : (iso||'—');
  const pct = (n,t) => t===0 ? 0 : Math.round(n/t*100);

  // Render tarjeta de empresa
  const tarjEmp = (emp, m) => {
    const pTalles = pct(m.conTalles, m.total);
    const pInduc = pct(m.conInduccion, m.total);
    const colorBar = p => p >= 80 ? 'rgb(34,197,94)' : (p >= 50 ? 'rgb(234,179,8)' : 'rgb(239,68,68)');
    return `
      <div class="card" style="padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:10px">🏢 ${emp}</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:8px">${m.total} empleados</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span style="color:var(--t2)">Con talles cargados</span>
              <span style="font-family:var(--font-mono);color:${colorBar(pTalles)};font-weight:600">${m.conTalles}/${m.total} · ${pTalles}%</span>
            </div>
            <div style="height:6px;background:var(--bg2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pTalles}%;background:${colorBar(pTalles)};transition:width .3s"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span style="color:var(--t2)">Con inducción inicial</span>
              <span style="font-family:var(--font-mono);color:${colorBar(pInduc)};font-weight:600">${m.conInduccion}/${m.total} · ${pInduc}%</span>
            </div>
            <div style="height:6px;background:var(--bg2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pInduc}%;background:${colorBar(pInduc)};transition:width .3s"></div>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
          <div>
            <div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-family:var(--font-mono)">Vencidas</div>
            <div style="font-size:14px;font-weight:600;color:${m.vencidas>0?'rgb(239,68,68)':'var(--t2)'};font-family:var(--font-mono)">${m.vencidas}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-family:var(--font-mono)">Por vencer</div>
            <div style="font-size:14px;font-weight:600;color:${m.porVencer>0?'rgb(234,179,8)':'var(--t2)'};font-family:var(--font-mono)">${m.porVencer}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-family:var(--font-mono)">Capacit. tot.</div>
            <div style="font-size:14px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${m.capsTotal}</div>
          </div>
          <div>
            <div style="font-size:9px;color:var(--t3);text-transform:uppercase;font-family:var(--font-mono)">EPP entreg.</div>
            <div style="font-size:14px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${m.eppTotal}</div>
          </div>
        </div>
      </div>`;
  };

  // Tabla de cumplimiento por tipo
  const filasTipo = obligs.map(t => {
    const c = cumplimientoTipo[t.codigo];
    const p = pct(c.cumplen, c.total);
    const color = p >= 80 ? 'rgb(34,197,94)' : (p >= 50 ? 'rgb(234,179,8)' : 'rgb(239,68,68)');
    const manuales = (typeof getManualesPorTipo === 'function') ? getManualesPorTipo(t.codigo) : [];
    const manualCell = manuales.length > 0
      ? `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3);cursor:pointer" onclick="hysDescargarManual('${manuales[0].id}')" title="${manuales.length>1?manuales.length+' manuales — descarga el más reciente':'Descargar manual'}">📁 ${manuales.length}</span>`
      : `<span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">—</span>`;
    return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:10px 12px;color:var(--t1);font-size:12px">${t.nombre}</td>
        <td style="padding:10px 12px;font-family:var(--font-mono);color:var(--t3);font-size:11px;text-align:center">${t.vigencia_meses?t.vigencia_meses+' m':'—'}</td>
        <td style="padding:10px 12px;text-align:center">${manualCell}</td>
        <td style="padding:10px 12px;font-family:var(--font-mono);text-align:right">
          <span style="color:${color};font-weight:600">${c.cumplen}/${c.total}</span>
          <span style="color:var(--t3);margin-left:6px">(${p}%)</span>
        </td>
        <td style="padding:10px 12px;width:120px">
          <div style="height:6px;background:var(--bg2);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${p}%;background:${color}"></div>
          </div>
        </td>
      </tr>`;
  }).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-hys-dash';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:1100px;width:100%;max-height:94vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2);position:sticky;top:0;z-index:2">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📊 Dashboard de Cumplimiento — Higiene y Seguridad</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Vista consolidada del grupo de empresas · Generado ${new Date().toLocaleString('es-AR')}</div>
        </div>
        <button onclick="document.getElementById('modal-hys-dash').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:20px 22px">
        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Cumplimiento por empresa</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;margin-bottom:24px">
          ${empresas.map(emp => tarjEmp(emp, porEmpresa[emp])).join('')}
        </div>

        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Cumplimiento por capacitación obligatoria (LRT)</div>
        <div class="card" style="padding:0;overflow:hidden;margin-bottom:24px">
          <div style="overflow-x:auto">
            <table style="width:100%;min-width:600px;border-collapse:collapse">
              <thead>
                <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
                  <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Capacitación</th>
                  <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px">Vigencia</th>
                  <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:80px">Manual</th>
                  <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:140px">Cumplen</th>
                  <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:120px">%</th>
                </tr>
              </thead>
              <tbody>${filasTipo}</tbody>
            </table>
          </div>
        </div>

        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Próximos vencimientos (90 días)</div>
        ${proximas.length === 0 ? `
          <div class="card" style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin capacitaciones por vencer en los próximos 90 días.</div>
        ` : `
          <div class="card" style="padding:0;overflow:hidden">
            <div style="overflow-x:auto;max-height:300px">
              <table style="width:100%;min-width:680px;border-collapse:collapse">
                <thead>
                  <tr style="background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0">
                    <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Empleado</th>
                    <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Empresa</th>
                    <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Capacitación</th>
                    <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:100px">Vence</th>
                    <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:80px">Días</th>
                  </tr>
                </thead>
                <tbody>
                  ${proximas.map(c => {
                    const e = empByLeg(c.leg);
                    const t = tipos.find(x => x.codigo === (c.tipo||'').toUpperCase());
                    const nom = t?.nombre || c.tipo;
                    const dias = Math.ceil((new Date(c.vencimiento) - hoy) / 86400000);
                    const colorD = dias <= 30 ? 'rgb(239,68,68)' : (dias <= 60 ? 'rgb(234,179,8)' : 'rgb(34,197,94)');
                    return `
                      <tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="document.getElementById('modal-hys-dash').remove();abrirModalHysEmpleado('${c.leg}')">
                        <td style="padding:9px 12px;font-size:12px;color:var(--t1)">${e?.nom||c.leg}</td>
                        <td style="padding:9px 12px;font-size:11px;color:var(--t3)">${e?.emp||'—'}</td>
                        <td style="padding:9px 12px;font-size:11px;color:var(--t2)">${c.titulo||nom||'—'}</td>
                        <td style="padding:9px 12px;font-size:11px;font-family:var(--font-mono);text-align:right;color:var(--t3)">${fmt(c.vencimiento)}</td>
                        <td style="padding:9px 12px;font-size:11px;font-family:var(--font-mono);text-align:right;color:${colorD};font-weight:600">${dias} d</td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0">
        <button class="btn btn-ghost" onclick="window.print()" style="font-size:13px;padding:8px 16px">🖨 Imprimir</button>
        <button class="btn btn-primary" onclick="document.getElementById('modal-hys-dash').remove()" style="font-size:13px;padding:8px 18px">Cerrar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGOS EDITABLES (Tipos de capacitación + EPP)
// ═══════════════════════════════════════════════════════════════
let _hysCatalogoTab = 'tipos';

function hysAbrirCatalogos(){
  _hysCatalogoTab = 'tipos';
  _hysRenderModalCatalogos();
}

function _hysRenderModalCatalogos(){
  const prev = document.getElementById('modal-hys-cat');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-hys-cat';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:880px;width:100%;max-height:94vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2);position:sticky;top:0;z-index:2">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📚 Catálogos de Higiene y Seguridad</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Tipos de capacitación y elementos de EPP</div>
        </div>
        <button onclick="document.getElementById('modal-hys-cat').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);background:var(--bg2)">
        <button onclick="hysCatTab('tipos')" id="hys-cat-tab-tipos"
          style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;color:${_hysCatalogoTab==='tipos'?'var(--t1)':'var(--t3)'};font-weight:${_hysCatalogoTab==='tipos'?'600':'400'};border-bottom:2px solid ${_hysCatalogoTab==='tipos'?'var(--accent2)':'transparent'};margin-bottom:-2px">
          📚 Tipos de capacitación
        </button>
        <button onclick="hysCatTab('epp')" id="hys-cat-tab-epp"
          style="background:none;border:none;padding:10px 18px;cursor:pointer;font-size:13px;color:${_hysCatalogoTab==='epp'?'var(--t1)':'var(--t3)'};font-weight:${_hysCatalogoTab==='epp'?'600':'400'};border-bottom:2px solid ${_hysCatalogoTab==='epp'?'var(--accent2)':'transparent'};margin-bottom:-2px">
          🦺 Elementos de EPP
        </button>
      </div>
      <div id="hys-cat-body" style="padding:18px 22px"></div>
    </div>`;
  document.body.appendChild(modal);
  _hysRenderCatBody();
}

function hysCatTab(tab){
  _hysCatalogoTab = tab;
  ['tipos','epp'].forEach(k=>{
    const b = document.getElementById('hys-cat-tab-'+k);
    if(!b) return;
    const sel = (k===tab);
    b.style.color = sel ? 'var(--t1)' : 'var(--t3)';
    b.style.fontWeight = sel ? '600' : '400';
    b.style.borderBottom = '2px solid ' + (sel ? 'var(--accent2)' : 'transparent');
  });
  _hysRenderCatBody();
}

function _hysRenderCatBody(){
  const body = document.getElementById('hys-cat-body');
  if(!body) return;
  if(_hysCatalogoTab==='tipos') body.innerHTML = _hysCatTiposHTML();
  else body.innerHTML = _hysCatEppHTML();
}

function _hysCatTiposHTML(){
  const tipos = getHysCapacitacionesTipos();
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:11px;color:var(--t3)">${tipos.length} tipos · ${tipos.filter(t=>t.obligatorio).length} obligatorios LRT</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="hysCatRestaurarTipos()" style="font-size:11px;padding:6px 12px;color:var(--yellow);border-color:rgba(234,179,8,.3)">↺ Restaurar default</button>
        <button class="btn btn-primary" onclick="hysCatTipoAbrirForm(null)" style="font-size:11px;padding:6px 14px">+ Nuevo tipo</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:120px">Código</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Nombre</th>
            <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px">Obligat.</th>
            <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px">Vig. (m)</th>
            <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:80px">Manual</th>
            <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px"></th>
          </tr>
        </thead>
        <tbody>
          ${tipos.map((t,i)=>{
            const manuales = (typeof getManualesPorTipo==='function') ? getManualesPorTipo(t.codigo) : [];
            const manualCell = manuales.length > 0
              ? `<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3);cursor:pointer" onclick="hysDescargarManual('${manuales[0].id}')" title="${manuales.length>1?manuales.length+' manuales — descarga el más reciente':'Descargar manual'}">📁 ${manuales.length}</span>`
              : `<span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)" title="Cargá un manual con tag '${t.codigo}'">—</span>`;
            return `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 12px"><span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)">${t.codigo}</span></td>
              <td style="padding:10px 12px;color:var(--t1)">${t.nombre}${t.descripcion?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${t.descripcion}</div>`:''}</td>
              <td style="padding:10px;text-align:center">${t.obligatorio?'<span style="color:rgb(34,197,94);font-weight:600">✓</span>':'<span style="color:var(--t3)">—</span>'}</td>
              <td style="padding:10px;text-align:center;font-family:var(--font-mono);color:var(--t2)">${t.vigencia_meses||'—'}</td>
              <td style="padding:10px;text-align:center">${manualCell}</td>
              <td style="padding:8px;text-align:center;white-space:nowrap">
                <button class="btn btn-ghost" onclick="hysCatTipoAbrirForm(${i})" style="font-size:11px;padding:4px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)">✎</button>
                <button class="btn btn-ghost" onclick="hysCatTipoEliminar(${i})" style="font-size:11px;padding:4px 9px;color:var(--red);border-color:rgba(239,68,68,.3);margin-left:4px">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function _hysCatEppHTML(){
  const cat = getHysEppCatalogo();
  const cats = [...new Set(cat.map(x=>x.categoria))];
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:11px;color:var(--t3)">${cat.length} elementos · ${cats.length} categorías</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="hysCatRestaurarEpp()" style="font-size:11px;padding:6px 12px;color:var(--yellow);border-color:rgba(234,179,8,.3)">↺ Restaurar default</button>
        <button class="btn btn-primary" onclick="hysCatEppAbrirForm(null)" style="font-size:11px;padding:6px 14px">+ Nuevo elemento</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:130px">Código</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500">Nombre</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:120px">Categoría</th>
            <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px">Vida (m)</th>
            <th style="padding:10px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;font-weight:500;width:90px"></th>
          </tr>
        </thead>
        <tbody>
          ${cat.map((e,i)=>`
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:10px 12px"><span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(251,146,60,.08);color:rgb(251,146,60);border:1px solid rgba(251,146,60,.3)">${e.codigo}</span></td>
              <td style="padding:10px 12px;color:var(--t1)">${e.nombre}</td>
              <td style="padding:10px 12px;color:var(--t2);font-size:11px">${e.categoria||'—'}</td>
              <td style="padding:10px;text-align:center;font-family:var(--font-mono);color:var(--t2)">${e.vida_util_meses||'—'}</td>
              <td style="padding:8px;text-align:center;white-space:nowrap">
                <button class="btn btn-ghost" onclick="hysCatEppAbrirForm(${i})" style="font-size:11px;padding:4px 9px;color:var(--accent2);border-color:rgba(61,127,255,.3)">✎</button>
                <button class="btn btn-ghost" onclick="hysCatEppEliminar(${i})" style="font-size:11px;padding:4px 9px;color:var(--red);border-color:rgba(239,68,68,.3);margin-left:4px">✕</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function hysCatTipoAbrirForm(idx){
  const tipos = getHysCapacitacionesTipos();
  const t = idx!==null && idx!==undefined ? tipos[idx] : null;
  const editing = !!t;
  const prev = document.getElementById('modal-hys-cat-form'); if(prev) prev.remove();
  const m = document.createElement('div');
  m.id = 'modal-hys-cat-form';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML = `
    <div class="card" style="padding:0;max-width:520px;width:100%;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${editing?'✎ Editar tipo':'+ Nuevo tipo de capacitación'}</div>
        <button onclick="document.getElementById('modal-hys-cat-form').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Código *</label>
          <input type="text" id="ct-codigo" maxlength="20" value="${t?.codigo||''}" ${editing?'readonly':''} style="width:100%;background:${editing?'var(--bg3)':'var(--bg2)'};border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:${editing?'var(--t3)':'var(--t1)'};font-size:13px;outline:none;font-family:var(--font-mono);text-transform:uppercase">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Nombre *</label>
          <input type="text" id="ct-nombre" value="${(t?.nombre||'').replace(/"/g,'&quot;')}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Vigencia (meses)</label>
            <input type="number" id="ct-vigencia" min="0" value="${t?.vigencia_meses||''}" placeholder="12" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Vacío = sin vencimiento</div>
          </div>
          <div style="display:flex;align-items:flex-end">
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--t2);cursor:pointer;padding:9px 0">
              <input type="checkbox" id="ct-obligat" ${t?.obligatorio?'checked':''} style="width:16px;height:16px;cursor:pointer">
              <span>Obligatoria por LRT</span>
            </label>
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Descripción</label>
          <textarea id="ct-desc" rows="2" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(t?.descripcion||'').replace(/</g,'&lt;')}</textarea>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hys-cat-form').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="hysCatTipoGuardar(${editing?idx:'null'})" style="font-size:13px;padding:8px 18px">${editing?'Guardar':'Agregar'}</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  setTimeout(()=>{ const el=document.getElementById(editing?'ct-nombre':'ct-codigo'); if(el) el.focus(); },50);
}

async function hysCatTipoGuardar(idx){
  const codigo = (document.getElementById('ct-codigo').value||'').trim().toUpperCase();
  const nombre = (document.getElementById('ct-nombre').value||'').trim();
  const vig = parseInt(document.getElementById('ct-vigencia')?.value || '0', 10);
  const obligat = !!document.getElementById('ct-obligat')?.checked;
  const desc = (document.getElementById('ct-desc').value||'').trim();
  if(!codigo){ showAlert('Código obligatorio.', 'warning'); return; }
  if(!nombre){ showAlert('Nombre obligatorio.', 'warning'); return; }
  const tipos = getHysCapacitacionesTipos();
  if(idx===null || idx===undefined){
    if(tipos.some(t=>t.codigo.toUpperCase()===codigo)){ showAlert(`Ya existe un tipo con código ${codigo}.`, 'warning'); return; }
    tipos.push({ codigo, nombre, obligatorio:obligat, vigencia_meses:isNaN(vig)?null:vig, descripcion:desc });
  } else {
    tipos[idx] = { ...tipos[idx], nombre, obligatorio:obligat, vigencia_meses:isNaN(vig)?null:vig, descripcion:desc };
  }
  _hysSet(HYS_KEYS.TIPOS_CAP, tipos);
  document.getElementById('modal-hys-cat-form').remove();
  _hysRenderCatBody();
  toast('✓ Tipo '+(idx==null?'agregado':'actualizado'),'var(--green)');
}

async function hysCatTipoEliminar(idx){
  const tipos = getHysCapacitacionesTipos();
  const t = tipos[idx];
  if(!t) return;
  // Verificar uso
  const enUso = getHysCapacitaciones().filter(c => (c.tipo||'').toUpperCase() === t.codigo.toUpperCase()).length;
  const msg = enUso > 0
    ? `¿Eliminar el tipo "${t.codigo} — ${t.nombre}"?\n\n⚠ Hay ${enUso} capacitación${enUso!==1?'es':''} registrada${enUso!==1?'s':''} con este tipo. Las capacitaciones quedarán pero sin matchear con el catálogo.\n\n¿Continuar?`
    : `¿Eliminar el tipo "${t.codigo} — ${t.nombre}"?`;
  const _cfm13 = await showConfirm({titulo:"Confirmar acción",mensaje:msg,labelOk:"Confirmar",peligroso:true});
  if(!_cfm13) return;
  tipos.splice(idx,1);
  _hysSet(HYS_KEYS.TIPOS_CAP, tipos);
  _hysRenderCatBody();
  toast('✓ Tipo eliminado','var(--red)');
}

async function hysCatRestaurarTipos(){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Restaurar el catálogo a los 15 tipos por defecto LRT?<br><br>Se perderán los tipos personalizados.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  localStorage.removeItem(HYS_KEYS.TIPOS_CAP);
  _hysRenderCatBody();
  toast('✓ Catálogo restaurado','var(--green)');
}

function hysCatEppAbrirForm(idx){
  const cat = getHysEppCatalogo();
  const e = idx!==null && idx!==undefined ? cat[idx] : null;
  const editing = !!e;
  const prev = document.getElementById('modal-hys-cat-form'); if(prev) prev.remove();
  const m = document.createElement('div');
  m.id = 'modal-hys-cat-form';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
  const cats = ['Cabeza','Ojos','Oídos','Vías resp.','Manos','Pies','Cuerpo','Altura','Otros'];
  m.innerHTML = `
    <div class="card" style="padding:0;max-width:480px;width:100%;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${editing?'✎ Editar elemento':'+ Nuevo elemento de EPP'}</div>
        <button onclick="document.getElementById('modal-hys-cat-form').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Código *</label>
          <input type="text" id="ce-codigo" maxlength="20" value="${e?.codigo||''}" ${editing?'readonly':''} style="width:100%;background:${editing?'var(--bg3)':'var(--bg2)'};border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:${editing?'var(--t3)':'var(--t1)'};font-size:13px;outline:none;font-family:var(--font-mono);text-transform:uppercase">
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Nombre *</label>
          <input type="text" id="ce-nombre" value="${(e?.nombre||'').replace(/"/g,'&quot;')}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Categoría</label>
            <select id="ce-cat" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              ${cats.map(c=>`<option value="${c}" ${e?.categoria===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Vida útil (m)</label>
            <input type="number" id="ce-vida" min="0" value="${e?.vida_util_meses||''}" placeholder="12" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hys-cat-form').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="hysCatEppGuardar(${editing?idx:'null'})" style="font-size:13px;padding:8px 18px">${editing?'Guardar':'Agregar'}</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  setTimeout(()=>{ const el=document.getElementById(editing?'ce-nombre':'ce-codigo'); if(el) el.focus(); },50);
}

async function hysCatEppGuardar(idx){
  const codigo = (document.getElementById('ce-codigo').value||'').trim().toUpperCase();
  const nombre = (document.getElementById('ce-nombre').value||'').trim();
  const categoria = document.getElementById('ce-cat').value;
  const vida = parseInt(document.getElementById('ce-vida')?.value || '0', 10);
  if(!codigo){ showAlert('Código obligatorio.', 'warning'); return; }
  if(!nombre){ showAlert('Nombre obligatorio.', 'warning'); return; }
  const cat = getHysEppCatalogo();
  if(idx===null || idx===undefined){
    if(cat.some(x=>x.codigo.toUpperCase()===codigo)){ showAlert(`Ya existe un elemento con código ${codigo}.`, 'warning'); return; }
    cat.push({ codigo, nombre, categoria, vida_util_meses:isNaN(vida)?null:vida });
  } else {
    cat[idx] = { ...cat[idx], nombre, categoria, vida_util_meses:isNaN(vida)?null:vida };
  }
  _hysSet(HYS_KEYS.CATALOGO_EPP, cat);
  document.getElementById('modal-hys-cat-form').remove();
  _hysRenderCatBody();
  toast('✓ Elemento '+(idx==null?'agregado':'actualizado'),'var(--green)');
}

async function hysCatEppEliminar(idx){
  const cat = getHysEppCatalogo();
  const e = cat[idx];
  if(!e) return;
  const enUso = getHysEppEntregas().filter(x => (x.elemento||'').toUpperCase() === e.codigo.toUpperCase()).length;
  const msg = enUso > 0
    ? `¿Eliminar el elemento "${e.codigo} — ${e.nombre}"?\n\n⚠ Hay ${enUso} entrega${enUso!==1?'s':''} registrada${enUso!==1?'s':''} con este elemento.\n\n¿Continuar?`
    : `¿Eliminar el elemento "${e.codigo} — ${e.nombre}"?`;
  const _cfm13 = await showConfirm({titulo:"Confirmar acción",mensaje:msg,labelOk:"Confirmar",peligroso:true});
  if(!_cfm13) return;
  cat.splice(idx,1);
  _hysSet(HYS_KEYS.CATALOGO_EPP, cat);
  _hysRenderCatBody();
  toast('✓ Elemento eliminado','var(--red)');
}

async function hysCatRestaurarEpp(){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Restaurar el catálogo a los 20 elementos por defecto?<br><br>Se perderán los elementos personalizados.'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  localStorage.removeItem(HYS_KEYS.CATALOGO_EPP);
  _hysRenderCatBody();
  toast('✓ Catálogo restaurado','var(--green)');
}


// ═══════════════════════════════════════════════════════════════
// HIGIENE Y SEGURIDAD · ETAPA 3 · Parte 2
// Importación y exportación de Excel (SheetJS)
// ═══════════════════════════════════════════════════════════════

// Helper: cargar SheetJS si no está
function _hysCargarXLSX(cb){
  if(window.XLSX){ cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload = cb;
  s.onerror = () => showAlert('No se pudo cargar la librería de Excel.', 'warning');
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════
// MODAL DE IMPORTACIÓN (3 plantillas)
// ═══════════════════════════════════════════════════════════════
function hysAbrirImportacion(){
  const prev = document.getElementById('modal-hys-imp');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-hys-imp';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:700px;width:100%;max-height:94vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2)">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⬆ Importación masiva desde Excel</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Cargá talles, EPP entregados o capacitaciones desde planillas</div>
        </div>
        <button onclick="document.getElementById('modal-hys-imp').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="padding:12px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);font-size:11px;color:var(--t2);line-height:1.55">
          <strong style="color:rgb(34,197,94)">📋 Cómo funciona:</strong>
          <ol style="margin:6px 0 0 18px;padding:0">
            <li>Descargá la plantilla del tipo de dato que querés cargar (viene pre-llena con todos los empleados activos).</li>
            <li>Completá las filas en Excel siguiendo los formatos indicados en la primera fila de notas.</li>
            <li>Volvé acá y subí el archivo. Vas a ver una previsualización antes de confirmar.</li>
          </ol>
        </div>

        ${_hysImpTipoCard('talles','👕 Talles de empleados',
          'Calzado, pantalón, buzo, remera, campera, camisa, casco, guantes',
          'Una fila por empleado. Si dejás una columna vacía, ese talle no se sobrescribe.')}
        ${_hysImpTipoCard('epp','🦺 Entregas de EPP',
          'Registro de elementos entregados con fecha, talle y motivo',
          'Múltiples filas por empleado (una por entrega). Las fechas en formato DD/MM/AAAA o AAAA-MM-DD.')}
        ${_hysImpTipoCard('caps','📚 Capacitaciones realizadas',
          'Capacitaciones brindadas con fecha, tipo, vencimiento, duración',
          'Múltiples filas por empleado. El tipo debe coincidir con un código del catálogo (ej: INDUCCION, EPP, ALTURA).')}
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function _hysImpTipoCard(tipo, titulo, sub, hint){
  return `
    <div class="card" style="padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:3px">${titulo}</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:4px">${sub}</div>
        <div style="font-size:10px;color:var(--t3);font-style:italic">💡 ${hint}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-ghost" onclick="hysDescargarPlantilla('${tipo}')" style="font-size:11px;padding:6px 12px;white-space:nowrap">📋 Plantilla</button>
        <label class="btn btn-primary" style="font-size:11px;padding:6px 12px;cursor:pointer;text-align:center;white-space:nowrap">
          ⬆ Subir
          <input type="file" accept=".xlsx,.xls,.csv" onchange="hysProcesarArchivo('${tipo}', event)" style="display:none">
        </label>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// PLANTILLAS DESCARGABLES (pre-llenas con empleados)
// ═══════════════════════════════════════════════════════════════
function hysDescargarPlantilla(tipo){
  _hysCargarXLSX(()=>{
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const nomina = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);

    let rows = [];
    let nombreHoja = '';
    let nombreArchivo = '';

    if(tipo === 'talles'){
      nombreHoja = 'Talles';
      nombreArchivo = 'plantilla_HyS_talles';
      rows.push([
        'LEGAJO','NOMBRE','EMPRESA',
        'CALZADO','PANTALON','BUZO','REMERA','CAMPERA','CAMISA','CASCO','GUANTES','OBSERVACIONES'
      ]);
      rows.push([
        '⚠ NO MODIFICAR','⚠ Solo lectura','⚠ Solo lectura',
        'Ej: 42','Ej: 42 o L','Ej: M','Ej: L','Ej: XL','Ej: 42','Ej: M','Ej: 9'
      ]);
      // Pre-cargar talles existentes
      const todos = getHysTalles();
      for(const e of nomina){
        const t = todos[e.leg] || {};
        rows.push([
          e.leg, e.nom, e.emp,
          t.calzado||'', t.pantalon||'', t.buzo||'', t.remera||'',
          t.campera||'', t.camisa||'', t.casco||'', t.guantes||'',
          t.observaciones||''
        ]);
      }
    }
    else if(tipo === 'epp'){
      nombreHoja = 'EPP entregados';
      nombreArchivo = 'plantilla_HyS_epp';
      rows.push([
        'LEGAJO','NOMBRE','EMPRESA',
        'FECHA','CODIGO_ELEMENTO','TALLE','CANTIDAD','MOTIVO','OBSERVACIONES','FIRMADO'
      ]);
      rows.push([
        '⚠ Requerido','⚠ Solo lectura','⚠ Solo lectura',
        'DD/MM/AAAA','Código del catálogo','Ej: M, 42','Ej: 1','reposicion / entrega_inicial / cambio_talle / rotura / extraviado','Texto libre','SI / NO'
      ]);
      // Una fila vacía por empleado para que se vean
      for(const e of nomina){
        rows.push([e.leg, e.nom, e.emp, '', '', '', '', '', '', '']);
      }
    }
    else if(tipo === 'caps'){
      nombreHoja = 'Capacitaciones';
      nombreArchivo = 'plantilla_HyS_capacitaciones';
      rows.push([
        'LEGAJO','NOMBRE','EMPRESA',
        'FECHA','CODIGO_TIPO','TITULO','VENCIMIENTO','DURACION_HS','DICTANTE','MODALIDAD','CONSTANCIA','OBSERVACIONES'
      ]);
      rows.push([
        '⚠ Requerido','⚠ Solo lectura','⚠ Solo lectura',
        'DD/MM/AAAA','Código del catálogo (★ obligatorios)','Tema específico','DD/MM/AAAA (vacío = sin venc.)','Ej: 2','Ej: ART, Ing. Pérez','presencial/virtual/mixta','Nº cert.','Notas'
      ]);
      for(const e of nomina){
        rows.push([e.leg, e.nom, e.emp, '', '', '', '', '', '', '', '', '']);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Anchos
    ws['!cols'] = rows[0].map((h, i) => ({ wch: i < 3 ? 18 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    // Hoja de catálogo si aplica
    if(tipo === 'epp'){
      const cat = getHysEppCatalogo();
      const catRows = [['CODIGO','NOMBRE','CATEGORIA','VIDA_UTIL_MESES']];
      cat.forEach(c => catRows.push([c.codigo, c.nombre, c.categoria, c.vida_util_meses||'']));
      const wsC = XLSX.utils.aoa_to_sheet(catRows);
      wsC['!cols'] = [{wch:14},{wch:36},{wch:14},{wch:14}];
      XLSX.utils.book_append_sheet(wb, wsC, 'Catálogo EPP');
    }
    if(tipo === 'caps'){
      const tipos = getHysCapacitacionesTipos();
      const catRows = [['CODIGO','NOMBRE','OBLIGATORIO_LRT','VIGENCIA_MESES','DESCRIPCION']];
      tipos.forEach(t => catRows.push([t.codigo, t.nombre, t.obligatorio?'SI':'NO', t.vigencia_meses||'', t.descripcion||'']));
      const wsC = XLSX.utils.aoa_to_sheet(catRows);
      wsC['!cols'] = [{wch:18},{wch:46},{wch:14},{wch:12},{wch:50}];
      XLSX.utils.book_append_sheet(wb, wsC, 'Catálogo Tipos');
    }

    XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast('✓ Plantilla descargada — '+nomina.length+' empleados','var(--green)');
  });
}

// ═══════════════════════════════════════════════════════════════
// PROCESAR ARCHIVO SUBIDO
// ═══════════════════════════════════════════════════════════════
function hysProcesarArchivo(tipo, ev){
  const file = ev.target.files[0];
  if(!file) return;
  _hysCargarXLSX(()=>{
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const XLSX = window.XLSX;
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        if(rows.length < 3){
          showAlert('El archivo no tiene filas de datos.', 'warning');
          ev.target.value = '';
          return;
        }
        // rows[0] = headers, rows[1] = notas, rows[2..] = datos
        const headers = rows[0].map(h => String(h||'').trim().toUpperCase());
        const dataRows = rows.slice(2).filter(r => r && r.some(c => c !== undefined && String(c).trim() !== ''));

        if(tipo === 'talles') _hysImpTallesPreview(headers, dataRows);
        else if(tipo === 'epp') _hysImpEppPreview(headers, dataRows);
        else if(tipo === 'caps') _hysImpCapsPreview(headers, dataRows);
      } catch(err){
        console.error(err);
        showAlert('Error al leer el archivo: ' + err.message, "warning");
      }
      ev.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Helper: parsear fecha DD/MM/AAAA o AAAA-MM-DD ──
function _hysParseFecha(s){
  if(!s) return '';
  s = String(s).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
    const p = s.split('/');
    return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  }
  // intentar Date.parse
  const d = new Date(s);
  if(!isNaN(d)) return d.toISOString().slice(0,10);
  return null;
}

function _hysIdxOf(headers, ...nombres){
  for(const n of nombres){
    const i = headers.indexOf(n.toUpperCase());
    if(i >= 0) return i;
  }
  return -1;
}

// ── PREVIEW Y CONFIRMACIÓN: TALLES ──
function _hysImpTallesPreview(headers, rows){
  const iLeg = _hysIdxOf(headers, 'LEGAJO');
  if(iLeg < 0){ showAlert('Falta la columna LEGAJO en la planilla.', 'warning'); return; }
  const cols = ['CALZADO','PANTALON','BUZO','REMERA','CAMPERA','CAMISA','CASCO','GUANTES','OBSERVACIONES'];
  const idxCol = {};
  for(const c of cols){ idxCol[c] = _hysIdxOf(headers, c); }

  const validos = [], errores = [];
  for(const [n, r] of rows.entries()){
    const leg = String(r[iLeg]||'').trim();
    if(!leg){ errores.push({ fila:n+3, motivo:'Sin legajo' }); continue; }
    const emp = empByLeg(leg);
    if(!emp){ errores.push({ fila:n+3, leg, motivo:'Legajo no encontrado en la nómina' }); continue; }
    // Construir objeto
    const t = {};
    let algunDato = false;
    for(const c of cols){
      const i = idxCol[c];
      if(i >= 0 && r[i] !== undefined && String(r[i]).trim() !== ''){
        const key = c.toLowerCase();
        t[key === 'observaciones' ? 'observaciones' : key] = String(r[i]).trim();
        algunDato = true;
      }
    }
    if(!algunDato) continue;
    validos.push({ leg, emp, t });
  }

  _hysMostrarPreview('talles', validos, errores, () => {
    const all = getHysTalles();
    for(const v of validos){
      all[v.leg] = { ...all[v.leg], ...v.t, actualizado: new Date().toISOString(), actualizado_por: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'Importación' };
    }
    setHysTalles(all);
  });
}

// ── PREVIEW Y CONFIRMACIÓN: EPP ──
function _hysImpEppPreview(headers, rows){
  const iLeg = _hysIdxOf(headers, 'LEGAJO');
  const iFecha = _hysIdxOf(headers, 'FECHA');
  const iElem = _hysIdxOf(headers, 'CODIGO_ELEMENTO','ELEMENTO');
  const iTalle = _hysIdxOf(headers, 'TALLE');
  const iCant = _hysIdxOf(headers, 'CANTIDAD');
  const iMotivo = _hysIdxOf(headers, 'MOTIVO');
  const iObs = _hysIdxOf(headers, 'OBSERVACIONES');
  const iFirm = _hysIdxOf(headers, 'FIRMADO');
  if(iLeg<0||iFecha<0||iElem<0){ showAlert('Faltan columnas obligatorias: LEGAJO, FECHA, CODIGO_ELEMENTO.', 'warning'); return; }

  const catalogo = getHysEppCatalogo();
  const codigosValidos = new Set(catalogo.map(c => c.codigo.toUpperCase()));
  const validos = [], errores = [];
  const hoy = new Date().toISOString().slice(0,10);

  for(const [n, r] of rows.entries()){
    const leg = String(r[iLeg]||'').trim();
    if(!leg) continue;
    const emp = empByLeg(leg);
    if(!emp){ errores.push({ fila:n+3, leg, motivo:'Legajo no encontrado' }); continue; }
    const fecha = _hysParseFecha(r[iFecha]);
    if(!fecha){ errores.push({ fila:n+3, leg, motivo:'Fecha inválida o vacía' }); continue; }
    if(fecha > hoy){ errores.push({ fila:n+3, leg, motivo:'Fecha futura no permitida' }); continue; }
    const elemento = String(r[iElem]||'').trim().toUpperCase();
    if(!codigosValidos.has(elemento)){ errores.push({ fila:n+3, leg, motivo:'Código de elemento no existe en el catálogo: '+elemento }); continue; }
    const cant = parseInt(r[iCant],10) || 1;
    const motivo = String(r[iMotivo]||'reposicion').trim().toLowerCase();
    const obs = String(r[iObs]||'').trim();
    const firm = String(r[iFirm]||'').trim().toUpperCase();
    validos.push({ leg, emp, data:{
      id: 'epp_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      leg, elemento, talle:String(r[iTalle]||'').trim(), cantidad:cant, fecha, motivo, observaciones:obs,
      recibido_ok: firm === 'SI' || firm === 'YES' || firm === 'TRUE',
      creado: new Date().toISOString(),
      creado_por: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'Importación'
    }});
  }

  _hysMostrarPreview('epp', validos, errores, () => {
    const all = getHysEppEntregas();
    for(const v of validos) all.push(v.data);
    setHysEppEntregas(all);
  });
}

// ── PREVIEW Y CONFIRMACIÓN: CAPACITACIONES ──
function _hysImpCapsPreview(headers, rows){
  const iLeg = _hysIdxOf(headers, 'LEGAJO');
  const iFecha = _hysIdxOf(headers, 'FECHA');
  const iTipo = _hysIdxOf(headers, 'CODIGO_TIPO','TIPO');
  const iTit = _hysIdxOf(headers, 'TITULO');
  const iVenc = _hysIdxOf(headers, 'VENCIMIENTO');
  const iDur = _hysIdxOf(headers, 'DURACION_HS','DURACION');
  const iDict = _hysIdxOf(headers, 'DICTANTE','DICTADA_POR');
  const iMod = _hysIdxOf(headers, 'MODALIDAD');
  const iCons = _hysIdxOf(headers, 'CONSTANCIA');
  const iObs = _hysIdxOf(headers, 'OBSERVACIONES');
  if(iLeg<0||iFecha<0||iTipo<0){ showAlert('Faltan columnas obligatorias: LEGAJO, FECHA, CODIGO_TIPO.', 'warning'); return; }

  const tipos = getHysCapacitacionesTipos();
  const codigosValidos = new Set(tipos.map(t => t.codigo.toUpperCase()));
  const validos = [], errores = [];
  const hoy = new Date().toISOString().slice(0,10);

  for(const [n, r] of rows.entries()){
    const leg = String(r[iLeg]||'').trim();
    if(!leg) continue;
    const emp = empByLeg(leg);
    if(!emp){ errores.push({ fila:n+3, leg, motivo:'Legajo no encontrado' }); continue; }
    const fecha = _hysParseFecha(r[iFecha]);
    if(!fecha){ errores.push({ fila:n+3, leg, motivo:'Fecha inválida o vacía' }); continue; }
    if(fecha > hoy){ errores.push({ fila:n+3, leg, motivo:'Fecha futura no permitida' }); continue; }
    const tipo = String(r[iTipo]||'').trim().toUpperCase();
    if(!codigosValidos.has(tipo)){ errores.push({ fila:n+3, leg, motivo:'Código de tipo no existe: '+tipo }); continue; }
    const venc = iVenc>=0 ? _hysParseFecha(r[iVenc]) : '';
    if(venc && venc <= fecha){ errores.push({ fila:n+3, leg, motivo:'Vencimiento anterior o igual a fecha realizada' }); continue; }
    validos.push({ leg, emp, data:{
      id: 'cap_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      leg, tipo, titulo: String(r[iTit]||'').trim(),
      fecha, vencimiento: venc || '',
      duracion_hs: parseFloat(r[iDur]) || null,
      dictada_por: String(r[iDict]||'').trim(),
      modalidad: String(r[iMod]||'presencial').trim().toLowerCase(),
      constancia: String(r[iCons]||'').trim(),
      observaciones: String(r[iObs]||'').trim(),
      creado: new Date().toISOString(),
      creado_por: (typeof currentUser!=='undefined' && currentUser?.emp?.nom) || 'Importación'
    }});
  }

  _hysMostrarPreview('caps', validos, errores, () => {
    const all = getHysCapacitaciones();
    for(const v of validos) all.push(v.data);
    setHysCapacitaciones(all);
  });
}

// ── PREVIEW MODAL ──
function _hysMostrarPreview(tipo, validos, errores, onConfirm){
  const prev = document.getElementById('modal-hys-imp-prev'); if(prev) prev.remove();
  const labelTipo = { talles:'talles', epp:'entregas EPP', caps:'capacitaciones' }[tipo];

  const renderPreviewItem = v => {
    if(tipo === 'talles'){
      const datos = Object.entries(v.t).filter(([k])=>k!=='observaciones').map(([k,val])=>`${k}: ${val}`).join(' · ');
      return `<div style="font-size:11px;color:var(--t2);font-family:var(--font-mono)">${datos||'(sin talles cargados)'}</div>`;
    }
    if(tipo === 'epp'){
      return `<div style="font-size:11px;color:var(--t2);font-family:var(--font-mono)">${v.data.fecha} · ${v.data.elemento} · talle ${v.data.talle||'—'} · cant ${v.data.cantidad}</div>`;
    }
    if(tipo === 'caps'){
      return `<div style="font-size:11px;color:var(--t2);font-family:var(--font-mono)">${v.data.fecha} · ${v.data.tipo} ${v.data.vencimiento?' · vence '+v.data.vencimiento:''}</div>`;
    }
  };

  const m = document.createElement('div');
  m.id = 'modal-hys-imp-prev';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML = `
    <div class="card" style="padding:0;max-width:780px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">Previsualización de importación</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">
          <span style="color:rgb(34,197,94)">✓ ${validos.length} ${labelTipo} válida${validos.length!==1?'s':''}</span>
          ${errores.length>0?` · <span style="color:rgb(239,68,68)">⚠ ${errores.length} error${errores.length!==1?'es':''}</span>`:''}
        </div>
      </div>

      <div style="padding:18px 22px">
        ${errores.length > 0 ? `
          <details style="margin-bottom:16px" ${errores.length<=5?'open':''}>
            <summary style="cursor:pointer;font-size:12px;color:rgb(239,68,68);font-weight:600;padding:6px 0">⚠ ${errores.length} error${errores.length!==1?'es':''} (no se importarán)</summary>
            <div style="margin-top:8px;max-height:200px;overflow-y:auto;background:rgba(239,68,68,.05);border-radius:var(--r);padding:10px">
              ${errores.slice(0,50).map(e => `
                <div style="padding:4px 0;border-bottom:1px solid var(--border);font-size:11px;font-family:var(--font-mono);color:var(--t2)">
                  Fila ${e.fila}${e.leg?' · leg '+e.leg:''}: <span style="color:rgb(239,68,68)">${e.motivo}</span>
                </div>
              `).join('')}
              ${errores.length>50?`<div style="padding:4px 0;font-size:11px;color:var(--t3)">...y ${errores.length-50} más</div>`:''}
            </div>
          </details>
        ` : ''}

        ${validos.length === 0 ? `
          <div style="padding:30px;text-align:center;color:var(--t3);font-size:13px">
            No hay registros válidos para importar.<br>
            <span style="font-size:11px">Revisá los errores y corregí la planilla.</span>
          </div>
        ` : `
          <details ${validos.length<=10?'open':''}>
            <summary style="cursor:pointer;font-size:12px;color:rgb(34,197,94);font-weight:600;padding:6px 0">✓ ${validos.length} registro${validos.length!==1?'s':''} a importar</summary>
            <div style="margin-top:8px;max-height:300px;overflow-y:auto;background:var(--bg2);border-radius:var(--r);padding:10px">
              ${validos.slice(0,100).map(v => `
                <div style="padding:6px 0;border-bottom:1px solid var(--border)">
                  <div style="font-size:12px;color:var(--t1)">${v.emp.nom||v.leg} <span style="color:var(--t3);font-size:10px;font-family:var(--font-mono)">· ${legD(v.leg)}</span></div>
                  ${renderPreviewItem(v)}
                </div>
              `).join('')}
              ${validos.length>100?`<div style="padding:6px 0;font-size:11px;color:var(--t3);text-align:center">...y ${validos.length-100} más</div>`:''}
            </div>
          </details>
        `}
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hys-imp-prev').remove()" style="font-size:13px;padding:8px 16px">Cancelar</button>
        ${validos.length > 0 ? `<button class="btn btn-primary" id="hys-imp-confirm" style="font-size:13px;padding:8px 18px">✓ Importar ${validos.length} registro${validos.length!==1?'s':''}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(m);
  const btn = document.getElementById('hys-imp-confirm');
  if(btn) btn.onclick = () => {
    onConfirm();
    document.getElementById('modal-hys-imp-prev').remove();
    const impModal = document.getElementById('modal-hys-imp');
    if(impModal) impModal.remove();
    renderHysPanel();
    toast(`✓ ${validos.length} ${labelTipo} importada${validos.length!==1?'s':''}`,'var(--green)',4000);
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN CONSOLIDADA
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// HIGIENE Y SEGURIDAD · MANUALES DE INDUCCIÓN Y CAPACITACIÓN
// Carga de archivos Word/PDF/otros · Almacenamiento en IndexedDB
// (localStorage no soporta archivos grandes — ~5MB total)
// ═══════════════════════════════════════════════════════════════

const HYS_MANUALES_DB = 'lsg_hys_manuales_db';
const HYS_MANUALES_STORE = 'manuales';
const HYS_MANUALES_META_KEY = 'lsg_hys_manuales_meta';
const HYS_MANUAL_MAX_SIZE = 25 * 1024 * 1024; // 25 MB por archivo

// Categorías de manuales
const HYS_MANUAL_CATEGORIAS = [
  { v:'induccion',     label:'🎓 Inducción inicial' },
  { v:'capacitacion',  label:'📚 Capacitación específica' },
  { v:'procedimiento', label:'📋 Procedimiento operativo' },
  { v:'protocolo',     label:'⚠ Protocolo de emergencia' },
  { v:'evaluacion',    label:'📝 Evaluación / examen' },
  { v:'normativa',     label:'⚖ Normativa / legal' },
  { v:'otro',          label:'📎 Otro' }
];

// ── Helpers IndexedDB ──
async function _hysOpenDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HYS_MANUALES_DB, 1);
    req.onupgradeneeded = ev => {
      const db = ev.target.result;
      if(!db.objectStoreNames.contains(HYS_MANUALES_STORE)){
        db.createObjectStore(HYS_MANUALES_STORE, { keyPath:'id' });
      }
    };
    req.onsuccess = ev => resolve(ev.target.result);
    req.onerror = ev => reject(ev.target.error);
  });
}

async function _hysGuardarManualBlob(id, blob){
  const db = await _hysOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HYS_MANUALES_STORE, 'readwrite');
    const store = tx.objectStore(HYS_MANUALES_STORE);
    store.put({ id, blob });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = ev => { db.close(); reject(ev.target.error); };
  });
}

async function _hysObtenerManualBlob(id){
  const db = await _hysOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HYS_MANUALES_STORE, 'readonly');
    const req = tx.objectStore(HYS_MANUALES_STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result?.blob || null); };
    req.onerror = ev => { db.close(); reject(ev.target.error); };
  });
}

async function _hysEliminarManualBlob(id){
  const db = await _hysOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HYS_MANUALES_STORE, 'readwrite');
    tx.objectStore(HYS_MANUALES_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = ev => { db.close(); reject(ev.target.error); };
  });
}

// ── Helpers metadata (localStorage) ──
function getHysManualesMeta(){ return _hysGet(HYS_MANUALES_META_KEY, []); }
function setHysManualesMeta(arr){ _hysSet(HYS_MANUALES_META_KEY, arr); }

function _hysFmtSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(2) + ' MB';
}

function _hysIconByMime(mime, fileName){
  const m = (mime||'').toLowerCase();
  const f = (fileName||'').toLowerCase();
  if(m.includes('word') || f.endsWith('.docx') || f.endsWith('.doc')) return '📄';
  if(m.includes('pdf') || f.endsWith('.pdf')) return '📕';
  if(m.includes('excel') || m.includes('spreadsheet') || f.endsWith('.xlsx') || f.endsWith('.xls')) return '📊';
  if(m.includes('image') || f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')) return '🖼';
  if(m.includes('video')) return '🎬';
  if(m.includes('audio')) return '🎧';
  if(f.endsWith('.zip') || f.endsWith('.rar') || f.endsWith('.7z')) return '📦';
  return '📎';
}

// ═══════════════════════════════════════════════════════════════
// MODAL PRINCIPAL DE MANUALES
// ═══════════════════════════════════════════════════════════════
let _hysManualesFiltroCat = '';

function hysAbrirManuales(){
  const prev = document.getElementById('modal-hys-manuales');
  if(prev) prev.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-hys-manuales';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:920px;width:100%;max-height:94vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg2);position:sticky;top:0;z-index:2">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📁 Biblioteca de Manuales</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Manuales de inducción, capacitación, protocolos y normativa</div>
        </div>
        <button onclick="document.getElementById('modal-hys-manuales').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div id="hys-manuales-body" style="padding:20px 22px"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', ev => { if(ev.target === modal) modal.remove(); });
  _hysRenderManualesBody();
}

function _hysRenderManualesBody(){
  const body = document.getElementById('hys-manuales-body');
  if(!body) return;
  const meta = getHysManualesMeta().slice().sort((a,b) => (b.subido||'').localeCompare(a.subido||''));
  let lista = meta;
  if(_hysManualesFiltroCat){ lista = lista.filter(m => m.categoria === _hysManualesFiltroCat); }

  // Stats por categoría
  const conteo = {};
  meta.forEach(m => { conteo[m.categoria] = (conteo[m.categoria]||0)+1; });
  const totalSize = meta.reduce((s, m) => s + (m.size||0), 0);

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:13px;color:var(--t1);font-weight:600">Archivos cargados: ${meta.length}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Espacio total: ${_hysFmtSize(totalSize)}</div>
      </div>
      <label class="btn btn-primary" style="font-size:12px;padding:7px 14px;cursor:pointer">
        ⬆ Subir manual
        <input type="file" accept=".doc,.docx,.pdf,.xlsx,.xls,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip,.rar" onchange="hysSubirManualArchivo(event)" style="display:none">
      </label>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      <button onclick="hysFiltrarManuales('')"
        style="background:${!_hysManualesFiltroCat?'var(--accent-glow)':'var(--bg2)'};border:1px solid ${!_hysManualesFiltroCat?'rgba(61,127,255,.4)':'var(--border)'};border-radius:14px;padding:5px 12px;cursor:pointer;font-size:11px;color:${!_hysManualesFiltroCat?'var(--accent2)':'var(--t2)'}">
        Todos (${meta.length})
      </button>
      ${HYS_MANUAL_CATEGORIAS.map(c => `
        <button onclick="hysFiltrarManuales('${c.v}')"
          style="background:${_hysManualesFiltroCat===c.v?'var(--accent-glow)':'var(--bg2)'};border:1px solid ${_hysManualesFiltroCat===c.v?'rgba(61,127,255,.4)':'var(--border)'};border-radius:14px;padding:5px 12px;cursor:pointer;font-size:11px;color:${_hysManualesFiltroCat===c.v?'var(--accent2)':'var(--t2)'}">
          ${c.label} (${conteo[c.v]||0})
        </button>
      `).join('')}
    </div>`;

  if(lista.length === 0){
    html += `
      <div class="card" style="padding:36px;text-align:center;color:var(--t3);font-size:13px">
        ${meta.length === 0 ? `
          <div style="font-size:30px;margin-bottom:8px">📁</div>
          <div style="font-size:14px;color:var(--t2);margin-bottom:6px">Aún no cargaste ningún manual</div>
          <div style="font-size:12px">Tocá <b>⬆ Subir manual</b> para cargar el primero. Formatos aceptados: Word, PDF, Excel, imágenes y otros.</div>
        ` : `
          <div style="font-size:14px;color:var(--t2);margin-bottom:6px">No hay manuales en esta categoría</div>
          <div style="font-size:12px">Probá filtrar por otra categoría o cargá uno nuevo.</div>
        `}
      </div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px">`;
    for(const m of lista){
      const cat = HYS_MANUAL_CATEGORIAS.find(c => c.v === m.categoria);
      const ico = _hysIconByMime(m.mime, m.fileName);
      const fmt = iso => { try { return new Date(iso).toLocaleString('es-AR'); } catch(e){ return iso; } };
      html += `
        <div class="card" style="padding:14px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center">
          <div style="font-size:36px;line-height:1">${ico}</div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:600;color:var(--t1)">${m.titulo||m.fileName}</span>
              ${cat?`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3)">${cat.label}</span>`:''}
              ${m.version?`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg2);color:var(--t3);border:1px solid var(--border)">v${m.version}</span>`:''}
            </div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);display:flex;flex-wrap:wrap;gap:14px">
              <span>📄 ${m.fileName}</span>
              <span>${_hysFmtSize(m.size)}</span>
              <span>📅 Subido ${fmt(m.subido)}</span>
              ${m.subido_por?`<span>👤 ${m.subido_por}</span>`:''}
            </div>
            ${m.descripcion?`<div style="font-size:11px;color:var(--t2);margin-top:6px;font-style:italic">${m.descripcion}</div>`:''}
            ${m.tags && m.tags.length ? `
              <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
                ${m.tags.map(t=>`<span style="font-size:10px;padding:1px 7px;border-radius:8px;background:var(--bg2);color:var(--t2);border:1px solid var(--border)">#${t}</span>`).join('')}
              </div>
            `:''}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:nowrap;flex-shrink:0">
            <button class="btn btn-ghost" onclick="hysDescargarManual('${m.id}')" style="font-size:11px;padding:5px 10px;color:rgb(34,197,94);border-color:rgba(34,197,94,.3)" title="Descargar">⬇</button>
            <button class="btn btn-ghost" onclick="hysEditarManualMeta('${m.id}')" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" title="Editar metadata">✎</button>
            <button class="btn btn-ghost" onclick="hysEliminarManual('${m.id}')" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar">✕</button>
          </div>
        </div>`;
    }
    html += `</div>`;
  }

  body.innerHTML = html;
}

function hysFiltrarManuales(cat){
  _hysManualesFiltroCat = cat;
  _hysRenderManualesBody();
}

// ═══════════════════════════════════════════════════════════════
// SUBIR ARCHIVO
// ═══════════════════════════════════════════════════════════════
function hysSubirManualArchivo(ev){
  const file = ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  if(file.size > HYS_MANUAL_MAX_SIZE){
    showAlert(`El archivo supera el tamaño máximo permitido (${_hysFmtSize(HYS_MANUAL_MAX_SIZE)}).\nArchivo: ${_hysFmtSize(file.size)}`, 'warning');
    return;
  }
  // Mostrar form de metadata antes de guardar
  _hysAbrirFormMetaManual({ archivo: file, isNew: true });
}

function _hysAbrirFormMetaManual({ archivo, meta, isNew }){
  const prev = document.getElementById('modal-hys-manual-form');
  if(prev) prev.remove();
  const m = meta || {};
  const sizeStr = archivo ? _hysFmtSize(archivo.size) : (m.size ? _hysFmtSize(m.size) : '—');
  const fileName = archivo ? archivo.name : (m.fileName || '');
  const mime = archivo ? archivo.type : (m.mime||'');
  const ico = _hysIconByMime(mime, fileName);

  const modal = document.createElement('div');
  modal.id = 'modal-hys-manual-form';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${isNew?'+ Subir manual':'✎ Editar metadata'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${ico} ${fileName} · ${sizeStr}</div>
        </div>
        <button onclick="document.getElementById('modal-hys-manual-form').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Título *</label>
          <input type="text" id="hm-titulo" value="${(m.titulo||'').replace(/"/g,'&quot;')}" placeholder="Ej: Manual de inducción 2026"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
        </div>
        <div style="display:grid;grid-template-columns:1fr 110px;gap:10px">
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Categoría *</label>
            <select id="hm-cat" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              ${HYS_MANUAL_CATEGORIAS.map(c => `<option value="${c.v}" ${m.categoria===c.v?'selected':''}>${c.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Versión</label>
            <input type="text" id="hm-version" value="${(m.version||'1.0').replace(/"/g,'&quot;')}" placeholder="1.0"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Descripción</label>
          <textarea id="hm-desc" rows="2" placeholder="Resumen del contenido, a quién va dirigido, etc."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(m.descripcion||'').replace(/</g,'&lt;')}</textarea>
        </div>
        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase">Tags / Tipos asociados</label>
          <input type="text" id="hm-tags" value="${(m.tags||[]).join(', ').replace(/"/g,'&quot;')}" placeholder="altura, EPP, autoelevador (separados por coma)"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          <div style="font-size:10px;color:var(--t3);margin-top:3px">Podés usar códigos del catálogo de capacitaciones (ej: ALTURA, EPP, INDUCCION) para vincular el manual a esos tipos</div>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-hys-manual-form').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" id="hm-btn-confirm" style="font-size:13px;padding:8px 18px">${isNew?'⬆ Subir':'💾 Guardar'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>{ const el=document.getElementById('hm-titulo'); if(el){ el.focus(); if(!m.titulo && fileName){ el.value = fileName.replace(/\.[^.]+$/,''); } } }, 50);

  document.getElementById('hm-btn-confirm').onclick = async () => {
    const titulo = (document.getElementById('hm-titulo').value||'').trim();
    if(!titulo){ showAlert('El título es obligatorio.', 'warning'); return; }
    const data = {
      titulo,
      categoria: document.getElementById('hm-cat').value,
      version:   (document.getElementById('hm-version').value||'').trim(),
      descripcion: (document.getElementById('hm-desc').value||'').trim(),
      tags: (document.getElementById('hm-tags').value||'').split(',').map(t=>t.trim().toUpperCase()).filter(Boolean)
    };

    try {
      const meta = getHysManualesMeta();
      if(isNew && archivo){
        const id = 'man_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
        await _hysGuardarManualBlob(id, archivo);
        meta.push({
          id,
          fileName: archivo.name,
          mime: archivo.type,
          size: archivo.size,
          subido: new Date().toISOString(),
          subido_por: (typeof currentUser !== 'undefined' && currentUser?.emp?.nom) || 'RR.HH.',
          ...data
        });
        setHysManualesMeta(meta);
        toast('✓ Manual subido correctamente','var(--green)');
      } else if(m.id){
        const i = meta.findIndex(x => x.id === m.id);
        if(i >= 0){ meta[i] = { ...meta[i], ...data, actualizado: new Date().toISOString() }; setHysManualesMeta(meta); }
        toast('✓ Metadata actualizada','var(--green)');
      }
      document.getElementById('modal-hys-manual-form').remove();
      _hysRenderManualesBody();
    } catch(err){
      console.error(err);
      showAlert('Error al guardar el manual: ' + err.message + '\n\nPosibles causas: espacio insuficiente o permisos del navegador.', "warning");
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// DESCARGAR / EDITAR / ELIMINAR
// ═══════════════════════════════════════════════════════════════
async function hysDescargarManual(id){
  try {
    const meta = getHysManualesMeta().find(m => m.id === id);
    if(!meta){ toast('⚠ Manual no encontrado','var(--red)'); return; }
    const blob = await _hysObtenerManualBlob(id);
    if(!blob){ toast('⚠ Archivo no disponible','var(--red)'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast('✓ Descarga iniciada','var(--green)');
  } catch(err){
    console.error(err);
    showAlert('Error al descargar: ' + err.message, "warning");
  }
}

function hysEditarManualMeta(id){
  const meta = getHysManualesMeta().find(m => m.id === id);
  if(!meta){ toast('⚠ Manual no encontrado','var(--red)'); return; }
  _hysAbrirFormMetaManual({ meta, isNew: false });
}

async function hysEliminarManual(id){
  const meta = getHysManualesMeta().find(m => m.id === id);
  if(!meta) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar el manual "${meta.titulo||meta.fileName}"?<br><br>Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  try {
    await _hysEliminarManualBlob(id);
    const all = getHysManualesMeta().filter(m => m.id !== id);
    setHysManualesMeta(all);
    _hysRenderManualesBody();
    toast('✓ Manual eliminado','var(--red)');
  } catch(err){
    console.error(err);
    showAlert('Error al eliminar: ' + err.message, "warning");
  }
}


function hysExportarConsolidado(){
  _hysCargarXLSX(()=>{
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const nomina = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
    const hoy = new Date().toISOString().slice(0,10);
    const fmt = iso => iso && iso.includes('-') ? iso.split('-').reverse().join('/') : (iso||'');

    // ── Hoja 1: Resumen por empleado ──
    const filasResumen = [['LEGAJO','NOMBRE','EMPRESA','CENTRO','TAREA','TALLES_CARGADOS','INDUCCION','TOTAL_CAPACIT','VENCIDAS','POR_VENCER','TOTAL_EPP','EPP_ULT_12M','OBLIGAT_CUMPLIDAS','OBLIGAT_FALTANTES']];
    const tipos = getHysCapacitacionesTipos();
    const obligs = tipos.filter(t => t.obligatorio);
    for(const e of nomina){
      const m = _hysMetricasEmp(e.leg);
      const caps = getHysCapacitacionesEmp(e.leg);
      const tieneTipo = {};
      caps.forEach(c => { if(c.tipo) tieneTipo[c.tipo.toUpperCase()] = true; });
      const cumple = obligs.filter(t => tieneTipo[t.codigo]).length;
      filasResumen.push([
        e.leg, e.nom, e.emp, e.lugar||'', e.tarea||'',
        m.tieneTalles?'SI':'NO',
        m.tieneInduccion?'SI':'NO',
        m.capsTotal, m.vencidas, m.porVencer,
        m.eppTotal, m.eppUlt12,
        cumple, obligs.length - cumple
      ]);
    }
    const wsR = XLSX.utils.aoa_to_sheet(filasResumen);
    wsR['!cols'] = [{wch:10},{wch:32},{wch:20},{wch:24},{wch:20},...Array(9).fill({wch:13})];
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

    // ── Hoja 2: Talles ──
    const filasTalles = [['LEGAJO','NOMBRE','EMPRESA','CALZADO','PANTALON','BUZO','REMERA','CAMPERA','CAMISA','CASCO','GUANTES','OBSERVACIONES','ULTIMA_ACTUALIZACION']];
    const todosTalles = getHysTalles();
    for(const e of nomina){
      const t = todosTalles[e.leg];
      if(!t) continue;
      filasTalles.push([
        e.leg, e.nom, e.emp,
        t.calzado||'', t.pantalon||'', t.buzo||'', t.remera||'',
        t.campera||'', t.camisa||'', t.casco||'', t.guantes||'',
        t.observaciones||'',
        t.actualizado ? new Date(t.actualizado).toLocaleString('es-AR') : ''
      ]);
    }
    const wsT = XLSX.utils.aoa_to_sheet(filasTalles);
    wsT['!cols'] = [{wch:10},{wch:32},{wch:20},...Array(9).fill({wch:12}),{wch:30},{wch:20}];
    XLSX.utils.book_append_sheet(wb, wsT, 'Talles');

    // ── Hoja 3: EPP entregados ──
    const filasEpp = [['LEGAJO','NOMBRE','EMPRESA','FECHA','CODIGO','ELEMENTO','CATEGORIA','TALLE','CANTIDAD','MOTIVO','FIRMADO','OBSERVACIONES']];
    const catalogo = getHysEppCatalogo();
    const todasEntregas = getHysEppEntregas();
    const empMap = {};
    for(const e of nomina) empMap[e.leg] = e;
    for(const x of todasEntregas){
      const e = empMap[x.leg];
      if(!e) continue;
      const elem = catalogo.find(c => c.codigo === x.elemento);
      filasEpp.push([
        x.leg, e.nom, e.emp, fmt(x.fecha),
        x.elemento, elem?.nombre||'(sin catálogo)', elem?.categoria||'',
        x.talle||'', x.cantidad||1, x.motivo||'', x.recibido_ok?'SI':'NO', x.observaciones||''
      ]);
    }
    const wsE = XLSX.utils.aoa_to_sheet(filasEpp);
    wsE['!cols'] = [{wch:10},{wch:32},{wch:20},{wch:12},{wch:14},{wch:30},{wch:14},{wch:10},{wch:8},{wch:14},{wch:10},{wch:30}];
    XLSX.utils.book_append_sheet(wb, wsE, 'EPP entregados');

    // ── Hoja 4: Capacitaciones ──
    const filasCap = [['LEGAJO','NOMBRE','EMPRESA','FECHA','CODIGO_TIPO','NOMBRE_TIPO','OBLIGATORIO_LRT','TITULO','VENCIMIENTO','ESTADO_VENC','DURACION_HS','DICTANTE','MODALIDAD','CONSTANCIA','OBSERVACIONES']];
    const todasCaps = getHysCapacitaciones();
    for(const c of todasCaps){
      const e = empMap[c.leg];
      if(!e) continue;
      const t = tipos.find(x => x.codigo === (c.tipo||'').toUpperCase());
      let estado = '';
      if(c.vencimiento){
        if(c.vencimiento < hoy) estado = 'VENCIDA';
        else { const en30 = new Date(); en30.setDate(en30.getDate()+30); estado = (new Date(c.vencimiento) <= en30) ? 'POR_VENCER' : 'VIGENTE'; }
      } else estado = 'SIN_VENC';
      filasCap.push([
        c.leg, e.nom, e.emp, fmt(c.fecha),
        c.tipo||'', t?.nombre||'', t?.obligatorio?'SI':'NO',
        c.titulo||'', fmt(c.vencimiento), estado,
        c.duracion_hs||'', c.dictada_por||'', c.modalidad||'',
        c.constancia||'', c.observaciones||''
      ]);
    }
    const wsC = XLSX.utils.aoa_to_sheet(filasCap);
    wsC['!cols'] = [{wch:10},{wch:32},{wch:20},{wch:12},{wch:14},{wch:32},{wch:12},{wch:30},{wch:12},{wch:14},{wch:10},{wch:24},{wch:14},{wch:14},{wch:30}];
    XLSX.utils.book_append_sheet(wb, wsC, 'Capacitaciones');

    // ── Hoja 5: Cumplimiento por empresa ──
    const filasCump = [['EMPRESA','TOTAL','CON_TALLES','PCT_TALLES','CON_INDUCCION','PCT_INDUCCION','CAPACIT_VENCIDAS','CAPACIT_POR_VENCER']];
    const empresas = [...new Set(nomina.map(e => e.emp).filter(Boolean))].sort();
    for(const empNom of empresas){
      const empleadosEmp = nomina.filter(x => x.emp === empNom);
      let conTalles=0, conInduc=0, vencidas=0, porVencer=0;
      for(const x of empleadosEmp){
        const m = _hysMetricasEmp(x.leg);
        if(m.tieneTalles) conTalles++;
        if(m.tieneInduccion) conInduc++;
        if(m.vencidas>0) vencidas++;
        if(m.porVencer>0) porVencer++;
      }
      const tot = empleadosEmp.length;
      filasCump.push([empNom, tot, conTalles, tot?Math.round(conTalles/tot*100)+'%':'0%', conInduc, tot?Math.round(conInduc/tot*100)+'%':'0%', vencidas, porVencer]);
    }
    const wsCump = XLSX.utils.aoa_to_sheet(filasCump);
    wsCump['!cols'] = [{wch:24},...Array(7).fill({wch:14})];
    XLSX.utils.book_append_sheet(wb, wsCump, 'Cumplim. x empresa');

    XLSX.writeFile(wb, `HyS_consolidado_${hoy}.xlsx`);
    toast('✓ Reporte consolidado descargado','var(--green)');
  });
}




