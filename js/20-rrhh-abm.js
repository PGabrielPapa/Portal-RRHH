// ─── ABM EMPLEADOS ───────────────────────────────────────────

function getAbmOverrides(){ try{return JSON.parse(localStorage.getItem('lsg_abm_overrides')||'{}');}catch{return{};} }
function saveAbmOverrides(o){ localStorage.setItem('lsg_abm_overrides',JSON.stringify(o)); }
function getAbmBajas(){ try{return JSON.parse(localStorage.getItem('lsg_abm_bajas')||'{}');}catch{return{};} }
function saveAbmBajas(b){ localStorage.setItem('lsg_abm_bajas',JSON.stringify(b)); }
function getAbmAltas(){ try{return JSON.parse(localStorage.getItem('lsg_abm_altas')||'[]');}catch{return[];} }
function saveAbmAltas(a){ localStorage.setItem('lsg_abm_altas',JSON.stringify(a)); }

// ─── IDENTIDAD EMPRESA+LEGAJO ───────────────────────────────────────────
// El legajo NO es único global: puede repetirse entre empresas. La identidad
// interna del empleado es el "uid" compuesto = slug(empresa)-legajo. Se guarda
// en e.leg (para que todas las búsquedas y claves de storage que ya usan .leg
// queden únicas), y el número de legajo "a mostrar" queda en e.legNum.
function empSlug(emp){ return String(emp||'').toUpperCase().replace(/[^A-Z0-9]/g,'') || 'SINEMP'; }
function makeUid(emp, legNum){ return empSlug(emp) + '-' + String(legNum==null?'':legNum).trim(); }
// Compatibilidad: si un valor ya viene compuesto (tiene guion y prefijo de
// slug) se devuelve igual; si es un legajo "pelado" se intenta resolver con la
// empresa provista.
function asUid(value, emp){
  const v = String(value==null?'':value).trim();
  if(v.includes('-') && /^[A-Z0-9]+-/.test(v)) return v;   // ya es uid
  return emp!=null ? makeUid(emp, v) : v;
}

function getNomina(){
  const ov=getAbmOverrides(), bj=getAbmBajas(), al=getAbmAltas();
  // EMPLEADOS DEL SEED (DB): conservan su legajo "pelado" como e.leg, IGUAL que
  // siempre (sus legajos del seed son únicos globalmente). NO se migran sus
  // datos: recibos, domicilios, etc. siguen keyed por el legajo original.
  const base = DB.map(e=>({ ...e, legNum:e.leg, ...(ov[e.leg]||{}), egreso:bj[e.leg]?.fecha||null, _deBaja:!!bj[e.leg] }));
  // ALTAS (importadas / manuales): identidad compuesta empresa+legajo (uid) en
  // e.leg, para permitir legajos repetidos entre empresas sin colisión. El
  // número de legajo visible queda en e.legNum.
  const altas = al.map(e=>{
    const legNum = (e.legNum!=null ? e.legNum : e.leg);
    const uid    = asUid(e.leg, e.emp) || makeUid(e.emp, legNum);
    return { ...e, legNum, leg:uid, ...(ov[uid]||{}), _esAlta:true, _deBaja:!!bj[uid], egreso:bj[uid]?.fecha||null };
  });
  const todos = [...base, ...altas];
  // Default: empleados sin código de sindicato cargado → "FC" (Fuera de Convenio)
  // FC NO calcula presentismo ni antigüedad en la liquidación.
  for(const e of todos){
    if(!e.cod_sindicato || String(e.cod_sindicato).trim() === ''){
      e.cod_sindicato = 'FC';
      e._sindicatoFC = true; // marca interna para reportes
    }
  }
  return todos;
}

// ── Helpers canónicos: siempre devuelven la versión ACTUAL del empleado
// (con los cambios del ABM aplicados). Usar estos en vez de DB.find/filter.
function empByUid(uid){  return getNomina().find(e => e.leg === uid || makeUid(e.emp, e.legNum) === uid) || null; }
// empByLeg: acepta uid compuesto o, por compatibilidad, número de legajo pelado
// (en cuyo caso devuelve la PRIMera coincidencia — ambiguo si se repite entre
// empresas; preferir empByUid cuando se conoce la empresa).
function empByLeg(leg){  const n=getNomina(); return n.find(e => e.leg === leg) || n.find(e => e.legNum === leg) || null; }
function empByCuil(cuil){ return getNomina().find(e => e.cuil === cuil) || null; }
function empByDni(dni){  return getNomina().find(e => e.dni === dni) || null; }

function abmTab(tab){
  ['lista','nuevo','editar'].forEach(t=>{
    const p=document.getElementById('abm-pane-'+t);
    const b=document.getElementById('abm-tab-'+t);
    if(p) p.style.display = t===tab?'block':'none';
    if(b){
      b.style.borderBottomColor = t===tab?'var(--accent)':'transparent';
      b.style.color = t===tab?'var(--accent2)':'var(--t3)';
      b.style.fontWeight = t===tab?'600':'400';
    }
  });
  if(tab==='lista') renderAbmLista();
  if(tab==='nuevo'){
    poblarSelectoresValidador();
    poblarSelectoresSindicato();
    // Mostrar el próximo legajo disponible en el preview
    const legPreview = document.getElementById('abm-n-leg-preview');
    if(legPreview) legPreview.value = getProximoLegajo();
  }
}

// Puebla los selects de sindicato en los forms de ABM (alta y edición)
function poblarSelectoresSindicato(valorActual){
  const sindicatos = getSindicatos();
  const ids = ['abm-n-sindicato','abm-e-sindicato'];
  for(const id of ids){
    const sel = document.getElementById(id);
    if(!sel) continue;
    const prev = (id === 'abm-e-sindicato') ? (valorActual || sel.value || '') : (sel.value || '');
    sel.innerHTML = '<option value="">— Sin sindicato (asigna FC automático) —</option>' +
      '<option value="FC">FC — Fuera de Convenio (sin antigüedad ni presentismo)</option>' +
      sindicatos.map(s => `<option value="${s.codigo}">${s.codigo} — ${s.nombre}</option>`).join('');
    // Intentar preservar el valor previo (considerando aliases para datos legacy)
    if(prev){
      const prevUp = String(prev).trim().toUpperCase();
      const ALIAS = { 'SEC':'COMERCIO', 'EMPLEADOS DE COMERCIO':'COMERCIO', 'PLASTICO':'UOYEP' };
      const target = ALIAS[prevUp] || prevUp;
      const opt = [...sel.options].find(o => o.value.toUpperCase() === target);
      if(opt) sel.value = opt.value;
    }
  }
}

// Construye la lista de posibles validadores (managers actuales + C-level + CEO)
function poblarSelectoresValidador(excluirLeg){
  // Recopilar nombres únicos que aparecen como validadores actuales
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso && e.leg !== excluirLeg);
  const candidatos = new Set();
  // Agregar todos los que son validadores de alguien
  for(const e of nomina){
    const v = getValidador(e);
    if(v && v.validador && v.validador !== 'RR.HH.') candidatos.add(v.validador);
  }
  // Agregar también todos los empleados con cat=GER (son posibles managers)
  for(const e of nomina){
    if(e.cat === 'GER') candidatos.add(e.nom.toUpperCase().trim());
  }
  // Agregar el nodo virtual RR.HH.
  candidatos.add('RR.HH.');

  const sorted = Array.from(candidatos).sort();
  // Para cada empleado manager, obtener su área detectada (para que el usuario la vea)
  const opciones = sorted.map(nomV => {
    const empV = nomina.find(e => e.nom.toUpperCase().trim() === nomV);
    const areaV = empV ? getValidador(empV)?.area || '' : '';
    const label = areaV ? `${nomV} — ${areaV}` : nomV;
    return `<option value="${nomV}">${label}</option>`;
  }).join('');

  const html = `<option value="">— Auto (detectar por reglas) —</option>${opciones}`;
  ['abm-n-validador','abm-e-validador'].forEach(id => {
    const sel = document.getElementById(id);
    if(sel){
      const prev = sel.value;
      sel.innerHTML = html;
      if(prev) sel.value = prev;
    }
  });
}

// Al cambiar el validador, sugerir el área basado en la detección del validador elegido
async function abmSugerirArea(prefix){
  const validador = gV('abm-'+prefix+'-validador');
  const areaEl = document.getElementById('abm-'+prefix+'-area');
  if(!areaEl) return;
  if(!validador){
    // Si vuelve a Auto, limpiar area manual (usará la detectada)
    areaEl.value = '';
    areaEl.placeholder = 'Se detectará automáticamente';
    return;
  }
  // Buscar empleado cuyo validador sea este mismo nombre, tomar su área
  const nomina = getNomina();
  const alguienQueReporte = nomina.find(e => {
    const v = getValidador({...e, validador:null, areaOrg:null});
    return v?.validador === validador;
  });
  if(alguienQueReporte){
    const v = getValidador({...alguienQueReporte, validador:null, areaOrg:null});
    if(v?.area && !areaEl.value){
      areaEl.value = v.area;
    }
  }
  areaEl.placeholder = 'Ej: Comercial LEITEN';
}

// ══════════════════════════════════════════════════════════════════
// ABM EMPRESAS — Logo, CUIT, domicilio y firma del empleador
// Persistencia: IndexedDB store 'empresas_abm'
// Fallback: constante EMPRESA_DATOS_LIQ (hardcoded) + LOGOS externos
// ══════════════════════════════════════════════════════════════════

async function getEmpresasABM(){
  try {
    const db = await abrirIDB();
    return new Promise((res,rej)=>{
      const tx = db.transaction('empresas_abm','readonly');
      const r  = tx.objectStore('empresas_abm').getAll();
      r.onsuccess = ()=>res(r.result||[]);
      r.onerror   = e=>rej(e.target.error);
    });
  } catch(e){
    console.warn('Store empresas_abm no disponible aún:', e);
    return [];
  }
}
async function saveEmpresaABM(rec){
  const esEdicion = !!rec.id;
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('empresas_abm','readwrite');
    const store = tx.objectStore('empresas_abm');
    const req = rec.id ? store.put(rec) : store.add(rec);
    req.onsuccess = ()=>{
      // ── Auditoría: alta o edición de empresa ──
      if(typeof auditABM === 'function'){
        auditABM(esEdicion ? 'empresa_edicion' : 'empresa_alta',
          { dni: rec.cuit || '', nom: rec.razonSocial || rec.nombre || '(sin nombre)', extra: rec.id ? `ID:${rec.id}` : '' },
          { detail: rec.cuit ? `CUIT: ${rec.cuit}` : null });
      }
      res(req.result);
    };
    req.onerror   = e=>rej(e.target.error);
  });
}
async function deleteEmpresaABM(id){
  const db = await abrirIDB();
  // Capturamos los datos antes de borrar para el log
  let snap = null;
  try {
    snap = await new Promise((res, rej)=>{
      const tx = db.transaction('empresas_abm','readonly');
      const r = tx.objectStore('empresas_abm').get(id);
      r.onsuccess = ()=>res(r.result || null);
      r.onerror   = e=>rej(e.target.error);
    });
  } catch(e){ /* noop */ }
  return new Promise((res,rej)=>{
    const tx = db.transaction('empresas_abm','readwrite');
    const r = tx.objectStore('empresas_abm').delete(id);
    r.onsuccess = ()=>{
      // ── Auditoría: baja de empresa ──
      if(typeof auditABM === 'function'){
        auditABM('empresa_baja',
          { dni: snap?.cuit || '', nom: snap?.razonSocial || snap?.nombre || `ID:${id}`, extra: `ID:${id}` });
      }
      res();
    };
    r.onerror   = e=>rej(e.target.error);
  });
}

// Cache en memoria para consultas sincrónicas desde el recibo
// IMPORTANTE: usar `var` en lugar de `let` para evitar TDZ cuando otras
// funciones (getLogoSrc, getEmpresaDatos, getEmpresaFirma) lo consultan
// antes de llegar a esta declaración durante la inicialización.
var _empresasABMCache = (typeof _empresasABMCache !== 'undefined' && Array.isArray(_empresasABMCache)) ? _empresasABMCache : []; // var intencional: cache compartido entre js/01 y js/20
async function _refreshEmpresasABMCache(){
  try {
    _empresasABMCache = await getEmpresasABM();
  } catch(e){
    console.warn('No se pudo refrescar cache empresas ABM:', e);
    _empresasABMCache = [];
  }
  return _empresasABMCache;
}
// Busca por nombre (coincidencia exacta normalizada) — SEGURO si el cache no existe
function _findEmpresaABMByNombre(nombre){
  try {
    if(!nombre || typeof _empresasABMCache === 'undefined' || !_empresasABMCache || !_empresasABMCache.length) return null;
    const k = nombre.trim().toUpperCase();
    return _empresasABMCache.find(e => (e.nombre||'').trim().toUpperCase() === k) || null;
  } catch(e){
    return null;
  }
}

// Alias público para módulos externos (F.931, Libro Sueldo Digital, etc.)
// que necesitan resolver el CUIT a partir del nombre de empresa de un item.
function getEmpresaByNom(nombre){
  return _findEmpresaABMByNombre(nombre);
}

