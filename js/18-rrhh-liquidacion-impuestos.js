// ═══════════════════════════════════════════════════════════════
// GANANCIAS 4ª CATEGORÍA — RG ARCA 4003/2017
// Con acumulado enero→mes actual, cargas desglosadas y topes Art. 85
// ═══════════════════════════════════════════════════════════════

// Escala progresiva Art. 94 LIG
async function calcImpuestoEscala(base, params){
  const tramos = params.escalaGanancias || [];
  if(base <= 0) return {impuesto:0, alicuota:0, tramo:null};
  for(const t of tramos){
    if(base <= t.hasta){
      return {
        impuesto: t.fijo + (base - t.desde) * t.alicuota / 100,
        alicuota: t.alicuota,
        tramo: t
      };
    }
  }
  const last = tramos[tramos.length-1];
  return {
    impuesto: last.fijo + (base - last.desde) * last.alicuota / 100,
    alicuota: last.alicuota,
    tramo: last
  };
}

// Cache breve de liquidaciones para el acumulado (evita N lecturas IDB en el loop de liquidación)
let _gananciasLiqCache = null, _gananciasLiqCacheTs = 0;
async function _getLiquidacionesGan(){
  const now = Date.now();
  if(_gananciasLiqCache && (now - _gananciasLiqCacheTs) < 8000) return _gananciasLiqCache;
  _gananciasLiqCache = await getLiquidaciones();
  _gananciasLiqCacheTs = now;
  return _gananciasLiqCache;
}
function invalidarCacheGanancias(){ _gananciasLiqCache = null; _gananciasLiqCacheTs = 0; }

// Acumula todos los valores del empleado desde enero al mes de la liquidación activa
async function acumularGananciasEmpleado(leg, anio, mesHasta){
  const lista = await _getLiquidacionesGan();
  // Filtrar aprobadas del mismo año, del empleado, hasta el mes indicado
  const previas = lista.filter(l =>
    l.estado === 'aprobada' &&
    l.anio === anio &&
    l.mes < mesHasta &&
    (l.items||[]).some(i => i.leg === leg)
  );

  let remGravAcum = 0;
  let sacAcum     = 0;
  let dedGenAcum  = 0;
  let retenidoAcum = 0;
  const itemsPrevios = [];

  for(const liq of previas){
    const item = liq.items.find(i => i.leg === leg);
    if(!item) continue;
    // Usar base remunerativa (sin exentos) como remGrav acumulado
    remGravAcum  += (item.totalHaberesRem !== undefined ? item.totalHaberesRem : item.totalHaberes) || 0;
    sacAcum      += (item.mSac || 0);
    dedGenAcum   += (item.jubilacion || 0) + (item.obraSocial || 0)
                  + (item.anssal || 0) + (item.pamiEmp || 0) + (item.sindicato || 0);
    retenidoAcum += (item.ganancias || 0);
    itemsPrevios.push({mes:liq.mes, item});
  }

  return {remGravAcum, sacAcum, dedGenAcum, retenidoAcum, itemsPrevios, periodosAcumulados: previas.length};
}

// Aplica topes del Art. 85 LIG a las deducciones voluntarias
// Aplica topes del Art. 85 LIG (con actualización Ley 27.743/2024) a las deducciones voluntarias
// Referencias: Ley 20.628 (t.o. 2019) y modificatorias — Art. 85 y concordantes
function aplicarTopesArt85(deducciones, ganNeta, params){
  const d = deducciones || {};
  const resultado = {};

  // ─ Seguros de vida/retiro + Primas para caso de muerte (Art. 85 inc. b) ─
  // TOPE COMBINADO: el límite del PEN aplica a la SUMA de ambos conceptos.
  const sumaSeguros   = $m(d.seguroVida) + $m(d.primaMuerte);
  const topeSegurosV  = params.gan_topeSeguroVida || 0;
  if(sumaSeguros <= topeSegurosV || sumaSeguros === 0){
    resultado.seguroVida  = $m(d.seguroVida);
    resultado.primaMuerte = $m(d.primaMuerte);
  } else {
    // Se prorratea proporcionalmente para respetar el tope combinado
    resultado.seguroVida  = $m(d.seguroVida)  / sumaSeguros * topeSegurosV;
    resultado.primaMuerte = $m(d.primaMuerte) / sumaSeguros * topeSegurosV;
  }

  // ─ Gastos de sepelio (Art. 85 inc. d) — tope fijo anual ─
  resultado.gastosSepelio = Math.min($m(d.gastosSepelio), params.gan_topeGastosSepelio || 0);

  // ─ Cuotas médico-asistenciales (Art. 85 inc. f) — tope 5% de la ganancia neta ─
  const pctMed = params.gan_topePctHonorariosMedGanNeta / 100;
  resultado.cuotasMedicas = Math.min($m(d.cuotasMedicas), Math.max(0, ganNeta) * pctMed);

  // ─ Honorarios médicos y paramédicos (Art. 85 inc. h) ─
  // DOBLE TOPE: 40% de lo facturado (efectivamente a cargo) Y hasta 5% ganancia neta
  const honorarios = $m(d.honorariosMedicos);
  const tope40     = honorarios * (params.gan_topePctHonorariosMed / 100);
  const tope5GN    = Math.max(0, ganNeta) * pctMed;
  resultado.honorariosMedicos = Math.min(tope40, tope5GN);

  // ─ Donaciones (Art. 85 inc. c) — tope 5% de la ganancia neta ─
  const topeDonac = Math.max(0, ganNeta) * (params.gan_topePctDonaciones / 100);
  resultado.donaciones = Math.min($m(d.donaciones), topeDonac);

  // ─ Servicio doméstico (Ley 26.063 art. 16) — tope MNI anual ─
  resultado.servDomestico = Math.min($m(d.servDomestico), params.gan_mniAnual || 0);

  // ─ Alquileres casa-habitación del contribuyente no propietario (Art. 85 inc. g) ─
  // 40% del alquiler efectivamente pagado, con tope del MNI anual
  const alquileres = $m(d.alquileres);
  const alq40      = alquileres * (params.gan_pctAlquilerDeducible / 100);
  resultado.alquileres = Math.min(alq40, params.gan_mniAnual || 0);

  // ─ Educación y adquisición de herramientas cargas de familia (Ley 27.743) ─
  // Tope: 40% del MNI anual
  resultado.educacion = Math.min($m(d.educacion), (params.gan_mniAnual || 0) * (params.gan_pctEducacionMni / 100));

  // ─ Intereses de créditos hipotecarios casa-habitación (Art. 85 inc. a) ─
  // Tope fijo anual establecido por PEN (actualmente fijo, sujeto a RG ARCA)
  const topeHipot = params.gan_topeIntHipotecarios || 0;
  resultado.intHipotecarios = topeHipot > 0
    ? Math.min($m(d.intHipotecarios), topeHipot)
    : $m(d.intHipotecarios);

  // ─ Aportes al Capital Social y Fondo de Riesgo de SGR (Ley 24.467 Art. 79) ─
  // Sin tope directo — sujeto a mantener el aporte por 2 años
  resultado.aportesSGR = $m(d.aportesSGR);

  return resultado;
}

// Datos empresa
function _edEmp(empresa){
  return EMPRESA_DATOS_LIQ[empresa] || {cuit:'',dir:'',nro:'',piso:'',depto:'',cp:'',loc:''};
}

