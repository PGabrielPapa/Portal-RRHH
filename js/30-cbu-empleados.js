// ═══════════════════════════════════════════════════════════════════════════
// CBU EMPLEADOS — validación, detección de banco, persistencia
// ───────────────────────────────────────────────────────────────────────────
// Persiste en `lsg_abm_overrides[leg]` (mismo store que el resto de campos
// del ABM) bajo las claves: cbu, banco, tipoCuenta, alias, titularAlt.
//
//   - cbu          : 22 dígitos numéricos (string, mantiene ceros iniciales)
//   - banco        : nombre legible (auto-detectado de los 3 primeros dígitos)
//   - tipoCuenta   : 'CA' (Caja de Ahorro, default) | 'CC' (Cuenta Corriente)
//   - alias        : alias bancario opcional (max 20 chars)
//   - titularAlt   : si la cuenta es a nombre de un tercero (ej. esposa)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Mapa de bancos (código BCRA → nombre) ────────────────────────────────
// Los 3 primeros dígitos del CBU identifican al banco según la nomenclatura
// del BCRA. Lista cubre los bancos activos más usuales de Argentina.
const BANCOS_BCRA = {
  '005': 'The Royal Bank of Scotland',
  '007': 'Galicia',
  '011': 'Banco Nación',
  '014': 'Provincia de Buenos Aires',
  '015': 'ICBC',
  '016': 'Citibank',
  '017': 'BBVA',
  '018': 'Citibank N.A.',
  '020': 'Banco Pcia Buenos Aires',
  '027': 'Supervielle',
  '028': 'Comafi',
  '029': 'Banco Ciudad',
  '030': 'Central de la R.A.',
  '034': 'Patagonia',
  '044': 'Comafi',
  '045': 'Banco BHN',
  '060': 'Banco del Tucumán',
  '065': 'Itaú',
  '072': 'Santander',
  '083': 'Banco del Chubut',
  '086': 'Banco Sta. Cruz',
  '093': 'Banco Coop. La Plata',
  '094': 'Banco Pcia Tierra del Fuego',
  '097': 'Banco Pcia Neuquén',
  '143': 'Brubank',
  '147': 'Banco Interfinanzas',
  '150': 'HSBC',
  '165': 'JP Morgan',
  '170': 'HSBC',
  '180': 'Banco BIND',
  '191': 'Credicoop',
  '198': 'Banco Saenz',
  '247': 'Banco Roela',
  '254': 'Banco Mariva',
  '259': 'Banco Itaú',
  '262': 'Banco Mariva',
  '266': 'BNP Paribas',
  '268': 'Banco Provincia Córdoba',
  '269': 'Banco de la República O. del Uruguay',
  '277': 'Banco Servicios y Transacciones',
  '281': 'Banco Mendoza',
  '285': 'Macro',
  '295': 'Banco Voii',
  '299': 'Banco Comafi',
  '300': 'Banco de la República Oriental del Uruguay',
  '301': 'Banco Mariva',
  '305': 'Banco Voii',
  '309': 'Banco Tierra del Fuego',
  '310': 'Banco del Sol',
  '311': 'Banco Pcia Río Negro',
  '312': 'Banco del Sol',
  '315': 'Banco de Formosa',
  '319': 'BICE',
  '321': 'Banco Sta. Cruz',
  '322': 'Banco Industrial',
  '330': 'Nuevo Banco Industrial',
  '336': 'Wilobank',
  '338': 'Banco de la República Oriental',
  '339': 'BACS',
  '340': 'Comafi',
  '341': 'Naranja X',
  '384': 'Banco Wal-Mart',
  '386': 'Nuevo Banco de Entre Ríos',
  '389': 'Banco Columbia',
  '402': 'Banco Pcia Tucumán',
  '405': 'Banco Pcia Catamarca',
  '406': 'Banco de Formosa',
  '408': 'Banco Pcia Corrientes',
  '409': 'Banco Pcia Chubut',
  '426': 'Nuevo Banco de Bisel',
  '431': 'Banco Bansud',
  '432': 'Banco Bansud',
  '435': 'Banco Mariva',
  '443': 'Banco BIND'
};

