// ═══════════════════════════════════════════════════════════════════════════
// RECIBO PDF FIRMABLE — Generación y publicación a "Mis Recibos"
// ───────────────────────────────────────────────────────────────────────────
// Toma el HTML del recibo (que ya construye reciboUnaCopiaPag en js/17),
// lo renderiza con html2canvas y lo embebe como PDF con jsPDF, formato A4
// horizontal con original + duplicado lado a lado.
//
// El PDF queda persistido en IndexedDB (store 'recibos') con la misma
// clave que usa la vista del empleado: `${leg}_${YYYY-MM}`.
//
// Para que el PDF sea "firmable":
//   - Mantiene la zona "Firma del empleado" del HTML existente (línea
//     punteada al pie). El empleado puede imprimir, firmar y devolver.
//   - Si en el futuro se suma firma electrónica, el espacio reservado
//     se convierte en un widget de campo de firma del PDF.
//
// REQUERIMIENTOS:
//   - Liquidación con estado != borrador (ya aprobada, no se publican
//     borradores a empleados).
//   - Empresa con CUIT cargado (mínimo razonable para el comprobante).
// ═══════════════════════════════════════════════════════════════════════════

// Convierte un blob a base64 (string puro, sin "data:application/pdf;base64,")
function _reciboBlobABase64(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Construye el HTML del recibo de UN empleado (mismo formato que imprimirRecibo)
function _buildHtmlReciboCompleto(leg, liq){
  const item = liq.items.find(x => x.leg === leg);
  if(!item) return null;
  if(typeof reciboUnaCopiaPag !== 'function' || typeof buildConceptRows !== 'function'){
    console.error('reciboUnaCopiaPag o buildConceptRows no disponibles — js/17 cargado?');
    return null;
  }
  const params = (typeof getLiqParams === 'function') ? getLiqParams() : {};
  const empDB = (typeof getNomina === 'function' ? getNomina() : []).find(e => e.leg === leg) || {};
  const rows = buildConceptRows(item, params);

  const totH = rows.reduce((s,r)=>s+r.h,0);
  const totR = rows.reduce((s,r)=>s+r.r,0);
  const totA = rows.reduce((s,r)=>s+r.a,0);
  const neto = totH - totR + totA;

  const PAGE_SIZE = 22;
  const totalPags = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  let pages = '';
  for(let p = 0; p < totalPags; p++){
    const pageRows = rows.slice(p*PAGE_SIZE, (p+1)*PAGE_SIZE);
    const orig = reciboUnaCopiaPag(item, liq, pageRows, params, empDB, 'ORIGINAL', p+1, totalPags, totH, totR, totA, neto);
    const dupl = reciboUnaCopiaPag(item, liq, pageRows, params, empDB, 'DUPLICADO', p+1, totalPags, totH, totR, totA, neto);
    pages += `
      <div class="recibo-page">
        <div style="display:flex;gap:8px">
          <div style="flex:1">${orig}</div>
          <div style="flex:1">${dupl}</div>
        </div>
      </div>`;
  }
  return { html: pages, item, totalPags };
}

// Genera el PDF de UN recibo y lo guarda en IDB.
// Devuelve { ok, key, sizeKB } o { ok:false, error }.
async function generarPDFReciboYGuardar(leg, liq, opts){
  if(typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined'){
    return { ok:false, error:'jsPDF no cargado' };
  }
  if(typeof window.html2canvas !== 'function'){
    return { ok:false, error:'html2canvas no cargado' };
  }
  const { jsPDF } = window.jspdf || window;

  const built = _buildHtmlReciboCompleto(leg, liq);
  if(!built){ return { ok:false, error:'Empleado no encontrado en items' }; }

  // Render off-screen del HTML para capturarlo con html2canvas
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = 'position:fixed;left:-99999px;top:0;width:1100px;background:#fff;padding:8px;font-family:Arial,sans-serif';
  tempDiv.innerHTML = built.html;
  document.body.appendChild(tempDiv);

  try {
    // PDF A4 horizontal, escala adecuada para el papel
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageElems = tempDiv.querySelectorAll('.recibo-page');

    for(let i = 0; i < pageElems.length; i++){
      const el = pageElems[i];
      // Esperar a que las imágenes (logos) se carguen
      const imgs = el.querySelectorAll('img');
      await Promise.all(Array.from(imgs).map(img =>
        img.complete ? Promise.resolve() : new Promise(res => {
          img.onload = res; img.onerror = res;
        })
      ));
      const canvas = await window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      // Dimensiones de A4 horizontal: 297×210 mm. Margen 4mm.
      const pageW = 297, pageH = 210, margin = 4;
      const drawW = pageW - margin*2;
      const drawH = (canvas.height * drawW) / canvas.width;
      // Si la altura excede la página, escalar
      const finalH = drawH > (pageH - margin*2) ? (pageH - margin*2) : drawH;
      const finalW = drawH > (pageH - margin*2) ? (canvas.width * finalH) / canvas.height : drawW;
      const xOff = margin + (drawW - finalW) / 2;

      if(i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', xOff, margin, finalW, finalH);
    }

    const blob = pdf.output('blob');
    const base64 = await _reciboBlobABase64(blob);
    const sizeKB = Math.round(blob.size / 1024);

    // Guardar en IDB con la misma clave que la vista de empleado espera
    const periodoKey = liq.periodo;  // formato YYYY-MM
    const key = `${leg}_${periodoKey}`;
    const item = built.item;
    await setRecibo(key, {
      key,
      leg,
      nom: item.nom || '',
      emp: item.empresa || '',
      periodo: periodoKey,
      data: base64,
      uploadedAt: new Date().toLocaleString('es-AR'),
      uploadedBy: currentUser?.emp?.nom || 'RRHH',
      liqId: liq.id,
      liqTipo: liq.tipo,
      neto: item.netoAPagar
    });
    return { ok:true, key, sizeKB };
  } catch(err){
    console.error('Error generando PDF para', leg, err);
    return { ok:false, error: err.message || String(err) };
  } finally {
    tempDiv.remove();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI: Modal de generación masiva
// ───────────────────────────────────────────────────────────────────────────
// Recorre toda la nómina de la liquidación, genera PDFs y los publica.
// Muestra progreso y reporte final.
// ═══════════════════════════════════════════════════════════════════════════
async function publicarRecibosPDF(){
  const liq = _liqActiva;
  if(!liq){ toast('⚠ Sin liquidación activa','var(--yellow)'); return; }
  if(liq.estado === 'borrador'){
    toast('⚠ Aprobá la liquidación antes de publicar recibos','var(--yellow)'); return;
  }
  if(!liq.items?.length){ toast('⚠ Sin items en la liquidación','var(--yellow)'); return; }
  if(currentUser?.role !== 'rrhh'){ toast('⚠ Solo RR.HH.','var(--red)'); return; }

  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Generar y publicar ${liq.items.length} recibo${liq.items.length!==1?'s':''} PDF para el período ${liq.periodo}?<br><br>Los recibos quedarán disponibles en "Mis Recibos" para que cada empleado los visualice e imprima para firmar.<br><br>Tiempo estimado: ${Math.ceil(liq.items.length * 0.8)} segundos.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;

  // Modal de progreso
  const overlay = document.createElement('div');
  overlay.id = 'modal-publicar-recibos';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div class="card" style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);padding:0;max-width:560px;width:100%">
      <div style="padding:16px 22px;border-bottom:1px solid var(--border);background:var(--bg2)">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">📄 Generando recibos PDF</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">Período ${liq.periodo} · ${liq.items.length} empleados</div>
      </div>
      <div style="padding:22px">
        <div id="pub-rec-progress" style="font-size:12px;color:var(--t1);margin-bottom:10px;font-family:var(--font-mono)">Iniciando...</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:99px;height:10px;overflow:hidden">
          <div id="pub-rec-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2));height:100%;width:0%;transition:width .2s"></div>
        </div>
        <div id="pub-rec-detail" style="font-size:10px;color:var(--t3);margin-top:8px;font-family:var(--font-mono);min-height:14px"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const elProg   = document.getElementById('pub-rec-progress');
  const elBar    = document.getElementById('pub-rec-bar');
  const elDetail = document.getElementById('pub-rec-detail');

  let exitos = 0, fallas = 0;
  const errores = [];

  for(let i = 0; i < liq.items.length; i++){
    const item = liq.items[i];
    const pct = Math.round((i / liq.items.length) * 100);
    elBar.style.width = pct + '%';
    elProg.textContent = `${i+1} / ${liq.items.length} · ${item.nom?.split(',')[0] || item.leg}`;

    const r = await generarPDFReciboYGuardar(item.leg, liq);
    if(r.ok){
      exitos++;
      elDetail.textContent = `✓ ${legD(item.leg)} (${r.sizeKB} KB)`;
    } else {
      fallas++;
      errores.push(`${legD(item.leg)} ${item.nom?.split(',')[0]||''}: ${r.error}`);
      elDetail.textContent = `✕ ${legD(item.leg)}: ${r.error}`;
    }

    // Yield al loop para que la UI respire
    if(i % 3 === 0) await new Promise(res => setTimeout(res, 30));
  }

  elBar.style.width = '100%';
  elProg.innerHTML = `<strong style="color:${fallas?'var(--yellow)':'var(--green)'}">${fallas?'⚠':'✓'}</strong> ${exitos} de ${liq.items.length} recibos publicados${fallas?` · ${fallas} fallaron`:''}`;
  elDetail.innerHTML = '';

  // Persistir flag en la liquidación
  liq._recibosPublicados = { exitos, fallas, fecha: new Date().toISOString(), por: currentUser?.emp?.nom || 'RRHH' };
  await updateLiquidacion(liq);

  // Audit
  if(typeof logAuditX === 'function'){
    logAuditX('liquidacion', 'recibos_publicados', { liqId: liq.id, periodo: liq.periodo, exitos, fallas, por: currentUser?.emp?.nom });
  }

  // Footer con cierre y botón ver detalle errores si hubo
  const card = overlay.querySelector('.card');
  const footer = document.createElement('div');
  footer.style.cssText = 'padding:14px 22px;border-top:1px solid var(--border);background:var(--bg2);display:flex;gap:8px;justify-content:flex-end';
  footer.innerHTML = `
    ${errores.length ? `<button class="btn btn-ghost" onclick="_pubRecMostrarErrores()" style="font-size:12px;padding:7px 14px;color:var(--yellow);border-color:rgba(234,179,8,.3)">Ver ${errores.length} error${errores.length!==1?'es':''}</button>` : ''}
    <button class="btn btn-primary" onclick="document.getElementById('modal-publicar-recibos').remove();renderListaRecibos();" style="font-size:13px;padding:8px 18px">Listo</button>
  `;
  card.appendChild(footer);
  // Stash de errores para botón
  window._pubRecErrores = errores;
}

function _pubRecMostrarErrores(){
  const err = window._pubRecErrores || [];
  if(!err.length) return;
  showAlert('Errores al generar recibos:\n\n' + err.join('\n'), 'error');
}

// ═══════════════════════════════════════════════════════════════════════════
// Botón individual: generar y descargar un solo recibo PDF
// (también lo persiste en IDB)
// ═══════════════════════════════════════════════════════════════════════════
async function descargarReciboPDFIndividual(leg){
  const liq = _liqActiva;
  if(!liq){ toast('⚠ Sin liquidación activa','var(--yellow)'); return; }
  if(liq.estado === 'borrador'){
    toast('⚠ La liquidación está en borrador — aprobala antes','var(--yellow)'); return;
  }
  toast('Generando PDF...','var(--accent2)');
  const r = await generarPDFReciboYGuardar(leg, liq);
  if(!r.ok){
    toast('✕ '+r.error, 'var(--red)'); return;
  }
  // Bajar el archivo localmente además de guardarlo
  const recibos = await getRecibos();
  const rec = recibos[r.key];
  if(rec){
    const blob = b64toBlob(rec.data, 'application/pdf');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `recibo_${leg}_${liq.periodo}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  toast(`✓ PDF generado (${r.sizeKB} KB) · publicado a Mis Recibos`,'var(--green)');
}
