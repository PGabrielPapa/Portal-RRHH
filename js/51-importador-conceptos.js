// ═══════════════════════════════════════════════════════════════════════════
// IMPORTADOR MASIVO DE CONCEPTOS DE NÓMINA (XLSX / CSV)
// ───────────────────────────────────────────────────────────────────────────
// Permite importar mediante un archivo Excel o CSV un lote de conceptos para
// uno o varios empleados en una o varias liquidaciones.
//
// FORMATO DEL ARCHIVO:
//   Columnas obligatorias: legajo, codigo, importe, liquidacion
//   Columnas opcionales:   descripcion, cantidad, observaciones
//
//   legajo:      número de legajo del empleado (puede ir con o sin ceros)
//   codigo:      código del concepto (de los del catálogo, ver Reporte
//                de Conceptos). Acepta numérico o string.
//   descripcion: texto descriptivo opcional — para auditoría
//   importe:     monto en pesos (con coma o punto decimal)
//   cantidad:    cantidad (horas, días) — opcional, solo informativo
//   liquidacion: período en formato MM-YYYY o YYYY-MM o MM/YYYY
//   observaciones: notas de auditoría
//
// COMPORTAMIENTO (3 modos seleccionables):
//   A) NOVEDADES        → mapea el código a un campo nov.X estándar y suma
//                         el importe en la novedad correspondiente del
//                         empleado. RR.HH. debe ir a Preview para recalcular.
//   B) CONCEPTOS MANUALES → crea o actualiza items en nov.conceptosCustomManuales
//                         del empleado (modo del módulo js/43). Requiere que el
//                         concepto exista en el catálogo custom con ese código.
//   C) PERSONALIZADO    → agrega el monto como "Otros haberes / descuentos"
//                         en el campo nov.otrosH o nov.otrosDescuentos del
//                         empleado. Útil para conceptos one-off no catalogados.
//
// VALIDACIONES:
//   - Legajo debe existir en la nómina
//   - Liquidación debe existir (no se crean liquidaciones nuevas)
//   - Liquidación debe estar en estado BORRADOR (no se modifican aprobadas)
//   - Importe debe ser numérico (≥0 o ≤0 según el tipo de concepto)
//   - El código debe poder mapearse al campo destino según el modo elegido
//
// AUDITORÍA: cada fila importada queda registrada con cargadoPor y cargadoEl
// (o en el log de novedades respectivo). El batch completo se loguea con
// logAuditX('importador', 'conceptos_masivo', ...).
// ═══════════════════════════════════════════════════════════════════════════

// Mapeo de códigos hardcoded → campo nov.X (modo A NOVEDADES)
const _MAPA_CODIGO_NOVEDAD = {
  // Códigos de los conceptos remunerativos manuales (que se cargan por novedad)
  '2':     'hsExtra50',                  // Horas Extras 50%
  '3':     'hsExtra100',                 // Horas Extras 100%
  '6500':  'feriadosTrabajados',         // Feriados trabajados
  '9100':  'sac',                        // SAC Proporcional (monto manual)
  '9500':  'mAjuste',                    // Ajuste de sueldo
  '9900':  'otrosHRem',                  // Otros haberes remunerativos
  // No remunerativos exentos (carga manual)
  '58100': 'hsExtrasExentas',            // Hs Extras Exentas Art. 82 LIG
  '58200': 'bonoProductividadExento',    // Bono Productividad Exento
  '58300': 'indemnizaciones',            // Indemnización Art. 180 bis LCT
  '58400': 'otrosExentos',               // Otros conceptos exentos
  // Descuentos
  '90000': 'ganancias',                  // Retención Imp. Ganancias
  '9901':  'otrosDescuentos',            // Otros descuentos (array)
};

