// ═══════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN — Planilla de Acreditación de Haberes Banco Galicia
// ───────────────────────────────────────────────────────────────────────────
// Genera un .xlsx por cada empresa con empleados en la liquidación, con
// el formato exacto que pide Galicia (19 columnas, fórmula MID en col 3,
// CUIT como número, fechas como datetime, importe con formato moneda).
//
// Lógica de fechas (según RRHH LEITEN):
//   - Empleados sin retención de Ganancias → último día del mes liquidado
//   - Empleados con retención (item.ganancias > 0) → primer día del mes
//     siguiente al período liquidado
//
// Las fechas son CALENDARIO PURO — no se saltan ni fines de semana ni
// feriados. Si un día puntual cae mal, el operador edita la fecha en el
// modal antes de generar.
//
// Empleados sin CBU cargado quedan listados aparte para que RR.HH. los complete.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Constantes del formato Galicia ───────────────────────────────────────
const _GAL_HEADERS = [
  'legajo',                                       // 1
  'NOMBRE DEL BENEFICIARIO',                      // 2
  'NOMBRE DEL BENEFICIARIO',                      // 3 (fórmula =+MID(B,1,16))
  'CUIT DEL BENEFICIARIO',                        // 4
  'FECHA DE ACREDITACION',                        // 5
  'TIPO CUENTA CREDITO',                          // 6
  'Moneda Crédito',                               // 7
  'CUENTA CREDITO (Solo si es cuenta Galicia)',   // 8
  'CBU CREDITO',                                  // 9
  'IMPORTE DEL PAGO',                             // 10
  'Leyenda Credito',                              // 11
  'IDENTIFICACION INTERNA',                       // 12
  'Fecha de Proceso',                             // 13
  'CODIGO DE CONCEPTO',                           // 14
  'PAGO A COMERCIO',                              // 15
  'NUMERO DE VEP (Solo para Pagos AFIP)',         // 16
  'EMAIL BENEFICIARIO',                           // 17
  'LEYENDA DEBITO',                               // 18
  'PERIODO (Solo para Cese Laboral)'              // 19
];

const _GAL_TIPO_CUENTA   = 'Caja de Ahorro';
const _GAL_MONEDA        = 'pesos';
const _GAL_COD_CONCEPTO  = 'Acreditamiento Haberes'; // sí, así lo pide Galicia
const _GAL_FMT_IMPORTE   = '_-"$"\\ * #,##0.00_-;\\-"$"\\ * #,##0.00_-;_-"$"\\ * "-"??_-;_-@_-';
const _GAL_FMT_FECHA     = 'mm-dd-yy';

const _MES_NOMBRES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                      'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

// Fechas por defecto — calendario puro (sin saltar fin de semana ni feriados).
// Si el operador necesita correr la fecha (porque cae feriado o fin de semana)
// lo hace manualmente desde el modal.

// Último día del mes liquidado (anio, mes 1-12).
function _galUltimoDiaMes(anio, mes){
  return new Date(anio, mes, 0); // día 0 del mes siguiente = último del actual
}

// Primer día del mes siguiente a (anio, mes 1-12).
function _galPrimerDiaMesSiguiente(anio, mes){
  const sigAnio = mes === 12 ? anio + 1 : anio;
  const sigMes  = mes === 12 ? 1 : mes + 1;
  return new Date(sigAnio, sigMes - 1, 1);
}

// Convierte "20-40306861-7" → 20403068617 (número entero).
function _galCuitANumero(cuil){
  const limpio = String(cuil || '').replace(/[^0-9]/g, '');
  if(limpio.length !== 11) return null;
  return parseInt(limpio, 10);
}