function bancoDesdeCBU(cbu){
  const limpio = String(cbu || '').replace(/\D/g, '');
  if(limpio.length < 3) return '';
  const cod = limpio.slice(0, 3);
  return BANCOS_BCRA[cod] || `Otro (cód ${cod})`;
}

// ─── Validación BCRA del CBU ──────────────────────────────────────────────
// El CBU tiene 22 dígitos divididos así:
//   pos 1-3   : código de banco
//   pos 4-7   : código de sucursal
//   pos 8     : dígito verificador 1 (sobre banco + sucursal)
//   pos 9-20  : número de cuenta
//   pos 21-22 : dígito verificador 2 (sobre 6 dígitos sucursal+cuenta o cuenta sola)
//
// La regla del BCRA es: el DV se calcula sobre las 7 cifras anteriores
// con pesos 7,1,3,9,7,1,3 (suma * peso, mod 10, complemento a 10 mod 10).
// El DV2 sobre las 13 cifras restantes con pesos 3,9,7,1,3,9,7,1,3,9,7,1,3.

function _calcDV(digitos, pesos){
  let suma = 0;
  for(let i = 0; i < digitos.length; i++){
    suma += parseInt(digitos[i], 10) * pesos[i];
  }
  return (10 - (suma % 10)) % 10;
}