// Etiquetas legibles para los códigos arriba (para mostrar en la vista previa)
const _LABEL_CODIGO_NOVEDAD = {
  '2':     'Hs Extras 50% (cantidad de horas)',
  '3':     'Hs Extras 100% (cantidad de horas)',
  '6500':  'Feriados Trabajados (cantidad)',
  '9100':  'SAC Proporcional ($)',
  '9500':  'Ajuste de Sueldo ($)',
  '9900':  'Otros Haberes Rem. ($)',
  '58100': 'Hs Extras Exentas ($)',
  '58200': 'Bono Productividad Exento ($)',
  '58300': 'Indemnización ($)',
  '58400': 'Otros conceptos exentos ($)',
  '90000': 'Imp. Ganancias ($)',
  '9901':  'Otros descuentos ($)',
};

// Estado global de la importación en curso
let _importConceptosState = {
  archivo: null,
  filasParseadas: [],
  modo: 'novedades',   // 'novedades' | 'manuales' | 'personalizado'
  validaciones: { ok:0, errores:[], warnings:[] }
};

// ═══════════════════════════════════════════════════════════════════════════
// VISTA PRINCIPAL: el módulo se monta en el subpanel del panel RR.HH.
// ═══════════════════════════════════════════════════════════════════════════
async function renderImportadorConceptos(){
  const cont = document.getElementById('panel-importar-conceptos');
  if(!cont) return;

  // Reset estado
  _importConceptosState = { archivo:null, filasParseadas:[], modo:'novedades', validaciones:{ok:0,errores:[],warnings:[]} };

  cont.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">

      <!-- ENCABEZADO -->
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <div style="font-size:14px;font-weight:600;color:var(--t1);margin-bottom:4px">📥 Importador Masivo de Conceptos</div>
        <div style="font-size:11px;color:var(--t3);line-height:1.6">
          Importá un archivo Excel (.xlsx) o CSV con conceptos para uno o varios empleados.
          Los datos se aplican a la liquidación indicada en cada fila. Solo se permite importar
          a liquidaciones en estado <b style="color:var(--t2)">BORRADOR</b>.
        </div>
      </div>

      <!-- PASO 1: ELECCIÓN DE MODO -->
      <div style="padding:18px 22px;border-bottom:1px solid var(--border)">
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Paso 1 · ¿Cómo aplicar los conceptos importados?</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          ${_renderModoCard('novedades', '📝', 'Como NOVEDADES', 'Suma el monto en la novedad correspondiente del empleado (hs extras, sac, anticipo, etc.). Necesita códigos del catálogo standard. RRHH va a Preview para recalcular.', 'var(--accent2)')}
          ${_renderModoCard('manuales', '✍️', 'Como CONCEPTOS MANUALES', 'Crea o actualiza los conceptos manuales (módulo Conceptos Custom) del empleado. Recálculo automático al guardar.', 'rgb(168,85,247)')}
          ${_renderModoCard('personalizado', '➕', 'Como OTROS HABERES/DESC', 'Agrega como ítem extra al panel "Otros haberes" o "Otros descuentos" según el código. Útil para conceptos one-off.', 'rgb(94,194,255)')}
        </div>
      </div>

      <!-- PASO 2: SELECCIÓN DE ARCHIVO -->
      <div style="padding:18px 22px;border-bottom:1px solid var(--border)">
        <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Paso 2 · Seleccionar archivo</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <input type="file" id="import-conc-archivo" accept=".xlsx,.xls,.csv" onchange="_handleImportFileChange(this)"
            style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:7px 12px;color:var(--t1);font-size:12px;outline:none">
          <button class="btn btn-ghost" onclick="_descargarPlantillaImport()" style="font-size:12px;padding:7px 14px;color:var(--accent2);border-color:rgba(61,127,255,.3)" title="Descargar archivo Excel de ejemplo con la estructura correcta">
            📄 Descargar plantilla
          </button>
        </div>
        <div style="font-size:10px;color:var(--t3);margin-top:8px">
          <strong>Columnas:</strong> legajo, codigo, importe, liquidacion (obligatorias) · descripcion, cantidad, observaciones (opcionales)
        </div>
      </div>

      <!-- PASO 3: VISTA PREVIA (se llena dinámicamente) -->
      <div id="import-conc-preview" style="display:none">
        <!-- contenido inyectado al cargar archivo -->
      </div>

    </div>
  `;
}

function _renderModoCard(valor, icono, titulo, desc, color){
  const checked = _importConceptosState.modo === valor;
  return `
    <label style="cursor:pointer;display:block">
      <input type="radio" name="import-modo" value="${valor}" ${checked?'checked':''} onchange="_importConceptosState.modo=this.value" style="display:none">
      <div class="modo-card" data-modo="${valor}" style="padding:14px;background:${checked?color+'11':'var(--bg2)'};border:1.5px solid ${checked?color:'var(--border)'};border-radius:var(--r);transition:all .15s;cursor:pointer" onclick="this.parentElement.querySelector('input').click()">
        <div style="font-size:24px;margin-bottom:8px">${icono}</div>
        <div style="font-size:12px;font-weight:600;color:${checked?color:'var(--t1)'};margin-bottom:6px">${titulo}</div>
        <div style="font-size:10px;color:var(--t3);line-height:1.5">${desc}</div>
      </div>
    </label>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 2: leer el archivo (Excel o CSV)
// ═══════════════════════════════════════════════════════════════════════════
async function _handleImportFileChange(input){
  const file = input.files[0];
  if(!file) return;
  if(typeof XLSX === 'undefined'){
    toast('⚠ SheetJS (XLSX) no está cargado. No se puede importar.', 'var(--red)');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if(rows.length < 2){
      toast('⚠ El archivo no tiene datos o solo tiene encabezados', 'var(--yellow)');
      return;
    }

    // Mapear encabezados → índices
    const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
    const idxLegajo = _findHeader(headers, ['legajo','leg','nro_legajo','número de legajo']);
    const idxCodigo = _findHeader(headers, ['codigo','código','cod','code']);
    const idxImporte = _findHeader(headers, ['importe','monto','valor','amount']);
    const idxLiq = _findHeader(headers, ['liquidacion','liquidación','periodo','período','mes']);
    const idxDesc = _findHeader(headers, ['descripcion','descripción','descr','desc']);
    const idxCant = _findHeader(headers, ['cantidad','horas','hs','dias','días','qty']);
    const idxObs = _findHeader(headers, ['observaciones','obs','observación','notas','nota']);

    if(idxLegajo < 0 || idxCodigo < 0 || idxImporte < 0 || idxLiq < 0){
      toast(`⚠ Faltan columnas obligatorias. Necesitas: legajo, codigo, importe, liquidacion. Encontré: ${headers.join(', ')}`, 'var(--red)', 7000);
      return;
    }

    // Parsear filas
    const filas = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      if(!r || r.every(c => !c && c !== 0)) continue;  // saltar filas vacías

      const legajo = String(r[idxLegajo] || '').trim();
      const codigo = String(r[idxCodigo] || '').trim();
      const importe = Number(String(r[idxImporte] || '').replace(',', '.')) || 0;
      const liqRaw = String(r[idxLiq] || '').trim();
      const descripcion = idxDesc >= 0 ? String(r[idxDesc] || '').trim() : '';
      const cantidad = idxCant >= 0 ? (Number(r[idxCant]) || 0) : 0;
      const observaciones = idxObs >= 0 ? String(r[idxObs] || '').trim() : '';

      if(!legajo || !codigo || !liqRaw) continue;

      // Normalizar legajo: el archivo puede traer '125' y la nómina '000125'
      const legNorm = legajo.padStart(6, '0');

      // Parsear liquidación: acepta MM-YYYY, YYYY-MM, MM/YYYY
      const liq = _parsearLiquidacion(liqRaw);

      filas.push({
        fila: i + 1,  // número de fila del Excel (1-indexed con header)
        legajoRaw: legajo,
        legajo: legNorm,
        codigo,
        descripcion,
        importe,
        cantidad,
        liquidacionRaw: liqRaw,
        liquidacion: liq,
        observaciones
      });
    }

    _importConceptosState.archivo = file;
    _importConceptosState.filasParseadas = filas;
    toast(`✓ Archivo leído: ${filas.length} filas`, 'var(--green)');

    // Pasar a vista previa
    await _renderImportPreview();

  } catch(e){
    console.error('[importador] Error leyendo archivo:', e);
    toast('⚠ Error leyendo el archivo: ' + (e.message || 'desconocido'), 'var(--red)', 5000);
  }
}

