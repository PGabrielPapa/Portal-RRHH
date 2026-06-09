// ═══════════════════════════════════════════════════════════════════════════
// RÉGIMEN UOCRA — LEY 22.250 — APORTES Y CONTRIBUCIONES ESPECÍFICOS
// ───────────────────────────────────────────────────────────────────────────
// Los empleados del régimen Industria de la Construcción (Ley 22.250) tienen
// un esquema de aportes y contribuciones distinto al régimen LCT general.
// Lo más importante es que NO se calcula indemnización por antigüedad (Art.
// 245 LCT) sino que cada mes el empleador deposita un porcentaje del bruto
// en una cuenta personal del trabajador (Fondo de Cese Laboral). Cuando el
// vínculo termina, el trabajador retira ese fondo independientemente del
// motivo de cese.
//
// CONCEPTOS LIQUIDADOS MENSUALMENTE
//
// A. Fondo de Cese Laboral (FCL) — Arts. 15-17 Ley 22.250
//    • 12% del sueldo bruto durante el primer año de antigüedad
//    • 8% del sueldo bruto desde el mes 13
//    • Solo contribución patronal (NO se descuenta del empleado)
//    • Se deposita en cuenta del trabajador (banco autorizado)
//    • Reemplaza Art. 245 LCT
//
// B. IERIC (Inst. de Estadística y Registro de la Industria de la Construc.)
//    • 0,50% del sueldo básico de convenio
//    • Solo contribución patronal
//    • Ley 25.371
//
// C. Cuota Sindical UOCRA
//    • Empleado: 2% del bruto (ya cubierto por sistema general de sindicatos)
//    • Patronal: 2% del bruto (ya cubierto)
//
// D. Fondo Sanidad / OSPECON Adicional
//    • 0,50% contribución patronal (CCT específico de zona)
//
// E. CAR (Comisión Asistencia Recreativa) UOCRA
//    • 0,25% contribución patronal
//
// F. CESLU / Cuota Solidaria
//    • 1% bruto contribución para no afiliados que se benefician del CCT
//
// REFERENCIAS
//   • Ley 22.250 — Régimen de la Industria de la Construcción
//   • Ley 25.371 — Sistema Integrado de Prestaciones por Desempleo Construcción
//   • Resol. 12/2008 IERIC — porcentajes vigentes
//   • CCT 76/75 — cuotas sindicales UOCRA
// ═══════════════════════════════════════════════════════════════════════════

// ─── Parámetros default UOCRA (editables desde panel Parámetros) ──────
const UOCRA_PARAMS_DEFAULT = {
  // FCL — Art. 15 Ley 22.250
  fclPctPrimerAnio:    12.0,   // primeros 12 meses
  fclPctSegundoAnio:    8.0,   // mes 13 en adelante
  // IERIC — Ley 25.371
  ierciPct:             0.5,
  // Fondo Sanidad UOCRA
  fondoSanidadPct:      0.5,
  // CAR (Comisión Asistencia Recreativa)
  carPct:               0.25,
  // CESLU (Cuota solidaria)
  ceslPct:              1.0,
  // ¿Se aplica CESLU? Por defecto solo si el empleado NO es afiliado UOCRA.
  ceslAplicaPorDefecto: false,
  // ¿Se aplica fondo sanidad? Depende del CCT vigente.
  fondoSanidadAplica:   true,
  // ¿Se aplica CAR? Depende del CCT vigente.
  carAplica:            true
};

const UOCRA_STORAGE_KEY = 'lsg_uocra_params';

function getUocraParams(){
  try {
    const raw = localStorage.getItem(UOCRA_STORAGE_KEY);
    if(raw) return { ...UOCRA_PARAMS_DEFAULT, ...JSON.parse(raw) };
  } catch(_){}
  return JSON.parse(JSON.stringify(UOCRA_PARAMS_DEFAULT));
}

function saveUocraParams(p){
  try{ localStorage.setItem(UOCRA_STORAGE_KEY, JSON.stringify(p)); }catch(e){}
}

