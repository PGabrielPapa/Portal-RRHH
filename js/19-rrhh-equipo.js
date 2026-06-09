// ─── LICENCIAS GERENTE ───
function gerTab(tab){
  ['adelantos','licencias','anual','especiales','equipo','evaluaciones','sanciones'].forEach(t=>{
    const p = document.getElementById('ger-pane-'+t);
    const b = document.getElementById('ger-tab-'+t);
    if(p) p.style.display = t===tab ? 'block' : 'none';
    if(b){
      b.style.borderBottomColor = t===tab ? 'var(--accent)' : 'transparent';
      b.style.color = t===tab ? 'var(--accent2)' : 'var(--t3)';
      b.style.fontWeight = t===tab ? '600' : '400';
    }
  });
  if(tab === 'licencias')    renderLicenciasGerente();
  if(tab === 'anual')        renderLicAnualGerente();
  if(tab === 'especiales')   renderLicEspecialGerente();
  if(tab === 'equipo')       renderMiEquipo();
  if(tab === 'evaluaciones') renderEvaluaciones();
  if(tab === 'sanciones')    renderSancionesPanelGerente();
}

function renderMiEquipo(){
  const div = document.getElementById('ger-equipo-lista');
  const titulo = document.getElementById('ger-equipo-titulo');
  if(!div || !currentUser) return;

  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
  const q = (document.getElementById('ger-equipo-search')?.value||'').toLowerCase();

  // Obtener empleados a cargo
  const equipo = getNomina().filter(e => {
    if(e._deBaja || e.egreso) return false;
    const v = getValidador(e);
    if(!v || !v.validador) return false;
    if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
    return v.validador.toUpperCase() === gerNom;
  });

  if(titulo){
    const area = getValidador(currentUser.emp)?.area || 'mi área';
    titulo.textContent = `${equipo.length} empleado${equipo.length!==1?'s':''} a cargo — ${area}`;
  }

  let lista = equipo.sort((a,b)=>a.nom.localeCompare(b.nom));
  if(q) lista = lista.filter(e =>
    e.nom.toLowerCase().includes(q) ||
    (e.leg||'').includes(q) ||
    (e.cat||'').toLowerCase().includes(q) ||
    (e.lugar||'').toLowerCase().includes(q)
  );

  if(!lista.length){
    div.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">No se encontraron empleados${q?' con ese criterio':''}</div></div>`;
    return;
  }

  const catColor = cat => {
    if(!cat) return 'var(--t3)';
    if(['GER'].includes(cat)) return 'var(--accent2)';
    if(['JEF','COO'].includes(cat)) return 'var(--green)';
    return 'var(--t3)';
  };

  const fmtFecha = iso => {
    if(!iso) return '—';
    if(iso.includes('-')){ const[y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
    return iso;
  };

  const calcAntig = ing => {
    if(!ing) return '';
    let partes;
    if(ing.includes('/')) partes = ing.split('/').reverse();
    else partes = ing.split('-');
    const ingDate = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10)-1, parseInt(partes[2]||1, 10));
    const años = Math.floor((new Date()-ingDate)/(1000*60*60*24*365.25));
    return `${años} año${años!==1?'s':''}`;
  };

  div.innerHTML = `<div class="card" style="padding:0;overflow:hidden">` +
    lista.map(e => {
      const initials = e.nom.split(',')[0].trim().substring(0,2).toUpperCase();
      const dom = DOMICILIOS[e.leg] || {};
      const cumple = CUMPLE_DATA.find(c=>c.leg===e.leg);
      return `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
        <!-- Avatar -->
        <div style="width:42px;height:42px;border-radius:50%;background:var(--accent-glow);border:1px solid rgba(61,127,255,.25);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--accent2);flex-shrink:0;font-family:var(--font-mono)">
          ${initials}
        </div>
        <!-- Datos principales -->
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${e.nom}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">Leg. ${e.leg}</span>
            ${e.cuil?`<span style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">CUIL: ${e.cuil}</span>`:''}
            ${e.cat?`<span style="font-size:10px;font-family:var(--font-mono);padding:1px 7px;border-radius:8px;background:var(--bg2);color:${catColor(e.cat)};border:1px solid ${catColor(e.cat)}33">${e.cat} ${e.tramo||''}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--t2)">
            🏢 ${e.emp} &nbsp;·&nbsp; 📍 ${e.lugar||'—'}
          </div>
        </div>
        <!-- Columna ingreso / antigüedad -->
        <div style="text-align:right;flex-shrink:0;min-width:110px">
          <div style="font-size:11px;color:var(--t2);margin-bottom:2px">Ingreso: <strong>${fmtFecha(e.ing)}</strong></div>
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3)">${calcAntig(e.ing)}</div>
          ${cumple?`<div style="font-size:10px;color:var(--t3);margin-top:2px">🎂 ${cumple.fecha.substring(0,5)}</div>`:''}
        </div>
        <!-- Mail -->
        <div style="flex-shrink:0;min-width:180px;max-width:200px;overflow:hidden">
          ${(e.mail||dom.mail)?`<a href="mailto:${e.mail||dom.mail}" style="font-size:10px;color:var(--accent2);text-decoration:none;font-family:var(--font-mono);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✉ ${e.mail||dom.mail}</a>`:'<span style="font-size:10px;color:var(--t3)">Sin mail</span>'}
        </div>
        <!-- Botón ver licencias -->
        <button class="btn btn-ghost" style="font-size:10px;padding:4px 10px;color:rgb(34,197,94);border-color:rgba(34,197,94,.3);white-space:nowrap" onclick="abrirModalLicenciasEmpleado('${e.leg}', ${JSON.stringify(e.nom).replace(/"/g,'&quot;')})">🏖 Licencias</button>
      </div>`;
    }).join('') + `</div>`;
}

// ═══════════════════════════════════════════════════════════════
// ORGANIGRAMA GENERAL — Visualización jerárquica
// ═══════════════════════════════════════════════════════════════

function construirOrganigrama(filtroEmpresa){
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso &&
    (!filtroEmpresa || e.emp === filtroEmpresa));

  // Mapa nombre (upper) → empleado
  const empPorNombre = {};
  for(const e of nomina) empPorNombre[e.nom.toUpperCase().trim()] = e;

  // Nodos: cada validador único es un nodo (incluso los que no son empleados)
  const nodos = {};
  const getNodo = (nombre, area) => {
    if(!nodos[nombre]) nodos[nombre] = {
      nombre, area: area || '',
      empleado: empPorNombre[nombre] || null,
      directos: [],       // empleados que reportan directamente (sin ser managers ellos mismos)
      subManagers: {},    // key=nombreSubManager → nodo
      totalRecursivo: 0
    };
    return nodos[nombre];
  };

  // Pasada 1: cada empleado cae bajo su validador
  for(const emp of nomina){
    const v = getValidador(emp);
    if(!v || !v.validador) continue;
    const nodo = getNodo(v.validador, v.area);
    nodo.directos.push({ emp, area: v.area });
  }

  // Pasada 2: conectar jerarquía — cada nodo que sea empleado tiene su propio validador
  const tieneSuperior = new Set();
  for(const nombre of Object.keys(nodos)){
    const emp = empPorNombre[nombre];
    if(!emp) continue; // nodos virtuales como "RR.HH." no tienen superior
    const v = getValidador(emp);
    if(!v || !v.validador || v.validador === nombre) continue;
    const superior = nodos[v.validador];
    if(superior){
      superior.subManagers[nombre] = nodos[nombre];
      tieneSuperior.add(nombre);
    }
  }

  // Quitar de "directos" los que también son subManagers (evitar duplicados)
  for(const nodo of Object.values(nodos)){
    const subSet = new Set(Object.keys(nodo.subManagers));
    nodo.directos = nodo.directos.filter(d => !subSet.has(d.emp.nom.toUpperCase().trim()));
  }

  // Calcular total recursivo (cuántas personas cuelgan del nodo en total)
  const totalRecur = (nodo, visitados) => {
    if(visitados.has(nodo.nombre)) return 0; // evitar ciclos
    visitados.add(nodo.nombre);
    let total = nodo.directos.length;
    for(const sub of Object.values(nodo.subManagers)){
      total += 1 + totalRecur(sub, visitados); // +1 = el propio subManager
    }
    return total;
  };
  for(const nodo of Object.values(nodos)){
    nodo.totalRecursivo = totalRecur(nodo, new Set());
  }

  // Raíces: nodos que no tienen superior registrado
  const raices = Object.keys(nodos)
    .filter(n => !tieneSuperior.has(n))
    .map(n => nodos[n])
    .sort((a,b) => b.totalRecursivo - a.totalRecursivo);

  return { nodos, raices, totalEmpleados: nomina.length };
}

let _orgExpandido = new Set(); // claves de nodos expandidos
let _orgUsuarioYaAutoExpandido = false; // flag para auto-expandir solo la primera vez

function renderOrganigrama(){
  const cont = document.getElementById('organigrama-container');
  if(!cont) return;
  const filtroEmp = document.getElementById('org-empresa')?.value || '';
  const q = (document.getElementById('org-search')?.value || '').toLowerCase().trim();
  const { nodos, raices, totalEmpleados } = construirOrganigrama(filtroEmp);

  // ── AUTO-EXPANSIÓN DEL NODO DEL USUARIO LOGUEADO ────────────────────
  // La primera vez que el usuario abre el organigrama, expandimos
  // automáticamente su propio nodo y todo su subárbol descendente, así
  // ve a su gente sin tener que ir clickeando cada nivel.
  // Esto reemplaza la experiencia "vacía" que tenía Papa (y cualquier
  // gerente con varios niveles debajo) al entrar al organigrama.
  if(!_orgUsuarioYaAutoExpandido && currentUser?.emp?.nom){
    const miNombre = currentUser.emp.nom.toUpperCase().trim();
    if(nodos[miNombre]){
      _orgExpandido.add(miNombre);
      // Expandir recursivamente todo el subárbol que cuelga de mí
      const expandirSubArbol = (nodo, profundidad) => {
        if(profundidad > 10) return; // safety
        for(const subKey of Object.keys(nodo.subManagers)){
          _orgExpandido.add(subKey);
          expandirSubArbol(nodo.subManagers[subKey], profundidad + 1);
        }
      };
      expandirSubArbol(nodos[miNombre], 0);
      _orgUsuarioYaAutoExpandido = true;
    }
  }

  // Filtro por búsqueda: expandir nodos que contengan match (en nombre, área, o empleados)
  let resaltados = null;
  if(q){
    resaltados = new Set();
    for(const [key, nodo] of Object.entries(nodos)){
      const hitNodo = key.toLowerCase().includes(q) || (nodo.area||'').toLowerCase().includes(q);
      const hitEmp  = nodo.directos.some(d =>
        d.emp.nom.toLowerCase().includes(q) ||
        (d.emp.leg||'').includes(q) ||
        (d.emp.lugar||'').toLowerCase().includes(q)
      );
      if(hitNodo || hitEmp) resaltados.add(key);
    }
    // Propagar expansión hacia arriba: cualquier ancestro de un resaltado se expande
    const agregarAscendientes = (key) => {
      for(const [k, n] of Object.entries(nodos)){
        if(Object.keys(n.subManagers).includes(key)){
          if(!_orgExpandido.has(k)){ _orgExpandido.add(k); agregarAscendientes(k); }
        }
      }
    };
    for(const k of resaltados){ _orgExpandido.add(k); agregarAscendientes(k); }
  }

  // Render del contador
  const totalNodos = Object.keys(nodos).length;
  const cnt = document.getElementById('org-counts');
  if(cnt) cnt.textContent = `${totalEmpleados} empleado${totalEmpleados!==1?'s':''} · ${totalNodos} áreas`;

  if(!raices.length){
    cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font-size:12px">Sin datos de organigrama para los filtros aplicados</div>';
    return;
  }

  cont.innerHTML = raices.map(r => renderNodoOrg(r, 0, q, resaltados)).join('');
}

function renderNodoOrg(nodo, nivel, q, resaltados){
  const expandido = _orgExpandido.has(nodo.nombre);
  const tieneHijos = nodo.directos.length > 0 || Object.keys(nodo.subManagers).length > 0;
  const color = nivel === 0 ? 'var(--accent2)' : nivel === 1 ? 'rgb(168,85,247)' : 'var(--green)';
  const bg    = nivel === 0 ? 'rgba(61,127,255,.06)' : nivel === 1 ? 'rgba(168,85,247,.05)' : 'rgba(34,197,94,.04)';
  const border= nivel === 0 ? 'rgba(61,127,255,.3)'  : nivel === 1 ? 'rgba(168,85,247,.3)'   : 'rgba(34,197,94,.25)';
  const hitClass = resaltados && resaltados.has(nodo.nombre) ? 'border-width:2px;box-shadow:0 0 0 2px rgba(234,179,8,.25)' : '';

  const iniciales = (nodo.empleado?.nom || nodo.nombre).split(',')[0].trim().substring(0,2).toUpperCase();
  const empData   = nodo.empleado;
  const empInfo   = empData
    ? `<span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:8px">Leg. ${empData.leg} · ${empData.emp} ${empData.cat?`· ${empData.cat} ${empData.tramo||''}`:''}</span>`
    : `<span style="font-size:10px;color:var(--t3);font-style:italic;margin-left:8px">(Área / rol)</span>`;

  const areaLabel = nodo.area ? `<span style="font-size:11px;color:${color};font-family:var(--font-mono);margin-top:2px">${nodo.area}</span>` : '';

  // Directos: empleados que reportan directamente sin ser managers
  const directosHTML = expandido && nodo.directos.length ? `
    <div style="padding:10px 14px 6px 14px;border-top:1px solid var(--border);background:var(--bg1)">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Directos (${nodo.directos.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${nodo.directos.sort((a,b)=>a.emp.nom.localeCompare(b.emp.nom)).map(d => {
          const hit = resaltados && (d.emp.nom.toLowerCase().includes(q||'') || (d.emp.leg||'').includes(q||''));
          return `<div style="padding:5px 10px;background:var(--bg2);border:1px solid ${hit?'rgba(234,179,8,.5)':'var(--border)'};border-radius:4px;font-size:11px;color:var(--t2);line-height:1.4" title="${d.emp.emp} · ${d.emp.lugar||''}">
            <strong style="color:var(--t1)">${d.emp.nom.split(',')[0]}</strong>, ${d.emp.nom.split(',')[1]?.trim()||''}
            <span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">· Leg. ${d.emp.leg}</span>
            ${d.emp.cat?`<span style="color:var(--t3);font-family:var(--font-mono);font-size:10px;margin-left:4px">${d.emp.cat}${d.emp.tramo||''}</span>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  const subsHTML = expandido && Object.keys(nodo.subManagers).length ? `
    <div style="padding:10px 10px 4px 30px">
      ${Object.values(nodo.subManagers).sort((a,b)=>b.totalRecursivo - a.totalRecursivo).map(sub => renderNodoOrg(sub, nivel+1, q, resaltados)).join('')}
    </div>` : '';

  const toggleFn = tieneHijos ? `onclick="orgToggleNodo(this, '${nodo.nombre.replace(/'/g,'\\\'')}')"` : '';
  const toggleIcon = tieneHijos ? (expandido ? '▼' : '▶') : ' ';

  return `
    <div style="margin-bottom:8px;border:1px solid ${border};border-radius:var(--r);background:${bg};overflow:hidden;${hitClass}">
      <div style="padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:${tieneHijos?'pointer':'default'}" ${toggleFn}>
        <span style="font-family:var(--font-mono);font-size:11px;color:${color};width:14px;display:inline-block">${toggleIcon}</span>
        <div style="width:36px;height:36px;border-radius:50%;background:${bg};border:1px solid ${border};display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:12px;font-weight:700;color:${color};flex-shrink:0">
          ${iniciales}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--t1);display:flex;align-items:center;flex-wrap:wrap">
            ${nodo.nombre}
            ${empInfo}
          </div>
          ${areaLabel}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:${color};font-family:var(--font-mono);font-weight:600">${nodo.totalRecursivo} persona${nodo.totalRecursivo!==1?'s':''}</div>
          <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono)">
            ${nodo.directos.length} directo${nodo.directos.length!==1?'s':''}${Object.keys(nodo.subManagers).length?` · ${Object.keys(nodo.subManagers).length} sub-área${Object.keys(nodo.subManagers).length!==1?'s':''}`:''}
          </div>
        </div>
      </div>
      ${directosHTML}
      ${subsHTML}
    </div>`;
}

function orgToggleNodo(el, nombre){
  if(_orgExpandido.has(nombre)) _orgExpandido.delete(nombre);
  else _orgExpandido.add(nombre);
  renderOrganigrama();
}

function orgExpandirTodo(expandir){
  if(expandir){
    const { nodos } = construirOrganigrama(document.getElementById('org-empresa')?.value || '');
    _orgExpandido = new Set(Object.keys(nodos));
  } else {
    _orgExpandido = new Set();
  }
  renderOrganigrama();
}

// Modal reusable para ver licencias de un empleado
function abrirModalLicenciasEmpleado(leg, nom){
  const overlay = document.createElement('div');
  overlay.id = 'lic-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:24px;max-width:960px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--t1)">🏖 Historial de licencias</div>
          <div style="font-size:12px;color:var(--t2);margin-top:3px">${nom} · Leg. ${leg}</div>
        </div>
        <button onclick="document.getElementById('lic-modal').remove()" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>
      <div id="lic-modal-content"></div>
    </div>`;
  document.body.appendChild(overlay);

  renderHistorialLicenciasUI('lic-modal-content', leg, { anio: new Date().getFullYear() });
}
async function renderLicenciasGerente(){
  const div = document.getElementById('list-lic-gerente');
  if(!div || !currentUser) return;

  const q            = (document.getElementById('ger-lic-search')?.value||'').toLowerCase();
  const filtroTipo   = document.getElementById('ger-lic-filtro-tipo')?.value||'';
  const filtroEstado = document.getElementById('ger-lic-filtro-estado')?.value||'';

  const gerNom  = currentUser.emp.nom.toUpperCase().trim();
  const esPapa  = gerNom.includes('PAPA, PABLO GABRIEL');

  // Empleados a cargo: usar getNomina() para incluir altas manuales
  const empleadosACargo = new Set(
    getNomina().filter(e => {
      const v = getValidador(e);
      if(!v || !v.validador) return false;
      if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
      return v.validador.toUpperCase() === gerNom;
    }).map(e => e.leg)
  );

  const todas        = await getLicencias();
  const todosInformes = await getInformesLicencias();

  // Comprobantes del área
  let comprobantes = todas
    .filter(l => empleadosACargo.has(l.leg))
    .map(l => ({...l, _origen:'comprobante'}));

  // Informes del área
  let informes = todosInformes
    .filter(l => empleadosACargo.has(l.leg))
    .map(l => ({
      ...l, legajo:l.leg, fecha_desde:l.desde, fecha_hasta:l.hasta,
      dias_corridos:l.dias, _origen:'informe'
    }));

  // Aplicar filtros
  if(q){
    comprobantes = comprobantes.filter(l=>(l.nom||'').toLowerCase().includes(q));
    informes     = informes.filter(l=>(l.nom||'').toLowerCase().includes(q));
  }
  if(filtroTipo){
    comprobantes = comprobantes.filter(l=>l.tipo===filtroTipo);
    informes     = informes.filter(l=>l.tipo===filtroTipo);
  }
  // Filtro estado: 'informado' aplica solo a informes; otros estados a comprobantes
  if(filtroEstado){
    if(filtroEstado==='informado'){
      comprobantes = [];
    } else {
      comprobantes = comprobantes.filter(l=>l.estado===filtroEstado);
      informes     = []; // informes siempre son 'informado'
    }
  }

  const lista = [...comprobantes, ...informes].sort((a,b)=>(b.id||0)-(a.id||0));

  // Badge en home
  const badge = document.getElementById('home-lic-gerente-badge');
  const totalNuevos = todas.filter(l=>empleadosACargo.has(l.leg)&&l.estado==='pendiente').length
    + todosInformes.filter(l=>empleadosACargo.has(l.leg)).length;
  if(badge){ badge.style.display=totalNuevos?'inline-block':'none'; badge.textContent=`${totalNuevos} nuevo${totalNuevos!==1?'s':''}`; }

  if(!lista.length){
    div.innerHTML='<div style="padding:20px 18px;color:var(--t3);font-size:13px;text-align:center">No hay licencias para tu área' + (q||filtroTipo||filtroEstado?' con los filtros aplicados.':'.') + '</div>';
    return;
  }

  const fmtD = iso => { if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };

  div.innerHTML = lista.map(l => `
    <div data-lic-leg="${l.leg||''}" data-lic-desde="${l.fecha_desde||l.desde||''}" data-lic-hasta="${l.fecha_hasta||l.hasta||''}" data-lic-tipo="${l.tipo||''}" data-lic-estado="${l.estado||'informado'}" style="padding:14px 18px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600;color:var(--t1)">${l.nom||'—'}</span>
            <span style="font-size:10px;font-family:var(--font-mono);background:var(--accent-glow);color:var(--accent2);padding:1px 7px;border-radius:8px">${l.tipo}</span>
            <span style="font-size:10px;font-family:var(--font-mono);padding:1px 7px;border-radius:8px;background:${l._origen==='informe'?'rgba(234,179,8,.1)':'rgba(61,200,160,.08)'};color:${l._origen==='informe'?'var(--yellow)':'var(--green)'}">
              ${l._origen==='informe'?'📝 Informada':'📎 Comprobante'}
            </span>
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-bottom:6px">
            ${l.emp||''} · ${l.lugar||''} · ${l.presentadoEl||new Date(l.presentado_at||Date.now()).toLocaleDateString('es-AR')} ${l.presentadoHora||''}
          </div>
          <div style="font-size:12px;color:var(--t2)">
            📅 ${fmtD(l.fecha_desde||l.desde)} → ${fmtD(l.fecha_hasta||l.hasta)} ·
            <strong>${l.dias_corridos||l.dias} día${(l.dias_corridos||l.dias)!==1?'s':''}</strong>
            ${l.obs?`<span style="color:var(--t3)"> · ${l.obs}</span>`:''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;border:1px solid ${l.estado==='aprobada'?'rgba(34,197,94,.3)':l.estado==='rechazada'?'rgba(239,68,68,.3)':'rgba(234,179,8,.3)'};color:${l.estado==='aprobada'?'var(--green)':l.estado==='rechazada'?'var(--red)':'var(--yellow)'}">
            ${l.estado||'informado'}
          </span>
          ${(l.filepath||l.archivo)?`<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="descargarComprobanteGerente(${l.id})">↓ Comprobante</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

async function descargarComprobanteGerente(id){
  const todas = await getLicencias();
  const l = todas.find(x=>x.id===id);
  if(!l){ toast('⚠ Comprobante no encontrado','var(--yellow)'); return; }
  // Si tiene archivo en base64 (almacenamiento local)
  if(l.archivo){
    const a = document.createElement('a');
    a.href = l.archivo;
    a.download = `licencia_${l.leg||l.legajo}_${l.tipo?.replace(/\s/g,'_')}_${l.fecha_desde||l.desde}.${(l.fileName||'pdf').split('.').pop()}`;
    a.click();
    toast('✓ Comprobante descargado','var(--green)');
  }
}

