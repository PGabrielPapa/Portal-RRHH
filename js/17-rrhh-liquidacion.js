// ═══════════════════════════════════════════════════════════════
// SISTEMA DE LIQUIDACIÓN DE HABERES — LEITEN GROUP
// ═══════════════════════════════════════════════════════════════

// ─── Catálogo de TIPOS DE HABERES adicionales ─────────────────────
// Cada concepto cargado en `nov.otrosHaberes` lleva un `tipo` que
// determina si entra a la base imponible de aportes/Ganancias.
// `esRem=true`  → suma a remunerativos (aportes, contribs, ganancias)
// `esRem=false` → suma como exento/no remunerativo (al neto, sin aportes)
//
// El item también lleva una flag `habitual` (true por default):
// los conceptos HABITUALES integran la base de cálculo del SAC
// (Art. 121 LCT — "mejor remuneración mensual normal y habitual").
// Los NO HABITUALES (premios extraordinarios, gratificaciones únicas)
// no se incluyen en la base SAC. Esto importa para F.931 y SAC anual.
//
// Marco normativo:
//   - Plus por nocturnidad/insalubridad (CCT) → REMUNERATIVOS (Art. 103 LCT, Ley 11.544 mod., CCT)
//   - Premio asistencia / producción (CCT)    → REMUNERATIVOS si son habituales (Art. 103 LCT)
//   - Adicional por título                    → REMUNERATIVO (escalafón CCT)
//   - Plus por tarea diferenciada             → REMUNERATIVO (Art. 78 LCT)
//   - Comisiones                              → REMUNERATIVAS (Art. 108 LCT)
//   - Comida / Vianda con vale o ticket       → NO REM. con tope (Art. 103 bis LCT)
//   - Movilidad / Viáticos sin rendición      → REMUNERATIVOS (CSJN "Pérez c/Disco")
//   - Viáticos con rendición / vianda CCT     → NO REM.
//   - Guardería / sala maternal               → NO REM. (Art. 103 bis LCT)
//   - Útiles escolares                        → NO REM. (Art. 103 bis LCT)
//   - Tickets canasta                         → NO REM. (Art. 103 bis LCT)
const TIPOS_HABERES = [
  // ── Remunerativos ──
  { v:'nocturnidad',       label:'Plus nocturnidad',          icon:'🌙', esRem:true,  legal:'Art. 200 LCT — recargo 30% nocturno' },
  { v:'insalubridad',      label:'Plus insalubridad',         icon:'⚠',  esRem:true,  legal:'CCT — recargo por tarea insalubre' },
  { v:'adicional_titulo',  label:'Adicional por título',      icon:'🎓', esRem:true,  legal:'CCT — escalafón por título' },
  { v:'tarea_diferenciada',label:'Plus tarea diferenciada',   icon:'⬆',  esRem:true,  legal:'Art. 78 LCT — categoría superior' },
  { v:'premio_asistencia', label:'Premio asistencia',         icon:'🎯', esRem:true,  legal:'CCT — habitual = remunerativo' },
  { v:'premio_produccion', label:'Premio producción',         icon:'📈', esRem:true,  legal:'CCT — habitual = remunerativo' },
  { v:'comisiones',        label:'Comisiones',                icon:'💼', esRem:true,  legal:'Art. 108 LCT' },
  { v:'plus_zona',         label:'Plus por zona desfavorable',icon:'📍', esRem:true,  legal:'CCT específicos' },
  { v:'movilidad_rem',     label:'Movilidad (sin rendición)', icon:'🚗', esRem:true,  legal:'CSJN "Pérez c/Disco" — sin rendición es rem.' },
  { v:'otro_rem',          label:'Otro concepto remunerativo',icon:'➕', esRem:true,  legal:'Categoría libre' },
  // ── No remunerativos ──
  { v:'comida_no_rem',     label:'Comida / Vianda (no rem.)', icon:'🍽', esRem:false, legal:'Art. 103 bis LCT — beneficio social' },
  { v:'tickets_canasta',   label:'Tickets canasta',           icon:'🛒', esRem:false, legal:'Art. 103 bis inc. f LCT' },
  { v:'guarderia',         label:'Guardería / sala maternal', icon:'👶', esRem:false, legal:'Art. 103 bis inc. f LCT' },
  { v:'utiles_escolares',  label:'Útiles escolares',          icon:'📚', esRem:false, legal:'Art. 103 bis inc. f LCT' },
  { v:'viaticos_no_rem',   label:'Viáticos (con rendición)',  icon:'🧾', esRem:false, legal:'CCT — rendición efectiva' },
  { v:'asignacion_no_rem', label:'Asignación no remunerativa',icon:'💵', esRem:false, legal:'Acuerdos paritarios — gratific. no rem.' },
  { v:'reintegro_gastos',  label:'Reintegro de gastos',       icon:'💳', esRem:false, legal:'Reintegro = no rem. (no es contraprestación)' },
  { v:'otro_no_rem',       label:'Otro concepto no rem.',     icon:'➕', esRem:false, legal:'Categoría libre' }
];

// ─── Catálogo de TIPOS DE DESCUENTOS personalizados ──────────────
const TIPOS_DESCUENTOS = [
  { v:'cuota_sindical', label:'Cuota sindical adicional', icon:'⚒' },
  { v:'cuota_seguro',   label:'Cuota seguro/mutual',      icon:'🛡' },
  { v:'cuota_credito',  label:'Cuota crédito',             icon:'🏦' },
  { v:'farmacia',       label:'Farmacia',                  icon:'💊' },
  { v:'comedor',        label:'Comedor',                   icon:'🍽' },
  { v:'multa_caja',     label:'Multa / faltante caja',     icon:'⚖' },
  { v:'descuento_compra',label:'Descuento por compras',    icon:'🛒' },
  { v:'otro',           label:'Otro descuento',            icon:'➖' }
];

function _tipoHaberInfo(t){ return TIPOS_HABERES.find(x => x.v === t) || { v:t, label:t, icon:'•', esRem:true }; }
function _tipoDescuentoInfo(t){ return TIPOS_DESCUENTOS.find(x => x.v === t) || { v:t, label:t, icon:'•' }; }

// ── Parámetros ──────────────────────────────────────────────────
const LIQ_PARAMS_KEY = LS.LIQ_PARAMS; // centralizado en js/00-constants.js
function getDefaultLiqParams(){
  // Valores por defecto — marzo 2026 (RG ARCA). Editables en pestaña Parámetros.
  return {
    // Aportes y contribuciones
    pctJubilacion:11, pctObraSocial:3, pctAnssal:0.5, pctPamiEmp:3,
    pctSindicatoEmp:2, nombreSindicato:'UOYEP',
    pctJubPatronal:10.17, pctOsPatronal:6, pctPamiPatronal:1.5,
    pctDesempleo:0.89, pctArt:1.5, pctSindicatoPatronal:1.5,
    // SCVO — Seguro Colectivo de Vida Obligatorio (Dto. 1567/74): cargo
    // patronal fijo per cápita mensual (valor fijado por la SSN). 0 = no
    // parametrizado. RR.HH. carga el per cápita vigente en Parámetros.
    scvoPercapita:0,
    // Tope de retención mensual de Ganancias (RG 4003/17): la retención
    // del mes no puede superar este % del neto. Remanente = saldo a pagar.
    gan_topeRetencionPct:35,
    pctPresentismo:5, pctAntiguedadPorAnio:1,
    bancoEmpresa:'', cbuEmpresa:'',

    // ── ASIGNACIONES NO REMUNERATIVAS POR PARITARIA ──
    // Montos mensuales no remunerativos pactados en acuerdos colectivos por
    // sindicato (Art. 103 bis LCT, jurisprudencia). Se prorratean por días
    // trabajados y al 50% en quincenales, igual que el sueldo básico.
    // Los empleados Fuera de Convenio (FC) usan la clave 'FC'.
    // RRHH actualiza estos valores cuando se firman nuevos acuerdos paritarios.
    asignacionNoRemPorSindicato: {
      SEC:      0,
      UOM:      0,
      PLASTICO: 0,
      ASIMRA:   0,
      FC:       0
    },

    // SMVM (Salario Mínimo Vital y Móvil) para tope embargo Art. 147 LCT.
    // Editable en pestaña Parámetros. Valor a actualizar mensualmente según
    // resoluciones del Consejo del Salario.
    smvmMensual: 363000,  // fallback Mayo 2026 (Res. 9/2025) — la liq. siempre usa getSMVMActual
    // Topes AFIP F.931 — actualizar cada trimestre con la resolución vigente.
    // 0 = sin tope (no recomendado, AFIP rechaza la DDJJ).
    f931TopeJub: 0,
    f931TopeOS:  0,

    // ═══ GANANCIAS 4ª CATEGORÍA — LEY 20.628 (t.o. 2019) y mod. Ley 27.743/2024 ═══
    // Los valores monetarios se toman de GAN_PARAMS_POR_SEMESTRE según la fecha de pago
    // de cada liquidación. Las alícuotas y porcentajes de topes son estables.

    // ── Topes Art. 85 LIG — porcentajes (estables, no RIPTE) ──
    gan_topePctHonorariosMed:     40,   // inc. h — % del honorario efectivamente pagado
    gan_topePctHonorariosMedGanNeta: 5, // inc. f/h — % de la ganancia neta (médico)
    gan_topePctDonaciones:         5,   // inc. c — 5% ganancia neta
    gan_pctAlquilerDeducible:     40,   // inc. g — 40% del alquiler, tope MNI
    gan_pctServDomesticoMniMax:  100,   // Ley 26.063 — Tope = MNI anual
    gan_pctEducacionMni:          40,   // Ley 27.743 — 40% MNI (educación/herramientas)
    gan_pctCorredoresViajantes:   40    // Corredores/viajantes (rodados)
  };
}

// ═══════════════════════════════════════════════════════════════
// VALORES DE GANANCIAS POR SEMESTRE (actualización RIPTE)
// ═══════════════════════════════════════════════════════════════
// ARCA publica una RG a principios de enero y julio con los nuevos montos.
// Cada liquidación usa los valores vigentes al momento de la FECHA DE PAGO.
//
// ⚠ IMPORTANTE: Los valores aquí son estimativos según el cronograma RIPTE
// conocido hasta enero 2026. VERIFICAR contra la RG oficial antes de cada
// liquidación en: https://www.arca.gob.ar/
// ═══════════════════════════════════════════════════════════════

const GAN_PARAMS_PERIODOS_KEY = LS.LIQ_GAN_PARAMS; // centralizado en js/00-constants.js

function getDefaultGanParamsPorSemestre(){
  return {
    '2024-S2': {
      _nombre:'2° semestre 2024 (Ley 27.743 — valores iniciales)',
      _vigenciaDesde:'2024-07-01', _vigenciaHasta:'2024-12-31',
      _rg:'RG AFIP 5531/2024',
      _requiereVerificacion:true,
      mniAnual:          5766847.15,
      dedEspAnual:      27680866.32,  // 4.8 × MNI
      dedEsp2Anual:      2787309.46,  // 1/12 × (MNI + DedEsp)
      dedEspecifica:           0.00,
      cargaConyugeAnual: 5370293.60,
      cargaHijoAnual:    2708063.05,
      cargaHijoIncAnual: 5416126.10,  // doble
      topeSeguroVida:      42920.59,
      topeGastosSepelio:     996.23,
      topeIntHipotecarios: 20000.00,
      escala:[
        {desde:0,         hasta: 1257914,   fijo:       0.00, alicuota: 5},
        {desde: 1257914,  hasta: 2515828,   fijo:   62895.70, alicuota: 9},
        {desde: 2515828,  hasta: 5031657,   fijo:  176109.96, alicuota:12},
        {desde: 5031657,  hasta: 8386095,   fijo:  477949.44, alicuota:15},
        {desde: 8386095,  hasta:16772191,   fijo:  981115.14, alicuota:19},
        {desde:16772191,  hasta:33544382,   fijo: 2574461.38, alicuota:23},
        {desde:33544382,  hasta:50316572,   fijo: 6431954.31, alicuota:27},
        {desde:50316572,  hasta:75474858,   fijo:10960365.71, alicuota:31},
        {desde:75474858,  hasta:Infinity,   fijo:18759333.37, alicuota:35}
      ]
    },
    '2025-S1': {
      _nombre:'1° semestre 2025',
      _vigenciaDesde:'2025-01-01', _vigenciaHasta:'2025-06-30',
      _rg:'RG ARCA 5628/2025',
      _requiereVerificacion:true,
      mniAnual:          7267901.21,  // RIPTE ene-25
      dedEspAnual:      34885925.80,  // 4.8 × MNI
      dedEsp2Anual:      3512818.92,  // 1/12 × (MNI + DedEsp)
      dedEspecifica:           0.00,
      cargaConyugeAnual: 6766657.36,
      cargaHijoAnual:    3413017.51,
      cargaHijoIncAnual: 6826035.02,
      topeSeguroVida:      42920.59,
      topeGastosSepelio:     996.23,
      topeIntHipotecarios: 20000.00,
      escala:[
        {desde:0,         hasta: 1585055,   fijo:       0.00, alicuota: 5},
        {desde: 1585055,  hasta: 3170110,   fijo:   79252.75, alicuota: 9},
        {desde: 3170110,  hasta: 6340220,   fijo:  221905.70, alicuota:12},
        {desde: 6340220,  hasta:10567032,   fijo:  602319.91, alicuota:15},
        {desde:10567032,  hasta:21134066,   fijo: 1236341.72, alicuota:19},
        {desde:21134066,  hasta:42268132,   fijo: 3243082.91, alicuota:23},
        {desde:42268132,  hasta:63402195,   fijo: 8103883.70, alicuota:27},
        {desde:63402195,  hasta:95103293,   fijo:13810100.59, alicuota:31},
        {desde:95103293,  hasta:Infinity,   fijo:23637405.59, alicuota:35}
      ]
    },
    '2025-S2': {
      _nombre:'2° semestre 2025',
      _vigenciaDesde:'2025-07-01', _vigenciaHasta:'2025-12-31',
      _rg:'RG ARCA (jul 2025)',
      _requiereVerificacion:true,
      mniAnual:         14535802.42,  // aproximación RIPTE jul-25 (~×2)
      dedEspAnual:      69771851.60,  // 4.8 × MNI
      dedEsp2Anual:      7025637.84,
      dedEspecifica:           0.00,
      cargaConyugeAnual:13533314.72,
      cargaHijoAnual:    6826035.02,
      cargaHijoIncAnual:13652070.04,
      topeSeguroVida:      42920.59,
      topeGastosSepelio:     996.23,
      topeIntHipotecarios: 20000.00,
      escala:[
        {desde:0,         hasta: 3170110,   fijo:       0.00, alicuota: 5},
        {desde: 3170110,  hasta: 6340220,   fijo:  158505.50, alicuota: 9},
        {desde: 6340220,  hasta:12680440,   fijo:  443811.40, alicuota:12},
        {desde:12680440,  hasta:21134064,   fijo: 1204639.82, alicuota:15},
        {desde:21134064,  hasta:42268128,   fijo: 2472683.44, alicuota:19},
        {desde:42268128,  hasta:84536256,   fijo: 6486165.82, alicuota:23},
        {desde:84536256,  hasta:126804390,  fijo:16207767.40, alicuota:27},
        {desde:126804390, hasta:190206585,  fijo:27620201.18, alicuota:31},
        {desde:190206585, hasta:Infinity,   fijo:47274811.18, alicuota:35}
      ]
    },
    '2026-S1': {
      _nombre:'1° semestre 2026',
      _vigenciaDesde:'2026-01-01', _vigenciaHasta:'2026-06-30',
      _rg:'RG ARCA (ene 2026) — VERIFICAR',
      _requiereVerificacion:true,
      mniAnual:         20607210.00,   // estimativo — VERIFICAR con RG oficial
      dedEspAnual:      98914608.12,   // 4.8 × MNI
      dedEsp2Anual:      9960151.51,   // 1/12 × (MNI + DedEsp)
      dedEspecifica:           0.00,
      cargaConyugeAnual:19196335.40,   // ≈ 2.65 × MNI s/progresión histórica
      cargaHijoAnual:    9681111.20,   // ≈ 1/2 cónyuge
      cargaHijoIncAnual:19362222.40,   // doble del hijo
      topeSeguroVida:      42920.59,
      topeGastosSepelio:     996.23,
      topeIntHipotecarios: 20000.00,
      escala:[
        {desde:         0, hasta:  4495920, fijo:        0.00, alicuota: 5},
        {desde:   4495920, hasta:  8991840, fijo:   224796.00, alicuota: 9},
        {desde:   8991840, hasta: 17983680, fijo:   629428.80, alicuota:12},
        {desde:  17983680, hasta: 29972800, fijo:  1708449.60, alicuota:15},
        {desde:  29972800, hasta: 59945600, fijo:  3506817.60, alicuota:19},
        {desde:  59945600, hasta:119891200, fijo:  9201649.60, alicuota:23},
        {desde: 119891200, hasta:179836800, fijo: 22989137.60, alicuota:27},
        {desde: 179836800, hasta:269755200, fijo: 39174449.60, alicuota:31},
        {desde: 269755200, hasta:Infinity,  fijo: 67049153.60, alicuota:35}
      ]
    }
  };
}

function getGanParamsPorSemestre(){
  try {
    const stored = JSON.parse(localStorage.getItem(GAN_PARAMS_PERIODOS_KEY)||'{}');
    const def = getDefaultGanParamsPorSemestre();
    // Merge: los overrides guardados reemplazan defaults; períodos nuevos se agregan
    return { ...def, ...stored };
  } catch(e){
    return getDefaultGanParamsPorSemestre();
  }
}

function saveGanParamsPorSemestre(obj){
  try{localStorage.setItem(GAN_PARAMS_PERIODOS_KEY, JSON.stringify(obj));}catch(e){}
}

// Normaliza una clave de período Ganancias a su mes de INICIO de vigencia "YYYY-MM"
// (sortable). Soporta claves mensuales ("YYYY-MM"), semestrales ("YYYY-S1"/"YYYY-S2")
// y anuales ("YYYY").
function _ganClaveAMesEfectivo(clave){
  if(!clave) return null;
  let m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(clave);   // mensual
  if(m) return `${m[1]}-${m[2]}`;
  m = /^(\d{4})-S([12])$/.exec(clave);               // semestral
  if(m) return `${m[1]}-${m[2]==='1'?'01':'07'}`;
  m = /^(\d{4})$/.exec(clave);                        // anual
  if(m) return `${m[1]}-01`;
  return null;
}

// Mes "YYYY-MM" de una fecha (string ISO o Date).
function _mesDeFecha(fecha){
  if(!fecha) fecha = new Date();
  const d = (typeof fecha === 'string') ? new Date(fecha + (fecha.length===10 ? 'T12:00:00' : '')) : fecha;
  if(isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// Resuelve los parámetros Ganancias (escala Art. 94 + deducciones Art. 30/85)
// aplicables a la FECHA DE PAGO con granularidad MENSUAL.
// Toma la tabla vigente al mes de pago: la de mayor inicio de vigencia <= mes de pago.
// - Si existe una tabla mensual exacta para ese mes, se usa directamente.
// - Compatible con claves mensuales, semestrales o anuales cargadas en el editor.
// - _fallback=true solo si NO hay tabla previa al mes de pago, o si la elegida ya
//   venció respecto del mes de pago (se arrastra una tabla vencida).
function resolveGanParamsParaFecha(fechaISO){
  const todos = getGanParamsPorSemestre();
  const mesObjetivo = _mesDeFecha(fechaISO);
  // Coincidencia mensual exacta
  if(mesObjetivo && todos[mesObjetivo]) return {...todos[mesObjetivo], _periodo: mesObjetivo};
  // Efectivo-dated: período vigente con mayor inicio <= mes objetivo
  let mejorClave = null, mejorMes = null;
  for(const k of Object.keys(todos)){
    const mEff = _ganClaveAMesEfectivo(k);
    if(!mEff) continue;
    if(mesObjetivo && mEff > mesObjetivo) continue; // aún no vigente a la fecha de pago
    if(mejorMes === null || mEff > mejorMes){ mejorMes = mEff; mejorClave = k; }
  }
  if(mejorClave){
    let _fb = false;
    const vh = todos[mejorClave]._vigenciaHasta; // "YYYY-MM-DD"
    if(vh && mesObjetivo && mesObjetivo > vh.slice(0,7)) _fb = true; // tabla vencida
    return {...todos[mejorClave], _periodo: mejorClave, _fallback:_fb};
  }
  // Último recurso: la más antigua disponible (fecha de pago previa a toda tabla cargada)
  const claves = Object.keys(todos).sort();
  return {...todos[claves[0]], _periodo: claves[0], _fallback:true};
}

// Combina los parámetros "estables" (porcentajes) con los del semestre resuelto
// para obtener los gan_* que el resto del código espera.
function buildParamsConPeriodo(baseParams, fechaISO){
  const sem = resolveGanParamsParaFecha(fechaISO);
  return {
    ...baseParams,
    // Montos anuales según semestre
    gan_mniAnual:           sem.mniAnual,
    gan_dedEspAnual:        sem.dedEspAnual,
    gan_dedEsp2Anual:       sem.dedEsp2Anual,
    gan_dedEspecifica:      sem.dedEspecifica,
    gan_cargaConyugeAnual:  sem.cargaConyugeAnual,
    gan_cargaHijoAnual:     sem.cargaHijoAnual,
    gan_cargaHijoIncAnual:  sem.cargaHijoIncAnual,
    gan_topeSeguroVida:     sem.topeSeguroVida,
    gan_topeGastosSepelio:  sem.topeGastosSepelio,
    gan_topeIntHipotecarios:sem.topeIntHipotecarios,
    escalaGanancias:        sem.escala,
    _ganPeriodo:            sem._periodo,
    _ganVigencia:           `${sem._vigenciaDesde} → ${sem._vigenciaHasta}`,
    _ganRG:                 sem._rg,
    _ganFallback:           !!sem._fallback,
    _ganRequiereVerif:      !!sem._requiereVerificacion
  };
}
function getLiqParams(){ try{ return {...getDefaultLiqParams(),...JSON.parse(localStorage.getItem(LIQ_PARAMS_KEY)||'{}')}; }catch(e){ return getDefaultLiqParams(); } }
function saveLiqParams(p){ localStorage.setItem(LIQ_PARAMS_KEY,JSON.stringify(p)); }

// ── SMVM para un período de liquidación ───────────────────────
// Siempre prioriza el módulo de escalas (getSMVMActual con la fecha del período),
// que siempre está actualizado. Fallback a params.smvmMensual solo si la función
// no está disponible (carga parcial del portal).
function _smvmParaPeriodo(anio, mes, params){
  if(typeof getSMVMActual === 'function'){
    const fechaRef = `${anio}-${String(mes).padStart(2,'0')}`;
    const row = getSMVMActual(fechaRef);
    if(row && row.mensual > 0) return row.mensual;
  }
  return $m(params?.smvmMensual) || 0;
}

// ── NR de paritaria para el código de sindicato del empleado ─
// Siempre prioriza el módulo de escalas (NR activo del sindicato).
// Mapeo cod_sindicato → sindId del módulo de escalas.
// Fallback a liqParams.asignacionNoRemPorSindicato si el módulo no cargó.
const _COD_SIND_MAP = { SEC:'comercio', UOM:'uom', PLASTICO:'uoyep', ASIMRA:'asimra', UOCRA:'uocra', UECARA:'uecara' };
function _nrParaCodSindicato(codSind, params){
  if(typeof _getNRActivoSind === 'function'){
    const sindId = _COD_SIND_MAP[String(codSind||'').toUpperCase()];
    if(sindId) return _getNRActivoSind(sindId);
    return 0; // FC u otros sin NR de paritaria
  }
  // Fallback: leer desde liqParams guardado
  return $m((params?.asignacionNoRemPorSindicato||{})[codSind]) || 0;
}

// ─────────────────────────────────────────────────────────────
// COMPLEMENTO FUNCIÓN — función pública, única fuente de verdad
// Fórmula LEITEN: CF = escala(cat,tramo) − (básico + aCuenta) × (1 + %pres/100)
// Prioridades:
//   1. básico > 0 + escala disponible  → calcula dinámicamente
//   2. básico > 0 + sin escala/tramo   → devuelve emp.complemento guardado
//   3. básico = 0                      → devuelve 0
// Disponible globalmente; usada por calcLiquidacion y el módulo ABM.
// ─────────────────────────────────────────────────────────────
function calcCFMensual(emp, params){
  // ─── Fórmula complemento función ────────────────────────────────────────
  // CF = escala − básico − a_cuenta − título − (básico + a_cuenta + título) × %pres
  //    = escala − (básico + a_cuenta + título) × (1 + %pres/100)
  //
  // "escala" = monto de la escala unificada para la cat/tramo del empleado.
  // "título" = monto fijo paritario del adicional por título (de la escala salarial),
  //            solo si el CCT del empleado lo dispone.
  // El resultado nunca puede ser menor a cero.
  const basico = $m(emp.basico);
  if(basico <= 0) return 0;
  const aCuenta = $m(emp.a_cuenta) || 0;

  // Monto de adicional por título (0 si el CCT no lo dispone o el empleado no tiene título)
  const _tieneAdicTit = (typeof getSindicatoByCodigo === 'function')
    ? (() => { const s = getSindicatoByCodigo(emp.cod_sindicato); return s?.tiene_adicional_titulo || false; })()
    : false;
  const mTitulo = (_tieneAdicTit && emp.titulo && typeof getMontoAdicionalTitulo === 'function')
    ? ($m(getMontoAdicionalTitulo(emp.titulo)) || 0)
    : 0;

  // Resolver cat/tramo: usar campo directo o descomponer cat_convenio ('CAT/TRAMO')
  const _cat   = (emp.cat   || '').trim().toUpperCase()
              || (emp.cat_convenio || '').split('/')[0].trim().toUpperCase();
  const _tramo = (emp.tramo || '').trim().toUpperCase()
              || (emp.cat_convenio || '').split('/')[1]?.trim().toUpperCase() || '';

  if(_cat && _tramo && typeof getMontoEscala === 'function'){
    const escala = getMontoEscala(_cat, _tramo);
    if(escala && escala > 0){
      const pctPres = params?.pctPresentismo ?? 5;
      // CF = escala − (básico + a_cuenta + título) × (1 + %pres/100)
      const base = basico + aCuenta + mTitulo;
      const cf = Math.round((escala - base * (1 + pctPres / 100)) * 100) / 100;
      return Math.max(0, cf);
    }
  }
  return Math.max(0, $m(emp.complemento) || 0); // fallback: sin escala → valor guardado (nunca negativo)
}

// ═══════════════════════════════════════════════════════════════
// TOPES DE APORTES — ART. 9 LEY 24.241 (SIPA)
// Actualización MENSUAL por movilidad IPC (Ley 27.609 mod. Ley 27.743)
// Tope mínimo = 3 MOPREs / Tope máximo = 75 MOPREs
// ARCA publica RG mensual con los valores actualizados.
//
// ⚠ IMPORTANTE: Los valores aquí son estimativos conservadores. VERIFICAR
// contra la RG oficial mensual publicada por ARCA antes de cada liquidación.
// ═══════════════════════════════════════════════════════════════

const APORTES_TOPES_KEY = LS.LIQ_APORTES_TOPES; // centralizado en js/00-constants.js

function getDefaultAportesTopesPorMes(){
  // Formato: 'YYYY-MM' — topes mensuales de base imponible de aportes SIPA.
  // ⚠ VALORES ESTIMATIVOS basados en entrenamiento (cutoff ene 2026).
  // Deben verificarse contra la RG oficial mensual de ARCA antes de cada liquidación.
  // Usar el botón "📥 Importar varios meses" para cargar los valores oficiales de una vez.
  //
  // Base: el máximo = 75 MOPREs, el mínimo = 3 MOPREs.
  // Actualización mensual por movilidad IPC (Ley 27.609 mod. Ley 27.743, vigente desde abr-2024).
  return {
    // ─── 2024 ─── (valores aproximados — régimen de movilidad trimestral hasta mar-2024)
    '2024-09': { topeMin:  62995.64, topeMax: 1574890.00, _rg:'RG 5561/2024',  _requiereVerificacion:true },
    '2024-10': { topeMin:  65212.45, topeMax: 1630310.00, _rg:'RG 5584/2024',  _requiereVerificacion:true },
    '2024-11': { topeMin:  67350.05, topeMax: 1683751.00, _rg:'RG 5597/2024',  _requiereVerificacion:true },
    '2024-12': { topeMin:  69574.30, topeMax: 1739357.00, _rg:'RG 5617/2024',  _requiereVerificacion:true },
    // ─── 2025 ─── (movilidad mensual por IPC)
    '2025-01': { topeMin:  71626.30, topeMax: 1790658.00, _rg:'RG 5631/2025',  _requiereVerificacion:true },
    '2025-02': { topeMin:  73434.00, topeMax: 1835851.00, _rg:'RG 5647/2025',  _requiereVerificacion:true },
    '2025-03': { topeMin:  75125.00, topeMax: 1878129.00, _rg:'RG 5660/2025',  _requiereVerificacion:true },
    '2025-04': { topeMin:  77005.00, topeMax: 1925132.00, _rg:'RG 5674/2025',  _requiereVerificacion:true },
    '2025-05': { topeMin:  78991.00, topeMax: 1974774.00, _rg:'RG 5688/2025',  _requiereVerificacion:true },
    '2025-06': { topeMin:  81036.00, topeMax: 2025905.00, _rg:'RG 5702/2025',  _requiereVerificacion:true },
    '2025-07': { topeMin:  83151.00, topeMax: 2078785.00, _rg:'RG 5715/2025',  _requiereVerificacion:true },
    '2025-08': { topeMin:  85212.00, topeMax: 2130303.00, _rg:'RG 5729/2025',  _requiereVerificacion:true },
    '2025-09': { topeMin:  87279.00, topeMax: 2182000.00, _rg:'RG 5743/2025',  _requiereVerificacion:true },
    '2025-10': { topeMin:  89378.00, topeMax: 2234455.00, _rg:'RG 5756/2025',  _requiereVerificacion:true },
    '2025-11': { topeMin:  91477.00, topeMax: 2286943.00, _rg:'RG 5770/2025',  _requiereVerificacion:true },
    '2025-12': { topeMin:  93617.00, topeMax: 2340427.00, _rg:'RG 5784/2025',  _requiereVerificacion:true },
    // ─── 2026 ─── (proyección — ajustar con RG publicada mensualmente)
    '2026-01': { topeMin: 117643.93,   topeMax: 3823372.95,   _rg:'Res ANSES 381/2025 (+2,47% IPC nov-2025)' },
    '2026-02': { topeMin: 120996.78,   topeMax: 3932339.08,   _rg:'Res ANSES 21/2026 (+2,85% IPC dic-2025)' },
    '2026-03': { topeMin: 124481.49,   topeMax: 4045590.45,   _rg:'Res ANSES 38/2026 (+2,88% IPC ene-2026)' },
    '2026-04': { topeMin: 128091.45,   topeMax: 4162912.57,   _rg:'Res ANSES 74/2026 (+2,90% IPC feb-2026)' },
    '2026-05': { topeMin: 132420.94,   topeMax: 4303619.01,   _rg:'Res ANSES 110/2026 (+3,38% IPC mar-2026)' }
  };
}

function getAportesTopesPorMes(){
  try {
    const stored = JSON.parse(localStorage.getItem(APORTES_TOPES_KEY)||'{}');
    return { ...getDefaultAportesTopesPorMes(), ...stored };
  } catch(e){
    return getDefaultAportesTopesPorMes();
  }
}

function saveAportesTopesPorMes(obj){
  try { localStorage.setItem(APORTES_TOPES_KEY, JSON.stringify(obj)); } catch(e) { console.warn('saveAportesTopesPorMes:', e); }
}

// Resuelve tope aplicable según fecha de pago (YYYY-MM-DD → YYYY-MM)
async function resolveTopesAportesParaFecha(fechaISO){
  const todos = getAportesTopesPorMes();
  const d = fechaISO
    ? new Date(fechaISO + (fechaISO.length===10?'T12:00:00':''))
    : new Date();
  if(isNaN(d.getTime())) return { topeMin:0, topeMax:Infinity, _fallback:true };
  const clave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  if(todos[clave]) return {...todos[clave], _periodo: clave};
  // Fallback: el mes más reciente previo a la fecha
  const claves = Object.keys(todos).sort();
  let mejor = null;
  for(const k of claves){
    if(k <= clave) mejor = k;
  }
  if(mejor) return {...todos[mejor], _periodo: mejor, _fallback: true};
  // Último recurso
  const primero = claves[0];
  return primero ? {...todos[primero], _periodo: primero, _fallback:true} : { topeMin:0, topeMax:Infinity, _fallback:true };
}


// ── IDB ─────────────────────────────────────────────────────────
async function getLiquidaciones(){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{ const tx=db.transaction('liquidaciones','readonly'); const r=tx.objectStore('liquidaciones').getAll(); r.onsuccess=()=>res(r.result); r.onerror=e=>rej(e.target.error); });
}
async function addLiquidacion(rec){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{ const tx=db.transaction('liquidaciones','readwrite'); const r=tx.objectStore('liquidaciones').add(rec); r.onsuccess=()=>res(r.result); r.onerror=e=>rej(e.target.error); });
}
async function updateLiquidacion(rec){
  if(typeof invalidarCacheGanancias === 'function') invalidarCacheGanancias();
  const db=await abrirIDB();
  return new Promise((res,rej)=>{ const tx=db.transaction('liquidaciones','readwrite'); const r=tx.objectStore('liquidaciones').put(rec); r.onsuccess=()=>res(); r.onerror=e=>rej(e.target.error); });
}
async function deleteLiquidacion(id){
  if(typeof invalidarCacheGanancias === 'function') invalidarCacheGanancias();
  const db=await abrirIDB();
  return new Promise((res,rej)=>{ const tx=db.transaction('liquidaciones','readwrite'); const r=tx.objectStore('liquidaciones').delete(id); r.onsuccess=()=>res(); r.onerror=e=>rej(e.target.error); });
}
async function getNovedadesLiq(liqId){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{ const tx=db.transaction('novedades_liq','readonly'); const r=tx.objectStore('novedades_liq').getAll(); r.onsuccess=()=>res(r.result.filter(n=>n.liqId===liqId)); r.onerror=e=>rej(e.target.error); });
}
async function saveNovedad(nov){
  const db=await abrirIDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('novedades_liq','readwrite');
    const store=tx.objectStore('novedades_liq');
    store.getAll().onsuccess=function(e){
      const ex=e.target.result.find(n=>n.liqId===nov.liqId&&n.leg===nov.leg);
      const req=ex?store.put({...nov,id:ex.id}):store.add(nov);
      req.onsuccess=()=>res(); req.onerror=e2=>rej(e2.target.error);
    };
  });
}

// ── Feriados Argentina ─────────────────────────────────────────────
// El catálogo completo 2024-2028 está en data/feriados-ar.js (cargado antes).
// Si por algún motivo no se cargó (fallback), declaramos un objeto vacío.
if(typeof FERIADOS_AR === 'undefined'){ window.FERIADOS_AR = {}; }

function diasHabilesDelMes(anio, mes){
  // Soporta el nuevo formato ISO ('YYYY-MM-DD') del catálogo completo.
  const feriadosArr = FERIADOS_AR[anio] || FERIADOS_AR[String(anio)] || [];
  // Aceptamos tanto 'YYYY-MM-DD' (formato ISO nuevo) como 'DD-MM' (legacy).
  const feriados = new Set(feriadosArr.map(f => {
    if(f.length === 10 && f.includes('-')) return f.substring(5);  // 'YYYY-MM-DD' → 'MM-DD'
    if(f.length === 5  && f.includes('-')) return f.slice(3) + '-' + f.slice(0, 2); // 'DD-MM' → 'MM-DD'
    return f;
  }));
  let habiles=0;
  const diasMes=new Date(anio,mes,0).getDate();
  for(let d=1;d<=diasMes;d++){
    const dt=new Date(anio,mes-1,d);
    const dow=dt.getDay();
    const key=String(mes).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    if(dow!==0&&dow!==6&&!feriados.has(key)) habiles++;
  }
  return {diasMes, habiles};
}

// Días hábiles entre dos fechas (inclusive), excluyendo feriados AR
function diasHabilesEntre(desde, hasta){
  if(!desde || !hasta || desde > hasta) return 0;
  let count = 0;
  const cur = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while(cur <= hasta){
    const anio = cur.getFullYear();
    const mes  = cur.getMonth() + 1;
    const dia  = cur.getDate();
    const dow  = cur.getDay();
    const feriados = new Set((FERIADOS_AR[String(anio)]||[]).map(f=>f.slice(3)+'-'+f.slice(0,2)));
    const key = String(mes).padStart(2,'0') + '-' + String(dia).padStart(2,'0');
    if(dow !== 0 && dow !== 6 && !feriados.has(key)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function calcularAniosAntiguedad(fechaIngreso, anio, mes){
  if(!fechaIngreso) return 0;
  let partes;
  if(fechaIngreso.includes('-')) partes=fechaIngreso.split('-');
  else partes=fechaIngreso.split('/').reverse();
  const ingreso=new Date(parseInt(partes[0], 10),parseInt(partes[1], 10)-1,parseInt(partes[2]||1, 10));
  // Usar último día del mes liquidado como referencia (más justo:
  // al terminar el mes ya cumplió el aniversario)
  const ref=new Date(anio,mes,0);
  return Math.max(0,Math.floor((ref-ingreso)/(1000*60*60*24*365.25)));
}

function $m(n){ return isNaN(n)||n===null?0:parseFloat(n)||0; }
function fmtPesos(n){ return '$'+$m(n).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDACIÓN FINAL — Helpers de cálculo
// ───────────────────────────────────────────────────────────────────────────
// Aplicable cuando liq.tipo === 'final' y el empleado tiene baja (egreso)
// dentro del período liquidado. Cada empleado guarda en `nov.liqFinalDatos`:
//   { motivoBaja, mejorRem, diasVacNoGozadas, sacProporcional, preavisoDias,
//     preavisoMonto, integracionMesDespido, indemAntiguedad, notas }
// ═══════════════════════════════════════════════════════════════════════════

// Parser robusto de fecha en "YYYY-MM-DD" o "DD/MM/YYYY" → Date | null
function _parseFechaLib(str){
  if(!str) return null;
  try {
    if(str.includes('-')){
      const [y,m,d] = str.split('-').map(Number);
      return new Date(y, m-1, d);
    }
    if(str.includes('/')){
      const [d,m,y] = str.split('/').map(Number);
      return new Date(y, m-1, d);
    }
  } catch(_){ }
  return null;
}

// ─── Vacaciones no gozadas — Art. 156 LCT ────────────────────────────────
// Días que correspondían según antigüedad pero no se tomaron.
// Días por año: <5 años → 14; 5-10 años → 21; 10-20 años → 28; ≥20 años → 35
// Si trabajó <6 meses en el año, corresponde proporcional: 1 día cada 20 trabajados.
// Valor del día = sueldo / 25 (Art. 155 LCT).
// Se pagan SIN aportes (no remunerativo según jurisprudencia y exento de Ganancias Art. 26 LIG).
function diasVacacionesPorAntiguedad(anios){
  if(anios < 5)  return 14;
  if(anios < 10) return 21;
  if(anios < 20) return 28;
  return 35;
}
function calcVacNoGozadas(emp, fechaEgreso, diasGozadosEnAnio){
  const fEgreso = fechaEgreso instanceof Date ? fechaEgreso : _parseFechaLib(fechaEgreso);
  if(!fEgreso) return { dias:0, monto:0, valorDia:0, anioCalculo:null, regimen:'sin_fecha' };
  const fIng = _parseFechaLib(emp.ing);
  if(!fIng) return { dias:0, monto:0, valorDia:0, anioCalculo:null, regimen:'sin_ingreso' };

  const anioEgr = fEgreso.getFullYear();
  const inicioAnio = new Date(anioEgr, 0, 1);
  // Cuántos días trabajó en el año del egreso
  const diasEnAnio = Math.floor((fEgreso - (fIng > inicioAnio ? fIng : inicioAnio)) / 86400000) + 1;

  // Antigüedad total al momento del egreso
  const anios = Math.floor((fEgreso - fIng) / (365.25 * 86400000));
  const diasPorAntig = diasVacacionesPorAntiguedad(anios);

  let diasCorresp;
  let regimen;
  // Art. 153 LCT: si trabajó menos de 6 meses (180 días aprox), corresponde proporcional
  // de 1 día cada 20 de trabajo efectivo. Si trabajó más, le corresponden los días
  // completos proporcionales al período del año (días en año / 365 × días por antig.)
  if(diasEnAnio < 180){
    diasCorresp = Math.floor(diasEnAnio / 20);
    regimen = 'proporcional_art153';
  } else {
    diasCorresp = Math.round(diasPorAntig * (diasEnAnio / 365));
    regimen = 'proporcional_anual';
  }

  const diasNoGozadas = Math.max(0, diasCorresp - ($m(diasGozadosEnAnio) || 0));
  const valorDia = $m(emp.bruto) / 25;
  return {
    dias: diasNoGozadas,
    monto: diasNoGozadas * valorDia,
    valorDia,
    diasCorresp,
    diasGozados: $m(diasGozadosEnAnio) || 0,
    diasEnAnio,
    anios,
    anioCalculo: anioEgr,
    regimen
  };
}

// ─── SAC proporcional — Art. 121 LCT ─────────────────────────────────────
// Días trabajados del semestre (desde 1/1 o 1/7) hasta egreso, divididos
// por 180 (días del semestre), por la mejor remuneración mensual del semestre / 2.
// Es REMUNERATIVO (aporta y tributa Ganancias).
function calcSacProporcional(emp, fechaEgreso, mejorRem){
  const fEgreso = fechaEgreso instanceof Date ? fechaEgreso : _parseFechaLib(fechaEgreso);
  if(!fEgreso) return { monto:0, diasSemestre:0, semestre:null };
  const anio = fEgreso.getFullYear();
  const mes = fEgreso.getMonth() + 1;
  // Semestre: 1 (ene-jun) o 2 (jul-dic)
  const semestre = mes <= 6 ? 1 : 2;
  const inicioSem = new Date(anio, semestre === 1 ? 0 : 6, 1);
  const fIng = _parseFechaLib(emp.ing) || inicioSem;
  const inicio = fIng > inicioSem ? fIng : inicioSem;
  const diasSem = Math.floor((fEgreso - inicio) / 86400000) + 1;
  // Base = mejor rem / 2 (medio sueldo)
  const base = ($m(mejorRem) || $m(emp.bruto)) / 2;
  const monto = base * (diasSem / 180);
  return { monto, diasSemestre: diasSem, semestre, anio, base };
}

// ─── Preaviso — Art. 232 LCT ─────────────────────────────────────────────
// Solo en despido sin causa. El empleador debe preavisar por escrito o
// pagar la indemnización sustitutiva.
//   <3 meses: 15 días
//   3 meses a 5 años: 1 mes
//   ≥5 años: 2 meses
// Es REMUNERATIVO (carácter salarial).
function calcPreaviso(emp, fechaEgreso){
  const fEgreso = fechaEgreso instanceof Date ? fechaEgreso : _parseFechaLib(fechaEgreso);
  const fIng = _parseFechaLib(emp.ing);
  if(!fEgreso || !fIng) return { dias:0, meses:0, monto:0 };
  const meses = (fEgreso.getFullYear() - fIng.getFullYear()) * 12 + (fEgreso.getMonth() - fIng.getMonth());
  let meses_preaviso;
  let dias_preaviso = 0;
  if(meses < 3){ meses_preaviso = 0; dias_preaviso = 15; }
  else if(meses < 60){ meses_preaviso = 1; }
  else { meses_preaviso = 2; }
  const monto = (meses_preaviso * $m(emp.bruto)) + (dias_preaviso * ($m(emp.bruto)/30));
  return { dias: dias_preaviso, meses: meses_preaviso, monto, antiguedadMeses: meses };
}

// ─── Integración mes de despido — Art. 233 LCT ──────────────────────────
// Si el despido se produce en un día que no coincide con el último del mes,
// el empleador paga los días faltantes hasta fin de mes.
// Es NO REMUNERATIVO (sustitutivo de salario).
function calcIntegracionMes(emp, fechaEgreso){
  const fEgreso = fechaEgreso instanceof Date ? fechaEgreso : _parseFechaLib(fechaEgreso);
  if(!fEgreso) return { dias:0, monto:0 };
  const ultDiaMes = new Date(fEgreso.getFullYear(), fEgreso.getMonth() + 1, 0).getDate();
  const diasRestantes = ultDiaMes - fEgreso.getDate();
  const valorDia = $m(emp.bruto) / 30;
  return { dias: diasRestantes, monto: diasRestantes * valorDia };
}

// ─── Indemnización por antigüedad — Art. 245 LCT ────────────────────────
// Solo en despido sin causa. = mejor remuneración mensual normal y habitual
// del último año × años de servicio (fracción >3 meses cuenta como año entero).
// Tope: la base no puede superar 3 × promedio de remuneraciones del CCT
// (en este sistema simplificado se aplica solo si se carga `topeCCT`).
// Mínimo: no menor a 1 sueldo (Ley 25.877).
// EXENTO de Ganancias hasta el tope (Art. 26 LIG).
function calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT){
  const fEgreso = fechaEgreso instanceof Date ? fechaEgreso : _parseFechaLib(fechaEgreso);
  const fIng = _parseFechaLib(emp.ing);
  if(!fEgreso || !fIng) return { aniosCalc:0, monto:0, baseAplicada:0, topeAplicado:false };
  const ms = fEgreso - fIng;
  const aniosFloat = ms / (365.25 * 86400000);
  const aniosEnteros = Math.floor(aniosFloat);
  const fraccion = aniosFloat - aniosEnteros;
  // Fracción >3 meses → cuenta como año entero
  const aniosCalc = (fraccion > 0.25) ? (aniosEnteros + 1) : aniosEnteros;
  const aniosFinales = Math.max(1, aniosCalc); // mínimo 1 sueldo

  let baseAplicada = $m(mejorRem) || $m(emp.bruto);
  let topeAplicado = false;
  if($m(topeCCT) > 0 && baseAplicada > $m(topeCCT) * 3){
    baseAplicada = $m(topeCCT) * 3;
    topeAplicado = true;
  }
  return {
    aniosFloat: +aniosFloat.toFixed(2),
    aniosCalc: aniosFinales,
    monto: baseAplicada * aniosFinales,
    baseAplicada,
    topeAplicado,
    fraccionMayor3meses: fraccion > 0.25
  };
}

// ─── Indemnización fuerza mayor / falta trabajo — Art. 247 LCT ─────────────
// = 50% de la indemnización Art. 245 (mitad). Requiere homologación MTSS.
// Se aplica cuando el empleador acredita que el cese obedece a fuerza mayor
// o disminución definitiva de trabajo, no imputable a su responsabilidad.
function calcIndemFuerzaMayor(emp, fechaEgreso, mejorRem, topeCCT){
  const base = calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT);
  return { ...base, monto: base.monto * 0.5, _reducida50: true, _art: '247' };
}

// ─── Indemnización incapacidad absoluta — Art. 213 LCT ──────────────────────
// = misma base que Art. 245 (igual que despido sin causa). Sin preaviso.
// EXENTO de Ganancias (Art. 26 LIG, inciso i).
function calcIndemIncapacidadAbsoluta(emp, fechaEgreso, mejorRem, topeCCT){
  const base = calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT);
  return { ...base, _art: '213' };
}

// ─── Indemnización incapacidad parcial — Art. 212 LCT ───────────────────────
// Si el empleador puede reasignar tareas equivalentes: NO hay indemnización.
// Si no puede reasignar y cesa el contrato: indemnización = Art. 245.
function calcIndemIncapacidadParcial(emp, fechaEgreso, mejorRem, topeCCT){
  const base = calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT);
  return { ...base, _art: '212' };
}

// ─── Indemnización por embarazo / maternidad — Art. 178 + 182 LCT ───────────
// = Art. 245 (indemnización ordinaria) + 1 año de remuneraciones (Art. 182).
// Total: indemArt245 + (mejorRem × 12).
// EXENTO de Ganancias la parte de Art. 182.
function calcIndemEmbarazo(emp, fechaEgreso, mejorRem, topeCCT){
  const base245 = calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT);
  const montoEspecial = ($m(mejorRem) || $m(emp.bruto)) * 12;
  return {
    ...base245,
    monto245:       base245.monto,
    montoEspecial,
    monto:          base245.monto + montoEspecial,
    _art:           '178',
  };
}

// ─── Indemnización por matrimonio — Art. 182 LCT ────────────────────────────
// = Art. 245 + 1 año de remuneraciones (igual fórmula que Art. 178).
function calcIndemMatrimonio(emp, fechaEgreso, mejorRem, topeCCT){
  const base245 = calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT);
  const montoEspecial = ($m(mejorRem) || $m(emp.bruto)) * 12;
  return {
    ...base245,
    monto245:       base245.monto,
    montoEspecial,
    monto:          base245.monto + montoEspecial,
    _art:           '182',
  };
}

// ─── Indemnización vencimiento contrato a plazo — Art. 95/97 LCT ────────────
// Solo si el contrato supera 1 año de duración.
// = 50% de la indemnización Art. 245.
function calcIndemFinContrato(emp, fechaEgreso, mejorRem, topeCCT){
  const base = calcIndemAntiguedad(emp, fechaEgreso, mejorRem, topeCCT);
  return { ...base, monto: base.monto * 0.5, _reducida50: true, _art: '97' };
}

// ─── Multa Art. 80 LCT — entrega tardía de certificados ─────────────────────
// Si el empleador no entrega certificado de trabajo / constancia AFIP dentro
// de los 30 días de intimación fehaciente: multa = 3 veces la MBRNH.
// Es REMUNERATIVA (criterio jurisprudencial mayoritario).
function calcMultaCertificados(emp, mejorRem){
  const base = $m(mejorRem) || $m(emp.bruto);
  return { monto: base * 3, base, _art: '80' };
}

// ─── Ley 25323 Art. 1 — duplicación indem. por trabajo no registrado ─────────
// Si la relación laboral fue clandestina (no registrada o sub-registrada),
// la indemnización Art. 245 se duplica. Requiere reclamación fehaciente.
function calcDobleIndemLey25323Art1(indem245Monto){
  return { monto: $m(indem245Monto), _art: 'Ley25323-1' };
}

// ─── Ley 25323 Art. 2 — incremento 50% por mora en el pago ─────────────────
// Si el empleador no paga en tiempo (notificación fehaciente del trabajador
// y falta de pago en plazo) la suma de: preaviso + integración + Art. 245
// se incrementa en un 50%.
function calcIncrementoMora25323(totalIndem245, totalPreaviso, totalIntegracion){
  const base = $m(totalIndem245) + $m(totalPreaviso) + $m(totalIntegracion);
  return { monto: base * 0.5, base, _art: 'Ley25323-2' };
}

// ─── Art. 132 bis LCT — sanción por retención de aportes ───────────────────
// Si el empleador retuvo aportes al trabajador y no los depositó ante AFIP:
// multa = 1 remuneración mensual por cada período retenido.
function calcSancionArt132bis(mejorRem, mesesRetenidos){
  const base = $m(mejorRem);
  const meses = Math.max(0, Math.round($m(mesesRetenidos)));
  return { monto: base * meses, base, meses, _art: '132bis' };
}

// ── Motor de cálculo ─────────────────────────────────────────────
async function calcularItemLiquidacion(emp, params, nov, anio, mes, anticipos, fechaPagoLiq, tipoLiq){
  const {diasMes, habiles}=diasHabilesDelMes(anio,mes);

  // ─── Acotar período cuando es quincenal ────────────────────────────────
  // quincenal_1: 1-15 del mes (primera quincena)
  // quincenal_2: 16-fin del mes (segunda quincena)
  // resto: período completo del mes
  // Para quincenales se computa la mitad de los días de la base (sueldo/15
  // en lugar de sueldo/30), y los hábiles se cuentan solo del rango.
  const _esQuinc1 = tipoLiq === 'quincenal_1';
  const _esQuinc2 = tipoLiq === 'quincenal_2';
  const _esQuincenal = _esQuinc1 || _esQuinc2;
  const _factorPeriodo = _esQuincenal ? 0.5 : 1.0;

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULO DE DÍAS Y JORNAL DIARIO — POLÍTICA: DIVISOR CALENDARIO (30)
  // ───────────────────────────────────────────────────────────────────────
  // El divisor del jornal diario es 30 (días calendario), no días hábiles.
  // Esto significa que todos los días del mes (laborales, sábados, domingos
  // y feriados) valen lo mismo. El sueldo mensual = jornal × 30, indistinto
  // del calendario laboral.
  //
  // El campo nov.diasTrabajados sigue siendo la cantidad de días efectivamente
  // trabajados (en escala de 30). Si el empleado tuvo ausencias, se cuentan
  // contra los 30 días calendario.
  //
  // EXCEPCIÓN UOCRA (Ley 22.250): los empleados bajo régimen UOCRA siguen
  // calculando sobre días hábiles porque su sistema tiene FCL aparte y no
  // necesita el divisor 30 (sistema indemnizatorio propio).
  // ═══════════════════════════════════════════════════════════════════════
  const _esUocra = (typeof esRegimenLey22250 === 'function') && esRegimenLey22250(emp);
  const diasBase = _esUocra ? habiles : 30;  // divisor del jornal
  const diasBaseDescripcion = _esUocra ? 'hábiles' : 'calendario (30)';
  const diasTrab=$m(nov.diasTrabajados ?? diasBase);
  const ausentismo=Math.max(0, diasBase - diasTrab);
  const _basicoEmp  = $m(emp.basico);
  const _aCuentaEmp = $m(emp.a_cuenta) || 0;
  const _cfMensual  = calcCFMensual(emp, params);  // ver función global

  // bruto: respeta el valor guardado (retrocompatibilidad). Solo usa la
  // fórmula cuando el empleado no tiene bruto cargado manualmente.
  const _brutoGuardado = $m(emp.bruto);
  const bruto = _brutoGuardado > 0
    ? _brutoGuardado
    : (_basicoEmp + _aCuentaEmp + _cfMensual) || 0;

  const proporcion = diasBase > 0 ? diasTrab/diasBase : 1;

  // ─ Sueldo básico + Complemento Función ──────────────────────
  // Invariante: sueldoBasico + mCompFuncion = bruto × proporcion × factor
  const _tieneCompFuncion = _cfMensual > 0 && _basicoEmp > 0;
  const sueldoBasico = _tieneCompFuncion
    ? (bruto - _cfMensual) * proporcion * _factorPeriodo
    : bruto * proporcion * _factorPeriodo;
  const mCompFuncion = _tieneCompFuncion
    ? _cfMensual * proporcion * _factorPeriodo
    : 0;

  // ─ Horas extras ─
  // Valor hora extra = bruto / 173
  // ─────────────────────────────────────────────────────────
  // El divisor 173 surge de aplicar el promedio mensual de horas laborables
  // de la jornada legal de 8 hs (Ley 11.544): 200 hs/mes laborales menos
  // 27 hs prom. de descanso compensatorio = 173 hs efectivas.
  // Decisión empresarial LEITEN: usar 173 para todos los regímenes (LCT y
  // UOCRA), independientemente del divisor del jornal diario.
  // El bruto incluye: básico + a cuenta futuros aumentos + complemento
  // función + antigüedad (todos los componentes remunerativos fijos).
  const valHora = bruto / 173;
  const hsE50=$m(nov.hsExtra50); const hsE100=$m(nov.hsExtra100);
  const mHsE50=hsE50*valHora*1.5; const mHsE100=hsE100*valHora*2;

  // ─ Antigüedad ─
  // Según código de sindicato del empleado. Si no tiene sindicato → 0%.
  const anios=calcularAniosAntiguedad(emp.ing, anio, mes);
  const pctAntigPorAnio = getPctAntiguedadPorAnio(emp, params);
  const pctAntig=pctAntigPorAnio*anios;
  const mAntig=sueldoBasico*pctAntig/100;

  // ─ Suspensiones disciplinarias del período ─
  // Las suspensiones aplicadas como sanción son días NO trabajados → descuento proporcional
  const diasSuspension = $m(nov.diasSuspension);
  const valorDiaSuspH  = diasBase > 0 ? bruto / diasBase : 0;
  const mDescSuspension = diasSuspension * valorDiaSuspH;
  const tieneSuspension = diasSuspension > 0;

  // ─ Empleados Fuera de Convenio (FC) ─
  const esFueraConvenio = (typeof empleadoFueraConvenio === 'function') && empleadoFueraConvenio(emp);

  // ─ Adicional por título (monto fijo paritario) ─────────────────────────
  // El monto viene de la escala salarial activa (negociado por paritaria),
  // no es un porcentaje. Solo aplica si el CCT del empleado lo dispone
  // (tiene_adicional_titulo = true en su sindicato).
  const _tieneAdicTitulo = (typeof getSindicatoByCodigo === 'function')
    ? (() => { const s = getSindicatoByCodigo(emp.cod_sindicato); return s?.tiene_adicional_titulo || false; })()
    : false;
  const _montoTituloEscala = (_tieneAdicTitulo && emp.titulo && typeof getMontoAdicionalTitulo === 'function')
    ? getMontoAdicionalTitulo(emp.titulo)
    : 0;
  // Si el empleado tuvo ausencias proporcionales, el adicional se prorratear igual que el básico
  const mAdicionalTitulo = _montoTituloEscala > 0
    ? $m(_montoTituloEscala * proporcion * _factorPeriodo)
    : 0;
  // pctTitulo → 0 (ya no se usa %, se deja en 0 para compatibilidad del return)
  const _pctTitulo = 0;

  // ─ Base de presentismo (configurable por CCT) ────────────────────────────
  // Según getPresBase(emp) el CCT puede disponer que el presentismo se calcule
  // sobre: solo el básico, básico+antigüedad, o básico+antigüedad+título.
  const tienePres = !esFueraConvenio
                 && ausentismo===0
                 && !$m(nov.ausenciasInjustificadas)
                 && !tieneSuspension;
  // ─ Base de presentismo ───────────────────────────────────────────────────
  // Base completa (cuando el CCT lo dispone):
  //   básico + a_cuenta + título + antigüedad
  // El campo pres_base del sindicato controla qué componentes se incluyen.
  // Nota: a_cuenta (NR paritaria) siempre suma cuando está incluida en la base.
  const _presBaseCCT = (typeof getPresBase === 'function') ? getPresBase(emp) : 'basico';
  const _basePresCalc = (() => {
    // Básico siempre incluido
    let base = sueldoBasico;
    if(_presBaseCCT === 'basico+antig' || _presBaseCCT === 'basico+antig+titulo'){
      base += mAntig;
      base += _aCuentaEmp * proporcion * _factorPeriodo;  // a cuenta proporcional
    }
    if(_presBaseCCT === 'basico+antig+titulo'){
      base += mAdicionalTitulo;
    }
    return base;
  })();
  const mPres = tienePres ? $m(_basePresCalc * params.pctPresentismo / 100) : 0;

  // ─ SAC proporcional (si corresponde) ─
  const mSac=$m(nov.sac);

  // ═══════════════════════════════════════════════════════════════
  //   FERIADOS NO TRABAJADOS (Art. 168 LCT)
  //   ─────────────────────────────────────────────
  //   Régimen LCT: el empleado cobra UN JORNAL ADICIONAL por cada feriado
  //   del mes que NO trabajó. Es independiente de si cae en día hábil o
  //   fin de semana. Si lo trabajó, ese día se paga como hs ext 100%.
  //
  //   Régimen UOCRA (Ley 22.250): también paga feriados según Art. 168 LCT
  //   pero SOLO se contabilizan los feriados que caen en DÍAS HÁBILES
  //   (lunes a viernes), porque UOCRA no trabaja sábados ni domingos por
  //   regla general del régimen. Los feriados que caen en sábado/domingo
  //   no generan derecho a jornal adicional.
  //
  //   La novedad `nov.feriadosTrabajados` indica cuántos del mes trabajó
  //   (por defecto 0 → cobra todos los del régimen como no trabajados).
  //
  //   Valor del día feriado = bruto / divisor (30 calendario para LCT,
  //   o hábiles para UOCRA, según _esUocra).
  // ═══════════════════════════════════════════════════════════════
  const _feriadosMesAr = (typeof getFeriadosDelMes === 'function') ? getFeriadosDelMes(anio, mes) : [];
  const _feriadosTrabajados = $m(nov.feriadosTrabajados);

  // Para UOCRA filtramos solo feriados en día hábil (lun-vie)
  const _feriadosAplicables = _esUocra
    ? _feriadosMesAr.filter(fIso => {
        const [y, m, d] = fIso.split('-').map(Number);
        const dow = new Date(y, m - 1, d).getDay();
        return dow !== 0 && dow !== 6;  // 0=domingo, 6=sábado
      })
    : _feriadosMesAr;

  const cantFeriadosNoTrab = Math.max(0, _feriadosAplicables.length - _feriadosTrabajados);
  const valorFeriado = _esUocra ? (habiles > 0 ? bruto / habiles : 0) : (bruto / 30);
  // En quincenales, solo contabilizamos los feriados que caen en la quincena
  let _feriadosEnQuincena = cantFeriadosNoTrab;
  if(_esQuincenal && _feriadosAplicables.length){
    _feriadosEnQuincena = _feriadosAplicables.filter(fIso => {
      const d = parseInt(fIso.substring(8, 10), 10);
      return _esQuinc1 ? (d <= 15) : (d > 15);
    }).length - Math.min(_feriadosTrabajados, _feriadosAplicables.length);
    _feriadosEnQuincena = Math.max(0, _feriadosEnQuincena);
  }
  const mFeriadosNoTrab = valorFeriado * _feriadosEnQuincena;

  // ═══════════════════════════════════════════════════════════════
  //   ART. 155 LCT — VACACIONES Y LICENCIAS ESPECIALES
  //   Valor del día = sueldo mensual / 25 (mantenemos legalmente Art. 155)
  //   "Otras licencias" se liquidan con divisor calendario (igual sueldo)
  // ═══════════════════════════════════════════════════════════════
  const valorDia155   = bruto / 25;
  const valorDiaComun = diasBase > 0 ? bruto / diasBase : 0;

  // ─ Vacaciones (días ingresados en novedades) — Art. 155 ─
  const diasVac = $m(nov.vacaciones);
  const mVac    = diasVac * valorDia155;

  // ─ Licencias especiales informadas (desglosadas por tipo) ─
  // Toma los días impactantes desde licenciasAplicadas (pre-populadas en renderNovedades)
  const licsAplicadas = nov.licenciasAplicadas || [];
  const sumDias = (...tipos) => licsAplicadas
    .filter(l => tipos.some(t => (l.tipo||'').toLowerCase().includes(t.toLowerCase())))
    .reduce((s,l) => s + (l.dias||0), 0);

  const diasMatrimonio   = sumDias('Matrimonio');
  const diasNacimiento   = sumDias('Nacimiento');
  const diasFallecimiento= sumDias('Fallecimiento');
  const diasExamen       = sumDias('Examen');

  // Licencias especiales SIN GOCE (sin_goce, maternidad, excedencia) — días sumados aparte, NO pagan
  const diasSinGoce      = licsAplicadas.filter(l => l.sinGoce).reduce((s,l)=>s+(l.dias||0), 0);
  const diasSinGoceSG    = licsAplicadas.filter(l => l.tipoEspecial==='sin_goce').reduce((s,l)=>s+(l.dias||0), 0);
  const diasMaternidad   = licsAplicadas.filter(l => l.tipoEspecial==='maternidad').reduce((s,l)=>s+(l.dias||0), 0);
  const diasExcedencia   = licsAplicadas.filter(l => l.tipoEspecial==='excedencia').reduce((s,l)=>s+(l.dias||0), 0);

  // Otras licencias (día común) — EXCLUYE las sin goce
  const diasOtrasLic     = licsAplicadas
    .filter(l => !l.sinGoce && !['Matrimonio','Nacimiento','Fallecimiento','Examen','Licencia Anual'].some(t => (l.tipo||'').includes(t)))
    .reduce((s,l) => s + (l.dias||0), 0);

  // Art. 155 LCT (sueldo/25)
  const mMatrimonio    = diasMatrimonio    * valorDia155;
  const mNacimiento    = diasNacimiento    * valorDia155;
  const mFallecimiento = diasFallecimiento * valorDia155;
  const mExamen        = diasExamen        * valorDia155;
  // Otras licencias → día común (sueldo/días hábiles del mes)
  const mOtrasLic      = diasOtrasLic      * valorDiaComun;
  // Licencias sin goce → $0 (solo se registran los días para información)
  const mSinGoce       = 0;

  const mLicEspeciales = mMatrimonio + mNacimiento + mFallecimiento + mExamen + mOtrasLic;

  // ─ Cumplimiento de objetivos ─
  // Concepto remunerativo (suma a base de aportes y Ganancias).
  // Se carga manualmente o por importación de archivo legajo+monto.
  const mCumpObj = $m(nov.cumplimientoObjetivos);

  // ─ Liquidación final — conceptos por baja (Arts. 121, 156, 232, 233, 245 LCT) ─
  // Solo se aplican cuando `nov.liqFinalDatos` está presente (lo carga el modal
  // de liquidación final). El modal calcula los valores y los deja listos;
  // acá solo se suman al lugar correspondiente (rem / exento).
  const lf = nov.liqFinalDatos || null;
  // Conceptos clásicos (Arts. 121, 156, 232, 233, 245)
  const mPreaviso        = lf ? $m(lf.preavisoMonto) : 0;           // REM — Art. 232
  const mSacProporcional = lf ? $m(lf.sacProporcional) : 0;         // REM — Art. 121
  const mVacNoGozadas    = lf ? $m(lf.vacNoGozadasMonto) : 0;       // EXENTO — Art. 156
  const mIntegrMesDesp   = lf ? $m(lf.integracionMesDespido) : 0;   // EXENTO — Art. 233
  const mIndemAntig      = lf ? $m(lf.indemAntiguedad) : 0;         // EXENTO — Art. 245
  // Indemnizaciones especiales (nuevos motivos LCT)
  const mIndemEspecial   = lf ? $m(lf.indemEspecialMonto) : 0;      // EXENTO — Art. 178/182 (1 año rem)
  const mIndemFM         = lf ? $m(lf.indemFuerzaMayor) : 0;        // EXENTO — Art. 247
  const mIndemIncapAbs   = lf ? $m(lf.indemIncapacidadAbsoluta) : 0;// EXENTO — Art. 213
  const mIndemIncapParc  = lf ? $m(lf.indemIncapacidadParcial) : 0; // EXENTO — Art. 212
  const mIndemFinCont    = lf ? $m(lf.indemFinContrato) : 0;        // EXENTO — Art. 97
  // Multas y sanciones
  const mMultaCert       = lf ? $m(lf.multaCertificados) : 0;       // REM — Art. 80 LCT
  const mDobleIndem25323 = lf ? $m(lf.dobleIndemLey25323) : 0;      // EXENTO — Ley 25323 Art. 1
  const mIncremMora25323 = lf ? $m(lf.incrementoMora25323) : 0;     // EXENTO — Ley 25323 Art. 2
  const mSancion132bis   = lf ? $m(lf.sancionArt132bis) : 0;        // REM — Art. 132 bis

  // ─ Otros haberes ─
  // Cada item tiene { tipo, concepto, monto }. El `tipo` define si es
  // remunerativo (suma a la base de aportes/Ganancias) o no.
  // Compat: si un item viejo NO tiene `tipo`, se asume remunerativo.
  const otrosH = (nov.otrosHaberes || []);
  let mOtrosHRem = 0;
  let mOtrosHNoRem = 0;
  otrosH.forEach(h => {
    const tInfo = _tipoHaberInfo(h.tipo || 'otro_rem');
    const monto = $m(h.monto);
    if(tInfo.esRem !== false) mOtrosHRem += monto;
    else                       mOtrosHNoRem += monto;
  });
  const mOtrosH = mOtrosHRem + mOtrosHNoRem;  // total bruto, retrocompat con consumidores

  // ─ Ajuste de sueldo ─
  const mAjuste=$m(nov.ajusteSueldo);

  // ─ Conceptos EXENTOS de ganancias (se pagan al empleado pero NO tributan ni aportan) ─
  //   Art. 82 LIG (horas extras exentas), bonos productividad exentos,
  //   indemnizaciones Art. 180 bis, otros conceptos exentos.
  //   Legalmente SON haberes del trabajador (forman parte del neto) pero
  //   están EXCLUIDOS de la base de aportes/contribuciones y de la base imponible de ganancias.
  const mHsExtrasExentas    = $m(nov.hsExtrasExentas);
  const mBonoExento         = $m(nov.bonoProductividadExento);
  const mIndemniz           = $m(nov.indemnizaciones);
  const mOtrosExentos       = $m(nov.otrosExentos);

  // ─── Asignación NO REMUNERATIVA por paritaria (CCT del empleado) ───────
  // Siempre se lee desde el módulo de escalas (NR activo del sindicato),
  // sin necesidad de sincronización manual. Fallback a liqParams si el
  // módulo de escalas no está disponible.
  // Cita legal: Art. 103 bis LCT — acuerdos paritarios.
  const _claveSindParitaria = emp.cod_sindicato || 'FC';
  const _montoParitariaPlena = _nrParaCodSindicato(_claveSindParitaria, params);
  const mAsigNoRem = _montoParitariaPlena * proporcion * _factorPeriodo;

  // ─── REGLAS ESPECIALES SEC (Empleados de Comercio) ─────────────────────
  // La paritaria del SEC tiene 3 particularidades sobre la asignación NR:
  //  (1) Antigüedad calculada también sobre el no remunerativo
  //  (2) Presentismo calculado sobre (no rem + antig sobre no rem)
  //  (3) Aportes de OS (3%) + ANSSAL (0,5%) + contrib. patronal (6%)
  //     sobre TODOS los conceptos no remunerativos del empleado
  // Los items (1) y (2) SE SUMAN al total exento (no pagan jubilación)
  // pero SÍ pagan OS según regla (3).
  const _esSEC = (emp.cod_sindicato === 'SEC');
  const mAntigSobreNoRem = _esSEC ? (mAsigNoRem * pctAntig / 100) : 0;
  const mPresSobreNoRem  = (_esSEC && tienePres)
                         ? ((mAsigNoRem + mAntigSobreNoRem) * params.pctPresentismo / 100)
                         : 0;

  // Los plus no-remunerativos del catálogo + conceptos exentos de liq. final
  // ENGROSAN los exentos:
  const totalExentos = mHsExtrasExentas + mBonoExento + mIndemniz + mOtrosExentos + mOtrosHNoRem
                     + mAsigNoRem
                     + mAntigSobreNoRem + mPresSobreNoRem
                     // Liq. final — conceptos EXENTOS Art. 26 LIG
                     + mVacNoGozadas + mIntegrMesDesp + mIndemAntig
                     + mIndemEspecial + mIndemFM + mIndemIncapAbs + mIndemIncapParc + mIndemFinCont
                     + mDobleIndem25323 + mIncremMora25323;

  // BASE REMUNERATIVA (sujeta a aportes y base imponible de ganancias)
  // Importante: SOLO los haberes adicionales remunerativos van acá.
  // Para liq. final: preaviso (rem) y SAC proporcional (rem) se suman acá.
  // Feriados no trabajados (Art. 168 LCT): son remunerativos, suman aquí.
  const totalHaberesRem = sueldoBasico + mHsE50 + mHsE100 + mAntig + mPres
                        + mSac + mVac + mLicEspeciales + mOtrosHRem + mAjuste + mCumpObj
                        + mPreaviso + mSacProporcional + mFeriadosNoTrab
                        // Liq. final — conceptos REMUNERATIVOS
                        + mMultaCert + mSancion132bis
                        + mCompFuncion                      // complemento función (escala - base)
                        + mAdicionalTitulo;                 // adicional por título CCT

  // TOTAL HABERES = remunerativos + no remunerativos exentos (lo que cobra el empleado)
  let totalHaberes = totalHaberesRem + totalExentos;

  // ═══════════════════════════════════════════════════════════════
  //   CONCEPTOS CUSTOM (definidos por RR.HH./Admin desde el panel)
  //   Se aplican antes del cálculo de aportes para que los flags de
  //   imponibilidad de cada concepto afecten correctamente la base.
  //   Solo se aplican los conceptos en estado 'activo'.
  // ═══════════════════════════════════════════════════════════════
  const _ccItems = [];
  let _ccTotalRem = 0, _ccTotalNoRem = 0, _ccTotalDesc = 0, _ccTotalAporte = 0, _ccTotalContribPat = 0;
  let _ccBaseImpJub = 0, _ccBaseImpOS = 0, _ccBaseImpGan = 0, _ccBaseImpFCL = 0, _ccBaseEmbargable = 0, _ccBaseSAC = 0;

  const _ccCacheLocal = (typeof _conceptosCustomCache !== 'undefined') ? _conceptosCustomCache : [];
  if(_ccCacheLocal.length && typeof evaluarFormula === 'function'){
    // Contexto de cálculo para los conceptos custom (variables disponibles en fórmulas)
    // Detección de regímenes
    const _ccEsUOCRA = (typeof esRegimenLey22250 === 'function') ? !!esRegimenLey22250(emp) : false;
    const _ccEsQuincenal = (tipoLiq === 'quincenal_1' || tipoLiq === 'quincenal_2') ? 1 : 0;
    // Antigüedad en meses calendario
    const _ccMeses = (() => {
      if(typeof _uocraMesesAntiguedad === 'function') return _uocraMesesAntiguedad(emp.ing, anio, mes);
      // Fallback inline si UOCRA aún no cargó
      if(!emp.ing) return 0;
      const partes = emp.ing.includes('-') ? emp.ing.split('-') : emp.ing.split('/').reverse();
      const yIng = parseInt(partes[0],10), mIng = parseInt(partes[1],10);
      if(isNaN(yIng) || isNaN(mIng)) return 0;
      return Math.max(0, (anio - yIng) * 12 + (mes - mIng));
    })();

    const ctxConceptos = {
      // Haberes base
      sueldoBasico, mAntig, mPres, mHsE50, mHsE100, mSac, mVac, mAjuste, mCumpObj,
      mLicEspeciales, mOtrosHRem, mCompFuncion,
      // Totales (los descuentos/neto se completan en segunda pasada)
      totalHaberesRem, totalExentos, totalHaberes,
      totalDescuentos: 0, netoAPagar: 0,
      // Tiempo
      diasTrab, ausentismo, habiles, diasMes, anios,
      meses: _ccMeses,
      diasVac: $m(item?.diasVac) || $m(diasVac) || 0,
      diasSuspension: $m(diasSusp) || 0,
      // Empleado
      esQuincenal: _ccEsQuincenal,
      esRegimenUOCRA: _ccEsUOCRA ? 1 : 0,
      esRegimenLCT: _ccEsUOCRA ? 0 : 1,
      // Aportes / descuentos / patronales (segunda pasada las completa)
      jubilacion: 0, obraSocial: 0, pamiEmp: 0, anssal: 0, sindicato: 0,
      ganancias: 0, embargo: 0, anticiposDesc: 0,
      jubPatronal: 0, osPatronal: 0, pamiPatronal: 0, desempleo: 0, art: 0
    };
    // Mapa de montos manuales cargados en la novedad
    // nov.conceptosCustomManuales = [{ codigo, monto }]
    const _ccManualesPorCodigo = {};
    if(Array.isArray(nov.conceptosCustomManuales)){
      nov.conceptosCustomManuales.forEach(m => {
        if(m && m.codigo) _ccManualesPorCodigo[String(m.codigo).toUpperCase()] = $m(m.monto);
      });
    }

    for(const concepto of _ccCacheLocal){
      let monto = 0;
      const esManual = (typeof _ccEsTipoManual === 'function') ? _ccEsTipoManual(concepto.tipo) : false;

      if(esManual){
        // Tipos MANUAL: el monto NO se calcula con fórmula, viene de la novedad
        const cargado = _ccManualesPorCodigo[String(concepto.codigo).toUpperCase()];
        if(cargado != null) monto = cargado;
      } else {
        // Tipos con fórmula
        try { monto = evaluarFormula(concepto.formula, ctxConceptos); }
        catch(e){ console.warn('Error evaluando concepto', concepto.codigo, e); monto = 0; }
      }
      monto = Math.round(monto * 100) / 100;  // redondeo a centavos
      if(!monto || isNaN(monto)) continue;

      const itemConcepto = { codigo: concepto.codigo, nombre: concepto.nombre, tipo: concepto.tipo, monto, concepto, esManual };
      _ccItems.push(itemConcepto);

      // Acumular según tipo (los manuales se asimilan a su tipo base)
      const tipoEfectivo = concepto.tipo === 'REM_MANUAL' ? 'REM' :
                           concepto.tipo === 'NO_REM_MANUAL' ? 'NO_REM' :
                           concepto.tipo === 'DESCUENTO_MANUAL' ? 'DESCUENTO' :
                           concepto.tipo;

      if(tipoEfectivo === 'REM'){
        _ccTotalRem += monto;
        if(concepto.imponibleJub) _ccBaseImpJub += monto;
        if(concepto.imponibleOS)  _ccBaseImpOS  += monto;
        if(concepto.imponibleGanancias) _ccBaseImpGan += monto;
        if(concepto.imponibleFCL) _ccBaseImpFCL += monto;
        if(concepto.embargable)   _ccBaseEmbargable += monto;
        if(concepto.habitualSAC)  _ccBaseSAC += monto;
      } else if(tipoEfectivo === 'NO_REM'){
        _ccTotalNoRem += monto;
        if(concepto.imponibleGanancias) _ccBaseImpGan += monto;
      } else if(tipoEfectivo === 'DESCUENTO'){
        _ccTotalDesc += monto;
      } else if(tipoEfectivo === 'APORTE'){
        _ccTotalAporte += monto;
      } else if(tipoEfectivo === 'CONTRIBUCION_PATRONAL'){
        _ccTotalContribPat += monto;
      }
    }
    // Las bases imponibles del REM custom se suman a las del motor
    // pero respetando los flags individuales de cada concepto.
    totalHaberes += _ccTotalRem + _ccTotalNoRem;
  }

  // Total remunerativo final (incluye custom REM)
  const totalHaberesRemFinal = totalHaberesRem + _ccTotalRem;
  const totalExentosFinal    = totalExentos + _ccTotalNoRem;

  // ═══════════════════════════════════════════════════════════════
  //   TOPES DE APORTES — Art. 9 Ley 24.241 (SIPA)
  //   Aplica tope mínimo (3 MOPRES) y máximo (75 MOPRES) a la base
  //   imponible de los aportes del TRABAJADOR. Las contribuciones
  //   patronales se calculan SIN tope máximo (Art. 9 modif. Ley 26.417).
  //   El SAC tiene su propia base imponible con los mismos topes.
  // ═══════════════════════════════════════════════════════════════
  const fechaPagoAportes = fechaPagoLiq || `${anio}-${String(mes).padStart(2,'0')}-01`;
  const topes = await resolveTopesAportesParaFecha(fechaPagoAportes);
  const topeMin = topes.topeMin || 0;
  const topeMax = topes.topeMax || Infinity;

  // Bases imponibles SEPARADAS: sueldo (sin SAC) y SAC tienen topes independientes
  // IMPORTANTE: calculadas sobre REMUNERATIVOS (sin incluir exentos)
  const remSinSac        = Math.max(0, totalHaberesRem - mSac);
  const baseSueldoAportes = Math.min(Math.max(remSinSac, topeMin), topeMax);
  const baseSacAportes    = Math.min(Math.max(mSac, 0),            topeMax);
  const baseAportes       = baseSueldoAportes + baseSacAportes;
  const aportesTopeados   = (topeMax < Infinity || topeMin > 0)
                          && (remSinSac > topeMax || mSac > topeMax || remSinSac < topeMin);

  // ─ Aportes del trabajador (sobre base con topes Art. 9 Ley 24241) ─
  const jubilacion=baseAportes*params.pctJubilacion/100;
  let obraSocial=baseAportes*params.pctObraSocial/100;
  let anssal    =baseAportes*params.pctAnssal/100;
  const pamiEmp   =baseAportes*params.pctPamiEmp/100;
  // Sindicato: según código del empleado. Si no tiene código → 0%.
  const pctSindEmp = getPctSindicatoEmpleado(emp);
  const sindicato=totalHaberesRem*pctSindEmp/100;
  // Ganancias: por defecto valor de novedad; se RECALCULA automáticamente más abajo
  // (salvo nov.gananciasManual === true). Ver bloque GANANCIAS 4ª.
  let ganancias=$m(nov.ganancias);

  // ─── REGLA SEC: Aportes OS sobre TODOS los no remunerativos ────────────
  // La paritaria del SEC obliga a que OS (3%) + ANSSAL (0,5%) se calculen
  // también sobre TODOS los conceptos no remunerativos (asignación, antig
  // sobre NR, presentismo sobre NR, hs ext exentas, bono exento, etc).
  // La contribución patronal de OS (6%) también se calcula sobre estos
  // conceptos — se aplica más abajo, junto con las demás contribuciones.
  // Cita: CCT 130/75 SEC + acuerdos paritarios sucesivos.
  let osSobreNoRem = 0, anssalSobreNoRem = 0;
  if(_esSEC){
    osSobreNoRem     = totalExentos * params.pctObraSocial / 100;
    anssalSobreNoRem = totalExentos * params.pctAnssal     / 100;
    obraSocial += osSobreNoRem;
    anssal     += anssalSobreNoRem;
  }

  // ═══════════════════════════════════════════════════════════════
  //   GANANCIAS 4ª — RETENCIÓN / DEVOLUCIÓN AUTOMÁTICA (RG ARCA 4003/2017)
  //   El monto del período = impuesto determinado acumulado − retenido en
  //   períodos previos del ejercicio fiscal, CON SIGNO (negativo = devolución).
  //   Por construcción, al cierre del período:
  //       retenido acumulado + monto del período = impuesto determinado
  //   ⇒ la diferencia da CERO.
  //   nov.gananciasManual === true permite HARDCODEAR nov.ganancias.
  //   El cálculo usa los aportes obligatorios del mes ya finalizados
  //   (incluyen los devengados sobre SAC / pagos no habituales) más el
  //   acumulado de períodos previos; las deducciones personales declaradas
  //   solo se consideran si hay F.572 SIRADIG importado (ver calcGananciasMes).
  // ═══════════════════════════════════════════════════════════════
  if(nov.gananciasManual === true){
    ganancias = $m(nov.ganancias);
  } else if(typeof calcGananciasMes === 'function'){
    try {
      const _snapGan = {
        leg: emp.leg,
        totalHaberesRem: totalHaberesRemFinal,
        totalHaberes,
        mSac,
        jubilacion, obraSocial, anssal, pamiEmp, sindicato,
        ganancias: 0
      };
      const _liqGan = { anio, mes, fechaPago: fechaPagoLiq, tipo: tipoLiq };
      const _gRes = await calcGananciasMes(_snapGan, _liqGan, params, nov);
      ganancias = _gRes.impMesAuto;   // con signo: negativo = devolución
    } catch(_eGan){
      console.warn('Ganancias: autocálculo falló, se usa valor de novedad.', _eGan);
      ganancias = $m(nov.ganancias);
    }
  }

  // ─── TOPE DE RETENCIÓN MENSUAL — RG ARCA 4003/2017 ──────────────────────
  // La retención de Ganancias del mes no puede superar el 35% (params.
  // gan_topeRetencionPct) de la remuneración neta del período (haberes −
  // aportes obligatorios). El excedente NO se retiene: se expone como
  // SALDO A PAGAR en el F.1357. Por el diseño de acumulados
  // (impMesAuto = impDetAcum − retenidoAcum), el remanente no retenido se
  // traslada automáticamente a los meses siguientes del ejercicio.
  // No aplica a devoluciones (ganancias < 0).
  const _topeRetPct = (params.gan_topeRetencionPct != null ? params.gan_topeRetencionPct : 35);
  if(ganancias > 0 && _topeRetPct > 0){
    const _netoAntesGan = totalHaberes - (jubilacion + obraSocial + anssal + pamiEmp + sindicato);
    const _topeRet = Math.max(0, _netoAntesGan) * _topeRetPct / 100;
    if(ganancias > _topeRet) ganancias = _topeRet;
  }

  // ═══════════════════════════════════════════════════════════════
  //   EMBARGOS — modelo de array (múltiples coexistentes)
  // ───────────────────────────────────────────────────────────────
  //   Casos reales: alimentos + común, dos cuotas alimentarias a
  //   hijos de distintas uniones, común + Art. 132 bis (daños), etc.
  //
  //   Procesamiento por capas:
  //   1. ALIMENTOS primero (sin tope Art. 147). Base = haberes -
  //      aportes obligatorios (jub + OS + ANSSAL + PAMI). Cada item
  //      es un % independiente que se suma.
  //   2. COMUNES después (tope Art. 147 LCT — 20% sobre el excedente
  //      del neto sobre el SMVM). El tope es CONJUNTO sobre la suma
  //      de todos los embargos comunes, no por item. Y se calcula
  //      sobre el neto DESPUÉS del descuento de alimentos.
  //
  //   Modelo:
  //     nov.embargos = [
  //       { id, tipo: 'comun'|'alimentos', monto?, pct?, motivo, expediente }
  //     ]
  //
  //   Migración lazy desde el formato viejo (nov.embargoTipo + .embargo).
  // ═══════════════════════════════════════════════════════════════
  const embargosList = (() => {
    if(Array.isArray(nov.embargos) && nov.embargos.length) return nov.embargos;
    // Compat formato viejo:
    if(nov.embargoTipo === 'alimentos' && $m(nov.embargoAlimentosPct) > 0){
      return [{ id:'_legacy', tipo:'alimentos', pct:$m(nov.embargoAlimentosPct), motivo: nov.embargoMotivo||'' }];
    }
    if(($m(nov.embargo) > 0) && (nov.embargoTipo !== 'alimentos')){
      return [{ id:'_legacy', tipo:'comun', monto:$m(nov.embargo), motivo: nov.embargoMotivo||'' }];
    }
    return [];
  })();

  const smvm = _smvmParaPeriodo(anio, mes, params);
  // Para quincenales: el SMVM se proporciona al período liquidado para que
  // el tope Art. 147 LCT (20% del excedente) tenga sentido sobre el neto
  // quincenal. Sin este ajuste, los netos quincenales nunca superarían el
  // SMVM mensual y no se podría embargar nada.
  const smvmPeriodo = smvm * _factorPeriodo;

  // Capa 1: ALIMENTOS — sin tope. Base = haberes - aportes obligatorios.
  const baseAlim = Math.max(0, totalHaberes - jubilacion - obraSocial - anssal - pamiEmp);
  const itemsAlim = embargosList.filter(e => e.tipo === 'alimentos');
  const sumaAlimPct = itemsAlim.reduce((s,e) => s + $m(e.pct), 0);
  const mAlimentos = baseAlim * (sumaAlimPct / 100);

  // Capa 2: COMUNES — tope Art. 147 conjunto, sobre neto post-alimentos.
  const itemsComun = embargosList.filter(e => e.tipo === 'comun');
  const sumaComunCargada = itemsComun.reduce((s,e) => s + $m(e.monto), 0);
  // ── Ajuste de la LIQUIDACIÓN ANUAL de Ganancias (Art. 21 RG 4003/2017) ──
  // Solo en ABRIL (mes 4): imputa la diferencia del cierre del ejercicio anterior
  // (N = anio-1) como concepto. NO integra el acumulado mensual del ejercicio en
  // curso (es un ajuste del ejercicio anterior). Con signo: <0 = devolución.
  let ajusteGananciasAnual = 0;
  if(mes === 4 && typeof getAjusteAnualGanParaAbril === 'function'){
    try {
      const _ajAnual = getAjusteAnualGanParaAbril(emp.leg, anio - 1);
      if(_ajAnual && Math.abs($m(_ajAnual.diferencia)) > 0.005) ajusteGananciasAnual = $m(_ajAnual.diferencia);
    } catch(_eAj){ ajusteGananciasAnual = 0; }
  }
  const netoTrasAlim = totalHaberes - (jubilacion+obraSocial+anssal+pamiEmp+sindicato+ganancias+anticipos+mAlimentos);
  let topeComun = 0;
  let mComun = sumaComunCargada;
  let topeComunAplicado = false;
  if(sumaComunCargada > 0 && smvmPeriodo > 0){
    topeComun = netoTrasAlim > smvmPeriodo ? (netoTrasAlim - smvmPeriodo) * 0.20 : 0;
    if(sumaComunCargada > topeComun){
      mComun = topeComun;
      topeComunAplicado = true;
    }
  }

  const embargo = mAlimentos + mComun;

  // Snapshot retro-compatible para consumidores viejos:
  const embargoTipo = (itemsAlim.length && !itemsComun.length) ? 'alimentos'
                    : (!itemsAlim.length && itemsComun.length) ? 'comun'
                    : (itemsAlim.length && itemsComun.length) ? 'mixto' : 'comun';
  const embargoCargado = sumaComunCargada;       // legacy
  const embargoTope = topeComun;                 // legacy
  const embargoTopeAplicado = topeComunAplicado; // legacy

  const anticiposDesc=anticipos; // de solicitudes aprobadas
  const otrosD=(nov.otrosDescuentos||[]);
  const mOtrosD=otrosD.reduce((s,d)=>s+$m(d.monto),0);

  const totalDescuentos=jubilacion+obraSocial+anssal+pamiEmp+sindicato+ganancias+embargo+anticiposDesc+mOtrosD+mDescSuspension+_ccTotalDesc+_ccTotalAporte+ajusteGananciasAnual;
  // ─ Redondeo del recibo a CERO CENTAVOS ──────────────────────────
  // Concepto calculado que lleva el neto al número entero ($) más próximo
  // hacia ARRIBA: el neto a pagar siempre termina en .00. El redondeo es la
  // diferencia (0..0,99) que se suma. Identidad del recibo:
  //   Neto a pagar = Total Haberes − Total Descuentos + Redondeo
  const _netoPrevio=Math.max(0,totalHaberes-totalDescuentos);
  const _netoCent=Math.round(_netoPrevio*100)/100;        // a centavos (saca ruido flotante)
  const netoAPagar=Math.ceil(_netoCent);                  // ENTERO: el neto termina en .00
  const redondeo=Math.round((netoAPagar-_netoPrevio)*100)/100;  // 0..0,99 que se suma
  totalHaberes=Math.round((netoAPagar+totalDescuentos)*100)/100; // mantiene Haberes − Descuentos = Neto

  // ─ Contribuciones patronales (sin tope máximo — Ley 26.417) ─
  // Se calculan sobre REMUNERATIVOS (los conceptos exentos no generan contribuciones)
  const jubPatronal=totalHaberesRem*params.pctJubPatronal/100;
  let osPatronal=totalHaberesRem*params.pctOsPatronal/100;
  const pamiPatronal=totalHaberesRem*params.pctPamiPatronal/100;
  const desempleo=totalHaberesRem*params.pctDesempleo/100;
  // Alícuota ART: desde la empresa en IDB/cache o desde ART_SEED.
  // Fallback a params.pctArt solo si no hay ART configurada en ningún lado.
  let _pctArtVigente = params.pctArt || 1.5;
  if(emp?.emp && typeof resolveAlicuotaArtParaEmpresa === 'function'){
    const _empNombre = emp.emp;
    let _artList = null;
    // 1) Intentar desde la cache de ABM Empresas
    if(typeof _empresasABMCache !== 'undefined' && _empresasABMCache?.length){
      const _empObj = _empresasABMCache.find(e =>
        (e.nombre||'').trim().toUpperCase() === _empNombre.trim().toUpperCase()
      );
      if(_empObj?.art?.length) _artList = _empObj.art;
    }
    // 2) Fallback: ART_SEED (datos cargados en el módulo 56-art-empresas.js)
    if(!_artList && typeof ART_SEED !== 'undefined'){
      const _seedKey = Object.keys(ART_SEED).find(k =>
        k.trim().toUpperCase() === _empNombre.trim().toUpperCase()
      );
      if(_seedKey) _artList = ART_SEED[_seedKey];
    }
    if(_artList){
      const _aliArt = resolveAlicuotaArtParaEmpresa(_artList, fechaPagoAportes);
      if(_aliArt != null) _pctArtVigente = _aliArt;
    }
  }
  const art=totalHaberesRem*_pctArtVigente/100;
  // SCVO (Dto. 1567/74): cargo patronal fijo per cápita, NO porcentual
  // sobre haberes. Solo se aplica si RR.HH. cargó el per cápita vigente.
  const scvo = $m(params.scvoPercapita) || 0;
  const pctSindPatronal = getPctSindicatoPatronal(emp);
  const sindPatronal=totalHaberesRem*pctSindPatronal/100;

  // ─── REGLA SEC: Contribución patronal de OS también sobre no rem ───────
  // Por paritaria CCT 130/75, la contribución patronal de Obra Social (6%)
  // se aplica también sobre todos los conceptos no remunerativos del
  // empleado SEC. NO afecta el neto del empleado (es contribución patronal)
  // pero SÍ engrosa el costo laboral total para la empresa.
  let osPatronalSobreNoRem = 0;
  if(_esSEC){
    osPatronalSobreNoRem = totalExentos * params.pctOsPatronal / 100;
    osPatronal += osPatronalSobreNoRem;
  }

  // ─── Contribuciones específicas régimen UOCRA Ley 22.250 ───────────────
  // Si el empleado está bajo régimen 22.250, se suman FCL, IERIC, Fondo
  // Sanidad, CAR y CESLU como contribuciones patronales adicionales (NO se
  // descuentan del empleado). Reemplazan al sistema indemnizatorio LCT.
  let _aportesUOCRA = null;
  if(typeof calcularContribucionesUOCRA === 'function'){
    _aportesUOCRA = calcularContribucionesUOCRA(emp, {
      totalHaberesRem, sueldoBasico
    }, anio, mes);
  }
  const mFCL          = _aportesUOCRA?.mFCL          || 0;
  const mIeric        = _aportesUOCRA?.mIeric        || 0;
  const mFondoSanidad = _aportesUOCRA?.mFondoSanidad || 0;
  const mCAR          = _aportesUOCRA?.mCAR          || 0;
  const mCeslu        = _aportesUOCRA?.mCeslu        || 0;
  const totalContribUOCRA = mFCL + mIeric + mFondoSanidad + mCAR + mCeslu;

  // El total de contribuciones patronales incluye las del régimen UOCRA si aplica
  const totalContrib=jubPatronal+osPatronal+pamiPatronal+desempleo+art+sindPatronal+scvo+totalContribUOCRA+_ccTotalContribPat;

  return {
    leg:emp.leg, nom:emp.nom, empresa:emp.emp, lugar:emp.lugar||'', cuil:emp.cuil||'',
    diasMes, habiles, diasTrab, ausentismo, anios,
    diasBase, diasBaseDescripcion,
    bruto, sueldoBasico, valHora, valorDia155, valorDiaComun,
    // Feriados no trabajados (Art. 168 LCT) — exclusivo régimen LCT, no UOCRA
    cantFeriadosMes: _feriadosMesAr.length,
    cantFeriadosNoTrab: _feriadosEnQuincena,
    feriadosTrabajados: _feriadosTrabajados,
    valorFeriado,
    mFeriadosNoTrab,
    hsE50, mHsE50, hsE100, mHsE100,
    pctAntig, mAntig,
    tienePres, mPres, esFueraConvenio,
    mSac,
    // Vacaciones y licencias Art. 155 LCT
    diasVac, mVac,
    diasMatrimonio, mMatrimonio,
    diasNacimiento, mNacimiento,
    diasFallecimiento, mFallecimiento,
    diasExamen, mExamen,
    diasOtrasLic, mOtrasLic,
    diasSinGoce, diasSinGoceSG, diasMaternidad, diasExcedencia, mSinGoce,
    mLicEspeciales,
    // Suspensión disciplinaria (sanción aplicada en el período)
    diasSuspension, mDescSuspension, valorDiaSuspH, tieneSuspension,
    suspensionesAplicadas: nov.suspensionesAplicadas || [],
    mAjuste, mOtrosH, otrosH,
    // Conceptos exentos de ganancias (NO remunerativos)
    mHsExtrasExentas, mBonoExento, mIndemniz, mOtrosExentos,
    // Asignación no remunerativa por paritaria (Art. 103 bis LCT)
    mAsigNoRem,
    asigNoRemParitaria: _montoParitariaPlena,  // monto pleno antes del prorrateo (para trazabilidad)
    // SEC: antigüedad y presentismo calculados sobre el no remunerativo (paritaria CCT 130/75)
    mAntigSobreNoRem,
    mPresSobreNoRem,
    esSEC: _esSEC,
    // SEC: aportes adicionales sobre no rem (trazabilidad — ya están sumados en obraSocial/anssal)
    osSobreNoRem,
    anssalSobreNoRem,
    osPatronalSobreNoRem,
    // Totales finales (incluyen conceptos custom)
    totalExentos: totalExentosFinal,
    totalHaberesRem: totalHaberesRemFinal,
    totalHaberes,
    // Trazabilidad: totales sin conceptos custom (para auditoría)
    totalHaberesRemBase: totalHaberesRem,
    totalExentosBase: totalExentos,
    // Conceptos custom aplicados
    conceptosCustom: _ccItems,
    ccTotalRem: _ccTotalRem,
    ccTotalNoRem: _ccTotalNoRem,
    ccTotalDesc: _ccTotalDesc,
    ccTotalAporte: _ccTotalAporte,
    ccTotalContribPat: _ccTotalContribPat,
    // Topes Art. 9 Ley 24241
    topeMinAportes: topeMin, topeMaxAportes: topeMax,
    baseSueldoAportes, baseSacAportes, baseAportes,
    aportesTopeados, topesPeriodoRef: topes._periodo || null, topesFallback: !!topes._fallback,
    jubilacion, obraSocial, anssal, pamiEmp, sindicato,
    // Datos del sindicato específico del empleado (para impresión recibo)
    codSindicato: emp.cod_sindicato || '',
    nombreSindicato: getNombreSindicato(emp) || (params.nombreSindicato || ''),
    pctSindicatoEmp: pctSindEmp,
    pctSindicatoPatronal: pctSindPatronal,
    pctAntigPorAnio: pctAntigPorAnio,
    ganancias, gananciasManual: nov.gananciasManual === true, ajusteGananciasAnual, embargo, anticiposDesc, mOtrosD, otrosD,
    // Trazabilidad embargos: lista detallada + agregados
    embargos: embargosList,
    mAlimentos, mComun,                         // por capa
    embargoTipo, embargoCargado, embargoTope, embargoTopeAplicado, smvmRef: smvmPeriodo,
    embargoBaseAlim: baseAlim,
    embargoMotivo: nov.embargoMotivo || '',     // legacy
    // Desglose de plus categorizados (rem vs no rem)
    mOtrosHRem, mOtrosHNoRem,
    // Cumplimiento de objetivos (concepto remunerativo)
    mCumpObj, cumplimientoObjetivos: mCumpObj,
    mCompFuncion, basicoEmp: _basicoEmp, aCuentaEmp: _aCuentaEmp,
    mAdicionalTitulo, pctTitulo: _pctTitulo, tituloEmp: emp.titulo || '', tituloDescEmp: emp.titulo_desc || '',
    presBase: _presBaseCCT, basePresCalc: _basePresCalc,
    // Liquidación final (conceptos por baja)
    mPreaviso, mSacProporcional, mVacNoGozadas, mIntegrMesDesp, mIndemAntig,
    liqFinalDatos: lf,
    // Flags y referencias del nov (necesarios para validaciones cruzadas y F.931)
    _bajaEnPeriodo: nov._bajaEnPeriodo || null,
    _altaEnPeriodo: nov._altaEnPeriodo || null,
    licenciasAplicadas: nov.licenciasAplicadas || [],
    // Referencia compacta a las novedades (para módulos que consultan flags ad-hoc)
    nov: { _importadoSiradig: !!nov._importadoSiradig, hsExtra50: nov.hsExtra50, hsExtra100: nov.hsExtra100 },
    totalDescuentos, netoAPagar, redondeo,
    jubPatronal, osPatronal, pamiPatronal, desempleo, art, sindPatronal, scvo, totalContrib,
    // Régimen UOCRA Ley 22.250 — contribuciones patronales adicionales
    // (todas en cero si el empleado no es de UOCRA)
    esRegimenUOCRA: !!_aportesUOCRA,
    mFCL, mIeric, mFondoSanidad, mCAR, mCeslu, totalContribUOCRA,
    fclPctAplicado: _aportesUOCRA?.fclPctAplicado || 0,
    mesesAntigUocra: _aportesUOCRA?.mesesAntig || 0,
    totalCosto: totalHaberes+totalContrib,
    params
  };
}

// ── Tab switcher ─────────────────────────────────────────────────
let _liqActiva = null;

// Cache de conceptos custom activos — se refresca en cada cálculo de preview
// para garantizar que cambios aprobados se apliquen sin necesidad de F5.
let _conceptosCustomCache = [];
async function _refreshConceptosCustomCache(periodo){
  if(typeof getConceptosCustomActivos === 'function'){
    try { _conceptosCustomCache = await getConceptosCustomActivos(periodo); }
    catch(_){ _conceptosCustomCache = []; }
  } else {
    _conceptosCustomCache = [];
  }
}
function liqTab(tab){
  ['periodos','novedades','preview','recibos','reportes','params'].forEach(t=>{
    const p=document.getElementById('liq-pane-'+t);
    const b=document.getElementById('liq-tab-'+t);
    if(p) p.style.display=t===tab?'block':'none';
    if(b){ b.style.borderBottomColor=t===tab?'var(--accent)':'transparent'; b.style.color=t===tab?'var(--accent2)':'var(--t3)'; b.style.fontWeight=t===tab?'600':'400'; }
  });
  if(tab==='params') cargarParamsForm(); renderLiqTopesTabla();
}

// ── Períodos ─────────────────────────────────────────────────────
// ── Variables para liquidación individual ──────────────────────
let _liqEmpSeleccionado = null; // {leg, nom} del empleado individual

function resetNuevoLiqForm(){
  _liqEmpSeleccionado = null;
  const r = document.querySelector('input[name="liq-alcance"][value="grupal"]');
  if(r){ r.checked=true; toggleAlcanceLiq('grupal'); }
  const s = document.getElementById('liq-emp-search');
  if(s) s.value = '';
  const sel = document.getElementById('liq-emp-selected');
  if(sel) sel.textContent = '';
  const res = document.getElementById('liq-emp-results');
  if(res){ res.innerHTML=''; res.style.display='none'; }
}

// ─── Poblar select de empresa en formulario nueva liquidación ───────────
async function liqPoblarEmpresas(){
  const sel = document.getElementById('liq-empresa');
  if(!sel) return;
  sel.innerHTML = '<option value="">— Seleccioná una empresa —</option>' + '<option value="todas">Todas las empresas</option>';

  // La fuente de verdad para el VALUE siempre es e.emp de la nómina
  // (es lo que usa el filtro nomina.filter(e=>e.emp===liq.empresa)).
  // El ABM de empresas solo se usa para enriquecer el label con CUIT o razón social.
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  const empNames = [...new Set(nomina.map(e => e.emp||'').filter(Boolean))].sort();

  // Intentar enriquecer con datos del ABM (razón social formal, CUIT)
  let abmEmpresas = [];
  try {
    abmEmpresas = (typeof getEmpresasABM === 'function') ? (await getEmpresasABM()) : [];
  } catch(e) { abmEmpresas = []; }

  empNames.forEach(nomEmp => {
    const abm = abmEmpresas.find(a =>
      (a.nombre||'').trim().toUpperCase() === nomEmp.trim().toUpperCase()
    );
    const opt = document.createElement('option');
    opt.value = nomEmp;  // ← SIEMPRE el valor exacto de e.emp
    opt.textContent = abm?.cuit
      ? `${nomEmp} — CUIT ${abm.cuit}`
      : nomEmp;
    sel.appendChild(opt);
  });
}

// Al cambiar la empresa, actualizar el contador y refrescar lista de empleados
function liqEmpresaCambio(){
  const empresa = document.getElementById('liq-empresa')?.value;
  const infoEl  = document.getElementById('liq-empresa-info');
  if(infoEl){
    if(!empresa){
      infoEl.textContent = '';
    } else {
      const activos = getNomina().filter(e => !e._deBaja && !e.egreso && (empresa==='todas' || (e.emp||'') === empresa));
      infoEl.textContent = (empresa==='todas')
        ? `${activos.length} empleado${activos.length!==1?'s':''} activo${activos.length!==1?'s':''} — todas las empresas`
        : `${activos.length} empleado${activos.length!==1?'s':''} activo${activos.length!==1?'s':''}`;
    }
  }
  // Si alcance es individual, refrescar la lista de empleados
  const alcance = document.querySelector('input[name="liq-alcance"]:checked')?.value;
  if(alcance === 'individual'){
    _liqEmpSeleccionado = null;
    const s   = document.getElementById('liq-emp-search');
    const sel = document.getElementById('liq-emp-selected');
    if(s)   s.value = '';
    if(sel) sel.textContent = '';
    buscarEmpLiq();
  }
}


function toggleAlcanceLiq(val){
  const sel = document.getElementById('liq-emp-selector');
  if(sel) sel.style.display = val === 'individual' ? 'block' : 'none';
  if(val !== 'individual'){
    _liqEmpSeleccionado = null;
    const s   = document.getElementById('liq-emp-search');
    const sel2= document.getElementById('liq-emp-selected');
    const res = document.getElementById('liq-emp-results');
    if(s)    s.value = '';
    if(sel2) sel2.textContent = '';
    if(res){ res.innerHTML = ''; res.style.display = 'none'; }
  } else {
    // Al activar Individual, mostrar todos los empleados de la empresa seleccionada
    setTimeout(buscarEmpLiq, 50);
  }
}

function buscarEmpLiq(){
  const q       = (document.getElementById('liq-emp-search')?.value || '').toLowerCase().trim();
  const res     = document.getElementById('liq-emp-results');
  if(!res) return;
  const empresa = document.getElementById('liq-empresa')?.value || '';
  // Filtrar por empresa si está seleccionada; sin empresa = todos
  const nomina  = getNomina().filter(e =>
    !e._deBaja && !e.egreso && (!empresa || empresa === 'todas' || e.emp === empresa)
  );
  // Sin texto: mostrar todos de la empresa; con texto: filtrar
  const matches = q.length >= 1
    ? nomina.filter(e => e.nom.toLowerCase().includes(q) || (e.leg||'').includes(q))
    : nomina;
  if(!matches.length){
    res.style.display = 'block';
    res.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--t3)">Sin empleados' + (empresa ? ' en esta empresa.' : '.') + '</div>';
    return;
  }
  res.style.display = 'block';
  res.innerHTML = matches.slice(0, 60).map(e =>
    `<div onclick="seleccionarEmpLiq('${e.leg}','${e.nom.replace(/'/g,"\\'")}')"
      style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center"
      onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      <span style="font-family:var(--font-mono);color:var(--t3);font-size:10px;min-width:52px">${e.leg}</span>
      <span style="color:var(--t1);flex:1">${e.nom}</span>
      <span style="font-size:10px;color:var(--t3)">${e.emp||''}</span>
    </div>`).join('') +
    (matches.length > 60 ? `<div style="padding:8px 12px;font-size:11px;color:var(--t3)">... y ${matches.length-60} más. Escribí para filtrar.</div>` : '');
}

async function seleccionarEmpLiq(leg, nom){
  _liqEmpSeleccionado = {leg, nom};
  const s = document.getElementById('liq-emp-search');
  if(s) s.value = nom;
  const res = document.getElementById('liq-emp-results');
  if(res){ res.innerHTML=''; res.style.display='none'; }
  const sel = document.getElementById('liq-emp-selected');
  if(sel) sel.textContent = `✓ Seleccionado: ${nom} (Leg. ${leg})`;
}

async function abrirNuevoPeriodo(){
  const f = document.getElementById('liq-nuevo-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  resetNuevoLiqForm();
  const hoy = new Date();
  document.getElementById('liq-periodo').value = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('liq-fecha-pago').value = new Date(hoy.getFullYear(),hoy.getMonth()+1,5).toISOString().split('T')[0];
  if(f.style.display === 'block') await liqPoblarEmpresas();
}

async function crearLiquidacion(){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede crear liquidaciones','var(--red)'); return; }
  const tipo     = document.getElementById('liq-tipo').value;
  const periodo  = document.getElementById('liq-periodo').value;
  const empresa  = document.getElementById('liq-empresa').value;
  if(!empresa){
    toast('⚠ Seleccioná una empresa', 'var(--yellow)');
    document.getElementById('liq-empresa')?.focus();
    return;
  }
  const fechaPago= document.getElementById('liq-fecha-pago').value;
  const alcance  = document.querySelector('input[name="liq-alcance"]:checked')?.value || 'grupal';

  // Validar formato del periodo (YYYY-MM) y rango razonable
  if(!periodo || !/^\d{4}-\d{2}$/.test(periodo)){
    toast('⚠ Seleccioná un período válido (YYYY-MM)','var(--yellow)'); return;
  }
  const [anio,mes] = periodo.split('-').map(Number);
  if(isNaN(anio) || isNaN(mes) || anio < 2000 || anio > 2100 || mes < 1 || mes > 12){
    toast('⚠ Período inválido','var(--yellow)'); return;
  }
  if(alcance==='individual' && !_liqEmpSeleccionado){
    toast('⚠ Seleccioná un empleado','var(--yellow)'); return;
  }
  if(fechaPago && !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)){
    toast('⚠ Fecha de pago inválida','var(--yellow)'); return;
  }

  // Prevenir duplicados exactos (mismo tipo+período+empresa+empLeg)
  const existentes = await getLiquidaciones();
  const empLeg = alcance==='individual' ? _liqEmpSeleccionado.leg : null;
  const dup = existentes.find(l =>
    l.tipo === tipo && l.periodo === periodo && (l.empresa||'') === (empresa||'') &&
    (l.empLeg||null) === empLeg
  );
  if(dup){
    toast(`⚠ Ya existe una liquidación ${tipo} para ${periodo} con esos parámetros`, 'var(--yellow)', 4500);
    return;
  }

  const liq = {
    tipo, periodo, anio, mes, empresa, fechaPago,
    alcance,
    empLeg,
    empNom: alcance==='individual' ? _liqEmpSeleccionado.nom : null,
    estado:'borrador', creadoEl:new Date().toLocaleDateString('es-AR'),
    creadoPor: currentUser?.emp?.leg || null,
    creadoPorNom: currentUser?.emp?.nom || null,
    items:[]
  };
  const id = await addLiquidacion(liq);
  liq.id = id;
  _liqActiva = liq;
  document.getElementById('liq-nuevo-form').style.display = 'none';
  resetNuevoLiqForm();
  toast('✓ Liquidación creada','var(--green)');
  renderLiqPeriodos();
  await cargarNovedadesParaLiq(id);
  liqTab('novedades');
}

async function renderLiqPeriodos(){
  const div=document.getElementById('liq-lista-periodos');
  if(!div) return;
  const lista=await getLiquidaciones();
  if(!lista.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">💼</div><div class="empty-text">No hay liquidaciones registradas</div></div>';
    return;
  }
  lista.sort((a,b)=>(b.periodo||'').localeCompare(a.periodo||''));
  const tipoLabel={mensual:'Mensual',quincenal:'Quincenal',quincenal_1:'Quinc. 1ª (1-15)',quincenal_2:'Quinc. 2ª (16-fin)',sac1:'SAC 1°',sac2:'SAC 2°',vacaciones:'Vacaciones',anticipo:'Anticipo de haberes',final:'Final',complementaria:'Complementaria'};
  const estadoColor={borrador:'var(--yellow)',aprobada:'var(--green)',pagada:'var(--accent2)',cerrada:'#888'};
  div.innerHTML=`<div class="card" style="padding:0;overflow:hidden">`+
    lista.map(l=>{
      const alcanceLabel = l.alcance==='individual'
        ? `<span style="font-size:10px;color:var(--yellow);font-family:var(--font-mono);border:1px solid rgba(234,179,8,.3);padding:1px 6px;border-radius:6px">👤 Individual</span> ${l.empNom||''}` 
        : (l.empresa==='todas'?'Todas las empresas':l.empresa);
      // Tooltip detallado con la trazabilidad de cambios de estado
      const _fmtTrans = iso => iso ? new Date(iso).toLocaleString('es-AR') : '?';
      const trazTooltip = [
        l.aprobadaEl ? `Aprobada: ${_fmtTrans(l.aprobadaEl)} por ${l.aprobadaPorNom||l.aprobadaPor||'?'}` : '',
        l.pagadaEl   ? `Pagada: ${_fmtTrans(l.pagadaEl)} por ${l.pagadaPorNom||l.pagadaPor||'?'}` : '',
        l.cerradaEl  ? `Cerrada: ${_fmtTrans(l.cerradaEl)} por ${l.cerradaPorNom||l.cerradaPor||'?'}` : ''
      ].filter(Boolean).join('\n') || 'Sin transiciones registradas';
      return `
    <div style="display:grid;grid-template-columns:120px 90px 1fr 120px 100px auto;align-items:center;padding:12px 18px;border-bottom:1px solid var(--border);gap:12px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${l.periodo}</div>
      <div style="font-size:11px;color:var(--t3)">${tipoLabel[l.tipo]||l.tipo}</div>
      <div style="font-size:12px;color:var(--t2)">${alcanceLabel}</div>
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3)">Pago: ${l.fechaPago||'—'}</div>
      <div title="${trazTooltip.replace(/"/g,'&quot;')}" style="cursor:help"><span style="font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid ${estadoColor[l.estado]||'var(--border)'};color:${estadoColor[l.estado]||'var(--t3)'}">${l.estado}</span></div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="abrirLiquidacion(${l.id})">✎ Abrir</button>
        <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="borrarLiquidacion(${l.id})">✕</button>
      </div>
    </div>`;}).join('')+`</div>`;
}

async function abrirLiquidacion(id){
  const lista=await getLiquidaciones();
  _liqActiva=lista.find(l=>l.id===id);
  if(!_liqActiva){ toast('⚠ No se encontró la liquidación','var(--red)'); return; }
  await cargarNovedadesParaLiq(id);
  // Si la liq tiene items vacíos, los precalculamos para que los recibos no
  // salgan vacíos si el usuario va directo al tab Recibos. Esto cubre tanto
  // liquidaciones en borrador (nunca calculadas) como aprobadas/pagadas cuyo
  // payload de items se haya corrompido o perdido al guardar.
  if(!_liqActiva.items || !_liqActiva.items.length){
    try {
      if(typeof calcularYRenderPreview === 'function'){
        await calcularYRenderPreview();
        if(_liqActiva.items?.length){
        }
      }
    } catch(e){
      console.warn('[abrirLiquidacion] Precálculo automático falló (no crítico):', e);
    }
  }
  liqTab('novedades');
  _actualizarBotonesEstadoLiq();
}

async function borrarLiquidacion(id){
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede eliminar liquidaciones','var(--red)'); return; }
  const lista = await getLiquidaciones();
  const liq = lista.find(l=>l.id===id);
  if(!liq){ toast('⚠ Liquidación no encontrada','var(--red)'); return; }
  if(liq.estado === 'cerrada'){
    toast('🔒 Período cerrado definitivamente, no se puede eliminar','var(--red)'); return;
  }
  if(liq.estado === 'aprobada' || liq.estado === 'pagada'){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`⚠ Esta liquidación está ${liq.estado.toUpperCase()}. ¿Realmente querés eliminarla?<br><br>Período: ${liq.periodo} · Tipo: ${liq.tipo}<br><br>Los datos se perderán en forma irreversible.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  } else {
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Eliminar esta liquidación en borrador?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }
  await deleteLiquidacion(id);
  // Borrar novedades huérfanas asociadas
  try {
    const db = await abrirIDB();
    await new Promise((res,rej)=>{
      const tx = db.transaction('novedades_liq','readwrite');
      const store = tx.objectStore('novedades_liq');
      store.getAll().onsuccess = function(ev){
        ev.target.result.filter(n=>n.liqId===id).forEach(n=>store.delete(n.id));
        tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);
      };
    });
  } catch(e){ console.error('Error borrando novedades huérfanas:', e); }
  if(_liqActiva?.id===id) _liqActiva=null;
  renderLiqPeriodos();
  toast('Liquidación eliminada','var(--t3)');
}

// ── Novedades ────────────────────────────────────────────────────
let _novedadesActuales={};
async function cargarNovedadesParaLiq(liqId){
  if(!_liqActiva) return;
  const novsGuardadas=await getNovedadesLiq(liqId);
  _novedadesActuales={};
  novsGuardadas.forEach(n=>{ _novedadesActuales[n.leg]=n; });
  renderNovedades();
}

async function renderNovedades(){
  const liq=_liqActiva; if(!liq) return;
  const titulo=document.getElementById('liq-novedades-titulo');
  if(titulo) titulo.textContent=`Novedades — ${liq.periodo} (${liq.empresa==='todas'?'Todas las empresas':liq.empresa})`;
  const div=document.getElementById('liq-novedades-tabla'); if(!div) return;
  const q=(document.getElementById('liq-nov-search')?.value||'').toLowerCase();

  // Banner de estado: si la liquidación NO está en borrador, los inputs son
  // de solo lectura (las modificaciones requieren reabrir o están bloqueadas).
  const _estadoLiq = liq.estado || 'borrador';
  const _bloqueada = _estadoLiq !== 'borrador';
  const _esCerrada = _estadoLiq === 'cerrada';
  const bannerEstado = _bloqueada
    ? `<div style="margin-bottom:12px;padding:10px 14px;border-radius:var(--r);background:${
        _esCerrada ? 'rgba(120,120,120,.1)' : (_estadoLiq==='pagada' ? 'rgba(61,127,255,.08)' : 'rgba(34,197,94,.08)')
      };border:1px solid ${
        _esCerrada ? 'rgba(120,120,120,.3)' : (_estadoLiq==='pagada' ? 'rgba(61,127,255,.3)' : 'rgba(34,197,94,.3)')
      };color:${
        _esCerrada ? '#888' : (_estadoLiq==='pagada' ? 'var(--accent2)' : 'var(--green)')
      };font-size:12px;display:flex;align-items:center;gap:10px">
        <span style="font-size:16px">${_esCerrada?'🔒':_estadoLiq==='pagada'?'💰':'✓'}</span>
        <div style="flex:1;line-height:1.5">
          <strong style="text-transform:uppercase;letter-spacing:.04em">${_estadoLiq}</strong>
          ${_esCerrada
            ? ` — Período cerrado definitivamente${liq.cerradaEl?' el '+_fmtFechaCorta(liq.cerradaEl):''}${liq.cerradaPorNom?' por '+liq.cerradaPorNom:''}. Solo lectura.`
            : _estadoLiq==='pagada'
              ? ` — Pagada${liq.pagadaEl?' el '+_fmtFechaCorta(liq.pagadaEl):''}${liq.pagadaPorNom?' por '+liq.pagadaPorNom:''}. Para corregir, reabrí a borrador.`
              : ` — Aprobada${liq.aprobadaEl?' el '+liq.aprobadaEl:''}${liq.aprobadaPorNom?' por '+liq.aprobadaPorNom:''}. Las novedades están en solo lectura.`}
        </div>
      </div>`
    : '';

  let nomina=getNomina().filter(e=>!e._deBaja&&!e.egreso);
  // Si es liquidación individual → solo ese empleado
  if(liq.alcance==='individual' && liq.empLeg){
    nomina = nomina.filter(e=>e.leg===liq.empLeg);
  } else if(liq.empresa && liq.empresa!=='todas'){
    const _empExacta2 = nomina.filter(e=>e.emp===liq.empresa);
    if(_empExacta2.length > 0){
      nomina = _empExacta2;
    } else {
      const _empNorm2 = liq.empresa.trim().toUpperCase();
      nomina = nomina.filter(e=>(e.emp||'').trim().toUpperCase()===_empNorm2);
    }
  }
  // Excluir empleados que ingresaron DESPUÉS del fin del período liquidado
  // (no pueden cobrar un mes en el que todavía no eran empleados)
  const ultDiaPeriodo = new Date(liq.anio, liq.mes, 0); // último día del mes
  nomina = nomina.filter(e => {
    const fIng = parseFechaIng(e.ing);
    if(!fIng) return true; // si no se puede parsear, dejar que RR.HH. lo decida
    return fIng <= ultDiaPeriodo;
  });
  if(q) nomina=nomina.filter(e=>e.nom.toLowerCase().includes(q)||(e.leg||'').includes(q));
  nomina.sort((a,b)=>a.nom.localeCompare(b.nom));

  // Obtener anticipos aprobados del período para descontar
  const periodoYM=liq.periodo; // YYYY-MM
  const anticiposPorLeg={};
  solicitudes.filter(s=>s.status==='approved').forEach(s=>{
    // Fecha solicitud vs período
    const fechaSol=(s.fecha||s.created||'').substring(0,7).replace('/','').replace('-','');
    const periodoComp=periodoYM.replace('-','');
    if(Math.abs(parseInt(fechaSol, 10)-parseInt(periodoComp, 10))<=1){
      const l=s.emp?.leg||s.leg;
      if(l) anticiposPorLeg[l]=(anticiposPorLeg[l]||0)+$m(s.monto);
    }
  });

  // ── LICENCIAS que impactan esta liquidación ──
  // Incluir: a) informes tomados por RR.HH., b) comprobantes con estado 'aprobada',
  //          c) licencias anuales aprobadas (estado 'aprobada' o 'aprobada_gerente')
  const licenciasPorLeg = await obtenerLicenciasDelPeriodo(liq.anio, liq.mes);
  // Suspensiones aplicadas (sanciones con tipo_aplicado = 'suspension')
  const suspensionesPorLeg = obtenerSuspensionesDelPeriodo(liq.anio, liq.mes);

  const {habiles}=diasHabilesDelMes(liq.anio,liq.mes);
  const thStyle='padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;border-bottom:1px solid var(--border);background:var(--bg2)';
  const tdStyle='padding:8px 6px;border-bottom:1px solid var(--border);vertical-align:middle';

  div.innerHTML=bannerEstado+`<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
    <tr>
      <th style="${thStyle};min-width:180px" rowspan="2">Empleado</th>
      <th style="${thStyle}" rowspan="2">Días</th>
      <th style="${thStyle};background:rgba(239,68,68,.05)" rowspan="2" title="Días de licencia tomados en el período">Licencias</th>
      <th style="${thStyle};background:rgba(239,68,68,.08)" rowspan="2" title="Días de suspensión disciplinaria aplicada en el período (sanciones)">Susp.</th>
      <th style="${thStyle};background:rgba(34,197,94,.05);text-align:center" colspan="3">Horas Extras Grav.</th>
      <th style="${thStyle};background:rgba(234,179,8,.05);text-align:center" colspan="4">Exentos Ganancias</th>
      <th style="${thStyle}" rowspan="2">Ausenc.</th>
      <th style="${thStyle}" rowspan="2">Anticipo</th>
      <th style="${thStyle}" rowspan="2">Embargo judicial</th>
      <th style="${thStyle}" rowspan="2">Ganancias</th>
      <th style="${thStyle}" rowspan="2">Ajuste (+/-)</th>
      <th style="${thStyle};background:rgba(34,197,94,.04)" rowspan="2" title="Cumplimiento de objetivos — concepto remunerativo">Cumpl. Obj.</th>
      <th style="${thStyle}" rowspan="2">SAC</th>
      <th style="${thStyle}" rowspan="2">Vac.</th>
      <th style="${thStyle};background:rgba(61,127,255,.05);text-align:center" colspan="3">Cargas Familia</th>
      <th style="${thStyle};background:rgba(168,85,247,.05)" rowspan="2">Ded. Vol. (Art.85)</th>
    </tr>
    <tr>
      <th style="${thStyle}">50%</th>
      <th style="${thStyle}">100%</th>
      <th style="${thStyle};background:rgba(59,130,246,.05)" title="Cantidad de feriados del mes que trabajó (cobra hs extras 100% por ellos). Si dejás 0, todos los feriados se pagan como 'no trabajados'.">Fer.Trab.</th>
      <th style="${thStyle}" title="Horas extras exentas Art. 82 LIG">HE Ex.</th>
      <th style="${thStyle}" title="Bono productividad exento">Bono Pr.</th>
      <th style="${thStyle}" title="Indemnizaciones Art. 180 bis">Indem.</th>
      <th style="${thStyle}" title="Otros conceptos exentos">Otros Ex.</th>
      <th style="${thStyle}" title="¿Tiene cónyuge/conviviente?">Cóny.</th>
      <th style="${thStyle}" title="N° hijos menores de 18">Hijos</th>
      <th style="${thStyle}" title="N° hijos incapacitados">H. Inc.</th>
    </tr>
    </thead>
    <tbody id="liq-nov-tbody">
    ${nomina.map(e=>{
      const nov=_novedadesActuales[e.leg]||{};
      const antVal=anticiposPorLeg[e.leg]||0;
      const licsEmp = licenciasPorLeg[e.leg] || [];
      const diasLic = licsEmp.reduce((s,l)=>s+(l.diasEnPeriodo||0), 0);
      const diasVac = licsEmp.filter(l=>l.esAnual).reduce((s,l)=>s+(l.diasEnPeriodo||0), 0);
      const licTooltip = licsEmp.map(l=>`${l.tipo} ${l.desde}→${l.hasta} (${l.diasEnPeriodo}d)`).join(' | ');
      // Suspensiones aplicadas en el período
      const suspsEmp = suspensionesPorLeg[e.leg] || [];
      const diasSusp = suspsEmp.reduce((s,x)=>s+(x.diasEnPeriodo||0), 0);
      const suspTooltip = suspsEmp.map(s=>`Suspensión ${s.desde}→${s.hasta} (${s.diasEnPeriodo}d)`).join(' | ');
      const _disAttr = _bloqueada ? 'disabled readonly' : '';
      const _disStyle = _bloqueada ? 'opacity:.6;cursor:not-allowed;' : '';
      const inp=(id,val,w)=>`<input data-leg="${e.leg}" data-field="${id}" type="number" value="${val||''}" placeholder="0"
        oninput="updateNov(this)" ${_disAttr}
        style="width:${w||70}px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:4px 6px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);${_disStyle}">`;
      const chk=(id,val)=>`<input data-leg="${e.leg}" data-field="${id}" type="checkbox" ${val?'checked':''}
        onchange="updateNovBool(this)" ${_disAttr}
        style="width:16px;height:16px;accent-color:var(--accent);cursor:${_bloqueada?'not-allowed':'pointer'};${_disStyle}">`;
      // Badges de alta/baja en el período
      const _badgeAlta = nov._altaEnPeriodo
        ? `<span title="Alta en este período: ${nov._altaEnPeriodo}" style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(34,197,94,.1);color:var(--green);border:1px solid rgba(34,197,94,.3);margin-left:4px">↳ alta</span>`
        : '';
      // Botón "Liq. final" cuando hay baja o cuando la liq es de tipo final
      const _aplicaLiqFinal = nov._bajaEnPeriodo || liq.tipo === 'final';
      const _liqFinalConfigurada = !!nov.liqFinalDatos?.motivoBaja;
      const _btnLiqFinal = _aplicaLiqFinal
        ? `<span title="${_liqFinalConfigurada?'Liq. final cargada — '+nov.liqFinalDatos.motivoBaja:'Configurar liquidación final por baja'}" onclick="abrirLiqFinal('${e.leg}','${e.nom.replace(/'/g,"\\'")}')" style="font-size:9px;padding:1px 6px;border-radius:8px;background:${_liqFinalConfigurada?'rgba(34,197,94,.1)':'rgba(234,179,8,.1)'};color:${_liqFinalConfigurada?'var(--green)':'var(--yellow)'};border:1px solid ${_liqFinalConfigurada?'rgba(34,197,94,.3)':'rgba(234,179,8,.3)'};margin-left:4px;cursor:pointer">📋 ${_liqFinalConfigurada?'final✓':'liq.final'}</span>`
        : '';
      // Cantidad de plus/descuentos categorizados ya cargados
      const _cntPlus = (nov.otrosHaberes||[]).length;
      const _cntDesc = (nov.otrosDescuentos||[]).length;
      const _badgePlus = (_cntPlus + _cntDesc) > 0
        ? `<span title="${_cntPlus} plus / ${_cntDesc} desc." style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3);margin-left:4px;cursor:pointer" onclick="abrirPlusDescuentos('${e.leg}','${e.nom.replace(/'/g,"\\'")}')">⚙ ${_cntPlus+_cntDesc}</span>`
        : `<span title="Agregar plus o descuentos categorizados" style="font-size:9px;padding:1px 6px;border-radius:8px;background:var(--bg2);color:var(--t3);border:1px solid var(--border);margin-left:4px;cursor:pointer" onclick="abrirPlusDescuentos('${e.leg}','${e.nom.replace(/'/g,"\\'")}')">+ plus</span>`;
      // Conceptos custom MANUALES cargados
      const _cntManual = (nov.conceptosCustomManuales||[]).length;
      const _badgeManual = _cntManual > 0
        ? `<span title="${_cntManual} concepto${_cntManual!==1?'s':''} manual${_cntManual!==1?'es':''}" style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(168,85,247,.1);color:rgb(168,85,247);border:1px solid rgba(168,85,247,.3);margin-left:4px;cursor:pointer" onclick="abrirCargaManualConceptos('${e.leg}')">✍️ ${_cntManual}</span>`
        : `<span title="Cargar concepto manual" style="font-size:9px;padding:1px 6px;border-radius:8px;background:var(--bg2);color:var(--t3);border:1px solid var(--border);margin-left:4px;cursor:pointer" onclick="abrirCargaManualConceptos('${e.leg}')">✍️</span>`;
      return `<tr>
        <td style="${tdStyle}">
          <div style="font-size:12px;font-weight:500;color:var(--t1)">${e.nom.split(',')[0]}${_badgeAlta}${_btnLiqFinal}${_badgePlus}${_badgeManual}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${e.leg} · ${e.emp}</div>
        </td>
        <td style="${tdStyle}">${inp('diasTrabajados',nov.diasTrabajados??Math.max(0,habiles-diasLic-diasSusp),55)}</td>
        <td style="${tdStyle};background:rgba(239,68,68,.03)">
          ${diasLic>0
            ? `<span title="${licTooltip}" style="font-size:11px;color:var(--red);font-weight:600;font-family:var(--font-mono);cursor:help">${diasLic}d</span><br><span style="font-size:9px;color:var(--t3)">${licsEmp.length} lic.</span>`
            : `<span style="font-size:10px;color:var(--t3)">—</span>`
          }
        </td>
        <td style="${tdStyle};background:rgba(239,68,68,.06)">
          ${diasSusp>0
            ? `<span title="${suspTooltip}" style="font-size:11px;color:var(--red);font-weight:700;font-family:var(--font-mono);cursor:help">⚖️${diasSusp}d</span>`
            : `<span style="font-size:10px;color:var(--t3)">—</span>`
          }
        </td>
        <td style="${tdStyle}">${inp('hsExtra50',nov.hsExtra50||0,60)}</td>
        <td style="${tdStyle}">${inp('hsExtra100',nov.hsExtra100||0,60)}</td>
        <td style="${tdStyle};background:rgba(59,130,246,.03)" title="Cantidad de feriados del mes que trabajó (cobra hs extras 100%). Si dejás 0, cobra todos los feriados como 'no trabajados'.">${inp('feriadosTrabajados',nov.feriadosTrabajados||0,55)}</td>
        <td style="${tdStyle};background:rgba(234,179,8,.03)">${inp('hsExtrasExentas',nov.hsExtrasExentas||0,80)}</td>
        <td style="${tdStyle};background:rgba(234,179,8,.03)">${inp('bonoProductividadExento',nov.bonoProductividadExento||0,90)}</td>
        <td style="${tdStyle};background:rgba(234,179,8,.03)">${inp('indemnizaciones',nov.indemnizaciones||0,90)}</td>
        <td style="${tdStyle};background:rgba(234,179,8,.03)">${inp('otrosExentos',nov.otrosExentos||0,80)}</td>
        <td style="${tdStyle}">
          <input data-leg="${e.leg}" data-field="ausenciasInjustificadas" type="number" value="${nov.ausenciasInjustificadas||0}" placeholder="0" oninput="updateNov(this)"
            style="width:55px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:4px 6px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
        </td>
        <td style="${tdStyle}">
          <input data-leg="${e.leg}" data-field="anticipos" type="number" value="${nov.anticipos??antVal}" placeholder="0" oninput="updateNov(this)"
            style="width:80px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:4px 6px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
        </td>
        <td style="${tdStyle}">${(()=>{
          // Resolver embargos: array nuevo o migración del formato viejo (display)
          let lista = Array.isArray(nov.embargos) ? nov.embargos : [];
          if(!lista.length){
            if(nov.embargoTipo === 'alimentos' && $m(nov.embargoAlimentosPct) > 0){
              lista = [{ tipo:'alimentos', pct:$m(nov.embargoAlimentosPct) }];
            } else if($m(nov.embargo) > 0){
              lista = [{ tipo:'comun', monto:$m(nov.embargo) }];
            }
          }
          const cntAlim = lista.filter(x=>x.tipo==='alimentos').length;
          const cntComun = lista.filter(x=>x.tipo==='comun').length;
          const total = cntAlim + cntComun;
          let label, bg, color, title;
          if(total === 0){
            label = '+ embargo'; bg = 'var(--bg2)'; color = 'var(--t3)'; title = 'Sin embargos';
          } else if(total === 1){
            const e0 = lista[0];
            if(e0.tipo === 'alimentos'){
              label = `⚖ ${$m(e0.pct)}%`; bg='rgba(168,85,247,.1)'; color='rgb(168,85,247)';
              title = `Cuota alimentaria ${$m(e0.pct)}% (sin tope Art. 147)`;
            } else {
              label = `$ ${$m(e0.monto).toLocaleString('es-AR',{maximumFractionDigits:0})}`; bg='rgba(239,68,68,.06)'; color='var(--red)';
              title = `Embargo común $${$m(e0.monto).toLocaleString('es-AR')} (sujeto a tope Art. 147)`;
            }
          } else {
            label = `⚖ ${total} emb.`; bg='rgba(239,68,68,.08)'; color='var(--red)';
            title = `${cntAlim} alimentario${cntAlim!==1?'s':''} + ${cntComun} común${cntComun!==1?'es':''}`;
          }
          return `<button onclick="abrirConfigEmbargo('${e.leg}','${e.nom.replace(/'/g,"\\'")}')" ${_disAttr}
            style="font-size:11px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:${bg};color:${color};cursor:${_bloqueada?'not-allowed':'pointer'};font-family:var(--font-mono);${_disStyle}"
            title="${title}">${label}</button>`;
        })()}</td>
        <td style="${tdStyle}" title="Retención/devolución de Ganancias. Por defecto se calcula AUTOMÁTICAMENTE (acumulado RG 4003/17, con signo: negativo = devolución). Tildá 'M' para hardcodear el monto.">${inp('ganancias',nov.ganancias||0,68)}<label style="font-size:9px;color:var(--t3);cursor:pointer;display:inline-flex;align-items:center;gap:2px;margin-left:3px" title="Manual (hardcode): usa el monto cargado en vez del cálculo automático">${chk('gananciasManual',nov.gananciasManual)}M</label></td>
        <td style="${tdStyle}">${inp('ajusteSueldo',nov.ajusteSueldo||0,70)}</td>
        <td style="${tdStyle};background:rgba(34,197,94,.04)" title="Cumplimiento de objetivos (REM)">${inp('cumplimientoObjetivos',nov.cumplimientoObjetivos||0,80)}</td>
        <td style="${tdStyle}">${inp('sac',nov.sac||0,70)}</td>
        <td style="${tdStyle}">${inp('vacaciones',nov.vacaciones??diasVac,70)}</td>
        <td style="${tdStyle};background:rgba(61,127,255,.03);text-align:center">${chk('tieneConyuge',nov.tieneConyuge)}</td>
        <td style="${tdStyle};background:rgba(61,127,255,.03)">${inp('nroHijosMenores',nov.nroHijosMenores||0,45)}</td>
        <td style="${tdStyle};background:rgba(61,127,255,.03)">${inp('nroHijosIncapacitados',nov.nroHijosIncapacitados||0,45)}</td>
        <td style="${tdStyle};background:rgba(168,85,247,.03)">
          ${nov._importadoSiradig
            ? `<button onclick="abrirDedVoluntarias('${e.leg}','${e.nom.replace(/'/g,"\\'")}' )" title="F.572 SIRADIG importado el ${new Date(nov._importadoSiradig).toLocaleDateString('es-AR')} — los datos se aplican al cálculo de Ganancias" style="padding:4px 10px;font-size:11px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.4);border-radius:4px;color:var(--green);cursor:pointer;font-family:var(--font-mono)">✓ SIRADIG</button>`
            : `<button onclick="abrirDedVoluntarias('${e.leg}','${e.nom.replace(/'/g,"\\'")}' )" title="Sin F.572 SIRADIG. Las cargas de familia y deducciones voluntarias NO se aplican al cálculo de Ganancias hasta que se importe." style="padding:4px 10px;font-size:11px;background:var(--bg2);border:1px solid rgba(234,179,8,.4);border-radius:4px;color:var(--yellow);cursor:pointer;font-family:var(--font-mono)">⚠ s/SIRADIG</button>`}
        </td>
      </tr>`;
    }).join('')}
    </tbody></table>`;

  // Pre-popular novedades con días de licencia y prorrateo por ingreso en el período
  // El período cubierto depende del tipo:
  //   - quincenal_1: 1-15 del mes
  //   - quincenal_2: 16-fin del mes
  //   - resto:       1 al fin del mes
  const _primerDiaMes = new Date(liq.anio, liq.mes-1, 1);
  const _ultDiaMes    = new Date(liq.anio, liq.mes, 0);
  let primerDiaPeriodo, ultDiaPeriodoD;
  if(liq.tipo === 'quincenal_1'){
    primerDiaPeriodo = _primerDiaMes;
    ultDiaPeriodoD   = new Date(liq.anio, liq.mes-1, 15);
  } else if(liq.tipo === 'quincenal_2'){
    primerDiaPeriodo = new Date(liq.anio, liq.mes-1, 16);
    ultDiaPeriodoD   = _ultDiaMes;
  } else {
    primerDiaPeriodo = _primerDiaMes;
    ultDiaPeriodoD   = _ultDiaMes;
  }
  for(const e of nomina){
    const licsEmp = licenciasPorLeg[e.leg] || [];
    const totalDiasLic = licsEmp.reduce((s,l)=>s+(l.diasEnPeriodo||0), 0);
    const totalDiasVac = licsEmp.filter(l=>l.esAnual).reduce((s,l)=>s+(l.diasEnPeriodo||0), 0);
    // Suspensiones del período (sanciones aplicadas tipo_aplicado='suspension')
    const suspsEmp = suspensionesPorLeg[e.leg] || [];
    const totalDiasSusp = suspsEmp.reduce((s,x)=>s+(x.diasEnPeriodo||0), 0);
    // Hábiles efectivos del empleado en este mes (considerando ingreso/egreso en medio del mes)
    const fIng = parseFechaIng(e.ing);
    let inicioComputo = primerDiaPeriodo;
    let finComputo = ultDiaPeriodoD;
    if(fIng && fIng > primerDiaPeriodo) inicioComputo = fIng;

    // Egreso a mitad de mes (baja): si la fecha de egreso cae dentro del
    // período, computar hábiles solo hasta esa fecha.
    let fechaEgreso = null;
    if(e.egreso){
      try {
        const p = e.egreso.includes('-') ? e.egreso.split('-') : e.egreso.split('/').reverse();
        if(p.length === 3) fechaEgreso = new Date(+p[0], +p[1]-1, +p[2]);
      } catch(_){}
    }
    if(fechaEgreso && fechaEgreso >= primerDiaPeriodo && fechaEgreso <= ultDiaPeriodoD){
      finComputo = fechaEgreso;
    }

    let habilesEmp = habiles;
    if(inicioComputo > primerDiaPeriodo || finComputo < ultDiaPeriodoD){
      habilesEmp = diasHabilesEntre(inicioComputo, finComputo);
    }
    if(!_novedadesActuales[e.leg]) _novedadesActuales[e.leg] = {leg:e.leg, liqId:liq.id};
    const nov = _novedadesActuales[e.leg];
    if(nov.diasTrabajados == null) nov.diasTrabajados = Math.max(0, habilesEmp - totalDiasLic - totalDiasSusp);
    // Marcar prorrateo en novedad para que el reporte/recibo lo refleje
    if(inicioComputo > primerDiaPeriodo) nov._altaEnPeriodo = e.ing;
    if(finComputo < ultDiaPeriodoD)      nov._bajaEnPeriodo = e.egreso;
    // Solo auto-popular vacaciones si nunca se tocó (null/undefined).
    // Si el usuario la puso en 0 deliberadamente, respetarlo.
    if(nov.vacaciones == null) nov.vacaciones = totalDiasVac;
    nov.licenciasAplicadas = licsEmp.map(l=>({tipo:l.tipo,desde:l.desde,hasta:l.hasta,dias:l.diasEnPeriodo,origen:l.origen}));
    // Suspensiones aplicadas: días e info para mostrar en el recibo
    nov.suspensionesAplicadas = suspsEmp.map(s=>({desde:s.desde,hasta:s.hasta,dias:s.diasEnPeriodo,motivo:s.motivo,sancionId:s.sancionId}));
    nov.diasSuspension = totalDiasSusp;
    nov.liqId = liq.id;
  }
}

// Devuelve {legajo: [{tipo, desde, hasta, diasEnPeriodo, esAnual, origen}]}
// para todas las licencias que impactan el período año/mes.
async function obtenerLicenciasDelPeriodo(anio, mes){
  const [informes, comprobantes, anuales, especiales] = await Promise.all([
    getInformesLicencias(),
    getLicencias(),
    getLicenciasAnuales(),
    getLicenciasEspeciales()
  ]);

  const mapa = {};
  const addLic = (leg, rec) => {
    if(!mapa[leg]) mapa[leg] = [];
    mapa[leg].push(rec);
  };

  // Calcula días del rango que caen en el mes/año
  const diasEnPeriodo = (desde, hasta) => {
    if(!desde || !hasta) return 0;
    const d1 = new Date(desde + 'T12:00:00');
    const d2 = new Date(hasta + 'T12:00:00');
    const inicioMes = new Date(anio, mes-1, 1, 12, 0, 0);
    const finMes    = new Date(anio, mes, 0, 12, 0, 0); // último día del mes
    const inicio = d1 < inicioMes ? inicioMes : d1;
    const fin    = d2 > finMes    ? finMes    : d2;
    if(fin < inicio) return 0;
    return Math.round((fin - inicio) / 86400000) + 1;
  };

  // 1. Informes tomados por RR.HH.
  informes.filter(l => l.tomada_rrhh).forEach(l => {
    const d = diasEnPeriodo(l.desde, l.hasta);
    if(d > 0) addLic(l.leg, {tipo:l.tipo, desde:l.desde, hasta:l.hasta, diasEnPeriodo:d, esAnual:false, origen:'informe'});
  });

  // 2. Comprobantes — impactan desde que el empleado los presentó (pendiente, aprobada_gerente o aprobada)
  //    NO impactan los rechazados.
  comprobantes.filter(l => l.estado !== 'rechazada' && l.archivo).forEach(l => {
    const desde = l.fecha_desde || l.desde;
    const hasta = l.fecha_hasta || l.hasta;
    const d = diasEnPeriodo(desde, hasta);
    if(d > 0) addLic(l.leg, {tipo:l.tipo, desde, hasta, diasEnPeriodo:d, esAnual:false, origen:'comprobante', estado:l.estado});
  });

  // 3. Licencias anuales aprobadas
  anuales.filter(l => l.estado === 'aprobada' || l.estado === 'aprobada_gerente').forEach(l => {
    const d = diasEnPeriodo(l.desde, l.hasta);
    if(d > 0) addLic(l.leg, {tipo:'Licencia Anual', desde:l.desde, hasta:l.hasta, diasEnPeriodo:d, esAnual:true, origen:'anual'});
  });

  // 4. Licencias especiales (sin goce de haberes) — impactan con aprobación del gerente
  //    o con aprobación final de RR.HH. Siempre se liquidan SIN GOCE.
  const tiposEsp = {sin_goce:'Lic. Sin Goce', maternidad:'Lic. Maternidad', excedencia:'Lic. Excedencia'};
  especiales.filter(l => l.estado === 'aprobada' || l.estado === 'aprobada_gerente').forEach(l => {
    const d = diasEnPeriodo(l.desde, l.hasta);
    if(d > 0) addLic(l.leg, {
      tipo: tiposEsp[l.tipoLicencia] || 'Lic. Especial',
      desde: l.desde, hasta: l.hasta,
      diasEnPeriodo: d, esAnual: false,
      origen: 'especial',
      tipoEspecial: l.tipoLicencia,
      sinGoce: true
    });
  });

  return mapa;
}

// ═══════════════════════════════════════════════════════════════
// SUSPENSIONES DEL PERÍODO (sanciones tipo "suspension" aplicadas)
// Devuelve: {legajo: [{desde, hasta, diasEnPeriodo, motivo, sancionId}]}
// Considera sanciones procedentes y aplicadas_directas con tipo_aplicado = 'suspension'
// La fecha de inicio = fecha_notificacion · fecha de fin = fecha_cumplimiento
// Si no hay fecha_cumplimiento, no hay días para liquidar (no se puede calcular)
// ═══════════════════════════════════════════════════════════════
function obtenerSuspensionesDelPeriodo(anio, mes){
  const mapa = {};
  const sanciones = (typeof getSanciones === 'function') ? getSanciones() : [];

  // Días del mes
  const inicioMes = new Date(anio, mes-1, 1, 12, 0, 0);
  const finMes    = new Date(anio, mes, 0, 12, 0, 0);

  const diasEntreFechas = (desde, hasta) => {
    if(!desde || !hasta) return 0;
    const d1 = new Date(desde + 'T12:00:00');
    const d2 = new Date(hasta + 'T12:00:00');
    const inicio = d1 < inicioMes ? inicioMes : d1;
    const fin    = d2 > finMes    ? finMes    : d2;
    if(fin < inicio) return 0;
    return Math.round((fin - inicio) / 86400000) + 1;
  };

  for(const s of sanciones){
    // Solo suspensiones aplicadas
    const aplicada = (s.estado === 'procedente' || s.estado === 'aplicada_directa');
    if(!aplicada) continue;
    if(s.tipo_aplicado !== 'suspension') continue;
    if(!s.fecha_notificacion || !s.fecha_cumplimiento) continue; // no puede calcularse sin fechas

    const dias = diasEntreFechas(s.fecha_notificacion, s.fecha_cumplimiento);
    if(dias <= 0) continue;

    if(!mapa[s.leg]) mapa[s.leg] = [];
    mapa[s.leg].push({
      desde: s.fecha_notificacion,
      hasta: s.fecha_cumplimiento,
      diasEnPeriodo: dias,
      motivo: s.motivo,
      sancionId: s.id
    });
  }

  return mapa;
}

function filtrarNov(){ renderNovedades(); }

// Debounce para autosave de novedades — evita perder datos si el usuario cierra la pestaña
let _novAutosaveTimer = null;
let _novAutosavePending = new Set();
async function _scheduleAutosaveNov(leg){
  _novAutosavePending.add(leg);
  clearTimeout(_novAutosaveTimer);
  _novAutosaveTimer = setTimeout(async ()=>{
    const pendientes = Array.from(_novAutosavePending);
    _novAutosavePending.clear();
    try {
      const proms = pendientes
        .map(l => _novedadesActuales[l])
        .filter(n => n && n.liqId)
        .map(n => saveNovedad(n));
      await Promise.all(proms);
    } catch(e){ console.error('Error autosave novedades:', e); }
  }, 1500); // 1.5 seg tras el último cambio
}

function updateNov(input){
  if(_liqActiva && _liqActiva.estado && _liqActiva.estado !== 'borrador'){
    toast(`⚠ Liquidación ${_liqActiva.estado} — solo lectura`, 'var(--yellow)');
    input.value = ''; return;
  }
  const leg=input.dataset.leg;
  const field=input.dataset.field;
  const val=parseFloat(input.value)||0;
  if(!_novedadesActuales[leg]) _novedadesActuales[leg]={leg,liqId:_liqActiva?.id};
  _novedadesActuales[leg][field]=val;
  _novedadesActuales[leg].liqId=_liqActiva?.id;
  _scheduleAutosaveNov(leg);
}

function updateNovBool(input){
  if(_liqActiva && _liqActiva.estado && _liqActiva.estado !== 'borrador'){
    toast(`⚠ Liquidación ${_liqActiva.estado} — solo lectura`, 'var(--yellow)');
    input.checked = !input.checked; return;
  }
  const leg = input.dataset.leg;
  const field = input.dataset.field;
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = {leg, liqId:_liqActiva?.id};
  _novedadesActuales[leg][field] = input.checked;
  _novedadesActuales[leg].liqId = _liqActiva?.id;
  _scheduleAutosaveNov(leg);
}

// Persistir novedades pendientes antes de cerrar la pestaña
window.addEventListener('beforeunload', ()=>{
  if(_novAutosavePending.size > 0){
    // Force flush pending saves synchronously (best effort)
    const pendientes = Array.from(_novAutosavePending);
    pendientes.forEach(l => {
      const n = _novedadesActuales[l];
      if(n && n.liqId) saveNovedad(n).catch(()=>{});
    });
  }
});

// Modal de deducciones voluntarias con topes Art. 85 LIG
// ═══════════════════════════════════════════════════════════════════════════
// PLUS Y DESCUENTOS CATEGORIZADOS
// ───────────────────────────────────────────────────────────────────────────
// Modal para gestionar `nov.otrosHaberes` y `nov.otrosDescuentos` con tipos
// taxonomizados (rem/no rem) y trazabilidad legal.
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDACIÓN FINAL — UI
// ───────────────────────────────────────────────────────────────────────────
// Modal que aparece para empleados con baja en el período (cuando liq.tipo
// es 'final' o cuando hay fecha de egreso dentro del período liquidado).
// Permite seleccionar el motivo de baja y calcular automáticamente:
//   - Vacaciones no gozadas (Art. 156 LCT)
//   - SAC proporcional (Art. 121 LCT)
//   - Preaviso (Art. 232 LCT) — solo despido sin causa
//   - Integración mes despido (Art. 233 LCT) — solo despido sin causa
//   - Indemnización por antigüedad (Art. 245 LCT) — solo despido sin causa
// Cada cálculo es editable manualmente.
// ═══════════════════════════════════════════════════════════════════════════
const MOTIVOS_BAJA = [
  // ── Ceses sin indemnización (o con mínima) ──────────────────────────────
  { v:'renuncia',            label:'Renuncia',                            indem:false, grupo:'sin_indem',  desc:'No genera preaviso ni indemnización (Art. 240 LCT). Corresponden: SAC proporcional + vacaciones no gozadas.' },
  { v:'despido_cc',          label:'Despido con causa (Art. 242)',        indem:false, grupo:'sin_indem',  desc:'No hay indemnización si la causa es debidamente justificada y notificada. Igual: SAC proporcional + vacaciones.' },
  { v:'mutuo_acuerdo',       label:'Mutuo acuerdo (Art. 241)',            indem:false, grupo:'sin_indem',  desc:'Acuerdo homologado ante MTSS o escribano. Puede incluir gratificación voluntaria. SAC + vacaciones obligatorios.' },
  { v:'jubilacion',          label:'Jubilación (Art. 252)',               indem:false, grupo:'sin_indem',  desc:'El empleador intima a iniciar trámite. Al obtener el beneficio, cesa sin indemnización. SAC + vacaciones.' },
  { v:'abandono_trabajo',    label:'Abandono de trabajo (Art. 244)',      indem:false, grupo:'sin_indem',  desc:'Previa intimación fehaciente (telegrama). No genera indemnización. SAC + vacaciones no gozadas.' },
  { v:'vencimiento_contrato',label:'Vencimiento contrato a plazo (Art. 95/97)', indem:'parcial', grupo:'parcial', desc:'Si el contrato supera 1 año: indemnización del 50% del Art. 245 (Art. 97 LCT). Si es inferior a 1 año: solo SAC + vacaciones.' },

  // ── Despido sin causa — régimen general LCT ────────────────────────────
  { v:'despido_sc',          label:'Despido sin causa (Art. 245)',        indem:true,  grupo:'despido_sc', desc:'Genera: preaviso (Art. 232) + integración mes despido (Art. 233) + indemnización por antigüedad (Art. 245). SAC proporcional y vacaciones siempre.' },

  // ── Ceses con indemnización especial ───────────────────────────────────
  { v:'fuerza_mayor',        label:'Fuerza mayor / falta trabajo (Art. 247)', indem:true, grupo:'especial', desc:'Indemnización = 50% del Art. 245 (mitad). NO hay preaviso ni integración. Requiere homologación MTSS.' },
  { v:'incapacidad_absoluta',label:'Incapacidad absoluta (Art. 213)',    indem:true,  grupo:'especial', desc:'Incapacidad que impide toda prestación. Indemnización = Art. 245 (igual que despido sin causa). Sin preaviso.' },
  { v:'incapacidad_parcial', label:'Incapacidad parcial (Art. 212)',     indem:true,  grupo:'especial', desc:'Si hay tareas disponibles: solo diferencia salarial. Si no puede relocalizarse: indemnización = Art. 245. Sin preaviso.' },
  { v:'despido_embarazo',    label:'Despido por embarazo/maternidad (Art. 178)', indem:true, grupo:'especial', desc:'Presunción: si el despido es dentro de 7½ meses antes/después del parto. Indemnización = Art. 245 + 1 año de remuneraciones (Art. 182). Sin preaviso.' },
  { v:'despido_matrimonio',  label:'Despido por matrimonio (Art. 182)',  indem:true,  grupo:'especial', desc:'Presunción: si el despido es dentro de 3 meses antes/6 después del matrimonio. Indemnización = Art. 245 + 1 año de remuneraciones.' },
  { v:'fallecimiento',       label:'Fallecimiento del trabajador (Art. 248)', indem:true, grupo:'especial', desc:'Indemnización = 50% del Art. 245. Cobran causahabientes (cónyuge/conviviente/hijos). Sin preaviso. Exento de Ganancias.' },
];

function _empleadoTieneBaja(emp, liq){
  if(!emp.egreso) return false;
  const fEg = _parseFechaLib(emp.egreso);
  if(!fEg) return false;
  const ini = new Date(liq.anio, liq.mes-1, 1);
  const fin = new Date(liq.anio, liq.mes, 0);
  return fEg >= ini && fEg <= fin;
}

// ─── Detección de régimen UOCRA / Industria de la Construcción ───────────
// Los empleados con CCT de la construcción se rigen por la Ley 22.250 —
// régimen ESPECIAL que reemplaza el sistema indemnizatorio de la LCT por
// el Fondo de Cese Laboral (FCL).
//
// Lo que NO aplica del régimen LCT:
//   • Preaviso (Art. 232 LCT)
//   • Integración mes de despido (Art. 233 LCT)
//   • Indemnización por antigüedad (Art. 245 LCT)
//   • Distinción despido con/sin causa con efectos económicos
//
// Lo que SÍ aplica (común a todos los regímenes):
//   • Vacaciones no gozadas (Art. 156 LCT, aplicable a todo trabajador)
//   • SAC proporcional (Art. 121 LCT)
//   • Salarios pendientes y horas extras
//
// Lo propio del régimen 22.250:
//   • FCL: aporte mensual del empleador (12% el 1er año, 8% desde el 2do)
//     depositado en libreta bancaria. No se calcula al cese — se acumuló
//     durante toda la relación. Solo se entrega la libreta y certificación.
function esRegimenLey22250(emp){
  if(!emp || !emp.cod_sindicato) return false;
  const c = String(emp.cod_sindicato).trim().toUpperCase();
  return c === 'UOCRA' || c === 'UOCRA-IERIC' || c === 'CONSTRUCCION' || c === 'IERIC';
}

async function abrirLiqFinal(leg, nom){
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  if(_liqActiva.estado !== 'borrador'){
    toast('⚠ Liquidación bloqueada','var(--red)'); return;
  }
  const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === leg);
  if(!emp){ toast('⚠ Empleado no encontrado','var(--red)'); return; }
  if(!emp.egreso){
    const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`${nom} no tiene fecha de egreso registrada. ¿Querés cargar una liquidación final igual?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  }

  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = { leg, liqId: _liqActiva.id };
  const nov = _novedadesActuales[leg];
  if(!nov.liqFinalDatos) nov.liqFinalDatos = { motivoBaja:'' };

  const overlay = document.createElement('div');
  overlay.id = 'modal-liq-final';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) cerrarLiqFinal(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:780px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📋 Liquidación final por baja</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${nom} · Legajo ${leg}${emp.egreso?' · Egreso '+emp.egreso:''} · Ingreso ${emp.ing}</div>
        </div>
        <button onclick="cerrarLiqFinal()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div id="lf-content" style="padding:18px 22px"></div>
      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="cerrarLiqFinal()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarLiqFinal('${leg}')" style="font-size:13px;padding:8px 18px">Guardar y aplicar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _renderLiqFinalContenido(leg, emp);
}

function cerrarLiqFinal(){
  document.getElementById('modal-liq-final')?.remove();
  if(typeof renderNovedades === 'function') renderNovedades();
}

function _renderLiqFinalContenido(leg, emp){
  const cont = document.getElementById('lf-content');
  if(!cont) return;
  const nov = _novedadesActuales[leg];
  const lf = nov.liqFinalDatos || {};
  const motivo = lf.motivoBaja || '';
  const motivoInfo = MOTIVOS_BAJA.find(m => m.v === motivo);
  const fmtN = n => ($m(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const _esLey22250 = esRegimenLey22250(emp);

  const fEgreso = emp.egreso ? _parseFechaLib(emp.egreso) : null;
  const mejorRem = $m(lf.mejorRem) || bruto;

  // Calcular todos los conceptos posibles
  let calcVac   = { dias:0, monto:0, valorDia:0, diasCorresp:0, diasGozados:0, diasEnAnio:0, anioCalculo:null };
  let calcSac   = { monto:0, diasSemestre:0, semestre:null, base:0 };
  let calcPre   = { dias:0, meses:0, monto:0, antiguedadMeses:0 };
  let calcInt   = { dias:0, monto:0 };
  let calcInd   = { aniosCalc:0, monto:0, baseAplicada:0, aniosFloat:0, fraccionMayor3meses:false, topeAplicado:false };
  let calcEsp   = { monto:0, monto245:0, montoEspecial:0 };
  let calcFM    = { monto:0, aniosCalc:0, baseAplicada:0 };
  let calcIA    = { monto:0, aniosCalc:0, baseAplicada:0 };
  let calcIP    = { monto:0, aniosCalc:0, baseAplicada:0 };
  let calcFC    = { monto:0, aniosCalc:0 };

  // Flags de qué aplica según motivo
  const _aplicaPreaviso = !_esLey22250 && motivo === 'despido_sc';
  const _aplicaIntegr   = !_esLey22250 && motivo === 'despido_sc';
  const _aplica245      = !_esLey22250 && ['despido_sc','incapacidad_absoluta','incapacidad_parcial','despido_embarazo','despido_matrimonio'].includes(motivo);
  const _aplicaEspecial = !_esLey22250 && ['despido_embarazo','despido_matrimonio'].includes(motivo);
  const _aplicaFM       = !_esLey22250 && motivo === 'fuerza_mayor';
  const _aplicaIA       = !_esLey22250 && motivo === 'incapacidad_absoluta';
  const _aplicaIP       = !_esLey22250 && motivo === 'incapacidad_parcial';
  const _aplicaFallec   = motivo === 'fallecimiento';
  const _aplicaFC       = motivo === 'vencimiento_contrato';

  if(fEgreso){
    calcVac = calcVacNoGozadas(emp, fEgreso, lf.diasGozadosEnAnio || 0);
    calcSac = calcSacProporcional(emp, fEgreso, mejorRem);
    if(_aplicaPreaviso)  calcPre = calcPreaviso(emp, fEgreso);
    if(_aplicaIntegr)    calcInt = calcIntegracionMes(emp, fEgreso);
    if(_aplica245 || _aplicaFallec){
      calcInd = calcIndemAntiguedad(emp, fEgreso, mejorRem, $m(lf.topeCCT));
      if(_aplicaFallec){ calcInd.monto = calcInd.monto * 0.5; calcInd._reducida50 = true; }
    }
    if(_aplicaEspecial)  calcEsp = motivo === 'despido_embarazo' ? calcIndemEmbarazo(emp, fEgreso, mejorRem, $m(lf.topeCCT)) : calcIndemMatrimonio(emp, fEgreso, mejorRem, $m(lf.topeCCT));
    if(_aplicaFM)        calcFM  = calcIndemFuerzaMayor(emp, fEgreso, mejorRem, $m(lf.topeCCT));
    if(_aplicaIA)        calcIA  = calcIndemIncapacidadAbsoluta(emp, fEgreso, mejorRem, $m(lf.topeCCT));
    if(_aplicaIP)        calcIP  = calcIndemIncapacidadParcial(emp, fEgreso, mejorRem, $m(lf.topeCCT));
    if(_aplicaFC)        calcFC  = calcIndemFinContrato(emp, fEgreso, mejorRem, $m(lf.topeCCT));
  }

  const motivoOpts = MOTIVOS_BAJA.map(m =>
    `<option value="${m.v}" ${motivo===m.v?'selected':''}>${m.label}</option>`
  ).join('');

  // Helper: bloque de un concepto indemnizatorio
  const bloqueConcepto = ({id, titulo, art, badge, badgeColor, detalle, valorAuto, valorGuardado}) => {
    const badgeBg = badgeColor==='exento' ? 'rgba(168,85,247,.12)' : 'rgba(34,197,94,.12)';
    const badgeTxt= badgeColor==='exento' ? 'rgb(168,85,247)' : 'var(--green)';
    const badgeLabel = badgeColor==='exento' ? 'EXENTO' : 'REM';
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
        <div>
          <strong style="font-size:13px;color:${badgeTxt}">${titulo}</strong>
          <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:${badgeBg};color:${badgeTxt};margin-left:6px;font-family:var(--font-mono)">${badgeLabel}</span>
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${art}</div>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.5">${detalle}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">$</span>
        <input type="number" step="0.01" value="${valorGuardado??valorAuto}" id="${id}"
          style="flex:1;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:7px 9px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">
        <button onclick="document.getElementById('${id}').value='${valorAuto}'" style="font-size:10px;padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--t3);cursor:pointer">↻ auto</button>
      </div>
    </div>`;
  };

  cont.innerHTML = `
    ${_esLey22250 ? `<div style="margin-bottom:18px;padding:12px 16px;background:rgba(234,88,12,.06);border:1px solid rgba(234,88,12,.3);border-radius:var(--r);font-size:12px;color:var(--t1);line-height:1.6">
      <div style="font-weight:600;color:rgb(234,88,12);margin-bottom:4px">🏗️ Régimen Ley 22.250 — Industria de la Construcción (UOCRA)</div>
      <div style="font-size:10px;color:var(--t2);line-height:1.7">NO aplican: preaviso (Art. 232), integración mes despido (Art. 233), indemnización Art. 245. SÍ corresponden: SAC proporcional + vacaciones no gozadas.<br>FCL (Fondo de Cese Laboral): se entrega libreta bancaria con el saldo acumulado.</div>
    </div>` : ''}

    <!-- Selector motivo -->
    <div style="margin-bottom:18px">
      <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Motivo de la baja *</label>
      <select id="lf-motivo" onchange="_actualizarLiqFinal('${leg}')"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
        <option value="">— Elegí un motivo —</option>
        ${motivoOpts}
      </select>
      ${motivoInfo ? `<div style="font-size:11px;color:var(--t3);margin-top:6px;line-height:1.5">${motivoInfo.desc}</div>` : ''}
    </div>

    ${motivo ? `
    <!-- Parámetros base -->
    <div style="margin-bottom:18px;padding:12px 14px;background:rgba(61,127,255,.04);border:1px solid rgba(61,127,255,.2);border-radius:var(--r)">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--accent2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Parámetros base</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px">Mejor rem. mensual normal y habitual ($)</label>
          <input type="number" step="0.01" value="${mejorRem}" id="lf-mejorrem" onchange="_actualizarLiqFinal('${leg}')"
            style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:7px 9px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:4px" title="Art. 245: tope = 3 × promedio CCT. Dejar 0 si no aplica.">Tope base CCT individual ($)</label>
          <input type="number" step="0.01" value="${lf.topeCCT||0}" id="lf-topecct" onchange="_actualizarLiqFinal('${leg}')"
            style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:7px 9px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right;box-sizing:border-box">
        </div>
      </div>
    </div>

    <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Conceptos a liquidar</div>

    <!-- SAC proporcional — siempre -->
    ${bloqueConcepto({ id:'lf-sac', titulo:'SAC proporcional', art:'Art. 121 LCT', badge:'REM', badgeColor:'rem',
      detalle: `${calcSac.diasSemestre||0} días del ${calcSac.semestre||'?'}° semestre / 180 × ½ mejor rem ($${fmtN(calcSac.base||0)})`,
      valorAuto: (calcSac.monto||0).toFixed(2), valorGuardado: lf.sacProporcional != null ? $m(lf.sacProporcional).toFixed(2) : null })}

    <!-- Vacaciones no gozadas — siempre -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>
          <strong style="font-size:13px;color:rgb(168,85,247)">Vacaciones no gozadas</strong>
          <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:rgba(168,85,247,.12);color:rgb(168,85,247);margin-left:6px;font-family:var(--font-mono)">EXENTO</span>
        </div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Art. 156 LCT · Art. 26 LIG</div>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.5">
        ${calcVac.dias} días no gozados (${calcVac.diasCorresp} corresp. − ${calcVac.diasGozados} gozados) × $${fmtN(calcVac.valorDia||0)}/día (sueldo/25)
        ${calcVac.regimen==='proporcional_art153' ? ' · <em>Art. 153: proporcional 1 día / 20 trabajados</em>' : ''}
      </div>
      <div style="display:grid;grid-template-columns:90px 1fr;gap:8px;margin-bottom:6px">
        <div>
          <label style="font-size:9px;color:var(--t3)">Días</label>
          <input type="number" value="${lf.diasVacNoGozadas ?? calcVac.dias}" id="lf-vac-dias" onchange="_actualizarVacMonto('${leg}')"
            style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:9px;color:var(--t3)">Monto ($)</label>
          <input type="number" step="0.01" value="${lf.vacNoGozadasMonto != null ? $m(lf.vacNoGozadasMonto).toFixed(2) : (calcVac.monto||0).toFixed(2)}" id="lf-vac-monto"
            style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right;box-sizing:border-box">
        </div>
      </div>
      <div style="font-size:9px;color:var(--t3)">Días gozados en ${calcVac.anioCalculo||'el año'}:
        <input type="number" value="${lf.diasGozadosEnAnio||0}" id="lf-vac-gozados" onchange="_actualizarLiqFinal('${leg}')"
          style="width:60px;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:3px 6px;color:var(--t1);font-size:11px;outline:none;font-family:var(--font-mono);text-align:right;margin-left:4px">
      </div>
    </div>

    ${_aplicaPreaviso ? bloqueConcepto({ id:'lf-preaviso', titulo:'Preaviso (sustitutivo)', art:'Art. 232 LCT', badgeColor:'rem',
      detalle:`Antigüedad: ${calcPre.antiguedadMeses||0} meses · Plazo: ${calcPre.dias?calcPre.dias+' días':calcPre.meses+' mes'+(calcPre.meses!==1?'es':'')}`,
      valorAuto:(calcPre.monto||0).toFixed(2), valorGuardado:lf.preavisoMonto != null ? $m(lf.preavisoMonto).toFixed(2) : null }) : ''}

    ${_aplicaIntegr ? bloqueConcepto({ id:'lf-integr', titulo:'Integración mes despido', art:'Art. 233 LCT', badgeColor:'exento',
      detalle:`${calcInt.dias} día${calcInt.dias!==1?'s':''} restantes hasta fin de mes × $${fmtN($m(emp.bruto)/30)}/día`,
      valorAuto:(calcInt.monto||0).toFixed(2), valorGuardado:lf.integracionMesDespido != null ? $m(lf.integracionMesDespido).toFixed(2) : null }) : ''}

    ${(_aplica245 || _aplicaFallec) && !_aplicaEspecial ? bloqueConcepto({ id:'lf-indem', titulo:`Indemnización por antigüedad${calcInd._reducida50?' — 50%':''}`, art:`Art. ${_aplicaFallec?'248':_aplicaIA?'213':_aplicaIP?'212':'245'} LCT · Art. 26 LIG`, badgeColor:'exento',
      detalle:`${calcInd.aniosCalc} año${calcInd.aniosCalc!==1?'s':''} (${(calcInd.aniosFloat||0).toFixed(2)} reales${calcInd.fraccionMayor3meses?' · fracción >3 meses suma año':''}) × $${fmtN(calcInd.baseAplicada||0)}${calcInd.topeAplicado?' <span style="color:var(--yellow)">(tope CCT)</span>':''}`,
      valorAuto:(calcInd.monto||0).toFixed(2), valorGuardado:lf.indemAntiguedad != null ? $m(lf.indemAntiguedad).toFixed(2) : null }) : ''}

    ${_aplicaEspecial ? `
    ${bloqueConcepto({ id:'lf-indem', titulo:'Indemnización por antigüedad (Art. 245)', art:'Art. 245 LCT · Art. 26 LIG', badgeColor:'exento',
      detalle:`${calcEsp.aniosCalc||calcInd.aniosCalc} año${(calcEsp.aniosCalc||calcInd.aniosCalc)!==1?'s':''} × $${fmtN(calcEsp.baseAplicada||calcInd.baseAplicada||0)}`,
      valorAuto:(calcEsp.monto245||(calcInd.monto||0)).toFixed(2), valorGuardado:lf.indemAntiguedad != null ? $m(lf.indemAntiguedad).toFixed(2) : null })}
    ${bloqueConcepto({ id:'lf-indem-especial', titulo:`Indemnización especial — 1 año de remuneraciones`, art:`Art. 182 LCT · Art. 26 LIG`, badgeColor:'exento',
      detalle:`Mejor rem. ($${fmtN(mejorRem)}) × 12 meses`,
      valorAuto:(calcEsp.montoEspecial||0).toFixed(2), valorGuardado:lf.indemEspecialMonto != null ? $m(lf.indemEspecialMonto).toFixed(2) : null })}
    ` : ''}

    ${_aplicaFM ? bloqueConcepto({ id:'lf-indem-fm', titulo:'Indemnización fuerza mayor (50% Art. 245)', art:'Art. 247 LCT · Art. 26 LIG', badgeColor:'exento',
      detalle:`${calcFM.aniosCalc} año${calcFM.aniosCalc!==1?'s':''} × $${fmtN(calcFM.baseAplicada||0)} × 50%`,
      valorAuto:(calcFM.monto||0).toFixed(2), valorGuardado:lf.indemFuerzaMayor != null ? $m(lf.indemFuerzaMayor).toFixed(2) : null }) : ''}

    ${_aplicaFC ? bloqueConcepto({ id:'lf-indem-fc', titulo:'Indemnización fin de contrato (50% Art. 245)', art:'Art. 97 LCT · Art. 26 LIG', badgeColor:'exento',
      detalle:`Solo si el contrato supera 1 año de duración. ${calcFC.aniosCalc||0} años × $${fmtN(calcFC.baseAplicada||0)} × 50%`,
      valorAuto:(calcFC.monto||0).toFixed(2), valorGuardado:lf.indemFinContrato != null ? $m(lf.indemFinContrato).toFixed(2) : null }) : ''}

    <!-- Multas / sanciones opcionales — siempre visibles en liq. final -->
    <div style="margin-top:6px;margin-bottom:6px">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;padding-top:8px;border-top:1px dashed var(--border)">
        Multas y sanciones (opcionales — completar solo si corresponden)
      </div>

      ${bloqueConcepto({ id:'lf-multa-cert', titulo:'Multa entrega tardía de certificados', art:'Art. 80 LCT', badgeColor:'rem',
        detalle:`3 × mejor rem. ($${fmtN(mejorRem)}). Solo si no se entregan certificados dentro de 30 días de intimación fehaciente.`,
        valorAuto:(mejorRem*3).toFixed(2), valorGuardado:lf.multaCertificados != null ? $m(lf.multaCertificados).toFixed(2) : '0' })}

      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <strong style="font-size:13px;color:rgb(234,179,8)">Doble indemnización — trabajo no registrado</strong>
            <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:rgba(234,179,8,.12);color:rgb(234,179,8);margin-left:6px;font-family:var(--font-mono)">EXENTO</span>
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Ley 25323 Art. 1</div>
        </div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:8px">Duplica la indemnización Art. 245 si la relación fue clandestina. Completar con el monto adicional (= monto Art. 245 ya calculado arriba).</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">$</span>
          <input type="number" step="0.01" value="${lf.dobleIndemLey25323 != null ? $m(lf.dobleIndemLey25323).toFixed(2) : '0'}" id="lf-doble-indem"
            style="flex:1;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:7px 9px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">
        </div>
      </div>

      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <strong style="font-size:13px;color:rgb(234,179,8)">Incremento 50% por mora en el pago</strong>
            <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:rgba(234,179,8,.12);color:rgb(234,179,8);margin-left:6px;font-family:var(--font-mono)">EXENTO</span>
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Ley 25323 Art. 2</div>
        </div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:8px">Si el empleador no paga en tiempo tras intimación fehaciente: 50% adicional sobre preaviso + integración + Art. 245.</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">$</span>
          <input type="number" step="0.01" value="${lf.incrementoMora25323 != null ? $m(lf.incrementoMora25323).toFixed(2) : '0'}" id="lf-mora-25323"
            style="flex:1;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:7px 9px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">
          <button onclick="(() => { const _ind=$m(document.getElementById('lf-indem')?.value); const _pre=$m(document.getElementById('lf-preaviso')?.value); const _int=$m(document.getElementById('lf-integr')?.value); document.getElementById('lf-mora-25323').value=((_ind+_pre+_int)*0.5).toFixed(2); })()" style="font-size:10px;padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--t3);cursor:pointer">↻ auto</button>
        </div>
      </div>

      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div>
            <strong style="font-size:13px;color:var(--red)">Sanción retención de aportes</strong>
            <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:rgba(239,68,68,.12);color:var(--red);margin-left:6px;font-family:var(--font-mono)">REM</span>
          </div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Art. 132 bis LCT</div>
        </div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:8px">1 remuneración por cada mes en que el empleador retuvo aportes sin depositarlos ante AFIP. Indicar cantidad de meses.</div>
        <div style="display:grid;grid-template-columns:100px 1fr;gap:8px">
          <div>
            <label style="font-size:9px;color:var(--t3)">Meses retenidos</label>
            <input type="number" min="0" step="1" value="${lf.sancionArt132bisMeses||0}" id="lf-132bis-meses"
              onchange="(() => { const m=parseInt(document.getElementById('lf-132bis-meses')?.value||'0', 10)||0; document.getElementById('lf-132bis-monto').value=(${mejorRem}*m).toFixed(2); })()"
              style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:9px;color:var(--t3)">Monto ($)</label>
            <input type="number" step="0.01" value="${lf.sancionArt132bis != null ? $m(lf.sancionArt132bis).toFixed(2) : '0'}" id="lf-132bis-monto"
              style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right;box-sizing:border-box">
          </div>
        </div>
      </div>
    </div>

    <!-- Totales -->
    <div style="margin-top:14px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);font-family:var(--font-mono)">
      <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Resumen final</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:4px">
        <span>Total REM (SAC + preaviso + multas):</span>
        <span style="color:var(--green)">$</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:4px">
        <span>Total EXENTO (vac + integr + indem):</span>
        <span style="color:rgb(168,85,247)">$</span>
      </div>
    </div>

    <!-- Notas -->
    <div style="margin-top:14px">
      <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Notas / observaciones</label>
      <textarea id="lf-notas" rows="2" placeholder="Telegrama, expediente, acuerdo homologado, observaciones..."
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:12px;outline:none;resize:vertical;box-sizing:border-box">${(lf.notas||'').replace(/</g,'&lt;')}</textarea>
    </div>
    ` : '<div style="padding:36px;text-align:center;color:var(--t3);font-size:12px">Seleccioná un motivo de baja para ver los conceptos a liquidar.</div>'}
  `;
}

function _actualizarLiqFinal(leg){
  const motivo = document.getElementById('lf-motivo')?.value || '';
  const mejorRem = parseFloat(document.getElementById('lf-mejorrem')?.value || '0');
  const topeCCT = parseFloat(document.getElementById('lf-topecct')?.value || '0');
  const diasGozados = parseInt(document.getElementById('lf-vac-gozados')?.value, 10) || 0;
  const nov = _novedadesActuales[leg];
  if(!nov.liqFinalDatos) nov.liqFinalDatos = {};
  nov.liqFinalDatos.motivoBaja = motivo;
  if(isFinite(mejorRem)) nov.liqFinalDatos.mejorRem = mejorRem;
  if(isFinite(topeCCT))  nov.liqFinalDatos.topeCCT = topeCCT;
  nov.liqFinalDatos.diasGozadosEnAnio = diasGozados;
  const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === leg);
  if(emp) _renderLiqFinalContenido(leg, emp);
}

function _actualizarVacMonto(leg){
  const dias = parseFloat(document.getElementById('lf-vac-dias')?.value) || 0;
  const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === leg);
  if(!emp) return;
  const valorDia = $m(emp.bruto) / 25;
  const monto = dias * valorDia;
  const inp = document.getElementById('lf-vac-monto');
  if(inp) inp.value = monto.toFixed(2);
}

function guardarLiqFinal(leg){
  const motivo = document.getElementById('lf-motivo')?.value;
  if(!motivo){
    toast('⚠ Indicá el motivo de la baja','var(--yellow)'); return;
  }
  const nov = _novedadesActuales[leg];
  if(!nov.liqFinalDatos) nov.liqFinalDatos = {};

  // Detectar régimen para asegurar que en Ley 22.250 los conceptos LCT
  // (preaviso, integración, indem. Art. 245) queden en 0 incluso si el
  // input fue manipulado.
  const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === leg);
  const _esLey22250 = esRegimenLey22250(emp);

  const _v = id => parseFloat(document.getElementById(id)?.value) || 0;

  nov.liqFinalDatos = {
    motivoBaja: motivo,
    regimen: _esLey22250 ? 'ley_22250' : 'lct',
    mejorRem:          _v('lf-mejorrem'),
    topeCCT:           _v('lf-topecct'),
    diasVacNoGozadas:  _v('lf-vac-dias'),
    diasGozadosEnAnio: parseInt(document.getElementById('lf-vac-gozados')?.value, 10) || 0,
    vacNoGozadasMonto: _v('lf-vac-monto'),
    sacProporcional:   _v('lf-sac'),
    // Arts. 232 / 233 / 245 — régimen LCT
    preavisoMonto:           _esLey22250 ? 0 : _v('lf-preaviso'),
    integracionMesDespido:   _esLey22250 ? 0 : _v('lf-integr'),
    indemAntiguedad:         _esLey22250 ? 0 : _v('lf-indem'),
    // Indemnizaciones especiales
    indemEspecialMonto:      _v('lf-indem-especial'),   // Art. 178 / 182 — 1 año rem.
    indemFuerzaMayor:        _v('lf-indem-fm'),          // Art. 247
    indemIncapacidadAbsoluta: _v('lf-indem'),            // Art. 213 (reutiliza lf-indem)
    indemIncapacidadParcial:  _v('lf-indem'),            // Art. 212 (reutiliza lf-indem)
    indemFinContrato:        _v('lf-indem-fc'),          // Art. 97
    // Multas y sanciones (opcionales)
    multaCertificados:       _v('lf-multa-cert'),        // Art. 80 LCT
    dobleIndemLey25323:      _v('lf-doble-indem'),       // Ley 25323 Art. 1
    incrementoMora25323:     _v('lf-mora-25323'),        // Ley 25323 Art. 2
    sancionArt132bisMeses:   parseInt(document.getElementById('lf-132bis-meses')?.value, 10) || 0,
    sancionArt132bis:        _v('lf-132bis-monto'),      // Art. 132 bis
    notas: (document.getElementById('lf-notas')?.value || '').trim(),
    calculadoEl: new Date().toISOString(),
    calculadoPor: currentUser?.emp?.nom || 'RRHH'
  };
  _scheduleAutosaveNov(leg);
  cerrarLiqFinal();
  toast('✓ Liquidación final guardada','var(--green)');
}

// ═══════════════════════════════════════════════════════════════════════════
// EMBARGOS DEL EMPLEADO — modelo de lista (múltiples coexistentes)
// ───────────────────────────────────────────────────────────────────────────
// Permite cargar varios embargos al mismo tiempo (ej: alimentos + común,
// dos cuotas alimentarias). El cálculo aplica las reglas legales por capa.
// ═══════════════════════════════════════════════════════════════════════════
function abrirConfigEmbargo(leg, nom){
  if(_liqActiva && _liqActiva.estado !== 'borrador'){
    toast('⚠ Liquidación bloqueada','var(--red)'); return;
  }
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = { leg, liqId: _liqActiva?.id };
  const nov = _novedadesActuales[leg];

  // Migración: si existe formato viejo y no hay array, convertir.
  if(!Array.isArray(nov.embargos)) nov.embargos = [];
  if(nov.embargos.length === 0){
    if(nov.embargoTipo === 'alimentos' && $m(nov.embargoAlimentosPct) > 0){
      nov.embargos.push({ id:_genEmbId(), tipo:'alimentos', pct:$m(nov.embargoAlimentosPct), motivo:nov.embargoMotivo||'' });
    } else if($m(nov.embargo) > 0){
      nov.embargos.push({ id:_genEmbId(), tipo:'comun', monto:$m(nov.embargo), motivo:nov.embargoMotivo||'' });
    }
    if(nov.embargos.length){ delete nov.embargo; delete nov.embargoTipo; delete nov.embargoAlimentosPct; delete nov.embargoMotivo; }
  }

  const overlay = document.createElement('div');
  overlay.id = 'modal-config-embargo';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) cerrarConfigEmbargo(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:680px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⚖ Embargos del empleado</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${nom} · Legajo ${leg}</div>
        </div>
        <button onclick="cerrarConfigEmbargo()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px" id="emb-list-content"></div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="cerrarConfigEmbargo()" style="font-size:13px;padding:8px 18px">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _renderEmbargosLista(leg);
}

function _genEmbId(){ return 'emb_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); }

function cerrarConfigEmbargo(){
  document.getElementById('modal-config-embargo')?.remove();
  if(typeof renderNovedades === 'function') renderNovedades();
}

function _renderEmbargosLista(leg){
  const cont = document.getElementById('emb-list-content');
  if(!cont) return;
  const nov = _novedadesActuales[leg] || {};
  if(!Array.isArray(nov.embargos)) nov.embargos = [];
  const lista = nov.embargos;
  const smvm = (()=>{
    if(typeof getSMVMActual==='function' && _liqActiva){
      const ref = `${_liqActiva.anio}-${String(_liqActiva.mes).padStart(2,'0')}`;
      const row = getSMVMActual(ref);
      if(row && row.mensual > 0) return row.mensual;
    }
    return $m(getLiqParams().smvmMensual) || 0;
  })();
  const fmtN = n => n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const filaEmbargo = (e, idx) => {
    const esAlim = e.tipo === 'alimentos';
    const valor = esAlim ? `${$m(e.pct)}%` : `$ ${fmtN($m(e.monto))}`;
    return `
      <div style="display:grid;grid-template-columns:auto 1fr 130px auto;gap:10px;padding:12px;border-bottom:1px solid var(--border);align-items:center">
        <div style="font-size:18px">${esAlim?'👶':'⚖'}</div>
        <div style="min-width:0">
          <div style="font-size:12px;color:var(--t1);font-weight:500">
            ${esAlim ? 'Cuota alimentaria' : 'Embargo común'}
            <span style="font-size:9px;padding:1px 5px;border-radius:6px;margin-left:4px;font-family:var(--font-mono);background:${esAlim?'rgba(168,85,247,.1)':'rgba(239,68,68,.06)'};color:${esAlim?'rgb(168,85,247)':'var(--red)'}">${esAlim?'SIN TOPE':'TOPE ART.147'}</span>
          </div>
          ${e.motivo ? `<div style="font-size:11px;color:var(--t3);margin-top:3px">${_escHtml(e.motivo)}</div>` : ''}
        </div>
        <div style="font-size:13px;font-weight:600;color:${esAlim?'rgb(168,85,247)':'var(--red)'};text-align:right;font-family:var(--font-mono)">${valor}</div>
        <button class="btn btn-ghost" onclick="quitarEmbargo('${leg}','${e.id}')" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Quitar">✕</button>
      </div>
    `;
  };

  const totalAlimPct = lista.filter(x=>x.tipo==='alimentos').reduce((s,x)=>s+$m(x.pct),0);
  const totalComunCargado = lista.filter(x=>x.tipo==='comun').reduce((s,x)=>s+$m(x.monto),0);

  cont.innerHTML = `
    <div style="background:rgba(61,127,255,.04);border:1px solid rgba(61,127,255,.2);border-radius:var(--r);padding:10px 14px;margin-bottom:14px;font-size:11px;color:var(--t2);line-height:1.6">
      <strong style="color:var(--accent2)">ℹ Pueden coexistir varios embargos.</strong>
      Los <strong style="color:rgb(168,85,247)">alimentarios</strong> se calculan primero (sin tope, % sobre haberes − aportes obligatorios).
      Los <strong style="color:var(--red)">comunes</strong> aplican el tope Art. 147 LCT (20% del excedente del SMVM, calculado sobre el neto post-alimentos).
    </div>

    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:0;margin-bottom:16px">
      ${lista.length
        ? lista.map((e,i) => filaEmbargo(e,i)).join('')
        : '<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Sin embargos cargados</div>'
      }
    </div>

    ${lista.length ? `
      <div style="padding:10px 14px;background:rgba(168,85,247,.04);border:1px solid rgba(168,85,247,.15);border-radius:var(--r);font-size:11px;color:var(--t2);margin-bottom:14px;line-height:1.6">
        ${totalAlimPct > 0 ? `<div>👶 Total alimentos: <strong style="color:rgb(168,85,247);font-family:var(--font-mono)">${totalAlimPct}%</strong> sobre base sin aportes obligatorios</div>` : ''}
        ${totalComunCargado > 0 ? `<div>⚖ Total comunes cargado: <strong style="color:var(--red);font-family:var(--font-mono)">$ ${fmtN(totalComunCargado)}</strong> · sujeto a tope conjunto Art. 147${smvm>0?' (SMVM '+fmtN(smvm)+')':''}</div>` : ''}
      </div>
    ` : ''}

    <div style="border:1px dashed var(--border);border-radius:var(--r);padding:14px 16px">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">+ Agregar embargo</div>
      <div style="display:grid;grid-template-columns:140px 1fr;gap:10px;margin-bottom:10px">
        <select id="emb-add-tipo" onchange="_actualizarFormEmbAdd()"
          style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none">
          <option value="comun">⚖ Común</option>
          <option value="alimentos">👶 Alimentos</option>
        </select>
        <div id="emb-add-valor-wrap">
          <input type="number" id="emb-add-monto" step="0.01" placeholder="Monto en pesos"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">
        </div>
      </div>
      <input type="text" id="emb-add-motivo" placeholder="Motivo / Expediente / Juzgado (opcional)"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;margin-bottom:10px">
      <button class="btn btn-primary" onclick="agregarEmbargo('${leg}')" style="font-size:12px;padding:7px 14px;width:100%">+ Agregar a la lista</button>
    </div>
  `;
}

async function _actualizarFormEmbAdd(){
  const tipo = document.getElementById('emb-add-tipo')?.value || 'comun';
  const wrap = document.getElementById('emb-add-valor-wrap');
  if(!wrap) return;
  if(tipo === 'alimentos'){
    wrap.innerHTML = `<input type="number" id="emb-add-pct" step="0.1" min="0" max="100" placeholder="Porcentaje (ej: 25)"
      style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">`;
  } else {
    wrap.innerHTML = `<input type="number" id="emb-add-monto" step="0.01" placeholder="Monto en pesos"
      style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">`;
  }
}

async function agregarEmbargo(leg){
  const tipo = document.getElementById('emb-add-tipo')?.value || 'comun';
  const motivo = (document.getElementById('emb-add-motivo')?.value || '').trim();
  let nuevo;
  if(tipo === 'alimentos'){
    const pct = parseFloat(document.getElementById('emb-add-pct')?.value || '0');
    if(!isFinite(pct) || pct <= 0 || pct > 100){
      toast('⚠ Indicá un porcentaje válido (0-100)','var(--yellow)'); return;
    }
    nuevo = { id:_genEmbId(), tipo:'alimentos', pct, motivo };
  } else {
    const monto = parseFloat(document.getElementById('emb-add-monto')?.value || '0');
    if(!isFinite(monto) || monto <= 0){
      toast('⚠ Indicá un monto válido','var(--yellow)'); return;
    }
    nuevo = { id:_genEmbId(), tipo:'comun', monto, motivo };
  }
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = { leg, liqId: _liqActiva?.id };
  if(!Array.isArray(_novedadesActuales[leg].embargos)) _novedadesActuales[leg].embargos = [];
  _novedadesActuales[leg].embargos.push(nuevo);
  _scheduleAutosaveNov(leg);
  toast('✓ Embargo agregado','var(--green)');
  _renderEmbargosLista(leg);
}

async function quitarEmbargo(leg, id){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Quitar este embargo?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const nov = _novedadesActuales[leg];
  if(!nov || !Array.isArray(nov.embargos)) return;
  nov.embargos = nov.embargos.filter(e => e.id !== id);
  _scheduleAutosaveNov(leg);
  _renderEmbargosLista(leg);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTADOR DE CUMPLIMIENTO DE OBJETIVOS
// ───────────────────────────────────────────────────────────────────────────
// Permite cargar bulk los montos por legajo desde un texto (CSV pegado) o
// archivo. Formato: "legajo;monto" o "legajo,monto" o tab-separated.
// ═══════════════════════════════════════════════════════════════════════════
function abrirImportCumplObjetivos(){
  if(!_liqActiva){ toast('⚠ Abrí una liquidación primero','var(--yellow)'); return; }
  if(_liqActiva.estado !== 'borrador'){
    toast('⚠ La liquidación no está en borrador','var(--red)'); return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'modal-import-cumpobj';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) cerrarImportCumplObjetivos(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:680px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📥 Importar Cumplimiento de Objetivos</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Carga bulk de montos por legajo</div>
        </div>
        <button onclick="cerrarImportCumplObjetivos()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <div style="background:rgba(34,197,94,.04);border:1px solid rgba(34,197,94,.2);border-radius:4px;padding:10px 14px;font-size:11px;color:var(--t2);line-height:1.6">
          <strong style="color:var(--green)">Formato esperado:</strong> una fila por empleado con columnas <code>legajo</code> y <code>monto</code>.<br>
          Acepta <strong>Excel (.xlsx/.xls)</strong>, <strong>CSV</strong>, <strong>TXT</strong> o pegado directo. Separadores reconocidos: <code>;</code> <code>,</code> tab.
        </div>

        <!-- Plantilla -->
        <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">
          <button onclick="_descargarPlantillaCumpObj()" class="btn btn-ghost" style="font-size:11px;padding:6px 12px;color:var(--accent2);border-color:rgba(61,127,255,.3)">📋 Descargar plantilla con la nómina del período</button>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Archivo Excel / CSV / TXT</label>
          <input type="file" id="cumpobj-file" accept=".xlsx,.xls,.csv,.txt,.tsv" onchange="_cumpObjLeerArchivo(this)"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px;color:var(--t1);font-size:12px;outline:none">
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">o pegá los datos acá</label>
          <textarea id="cumpobj-textarea" rows="6" oninput="_cumpObjPreview()" placeholder="legajo;monto&#10;001234;50000&#10;001235;75000"
            style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);resize:vertical"></textarea>
        </div>

        <!-- Modo de aplicación -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:10px 14px">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Modo de aplicación</div>
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--t2);margin-bottom:6px;cursor:pointer">
            <input type="radio" name="cumpobj-modo" value="reemplazar" checked style="margin-top:2px;cursor:pointer;accent-color:var(--accent)">
            <div><strong style="color:var(--t1)">Reemplazar</strong> · El monto previo del empleado se sustituye por el nuevo (idempotente)</div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--t2);cursor:pointer">
            <input type="radio" name="cumpobj-modo" value="sumar" style="margin-top:2px;cursor:pointer;accent-color:var(--accent)">
            <div><strong style="color:var(--t1)">Sumar</strong> · El nuevo monto se suma al ya cargado (útil para cargas en varias tandas)</div>
          </label>
        </div>

        <div id="cumpobj-preview" style="display:none">
          <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Preview</div>
          <div id="cumpobj-preview-content" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:10px;max-height:240px;overflow-y:auto;font-size:11px;font-family:var(--font-mono)"></div>
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="cerrarImportCumplObjetivos()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="aplicarImportCumplObjetivos()" id="cumpobj-btn-aplicar" style="font-size:13px;padding:8px 18px" disabled>Importar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function cerrarImportCumplObjetivos(){
  document.getElementById('modal-import-cumpobj')?.remove();
}

// Descarga una plantilla XLSX con la nómina del período actual y columna
// "monto" vacía. El operador la completa y la sube por el mismo modal.
function _descargarPlantillaCumpObj(){
  if(typeof XLSX === 'undefined'){
    toast('⚠ SheetJS no disponible. Usá CSV/TXT.','var(--yellow)'); return;
  }
  const liq = _liqActiva;
  if(!liq){ toast('⚠ Sin liquidación activa','var(--yellow)'); return; }
  // Filtrar igual que la grilla de novedades (mismas reglas de nómina del período)
  let nomina = (typeof getNomina==='function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);
  if(liq.empresa && liq.empresa !== 'todas'){
    const _ex3 = nomina.filter(e => e.emp === liq.empresa);
    nomina = _ex3.length > 0 ? _ex3
           : nomina.filter(e => (e.emp||'').trim().toUpperCase() === liq.empresa.trim().toUpperCase());
  }
  const ultDia = new Date(liq.anio, liq.mes, 0);
  nomina = nomina.filter(e => {
    const fIng = (typeof parseFechaIng==='function') ? parseFechaIng(e.ing) : null;
    return !fIng || fIng <= ultDia;
  });

  const data = [
    ['legajo','apellido_nombre','empresa','area','monto','observacion'],
    ...nomina.map(e => [e.leg, e.nom, e.emp, e.lugar||'', '', ''])
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Anchos sugeridos
  ws['!cols'] = [{wch:10},{wch:34},{wch:18},{wch:24},{wch:12},{wch:30}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cumpl. Objetivos');
  const fname = `cumpl_obj_${liq.periodo || (liq.anio+'-'+String(liq.mes).padStart(2,'0'))}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ Plantilla descargada (${nomina.length} empleados)`,'var(--green)');
}

function _cumpObjLeerArchivo(input){
  const f = input.files?.[0];
  if(!f) return;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  // Excel (.xlsx / .xls): parsear con SheetJS y volcar como texto separado por ;
  if((ext === 'xlsx' || ext === 'xls') && typeof XLSX !== 'undefined'){
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type:'array' });
        const sh = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sh, { header:1, raw:false, defval:'' });
        // Detectar columnas legajo y monto: por header si existe, sino por posición
        let idxLeg = 0, idxMonto = -1;
        const header = (rows[0] || []).map(s => String(s||'').toLowerCase().trim());
        const bLeg = header.findIndex(s => s.includes('legajo') || s === 'leg');
        const bMonto = header.findIndex(s => s.includes('monto') || s.includes('importe') || s.includes('valor'));
        let startRow = 0;
        if(bLeg >= 0 && bMonto >= 0){
          idxLeg = bLeg; idxMonto = bMonto; startRow = 1;
        } else {
          idxMonto = (rows[0] && rows[0].length > 4) ? 4 : 1; // plantilla: leg, nom, emp, area, monto
        }
        const lineas = [];
        for(let i = startRow; i < rows.length; i++){
          const r = rows[i] || [];
          const leg = String(r[idxLeg]||'').trim();
          const monto = String(r[idxMonto]||'').trim();
          if(leg && monto) lineas.push(`${leg};${monto}`);
        }
        const ta = document.getElementById('cumpobj-textarea');
        if(ta){ ta.value = lineas.join('\n'); _cumpObjPreview(); }
        toast(`✓ Excel leído: ${lineas.length} fila${lineas.length!==1?'s':''}`,'var(--green)');
      } catch(err){
        toast('⚠ Error al leer el Excel: '+err.message,'var(--red)');
      }
    };
    reader.readAsArrayBuffer(f);
    return;
  }
  // CSV/TXT/TSV: lectura como texto plano
  const reader = new FileReader();
  reader.onload = ev => {
    const ta = document.getElementById('cumpobj-textarea');
    if(ta){ ta.value = String(ev.target.result || ''); _cumpObjPreview(); }
  };
  reader.readAsText(f, 'utf-8');
}

function _cumpObjParsear(texto){
  const lineas = String(texto || '').split(/\r?\n/).filter(l => l.trim());
  // Salteamos líneas de header si la primera no tiene número en la segunda columna
  const result = { items:[], errores:[] };
  lineas.forEach((linea, i) => {
    const partes = linea.split(/[\t;,]/).map(s => s.trim()).filter(s => s !== '');
    if(partes.length < 2){
      // Solo logueamos si no parece un header
      if(i === 0 && /^[a-zA-Z]/.test(linea)) return; // header
      result.errores.push({ linea: i+1, raw: linea, motivo: 'Faltan columnas (legajo;monto)' });
      return;
    }
    let leg = partes[0].replace(/[^\d]/g,'');
    const montoStr = partes[1].replace(/\$/g,'').replace(/\./g,'').replace(/,/g,'.').replace(/\s/g,'');
    const monto = parseFloat(montoStr);
    if(!leg){
      // Skip header
      if(i === 0) return;
      result.errores.push({ linea: i+1, raw: linea, motivo: 'Legajo inválido' });
      return;
    }
    // Normalizar legajo a 6 dígitos con padding
    if(leg.length < 6) leg = leg.padStart(6, '0');
    if(!isFinite(monto)){
      result.errores.push({ linea: i+1, raw: linea, motivo: 'Monto inválido' });
      return;
    }
    result.items.push({ leg, monto, lineaSrc: i+1 });
  });
  return result;
}

function _cumpObjPreview(){
  const texto = document.getElementById('cumpobj-textarea')?.value || '';
  const cont = document.getElementById('cumpobj-preview');
  const contInner = document.getElementById('cumpobj-preview-content');
  const btn = document.getElementById('cumpobj-btn-aplicar');
  if(!cont || !contInner || !btn) return;
  if(!texto.trim()){
    cont.style.display = 'none';
    btn.disabled = true;
    return;
  }
  const r = _cumpObjParsear(texto);
  // Cruzar con nómina para validar legajos existentes
  const nominaMap = {};
  try { (typeof getNomina==='function'?getNomina():[]).forEach(e => nominaMap[e.leg] = e); } catch(_){}
  const validados = r.items.map(it => ({
    ...it,
    existe: !!nominaMap[it.leg],
    nom: nominaMap[it.leg]?.nom || '— no encontrado —'
  }));
  const validos = validados.filter(v => v.existe);
  const noEncontrados = validados.filter(v => !v.existe);
  const totalMonto = validos.reduce((s,v)=>s+v.monto,0);

  cont.style.display = 'block';
  contInner.innerHTML = `
    <div style="margin-bottom:8px;display:flex;gap:14px;font-size:11px;flex-wrap:wrap">
      <span style="color:var(--green)">✓ Válidos: <strong>${validos.length}</strong></span>
      <span style="color:var(--red)">✕ No encontrados: <strong>${noEncontrados.length}</strong></span>
      <span style="color:var(--yellow)">⚠ Errores formato: <strong>${r.errores.length}</strong></span>
      <span style="color:var(--t1);margin-left:auto">Total monto: <strong>$ ${totalMonto.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></span>
    </div>
    ${validos.slice(0, 100).map(v => `
      <div style="padding:2px 0;color:var(--t2)">
        <span style="color:var(--green)">✓</span> ${v.leg} · ${v.nom.split(',')[0]} → <strong style="color:var(--t1)">$ ${v.monto.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
      </div>
    `).join('')}
    ${validos.length > 100 ? `<div style="color:var(--t3);font-style:italic;padding:4px 0">… y ${validos.length-100} más</div>` : ''}
    ${noEncontrados.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
      ${noEncontrados.slice(0, 50).map(v => `<div style="color:var(--red);padding:2px 0">✕ Legajo ${v.leg} no encontrado en la nómina</div>`).join('')}
    </div>` : ''}
    ${r.errores.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
      ${r.errores.slice(0, 30).map(e => `<div style="color:var(--yellow);padding:2px 0">⚠ Línea ${e.linea}: ${e.motivo} — <code style="opacity:.7">${(e.raw||'').slice(0,50)}</code></div>`).join('')}
    </div>` : ''}
  `;
  // Guardamos el resultado en variable para el aplicar
  _cumpObjPendiente = { validos, noEncontrados, errores: r.errores };
  btn.disabled = validos.length === 0;
}

let _cumpObjPendiente = null;

async function aplicarImportCumplObjetivos(){
  if(!_cumpObjPendiente || !_cumpObjPendiente.validos?.length){
    toast('⚠ No hay datos válidos para importar','var(--yellow)'); return;
  }
  const { validos, noEncontrados, errores } = _cumpObjPendiente;
  const modo = document.querySelector('input[name="cumpobj-modo"]:checked')?.value || 'reemplazar';
  const accionTxt = modo === 'sumar' ? 'SUMARÁN al monto previo' : 'REEMPLAZARÁN el monto previo';

  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Importar Cumplimiento de Objetivos para ${validos.length} empleado${validos.length!==1?'s':''}?<br><br>Modo: ${modo.toUpperCase()} — los nuevos montos ${accionTxt}.<br>Total: $ ${validos.reduce((s,v)=>s+v.monto,0).toLocaleString('es-AR',{minimumFractionDigits:2})}<br><br>${noEncontrados.length?'⚠ '+noEncontrados.length+' legajos no encontrados serán ignorados.<br>':''}${errores.length?'⚠ '+errores.length+' líneas con errores de formato serán ignoradas.<br>':''}`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;

  let aplicados = 0;
  validos.forEach(v => {
    if(!_novedadesActuales[v.leg]) _novedadesActuales[v.leg] = { leg: v.leg, liqId: _liqActiva?.id };
    const previo = $m(_novedadesActuales[v.leg].cumplimientoObjetivos);
    _novedadesActuales[v.leg].cumplimientoObjetivos = (modo === 'sumar') ? (previo + v.monto) : v.monto;
    _novedadesActuales[v.leg].liqId = _liqActiva?.id;
    _scheduleAutosaveNov(v.leg);
    aplicados++;
  });

  cerrarImportCumplObjetivos();
  toast(`✓ ${modo==='sumar'?'Sumados':'Reemplazados'} ${aplicados} cumplimientos de objetivos`,'var(--green)');
  if(typeof renderNovedades === 'function') renderNovedades();
}

function abrirPlusDescuentos(leg, nom){
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = { leg, liqId: _liqActiva?.id };
  const nov = _novedadesActuales[leg];
  if(!Array.isArray(nov.otrosHaberes))     nov.otrosHaberes = [];
  if(!Array.isArray(nov.otrosDescuentos))  nov.otrosDescuentos = [];

  const _bloqueada = _liqActiva && _liqActiva.estado && _liqActiva.estado !== 'borrador';

  const overlay = document.createElement('div');
  overlay.id = 'plus-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = (e) => { if(e.target===overlay) cerrarPlusDescuentos(); };

  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:780px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">⚙ Plus y descuentos categorizados</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${nom} · Legajo ${leg}</div>
        </div>
        <button onclick="cerrarPlusDescuentos()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:18px" id="plus-content"></div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="cerrarPlusDescuentos()" style="font-size:13px;padding:8px 18px">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _renderPlusContenido(leg, _bloqueada);
}

function cerrarPlusDescuentos(){
  document.getElementById('plus-modal')?.remove();
  // Refresh badges en la grilla
  if(typeof renderNovedades === 'function') renderNovedades();
}

function _renderPlusContenido(leg, bloqueada){
  const cont = document.getElementById('plus-content');
  if(!cont) return;
  const nov = _novedadesActuales[leg] || {};
  const haberes    = nov.otrosHaberes || [];
  const descuentos = nov.otrosDescuentos || [];

  const totalRem    = haberes.filter(h => _tipoHaberInfo(h.tipo).esRem !== false).reduce((s,h)=>s+(parseFloat(h.monto)||0),0);
  const totalNoRem  = haberes.filter(h => _tipoHaberInfo(h.tipo).esRem === false).reduce((s,h)=>s+(parseFloat(h.monto)||0),0);
  const totalDesc   = descuentos.reduce((s,d)=>s+(parseFloat(d.monto)||0),0);
  const fmtN = n => n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const tipoOptsHab = TIPOS_HABERES.map(t =>
    `<option value="${t.v}">${t.icon} ${t.label} (${t.esRem?'Rem.':'No Rem.'})</option>`
  ).join('');
  const tipoOptsDesc = TIPOS_DESCUENTOS.map(t =>
    `<option value="${t.v}">${t.icon} ${t.label}</option>`
  ).join('');

  const filaHaber = (h, idx) => {
    const tInfo = _tipoHaberInfo(h.tipo || 'otro_rem');
    const esHabitual = h.habitual !== false; // default true (compat con items viejos)
    return `
      <div style="display:grid;grid-template-columns:auto 1fr 130px auto;gap:10px;padding:10px;border-bottom:1px solid var(--border);align-items:center">
        <div style="font-size:18px">${tInfo.icon}</div>
        <div style="min-width:0">
          <div style="font-size:12px;color:var(--t1);font-weight:500">${tInfo.label}
            <span style="font-size:9px;padding:1px 5px;border-radius:6px;background:${tInfo.esRem?'rgba(34,197,94,.1)':'rgba(168,85,247,.1)'};color:${tInfo.esRem?'var(--green)':'rgb(168,85,247)'};margin-left:4px;font-family:var(--font-mono)">${tInfo.esRem?'REM':'NO REM'}</span>
            <span title="${esHabitual?'Habitual: integra base SAC (Art. 121 LCT)':'No habitual: NO integra base SAC'}" style="font-size:9px;padding:1px 5px;border-radius:6px;background:${esHabitual?'rgba(94,194,255,.1)':'rgba(120,120,120,.1)'};color:${esHabitual?'var(--accent2)':'var(--t3)'};margin-left:4px;font-family:var(--font-mono);cursor:help">${esHabitual?'HABIT':'NO HABIT'}</span>
          </div>
          ${h.concepto ? `<div style="font-size:11px;color:var(--t3);margin-top:2px">${_escHtml(h.concepto)}</div>` : ''}
          <div style="font-size:9px;color:var(--t3);font-family:var(--font-mono);margin-top:2px;font-style:italic">${tInfo.legal || ''}</div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--t1);text-align:right;font-family:var(--font-mono)">$ ${fmtN(parseFloat(h.monto)||0)}</div>
        <button class="btn btn-ghost" onclick="eliminarItemPlus('${leg}','haber',${idx})" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" ${bloqueada?'disabled':''}>✕</button>
      </div>
    `;
  };
  const filaDesc = (d, idx) => {
    const tInfo = _tipoDescuentoInfo(d.tipo || 'otro');
    return `
      <div style="display:grid;grid-template-columns:auto 1fr 130px auto;gap:10px;padding:10px;border-bottom:1px solid var(--border);align-items:center">
        <div style="font-size:18px">${tInfo.icon}</div>
        <div style="min-width:0">
          <div style="font-size:12px;color:var(--t1);font-weight:500">${tInfo.label}</div>
          ${d.concepto ? `<div style="font-size:11px;color:var(--t3);margin-top:2px">${_escHtml(d.concepto)}</div>` : ''}
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--red);text-align:right;font-family:var(--font-mono)">- $ ${fmtN(parseFloat(d.monto)||0)}</div>
        <button class="btn btn-ghost" onclick="eliminarItemPlus('${leg}','desc',${idx})" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" ${bloqueada?'disabled':''}>✕</button>
      </div>
    `;
  };

  cont.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em">➕ Plus / Haberes adicionales</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          Rem: <strong style="color:var(--green)">$ ${fmtN(totalRem)}</strong> ·
          No Rem: <strong style="color:rgb(168,85,247)">$ ${fmtN(totalNoRem)}</strong>
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:0">
        ${haberes.length ? haberes.map((h,i)=>filaHaber(h,i)).join('') : '<div style="padding:14px;text-align:center;color:var(--t3);font-size:12px">Sin plus cargados</div>'}
        ${!bloqueada ? `<div style="padding:10px;background:var(--bg1);border-top:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:1fr 1fr 130px auto;gap:8px;margin-bottom:8px">
            <select id="plus-add-tipo" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none">${tipoOptsHab}</select>
            <input id="plus-add-concepto" placeholder="Detalle (opcional)" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none">
            <input id="plus-add-monto" type="number" step="0.01" placeholder="Monto" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">
            <button class="btn btn-primary" onclick="agregarItemPlus('${leg}','haber')" style="font-size:11px;padding:6px 10px">+ Agregar</button>
          </div>
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2);cursor:pointer">
            <input type="checkbox" id="plus-add-habitual" checked style="cursor:pointer;accent-color:var(--accent)">
            <span><strong>Habitual</strong> — integra base SAC (Art. 121 LCT). Desmarcar para conceptos extraordinarios o únicos.</span>
          </label>
        </div>` : ''}
      </div>
    </div>

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em">➖ Descuentos personalizados</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">
          Total: <strong style="color:var(--red)">- $ ${fmtN(totalDesc)}</strong>
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:0">
        ${descuentos.length ? descuentos.map((d,i)=>filaDesc(d,i)).join('') : '<div style="padding:14px;text-align:center;color:var(--t3);font-size:12px">Sin descuentos cargados</div>'}
        ${!bloqueada ? `<div style="display:grid;grid-template-columns:1fr 1fr 130px auto;gap:8px;padding:10px;background:var(--bg1)">
          <select id="desc-add-tipo" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none">${tipoOptsDesc}</select>
          <input id="desc-add-concepto" placeholder="Detalle (opcional)" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none">
          <input id="desc-add-monto" type="number" step="0.01" placeholder="Monto" style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right">
          <button class="btn btn-primary" onclick="agregarItemPlus('${leg}','desc')" style="font-size:11px;padding:6px 10px">+ Agregar</button>
        </div>` : ''}
      </div>
    </div>
  `;
}

function _escHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function agregarItemPlus(leg, kind){
  if(_liqActiva && _liqActiva.estado !== 'borrador'){
    toast('⚠ Liquidación bloqueada','var(--red)'); return;
  }
  const sufijo = kind === 'haber' ? 'plus' : 'desc';
  const tipo = document.getElementById(`${sufijo}-add-tipo`)?.value;
  const concepto = (document.getElementById(`${sufijo}-add-concepto`)?.value || '').trim();
  const monto = parseFloat(document.getElementById(`${sufijo}-add-monto`)?.value);
  if(!tipo || !isFinite(monto) || monto === 0){
    toast('⚠ Indicá tipo y monto distinto de cero','var(--yellow)'); return;
  }
  const nov = _novedadesActuales[leg];
  const arr = kind === 'haber' ? nov.otrosHaberes : nov.otrosDescuentos;
  const item = { tipo, concepto, monto };
  // Solo los haberes llevan flag `habitual` (relevante para SAC)
  if(kind === 'haber'){
    const habitualCb = document.getElementById('plus-add-habitual');
    item.habitual = habitualCb ? habitualCb.checked : true;
  }
  arr.push(item);
  _scheduleAutosaveNov(leg);
  _renderPlusContenido(leg, false);
}

function eliminarItemPlus(leg, kind, idx){
  if(_liqActiva && _liqActiva.estado !== 'borrador'){
    toast('⚠ Liquidación bloqueada','var(--red)'); return;
  }
  const nov = _novedadesActuales[leg];
  const arr = kind === 'haber' ? nov.otrosHaberes : nov.otrosDescuentos;
  if(idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
  _scheduleAutosaveNov(leg);
  _renderPlusContenido(leg, false);
}

function abrirDedVoluntarias(leg, nom){
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = {leg, liqId:_liqActiva?.id};
  const nov = _novedadesActuales[leg];
  const d = nov.dedVoluntarias || {};

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };

  const f = (id, label, val, tooltip) => `
    <div class="form-group">
      <label style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.04em" title="${tooltip||''}">${label}</label>
      <input id="dv-${id}" type="number" step="0.01" value="${val||''}" placeholder="0"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)">
    </div>`;

  overlay.innerHTML = `
    <div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:22px;max-width:720px;width:100%;max-height:86vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--t1)">Deducciones Voluntarias — ${nom}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">Art. 85 LIG — Los topes se aplican automáticamente al generar la planilla</div>
        </div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>

      ${nov._importadoSiradig
        ? `<div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--green);margin-bottom:14px;line-height:1.6">✓ <strong>F.572 SIRADIG importado</strong> el ${new Date(nov._importadoSiradig).toLocaleDateString('es-AR')}. Estos valores se aplicarán al cálculo de Ganancias.</div>`
        : `<div style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--yellow);margin-bottom:14px;line-height:1.6">⚠ <strong>Sin F.572 SIRADIG importado.</strong> Lo que cargues acá <u>no impacta el cálculo de Ganancias</u> — solo aplican Ganancia No Imponible y Deducción Especial. Para activar las deducciones, importá el XML del F.572 desde el botón <em>Importar SIRADIG</em>.</div>`}

      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin:10px 0 6px">💊 Salud</div>
      <div class="form-grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
        ${f('cuotasMedicas','Cuotas Médicas Prepagas (Anual)',d.cuotasMedicas,'Sin tope')}
        ${f('honorariosMedicos','Honorarios Médicos (Anual)',d.honorariosMedicos,'Tope: 40% honor. y 5% gan.neta')}
        ${f('primaMuerte','Primas caso muerte (Anual)',d.primaMuerte,'Sin tope')}
      </div>

      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin:14px 0 6px">🛡 Seguros / Sepelio</div>
      <div class="form-grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
        ${f('seguroVida','Seguros Vida/Retiro (Anual)',d.seguroVida,'Tope fijo anual según RG')}
        ${f('gastosSepelio','Gastos Sepelio (Anual)',d.gastosSepelio,'Tope fijo anual')}
        ${f('aportesSGR','Aportes SGR (Anual)',d.aportesSGR,'Sin tope automático')}
      </div>

      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin:14px 0 6px">🏠 Vivienda</div>
      <div class="form-grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
        ${f('alquileres','Alquiler pagado (Anual)',d.alquileres,'40% deducible, tope MNI anual — solo NO propietarios')}
        ${f('intHipotecarios','Intereses Hipotecarios (Anual)',d.intHipotecarios,'Tope anual fijo')}
        ${f('servDomestico','Servicio Doméstico (Anual)',d.servDomestico,'Tope MNI anual')}
      </div>

      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;margin:14px 0 6px">🎓 Educación / Otros</div>
      <div class="form-grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
        ${f('educacion','Educación y Herramientas (Anual)',d.educacion,'Tope 40% MNI')}
        ${f('donaciones','Donaciones (Anual)',d.donaciones,'Tope 5% ganancia neta')}
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
        <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-ghost" style="font-size:12px;padding:6px 14px">Cancelar</button>
        <button onclick="guardarDedVoluntarias('${leg}')" class="btn btn-primary" style="font-size:12px;padding:6px 14px">✓ Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function guardarDedVoluntarias(leg){
  const campos = ['cuotasMedicas','honorariosMedicos','primaMuerte','seguroVida','gastosSepelio',
                  'aportesSGR','alquileres','intHipotecarios','servDomestico','educacion','donaciones'];
  const dv = {};
  campos.forEach(c => {
    const el = document.getElementById('dv-' + c);
    if(el) dv[c] = parseFloat(el.value) || 0;
  });
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = {leg, liqId:_liqActiva?.id};
  _novedadesActuales[leg].dedVoluntarias = dv;
  _novedadesActuales[leg].liqId = _liqActiva?.id;

  // Cerrar modal
  document.querySelector('div[style*="position:fixed"]')?.remove();
  toast('✓ Deducciones voluntarias guardadas (se aplicarán los topes automáticos al generar la planilla)','var(--green)',4500);
}

// ═══════════════════════════════════════════════════════════════
// IMPORTAR SIRADIG F.572 Web desde XML de ARCA
// ═══════════════════════════════════════════════════════════════

// Mapeo de códigos SIRADIG → campos del modal Deducciones Voluntarias
// Los códigos pueden variar ligeramente según la versión del archivo ARCA.
const SIRADIG_CODE_MAP = {
  '01': 'cuotasMedicas',       // Cuota Médico Asistencial
  '02': 'honorariosMedicos',   // Honorarios Médicos y Paramédicos
  '03': 'primaMuerte',         // Primas de Seguro para caso de muerte
  '04': 'seguroVida',          // Seguros de Vida / Retiro
  '05': 'gastosSepelio',       // Gastos de Sepelio
  '06': 'donaciones',          // Donaciones
  '07': 'aportesSGR',          // Aportes SGR
  '08': 'intHipotecarios',     // Intereses Créditos Hipotecarios
  '09': 'servDomestico',       // Empleados Servicio Doméstico
  '10': 'alquileres',          // Alquileres
  '13': 'educacion',           // Educación - cuotas
  '16': 'educacion'            // Herramientas cargas de familia (se suma a educación)
};

// Nombres descriptivos conocidos → campo interno (fallback si código no coincide)
const SIRADIG_NAME_MAP = [
  { re: /cuota.*m[eé]dic|prepag/i,           field: 'cuotasMedicas' },
  { re: /honorario.*m[eé]dic/i,              field: 'honorariosMedicos' },
  { re: /prima.*seguro.*muerte/i,            field: 'primaMuerte' },
  { re: /seguro.*vida|seguro.*retiro/i,      field: 'seguroVida' },
  { re: /sepelio/i,                          field: 'gastosSepelio' },
  { re: /donaci[oó]n/i,                      field: 'donaciones' },
  { re: /SGR|fondo.*riesgo/i,                field: 'aportesSGR' },
  { re: /hipotec/i,                          field: 'intHipotecarios' },
  { re: /dom[eé]stic|casa.*particular/i,     field: 'servDomestico' },
  { re: /alquiler/i,                         field: 'alquileres' },
  { re: /educaci[oó]n|guarder|herramienta/i, field: 'educacion' }
];

let _siradigParsedData = null; // cache de lo parseado para aplicar después

function abrirImportarSiradig(){
  if(!_liqActiva){ toast('⚠ Primero seleccioná una liquidación activa','var(--yellow)'); return; }

  const overlay = document.createElement('div');
  overlay.id = 'siradig-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:24px;max-width:820px;width:100%;max-height:90vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--t1)">📥 Importar SIRADIG F.572 Web desde ARCA</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:3px">
            Archivo XML — Período ${_liqActiva.periodo}
          </div>
        </div>
        <button onclick="document.getElementById('siradig-modal').remove()" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>

      <!-- Paso 1: ir a ARCA -->
      <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
        <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">Paso 1 · Descargar archivo desde ARCA</div>
        <div style="font-size:12px;color:var(--t2);line-height:1.7;margin-bottom:10px">
          Ingresá al portal de ARCA con la Clave Fiscal del agente de retención.
          Desde <em>"Mis Servicios"</em> → <em>"SiRADIG F.572 Web - Empleadores"</em> podés consultar y descargar
          los datos cargados por tus empleados en formato XML.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noopener"
             style="padding:7px 14px;background:var(--accent);color:white;text-decoration:none;border-radius:4px;font-size:12px;font-family:var(--font-mono)">🔗 Ingresar a ARCA (Clave Fiscal)</a>
          <a href="https://serviciosweb.afip.gob.ar/genericos/siradig/" target="_blank" rel="noopener"
             style="padding:7px 14px;background:var(--bg1);color:var(--accent2);border:1px solid var(--border);text-decoration:none;border-radius:4px;font-size:12px;font-family:var(--font-mono)">🔗 SiRADIG Empleador (directo)</a>
        </div>
      </div>

      <!-- Paso 2: subir archivo -->
      <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
        <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">Paso 2 · Subir archivo XML</div>
        <input type="file" id="siradig-file" accept=".xml,application/xml,text/xml" onchange="parseSiradigFile(event)"
          style="width:100%;padding:8px;background:var(--bg1);border:1px solid var(--border);border-radius:4px;color:var(--t1);font-size:12px;font-family:var(--font-mono);cursor:pointer">
        <div style="font-size:10px;color:var(--t3);margin-top:6px;font-family:var(--font-mono)">
          Formato aceptado: XML estándar SIRADIG de ARCA.
        </div>
      </div>

      <!-- Paso 3: vista previa -->
      <div id="siradig-preview-wrap" style="display:none">
        <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">Paso 3 · Vista previa</div>
        <div id="siradig-preview" style="max-height:340px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <label style="font-size:11px;color:var(--t2);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="siradig-sobrescribir" style="accent-color:var(--accent)">
            Sobrescribir deducciones ya cargadas manualmente
          </label>
          <div style="display:flex;gap:8px">
            <button onclick="document.getElementById('siradig-modal').remove()" class="btn btn-ghost" style="font-size:12px;padding:7px 14px">Cancelar</button>
            <button onclick="aplicarImportSiradig()" class="btn btn-primary" style="font-size:12px;padding:7px 14px">✓ Aplicar a la liquidación</button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

async function parseSiradigFile(event){
  const file = event.target.files[0];
  if(!file) return;

  const text = await file.text();
  let xml;
  try {
    xml = new DOMParser().parseFromString(text, 'text/xml');
    if(xml.querySelector('parsererror')) throw new Error('XML inválido');
  } catch(e){
    toast('⚠ El archivo no es un XML válido','var(--red)');
    return;
  }

  // Parser flexible: busca empleados por cualquier elemento que tenga CUIL
  const empleados = [];
  const allElements = xml.querySelectorAll('*');

  // Estrategia: encontrar nodos "empleado" / "contribuyente" / "trabajador" / "beneficiario"
  const candidatos = Array.from(xml.querySelectorAll('empleado, contribuyente, trabajador, beneficiario, Empleado, Contribuyente'));

  for(const nodo of candidatos){
    // CUIL: puede ser atributo o elemento hijo
    let cuil = nodo.getAttribute('cuil') || nodo.getAttribute('CUIL')
            || nodo.querySelector('cuil, CUIL, nroCuit, NroCuit')?.textContent?.trim();
    if(!cuil) continue;
    cuil = cuil.replace(/\D/g,''); // solo números
    if(cuil.length < 11) continue;
    // Formato con guiones
    const cuilFmt = `${cuil.slice(0,2)}-${cuil.slice(2,10)}-${cuil.slice(10,11)}`;

    const nom = nodo.querySelector('nombre, apellidoNombre, Nombre, ApellidoNombre, razonSocial')?.textContent?.trim() || '';

    // Cargas de familia
    const conyugeEl = nodo.querySelector('conyuge, Conyuge');
    const tieneConyuge = !!conyugeEl && (
      conyugeEl.getAttribute('activo') === 'true' || conyugeEl.getAttribute('deducible') === 'true'
      || !!conyugeEl.textContent?.trim()
    );
    const hijos = nodo.querySelectorAll('hijo, Hijo, carga, Carga');
    let nroHijos = 0, nroHijosInc = 0;
    hijos.forEach(h => {
      const inc = h.getAttribute('incapacitado') === 'true' || h.getAttribute('incapacidad') === 'true'
               || h.querySelector('incapacitado')?.textContent === 'true';
      if(inc) nroHijosInc++; else nroHijos++;
    });

    // Deducciones
    const dedVol = {
      cuotasMedicas:0, honorariosMedicos:0, primaMuerte:0, seguroVida:0,
      gastosSepelio:0, aportesSGR:0, alquileres:0, intHipotecarios:0,
      servDomestico:0, educacion:0, donaciones:0
    };
    const deduccNodos = nodo.querySelectorAll('deduccion, Deduccion, concepto, Concepto');
    deduccNodos.forEach(d => {
      const codigo = (d.getAttribute('codigo') || d.getAttribute('Codigo') || d.querySelector('codigo, Codigo')?.textContent || '').trim();
      const descr  = (d.getAttribute('descripcion') || d.getAttribute('Descripcion') || d.querySelector('descripcion, Descripcion')?.textContent || '').trim();
      const impStr = (d.getAttribute('importe') || d.getAttribute('Importe') || d.querySelector('importe, Importe, monto, Monto')?.textContent || '0').replace(/[^\d.,-]/g,'').replace(',','.');
      const importe = parseFloat(impStr) || 0;

      let field = SIRADIG_CODE_MAP[codigo.padStart(2,'0')] || SIRADIG_CODE_MAP[codigo];
      if(!field){
        const m = SIRADIG_NAME_MAP.find(m => m.re.test(descr));
        if(m) field = m.field;
      }
      if(field && importe > 0) dedVol[field] += importe;
    });

    empleados.push({ cuil: cuilFmt, nom, tieneConyuge, nroHijos, nroHijosInc, dedVol });
  }

  if(!empleados.length){
    toast('⚠ No se encontraron empleados en el XML','var(--yellow)');
    return;
  }

  _siradigParsedData = empleados;
  renderSiradigPreview(empleados);
}

function renderSiradigPreview(empleados){
  const wrap = document.getElementById('siradig-preview-wrap');
  const div  = document.getElementById('siradig-preview');
  if(!wrap || !div) return;
  wrap.style.display = 'block';

  // Cruzar con la nómina de la liquidación activa
  const nomina = getNomina();
  const porCuil = {};
  nomina.forEach(e => { if(e.cuil) porCuil[e.cuil] = e; });

  const fN = n => n.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const thS = 'padding:8px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--bg2);white-space:nowrap';
  const tdS = 'padding:6px 10px;border-bottom:1px solid var(--border);font-size:12px;vertical-align:top';

  let matched = 0, unmatched = 0;
  const filas = empleados.map(e => {
    const emp = porCuil[e.cuil];
    const totalDed = Object.values(e.dedVol).reduce((s,v)=>s+v, 0);
    if(emp) matched++; else unmatched++;
    return `<tr>
      <td style="${tdS}">
        <div style="font-family:var(--font-mono);color:${emp?'var(--t1)':'var(--yellow)'};font-size:11px">${e.cuil}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px">${e.nom || (emp?emp.nom:'—')}</div>
        ${emp ? `<div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">Leg. ${emp.leg}</div>` : `<div style="font-size:10px;color:var(--yellow)">⚠ No encontrado en nómina</div>`}
      </td>
      <td style="${tdS};text-align:center">
        ${e.tieneConyuge ? '✓' : '—'}<br>
        <span style="font-size:10px;color:var(--t3)">cónyuge</span>
      </td>
      <td style="${tdS};text-align:center">${e.nroHijos || 0}</td>
      <td style="${tdS};text-align:center">${e.nroHijosInc || 0}</td>
      <td style="${tdS};font-family:var(--font-mono);color:var(--green)">${fN(totalDed)}</td>
      <td style="${tdS}">
        <details>
          <summary style="cursor:pointer;font-size:11px;color:var(--accent2)">Ver desglose</summary>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:4px;line-height:1.7">
            ${Object.entries(e.dedVol).filter(([,v])=>v>0).map(([k,v])=>`${k}: $${fN(v)}`).join('<br>') || '<span style="color:var(--t3)">Sin deducciones</span>'}
          </div>
        </details>
      </td>
    </tr>`;
  }).join('');

  div.innerHTML = `
    <div style="padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:11px;color:var(--t2);font-family:var(--font-mono)">
      Total: ${empleados.length} empleados — ${matched} coinciden con nómina, ${unmatched} sin coincidencia
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${thS}">CUIL / Empleado</th>
        <th style="${thS};text-align:center">Cónyuge</th>
        <th style="${thS};text-align:center">Hijos</th>
        <th style="${thS};text-align:center">H.Inc.</th>
        <th style="${thS}">Total Ded.</th>
        <th style="${thS}">Conceptos</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
}

async function aplicarImportSiradig(){
  if(!_siradigParsedData || !_liqActiva){ toast('⚠ No hay datos para aplicar','var(--yellow)'); return; }
  const sobrescribir = document.getElementById('siradig-sobrescribir')?.checked;
  const nomina = getNomina();
  const porCuil = {};
  nomina.forEach(e => { if(e.cuil) porCuil[e.cuil] = e; });

  let aplicados = 0, sinCruce = 0;
  _siradigParsedData.forEach(e => {
    const emp = porCuil[e.cuil];
    if(!emp){ sinCruce++; return; }
    if(!_novedadesActuales[emp.leg]) _novedadesActuales[emp.leg] = {leg:emp.leg, liqId:_liqActiva.id};
    const nov = _novedadesActuales[emp.leg];

    // Cargas de familia: sobrescribir si viene en SIRADIG, respetando flag
    if(sobrescribir || nov.tieneConyuge == null) nov.tieneConyuge = e.tieneConyuge;
    if(sobrescribir || !nov.nroHijosMenores) nov.nroHijosMenores = e.nroHijos;
    if(sobrescribir || !nov.nroHijosIncapacitados) nov.nroHijosIncapacitados = e.nroHijosInc;

    // Deducciones voluntarias
    if(sobrescribir || !nov.dedVoluntarias){
      nov.dedVoluntarias = { ...e.dedVol };
    } else {
      // Merge: solo escribe campos no cargados manualmente
      nov.dedVoluntarias = { ...nov.dedVoluntarias };
      Object.entries(e.dedVol).forEach(([k,v])=>{
        if(!nov.dedVoluntarias[k] && v > 0) nov.dedVoluntarias[k] = v;
      });
    }
    nov.liqId = _liqActiva.id;
    nov._importadoSiradig = new Date().toISOString();
    aplicados++;
  });

  document.getElementById('siradig-modal')?.remove();
  renderNovedades();
  toast(`✓ SIRADIG aplicado: ${aplicados} empleados actualizados${sinCruce?` — ${sinCruce} sin coincidencia`:''}`,'var(--green)',5500);
  _siradigParsedData = null;
}

async function irAPreview(){
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  // Guardar novedades en IDB
  const proms=Object.values(_novedadesActuales).map(n=>saveNovedad(n));
  await Promise.all(proms);
  await calcularYRenderPreview();
  liqTab('preview');
}

// ── Cálculo y preview ────────────────────────────────────────────
async function calcularYRenderPreview(){
  const liq=_liqActiva; if(!liq) return;
  const params=getLiqParams();
  const titulo=document.getElementById('liq-preview-titulo');
  if(titulo) titulo.textContent=`Liquidación ${liq.tipo.toUpperCase()} — ${liq.periodo} — ${liq.empresa==='todas'?'Todas las empresas':liq.empresa}`;

  let nomina=getNomina().filter(e=>!e._deBaja&&!e.egreso);
  // Liquidación individual: solo el empleado seleccionado
  if(liq.alcance==='individual' && liq.empLeg){
    nomina = nomina.filter(e=>e.leg===liq.empLeg);
  } else if(liq.empresa && liq.empresa!=='todas'){
    // Filtro exacto primero; si no hay resultados, intentar coincidencia normalizada
    const _empExacta = nomina.filter(e=>e.emp===liq.empresa);
    if(_empExacta.length > 0){
      nomina = _empExacta;
    } else {
      // Fallback: comparación case-insensitive y sin espacios extra
      const _empNorm = liq.empresa.trim().toUpperCase();
      nomina = nomina.filter(e=>(e.emp||'').trim().toUpperCase()===_empNorm);
    }
  }
  // Excluir empleados que ingresaron DESPUÉS del fin del período liquidado
  const ultDiaPeriodo = new Date(liq.anio, liq.mes, 0);
  nomina = nomina.filter(e => {
    const fIng = parseFechaIng(e.ing);
    return !fIng || fIng <= ultDiaPeriodo;
  });
  nomina.sort((a,b)=>a.nom.localeCompare(b.nom));

  // Refrescar cache de conceptos custom antes del cálculo masivo
  await _refreshConceptosCustomCache({ anio: liq.anio, mes: liq.mes });
  // Si la liq estaba marcada como pendiente de recálculo, limpiamos el flag
  if(liq._recalculoPendiente){
    liq._recalculoPendienteResuelto = liq._recalculoPendiente;
    delete liq._recalculoPendiente;
  }

  const items=[];
  const _erroresCalc=[];
  for(const emp of nomina){
    try {
      const nov=_novedadesActuales[emp.leg]||{};
      const anticipo=$m(nov.anticipos);
      const item=await calcularItemLiquidacion(emp,params,nov,liq.anio,liq.mes,anticipo,liq.fechaPago,liq.tipo);
      items.push(item);
    } catch(_eItem){
      // No abortar toda la liquidación por el error de un empleado: registrarlo
      // y seguir, para que el resto se calcule y el problema sea VISIBLE.
      console.error(`Liquidación: error al calcular legajo ${emp.leg} (${emp.nom||''}):`, _eItem);
      _erroresCalc.push(`${emp.nom||emp.leg}: ${(_eItem && _eItem.message) || _eItem}`);
    }
  }
  if(_erroresCalc.length && typeof toast==='function'){
    toast(`⚠ ${_erroresCalc.length} empleado(s) con error en el cálculo (ver consola). Primero: ${_erroresCalc[0]}`, 'var(--red)', 7000);
  }

  // Guardar items en la liquidación.
  // SI la liq ya está aprobada/pagada/cerrada, NO la sobrescribimos en IDB:
  // el recálculo es solo "en memoria" para poder imprimir recibos. Mantener
  // los items guardados originales intactos protege la integridad de la
  // liquidación firmada/cerrada (compliance).
  liq.items=items;
  if(liq.estado === 'borrador' || !liq.estado){
    await updateLiquidacion(liq);
  } else {
  }

  renderPreviewTabla(items);
}

function renderPreviewTabla(items){
  const div=document.getElementById('liq-preview-tabla'); if(!div) return;
  const cols=[
    ['Empleado','left',200],['Empresa','left',120],
    ['Básico','right',110],['HE 50%','right',90],['HE 100%','right',90],
    ['Antigüed.','right',90],['Presentismo','right',90],['Otros Hab.','right',90],
    ['Exentos','right',100],
    ['TOTAL HAB.','right',120],
    ['Jubilación','right',100],['OS','right',80],['ANSSAL','right',80],['PAMI','right',80],
    ['Sindicato','right',90],['Ganancias','right',100],['Anticipos','right',100],['Embargo judicial','right',110],['Otros Desc.','right',90],
    ['TOTAL DESC.','right',120],
    ['NETO A PAGAR','right',130],
    ['Contrib. Pat.','right',120],['COSTO TOTAL','right',130]
  ];
  const thS=(align)=>`padding:8px 8px;text-align:${align};font-size:9px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap;border-bottom:2px solid var(--border);background:var(--bg2);position:sticky;top:0;z-index:1`;
  const tdS=(align,bold,color)=>`padding:7px 8px;text-align:${align};font-size:11px;font-family:var(--font-mono);color:${color||'var(--t1)'};border-bottom:1px solid var(--border);${bold?'font-weight:700':''}`;

  let totHab=0,totDesc=0,totNeto=0,totContrib=0,totCosto=0,totExentos=0;
  items.forEach(i=>{ totHab+=$m(i.totalHaberes); totDesc+=$m(i.totalDescuentos); totNeto+=$m(i.netoAPagar); totContrib+=$m(i.totalContrib); totCosto+=$m(i.totalCosto); totExentos+=$m(i.totalExentos); });

  div.innerHTML=`<div style="max-height:500px;overflow:auto">
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr>${cols.map(([h,a])=>`<th style="${thS(a)}">${h}</th>`).join('')}</tr></thead>
    <tbody>
    ${items.map(i=>`<tr>
      <td style="${tdS('left',false)}">${i.nom.split(',')[0]}<br><span style="font-size:9px;color:var(--t3)">${i.leg}</span></td>
      <td style="${tdS('left',false)}">${i.empresa}</td>
      <td style="${tdS('right',false,'var(--t2)')}">${(()=>{
        const total = i.sueldoBasico + $m(i.mCompFuncion);
        if(!($m(i.mCompFuncion) > 0)) return fmtPesos(i.sueldoBasico);
        return `<span title="Base: ${fmtPesos(i.sueldoBasico)} · Comp.Func.: ${fmtPesos(i.mCompFuncion)}" style="cursor:help">${fmtPesos(total)}</span>`;
      })()}</td>
      <td style="${tdS('right',false)}">${i.mHsE50?fmtPesos(i.mHsE50):'-'}</td>
      <td style="${tdS('right',false)}">${i.mHsE100?fmtPesos(i.mHsE100):'-'}</td>
      <td style="${tdS('right',false)}">${i.mAntig?fmtPesos(i.mAntig):'-'}</td>
      <td style="${tdS('right',false)}">${i.mPres?fmtPesos(i.mPres):'-'}</td>
      <td style="${tdS('right',false)}">${(()=>{
        const total = i.mOtrosH+$m(i.mSac)+$m(i.mVac)+$m(i.mLicEspeciales)+$m(i.mAjuste)+($m(i.mCompFuncion)>0?$m(i.mCompFuncion):0);
        if(!total) return '-';
        const desgloses = [];
        if($m(i.mCompFuncion) > 0) desgloses.push(`Comp.Func.: ${fmtPesos(i.mCompFuncion)}`);
        if(i.mOtrosHRem)   desgloses.push(`Plus REM: ${fmtPesos(i.mOtrosHRem)}`);
        if(i.mOtrosHNoRem) desgloses.push(`Plus NO REM: ${fmtPesos(i.mOtrosHNoRem)}`);
        if($m(i.mSac))     desgloses.push(`SAC: ${fmtPesos(i.mSac)}`);
        if($m(i.mVac))     desgloses.push(`Vac.: ${fmtPesos(i.mVac)}`);
        if($m(i.mLicEspeciales)) desgloses.push(`Lic. esp.: ${fmtPesos(i.mLicEspeciales)}`);
        if($m(i.mAjuste))  desgloses.push(`Ajuste: ${fmtPesos(i.mAjuste)}`);
        if($m(i.mCumpObj)) desgloses.push(`Cumpl.Obj.: ${fmtPesos(i.mCumpObj)}`);
        const tt = desgloses.join(' · ');
        return `<span title="${tt}" style="cursor:help">${fmtPesos(total)}</span>`;
      })()}</td>
      <td style="${tdS('right',false,'var(--yellow)')}">${$m(i.totalExentos)?fmtPesos(i.totalExentos):'-'}</td>
      <td style="${tdS('right',true,'var(--accent2)')}">${fmtPesos(i.totalHaberes)}</td>
      <td style="${tdS('right',false,'var(--red)')}">${fmtPesos(i.jubilacion)}</td>
      <td style="${tdS('right',false,'var(--red)')}">${fmtPesos(i.obraSocial)}</td>
      <td style="${tdS('right',false,'var(--red)')}">${fmtPesos(i.anssal)}</td>
      <td style="${tdS('right',false,'var(--red)')}">${fmtPesos(i.pamiEmp)}</td>
      <td style="${tdS('right',false,'var(--red)')}">${fmtPesos(i.sindicato)}</td>
      <td style="${tdS('right',false,'var(--red)')}">${$m(i.ganancias) ? `<span style="color:${$m(i.ganancias)<0?'var(--green)':'var(--red)'}">${fmtPesos(Math.abs(i.ganancias))}${$m(i.ganancias)<0?' ↩':''}</span>` : '-'}</td>
      <td style="${tdS('right',false,'var(--red)')}">${i.anticiposDesc?fmtPesos(i.anticiposDesc):'-'}</td>
      <td style="${tdS('right',false,'var(--red)')}">${i.embargo?fmtPesos(i.embargo):'-'}${
        i.embargoTopeAplicado
          ? `<div title="Tope Art. 147 LCT aplicado. Cargado: ${fmtPesos(i.embargoCargado||0)}, tope: ${fmtPesos(i.embargoTope||0)}" style="font-size:9px;color:var(--yellow);font-family:var(--font-mono);margin-top:2px;cursor:help">⚠ tope aplicado</div>`
          : ''
      }</td>
      <td style="${tdS('right',false,'var(--red)')}">${i.mOtrosD?fmtPesos(i.mOtrosD):'-'}</td>
      <td style="${tdS('right',true,'var(--red)')}">${fmtPesos(i.totalDescuentos)}</td>
      <td style="${tdS('right',true,'var(--green)')}">${fmtPesos(i.netoAPagar)}</td>
      <td style="${tdS('right',false,'var(--t3)')}">${fmtPesos(i.totalContrib)}</td>
      <td style="${tdS('right',true,'var(--accent2)')}">${fmtPesos(i.totalCosto)}</td>
    </tr>`).join('')}
    </tbody>
    <tfoot><tr style="background:var(--bg2)">
      <td colspan="2" style="padding:10px 8px;font-size:11px;font-weight:700;color:var(--t1);border-top:2px solid var(--border)">TOTALES (${items.length} empleados)</td>
      <td colspan="6" style="border-top:2px solid var(--border)"></td>
      <td style="${tdS('right',true,'var(--yellow)')};border-top:2px solid var(--border)">${fmtPesos(totExentos)}</td>
      <td style="${tdS('right',true,'var(--accent2)')};border-top:2px solid var(--border)">${fmtPesos(totHab)}</td>
      <td colspan="9" style="border-top:2px solid var(--border)"></td>
      <td style="${tdS('right',true,'var(--red)')};border-top:2px solid var(--border)">${fmtPesos(totDesc)}</td>
      <td style="${tdS('right',true,'var(--green)')};border-top:2px solid var(--border)">${fmtPesos(totNeto)}</td>
      <td style="${tdS('right',true,'var(--t3)')};border-top:2px solid var(--border)">${fmtPesos(totContrib)}</td>
      <td style="${tdS('right',true,'var(--accent2)')};border-top:2px solid var(--border)">${fmtPesos(totCosto)}</td>
    </tr></tfoot>
  </table></div>`;

  const tot=document.getElementById('liq-preview-totales');
  if(tot) tot.innerHTML=`<div style="display:flex;gap:16px;flex-wrap:wrap">
    ${[['Total Haberes',totHab,'var(--accent2)'],['Total Descuentos',totDesc,'var(--red)'],['Total Neto',totNeto,'var(--green)'],['Contrib. Patronales',totContrib,'var(--t3)'],['Costo Laboral Total',totCosto,'var(--t1)']].map(([l,v,c])=>`
    <div style="padding:12px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);min-width:160px">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);margin-bottom:4px">${l}</div>
      <div style="font-size:15px;font-weight:700;color:${c}">${fmtPesos(v)}</div>
    </div>`).join('')}
  </div>`;
}

async function aprobarLiquidacion(){
  if(!_liqActiva){ toast("⚠ No hay liquidación activa","var(--red)"); return; }
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede aprobar liquidaciones','var(--red)'); return; }
  if(_liqActiva.estado === 'aprobada'){ toast('ℹ Liquidación ya aprobada','var(--yellow)'); return; }
  if(_liqActiva.estado === 'pagada'){ toast('⚠ No se puede modificar: ya fue pagada','var(--red)'); return; }
  if(!_liqActiva.items || !_liqActiva.items.length){
    toast('⚠ Calculá el preview antes de aprobar (no hay items)','var(--yellow)'); return;
  }

  // ─── Validaciones cruzadas previas a aprobar ────────────────────────
  const validacion = validarLiquidacionPreAprobar(_liqActiva);
  if(validacion.errores.length || validacion.warnings.length){
    const ok = await mostrarValidacionesPreAprobar(validacion);
    if(!ok) return;
  }

  const totHab = _liqActiva.items.reduce((s,i)=>s+$m(i.totalHaberes),0);
  const totNeto = _liqActiva.items.reduce((s,i)=>s+$m(i.netoAPagar),0);
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Aprobar la liquidación ${_liqActiva.periodo} — ${_liqActiva.tipo}?<br><br>• ${_liqActiva.items.length} empleados<br>• Total haberes: ${fmtPesos(totHab)}<br>• Total neto a pagar: ${fmtPesos(totNeto)}<br><br>Una vez aprobada, los recibos se pueden generar y descargar.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  _liqActiva.estado='aprobada';
  _liqActiva.aprobadaEl=new Date().toLocaleDateString('es-AR');
  _liqActiva.aprobadaPor=currentUser?.emp?.leg || null;
  _liqActiva.aprobadaPorNom=currentUser?.emp?.nom || null;
  await updateLiquidacion(_liqActiva);
  toast('✓ Liquidación aprobada','var(--green)');
  renderLiqPeriodos();
  // Cargar recibos
  renderListaRecibos(_liqActiva.items);
  liqTab('recibos');
  _actualizarBotonesEstadoLiq();
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIONES CRUZADAS pre-aprobación
// ───────────────────────────────────────────────────────────────────────────
// Verifica consistencia de cada item antes de pasar a 'aprobada'. Errores
// bloquean el avance, warnings requieren confirmación adicional.
// ═══════════════════════════════════════════════════════════════════════════
function validarLiquidacionPreAprobar(liq){
  const errores = [], warnings = [];
  if(!liq?.items?.length) return { errores:['Sin items para validar'], warnings:[] };

  const params = (typeof getLiqParams === 'function') ? getLiqParams() : {};
  const habiles = (typeof diasHabilesDelMes === 'function') ? diasHabilesDelMes(liq.anio, liq.mes).habiles : 22;
  // En quincenales el cómputo se reduce a la mitad de hábiles aprox
  const habilesPeriodo = (liq.tipo === 'quincenal_1' || liq.tipo === 'quincenal_2')
    ? Math.ceil(habiles / 2) : habiles;

  liq.items.forEach(i => {
    const ident = `${i.leg} ${i.nom?.split(',')[0] || ''}`;

    // 1. Netos negativos (ERROR)
    if($m(i.netoAPagar) < 0){
      errores.push(`${ident}: neto negativo (${fmtPesos(i.netoAPagar)}). Revisar descuentos.`);
    }
    // 2. Neto cero pero con haberes (warning)
    else if($m(i.netoAPagar) === 0 && $m(i.totalHaberes) > 0){
      warnings.push(`${ident}: neto $0 con haberes ${fmtPesos(i.totalHaberes)}. ¿Todo al embargo/descuentos?`);
    }

    // 3. Sin CBU para acreditación (warning)
    const tieneCBU = (() => {
      try {
        // Preferir el helper centralizado del sistema multi-CBU.
        if(typeof getCBUsActivos === 'function'){
          const activos = getCBUsActivos(i.leg);
          if(Array.isArray(activos) && activos.length) return true;
        }
        // Fallback: CBU master en nómina.
        const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === i.leg);
        return !!(emp?.cbu && String(emp.cbu).replace(/[^\d]/g,'').length === 22);
      } catch(_){ return false; }
    })();
    if(!tieneCBU && $m(i.netoAPagar) > 0){
      warnings.push(`${ident}: sin CBU vigente — no podrá acreditarse el neto`);
    }

    // 4. Sin obra social (warning)
    const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === i.leg);
    if(!emp?.cod_os){
      warnings.push(`${ident}: sin código de obra social cargado (afecta F.931 y aporte 3%)`);
    }

    // 5. Suma días + licencias + suspensiones > hábiles del período (ERROR)
    const diasTrab = $m(i.diasTrab);
    // Total de días de licencias (suma todos los conceptos)
    const diasLic  = $m(i.diasMatrimonio) + $m(i.diasNacimiento) + $m(i.diasFallecimiento)
                   + $m(i.diasExamen) + $m(i.diasOtrasLic) + $m(i.diasSinGoce)
                   + $m(i.diasMaternidad) + $m(i.diasExcedencia) + $m(i.diasVac);
    const diasSusp = $m(i.diasSuspension);
    const totalDias = diasTrab + diasLic + diasSusp;
    // Tope según régimen: los MENSUALIZADOS se computan por días CORRIDOS
    // (calendario del período), no por hábiles. Solo UOCRA (Ley 22.250) usa
    // hábiles, que es su base de cálculo del jornal.
    const _itemEsHabiles = (i.diasBaseDescripcion === 'hábiles');
    const _esQuincLiq = (liq.tipo === 'quincenal_1' || liq.tipo === 'quincenal_2');
    const topeDias = _itemEsHabiles
      ? habilesPeriodo
      : (_esQuincLiq ? 15 : ($m(i.diasMes) || 30));
    if(totalDias > topeDias){
      errores.push(`${ident}: suma días (${diasTrab}+${diasLic}+${diasSusp}=${totalDias}) excede los días del período (${topeDias})`);
    }

    // 6. Empleado en situación 'baja' sin liqFinalDatos cargada (warning)
    if(i._bajaEnPeriodo && !i.liqFinalDatos?.motivoBaja){
      warnings.push(`${ident}: tiene baja en el período (${i._bajaEnPeriodo}) pero NO cargó liquidación final`);
    }

    // 7. Liq. final con motivo pero sin conceptos cargados (warning)
    if(i.liqFinalDatos?.motivoBaja){
      const lfd = i.liqFinalDatos;
      const total = $m(lfd.vacNoGozadasMonto) + $m(lfd.sacProporcional)
                  + $m(lfd.preavisoMonto) + $m(lfd.integracionMesDespido) + $m(lfd.indemAntiguedad);
      if(total === 0){
        warnings.push(`${ident}: liquidación final con motivo "${lfd.motivoBaja}" pero todos los conceptos en $0`);
      }
    }

    // 8. Cargado embargo común cuyo tope se aplicó (info-warning)
    if(i.embargoTopeAplicado && $m(i.embargoCargado) > 0){
      warnings.push(`${ident}: embargo cargado ${fmtPesos(i.embargoCargado)} fue topeado a ${fmtPesos(i.embargo)} por Art. 147 LCT`);
    }

    // 9. Bruto declarado vs base remunerativa esperada (sanity)
    const baseEsperada = $m(i.totalHaberesRem);
    if(baseEsperada > 0 && $m(i.jubilacion) === 0){
      errores.push(`${ident}: base remunerativa ${fmtPesos(baseEsperada)} pero aporte jubilatorio $0 — falta cálculo`);
    }
  });

  return { errores, warnings };
}

// Modal con la lista de errores/warnings. Devuelve Promise<boolean> con
// true si el usuario decide continuar (errores bloquean el "continuar").
function mostrarValidacionesPreAprobar(v){
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.id = 'modal-pre-aprobar';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    const cleanup = (val) => { overlay.remove(); resolve(val); };

    const erroresHtml = v.errores.length
      ? v.errores.map(e => `<div style="padding:6px 0;color:var(--red);font-family:var(--font-mono);font-size:11px;line-height:1.5">✕ ${e}</div>`).join('')
      : '<div style="color:var(--t3);font-style:italic;padding:6px 0;font-size:11px">— sin errores —</div>';
    const warningsHtml = v.warnings.length
      ? v.warnings.map(w => `<div style="padding:6px 0;color:var(--yellow);font-family:var(--font-mono);font-size:11px;line-height:1.5">⚠ ${w}</div>`).join('')
      : '<div style="color:var(--t3);font-style:italic;padding:6px 0;font-size:11px">— sin advertencias —</div>';

    overlay.innerHTML = `
      <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:760px;width:100%;max-height:88vh;overflow-y:auto">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">${v.errores.length ? '✕' : '⚠'} Revisión previa a aprobar</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">${v.errores.length} error${v.errores.length!==1?'es':''} · ${v.warnings.length} advertencia${v.warnings.length!==1?'s':''}</div>
          </div>
          <button onclick="document.getElementById('modal-pre-aprobar').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
        </div>
        <div style="padding:18px 22px">
          ${v.errores.length ? `
          <div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:12px 14px;margin-bottom:14px">
            <div style="font-size:11px;font-weight:600;color:var(--red);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Errores (impiden aprobar)</div>
            <div style="max-height:200px;overflow-y:auto">${erroresHtml}</div>
          </div>` : ''}
          <div style="background:rgba(234,179,8,.04);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:12px 14px">
            <div style="font-size:11px;font-weight:600;color:var(--yellow);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Advertencias (revisar)</div>
            <div style="max-height:240px;overflow-y:auto">${warningsHtml}</div>
          </div>
          ${v.errores.length ? `
            <div style="margin-top:14px;padding:10px 14px;background:rgba(239,68,68,.04);border:1px dashed rgba(239,68,68,.3);border-radius:var(--r);font-size:11px;color:var(--t2);line-height:1.5">
              <strong style="color:var(--red)">No se puede aprobar con errores presentes.</strong> Volvé a la grilla de novedades, corregí los items señalados y recalculá el preview antes de intentar de nuevo.
            </div>` : `
            <div style="margin-top:14px;padding:10px 14px;background:rgba(234,179,8,.04);border:1px dashed rgba(234,179,8,.3);border-radius:var(--r);font-size:11px;color:var(--t2);line-height:1.5">
              Las advertencias no impiden aprobar pero pueden indicar inconsistencias. Revisalas antes de continuar.
            </div>`}
        </div>
        <div id="pre-aprobar-actions" style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const actions = overlay.querySelector('#pre-aprobar-actions');
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.style.cssText = 'font-size:13px;padding:8px 14px';
    cancelBtn.textContent = v.errores.length ? 'Volver a corregir' : 'Cancelar';
    cancelBtn.onclick = () => cleanup(false);
    actions.appendChild(cancelBtn);

    if(!v.errores.length){
      const continueBtn = document.createElement('button');
      continueBtn.className = 'btn btn-primary';
      continueBtn.style.cssText = 'font-size:13px;padding:8px 18px;background:var(--yellow);border-color:var(--yellow);color:#222';
      continueBtn.textContent = 'Continuar pese a las advertencias';
      continueBtn.onclick = () => cleanup(true);
      actions.appendChild(continueBtn);
    }

    overlay.onclick = e => { if(e.target===overlay) cleanup(false); };
  });
}

// Formatea un ISO datetime a "DD/MM/YYYY" (fecha corta).
function _fmtFechaCorta(iso){
  if(!iso) return '';
  try {
    const d = new Date(iso);
    if(isNaN(d)) return iso;
    return d.toLocaleDateString('es-AR');
  } catch(e){ return iso; }
}

// ─── Marcar como pagada ───────────────────────────────────────────────────
// Estado intermedio entre `aprobada` y `cerrada`. Tras aprobada y emisión de
// recibos, el operador la marca como pagada cuando confirma que el banco
// ejecutó la acreditación.
async function marcarLiquidacionPagada(){
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH.','var(--red)'); return; }
  if(_liqActiva.estado !== 'aprobada'){
    toast('⚠ Solo se puede marcar como pagada una liquidación aprobada','var(--yellow)'); return;
  }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Marcar como PAGADA la liquidación ${_liqActiva.periodo} — ${_liqActiva.tipo}?<br><br>Esta acción confirma que la acreditación fue ejecutada en el banco. Los recibos quedan disponibles para descarga, pero todavía es posible reabrir si hay errores.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  _liqActiva.estado='pagada';
  _liqActiva.pagadaEl  = new Date().toISOString();
  _liqActiva.pagadaPor = currentUser?.emp?.leg || null;
  _liqActiva.pagadaPorNom = currentUser?.emp?.nom || null;
  await updateLiquidacion(_liqActiva);
  toast('✓ Liquidación marcada como pagada','var(--green)');
  renderLiqPeriodos();
  _actualizarBotonesEstadoLiq();
}

// ─── Cerrar período (estado final, sin reversión) ────────────────────────
async function cerrarPeriodoLiq(){
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH.','var(--red)'); return; }
  if(_liqActiva.estado !== 'pagada'){
    toast('⚠ Solo se cierra un período ya pagado','var(--yellow)'); return;
  }
  const _cfm = await showConfirm({
    titulo: `🔒 Cierre definitivo: ${_liqActiva.periodo} — ${_liqActiva.tipo}`,
    mensaje: `Una vez cerrado el período:<br>
      <ul style="margin:8px 0 0 16px;line-height:1.9;color:var(--t2)">
        <li>No se podrán modificar novedades ni cálculos</li>
        <li>No se podrá reabrir ni eliminar</li>
        <li>Los datos quedan congelados para auditoría</li>
      </ul><br>
      <span style="color:var(--yellow);font-size:12px">Se pedirá confirmación adicional por escrito.</span>`,
    labelOk: 'Continuar con el cierre',
    peligroso: true,
  });
    if(!_cfm) return;
  // Doble confirmación para evitar accidentes
  const conf = await showPrompt({titulo:'Confirmación por escrito',mensaje:'Para confirmar el cierre definitivo, escribí <b>CERRAR</b> en mayúsculas.',placeholder:'CERRAR',requerido:true,labelOk:'Confirmar cierre'});
  if(conf !== 'CERRAR'){
    toast('Cierre cancelado','var(--t3)'); return;
  }
  _liqActiva.estado='cerrada';
  _liqActiva.cerradaEl  = new Date().toISOString();
  _liqActiva.cerradaPor = currentUser?.emp?.leg || null;
  _liqActiva.cerradaPorNom = currentUser?.emp?.nom || null;
  await updateLiquidacion(_liqActiva);
  toast('🔒 Período cerrado definitivamente','var(--green)', 4500);
  renderLiqPeriodos();
  _actualizarBotonesEstadoLiq();
}

// ─── Reabrir a borrador (cuando se aprobó por error) ─────────────────────
async function reabrirLiquidacion(){
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH.','var(--red)'); return; }
  if(_liqActiva.estado === 'cerrada'){
    toast('⚠ Período cerrado definitivamente, no se puede reabrir','var(--red)'); return;
  }
  if(_liqActiva.estado === 'borrador'){
    toast('ℹ Ya está en borrador','var(--yellow)'); return;
  }
  const motivo = await showPrompt({titulo:`Reabrir liquidación ${_liqActiva.periodo}`,mensaje:`Estado actual: <b>${_liqActiva.estado.toUpperCase()}</b>. Indicá el motivo de la reapertura.`,placeholder:'Motivo de la reapertura...',requerido:true,labelOk:'Reabrir'});
  if(motivo === null) return;
  if(!motivo.trim()){ toast('⚠ El motivo es obligatorio','var(--yellow)'); return; }
  // Log de reapertura para auditoría
  try {
    const logs = JSON.parse(localStorage.getItem('lsg_liq_reaperturas')||'[]');
    logs.push({
      id: _liqActiva.id, periodo: _liqActiva.periodo, tipo: _liqActiva.tipo,
      estadoPrevio: _liqActiva.estado,
      motivo: motivo.trim(),
      reabiertoPor: currentUser?.emp?.leg || null,
      reabiertoPorNom: currentUser?.emp?.nom || null,
      reabiertoEl: new Date().toISOString()
    });
    try{localStorage.setItem('lsg_liq_reaperturas', JSON.stringify(logs));}catch(e){}
  } catch(e){ console.error(e); }
  _liqActiva.estado = 'borrador';
  // Limpiar campos de aprobación/pago para que vuelva a pasar por el flujo
  delete _liqActiva.aprobadaEl;  delete _liqActiva.aprobadaPor;  delete _liqActiva.aprobadaPorNom;
  delete _liqActiva.pagadaEl;    delete _liqActiva.pagadaPor;    delete _liqActiva.pagadaPorNom;
  await updateLiquidacion(_liqActiva);
  toast('↺ Liquidación reabierta a borrador','var(--green)');
  renderLiqPeriodos();
  liqTab('novedades');
  _actualizarBotonesEstadoLiq();
}

// ─── Visor del historial de reaperturas ───────────────────────────────
// Permite a RR.HH. revisar cuándo, quién y por qué se reabrió alguna
// liquidación. El log se persiste en localStorage 'lsg_liq_reaperturas'
// y se acumula sin límite (se puede limpiar manualmente desde Admin).
async function abrirHistorialReaperturas(){
  let logs;
  try { logs = JSON.parse(localStorage.getItem('lsg_liq_reaperturas')||'[]'); }
  catch(_){ logs = []; }
  // Más recientes primero
  logs.sort((a,b) => (b.reabiertoEl||'').localeCompare(a.reabiertoEl||''));

  const overlay = document.createElement('div');
  overlay.id = 'modal-hist-reap';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:780px;width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">↺ Historial de reaperturas</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${logs.length} reapertura${logs.length!==1?'s':''} registrada${logs.length!==1?'s':''}</div>
        </div>
        <button onclick="document.getElementById('modal-hist-reap').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>
      <div style="padding:18px 22px">
        ${logs.length === 0
          ? '<div style="padding:40px;text-align:center;color:var(--t3);font-size:12px">Sin reaperturas registradas</div>'
          : `<div style="display:flex;flex-direction:column;gap:8px">${logs.map(l => `
            <div class="card" style="background:var(--bg2);padding:10px 14px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start">
              <div style="min-width:0">
                <div style="font-size:12px;color:var(--t1);font-weight:500">${l.periodo} · ${l.tipo}</div>
                <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:3px">Estado previo: <strong>${(l.estadoPrevio||'?').toUpperCase()}</strong> → borrador</div>
                <div style="font-size:11px;color:var(--t2);margin-top:6px;line-height:1.5;font-style:italic">"${(l.motivo||'(sin motivo)').replace(/</g,'&lt;')}"</div>
              </div>
              <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-align:right;white-space:nowrap">
                ${l.reabiertoEl ? new Date(l.reabiertoEl).toLocaleString('es-AR') : '?'}<br>
                <span style="color:var(--t2)">${l.reabiertoPorNom||l.reabiertoPor||'?'}</span>
              </div>
            </div>
          `).join('')}</div>`
        }
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        ${logs.length > 0 && currentUser?.emp?.nom?.includes('PAPA') ? `<button onclick="_limpiarHistorialReaperturas()" class="btn btn-ghost" style="font-size:11px;padding:7px 12px;color:var(--red);border-color:rgba(239,68,68,.3)">🗑 Limpiar log (solo Admin)</button>` : ''}
        <button class="btn btn-primary" onclick="document.getElementById('modal-hist-reap').remove()" style="font-size:13px;padding:8px 18px">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function _limpiarHistorialReaperturas(){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Limpiar TODO el historial de reaperturas?<br><br>Esta acción es irreversible y debería usarse solo para mantenimiento.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  localStorage.removeItem('lsg_liq_reaperturas');
  if(typeof logAuditX === 'function') logAuditX('admin', 'limpiar_log_reaperturas', { por: currentUser?.emp?.nom });
  document.getElementById('modal-hist-reap')?.remove();
  toast('✓ Historial de reaperturas limpiado','var(--green)');
}

// ─── Visor del historial de reaperturas — fin ──────────────────────────


async function _actualizarBotonesEstadoLiq(){
  const liq = _liqActiva;
  const show = (id, vis) => { const el = document.getElementById(id); if(el) el.style.display = vis ? 'inline-block' : 'none'; };
  if(!liq){
    ['liq-btn-rechazar','liq-btn-aprobar','liq-btn-reabrir','liq-btn-pagada','liq-btn-cerrar']
      .forEach(id => show(id, false));
    return;
  }
  const e = liq.estado || 'borrador';
  show('liq-btn-rechazar', e === 'borrador');
  show('liq-btn-aprobar',  e === 'borrador');
  show('liq-btn-reabrir',  e === 'aprobada' || e === 'pagada');
  show('liq-btn-pagada',   e === 'aprobada');
  show('liq-btn-cerrar',   e === 'pagada');
}

async function rechazarLiquidacionActiva(){
  if(!_liqActiva){ toast('⚠ No hay liquidación activa','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH. puede rechazar liquidaciones','var(--red)'); return; }
  if(_liqActiva.estado === 'pagada'){ toast('⚠ No se puede rechazar: liquidación ya pagada','var(--red)'); return; }
  const motivo = await showPrompt({titulo:`Rechazar liquidación ${_liqActiva.periodo}`,mensaje:`Se borrará la liquidación <b>${_liqActiva.tipo}</b>. Indicá el motivo del rechazo.`,placeholder:'Motivo del rechazo...',requerido:true,labelOk:'Rechazar y borrar'});
  if(motivo === null) return;
  if(!motivo.trim()){ toast('⚠ Ingresá el motivo del rechazo','var(--yellow)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`Esta acción ELIMINARÁ la liquidación y todas sus novedades asociadas. Es irreversible.<br><br>Motivo: "${motivo.trim()}"<br><br>¿Confirmar eliminación?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;

  const id = _liqActiva.id;
  // Guardar log de rechazo antes de borrar (auditoría persistente vía localStorage)
  try {
    const logs = JSON.parse(localStorage.getItem('lsg_liq_rechazos')||'[]');
    logs.push({
      id, periodo: _liqActiva.periodo, tipo: _liqActiva.tipo,
      empresa: _liqActiva.empresa || null, alcance: _liqActiva.alcance || null,
      empLeg: _liqActiva.empLeg || null, empNom: _liqActiva.empNom || null,
      items: (_liqActiva.items||[]).length,
      motivo: motivo.trim(),
      rechazadoPor: currentUser?.emp?.leg || null,
      rechazadoPorNom: currentUser?.emp?.nom || null,
      rechazadoEl: new Date().toISOString()
    });
    try{localStorage.setItem('lsg_liq_rechazos', JSON.stringify(logs));}catch(e){}
  } catch(e){ console.error('No se pudo persistir el log de rechazo:', e); }

  _liqActiva = null;
  _novedadesActuales = {};
  await deleteLiquidacion(id);
  // Borrar novedades asociadas
  const db = await abrirIDB();
  await new Promise((res,rej)=>{
    const tx = db.transaction('novedades_liq','readwrite');
    const store = tx.objectStore('novedades_liq');
    store.getAll().onsuccess = function(ev){
      ev.target.result.filter(n=>n.liqId===id).forEach(n=>store.delete(n.id));
      tx.oncomplete=()=>res(); tx.onerror=e=>rej(e);
    };
  });
  // Limpiar UI y volver a la lista de períodos
  const prevDiv = document.getElementById('liq-preview-tabla');
  if(prevDiv) prevDiv.innerHTML='';
  const totDiv = document.getElementById('liq-preview-totales');
  if(totDiv) totDiv.innerHTML='';
  const titDiv = document.getElementById('liq-preview-titulo');
  if(titDiv) titDiv.textContent='';
  liqTab('periodos');
  await renderLiqPeriodos();
  toast('✕ Liquidación rechazada y eliminada','var(--red)');
}

async function rechazarEmpleadoLiq(){
  const liq = _liqActiva;
  if(!liq?.items?.length){ toast('⚠ Calculá primero la liquidación','var(--yellow)'); return; }

  // Construir lista de empleados para elegir
  const opts = liq.items.map((i,idx)=>
    `${String(idx+1).padStart(2,'0')} — ${i.leg} — ${i.nom}`
  ).join('\n');
  const resp = await showPrompt({titulo:'Confirmar recálculo',mensaje:'¿Querés recalcular los items de esta liquidación?',labelOk:'Recalcular',labelCancel:'Cancelar'});
  if(resp===null) return;
  const idx = parseInt(resp.trim(), 10) - 1;
  if(isNaN(idx) || idx<0 || idx>=liq.items.length){
    toast('⚠ Número inválido','var(--yellow)'); return;
  }
  const emp = liq.items[idx];
  const motivo = await showPrompt({titulo:`Excluir a ${emp.nom}`,mensaje:'Indicá el motivo para excluir a este empleado de la liquidación.',placeholder:'Motivo de exclusión...',requerido:true,labelOk:'Excluir'});
  if(motivo===null) return;
  if(!motivo.trim()){ toast('⚠ Ingresá el motivo','var(--yellow)'); return; }

  // Quitar del array de items y guardar
  liq.items.splice(idx, 1);
  // Registrar en excluidos para auditoría
  if(!liq.excluidos) liq.excluidos = [];
  liq.excluidos.push({leg:emp.leg, nom:emp.nom, motivo:motivo.trim(), excluidoEl:new Date().toLocaleDateString('es-AR')});
  await updateLiquidacion(liq);

  // Refrescar vista
  renderPreviewTabla(liq.items);
  renderListaRecibos(liq.items);
  toast(`✕ ${emp.nom.split(',')[0]} excluido de la liquidación — se recalcularon los totales`,'var(--yellow)');
}

// ── Recibos ──────────────────────────────────────────────────────
function renderListaRecibos(items){
  const liq=_liqActiva;
  const titulo=document.getElementById('liq-recibos-titulo');
  if(titulo) titulo.textContent=`Recibos — ${liq?.periodo}`;
  const div=document.getElementById('liq-lista-recibos'); if(!div) return;
  const q=(document.getElementById('liq-rec-search')?.value||'').toLowerCase();
  const lista=(items||liq?.items||[]).filter(i=>!q||i.nom.toLowerCase().includes(q)||(i.leg||'').includes(q));

  // Cabecera con botones de publicación (solo cuando no es borrador)
  const _puedePublicar = liq && liq.estado && liq.estado !== 'borrador';
  const _pub = liq?._recibosPublicados;
  const _pubGan = liq?._gananciaPublicadas;
  const cabecera = liq ? `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 16px;margin-bottom:12px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="font-size:11px;color:var(--t2);line-height:1.5;flex:1">
        <strong style="color:var(--t1)">📄 Publicar documentos a empleados</strong>
        <div style="font-size:10px;color:var(--t3);margin-top:3px">Los empleados pueden ver y descargar desde su portal. Los accesos quedan registrados en el log de lectura.</div>
        ${_pub ? `<div style="font-size:10px;color:var(--green);margin-top:4px;font-family:var(--font-mono)">✓ Recibos: ${new Date(_pub.fecha).toLocaleString('es-AR')} por ${_pub.por} · ${_pub.exitos} OK${_pub.fallas?', '+_pub.fallas+' fallas':''}</div>` : ''}
        ${_pubGan ? `<div style="font-size:10px;color:var(--green);margin-top:2px;font-family:var(--font-mono)">✓ Ganancias: ${new Date(_pubGan.fecha).toLocaleString('es-AR')} por ${_pubGan.por} · ${_pubGan.exitos} OK${_pubGan.fallas?', '+_pubGan.fallas+' fallas':''}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="publicarRecibosPDF()" style="font-size:12px;padding:7px 14px${_puedePublicar?'':';opacity:.5;cursor:not-allowed'}" ${_puedePublicar?'':'disabled title="Aprobá la liquidación primero"'}>
          ${_pub ? '🔁 Republicar recibos' : '📤 Publicar recibos'}
        </button>
        <button class="btn btn-ghost" onclick="publicarGananciasPDF()" style="font-size:12px;padding:7px 14px${_puedePublicar?'':';opacity:.5;cursor:not-allowed'}" ${_puedePublicar?'':'disabled title="Aprobá la liquidación primero"'}>
          ${_pubGan ? '🔁 Republicar ganancias' : '🧾 Publicar ganancias'}
        </button>
      </div>
    </div>` : '';

  div.innerHTML=cabecera+`<div class="card" style="padding:0;overflow:hidden">`+
    lista.map(i=>`
    <div style="display:flex;align-items:center;padding:12px 18px;border-bottom:1px solid var(--border);gap:14px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--t1)">${i.nom}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${i.leg} · ${i.empresa}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:13px;font-weight:700;color:var(--green)">${fmtPesos(i.netoAPagar)}</div>
        <div style="font-size:10px;color:var(--t3)">Neto a cobrar</div>
      </div>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 12px;flex-shrink:0" onclick="imprimirRecibo('${i.leg}')">🖨 Imprimir</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 12px;flex-shrink:0;color:var(--accent2);border-color:rgba(61,127,255,.3)" onclick="descargarReciboPDFIndividual('${i.leg}')" ${_puedePublicar?'':'disabled style="opacity:.4;cursor:not-allowed" title="Aprobá la liquidación primero"'}>📄 PDF</button>
    </div>`).join('')+`</div>`;
}

function filtrarRecibos(){ renderListaRecibos(); }

// ── Convertir número a letras (español) ─────────────────────────
function numerosALetras(n){
  n=Math.round(Math.abs(n));
  if(!n) return 'CERO';
  const U=['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
  const D=['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const C=['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  function t3(x){
    if(!x) return '';
    if(x===100) return 'CIEN';
    const c=Math.floor(x/100), r=x%100, s=[];
    if(c) s.push(C[c]);
    if(r>0&&r<=20) s.push(U[r]);
    else if(r>20){ const d=Math.floor(r/10),u=r%10; s.push(D[d]+(u?' Y '+U[u]:'')); }
    return s.join(' ');
  }
  const B=Math.floor(n/1000000000), M=Math.floor((n%1000000000)/1000000),
        K=Math.floor((n%1000000)/1000), R=n%1000, p=[];
  if(B) p.push(B===1?'MIL MILLONES':t3(B)+' MIL MILLONES');
  if(M) p.push(M===1?'UN MILLÓN':t3(M)+' MILLONES');
  if(K) p.push(K===1?'MIL':t3(K)+' MIL');
  if(R) p.push(t3(R));
  return p.join(' ');
}

// ── Datos de empresa ──────────────────────────────────────────────
const EMPRESA_DATOS_LIQ = {
  'LEITEN S.A.':       {cuit:'30-65127003-7', dir:'3 de Febrero', nro:'4456', piso:'', depto:'', cp:'B1678GWH', loc:'Caseros - Prov. de Buenos Aires'},
  'SINIS S.A.':        {cuit:'30-71232400-8', dir:'3 de Febrero', nro:'4456', piso:'', depto:'', cp:'B1678GWH', loc:'Caseros - Prov. de Buenos Aires'},
  'BARTON REBAR SA':   {cuit:'30-71560800-9', dir:'3 de Febrero', nro:'4456', piso:'', depto:'', cp:'B1678GWH', loc:'Caseros - Prov. de Buenos Aires'},
  'IDEE S.R.L.':        {cuit:'30-71482065-2', dir:'3 de Febrero', nro:'4456', piso:'', depto:'', cp:'B1678GWH', loc:'Caseros - Prov. de Buenos Aires'},
  'LEITEN SALTA S.A.': {cuit:'30-71232401-6', dir:'Av. Sarmiento', nro:'100', piso:'', depto:'', cp:'A4400',    loc:'Salta - Prov. de Salta'},
};

function getLogoSrc(empresa){
  // 1) Primero: override desde ABM Empresas (si tiene logo cargado)
  try {
    const abm = _findEmpresaABMByNombre(empresa);
    if(abm && abm.logoDataUrl) return abm.logoDataUrl;
  } catch(e){}
  // 2) Fallback: logo hardcoded desde la constante LOGOS
  try{
    const h=(typeof LOGOS!=='undefined'?LOGOS[empresa]:'')||'';
    const m=h.match(/src="([^"]+)"/); return m?m[1]:'';
  }catch(e){return'';}
}

// Devuelve datos combinados (ABM override > EMPRESA_DATOS_LIQ default)
function getEmpresaDatos(empresa){
  const def = EMPRESA_DATOS_LIQ[empresa] || {cuit:'',dir:'',nro:'',piso:'',depto:'',cp:'',loc:''};
  try {
    const abm = _findEmpresaABMByNombre(empresa);
    if(abm){
      return {
        cuit:  abm.cuit  || def.cuit  || '',
        dir:   abm.dir   || def.dir   || '',
        nro:   abm.nro   || def.nro   || '',
        piso:  abm.piso  || def.piso  || '',
        depto: abm.depto || def.depto || '',
        cp:    abm.cp    || def.cp    || '',
        loc:   abm.loc   || def.loc   || ''
      };
    }
  } catch(e){}
  return def;
}

// Devuelve la firma del empleador para una empresa.
// Prioridad: (1) firma específica cargada en ABM de la empresa
//            (2) firma del Gerente de RR.HH. (catálogo global)
function getEmpresaFirma(empresa){
  try {
    const abm = _findEmpresaABMByNombre(empresa);
    if(abm?.firmaDataUrl) return abm.firmaDataUrl;
  } catch(e){ /* sigue al fallback */ }
  // Fallback al catálogo global de firmas (data/firmas.js)
  if(typeof getFirmaRRHH === 'function'){
    const f = getFirmaRRHH(empresa);
    if(f && f.imagen) return f.imagen;
  }
  return null;
}

// Devuelve también el nombre + cargo de quien firma (para mostrar bajo la firma)
function getEmpresaFirmaInfo(empresa){
  try {
    const abm = _findEmpresaABMByNombre(empresa);
    if(abm?.firmaDataUrl){
      return {
        imagen: abm.firmaDataUrl,
        nombre: abm.firmaNombre || abm.nombre || '',
        cargo: abm.firmaCargo || 'Empleador'
      };
    }
  } catch(e){}
  if(typeof getFirmaRRHH === 'function'){
    const f = getFirmaRRHH(empresa);
    if(f) return { imagen: f.imagen, nombre: f.nombre, cargo: f.cargo };
  }
  return null;
}

function periodoMM(liq){
  return String(liq.mes).padStart(2,'0')+'/'+liq.anio;
}

// ── Construye filas de conceptos ──────────────────────────────────
function buildConceptRows(item, params){
  const R=[];
  function pH(desc,cod,unid,monto){ if($m(monto)) R.push({desc,cod,unid:unid||'',h:$m(monto),r:0,a:0}); }
  function pR(desc,cod,unid,monto){ if($m(monto)) R.push({desc,cod,unid:unid||'',h:0,r:$m(monto),a:0}); }
  function pA(desc,cod,monto)     { if($m(monto)) R.push({desc,cod,unid:'',h:0,r:0,a:$m(monto)}); }

  // HABERES
  pH('Sueldo',             1,     item.diasTrab,              item.sueldoBasico);
  if($m(item.mCompFuncion) > 0) pH('Complemento Función',1010,'', $m(item.mCompFuncion));
  pH('Antigüedad',         100,   '',                         item.mAntig);
  pH('Horas Extras 50%',   2,     item.hsE50||'',             item.mHsE50);
  pH('Horas Extras 100%',  3,     item.hsE100||'',            item.mHsE100);
  pH('Presentismo',        8000,  '',                         item.tienePres?item.mPres:0);
  pH('SAC Proporcional',   9100,  '',                         $m(item.mSac));
  // Feriados no trabajados (Art. 168 LCT) — un jornal por cada feriado del mes
  // que el empleado no trabajó. UOCRA excluido (régimen propio).
  pH('Feriados no trabajados (Art. 168 LCT)', 6500, item.cantFeriadosNoTrab||'', $m(item.mFeriadosNoTrab));
  // ── Art. 155 LCT: vacaciones y licencias especiales (valor día = sueldo/25) ──
  pH('Vacaciones (Art.155 LCT)',       5800, item.diasVac||'',           $m(item.mVac));
  pH('Lic. Matrimonio (Art.155 LCT)',  5810, item.diasMatrimonio||'',    $m(item.mMatrimonio));
  pH('Lic. Nacimiento Hijo (Art.155 LCT)', 5820, item.diasNacimiento||'', $m(item.mNacimiento));
  pH('Lic. Fallecimiento (Art.155 LCT)',   5830, item.diasFallecimiento||'', $m(item.mFallecimiento));
  pH('Lic. Examen (Art.155 LCT)',      5840, item.diasExamen||'',        $m(item.mExamen));
  pH('Otras licencias (día común)',    5850, item.diasOtrasLic||'',      $m(item.mOtrasLic));
  // Licencias sin goce de haberes (informativas — no generan remuneración)
  if(item.diasSinGoceSG)  R.push({desc:'Lic. Sin Goce de Haberes',       cod:5870, unid:item.diasSinGoceSG, h:0, r:0, a:0});
  if(item.diasMaternidad) R.push({desc:'Lic. Maternidad (sin goce)',     cod:5880, unid:item.diasMaternidad, h:0, r:0, a:0});
  if(item.diasExcedencia) R.push({desc:'Lic. Excedencia (sin goce)',     cod:5890, unid:item.diasExcedencia, h:0, r:0, a:0});
  pH('Ajuste de sueldo',   9500,  '',                         $m(item.mAjuste));
  if(item.ausentismo>0){
    const mAus=-(item.bruto/Math.max(1,item.habiles)*item.ausentismo);
    R.push({desc:'Días no trabajados',cod:10200,unid:item.ausentismo,h:mAus,r:0,a:0});
  }
  // Otros haberes / adicionales de novedades
  (item.otrosH||[]).forEach(function(h){
    if((h.tipo||'H')==='A') pA(h.concepto||'Adicional', h.cod||9900, h.monto);
    else pH(h.concepto||'Otros haberes', h.cod||9900, '', h.monto);
  });

  // ADICIONALES (NO REMUNERATIVOS) — exentos de ganancias y aportes
  // Se pagan al empleado pero NO tributan ni generan aportes.
  // Art. 82 LIG (horas extras exentas), Ley 27.743 (bonos productividad),
  // Art. 180 bis LCT (indemnizaciones), otros conceptos exentos.
  // Art. 103 bis LCT (asignaciones no remunerativas por paritaria).
  // Siguen la convención argentina de codificación (serie 58xxx para no remunerativos,
  // pero usamos códigos específicos para claridad del concepto)
  pA('Horas Extras Exentas (Art.82 LIG)', 58100, $m(item.mHsExtrasExentas));
  pA('Bono Productividad Exento',         58200, $m(item.mBonoExento));
  pA('Indemnización Art.180 bis LCT',     58300, $m(item.mIndemniz));
  pA('Otros conceptos exentos',           58400, $m(item.mOtrosExentos));
  pA('Asignación no remunerativa (Acuerdos paritarios)', 58500, $m(item.mAsigNoRem));
  // SEC: antigüedad y presentismo calculados sobre el no remunerativo
  pA('Antigüedad s/ No Remunerativo (SEC)',  58510, $m(item.mAntigSobreNoRem));
  pA('Presentismo s/ No Remunerativo (SEC)', 58520, $m(item.mPresSobreNoRem));

  // RETENCIONES
  // Línea informativa cuando los aportes fueron topeados por Art. 9 Ley 24.241
  if(item.aportesTopeados && item.baseAportes){
    const fmtN = n => n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const detalle = item.mSac > 0
      ? `Sueldo: $${fmtN(item.baseSueldoAportes)} + SAC: $${fmtN(item.baseSacAportes)} = $${fmtN(item.baseAportes)}`
      : `Base: $${fmtN(item.baseAportes)}`;
    R.push({desc:`Base imp. aportes (Art.9 L.24241 tope $${fmtN(item.topeMaxAportes)})`, cod:19999, unid:'', h:0, r:0, a:0, _info:detalle});
  }
  pR('Jubilación',                         20000, params.pctJubilacion.toFixed(2),   item.jubilacion);
  pR('Ley 19032',                          20100, params.pctPamiEmp.toFixed(2),       item.pamiEmp);
  pR('Obra Social',                        20200, params.pctObraSocial.toFixed(2),    item.obraSocial);
  pR('ANSSAL',                             20400, params.pctAnssal.toFixed(2),        item.anssal);
  // Sindicato: usa el específico del empleado (ya resuelto en cálculo según cod_sindicato).
  // Si el empleado no tiene sindicato, item.sindicato es 0 y la línea se omite por el guard de pR.
  pR(item.nombreSindicato || params.nombreSindicato || 'Sindicato',
     20900,
     (item.pctSindicatoEmp != null ? item.pctSindicatoEmp : params.pctSindicatoEmp).toFixed(2),
     item.sindicato);
  // Ganancias: si es negativo, es una DEVOLUCIÓN del impuesto → va como haber
  if($m(item.ganancias) < 0){
    pH('Devolución Imp. Ganancias',        9300, '',                                 -$m(item.ganancias));
  } else {
    pR('Retención Imp. Ganancias',         90000, '',                                 item.ganancias);
  }
  // Ajuste de la liquidación anual de Ganancias (solo abril) — concepto separado
  if($m(item.ajusteGananciasAnual)){
    if($m(item.ajusteGananciasAnual) < 0) pH('Devolución Liq. Anual Ganancias', 9301, '', -$m(item.ajusteGananciasAnual));
    else pR('Ajuste Liq. Anual Ganancias',  90001, '',  item.ajusteGananciasAnual);
  }
  pR('Descuento anticipo haberes',         10500, '',                                 item.anticiposDesc);
  pR('Embargo judicial',                   10600, '',                                 item.embargo);
  // Suspensión disciplinaria: descuento por días no trabajados por sanción aplicada
  if(item.diasSuspension > 0){
    pR(
      `Descuento por suspensión disciplinaria (${item.diasSuspension} día${item.diasSuspension>1?'s':''})`,
      10700, '', item.mDescSuspension
    );
  }
  (item.otrosD||[]).forEach(function(d){ pR(d.concepto||'Otros descuentos', d.cod||9901, '', d.monto); });

  // ─── Conceptos custom (definidos por RRHH/Admin) ─────────────────────
  // Se ubican según seccionRecibo: haberes, descuentos o exentos.
  // Código de visualización 9000+ para diferenciarlos de los estándar.
  (item.conceptosCustom || []).forEach(function(cc){
    const codigoVis = 9000 + (parseInt(cc.codigo.replace(/\D/g,''),10) || 0) % 999;
    const desc = cc.nombre || cc.codigo;
    if(cc.concepto?.seccionRecibo === 'descuentos' || cc.tipo === 'DESCUENTO' || cc.tipo === 'APORTE'){
      pR(desc, codigoVis, '', cc.monto);
    } else if(cc.concepto?.seccionRecibo === 'exentos' || cc.tipo === 'NO_REM'){
      pA(desc, codigoVis, cc.monto);
    } else {
      // default: haberes (REM y CONTRIBUCION_PATRONAL)
      // Las contribuciones patronales NO van al recibo del empleado pero sí dejamos el código preparado
      if(cc.tipo !== 'CONTRIBUCION_PATRONAL'){
        pH(desc, codigoVis, '', cc.monto);
      }
    }
  });

  // ── Redondeo del recibo a cero centavos (siempre hacia arriba) ──
  // Plug que lleva el neto del recibo exactamente al entero (item.netoAPagar):
  // absorbe la diferencia de centavos entre la sumatoria de conceptos y el neto.
  // Normalmente es un haber positivo (el neto se redondea hacia arriba).
  const _sumPrevioRows = R.reduce((s,r)=>s + $m(r.h) - $m(r.r) + $m(r.a), 0);
  const _redPlug = Math.round(($m(item.netoAPagar) - _sumPrevioRows) * 100) / 100;
  if(_redPlug > 0)      pH('Redondeo', 9999, '', _redPlug);
  else if(_redPlug < 0) pR('Redondeo', 9999, '', -_redPlug);

  return R;
}

// ── HTML de UNA copia del recibo ──────────────────────────────────
function reciboUnaCopiaPag(item, liq, pageRows, params, empDB, tipo, pagActual, totalPags, totGlobH, totGlobR, totGlobA, netoGlob){
  const ed=getEmpresaDatos(item.empresa);
  const logoSrc=getLogoSrc(item.empresa);
  const firmaSrc=getEmpresaFirma(item.empresa);
  const firmaInfo=(typeof getEmpresaFirmaInfo === 'function') ? getEmpresaFirmaInfo(item.empresa) : null;
  const esUltima=(pagActual===totalPags);
  const tipoDesc=({mensual:'HABERES MENSUALES',quincenal:'HABERES QUINCENALES',quincenal_1:'HABERES QUINCENALES (1ª QUINCENA)',quincenal_2:'HABERES QUINCENALES (2ª QUINCENA)',sac1:'SAC 1° SEMESTRE',sac2:'SAC 2° SEMESTRE',
    vacaciones:'VACACIONES',anticipo:'ANTICIPO DE HABERES',final:'LIQUIDACION FINAL',complementaria:'COMPLEMENTARIA'})[liq.tipo]||liq.tipo.toUpperCase();

  // Descripción del pago legible (ej: "MARZO 2026")
  const MESES_ES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const descPagoLegible = liq.tipo==='mensual' ? `${MESES_ES[liq.mes-1]} ${liq.anio}` : tipoDesc + ` ${liq.anio}`;

  const fN=function(n){
    if(!n&&n!==0)return'';
    const abs=Math.abs(n);
    const s=abs.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
    return n<0?'-'+s:s;
  };
  const td=function(v,opts){
    opts=opts||{};
    return '<td style="padding:2px 5px;font-size:8px;border:1px solid #999;color:#000;'
      +'text-align:'+(opts.a||'left')+';'
      +'font-weight:'+(opts.b?'bold':'normal')+';'
      +'font-family:'+(opts.m?'Courier New,monospace':'Arial,sans-serif')+';'
      +'white-space:nowrap;border-collapse:collapse">'+v+'</td>';
  };
  // ── DECRETO 407/2026 · Costos del empleador y composición salarial ──
  const baseRem = $m(item.totalHaberesRem || item.totalHaberes);
  // Contribuciones a cargo del EMPLEADOR
  const cJub  = $m(item.jubPatronal);
  const cFne  = $m(item.desempleo);
  const cOS   = $m(item.osPatronal);
  const cPami = $m(item.pamiPatronal);
  const cArt  = $m(item.art);
  const cSind = $m(item.sindPatronal);
  const cScvo = $m(item.scvo);                                   // Seguro Colectivo de Vida Obligatorio (si se carga)
  const cCCT  = $m(item.totalContribUOCRA) + $m(item.ccTotalContribPat);
  const subTotalContrib = $m(item.totalContrib);
  // Aportes a cargo del TRABAJADOR (ya descontados del bruto)
  const aJub  = $m(item.jubilacion);
  const aOS   = $m(item.obraSocial) + $m(item.anssal);
  const aPami = $m(item.pamiEmp);
  const aSind = $m(item.sindicato);
  // Totales por concepto (empleador + trabajador) — Detalle Decreto 407
  const segSegSoc   = cJub + cFne + aJub;       // Seg. Social: SIPA + FNE + Asig.Fam. (emp) + jubilación (trab)
  const segObraSoc  = cOS + aOS;
  const segInssjp   = cPami + aPami;            // INSSJP / PAMI (Ley 19.032)
  const segSindical = cSind + aSind;
  const segArt      = cArt;
  const segScvo     = cScvo;
  const costoTotal  = $m(item.totalCosto) || ($m(item.totalHaberes) + subTotalContrib);
  const otrosTrab   = $m(item.ganancias) + $m(item.embargo) + $m(item.anticiposDesc) + $m(item.mOtrosD) + $m(item.mDescSuspension) + $m(item.ajusteGananciasAnual);
  const segOtros    = cCCT + (otrosTrab > 0 ? otrosTrab : 0);
  const segNeto     = $m(netoGlob);
  // Composición salarial
  const compRemun = $m(item.totalHaberesRem);
  const compNoRem = $m(item.totalExentos);
  const compDesc  = $m(item.totalDescuentos);
  const pctTxt = p => ($m(p)).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
  // Detalle empleador/trabajador (bloque compacto)
  const detRow = (label, emp, trab) => `
    <tr><td colspan="2" style="border:1px solid #ccc;padding:1.5px 4px;font-weight:bold;background:#f7f7f7">${label}: <span style="font-family:Courier New,monospace">$ ${fN(emp+trab)}</span></td></tr>
    <tr><td style="border:1px solid #ccc;padding:1px 4px 1px 12px;width:56%">Empleador</td><td style="border:1px solid #ccc;padding:1px 4px;text-align:right;font-family:Courier New,monospace">$ ${fN(emp)}</td></tr>
    <tr><td style="border:1px solid #ccc;padding:1px 4px 1px 12px">Trabajador</td><td style="border:1px solid #ccc;padding:1px 4px;text-align:right;font-family:Courier New,monospace">$ ${fN(trab)}</td></tr>`;
  // Gráfico de torta del costo total empleador (SVG con segmentos)
  const pieSegs = [
    ['Sueldo Neto', segNeto, '#2563eb'],
    ['Seguridad Social', segSegSoc, '#dc2626'],
    ['Costo Sindical', segSindical, '#16a34a'],
    ['Obra Social', segObraSoc, '#9333ea'],
    ['INSSJP (PAMI)', segInssjp, '#ea580c'],
    ['ART', segArt, '#0891b2'],
  ];
  if(segScvo>0.005)  pieSegs.push(['SCVO', segScvo, '#65a30d']);
  if(segOtros>0.005) pieSegs.push(['Otros', segOtros, '#6b7280']);
  const pieTotal = pieSegs.reduce((s,x)=>s+$m(x[1]),0) || 1;
  let _angPie=-Math.PI/2; const _cxP=52,_cyP=52,_rP=48;
  const _ptP=a=>`${(_cxP+_rP*Math.cos(a)).toFixed(2)} ${(_cyP+_rP*Math.sin(a)).toFixed(2)}`;
  const pieSvg = `<svg width="104" height="104" viewBox="0 0 104 104">${
    pieSegs.map(function(seg){
      const val=$m(seg[1]); const frac=val/pieTotal; if(frac<=0) return '';
      const a2=_angPie+frac*2*Math.PI; const large=(a2-_angPie)>Math.PI?1:0;
      const d = frac>=0.9999
        ? `M ${_cxP} ${(_cyP-_rP)} A ${_rP} ${_rP} 0 1 1 ${(_cxP-0.01).toFixed(2)} ${(_cyP-_rP)} Z`
        : `M ${_cxP} ${_cyP} L ${_ptP(_angPie)} A ${_rP} ${_rP} 0 ${large} 1 ${_ptP(a2)} Z`;
      _angPie=a2; return `<path d="${d}" fill="${seg[2]}" stroke="#fff" stroke-width="0.7"/>`;
    }).join('')
  }</svg>`;
  const pieLegend = pieSegs.map(function(seg){
    const pct=(($m(seg[1])/pieTotal)*100).toFixed(1);
    return `<div style="display:flex;align-items:center;gap:3px;margin-bottom:1px"><span style="display:inline-block;width:7px;height:7px;background:${seg[2]};flex:none"></span><span>${seg[0]} — ${pct}%</span></div>`;
  }).join('');

  const MIN_ROWS=18;
  const rowsHtml=pageRows.map(function(r){
    return '<tr>'+td(r.desc)+td(r.cod,{a:'center'})+td(r.unid,{a:'center'})
      +td(r.h?fN(r.h):'',{a:'right',m:true})
      +td(r.r?fN(r.r):'',{a:'right',m:true})
      +td(r.a?fN(r.a):'',{a:'right',m:true})+'</tr>';
  }).join('');
  const padRows=Array(Math.max(0,MIN_ROWS-pageRows.length)).fill(
    '<tr><td colspan="6" style="height:14px;border-left:1px solid #999;border-right:1px solid #999;border-bottom:1px solid #eee"></td></tr>').join('');

  const netoMostrar=esUltima?netoGlob:0;
  const totHMostrar=esUltima?totGlobH:0;
  const totRMostrar=esUltima?totGlobR:0;
  const totAMostrar=esUltima?totGlobA:0;

  const thS='padding:3px 5px;font-size:8px;border:1px solid #999;background:#f5f5f5;font-weight:bold;text-align:';

  return `<div style="border:1.5px solid #333;padding:6px 8px;font-family:Arial,sans-serif;font-size:8px;width:100%;box-sizing:border-box;background:#fff;color:#000">

  <!-- HEADER: "Recibo de Haberes" con Página X de Y y marca ORIGINAL/DUPLICADO -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;padding-bottom:2px;border-bottom:1px solid #333;color:#000">
    <div style="flex:1"></div>
    <div style="font-size:12px;font-weight:bold;text-align:center;flex:1;color:#000">Recibo de Haberes</div>
    <div style="flex:1;text-align:right;font-size:8px;color:#555">Página ${pagActual} de ${totalPags}</div>
  </div>

  <!-- Marca ORIGINAL / DUPLICADO discreta -->
  <div style="text-align:right;font-size:8px;font-weight:bold;letter-spacing:2px;color:#666;margin-bottom:2px">${tipo}</div>

  <!-- CABECERA EMPRESA -->
  <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:3px">
    ${logoSrc?`<div style="min-width:70px"><img src="${logoSrc}" style="max-width:68px;max-height:36px"></div>`:''}
    <div style="flex:1;border:1px solid #999;padding:4px 6px">
      <div style="font-size:11px;font-weight:bold;margin-bottom:2px">${item.empresa}</div>
      <div style="font-size:8px;display:grid;grid-template-columns:auto 1fr auto 1fr auto 1fr auto 1fr;gap:4px 8px;align-items:baseline">
        <span>Dirección :</span><span style="border-bottom:1px dotted #ccc">${ed.dir||''}</span>
        <span>Nro.:</span><span style="border-bottom:1px dotted #ccc">${ed.nro||''}</span>
        <span>Piso:</span><span style="border-bottom:1px dotted #ccc">${ed.piso||''}</span>
        <span>Depto.:</span><span style="border-bottom:1px dotted #ccc">${ed.depto||''}</span>
      </div>
      <div style="font-size:8px;margin-top:2px">${ed.loc||''} &nbsp;&nbsp; <b>C.P.:</b> ${ed.cp||''}</div>
      <div style="font-size:8px;margin-top:1px"><b>C.U.I.T.</b> : ${ed.cuit||''}</div>
    </div>
  </div>

  <!-- PERÍODO / DESCRIPCIÓN / FECHA / LUGAR -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
    <tr style="background:#f5f5f5">
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:16%;font-weight:bold">Período abonado</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:30%;font-weight:bold">Descripción del pago</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:18%;font-weight:bold">Fecha de pago</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;font-weight:bold">Lugar de pago</td>
    </tr>
    <tr>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px;font-family:Courier New,monospace">${periodoMM(liq)}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px">${descPagoLegible}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px;font-family:Courier New,monospace">${liq.fechaPago||''}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px">${item.lugar||''}</td>
    </tr>
  </table>

  <!-- LEGAJO / NOMBRE / CUIL -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
    <tr style="background:#f5f5f5">
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:11%;font-weight:bold">Legajo</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;font-weight:bold">Apellido y nombre del empleado</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:22%;font-weight:bold;text-align:center">C.U.I.L.</td>
    </tr>
    <tr>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px;font-family:Courier New,monospace">${item.leg}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:9px;font-weight:bold">${item.nom}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px;font-family:Courier New,monospace;text-align:center">${item.cuil||''}</td>
    </tr>
  </table>

  <!-- SUELDO / CATEGORÍA / INGRESO -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
    <tr>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:34%"><b>Sueldo / Jornal &nbsp;:</b> &nbsp;<span style="font-family:Courier New,monospace">${fN(item.bruto)}</span></td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:36%"><b>Categoría :</b> &nbsp;${empDB?empDB.cat||'':''} ${empDB?(empDB.desc_categoria||empDB.tarea||''):''}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px"><b>Ingreso :</b> &nbsp;${empDB?empDB.ing||'':''}</td>
    </tr>
  </table>

  <!-- DEPÓSITO PREVISIONAL / BANCO / PERÍODO / FECHA -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
    <tr>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:22%"><b>Depósito Previsional:</b></td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:32%"><b>Banco</b> ${params.bancoEmpresa||''}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px;width:22%"><b>Período:</b> ${periodoMM(liq)}</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8px"><b>Fecha:</b> ${liq.fechaPago||''}</td>
    </tr>
  </table>

  ${pagActual===1 ? `
  <!-- DECRETO 407/2026 · COSTO TOTAL EMPLEADOR (expuesto antes del bruto y neto) -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0;border-top:2px solid #333">
    <tr style="background:#e8e8e8">
      <td colspan="3" style="border:1px solid #999;padding:4px 6px;font-size:9.5px;font-weight:bold">COSTO TOTAL EMPLEADOR</td>
      <td style="border:1px solid #999;padding:4px 6px;font-size:10px;font-weight:bold;text-align:right;font-family:Courier New,monospace">$ ${esUltima?fN(costoTotal):''}</td>
    </tr>
    <tr style="background:#f5f5f5">
      <td style="border:1px solid #999;padding:2px 5px;font-size:8px;font-weight:bold;width:48%">Concepto</td>
      <td style="border:1px solid #999;padding:2px 5px;font-size:8px;font-weight:bold;text-align:center;width:12%">Unidad</td>
      <td style="border:1px solid #999;padding:2px 5px;font-size:8px;font-weight:bold;text-align:right;width:20%">Base</td>
      <td style="border:1px solid #999;padding:2px 5px;font-size:8px;font-weight:bold;text-align:right">Monto</td>
    </tr>
    ${(function(){
      const pctArtEff = baseRem>0 ? (cArt/baseRem*100) : $m(params.pctArt);
      const filas = [
        ['Contribución Jubilatoria SIPA (Ley 24.241)', pctTxt(params.pctJubPatronal), baseRem, cJub, true],
        ['Fondo Nacional de Empleo (Ley 24.013)', pctTxt(params.pctDesempleo), baseRem, cFne, true],
        ['Contribución Obra Social', pctTxt(params.pctOsPatronal), baseRem, cOS, true],
        ['Contribución INSSJP / PAMI (Ley 19.032)', pctTxt(params.pctPamiPatronal), baseRem, cPami, true],
        ['A.R.T. (Ley 24.557)', pctTxt(pctArtEff), baseRem, cArt, true],
        ['Contribución Sindical Patronal', pctTxt(params.pctSindicatoPatronal), baseRem, cSind, true],
        ['Seguro Colectivo de Vida Obligatorio (Dto. 1567/74)', 'fijo', '', cScvo, cScvo>0],
        ['Costo derivado del CCT / convencional', '', '', cCCT, cCCT>0],
      ];
      return filas.filter(f=>f[4]).map(([c,u,b,m])=>`<tr>
        <td style="border:1px solid #999;padding:2px 5px;font-size:8px">${c}</td>
        <td style="border:1px solid #999;padding:2px 5px;font-size:8px;text-align:center;font-family:Courier New,monospace">${u}</td>
        <td style="border:1px solid #999;padding:2px 5px;font-size:8px;text-align:right;font-family:Courier New,monospace">${b!==''?fN(b):''}</td>
        <td style="border:1px solid #999;padding:2px 5px;font-size:8px;text-align:right;font-family:Courier New,monospace">${fN(m)}</td>
      </tr>`).join('');
    })()}
    <tr style="background:#f0f0f0">
      <td colspan="3" style="border:1px solid #999;padding:3px 5px;font-size:8.5px;font-weight:bold;text-align:right">SUB TOTAL CONTRIBUCIONES EMPLEADOR</td>
      <td style="border:1px solid #999;padding:3px 5px;font-size:8.5px;font-weight:bold;text-align:right;font-family:Courier New,monospace">$ ${fN(subTotalContrib)}</td>
    </tr>
  </table>
  <div style="font-size:6.5px;color:#777;margin:2px 0 4px;font-style:italic;line-height:1.3">Costo laboral total a cargo del empleador, expuesto conforme al Decreto 407/2026 (reglamentación del art. 140 LCT). La Seguridad Social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones Familiares.</div>

  <!-- SUELDO BRUTO -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0">
    <tr style="background:#e8e8e8">
      <td style="border:1px solid #999;padding:4px 6px;font-size:9.5px;font-weight:bold">SUELDO BRUTO</td>
      <td style="border:1px solid #999;padding:4px 6px;font-size:10px;font-weight:bold;text-align:right;font-family:Courier New,monospace;width:28%">$ ${esUltima?fN(totGlobH+totGlobA):''}</td>
    </tr>
  </table>
  ` : ''}

  <!-- TABLA DE CONCEPTOS -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0">
    <thead>
      <tr>
        <th style="${thS}left;width:42%">Descripción</th>
        <th style="${thS}center;width:8%">Cód.</th>
        <th style="${thS}center;width:8%">Unid.</th>
        <th style="${thS}right;width:14%">Haberes</th>
        <th style="${thS}right;width:14%">Retenciones</th>
        <th style="${thS}right;width:14%">Adicionales</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      ${padRows}
    </tbody>
  </table>

  <!-- NETO Y TOTALES (solo última página) -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:3px;border-top:2px solid #333">
    <tr>
      <td style="padding:4px 6px;font-size:10px;font-weight:bold;border:1px solid #333;background:#f8f8f8;width:50%">
        Neto &nbsp;&nbsp;:&nbsp;&nbsp; <span style="font-family:Courier New,monospace;font-size:11px">${fN(netoMostrar)}</span>
      </td>
      <td style="padding:4px 6px;font-size:9px;text-align:right;font-family:Courier New,monospace;border:1px solid #333;font-weight:bold;width:14%;background:#f8f8f8">${fN(totHMostrar)}</td>
      <td style="padding:4px 6px;font-size:9px;text-align:right;font-family:Courier New,monospace;border:1px solid #333;font-weight:bold;width:14%;background:#f8f8f8">${fN(totRMostrar)}</td>
      <td style="padding:4px 6px;font-size:9px;text-align:right;font-family:Courier New,monospace;border:1px solid #333;font-weight:bold;width:14%;background:#f8f8f8">${fN(totAMostrar)}</td>
    </tr>
  </table>

  ${esUltima ? `
  <!-- DECRETO 407/2026 · COMPOSICIÓN SALARIAL + SUELDO NETO -->
  <table style="width:100%;border-collapse:collapse;margin:5px 0 0">
    <tr style="background:#f5f5f5">
      <td style="border:1px solid #999;padding:3px 6px;font-size:8px;font-weight:bold;width:24%">COMPOSICIÓN SALARIAL</td>
      <td style="border:1px solid #999;padding:3px 6px;font-size:8px;text-align:center">Remunerativo: <b style="font-family:Courier New,monospace">$ ${fN(compRemun)}</b></td>
      <td style="border:1px solid #999;padding:3px 6px;font-size:8px;text-align:center">No Remunerativo: <b style="font-family:Courier New,monospace">$ ${fN(compNoRem)}</b></td>
      <td style="border:1px solid #999;padding:3px 6px;font-size:8px;text-align:center">Descuentos: <b style="font-family:Courier New,monospace">$ ${fN(compDesc)}</b></td>
    </tr>
    <tr style="background:#e8e8e8">
      <td colspan="3" style="border:1px solid #999;padding:4px 6px;font-size:10px;font-weight:bold">SUELDO NETO</td>
      <td style="border:1px solid #999;padding:4px 6px;font-size:11px;font-weight:bold;text-align:right;font-family:Courier New,monospace">$ ${fN(segNeto)}</td>
    </tr>
  </table>

  <!-- DETALLE DE LA COMPOSICIÓN SALARIAL + GRÁFICO DE TORTA -->
  <div style="border:1px solid #999;margin:4px 0;padding:5px 7px">
    <div style="font-size:8.5px;font-weight:bold;text-align:center;margin-bottom:4px;text-decoration:underline">Detalle de la composición salarial</div>
    <div style="display:flex;gap:12px;align-items:flex-start">
      <table style="border-collapse:collapse;font-size:7.5px;width:60%">
        ${detRow('Total Costo Sindical', cSind, aSind)}
        ${detRow('Total Seguridad Social', cJub+cFne, aJub)}
        ${detRow('Total Obra Social', cOS, aOS)}
        ${detRow('Total costo INSSJP (PAMI)', cPami, aPami)}
        ${detRow('Total costo ART', cArt, 0)}
        ${detRow('Total Costo SCVO', cScvo, 0)}
      </table>
      <div style="width:40%;text-align:center">
        <div style="font-size:8px;font-weight:bold;margin-bottom:3px">Costo total empleador</div>
        ${pieSvg}
        <div style="font-size:6.5px;text-align:left;margin-top:4px">${pieLegend}</div>
      </div>
    </div>
    <div style="font-size:6.5px;color:#777;margin-top:4px;font-style:italic;line-height:1.3">Nota: la Seguridad Social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones Familiares. Las contribuciones patronales (Leyes 24.241, 24.013, 24.557, 19.032 y modif.) son a cargo exclusivo del empleador y no afectan el neto a cobrar. Cuadro expuesto conforme al Decreto 407/2026 (art. 140 LCT).</div>
  </div>
  ` : ''}

  <!-- LEYENDA RECIBÍ -->
  <div style="font-size:8px;margin-bottom:2px;padding:2px 0">
    <b>Recibí conforme la suma de pesos:</b>
    <span style="text-transform:uppercase;font-weight:${esUltima?'bold':'normal'}">${esUltima?numerosALetras(Math.round(Math.max(0,netoGlob))):''}</span>
  </div>
  <div style="font-size:8px;margin-bottom:8px;border-bottom:1px dotted #999;padding-bottom:2px">Depositados en &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /</div>

  <!-- TEXTO LEGAL -->
  <div style="font-size:7px;line-height:1.4;margin-bottom:8px;color:#555">
    En concepto de haberes correspondientes al período arriba indicado y según la presente liquidación,
    dejando constancia de haber recibido un duplicado de este recibo.
    Incluido aumento de futuros convenios, leyes y/o resoluciones.
  </div>

  <!-- FIRMAS -->
  <div style="display:flex;gap:20px;margin-top:12px">
    <div style="flex:1;text-align:center">
      <div style="height:40px;border-bottom:1px solid #333"></div>
      <div style="padding-top:3px;font-size:8px">Firma del Empleado</div>
    </div>
    <div style="flex:1;text-align:center;position:relative">
      <div style="height:40px;border-bottom:1px solid #333;display:flex;align-items:flex-end;justify-content:center;overflow:hidden">
        ${firmaSrc ? `<img src="${firmaSrc}" style="max-height:38px;max-width:80%;object-fit:contain;margin-bottom:-2px" alt="Firma">` : ''}
      </div>
      <div style="padding-top:3px;font-size:8px">
        ${firmaInfo && firmaInfo.nombre ? `<div style="font-weight:600">${firmaInfo.nombre}</div><div style="font-size:7px;color:#666">${firmaInfo.cargo || 'Empleador'}</div>` : `Firma del Empleador${firmaSrc?'':' <span style="font-size:7px;color:#bbb">(sin firma cargada)</span>'}`}
      </div>
    </div>
  </div>
</div>`;
}

// ── imprimirRecibo ────────────────────────────────────────────────
async function imprimirRecibo(leg){
  let liq=_liqActiva;
  if(!liq){
    toast('⚠ No hay liquidación activa. Abrí una desde la lista de Períodos.','var(--yellow)');
    return;
  }
  // Auto-recálculo si items vacíos. Antes restringíamos a borrador, pero una
  // liquidación aprobada también puede tener items vacíos si se guardó mal
  // en IDB o se rehidrató desde un backup. Permitimos recalcular en cualquier
  // estado, pero con confirmación si NO es borrador.
  if(!liq.items || !liq.items.length){
    if(liq.estado !== 'borrador'){
      const ok = await showConfirm({
        titulo: `Liquidación ${liq.estado.toUpperCase()} — items vacíos`,
        mensaje: `⚠ Esta liquidación está en estado <b>${liq.estado.toUpperCase()}</b> pero los items están vacíos.<br><br>
                  Esto puede pasar si los datos se corrompieron al guardar.<br><br>
                  ¿Querés intentar recalcular los items para imprimir el recibo?<br><br>
                  <span style="color:var(--yellow)">Nota: el recálculo usa la nómina y novedades actuales. Si la liquidación ya está aprobada/pagada, los valores recalculados pueden no coincidir exactamente con lo que se aprobó originalmente.</span>`,
        labelOk: 'Recalcular e imprimir',
        peligroso: false,
      });
      if(!ok) return;
    } else {
      toast('⏳ Calculando liquidación antes de imprimir…','var(--accent2)');
    }
    try {
      if(typeof calcularYRenderPreview === 'function'){
        await calcularYRenderPreview();
      }
    } catch(e){
      console.error('[imprimirRecibo] Error en recálculo:', e);
      toast('⚠ Error al recalcular: ' + (e?.message || 'desconocido'),'var(--red)', 5000);
      return;
    }
    liq = _liqActiva;
    if(!liq?.items?.length){
      toast('⚠ Recálculo no produjo items. Verificá que haya empleados activos en la nómina de esta empresa.','var(--red)', 5500);
      return;
    }
  }
  const item=liq.items.find(function(x){return x.leg===leg;});
  if(!item){
    toast(`⚠ El empleado ${leg} no figura en esta liquidación. Recalculá desde Preview.`,'var(--red)', 4500);
    return;
  }

  // ─── Construir filas con try/catch detallado ───────────────────────
  const params=getLiqParams();
  const empDB=getNomina().find(function(e){return e.leg===leg;})||{};
  let rows;
  try {
    rows=buildConceptRows(item,params);
  } catch(e){
    console.error('[imprimirRecibo] Error en buildConceptRows:', e, 'item:', item);
    toast('⚠ Error armando conceptos: ' + (e?.message || 'desconocido'),'var(--red)', 5500);
    return;
  }

  if(!rows || !rows.length){
    // Fallback: si el item existe pero buildConceptRows no devolvió nada,
    // logueamos el item completo para diagnóstico y mostramos un mensaje útil.
    console.warn('[imprimirRecibo] buildConceptRows devolvió 0 filas para item:', item);
    const tieneBruto = $m(item.sueldoBasico) > 0 || $m(item.bruto) > 0 || $m(empDB.bruto) > 0;
    if(!tieneBruto){
      toast(`⚠ ${item.nom} no tiene sueldo bruto cargado en la nómina. No se puede generar el recibo.`,'var(--red)', 5500);
    } else {
      toast(`⚠ No se encontraron conceptos para ${item.nom}. Probá recalcular desde Preview.`,'var(--red)', 5500);
    }
    return;
  }

  const totH=rows.reduce(function(s,r){return s+r.h;},0);
  const totR=rows.reduce(function(s,r){return s+r.r;},0);
  const totA=rows.reduce(function(s,r){return s+r.a;},0);
  const neto=totH-totR+totA;

  // Paginar (22 filas por página — matchea el formato del recibo estándar argentino)
  const PAGE_SIZE=22;
  const totalPags=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  let pagesHtml='';
  try {
    for(let p=0;p<totalPags;p++){
      const pageRows=rows.slice(p*PAGE_SIZE,(p+1)*PAGE_SIZE);
      const pagActual=p+1;
      const esLast=pagActual===totalPags;
      const orig=reciboUnaCopiaPag(item,liq,pageRows,params,empDB,'ORIGINAL',pagActual,totalPags,totH,totR,totA,neto);
      const dupl=reciboUnaCopiaPag(item,liq,pageRows,params,empDB,'DUPLICADO',pagActual,totalPags,totH,totR,totA,neto);
      pagesHtml+=`<div style="page-break-after:${esLast?'avoid':'always'}">
        <div style="display:flex;gap:8px">
          <div style="flex:1">${orig}</div>
          <div style="flex:1">${dupl}</div>
        </div>
      </div>`;
    }
  } catch(e){
    console.error('[imprimirRecibo] Error armando HTML del recibo:', e, 'item:', item);
    toast('⚠ Error armando el recibo: ' + (e?.message || 'desconocido'),'var(--red)', 5500);
    return;
  }

  if(!pagesHtml || !pagesHtml.trim()){
    console.warn('[imprimirRecibo] pagesHtml quedó vacío. rows:', rows, 'item:', item);
    toast('⚠ El recibo quedó vacío después del armado. Revisá la consola del navegador (F12).','var(--red)', 5500);
    return;
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Recibo ${leg} ${periodoMM(liq)}</title>
  <style>
    @page{size:A4 landscape;margin:8mm}
    /* Reset y forzar contraste explícito — antes algunos navegadores
       heredaban el color del documento padre (modo oscuro de la app)
       y los recibos salían casi invisibles. */
    html, body { color: #000 !important; background: #fff !important; }
    body{margin:0;padding:8px;font-family:Arial,sans-serif;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    /* Forzar color negro en todas las celdas y bloques del recibo aunque
       el inline-style no lo haya declarado. Los inline-style que SÍ tienen
       color explícito (ej. #555 o #666) prevalecen por especificidad de
       'style' attr vs CSS regular. */
    table, td, th, div, span, p, b, strong { color: inherit }
    .no-print{margin-bottom:10px}
    @media print{
      .no-print{display:none}
      /* Forzar colores en impresión también */
      body { color: #000 !important; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
    }
  </style></head><body>
  <div class="no-print">
    <button onclick="window.print()" style="padding:7px 16px;background:#1E6B3A;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;margin-right:8px">
      🖨 Imprimir / Guardar PDF
    </button>
    <span style="font-size:11px;color:#555">${item.nom} — ${meses[liq.mes-1]} ${liq.anio}</span>
  </div>
  ${pagesHtml}
  </body></html>`;

  const w=window.open('','_blank');
  if(!w){
    toast('⚠ El navegador bloqueó la ventana de impresión. Permitir popups para este sitio.','var(--red)', 4500);
    return;
  }
  w.document.write(html); w.document.close();
}

async function imprimirTodosRecibos(){
  let liq=_liqActiva;
  if(!liq){
    toast('⚠ No hay liquidación activa','var(--yellow)');
    return;
  }
  // Auto-recálculo si items vacíos
  if(!liq.items?.length){
    toast('⏳ Calculando liquidación antes de imprimir…','var(--accent2)');
    try {
      if(typeof calcularYRenderPreview === 'function') await calcularYRenderPreview();
    } catch(e){ console.error('Error recalculando:', e); }
    liq = _liqActiva;
    if(!liq?.items?.length){
      toast('⚠ No se pudieron generar los items. Andá al tab Preview y recalculá manualmente.','var(--red)', 4500);
      return;
    }
  }
  // Imprime uno por uno (cada uno abre su propia ventana)
  for(const i of liq.items){
    await imprimirRecibo(i.leg);
  }
}

// ── Exportar Excel (planilla liquidación) ──────────────────────────
async function exportarExcelLiquidacion(){
  const liq=_liqActiva; if(!liq?.items?.length){ toast('⚠ Calculá primero la liquidación','var(--yellow)'); return; }
  const cols=['Legajo','Apellido y Nombre','CUIL','Empresa','Área','Días Trab.','Sueldo Base','Comp. Función',
    'HE 50%','HE 100%','Antigüedad','Presentismo','SAC','Vacaciones','Lic. Especiales','Ajuste','Otros Haberes Man.',
    'Subtotal Remun.','HE Exentas','Bono Exento','Indemnizaciones','Otros Exentos','TOTAL HABERES',
    'Jubilación','Obra Social','ANSSAL','PAMI emp.','Sindicato','Ganancias','Anticipos','Embargo judicial','Otros Desc.',
    'TOTAL DESCUENTOS','NETO A PAGAR','Contrib. Patr.','COSTO TOTAL'];
  const esc=v=>{ const s=String(v??''); return s.includes(';')||s.includes('"')?`"${s.replace(/"/g,'""')}"`:`${s}`; };
  const rows=liq.items.map(i=>[
    i.leg,i.nom,i.cuil||'',i.empresa,i.lugar||'',i.diasTrab,
    i.sueldoBasico.toFixed(2),Math.max(0,$m(i.mCompFuncion)).toFixed(2),i.mHsE50.toFixed(2),i.mHsE100.toFixed(2),
    i.mAntig.toFixed(2),i.mPres.toFixed(2),$m(i.mSac).toFixed(2),$m(i.mVac).toFixed(2),
    $m(i.mLicEspeciales).toFixed(2),$m(i.mAjuste).toFixed(2),$m(i.mOtrosH).toFixed(2),
    $m(i.totalHaberesRem || i.totalHaberes).toFixed(2),
    $m(i.mHsExtrasExentas).toFixed(2),$m(i.mBonoExento).toFixed(2),$m(i.mIndemniz).toFixed(2),$m(i.mOtrosExentos).toFixed(2),
    i.totalHaberes.toFixed(2),
    i.jubilacion.toFixed(2),i.obraSocial.toFixed(2),i.anssal.toFixed(2),
    i.pamiEmp.toFixed(2),i.sindicato.toFixed(2),i.ganancias.toFixed(2),
    i.anticiposDesc.toFixed(2),i.embargo.toFixed(2),i.mOtrosD.toFixed(2),
    i.totalDescuentos.toFixed(2),i.netoAPagar.toFixed(2),
    i.totalContrib.toFixed(2),i.totalCosto.toFixed(2)
  ]);
  const csv=[cols,...rows].map(r=>r.map(esc).join(';')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`liquidacion_${liq.periodo}_${(liq.empresa||'todas').replace(/\s/g,'_')}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('✓ Excel exportado','var(--green)');
}

// ── Reportes ────────────────────────────────────────────────────────
function liqReporteContext(){ const liq=_liqActiva; if(!liq?.items?.length){ toast('⚠ Aprobá primero la liquidación','var(--yellow)'); return null; } return liq; }

// La función exportarLibroLey vive en js/38-libro-sueldos.js (Excel + LSD).
function exportarLibroLeyStub(){
  if(typeof exportarLibroArt52Excel === 'function') return exportarLibroArt52Excel();
  toast('⚠ Módulo Libro de Sueldos no disponible','var(--red)');
}

// La función exportarF931 vive en js/34-f931.js (modal completo + Excel + TXT SICOSS).
// Si por alguna razón ese módulo no se cargó, mostramos un toast en lugar de fallar.
function exportarF931Stub(){
  if(typeof abrirModalF931 === 'function'){
    abrirModalF931();
  } else {
    toast('⚠ Módulo F.931 no disponible (js/34-f931.js)','var(--red)');
  }
}

// La función real vive en js/29-export-bancos.js (planilla Galicia con modal de opciones).
// Si por alguna razón ese módulo no se cargó, mostramos un toast en lugar de fallar.
function exportarArchivoBanco(){
  if(typeof abrirModalPlanillaGalicia === 'function'){
    return abrirModalPlanillaGalicia();
  }
  toast('⚠ Módulo de exportación bancaria no disponible','var(--red)');
}

// La función real vive en js/37-ddjj-sindical.js (Excel multi-hoja por sindicato).
function exportarSindicatosStub(){
  if(typeof exportarDDJJSindicalExcel === 'function') return exportarDDJJSindicalExcel();
  toast('⚠ Módulo DDJJ Sindical no disponible','var(--red)');
}

async function exportarResumenEmpresa(){
  const liq=liqReporteContext(); if(!liq) return;
  const porEmp={};
  liq.items.forEach(i=>{
    if(!porEmp[i.empresa]) porEmp[i.empresa]={empresa:i.empresa,cant:0,haberes:0,descuentos:0,neto:0,contrib:0,costo:0};
    const g=porEmp[i.empresa];
    g.cant++; g.haberes+=$m(i.totalHaberes); g.descuentos+=$m(i.totalDescuentos);
    g.neto+=$m(i.netoAPagar); g.contrib+=$m(i.totalContrib); g.costo+=$m(i.totalCosto);
  });
  const cols=['Empresa','Empleados','Total Haberes','Total Descuentos','Total Neto','Contrib. Patr.','Costo Total'];
  const rows=Object.values(porEmp).map(g=>[g.empresa,g.cant,g.haberes.toFixed(2),g.descuentos.toFixed(2),g.neto.toFixed(2),g.contrib.toFixed(2),g.costo.toFixed(2)]);
  const csv=[cols,...rows].map(r=>r.map(v=>String(v)).join(';')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`resumen_empresas_${liq.periodo}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('✓ Resumen por empresa exportado','var(--green)');
}

// La función exportarAsientoContable vive en js/39-asiento-contable.js
// (modal con vista previa + Excel multi-hoja + CSV importable a sistemas contables).
function exportarAsientoContableStub(){
  if(typeof abrirModalAsientoContable === 'function') return abrirModalAsientoContable();
  toast('⚠ Módulo Asiento Contable no disponible','var(--red)');
}

async function exportarAcumulado(){
  const lista=await getLiquidaciones();
  const aprobadas=lista.filter(l=>l.estado==='aprobada'&&l.items?.length);
  if(!aprobadas.length){ toast('⚠ No hay liquidaciones aprobadas','var(--yellow)'); return; }
  const acum={};
  aprobadas.forEach(liq=>{
    liq.items.forEach(i=>{
      if(!acum[i.leg]) acum[i.leg]={leg:i.leg,nom:i.nom,emp:i.empresa,periodos:0,haberes:0,descuentos:0,neto:0};
      acum[i.leg].periodos++; acum[i.leg].haberes+=$m(i.totalHaberes); acum[i.leg].descuentos+=$m(i.totalDescuentos); acum[i.leg].neto+=$m(i.netoAPagar);
    });
  });
  const cols=['Legajo','Apellido y Nombre','Empresa','Períodos Liquidados','Total Haberes Año','Total Descuentos','Total Neto Percibido'];
  const rows=Object.values(acum).sort((a,b)=>a.nom.localeCompare(b.nom)).map(r=>[r.leg,r.nom,r.emp,r.periodos,r.haberes.toFixed(2),r.descuentos.toFixed(2),r.neto.toFixed(2)]);
  const csv=[cols,...rows].map(r=>r.map(v=>String(v)).join(';')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`acumulado_anual.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('✓ Acumulado anual exportado','var(--green)');
}


// ═══════════════════════════════════════════════════════════════════════════
// TABLA DE TOPES REMUNERATORIOS MENSUALES — ANSES/ARCA
// Gestión desde el panel de Parámetros (tab ⚙ Parámetros > Topes)
// ═══════════════════════════════════════════════════════════════════════════

// Renderiza la tabla de topes en el panel de parámetros
async function renderLiqTopesTabla(){
  const div = document.getElementById('liq-topes-tabla');
  if(!div) return;

  const todos  = getAportesTopesPorMes();
  const claves = Object.keys(todos).sort().reverse(); // más reciente primero

  if(!claves.length){
    div.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">Sin topes cargados. Los topes predeterminados se usan como fallback.</div>';
    return;
  }

  const fmtP = p => { const [y,m] = p.split('-'); const meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; return `${meses[+m-1]} ${y}`; };
  const fmtN = n => n > 0 ? '$ '+Number(n).toLocaleString('es-AR',{minimumFractionDigits:2}) : '—';
  const hoy  = new Date().toISOString().slice(0,7);

  div.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:var(--bg2);border-bottom:1px solid var(--border)">
          <th style="padding:10px 16px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Período</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Tope máximo (base imponible)</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Tope mínimo</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">RG / Fuente</th>
          <th style="padding:10px 12px;text-align:center;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase">Estado</th>
          <th style="padding:10px 12px;text-align:center;width:80px"></th>
        </tr>
      </thead>
      <tbody>
        ${claves.map(k => {
          const v = todos[k];
          const esPasado  = k < hoy;
          const esFuturo  = k > hoy;
          const esActual  = k === hoy;
          const estadoColor = esActual ? 'var(--green)' : esFuturo ? 'var(--accent2)' : 'var(--t3)';
          const estadoLabel = esActual ? '● Vigente' : esFuturo ? '◌ Futuro' : '· Pasado';
          return `
          <tr style="border-bottom:1px solid var(--border);${esActual?'background:rgba(34,197,94,.03)':''}">
            <td style="padding:10px 16px;font-family:var(--font-mono);font-weight:600;color:var(--t1)">${fmtP(k)}<div style="font-size:10px;color:var(--t3);font-weight:400">${k}</div></td>
            <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:var(--t1);font-weight:600">${fmtN(v.topeMax)}</td>
            <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);color:var(--t3)">${fmtN(v.topeMin)}</td>
            <td style="padding:10px 12px;font-size:11px;color:var(--t3);font-family:var(--font-mono)">${v._rg||'—'}</td>
            <td style="padding:10px 12px;text-align:center;font-size:10px;color:${estadoColor};font-family:var(--font-mono)">${estadoLabel}</td>
            <td style="padding:8px 12px;text-align:center">
              <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px" onclick="abrirModalNuevoTope('${k}')">✎</button>
              <button class="btn btn-ghost" style="font-size:10px;padding:2px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" onclick="eliminarTope('${k}')">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// Modal para agregar o editar un período de tope
async function abrirModalNuevoTope(periodoEditar){
  const todos = getAportesTopesPorMes();
  const editar = periodoEditar ? todos[periodoEditar] : null;

  const hoy = new Date();
  const periodoDefault = periodoEditar || `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;

  const prev = document.getElementById('modal-tope-rem');
  if(prev) prev.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-tope-rem';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';

  const iS = 'width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono)';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:480px;width:100%;border:1px solid var(--border)">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">${editar?'✎ Editar':'+ Nuevo'} tope remuneratorio</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Tope mensual ANSES para aportes y contribuciones (Art. 9 Ley 24.241)</div>
        </div>
        <button onclick="document.getElementById('modal-tope-rem').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="grid-column:span 2">
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Período *</label>
            <input type="month" id="tope-periodo" value="${periodoDefault}" ${editar?'readonly style="'+iS+';color:var(--t3);cursor:default"':('style="'+iS+'"')}>
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Mes y año de vigencia del tope</div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Tope máximo ($) *</label>
            <input type="number" id="tope-max" step="0.01" min="0" value="${editar?.topeMax||''}" placeholder="Ej: 4303619.01" style="${iS}">
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Base imponible máxima para aportes</div>
          </div>
          <div>
            <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Tope mínimo ($)</label>
            <input type="number" id="tope-min" step="0.01" min="0" value="${editar?.topeMin||''}" placeholder="Ej: 104870.00" style="${iS}">
            <div style="font-size:10px;color:var(--t3);margin-top:3px">Mínimo imponible (opcional)</div>
          </div>
        </div>

        <div>
          <label style="font-size:11px;font-family:var(--font-mono);color:var(--t3);display:block;margin-bottom:4px;text-transform:uppercase">Resolución General (RG / Fuente)</label>
          <input type="text" id="tope-rg" value="${editar?._rg||''}" placeholder="Ej: RG ARCA 5800/2026"
            style="${iS};font-family:inherit">
          <div style="font-size:10px;color:var(--t3);margin-top:3px">Número de resolución o fuente de referencia para auditoría</div>
        </div>

        <div style="padding:10px 12px;background:rgba(61,127,255,.06);border:1px solid rgba(61,127,255,.2);border-radius:var(--r);font-size:11px;color:var(--accent2);line-height:1.6">
          💡 El tope máximo limita la base imponible para jubilación, obra social, ANSSAL y PAMI de los empleados.
          Las contribuciones patronales de jubilación se calculan <strong>sin tope máximo</strong> (Art. 9 Ley 26.417).
        </div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-tope-rem').remove()" style="font-size:13px">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarTopeRem(${editar?`'${periodoEditar}'`:'null'})" style="font-size:13px;padding:8px 20px">✓ Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  setTimeout(()=> document.getElementById('tope-max')?.focus(), 80);
}

async function guardarTopeRem(periodoEditar){
  const periodo = document.getElementById('tope-periodo')?.value;
  const topeMax = parseFloat(document.getElementById('tope-max')?.value || '0');
  const topeMin = parseFloat(document.getElementById('tope-min')?.value || '0') || 0;
  const rg      = (document.getElementById('tope-rg')?.value || '').trim();

  if(!periodo || !/^\d{4}-\d{2}$/.test(periodo)){
    toast('⚠ Seleccioná un período válido', 'var(--yellow)'); return;
  }
  if(!topeMax || topeMax <= 0){
    toast('⚠ El tope máximo es obligatorio y debe ser mayor a cero', 'var(--yellow)');
    document.getElementById('tope-max')?.focus(); return;
  }

  const todos = getAportesTopesPorMes();
  todos[periodo] = { topeMax, topeMin, _rg: rg };
  await saveAportesTopesPorMes(todos);

  document.getElementById('modal-tope-rem')?.remove();
  renderLiqTopesTabla();
  toast(`✓ Tope ${periodo} guardado — máximo: $ ${topeMax.toLocaleString('es-AR',{minimumFractionDigits:2})}`, 'var(--green)', 4000);
}

async function eliminarTope(periodo){
  const ok = await showConfirm({
    titulo: 'Eliminar tope',
    mensaje: `¿Eliminar el tope remuneratorio de <strong>${periodo}</strong>?<br><br>Las liquidaciones de ese período usarán el tope predeterminado como fallback.`,
    labelOk: 'Eliminar', peligroso: true
  });
  if(!ok) return;
  const todos = getAportesTopesPorMes();
  delete todos[periodo];
  saveAportesTopesPorMes(todos);
  renderLiqTopesTabla();
  toast('✓ Tope eliminado', 'var(--green)');
}
