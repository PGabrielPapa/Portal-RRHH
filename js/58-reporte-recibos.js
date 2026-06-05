// ═══════════════════════════════════════════════════════════════════════════
// REPORTE DE RECIBOS POR EMPLEADO (RR.HH. → Recibos de Haberes)
// ───────────────────────────────────────────────────────────────────────────
// Permite elegir un empleado, listar los períodos YA LIQUIDADOS en los que
// aparece (liquidaciones con estado != borrador) y seleccionar con checkboxes
// cuáles incluir. Genera UN PDF con los recibos completos seleccionados
// (layout oficial: original + duplicado, igual que js/35-recibo-pdf.js).
// ═══════════════════════════════════════════════════════════════════════════

let _repRecLeg = null;
let _repRecNom = '';
let _repRecLiqs = [];   // liquidaciones (no borrador) donde aparece el empleado

const _REP_REC_TIPO = {
  mensual:'Mensual', quincenal:'Quincenal', quincenal_1:'1ª Quincena',
  quincenal_2:'2ª Quincena', sac1:'SAC 1° Sem.', sac2:'SAC 2° Sem.',
  vacaciones:'Vacaciones', anticipo:'Anticipo', final:'Liq. Final',
  complementaria:'Complementaria'
};

function repRecReset(){
  _repRecLeg = null; _repRecNom = ''; _repRecLiqs = [];
  const sel = document.getElementById('rep-rec-emp-sel');
  if(sel) sel.innerHTML = '<span style="color:var(--t3)">Ningún empleado seleccionado</span>';
  const lista = document.getElementById('rep-rec-lista');
  if(lista){ lista.style.display = 'none'; lista.innerHTML = ''; }
  const foot = document.getElementById('rep-rec-foot');
  if(foot) foot.style.display = 'none';
  const prog = document.getElementById('rep-rec-progress');
  if(prog) prog.style.display = 'none';
}

function repRecSeleccionarEmpleado(){
  _abrirSelectorEmpleado('Reporte de recibos — Elegir empleado', 'modal-rep-rec', leg => {
    repRecCargarPeriodos(leg);
  });
}

async function repRecCargarPeriodos(leg){
  const emp = (typeof getNomina === 'function' ? getNomina() : []).find(e => e.leg === leg) || {};
  _repRecLeg = leg;
  _repRecNom = emp.nom || leg;

  const sel = document.getElementById('rep-rec-emp-sel');
  if(sel) sel.innerHTML = `<span style="color:var(--t1);font-weight:600">${_repRecNom}</span>
    <span style="color:var(--t3);font-family:var(--font-mono);font-size:11px"> · Leg ${leg} · ${emp.emp||''}</span>`;

  let liqs = [];
  try { liqs = await getLiquidaciones(); } catch(e){ console.error(e); }
  _repRecLiqs = (liqs||[])
    .filter(l => l.estado !== 'borrador' && Array.isArray(l.items) && l.items.some(i => i.leg === leg))
    .sort((a,b) => (b.periodo||'').localeCompare(a.periodo||'') || (b.id-a.id));

  const lista = document.getElementById('rep-rec-lista');
  const foot = document.getElementById('rep-rec-foot');
  if(!lista) return;
  lista.style.display = 'block';

  if(!_repRecLiqs.length){
    lista.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--t3)">No hay períodos liquidados (aprobados/pagados/cerrados) para este empleado.</div>';
    if(foot) foot.style.display = 'none';
    return;
  }

  const fmtMon = n => '$ ' + Number(n||0).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2});
  lista.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border);background:var(--bg2)">
      <input type="checkbox" id="rep-rec-all" onchange="repRecToggleTodos(this.checked)" style="accent-color:var(--accent)">
      <label for="rep-rec-all" style="font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;cursor:pointer">Seleccionar todos</label>
      <span id="rep-rec-count" style="margin-left:auto;font-size:11px;color:var(--t3);font-family:var(--font-mono)">0 seleccionados</span>
    </div>` +
    _repRecLiqs.map(l => {
      const it = l.items.find(i => i.leg === leg) || {};
      const tipoLbl = _REP_REC_TIPO[l.tipo] || l.tipo;
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border)">
        <input type="checkbox" class="rep-rec-chk" value="${l.id}" onchange="repRecActualizarCont()" style="accent-color:var(--accent)">
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--t1);min-width:62px">${l.periodo||'—'}</span>
        <span style="font-size:12px;color:var(--t2);min-width:100px">${tipoLbl}</span>
        <span style="font-size:11px;color:var(--t3);flex:1">${l.empresa||''} · Pago ${l.fechaPago||'—'} · <span style="text-transform:capitalize">${l.estado}</span></span>
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--t1)">${fmtMon(it.netoAPagar)}</span>
      </div>`;
    }).join('');

  if(foot) foot.style.display = 'flex';
  repRecActualizarCont();
}

function repRecToggleTodos(on){
  document.querySelectorAll('.rep-rec-chk').forEach(c => { c.checked = on; });
  repRecActualizarCont();
}