function _findHeader(headers, aliases){
  for(const a of aliases){
    const i = headers.indexOf(a);
    if(i >= 0) return i;
  }
  return -1;
}

function _parsearLiquidacion(raw){
  // Acepta: '05-2026', '05/2026', '2026-05', '2026/05', 'Mayo 2026', '202605'
  if(!raw) return null;
  const txt = String(raw).trim();

  // Formato MM-YYYY o MM/YYYY
  let m = txt.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if(m) return { anio: parseInt(m[2], 10), mes: parseInt(m[1], 10) };

  // Formato YYYY-MM o YYYY/MM
  m = txt.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if(m) return { anio: parseInt(m[1], 10), mes: parseInt(m[2], 10) };

  // Formato YYYYMM
  m = txt.match(/^(\d{4})(\d{2})$/);
  if(m) return { anio: parseInt(m[1], 10), mes: parseInt(m[2], 10) };

  // Mes en texto + año
  const MES_TXT = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12 };
  const palabras = txt.toLowerCase().split(/\s+/);
  let mesNum = null, anioNum = null;
  for(const p of palabras){
    if(MES_TXT[p]) mesNum = MES_TXT[p];
    if(/^\d{4}$/.test(p)) anioNum = parseInt(p, 10);
  }
  if(mesNum && anioNum) return { anio: anioNum, mes: mesNum };

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 3: VISTA PREVIA con validaciones
// ═══════════════════════════════════════════════════════════════════════════
async function _renderImportPreview(){
  const div = document.getElementById('import-conc-preview');
  if(!div) return;

  const filas = _importConceptosState.filasParseadas;
  const modo = _importConceptosState.modo;
  const errores = [];
  const warnings = [];
  let okCount = 0;

  // Cargar liquidaciones y nómina para validar
  const lista = (typeof getLiquidaciones === 'function') ? await getLiquidaciones() : [];
  const nominaMap = {};
  (typeof getNomina === 'function' ? getNomina() : []).forEach(e => nominaMap[e.leg] = e);

  // Cache de conceptos custom para modo 'manuales'
  let conceptosCustom = [];
  if(modo === 'manuales' && typeof getConceptosCustomActivos === 'function'){
    conceptosCustom = await getConceptosCustomActivos();
  }

  // Validar cada fila
  for(const f of filas){
    const probs = [];

    // 1. Empleado en nómina
    if(!nominaMap[f.legajo]){
      probs.push(`Legajo ${f.legajoRaw} no existe en la nómina`);
    } else {
      f._empNombre = nominaMap[f.legajo].nom;
      f._empEmpresa = nominaMap[f.legajo].emp;
    }

    // 2. Liquidación
    if(!f.liquidacion){
      probs.push(`No pude parsear la liquidación "${f.liquidacionRaw}". Usá formato MM-YYYY o YYYY-MM`);
    } else {
      const liq = lista.find(l => l.anio === f.liquidacion.anio && l.mes === f.liquidacion.mes &&
                                  (nominaMap[f.legajo]?.emp === l.empresa || l.empresa === 'todas'));
      if(!liq){
        probs.push(`No existe liquidación ${String(f.liquidacion.mes).padStart(2,'0')}-${f.liquidacion.anio} para ${nominaMap[f.legajo]?.emp || 'la empresa del empleado'}. Creala antes de importar.`);
      } else if(liq.estado !== 'borrador'){
        probs.push(`La liquidación ${String(f.liquidacion.mes).padStart(2,'0')}-${f.liquidacion.anio} está en estado "${liq.estado}" — no se puede modificar (solo borrador admite importación)`);
      } else {
        f._liqId = liq.id;
        f._liqEstado = liq.estado;
      }
    }

    // 3. Validación específica por modo
    if(modo === 'novedades'){
      if(!_MAPA_CODIGO_NOVEDAD[f.codigo]){
        probs.push(`Código ${f.codigo} no se puede mapear a una novedad estándar. Códigos válidos para modo Novedades: ${Object.keys(_MAPA_CODIGO_NOVEDAD).join(', ')}`);
      } else {
        f._campoNovedad = _MAPA_CODIGO_NOVEDAD[f.codigo];
      }
    } else if(modo === 'manuales'){
      const c = conceptosCustom.find(c => String(c.codigo) === String(f.codigo));
      if(!c){
        probs.push(`No hay concepto manual activo con código ${f.codigo}. Creá primero el concepto en "Conceptos Custom".`);
      } else if(typeof _ccEsTipoManual === 'function' && !_ccEsTipoManual(c.tipo)){
        probs.push(`El concepto ${f.codigo} existe pero NO es de tipo manual (es ${c.tipo}). Modo personalizado o novedades sería más adecuado.`);
      } else {
        f._conceptoCustom = c;
      }
    } else if(modo === 'personalizado'){
      // No requiere validación de catálogo — cualquier código vale
      if(f.importe === 0){
        warnings.push({ fila: f.fila, msg: `Importe en 0 para legajo ${f.legajoRaw}` });
      }
    }

    // 4. Importe
    if(isNaN(f.importe)){
      probs.push(`Importe no numérico`);
    }

    if(probs.length){
      errores.push({ fila: f.fila, legajo: f.legajoRaw, codigo: f.codigo, problemas: probs });
    } else {
      okCount++;
    }
  }

  _importConceptosState.validaciones = { ok: okCount, errores, warnings };

  // Render
  div.style.display = 'block';
  div.innerHTML = `
    <div style="padding:18px 22px;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Paso 3 · Vista previa y validaciones</div>

      <!-- Resumen -->
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-bottom:14px">
        <span style="padding:6px 12px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:4px;color:var(--green)"><b>${okCount}</b> filas OK</span>
        ${errores.length ? `<span style="padding:6px 12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:4px;color:var(--red)"><b>${errores.length}</b> con errores</span>` : ''}
        ${warnings.length ? `<span style="padding:6px 12px;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:4px;color:rgb(234,179,8)"><b>${warnings.length}</b> warnings</span>` : ''}
        <span style="padding:6px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--t2)">Total: <b>${filas.length}</b></span>
      </div>

      ${errores.length ? `
        <details style="margin-bottom:14px;border:1px solid rgba(239,68,68,.3);border-radius:4px;padding:10px 12px;background:rgba(239,68,68,.04)">
          <summary style="cursor:pointer;color:var(--red);font-size:12px;font-weight:600">⚠ Ver ${errores.length} errores detectados (no se importarán estas filas)</summary>
          <div style="margin-top:10px;max-height:240px;overflow-y:auto;font-size:11px;color:var(--t2)">
            ${errores.slice(0, 50).map(e => `
              <div style="padding:6px 8px;border-bottom:1px solid var(--border)">
                <div style="font-family:var(--font-mono);color:var(--t3)">Fila ${e.fila} · Legajo ${e.legajo} · Código ${e.codigo}</div>
                <ul style="margin:4px 0 0 16px;padding:0">
                  ${e.problemas.map(p => `<li style="color:var(--red)">${p}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
            ${errores.length > 50 ? `<div style="padding:8px;color:var(--t3);font-style:italic">+ ${errores.length - 50} más...</div>` : ''}
          </div>
        </details>
      ` : ''}

      <!-- Tabla de filas OK -->
      <div style="overflow-x:auto;max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:4px">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead style="position:sticky;top:0;background:var(--bg2);z-index:5">
            <tr>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Estado</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Fila</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Legajo</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Empleado</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Liq.</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Código</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Descripción</th>
              <th style="padding:7px 10px;text-align:right;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Importe</th>
              <th style="padding:7px 10px;text-align:left;color:var(--t3);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;border-bottom:1px solid var(--border)">Destino</th>
            </tr>
          </thead>
          <tbody>
            ${filas.map(f => {
              const haySieErr = errores.find(e => e.fila === f.fila);
              const labelDestino = modo === 'novedades' ? (_LABEL_CODIGO_NOVEDAD[f.codigo] || '—')
                : modo === 'manuales' ? (f._conceptoCustom?.nombre || '—')
                : 'Otros haberes/desc';
              return `
                <tr style="border-bottom:1px solid var(--border);${haySieErr?'background:rgba(239,68,68,.05)':''}">
                  <td style="padding:6px 10px">${haySieErr ? '<span style="color:var(--red)">✕</span>' : '<span style="color:var(--green)">✓</span>'}</td>
                  <td style="padding:6px 10px;color:var(--t3);font-family:var(--font-mono)">${f.fila}</td>
                  <td style="padding:6px 10px;color:var(--t2);font-family:var(--font-mono)">${f.legajoRaw}</td>
                  <td style="padding:6px 10px;color:var(--t1)">${f._empNombre || '<span style=color:var(--red)>?</span>'}</td>
                  <td style="padding:6px 10px;color:var(--t2);font-family:var(--font-mono)">${f.liquidacion ? String(f.liquidacion.mes).padStart(2,'0')+'-'+f.liquidacion.anio : '<span style=color:var(--red)>?</span>'}</td>
                  <td style="padding:6px 10px;color:var(--accent2);font-family:var(--font-mono);font-weight:600">${f.codigo}</td>
                  <td style="padding:6px 10px;color:var(--t2)">${f.descripcion || '—'}</td>
                  <td style="padding:6px 10px;color:var(--t1);font-family:var(--font-mono);text-align:right">${Number(f.importe).toLocaleString('es-AR', {minimumFractionDigits:2})}</td>
                  <td style="padding:6px 10px;color:var(--t3);font-size:10px">${labelDestino}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

    </div>

    <!-- BOTONES DE ACCIÓN -->
    <div style="padding:14px 22px;background:var(--bg2);display:flex;gap:8px;justify-content:flex-end;align-items:center">
      <span style="font-size:11px;color:var(--t3);margin-right:auto">${okCount === filas.length ? '✓ Todas las filas pasaron validación' : (okCount > 0 ? `Se importarán las ${okCount} filas OK; ${errores.length} se omitirán` : 'No hay filas válidas para importar')}</span>
      <button class="btn btn-ghost" onclick="renderImportadorConceptos()" style="font-size:12px;padding:8px 14px">Cancelar</button>
      <button class="btn btn-primary" onclick="_ejecutarImportConceptos()" ${okCount === 0 ? 'disabled style="font-size:13px;padding:8px 20px;opacity:.4;cursor:not-allowed"' : 'style="font-size:13px;padding:8px 20px"'}>
        🚀 Importar ${okCount} fila${okCount !== 1 ? 's' : ''}
      </button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASO 4: ejecutar la importación según el modo elegido
// ═══════════════════════════════════════════════════════════════════════════
async function _ejecutarImportConceptos(){
  const filas = _importConceptosState.filasParseadas;
  const errores = _importConceptosState.validaciones.errores;
  const modo = _importConceptosState.modo;
  const filasOK = filas.filter(f => !errores.find(e => e.fila === f.fila));

  if(!filasOK.length){
    toast('⚠ No hay filas válidas para importar', 'var(--red)');
    return;
  }

  const ok = await showConfirm({titulo:"Confirmar importación",mensaje:`Vas a importar ${filasOK.length} concepto${filasOK.length!==1?'s':''} en modo "${modo.toUpperCase()}".\n\n` +
    `¿Confirmás la operación? Esta acción modificará las liquidaciones en borrador correspondientes.`,labelOk:"Importar",peligroso:false});
  if(!ok) return;

  // Cargar todas las liquidaciones únicas que vamos a modificar
  const liqIds = [...new Set(filasOK.map(f => f._liqId))];
  const todas = await getLiquidaciones();
  const liqsAModificar = {};
  for(const id of liqIds){
    const l = todas.find(x => x.id === id);
    if(l) liqsAModificar[id] = l;
  }

  let aplicadas = 0;
  let fallidas = 0;
  const cargadoEl = new Date().toISOString();
  const cargadoPor = currentUser?.emp?.nom || 'desconocido';

  for(const f of filasOK){
    try {
      if(modo === 'novedades'){
        // Cargar novedades del empleado en la liq, modificar, guardar
        const novsLiq = (typeof getNovedadesLiq === 'function')
          ? await getNovedadesLiq(f._liqId)
          : [];
        let nov = novsLiq.find(n => n.leg === f.legajo) || { liqId: f._liqId, leg: f.legajo };
        const campo = f._campoNovedad;

        if(campo === 'otrosDescuentos'){
          // Array — append
          if(!Array.isArray(nov.otrosDescuentos)) nov.otrosDescuentos = [];
          nov.otrosDescuentos.push({
            concepto: f.descripcion || 'Importado',
            monto: f.importe,
            cod: f.codigo,
            obs: f.observaciones,
            importadoEl: cargadoEl,
            importadoPor: cargadoPor
          });
        } else if(campo === 'otrosHRem'){
          // No es array — sumar al campo simple si existe, sino crear
          nov.otrosHRem = ($m(nov.otrosHRem) || 0) + f.importe;
        } else {
          // Campos numéricos simples — SUMAR (no pisar) para que se acumule
          // si el usuario importa varias filas con el mismo concepto.
          // Excepción: hsExtra50/100/feriadosTrabajados, donde sumamos (cantidades).
          nov[campo] = ($m(nov[campo]) || 0) + f.importe;
        }
        await saveNovedad(nov);
        aplicadas++;

      } else if(modo === 'manuales'){
        // Crear/actualizar nov.conceptosCustomManuales[codigo]
        const novsLiq = (typeof getNovedadesLiq === 'function')
          ? await getNovedadesLiq(f._liqId)
          : [];
        let nov = novsLiq.find(n => n.leg === f.legajo) || { liqId: f._liqId, leg: f.legajo };
        if(!Array.isArray(nov.conceptosCustomManuales)) nov.conceptosCustomManuales = [];
        const i = nov.conceptosCustomManuales.findIndex(m => String(m.codigo) === String(f.codigo));
        if(i >= 0){
          // SUMAR al existente
          nov.conceptosCustomManuales[i].monto = ($m(nov.conceptosCustomManuales[i].monto) || 0) + f.importe;
          nov.conceptosCustomManuales[i].cargadoEl = cargadoEl;
          nov.conceptosCustomManuales[i].cargadoPor = cargadoPor;
        } else {
          nov.conceptosCustomManuales.push({
            codigo: f.codigo,
            monto: f.importe,
            cargadoEl,
            cargadoPor,
            obs: f.observaciones
          });
        }
        await saveNovedad(nov);
        aplicadas++;

      } else if(modo === 'personalizado'){
        // Determinar columna del recibo según signo del importe:
        // positivo → otrosH (haberes), negativo → otrosDescuentos
        const novsLiq = (typeof getNovedadesLiq === 'function')
          ? await getNovedadesLiq(f._liqId)
          : [];
        let nov = novsLiq.find(n => n.leg === f.legajo) || { liqId: f._liqId, leg: f.legajo };
        if(f.importe >= 0){
          if(!Array.isArray(nov.otrosH)) nov.otrosH = [];
          nov.otrosH.push({
            concepto: f.descripcion || `Concepto ${f.codigo}`,
            cod: f.codigo,
            monto: f.importe,
            tipo: 'H',
            obs: f.observaciones,
            importadoEl: cargadoEl,
            importadoPor: cargadoPor
          });
        } else {
          if(!Array.isArray(nov.otrosDescuentos)) nov.otrosDescuentos = [];
          nov.otrosDescuentos.push({
            concepto: f.descripcion || `Descuento ${f.codigo}`,
            cod: f.codigo,
            monto: Math.abs(f.importe),
            obs: f.observaciones,
            importadoEl: cargadoEl,
            importadoPor: cargadoPor
          });
        }
        await saveNovedad(nov);
        aplicadas++;
      }
    } catch(e){
      console.error('[importador] Error procesando fila', f, e);
      fallidas++;
    }
  }

  toast(`✓ Importación finalizada: ${aplicadas} aplicadas${fallidas > 0 ? `, ${fallidas} fallidas` : ''}. Andá a la liquidación → Preview para ver los cambios.`, fallidas ? 'var(--yellow)' : 'var(--green)', 6000);

  // Auditoría
  if(typeof logAuditX === 'function'){
    logAuditX('importador', 'conceptos_masivo', {
      modo,
      total: filasOK.length,
      aplicadas,
      fallidas,
      liquidaciones: liqIds,
      por: cargadoPor
    });
  }

  // Reset y volver al estado inicial
  renderImportadorConceptos();
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANTILLA DE EJEMPLO (Excel descargable)
// ═══════════════════════════════════════════════════════════════════════════
function _descargarPlantillaImport(){
  if(typeof XLSX === 'undefined'){
    toast('⚠ SheetJS no está disponible para generar la plantilla', 'var(--red)');
    return;
  }

  // Hoja 1: ejemplo de datos
  const ejemplo = [
    ['legajo', 'codigo', 'descripcion', 'importe', 'cantidad', 'liquidacion', 'observaciones'],
    ['000125', '2',     'Hs Extras 50%',           25000.00, 10, '05-2026', 'OT 1234 — apoyo cierre mensual'],
    ['000074', '9500',  'Ajuste de sueldo',        50000.00, '', '05-2026', 'Ajuste retroactivo paritaria'],
    ['000074', '58400', 'Otros conceptos exentos', 30000.00, '', '05-2026', 'Bonificación extraordinaria'],
    ['000125', '90000', 'Imp. Ganancias',          12500.00, '', '05-2026', 'Retención según F.572'],
  ];
  const wsEjemplo = XLSX.utils.aoa_to_sheet(ejemplo);
  wsEjemplo['!cols'] = [{wch:10},{wch:10},{wch:30},{wch:14},{wch:10},{wch:14},{wch:40}];

  // Hoja 2: instrucciones
  const inst = [
    ['IMPORTADOR DE CONCEPTOS DE NÓMINA — INSTRUCCIONES'],
    [''],
    ['COLUMNAS OBLIGATORIAS:'],
    ['  legajo','Número de legajo del empleado (puede ir sin ceros — el sistema lo normaliza a 6 dígitos)'],
    ['  codigo','Código del concepto. Ver Reporte de Conceptos para la lista completa.'],
    ['  importe','Monto en pesos. Coma o punto decimal. Negativo = descuento.'],
    ['  liquidacion','Período de la liquidación. Formatos: MM-YYYY, YYYY-MM, MM/YYYY, "Mayo 2026"'],
    [''],
    ['COLUMNAS OPCIONALES:'],
    ['  descripcion','Texto descriptivo del concepto (para auditoría)'],
    ['  cantidad','Cantidad (horas, días) — informativo'],
    ['  observaciones','Notas adicionales (queda en el audit log)'],
    [''],
    ['MODOS DE IMPORTACIÓN:'],
    ['  NOVEDADES','Suma el importe a la novedad estándar (hs extras, sac, etc.). Códigos válidos:'],
    ['',Object.keys(_MAPA_CODIGO_NOVEDAD).map(c => `${c}=${_LABEL_CODIGO_NOVEDAD[c]}`).join(' | ')],
    ['  CONCEPTOS MANUALES','Aplica el monto al concepto manual del módulo Conceptos Custom (el código debe existir activo)'],
    ['  PERSONALIZADO','Lo agrega como "Otros haberes" (importe positivo) o "Otros descuentos" (importe negativo)'],
    [''],
    ['VALIDACIONES:'],
    ['  - El legajo debe existir en la nómina'],
    ['  - La liquidación debe existir y estar en estado BORRADOR'],
    ['  - El código debe ser compatible con el modo elegido'],
    [''],
    ['DESPUÉS DE IMPORTAR:'],
    ['  Entrá a la liquidación → tab Preview para recalcular y ver los cambios reflejados en los recibos.']
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(inst);
  wsInst['!cols'] = [{wch:22},{wch:90}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsEjemplo, 'Ejemplo');
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');
  XLSX.writeFile(wb, 'plantilla_importador_conceptos.xlsx');
  toast('✓ Plantilla descargada', 'var(--green)');
}

// Helper $m_safe por si no está en scope
if(typeof $m === 'undefined'){
  window.$m = function(v){ return Number(v) || 0; };
}