// ═══════════════════════════════════════════════════════════════
// DETERMINACIÓN DE GANANCIAS 4ª DEL PERÍODO (acumulado RG 4003/2017)
// Función pura reutilizable: la usan tanto el motor de liquidación
// (calcularItemLiquidacion en 17-rrhh-liquidacion.js) para AUTOCOMPLETAR
// item.ganancias, como la planilla de control.
//
// Devuelve impMesAuto CON SIGNO:
//   > 0  → retención del período
//   < 0  → devolución del período
// Por construcción: retenidoAcum(previos) + impMesAuto = impDetAcum
// ⇒ al cierre del período la diferencia da CERO.
//
// REGLA DEDUCCIONES (Art. 30 / Art. 85 LIG):
//   • Deducciones personales declaradas por el trabajador (cargas de
//     familia y deducciones voluntarias Art. 85): SOLO si se importó el
//     F.572 SIRADIG.
//   • Excepción — aportes obligatorios (jubilación, obra social, ANSSAL,
//     Ley 19.032 y sindicato): SIEMPRE deducibles, tomados de los
//     acumulados retenidos en períodos previos + los de la liquidación
//     mensual en curso (que ya incluyen los aportes sobre SAC y demás
//     pagos no habituales devengados en el mes vía baseSacAportes).
//   • MNI y Deducción Especial (Art. 30): SIEMPRE (no las declara el
//     empleado; surgen de tablas ARCA).
// ═══════════════════════════════════════════════════════════════
async function calcGananciasMes(item, liq, params, nov){
  nov = nov || {};
  // Resolver parámetros Ganancias según FECHA DE PAGO de la liquidación.
  const fechaRef = liq.fechaPago || `${liq.anio}-${String(liq.mes).padStart(2,'0')}-01`;
  params = buildParamsConPeriodo(params, fechaRef);

  // Acumulado enero → mes anterior (sobre liquidaciones aprobadas)
  const acum = await acumularGananciasEmpleado(item.leg, liq.anio, liq.mes);

  // Mes actual — base gravable = remunerativos (los exentos no integran la base)
  const remMes = $m(item.totalHaberesRem || item.totalHaberes);
  const sacMes = $m(item.mSac);
  // Aportes obligatorios del mes (incluyen los devengados sobre SAC / pagos no habituales)
  const dedGenMes = $m(item.jubilacion) + $m(item.obraSocial) + $m(item.anssal) + $m(item.pamiEmp) + $m(item.sindicato);

  // Acumulado incluyendo el mes actual
  const remGravAcum = acum.remGravAcum + remMes;
  const sacAcumTot  = acum.sacAcum + sacMes;
  const dedGenAcum  = acum.dedGenAcum + dedGenMes;

  // Deducciones personales PROPORCIONALES (a los meses transcurridos)
  const mesesTranscurridos = liq.mes; // enero=1
  // LIQUIDACIÓN FINAL (Art. 21 inc. b / Art. 7 RG 4003/2017): se usan los montos
  // ANUALES completos de deducciones (no se prorratean por meses trabajados); la
  // tabla 1er/2do semestre la resuelve resolveGanParamsParaFecha por fecha de pago.
  const esLiqFinal = (liq.tipo === 'final');
  const propMes = esLiqFinal ? 1 : (mesesTranscurridos / 12);
  const mniProp      = params.gan_mniAnual    * propMes;
  let dedEspProp     = params.gan_dedEspAnual  * propMes;
  let dedEsp2Prop    = params.gan_dedEsp2Anual * propMes;
  const dedEspecProp = params.gan_dedEspecifica * propMes;

  // Cargas de familia y deducciones voluntarias: SOLO con F.572 SIRADIG importado
  const tieneSiradig = !!(nov && nov._importadoSiradig);
  const tieneConyuge = tieneSiradig && !!nov.tieneConyuge;
  const nroHijos     = tieneSiradig ? (parseInt(nov.nroHijosMenores) || 0) : 0;
  const nroHijosInc  = tieneSiradig ? (parseInt(nov.nroHijosIncapacitados) || 0) : 0;
  const cargaConyuge  = tieneConyuge ? params.gan_cargaConyugeAnual * propMes : 0;
  const cargaHijos    = nroHijos    * params.gan_cargaHijoAnual    * propMes;
  const cargaHijosInc = nroHijosInc * params.gan_cargaHijoIncAnual * propMes;
  const totalCargasFam = cargaConyuge + cargaHijos + cargaHijosInc;

  // Deducciones voluntarias con topes Art. 85
  const ganNetaProv = remGravAcum - dedGenAcum;
  const dedVolRaw = tieneSiradig ? (nov.dedVoluntarias || {}) : {};
  const dedVolTopadas = aplicarTopesArt85(dedVolRaw, ganNetaProv, params);
  const totalDedVol = Object.values(dedVolTopadas).reduce((s,v)=>s+v, 0);

  const totDedGen  = dedGenAcum + totalDedVol;
  // La deducción especial (y su 12ava parte) NO puede generar quebranto (Art. 25 LIG):
  // se limita a la ganancia neta remanente tras deducciones generales, GNI, cargas y
  // deducción específica. Si el resto da negativo, la remuneración sujeta queda en CERO.
  {
    const _baseAntesEsp = remGravAcum - totDedGen - mniProp - totalCargasFam - dedEspecProp;
    const _dedEspMax = Math.max(0, _baseAntesEsp);
    const _sumEsp = dedEspProp + dedEsp2Prop;
    if(_sumEsp > _dedEspMax && _sumEsp > 0){ const _e = _dedEspMax / _sumEsp; dedEspProp *= _e; dedEsp2Prop *= _e; }
  }
  const totDedPers = mniProp + totalCargasFam + dedEspProp + dedEsp2Prop + dedEspecProp;
  const totDed     = totDedGen + totDedPers;

  // Ganancia sujeta a impuesto e impuesto determinado (escala Art. 94)
  const remSujeta = Math.max(0, remGravAcum - totDed);
  const { impuesto: impDetAcum, alicuota, tramo } = await calcImpuestoEscala(remSujeta, params);

  // Saldo del período CON SIGNO (negativo = devolución)
  const impMesAuto = impDetAcum - acum.retenidoAcum;

  return {
    params, acum, remMes, sacMes, dedGenMes, remGravAcum, sacAcumTot, dedGenAcum,
    mesesTranscurridos, propMes, mniProp, dedEspProp, dedEsp2Prop, dedEspecProp,
    tieneSiradig, tieneConyuge, nroHijos, nroHijosInc, cargaConyuge, cargaHijos, cargaHijosInc,
    totalCargasFam, dedVolRaw, dedVolTopadas, totalDedVol, totDedGen, totDedPers, totDed,
    remSujeta, impDetAcum, alicuota, tramo, impMesAuto
  };
}