async function renderAbmEmpresasLista(){
  const div = document.getElementById('abm-emp-lista');
  if(!div) return;
  document.getElementById('abm-emp-form').style.display = 'none';
  div.style.display = 'block';
  // Aplicar seed de ART si las empresas no la tienen aún
  if(typeof aplicarArtSeedSiNecesario === 'function') await aplicarArtSeedSiNecesario();
  await _refreshEmpresasABMCache();
  const custom = _empresasABMCache.slice();

  // ─── Hidratación de logos y firmas desde catálogos globales ───────────
  // Si una empresa builtin no tiene un override en ABM, igual mostramos su
  // logo (de data/logos.js) y su firma (de data/firmas.js → getFirmaRRHH).
  // Esto NO persiste nada: si RR.HH. quiere ajustarlo, edita y se crea el
  // registro ABM propio.
  function _extraerLogoDataUrl(empresaNombre){
    if(typeof LOGOS === 'undefined' || !LOGOS[empresaNombre]) return null;
    // LOGOS guarda HTML como `<img src="data:image/...;base64,..." ...>`
    const m = String(LOGOS[empresaNombre]).match(/src=["'](data:[^"']+)["']/);
    return m ? m[1] : null;
  }
  function _extraerFirmaDataUrl(empresaNombre){
    if(typeof getFirmaRRHH !== 'function') return null;
    const f = getFirmaRRHH(empresaNombre);
    return f && f.imagen ? f.imagen : null;
  }

  // Map por nombre normalizado para fusionar built-in + ABM (ABM prevalece)
  const byName = {};
  // 1) Cargar todas las built-in primero — ahora con logo y firma derivados
  //    de los catálogos globales (visualización, no persistencia)
  for(const nombre of Object.keys(EMPRESA_DATOS_LIQ)){
    const d = EMPRESA_DATOS_LIQ[nombre];
    byName[nombre.trim().toUpperCase()] = {
      origen:'builtin',
      rec:{
        nombre, cuit:d.cuit, dir:d.dir, nro:d.nro, piso:d.piso, depto:d.depto, cp:d.cp, loc:d.loc,
        logoDataUrl: _extraerLogoDataUrl(nombre),
        firmaDataUrl: _extraerFirmaDataUrl(nombre),
        _logoFromCatalog: !!_extraerLogoDataUrl(nombre),
        _firmaFromCatalog: !!_extraerFirmaDataUrl(nombre)
      }
    };
  }
  // 2) Aplicar las personalizadas (override completo de la built-in con mismo nombre)
  //    Si el registro ABM no tiene logo propio, sigue mostrando el del catálogo.
  for(const c of custom){
    const k = (c.nombre||'').trim().toUpperCase();
    const builtin = byName[k];
    if(builtin && (!c.logoDataUrl || !c.firmaDataUrl)){
      // Hidratar campos faltantes con el catálogo para visualización
      const hidratado = { ...c };
      if(!hidratado.logoDataUrl){
        hidratado.logoDataUrl = _extraerLogoDataUrl(c.nombre);
        hidratado._logoFromCatalog = !!hidratado.logoDataUrl;
      }
      if(!hidratado.firmaDataUrl){
        hidratado.firmaDataUrl = _extraerFirmaDataUrl(c.nombre);
        hidratado._firmaFromCatalog = !!hidratado.firmaDataUrl;
      }
      byName[k] = { origen:'abm', rec: hidratado };
    } else {
      byName[k] = { origen:'abm', rec:c };
    }
  }

  const filas = Object.values(byName).sort((a,b)=>(a.rec.nombre||'').localeCompare(b.rec.nombre||''));

  if(!filas.length){
    div.innerHTML = '<div class="card" style="padding:28px;text-align:center;color:var(--t3);font-size:13px">No hay empresas registradas. Creá la primera con el botón ➕ Nueva empresa.</div>';
    return;
  }
  div.innerHTML = '<div class="card" style="padding:0;overflow:hidden">' +
    filas.map(f=>{
      const r = f.rec;
      // Si es del grupo (tiene entrada built-in), mostrar badge verde; si es ABM puro, violeta
      const esDelGrupo = EMPRESA_DATOS_LIQ[r.nombre] !== undefined;
      const badge = esDelGrupo && f.origen==='abm'
        ? '<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)" title="Empresa del grupo con datos personalizados">GRUPO · EDITADA</span>'
        : esDelGrupo
          ? '<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:rgba(61,127,255,.1);border:1px solid rgba(61,127,255,.3);color:var(--accent2);font-family:var(--font-mono)">GRUPO</span>'
          : '<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.3);color:rgb(168,85,247);font-family:var(--font-mono)">PERSONALIZADA</span>';
      const tieneLogo  = !!r.logoDataUrl;
      const tieneFirma = !!r.firmaDataUrl;
      const cantCentros = Array.isArray(r.centros) ? r.centros.length : 0;
      const cantCentrosActivos = Array.isArray(r.centros) ? r.centros.filter(c=>c.activo!==false).length : 0;
      const centrosInfo = cantCentros > 0
        ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(236,72,153,.08);border:1px solid rgba(236,72,153,.25);color:rgb(236,72,153);font-family:var(--font-mono)" title="${cantCentros} centro${cantCentros!==1?'s':''} de operaciones (${cantCentrosActivos} activo${cantCentrosActivos!==1?'s':''})">📍 ${cantCentros} centro${cantCentros!==1?'s':''}</span>`
        : '';
      // Chip CBU origen
      let cbuOrigenChip = '';
      if(typeof validarCBU === 'function' && r.cbuOrigen){
        const v = validarCBU(r.cbuOrigen);
        if(v.ok){
          const tipo = r.tipoCuentaOrigen === 'CA' ? 'C.A.' : 'Cta. Cte.';
          cbuOrigenChip = `<span title="${r.bancoOrigen||'?'} · ${tipo}" style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)">🏦 ${(r.bancoOrigen||'').slice(0,14)}</span>`;
        } else {
          cbuOrigenChip = `<span title="${v.error}" style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:var(--red);font-family:var(--font-mono)">⚠ CBU inválido</span>`;
        }
      } else if(f.origen === 'abm'){
        cbuOrigenChip = `<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--t3);font-family:var(--font-mono)">— sin CBU origen</span>`;
      }
      const logoImg = tieneLogo
        ? `<img src="${r.logoDataUrl}" style="max-width:70px;max-height:36px;border:1px solid var(--border);border-radius:4px;background:#fff;padding:2px"${r._logoFromCatalog?' title="Logo del catálogo del sistema (editable)"':''}>`
        : '<div style="width:70px;height:36px;border:1px dashed var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--t3);font-family:var(--font-mono)">SIN LOGO</div>';
      const domicilio = [r.dir, r.nro, r.piso?`Piso ${r.piso}`:null, r.depto?`Depto ${r.depto}`:null, r.loc, r.cp?`(${r.cp})`:null].filter(Boolean).join(' ');

      // Botones: SIEMPRE editar. Eliminar solo si NO es del grupo (las built-in no se pueden borrar, solo revertir)
      let accionesBtns = '';
      if(f.origen === 'abm'){
        accionesBtns = `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="abmEmpresaEditar(${r.id})">✎ Editar</button>`;
        if(esDelGrupo){
          // Empresa del grupo con datos personalizados → permitir revertir
          accionesBtns += `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--yellow);border-color:rgba(234,179,8,.3)" onclick="abmEmpresaRevertir(${r.id},'${(r.nombre||'').replace(/'/g,"\\'")}')" title="Volver a los datos por defecto del sistema">↩ Revertir</button>`;
        } else {
          // Empresa personalizada (no built-in) → permitir eliminar
          accionesBtns += `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="abmEmpresaEliminar(${r.id})">✕ Eliminar</button>`;
        }
      } else {
        // Built-in sin personalización → editar (crea registro ABM al guardar)
        accionesBtns = `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="abmEmpresaEditarBuiltIn('${(r.nombre||'').replace(/'/g,"\\'")}')">✎ Editar</button>`;
      }

      return `
      <div style="display:grid;grid-template-columns:80px 1fr 140px auto;gap:14px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border)">
        ${logoImg}
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1);display:flex;align-items:center;gap:10px;flex-wrap:wrap">${r.nombre||'(sin nombre)'} ${badge} ${centrosInfo} ${cbuOrigenChip}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">CUIT: ${r.cuit||'—'}</div>
          <div style="font-size:10px;color:var(--t3);margin-top:1px">${domicilio||'<span style="color:var(--t3)">Sin domicilio</span>'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px;font-family:var(--font-mono)">FIRMA${r._firmaFromCatalog?' <span style="font-size:8px;color:var(--accent2);text-transform:uppercase">(catálogo)</span>':''}</div>
          ${tieneFirma
            ? `<img src="${r.firmaDataUrl}" style="max-width:110px;max-height:40px;background:#fff;border:1px solid var(--border);border-radius:4px;padding:2px"${r._firmaFromCatalog?' title="Firma del catálogo del sistema (Gte. RRHH) — editable para personalizar"':''}>`
            : '<div style="font-size:10px;color:var(--t3);font-style:italic">Sin firma cargada</div>'
          }
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${accionesBtns}</div>
      </div>`;
    }).join('') + '</div>';
}

function abmEmpresaNueva(){
  _abmEmpresaMostrarForm(null);
}

// Editar una empresa del grupo built-in (precarga sus datos default en el form).
// Al guardar se crea un registro ABM que override la built-in.
async function abmEmpresaEditarBuiltIn(nombre){
  const d = EMPRESA_DATOS_LIQ[nombre] || {};
  // Precargar logo y firma desde catálogos globales (data/logos.js y data/firmas.js)
  // así RR.HH. los puede ajustar partiendo de los defaults del sistema.
  let logoData = null, firmaData = null;
  if(typeof LOGOS !== 'undefined' && LOGOS[nombre]){
    const m = String(LOGOS[nombre]).match(/src=["'](data:[^"']+)["']/);
    if(m) logoData = m[1];
  }
  if(typeof getFirmaRRHH === 'function'){
    const f = getFirmaRRHH(nombre);
    if(f && f.imagen) firmaData = f.imagen;
  }
  _abmEmpresaMostrarForm({
    nombre,
    cuit: d.cuit||'',
    dir: d.dir||'', nro: d.nro||'', piso: d.piso||'', depto: d.depto||'',
    loc: d.loc||'', cp: d.cp||'',
    logoDataUrl: logoData,
    firmaDataUrl: firmaData
  });
}

// Alias retrocompatible (por si queda algún onclick viejo)
function abmEmpresaPersonalizar(nombre){
  abmEmpresaEditarBuiltIn(nombre);
}

// Revertir una empresa del grupo a sus datos default (elimina el registro ABM personalizado)
async function abmEmpresaRevertir(id, nombre){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede modificar empresas','var(--red)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Revertir "${nombre}" a los datos por defecto del sistema?<br><br>Se eliminarán el logo, firma y el resto de los datos personalizados. La empresa seguirá existiendo con los datos originales del grupo.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  try {
    await deleteEmpresaABM(id);
    await _refreshEmpresasABMCache();
    toast('✓ Empresa revertida a sus datos por defecto','var(--green)');
    renderAbmEmpresasLista();
  } catch(e){
    console.error(e);
    toast('⚠ Error al revertir: ' + (e?.message||e),'var(--red)');
  }
}

async function abmEmpresaEditar(id){
  const lista = await getEmpresasABM();
  const rec = lista.find(x=>x.id===id);
  if(!rec){ toast('⚠ Empresa no encontrada','var(--red)'); return; }
  _abmEmpresaMostrarForm(rec);
}

function _abmEmpresaMostrarForm(rec){
  document.getElementById('abm-emp-lista').style.display = 'none';
  document.getElementById('abm-emp-form').style.display  = 'block';
  // Título dinámico según el caso:
  // - rec.id         → editando un registro ABM ya existente
  // - rec.nombre y es built-in → primera edición de empresa del grupo
  // - sin nada       → nueva empresa
  const titulo = document.getElementById('abm-emp-form-titulo');
  if(rec?.id){
    titulo.textContent = `Modificar empresa: ${rec.nombre||''}`;
  } else if(rec?.nombre && EMPRESA_DATOS_LIQ[rec.nombre] !== undefined){
    titulo.textContent = `Editar empresa del grupo: ${rec.nombre}`;
  } else {
    titulo.textContent = 'Nueva empresa';
  }
  document.getElementById('abm-emp-id').value    = rec?.id || '';
  document.getElementById('abm-emp-nom').value   = rec?.nombre || '';
  document.getElementById('abm-emp-cuit').value  = rec?.cuit   || '';
  document.getElementById('abm-emp-dir').value   = rec?.dir    || '';
  document.getElementById('abm-emp-nro').value   = rec?.nro    || '';
  document.getElementById('abm-emp-piso').value  = rec?.piso   || '';
  document.getElementById('abm-emp-depto').value = rec?.depto  || '';
  document.getElementById('abm-emp-loc').value   = rec?.loc    || '';
  document.getElementById('abm-emp-cp').value    = rec?.cp     || '';
  document.getElementById('abm-emp-logo-data').value  = rec?.logoDataUrl  || '';
  document.getElementById('abm-emp-firma-data').value = rec?.firmaDataUrl || '';
  // Cuenta bancaria origen
  const cbuEmp = document.getElementById('abm-emp-cbu');
  const tcEmp  = document.getElementById('abm-emp-tipo-cuenta');
  const alEmp  = document.getElementById('abm-emp-alias');
  if(cbuEmp) cbuEmp.value = rec?.cbuOrigen || '';
  if(tcEmp)  tcEmp.value  = rec?.tipoCuentaOrigen || 'CC';
  if(alEmp)  alEmp.value  = rec?.aliasOrigen || '';

  if(typeof _cbuInputLiveEmpresa === 'function') _cbuInputLiveEmpresa();
  // ART (Aseguradora de Riesgos del Trabajo)
  const _artEl = document.getElementById('abm-emp-art-data');
  if(_artEl){
    _artEl.value = JSON.stringify(rec?.art || []);
    if(typeof renderArtEmpresaEnForm === 'function') renderArtEmpresaEnForm(rec?.art || []);
  }
  // Centros de operaciones
  document.getElementById('abm-emp-centros-data').value = JSON.stringify(rec?.centros || []);
  _renderCentrosOpLista();
  // Reset de los <input type="file"> — imprescindible:
  // (a) para que el onchange dispare cuando el usuario seleccione el MISMO
  //     archivo en distintas empresas (el navegador sólo dispara change si
  //     el value del input cambió).
  // (b) para que no quede el archivo de la edición anterior "colgado"
  //     cuando se abre el form para otra empresa.
  const logoInp  = document.getElementById('abm-emp-logo-input');
  const firmaInp = document.getElementById('abm-emp-firma-input');
  if(logoInp)  logoInp.value  = '';
  if(firmaInp) firmaInp.value = '';
  _abmEmpresaRenderLogoPreview(rec?.logoDataUrl);
  _abmEmpresaRenderFirmaPreview(rec?.firmaDataUrl);
}

function _abmEmpresaRenderLogoPreview(dataUrl){
  const box = document.getElementById('abm-emp-logo-preview');
  if(!box) return;
  if(dataUrl){
    box.innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain">`;
  } else {
    box.innerHTML = '<span>Sin logo cargado</span>';
  }
}
function _abmEmpresaRenderFirmaPreview(dataUrl){
  const box = document.getElementById('abm-emp-firma-preview');
  if(!box) return;
  if(dataUrl){
    box.innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain">`;
  } else {
    box.innerHTML = '<span>Sin firma cargada</span>';
  }
}

function abmEmpresaLogoLoad(ev){
  const file = ev.target.files?.[0];
  if(!file) return;
  if(file.size > 2*1024*1024){
    const mb = (file.size/1024/1024).toFixed(2);
    toast(`⚠ El logo pesa ${mb} MB — máximo 2 MB`,'var(--red)');
    ev.target.value='';
    return;
  }
  if(!/^image\/(png|jpe?g)$/.test(file.type)){ toast('⚠ Formato no soportado (usar PNG o JPG)','var(--red)'); ev.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('abm-emp-logo-data').value = reader.result;
    _abmEmpresaRenderLogoPreview(reader.result);
    ev.target.value = '';  // ver comentario en abmEmpresaFirmaLoad
    toast('✓ Logo cargado (guardá para confirmar)','var(--green)');
  };
  reader.onerror = () => toast('⚠ Error al leer el archivo','var(--red)');
  reader.readAsDataURL(file);
}
function abmEmpresaLogoClear(){
  document.getElementById('abm-emp-logo-data').value = '';
  document.getElementById('abm-emp-logo-input').value = '';
  _abmEmpresaRenderLogoPreview(null);
}

function abmEmpresaFirmaLoad(ev){
  const file = ev.target.files?.[0];
  if(!file) return;
  // Límite 3 MB — tolerante con escaneos de firmas en alta resolución.
  if(file.size > 3*1024*1024){
    const mb = (file.size/1024/1024).toFixed(2);
    toast(`⚠ La firma pesa ${mb} MB — máximo 3 MB`,'var(--red)');
    ev.target.value='';
    return;
  }
  if(!/^image\/(png|jpe?g)$/.test(file.type)){ toast('⚠ Formato no soportado (usar PNG o JPG)','var(--red)'); ev.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('abm-emp-firma-data').value = reader.result;
    _abmEmpresaRenderFirmaPreview(reader.result);
    // Reset del input para que onchange dispare si el usuario vuelve a
    // elegir el MISMO archivo más tarde (ej. misma firma en otra empresa)
    ev.target.value = '';
    toast('✓ Firma cargada (guardá para confirmar)','var(--green)');
  };
  reader.onerror = () => toast('⚠ Error al leer el archivo','var(--red)');
  reader.readAsDataURL(file);
}
function abmEmpresaFirmaClear(){
  document.getElementById('abm-emp-firma-data').value = '';
  document.getElementById('abm-emp-firma-input').value = '';
  _abmEmpresaRenderFirmaPreview(null);
}