// ─── Cálculo de meses de antigüedad ────────────────────────────────────
// Devuelve la cantidad de meses cumplidos al cierre del período liquidado.
// Necesario para decidir el % de FCL (12% o 8%).
function _uocraMesesAntiguedad(fechaIngreso, anio, mes){
  if(!fechaIngreso) return 0;
  let partes;
  if(fechaIngreso.includes('-')) partes = fechaIngreso.split('-');
  else partes = fechaIngreso.split('/').reverse();
  const yIng = parseInt(partes[0], 10);
  const mIng = parseInt(partes[1], 10);
  if(isNaN(yIng) || isNaN(mIng)) return 0;
  // Diferencia en meses calendario al final del período
  const meses = (anio - yIng) * 12 + (mes - mIng);
  return Math.max(0, meses);
}

// ─── Núcleo: calcular contribuciones UOCRA mensuales ────────────────────
// Recibe el item de liquidación parcial (con totalHaberesRem y sueldoBasico
// ya calculados) y devuelve el desglose de contribuciones del régimen.
// Si el empleado no está bajo régimen Ley 22.250, devuelve null.
function calcularContribucionesUOCRA(emp, item, anio, mes){
  if(!emp || typeof esRegimenLey22250 !== 'function') return null;
  if(!esRegimenLey22250(emp)) return null;

  const params = getUocraParams();
  const meses = _uocraMesesAntiguedad(emp.ing, anio, mes);
  // FCL: 12% primer año, 8% desde mes 13
  const fclPct = (meses < 12) ? params.fclPctPrimerAnio : params.fclPctSegundoAnio;
  const baseFCL = $m(item.totalHaberesRem);  // FCL se calcula sobre rem bruto
  const baseIeric = $m(item.sueldoBasico);    // IERIC sobre básico de convenio
  const baseGeneral = $m(item.totalHaberesRem);

  const mFCL          = baseFCL * fclPct / 100;
  const mIeric        = baseIeric * params.ierciPct / 100;
  const mFondoSanidad = params.fondoSanidadAplica ? baseGeneral * params.fondoSanidadPct / 100 : 0;
  const mCAR          = params.carAplica ? baseGeneral * params.carPct / 100 : 0;
  // CESLU: solo si el empleado NO es afiliado UOCRA (esAfiliadoUocra)
  const aplicaCeslu   = params.ceslAplicaPorDefecto && !emp.afiliadoUocra;
  const mCeslu        = aplicaCeslu ? baseGeneral * params.ceslPct / 100 : 0;

  return {
    esRegimenUOCRA: true,
    mesesAntig: meses,
    fclPctAplicado: fclPct,
    baseFCL, baseIeric, baseGeneral,
    mFCL, mIeric, mFondoSanidad, mCAR, mCeslu,
    totalContribucionesUOCRA: mFCL + mIeric + mFondoSanidad + mCAR + mCeslu,
    // Aporte trabajador (NO existe en UOCRA — todo es contribución patronal):
    aporteTrabajador: 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT DDJJ UOCRA / IERIC
// ───────────────────────────────────────────────────────────────────────────
// Genera Excel con tres hojas:
//   - Resumen consolidado (todos los empleados UOCRA con sus aportes)
//   - DDJJ FCL (formato bancario para acreditación masiva en cuenta del trab.)
//   - DDJJ IERIC (formato simple para presentar al instituto)
// ═══════════════════════════════════════════════════════════════════════════
function buildUocraDataset(liq){
  if(!liq?.items?.length) return null;
  const items = liq.items.filter(i => {
    const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === i.leg);
    return emp && (typeof esRegimenLey22250 === 'function') && esRegimenLey22250(emp);
  });
  if(!items.length) return null;

  const detalle = items.map(item => {
    const emp = (typeof getNomina==='function' ? getNomina() : []).find(e => e.leg === item.leg) || {};
    const u = calcularContribucionesUOCRA(emp, item, liq.anio, liq.mes);
    return { item, emp, uocra: u };
  });

  const totales = {
    cuils: detalle.length,
    baseFCL:        detalle.reduce((s,d)=>s+(d.uocra?.baseFCL||0),0),
    baseIeric:      detalle.reduce((s,d)=>s+(d.uocra?.baseIeric||0),0),
    mFCL:           detalle.reduce((s,d)=>s+(d.uocra?.mFCL||0),0),
    mIeric:         detalle.reduce((s,d)=>s+(d.uocra?.mIeric||0),0),
    mFondoSanidad:  detalle.reduce((s,d)=>s+(d.uocra?.mFondoSanidad||0),0),
    mCAR:           detalle.reduce((s,d)=>s+(d.uocra?.mCAR||0),0),
    mCeslu:         detalle.reduce((s,d)=>s+(d.uocra?.mCeslu||0),0),
    total:          detalle.reduce((s,d)=>s+(d.uocra?.totalContribucionesUOCRA||0),0)
  };

  return { periodo: liq.periodo, anio: liq.anio, mes: liq.mes, detalle, totales };
}

async function exportarDDJJUOCRA(){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación','var(--yellow)'); return; }

  const ds = buildUocraDataset(liq);
  if(!ds){
    toast('ℹ Esta liquidación no tiene empleados UOCRA / régimen Ley 22.250','var(--accent2)');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ── Hoja "Resumen" ──
  const resumen = [
    ['DDJJ APORTES Y CONTRIBUCIONES — RÉGIMEN UOCRA (LEY 22.250)'],
    [],
    ['Período', ds.periodo],
    ['CUILs UOCRA', ds.totales.cuils],
    [],
    ['Concepto', 'Base', '% / Pct', 'Total Contribución Patronal', 'Norma'],
    ['Fondo de Cese Laboral (FCL)', +ds.totales.baseFCL.toFixed(2), 'Variable (12% o 8%)', +ds.totales.mFCL.toFixed(2), 'Art. 15 Ley 22.250'],
    ['IERIC',                       +ds.totales.baseIeric.toFixed(2), '0,50%', +ds.totales.mIeric.toFixed(2), 'Ley 25.371'],
    ['Fondo Sanidad',               +ds.totales.baseFCL.toFixed(2),   '0,50%', +ds.totales.mFondoSanidad.toFixed(2), 'CCT 76/75'],
    ['CAR — Asist. Recreativa',     +ds.totales.baseFCL.toFixed(2),   '0,25%', +ds.totales.mCAR.toFixed(2), 'CCT UOCRA'],
    ['CESLU (no afiliados)',        +ds.totales.baseFCL.toFixed(2),   '1,00%', +ds.totales.mCeslu.toFixed(2), 'CCT UOCRA'],
    [],
    ['TOTAL', '', '', +ds.totales.total.toFixed(2), '']
  ];
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR['!cols'] = [{wch:32},{wch:14},{wch:18},{wch:18},{wch:24}];
  wsR['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:4} }];
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  // ── Hoja "DDJJ FCL" — para depósito bancario ──
  const fcl = [
    ['DDJJ FONDO DE CESE LABORAL (Art. 15 Ley 22.250)'],
    [`Período: ${ds.periodo}`],
    [],
    ['Legajo','CUIL','Apellido y Nombre','Empresa','Fecha Ingreso','Meses Antig.','% Aplicado','Base Rem.','Importe FCL']
  ];
  ds.detalle.forEach(d => {
    fcl.push([
      d.item.leg, d.item.cuil || '', d.item.nom, d.item.empresa,
      d.emp.ing || '',
      d.uocra.mesesAntig, d.uocra.fclPctAplicado + '%',
      +d.uocra.baseFCL.toFixed(2), +d.uocra.mFCL.toFixed(2)
    ]);
  });
  fcl.push([]);
  fcl.push(['', '', '', '', '', '', 'TOTAL', +ds.totales.baseFCL.toFixed(2), +ds.totales.mFCL.toFixed(2)]);
  const wsF = XLSX.utils.aoa_to_sheet(fcl);
  wsF['!cols'] = [{wch:9},{wch:13},{wch:32},{wch:18},{wch:11},{wch:9},{wch:9},{wch:14},{wch:14}];
  wsF['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:8} }];
  XLSX.utils.book_append_sheet(wb, wsF, 'DDJJ FCL');

  // ── Hoja "DDJJ IERIC" ──
  const ieric = [
    ['DDJJ INSTITUTO IERIC (Ley 25.371)'],
    [`Período: ${ds.periodo}`],
    [],
    ['Legajo','CUIL','Apellido y Nombre','Empresa','Sueldo Básico','% IERIC','Importe']
  ];
  const params = getUocraParams();
  ds.detalle.forEach(d => {
    ieric.push([
      d.item.leg, d.item.cuil || '', d.item.nom, d.item.empresa,
      +d.uocra.baseIeric.toFixed(2), params.ierciPct + '%',
      +d.uocra.mIeric.toFixed(2)
    ]);
  });
  ieric.push([]);
  ieric.push(['', '', '', 'TOTAL', +ds.totales.baseIeric.toFixed(2), '', +ds.totales.mIeric.toFixed(2)]);
  const wsI = XLSX.utils.aoa_to_sheet(ieric);
  wsI['!cols'] = [{wch:9},{wch:13},{wch:32},{wch:18},{wch:14},{wch:9},{wch:14}];
  wsI['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:6} }];
  XLSX.utils.book_append_sheet(wb, wsI, 'DDJJ IERIC');

  // ── Hoja "Detalle Completo" ──
  const det = [
    ['DETALLE COMPLETO DE CONTRIBUCIONES UOCRA — POR EMPLEADO'],
    [`Período: ${ds.periodo}`],
    [],
    ['Legajo','CUIL','Nombre','Empresa','FCL','IERIC','F. Sanidad','CAR','CESLU','Total UOCRA']
  ];
  ds.detalle.forEach(d => {
    const u = d.uocra;
    det.push([
      d.item.leg, d.item.cuil || '', d.item.nom, d.item.empresa,
      +u.mFCL.toFixed(2), +u.mIeric.toFixed(2),
      +u.mFondoSanidad.toFixed(2), +u.mCAR.toFixed(2), +u.mCeslu.toFixed(2),
      +u.totalContribucionesUOCRA.toFixed(2)
    ]);
  });
  det.push([]);
  det.push(['', '', '', 'TOTAL',
    +ds.totales.mFCL.toFixed(2),
    +ds.totales.mIeric.toFixed(2),
    +ds.totales.mFondoSanidad.toFixed(2),
    +ds.totales.mCAR.toFixed(2),
    +ds.totales.mCeslu.toFixed(2),
    +ds.totales.total.toFixed(2)
  ]);
  const wsD = XLSX.utils.aoa_to_sheet(det);
  wsD['!cols'] = [{wch:9},{wch:13},{wch:32},{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:13}];
  wsD['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:9} }];
  XLSX.utils.book_append_sheet(wb, wsD, 'Detalle');

  const fname = `DDJJ_UOCRA_${ds.periodo}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ DDJJ UOCRA descargada (${ds.totales.cuils} CUIL${ds.totales.cuils!==1?'s':''})`, 'var(--green)');

  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'ddjj_uocra_generada', {
      liqId: liq.id, periodo: liq.periodo, cuils: ds.totales.cuils,
      por: currentUser?.emp?.nom
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL con desglose
// ═══════════════════════════════════════════════════════════════════════════
function abrirModalUOCRA(){
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq){ toast('⚠ Abrí una liquidación','var(--yellow)'); return; }
  const ds = buildUocraDataset(liq);

  const fmtN = n => Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const overlay = document.createElement('div');
  overlay.id = 'modal-uocra';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  if(!ds){
    overlay.innerHTML = `
      <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:24px;max-width:540px;width:100%;text-align:center">
        <div style="font-size:32px;margin-bottom:10px">🏗️</div>
        <div style="font-size:14px;font-weight:600;color:var(--t1);margin-bottom:6px">Sin empleados UOCRA en este período</div>
        <div style="font-size:11px;color:var(--t3);line-height:1.6;margin-bottom:18px">
          La liquidación ${liq.periodo} no incluye empleados bajo régimen Ley 22.250 (UOCRA).<br>
          Si esperabas ver datos acá, verificá que tengan <strong>cod_sindicato</strong> = UOCRA en el ABM de empleados.
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('modal-uocra').remove()" style="font-size:13px;padding:8px 18px">Entendido</button>
      </div>
    `;
    document.body.appendChild(overlay);
    return;
  }

  const filasHtml = ds.detalle.map(d => {
    const u = d.uocra;
    return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:10px;color:var(--t3)">${legD(d.item.leg)}</td>
        <td style="padding:6px 8px;font-size:11px;color:var(--t1)">${d.item.nom?.split(',')[0] || ''}</td>
        <td style="padding:6px 8px;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-align:center">${u.mesesAntig}m</td>
        <td style="padding:6px 8px;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-align:right">${u.fclPctAplicado}%</td>
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:11px;color:var(--t1);text-align:right;font-weight:600">${fmtN(u.mFCL)}</td>
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:11px;color:var(--t2);text-align:right">${fmtN(u.mIeric)}</td>
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:11px;color:var(--t2);text-align:right">${fmtN(u.mFondoSanidad)}</td>
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:11px;color:var(--t2);text-align:right">${fmtN(u.mCAR)}</td>
        <td style="padding:6px 8px;font-family:var(--font-mono);font-size:11px;color:rgb(168,85,247);text-align:right;font-weight:700">${fmtN(u.totalContribucionesUOCRA)}</td>
      </tr>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:920px;width:100%;max-height:92vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--t1)">🏗️ Aportes UOCRA — Régimen Ley 22.250</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Período ${ds.periodo} · ${ds.totales.cuils} CUIL${ds.totales.cuils!==1?'s':''} bajo régimen construcción</div>
        </div>
        <button onclick="document.getElementById('modal-uocra').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
      </div>

      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

        <!-- Totales -->
        <div style="background:linear-gradient(135deg,rgba(234,88,12,.05),rgba(168,85,247,.03));border:1px solid rgba(234,88,12,.2);border-radius:var(--r);padding:14px 16px">
          <div style="font-size:11px;font-family:var(--font-mono);color:rgb(234,88,12);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Resumen del Período</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;font-family:var(--font-mono)">
            <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">FCL</div><div style="color:var(--t1);font-size:13px;font-weight:700">$ ${fmtN(ds.totales.mFCL)}</div></div>
            <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">IERIC</div><div style="color:var(--t1);font-size:13px;font-weight:700">$ ${fmtN(ds.totales.mIeric)}</div></div>
            <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">F. Sanidad</div><div style="color:var(--t1);font-size:13px;font-weight:700">$ ${fmtN(ds.totales.mFondoSanidad)}</div></div>
            <div><div style="color:var(--t3);font-size:9px;text-transform:uppercase">CAR</div><div style="color:var(--t1);font-size:13px;font-weight:700">$ ${fmtN(ds.totales.mCAR)}</div></div>
            <div style="border-left:1px solid var(--border);padding-left:10px"><div style="color:var(--t3);font-size:9px;text-transform:uppercase">TOTAL</div><div style="color:rgb(168,85,247);font-size:14px;font-weight:700">$ ${fmtN(ds.totales.total)}</div></div>
          </div>
        </div>

        <!-- Tabla -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead style="background:var(--bg3);border-bottom:2px solid var(--border)">
              <tr>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Leg.</th>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:left;text-transform:uppercase;letter-spacing:.05em">Nombre</th>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:center;text-transform:uppercase;letter-spacing:.05em">Antig.</th>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:right;text-transform:uppercase;letter-spacing:.05em">% FCL</th>
                <th style="padding:8px;font-size:10px;color:var(--t1);text-align:right;text-transform:uppercase;letter-spacing:.05em">FCL</th>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:right;text-transform:uppercase;letter-spacing:.05em">IERIC</th>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:right;text-transform:uppercase;letter-spacing:.05em">Sanidad</th>
                <th style="padding:8px;font-size:10px;color:var(--t3);text-align:right;text-transform:uppercase;letter-spacing:.05em">CAR</th>
                <th style="padding:8px;font-size:10px;color:rgb(168,85,247);text-align:right;text-transform:uppercase;letter-spacing:.05em">Total</th>
              </tr>
            </thead>
            <tbody>${filasHtml}</tbody>
          </table>
        </div>

        <!-- Aclaración -->
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong>Importante:</strong> todos estos conceptos son <strong>contribución patronal</strong>
          (no se descuentan del empleado). El FCL se acredita mensualmente en cuenta personal del trabajador
          (banco autorizado por el sindicato/IERIC). El IERIC se ingresa por VEP. Fondo Sanidad y CAR
          según CCT vigente — verificar antes de cada presentación. Los % se editan en
          <code style="background:var(--bg1);padding:1px 4px;border-radius:3px">localStorage.lsg_uocra_params</code>.
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-uocra').remove()" style="font-size:13px;padding:8px 14px">Cerrar</button>
        <button class="btn btn-primary" onclick="exportarDDJJUOCRA()" style="font-size:13px;padding:8px 18px">📊 Descargar DDJJ Excel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
