// ═══════════════════════════════════════════════════════════════════════════
// ASIENTO CONTABLE DE SUELDOS Y JORNALES
// ───────────────────────────────────────────────────────────────────────────
// Genera el asiento contable mensual de sueldos cumpliendo principios contables
// argentinos: separa cuentas de resultado (gastos) de cuentas patrimoniales
// (pasivos a pagar y activos cancelados), valida que débitos = créditos, y
// genera UN asiento por sociedad (LEITEN S.A., SINIS S.A., BARTON REBAR SA,
// LEITEN SALTA S.A.) — cada empresa carga el suyo en su sistema contable.
//
// Plan de cuentas: defaults editables. Los códigos siguen la convención
// jerárquica argentina (1=Activo, 2=Pasivo, 4=Ingresos, 5=Costos, 6=Gastos),
// pero LEITEN puede sobrescribirlos desde Parámetros si su sistema contable
// (Tango/Bejerman/Holístor) usa otra codificación.
//
// Salidas:
//   1. Modal con vista previa: débitos/créditos balanceados, validación
//   2. Excel formal con un libro por empresa + hoja Resumen consolidado
//   3. CSV con formato genérico importable (Tango/Bejerman/Holístor)
//
// REFERENCIAS:
//   • RT 8 y 9 FACPCE (Normas contables profesionales argentinas)
//   • Resol. CNV 622 — exposición contable
// ═══════════════════════════════════════════════════════════════════════════