function abmEmpresaCancelar(){
  document.getElementById('abm-emp-form').style.display = 'none';
  document.getElementById('abm-emp-lista').style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════
// CENTROS DE OPERACIONES (sucursales / plantas / sedes)
// Se persisten dentro de cada empresa como rec.centros = [...]
// ═══════════════════════════════════════════════════════════════
const TIPOS_CENTRO = [
  { v:'casa_central', label:'🏛️ Casa Central' },
  { v:'sucursal',     label:'🏢 Sucursal' },
  { v:'planta',       label:'🏭 Planta industrial' },
  { v:'deposito',     label:'📦 Depósito' },
  { v:'oficina',      label:'🪑 Oficina comercial' },
  { v:'obra',         label:'🚧 Obra' },
  { v:'otro',         label:'📍 Otro' }
];

// Seed de centros derivado de las locaciones de empleados (Caseros = casa central, Salta = sucursal Salta)
const CENTROS_SEED = {"LEITEN S.A.": [{"nombre": "Casa Central — Caseros", "tipo": "casa_central", "codigo": "CC", "calle": "3 de Febrero", "numero": "4456", "piso": "", "depto": "", "localidad": "Caseros", "provincia": "Buenos Aires", "cp": "B1678", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 41, "horario": "", "observaciones": "", "es_principal": true, "activo": true}, {"nombre": "Good Park — Pablo Podestá", "tipo": "planta", "codigo": "GP", "calle": "Good Park (Parque Industrial)", "numero": "s/n", "piso": "", "depto": "", "localidad": "Pablo Podestá", "provincia": "Buenos Aires", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 6, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Rosario", "tipo": "sucursal", "codigo": "SUC-ROS", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Rosario", "provincia": "Santa Fe", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 5, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Santa Fe", "tipo": "sucursal", "codigo": "SUC-SF", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Santa Fe", "provincia": "Santa Fe", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 5, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Córdoba", "tipo": "sucursal", "codigo": "SUC-CBA", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Córdoba", "provincia": "Córdoba", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 4, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Corrientes", "tipo": "sucursal", "codigo": "SUC-CTES", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Corrientes", "provincia": "Corrientes", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 4, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Mendoza", "tipo": "sucursal", "codigo": "SUC-MZA", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Mendoza", "provincia": "Mendoza", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 4, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Neuquén", "tipo": "sucursal", "codigo": "SUC-NQN", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Neuquén", "provincia": "Neuquén", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 3, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Salta", "tipo": "sucursal", "codigo": "SUC-SAL", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Salta", "provincia": "Salta", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 3, "horario": "", "observaciones": "", "es_principal": false, "activo": true}], "SINIS S.A.": [{"nombre": "Casa Central — Caseros", "tipo": "casa_central", "codigo": "CC", "calle": "3 de Febrero", "numero": "4456", "piso": "", "depto": "", "localidad": "Caseros", "provincia": "Buenos Aires", "cp": "B1678", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 26, "horario": "", "observaciones": "", "es_principal": true, "activo": true}, {"nombre": "Good Park — Pablo Podestá", "tipo": "planta", "codigo": "GP", "calle": "Good Park (Parque Industrial)", "numero": "s/n", "piso": "", "depto": "", "localidad": "Pablo Podestá", "provincia": "Buenos Aires", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 18, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Córdoba", "tipo": "sucursal", "codigo": "SUC-CBA", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Córdoba", "provincia": "Córdoba", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 4, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Santa Fe", "tipo": "sucursal", "codigo": "SUC-SF", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Santa Fe", "provincia": "Santa Fe", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 2, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Rosario", "tipo": "sucursal", "codigo": "SUC-ROS", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Rosario", "provincia": "Santa Fe", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 2, "horario": "", "observaciones": "", "es_principal": false, "activo": true}, {"nombre": "Sucursal Mendoza", "tipo": "sucursal", "codigo": "SUC-MZA", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Mendoza", "provincia": "Mendoza", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 1, "horario": "", "observaciones": "", "es_principal": false, "activo": true}], "BARTON REBAR SA": [{"nombre": "Casa Central — Caseros", "tipo": "casa_central", "es_principal": true, "codigo": "CC", "calle": "3 de Febrero", "numero": "4456", "piso": "", "depto": "", "localidad": "Caseros", "provincia": "Buenos Aires", "cp": "B1678", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 0, "horario": "", "observaciones": "", "activo": true}, {"nombre": "Good Park — Pablo Podestá", "tipo": "planta", "codigo": "GP", "calle": "Good Park (Parque Industrial)", "numero": "s/n", "piso": "", "depto": "", "localidad": "Pablo Podestá", "provincia": "Buenos Aires", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 6, "horario": "", "observaciones": "", "es_principal": false, "activo": true}], "LEITEN SALTA S. A.": [{"nombre": "Casa Central — Caseros", "tipo": "casa_central", "es_principal": true, "codigo": "CC", "calle": "3 de Febrero", "numero": "4456", "piso": "", "depto": "", "localidad": "Caseros", "provincia": "Buenos Aires", "cp": "B1678", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 0, "horario": "", "observaciones": "", "activo": true}, {"nombre": "Sucursal Salta", "tipo": "sucursal", "codigo": "SUC-SAL", "calle": "", "numero": "", "piso": "", "depto": "", "localidad": "Salta", "provincia": "Salta", "cp": "", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 1, "horario": "", "observaciones": "", "es_principal": false, "activo": true}], "IDEE S.R.L.": [{"nombre": "Casa Central — Caseros", "tipo": "casa_central", "es_principal": true, "codigo": "CC", "calle": "3 de Febrero", "numero": "4456", "piso": "", "depto": "", "localidad": "Caseros", "provincia": "Buenos Aires", "cp": "B1678", "telefono": "", "mail": "", "responsable": "", "fecha_habilitacion": "", "cant_empleados": 0, "horario": "", "observaciones": "", "activo": true}]};


function _getCentrosFromHidden(){
  try {
    const raw = document.getElementById('abm-emp-centros-data').value || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch(e){ return []; }
}
function _setCentrosToHidden(arr){
  document.getElementById('abm-emp-centros-data').value = JSON.stringify(arr || []);
}

function _renderCentrosOpLista(){
  const cont = document.getElementById('abm-emp-centros-lista');
  if(!cont) return;
  const centros = _getCentrosFromHidden();

  if(centros.length === 0){
    cont.innerHTML = `
      <div style="padding:20px;text-align:center;color:var(--t3);background:var(--bg2);border:1px dashed var(--border);border-radius:var(--r);font-size:12px">
        Sin centros de operaciones cargados.<br>
        <span style="font-size:11px">Tocá <b>+ Agregar centro</b> para sumar la primera sucursal, planta u oficina.</span>
      </div>`;
    return;
  }

  const tipoLabel = v => (TIPOS_CENTRO.find(t=>t.v===v)?.label) || '📍 Otro';

  // Helper: formato fecha YYYY-MM-DD → DD/MM/YYYY
  const fmtFecha = iso => {
    if(!iso || !iso.includes('-')) return iso || '';
    const p = iso.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  };
  // Helper: ¿el centro está vencido por fecha hasta?
  const hoy = new Date().toISOString().slice(0,10);
  const estaVencido = c => c.fecha_hasta && c.fecha_hasta < hoy;

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${centros.map((c, i) => {
        const desde = c.fecha_desde || c.fecha_habilitacion || '';
        const hasta = c.fecha_hasta || '';
        const vencido = estaVencido(c);
        return `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap${vencido?';opacity:.65':''}">
          <div style="flex:1;min-width:240px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:13px;font-weight:600;color:var(--t1)">${c.nombre || '(sin nombre)'}</span>
              <span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:var(--bg3);color:var(--t3);border:1px solid var(--border)">${tipoLabel(c.tipo)}</span>
              ${c.es_principal ? '<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(34,197,94,.1);color:rgb(34,197,94);border:1px solid rgba(34,197,94,.3)">★ PRINCIPAL</span>' : ''}
              ${c.activo === false ? '<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.1);color:rgb(239,68,68);border:1px solid rgba(239,68,68,.3)">INACTIVO</span>' : ''}
              ${vencido ? '<span style="font-size:10px;font-family:var(--font-mono);padding:2px 8px;border-radius:10px;background:rgba(251,146,60,.1);color:rgb(251,146,60);border:1px solid rgba(251,146,60,.3)" title="Cerrado el '+fmtFecha(hasta)+'">⏱ CERRADO</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--t2);line-height:1.5">
              ${[c.calle, c.numero, c.piso, c.depto].filter(Boolean).join(' ')}
              ${c.localidad || c.provincia || c.cp ? '<br>' : ''}
              ${[c.localidad, c.provincia].filter(Boolean).join(', ')}${c.cp ? ' (' + c.cp + ')' : ''}
            </div>
            ${desde || hasta ? `
              <div style="font-size:11px;color:var(--t3);margin-top:6px;font-family:var(--font-mono)">
                📅 ${desde ? `Desde ${fmtFecha(desde)}` : 'Sin fecha de inicio'}${hasta ? ` · Hasta ${fmtFecha(hasta)}` : ' · Vigente'}
              </div>
            ` : ''}
            ${c.telefono || c.mail || c.responsable ? `
              <div style="font-size:11px;color:var(--t3);margin-top:6px;font-family:var(--font-mono);display:flex;flex-wrap:wrap;gap:14px">
                ${c.telefono ? `<span>📞 ${c.telefono}</span>` : ''}
                ${c.mail ? `<span>✉ ${c.mail}</span>` : ''}
                ${c.responsable ? `<span>👤 ${c.responsable}</span>` : ''}
              </div>
            ` : ''}
            ${c.observaciones ? `<div style="font-size:11px;color:var(--t3);margin-top:6px;font-style:italic">${c.observaciones}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button type="button" class="btn btn-ghost" onclick="abrirFormCentroOp(${i})" style="font-size:11px;padding:5px 10px;color:var(--accent2);border-color:rgba(61,127,255,.3)" title="Editar">✎</button>
            <button type="button" class="btn btn-ghost" onclick="eliminarCentroOp(${i})" style="font-size:11px;padding:5px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar">✕</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function abrirFormCentroOp(idxEdit){
  const prev = document.getElementById('modal-centro-op');
  if(prev) prev.remove();

  const centros = _getCentrosFromHidden();
  const editing = (typeof idxEdit === 'number');
  const c = editing ? (centros[idxEdit] || {}) : {};

  const tipoOpts = TIPOS_CENTRO
    .map(t => `<option value="${t.v}" ${(c.tipo||'sucursal')===t.v?'selected':''}>${t.label}</option>`)
    .join('');

  const provincias = ['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos',
    'Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan',
    'San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'];
  const provOpts = provincias
    .map(p => `<option value="${p}" ${c.provincia===p?'selected':''}>${p}</option>`)
    .join('');

  const modal = document.createElement('div');
  modal.id = 'modal-centro-op';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:680px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${editing?'✎ Editar centro de operaciones':'+ Nuevo centro de operaciones'}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Sucursal, planta, depósito u oficina</div>
        </div>
        <button onclick="cerrarFormCentroOp()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:20px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="grid-column:span 2">
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Nombre del centro *</label>
            <input type="text" id="co-nombre" value="${(c.nombre||'').replace(/"/g,'&quot;')}" placeholder="Ej: Planta Olavarría · Sucursal Núñez · Depósito Central"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Tipo</label>
            <select id="co-tipo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
              ${tipoOpts}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Código interno</label>
            <input type="text" id="co-codigo" value="${(c.codigo||'').replace(/"/g,'&quot;')}" placeholder="Ej: PL01, SUC-NORTE" maxlength="20"
              style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);text-transform:uppercase">
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Domicilio</div>
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px">
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Calle *</label>
              <input type="text" id="co-calle" value="${(c.calle||'').replace(/"/g,'&quot;')}" placeholder="Av. Corrientes"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Número *</label>
              <input type="text" id="co-numero" value="${(c.numero||'').replace(/"/g,'&quot;')}" placeholder="1234"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Piso</label>
              <input type="text" id="co-piso" value="${(c.piso||'').replace(/"/g,'&quot;')}" placeholder="3"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Depto</label>
              <input type="text" id="co-depto" value="${(c.depto||'').replace(/"/g,'&quot;')}" placeholder="A"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:2fr 2fr 1fr;gap:10px;margin-top:10px">
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Localidad *</label>
              <input type="text" id="co-localidad" value="${(c.localidad||'').replace(/"/g,'&quot;')}" placeholder="Olavarría"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Provincia *</label>
              <select id="co-provincia" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none">
                <option value="">— Seleccionar —</option>
                ${provOpts}
              </select>
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">CP</label>
              <input type="text" id="co-cp" value="${(c.cp||'').replace(/"/g,'&quot;')}" placeholder="B7400" maxlength="10"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Contacto</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Teléfono</label>
              <input type="tel" id="co-telefono" value="${(c.telefono||'').replace(/"/g,'&quot;')}" placeholder="+54 11 4123-4567"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Email</label>
              <input type="email" id="co-mail" value="${(c.mail||'').replace(/"/g,'&quot;')}" placeholder="planta@empresa.com"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none">
            </div>
            <div style="grid-column:span 2">
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Responsable / Encargado</label>
              <input type="text" id="co-responsable" value="${(c.responsable||'').replace(/"/g,'&quot;')}" placeholder="Nombre del jefe del centro"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none">
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Período de operación</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Fecha desde *</label>
              <input type="date" id="co-fecha-desde" value="${c.fecha_desde || c.fecha_habilitacion || ''}"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
              <div style="font-size:10px;color:var(--t3);margin-top:3px">Apertura / habilitación del centro</div>
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Fecha hasta</label>
              <input type="date" id="co-fecha-hasta" value="${c.fecha_hasta || ''}"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
              <div style="font-size:10px;color:var(--t3);margin-top:3px">Cierre / dejar vacío si sigue activo</div>
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Datos operativos</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Cant. empleados estimada</label>
              <input type="number" id="co-cant-emp" min="0" value="${c.cant_empleados||''}" placeholder="0"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Horario</label>
              <input type="text" id="co-horario" value="${(c.horario||'').replace(/"/g,'&quot;')}" placeholder="L-V 8 a 17 hs"
                style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px;color:var(--t1);font-size:13px;outline:none">
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:14px">
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Observaciones</label>
          <textarea id="co-obs" rows="2" placeholder="Notas internas, referencias, particularidades..."
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;resize:vertical;font-family:inherit">${(c.observaciones||'').replace(/</g,'&lt;')}</textarea>
        </div>

        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding-top:8px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);cursor:pointer">
            <input type="checkbox" id="co-principal" ${c.es_principal?'checked':''} style="width:16px;height:16px;cursor:pointer">
            <span>Es centro principal / Casa Central</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t2);cursor:pointer">
            <input type="checkbox" id="co-activo" ${c.activo!==false?'checked':''} style="width:16px;height:16px;cursor:pointer">
            <span>Centro activo</span>
          </label>
        </div>
      </div>

      <div style="padding:16px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="btn btn-ghost" onclick="cerrarFormCentroOp()" style="font-size:13px;padding:8px 16px">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="guardarCentroOp(${editing?idxEdit:'null'})" style="font-size:13px;padding:8px 18px">${editing?'Guardar cambios':'Agregar centro'}</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', ev => { if(ev.target === modal) cerrarFormCentroOp(); });
  setTimeout(()=>{ const el=document.getElementById('co-nombre'); if(el) el.focus(); }, 50);
}

