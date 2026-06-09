// ═══════════════════════════════════════════════════════════════════════════
// CARGA DE CONCEPTOS CUSTOM POR EMPLEADO (manual + importación masiva)
// ───────────────────────────────────────────────────────────────────────────
// Para conceptos de tipo MANUAL (REM_MANUAL, NO_REM_MANUAL, DESCUENTO_MANUAL)
// el monto NO se calcula con fórmula sino que se carga por empleado:
//
//   1. Manual: desde la grilla de novedades, botón "+ Concepto" por empleado
//   2. Masiva: importando un archivo Excel/CSV con columnas:
//      legajo, codigo, monto
//
// Los montos cargados se persisten en la novedad del empleado:
//   nov.conceptosCustomManuales = [{ codigo, monto, cargadoEl, cargadoPor }]
//
// El motor (js/17) lee esta lista cuando aplica los conceptos custom.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helpers ───────────────────────────────────────────────────────────
function _ccGetManuales(nov){
  if(!nov) return [];
  if(!Array.isArray(nov.conceptosCustomManuales)) nov.conceptosCustomManuales = [];
  return nov.conceptosCustomManuales;
}

async function _ccSetManual(nov, codigo, monto){
  if(!nov) return;
  if(!Array.isArray(nov.conceptosCustomManuales)) nov.conceptosCustomManuales = [];
  const i = nov.conceptosCustomManuales.findIndex(m => m.codigo === codigo);
  const cargadoEl = new Date().toISOString();
  const cargadoPor = currentUser?.emp?.nom || 'desconocido';
  if(monto == null || monto === ''){
    // borrar
    if(i >= 0) nov.conceptosCustomManuales.splice(i, 1);
    return;
  }
  const m = Number(monto);
  if(isNaN(m)) return;
  if(i >= 0){
    nov.conceptosCustomManuales[i] = { codigo, monto: m, cargadoEl, cargadoPor };
  } else {
    nov.conceptosCustomManuales.push({ codigo, monto: m, cargadoEl, cargadoPor });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: Carga manual por empleado
// ───────────────────────────────────────────────────────────────────────────
// Abrible desde la grilla de novedades. Muestra todos los conceptos
// MANUAL activos y permite cargar/editar el monto del empleado.
// ═══════════════════════════════════════════════════════════════════════════
async function abrirCargaManualConceptos(leg){
  if(!_liqActiva){ toast('⚠ Sin liquidación activa','var(--yellow)'); return; }
  if(_liqActiva.estado !== 'borrador'){ toast('⚠ La liquidación no está en borrador','var(--yellow)'); return; }

  const emp = (typeof getNomina === 'function' ? getNomina() : []).find(e => e.leg === leg);
  if(!emp){ toast('⚠ Empleado no encontrado','var(--red)'); return; }

  // Obtener conceptos manuales activos
  const todos = await getConceptosCustomActivos();
  const manuales = todos.filter(c => _ccEsTipoManual(c.tipo));
  if(!manuales.length){
    toast('ℹ No hay conceptos manuales activos. Creá uno desde el panel de Conceptos Custom.','var(--accent2)');
    return;
  }

  const nov = _novedadesActuales[leg] || {};
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = nov;
  const cargados = _ccGetManuales(nov);

  const overlay = document.createElement('div');
  overlay.id = 'modal-cc-carga';
  overlay.dataset.leg = leg;
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  const filas = manuales.map(c => {
    const cargado = cargados.find(m => m.codigo === c.codigo);
    const tInfo = TIPOS_CONCEPTO_CUSTOM.find(t => t.v === c.tipo);
    const valActual = cargado?.monto || '';
    return `
      <div style="display:grid;grid-template-columns:auto 1fr 140px auto;gap:10px;align-items:center;padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:4px">
        <div style="font-size:18px">${tInfo?.icon || '?'}</div>
        <div style="min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--t1)">${(c.nombre || '').replace(/</g,'&lt;')}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${c.codigo} · ${tInfo?.label || c.tipo}</div>
        </div>
        <input type="number" step="0.01" id="cc-manual-${c.codigo}" data-codigo="${c.codigo}" value="${valActual}" placeholder="0.00" style="width:100%;background:var(--bg1);border:1px solid var(--border);border-radius:4px;padding:6px 10px;color:var(--t1);font-size:13px;outline:none;font-family:var(--font-mono);text-align:right">
        ${cargado ? `<button class="btn btn-ghost" onclick="_ccBorrarManualEmpleado('${leg}','${c.codigo}')" style="font-size:11px;padding:4px 8px;color:var(--red);border-color:rgba(239,68,68,.3)" title="Borrar este concepto del empleado">✕</button>` : '<div></div>'}
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:680px;width:100%;max-height:88vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">✍️ Cargar conceptos manuales</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px;font-family:var(--font-mono)">${legD(emp.leg)} · ${emp.nom}</div>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:11px;color:var(--t2);background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 12px;line-height:1.5">
          Cargá el monto que corresponde a cada concepto para este empleado. Si dejás vacío, el concepto NO se aplica. Cuando cliquees "Guardar", la liquidación se recalcula automáticamente.
        </div>
        ${filas}
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cc-carga').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
        <button class="btn btn-primary" onclick="_ccGuardarManualesEmpleado('${leg}')" style="font-size:13px;padding:8px 18px">Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function _ccGuardarManualesEmpleado(leg){
  const overlay = document.getElementById('modal-cc-carga');
  if(!overlay) return;
  const inputs = overlay.querySelectorAll('input[data-codigo]');
  const nov = _novedadesActuales[leg] || {};
  if(!_novedadesActuales[leg]) _novedadesActuales[leg] = nov;
  if(!Array.isArray(nov.conceptosCustomManuales)) nov.conceptosCustomManuales = [];
  // Limpiar previos
  nov.conceptosCustomManuales = [];
  inputs.forEach(inp => {
    const codigo = inp.dataset.codigo;
    const valor = (inp.value || '').trim();
    if(valor === '') return;
    const m = Number(valor);
    if(isNaN(m) || m === 0) return;
    _ccSetManual(nov, codigo, m);
  });
  if(typeof _scheduleAutosaveNov === 'function') _scheduleAutosaveNov(leg);
  overlay.remove();
  // Re-render de la grilla para reflejar la columna del concepto manual
  if(typeof renderGrillaNovedades === 'function') renderGrillaNovedades();
  toast(`✓ Conceptos manuales guardados para ${leg}`, 'var(--green)');
}

async function _ccBorrarManualEmpleado(leg, codigo){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Quitar el concepto ${codigo} de este empleado?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  const inp = document.querySelector(`#cc-manual-${codigo}`);
  if(inp) inp.value = '';
  // También quitar del estado en memoria
  const nov = _novedadesActuales[leg];
  if(nov && Array.isArray(nov.conceptosCustomManuales)){
    nov.conceptosCustomManuales = nov.conceptosCustomManuales.filter(m => m.codigo !== codigo);
  }
  // El botón ✕ desaparece al recargar el modal — más simple: cerrar y reabrir
  document.getElementById('modal-cc-carga')?.remove();
  abrirCargaManualConceptos(leg);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTADOR MASIVO desde Excel/CSV
// ───────────────────────────────────────────────────────────────────────────
// Acepta archivos con columnas: legajo, codigo, monto (en cualquier orden,
// detectando el header). También soporta archivos sin header (asume orden
// fijo). Modos: SUMAR (acumula al monto existente) o REEMPLAZAR (sobrescribe).
// ═══════════════════════════════════════════════════════════════════════════
async function abrirImportConceptosManuales(){
  if(!_liqActiva){ toast('⚠ Sin liquidación activa','var(--yellow)'); return; }
  if(_liqActiva.estado !== 'borrador'){ toast('⚠ La liquidación no está en borrador','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH.','var(--red)'); return; }

  const conceptos = await getConceptosCustomActivos();
  const manualesActivos = conceptos.filter(c => _ccEsTipoManual(c.tipo));
  if(!manualesActivos.length){
    toast('ℹ No hay conceptos manuales activos para importar','var(--accent2)');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'modal-cc-import';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:760px;width:100%;max-height:90vh;overflow-y:auto">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">📥 Importar Conceptos Manuales</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">Carga masiva desde Excel/CSV — período ${_liqActiva.periodo}</div>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="background:rgba(94,194,255,.05);border:1px solid rgba(94,194,255,.2);border-radius:4px;padding:12px 14px;font-size:11px;color:var(--t2);line-height:1.6">
          <strong>Formato esperado:</strong> Excel (.xlsx, .xls) o CSV con columnas <code style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--font-mono)">legajo, codigo, monto</code> (en cualquier orden, con header detectable).
          <br><br>
          <strong>${manualesActivos.length} concepto${manualesActivos.length!==1?'s':''} manual${manualesActivos.length!==1?'es':''} activo${manualesActivos.length!==1?'s':''}:</strong>
          ${manualesActivos.map(c => `<code style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--font-mono);margin:0 2px">${c.codigo}</code>`).join(' ')}
        </div>

        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:6px">Modo de aplicación</label>
          <select id="cc-import-modo" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="reemplazar">Reemplazar — sobrescribe valores existentes para esos conceptos</option>
            <option value="sumar">Sumar — acumula al monto existente del concepto</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:6px">Archivo</label>
          <input type="file" id="cc-import-file" accept=".xlsx,.xls,.csv,.txt" onchange="_ccProcesarImport()" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:9px 12px;color:var(--t1);font-size:12px;outline:none">
        </div>

        <div id="cc-import-preview"></div>

        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 12px;font-size:10px;color:var(--t3);line-height:1.5">
          <strong>Plantilla:</strong> podés generar una plantilla con la nómina del período tocando el botón abajo.
          <button class="btn btn-ghost" onclick="_ccDescargarPlantillaManuales()" style="font-size:10px;padding:4px 10px;margin-top:4px">📥 Descargar plantilla</button>
        </div>
      </div>
      <div id="cc-import-actions" style="padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="document.getElementById('modal-cc-import').remove()" style="font-size:13px;padding:8px 14px">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

let _ccImportData = null;  // datos parseados del archivo cargado

async function _ccProcesarImport(){
  const fileInput = document.getElementById('cc-import-file');
  const file = fileInput?.files?.[0];
  if(!file) return;

  const preview = document.getElementById('cc-import-preview');
  preview.innerHTML = '<div style="font-size:11px;color:var(--t3);font-style:italic">Procesando...</div>';

  try {
    let rows = [];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if(ext === 'csv' || ext === 'txt'){
      const txt = await file.text();
      rows = _ccParsearCSV(txt);
    } else if(ext === 'xlsx' || ext === 'xls'){
      if(typeof XLSX === 'undefined'){ throw new Error('SheetJS no disponible'); }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    } else {
      throw new Error('Formato no soportado. Usá .xlsx, .xls, .csv o .txt');
    }

    if(rows.length < 1) throw new Error('Archivo vacío');

    // Detectar header (busca palabras 'legajo', 'codigo', 'monto')
    const headerRow = rows[0].map(c => String(c || '').toLowerCase().trim());
    const hasHeader = headerRow.some(h => /legajo|leg|codigo|cod|monto|importe/.test(h));
    let idxLeg, idxCod, idxMon;
    if(hasHeader){
      idxLeg = headerRow.findIndex(h => /^legajo$|^leg$/.test(h));
      idxCod = headerRow.findIndex(h => /^codigo$|^cod$|^c[óo]digo$/.test(h));
      idxMon = headerRow.findIndex(h => /^monto$|^importe$|^valor$/.test(h));
      if(idxLeg < 0 || idxCod < 0 || idxMon < 0){
        // Fallback: orden posicional
        idxLeg = 0; idxCod = 1; idxMon = 2;
      }
    } else {
      idxLeg = 0; idxCod = 1; idxMon = 2;
    }

    const dataRows = hasHeader ? rows.slice(1) : rows;
    const nomina = (typeof getNomina === 'function' ? getNomina() : []);
    const conceptos = await getConceptosCustomActivos();
    const manuales = conceptos.filter(c => _ccEsTipoManual(c.tipo));
    const manualesPorCod = {};
    manuales.forEach(c => { manualesPorCod[c.codigo.toUpperCase()] = c; });

    const validos = [], invalidos = [];
    dataRows.forEach((row, i) => {
      const leg = String(row[idxLeg] || '').trim();
      const cod = String(row[idxCod] || '').trim().toUpperCase();
      const monto = parseFloat(String(row[idxMon] || '').replace(',','.'));
      if(!leg || !cod) return;  // fila vacía
      const empleado = nomina.find(e => e.leg === leg || e.leg === leg.padStart(6,'0'));
      const concepto = manualesPorCod[cod];
      if(!empleado){
        invalidos.push({ fila: i+1, leg, cod, monto, error: 'Legajo no encontrado en nómina' });
      } else if(!concepto){
        invalidos.push({ fila: i+1, leg, cod, monto, error: `Código ${cod} no es un concepto manual activo` });
      } else if(isNaN(monto)){
        invalidos.push({ fila: i+1, leg, cod, monto: row[idxMon], error: 'Monto inválido' });
      } else {
        validos.push({ leg: empleado.leg, nom: empleado.nom, cod, concepto, monto });
      }
    });

    _ccImportData = { validos, invalidos };

    const fmtPesos = n => '$ ' + Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2});
    const preview = document.getElementById('cc-import-preview');
    preview.innerHTML = `
      <div style="background:${invalidos.length?'rgba(234,179,8,.05)':'rgba(34,197,94,.05)'};border:1px solid ${invalidos.length?'rgba(234,179,8,.3)':'rgba(34,197,94,.3)'};border-radius:4px;padding:10px 12px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:${invalidos.length?'var(--yellow)':'var(--green)'};margin-bottom:4px">
          ${invalidos.length?'⚠':'✓'} ${validos.length} fila${validos.length!==1?'s':''} válida${validos.length!==1?'s':''}${invalidos.length?` · ${invalidos.length} con errores`:''}
        </div>
        <div style="font-size:10px;color:var(--t3)">Total a aplicar: ${fmtPesos(validos.reduce((s,v)=>s+v.monto,0))}</div>
      </div>
      ${validos.length ? `
        <details style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:8px 12px;margin-bottom:8px">
          <summary style="cursor:pointer;font-size:11px;color:var(--green)">✓ Ver ${validos.length} válidas</summary>
          <div style="margin-top:8px;max-height:200px;overflow-y:auto;font-family:var(--font-mono);font-size:10px;line-height:1.5">
            ${validos.slice(0,30).map(v => `<div>${legD(v.leg)} · ${v.cod} · ${fmtPesos(v.monto)} · ${v.nom?.split(',')[0]||''}</div>`).join('')}
            ${validos.length>30 ? `<div style="font-style:italic;color:var(--t3)">... y ${validos.length-30} más</div>` : ''}
          </div>
        </details>
      ` : ''}
      ${invalidos.length ? `
        <details open style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.3);border-radius:4px;padding:8px 12px">
          <summary style="cursor:pointer;font-size:11px;color:var(--red)">✕ ${invalidos.length} con errores</summary>
          <div style="margin-top:8px;max-height:160px;overflow-y:auto;font-family:var(--font-mono);font-size:10px;line-height:1.5">
            ${invalidos.slice(0,30).map(v => `<div style="color:var(--red)">Fila ${v.fila}: ${v.leg||'?'} · ${v.cod||'?'} → ${v.error}</div>`).join('')}
          </div>
        </details>
      ` : ''}
    `;

    const actions = document.getElementById('cc-import-actions');
    if(actions && validos.length){
      // Sumar botón aplicar
      if(!actions.querySelector('#cc-import-aplicar')){
        const btn = document.createElement('button');
        btn.id = 'cc-import-aplicar';
        btn.className = 'btn btn-primary';
        btn.style.cssText = 'font-size:13px;padding:8px 18px';
        btn.textContent = `Aplicar a ${validos.length} empleado${validos.length!==1?'s':''}`;
        btn.onclick = _ccAplicarImport;
        actions.appendChild(btn);
      }
    }
  } catch(err){
    document.getElementById('cc-import-preview').innerHTML = `<div style="background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.3);border-radius:4px;padding:10px;font-size:11px;color:var(--red)">✕ Error: ${err.message}</div>`;
  }
}

function _ccParsearCSV(txt){
  const lineas = txt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const sep = (lineas[0] && (lineas[0].split(';').length > lineas[0].split(',').length)) ? ';' : ',';
  return lineas.map(l => {
    if(!l.trim()) return null;
    return l.split(sep).map(c => c.trim().replace(/^"(.*)"$/,'$1'));
  }).filter(Boolean);
}

async function _ccAplicarImport(){
  if(!_ccImportData || !_ccImportData.validos?.length) return;
  const modo = document.getElementById('cc-import-modo')?.value || 'reemplazar';

  let aplicados = 0;
  for(const v of _ccImportData.validos){
    const nov = _novedadesActuales[v.leg] || {};
    if(!_novedadesActuales[v.leg]) _novedadesActuales[v.leg] = nov;
    if(!Array.isArray(nov.conceptosCustomManuales)) nov.conceptosCustomManuales = [];

    if(modo === 'reemplazar'){
      _ccSetManual(nov, v.cod, v.monto);
    } else {
      const existente = nov.conceptosCustomManuales.find(m => m.codigo === v.cod);
      const nuevoMonto = (existente?.monto || 0) + v.monto;
      _ccSetManual(nov, v.cod, nuevoMonto);
    }
    if(typeof _scheduleAutosaveNov === 'function') _scheduleAutosaveNov(v.leg);
    aplicados++;
  }

  // Guardar todo de una
  await new Promise(res => setTimeout(res, 500));  // dejar que el autosave drene

  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion','import_conceptos_manuales', {
      liqId: _liqActiva.id, modo, cantidad: aplicados,
      por: currentUser?.emp?.nom
    });
  }

  document.getElementById('modal-cc-import')?.remove();
  if(typeof renderGrillaNovedades === 'function') renderGrillaNovedades();
  toast(`✓ ${aplicados} montos aplicados (${modo})`, 'var(--green)');
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANTILLA PRE-RELLENADA
// ───────────────────────────────────────────────────────────────────────────
// Genera Excel con la nómina del período + columnas vacías para cada
// concepto manual activo. RR.HH. lo descarga, completa en Excel y lo
// re-importa.
// ═══════════════════════════════════════════════════════════════════════════
async function _ccDescargarPlantillaManuales(){
  if(typeof XLSX === 'undefined'){ toast('⚠ SheetJS no disponible','var(--red)'); return; }
  const conceptos = await getConceptosCustomActivos();
  const manuales = conceptos.filter(c => _ccEsTipoManual(c.tipo));
  if(!manuales.length){ toast('⚠ Sin conceptos manuales activos','var(--yellow)'); return; }

  const nomina = (typeof getNomina === 'function' ? getNomina() : []).filter(e => !e._deBaja && !e.egreso);

  // Formato 1: una fila por (empleado x concepto) — fácil de filtrar
  const headers = ['legajo','codigo','monto','nombre','empresa','concepto_descripcion'];
  const rows = [headers];
  nomina.forEach(emp => {
    manuales.forEach(c => {
      rows.push([emp.leg, c.codigo, '', emp.nom, emp.emp, c.nombre]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:9},{wch:18},{wch:14},{wch:32},{wch:18},{wch:30}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Carga manual');
  const fname = `plantilla_conceptos_manuales_${_liqActiva.periodo}.xlsx`;
  XLSX.writeFile(wb, fname);
  toast(`✓ Plantilla descargada (${nomina.length} empleados × ${manuales.length} conceptos)`, 'var(--green)');
}
