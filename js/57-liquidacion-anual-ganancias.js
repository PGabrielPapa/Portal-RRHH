/* ═══════════════════════════════════════════════════════════════════════════
   LIQUIDACIÓN ANUAL DEL IMPUESTO A LAS GANANCIAS — 4ta categoría
   Art. 21 inc. a) RG ARCA 4003/2017 y modif. (RG 5683/2025 → F.1359 v2.0)

   - Se practica al 31/12 del ejercicio N; se imputa con los haberes de abril N+1.
   - Reconstruye el acumulado DEFINITIVO del ejercicio (12 meses + SAC + no
     habituales) desde las liquidaciones aprobadas del año.
   - Usa los montos ANUALES (sin prorrateo) y SIN el tope mensual de retención
     (Art. 7 inc. c). Incorpora el SIRADIG vigente (F.572 al 31/03).
   - Calcula la diferencia (con signo): >0 retención adicional, <0 devolución,
     y la deja persistida para imputarla como concepto en la liquidación de abril.
   - Genera el certificado y el archivo TXT del F.1359 v2.0 para ARCA.

   Reutiliza helpers globales: $m, getLiquidaciones, resolveGanParamsParaFecha,
   buildParamsConPeriodo, calcImpuestoEscala, aplicarTopesArt85,
   getDatosEmpresaLiq / EMPRESA_DATOS_LIQ, getNomina/getEmpleados.
   ═══════════════════════════════════════════════════════════════════════════ */

const LIQ_ANUAL_GAN_KEY = 'leiten_liq_anual_gan_v1';

// ── Persistencia de resultados (para imputar la diferencia en abril N+1) ──
function getLiqAnualGanStore(){
  try { return JSON.parse(localStorage.getItem(LIQ_ANUAL_GAN_KEY) || '{}'); }
  catch(e){ return {}; }
}
function saveLiqAnualGanStore(obj){
  try { localStorage.setItem(LIQ_ANUAL_GAN_KEY, JSON.stringify(obj)); } catch(e){}
}
// Diferencia pendiente de imputar para un empleado y ejercicio fiscal.
// Devuelve null si no hay liquidación anual guardada para ese (leg, año).
function getAjusteAnualGanParaAbril(leg, anioFiscal){
  const store = getLiqAnualGanStore();
  const ej = store[String(anioFiscal)];
  if(!ej) return null;
  const r = ej[String(leg)];
  if(!r) return null;
  return r; // { diferencia, impuestoDet, retenidoAnual, ... }
}

// ── Mapeo alícuota Art. 94 → código Tabla 3 del F.1359 ──
function _f1359AlicuotaCod(alic){
  const m = { 0:'00', 5:'01', 9:'02', 12:'03', 15:'04', 19:'05', 23:'06', 27:'07', 31:'08', 35:'09' };
  return m[Math.round(alic)] !== undefined ? m[Math.round(alic)] : '00';
}