function cerrarFormCentroOp(){
  const m = document.getElementById('modal-centro-op');
  if(m) m.remove();
}

function guardarCentroOp(idxEdit){
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const gvUp = id => gv(id).toUpperCase();
  const gvCk = id => !!document.getElementById(id)?.checked;

  const nombre = gv('co-nombre');
  const calle = gv('co-calle');
  const numero = gv('co-numero');
  const localidad = gv('co-localidad');
  const provincia = gv('co-provincia');
  const fechaDesde = gv('co-fecha-desde');
  const fechaHasta = gv('co-fecha-hasta');

  if(!nombre){ showAlert('El nombre del centro es obligatorio.', 'warning'); return; }
  if(!calle){ showAlert('La calle es obligatoria.', 'warning'); return; }
  if(!numero){ showAlert('El número es obligatorio.', 'warning'); return; }
  if(!localidad){ showAlert('La localidad es obligatoria.', 'warning'); return; }
  if(!provincia){ showAlert('La provincia es obligatoria.', 'warning'); return; }
  if(fechaHasta && !fechaDesde){
    showAlert('Cargá primero la fecha desde antes de la fecha hasta.', 'warning'); return;
  }
  if(fechaDesde && fechaHasta && fechaHasta < fechaDesde){
    showAlert('La fecha hasta no puede ser anterior a la fecha desde.', 'warning'); return;
  }

  const centroNuevo = {
    nombre,
    tipo: gv('co-tipo') || 'sucursal',
    codigo: gvUp('co-codigo'),
    calle, numero,
    piso: gv('co-piso'),
    depto: gvUp('co-depto'),
    localidad, provincia,
    cp: gvUp('co-cp'),
    telefono: gv('co-telefono'),
    mail: gv('co-mail'),
    responsable: gv('co-responsable'),
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    // Campo legado (preservado para compatibilidad con datos viejos)
    fecha_habilitacion: fechaDesde,
    cant_empleados: parseInt(gv('co-cant-emp'),10) || null,
    horario: gv('co-horario'),
    observaciones: gv('co-obs'),
    es_principal: gvCk('co-principal'),
    activo: gvCk('co-activo')
  };

  const centros = _getCentrosFromHidden();

  // Solo un centro principal: si este se marca principal, desmarcar los otros
  if(centroNuevo.es_principal){
    centros.forEach(c => { c.es_principal = false; });
  }

  // Validación de código duplicado (si se cargó)
  if(centroNuevo.codigo){
    const dup = centros.findIndex((c, i) =>
      i !== (typeof idxEdit === 'number' ? idxEdit : -1) &&
      (c.codigo||'').toUpperCase() === centroNuevo.codigo
    );
    if(dup >= 0){ showAlert(`Ya existe otro centro con el código "${centroNuevo.codigo}".`, 'warning'); return; }
  }

  if(typeof idxEdit === 'number'){
    centros[idxEdit] = centroNuevo;
  } else {
    centros.push(centroNuevo);
  }

  _setCentrosToHidden(centros);
  _renderCentrosOpLista();
  cerrarFormCentroOp();
  toast(`✓ Centro ${typeof idxEdit==='number'?'actualizado':'agregado'} (guardá para confirmar)`,'var(--green)');
}

async function eliminarCentroOp(idx){
  const centros = _getCentrosFromHidden();
  const c = centros[idx];
  if(!c) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar el centro "${c.nombre}"?<br><br>Este cambio se aplicará al guardar la empresa.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  centros.splice(idx, 1);
  _setCentrosToHidden(centros);
  _renderCentrosOpLista();
  toast('✓ Centro eliminado (guardá para confirmar)','var(--red)');
}

// ═══════════════════════════════════════════════════════════════
// IMPORTAR CENTROS desde locaciones de empleados (CENTROS_SEED)
// Reglas:
// - Casa central en 3 de Febrero 4456, Caseros (todas las empresas)
// - LEITEN, SINIS, BARTON: un centro por cada locación distinta de su DB
// - LEITEN SALTA: solo Salta + casa central
// - IDEE: solo casa central
// ═══════════════════════════════════════════════════════════════
async function importarCentrosDesdeLocaciones(){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede modificar empresas','var(--red)'); return; }
  if(typeof CENTROS_SEED !== 'object'){ toast('⚠ No se encontró el seed de centros','var(--red)'); return; }

  const empresasSeed = Object.keys(CENTROS_SEED);
  let resumen = 'Se aplicará el siguiente seed de centros de operaciones:\n\n';
  for(const emp of empresasSeed){
    resumen += `  ${emp}: ${CENTROS_SEED[emp].length} centros\n`;
  }
  resumen += '\n⚠ Si la empresa ya tiene centros cargados, ¿qué hacemos?\n\n' +
             '  • OK = Reemplazar centros existentes con el seed\n' +
             '  • Cancelar = Solo cargar en empresas sin centros (preserva las que ya tienen)';

  const reemplazar = await showConfirm({titulo:"Confirmar reemplazo",mensaje:resumen,labelOk:"Reemplazar",peligroso:false});

  let aplicadas = 0, omitidas = 0, creadas = 0;
  const ahora = new Date().toISOString();
  const usuario = currentUser?.emp?.nom || null;

  // Asegurar cache fresca
  await _refreshEmpresasABMCache();
  const existentes = _empresasABMCache.slice();

  for(const empNombre of empresasSeed){
    const centros = CENTROS_SEED[empNombre].map(c => ({...c}));
    // Buscar registro ABM existente
    const empUp = empNombre.trim().toUpperCase();
    let rec = existentes.find(x => (x.nombre||'').trim().toUpperCase() === empUp);

    if(rec){
      // Empresa con registro ABM → actualizar
      const tieneCentros = Array.isArray(rec.centros) && rec.centros.length > 0;
      if(tieneCentros && !reemplazar){ omitidas++; continue; }
      rec.centros = centros;
      rec.actualizadaEl = ahora;
      rec.actualizadaPor = usuario;
      try { await saveEmpresaABM(rec); aplicadas++; } catch(e){ console.error(e); }
    } else {
      // No existe registro ABM → crear uno desde EMPRESA_DATOS_LIQ si es del grupo
      const builtin = (typeof EMPRESA_DATOS_LIQ !== 'undefined') ? EMPRESA_DATOS_LIQ[empNombre] : null;
      if(!builtin){ omitidas++; continue; }
      const nuevoRec = {
        nombre: empNombre,
        cuit: builtin.cuit || '',
        dir: builtin.dir || '',
        nro: builtin.nro || '',
        piso: builtin.piso || '',
        depto: builtin.depto || '',
        loc: builtin.loc || '',
        cp: builtin.cp || '',
        logoDataUrl: null,
        firmaDataUrl: null,
        centros,
        creadaEl: ahora,
        actualizadaEl: ahora,
        actualizadaPor: usuario
      };
      try { await saveEmpresaABM(nuevoRec); aplicadas++; creadas++; } catch(e){ console.error(e); }
    }
  }

  await _refreshEmpresasABMCache();
  await renderAbmEmpresasLista();

  let msg = `✓ Centros importados en ${aplicadas} empresa${aplicadas!==1?'s':''}`;
  if(creadas > 0) msg += ` (${creadas} creada${creadas!==1?'s':''})`;
  if(omitidas > 0) msg += ` · ${omitidas} omitida${omitidas!==1?'s':''}`;
  toast(msg, 'var(--green)', 5000);
}