function validarCBU(cbu){
  const limpio = String(cbu || '').replace(/\D/g, '');
  if(!limpio) return { ok: false, error: 'CBU vacío' };
  if(limpio.length !== 22) return { ok: false, error: `CBU debe tener 22 dígitos (tiene ${limpio.length})` };

  // DV1: sobre los primeros 7 dígitos (banco + sucursal), guardado en pos 8.
  const bloque1 = limpio.slice(0, 7);
  const dv1Esperado = parseInt(limpio[7], 10);
  const dv1Calc = _calcDV(bloque1, [7,1,3,9,7,1,3]);
  if(dv1Calc !== dv1Esperado){
    return { ok: false, error: `Dígito verificador del banco/sucursal inválido (esperado ${dv1Calc}, hay ${dv1Esperado})` };
  }

  // DV2: sobre los 13 dígitos siguientes (cuenta), guardado en pos 22.
  const bloque2 = limpio.slice(8, 21);
  const dv2Esperado = parseInt(limpio[21], 10);
  const dv2Calc = _calcDV(bloque2, [3,9,7,1,3,9,7,1,3,9,7,1,3]);
  if(dv2Calc !== dv2Esperado){
    return { ok: false, error: `Dígito verificador de la cuenta inválido (esperado ${dv2Calc}, hay ${dv2Esperado})` };
  }

  return { ok: true, cbu: limpio, banco: bancoDesdeCBU(limpio) };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELO: N CBUs por empleado con vigencia y porcentaje
// ───────────────────────────────────────────────────────────────────────────
// Persistencia en `lsg_abm_overrides[leg].cbus` como array:
//   [{ id, cbu, banco, tipoCuenta, alias, titularAlt,
//      porcentaje, vigenciaDesde, vigenciaHasta, modificadoPor, modificadoEl }]
//
//   - vigenciaHasta = null → CBU activo
//   - los porcentajes de los activos en cualquier momento dado deben sumar 100
//   - cada cambio cierra el snapshot anterior (vigenciaHasta = ayer) y crea uno
//     nuevo (vigenciaDesde = hoy). Si dos cambios ocurren el mismo día, el
//     último reemplaza al anterior (no se duplica histórico).
//
// Compat hacia atrás: si el override tiene formato viejo (cbu plano), lo
// migramos in-place a un único CBU activo con porcentaje 100%.
// ═══════════════════════════════════════════════════════════════════════════

const _LS_CBU_NOVEDADES = 'lsg_cbu_novedades';

function _hoyIso(){ return new Date().toISOString().slice(0,10); }
function _ayerIso(){ return new Date(Date.now() - 86400000).toISOString().slice(0,10); }
function _nowIso(){ return new Date().toISOString(); }
function _newCbuId(){ return 'cbu_' + Date.now() + '_' + Math.floor(Math.random()*10000); }

// Migra el formato viejo (cbu plano) → formato nuevo (cbus[]). NO toca si ya
// está en formato nuevo. Devuelve el record migrado (mutado in-place).
function _migrarOverrideEmpleado(rec){
  if(!rec) return rec;
  if(Array.isArray(rec.cbus)) return rec;
  if(rec.cbu){
    rec.cbus = [{
      id:            _newCbuId(),
      cbu:           rec.cbu,
      banco:         rec.banco || bancoDesdeCBU(rec.cbu),
      tipoCuenta:    rec.tipoCuenta || 'CA',
      alias:         rec.alias || '',
      titularAlt:    rec.titularAlt || '',
      porcentaje:    100,
      vigenciaDesde: _hoyIso(),
      vigenciaHasta: null,
      modificadoPor: 'MIGRACION',
      modificadoEl:  _nowIso()
    }];
  } else {
    rec.cbus = [];
  }
  // No borramos los campos viejos para que algún consumidor legacy que los use
  // siga funcionando. Solo agregamos el array nuevo.
  return rec;
}

// Devuelve TODOS los CBUs (activos + cerrados) del legajo, en orden cronológico.
function getCBUsHistorial(leg){
  const ov = (typeof getAbmOverrides === 'function') ? getAbmOverrides() : {};
  if(!ov[leg]) return [];
  _migrarOverrideEmpleado(ov[leg]);
  return (ov[leg].cbus || []).slice().sort((a,b) =>
    (a.vigenciaDesde || '').localeCompare(b.vigenciaDesde || ''));
}

// Devuelve los CBUs vigentes en `fecha` (ISO YYYY-MM-DD, default hoy).
function getCBUsActivos(leg, fecha){
  const f = fecha || _hoyIso();
  return getCBUsHistorial(leg).filter(c =>
    (c.vigenciaDesde || '') <= f &&
    (!c.vigenciaHasta || f <= c.vigenciaHasta)
  );
}

// Reemplaza el snapshot activo: cierra los que estaban vigentes y crea los
// nuevos con vigenciaDesde = hoy. `nuevos` es un array con los CBUs que
// quedarán activos (cada uno con cbu, banco, tipoCuenta, alias, titularAlt,
// porcentaje). `actor` es 'EMPLEADO' o 'RRHH'.
//
// Si hoy ya hay un snapshot creado (mismo vigenciaDesde), se sobrescribe
// (los CBUs creados hoy se descartan y se reemplazan por los nuevos).
function reemplazarSnapshotCBUs(leg, nuevos, actor){
  if(!Array.isArray(nuevos)) return { ok:false, error:'Lista inválida' };

  // Validar: cada CBU debe tener formato válido y los porcentajes sumar 100
  if(nuevos.length === 0){
    // Permitido: dejar al empleado sin CBU activo (cierra los actuales).
  } else {
    for(const n of nuevos){
      const v = validarCBU(n.cbu);
      if(!v.ok) return { ok:false, error:`CBU "${formatCBUDisplay(n.cbu)}" inválido: ${v.error}` };
      const p = Number(n.porcentaje);
      if(!isFinite(p) || p <= 0 || p > 100){
        return { ok:false, error:'Cada porcentaje debe estar entre 0.01 y 100' };
      }
    }
    const suma = nuevos.reduce((s,n) => s + Number(n.porcentaje), 0);
    if(Math.abs(suma - 100) > 0.01){
      return { ok:false, error:`Los porcentajes deben sumar 100% (suman ${suma.toFixed(2)}%)` };
    }
  }

  const ov = getAbmOverrides();
  if(!ov[leg]) ov[leg] = {};
  _migrarOverrideEmpleado(ov[leg]);

  const hoy = _hoyIso();
  const ayer = _ayerIso();
  const ahora = _nowIso();
  const cbusPrev = ov[leg].cbus || [];

  // Cerrar/descartar los anteriores:
  //  - Si vigenciaHasta ya está seteada → ya cerrado, lo dejamos
  //  - Si vigenciaDesde === hoy → fue creado hoy mismo, lo descartamos
  //  - Si está activo y de un día anterior → cerramos con vigenciaHasta = ayer
  const anteriores = cbusPrev.filter(c => c.vigenciaDesde !== hoy).map(c => {
    if(!c.vigenciaHasta){
      return { ...c, vigenciaHasta: ayer };
    }
    return c;
  });

  // Crear los nuevos
  const agregados = nuevos.map(n => ({
    id:            n.id || _newCbuId(),
    cbu:           String(n.cbu).replace(/\D/g, ''),
    banco:         n.banco || bancoDesdeCBU(n.cbu),
    tipoCuenta:    n.tipoCuenta || 'CA',
    alias:         n.alias || '',
    titularAlt:    n.titularAlt || '',
    porcentaje:    Math.round(Number(n.porcentaje) * 100) / 100,
    vigenciaDesde: hoy,
    vigenciaHasta: null,
    modificadoPor: actor || 'RRHH',
    modificadoEl:  ahora
  }));

  ov[leg].cbus = [...anteriores, ...agregados];
  saveAbmOverrides(ov);
  return { ok:true, cbus: agregados };
}

// ─── Notificaciones a RR.HH. ──────────────────────────────────────────────
// Cada cambio hecho por el empleado deja una novedad en `lsg_cbu_novedades`.
// RR.HH. la ve en su panel con badge.
function getCBUNovedades(opts){
  opts = opts || {};
  let lista;
  try { lista = JSON.parse(localStorage.getItem(_LS_CBU_NOVEDADES) || '[]'); }
  catch(e){ lista = []; }
  if(opts.soloNoLeidas) lista = lista.filter(n => !n.leida);
  if(opts.leg)          lista = lista.filter(n => n.leg === opts.leg);
  return lista.slice().sort((a,b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

function _saveCBUNovedades(arr){
  // Tope: 500 novedades (las más viejas se truncan).
  if(arr.length > 500) arr = arr.slice(-500);
  try{localStorage.setItem(_LS_CBU_NOVEDADES, JSON.stringify(arr));}catch(e){}
}

function addCBUNovedad({ leg, nom, accion, detalle, actor }){
  const lista = getCBUNovedades();
  lista.push({
    id:    'nov_' + Date.now() + '_' + Math.floor(Math.random()*10000),
    leg, nom, accion, detalle,
    actor: actor || 'EMPLEADO',
    fecha: _nowIso(),
    leida: false,
    leidaPor: null,
    leidaEl:  null
  });
  _saveCBUNovedades(lista);
  // Si hay un badge en pantalla, refrescar.
  if(typeof _refrescarBadgeCBUNovedades === 'function') _refrescarBadgeCBUNovedades();
}

function marcarCBUNovedadLeida(id){
  const lista = getCBUNovedades();
  const i = lista.findIndex(n => n.id === id);
  if(i < 0) return;
  lista[i].leida = true;
  lista[i].leidaPor = currentUser?.emp?.nom || '?';
  lista[i].leidaEl  = _nowIso();
  _saveCBUNovedades(lista);
  if(typeof _refrescarBadgeCBUNovedades === 'function') _refrescarBadgeCBUNovedades();
}

function marcarTodasCBUNovedadesLeidas(){
  const lista = getCBUNovedades();
  const nom = currentUser?.emp?.nom || '?';
  const ahora = _nowIso();
  lista.forEach(n => { if(!n.leida){ n.leida = true; n.leidaPor = nom; n.leidaEl = ahora; } });
  _saveCBUNovedades(lista);
  if(typeof _refrescarBadgeCBUNovedades === 'function') _refrescarBadgeCBUNovedades();
}

function cantidadCBUNovedadesNoLeidas(){
  return getCBUNovedades({ soloNoLeidas: true }).length;
}

// ─── API legacy (1 CBU plano) — mantenida por compatibilidad ──────────────
// `getCBUEmpleado` ahora devuelve el primer CBU activo (el "principal").
// Los nuevos consumidores deberían usar `getCBUsActivos(leg)` para obtener
// la lista completa con porcentajes.
function getCBUEmpleado(leg){
  const activos = getCBUsActivos(leg);
  if(activos.length){
    const c = activos[0];
    return {
      cbu:        c.cbu || '',
      banco:      c.banco || (c.cbu ? bancoDesdeCBU(c.cbu) : ''),
      tipoCuenta: c.tipoCuenta || 'CA',
      alias:      c.alias || '',
      titularAlt: c.titularAlt || ''
    };
  }
  return { cbu:'', banco:'', tipoCuenta:'CA', alias:'', titularAlt:'' };
}

// `setCBUEmpleado` (legacy) reemplaza el snapshot por un único CBU al 100%.
// Sigue siendo el camino que usa el ABM Empleado actual.
function setCBUEmpleado(leg, datos){
  const cbu = String(datos?.cbu || '').replace(/\D/g, '');
  const beforeActivos = getCBUsActivos(leg);
  const beforeCbu = beforeActivos[0]?.cbu || '';

  if(!cbu){
    // Vaciar — cerrar snapshot actual sin agregar nuevo.
    reemplazarSnapshotCBUs(leg, [], 'RRHH');
  } else {
    reemplazarSnapshotCBUs(leg, [{
      cbu,
      tipoCuenta: datos.tipoCuenta || 'CA',
      alias:      datos.alias || '',
      titularAlt: datos.titularAlt || '',
      porcentaje: 100
    }], 'RRHH');
  }

  // Auditoría: si cambió, dejamos rastro.
  if(typeof auditABM === 'function' && beforeCbu !== cbu){
    const emp = (typeof empByLeg === 'function') ? empByLeg(leg) : null;
    auditABM('cbu_actualizado',
      { dni: emp?.dni || '', nom: emp?.nom || `legajo ${leg}`, extra: leg },
      { before: beforeCbu || '(vacío)', after: cbu || '(vacío)',
        detail: `Banco: ${cbu ? bancoDesdeCBU(cbu) : '—'} · Tipo: ${(datos.tipoCuenta || 'CA') === 'CC' ? 'Cuenta Corriente' : 'Caja de Ahorro'}` });
  }
  return getCBUEmpleado(leg);
}

// ─── Helpers de UI ────────────────────────────────────────────────────────
function tipoCuentaLabel(t){
  return t === 'CC' ? 'Cuenta Corriente' : 'Caja de Ahorro';
}

// Formatea para display: 22 dígitos en bloques de 4-4-4-4-4-2 → más legible.
function formatCBUDisplay(cbu){
  const c = String(cbu || '').replace(/\D/g, '');
  if(c.length !== 22) return c;
  return `${c.slice(0,4)}-${c.slice(4,8)}-${c.slice(8,12)}-${c.slice(12,16)}-${c.slice(16,20)}-${c.slice(20,22)}`;
}

// Devuelve true si el empleado tiene al menos un CBU activo y válido.
function tieneCBU(leg){
  return getCBUsActivos(leg).some(c => validarCBU(c.cbu).ok);
}

// ─── CBU/banco origen por empresa ────────────────────────────────────────
// Orden de resolución:
//   1. Record ABM de la empresa (cbuOrigen, bancoOrigen, tipoCuentaOrigen, aliasOrigen)
//   2. Fallback a getLiqParams().cbuEmpresa / .bancoEmpresa (config global heredada)
//   3. Vacío
//
// `nombreOrCuit` puede ser el nombre exacto o el CUIT (con/sin guiones).
function getCBUEmpresa(nombreOrCuit){
  const blank = { cbu:'', banco:'', tipoCuenta:'CC', alias:'', source:'' };
  if(!nombreOrCuit) return _getCBUEmpresaFallback(blank);

  // Buscar en cache local de empresas ABM
  const cache = (typeof _empresasABMCache === 'object' && Array.isArray(_empresasABMCache))
    ? _empresasABMCache : [];
  const norm = String(nombreOrCuit).trim().toUpperCase();
  const cuitDig = String(nombreOrCuit).replace(/\D/g, '');
  const rec = cache.find(c => {
    const n = (c.nombre || '').trim().toUpperCase();
    const k = String(c.cuit || '').replace(/\D/g, '');
    return n === norm || (cuitDig.length === 11 && k === cuitDig);
  });
  if(rec && rec.cbuOrigen){
    return {
      cbu:        rec.cbuOrigen,
      banco:      rec.bancoOrigen || (typeof bancoDesdeCBU === 'function' ? bancoDesdeCBU(rec.cbuOrigen) : ''),
      tipoCuenta: rec.tipoCuentaOrigen || 'CC',
      alias:      rec.aliasOrigen || '',
      source:     'empresa_abm'
    };
  }
  return _getCBUEmpresaFallback(blank);
}

function _getCBUEmpresaFallback(blank){
  // Config global pre-existente (cbuEmpresa / bancoEmpresa) — la dejamos
  // accesible para compatibilidad con liquidaciones armadas con la versión vieja.
  if(typeof getLiqParams === 'function'){
    const p = getLiqParams() || {};
    if(p.cbuEmpresa){
      return {
        cbu:        String(p.cbuEmpresa).replace(/\D/g, ''),
        banco:      p.bancoEmpresa || (typeof bancoDesdeCBU === 'function' ? bancoDesdeCBU(p.cbuEmpresa) : ''),
        tipoCuenta: 'CC',
        alias:      '',
        source:     'global_legacy'
      };
    }
  }
  return blank;
}
// ─── Stats: cuántos empleados tienen CBU cargado ──────────────────────────
function getCBUStats(){
  if(typeof getNomina !== 'function') return { conCBU: 0, sinCBU: 0, total: 0, invalidos: [], multiCBU: 0 };
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const stats = { conCBU: 0, sinCBU: 0, total: nomina.length, invalidos: [], multiCBU: 0 };
  nomina.forEach(e => {
    const activos = getCBUsActivos(e.leg);
    if(!activos.length){ stats.sinCBU++; return; }
    if(activos.length > 1) stats.multiCBU++;
    // Si alguno es inválido, lo flag — pero igual cuenta como "con CBU"
    const malos = activos.filter(c => !validarCBU(c.cbu).ok);
    if(malos.length){
      malos.forEach(c => stats.invalidos.push({ leg: e.leg, nom: e.nom, error: validarCBU(c.cbu).error }));
    }
    stats.conCBU++;
  });
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE VALIDATION en cualquier form que tenga input CBU
// ═══════════════════════════════════════════════════════════════════════════
// Por default usa los IDs del modal de empleado (`abm-e-*`); para reusar en
// otros forms (empresa, "Mis Datos", etc.) se pasan los IDs.
function _cbuInputLive(ids){
  ids = ids || { input: 'abm-e-cbu', banco: 'abm-e-banco-detect', status: 'abm-e-cbu-status' };
  const inp   = document.getElementById(ids.input);
  const banco = document.getElementById(ids.banco);
  const stat  = document.getElementById(ids.status);
  if(!inp) return;
  const v = String(inp.value || '').replace(/\D/g, '');
  if(v.length === 0){
    if(banco) banco.textContent = '—';
    if(stat){ stat.textContent = ''; stat.style.color = 'var(--t3)'; }
    return;
  }
  if(banco) banco.textContent = bancoDesdeCBU(v) || '—';
  if(v.length < 22){
    if(stat){ stat.textContent = `${v.length}/22 dígitos`; stat.style.color = 'var(--t3)'; }
    return;
  }
  const r = validarCBU(v);
  if(stat){
    if(r.ok){ stat.textContent = '✓ CBU válido'; stat.style.color = 'var(--green)'; }
    else    { stat.textContent = '✗ ' + r.error; stat.style.color = 'var(--red)'; }
  }
}

// Wrappers fijos para usar como handler de oninput sin necesidad de pasar argumentos.
function _cbuInputLiveEmpresa(){
  _cbuInputLive({ input: 'abm-emp-cbu', banco: 'abm-emp-banco-detect', status: 'abm-emp-cbu-status' });
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTADOR BULK desde CSV pegado
// ═══════════════════════════════════════════════════════════════════════════
// Acepta líneas con `legajo;cbu;tipoCuenta;alias` (separadores `;` o `,` o tab).
// Solo legajo y CBU son obligatorios; tipo default = CA.

function _parseLineaCBU(linea){
  const parts = linea.split(/[;,\t]/).map(s => s.trim());
  if(parts.length < 2) return null;
  const [leg, cbu, tipo, alias] = parts;
  if(!leg || !cbu) return null;
  return {
    leg: leg.padStart(6, '0'),  // legajos LEITEN tienen 6 dígitos con padding
    cbu: cbu.replace(/\D/g, ''),
    tipoCuenta: (tipo || 'CA').toUpperCase().startsWith('CC') ? 'CC' : 'CA',
    alias: alias || ''
  };
}

function abrirImportCBU(){
  const html = `
    <div id="cbu-import-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)" onclick="if(event.target===this)cerrarImportCBU()">
      <div class="card" style="padding:0;max-width:760px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">📥 Importar CBUs en lote</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Pegá una columna desde Excel o un CSV con los CBUs de los empleados</div>
          </div>
          <button onclick="cerrarImportCBU()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
        </div>
        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
          <div style="font-size:12px;color:var(--t2);line-height:1.6">
            Una línea por empleado. Formato:
            <code style="background:var(--bg2);padding:2px 6px;border-radius:3px;font-size:11px">legajo;cbu;tipoCuenta;alias</code>
            <br>Solo <strong>legajo</strong> y <strong>cbu</strong> son obligatorios. Tipo default <strong>CA</strong> (Caja de Ahorro). Aceptamos <code style="font-size:11px">; , o tab</code> como separador.
          </div>
          <textarea id="cbu-import-text" rows="10" placeholder="002004;0070372530004009364580;CA;mi.alias.banco&#10;002005;01100556300055085123CC&#10;..."
            style="width:100%;padding:10px 12px;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono);outline:none;resize:vertical"></textarea>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" onclick="previewImportCBU()" style="font-size:12px">Pre-visualizar</button>
            <button class="btn" id="cbu-import-confirm" onclick="confirmarImportCBU()"
              style="font-size:12px;background:var(--green);color:white;border-color:var(--green);display:none">Importar válidos</button>
          </div>
          <div id="cbu-import-preview"></div>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

function cerrarImportCBU(){
  const m = document.getElementById('cbu-import-bg');
  if(m) m.remove();
}

let _cbuImportPendientes = [];

function previewImportCBU(){
  const text = document.getElementById('cbu-import-text')?.value || '';
  const preview = document.getElementById('cbu-import-preview');
  const btnOk   = document.getElementById('cbu-import-confirm');
  if(!preview) return;

  const lineas = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if(!lineas.length){
    preview.innerHTML = '<div style="font-size:12px;color:var(--t3)">No hay líneas para procesar</div>';
    if(btnOk) btnOk.style.display = 'none';
    return;
  }

  const validos = [];
  const errores = [];
  lineas.forEach((linea, idx) => {
    const p = _parseLineaCBU(linea);
    if(!p){ errores.push({ linea: idx+1, leg: '?', error: 'No pude parsear', raw: linea }); return; }
    const emp = (typeof empByLeg === 'function') ? empByLeg(p.leg) : null;
    if(!emp){ errores.push({ linea: idx+1, leg: p.leg, error: 'Legajo no encontrado en la nómina', raw: linea }); return; }
    const v = validarCBU(p.cbu);
    if(!v.ok){ errores.push({ linea: idx+1, leg: p.leg, nom: emp.nom, error: v.error, raw: linea }); return; }
    validos.push({ ...p, nom: emp.nom, banco: bancoDesdeCBU(p.cbu) });
  });

  _cbuImportPendientes = validos;

  const filaErr = e => `
    <div style="display:grid;grid-template-columns:60px 80px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px">
      <div style="color:var(--t3);font-family:var(--font-mono)">Línea ${e.linea}</div>
      <div style="color:var(--t1);font-family:var(--font-mono)">${e.leg || '?'}</div>
      <div style="color:var(--red)">⚠ ${e.error}</div>
    </div>`;
  const filaOk = v => `
    <div style="display:grid;grid-template-columns:80px 1fr 100px 220px 60px;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;align-items:center">
      <div style="color:var(--t1);font-family:var(--font-mono)">${legD(v.leg)}</div>
      <div style="color:var(--t1)">${v.nom}</div>
      <div style="color:var(--t3)">${v.banco}</div>
      <div style="color:var(--t2);font-family:var(--font-mono);font-size:10px">${formatCBUDisplay(v.cbu)}</div>
      <div style="color:var(--t3);text-align:center">${v.tipoCuenta}</div>
    </div>`;

  preview.innerHTML = `
    <div style="display:flex;gap:14px;margin-bottom:12px">
      <div style="font-size:12px;color:var(--green)">✓ ${validos.length} válidos</div>
      <div style="font-size:12px;color:var(--red)">✗ ${errores.length} con error</div>
    </div>
    ${errores.length ? `
      <details open style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:10px 14px;margin-bottom:12px">
        <summary style="cursor:pointer;color:var(--red);font-size:12px;font-weight:600">${errores.length} errores</summary>
        <div style="margin-top:10px">${errores.map(filaErr).join('')}</div>
      </details>` : ''}
    ${validos.length ? `
      <details open style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px">
        <summary style="cursor:pointer;color:var(--t1);font-size:12px;font-weight:600">${validos.length} a importar</summary>
        <div style="margin-top:10px;max-height:280px;overflow-y:auto">${validos.map(filaOk).join('')}</div>
      </details>` : ''}
  `;
  if(btnOk) btnOk.style.display = validos.length ? 'inline-block' : 'none';
}

async function confirmarImportCBU(){
  if(!_cbuImportPendientes.length){ toast('⚠ Pre-visualizá primero','var(--yellow)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Importar ${_cbuImportPendientes.length} CBUs?<br><br>Los legajos que ya tenían CBU(s) verán reemplazado el snapshot por un único CBU al 100%.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;

  let ok = 0;
  _cbuImportPendientes.forEach(v => {
    const r = reemplazarSnapshotCBUs(v.leg, [{
      cbu:        v.cbu,
      banco:      v.banco,
      tipoCuenta: v.tipoCuenta,
      alias:      v.alias,
      titularAlt: '',
      porcentaje: 100
    }], 'RRHH');
    if(r.ok){
      ok++;
      // Auditoría individual
      if(typeof auditABM === 'function'){
        const emp = (typeof empByLeg === 'function') ? empByLeg(v.leg) : null;
        auditABM('cbu_actualizado',
          { dni: emp?.dni || '', nom: emp?.nom || `legajo ${legD(v.leg)}`, extra: v.leg },
          { after: v.cbu, detail: `Import bulk · Banco: ${v.banco} · Tipo: ${v.tipoCuenta === 'CC' ? 'Cuenta Corriente' : 'Caja de Ahorro'}` });
      }
    }
  });

  toast(`✓ ${ok} CBUs importados`,'var(--green)');
  cerrarImportCBU();
  if(typeof renderAbmLista === 'function') renderAbmLista();
  _cbuImportPendientes = [];
}