// ═══════════════════════════════════════════════════════════════════════════
//  CÁLCULO DE LA LIQUIDACIÓN ANUAL PARA UN EMPLEADO
// ═══════════════════════════════════════════════════════════════════════════
// emp: objeto de nómina (leg, nom, cuil, empresa, ...)
// anioFiscal: ejercicio a cerrar (N)
// liquidaciones: lista ya cargada de liquidaciones (para no releer N veces)
// novFinal: novedad con el SIRADIG definitivo (cargas/deducciones al 31/03)
async function calcLiquidacionAnualGan(emp, anioFiscal, liquidaciones, novFinal){
  novFinal = novFinal || {};
  const leg = emp.leg;

  // 1) Reunir todas las liquidaciones APROBADAS del ejercicio para el empleado
  const delAnio = (liquidaciones || []).filter(l =>
    l.estado === 'aprobada' && l.anio === anioFiscal &&
    (l.items || []).some(i => i.leg === leg)
  ).sort((a,b)=> (a.mes||0)-(b.mes||0));

  let remGravadaTotal = 0, sac1 = 0, sac2 = 0, noHabituales = 0;
  let jubilacion = 0, obraSocial = 0, anssal = 0, pamiEmp = 0, sindicato = 0;
  let retenidoAnual = 0, exentosTotal = 0, indemnizaciones = 0;
  const mesesConRem = new Set();

  for(const l of delAnio){
    const it = l.items.find(i => i.leg === leg);
    if(!it) continue;
    const remMes = $m(it.totalHaberesRem !== undefined ? it.totalHaberesRem : it.totalHaberes);
    const sacMes = $m(it.mSac);
    remGravadaTotal += remMes;
    if(l.mes <= 6 || l.tipo === 'sac1') sac1 += sacMes; else sac2 += sacMes;
    jubilacion += $m(it.jubilacion);
    obraSocial += $m(it.obraSocial);
    anssal     += $m(it.anssal);
    pamiEmp    += $m(it.pamiEmp);
    sindicato  += $m(it.sindicato);
    retenidoAnual += $m(it.ganancias);   // con signo (neg = devoluciones del año)
    exentosTotal  += $m(it.totalExentos);
    indemnizaciones += $m(it._nov?.indemnizaciones) + $m(it.indemnizaciones);
    if(remMes > 0) mesesConRem.add(l.mes);
  }
  // Remuneración bruta habitual = total gravada − SAC (no separamos "no habituales")
  const remBrutaHabitual = Math.max(0, remGravadaTotal - sac1 - sac2 - noHabituales);

  // 2) Parámetros ANUALES vigentes al cierre del ejercicio (31/12/N), montos
  //    anuales completos (sin prorrateo) y SIN tope mensual de retención.
  const params = buildParamsConPeriodo(getLiqParams(), `${anioFiscal}-12-01`);

  // 3) Deducciones generales (aportes obligatorios + voluntarias SIRADIG)
  const tieneSiradig = !!novFinal._importadoSiradig;
  const dedVolRaw = tieneSiradig ? (novFinal.dedVoluntarias || {}) : {};
  // Ganancia neta provisoria para topes Art. 85 (gravada − aportes obligatorios)
  const aportesOblig = jubilacion + obraSocial + anssal + pamiEmp + sindicato;
  const ganNetaProv = Math.max(0, remGravadaTotal - aportesOblig);
  const dedVolTopadas = (typeof aplicarTopesArt85 === 'function')
    ? aplicarTopesArt85(dedVolRaw, ganNetaProv, params) : {};
  const totalDedVol = Object.values(dedVolTopadas).reduce((s,v)=>s+$m(v),0);
  const totalDedGen = aportesOblig + totalDedVol;

  // 4) Deducciones Art. 30 (montos ANUALES; cargas solo si SIRADIG)
  const mni      = $m(params.gan_mniAnual);
  const dedEsp   = $m(params.gan_dedEspAnual);
  const dedEsp2  = $m(params.gan_dedEsp2Anual);   // 12ava parte (2º párrafo Art. 30)
  const dedEspec = $m(params.gan_dedEspecifica);  // jubilados/pensionados
  const tieneConyuge = tieneSiradig && !!novFinal.tieneConyuge;
  const nroHijos     = tieneSiradig ? (parseInt(novFinal.nroHijosMenores)||0) : 0;
  const nroHijosInc  = tieneSiradig ? (parseInt(novFinal.nroHijosIncapacitados)||0) : 0;
  const cargaConyuge  = tieneConyuge ? $m(params.gan_cargaConyugeAnual) : 0;
  const cargaHijos    = nroHijos    * $m(params.gan_cargaHijoAnual);
  const cargaHijosInc = nroHijosInc * $m(params.gan_cargaHijoIncAnual);
  const totalCargasFam = cargaConyuge + cargaHijos + cargaHijosInc;
  const totalDedArt30 = mni + dedEsp + dedEsp2 + dedEspec + totalCargasFam;

  // 5) Remuneración sujeta, impuesto determinado anual y diferencia
  const remSujeta = Math.max(0, remGravadaTotal - totalDedGen - totalDedArt30);
  const { impuesto: impuestoDet, alicuota } = await calcImpuestoEscala(remSujeta, params);
  const diferencia = impuestoDet - retenidoAnual; // >0 retener / <0 devolver

  return {
    leg, cuil: emp.cuil || '', nom: emp.nom || '', empresa: emp.empresa || emp.emp || '',
    anioFiscal,
    mesesTrabajados: Math.min(12, mesesConRem.size || delAnio.length || 0),
    periodosAprobados: delAnio.length,
    // Remuneraciones
    remBrutaHabitual, sac1, sac2, noHabituales, remGravadaTotal,
    exentosTotal, indemnizaciones,
    // Deducciones generales
    jubilacion, obraSocial: obraSocial + anssal, sindicato, pamiEmp,
    dedVolTopadas, totalDedVol, totalDedGen,
    // Deducciones Art. 30
    mni, dedEsp, dedEsp2, dedEspec,
    nroHijos, nroHijosInc, tieneConyuge, cargaConyuge, cargaHijos, cargaHijosInc,
    totalCargasFam, totalDedArt30, tieneSiradig,
    // Determinación
    remSujeta, alicuota, alicuotaCod: _f1359AlicuotaCod(alicuota),
    impuestoDet, retenidoAnual, diferencia,
    paramsPeriodo: params._ganPeriodo, paramsVigencia: params._ganVigencia,
    requiereVerif: !!params._ganRequiereVerif
  };
}

// Calcula la liquidación anual para TODA la nómina de un ejercicio.
async function calcLiquidacionAnualGanTodos(anioFiscal, empresaFiltro){
  const nomina = (typeof getNomina === 'function') ? await getNomina()
               : (typeof getEmpleados === 'function' ? await getEmpleados() : []);
  const liquidaciones = await getLiquidaciones();
  const novedades = (typeof getNovedadesUltimas === 'function') ? await getNovedadesUltimas() : {};
  const resultados = [];
  for(const emp of nomina){
    if(empresaFiltro && (emp.empresa || emp.emp) !== empresaFiltro) continue;
    // ¿el empleado tuvo actividad gravable en el ejercicio?
    const tuvo = liquidaciones.some(l => l.estado==='aprobada' && l.anio===anioFiscal &&
      (l.items||[]).some(i => i.leg===emp.leg));
    if(!tuvo) continue;
    // SIRADIG definitivo: última novedad conocida del empleado
    const novFinal = (novedades && novedades[emp.leg]) ? novedades[emp.leg] : _buscarUltimaNov(liquidaciones, emp.leg, anioFiscal);
    const r = await calcLiquidacionAnualGan(emp, anioFiscal, liquidaciones, novFinal);
    resultados.push(r);
  }
  return resultados;
}