async function abmEmpresaGuardar(){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede modificar empresas','var(--red)'); return; }
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const idStr  = gv('abm-emp-id');
  const nombre = gv('abm-emp-nom').toUpperCase();
  const cuit   = gv('abm-emp-cuit');
  if(!nombre){ toast('⚠ Ingresá el nombre de la empresa','var(--yellow)'); return; }
  if(!cuit){   toast('⚠ Ingresá el CUIT','var(--yellow)'); return; }
  // Validación CUIT: 11 dígitos con o sin guiones
  const cuitDigitos = cuit.replace(/\D/g,'');
  if(cuitDigitos.length !== 11){
    toast('⚠ CUIT inválido — debe tener 11 dígitos','var(--red)'); return;
  }
  const cuitFmt = `${cuitDigitos.slice(0,2)}-${cuitDigitos.slice(2,10)}-${cuitDigitos.slice(10)}`;

  // Prevenir duplicados por nombre (salvo edición del mismo registro)
  const existentes = await getEmpresasABM();
  const dup = existentes.find(x =>
    (x.nombre||'').trim().toUpperCase() === nombre &&
    String(x.id) !== String(idStr)
  );
  if(dup){ toast(`⚠ Ya existe una empresa con nombre "${nombre}"`,'var(--red)'); return; }

  // Validar que haya al menos un contrato ART con alícuota registrada
  const _artDataRaw = JSON.parse(document.getElementById('abm-emp-art-data')?.value || '[]');
  if(!_artDataRaw.length){
    toast('⚠ Registrá al menos un contrato ART para esta empresa', 'var(--yellow)');
    document.getElementById('abm-emp-art-vigente')?.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  // Verificar que al menos un contrato tenga alícuota cargada
  const _tieneAlicuota = _artDataRaw.some(c => c.alicuotas?.length > 0);
  if(!_tieneAlicuota){
    toast('⚠ El contrato ART debe tener al menos una alícuota registrada', 'var(--yellow)');
    document.getElementById('abm-emp-art-historico')?.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  // Verificar que haya un contrato activo con alícuota vigente HOY
  const _hoyIso = new Date().toISOString().slice(0,10);
  const _contratoActivo = (typeof resolveContratoArtActivo === 'function')
    ? resolveContratoArtActivo(_artDataRaw, _hoyIso)
    : null;
  if(!_contratoActivo){
    const _cfmArt = await showConfirm({
      titulo: 'Sin ART vigente',
      mensaje: `No hay un contrato ART activo a la fecha de hoy.<br><br>Verificá las fechas de inicio/fin del contrato.<br><br>¿Guardás igual?`,
      labelOk: 'Guardar igual', peligroso: false
    });
    if(!_cfmArt) return;
  }

  // Validar CBU origen si fue cargado (puede quedar vacío sin problemas)
  const cbuOrigenRaw = gv('abm-emp-cbu').replace(/\D/g, '');

  if(cbuOrigenRaw){
    const v = (typeof validarCBU === 'function') ? validarCBU(cbuOrigenRaw) : { ok: true };
    if(!v.ok){
      toast('⚠ CBU origen inválido: ' + v.error,'var(--red)', 4500); return;
    }
  }

  const rec = {
    nombre,
    cuit: cuitFmt,
    dir:   gv('abm-emp-dir'),
    nro:   gv('abm-emp-nro'),
    piso:  gv('abm-emp-piso'),
    depto: gv('abm-emp-depto'),
    loc:   gv('abm-emp-loc'),
    cp:    gv('abm-emp-cp'),
    logoDataUrl:  document.getElementById('abm-emp-logo-data').value  || null,
    firmaDataUrl: document.getElementById('abm-emp-firma-data').value || null,
    // Cuenta bancaria origen
    cbuOrigen:        cbuOrigenRaw,
    bancoOrigen:      cbuOrigenRaw && typeof bancoDesdeCBU === 'function' ? bancoDesdeCBU(cbuOrigenRaw) : '',
    tipoCuentaOrigen: gv('abm-emp-tipo-cuenta') || 'CC',
    aliasOrigen:      gv('abm-emp-alias').trim(),

    art:     JSON.parse(document.getElementById('abm-emp-art-data')?.value || '[]'),
    centros: _getCentrosFromHidden(),
    actualizadaEl: new Date().toISOString(),
    actualizadaPor: currentUser?.emp?.nom || null
  };
  if(idStr){ rec.id = parseInt(idStr, 10); }
  else     { rec.creadaEl = new Date().toISOString(); }

  try {
    await saveEmpresaABM(rec);
    await _refreshEmpresasABMCache();
    toast(idStr ? '✓ Empresa actualizada' : '✓ Empresa creada','var(--green)');
    abmEmpresaCancelar();
    renderAbmEmpresasLista();
  } catch(e){
    console.error(e);
    toast('⚠ Error al guardar: ' + (e?.message || e),'var(--red)');
  }
}

async function abmEmpresaEliminar(id){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede eliminar empresas','var(--red)'); return; }
  const lista = await getEmpresasABM();
  const rec = lista.find(x=>x.id===id);
  if(!rec){ toast('⚠ Empresa no encontrada','var(--red)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar la personalización de "${rec.nombre}"?<br><br>No se eliminará la empresa del sistema (seguirá usando los datos por defecto), pero se perderán el logo, la firma y el resto de los datos personalizados.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  await deleteEmpresaABM(id);
  await _refreshEmpresasABMCache();
  toast('Empresa eliminada','var(--t3)');
  renderAbmEmpresasLista();
}

function renderAbmLista(){
  const wrap=document.getElementById('abm-lista-wrap');
  const cnt =document.getElementById('abm-lista-count');
  if(!wrap) return;
  const q      =(document.getElementById('abm-search')?.value||'').toLowerCase();
  const estado =document.getElementById('abm-filtro-estado')?.value||'activos';
  const empresa=document.getElementById('abm-filtro-emp')?.value||'';
  let lista = getNomina();
  if(estado==='activos') lista=lista.filter(e=>!e._deBaja&&!e.egreso);
  if(estado==='bajas')   lista=lista.filter(e=>e._deBaja||e.egreso);
  if(empresa) lista=lista.filter(e=>e.emp===empresa);
  if(q) lista=lista.filter(e=>e.nom.toLowerCase().includes(q)||(e.legNum||e.leg||'').includes(q)||e.leg.includes(q)||(e.dni||'').includes(q)||(e.emp||'').toLowerCase().includes(q));
  lista.sort((a,b)=>a.nom.localeCompare(b.nom));
  if(!lista.length){
    wrap.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">Sin resultados</div>';
    if(cnt) cnt.textContent='0 empleados';
    return;
  }
  const fD=iso=>{ if(!iso)return'—'; const p=iso.split('-'); return`${p[2]}/${p[1]}/${p[0]}`; };
  // Stats CBU para mostrar en el contador
  const stats = (typeof getCBUStats === 'function') ? getCBUStats() : null;
  wrap.innerHTML = `<div style="display:grid;grid-template-columns:80px 1fr 120px 120px 70px 100px 80px;padding:6px 18px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">
    <span>Legajo</span><span>Empleado</span><span>Ingreso</span><span>Egreso</span><span>Estado</span><span>CBU</span><span></span>
  </div>`+lista.map(e=>{
    const baja=e._deBaja||e.egreso;
    const ingStr=e.ing?(e.ing.includes('-')?fD(e.ing):e.ing):'—';
    const egrStr=e.egreso?fD(e.egreso):'—';
    // Indicador CBU
    let cbuChip = '';
    if(typeof getCBUsActivos === 'function'){
      const activos = getCBUsActivos(e.leg);
      if(activos.length === 0){
        cbuChip = `<span style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid var(--border);color:var(--t3)">— sin cargar</span>`;
      } else if(activos.length === 1){
        const cb = activos[0];
        const v = (typeof validarCBU === 'function') ? validarCBU(cb.cbu) : { ok: true };
        if(v.ok) cbuChip = `<span title="${cb.banco} · ${cb.tipoCuenta==='CC'?'Cta. Cte.':'C.A.'}" style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid rgba(34,197,94,.3);color:var(--green);font-family:var(--font-mono)">✓ ${(cb.banco||'').slice(0,12)}</span>`;
        else      cbuChip = `<span title="${v.error}" style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid rgba(239,68,68,.3);color:var(--red)">⚠ inválido</span>`;
      } else {
        const suma = activos.reduce((s,c)=>s+Number(c.porcentaje||0),0);
        const sumaOk = Math.abs(suma-100) < 0.01;
        cbuChip = `<span title="${activos.length} cuentas activas — ${suma.toFixed(2)}%" style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid ${sumaOk?'rgba(34,197,94,.3)':'rgba(239,68,68,.3)'};color:${sumaOk?'var(--green)':'var(--red)'};font-family:var(--font-mono)">⚌ ${activos.length} cuentas</span>`;
      }
    }
    return`<div style="display:grid;grid-template-columns:80px 1fr 120px 120px 70px 100px 80px;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border);gap:6px;${baja?'opacity:.55':''}">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3)">${e.legNum||e.leg}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;overflow:hidden;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">
          ${e.foto
            ? `<img src="${e.foto}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`
            : `<span style="font-size:11px;font-weight:700;color:var(--t3);font-family:var(--font-mono)">${e.nom.split(',')[0].trim().substring(0,2).toUpperCase()}</span>`
          }
        </div>
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--t1)">${e.nom}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${e.emp||''} · ${e.lugar||''}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${ingStr}</div>
      <div style="font-size:11px;color:${baja?'var(--red)':'var(--t3)'};font-family:var(--font-mono)">${baja?egrStr:'—'}</div>
      <div><span style="font-size:10px;padding:2px 7px;border-radius:8px;border:1px solid ${baja?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)'};color:${baja?'var(--red)':'var(--green)'}">${baja?'Baja':'Activo'}</span></div>
      <div>${cbuChip}</div>
      <div style="text-align:right"><button class="btn btn-ghost" style="font-size:11px;padding:3px 10px" onclick="abmEditarEmpleado('${e.leg}')">✎ Editar</button></div>
    </div>`;
  }).join('');
  if(cnt){
    let txt = `${lista.length} empleado${lista.length!==1?'s':''}`;
    if(stats) txt += ` · ${stats.conCBU}/${stats.total} con CBU`;
    cnt.textContent = txt;
  }
}

function setVal(id, v){ const el=document.getElementById(id); if(el) el.value=v||''; }

async function abmEditarEmpleado(leg){
  const e=getNomina().find(x=>x.leg===leg); if(!e) return;
  const bj=getAbmBajas();
  setVal('abm-e-leg-orig', leg); setVal('abm-e-leg', leg);
  setVal('abm-e-dni', e.dni); setVal('abm-e-cuil', e.cuil);
  setVal('abm-e-nom', e.nom); setVal('abm-e-lugar', e.lugar);
  setVal('abm-e-cat', e.cat); setVal('abm-e-tramo', e.tramo);
  setVal('abm-e-titulo', e.titulo || '');
  setVal('abm-e-titulo-desc', e.titulo_desc || '');
  // Cargar foto de perfil
  setTimeout(() => abmCargarFotoEnForm(leg), 50);
  // Poblar select de sindicato y preseleccionar el valor actual (maneja aliases)
  poblarSelectoresSindicato(e.cod_sindicato || '');
  // Poblar y seleccionar categoría de convenio (depende del sindicato)
  setTimeout(() => {
    abmActualizarCatConvenioPicker();
    if(e.cat_convenio) setVal('abm-e-cat-convenio', e.cat_convenio);
    abmOnCatConvenioChange();
  }, 80);
  setVal('abm-e-nac', e.fecha_nac||'');
  setVal('abm-e-bruto', e.bruto||''); setVal('abm-e-neto', e.neto||'');
  setVal('abm-e-mail', e.mail||'');
  setVal('abm-e-telefono', e.telefono||'');
  setVal('abm-e-tarea',               e.tarea||'');
  setVal('abm-e-centro-operaciones',  e.centro_operaciones||'');
  setVal('abm-e-sector',              e.sector||'');
  setVal('abm-e-centro-costos',       e.centro_costos||'');
  setVal('abm-e-centro-costos-nuevo', e.centro_costos_nuevo||'');
  setVal('abm-e-basico', e.basico||'');
  setVal('abm-e-acuenta', e.a_cuenta||'');
  setTimeout(abmRecalcComplemento, 50);
  // Fecha ingreso → YYYY-MM-DD
  let ing=e.ing||'';
  if(ing&&ing.includes('/')){const p=ing.split('/');ing=p.length===3?`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`:''}
  setVal('abm-e-ing', ing);
  setVal('abm-e-egreso', bj[leg]?.fecha||'');
  // Selects
  const selEmp=document.getElementById('abm-e-emp'); if(selEmp) selEmp.value=e.emp||'';
  const selEC=document.getElementById('abm-e-estado-civil'); if(selEC) selEC.value=e.estado_civil||'';
  const selCond=document.getElementById('abm-e-condicion'); if(selCond) selCond.value=e.condicion||'';
  // Domicilio
  const dom=DOMICILIOS[leg]||{};
  let cV='',nV='',piV='',dpV='',loV='',prV='',cpV='';
  if(dom.calle !== undefined){
    cV=dom.calle||''; nV=dom.nro||''; piV=dom.piso||''; dpV=dom.depto||'';
    loV=dom.loc||''; prV=dom.prov||''; cpV=dom.cp||'';
  } else {
    if(dom.dom){
      const m=dom.dom.match(/^(.*?)\s+(\d[\w]*)(?:\s+Piso\s+(\S+))?(?:\s+Dto\s+(\S+))?$/);
      if(m){cV=m[1];nV=m[2];piV=m[3]||'';dpV=m[4]||'';}else cV=dom.dom;
    }
    if(dom.ciudad){
      const mc=dom.ciudad.match(/^(.+?),\s*(.+?)\s*(?:\((\d+)\))?$/);
      if(mc){loV=mc[1];prV=mc[2];cpV=mc[3]||'';}else loV=dom.ciudad;
    }
  }
  setVal('abm-e-calle',cV); setVal('abm-e-nro',nV); setVal('abm-e-piso',piV);
  setVal('abm-e-depto',dpV); setVal('abm-e-loc',loV); setVal('abm-e-prov',prV); setVal('abm-e-cp',cpV);

  // Cuentas bancarias — render N-CBUs con vigencias y porcentajes
  if(typeof renderCBUsDeLegajo === 'function'){
    renderCBUsDeLegajo(leg, e.nom, 'abm-e-cbus-content', 'RRHH');
  }

  // Fecha efectiva por defecto: hoy
  setVal('abm-e-fecha-cambio', new Date().toISOString().slice(0,10));
  setVal('abm-e-motivo-cambio','');

  // ── Dependencia jerárquica ──
  poblarSelectoresValidador(leg);
  // Si tiene validador manual (override), lo seteamos
  setVal('abm-e-validador', e.validador || '');
  setVal('abm-e-area', e.areaOrg || e.area || '');
  // Mostrar qué valida automáticamente (para referencia)
  const vDetectado = getValidador({...e, validador:null, areaOrg:null}); // forzar auto
  const infoDiv = document.getElementById('abm-e-validador-actual');
  if(infoDiv && vDetectado){
    infoDiv.textContent = `Detección automática: ${vDetectado.validador} (${vDetectado.area}).`;
  }

  // Cargar historial del empleado
  await renderHistorialEmpleadoABM(leg);
  if(typeof _etActualizarBadgeFicha === 'function') _etActualizarBadgeFicha(leg);
  if(typeof _benActualizarBadgeFicha === 'function') _benActualizarBadgeFicha(leg);

  const et=document.getElementById('abm-tab-editar');
  if(et) et.style.display='inline-block';
  const tit=document.getElementById('abm-edit-title');
  if(tit) tit.textContent='Modificar: '+e.nom;
  abmTab('editar');
}

// Muestra licencias del empleado actualmente editado en ABM
function renderAbmLicenciasEmpleado(){
  const leg = document.getElementById('abm-e-leg-orig')?.value;
  if(!leg) return;
  renderHistorialLicenciasUI('abm-lic-content', leg, { anio: new Date().getFullYear() });
}

async function renderHistorialEmpleadoABM(leg){
  const cont = document.getElementById('abm-hist-content');
  const cnt  = document.getElementById('abm-hist-count');
  if(!cont) return;
  const historial = await getHistorialEmpleado(leg);
  if(cnt) cnt.textContent = historial.length ? `(${historial.length} registro${historial.length!==1?'s':''})` : '(sin registros)';
  if(!historial.length){
    cont.innerHTML = `<div style="padding:14px;color:var(--t3);font-size:12px;text-align:center;font-style:italic">Todavía no hay cambios registrados en el historial para este empleado.</div>`;
    return;
  }
  // Agrupar por campo
  const porCampo = {};
  historial.forEach(h => {
    if(!porCampo[h.campo]) porCampo[h.campo] = [];
    porCampo[h.campo].push(h);
  });
  const fmtD = iso => { if(!iso) return 'vigente'; const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; };
  const partes = [];
  for(const c of CAMPOS_HISTORIAL){
    const regs = porCampo[c.key];
    if(!regs) continue;
    regs.sort((a,b) => (b.desde||'').localeCompare(a.desde||''));
    const rows = regs.map(r => {
      const render = c.render ? c.render : (v => v == null ? '—' : String(v));
      const vigente = !r.hasta;
      return `<div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:flex-start;font-size:11px;line-height:1.5">
        <div style="min-width:160px;font-family:var(--font-mono);color:${vigente?'var(--green)':'var(--t3)'};font-size:10px">
          ${fmtD(r.desde)} → ${fmtD(r.hasta)}${vigente?' <span style="font-weight:600">✓ vigente</span>':''}
        </div>
        <div style="flex:1">
          <div style="color:var(--t1)">${render(r.valorNuevo)}</div>
          ${r.valorAnterior != null && JSON.stringify(r.valorAnterior) !== '{}' ? `<div style="color:var(--t3);font-size:10px;margin-top:2px">anterior: ${render(r.valorAnterior)}</div>` : ''}
          ${r.motivo ? `<div style="color:var(--t3);font-size:10px;margin-top:2px;font-style:italic">Motivo: ${r.motivo}</div>` : ''}
          <div style="color:var(--t3);font-size:9px;margin-top:2px;font-family:var(--font-mono)">Registrado por ${r.usuario||'—'} el ${(r.fechaRegistro||'').slice(0,10)}</div>
        </div>
      </div>`;
    }).join('');
    partes.push(`<div style="margin-top:10px">
      <div style="padding:6px 10px;background:var(--bg1);border:1px solid var(--border);border-radius:4px;font-size:11px;font-weight:600;color:var(--t1);margin-bottom:4px">${c.icon||'•'} ${c.label}</div>
      ${rows}
    </div>`);
  }
  cont.innerHTML = partes.join('');
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZAR HISTORIAL PARA NÓMINA EXISTENTE
// Operación única que crea un registro inicial por cada empleado/campo
// usando la fecha de ingreso como "desde" y el valor actual como "valorNuevo"
// ═══════════════════════════════════════════════════════════════

// Parsea la fecha de ingreso en cualquier formato y devuelve YYYY-MM-DD
function _parseIngresoISO(ing){
  if(!ing) return null;
  if(/^\d{4}-\d{2}-\d{2}/.test(ing)) return ing.slice(0,10);
  if(ing.includes('/')){
    const p = ing.split('/').map(x => x.trim());
    if(p.length === 3){
      const [d,m,y] = p;
      if(d && m && y) return `${y.length===2?'20'+y:y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }
  return null;
}

// Extrae el valor actual de un empleado para un campo (soportando compound)
async function _valorActualEmpleado(emp, c){
  if(c.compound){
    const v = {};
    if(c.key === 'domicilio'){
      const dom = DOMICILIOS[emp.leg] || {};
      c.fields.forEach(f => {
        const subKey = f.replace('dom_','');
        // Prioridad: DOMICILIOS, luego emp
        const val = (dom[f] !== undefined ? dom[f] : (dom[subKey] !== undefined ? dom[subKey] : emp[f]));
        if(val !== undefined && val !== null && val !== '') v[f] = val;
      });
    } else {
      c.fields.forEach(f => {
        if(emp[f] !== undefined && emp[f] !== null && emp[f] !== '') v[f] = emp[f];
      });
    }
    return Object.keys(v).length ? v : null;
  } else {
    const val = emp[c.key];
    return (val === undefined || val === null || val === '') ? null : val;
  }
}

async function abrirInicializarHistorial(){
  // Preview: contar cuánto habría que crear
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  let pCrear = 0, pExist = 0, pOmit = 0, pSinFecha = 0;

  for(const emp of nomina){
    const desde = _parseIngresoISO(emp.ing);
    if(!desde) pSinFecha++;
    for(const c of CAMPOS_HISTORIAL){
      const existente = await getHistorialEmpleado(emp.leg, c.key);
      if(existente.length > 0){ pExist++; continue; }
      const valor = _valorActualEmpleado(emp, c);
      if(valor === null){ pOmit++; continue; }
      pCrear++;
    }
  }

  const overlay = document.createElement('div');
  overlay.id = 'init-hist-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:24px;max-width:620px;width:100%">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--t1)">📜 Inicializar historial de empleados</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:3px">Operación única — se salta los empleados/campos con historial ya existente</div>
        </div>
        <button onclick="document.getElementById('init-hist-modal').remove()" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>

      <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
        <div style="font-size:12px;font-weight:600;color:var(--t1);margin-bottom:10px">Vista previa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
          <div style="padding:8px 12px;background:var(--bg1);border-radius:4px">
            <div style="color:var(--t3);font-size:10px;font-family:var(--font-mono);text-transform:uppercase">Empleados activos</div>
            <div style="font-size:16px;font-weight:600;color:var(--t1);margin-top:2px">${nomina.length}</div>
          </div>
          <div style="padding:8px 12px;background:var(--bg1);border-radius:4px">
            <div style="color:var(--t3);font-size:10px;font-family:var(--font-mono);text-transform:uppercase">A crear</div>
            <div style="font-size:16px;font-weight:600;color:var(--green);margin-top:2px">${pCrear} registro${pCrear!==1?'s':''}</div>
          </div>
          <div style="padding:8px 12px;background:var(--bg1);border-radius:4px">
            <div style="color:var(--t3);font-size:10px;font-family:var(--font-mono);text-transform:uppercase">Ya existen</div>
            <div style="font-size:16px;font-weight:600;color:var(--accent2);margin-top:2px">${pExist}</div>
          </div>
          <div style="padding:8px 12px;background:var(--bg1);border-radius:4px">
            <div style="color:var(--t3);font-size:10px;font-family:var(--font-mono);text-transform:uppercase">Sin valor</div>
            <div style="font-size:16px;font-weight:600;color:var(--t3);margin-top:2px">${pOmit}</div>
          </div>
        </div>
        ${pSinFecha ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.2);border-radius:4px;font-size:11px;color:var(--yellow)">
          ⚠ ${pSinFecha} empleado${pSinFecha!==1?'s':''} sin fecha de ingreso cargada — se usará la fecha alternativa indicada abajo.
        </div>` : ''}
      </div>

      <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Fecha alternativa (si no hay ingreso)</label>
            <input type="date" id="init-hist-fecha-alt" value="${new Date().toISOString().slice(0,10)}" style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
          </div>
          <div>
            <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Motivo del registro inicial</label>
            <input id="init-hist-motivo" value="Registro inicial al activar historial" style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:12px;outline:none">
          </div>
        </div>
      </div>

      <div style="padding:12px 14px;background:rgba(168,85,247,.06);border:1px solid rgba(168,85,247,.25);border-radius:4px;margin-bottom:14px;font-size:11px;color:var(--t2);line-height:1.6">
        Esta operación <strong>no modifica</strong> ningún valor actual. Solo crea registros históricos con el valor presente marcado como vigente desde la fecha de ingreso de cada empleado. Si ya existen registros para un empleado/campo, se los respeta.
      </div>

      <div id="init-hist-progress" style="display:none;padding:12px 14px;background:var(--bg2);border-radius:4px;margin-bottom:14px;font-size:12px;font-family:var(--font-mono);color:var(--t2)"></div>

      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('init-hist-modal').remove()" class="btn btn-ghost" style="font-size:12px;padding:7px 14px">Cancelar</button>
        <button id="init-hist-exec" onclick="ejecutarInicializarHistorial()" class="btn btn-primary" style="font-size:12px;padding:7px 14px" ${pCrear===0?'disabled':''}>✓ Crear ${pCrear} registros</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

async function ejecutarInicializarHistorial(){
  const fechaAlt = document.getElementById('init-hist-fecha-alt')?.value || new Date().toISOString().slice(0,10);
  const motivo   = document.getElementById('init-hist-motivo')?.value?.trim() || 'Registro inicial al activar historial';
  const btn = document.getElementById('init-hist-exec');
  const prog = document.getElementById('init-hist-progress');
  if(btn){ btn.disabled = true; btn.textContent = 'Procesando...'; }
  if(prog) prog.style.display = 'block';

  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const usuario = currentUser?.emp?.nom || 'Sistema (inicial)';
  let creados = 0, existentes = 0, omitidos = 0, errores = 0;

  for(let i=0; i<nomina.length; i++){
    const emp = nomina[i];
    if(prog && (i % 10 === 0)) prog.textContent = `Procesando ${i+1}/${nomina.length} — ${emp.nom}...`;

    const desde = _parseIngresoISO(emp.ing) || fechaAlt;

    for(const c of CAMPOS_HISTORIAL){
      try {
        const existente = await getHistorialEmpleado(emp.leg, c.key);
        if(existente.length > 0){ existentes++; continue; }

        const valor = _valorActualEmpleado(emp, c);
        if(valor === null){ omitidos++; continue; }

        await addHistorialRecord({
          leg: emp.leg,
          campo: c.key,
          valorAnterior: null,
          valorNuevo: valor,
          desde,
          hasta: null,
          motivo,
          usuario,
          fechaRegistro: new Date().toISOString(),
          liqImpactada: null
        });
        creados++;
      } catch(e){
        console.warn('Error inicializando', emp.leg, c.key, e);
        errores++;
      }
    }
    // Yield al event loop cada 5 empleados para no bloquear UI
    if(i % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  if(prog) prog.innerHTML = `<span style="color:var(--green)">✓ Finalizado.</span> ${creados} creados · ${existentes} ya existían · ${omitidos} omitidos (sin valor)${errores?` · <span style="color:var(--red)">${errores} errores</span>`:''}`;
  if(btn){ btn.textContent = '✓ Cerrar'; btn.disabled = false; btn.onclick = () => document.getElementById('init-hist-modal').remove(); }
  toast(`✓ Historial inicializado · ${creados} registros creados`,'var(--green)',5000);
}

function gV(id){ const el=document.getElementById(id); return el?el.value.trim():''; }


// ── Complemento Función — recálculo en tiempo real en el formulario ABM ──────
// _abmComplementoCalculado: lee DOM → arma emp mock → delega en calcCFMensual (global)
function _abmComplementoCalculado(){
  const basico  = parseFloat(document.getElementById('abm-e-basico')?.value)  || 0;
  if(!basico) return null;
  const aCuenta    = parseFloat(document.getElementById('abm-e-acuenta')?.value) || 0;
  const cat        = (document.getElementById('abm-e-cat')?.value   || '').trim().toUpperCase();
  const tramo      = (document.getElementById('abm-e-tramo')?.value || '').trim().toUpperCase();
  const titulo     = document.getElementById('abm-e-titulo')?.value || '';
  const codSindicato = document.getElementById('abm-e-sindicato')?.value || '';
  if(!cat && !tramo) return null;
  if(typeof calcCFMensual !== 'function') return null;
  const params = (typeof getLiqParams === 'function') ? getLiqParams() : null;
  const cf = calcCFMensual({ basico, a_cuenta: aCuenta, cat, tramo, complemento: 0,
                              titulo, cod_sindicato: codSindicato }, params);
  return cf > 0 ? cf : null;
}

// abmRecalcComplemento: actualiza el display leyendo el resultado de _abmComplementoCalculado
function abmRecalcComplemento(){
  const el = document.getElementById('abm-e-comp-calc');
  if(!el) return;
  const basico  = parseFloat(document.getElementById('abm-e-basico')?.value)  || 0;
  const aCuenta = parseFloat(document.getElementById('abm-e-acuenta')?.value) || 0;
  const cat     = (document.getElementById('abm-e-cat')?.value   || '').trim().toUpperCase();
  const tramo   = (document.getElementById('abm-e-tramo')?.value || '').trim().toUpperCase();
  const fmt     = n => '$ ' + Math.round(n).toLocaleString('es-AR');

  if(!basico)         { el.textContent = '— (cargá básico)';                    el.style.color='var(--t3)'; return; }
  if(!cat && !tramo)  { el.textContent = '— (cargá categoría / tramo)';          el.style.color='var(--t3)'; return; }

  const escala = (typeof getMontoEscala === 'function') ? getMontoEscala(cat, tramo) : null;
  if(!escala || escala <= 0){
    el.textContent = `— (sin escala para ${cat}${tramo?' / '+tramo:''})`;
    el.style.color = 'var(--t3)'; return;
  }

  const comp    = _abmComplementoCalculado();
  const params  = (typeof getLiqParams === 'function') ? getLiqParams() : null;
  const pctPres = params?.pctPresentismo ?? 5;

  // Monto de título para mostrar en el desglose
  const titulo   = document.getElementById('abm-e-titulo')?.value || '';
  const codSind  = document.getElementById('abm-e-sindicato')?.value || '';
  const tieneAdTit = (typeof getSindicatoByCodigo === 'function')
    ? !!(getSindicatoByCodigo(codSind)?.tiene_adicional_titulo)
    : false;
  const mTit = (tieneAdTit && titulo && typeof getMontoAdicionalTitulo === 'function')
    ? (getMontoAdicionalTitulo(titulo) || 0) : 0;

  const base = basico + aCuenta + mTit;

  if(comp === null || comp === 0){
    if(escala > 0 && base * (1 + pctPres/100) >= escala){
      el.innerHTML   = `<span style="color:var(--yellow)">⚠ Básico + A Cuenta + Título supera la escala — CF = $ 0</span>`;
    } else {
      el.innerHTML   = `<span style="color:var(--t3)">— (sin datos suficientes)</span>`;
    }
    el.style.color = 'var(--yellow)';
  } else {
    const brutoTotal = basico + aCuenta + mTit + comp;
    el.innerHTML = `${fmt(comp)}<span style="font-size:10px;color:var(--t3);margin-left:10px">` +
      `Escala: ${fmt(escala)}` +
      (mTit>0 ? ` · Título: ${fmt(mTit)}` : '') +
      ` · Base: ${fmt(base)}` +
      ` · Bruto: ${fmt(brutoTotal)}` +
      ` · Pres: ${pctPres}%</span>`;
    el.style.color = 'var(--accent2)';
  }
}

// ─── Próximo legajo disponible ────────────────────────────────────────────
// Toma todos los legajos existentes (nómina + altas + bajas) y retorna el
// siguiente número libre, formateado con padding de 6 dígitos.
function getProximoLegajo(){
  const todos = getNomina().map(e => parseInt(e.leg, 10)).filter(n => !isNaN(n));
  // También considerar altas pendientes
  const altas = getAbmAltas().map(e => parseInt(e.leg, 10)).filter(n => !isNaN(n));
  const todos2 = [...new Set([...todos, ...altas])];
  if(!todos2.length) return '000001';
  const max = Math.max(...todos2);
  return String(max + 1).padStart(6, '0');
}


function abmAltaEmpleado(){
  const leg=getProximoLegajo(), dni=gV('abm-n-dni'), cuil=gV('abm-n-cuil');
  const nom=gV('abm-n-nom').toUpperCase(), emp=gV('abm-n-emp');
  const lugar=gV('abm-n-lugar'), cat=gV('abm-n-cat').toUpperCase(), tramo=gV('abm-n-tramo').toUpperCase();
  const cod_sindicato = gV('abm-n-sindicato') || '';
  const ing=gV('abm-n-ing'), nac=gV('abm-n-nac');
  const bruto=parseFloat(gV('abm-n-bruto'))||0, neto=parseFloat(gV('abm-n-neto'))||0;
  const mail=gV('abm-n-mail');
  const validador = gV('abm-n-validador'), areaOrg = gV('abm-n-area');
  const centroOp      = gV('abm-n-centro-operaciones');
  const sector        = gV('abm-n-sector');
  const tarea         = gV('abm-n-tarea');
  const centroCostos  = gV('abm-n-centro-costos');
  const centroCostosN = gV('abm-n-centro-costos-nuevo');
  const calle=gV('abm-n-calle'), nro=gV('abm-n-nro'), piso=gV('abm-n-piso');
  const depto=gV('abm-n-depto'), loc=gV('abm-n-loc'), prov=gV('abm-n-prov'), cp=gV('abm-n-cp');
  if(!dni||!cuil||!nom||!emp||!ing){toast('⚠ Completá los campos obligatorios (*)','var(--yellow)');return;}
  if(!centroOp){
    toast('⚠ Centro de Operaciones es obligatorio','var(--yellow)');
    document.getElementById('abm-n-centro-operaciones')?.focus(); return;
  }
  if(!sector){
    toast('⚠ Sector es obligatorio','var(--yellow)');
    document.getElementById('abm-n-sector')?.focus(); return;
  }
  if(!tarea){
    toast('⚠ Tarea / Función es obligatoria','var(--yellow)');
    document.getElementById('abm-n-tarea')?.focus(); return;
  }
  if(!centroCostos){
    toast('⚠ Centro de Costos es obligatorio','var(--yellow)');
    document.getElementById('abm-n-centro-costos')?.focus(); return;
  }
  if(!centroCostosN){
    toast('⚠ Centro de Costos Nuevo es obligatorio','var(--yellow)');
    document.getElementById('abm-n-centro-costos-nuevo')?.focus(); return;
  }
  if(getNomina().find(e=>e.dni===dni)){toast(`⚠ DNI ${dni} ya existe`,'var(--yellow)');return;}
  const al=getAbmAltas();
  const nuevoEmp = {
    leg, dni, cuil, nom, emp, lugar, cat, tramo, ing, fecha_nac: nac,
    bruto, neto, lim: neto*0.5, mail, cod_sindicato,
    centro_operaciones:    centroOp,
    sector:                sector,
    tarea:                 tarea,
    centro_costos:         centroCostos,
    centro_costos_nuevo:   centroCostosN,
  };
  if(validador){ nuevoEmp.validador = validador; nuevoEmp.areaOrg = areaOrg || ''; }
  al.push(nuevoEmp);
  saveAbmAltas(al);
  // Domicilio
  const pts=[calle,nro].filter(Boolean);
  if(piso) pts.push('Piso '+piso); if(depto) pts.push('Dto '+depto);
  if(calle||loc) DOMICILIOS[leg]={
    dom:pts.join(' '), ciudad:`${loc}${prov?', '+prov:''}${cp?' ('+cp+')':''}`, mail,
    calle, nro, piso, depto, loc, prov, cp
  };
  if(nac&&/^\d{2}\/\d{2}$/.test(nac)) CUMPLE_DATA.push({leg,fecha:nac});
  const msgVal = validador ? ` · reporta a ${validador.split(',')[0]}` : '';
  toast(`✓ ${nom.split(',')[0]} dado de alta — legajo asignado: ${leg}${msgVal}`,'var(--green)',4000);
  ['abm-n-leg','abm-n-dni','abm-n-cuil','abm-n-nom','abm-n-lugar','abm-n-cat','abm-n-tramo',
   'abm-n-sindicato',
   'abm-n-ing','abm-n-nac','abm-n-bruto','abm-n-neto','abm-n-mail','abm-n-validador','abm-n-area',
   'abm-n-centro-operaciones','abm-n-sector','abm-n-tarea','abm-n-centro-costos','abm-n-centro-costos-nuevo',
   'abm-n-calle','abm-n-nro','abm-n-piso','abm-n-depto','abm-n-loc','abm-n-prov','abm-n-cp']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('abm-n-emp').value='';
  abmTab('lista');
}

async function abmGuardarEdicion(){
  const leg=gV('abm-e-leg-orig'), nom=gV('abm-e-nom').toUpperCase(), emp=gV('abm-e-emp');
  if(!nom||!emp){toast('⚠ Nombre y empresa son obligatorios','var(--yellow)');return;}

  // ── Capturar snapshot ANTERIOR para comparar con el nuevo ──
  const empAntes = (getNomina().find(e => e.leg === leg)) || {};
  const fechaCambio = gV('abm-e-fecha-cambio') || new Date().toISOString().slice(0,10);
  const motivoCambio = gV('abm-e-motivo-cambio') || 'Edición ABM';

  const ov=getAbmOverrides();
  ov[leg]={nom,emp,lugar:gV('abm-e-lugar'),cat:gV('abm-e-cat').toUpperCase(),tramo:gV('abm-e-tramo').toUpperCase(),
    ing:gV('abm-e-ing'),fecha_nac:gV('abm-e-nac'),
    bruto:parseFloat(gV('abm-e-bruto'))||0, neto:parseFloat(gV('abm-e-neto'))||0,
    lim:(parseFloat(gV('abm-e-neto'))||0)*0.5, mail:gV('abm-e-mail'),
    dni:gV('abm-e-dni'), cuil:gV('abm-e-cuil'),
    telefono: gV('abm-e-telefono'), tarea: gV('abm-e-tarea'), estado_civil: gV('abm-e-estado-civil'),
    centro_operaciones:    gV('abm-e-centro-operaciones'),
    sector:                gV('abm-e-sector'),
    centro_costos:         gV('abm-e-centro-costos'),
    centro_costos_nuevo:   gV('abm-e-centro-costos-nuevo'),
    basico: parseFloat(gV('abm-e-basico'))||0,
    a_cuenta: parseFloat(gV('abm-e-acuenta'))||0,
    complemento: _abmComplementoCalculado()||0,
    condicion: gV('abm-e-condicion'),
    cod_sindicato: gV('abm-e-sindicato') || '',
    cat_convenio:  gV('abm-e-cat-convenio') || '',
    titulo:        gV('abm-e-titulo') || '',
    titulo_desc:   gV('abm-e-titulo-desc').trim() || '',
    foto:          abmGetFotoParaGuardar(leg),
    validador: gV('abm-e-validador') || null, areaOrg: gV('abm-e-area') || null};
  saveAbmOverrides(ov);
  // Altas: actualizar también
  const al=getAbmAltas(); const ai=al.findIndex(e=>e.leg===leg);
  if(ai>=0){al[ai]={...al[ai],...ov[leg]};saveAbmAltas(al);}
  // Domicilio
  const calle=gV('abm-e-calle'),nro=gV('abm-e-nro'),piso=gV('abm-e-piso'),depto=gV('abm-e-depto');
  const loc=gV('abm-e-loc'),prov=gV('abm-e-prov'),cp=gV('abm-e-cp');
  if(calle||loc){
    const pts=[calle,nro].filter(Boolean);
    if(piso) pts.push('Piso '+piso); if(depto) pts.push('Dto '+depto);
    DOMICILIOS[leg]={
      dom:pts.join(' '), ciudad:`${loc}${prov?', '+prov:''}${cp?' ('+cp+')':''}`, mail:gV('abm-e-mail'),
      calle, nro, piso, depto, loc, prov, cp
    };
  }
  // Baja
  const egreso=gV('abm-e-egreso');
  const bj=getAbmBajas();
  if(egreso){ bj[leg]={fecha:egreso}; saveAbmBajas(bj); toast(`✓ Baja registrada — egreso ${egreso.split('-').reverse().join('/')}`,'var(--red)'); }
  else { delete bj[leg]; saveAbmBajas(bj); }

  // Las cuentas bancarias se gestionan desde el panel de CBUs dentro de la ficha del empleado.
  // El modal de agregar/editar cuenta usa actor='RRHH' y persiste al instante sin generar novedad.
  // Cumpleaños
  const nac=gV('abm-e-nac');
  if(nac&&/^\d{2}\/\d{2}$/.test(nac)){const ci=CUMPLE_DATA.findIndex(c=>c.leg===leg);if(ci>=0)CUMPLE_DATA[ci].fecha=nac;else CUMPLE_DATA.push({leg,fecha:nac});}

  // ── Registrar los cambios en el historial ──
  // Armar snapshot DESPUÉS con los campos que pudieron cambiar
  const empDespues = {
    leg, nom, emp,
    lugar: gV('abm-e-lugar'),
    cat: gV('abm-e-cat').toUpperCase(),
    tramo: gV('abm-e-tramo').toUpperCase(),
    cat_convenio: gV('abm-e-cat-convenio') || '',
    titulo: gV('abm-e-titulo') || '',
    titulo_desc: gV('abm-e-titulo-desc').trim() || '',
    tarea: gV('abm-e-tarea'),
    centro_operaciones:  gV('abm-e-centro-operaciones'),
    sector:              gV('abm-e-sector'),
    centro_costos:       gV('abm-e-centro-costos'),
    centro_costos_nuevo: gV('abm-e-centro-costos-nuevo'),
    estado_civil: gV('abm-e-estado-civil'),
    mail: gV('abm-e-mail'),
    telefono: gV('abm-e-telefono'),
    basico: parseFloat(gV('abm-e-basico'))||0,
    a_cuenta: parseFloat(gV('abm-e-acuenta'))||0,
    complemento: _abmComplementoCalculado()||0,
    condicion: gV('abm-e-condicion'),
    cod_convenio: empAntes.cod_convenio, // no editables en este form
    cod_os: empAntes.cod_os, cod_sindicato: empAntes.cod_sindicato,
    // Domicilio expandido
    dom_calle: calle, dom_nro: nro, dom_piso: piso, dom_depto: depto,
    dom_loc: loc, dom_cp: cp, dom_prov: prov
  };
  let cambiosRegistrados = [];
  try {
    cambiosRegistrados = await registrarCambiosEmpleado(empAntes, empDespues, {
      desde: fechaCambio,
      motivo: motivoCambio,
      usuario: currentUser?.emp?.nom || 'RR.HH.'
    });
  } catch(e){ console.warn('Historial: error al registrar cambios', e); }

  const msg = cambiosRegistrados.length
    ? `✓ ${nom.split(',')[0]} actualizado · ${cambiosRegistrados.length} cambio${cambiosRegistrados.length!==1?'s':''} registrado${cambiosRegistrados.length!==1?'s':''} en historial`
    : `✓ ${nom.split(',')[0]} actualizado`;
  toast(msg, egreso ? 'var(--red)' : 'var(--green)', 3500);

  const et=document.getElementById('abm-tab-editar'); if(et) et.style.display='none';
  abmTab('lista');
}

function exportarNominaExcel(){
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);

  // Mapear CUMPLE_DATA por legajo
  const cumpleMap = {};
  for(const c of CUMPLE_DATA) cumpleMap[c.leg] = c.fecha;

  // ── Parser de domicilio ──────────────────────────────────────────
  // Separa un registro DOMICILIOS en sus 7 campos individuales.
  // Si ya tiene los campos separados (alta/modificación reciente) los usa directo.
  // Si no, parsea dom y ciudad.
  function parsearDom(dom){
    // Ya tiene campos individuales guardados
    if(dom.calle !== undefined) return {
      calle: dom.calle||'', nro: dom.nro||'', piso: dom.piso||'',
      depto: dom.depto||'', loc: dom.loc||'', prov: dom.prov||'', cp: dom.cp||''
    };

    // ── Parsear dom: "CALLE NUMERO [Piso X] [Dto Y]" ──
    let domStr  = (dom.dom   || '').trim();
    let ciudadStr = (dom.ciudad || '').trim();

    let piso = '', depto = '';

    // Extraer Piso
    const pisoM = domStr.match(/\bPiso\s+([^\s,]+)/i);
    if(pisoM){ piso = pisoM[1]; domStr = domStr.replace(pisoM[0],'').trim(); }

    // Extraer Dto / Depto / Departamento
    const dtoM = domStr.match(/\bDt?o?\.?\s+([^\s,]+)/i);
    if(dtoM){ depto = dtoM[1]; domStr = domStr.replace(dtoM[0],'').trim(); }

    // Separar número del nombre de calle:
    // El número es el último token numérico (puede tener letras: 1/2, KM, etc.)
    const nroM = domStr.match(/^(.*?)\s+(\d[\d/]*)\s*$/);
    let calle = '', nro = '';
    if(nroM){
      calle = nroM[1].trim();
      nro   = nroM[2].trim();
    } else {
      calle = domStr;
    }

    // ── Parsear ciudad: "LOCALIDAD, Provincia (CP)" ──
    let loc = '', prov = '', cp = '';
    const cpM = ciudadStr.match(/\((\d+)\)\s*$/);
    if(cpM){ cp = cpM[1]; ciudadStr = ciudadStr.replace(cpM[0],'').trim().replace(/,\s*$/,''); }
    const commaM = ciudadStr.match(/^([^,]+),\s*(.+)$/);
    if(commaM){ loc = commaM[1].trim(); prov = commaM[2].trim(); }
    else       { loc = ciudadStr; }

    return { calle, nro, piso, depto, loc, prov, cp };
  }

  // Encabezados — campos completos de transit.xlsx
  const cols = [
    'Legajo','CUIL','Apellido y Nombre','Empresa','Ubicación',
    'Categoría Unif.','Tramo','Condición','Tarea Habitual',
    'Fecha Ingreso','Fecha Nacimiento','Sexo','Estado Civil','Nacionalidad',
    'Sueldo Básico','A Cuenta Fut. Aumentos','Antigüedad ($)','Complemento Variable','No Rem.','Sueldo',
    'Total Asig. c/Antigüedad','Límite Adelanto',
    'E-mail',
    'Cód. Convenio','Desc. Categoría','Cód. Obra Social','Desc. Obra Social','Cód. Sindicato',
    'Calle','Número','Piso','Departamento','Torre','Bloque','Localidad','Provincia','Código Postal',
    'Centro de Operaciones','Sector','Tarea','Centro de Costos','Centro de Costos Nuevo'
  ];

  const fmtFecha = iso => {
    if(!iso) return '';
    if(iso.includes('-')){ const[y,m,d]=iso.split('-'); return`${d}/${m}/${y}`; }
    return iso;
  };

  const rows = nomina.sort((a,b)=>a.nom.localeCompare(b.nom)).map(e => {
    const domRaw = DOMICILIOS[e.leg] || {};
    const d      = parsearDom(domRaw);
    const fechaNac = e.fecha_nac || cumpleMap[e.leg] || '';
    return [
      e.leg,
      e.cuil  || '',
      e.nom   || '',
      e.emp   || '',
      e.lugar || '',
      e.cat   || '',
      e.tramo || '',
      e.condicion || '',
      e.tarea || '',
      fmtFecha(e.ing),
      fechaNac,
      e.sexo || '',
      e.estado_civil || '',
      e.nacionalidad || '',
      e.basico != null ? e.basico : '',
      e.a_cuenta != null ? e.a_cuenta : '',
      e.antiguedad_monto != null ? e.antiguedad_monto : '',
      e.complemento != null ? e.complemento : '',
      e.norem != null ? e.norem : '',
      e.sueldo != null ? e.sueldo : '',
      e.bruto != null ? e.bruto : '',
      e.lim   != null ? e.lim   : '',
      e.mail  || domRaw.mail || '',
      e.cod_convenio || '',
      e.desc_categoria || '',
      e.cod_os || '',
      e.desc_os || '',
      e.cod_sindicato || '',
      d.calle || e.dom_calle || '',
      d.nro   || e.dom_nro   || '',
      d.piso  || e.dom_piso  || '',
      d.depto || e.dom_depto || '',
      e.dom_torre  || d.torre  || '',
      e.dom_bloque || d.bloque || '',
      d.loc   || e.dom_loc   || '',
      d.prov  || e.dom_prov  || '',
      d.cp    || e.dom_cp    || ''
    ];
  });

  // Generar CSV con separador ; (compatible Excel español)
  const esc = v => {
    const s = String(v);
    return s.includes(';') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g,'""')}"` : s;
  };

  const csv = [cols, ...rows]
    .map(r => r.map(esc).join(';'))
    .join('\r\n');

  // BOM para que Excel reconozca UTF-8
  const bom  = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const hoy  = new Date().toLocaleDateString('es-AR').replace(/\//g,'-');
  a.href     = url;
  a.download = `nomina_activa_${hoy}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`✓ Nómina exportada — ${rows.length} empleados activos`, 'var(--green)');
}

// Descarga una plantilla .xlsx con los ENCABEZADOS EXACTOS que espera
// importarAltasMasivas() + una fila de ejemplo. Evita el desajuste de columnas
// con el export de nómina (que usa otros nombres y no incluye DNI).
function descargarPlantillaAltas(){
  const headers = [
    'Legajo*','DNI*','CUIL*','Apellido y Nombre*','Empresa*','Fecha Ingreso*',
    'Fecha Nacimiento','Ubicación','Categoría','Tramo','Sueldo Bruto','Sueldo Neto','E-mail',
    'Domicilio Calle','Número','Piso','Departamento','Localidad','Provincia','Código Postal'
  ];
  const ejemplo = [
    '001234','30111222','20-30111222-3','PEREZ, JUAN','LEITEN S.A.','01/06/2026',
    '15/03/1990','Planta Central','OPERARIO','A','1500000','1200000','juan.perez@leiten.com.ar',
    'Av. Siempreviva','742','','','Salta','Salta','4400'
  ];
  if(typeof XLSX === 'undefined'){
    // Fallback CSV (separado por ;)
    const csv = headers.join(';') + '\n' + ejemplo.join(';');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'plantilla_altas.csv';
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Altas');
  XLSX.writeFile(wb, 'plantilla_altas.xlsx');
}

function importarAltasMasivas(input){
  const file = input.files[0];
  if(!file){ return; }
  input.value = '';

  const reader = new FileReader();
  reader.onload = function(e){
   try{
    let rows = [];

    // Leer CSV o XLSX
    if(file.name.endsWith('.csv')){
      const text   = e.target.result;
      const lines  = text.split(/\r?\n/).filter(l=>l.trim());
      const sep    = lines[0].includes(';') ? ';' : ',';
      const header = lines[0].split(sep).map(h=>h.trim().replace(/[*]/g,'').trim());
      for(let i=1; i<lines.length; i++){
        const vals = lines[i].split(sep);
        if(!vals[0]?.trim()) continue;
        const obj  = {};
        header.forEach((h,j)=>{ obj[h]=vals[j]?.trim()||''; });
        rows.push(obj);
      }
    } else {
      // XLSX vía SheetJS (cargado inline en index.html: xlsx.full.min.js).
      // Se construyen las MISMAS filas (objetos keyed por encabezado) que el
      // path CSV, para que la validación y el alta de abajo funcionen igual.
      if(typeof XLSX === 'undefined'){
        toast('⚠ Lector de Excel no disponible. Guardá la plantilla como CSV (separado por ;) e importá ese archivo.', 'var(--yellow)');
        return;
      }
      try{
        const wb  = XLSX.read(e.target.result, { type:'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false, blankrows:false });
        if(!aoa.length){ toast('⚠ El archivo no contiene datos', 'var(--yellow)'); return; }
        const header = (aoa[0]||[]).map(h=>String(h).trim().replace(/[*]/g,'').trim());
        for(let i=1; i<aoa.length; i++){
          const vals = aoa[i] || [];
          if(!String(vals[0]??'').trim()) continue;
          const obj = {};
          header.forEach((h,j)=>{ obj[h] = String(vals[j]??'').trim(); });
          rows.push(obj);
        }
      }catch(errXlsx){
        console.error('Error al leer XLSX:', errXlsx);
        toast('⚠ No se pudo leer el Excel. Verificá que sea un .xlsx válido o usá CSV (separado por ;).', 'var(--red)');
        return;
      }
    }

    if(!rows.length){ toast('⚠ El archivo no contiene datos', 'var(--yellow)'); return; }

    const nomina = getNomina();
    const legSet = new Set(nomina.map(e=>makeUid(e.emp, e.legNum)));  // identidad = empresa+legajo
    const dniSet = new Set(nomina.map(e=>e.dni));
    const altas  = getAbmAltas();

    let ok = 0, dup = 0, err = 0;
    const errores = [];

    for(const r of rows){
      const leg  = (r['Legajo']||'').padStart(6,'0');
      const cuil = (r['CUIL']||'').trim();
      let   dni  = (r['DNI']||'').trim();
      // El DNI viene embebido en el CUIL (XX-DNI-D). Si la planilla no trae
      // columna DNI (p. ej. el export de nómina no la incluye), lo derivamos.
      if(!dni && cuil){
        const _d = cuil.replace(/\D/g,'');
        if(_d.length >= 11) dni = String(parseInt(_d.slice(2,10),10) || '').trim();
      }
      const nom  = (r['Apellido y Nombre']||'').trim().toUpperCase();
      const emp  = (r['Empresa']||'').trim();
      const ing  = (r['Fecha Ingreso']||'').trim();

      // Validaciones básicas
      if(!leg||!dni||!cuil||!nom||!emp||!ing){
        errores.push(`Legajo ${leg||'?'}: faltan campos obligatorios`);
        err++; continue;
      }
      // Identidad única = empresa + legajo (el legajo puede repetirse entre
      // empresas; lo que NO puede repetirse es el par empresa+legajo).
      const uid = makeUid(emp, leg);
      if(legSet.has(uid)){
        errores.push(`Legajo ${leg} en ${emp}: ya existe (ignorado)`);
        dup++; continue;
      }
      if(dniSet.has(dni)){
        errores.push(`DNI ${dni} (${nom}): ya existe (ignorado)`);
        dup++; continue;
      }

      const nac   = (r['Fecha Nacimiento']||'').trim();
      const bruto = parseFloat(r['Sueldo Bruto'])||0;
      const neto  = parseFloat(r['Sueldo Neto'])||0;

      altas.push({
        leg, dni, cuil, nom,
        emp,
        lugar:  (r['Ubicación']||'').trim(),
        cat:    (r['Categoría']||'').trim().toUpperCase(),
        tramo:  (r['Tramo']||'').trim().toUpperCase(),
        ing,
        fecha_nac: nac,
        bruto, neto, lim: neto * 0.5,
        mail:   (r['E-mail']||'').trim(),
        _esAlta: true
      });

      // Domicilio
      const calle = (r['Domicilio Calle']||'').trim();
      const nro   = (r['Número']||'').trim();
      const piso  = (r['Piso']||'').trim();
      const depto = (r['Departamento']||'').trim();
      const loc   = (r['Localidad']||'').trim();
      const prov  = (r['Provincia']||'').trim();
      const cp    = (r['Código Postal']||'').trim();
      if(calle || loc){
        const partes = [calle, nro].filter(Boolean);
        if(piso)  partes.push(`Piso ${piso}`);
        if(depto) partes.push(`Dto ${depto}`);
        DOMICILIOS[uid] = {
          dom:    partes.join(' ').trim(),
          ciudad: `${loc}${prov?', '+prov:''}${cp?' ('+cp+')':''}`,
          mail:   r['E-mail']||''
        };
      }

      // Cumpleaños
      if(nac && /^\d{2}\/\d{2}(\/\d{4})?$/.test(nac)){
        const fechaCumple = nac.substring(0,5); // DD/MM
        const existing = CUMPLE_DATA.findIndex(c=>c.leg===uid);
        if(existing>=0) CUMPLE_DATA[existing].fecha = nac;
        else CUMPLE_DATA.push({leg: uid, fecha: nac});
      }

      legSet.add(uid);
      dniSet.add(dni);
      ok++;
    }

    saveAbmAltas(altas);
    renderAbmLista();

    // Mensaje de resultado SIEMPRE explícito: éxito o problema concreto.
    if(ok > 0){
      let msg = `✓ Importación realizada con éxito — ${ok} empleado${ok!==1?'s':''} cargado${ok!==1?'s':''}`;
      const extra = [];
      if(dup) extra.push(`${dup} duplicado${dup!==1?'s':''} omitido${dup!==1?'s':''}`);
      if(err) extra.push(`${err} con error`);
      if(extra.length) msg += ` (${extra.join(' · ')} — ver detalle)`;
      toast(msg, 'var(--green)');
    } else {
      // No se cargó ninguno: informar el motivo.
      let msg;
      if(err && dup)      msg = `⚠ No se importó ningún empleado: ${err} con error y ${dup} duplicado${dup!==1?'s':''}. Revisá el detalle.`;
      else if(err)        msg = `⚠ No se importó ningún empleado: ${err} registro${err!==1?'s':''} con error. Revisá el detalle.`;
      else if(dup)        msg = `⚠ No se importó ningún empleado: ${dup===1?'el registro ya existía':'los '+dup+' registros ya existían'} (empresa + legajo duplicado).`;
      else                msg = `⚠ No se importó ningún empleado. Verificá que el archivo tenga datos y las columnas correctas (usá "Plantilla altas").`;
      toast(msg, 'var(--red)');
    }

    if(errores.length){
      console.warn('Errores de importación:', errores);
      setTimeout(()=>{
        const d=document.createElement('div');
        d.style.cssText='position:fixed;bottom:80px;right:20px;background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:14px;max-width:380px;max-height:200px;overflow-y:auto;font-size:11px;font-family:var(--font-mono);color:var(--t3);z-index:99';
        d.innerHTML='<strong style="color:var(--yellow)">Avisos de importación:</strong><br>'+errores.join('<br>');
        document.body.appendChild(d);
        setTimeout(()=>d.remove(), 8000);
      }, 500);
    }
   }catch(_impErr){
     console.error('Importación de altas: error inesperado', _impErr);
     toast('⚠ Error al procesar el archivo: ' + (_impErr && _impErr.message ? _impErr.message : _impErr), 'var(--red)');
   }
  };
  reader.onerror = function(){
    console.error('Importación de altas: FileReader falló', reader.error);
    toast('⚠ No se pudo leer el archivo seleccionado.', 'var(--red)');
  };

  if(file.name.endsWith('.csv')){
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.readAsArrayBuffer(file);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA DE CONVENIO Y TÍTULO — helpers del formulario ABM
// ═══════════════════════════════════════════════════════════════════════════

function abmActualizarCatConvenioPicker(){
  const sel = document.getElementById('abm-e-cat-convenio');
  if(!sel) return;
  const valActual = sel.value;
  const escala = (typeof getEscalaActiva === 'function') ? getEscalaActiva() : null;
  const cats   = escala?.categorias || [];
  const codSind = document.getElementById('abm-e-sindicato')?.value || '';
  const fc = !codSind || codSind.toUpperCase() === 'FC';

  sel.innerHTML = '<option value="">— Sin categoría de convenio —</option>';
  if(!cats.length){
    document.getElementById('abm-e-cat-conv-preview').textContent = '';
    return;
  }
  cats.forEach(c => {
    Object.keys(c.tramos||{}).forEach(t => {
      const monto = c.tramos[t];
      const opt   = document.createElement('option');
      opt.value   = `${c.cat}/${t}`;
      opt.textContent = `${c.cat} · ${t}${c.label ? ' — ' + c.label : ''} ($${Number(monto).toLocaleString('es-AR',{minimumFractionDigits:2})})`;
      if(fc) opt.disabled = true;
      sel.appendChild(opt);
    });
  });
  if(valActual) sel.value = valActual;
  abmOnCatConvenioChange();
}

function abmOnCatConvenioChange(){
  const sel = document.getElementById('abm-e-cat-convenio');
  const preview = document.getElementById('abm-e-cat-conv-preview');
  if(!sel || !preview) return;
  const val = sel.value;
  if(!val){ preview.textContent = ''; return; }
  const [cat, tramo] = val.split('/');
  const monto = (typeof getMontoEscala === 'function') ? getMontoEscala(cat, tramo) : null;
  if(monto !== null){
    preview.innerHTML = `Básico CCT: <strong>$ ${Number(monto).toLocaleString('es-AR',{minimumFractionDigits:2})}</strong>`;
    preview.style.color = 'var(--accent2)';
    const basicoField = document.getElementById('abm-e-basico');
    if(basicoField && (!basicoField.value || parseFloat(basicoField.value||'0') === 0)){
      basicoField.value = monto;
      setTimeout(abmRecalcComplemento, 30);
      preview.innerHTML += ' <span style="font-size:10px;color:var(--t3)">(básico sugerido)</span>';
    }
    const catField = document.getElementById('abm-e-cat');
    const tramoField = document.getElementById('abm-e-tramo');
    if(catField   && !catField.value)   catField.value   = cat;
    if(tramoField && !tramoField.value) tramoField.value = tramo;
    setTimeout(abmRecalcComplemento, 30);
  } else {
    preview.textContent = 'Combinación no encontrada en la escala vigente';
    preview.style.color = 'var(--yellow)';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOCOMPLETADO DE SUELDO BRUTO DESDE ESCALA UNIFICADA
// ═══════════════════════════════════════════════════════════════════════════
// Cuando el usuario escribe cat y tramo en el ABM, busca el monto en la
// escala salarial vigente y lo propone en el campo "Sueldo Bruto".
// Solo actúa si el campo bruto está vacío o en cero (no sobreescribe valores
// ya cargados manualmente).
// pref: 'n' = formulario de alta, 'e' = formulario de edición.
function abmAutocompletarBruto(pref){
  const cat   = (document.getElementById(`abm-${pref}-cat`)?.value  || '').trim().toUpperCase();
  const tramo = (document.getElementById(`abm-${pref}-tramo`)?.value || '').trim().toUpperCase();
  const brutoEl = document.getElementById(`abm-${pref}-bruto`);
  if(!brutoEl) return;

  if(!cat || !tramo){
    _abmBrutoEscalaPreview(pref, null, cat, tramo);
    return;
  }

  // Consultar la escala interna vigente
  const monto = (typeof getMontoEscala === 'function') ? getMontoEscala(cat, tramo) : null;

  if(monto && monto > 0){
    // Autocompletar siempre que haya valor en la escala interna vigente
    brutoEl.value = monto.toFixed(2);
    brutoEl.style.borderColor = 'var(--accent2)';
    // Recalcular complemento función con el nuevo bruto
    if(typeof abmRecalcComplemento === 'function') setTimeout(abmRecalcComplemento, 30);
    _abmBrutoEscalaPreview(pref, monto, cat, tramo);
  } else {
    brutoEl.style.borderColor = '';
    _abmBrutoEscalaPreview(pref, null, cat, tramo);
  }
}

// Muestra u oculta el chip informativo debajo del campo bruto
function _abmBrutoEscalaPreview(pref, monto, cat, tramo){
  const previewId = `abm-${pref}-bruto-escala`;
  let el = document.getElementById(previewId);

  // Crear el elemento si no existe
  if(!el){
    const brutoEl = document.getElementById(`abm-${pref}-bruto`);
    if(!brutoEl) return;
    el = document.createElement('div');
    el.id = previewId;
    el.style.cssText = 'font-size:11px;font-family:var(--font-mono);margin-top:4px;min-height:14px';
    brutoEl.parentNode.appendChild(el);
  }

  if(monto && monto > 0){
    const fmt = Number(monto).toLocaleString('es-AR', { minimumFractionDigits:2 });
    el.innerHTML = `Escala interna vigente — ${cat}/${tramo}: <strong style="color:var(--accent2)">$ ${fmt}</strong>`;
  } else if(cat && tramo){
    el.innerHTML = `<span style="color:var(--yellow)">⚠ ${cat}/${tramo} no encontrado en la escala vigente</span>`;
  } else {
    el.textContent = '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOTO DE PERFIL DEL EMPLEADO — ABM Empleados
// La foto se guarda como base64 en el override del empleado (campo `foto`).
// Se comprime a máx. 480×480px antes de guardar para limitar el tamaño.
// ═══════════════════════════════════════════════════════════════════════════

// Carga y previsualiza la foto seleccionada
function abmCargandoFoto(input){
  const file = input?.files?.[0];
  if(!file) return;

  const status = document.getElementById('abm-e-foto-status');

  // Validar tamaño (2 MB máx)
  if(file.size > 2 * 1024 * 1024){
    if(status) status.textContent = '⚠ El archivo supera 2 MB. Usá una imagen más pequeña.';
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e){
    const dataUrl = e.target.result;
    // Comprimir con canvas a 480×480 máx
    const img = new Image();
    img.onload = function(){
      const canvas = document.createElement('canvas');
      const MAX = 480;
      let w = img.width, h = img.height;
      if(w > MAX || h > MAX){
        if(w > h){ h = Math.round(h * MAX / w); w = MAX; }
        else      { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.85);
      _abmSetFotoPreview(compressed);
      if(status) status.textContent = `✓ ${Math.round(compressed.length*0.75/1024)} KB`;
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Actualiza el preview de foto en el formulario
function _abmSetFotoPreview(base64){
  const imgEl      = document.getElementById('abm-e-foto-img');
  const initialsEl = document.getElementById('abm-e-foto-initials');
  const btnQuitar  = document.getElementById('abm-e-foto-btn-quitar');

  if(base64){
    if(imgEl){
      imgEl.src = base64;
      imgEl.style.display = 'block';
    }
    if(initialsEl) initialsEl.style.display = 'none';
    if(btnQuitar)  btnQuitar.style.display  = 'inline-flex';
  } else {
    if(imgEl)      imgEl.style.display      = 'none';
    if(initialsEl) initialsEl.style.display = '';
    if(btnQuitar)  btnQuitar.style.display  = 'none';
  }
}

// Quita la foto del formulario (marca para borrar al guardar)
function abmQuitarFoto(){
  _abmSetFotoPreview(null);
  const status = document.getElementById('abm-e-foto-status');
  if(status) status.textContent = 'Foto eliminada. Guardá para confirmar.';
  // Marcar para borrar
  const inp = document.getElementById('abm-e-foto-input');
  if(inp) inp.value = '';
  // Señal: foto = '' (vacío = quitar)
  _abmFotoActual = '';
}

// Variable en memoria para la foto del empleado que se está editando
let _abmFotoActual = null; // null = sin cambios, '' = borrar, base64 = nueva foto

// Cargar la foto al abrir la ficha de edición
function abmCargarFotoEnForm(leg){
  _abmFotoActual = null; // resetear
  const ov   = getAbmOverrides();
  const foto = ov?.[leg]?.foto || getNomina().find(e=>e.leg===leg)?.foto || '';

  // Actualizar las iniciales desde el nombre del empleado
  const nom = document.getElementById('abm-e-nom')?.value || '';
  const partes = nom.split(',')[0].trim().split(' ');
  const initials = partes.length >= 2
    ? partes[0].charAt(0) + partes[partes.length-1].charAt(0)
    : partes[0].substring(0,2);
  const initialsEl = document.getElementById('abm-e-foto-initials');
  if(initialsEl) initialsEl.textContent = initials.toUpperCase() || '?';

  _abmSetFotoPreview(foto || null);
  const status = document.getElementById('abm-e-foto-status');
  if(status) status.textContent = foto ? '✓ Foto cargada' : 'Sin foto';
}

// Obtiene la foto final a guardar (base64 desde canvas o la que ya había)
function abmGetFotoParaGuardar(legActual){
  // Si se subió una nueva foto (está en el img element con src nuevo)
  const imgEl = document.getElementById('abm-e-foto-img');
  if(imgEl && imgEl.style.display !== 'none' && imgEl.src && imgEl.src.startsWith('data:')){
    return imgEl.src;
  }
  // Si se marcó para borrar
  if(_abmFotoActual === ''){
    return '';
  }
  // Sin cambios: devolver la foto actual del override o DB
  const ov   = getAbmOverrides();
  return ov?.[legActual]?.foto || getNomina().find(e=>e.leg===legActual)?.foto || '';
}