// ─── Plan de cuentas estándar argentino (defaults editables) ───────────
const PLAN_CUENTAS_DEFAULT = {
  // Cuentas de resultado (gastos)
  sueldos:            { cod: '6.1.1.001', nombre: 'Sueldos y Jornales',                 tipo: 'D' },
  sac:                { cod: '6.1.1.002', nombre: 'Sueldo Anual Complementario (SAC)',  tipo: 'D' },
  vacaciones:         { cod: '6.1.1.003', nombre: 'Vacaciones',                         tipo: 'D' },
  hsExtras:           { cod: '6.1.1.004', nombre: 'Horas Extras',                       tipo: 'D' },
  premios:            { cod: '6.1.1.005', nombre: 'Premios y Bonificaciones',           tipo: 'D' },
  antiguedad:         { cod: '6.1.1.006', nombre: 'Adicional por Antigüedad',           tipo: 'D' },
  plusCategorizados:  { cod: '6.1.1.007', nombre: 'Plus y Adicionales',                 tipo: 'D' },
  noRemunerativos:    { cod: '6.1.1.008', nombre: 'Conceptos No Remunerativos',         tipo: 'D' },
  indemnizaciones:    { cod: '6.1.1.009', nombre: 'Indemnizaciones por Despido',        tipo: 'D' },
  preaviso:           { cod: '6.1.1.010', nombre: 'Preaviso e Integración Mes',         tipo: 'D' },
  vacNoGozadas:       { cod: '6.1.1.011', nombre: 'Vacaciones No Gozadas (Art. 156)',   tipo: 'D' },
  contribJub:         { cod: '6.1.1.020', nombre: 'Contribuciones Patronales — Jubilación', tipo: 'D' },
  contribOS:          { cod: '6.1.1.021', nombre: 'Contribuciones Patronales — Obra Social', tipo: 'D' },
  contribPami:        { cod: '6.1.1.022', nombre: 'Contribuciones Patronales — PAMI',   tipo: 'D' },
  contribDesempleo:   { cod: '6.1.1.023', nombre: 'Contribución Fondo Desempleo',       tipo: 'D' },
  contribART:         { cod: '6.1.1.024', nombre: 'Contribución ART',                   tipo: 'D' },
  contribSindicato:   { cod: '6.1.1.025', nombre: 'Cuota Sindical Patronal',            tipo: 'D' },
  // Régimen Ley 22.250 (UOCRA) — Industria de la Construcción
  contribFCL:         { cod: '6.1.1.026', nombre: 'Aporte Fondo Cese Laboral (FCL)',    tipo: 'D' },
  contribIERIC:       { cod: '6.1.1.027', nombre: 'Aporte IERIC',                       tipo: 'D' },
  contribFondoSanidad:{ cod: '6.1.1.028', nombre: 'Aporte Fondo Sanidad UOCRA',         tipo: 'D' },
  contribCAR:         { cod: '6.1.1.029', nombre: 'Aporte CAR (Asist. Recreativa)',     tipo: 'D' },
  contribCeslu:       { cod: '6.1.1.030', nombre: 'Aporte CESLU (Cuota Solidaria)',     tipo: 'D' },

  // Pasivos (a pagar)
  sueldosAPagar:      { cod: '2.1.1.001', nombre: 'Sueldos a Pagar',                    tipo: 'C' },
  aporteJubAPagar:    { cod: '2.1.1.010', nombre: 'Aportes Jubilatorios a Pagar (SIPA)', tipo: 'C' },
  aporteOSAPagar:     { cod: '2.1.1.011', nombre: 'Aportes Obra Social a Pagar',        tipo: 'C' },
  anssalAPagar:       { cod: '2.1.1.012', nombre: 'ANSSAL a Pagar',                     tipo: 'C' },
  aportePamiAPagar:   { cod: '2.1.1.013', nombre: 'Aportes Ley 19032 / PAMI a Pagar',   tipo: 'C' },
  sindAPagar:         { cod: '2.1.1.014', nombre: 'Cuota Sindical a Pagar',             tipo: 'C' },
  ganAPagar:          { cod: '2.1.1.015', nombre: 'Retención Ganancias 4ta. a Depositar', tipo: 'C' },
  ganAFavor:          { cod: '1.1.3.015', nombre: 'Ganancias 4ta. — Saldo a Favor a Recuperar', tipo: 'D' },
  contribAPagar:      { cod: '2.1.1.020', nombre: 'Contribuciones Patronales a Pagar (SIPA)', tipo: 'C' },
  contribOSAPagar:    { cod: '2.1.1.021', nombre: 'Contribuciones OS Patronales a Pagar', tipo: 'C' },
  contribPamiAPagar:  { cod: '2.1.1.022', nombre: 'Contribuciones PAMI Patronales a Pagar', tipo: 'C' },
  desempleoAPagar:    { cod: '2.1.1.023', nombre: 'Fondo Desempleo a Pagar',            tipo: 'C' },
  artAPagar:          { cod: '2.1.1.024', nombre: 'ART a Pagar',                        tipo: 'C' },
  sindPatAPagar:      { cod: '2.1.1.025', nombre: 'Cuota Sindical Patronal a Pagar',    tipo: 'C' },
  embargosADepositar: { cod: '2.1.1.030', nombre: 'Embargos Judiciales a Depositar',    tipo: 'C' },
  otrosDescAPagar:    { cod: '2.1.1.040', nombre: 'Otros Descuentos a Pagar',           tipo: 'C' },

  // Régimen UOCRA — pasivos (a pagar/depositar)
  fclADepositar:      { cod: '2.1.1.050', nombre: 'FCL a Depositar (cta. trabajador)',  tipo: 'C' },
  iericAPagar:        { cod: '2.1.1.051', nombre: 'IERIC a Pagar',                      tipo: 'C' },
  fondoSanidadAPagar: { cod: '2.1.1.052', nombre: 'Fondo Sanidad UOCRA a Pagar',        tipo: 'C' },
  carAPagar:          { cod: '2.1.1.053', nombre: 'CAR UOCRA a Pagar',                  tipo: 'C' },
  cesluAPagar:        { cod: '2.1.1.054', nombre: 'CESLU a Pagar',                      tipo: 'C' },

  // Activos (cancelan)
  anticipos:          { cod: '1.1.4.001', nombre: 'Anticipos al Personal',              tipo: 'C' }   // Crédito porque cancela el activo
};

const ASIENTO_PLAN_KEY = 'lsg_asiento_plan_cuentas';

function getPlanCuentas(){
  try {
    const raw = localStorage.getItem(ASIENTO_PLAN_KEY);
    if(raw) return { ...PLAN_CUENTAS_DEFAULT, ...JSON.parse(raw) };
  } catch(_){}
  return JSON.parse(JSON.stringify(PLAN_CUENTAS_DEFAULT));
}

