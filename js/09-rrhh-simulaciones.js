// ═══════════════════════════════════════════════════════════════
// 4 escenarios de simulación, todos sin tocar la liquidación oficial:
//   1) Mensual con incrementos (% o monto fijo, masivo o filtrado)
//   2) Gratificaciones remunerativas y no remunerativas
//   3) Liquidación final por baja (7 supuestos legales)
//   4) Comparativa de escenarios guardados
//
// Reusa el motor real `calcularItemLiquidacion()` y `getDefaultLiqParams()`
// para garantizar coherencia 1:1 con la liquidación productiva.

const SIM_STORAGE_KEY = LS.SIM_SCENARIOS; // centralizado en js/00-constants.js
let _simTab = 'mensual';
let _simResultadoMensual = null;
let _simResultadoGrat = null;
let _simResultadoFinal = null;

function getSimulaciones(){
  try { return JSON.parse(localStorage.getItem(SIM_STORAGE_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveSimulaciones(arr){
  localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(arr));
}
function _simFmt(n){
  if(typeof n !== 'number' || !isFinite(n)) return '$ 0,00';
  return '$ ' + n.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function _simFmtPct(n){
  return (Number(n)||0).toFixed(2) + '%';
}

// ────────────────────────────────────────────────────────────────
// Tab dispatcher
// ────────────────────────────────────────────────────────────────
function simTab(tab){
  _simTab = tab;
  // Marcar pestaña activa
  ['mensual','grat','final','comp'].forEach(t => {
    const btn = document.getElementById('sim-tab-' + t);
    if(!btn) return;
    if(t === tab){
      btn.style.borderBottom = '2px solid rgb(251,168,52)';
      btn.style.color = 'rgb(251,168,52)';
    } else {
      btn.style.borderBottom = '2px solid transparent';
      btn.style.color = 'var(--t3)';
    }
  });
  if(tab === 'mensual') renderSimMensual();
  else if(tab === 'grat') renderSimGratificaciones();
  else if(tab === 'final') renderSimFinal();
  else if(tab === 'comp') renderSimComparativa();
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — SIMULACIÓN MENSUAL CON INCREMENTOS
// ════════════════════════════════════════════════════════════════
function renderSimMensual(){
  const cont = document.getElementById('sim-content');
  if(!cont) return;
  const hoy = new Date();
  const empresas = (typeof getEmpresasList === 'function')
    ? getEmpresasList().map(e => e.nom || e)
    : ['LEITEN S.A.','SINIS S.A.','BARTON REBAR S.A.','LEITEN SALTA S.A.','IDEE S.R.L.'];

  cont.innerHTML = `
    <div class="card" style="padding:18px 20px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:14px">⚙️ Parámetros del escenario</div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Mes a simular</label>
          <select id="sim-mes" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`<option value="${m}" ${m===hoy.getMonth()+1?'selected':''}>${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1]}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Año</label>
          <input id="sim-anio" type="number" value="${hoy.getFullYear()}" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Empresa (filtro)</label>
          <select id="sim-emp" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="">— Todas —</option>
            ${empresas.map(e=>`<option value="${e}">${e}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">% Incremento</label>
          <input id="sim-pct-inc" type="number" step="0.01" value="0" placeholder="ej. 8.5" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">$ Adicional fijo</label>
          <input id="sim-monto-inc" type="number" step="0.01" value="0" placeholder="ej. 50000" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
      </div>

      <div style="margin-top:14px;padding:10px 12px;background:var(--bg2);border-radius:var(--r);border-left:3px solid rgb(251,168,52)">
        <div style="font-size:11px;color:var(--t2);line-height:1.6">
          💡 El incremento se aplica al <b>bruto base</b> de cada empleado seleccionado. Se calcula la liquidación completa con antigüedad, presentismo, aportes (Jub. 11% + OS 3% + PAMI 3% + sind.), contribuciones patronales (~24%) y costo total empresa por empleado y consolidado.
        </div>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="ejecutarSimMensual()">🧮 Calcular simulación</button>
        <button class="btn btn-ghost" onclick="guardarEscenarioMensual()" id="sim-btn-guardar-mens" disabled>💾 Guardar escenario</button>
        <button class="btn btn-ghost" onclick="exportarSimMensualCSV()" id="sim-btn-export-mens" disabled>↓ Exportar CSV</button>
      </div>
    </div>

    <div id="sim-result-mensual"></div>
  `;
}

async function ejecutarSimMensual(){
  const mes = parseInt(document.getElementById('sim-mes')?.value || '1', 10);
  const anio = parseInt(document.getElementById('sim-anio')?.value || new Date().getFullYear(), 10);
  const empFiltro = document.getElementById('sim-emp').value;
  const pctInc = parseFloat(document.getElementById('sim-pct-inc')?.value || '0') || 0;
  const montoInc = parseFloat(document.getElementById('sim-monto-inc')?.value || '0') || 0;

  if(isNaN(mes) || isNaN(anio)){ toast('⚠ Datos inválidos', 'var(--yellow)'); return; }

  // Empleados activos del filtro
  let nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  if(empFiltro) nomina = nomina.filter(e => (e.emp||'') === empFiltro);
  if(!nomina.length){ toast('⚠ Sin empleados con ese filtro', 'var(--yellow)'); return; }

  const params = (typeof getDefaultLiqParams === 'function') ? getDefaultLiqParams() : {
    pctJubilacion:11, pctObraSocial:3, pctAnssal:0.5, pctPamiEmp:3,
    pctSindicatoEmp:2, pctJubPatronal:10.17, pctOsPatronal:6, pctPamiPatronal:1.5,
    pctDesempleo:0.89, pctArt:1.5, pctSindicatoPatronal:1.5,
    pctPresentismo:5, pctAntiguedadPorAnio:1, nombreSindicato:''
  };
  const fechaPagoLiq = new Date(anio, mes-1, 4); // 4 del mes siguiente sería ideal pero usamos del mismo

  const items = [];
  const skipped = []; // empleados que no se pudieron procesar (sin bruto, sin fecha ing. válida, error motor)
  let totalBruto=0, totalBrutoSim=0, totalAportes=0, totalNeto=0, totalContrib=0, totalCosto=0;

  for(const e of nomina){
    const brutoOriginal = Number(e.bruto) || 0;
    if(brutoOriginal <= 0){
      skipped.push({ leg: e.leg, nom: e.nom, motivo: 'sin remuneración cargada' });
      continue;
    }

    // Validar fecha de ingreso (la usa el motor para antigüedad).
    // Si está mal el formato o vacía, calcularAniosAntiguedad devuelve 0 sin
    // romper, pero conviene avisar al usuario para que la corrija desde ABM.
    const fIngTest = (typeof parseFechaIng === 'function') ? parseFechaIng(e.ing) : null;
    if(e.ing && !fIngTest){
      skipped.push({ leg: e.leg, nom: e.nom, motivo: `fecha de ingreso inválida: ${e.ing}` });
      continue;
    }

    // Aplicar incremento
    const brutoSim = brutoOriginal * (1 + pctInc/100) + montoInc;

    // Clonar empleado con nuevo bruto y novedades neutrales (días hábiles completos)
    const empSim = Object.assign({}, e, { bruto: brutoSim });
    const novNeutra = { diasTrabajados: undefined, sac: 0, hsExtra50: 0, hsExtra100: 0,
                        ausenciasInjustificadas: 0, diasSuspension: 0, anticipos: 0 };

    let item;
    try {
      item = await calcularItemLiquidacion(empSim, params, novNeutra, anio, mes, 0, fechaPagoLiq);
    } catch(err){
      console.warn('Error calculando', e.leg, err);
      skipped.push({ leg: e.leg, nom: e.nom, motivo: 'error en motor de cálculo: ' + (err.message||err) });
      continue;
    }

    items.push({
      leg: e.leg, nom: e.nom, emp: e.emp, lugar: e.lugar||'',
      brutoOriginal, brutoSim,
      totalHaberes: item.totalHaberes,
      totalAportes: item.totalDescuentos,
      netoAPagar: item.netoAPagar,
      totalContrib: item.totalContrib,
      totalCosto: item.totalCosto,
      _detalle: item
    });
    totalBruto += brutoOriginal;
    totalBrutoSim += brutoSim;
    totalAportes += item.totalDescuentos;
    totalNeto += item.netoAPagar;
    totalContrib += item.totalContrib;
    totalCosto += item.totalCosto;
  }

  _simResultadoMensual = {
    mes, anio, empFiltro, pctInc, montoInc,
    items, skipped,
    totales: { totalBruto, totalBrutoSim, totalAportes, totalNeto, totalContrib, totalCosto }
  };

  document.getElementById('sim-btn-guardar-mens').disabled = false;
  document.getElementById('sim-btn-export-mens').disabled = false;

  pintarResultadoMensual();
  if(skipped.length){
    toast(`✓ ${items.length} calculados · ⚠ ${skipped.length} omitidos (revisar panel)`, 'var(--yellow)', 4500);
  } else {
    toast(`✓ Simulación calculada: ${items.length} empleados`, 'var(--green)');
  }
}

function pintarResultadoMensual(){
  const cont = document.getElementById('sim-result-mensual');
  if(!cont || !_simResultadoMensual) return;
  const r = _simResultadoMensual;
  const t = r.totales;
  const dif = t.totalBrutoSim - t.totalBruto;
  const pctReal = t.totalBruto > 0 ? (dif/t.totalBruto*100) : 0;

  // Resumen consolidado por empresa
  const porEmp = {};
  r.items.forEach(it => {
    const k = it.emp || '(sin empresa)';
    if(!porEmp[k]) porEmp[k] = { cnt:0, brutoSim:0, neto:0, costo:0 };
    porEmp[k].cnt++;
    porEmp[k].brutoSim += it.brutoSim;
    porEmp[k].neto += it.netoAPagar;
    porEmp[k].costo += it.totalCosto;
  });

  const filasEmp = Object.entries(porEmp).map(([emp, v]) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${emp}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono)">${v.cnt}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono)">${_simFmt(v.brutoSim)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);color:var(--green)">${_simFmt(v.neto)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);color:rgb(251,168,52);font-weight:600">${_simFmt(v.costo)}</td>
    </tr>
  `).join('');

  // Top 30 detalle individual
  const filasInd = r.items.slice(0, 200).map(it => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">${it.leg}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11px">${(it.nom||'').toString().split(',')[0]}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:10px;color:var(--t3)">${it.emp||''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--t3)">${_simFmt(it.brutoOriginal)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px">${_simFmt(it.brutoSim)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--red)">-${_simFmt(it.totalAportes)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--green);font-weight:600">${_simFmt(it.netoAPagar)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:rgb(168,85,247)">${_simFmt(it.totalContrib)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:rgb(251,168,52);font-weight:600">${_simFmt(it.totalCosto)}</td>
    </tr>
  `).join('');

  // Panel de empleados omitidos (si hay)
  const skippedHTML = (r.skipped && r.skipped.length) ? `
    <details class="card" style="padding:0;margin-bottom:16px;border-color:rgba(251,168,52,.4)">
      <summary style="padding:14px 16px;cursor:pointer;font-size:13px;font-weight:600;color:rgb(251,168,52);list-style:none;display:flex;justify-content:space-between;align-items:center">
        <span>⚠ ${r.skipped.length} empleado${r.skipped.length!==1?'s':''} omitido${r.skipped.length!==1?'s':''} del cálculo</span>
        <span style="font-size:11px;color:var(--t3);font-weight:400">click para expandir</span>
      </summary>
      <div style="border-top:1px solid var(--border);max-height:240px;overflow:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:var(--bg2);position:sticky;top:0">
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Legajo</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Empleado</th>
            <th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Motivo</th>
          </tr></thead>
          <tbody>
            ${r.skipped.map(s => `
              <tr>
                <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono)">${s.leg}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--border)">${(s.nom||'').split(',')[0]}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--border);color:rgb(251,168,52)">${s.motivo}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="padding:10px 14px;background:var(--bg2);font-size:11px;color:var(--t3);line-height:1.5">
          💡 Para corregir estos empleados, abrí <b>Panel RR.HH. → ABM Empleados</b>, buscá por legajo y editá la fecha de ingreso o la remuneración según corresponda.
        </div>
      </div>
    </details>
  ` : '';

  cont.innerHTML = skippedHTML + `
    <!-- KPIs consolidados -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Empleados</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${r.items.length}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Bruto actual</div>
        <div style="font-size:18px;font-weight:600;color:var(--t2);font-family:var(--font-mono)">${_simFmt(t.totalBruto)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(251,168,52,.3)">
        <div style="font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Bruto simulado</div>
        <div style="font-size:18px;font-weight:600;color:rgb(251,168,52);font-family:var(--font-mono)">${_simFmt(t.totalBrutoSim)}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">+${_simFmt(dif)} (${_simFmtPct(pctReal)})</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:var(--red);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Aportes empleados</div>
        <div style="font-size:18px;font-weight:600;color:var(--red);font-family:var(--font-mono)">-${_simFmt(t.totalAportes)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(34,197,94,.3)">
        <div style="font-size:10px;color:var(--green);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Neto a pagar</div>
        <div style="font-size:18px;font-weight:600;color:var(--green);font-family:var(--font-mono)">${_simFmt(t.totalNeto)}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:rgb(168,85,247);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Contribuciones patronales</div>
        <div style="font-size:18px;font-weight:600;color:rgb(168,85,247);font-family:var(--font-mono)">${_simFmt(t.totalContrib)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border:2px solid rgba(251,168,52,.5)">
        <div style="font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">💰 COSTO TOTAL EMPRESA</div>
        <div style="font-size:22px;font-weight:700;color:rgb(251,168,52);font-family:var(--font-mono)">${_simFmt(t.totalCosto)}</div>
      </div>
    </div>

    <!-- Por empresa -->
    <div class="card" style="padding:0;margin-bottom:16px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;color:var(--t1)">📊 Resumen por empresa</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg2)">
            <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Empresa</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Empleados</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Bruto sim.</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--green);font-family:var(--font-mono);text-transform:uppercase">Neto a pagar</th>
            <th style="padding:8px 10px;text-align:right;font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase">Costo total</th>
          </tr>
        </thead>
        <tbody>${filasEmp}</tbody>
      </table>
    </div>

    <!-- Detalle individual -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;font-weight:600;color:var(--t1)">👥 Detalle por empleado</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${r.items.length > 200 ? `mostrando 200 de ${r.items.length}` : `${r.items.length} empleados`}</div>
      </div>
      <div style="max-height:600px;overflow:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:var(--bg1);z-index:1">
            <tr style="background:var(--bg2)">
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Legajo</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Apellido</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Empresa</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Bruto orig.</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Bruto sim.</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--red);font-family:var(--font-mono);text-transform:uppercase">Aportes</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--green);font-family:var(--font-mono);text-transform:uppercase">Neto</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:rgb(168,85,247);font-family:var(--font-mono);text-transform:uppercase">Contrib.</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase">Costo</th>
            </tr>
          </thead>
          <tbody>${filasInd}</tbody>
        </table>
      </div>
    </div>
  `;
}

async function guardarEscenarioMensual(){
  if(!_simResultadoMensual){ toast('⚠ Calculá la simulación primero','var(--yellow)'); return; }
  const nombre = await showPrompt({titulo:'Guardar escenario',placeholder:'Nombre del escenario',valorDefault:`Mensual ${_simResultadoMensual.mes}/${_simResultadoMensual.anio} +${_simResultadoMensual.pctInc}%`,labelOk:'Guardar'});
  if(!nombre) return;
  const arr = getSimulaciones();
  arr.push({
    id: 'sim_' + Date.now(),
    tipo: 'mensual',
    nombre,
    fecha: new Date().toISOString(),
    config: {
      mes: _simResultadoMensual.mes,
      anio: _simResultadoMensual.anio,
      empFiltro: _simResultadoMensual.empFiltro,
      pctInc: _simResultadoMensual.pctInc,
      montoInc: _simResultadoMensual.montoInc
    },
    totales: _simResultadoMensual.totales,
    cnt: _simResultadoMensual.items.length
  });
  saveSimulaciones(arr);
  toast('✓ Escenario guardado en Comparativa', 'var(--green)');
}

function exportarSimMensualCSV(){
  if(!_simResultadoMensual){ return; }
  const r = _simResultadoMensual;
  const headers = ['Legajo','Empleado','Empresa','Bruto original','Bruto simulado','Aportes','Neto a pagar','Contribuciones','Costo total'];
  const rows = r.items.map(it => [
    it.leg,
    `"${(it.nom||'').replace(/"/g,'""')}"`,
    `"${(it.emp||'').replace(/"/g,'""')}"`,
    it.brutoOriginal.toFixed(2),
    it.brutoSim.toFixed(2),
    it.totalAportes.toFixed(2),
    it.netoAPagar.toFixed(2),
    it.totalContrib.toFixed(2),
    it.totalCosto.toFixed(2)
  ]);
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `simulacion_${r.mes}_${r.anio}_inc${r.pctInc}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ CSV exportado', 'var(--green)');
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — GRATIFICACIONES (REM. y NO REM.)
// ════════════════════════════════════════════════════════════════
function renderSimGratificaciones(){
  const cont = document.getElementById('sim-content');
  if(!cont) return;
  const empresas = (typeof getEmpresasList === 'function')
    ? getEmpresasList().map(e => e.nom || e)
    : ['LEITEN S.A.','SINIS S.A.','BARTON REBAR S.A.','LEITEN SALTA S.A.','IDEE S.R.L.'];

  cont.innerHTML = `
    <div class="card" style="padding:18px 20px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:14px">🎁 Configuración de la gratificación</div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Concepto</label>
          <input id="grat-concepto" type="text" value="Gratificación extraordinaria" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Naturaleza</label>
          <select id="grat-tipo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="rem">Remunerativa (Art. 103 LCT) — devenga aportes y SAC</option>
            <option value="norem">No remunerativa (Art. 103 bis) — sin aportes</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Modalidad</label>
          <select id="grat-modo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="fijo">$ Importe fijo a todos</option>
            <option value="pctBruto">% del bruto de cada empleado</option>
            <option value="pctSueldo">N sueldos (1.0 = 1 sueldo)</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Valor</label>
          <input id="grat-valor" type="number" step="0.01" value="100000" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Empresa (filtro)</label>
          <select id="grat-emp" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="">— Todas —</option>
            ${empresas.map(e=>`<option value="${e}">${e}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Sindicato (filtro)</label>
          <select id="grat-sind" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="">— Todos (incluye fuera de convenio) —</option>
            <option value="FC">Solo Fuera de Convenio</option>
            <option value="CONV">Solo dentro de convenio</option>
          </select>
        </div>
      </div>

      <div style="margin-top:14px;padding:10px 12px;background:var(--bg2);border-radius:var(--r);border-left:3px solid rgb(94,194,255)">
        <div style="font-size:11px;color:var(--t2);line-height:1.6">
          📌 <b>Remunerativa:</b> integra base de aportes (Jub. 11% + OS 3% + PAMI 3%) y de contribuciones patronales (~24%). Genera incidencia en SAC (1/12) y en futuras indemnizaciones.<br>
          📌 <b>No remunerativa:</b> el empleado recibe el 100%. Solo paga obra social patronal en algunas (acuerdos colectivos suelen ser exentos). Sin SAC ni indemnización.
        </div>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="ejecutarSimGrat()">🧮 Calcular gratificación</button>
        <button class="btn btn-ghost" onclick="guardarEscenarioGrat()" id="sim-btn-guardar-grat" disabled>💾 Guardar escenario</button>
        <button class="btn btn-ghost" onclick="exportarSimGratCSV()" id="sim-btn-export-grat" disabled>↓ Exportar CSV</button>
      </div>
    </div>

    <div id="sim-result-grat"></div>
  `;
}

async function ejecutarSimGrat(){
  const concepto = document.getElementById('grat-concepto').value.trim() || 'Gratificación';
  const tipo = document.getElementById('grat-tipo').value;
  const modo = document.getElementById('grat-modo').value;
  const valor = parseFloat(document.getElementById('grat-valor')?.value || '0') || 0;
  const empFiltro = document.getElementById('grat-emp').value;
  const sindFiltro = document.getElementById('grat-sind').value;

  if(valor <= 0){ toast('⚠ Ingresá un valor mayor a 0', 'var(--yellow)'); return; }

  let nomina = getNomina().filter(e => !e._deBaja && !e.egreso);
  if(empFiltro) nomina = nomina.filter(e => (e.emp||'') === empFiltro);
  if(sindFiltro === 'FC'){
    nomina = nomina.filter(e => (typeof empleadoFueraConvenio === 'function') ? empleadoFueraConvenio(e) : !e.cod_sindicato);
  } else if(sindFiltro === 'CONV'){
    nomina = nomina.filter(e => (typeof empleadoFueraConvenio === 'function') ? !empleadoFueraConvenio(e) : !!e.cod_sindicato);
  }
  if(!nomina.length){ toast('⚠ Sin empleados con esos filtros', 'var(--yellow)'); return; }

  // Tasas (usan los defaults del sistema)
  const params = (typeof getDefaultLiqParams === 'function') ? getDefaultLiqParams() : {};
  const pctAportes = (params.pctJubilacion||11) + (params.pctObraSocial||3) + (params.pctAnssal||0.5) + (params.pctPamiEmp||3);
  const pctContrib = (params.pctJubPatronal||10.17) + (params.pctOsPatronal||6) + (params.pctPamiPatronal||1.5) +
                     (params.pctDesempleo||0.89) + (params.pctArt||1.5);
  // Para no rem., asumimos solo OS patronal mínima si la política la incluye (default: 0)
  const pctContribNorem = 0;
  // Tope remuneratorio del período (Art. 9 Ley 24.241)
  const hoyGrat = new Date();
  const _topesGrat = (typeof resolveTopesAportesParaFecha === 'function')
    ? (await resolveTopesAportesParaFecha(`${hoyGrat.getFullYear()}-${String(hoyGrat.getMonth()+1).padStart(2,'0')}-01`))
    : { topeMax: Infinity, topeMin: 0 };
  const _topeMaxGrat = _topesGrat.topeMax || Infinity;

  const items = [];
  let totalImporte=0, totalAportes=0, totalNeto=0, totalContrib=0, totalIncidSac=0, totalCosto=0;

  for(const e of nomina){
    const bruto = Number(e.bruto) || 0;
    let importe = 0;
    if(modo === 'fijo') importe = valor;
    else if(modo === 'pctBruto') importe = bruto * (valor/100);
    else if(modo === 'pctSueldo') importe = bruto * valor;

    if(importe <= 0) continue;

    const aportes = (tipo === 'rem') ? importe * pctAportes/100 : 0;
    const contrib = (tipo === 'rem') ? importe * pctContrib/100 : importe * pctContribNorem/100;
    const neto = importe - aportes;
    const incidSac = (tipo === 'rem') ? importe / 12 : 0; // 1/12 anual SAC
    const costo = importe + contrib;

    items.push({
      leg:e.leg, nom:e.nom, emp:e.emp, bruto,
      importe, aportes, neto, contrib, incidSac, costo
    });
    totalImporte += importe;
    totalAportes += aportes;
    totalNeto += neto;
    totalContrib += contrib;
    totalIncidSac += incidSac;
    totalCosto += costo;
  }

  _simResultadoGrat = {
    concepto, tipo, modo, valor, empFiltro, sindFiltro,
    items, totales: { totalImporte, totalAportes, totalNeto, totalContrib, totalIncidSac, totalCosto }
  };

  document.getElementById('sim-btn-guardar-grat').disabled = false;
  document.getElementById('sim-btn-export-grat').disabled = false;
  pintarResultadoGrat();
  toast(`✓ Gratificación calculada: ${items.length} empleados`, 'var(--green)');
}

function pintarResultadoGrat(){
  const cont = document.getElementById('sim-result-grat');
  if(!cont || !_simResultadoGrat) return;
  const r = _simResultadoGrat;
  const t = r.totales;
  const esRem = r.tipo === 'rem';
  const conceptoLbl = r.concepto;
  const tipoLbl = esRem ? 'Remunerativa' : 'No remunerativa';
  const colorTipo = esRem ? 'rgb(94,194,255)' : 'rgb(168,85,247)';

  const filas = r.items.slice(0, 200).map(it => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">${it.leg}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11px">${(it.nom||'').toString().split(',')[0]}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:10px;color:var(--t3)">${it.emp||''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--t3)">${_simFmt(it.bruto)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;font-weight:600">${_simFmt(it.importe)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--red)">-${_simFmt(it.aportes)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--green);font-weight:600">${_simFmt(it.neto)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:rgb(168,85,247)">${_simFmt(it.contrib)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--accent2)">${_simFmt(it.incidSac)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:rgb(251,168,52);font-weight:600">${_simFmt(it.costo)}</td>
    </tr>
  `).join('');

  cont.innerHTML = `
    <div class="card" style="padding:14px 16px;margin-bottom:16px;border-left:3px solid ${colorTipo}">
      <div style="font-size:13px;font-weight:600;color:var(--t1)">${conceptoLbl}</div>
      <div style="font-size:11px;color:${colorTipo};margin-top:2px;font-family:var(--font-mono)">${tipoLbl.toUpperCase()}</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Empleados</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${r.items.length}</div>
      </div>
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Importe bruto</div>
        <div style="font-size:18px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${_simFmt(t.totalImporte)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(239,68,68,.3)">
        <div style="font-size:10px;color:var(--red);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Aportes empleado</div>
        <div style="font-size:18px;font-weight:600;color:var(--red);font-family:var(--font-mono)">-${_simFmt(t.totalAportes)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(34,197,94,.3)">
        <div style="font-size:10px;color:var(--green);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Neto a entregar</div>
        <div style="font-size:18px;font-weight:600;color:var(--green);font-family:var(--font-mono)">${_simFmt(t.totalNeto)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(168,85,247,.3)">
        <div style="font-size:10px;color:rgb(168,85,247);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Contribuciones</div>
        <div style="font-size:18px;font-weight:600;color:rgb(168,85,247);font-family:var(--font-mono)">${_simFmt(t.totalContrib)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(61,127,255,.3)">
        <div style="font-size:10px;color:var(--accent2);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Incidencia SAC ${esRem?'':'(no aplica)'}</div>
        <div style="font-size:18px;font-weight:600;color:var(--accent2);font-family:var(--font-mono)">${_simFmt(t.totalIncidSac)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border:2px solid rgba(251,168,52,.5)">
        <div style="font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">💰 COSTO TOTAL</div>
        <div style="font-size:22px;font-weight:700;color:rgb(251,168,52);font-family:var(--font-mono)">${_simFmt(t.totalCosto)}</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;color:var(--t1)">👥 Detalle por empleado</div>
      <div style="max-height:600px;overflow:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="position:sticky;top:0;background:var(--bg1)">
            <tr style="background:var(--bg2)">
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Legajo</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Apellido</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Empresa</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Bruto</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Importe</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--red);font-family:var(--font-mono);text-transform:uppercase">Aportes</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--green);font-family:var(--font-mono);text-transform:uppercase">Neto</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:rgb(168,85,247);font-family:var(--font-mono);text-transform:uppercase">Contrib.</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent2);font-family:var(--font-mono);text-transform:uppercase">SAC 1/12</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase">Costo</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>
  `;
}

async function guardarEscenarioGrat(){
  if(!_simResultadoGrat) return;
  const nombre = await showPrompt({titulo:'Guardar escenario',placeholder:'Nombre del escenario',valorDefault:_simResultadoGrat.concepto,labelOk:'Guardar'});
  if(!nombre) return;
  const arr = getSimulaciones();
  arr.push({
    id: 'sim_' + Date.now(),
    tipo: 'gratificacion',
    nombre,
    fecha: new Date().toISOString(),
    config: {
      concepto: _simResultadoGrat.concepto,
      naturaleza: _simResultadoGrat.tipo,
      modo: _simResultadoGrat.modo,
      valor: _simResultadoGrat.valor,
      empFiltro: _simResultadoGrat.empFiltro,
      sindFiltro: _simResultadoGrat.sindFiltro
    },
    totales: _simResultadoGrat.totales,
    cnt: _simResultadoGrat.items.length
  });
  saveSimulaciones(arr);
  toast('✓ Escenario guardado', 'var(--green)');
}

function exportarSimGratCSV(){
  if(!_simResultadoGrat) return;
  const r = _simResultadoGrat;
  const headers = ['Legajo','Empleado','Empresa','Bruto','Importe','Aportes','Neto','Contribuciones','Incidencia SAC','Costo total'];
  const rows = r.items.map(it => [
    it.leg,
    `"${(it.nom||'').replace(/"/g,'""')}"`,
    `"${(it.emp||'').replace(/"/g,'""')}"`,
    it.bruto.toFixed(2),
    it.importe.toFixed(2),
    it.aportes.toFixed(2),
    it.neto.toFixed(2),
    it.contrib.toFixed(2),
    it.incidSac.toFixed(2),
    it.costo.toFixed(2)
  ]);
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gratificacion_${r.concepto.replace(/[^\w]/g,'_')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ CSV exportado', 'var(--green)');
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — LIQUIDACIÓN FINAL POR BAJA (7 supuestos legales)
// ════════════════════════════════════════════════════════════════
const SIM_TIPOS_BAJA = [
  { v:'renuncia',     lbl:'Renuncia (Art. 240 LCT)',                desc:'Sólo SAC y vacaciones proporcionales. Sin indemnización ni preaviso.' },
  { v:'sin-causa',    lbl:'Despido sin causa (Art. 245 LCT)',       desc:'Indemnización + preaviso + integración + SAC y vacaciones proporcionales.' },
  { v:'con-causa',    lbl:'Despido con justa causa (Art. 242 LCT)', desc:'Sólo SAC y vacaciones proporcionales. Sin indemnización ni preaviso.' },
  { v:'mutuo',        lbl:'Mutuo acuerdo (Art. 241 LCT)',            desc:'SAC + vacaciones proporcionales + monto pactado (50% indemniz. típico).' },
  { v:'jubilacion',   lbl:'Jubilación / Retiro (Art. 252 LCT)',     desc:'SAC + vacaciones proporcionales. Sin indemnización art. 245.' },
  { v:'fallecimiento',lbl:'Fallecimiento (Art. 248 LCT)',           desc:'50% de la indemnización Art. 245 + SAC y vacaciones proporcionales (a herederos).' },
  { v:'prueba',       lbl:'Período de prueba (Art. 92 bis LCT)',    desc:'Sin indemnización. Preaviso de 15 días si no se otorgó. SAC y vacaciones proporc.' }
];

function renderSimFinal(){
  const cont = document.getElementById('sim-content');
  if(!cont) return;
  const nomina = getNomina().filter(e => !e._deBaja && !e.egreso).sort((a,b)=>(a.nom||'').localeCompare(b.nom||''));

  cont.innerHTML = `
    <div class="card" style="padding:18px 20px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:14px">📤 Datos de la baja a simular</div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
        <div style="grid-column:span 2">
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Empleado</label>
          <select id="fin-emp" onchange="actualizarPreviewEmp()" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="">— Seleccionar —</option>
            ${nomina.map(e => {
              const ing = e.ing || '—';
              const sinFecha = !e.ing ? ' ⚠ sin fecha de ingreso' : '';
              return `<option value="${e.leg}" ${sinFecha?'data-warning="1"':''}>${e.nom||e.leg} · ${e.emp||''} · Ing. ${ing}${sinFecha}</option>`;
            }).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Tipo de baja</label>
          <select id="fin-tipo" onchange="actualizarHelperBaja()" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            ${SIM_TIPOS_BAJA.map(t=>`<option value="${t.v}">${t.lbl}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Fecha de cese</label>
          <input id="fin-fecha" type="date" value="${new Date().toISOString().split('T')[0]}" onchange="actualizarPreviewEmp()" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Días vacaciones gozadas (año)</label>
          <input id="fin-vac-gozadas" type="number" value="0" min="0" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;display:block;margin-bottom:4px">Preaviso otorgado</label>
          <select id="fin-preaviso" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);padding:8px;font-size:13px">
            <option value="no">No (se paga indemnización sustitutiva)</option>
            <option value="si">Sí (no se abona)</option>
          </select>
        </div>
      </div>

      <!-- Preview empleado seleccionado: antigüedad calculada en vivo -->
      <div id="fin-preview-emp" style="margin-top:14px;display:none"></div>

      <div id="fin-helper" style="margin-top:14px;padding:10px 12px;background:var(--bg2);border-radius:var(--r);border-left:3px solid rgb(94,194,255);font-size:11px;color:var(--t2);line-height:1.6"></div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="ejecutarSimFinal()">⚖️ Calcular liquidación final</button>
        <button class="btn btn-ghost" onclick="guardarEscenarioFinal()" id="sim-btn-guardar-fin" disabled>💾 Guardar escenario</button>
      </div>
    </div>

    <div id="sim-result-final"></div>
  `;
  actualizarHelperBaja();
}

// Preview en vivo: muestra fecha de ingreso parseada y antigüedad al cese
function actualizarPreviewEmp(){
  const leg = document.getElementById('fin-emp')?.value;
  const fechaCeseStr = document.getElementById('fin-fecha')?.value;
  const box = document.getElementById('fin-preview-emp');
  if(!box) return;

  if(!leg){ box.style.display = 'none'; return; }
  const emp = getNomina().find(e => e.leg === leg);
  if(!emp){ box.style.display = 'none'; return; }

  // Parseo robusto reutilizando el helper del portal
  const fIng = (typeof parseFechaIng === 'function') ? parseFechaIng(emp.ing) : null;
  const fechaCese = fechaCeseStr ? new Date(fechaCeseStr + 'T00:00:00') : null;

  // Casos de error
  if(!emp.ing || !fIng){
    box.style.display = 'block';
    box.innerHTML = `
      <div style="padding:10px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:var(--r);font-size:12px;color:var(--red);line-height:1.6">
        ⚠️ Este empleado <b>no tiene fecha de ingreso válida cargada</b> (valor: <code>${emp.ing||'(vacío)'}</code>). No se puede calcular antigüedad ni vacaciones proporcionales hasta corregir el dato desde ABM Empleados.
      </div>`;
    return;
  }
  if(fechaCese && fIng > fechaCese){
    box.style.display = 'block';
    box.innerHTML = `
      <div style="padding:10px 14px;background:rgba(251,168,52,.08);border:1px solid rgba(251,168,52,.3);border-radius:var(--r);font-size:12px;color:rgb(251,168,52);line-height:1.6">
        ⚠️ La fecha de cese (${fechaCese.toLocaleDateString('es-AR')}) es <b>anterior a la fecha de ingreso</b> (${fIng.toLocaleDateString('es-AR')}). Revisá ambos datos.
      </div>`;
    return;
  }

  // OK — calcular antigüedad
  const ref = fechaCese || new Date();
  const anios = (ref - fIng) / (1000*60*60*24*365.25);
  const aniosCompletos = Math.floor(anios);
  const mesesExtra = (anios - aniosCompletos) * 12;
  const aniosAplicables = aniosCompletos + (mesesExtra > 3 ? 1 : 0);

  // Días anuales de vacaciones según antigüedad (Art. 150 LCT)
  let diasVacAnuales = 14;
  if(anios >= 5 && anios < 10) diasVacAnuales = 21;
  else if(anios >= 10 && anios < 20) diasVacAnuales = 28;
  else if(anios >= 20) diasVacAnuales = 35;

  box.style.display = 'block';
  box.innerHTML = `
    <div style="padding:12px 14px;background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;font-size:12px">
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Fecha ingreso</div>
        <div style="font-weight:600;color:var(--t1);font-family:var(--font-mono)">${fIng.toLocaleDateString('es-AR')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Antigüedad real</div>
        <div style="font-weight:600;color:var(--t1);font-family:var(--font-mono)">${anios.toFixed(2)} años</div>
        <div style="font-size:10px;color:var(--t3)">${aniosCompletos}a ${Math.floor(mesesExtra)}m</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Computables Art. 245</div>
        <div style="font-weight:600;color:var(--accent2);font-family:var(--font-mono)">${aniosAplicables} año(s)</div>
        <div style="font-size:10px;color:var(--t3)">+1 si fracción >3 meses</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Vac. anuales</div>
        <div style="font-weight:600;color:var(--green);font-family:var(--font-mono)">${diasVacAnuales} días</div>
        <div style="font-size:10px;color:var(--t3)">según Art. 150</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Bruto cargado</div>
        <div style="font-weight:600;color:var(--t1);font-family:var(--font-mono)">${_simFmt(Number(emp.bruto)||0)}</div>
      </div>
    </div>`;
}

function actualizarHelperBaja(){
  const tipo = document.getElementById('fin-tipo')?.value;
  const helper = document.getElementById('fin-helper');
  if(!helper) return;
  const t = SIM_TIPOS_BAJA.find(x => x.v === tipo);
  if(!t){ helper.textContent = ''; return; }
  helper.innerHTML = `📌 <b>${t.lbl}:</b> ${t.desc}`;
}

async function ejecutarSimFinal(){
  const leg = document.getElementById('fin-emp').value;
  const tipo = document.getElementById('fin-tipo').value;
  const fechaCeseStr = document.getElementById('fin-fecha').value;
  const vacGozadas = parseInt(document.getElementById('fin-vac-gozadas')?.value || '0', 10) || 0;
  const preavisoOtorgado = document.getElementById('fin-preaviso').value === 'si';

  if(!leg){ toast('⚠ Seleccioná un empleado', 'var(--yellow)'); return; }
  if(!fechaCeseStr){ toast('⚠ Ingresá la fecha de cese', 'var(--yellow)'); return; }

  const emp = getNomina().find(e => e.leg === leg);
  if(!emp){ toast('⚠ Empleado no encontrado', 'var(--red)'); return; }

  const fechaCese = new Date(fechaCeseStr + 'T00:00:00');
  // BUGFIX: el campo `emp.ing` viene en formato dd/mm/yyyy (formato AR del seed).
  // `new Date('01/08/2023')` lo interpreta como mes/día/año en algunos navegadores
  // y como Invalid Date en otros, rompiendo el cálculo de antigüedad y vacaciones.
  // El portal tiene `parseFechaIng()` que maneja ambos formatos (dd/mm/yyyy y
  // yyyy-mm-dd) — lo reusamos para coherencia con el resto del sistema.
  const fechaIng = (typeof parseFechaIng === 'function') ? parseFechaIng(emp.ing) : null;
  if(!fechaIng || isNaN(fechaIng.getTime())){
    toast('⚠ Empleado sin fecha de ingreso válida', 'var(--red)');
    return;
  }
  if(fechaIng > fechaCese){
    toast('⚠ La fecha de cese es anterior a la fecha de ingreso', 'var(--yellow)');
    return;
  }

  const bruto = Number(emp.bruto) || 0;
  if(bruto <= 0){ toast('⚠ Empleado sin remuneración cargada', 'var(--red)'); return; }

  // ─ Antigüedad ─
  const anios = (fechaCese - fechaIng) / (1000*60*60*24*365.25);
  const aniosCompletos = Math.floor(anios);
  const mesesExtra = (anios - aniosCompletos) * 12;
  // Art. 245: 1 mes por año o fracción mayor a 3 meses
  const aniosAplicables = aniosCompletos + (mesesExtra > 3 ? 1 : 0);

  // ─ Mejor remuneración mensual normal y habitual del último año (Art. 245) ─
  // Sin histórico de liquidaciones, asumimos = bruto actual + antigüedad + presentismo
  const params = (typeof getDefaultLiqParams === 'function') ? getDefaultLiqParams() : {};
  const pctAntig = (typeof getPctAntiguedadPorAnio === 'function')
    ? getPctAntiguedadPorAnio(emp, params) * Math.floor(anios)
    : 0;
  const mejorRem = bruto + (bruto * pctAntig/100) + (bruto * (params.pctPresentismo||5)/100);

  // ─ Topes Art. 245 (3 mejores remuneraciones del último año, según tope conv.) ─
  // Sin tablas de topes vigentes accesibles, no aplicamos tope (advertencia)
  const baseIndem = mejorRem;

  // ─ SAC proporcional ─
  // SAC = mejorBruto/12 × (días desde 1° de semestre / 180)
  // Semestre actual: ene-jun o jul-dic
  const mesC = fechaCese.getMonth() + 1;
  const inicioSem = new Date(fechaCese.getFullYear(), mesC <= 6 ? 0 : 6, 1);
  const diasSemestre = Math.ceil((fechaCese - inicioSem) / (1000*60*60*24));
  const sacProporcional = (bruto / 12) * (diasSemestre / 180);

  // ─ Vacaciones proporcionales (Art. 156 LCT) ─
  // Días que corresponden por antigüedad / 12 × meses trabajados en el año
  let diasVacAnuales = 14; // <5 años
  if(anios >= 5 && anios < 10) diasVacAnuales = 21;
  else if(anios >= 10 && anios < 20) diasVacAnuales = 28;
  else if(anios >= 20) diasVacAnuales = 35;
  const inicioAnio = new Date(fechaCese.getFullYear(), 0, 1);
  const diasAnioTrab = Math.ceil((fechaCese - inicioAnio) / (1000*60*60*24));
  const diasVacProp = Math.max(0, (diasVacAnuales / 365 * diasAnioTrab) - vacGozadas);
  const valorDiaVac = bruto / 25; // Art. 155 LCT
  const importeVac = diasVacProp * valorDiaVac;
  const sacSobreVac = importeVac / 12;

  // ─ Cálculos según tipo de baja ─
  let indem245 = 0;
  let preaviso = 0;
  let integracionMes = 0;
  let sacPreaviso = 0;
  let sacIntegracion = 0;
  let detalleNotas = [];

  if(tipo === 'sin-causa'){
    indem245 = baseIndem * aniosAplicables;
    if(!preavisoOtorgado){
      // Preaviso Art. 232: 15d (prueba), 1 mes (<5 años), 2 meses (>=5 años)
      const mesesPreaviso = anios >= 5 ? 2 : 1;
      preaviso = baseIndem * mesesPreaviso;
      sacPreaviso = preaviso / 12;
    }
    // Integración mes (Art. 233): días que faltan hasta fin de mes
    const ultDiaMes = new Date(fechaCese.getFullYear(), fechaCese.getMonth()+1, 0).getDate();
    const diasFaltantes = ultDiaMes - fechaCese.getDate();
    integracionMes = (bruto / ultDiaMes) * diasFaltantes;
    sacIntegracion = integracionMes / 12;
    detalleNotas.push(`Despido sin causa: ${aniosAplicables} año(s) computables × 1 mejor remuneración (${_simFmt(baseIndem)})`);
    if(!preavisoOtorgado) detalleNotas.push(`Preaviso sustitutivo: ${anios >= 5 ? '2 meses' : '1 mes'}`);
    detalleNotas.push(`Integración mes despido: ${ultDiaMes - fechaCese.getDate()} día(s)`);
    detalleNotas.push('⚠ Sin tope convencional aplicado — verificar Art. 245 con tope vigente del CCT.');
  } else if(tipo === 'fallecimiento'){
    indem245 = baseIndem * aniosAplicables * 0.5;
    detalleNotas.push(`Fallecimiento Art. 248: 50% de Art. 245 = ${aniosAplicables} año(s) × ${_simFmt(baseIndem)} × 50%`);
  } else if(tipo === 'mutuo'){
    indem245 = baseIndem * aniosAplicables * 0.5; // típico — pactable
    detalleNotas.push(`Mutuo acuerdo: 50% típico de la indemnización Art. 245 (pactable entre partes)`);
  } else if(tipo === 'jubilacion'){
    detalleNotas.push('Jubilación: sólo SAC y vacaciones proporcionales');
  } else if(tipo === 'renuncia'){
    detalleNotas.push('Renuncia: sólo SAC y vacaciones proporcionales');
  } else if(tipo === 'con-causa'){
    detalleNotas.push('Despido con justa causa: sólo SAC y vacaciones proporcionales');
  } else if(tipo === 'prueba'){
    if(!preavisoOtorgado) preaviso = baseIndem * 0.5; // 15 días = medio mes
    detalleNotas.push('Período de prueba: sin indemnización Art. 245' + (preavisoOtorgado?'':' · preaviso 15 días'));
  }

  // Totales
  const totalRemunerativo = sacProporcional + sacSobreVac + sacPreaviso + sacIntegracion + integracionMes;
  const totalNoRemunerativo = indem245 + preaviso + importeVac;

  // Aportes (sólo sobre remunerativo) — con tope remuneratorio ANSES/ARCA
  const pctAportes = (params.pctJubilacion||11) + (params.pctObraSocial||3) + (params.pctAnssal||0.5) + (params.pctPamiEmp||3);
  const _topesFinal = (typeof resolveTopesAportesParaFecha === 'function')
    ? (await resolveTopesAportesParaFecha(fechaCeseStr || new Date().toISOString().slice(0,10)))
    : { topeMax: Infinity, topeMin: 0 };
  const baseRemAportes = Math.min(totalRemunerativo, _topesFinal.topeMax || Infinity);
  const aportes = baseRemAportes * pctAportes/100;
  const totalNeto = (totalRemunerativo + totalNoRemunerativo) - aportes;

  // Contribuciones (sólo sobre remunerativo — patronal jubilación SIN tope Art. 9 Ley 26.417)
  const pctContrib = (params.pctJubPatronal||10.17) + (params.pctOsPatronal||6) + (params.pctPamiPatronal||1.5) +
                     (params.pctDesempleo||0.89) + (params.pctArt||1.5);
  const contrib = totalRemunerativo * pctContrib/100;
  const totalCosto = (totalRemunerativo + totalNoRemunerativo) + contrib;

  _simResultadoFinal = {
    emp, tipo, fechaCese: fechaCeseStr, anios, aniosAplicables,
    mejorRem, baseIndem, vacGozadas, diasVacAnuales, diasVacProp,
    sacProporcional, importeVac, sacSobreVac,
    indem245, preaviso, sacPreaviso, integracionMes, sacIntegracion,
    totalRemunerativo, totalNoRemunerativo, aportes, totalNeto, contrib, totalCosto,
    detalleNotas
  };

  document.getElementById('sim-btn-guardar-fin').disabled = false;
  pintarResultadoFinal();
  toast('✓ Liquidación final calculada', 'var(--green)');
}

function pintarResultadoFinal(){
  const cont = document.getElementById('sim-result-final');
  if(!cont || !_simResultadoFinal) return;
  const r = _simResultadoFinal;
  const tInfo = SIM_TIPOS_BAJA.find(t => t.v === r.tipo);

  const filaRubro = (lbl, monto, color, nota='') => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:12px">${lbl}${nota?`<div style="font-size:10px;color:var(--t3);margin-top:2px">${nota}</div>`:''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:13px;color:${color||'var(--t1)'};font-weight:600">${_simFmt(monto)}</td>
    </tr>
  `;

  cont.innerHTML = `
    <!-- Cabecera empleado -->
    <div class="card" style="padding:16px 20px;margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px">
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Empleado</div>
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${r.emp.nom||r.emp.leg}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Leg ${r.emp.leg} · ${r.emp.emp||''}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Tipo de baja</div>
        <div style="font-size:13px;font-weight:600;color:rgb(251,168,52)">${tInfo?.lbl||r.tipo}</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Antigüedad</div>
        <div style="font-size:14px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${r.anios.toFixed(2)} años</div>
        <div style="font-size:11px;color:var(--t3)">${r.aniosAplicables} computables (Art. 245)</div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">Base Art. 245</div>
        <div style="font-size:14px;font-weight:600;color:var(--accent2);font-family:var(--font-mono)">${_simFmt(r.baseIndem)}</div>
        <div style="font-size:10px;color:var(--t3)">mejor rem. mensual</div>
      </div>
    </div>

    <!-- Detalle conceptos -->
    <div class="card" style="padding:0;margin-bottom:16px;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;color:var(--t1)">📋 Detalle de conceptos</div>
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          <tr style="background:var(--bg2)">
            <td colspan="2" style="padding:6px 12px;font-size:10px;color:var(--accent2);font-family:var(--font-mono);text-transform:uppercase;font-weight:600">Conceptos remunerativos</td>
          </tr>
          ${filaRubro('SAC proporcional al cese', r.sacProporcional, 'var(--accent2)', `${(r.aniosAplicables>=0?'Bruto/12 × días en semestre/180':'')}`)}
          ${r.preaviso > 0 ? filaRubro('SAC sobre preaviso', r.sacPreaviso, 'var(--accent2)') : ''}
          ${r.integracionMes > 0 ? filaRubro('Integración mes despido', r.integracionMes, 'var(--accent2)', 'Art. 233 LCT — días faltantes del mes') : ''}
          ${r.integracionMes > 0 ? filaRubro('SAC sobre integración', r.sacIntegracion, 'var(--accent2)') : ''}
          ${filaRubro('SAC sobre vacaciones', r.sacSobreVac, 'var(--accent2)')}

          <tr style="background:var(--bg2)">
            <td colspan="2" style="padding:6px 12px;font-size:10px;color:rgb(168,85,247);font-family:var(--font-mono);text-transform:uppercase;font-weight:600">Conceptos NO remunerativos</td>
          </tr>
          ${r.indem245 > 0 ? filaRubro('Indemnización por antigüedad (Art. 245)', r.indem245, 'rgb(168,85,247)', `${r.aniosAplicables} año(s) × ${_simFmt(r.baseIndem)}`) : ''}
          ${r.preaviso > 0 ? filaRubro('Preaviso sustitutivo (Art. 232)', r.preaviso, 'rgb(168,85,247)') : ''}
          ${filaRubro(`Vacaciones proporcionales no gozadas (${r.diasVacProp.toFixed(1)} días)`, r.importeVac, 'rgb(168,85,247)', `${r.diasVacAnuales} días/año correspondientes − ${r.vacGozadas} ya gozados`)}

          <tr style="background:var(--bg1);border-top:2px solid var(--border)">
            <td style="padding:10px 12px;font-size:12px;font-weight:600;color:var(--t1)">SUBTOTAL BRUTO</td>
            <td style="padding:10px 12px;text-align:right;font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--t1)">${_simFmt(r.totalRemunerativo + r.totalNoRemunerativo)}</td>
          </tr>
          ${filaRubro('Aportes (Jub. + OS + PAMI sobre remunerativo)', -r.aportes, 'var(--red)', `Sólo se aplica al remunerativo: ${_simFmt(r.totalRemunerativo)}`)}
          <tr style="background:rgba(34,197,94,.08);border-top:2px solid rgba(34,197,94,.3)">
            <td style="padding:12px 12px;font-size:13px;font-weight:700;color:var(--green)">💰 NETO A PERCIBIR</td>
            <td style="padding:12px 12px;text-align:right;font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--green)">${_simFmt(r.totalNeto)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Costo empleador -->
    <div class="card" style="padding:14px 16px;margin-bottom:16px;border:2px solid rgba(251,168,52,.4)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:2px">💸 COSTO TOTAL EMPRESA</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">Bruto + contribuciones patronales (${_simFmt(r.contrib)})</div>
        </div>
        <div style="font-size:24px;font-weight:700;color:rgb(251,168,52);font-family:var(--font-mono)">${_simFmt(r.totalCosto)}</div>
      </div>
    </div>

    <!-- Notas legales -->
    <div class="card" style="padding:14px 16px">
      <div style="font-size:12px;font-weight:600;color:var(--t2);margin-bottom:8px">📌 Notas y referencias legales</div>
      <ul style="margin:0;padding-left:18px;font-size:11px;color:var(--t3);line-height:1.7">
        ${r.detalleNotas.map(n => `<li>${n}</li>`).join('')}
        <li>Cálculos basados en Ley de Contrato de Trabajo (Ley 20.744 t.o.). Verificar tope convencional Art. 245 según CCT aplicable.</li>
        <li>Sin contemplación de multas Art. 8 Ley 24.013, Art. 80 LCT, Art. 132 bis (litigiosas).</li>
        <li>Esta es una <b>simulación informativa</b>. La liquidación final oficial debe procesarla un contador habilitado.</li>
      </ul>
    </div>
  `;
}

async function guardarEscenarioFinal(){
  if(!_simResultadoFinal) return;
  const r = _simResultadoFinal;
  const tInfo = SIM_TIPOS_BAJA.find(t => t.v === r.tipo);
  const nombre = await showPrompt({titulo:'Guardar escenario',placeholder:'Nombre del escenario',valorDefault:`${(r.emp.nom||'').split(',')[0]} · ${tInfo?.lbl||r.tipo}`,labelOk:'Guardar'});
  if(!nombre) return;
  const arr = getSimulaciones();
  arr.push({
    id: 'sim_' + Date.now(),
    tipo: 'final',
    nombre,
    fecha: new Date().toISOString(),
    config: {
      empLeg: r.emp.leg,
      empNom: r.emp.nom,
      tipoBaja: r.tipo,
      fechaCese: r.fechaCese
    },
    totales: {
      totalBruto: r.totalRemunerativo + r.totalNoRemunerativo,
      totalNeto: r.totalNeto,
      totalCosto: r.totalCosto,
      indem245: r.indem245,
      preaviso: r.preaviso,
      vacaciones: r.importeVac,
      sac: r.sacProporcional + r.sacPreaviso + r.sacIntegracion + r.sacSobreVac
    },
    cnt: 1
  });
  saveSimulaciones(arr);
  toast('✓ Escenario guardado', 'var(--green)');
}

// ════════════════════════════════════════════════════════════════
// TAB 4 — COMPARATIVA DE ESCENARIOS GUARDADOS
// ════════════════════════════════════════════════════════════════
function renderSimComparativa(){
  const cont = document.getElementById('sim-content');
  if(!cont) return;
  const arr = getSimulaciones().slice().reverse();

  if(!arr.length){
    cont.innerHTML = `
      <div class="card" style="padding:36px;text-align:center;color:var(--t3)">
        <div style="font-size:34px;margin-bottom:10px">📈</div>
        <div style="font-size:14px;color:var(--t2);margin-bottom:6px">Aún no guardaste escenarios</div>
        <div style="font-size:12px">Calculá una simulación en cualquiera de las pestañas anteriores y tocá <b>💾 Guardar escenario</b> para verla acá.</div>
      </div>`;
    return;
  }

  const labels = { mensual:'📊 Mensual', gratificacion:'🎁 Gratificación', final:'📤 Liquidación final' };
  const colores = { mensual:'rgb(251,168,52)', gratificacion:'rgb(94,194,255)', final:'rgb(168,85,247)' };

  const filas = arr.map(s => {
    const t = s.totales || {};
    const fecha = new Date(s.fecha).toLocaleDateString('es-AR');
    const detalle = s.tipo === 'mensual'
      ? `${s.config.mes}/${s.config.anio} · +${s.config.pctInc}% / +${_simFmt(s.config.montoInc||0)} · ${s.cnt} emp`
      : s.tipo === 'gratificacion'
      ? `${s.config.naturaleza === 'rem'?'Rem':'No rem'} · ${s.config.modo} · ${s.cnt} emp`
      : `${s.config.empNom||s.config.empLeg} · ${s.config.tipoBaja} · cese ${s.config.fechaCese}`;
    const importe = t.totalCosto || t.totalBrutoSim || t.totalImporte || 0;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border)">
          <div style="font-size:12px;font-weight:600;color:var(--t1)">${s.nombre}</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">${detalle}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border);font-size:11px;color:${colores[s.tipo]||'var(--t2)'};font-family:var(--font-mono)">${labels[s.tipo]||s.tipo}</td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--t3)">${fecha}</td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono);font-size:13px;color:rgb(251,168,52);font-weight:600">${_simFmt(importe)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:center">
          <button class="btn btn-ghost" onclick="eliminarEscenario('${s.id}')" style="font-size:11px;padding:4px 10px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Eliminar">✕</button>
        </td>
      </tr>
    `;
  }).join('');

  // Agregados rápidos
  const totales = { mensual:0, gratificacion:0, final:0 };
  arr.forEach(s => {
    const v = s.totales?.totalCosto || s.totales?.totalBrutoSim || s.totales?.totalImporte || 0;
    if(totales[s.tipo] !== undefined) totales[s.tipo] += v;
  });

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px 16px">
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Total escenarios</div>
        <div style="font-size:22px;font-weight:600;color:var(--t1);font-family:var(--font-mono)">${arr.length}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(251,168,52,.3)">
        <div style="font-size:10px;color:rgb(251,168,52);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Mensuales acumul.</div>
        <div style="font-size:18px;font-weight:600;color:rgb(251,168,52);font-family:var(--font-mono)">${_simFmt(totales.mensual)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(94,194,255,.3)">
        <div style="font-size:10px;color:rgb(94,194,255);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Gratificaciones acum.</div>
        <div style="font-size:18px;font-weight:600;color:rgb(94,194,255);font-family:var(--font-mono)">${_simFmt(totales.gratificacion)}</div>
      </div>
      <div class="card" style="padding:14px 16px;border-color:rgba(168,85,247,.3)">
        <div style="font-size:10px;color:rgb(168,85,247);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:4px">Bajas acumul.</div>
        <div style="font-size:18px;font-weight:600;color:rgb(168,85,247);font-family:var(--font-mono)">${_simFmt(totales.final)}</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="font-size:13px;font-weight:600;color:var(--t1)">📈 Escenarios guardados</div>
        <button class="btn btn-ghost" onclick="limpiarTodosEscenarios()" style="font-size:11px;padding:4px 10px;color:var(--red);border-color:rgba(239,68,68,.3)">🗑 Vaciar todo</button>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--bg2)">
            <th style="padding:10px 12px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Escenario</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Tipo</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Fecha</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase">Costo total</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;color:var(--t3);font-family:var(--font-mono);text-transform:uppercase"></th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

async function eliminarEscenario(id){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Eliminar este escenario guardado?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const arr = getSimulaciones().filter(s => s.id !== id);
  saveSimulaciones(arr);
  renderSimComparativa();
  toast('✓ Escenario eliminado', 'var(--yellow)');
}

async function limpiarTodosEscenarios(){
  const arr = getSimulaciones();
  if(!arr.length) return;
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar los ${arr.length} escenarios guardados? Esta acción no se puede deshacer.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  saveSimulaciones([]);
  renderSimComparativa();
  toast('✓ Todos los escenarios eliminados', 'var(--yellow)');
}

async function enviarCambioDomicilio(){
  const calle = document.getElementById('new-dom-calle').value.trim();
  const nro   = document.getElementById('new-dom-nro').value.trim();
  const piso  = document.getElementById('new-dom-piso').value.trim();
  const depto = document.getElementById('new-dom-depto').value.trim();
  const loc   = document.getElementById('new-dom-loc').value.trim();
  const prov  = document.getElementById('new-dom-prov').value.trim();
  const cp    = document.getElementById('new-dom-cp').value.trim();
  if(!calle){ toast('⚠ Ingresá la calle','var(--yellow)'); return; }
  if(!nro)  { toast('⚠ Ingresá el número','var(--yellow)'); return; }
  if(!loc)  { toast('⚠ Ingresá la localidad','var(--yellow)'); return; }

  const emp = currentUser.emp;
  const partes = [calle, nro];
  if(piso)  partes.push(`Piso ${piso}`);
  if(depto) partes.push(`Dto ${depto}`);
  const dom = partes.join(' ');
  const ciudad = `${loc}${prov ? ', ' + prov : ''}${cp ? ' (' + cp + ')' : ''}`;

  const db = await abrirIDB();
  await new Promise((res,rej)=>{
    const tx = db.transaction('cambios_domicilio','readwrite');
    const req = tx.objectStore('cambios_domicilio').add({
      leg:emp.leg, nom:emp.nom, emp:emp.emp, lugar:emp.lugar,
      area: getValidador(emp)?.area||'',
      domAnterior: (DOMICILIOS[emp.leg]?.dom||'') + ' — ' + (DOMICILIOS[emp.leg]?.ciudad||''),
      domNuevo: dom + ' — ' + ciudad,
      calle, nro, piso, depto, loc, prov, cp,
      estado: 'pendiente',
      fecha: new Date().toLocaleDateString('es-AR'),
      hora:  new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
    });
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });

  document.getElementById('form-cambio-dom').style.display='none';
  document.getElementById('dom-confirmacion').style.display='block';
  toast('✓ Cambio de domicilio enviado a RR.HH.','var(--green)');
}