// HTML planilla Ganancias con acumulado
async function planillaGananciasHTML(item, liq, params, nov){
  const ed = _edEmp(item.empresa);
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre = (meses[liq.mes-1] || '').toUpperCase() + ' ' + liq.anio;
  const tipoDesc = ({mensual:'Mensual',quincenal:'Quincenal',sac1:'SAC 1er Sem.',sac2:'SAC 2do Sem.',vacaciones:'Vacaciones',final:'Final',complementaria:'Complementaria'})[liq.tipo] || liq.tipo;

  // ── Determinación de Ganancias (acumulado) — función compartida ──
  const G = await calcGananciasMes(item, liq, params, nov);
  params = G.params; // resueltos por período (fecha de pago)
  const {
    acum, remMes, sacMes, dedGenMes, remGravAcum, sacAcumTot, dedGenAcum,
    mesesTranscurridos, propMes, mniProp, dedEspProp, dedEsp2Prop, dedEspecProp,
    tieneSiradig, tieneConyuge, nroHijos, nroHijosInc, cargaConyuge, cargaHijos, cargaHijosInc,
    totalCargasFam, dedVolTopadas, totalDedVol, totDedGen, totDedPers, totDed,
    remSujeta, impDetAcum, alicuota, tramo, impMesAuto
  } = G;

  // Conceptos exentos del mes (informativo — ya excluidos de remMes)
  const hsExtExentas = $m(nov.hsExtrasExentas);
  const bonoExento  = $m(nov.bonoProductividadExento);
  const indemniz    = $m(nov.indemnizaciones);
  const otrosExentos = $m(nov.otrosExentos);
  const totalExento = hsExtExentas + bonoExento + indemniz + otrosExentos;

  // Saldo del período con signo y lo realmente aplicado en el recibo (auto u override manual)
  const impMes      = impMesAuto;            // automático (acumulado)
  const impAplicado = $m(item.ganancias);    // lo que impacta el recibo
  const diferencia  = impDetAcum - (acum.retenidoAcum + impAplicado); // 0 si es automático

  const fN = n => n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const row = (lbl,val,bold,bg) => {
    const bStyle = bold?'font-weight:bold;':'font-weight:normal;';
    const bgStyle = bg?`background:${bg};`:'';
    return `<tr>
      <td style="padding:2px 8px;font-size:8px;border:1px solid #ccc;${bStyle}${bgStyle};width:78%">${lbl}</td>
      <td style="padding:2px 6px;font-size:8px;border:1px solid #ccc;text-align:right;font-family:Courier New,monospace;${bStyle}${bgStyle};width:4%">$</td>
      <td style="padding:2px 8px;font-size:8px;border:1px solid #ccc;text-align:right;font-family:Courier New,monospace;${bStyle}${bgStyle};width:18%">${fN(val)}</td>
    </tr>`;
  };
  const seccion = (titulo) => `<tr><td colspan="3" style="padding:3px 8px;font-size:8.5px;font-weight:bold;background:#e8e8e8;border:1px solid #aaa">${titulo}</td></tr>`;
  const subsec  = (titulo) => `<tr><td colspan="3" style="padding:2px 8px;font-size:8px;font-style:italic;background:#f5f5f5;border:1px solid #ccc">${titulo}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Planilla Ganancias ${item.leg} ${periodoMM(liq)}</title>
  <style>
    @page{size:letter portrait;margin:12mm}
    body{margin:0;padding:8px;font-family:Arial,sans-serif;font-size:8px}
    table{width:100%;border-collapse:collapse}
    .no-print{margin-bottom:10px}
    @media print{.no-print{display:none}}
  </style></head><body>

  <div class="no-print">
    <button onclick="window.print()" style="padding:7px 16px;background:#1E6B3A;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;margin-right:8px">🖨 Imprimir / Guardar PDF</button>
    <span style="font-size:11px;color:#555">${item.nom} — Ganancias ${periodoMM(liq)} — ACUMULADO</span>
  </div>

  <!-- ENCABEZADO -->
  <table style="margin-bottom:10px">
    <tr>
      <td style="width:58%;vertical-align:top">
        <div style="font-size:10px;font-weight:bold;text-align:center;margin-bottom:4px">
          CONTROL DE LIQUIDACIÓN DEL IMPUESTO A LAS GANANCIAS<br>
          4ta. CATEGORÍA RELACIÓN DE DEPENDENCIA<br>
          <span style="font-size:8px;font-weight:normal">RG ARCA 4003/2017 — Liquidación acumulada Enero → ${meses[liq.mes-1]} ${liq.anio}</span>
        </div>
        <div style="font-size:8px;margin-bottom:2px"><b>Fecha:</b> ${liq.fechaPago||new Date().toLocaleDateString('es-AR')}</div>
        <div style="font-size:8px;margin-bottom:2px"><b>Beneficiario:</b> ${item.cuil||'—'}, ${item.nom}</div>
        <div style="font-size:8px;margin-bottom:2px"><b>Nro. de legajo:</b> ${item.leg}</div>
        <div style="font-size:8px"><b>Agente de retención:</b> ${ed.cuit}, ${item.empresa}</div>
      </td>
      <td style="width:42%;vertical-align:top">
        <table style="border-collapse:collapse;width:100%;font-size:8px">
          <tr>
            <td style="border:1px solid #999;padding:2px 6px;font-weight:bold;width:33%">PERIODO ABONADO</td>
            <td style="border:1px solid #999;padding:2px 6px;font-weight:bold;width:22%">LIQUIDACION</td>
            <td style="border:1px solid #999;padding:2px 6px;font-weight:bold">DESCRIPCION</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:2px 6px;text-align:center">${periodoMM(liq)}</td>
            <td style="border:1px solid #999;padding:2px 6px;text-align:center">${item.leg}</td>
            <td style="border:1px solid #999;padding:2px 6px">${mesNombre}</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:2px 6px;font-weight:bold">PERIODO FISCAL</td>
            <td colspan="2" style="border:1px solid #999;padding:2px 6px;font-weight:bold">MESES ACUMULADOS</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:2px 6px;text-align:center">${liq.anio}</td>
            <td colspan="2" style="border:1px solid #999;padding:2px 6px;text-align:center">${mesesTranscurridos} / 12 (${(propMes*100).toFixed(1)}%)</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:2px 6px;font-weight:bold">TIPO DE LIQUIDACION</td>
            <td colspan="2" style="border:1px solid #999;padding:2px 6px;font-weight:bold">FECHA</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:2px 6px;text-align:center">${tipoDesc}</td>
            <td colspan="2" style="border:1px solid #999;padding:2px 6px;text-align:center">${liq.fechaPago||''}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table>
    ${seccion('REMUNERACIONES GRAVADAS (ACUMULADO ENERO → '+meses[liq.mes-1].toUpperCase()+')')}
    ${subsec('Abonadas por el agente de retención')}
    ${row('Remuneración bruta y no habituales (acumulado)', remGravAcum - sacAcumTot)}
    ${row('SAC acumulado (RG 4003/17 Anexo II C.)', sacAcumTot)}
    ${row('Mes actual — Remuneración gravada', remMes - sacMes)}
    ${row('Mes actual — SAC', sacMes)}
    ${row('TOTAL REMUNERACIÓN GRAVADA ACUMULADA', remGravAcum, true, '#f0f0f0')}

    ${seccion('REMUNERACIONES EXENTAS / NO ALCANZADAS (mes actual)')}
    ${row('Horas extras exentas (Art. 82 LIG)', hsExtExentas)}
    ${row('Bono productividad exento', bonoExento)}
    ${row('Indemnizaciones Art. 180 bis', indemniz)}
    ${row('Otros conceptos exentos', otrosExentos)}
    ${row('TOTAL EXENTO MES', totalExento, true, '#f0f0f0')}

    ${seccion('DEDUCCIONES GENERALES (ACUMULADO)')}
    ${row('Aportes Jubilación ANSES (acumulado)', acum.dedGenAcum * 0.55 + $m(item.jubilacion))}
    ${row('Aportes Obra Social (acumulado)', dedGenAcum - (acum.dedGenAcum * 0.55 + $m(item.jubilacion)))}
    ${row('TOTAL APORTES EMPLEADO (acumulado)', dedGenAcum, true)}
    ${subsec(tieneSiradig
      ? 'Deducciones voluntarias con topes Art. 85 LIG aplicados (origen: SIRADIG F.572)'
      : 'Deducciones voluntarias — sin SIRADIG importado, no se aplican (Art. 85 LIG queda en $0)')}
    ${row('Cuotas Médico-Asistenciales (Art. 85 inc. f — tope 5% gan. neta)', dedVolTopadas.cuotasMedicas)}
    ${row('Honorarios Médicos y Paramédicos (Art. 85 inc. h — 40% facturado, tope 5% gan. neta)', dedVolTopadas.honorariosMedicos)}
    ${row('Seguros de Vida/Retiro (Art. 85 inc. b — tope combinado con primas muerte)', dedVolTopadas.seguroVida)}
    ${row('Primas de Seguro para caso de Muerte (Art. 85 inc. b)', dedVolTopadas.primaMuerte)}
    ${row('Gastos de Sepelio (Art. 85 inc. d — tope $'+fN(params.gan_topeGastosSepelio)+')', dedVolTopadas.gastosSepelio)}
    ${row('Donaciones (Art. 85 inc. c — tope '+params.gan_topePctDonaciones+'% gan. neta)', dedVolTopadas.donaciones)}
    ${row('Servicio Doméstico (Ley 26.063 — tope MNI anual)', dedVolTopadas.servDomestico)}
    ${row('Alquileres casa-habitación (Art. 85 inc. g — 40%, tope MNI)', dedVolTopadas.alquileres)}
    ${row('Intereses Créditos Hipotecarios (Art. 85 inc. a — tope $'+fN(params.gan_topeIntHipotecarios||0)+')', dedVolTopadas.intHipotecarios)}
    ${row('Educación / Herramientas cargas familia (Ley 27.743 — tope 40% MNI)', dedVolTopadas.educacion)}
    ${row('Aportes Cap.Soc./Fondo Riesgo SGR (Ley 24.467)', dedVolTopadas.aportesSGR)}
    ${row('TOTAL DEDUCCIONES VOLUNTARIAS', totalDedVol, true)}
    ${row('TOTAL DEDUCCIONES GENERALES', totDedGen, true, '#f0f0f0')}

    ${seccion('DEDUCCIONES PERSONALES (proporcional a '+mesesTranscurridos+'/12 meses)')}
    ${row('Ganancia No Imponible (MNI)', mniProp)}
    ${subsec(tieneSiradig
      ? 'Cargas de familia (Art. 30 inc. b LIG) — desglosadas (origen: SIRADIG F.572)'
      : 'Cargas de familia — sin SIRADIG importado, no se aplican (quedan en $0)')}
    ${row('Cónyuge/Conviviente'+(tieneConyuge?' ✓':''), cargaConyuge)}
    ${row('Hijos menores de 18 ('+nroHijos+')', cargaHijos)}
    ${row('Hijos incapacitados ('+nroHijosInc+')', cargaHijosInc)}
    ${row('Total Cargas de Familia', totalCargasFam, true)}
    ${row('Deducción Especial', dedEspProp)}
    ${row('Deducción Especial 2° párr. Art.30 (12va parte)', dedEsp2Prop)}
    ${row('Deducción Específica (jubilados)', dedEspecProp)}
    ${row('TOTAL DEDUCCIONES PERSONALES', totDedPers, true, '#f0f0f0')}

    ${seccion('DETERMINACIÓN DEL IMPUESTO (Art. 94 LIG)')}
    ${row('REMUNERACIÓN SUJETA A IMPUESTO (acumulada)', remSujeta, true)}
    ${row('Alícuota marginal aplicable', alicuota, false)}
    ${row('Tramo: hasta $'+(tramo?fN(tramo.hasta===Infinity?0:tramo.hasta):'—'), 0)}
    ${row('IMPUESTO DETERMINADO ACUMULADO', impDetAcum, true)}
    ${row('Impuesto retenido en períodos anteriores', acum.retenidoAcum)}
    ${row((impMes>=0?'RETENCIÓN':'DEVOLUCIÓN')+' DEL PERÍODO (automático)', Math.abs(impMes), true, '#e8e8e8')}
    ${row('Monto aplicado en el recibo'+(item.gananciasManual?' (HARDCODE manual)':''), impAplicado, item.gananciasManual)}
    ${row('DIFERENCIA acumulada al cierre (debe ser 0)', diferencia, true, diferencia===0?'#e0f0e0':'#ffe0e0')}
  </table>

  <div style="margin-top:12px;padding:8px;background:#fffae0;border:1px solid #f0d070;font-size:7.5px;color:#553">
    <b>NOTAS LEGALES — Impuesto a las Ganancias 4ª Categoría (Rel. Dependencia):</b><br>
    • Marco normativo: Ley 20.628 (t.o. 2019 y mod.), Ley 27.743/2024 "Paquete Fiscal", RG ARCA 4003/17 (ex AFIP).<br>
    • Liquidación acumulada desde enero del ejercicio fiscal (${acum.periodosAcumulados} períodos previos + mes actual).<br>
    • Deducciones personales (Art. 30) prorrateadas a ${mesesTranscurridos}/12 meses según RG 4003 Anexo II.<br>
    • Deducción Especial 2° párr. Art. 30: 1/12 de (MNI + Ded. Esp.) — corresponde al tratamiento del SAC.<br>
    • Topes Art. 85 LIG aplicados automáticamente. Montos sujetos a actualización semestral por RIPTE.<br>
    • Escala progresiva Art. 94 LIG — 9 tramos. Alícuota marginal aplicada: ${alicuota}%.<br>
    • <b>Valores del período:</b> ${params._ganPeriodo||'—'} (vigencia ${params._ganVigencia||'—'}) — ${params._ganRG||''}.${params._ganFallback?' <span style="color:#c00"><b>⚠ No hay datos específicos para el período de la fecha de pago — se usó el más reciente disponible.</b></span>':''}${params._ganRequiereVerif?' <span style="color:#c00"><b>⚠ Valores estimativos — verificar contra RG oficial.</b></span>':''}<br>
    • <b>Estado F.572 SIRADIG:</b> ${tieneSiradig
      ? `<span style="color:#0a0">✓ importado el ${new Date(nov._importadoSiradig).toLocaleDateString('es-AR')}</span> — se aplican cargas de familia y deducciones voluntarias declaradas.`
      : `<span style="color:#c00"><b>⚠ No importado</b></span> — solo se aplican Ganancia No Imponible y Deducción Especial. Cargas de familia y deducciones voluntarias quedan en $0 hasta que el empleado presente F.572.`}<br>
    • Cargas de familia${tieneSiradig?'':' (s/SIRADIG, ignoradas)'}: ${tieneConyuge?'cónyuge ✓ ':''}${nroHijos?nroHijos+' hijo/s menor/es ':''}${nroHijosInc?nroHijosInc+' hijo/s incapacitado/s':''}${!tieneConyuge && !nroHijos && !nroHijosInc ? 'ninguna':''}.
  </div>

  </body></html>`;
}