function savePlanCuentas(plan){
  localStorage.setItem(ASIENTO_PLAN_KEY, JSON.stringify(plan));
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL ASIENTO POR EMPRESA
// ───────────────────────────────────────────────────────────────────────────
// Devuelve la estructura completa lista para exportar:
//   {
//     periodo, anio, mes, fecha,
//     empresas: { 'LEITEN S.A.': { cuit, lineas: [...], totales: {D, C, dif} } },
//     globales: { totalDebito, totalCredito, dif }
//   }
// ═══════════════════════════════════════════════════════════════════════════
function buildAsientoContable(liq){
  if(!liq?.items?.length) return null;
  const plan = getPlanCuentas();

  // Agrupar por empresa
  const porEmpresa = {};
  liq.items.forEach(item => {
    const k = item.empresa || '(sin empresa)';
    if(!porEmpresa[k]){
      let cuit = '';
      if(typeof getEmpresaByNom === 'function'){
        const e = getEmpresaByNom(k);
        cuit = e?.cuit || '';
      }
      porEmpresa[k] = { empresa: k, cuit, items: [], lineas: [], totales: { D:0, C:0, dif:0 } };
    }
    porEmpresa[k].items.push(item);
  });

  // Sumar conceptos por empresa
  Object.values(porEmpresa).forEach(g => {
    const items = g.items;
    const sum = (cb) => items.reduce((s, i) => s + $m(cb(i)), 0);

    // ─── DÉBITOS (gastos / cargos) ────────────────────────────────────
    const sueldoBasico   = sum(i => i.sueldoBasico);
    const antiguedad     = sum(i => i.mAntig);
    const presentismo    = sum(i => i.mPres);
    const sac            = sum(i => i.mSac);
    const vacac          = sum(i => i.mVac);
    const hsExtras       = sum(i => i.mHsE50) + sum(i => i.mHsE100);
    const ajusteHaberes  = sum(i => i.mAjuste);
    const cumplObj       = sum(i => i.mCumpObj);
    const plus           = sum(i => i.mOtrosHRem);
    const licEsp         = sum(i => i.mLicEspeciales);
    const sacProporc     = sum(i => i.mSacProporcional);
    // No remunerativos
    const noRemTotal     = sum(i => i.totalExentos);
    // Liquidación final
    const indemAntig     = sum(i => i.mIndemAntig);
    const indemniz       = sum(i => i.mIndemniz);
    const preavisoMes    = sum(i => i.mPreaviso) + sum(i => i.mIntegrMesDesp);
    const vacNoGozadas   = sum(i => i.mVacNoGozadas);
    // Contribuciones patronales (cada una a su cuenta de gasto)
    const jubPat         = sum(i => i.jubPatronal);
    const osPat          = sum(i => i.osPatronal);
    const pamiPat        = sum(i => i.pamiPatronal);
    const desempleo      = sum(i => i.desempleo);
    const art            = sum(i => i.art);
    const sindPat        = sum(i => i.sindPatronal);
    // Régimen UOCRA Ley 22.250 (cero si no hay empleados de construcción)
    const mFCL           = sum(i => i.mFCL);
    const mIeric         = sum(i => i.mIeric);
    const mFondoSanidad  = sum(i => i.mFondoSanidad);
    const mCAR           = sum(i => i.mCAR);
    const mCeslu         = sum(i => i.mCeslu);

    // ─── CRÉDITOS (pasivos) ───────────────────────────────────────────
    const netoAPagar     = sum(i => i.netoAPagar);
    const aporteJub      = sum(i => i.jubilacion);
    const aporteOS       = sum(i => i.obraSocial);
    const anssal         = sum(i => i.anssal);
    const aportePami     = sum(i => i.pamiEmp);
    const sindEmp        = sum(i => i.sindicato);
    const ganancias      = sum(i => (i.ganancias||0) + (i.ajusteGananciasAnual||0)); // incluye ajuste liq. anual (abril)
    const embargo        = sum(i => i.embargo);
    const anticipos      = sum(i => i.anticiposDesc);
    const otrosDesc      = sum(i => i.mOtrosD);
    const descSusp       = sum(i => i.mDescSuspension);

    // Helper para empujar línea con verificación de monto > 0
    const pushLinea = (cuentaKey, monto, glosa) => {
      if(monto <= 0.005) return;  // Tolerancia centavos
      const cta = plan[cuentaKey];
      if(!cta) return;
      g.lineas.push({
        cod: cta.cod,
        cuenta: cta.nombre,
        debe: cta.tipo === 'D' ? +monto.toFixed(2) : 0,
        haber: cta.tipo === 'C' ? +monto.toFixed(2) : 0,
        glosa: glosa || ''
      });
      if(cta.tipo === 'D') g.totales.D += monto;
      else                 g.totales.C += monto;
    };

    const glosaLiq = `Liq. ${liq.periodo} (${liq.tipo})`;

    // ── DÉBITOS (cargos) ──
    pushLinea('sueldos',           sueldoBasico + presentismo + ajusteHaberes + cumplObj, glosaLiq);
    pushLinea('antiguedad',        antiguedad,       glosaLiq);
    pushLinea('hsExtras',          hsExtras,         glosaLiq);
    pushLinea('sac',               sac + sacProporc, glosaLiq);
    pushLinea('vacaciones',        vacac + licEsp,   glosaLiq);
    pushLinea('plusCategorizados', plus,             glosaLiq);
    pushLinea('noRemunerativos',   noRemTotal - vacNoGozadas - preavisoMes - indemAntig - indemniz, glosaLiq);  // los conceptos de baja están en sus propias cuentas
    pushLinea('indemnizaciones',   indemAntig + indemniz,    glosaLiq);
    pushLinea('preaviso',          preavisoMes,              glosaLiq);
    pushLinea('vacNoGozadas',      vacNoGozadas,             glosaLiq);
    pushLinea('contribJub',        jubPat,                   glosaLiq);
    pushLinea('contribOS',         osPat,                    glosaLiq);
    pushLinea('contribPami',       pamiPat,                  glosaLiq);
    pushLinea('contribDesempleo',  desempleo,                glosaLiq);
    pushLinea('contribART',        art,                      glosaLiq);
    pushLinea('contribSindicato',  sindPat,                  glosaLiq);
    // ── Contribuciones régimen UOCRA Ley 22.250 ──
    pushLinea('contribFCL',          mFCL,          `${glosaLiq} — FCL Art. 15 Ley 22.250`);
    pushLinea('contribIERIC',        mIeric,        `${glosaLiq} — IERIC Ley 25.371`);
    pushLinea('contribFondoSanidad', mFondoSanidad, `${glosaLiq} — Fondo Sanidad UOCRA`);
    pushLinea('contribCAR',          mCAR,          `${glosaLiq} — CAR UOCRA`);
    pushLinea('contribCeslu',        mCeslu,        `${glosaLiq} — CESLU`);

    // ── CRÉDITOS (haberes) ──
    pushLinea('sueldosAPagar',      netoAPagar,    glosaLiq);
    pushLinea('aporteJubAPagar',    aporteJub,     glosaLiq);
    pushLinea('aporteOSAPagar',     aporteOS,      glosaLiq);
    pushLinea('anssalAPagar',       anssal,        glosaLiq);
    pushLinea('aportePamiAPagar',   aportePami,    glosaLiq);
    pushLinea('sindAPagar',         sindEmp,       glosaLiq);
    // Ganancias neta del período (con signo): >=0 retención a depositar (crédito);
    // <0 devolución neta al empleado -> saldo a favor a recuperar de ARCA (débito).
    if(ganancias >= 0){
      pushLinea('ganAPagar',          ganancias,     glosaLiq);
    } else {
      pushLinea('ganAFavor',         -ganancias,     glosaLiq + ' — devolución neta (saldo a favor)');
    }
    pushLinea('contribAPagar',      jubPat,        glosaLiq);
    pushLinea('contribOSAPagar',    osPat,         glosaLiq);
    pushLinea('contribPamiAPagar',  pamiPat,       glosaLiq);
    pushLinea('desempleoAPagar',    desempleo,     glosaLiq);
    pushLinea('artAPagar',          art,           glosaLiq);
    pushLinea('sindPatAPagar',      sindPat,       glosaLiq);
    pushLinea('embargosADepositar', embargo,       glosaLiq);
    pushLinea('otrosDescAPagar',    otrosDesc + descSusp, glosaLiq);
    pushLinea('anticipos',          anticipos,     `${glosaLiq} — cancelación adelantos`);
    // ── Pasivos régimen UOCRA Ley 22.250 ──
    pushLinea('fclADepositar',      mFCL,           `${glosaLiq} — FCL a depositar en cta. trabajador`);
    pushLinea('iericAPagar',        mIeric,         `${glosaLiq} — IERIC VEP`);
    pushLinea('fondoSanidadAPagar', mFondoSanidad,  `${glosaLiq} — Fondo Sanidad UOCRA`);
    pushLinea('carAPagar',          mCAR,           `${glosaLiq} — CAR UOCRA`);
    pushLinea('cesluAPagar',        mCeslu,         `${glosaLiq} — CESLU`);

    // ── Conceptos custom — cuenta contable dinámica por concepto ──
    // Cada concepto custom puede declarar su propia cuenta contable. Si la
    // declara, generamos una línea (debe o haber según tipo). Si no declara
    // cuenta, lo agrupamos en una cuenta genérica para no perder el balance.
    items.forEach(it => {
      (it.conceptosCustom || []).forEach(cc => {
        if(!cc.monto) return;
        const cuentaCod = (cc.concepto?.cuentaContable || '').trim();
        const esDebito  = (cc.tipo === 'REM' || cc.tipo === 'NO_REM' || cc.tipo === 'CONTRIBUCION_PATRONAL');
        const esCredito = (cc.tipo === 'DESCUENTO' || cc.tipo === 'APORTE');
        // Cuenta default si no definió
        const codFinal = cuentaCod || (
          cc.tipo === 'REM' ? '6.1.1.099' :
          cc.tipo === 'NO_REM' ? '6.1.1.098' :
          cc.tipo === 'CONTRIBUCION_PATRONAL' ? '6.1.1.097' :
          cc.tipo === 'APORTE' ? '2.1.1.099' :
          '2.1.1.098'  // DESCUENTO
        );
        // Empujamos línea agregada: una sola por concepto+empresa
        // (pero como estamos dentro del forEach por item, agregamos por empleado).
        // Acumulamos en un mapa para sumar por código:
      });
    });
    // En lugar de una línea por empleado por concepto custom (explosión de líneas),
    // sumamos por (codigo concepto custom) y emitimos UNA línea agregada por concepto.
    const _ccAgregado = {};  // { codigoConcepto: { cuentaCod, nombre, tipo, monto } }
    items.forEach(it => {
      (it.conceptosCustom || []).forEach(cc => {
        if(!cc.monto) return;
        const k = cc.codigo;
        if(!_ccAgregado[k]){
          _ccAgregado[k] = {
            cuentaCod: (cc.concepto?.cuentaContable || '').trim() || (
              cc.tipo === 'REM' ? '6.1.1.099' :
              cc.tipo === 'NO_REM' ? '6.1.1.098' :
              cc.tipo === 'CONTRIBUCION_PATRONAL' ? '6.1.1.097' :
              cc.tipo === 'APORTE' ? '2.1.1.099' :
              '2.1.1.098'
            ),
            nombre: cc.nombre || cc.codigo, tipo: cc.tipo, monto: 0
          };
        }
        _ccAgregado[k].monto += cc.monto;
      });
    });
    Object.entries(_ccAgregado).forEach(([codigo, agg]) => {
      const esDebe = (agg.tipo === 'REM' || agg.tipo === 'NO_REM' || agg.tipo === 'CONTRIBUCION_PATRONAL');
      // Línea de DEBE (gasto) si REM/NoRem/Contrib
      if(esDebe){
        g.lineas.push({
          cod: agg.cuentaCod, cuenta: agg.nombre,
          debe: +agg.monto.toFixed(2), haber: 0,
          glosa: `${glosaLiq} — concepto custom ${codigo}`
        });
        g.totales.D += agg.monto;
      } else {
        // DESCUENTO / APORTE → crédito (pasivo a pagar)
        g.lineas.push({
          cod: agg.cuentaCod, cuenta: agg.nombre,
          debe: 0, haber: +agg.monto.toFixed(2),
          glosa: `${glosaLiq} — concepto custom ${codigo}`
        });
        g.totales.C += agg.monto;
      }
    });
    // Para que los REM custom queden balanceados, los pagos al empleado ya
    // incluyen el monto en `netoAPagar` (que se computa con totalHaberes
    // post-custom). Lo mismo para descuentos. Por lo tanto no hace falta
    // sumar contrapartida adicional acá.

    // Verificación de balance — débitos deben igualar créditos.
    g.totales.dif = +(g.totales.D - g.totales.C).toFixed(2);
  });

  // Globales
  let g_D = 0, g_C = 0;
  Object.values(porEmpresa).forEach(g => { g_D += g.totales.D; g_C += g.totales.C; });

  return {
    periodo: liq.periodo,
    anio: liq.anio, mes: liq.mes,
    tipo: liq.tipo,
    fecha: liq.fechaPago || (new Date(liq.anio, liq.mes, 0).toISOString().slice(0, 10)),
    empresas: porEmpresa,
    globales: {
      totalDebito: g_D,
      totalCredito: g_C,
      dif: +(g_D - g_C).toFixed(2),
      cantEmpresas: Object.keys(porEmpresa).length
    },
    plan
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT EXCEL — formal con un asiento por empresa
// ═══════════════════════════════════════════════════════════════════════════
async function exportarAsientoExcel(liq){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  const ds = buildAsientoContable(liq);
  if(!ds){ toast('⚠ Sin items para asentar','var(--yellow)'); return; }

  const wb = XLSX.utils.book_new();

  // ── Hoja Resumen consolidado ──
  const resRows = [
    ['ASIENTOS CONTABLES DE SUELDOS — RESUMEN CONSOLIDADO'],
    [],
    ['Período', ds.periodo],
    ['Tipo', ds.tipo],
    ['Fecha asiento', ds.fecha],
    [],
    ['CONSOLIDADO POR EMPRESA'],
    ['Empresa', 'CUIT', 'Total Débito', 'Total Crédito', 'Diferencia', 'Estado']
  ];
  Object.values(ds.empresas).forEach(g => {
    const balanceado = Math.abs(g.totales.dif) < 0.01;
    resRows.push([
      g.empresa, g.cuit || '(sin CUIT)',
      +g.totales.D.toFixed(2), +g.totales.C.toFixed(2), +g.totales.dif.toFixed(2),
      balanceado ? '✓ Balanceado' : '⚠ DESBALANCEADO'
    ]);
  });
  resRows.push([]);
  resRows.push(['TOTAL GENERAL', '',
    +ds.globales.totalDebito.toFixed(2),
    +ds.globales.totalCredito.toFixed(2),
    +ds.globales.dif.toFixed(2),
    Math.abs(ds.globales.dif) < 0.01 ? '✓ Balanceado' : '⚠ DESBALANCEADO'
  ]);
  const wsRes = XLSX.utils.aoa_to_sheet(resRows);
  wsRes['!cols'] = [{wch:30},{wch:14},{wch:16},{wch:16},{wch:14},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen');

  // ── Una hoja por empresa ──
  Object.values(ds.empresas).forEach(g => {
    const sheetName = (g.empresa || 'sin').slice(0, 28).replace(/[\\\/\?\*\[\]]/g, '_');
    const rows = [
      [`ASIENTO CONTABLE — ${g.empresa}`],
      [`CUIT: ${g.cuit || '(sin cargar)'} · Período: ${ds.periodo} · Fecha: ${ds.fecha}`],
      [],
      ['Cuenta', 'Descripción', 'Debe', 'Haber', 'Glosa']
    ];
    g.lineas.forEach(l => {
      rows.push([l.cod, l.cuenta, l.debe || '', l.haber || '', l.glosa]);
    });
    rows.push([]);
    rows.push(['', 'TOTAL', +g.totales.D.toFixed(2), +g.totales.C.toFixed(2), '']);
    if(Math.abs(g.totales.dif) >= 0.01){
      rows.push(['', '⚠ DIFERENCIA', '', +g.totales.dif.toFixed(2), 'Asiento DESBALANCEADO — revisar']);
    } else {
      rows.push(['', '✓ Balanceado', '', '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:11},{wch:42},{wch:14},{wch:14},{wch:30}];
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:4} },
      { s:{r:1,c:0}, e:{r:1,c:4} }
    ];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fname = `Asiento_Sueldos_${ds.periodo}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ Asiento Excel descargado (${ds.globales.cantEmpresas} empresa${ds.globales.cantEmpresas!==1?'s':''})`, 'var(--green)');

  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'asiento_contable_excel', {
      liqId: liq.id, periodo: liq.periodo,
      empresas: Object.keys(ds.empresas), por: currentUser?.emp?.nom
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CSV genérico (importable a Tango/Bejerman/Holístor)
// ───────────────────────────────────────────────────────────────────────────
// Formato típico: una fila por línea de asiento, columnas estándar.
// Cada empresa genera su propio CSV (los sistemas contables suelen ser
// monosocios desde la app desktop).
// ═══════════════════════════════════════════════════════════════════════════
function exportarAsientoCSV(liq){
  const ds = buildAsientoContable(liq);
  if(!ds){ toast('⚠ Sin items','var(--yellow)'); return; }

  Object.values(ds.empresas).forEach(g => {
    const headers = ['Asiento','Fecha','Cuenta','Descripción','Debe','Haber','Glosa','CUIT'];
    const asNumero = ds.periodo.replace(/-/g, '');
    const rows = [headers];
    g.lineas.forEach(l => {
      rows.push([
        asNumero,
        ds.fecha,
        l.cod,
        l.cuenta,
        l.debe ? l.debe.toFixed(2) : '0.00',
        l.haber ? l.haber.toFixed(2) : '0.00',
        l.glosa,
        g.cuit || ''
      ]);
    });
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const safeName = g.empresa.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = URL.createObjectURL(blob);
    a.download = `asiento_${safeName}_${ds.periodo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  toast(`✓ ${Object.keys(ds.empresas).length} archivo${Object.keys(ds.empresas).length!==1?'s':''} CSV descargado`,'var(--green)');

  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'asiento_contable_csv', {
      liqId: liq.id, periodo: liq.periodo,
      empresas: Object.keys(ds.empresas), por: currentUser?.emp?.nom
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL con vista previa
// ═══════════════════════════════════════════════════════════════════════════
function abrirModalAsientoContable(){
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación','var(--yellow)'); return; }
  if(!liq.items?.length){ toast('⚠ Sin items','var(--yellow)'); return; }

  // Refrescar cache empresas para resolver CUITs
  if(typeof _refreshEmpresasABMCache === 'function'){
    _refreshEmpresasABMCache().then(() => _asientoContinuarApertura(liq))
                              .catch(() => _asientoContinuarApertura(liq));
  } else {
    _asientoContinuarApertura(liq);
  }
}

function _asientoContinuarApertura(liq){
  const ds = buildAsientoContable(liq);
  const fmtN = n => Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

  // Render de cada empresa
  const empresasHtml = Object.values(ds.empresas).map(g => {
    const balanceado = Math.abs(g.totales.dif) < 0.01;
    const lineasHtml = g.lineas.map(l => `
      <tr>
        <td style="padding:4px 8px;font-family:var(--font-mono);font-size:10px;color:var(--t3);white-space:nowrap">${l.cod}</td>
        <td style="padding:4px 8px;font-size:11px;color:var(--t1)">${l.cuenta}</td>
        <td style="padding:4px 8px;font-family:var(--font-mono);font-size:11px;color:${l.debe ? 'rgb(168,85,247)' : 'var(--t3)'};text-align:right;font-weight:${l.debe?'600':'400'}">${l.debe ? fmtN(l.debe) : ''}</td>
        <td style="padding:4px 8px;font-family:var(--font-mono);font-size:11px;color:${l.haber ? 'var(--green)' : 'var(--t3)'};text-align:right;font-weight:${l.haber?'600':'400'}">${l.haber ? fmtN(l.haber) : ''}</td>
      </tr>
    `).join('');

    return `
      <details ${ds.globales.cantEmpresas === 1 ? 'open' : ''} style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:10px">
        <summary style="cursor:pointer;padding:10px 14px;font-size:12px;color:var(--t1);font-weight:600;display:flex;justify-content:space-between;align-items:center">
          <span>${g.empresa} ${g.cuit ? `<span style="font-family:var(--font-mono);font-size:10px;color:var(--t3);font-weight:400">· CUIT ${g.cuit}</span>` : '<span style="color:var(--red);font-size:10px">⚠ sin CUIT</span>'}</span>
          <span style="font-family:var(--font-mono);font-size:11px;color:${balanceado?'var(--green)':'var(--red)'};font-weight:600">
            ${balanceado ? '✓' : '⚠'} D $${fmtN(g.totales.D)} / H $${fmtN(g.totales.C)}
          </span>
        </summary>
        <div style="padding:0 14px 14px;max-height:380px;overflow-y:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead style="position:sticky;top:0;background:var(--bg2);border-bottom:1px solid var(--border)">
              <tr>
                <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Cuenta</th>
                <th style="padding:6px 8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Descripción</th>
                <th style="padding:6px 8px;font-size:10px;color:rgb(168,85,247);text-align:right;text-transform:uppercase;letter-spacing:.05em">Debe</th>
                <th style="padding:6px 8px;font-size:10px;color:var(--green);text-align:right;text-transform:uppercase;letter-spacing:.05em">Haber</th>
              </tr>
            </thead>
            <tbody>${lineasHtml}</tbody>
            <tfoot style="border-top:2px solid var(--border)">
              <tr>
                <td colspan="2" style="padding:6px 8px;font-size:11px;color:var(--t1);font-weight:600;text-align:right">TOTAL</td>
                <td style="padding:6px 8px;font-family:var(--font-mono);font-size:12px;color:rgb(168,85,247);font-weight:700;text-align:right">$ ${fmtN(g.totales.D)}</td>
                <td style="padding:6px 8px;font-family:var(--font-mono);font-size:12px;color:var(--green);font-weight:700;text-align:right">$ ${fmtN(g.totales.C)}</td>
              </tr>
              ${!balanceado ? `<tr><td colspan="4" style="padding:6px 8px;font-size:11px;color:var(--red);text-align:right;font-style:italic">⚠ Diferencia $ ${fmtN(g.totales.dif)} — revisar</td></tr>` : ''}
            </tfoot>
          </table>
        </div>
      </details>
    `;
  }).join('');

  const balanceadoGlobal = Math.abs(ds.globales.dif) < 0.01;

  const overlay = document.createElement('div');
  overlay.id = 'modal-asiento';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:840px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">📒 Asiento Contable de Sueldos</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Período ${ds.periodo} · ${liq.items.length} empleados · ${ds.globales.cantEmpresas} empresa${ds.globales.cantEmpresas!==1?'s':''}</div>
        </div>
        <button onclick="document.getElementById('modal-asiento').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px">

        <!-- Totales globales -->
        <div style="background:linear-gradient(135deg,${balanceadoGlobal?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)'},rgba(94,194,255,.03));border:1px solid ${balanceadoGlobal?'rgba(34,197,94,.2)':'rgba(239,68,68,.3)'};border-radius:var(--r);padding:14px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-size:11px;font-family:var(--font-mono);color:${balanceadoGlobal?'var(--green)':'var(--red)'};text-transform:uppercase;letter-spacing:.05em">${balanceadoGlobal?'✓ Asiento balanceado':'⚠ Asiento DESBALANCEADO'}</div>
              <div style="font-size:10px;color:var(--t3);margin-top:3px">${balanceadoGlobal?'Débitos coinciden con créditos · listo para cargar':'Diferencia: $ '+fmtN(ds.globales.dif)+' — revisar antes de cargar'}</div>
            </div>
            <div style="display:flex;gap:18px;font-family:var(--font-mono);font-size:11px">
              <div><div style="color:var(--t3);font-size:9px">DEBE</div><div style="color:rgb(168,85,247);font-size:14px;font-weight:700">$ ${fmtN(ds.globales.totalDebito)}</div></div>
              <div><div style="color:var(--t3);font-size:9px">HABER</div><div style="color:var(--green);font-size:14px;font-weight:700">$ ${fmtN(ds.globales.totalCredito)}</div></div>
            </div>
          </div>
        </div>

        <!-- Asientos por empresa -->
        <div>${empresasHtml}</div>

        <!-- Aclaración -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong>Plan de cuentas:</strong> usa la convención jerárquica argentina (1=Activo, 2=Pasivo, 6=Gastos).
          Si el sistema contable de LEITEN (Tango/Bejerman/Holístor) usa otra codificación, ajustá los códigos
          en <code style="background:var(--bg1);padding:1px 4px;border-radius:3px">localStorage.lsg_asiento_plan_cuentas</code>
          (próxima versión: editor visual). El asiento incluye todos los conceptos liquidados:
          básico, antig., presentismo, SAC, vac., HE, ajuste, plus, indemnizaciones (Art. 245),
          preaviso (Art. 232), vac. no gozadas (Art. 156) y todas las contribuciones patronales por separado.
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-asiento').remove(); abrirEditorPlanCuentas();" style="font-size:13px;padding:8px 14px;color:rgb(168,85,247);border-color:rgba(168,85,247,.3)">⚙ Editar plan de cuentas</button>
        <button class="btn btn-ghost" onclick="document.getElementById('modal-asiento').remove()" style="font-size:13px;padding:8px 14px">Cerrar</button>
        <button class="btn btn-ghost" onclick="exportarAsientoCSV(_liqActiva)" style="font-size:13px;padding:8px 16px;color:var(--accent2);border-color:rgba(61,127,255,.3)">📄 CSV (un archivo por empresa)</button>
        <button class="btn btn-primary" onclick="exportarAsientoExcel(_liqActiva)" style="font-size:13px;padding:8px 18px">📊 Descargar Excel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Reemplazo de la función vieja
function exportarAsientoContable(){
  abrirModalAsientoContable();
}