// Busca la última novedad conocida del empleado (para tomar el SIRADIG vigente)
function _buscarUltimaNov(liquidaciones, leg, anioFiscal){
  let nov = {};
  const ls = liquidaciones.filter(l => (l.items||[]).some(i=>i.leg===leg))
    .sort((a,b)=> (b.anio*100+b.mes)-(a.anio*100+a.mes));
  for(const l of ls){
    const it = (l.items||[]).find(i=>i.leg===leg);
    if(it && it._nov && it._nov._importadoSiradig){ return it._nov; }
    if(it && it._nov && !nov._importadoSiradig) nov = it._nov;
  }
  return nov;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PERSISTIR para imputación en abril
// ═══════════════════════════════════════════════════════════════════════════
function guardarLiqAnualParaAbril(anioFiscal, resultados){
  const store = getLiqAnualGanStore();
  const ej = {};
  for(const r of resultados){
    ej[String(r.leg)] = {
      diferencia: +(r.diferencia.toFixed(2)),
      impuestoDet: +(r.impuestoDet.toFixed(2)),
      retenidoAnual: +(r.retenidoAnual.toFixed(2)),
      remSujeta: +(r.remSujeta.toFixed(2)),
      fechaCalculo: new Date().toISOString()
    };
  }
  store[String(anioFiscal)] = ej;
  saveLiqAnualGanStore(store);
}

// ═══════════════════════════════════════════════════════════════════════════
//  GENERACIÓN DEL ARCHIVO TXT — F.1359 v2.0 (RG 5683/2025)
//  Ancho fijo. Numéricos: centavos, alineados a derecha, relleno de ceros.
//  Alfanuméricos: alineados a izquierda, relleno de espacios.
// ═══════════════════════════════════════════════════════════════════════════
function _f1359Num(val, len){
  // Importe en centavos, sin signo (los saldos negativos se exportan en valor
  // absoluto; el signo de devolución se marca aparte — ver advertencia en UI).
  const cent = Math.round(Math.abs($m(val)) * 100);
  return String(cent).padStart(len, '0').slice(-len);
}
function _f1359Int(val, len){
  const n = Math.max(0, Math.round($m(val)));
  return String(n).padStart(len, '0').slice(-len);
}
function _f1359Alfa(str, len){
  return String(str == null ? '' : str).padEnd(len, ' ').slice(0, len);
}
function _f1359Cuit(cuit){
  const d = String(cuit || '').replace(/\D/g, '');
  return d.padStart(11, '0').slice(-11);
}
function _f1359Fecha(d){ // Date|string → AAAAMMDD
  const dt = (d instanceof Date) ? d : new Date(String(d));
  if(isNaN(dt.getTime())) return '00000000';
  return `${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
}

// Genera el contenido TXT (string) del F.1359 anual para una empresa (agente).
function generarF1359Txt(anioFiscal, empresaNombre, resultados, opts){
  opts = opts || {};
  const datosEmp = (typeof getEmpresaDatos === 'function')
    ? getEmpresaDatos(empresaNombre)
    : (EMPRESA_DATOS_LIQ[empresaNombre] || {cuit:''});
  const cuitAgente = _f1359Cuit(datosEmp.cuit);
  const periodo = `${anioFiscal}00`;            // ANUAL = AAAA00
  const secuencia = String(opts.secuencia || 0).padStart(2, '0'); // 00 = original
  const tipoPresent = '1';                       // 1 = ANUAL (Tabla 1)
  const lineas = [];

  // ── Registro 01 — Cabecera (38) ──
  lineas.push(
    '01' + cuitAgente + _f1359Alfa(periodo,6) + secuencia +
    '0103' + '593' + '1359' + tipoPresent + '00200'
  );

  const delEmp = resultados.filter(r => (r.empresa === empresaNombre));
  for(const r of delEmp){
    const cuil = _f1359Cuit(r.cuil);
    const desde = `${anioFiscal}0101`;
    const hasta = `${anioFiscal}1231`;
    const meses = _f1359Int(r.mesesTrabajados || 12, 2);

    // ── Registro 02 — Datos del trabajador (36) ──
    lineas.push(
      '02' + cuil + desde + hasta + meses +
      (r.dedEspec > 0 ? '2' : '1') +   // Beneficio: 2 = jubilado/pensionado, 1 = sin
      '0' + '0' + '0' + '0'            // pozo, actor, cautelar, poder judicial
    );

    // ── Registro 03 — Remuneraciones Gravadas (178) ──
    const totalRemGravada = r.remBrutaHabitual + r.noHabituales + r.sac1 + r.sac2;
    lineas.push(
      '03' + cuil +
      _f1359Num(r.remBrutaHabitual,15) + _f1359Num(r.noHabituales,15) +
      _f1359Num(r.sac1,15) + _f1359Num(r.sac2,15) +
      _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) + // otros empleos
      _f1359Num(0,15) + _f1359Num(0,15) +                                      // ajustes
      _f1359Num(totalRemGravada,15)
    );

    // ── Registro 04 — Remuneraciones Exentas / No Alcanzadas (313) ──
    // Solo mapeamos indemnizaciones (inc c,d,e). Otros exentos quedan informados
    // en cero (ver advertencia en UI: no afectan la determinación del impuesto).
    const indem = r.indemnizaciones || 0;
    const totalExento = indem;
    const totalRemun = totalRemGravada + totalExento;
    lineas.push(
      '04' + cuil +
      _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(indem,15) + _f1359Num(0,15) +
      _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) +
      _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) +
      _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) + _f1359Num(0,15) +
      _f1359Num(totalExento,15) + _f1359Num(totalRemun,15) +
      _f1359Num(0,15) + _f1359Num(0,15)
    );

    // ── Registro 05 — Deducciones Generales (478) ──
    const dv = r.dedVolTopadas || {};
    const cuotaMed   = $m(dv.cuotaMedica);
    const segMuerte  = $m(dv.seguroVida);
    const sepelio    = $m(dv.gastosSepelio);
    const donaciones = $m(dv.donaciones);
    const alq40      = $m(dv.alquileres);          // inc h) 40%
    const honMed     = $m(dv.honorariosMedicos);
    const hipot      = $m(dv.interesesHipotecarios);
    const domestico  = $m(dv.servicioDomestico);
    const educacion  = $m(dv.educacion);
    const totalDedGen = r.totalDedGen;
    lineas.push(
      '05' + cuil +
      _f1359Num(r.jubilacion,15) + _f1359Num(0,15) +     // 3,4 ANSES jub (agente/otros)
      _f1359Num(0,15) + _f1359Num(0,15) +                // 5,6 cajas prov.
      _f1359Num(r.obraSocial,15) + _f1359Num(0,15) +     // 7,8 obra social (+ANSSAL)
      _f1359Num(r.sindicato,15) + _f1359Num(0,15) +      // 9,10 sindicato
      _f1359Num(cuotaMed,15) +                           // 11 cuota médico asist.
      _f1359Num(segMuerte,15) +                          // 12 primas seguro muerte
      _f1359Num(0,15) +                                  // 13 seguro mixto SSN
      _f1359Num(0,15) +                                  // 14 FCI retiro
      _f1359Num(sepelio,15) +                            // 15 gastos sepelio
      _f1359Num(0,15) +                                  // 16 rodados viajantes
      _f1359Num(donaciones,15) +                         // 17 donaciones
      _f1359Num(alq40,15) +                              // 18 alquileres 40% inc h
      _f1359Num(r.pamiEmp,15) +                          // 19 descuentos obligatorios ley (PAMI 19.032)
      _f1359Num(honMed,15) +                             // 20 honorarios médicos
      _f1359Num(hipot,15) +                              // 21 intereses hipotecarios
      _f1359Num(0,15) +                                  // 22 SGR
      _f1359Num(domestico,15) +                          // 23 servicio doméstico
      _f1359Num(0,15) +                                  // 24 cajas complementarias
      _f1359Num(0,15) +                                  // 25 fondos compensadores
      _f1359Num(0,15) +                                  // 26 otros aportes
      _f1359Num(0,15) +                                  // 27 seguro retiro privado
      _f1359Num(0,15) +                                  // 28 indumentaria
      _f1359Num(educacion,15) +                          // 29 educación cargas
      _f1359Num(0,15) +                                  // 30 alquileres 10% inc k
      _f1359Num(0,15) +                                  // 31 Antártida
      _f1359Num(0,15) +                                  // 32 actores representantes
      _f1359Num(totalDedGen,15)                          // 33 TOTAL
    );

    // ── Registro 06 — Deducciones Art. 30 (160) ──
    lineas.push(
      '06' + cuil +
      _f1359Num(r.mni,15) +
      _f1359Num(r.cargaConyuge,15) +
      _f1359Int(0,2) + _f1359Int(r.nroHijos,2) + _f1359Num(r.cargaHijos,15) +
      _f1359Int(0,2) + _f1359Int(r.nroHijosInc,2) + _f1359Num(r.cargaHijosInc,15) +
      _f1359Num(r.totalCargasFam,15) +
      _f1359Num(r.dedEsp,15) + _f1359Num(r.dedEsp2,15) + _f1359Num(r.dedEspec,15) +
      _f1359Num(r.totalDedArt30,15) +
      _f1359Int(0,2) + _f1359Int(0,2)
    );

    // ── Registro 07 — Pagos a Cuenta (178) — sin percepciones ──
    lineas.push('07' + cuil + Array(11).fill(_f1359Num(0,15)).join('') );

    // ── Registro 08 — Cálculo del Impuesto (105) ──
    // Saldo determinado con signo real para auditoría; en el TXT, valor absoluto.
    const subtotal = r.impuestoDet - r.retenidoAnual;
    lineas.push(
      '08' + cuil +
      _f1359Num(r.remSujeta,15) +
      _f1359Alfa(r.alicuotaCod,2) +
      _f1359Num(r.impuestoDet,15) +
      _f1359Num(r.retenidoAnual,15) +
      _f1359Num(subtotal,15) +
      _f1359Num(0,15) +              // autoretención RG 5683
      _f1359Num(subtotal,15)        // saldo determinado (= subtotal, sin pagos a cuenta)
    );
  }
  return { texto: lineas.join('\r\n'), nombre: `F1359.${cuitAgente}.${periodo}.0000.txt`, cantEmpleados: delEmp.length };
}

function descargarF1359Txt(anioFiscal, empresaNombre, resultados){
  const { texto, nombre, cantEmpleados } = generarF1359Txt(anioFiscal, empresaNombre, resultados);
  if(cantEmpleados === 0){ if(typeof toast==='function') toast('⚠ No hay empleados de esa empresa en el ejercicio','var(--yellow)'); return; }
  const blob = new Blob([texto], { type: 'text/plain;charset=ascii' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  if(typeof toast==='function') toast(`✓ F.1359 generado: ${cantEmpleados} trabajador(es)`,'var(--green)');
}

// ═══════════════════════════════════════════════════════════════════════════
//  CERTIFICADO (HTML imprimible) — formato del manual F.1359
// ═══════════════════════════════════════════════════════════════════════════
// Cuerpo del certificado (sin wrapper de página ni botón) — reutilizable en
// la ventana de impresión y en la generación de PDF para puesta a disposición.
function _certAnualBody(r, empresaNombre){
  const datosEmp = (typeof getEmpresaDatos === 'function') ? getEmpresaDatos(empresaNombre)
                 : (EMPRESA_DATOS_LIQ[empresaNombre] || {cuit:''});
  const f = (n)=> (typeof fmtPesos==='function') ? fmtPesos(n) : '$ '+($m(n)).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const row = (label, val, bold, bg)=>`<tr><td style="padding:3px 8px;${bold?'font-weight:700':''};${bg?`background:${bg}`:''}">${label}</td><td style="padding:3px 8px;text-align:right;font-family:monospace;${bold?'font-weight:700':''};${bg?`background:${bg}`:''}">${val}</td></tr>`;
  const esDev = r.diferencia < 0;
  const saldoLabel = esDev ? 'SALDO A FAVOR DEL TRABAJADOR (devolución)' : 'SALDO A PAGAR (retención adicional)';
  return `<style>.cert{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;max-width:820px}
  .cert h1{font-size:15px;text-align:center;margin:0 0 4px}.cert h2{font-size:12px;background:#1E6B3A;color:#fff;padding:4px 8px;margin:14px 0 0}
  .cert table{width:100%;border-collapse:collapse;margin:0}.cert .muted{color:#555;font-size:11px}
  .cert .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1E6B3A;padding-bottom:6px;margin-bottom:8px}</style>
  <div class="cert">
  <h1>LIQUIDACIÓN DE IMPUESTO A LAS GANANCIAS — 4ta. CATEGORÍA RELACIÓN DE DEPENDENCIA</h1>
  <div class="muted" style="text-align:center;margin-bottom:8px">F.1359 v2.0 — Art. 21 inc. a) RG ARCA 4003/2017 (mod. RG 5683/2025) — Período Fiscal ${r.anioFiscal}</div>
  <div class="hdr"><div><strong>Beneficiario:</strong> ${r.nom}<br><span class="muted">CUIL ${r.cuil} · Legajo ${r.leg} · Meses trabajados: ${r.mesesTrabajados}</span></div>
  <div style="text-align:right"><strong>Agente de Retención:</strong> ${empresaNombre}<br><span class="muted">CUIT ${datosEmp.cuit||'—'}</span></div></div>

  <h2>REMUNERACIONES GRAVADAS</h2><table>
  ${row('Remuneración bruta y no habituales', f(r.remBrutaHabitual + r.noHabituales))}
  ${row('SAC (1ª + 2ª cuota)', f(r.sac1 + r.sac2))}
  ${row('TOTAL REMUNERACIÓN GRAVADA', f(r.remGravadaTotal), true, '#eef5ef')}</table>

  <h2>DEDUCCIONES GENERALES</h2><table>
  ${row('Aportes jubilatorios (SIPA)', f(r.jubilacion))}
  ${row('Aportes Obra Social (+ ANSSAL)', f(r.obraSocial))}
  ${row('Ley 19.032 / PAMI', f(r.pamiEmp))}
  ${row('Cuota sindical', f(r.sindicato))}
  ${row('Deducciones voluntarias Art. 85 (SIRADIG, topeadas)', f(r.totalDedVol))}
  ${row('TOTAL DEDUCCIONES GENERALES', f(r.totalDedGen), true, '#eef5ef')}</table>

  <h2>DEDUCCIONES PERSONALES (Art. 30)</h2><table>
  ${row('Ganancia No Imponible', f(r.mni))}
  ${row('Cargas de familia'+(r.tieneSiradig?'':' (sin SIRADIG → $0)'), f(r.totalCargasFam))}
  ${row('Deducción Especial', f(r.dedEsp))}
  ${row('Deducción Especial 2º párrafo (12ª parte)', f(r.dedEsp2))}
  ${r.dedEspec>0?row('Deducción Específica (jub./pens.)', f(r.dedEspec)):''}
  ${row('TOTAL DEDUCCIONES ART. 30', f(r.totalDedArt30), true, '#eef5ef')}</table>

  <h2>DETERMINACIÓN DEL IMPUESTO</h2><table>
  ${row('REMUNERACIÓN SUJETA A IMPUESTO', f(r.remSujeta), true)}
  ${row('Alícuota marginal Art. 94 LIG', r.alicuota+' %')}
  ${row('IMPUESTO DETERMINADO ANUAL', f(r.impuestoDet), true)}
  ${row('Impuesto retenido durante el ejercicio', f(r.retenidoAnual))}
  ${row(saldoLabel, f(Math.abs(r.diferencia)), true, esDev?'#e0f0e0':'#ffe9e9')}</table>

  <p class="muted" style="margin-top:14px">Montos anuales del período ${r.paramsPeriodo||'—'} (vigencia ${r.paramsVigencia||'—'}).${r.requiereVerif?' ⚠ Valores de tabla marcados como estimativos — verificar contra RG oficial.':''} El saldo se imputa con los haberes de abril ${r.anioFiscal+1} (Art. 21 RG 4003/2017).</p>
  </div>`;
}

function generarCertificadoAnualHTML(r, empresaNombre){
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Liquidación Anual Ganancias ${r.anioFiscal} — ${r.nom}</title>
  <style>body{margin:24px}@media print{.noprint{display:none}}</style></head><body>
  <button class="noprint" onclick="window.print()" style="padding:7px 16px;background:#1E6B3A;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-bottom:10px">🖨 Imprimir / Guardar PDF</button>
  ${_certAnualBody(r, empresaNombre)}
  </body></html>`;
}

function abrirCertificadoAnual(leg){
  if(!window._liqAnualResultados){ if(typeof toast==='function') toast('⚠ Primero calculá la liquidación anual','var(--yellow)'); return; }
  const r = window._liqAnualResultados.find(x => String(x.leg)===String(leg));
  if(!r) return;
  const html = generarCertificadoAnualHTML(r, r.empresa);
  const w = window.open('', '_blank'); w.document.write(html); w.document.close();
}

// ═══════════════════════════════════════════════════════════════════════════
//  PUESTA A DISPOSICIÓN AL EMPLEADO — publica el certificado anual como PDF en
//  el store 'ganancias' (mismo circuito que publicarGananciasPDF mensual).
// ═══════════════════════════════════════════════════════════════════════════
async function publicarCertificadosAnuales(){
  const res = window._liqAnualResultados, anio = window._liqAnualAnio;
  if(!res || !res.length || !anio){ if(typeof toast==='function') toast('⚠ Primero calculá la liquidación anual','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ if(typeof toast==='function') toast('⚠ Solo RR.HH.','var(--red)'); return; }
  if(typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined'){ toast('⚠ jsPDF no disponible — recargá la página','var(--yellow)'); return; }
  if(typeof window.html2canvas !== 'function'){ toast('⚠ html2canvas no disponible — recargá la página','var(--yellow)'); return; }
  if(typeof setGanancia !== 'function'){ toast('⚠ Store de ganancias no disponible','var(--red)'); return; }

  const _cfm = (typeof showConfirm === 'function') ? await showConfirm({ titulo:'Confirmar', labelOk:'Publicar',
    mensaje:`¿Publicar el certificado de liquidación anual ${anio} para <strong>${res.length}</strong> empleado${res.length!==1?'s':''}?<br><br>Cada empleado podrá verlo y descargarlo desde su portal de Ganancias.`, peligroso:false })
    : confirm(`¿Publicar certificado anual ${anio} para ${res.length} empleados?`);
  if(!_cfm) return;

  // Modal de progreso
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.innerHTML = `<div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:560px;width:100%">
    <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2)"><div style="font-size:14px;font-weight:600;color:var(--t1)">📅 Publicando certificados anuales ${anio}</div></div>
    <div style="padding:22px">
      <div id="pub-lag-prog" style="font-size:12px;color:var(--t1);margin-bottom:10px;font-family:var(--font-mono)">Iniciando…</div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:99px;height:10px;overflow:hidden"><div id="pub-lag-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2));height:100%;width:0%;transition:width .2s"></div></div>
      <div id="pub-lag-detail" style="font-size:10px;color:var(--t3);margin-top:8px;font-family:var(--font-mono);min-height:14px"></div>
    </div></div>`;
  document.body.appendChild(overlay);
  const elProg=document.getElementById('pub-lag-prog'), elBar=document.getElementById('pub-lag-bar'), elDetail=document.getElementById('pub-lag-detail');

  const { jsPDF } = window.jspdf || window;
  let exitos=0, fallas=0; const errores=[];
  const periodoLabelAnual = `${anio} (Liquidación Anual)`;

  for(let i=0;i<res.length;i++){
    const r = res[i];
    elBar.style.width = Math.round((i/res.length)*100)+'%';
    elProg.textContent = `${i+1} / ${res.length} · ${r.nom?.split(',')[0] || r.leg}`;
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;background:#fff;padding:16px';
    tempDiv.innerHTML = _certAnualBody(r, r.empresa);
    document.body.appendChild(tempDiv);
    try {
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const canvas = await window.html2canvas(tempDiv, { scale:1.5, useCORS:true, backgroundColor:'#ffffff' });
      if(!canvas.width || !canvas.height) throw new Error('canvas vacío');
      const pageH=297, margin=8, drawW=210-margin*2;
      const pxPorPagina = Math.floor(canvas.width * (pageH - margin*2) / drawW);
      let srcY=0, pagina=0;
      while(srcY < canvas.height){
        const sliceH = Math.min(pxPorPagina, canvas.height - srcY);
        if(sliceH<=0) break;
        const sc = document.createElement('canvas'); sc.width=canvas.width; sc.height=sliceH;
        sc.getContext('2d').drawImage(canvas, 0, -srcY);
        const img = sc.toDataURL('image/jpeg', 0.82);
        const drawH = (sliceH * drawW)/canvas.width;
        if(pagina>0) pdf.addPage();
        pdf.addImage(img,'JPEG',margin,margin,drawW,drawH);
        srcY += sliceH; pagina++;
      }
      const blob = pdf.output('blob');
      const base64 = await new Promise((rs,rj)=>{ const fr=new FileReader(); fr.onload=()=>rs(fr.result.split(',')[1]); fr.onerror=rj; fr.readAsDataURL(blob); });
      const key = `${r.leg}_LA${anio}`;   // LA = Liquidación Anual (no colisiona con períodos mensuales AAAA-MM)
      await setGanancia(key, { key, leg: r.leg, nom: r.nom||'', emp: r.empresa||'',
        periodo: periodoLabelAnual, tipoDoc: 'anual', anioFiscal: anio, data: base64,
        uploadedAt: new Date().toLocaleString('es-AR'), uploadedBy: currentUser?.emp?.nom || 'RRHH' });
      exitos++; elDetail.textContent = `✓ ${r.leg}`;
    } catch(err){ fallas++; errores.push(`${r.leg}: ${err.message||err}`); elDetail.textContent = `✕ ${r.leg}: ${err.message||err}`; }
    finally { tempDiv.remove(); }
    if(i%3===0) await new Promise(rs=>setTimeout(rs,30));
  }

  elBar.style.width='100%';
  elProg.innerHTML = `<strong style="color:${fallas?'var(--yellow)':'var(--green)'}">${fallas?'⚠':'✓'}</strong> ${exitos} de ${res.length} publicados${fallas?` · ${fallas} fallaron`:''}`;
  if(typeof logAuditX === 'function') logAuditX('liquidacion','ganancias_anual_publicada',{ anioFiscal:anio, exitos, fallas, por: currentUser?.emp?.nom });
  setTimeout(()=>overlay.remove(), 1800);
  if(typeof toast==='function') toast(`✓ Certificado anual ${anio} publicado a ${exitos} empleado(s)`, fallas?'var(--yellow)':'var(--green)');
}

// ═══════════════════════════════════════════════════════════════════════════
//  UI DEL MÓDULO
// ═══════════════════════════════════════════════════════════════════════════
async function renderLiqAnualGan(){
  const cont = document.getElementById('rrhh-sub-lic-anual-gan');
  if(!cont) return;
  const hoy = new Date();
  const anioDefault = hoy.getFullYear() - 1; // ejercicio cerrado
  const empresas = (typeof EMPRESA_DATOS_LIQ === 'object') ? Object.keys(EMPRESA_DATOS_LIQ) : [];
  const aniosOpts = [anioDefault+1, anioDefault, anioDefault-1, anioDefault-2]
    .map(a=>`<option value="${a}" ${a===anioDefault?'selected':''}>${a}</option>`).join('');
  const empOpts = ['<option value="">Todas</option>'].concat(empresas.map(e=>`<option value="${e}">${e}</option>`)).join('');

  const _volver = `<button onclick="navRRHH(null)" style="display:inline-flex;align-items:center;gap:6px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t2);font-size:12px;cursor:pointer;padding:6px 14px;margin:18px 0 0 18px;font-family:var(--font-mono)">← Volver al panel</button>`;
  cont.innerHTML = _volver + `
  <div style="padding:18px">
    <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:4px">Liquidación Anual del Impuesto a las Ganancias — 4ta categoría</div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:16px;line-height:1.5">Art. 21 inc. a) RG ARCA 4003/2017 (mod. RG 5683/2025 → F.1359 v2.0). Reconstruye el acumulado definitivo del ejercicio, determina el impuesto anual sin tope mensual, calcula la diferencia y la deja lista para imputarse en los haberes de abril del año siguiente.</div>
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px">EJERCICIO FISCAL</label>
        <select id="lag-anio" style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--t1);font-size:13px">${aniosOpts}</select></div>
      <div><label style="font-size:10px;color:var(--t3);display:block;margin-bottom:3px">EMPRESA</label>
        <select id="lag-emp" style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--t1);font-size:13px">${empOpts}</select></div>
      <button onclick="ejecutarLiqAnualGan()" style="padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500">Calcular liquidación anual</button>
    </div>
    <div id="lag-resultado"></div>
  </div>`;
}

async function ejecutarLiqAnualGan(){
  const anio = parseInt(document.getElementById('lag-anio').value);
  const emp  = document.getElementById('lag-emp').value || null;
  const cont = document.getElementById('lag-resultado');
  cont.innerHTML = `<div style="padding:20px;color:var(--t3)">Calculando…</div>`;
  try {
    const res = await calcLiquidacionAnualGanTodos(anio, emp);
    window._liqAnualResultados = res;
    window._liqAnualAnio = anio;
    if(!res.length){ cont.innerHTML = `<div style="padding:20px;color:var(--yellow)">No hay empleados con actividad gravable aprobada en el ejercicio ${anio}.</div>`; return; }
    const f = (n)=> (typeof fmtPesos==='function') ? fmtPesos(n) : '$'+$m(n).toFixed(2);
    const th='padding:7px 8px;background:var(--bg2);font-size:10px;color:var(--t3);text-transform:uppercase;text-align:right;border-bottom:1px solid var(--border)';
    const thL=th+';text-align:left';
    const td='padding:6px 8px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:12px';
    const tdL='padding:6px 8px;border-bottom:1px solid var(--border);text-align:left;font-size:12px';
    let totDif=0, totRet=0, totDet=0;
    const filas = res.map(r=>{
      totDif+=r.diferencia; totRet+=r.retenidoAnual; totDet+=r.impuestoDet;
      const esDev=r.diferencia<0;
      const col=esDev?'var(--green)':(r.diferencia>0.005?'var(--red)':'var(--t3)');
      const etq=esDev?'devolución':(r.diferencia>0.005?'retención':'—');
      return `<tr>
        <td style="${tdL}">${r.nom}<div style="font-size:9px;color:var(--t3)">${r.cuil} · ${r.empresa}</div></td>
        <td style="${td}">${f(r.remGravadaTotal)}</td>
        <td style="${td}">${f(r.impuestoDet)}</td>
        <td style="${td}">${f(r.retenidoAnual)}</td>
        <td style="${td};color:${col};font-weight:600">${f(Math.abs(r.diferencia))}<div style="font-size:9px">${etq}</div></td>
        <td style="${td}"><button onclick="abrirCertificadoAnual('${r.leg}')" style="font-size:10px;padding:3px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg2);color:var(--t1);cursor:pointer">Certificado</button></td>
      </tr>`;
    }).join('');
    cont.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <button onclick="guardarYAvisarLiqAnual()" style="padding:7px 14px;background:#1E6B3A;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">💾 Guardar para imputar en abril ${anio+1}</button>
      <button onclick="publicarCertificadosAnuales()" style="padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">📤 Publicar certificado al empleado</button>
      ${emp?`<button onclick="descargarF1359Txt(${anio}, ${JSON.stringify(emp)}, window._liqAnualResultados)" style="padding:7px 14px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px">⬇ Generar F.1359 .txt (ARCA)</button>`
        :`<span style="font-size:11px;color:var(--yellow);align-self:center">Elegí una empresa para generar el F.1359 .txt (el archivo es por CUIT/agente de retención).</span>`}
    </div>
    <div style="overflow:auto;border:1px solid var(--border);border-radius:8px">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${thL}">Trabajador</th><th style="${th}">Rem. gravada anual</th><th style="${th}">Imp. determinado</th><th style="${th}">Retenido</th><th style="${th}">Diferencia</th><th style="${th}"></th></tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="font-weight:700;background:var(--bg2)">
        <td style="${tdL};font-weight:700">TOTALES (${res.length})</td>
        <td style="${td}"></td><td style="${td}">${f(totDet)}</td><td style="${td}">${f(totRet)}</td>
        <td style="${td};color:${totDif<0?'var(--green)':'var(--red)'}">${f(Math.abs(totDif))}<div style="font-size:9px">${totDif<0?'devolución neta':'retención neta'}</div></td><td style="${td}"></td>
      </tr></tfoot>
    </table></div>
    <div style="font-size:10px;color:var(--t3);margin-top:10px;line-height:1.5">
      • La diferencia se imputa como concepto en la liquidación mensual de abril ${anio+1} (retención adicional o devolución).<br>
      • El cálculo usa montos anuales del período resuelto al 31/12/${anio} y NO aplica el tope mensual de retención (Art. 7 inc. c).<br>
      • F.1359 — limitaciones de esta versión: solo se informan remuneraciones del agente (pluriempleo "otros empleos" en cero), y de los exentos solo las indemnizaciones inc. c/d/e; el saldo negativo (devolución) se exporta en valor absoluto. Verificá estos puntos con el validador de ARCA antes de presentar.
    </div>`;
  } catch(e){
    console.error('Liq anual Ganancias:', e);
    cont.innerHTML = `<div style="padding:20px;color:var(--red)">Error en el cálculo: ${e.message}</div>`;
  }
}

function guardarYAvisarLiqAnual(){
  if(!window._liqAnualResultados || !window._liqAnualAnio) return;
  guardarLiqAnualParaAbril(window._liqAnualAnio, window._liqAnualResultados);
  if(typeof toast==='function') toast(`✓ Guardado: se imputará en los haberes de abril ${window._liqAnualAnio+1}`,'var(--green)');
}