async function exportarGanancias(){
  const liq = liqReporteContext(); if(!liq) return;
  const params = getLiqParams();
  const conGan = liq.items.filter(i => $m(i.totalHaberes) > 0);
  if(!conGan.length){ toast('⚠ No hay empleados en esta liquidación','var(--yellow)'); return; }

  const novsMap = _novedadesActuales || {};

  // Si uno solo → abrir directo
  if(conGan.length === 1){
    const html = await planillaGananciasHTML(conGan[0], liq, params, novsMap[conGan[0].leg] || {});
    const w = window.open('','_blank'); w.document.write(html); w.document.close();
    return;
  }

  // Selector para múltiples
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const mesLabel = (meses[liq.mes-1] || '') + ' ' + liq.anio;

  const selHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Planilla Ganancias — Seleccionar</title>
  <style>body{font-family:Arial,sans-serif;font-size:13px;padding:20px;background:#1a1a2e;color:#e0e0e0}
  .btn{padding:10px 14px;margin:4px 0;background:#1E6B3A;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;width:100%;text-align:left;display:block}
  .btn:hover{background:#2a8a50}
  .title{font-size:16px;font-weight:bold;margin-bottom:14px;color:#7ee8a2}
  .search{width:100%;padding:8px;margin-bottom:10px;background:#222;border:1px solid #555;color:#fff;border-radius:4px;font-size:13px}
  </style></head><body>
  <div class="title">Planilla de Ganancias — ${mesLabel}</div>
  <input id="search" class="search" placeholder="Buscar empleado..." oninput="filterEmps(this.value)">
  <button onclick="window.close()" style="padding:6px 12px;background:#555;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;margin-bottom:14px">✕ Cerrar</button>
  <div id="list">${conGan.map(i =>
    `<button class="btn" data-leg="${i.leg}" data-nom="${i.nom.replace(/"/g,'&quot;')}" onclick="abrirPlanilla('${i.leg}')">${i.leg} — ${i.nom} — ${i.empresa}</button>`
  ).join('')}</div>
  <script>
  const liqData=${JSON.stringify(liq)};
  const paramsData=${JSON.stringify(params)};
  const novsData=${JSON.stringify(novsMap)};
  function $m(n){return isNaN(n)||n===null?0:parseFloat(n)||0;}
  function filterEmps(q){
    const ql = (q||'').toLowerCase();
    document.querySelectorAll('#list .btn').forEach(b=>{
      const match = !ql || (b.dataset.leg+' '+b.dataset.nom).toLowerCase().includes(ql);
      b.style.display = match ? 'block' : 'none';
    });
  }
  function abrirPlanilla(leg){
    window.opener.abrirPlanillaGanancias(leg);
  }
  <\\/script></body></html>`;

  // Exponer función en window para que el pop-up la pueda llamar
  window.abrirPlanillaGanancias = async function(leg){
    const item = liq.items.find(x=>x.leg===leg);
    if(!item) return;
    const html = await planillaGananciasHTML(item, liq, params, novsMap[leg] || {});
    const w = window.open('','_blank'); w.document.write(html); w.document.close();
  };

  const w = window.open('','_blank'); w.document.write(selHtml); w.document.close();
}

// ── Parámetros ────────────────────────────────────────────────────
let _ganPeriodoEditando = null; // clave del semestre que está en el form

function cargarParamsForm(){
  const p=getLiqParams();
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  // Sección General/Aportes (no Ganancias)
  set('par-jub',p.pctJubilacion); set('par-os',p.pctObraSocial); set('par-anssal',p.pctAnssal);
  set('par-pami-emp',p.pctPamiEmp); set('par-sind-emp',p.pctSindicatoEmp); set('par-sind-nom',p.nombreSindicato);
  set('par-jub-p',p.pctJubPatronal); set('par-os-p',p.pctOsPatronal); set('par-pami-p',p.pctPamiPatronal);
  set('par-des',p.pctDesempleo); set('par-art',p.pctArt); set('par-sind-p',p.pctSindicatoPatronal);
  set('par-pres',p.pctPresentismo); set('par-antig',p.pctAntiguedadPorAnio);
  set('par-smvm',p.smvmMensual||0);
  set('par-f931topejub', p.f931TopeJub||0);
  set('par-f931topeos',  p.f931TopeOS||0);
  set('par-cbu',p.cbuEmpresa||''); set('par-banco',p.bancoEmpresa||'');
  // Asignaciones no remunerativas por sindicato (Art. 103 bis LCT)
  const _asig = p.asignacionNoRemPorSindicato || {};
  set('par-asig-sec',      _asig.SEC      || 0);
  set('par-asig-uom',      _asig.UOM      || 0);
  set('par-asig-plastico', _asig.PLASTICO || 0);
  set('par-asig-asimra',   _asig.ASIMRA   || 0);
  set('par-asig-fc',       _asig.FC       || 0);
  // % topes estables
  set('par-gan-pct-honor',p.gan_topePctHonorariosMed);
  set('par-gan-pct-honor-gn',p.gan_topePctHonorariosMedGanNeta);
  set('par-gan-pct-donac',p.gan_topePctDonaciones);
  set('par-gan-pct-alq',p.gan_pctAlquilerDeducible);
  set('par-gan-pct-edu',p.gan_pctEducacionMni);

  // Poblar selector de semestres
  const periodos = getGanParamsPorSemestre();
  const claves = Object.keys(periodos).sort().reverse(); // más recientes primero
  const sel = document.getElementById('gan-periodo-sel');
  if(sel){
    const hoy = resolveGanParamsParaFecha(new Date())._periodo;
    const claveDefault = claves.includes(hoy) ? hoy : claves[0];
    sel.innerHTML = claves.map(k => {
      const r = periodos[k];
      const vig = r._requiereVerificacion ? ' ⚠' : '';
      return `<option value="${k}"${k===claveDefault?' selected':''}>${k} — ${r._nombre||k}${vig}</option>`;
    }).join('');
    _ganPeriodoEditando = claveDefault;
    cargarGanPeriodoForm();
  }

  // Poblar selector de meses de topes de aportes (Art. 9 Ley 24.241)
  poblarSelectorAportes();
}

function cargarGanPeriodoForm(){
  const sel = document.getElementById('gan-periodo-sel');
  if(!sel) return;
  _ganPeriodoEditando = sel.value;
  const periodos = getGanParamsPorSemestre();
  const r = periodos[_ganPeriodoEditando];
  if(!r) return;

  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  set('par-gan-mni', r.mniAnual);
  set('par-gan-dedEsp', r.dedEspAnual);
  set('par-gan-dedEsp2', r.dedEsp2Anual);
  set('par-gan-dedEsp-jub', r.dedEspecifica);
  set('par-gan-conyuge', r.cargaConyugeAnual);
  set('par-gan-hijo', r.cargaHijoAnual);
  set('par-gan-hijo-inc', r.cargaHijoIncAnual);
  set('par-gan-tope-seguros', r.topeSeguroVida);
  set('par-gan-tope-sepelio', r.topeGastosSepelio);
  set('par-gan-tope-hipot', r.topeIntHipotecarios);

  // Info box
  const info = document.getElementById('gan-periodo-info');
  if(info){
    const verif = r._requiereVerificacion
      ? `<span style="color:var(--yellow)">⚠ Valores estimativos — verificar contra RG oficial</span>`
      : `<span style="color:var(--green)">✓ Valores verificados</span>`;
    info.innerHTML = `<strong>Vigencia:</strong> ${r._vigenciaDesde||'—'} → ${r._vigenciaHasta||'—'} · <strong>RG:</strong> ${r._rg||'—'} · ${verif}`;
  }

  // Render escala editor
  renderEscalaEditor(r.escala || []);
}

async function renderEscalaEditor(escala){
  const cont = document.getElementById('gan-escala-editor');
  if(!cont) return;
  const thS='padding:6px 8px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;text-align:left;border-bottom:1px solid var(--border);letter-spacing:.05em';
  const tdS='padding:4px 6px;border-bottom:1px solid var(--border);vertical-align:middle';
  const inpS='width:140px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono)';
  const inpAli='width:60px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:5px 8px;color:var(--t1);font-size:12px;outline:none;font-family:var(--font-mono);text-align:right';

  cont.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="${thS}">#</th>
      <th style="${thS}">Desde ($)</th>
      <th style="${thS}">Hasta ($)</th>
      <th style="${thS}">Fijo ($)</th>
      <th style="${thS}">Alícuota (%)</th>
    </tr></thead>
    <tbody>
      ${escala.map((t,i)=>`
        <tr>
          <td style="${tdS};color:var(--t3);font-family:var(--font-mono)">${i+1}</td>
          <td style="${tdS}"><input type="number" step="0.01" class="gan-esc-desde" data-idx="${i}" value="${t.desde}" style="${inpS}"></td>
          <td style="${tdS}"><input type="text" class="gan-esc-hasta" data-idx="${i}" value="${t.hasta===Infinity?'Infinito':t.hasta}" style="${inpS}"></td>
          <td style="${tdS}"><input type="number" step="0.01" class="gan-esc-fijo" data-idx="${i}" value="${t.fijo}" style="${inpS}"></td>
          <td style="${tdS}"><input type="number" step="0.01" class="gan-esc-ali" data-idx="${i}" value="${t.alicuota}" style="${inpAli}"></td>
        </tr>`).join('')}
    </tbody></table>`;
}

async function leerEscalaFromEditor(){
  const desdes = document.querySelectorAll('.gan-esc-desde');
  const hastas = document.querySelectorAll('.gan-esc-hasta');
  const fijos  = document.querySelectorAll('.gan-esc-fijo');
  const alis   = document.querySelectorAll('.gan-esc-ali');
  const escala = [];
  for(let i=0;i<desdes.length;i++){
    const hastaVal = hastas[i].value;
    const esInfinito = /^(inf|infinito|\u221E)/i.test(hastaVal.trim()) || hastaVal==='';
    escala.push({
      desde: parseFloat(desdes[i].value)||0,
      hasta: esInfinito ? Infinity : parseFloat(hastaVal)||0,
      fijo:  parseFloat(fijos[i].value)||0,
      alicuota: parseFloat(alis[i].value)||0
    });
  }
  return escala;
}

async function agregarNuevoPeriodoGan(){
  const clave = await showPrompt({titulo:'Clave del período',mensaje:'Mensual: YYYY-MM (ej: 2026-03) — recomendado · Semestral: YYYY-S1 / YYYY-S2',placeholder:'2026-03',valorDefault:'',labelOk:'Continuar'});
  if(!clave) return;
  const esMensual   = /^\d{4}-(0[1-9]|1[0-2])$/.test(clave);
  const esSemestral = /^\d{4}-S[12]$/.test(clave);
  if(!esMensual && !esSemestral){ toast('⚠ Formato inválido (YYYY-MM o YYYY-S1/S2)','var(--yellow)'); return; }
  const periodos = getGanParamsPorSemestre();
  if(periodos[clave]){ toast('⚠ Ese período ya existe','var(--yellow)'); return; }
  // Base: la tabla vigente al inicio del nuevo período (arranca de los valores en uso)
  const mesEff = _ganClaveAMesEfectivo(clave);
  const anterior = resolveGanParamsParaFecha(mesEff + '-01');
  const anio = clave.split('-')[0];
  let _nombre, vDesde, vHasta;
  if(esMensual){
    const mm = clave.split('-')[1];
    const ult = new Date(Number(anio), Number(mm), 0).getDate(); // último día del mes
    _nombre = `Mes ${mm}/${anio}`;
    vDesde = `${anio}-${mm}-01`;
    vHasta = `${anio}-${mm}-${String(ult).padStart(2,'0')}`;
  } else {
    const sem = clave.split('-')[1];
    _nombre = `${sem==='S1'?'1° semestre ':'2° semestre '}${anio}`;
    vDesde = sem==='S1' ? `${anio}-01-01` : `${anio}-07-01`;
    vHasta = sem==='S1' ? `${anio}-06-30` : `${anio}-12-31`;
  }
  const nuevo = {
    ...anterior,
    _nombre, _vigenciaDesde: vDesde, _vigenciaHasta: vHasta,
    _rg: 'PENDIENTE DE CARGA', _requiereVerificacion: true
  };
  delete nuevo._periodo; delete nuevo._fallback; delete nuevo._vigencia; // limpiar metadatos de resolución
  periodos[clave] = nuevo;
  saveGanParamsPorSemestre(periodos);
  toast(`✓ Período ${clave} agregado (copia del vigente) — ajustá los valores`,'var(--green)');
  cargarParamsForm(); // refrescar selector
  document.getElementById('gan-periodo-sel').value = clave;
  cargarGanPeriodoForm();
}

async function restablecerPeriodoGan(){
  if(!_ganPeriodoEditando) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Restaurar los valores default para ${_ganPeriodoEditando}? Se perderán las ediciones locales.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const periodos = getGanParamsPorSemestre();
  const defaults = getDefaultGanParamsPorSemestre();
  if(defaults[_ganPeriodoEditando]){
    periodos[_ganPeriodoEditando] = defaults[_ganPeriodoEditando];
  } else {
    delete periodos[_ganPeriodoEditando];
  }
  saveGanParamsPorSemestre(periodos);
  toast('✓ Valores default restablecidos','var(--green)');
  cargarGanPeriodoForm();
}

// ═══════════════════════════════════════════════════════════════
// TOPES DE APORTES — form handlers
// ═══════════════════════════════════════════════════════════════
let _aportesMesEditando = null;

async function poblarSelectorAportes(){
  const sel = document.getElementById('aportes-mes-sel');
  if(!sel) return;
  const todos = getAportesTopesPorMes();
  const claves = Object.keys(todos).sort().reverse();
  const hoy = new Date();
  const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
  const claveDefault = claves.includes(claveHoy) ? claveHoy : claves[0];
  sel.innerHTML = claves.map(k => {
    const r = todos[k];
    const verif = r._requiereVerificacion ? ' ⚠' : '';
    return `<option value="${k}"${k===claveDefault?' selected':''}>${k} — ${r._rg||''}${verif}</option>`;
  }).join('');
  _aportesMesEditando = claveDefault;
  cargarAportesMesForm();
}

async function cargarAportesMesForm(){
  const sel = document.getElementById('aportes-mes-sel');
  if(!sel) return;
  _aportesMesEditando = sel.value;
  const todos = getAportesTopesPorMes();
  const r = todos[_aportesMesEditando];
  if(!r) return;
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  set('par-aportes-min', r.topeMin);
  set('par-aportes-max', r.topeMax);
  const info = document.getElementById('aportes-mes-info');
  if(info){
    const verif = r._requiereVerificacion
      ? `<span style="color:var(--yellow)">⚠ Valor estimativo — verificar contra RG oficial</span>`
      : `<span style="color:var(--green)">✓ Valores verificados</span>`;
    info.innerHTML = `<strong>Mes:</strong> ${_aportesMesEditando} · <strong>RG:</strong> ${r._rg||'—'} · ${verif}`;
  }
}

async function agregarNuevoMesAportes(){
  const clave = await showPrompt({titulo:'Clave del mes',mensaje:'Formato: YYYY-MM (ej: 2026-07)',placeholder:'2026-07',valorDefault:'2026-07',labelOk:'Continuar'});
  if(!clave || !/^\d{4}-(0[1-9]|1[0-2])$/.test(clave)){ toast('⚠ Formato inválido (usar YYYY-MM)','var(--yellow)'); return; }
  const todos = getAportesTopesPorMes();
  if(todos[clave]){ toast('⚠ Ese mes ya existe','var(--yellow)'); return; }
  const claves = Object.keys(todos).sort();
  const anterior = todos[claves[claves.length-1]];
  todos[clave] = { ...anterior, _rg:'PENDIENTE DE CARGA', _requiereVerificacion: true };
  saveAportesTopesPorMes(todos);
  toast(`✓ Mes ${clave} agregado (copia del anterior) — ajustá los valores`,'var(--green)');
  poblarSelectorAportes();
  document.getElementById('aportes-mes-sel').value = clave;
  cargarAportesMesForm();
}

async function restablecerMesAportes(){
  if(!_aportesMesEditando) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Restaurar los topes default para ${_aportesMesEditando}?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const todos = getAportesTopesPorMes();
  const defaults = getDefaultAportesTopesPorMes();
  if(defaults[_aportesMesEditando]){
    todos[_aportesMesEditando] = defaults[_aportesMesEditando];
  } else {
    delete todos[_aportesMesEditando];
  }
  saveAportesTopesPorMes(todos);
  toast('✓ Valores default restablecidos','var(--green)');
  cargarAportesMesForm();
}

// ═════════════════════════════════════════════════════════════
// IMPORTACIÓN MASIVA DE TOPES DE APORTES
// Permite cargar varios meses de una tabla CSV/TSV/Excel
// ═════════════════════════════════════════════════════════════
function abrirImportTopesAportes(){
  const overlay = document.createElement('div');
  overlay.id = 'topes-import-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = (e) => { if(e.target===overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:24px;max-width:900px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--t1)">📥 Importación masiva · Topes Aportes Art. 9 Ley 24.241</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:3px">Cargá varios meses de una sola vez</div>
        </div>
        <button onclick="document.getElementById('topes-import-modal').remove()" style="background:none;border:1px solid var(--border);color:var(--t2);border-radius:4px;padding:4px 10px;cursor:pointer">✕</button>
      </div>

      <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
        <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">📋 Dónde conseguir los datos oficiales</div>
        <div style="font-size:11px;color:var(--t2);line-height:1.7;margin-bottom:10px">
          Los topes se publican mensualmente por RG ARCA. Las fuentes oficiales son:
          <ul style="margin:6px 0 0 20px;padding:0;color:var(--t3)">
            <li><strong style="color:var(--t1)">ARCA · Empleadores</strong> → Tabla de Bases Imponibles Mínimas y Máximas SIPA</li>
            <li><strong style="color:var(--t1)">InfoLEG / BORA</strong> → RG ARCA mensuales (buscar "bases imponibles")</li>
            <li><strong style="color:var(--t1)">ANSES</strong> → publicación mensual de MOPREs vigentes</li>
          </ul>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="https://www.arca.gob.ar/empleadores/documentos/topes-aportes.asp" target="_blank" rel="noopener" style="padding:6px 12px;background:var(--accent);color:white;text-decoration:none;border-radius:4px;font-size:11px;font-family:var(--font-mono)">🔗 ARCA · Tabla Topes SIPA</a>
          <a href="https://www.argentina.gob.ar/anses/empresas-y-empleadores/bases-imponibles" target="_blank" rel="noopener" style="padding:6px 12px;background:var(--bg1);color:var(--accent2);border:1px solid var(--border);text-decoration:none;border-radius:4px;font-size:11px;font-family:var(--font-mono)">🔗 ANSES · Bases Imponibles</a>
          <a href="https://biblioteca.afip.gob.ar/" target="_blank" rel="noopener" style="padding:6px 12px;background:var(--bg1);color:var(--accent2);border:1px solid var(--border);text-decoration:none;border-radius:4px;font-size:11px;font-family:var(--font-mono)">🔗 Biblioteca ARCA (RG)</a>
        </div>
      </div>

      <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
        <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">Pegá la tabla (formato CSV/TSV)</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:8px;line-height:1.6">
          Una fila por mes. Columnas: <strong style="color:var(--t2)">mes;tope_min;tope_max[;rg]</strong> (separador: coma, punto y coma o tab).<br>
          Podés copiar directamente desde Excel o Google Sheets. Los montos pueden tener puntos o comas como separador.
        </div>
        <textarea id="topes-import-text" rows="12" placeholder="2026-01;123010,43;3693624,51;RG ARCA 5710/2026
2026-02;125470,64;3767497,00;RG ARCA 5715/2026
2026-03;127980,05;3842846,94;RG ARCA 5720/2026
..."
          style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:10px;color:var(--t1);font-size:12px;font-family:var(--font-mono);outline:none;resize:vertical"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap">
          <label style="font-size:11px;color:var(--t2);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="topes-import-sobrescribir" checked style="accent-color:var(--accent)">
            Sobrescribir meses que ya existen
          </label>
          <div style="display:flex;gap:8px">
            <button onclick="previewTopesImport()" class="btn btn-ghost" style="font-size:12px;padding:7px 14px">Vista previa →</button>
          </div>
        </div>
      </div>

      <div id="topes-import-preview" style="display:none"></div>
    </div>`;

  document.body.appendChild(overlay);
}

function parseTopesImport(text){
  const lineas = text.trim().split(/\r?\n/).filter(l => l.trim());
  const resultado = [];
  const errores = [];

  lineas.forEach((linea, idx) => {
    // Detectar separador: tab, ; o ,
    let cols;
    if(linea.includes('\t'))      cols = linea.split('\t');
    else if(linea.includes(';'))  cols = linea.split(';');
    else                          cols = linea.split(',');
    cols = cols.map(c => c.trim());

    if(cols.length < 3){
      errores.push(`Línea ${idx+1}: no tiene 3+ columnas`);
      return;
    }

    const [mesRaw, minRaw, maxRaw, rg] = cols;
    // Validar mes YYYY-MM
    const mes = mesRaw.trim();
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)){
      errores.push(`Línea ${idx+1}: mes inválido "${mesRaw}" (formato: YYYY-MM)`);
      return;
    }
    // Parsear números: eliminar puntos de miles y convertir coma decimal a punto
    const normNum = (s) => {
      s = (s||'').replace(/[^\d,.\-]/g,'');
      // Si tiene coma decimal Y puntos de miles: puntos fuera, coma→punto
      if(s.indexOf(',') > s.lastIndexOf('.')){
        s = s.replace(/\./g,'').replace(',','.');
      } else if(s.split('.').length > 2){
        s = s.replace(/\./g,'');
      }
      return parseFloat(s);
    };
    const topeMin = normNum(minRaw);
    const topeMax = normNum(maxRaw);
    if(isNaN(topeMin) || isNaN(topeMax)){
      errores.push(`Línea ${idx+1}: valores numéricos inválidos`);
      return;
    }
    if(topeMin < 0 || topeMax < 0 || topeMin > topeMax){
      errores.push(`Línea ${idx+1}: valores incoherentes (min=${topeMin}, max=${topeMax})`);
      return;
    }
    resultado.push({ mes, topeMin, topeMax, rg: (rg||'').trim() });
  });

  return { filas: resultado, errores };
}

function previewTopesImport(){
  const text = document.getElementById('topes-import-text').value;
  if(!text.trim()){ toast('⚠ Pegá al menos una fila','var(--yellow)'); return; }

  const { filas, errores } = parseTopesImport(text);
  const div = document.getElementById('topes-import-preview');
  if(!div) return;
  div.style.display = 'block';

  const existentes = getAportesTopesPorMes();
  const fmt = n => n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const filasHTML = filas.map(f => {
    const yaExiste = !!existentes[f.mes];
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">${f.mes}${yaExiste?' <span style="font-size:9px;color:var(--yellow)">EXISTE</span>':''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px;text-align:right">$${fmt(f.topeMin)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px;text-align:right">$${fmt(f.topeMax)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11px;color:var(--t3)">${f.rg||'—'}</td>
    </tr>`;
  }).join('');

  div.innerHTML = `
    <div style="padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:var(--accent2);margin-bottom:8px">✓ Vista previa — ${filas.length} meses válidos${errores.length?`, ${errores.length} errores`:''}</div>
      ${errores.length ? `<div style="padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:4px;margin-bottom:10px;font-size:11px;color:var(--red)">
        <strong>Errores:</strong><br>${errores.join('<br>')}
      </div>`:''}
      ${filas.length ? `<div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:4px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="position:sticky;top:0;background:var(--bg2)">
            <th style="padding:6px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;border-bottom:1px solid var(--border)">Mes</th>
            <th style="padding:6px 10px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;border-bottom:1px solid var(--border)">Tope mín</th>
            <th style="padding:6px 10px;text-align:right;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;border-bottom:1px solid var(--border)">Tope máx</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;border-bottom:1px solid var(--border)">RG</th>
          </tr></thead>
          <tbody>${filasHTML}</tbody>
        </table>
      </div>`:''}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button onclick="document.getElementById('topes-import-modal').remove()" class="btn btn-ghost" style="font-size:12px;padding:7px 14px">Cancelar</button>
      ${filas.length?`<button onclick="aplicarImportTopes()" class="btn btn-primary" style="font-size:12px;padding:7px 14px">✓ Aplicar ${filas.length} meses</button>`:''}
    </div>`;
}

function aplicarImportTopes(){
  const text = document.getElementById('topes-import-text').value;
  const sobrescribir = document.getElementById('topes-import-sobrescribir')?.checked;
  const { filas } = parseTopesImport(text);
  if(!filas.length){ toast('⚠ Nada para importar','var(--yellow)'); return; }

  const existentes = getAportesTopesPorMes();
  let agregados = 0, actualizados = 0, omitidos = 0;

  filas.forEach(f => {
    const ya = existentes[f.mes];
    if(ya && !sobrescribir){ omitidos++; return; }
    existentes[f.mes] = {
      topeMin: f.topeMin,
      topeMax: f.topeMax,
      _rg: f.rg || (ya?._rg || ''),
      _requiereVerificacion: false  // viene del usuario → asumimos verificado
    };
    if(ya) actualizados++; else agregados++;
  });

  saveAportesTopesPorMes(existentes);
  document.getElementById('topes-import-modal')?.remove();
  toast(`✓ Topes importados · ${agregados} nuevos, ${actualizados} actualizados${omitidos?`, ${omitidos} omitidos`:''}`,'var(--green)',5000);
  poblarSelectorAportes();
}

function guardarLiqParams(){
  const gv=(id)=>parseFloat(document.getElementById(id)?.value)||0;
  const gs=(id)=>document.getElementById(id)?.value||'';

  // ── 1. Guardar params generales (estables) ──
  const actual = getLiqParams();
  const p = { ...actual,
    pctJubilacion:gv('par-jub'), pctObraSocial:gv('par-os'), pctAnssal:gv('par-anssal'),
    pctPamiEmp:gv('par-pami-emp'), pctSindicatoEmp:gv('par-sind-emp'), nombreSindicato:gs('par-sind-nom'),
    pctJubPatronal:gv('par-jub-p'), pctOsPatronal:gv('par-os-p'), pctPamiPatronal:gv('par-pami-p'),
    pctDesempleo:gv('par-des'), pctArt:gv('par-art'), pctSindicatoPatronal:gv('par-sind-p'),
    pctPresentismo:gv('par-pres'), pctAntiguedadPorAnio:gv('par-antig'),
    smvmMensual: gv('par-smvm') || actual.smvmMensual,
    f931TopeJub: gv('par-f931topejub') || actual.f931TopeJub || 0,
    f931TopeOS:  gv('par-f931topeos')  || actual.f931TopeOS  || 0,
    cbuEmpresa:gs('par-cbu'), bancoEmpresa:gs('par-banco'),
    // Asignaciones no remunerativas por paritaria (Art. 103 bis LCT)
    asignacionNoRemPorSindicato: {
      SEC:      gv('par-asig-sec'),
      UOM:      gv('par-asig-uom'),
      PLASTICO: gv('par-asig-plastico'),
      ASIMRA:   gv('par-asig-asimra'),
      FC:       gv('par-asig-fc')
    },
    gan_topePctHonorariosMed: gv('par-gan-pct-honor') || actual.gan_topePctHonorariosMed,
    gan_topePctHonorariosMedGanNeta: gv('par-gan-pct-honor-gn') || actual.gan_topePctHonorariosMedGanNeta,
    gan_topePctDonaciones: gv('par-gan-pct-donac') || actual.gan_topePctDonaciones,
    gan_pctAlquilerDeducible: gv('par-gan-pct-alq') || actual.gan_pctAlquilerDeducible,
    gan_pctEducacionMni: gv('par-gan-pct-edu') || actual.gan_pctEducacionMni
  };
  saveLiqParams(p);

  // ── 2. Guardar el semestre que se está editando ──
  if(_ganPeriodoEditando){
    const periodos = getGanParamsPorSemestre();
    const r = periodos[_ganPeriodoEditando] || {};
    periodos[_ganPeriodoEditando] = {
      ...r,
      mniAnual:           gv('par-gan-mni')         || r.mniAnual,
      dedEspAnual:        gv('par-gan-dedEsp')      || r.dedEspAnual,
      dedEsp2Anual:       gv('par-gan-dedEsp2')     || r.dedEsp2Anual,
      dedEspecifica:      gv('par-gan-dedEsp-jub'),
      cargaConyugeAnual:  gv('par-gan-conyuge')     || r.cargaConyugeAnual,
      cargaHijoAnual:     gv('par-gan-hijo')        || r.cargaHijoAnual,
      cargaHijoIncAnual:  gv('par-gan-hijo-inc')    || r.cargaHijoIncAnual,
      topeSeguroVida:     gv('par-gan-tope-seguros')|| r.topeSeguroVida,
      topeGastosSepelio:  gv('par-gan-tope-sepelio')|| r.topeGastosSepelio,
      topeIntHipotecarios:gv('par-gan-tope-hipot')  || r.topeIntHipotecarios,
      escala: leerEscalaFromEditor()
    };
    saveGanParamsPorSemestre(periodos);
    toast(`✓ Parámetros guardados · Semestre ${_ganPeriodoEditando} actualizado`,'var(--green)',3500);
  } else {
    toast('✓ Parámetros guardados','var(--green)');
  }

  // ── 3. Guardar el mes de topes de aportes editado ──
  if(_aportesMesEditando){
    const todosT = getAportesTopesPorMes();
    const rT = todosT[_aportesMesEditando] || {};
    const nuevoMin = gv('par-aportes-min');
    const nuevoMax = gv('par-aportes-max');
    if(nuevoMin || nuevoMax){
      todosT[_aportesMesEditando] = {
        ...rT,
        topeMin: nuevoMin || rT.topeMin,
        topeMax: nuevoMax || rT.topeMax
      };
      saveAportesTopesPorMes(todosT);
    }
  }
}

// ── Abrir reportes desde liquidación activa ───────────────────────
function abrirReportesLiq(id){
  getLiquidaciones().then(lista=>{
    _liqActiva=lista.find(l=>l.id===id);
    if(!_liqActiva) return;
    const t=document.getElementById('liq-reportes-titulo');
    if(t) t.textContent=`Reportes — ${_liqActiva.periodo} (${_liqActiva.empresa==='todas'?'Todas':_liqActiva.empresa})`;
    liqTab('reportes');
  });
}


// ═══════════════════════════════════════════════════════════════
// PUBLICACIÓN DE GANANCIAS AL PORTAL DEL EMPLEADO
// Genera PDF de la planilla de retención de cada empleado y lo
// guarda en el IDB (store 'ganancias') para que el empleado lo
// vea y descargue desde "Mis Documentos".
// Requiere: liq aprobada, jsPDF, html2canvas.
// ═══════════════════════════════════════════════════════════════
async function publicarGananciasPDF(){
  const liq = liqReporteContext ? liqReporteContext() : _liqActiva;
  if(!liq){ toast('⚠ Sin liquidación activa','var(--yellow)'); return; }
  if(liq.estado === 'borrador'){
    toast('⚠ Aprobá la liquidación antes de publicar','var(--yellow)'); return;
  }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH.','var(--red)'); return; }
  if(typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined'){
    toast('⚠ jsPDF no disponible — recargá la página','var(--yellow)'); return;
  }
  if(typeof window.html2canvas !== 'function'){
    toast('⚠ html2canvas no disponible — recargá la página','var(--yellow)'); return;
  }

  const params  = getLiqParams();
  const novsMap = _novedadesActuales || {};
  const items   = (liq.items || []).filter(i => ($m(i.totalHaberes)||0) > 0);
  if(!items.length){ toast('⚠ Sin empleados en la liquidación','var(--yellow)'); return; }

  const _cfm = await showConfirm({ titulo:'Confirmar', labelOk:'Confirmar',
    mensaje:`¿Publicar planilla de retención de ganancias para <strong>${items.length}</strong> empleado${items.length!==1?'s':''} del período <strong>${liq.periodo}</strong>?<br><br>Cada empleado podrá verla y descargarla desde su portal.`, peligroso:false });
  if(!_cfm) return;

  // Modal de progreso (mismo patrón que publicarRecibosPDF)
  const overlay = document.createElement('div');
  overlay.id = 'modal-publicar-ganancias';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:560px;width:100%">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">🧾 Publicando planillas de ganancias</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">Período ${liq.periodo} · ${items.length} empleados</div>
      </div>
      <div style="padding:22px">
        <div id="pub-gan-progress" style="font-size:12px;color:var(--t1);margin-bottom:10px;font-family:var(--font-mono)">Iniciando...</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:99px;height:10px;overflow:hidden">
          <div id="pub-gan-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2));height:100%;width:0%;transition:width .2s"></div>
        </div>
        <div id="pub-gan-detail" style="font-size:10px;color:var(--t3);margin-top:8px;font-family:var(--font-mono);min-height:14px"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const elProg   = document.getElementById('pub-gan-progress');
  const elBar    = document.getElementById('pub-gan-bar');
  const elDetail = document.getElementById('pub-gan-detail');

  const { jsPDF } = window.jspdf || window;
  let exitos = 0, fallas = 0;
  const errores = [];

  for(let i = 0; i < items.length; i++){
    const item = items[i];
    elBar.style.width = Math.round((i / items.length) * 100) + '%';
    elProg.textContent = `${i+1} / ${items.length} · ${item.nom?.split(',')[0] || item.leg}`;

    try {
      const html = await planillaGananciasHTML(item, liq, params, novsMap[item.leg] || {});

      // Render off-screen
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;background:#fff;padding:12px;font-family:Arial,sans-serif;font-size:11px';
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);

      let base64, sizeKB;
      try {
        const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
        const canvas = await window.html2canvas(tempDiv, { scale:1.5, useCORS:true, backgroundColor:'#ffffff' });
        if(!canvas.width || !canvas.height) throw new Error('html2canvas devolvió canvas vacío');
        const pageW = 210, pageH = 297, margin = 8;
        const drawW = pageW - margin * 2;
        // Altura de un "slice" de canvas que cabe en una página A4 (en píxeles de canvas)
        const pxPorPagina = Math.floor(canvas.width * (pageH - margin*2) / drawW);
        let srcY = 0;
        let pagina = 0;
        while(srcY < canvas.height){
          const sliceH = Math.min(pxPorPagina, canvas.height - srcY);
          if(sliceH <= 0) break;
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width  = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, -srcY);
          const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.82);
          const sliceDrawH = (sliceH * drawW) / canvas.width;
          if(pagina > 0) pdf.addPage();
          pdf.addImage(sliceImg, 'JPEG', margin, margin, drawW, sliceDrawH);
          srcY += sliceH;
          pagina++;
        }
        const blob = pdf.output('blob');
        sizeKB = Math.round(blob.size / 1024);
        base64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(blob); });
      } finally {
        tempDiv.remove();
      }

      const key = `${item.leg}_${liq.periodo}`;
      await setGanancia(key, {
        key, leg: item.leg, nom: item.nom || '', emp: item.empresa || '',
        periodo: liq.periodo, data: base64,
        uploadedAt: new Date().toLocaleString('es-AR'),
        uploadedBy: currentUser?.emp?.nom || 'RRHH',
        liqId: liq.id
      });

      exitos++;
      elDetail.textContent = `✓ ${item.leg} (${sizeKB} KB)`;
    } catch(err){
      fallas++;
      errores.push(`${item.leg} ${item.nom?.split(',')[0]||''}: ${err.message||String(err)}`);
      elDetail.textContent = `✕ ${item.leg}: ${err.message||String(err)}`;
    }

    if(i % 3 === 0) await new Promise(res => setTimeout(res, 30));
  }

  elBar.style.width = '100%';
  elProg.innerHTML = `<strong style="color:${fallas?'var(--yellow)':'var(--green)'}">${fallas?'⚠':'✓'}</strong> ${exitos} de ${items.length} publicados${fallas?` · ${fallas} fallaron`:''}`;
  elDetail.innerHTML = '';

  // Persistir flag en la liquidación
  liq._gananciaPublicadas = { exitos, fallas, fecha: new Date().toISOString(), por: currentUser?.emp?.nom || 'RRHH' };
  if(typeof updateLiquidacion === 'function') await updateLiquidacion(liq);

  // Audit
  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'ganancias_publicadas', { liqId: liq.id, periodo: liq.periodo, exitos, fallas, por: currentUser?.emp?.nom });
  }

  const card = overlay.querySelector('.card');
  const footer = document.createElement('div');
  footer.style.cssText = 'padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end';
  footer.innerHTML = `
    ${errores.length ? `<button class="btn btn-ghost" onclick="showAlert('Errores:\\n\\n'+${JSON.stringify(errores)}.join('\\n'),'error')" style="font-size:12px;padding:7px 14px;color:var(--yellow);border-color:rgba(234,179,8,.3)">Ver ${errores.length} error${errores.length!==1?'es':''}</button>` : ''}
    <button class="btn btn-primary" onclick="document.getElementById('modal-publicar-ganancias').remove()" style="font-size:13px;padding:8px 18px">Listo</button>`;
  card.appendChild(footer);
}