// Convierte "MEZA, JESUS EMANUEL" → "MEZA JESUS EMANUEL"
// y normaliza espacios. Mayúsculas se respetan tal como vienen (el portal ya
// guarda los nombres en mayúsculas).
function _galNombreBenef(nom){
  return String(nom || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

// Lee el CBU + tipo de cuenta de un empleado desde los overrides del ABM.
// Devuelve { cbu, tipoCuentaLabel } o { cbu:'', tipoCuentaLabel:'Caja de Ahorro' }.
function _galGetCBU(leg){
  try {
    const ov = (typeof getAbmOverrides === 'function') ? getAbmOverrides() : {};
    const e = ov[leg] || {};
    return {
      cbu: String(e.cbu || '').replace(/\s+/g, '').trim(),
      tipoCuentaLabel: e.tipoCuenta === 'CC' ? 'Cuenta Corriente' : 'Caja de Ahorro'
    };
  } catch(e){ return { cbu: '', tipoCuentaLabel: 'Caja de Ahorro' }; }
}

// Determina si el ítem tiene retención/devolución de Ganancias.
// Hoy el motor solo guarda retenciones positivas en `item.ganancias`. Si en el
// futuro se agregan devoluciones (negativas), el || cubre ambos casos.
function _galTieneGanancias(item){
  return Math.abs(Number(item.ganancias) || 0) > 0.005;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE OPCIONES
// ═══════════════════════════════════════════════════════════════════════════

let _galModalCtx = null; // { liq, gruposPorEmp, sinCBU, ... }

async function abrirModalPlanillaGalicia(){
  if(typeof XLSX === 'undefined'){
    toast('⚠ Librería XLSX no disponible. Recargá la página e intentá de nuevo.','var(--red)');
    return;
  }
  const liq = (typeof liqReporteContext === 'function') ? liqReporteContext() : null;
  if(!liq) return;
  if(!liq.items || !liq.items.length){
    toast('⚠ La liquidación no tiene items','var(--yellow)');
    return;
  }

  // Agrupar items por empresa, expandiendo cada empleado a tantas filas como
  // CBUs activos tenga (cada uno lleva el % correspondiente del neto).
  // El "snapshot" se toma al momento de generar la planilla — cierre.
  const gruposPorEmp = {};
  const sinCBU = [];
  const sumaIncompleta = []; // empleados cuyos CBUs activos no suman 100%
  liq.items.forEach(i => {
    const activos = (typeof getCBUsActivos === 'function') ? getCBUsActivos(i.leg) : [];
    if(!activos.length){
      sinCBU.push({...i, _empresa: i.empresa || '(sin empresa)'});
      return;
    }
    // Validar que sumen 100%
    const suma = activos.reduce((s,c) => s + Number(c.porcentaje || 0), 0);
    if(Math.abs(suma - 100) > 0.01){
      sumaIncompleta.push({...i, _empresa: i.empresa || '(sin empresa)', _suma: suma, _cbusActivos: activos});
      return;
    }
    const k = i.empresa || '(sin empresa)';
    if(!gruposPorEmp[k]) gruposPorEmp[k] = [];
    activos.forEach(c => {
      const importeProporcional = Math.round((Number(i.netoAPagar || i.neto || 0) * Number(c.porcentaje) / 100) * 100) / 100;
      gruposPorEmp[k].push({
        ...i,
        _cbu: c.cbu,
        _tipoCuentaLabel: c.tipoCuenta === 'CC' ? 'Cuenta Corriente' : 'Caja de Ahorro',
        _porcentaje: Number(c.porcentaje),
        _esMultiCBU: activos.length > 1,
        _idxCBU: activos.findIndex(x => x.id === c.id) + 1,
        _totalCBUs: activos.length,
        // Sobrescribir el importe a pagar con el proporcional a esta cuenta:
        netoAPagar: importeProporcional,
        neto:       importeProporcional
      });
    });
  });

  // Defaults de fechas y leyenda.
  const ultimo  = _galUltimoDiaMes(liq.anio, liq.mes);
  const primero = _galPrimerDiaMesSiguiente(liq.anio, liq.mes);
  const ultimoIso  = ultimo.toISOString().slice(0,10);
  const primeroIso = primero.toISOString().slice(0,10);
  // Fecha de proceso default: 2 días calendario antes del último día del mes.
  const proceso = new Date(ultimo);
  proceso.setDate(proceso.getDate() - 2);
  const procesoIso = proceso.toISOString().slice(0,10);
  const leyendaDef = `PAGO ${_MES_NOMBRES[liq.mes - 1]}`;

  _galModalCtx = { liq, gruposPorEmp, sinCBU, sumaIncompleta };

  // Render
  const empNames = Object.keys(gruposPorEmp).sort();
  const empCheckboxes = empNames.map(e => {
    const filas = gruposPorEmp[e].length;
    const empleadosUnicos = new Set(gruposPorEmp[e].map(x => x.leg)).size;
    const tieneMulti = gruposPorEmp[e].some(x => x._esMultiCBU);
    return `
    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);cursor:pointer">
      <input type="checkbox" data-empresa="${e.replace(/"/g,'&quot;')}" checked
        style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
      <div style="flex:1">
        <div style="font-size:13px;color:var(--t1);font-weight:500">${e}</div>
        <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">${empleadosUnicos} empleados · ${filas} filas${tieneMulti ? ' (incluye cuentas múltiples)' : ''}</div>
      </div>
    </label>`;
  }).join('');

  const sinCBUHtml = sinCBU.length ? `
    <details style="background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.3);border-radius:var(--r);padding:10px 14px;margin-bottom:14px">
      <summary style="cursor:pointer;color:var(--yellow);font-size:12px;font-weight:600">
        ⚠ ${sinCBU.length} empleado${sinCBU.length>1?'s':''} sin CBU — quedan fuera de la planilla
      </summary>
      <div style="margin-top:10px;max-height:180px;overflow-y:auto">
        ${sinCBU.map(e => `
          <div style="font-size:11px;color:var(--t2);padding:4px 0;border-bottom:1px solid var(--border);font-family:var(--font-mono)">
            ${legD(e.leg)} · ${e.nom} · ${e._empresa}
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--t3);margin-top:8px;line-height:1.5">
        Cargá el CBU desde <strong>RR.HH. → ABM Empleados</strong> y volvé a generar la planilla.
      </div>
    </details>` : '';

  const sumaIncompletaHtml = sumaIncompleta.length ? `
    <details style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:10px 14px;margin-bottom:14px">
      <summary style="cursor:pointer;color:var(--red);font-size:12px;font-weight:600">
        ⚠ ${sumaIncompleta.length} empleado${sumaIncompleta.length>1?'s':''} con porcentajes que no suman 100% — quedan fuera
      </summary>
      <div style="margin-top:10px;max-height:200px;overflow-y:auto">
        ${sumaIncompleta.map(e => `
          <div style="font-size:11px;color:var(--t2);padding:6px 0;border-bottom:1px solid var(--border);font-family:var(--font-mono)">
            <div>${legD(e.leg)} · ${e.nom} · ${e._empresa}</div>
            <div style="color:var(--red);margin-top:2px">Suma actual: ${e._suma.toFixed(2)}% (${e._cbusActivos.length} cuenta${e._cbusActivos.length!==1?'s':''})</div>
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--t3);margin-top:8px;line-height:1.5">
        Ajustá los porcentajes desde <strong>ABM Empleados</strong> para que sumen exactamente 100% y volvé a generar.
      </div>
    </details>` : '';

  const empresasNoVacias = empNames.length;
  if(!empresasNoVacias && !sinCBU.length && !sumaIncompleta.length){
    toast('⚠ No hay empleados que exportar','var(--yellow)');
    return;
  }

  const html = `
    <div id="gal-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)" onclick="if(event.target===this)cerrarModalPlanillaGalicia()">
      <div class="card" style="padding:0;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border)">
        <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--t1)">🏦 Planilla Acreditación Galicia</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Período <strong>${liq.periodo}</strong> · ${liq.items.length} items totales</div>
          </div>
          <button onclick="cerrarModalPlanillaGalicia()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer;padding:4px 8px">✕</button>
        </div>

        <div style="padding:18px 22px;display:flex;flex-direction:column;gap:16px">
          ${sinCBUHtml}
          ${sumaIncompletaHtml}

          ${empresasNoVacias ? `
          <div>
            <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;font-family:var(--font-mono)">Empresas a exportar</div>
            <div style="display:flex;flex-direction:column;gap:6px">${empCheckboxes}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:6px">Se genera <strong>un archivo por empresa</strong> seleccionada.</div>
          </div>

          <div>
            <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;font-family:var(--font-mono)">Leyenda</div>
            <input id="gal-leyenda" type="text" value="${leyendaDef}" maxlength="100"
              style="width:100%;padding:8px 12px;font-size:13px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono);outline:none">
            <div style="font-size:11px;color:var(--t3);margin-top:4px">Va en las columnas <em>Leyenda Credito</em>, <em>Identificacion Interna</em> y <em>Leyenda Debito</em>.</div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div>
              <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:var(--font-mono)">Acreditación · Sin Ganancias</div>
              <input id="gal-fecha-sin-gan" type="date" value="${ultimoIso}"
                style="width:100%;padding:7px 10px;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono);outline:none">
              <div style="font-size:10px;color:var(--t3);margin-top:4px;line-height:1.4">Default: último día del mes</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:var(--font-mono)">Acreditación · Con Ganancias</div>
              <input id="gal-fecha-con-gan" type="date" value="${primeroIso}"
                style="width:100%;padding:7px 10px;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono);outline:none">
              <div style="font-size:10px;color:var(--t3);margin-top:4px;line-height:1.4">Default: 1ro del mes siguiente</div>
            </div>
          </div>

          <div>
            <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-family:var(--font-mono)">Fecha de Proceso</div>
            <input id="gal-fecha-proceso" type="date" value="${procesoIso}"
              style="width:200px;padding:7px 10px;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-family:var(--font-mono);outline:none">
            <div style="font-size:10px;color:var(--t3);margin-top:4px;line-height:1.4">Default: 2 días antes de la fecha de acreditación</div>
          </div>
          ` : ''}
        </div>

        <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="cerrarModalPlanillaGalicia()" style="font-size:12px">Cancelar</button>
          ${empresasNoVacias ? `
          <button class="btn" onclick="generarPlanillasGalicia()"
            style="font-size:12px;background:var(--green);color:white;border-color:var(--green)">
            Generar planilla${empresasNoVacias>1?'s':''}
          </button>` : ''}
        </div>
      </div>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

function cerrarModalPlanillaGalicia(){
  const m = document.getElementById('gal-modal-bg');
  if(m) m.remove();
  _galModalCtx = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓN DEL .XLSX
// ═══════════════════════════════════════════════════════════════════════════

async function generarPlanillasGalicia(){
  if(!_galModalCtx){ toast('⚠ Sesión perdida — abrí el modal de nuevo','var(--red)'); return; }
  const { liq, gruposPorEmp } = _galModalCtx;

  // Recolectar opciones del modal.
  const seleccionadas = [...document.querySelectorAll('#gal-modal-bg input[data-empresa]:checked')]
    .map(c => c.dataset.empresa);
  if(!seleccionadas.length){
    toast('⚠ Seleccioná al menos una empresa','var(--yellow)');
    return;
  }
  const leyenda      = (document.getElementById('gal-leyenda')?.value || '').trim() || `PAGO ${_MES_NOMBRES[liq.mes - 1]}`;
  const fechaSinGanS = document.getElementById('gal-fecha-sin-gan')?.value;
  const fechaConGanS = document.getElementById('gal-fecha-con-gan')?.value;
  const fechaProcS   = document.getElementById('gal-fecha-proceso')?.value;
  if(!fechaSinGanS || !fechaConGanS || !fechaProcS){
    toast('⚠ Completá las tres fechas','var(--yellow)');
    return;
  }
  // Parsear como fechas locales (no UTC) para que no se corran un día.
  const parseLocalDate = s => {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d, 0, 0, 0);
  };
  const fSinGan = parseLocalDate(fechaSinGanS);
  const fConGan = parseLocalDate(fechaConGanS);
  const fProc   = parseLocalDate(fechaProcS);

  // Generar un archivo por empresa.
  let totalFilas = 0;
  for(const empresa of seleccionadas){
    const items = gruposPorEmp[empresa] || [];
    if(!items.length) continue;
    const blob = _galGenerarXlsxBlob(items, { leyenda, fSinGan, fConGan, fProc });
    const safeName = empresa.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g,'_').replace(/^_|_$/g,'');
    const fname = `planilla_galicia_${safeName}_${liq.periodo}.xlsx`;
    _galDescargarBlob(blob, fname);
    totalFilas += items.length;
  }

  // Auditoría: quedó registro de la exportación (categoría sistema, una sola entrada).
  if(typeof auditSistema === 'function'){
    auditSistema('exportacion_bancaria',
      `Galicia · Período ${liq.periodo} · ${seleccionadas.length} planilla(s) · ${totalFilas} empleados · Leyenda "${leyenda}"`);
  }

  toast(`✓ ${seleccionadas.length} planilla${seleccionadas.length>1?'s':''} Galicia descargada${seleccionadas.length>1?'s':''}`, 'var(--green)');
  cerrarModalPlanillaGalicia();
}

// Construye el .xlsx para un grupo de items (una empresa).
function _galGenerarXlsxBlob(items, opts){
  const { leyenda, fSinGan, fConGan, fProc } = opts;

  // Fila 1: headers como AOA. Las filas de datos las pegamos celda por celda
  // para controlar tipos (date/number/formula) y formatos.
  const ws = XLSX.utils.aoa_to_sheet([_GAL_HEADERS]);

  items.forEach((it, idx) => {
    const r = idx + 1;        // SheetJS row 1 = excel row 2 (después del header)
    const excelRow = r + 1;   // número de fila en notación Excel (para fórmula)

    const conGan      = _galTieneGanancias(it);
    const fechaAcred  = conGan ? fConGan : fSinGan;
    const cuitNum     = _galCuitANumero(it.cuil);
    const nombre      = _galNombreBenef(it.nom);
    const cbu         = it._cbu || '';
    const importe     = Number(it.netoAPagar) || 0;
    const set = (c, cell) => { ws[XLSX.utils.encode_cell({r, c})] = cell; };

    // Col 1 (A) — legajo (numérico si parsea, sino texto)
    const legNum = parseInt(it.leg, 10);
    set(0, isNaN(legNum) ? { t:'s', v: String(it.leg||'') }
                         : { t:'n', v: legNum });

    // Col 2 (B) — nombre completo
    set(1, { t:'s', v: nombre });

    // Col 3 (C) — fórmula MID(B,1,16) → así lo tiene la planilla original de Galicia
    set(2, { t:'s', f: `+MID(B${excelRow},1,16)` });

    // Col 4 (D) — CUIT como número entero
    set(3, cuitNum !== null ? { t:'n', v: cuitNum }
                            : { t:'s', v: String(it.cuil||'') });

    // Col 5 (E) — Fecha de acreditación (datetime real)
    set(4, { t:'d', v: fechaAcred, z: _GAL_FMT_FECHA });

    // Col 6 (F) — Tipo cuenta (default Caja de Ahorro, o Cuenta Corriente si así lo indica el legajo)
    set(5, { t:'s', v: it._tipoCuentaLabel || _GAL_TIPO_CUENTA });

    // Col 7 (G) — Moneda
    set(6, { t:'s', v: _GAL_MONEDA });

    // Col 8 (H) — Cuenta crédito (sólo Galicia) — vacío
    // No seteamos celda → quedará vacía en el sheet.

    // Col 9 (I) — CBU como string (mantener ceros iniciales)
    set(8, { t:'s', v: cbu });

    // Col 10 (J) — Importe del pago (numérico con formato moneda)
    set(9, { t:'n', v: importe, z: _GAL_FMT_IMPORTE });

    // Col 11 (K) — Leyenda Credito (lo que ve el empleado en el extracto)
    set(10, { t:'s', v: leyenda });

    // Col 12 (L) — Identificacion Interna (visible para la empresa). Si la cuenta
    // es parte de un esquema multi-CBU del empleado, agregamos `i/N (P%)` para
    // identificar la fila durante la conciliación.
    const idInterna = it._esMultiCBU
      ? `${leyenda} ${it._idxCBU}/${it._totalCBUs} (${Number(it._porcentaje).toFixed(0)}%)`
      : leyenda;
    set(11, { t:'s', v: idInterna });

    // Col 13 (M) — Fecha de Proceso
    set(12, { t:'d', v: fProc, z: _GAL_FMT_FECHA });

    // Col 14 (N) — Codigo de concepto (formato texto)
    set(13, { t:'s', v: _GAL_COD_CONCEPTO, z: '@' });

    // Col 15-17, 19 — vacíos
    // Col 18 (R) — Leyenda debito
    set(17, { t:'s', v: leyenda });
  });

  // Ajustar el rango del sheet para que incluya las 19 columnas y todas las filas.
  ws['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 18, r: items.length }
  });

  // Anchos de columna razonables (ajustables visualmente al abrir).
  ws['!cols'] = [
    {wch:8},  {wch:32}, {wch:18}, {wch:14}, {wch:11}, {wch:14}, {wch:9},
    {wch:18}, {wch:24}, {wch:14}, {wch:18}, {wch:18}, {wch:11}, {wch:22},
    {wch:14}, {wch:14}, {wch:24}, {wch:18}, {wch:22}
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');

  // Output como ArrayBuffer → Blob.
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function _galDescargarBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}