function repRecActualizarCont(){
  const n = document.querySelectorAll('.rep-rec-chk:checked').length;
  const cnt = document.getElementById('rep-rec-count');
  if(cnt) cnt.textContent = `${n} seleccionado${n===1?'':'s'}`;
  const btn = document.getElementById('rep-rec-btn-pdf');
  if(btn) btn.disabled = (n === 0);
}

// Genera UN PDF con los recibos completos de los períodos seleccionados.
async function repRecGenerarPDF(){
  if(!_repRecLeg){ toast('⚠ Elegí un empleado primero', 'var(--yellow)'); return; }
  const ids = Array.from(document.querySelectorAll('.rep-rec-chk:checked')).map(c => Number(c.value));
  if(!ids.length){ toast('⚠ Seleccioná al menos un período', 'var(--yellow)'); return; }
  if(typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined'){ toast('⚠ jsPDF no cargado', 'var(--yellow)'); return; }
  if(typeof window.html2canvas !== 'function'){ toast('⚠ html2canvas no cargado', 'var(--yellow)'); return; }
  const { jsPDF } = window.jspdf || window;

  // Orden cronológico ascendente dentro del reporte
  const liqsSel = _repRecLiqs.filter(l => ids.includes(l.id))
    .sort((a,b) => (a.periodo||'').localeCompare(b.periodo||'') || (a.id-b.id));

  const prog = document.getElementById('rep-rec-progress');
  const progTxt = document.getElementById('rep-rec-progress-txt');
  const progBar = document.getElementById('rep-rec-progress-bar');
  const btn = document.getElementById('rep-rec-btn-pdf');
  if(prog) prog.style.display = 'block';
  if(btn) btn.disabled = true;

  const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
  let pagina = 0, fallas = [];

  try {
    for(let i = 0; i < liqsSel.length; i++){
      const liq = liqsSel[i];
      if(progTxt) progTxt.textContent = `Generando ${i+1}/${liqsSel.length} — ${liq.periodo} (${_REP_REC_TIPO[liq.tipo]||liq.tipo})...`;
      if(progBar) progBar.style.width = `${Math.round((i/liqsSel.length)*100)}%`;

      const built = _buildHtmlReciboCompleto(_repRecLeg, liq);
      if(!built){ fallas.push(liq.periodo); continue; }

      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = 'position:fixed;left:-99999px;top:0;width:1100px;background:#fff;padding:8px;font-family:Arial,sans-serif';
      tempDiv.innerHTML = built.html;
      document.body.appendChild(tempDiv);
      try {
        const pageElems = tempDiv.querySelectorAll('.recibo-page');
        for(const el of pageElems){
          const imgs = el.querySelectorAll('img');
          await Promise.all(Array.from(imgs).map(img =>
            img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })
          ));
          const canvas = await window.html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#ffffff' });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pageW = 297, pageH = 210, margin = 4;
          const drawW = pageW - margin*2;
          const drawH = (canvas.height * drawW) / canvas.width;
          const finalH = drawH > (pageH - margin*2) ? (pageH - margin*2) : drawH;
          const finalW = drawH > (pageH - margin*2) ? (canvas.width * finalH) / canvas.height : drawW;
          const xOff = margin + (drawW - finalW) / 2;
          if(pagina > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', xOff, margin, finalW, finalH);
          pagina++;
        }
      } finally {
        tempDiv.remove();
      }
    }

    if(pagina === 0){
      toast('⚠ No se pudo generar ningún recibo', 'var(--yellow)');
      return;
    }
    if(progBar) progBar.style.width = '100%';
    if(progTxt) progTxt.textContent = 'Descargando PDF...';

    const nomArchivo = `Recibos_${_repRecLeg}_${(_repRecNom||'').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g,'').trim().replace(/ +/g,'_')}_${liqsSel.length}periodos.pdf`;
    pdf.save(nomArchivo);

    toast(fallas.length
      ? `✔ Reporte generado (${liqsSel.length - fallas.length} recibos) · ⚠ sin datos: ${fallas.join(', ')}`
      : `✔ Reporte generado: ${liqsSel.length} recibo${liqsSel.length===1?'':'s'}, ${pagina} página${pagina===1?'':'s'}`,
      'var(--green)');

    // Auditoría (si está disponible)
    if(typeof auditSistema === 'function'){
      try { auditSistema('reporte_recibos', `Reporte de recibos de ${_repRecNom} (${_repRecLeg}): ${liqsSel.map(l=>l.periodo).join(', ')}`); } catch(e){}
    }
  } catch(err){
    console.error('Error generando reporte de recibos', err);
    toast('⚠ Error generando el reporte: ' + (err.message||err), 'var(--yellow)');
  } finally {
    if(btn) btn.disabled = false;
    if(prog) setTimeout(() => { prog.style.display = 'none'; if(progBar) progBar.style.width='0%'; }, 1500);
    repRecActualizarCont();
  }
}
