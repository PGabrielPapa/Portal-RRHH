// ─── APPROVAL MODAL ───
let currentSolId = null;
let currentRole = null;

function openApproval(id, role){
  const s = solicitudes.find(x=>x.id===id);
  if(!s) return;
  currentSolId=id; currentRole=role;

  const isHR = role==='hr';
  const actionLabel = isHR?'Autorizar (RR.HH.)':'Validar (Gerente)';
  
  let cuotasField = '';
  if(isHR){
    const alertExceso = s.exceso
      ? `<div class="alert alert-warn">⚠ El monto solicitado supera el límite. RR.HH. debe definir cuotas, plazo y monto final aprobado.</div>`
      : '';
    cuotasField=`
      ${alertExceso}
      <div class="form-grid" style="margin-top:12px">
        <div class="form-group">
          <label>Cuotas</label>
          <input type="number" id="mod-cuotas" value="${s.cuotas||''}" min="1" max="24" placeholder="N° cuotas">
        </div>
        <div class="form-group">
          <label>Plazo (meses)</label>
          <input type="number" id="mod-plazo" value="${s.plazo||''}" min="1" max="24" placeholder="Plazo">
        </div>
        <div class="form-group">
          <label>Monto aprobado ($)</label>
          <div class="amount-wrap"><span class="amount-prefix">$</span><input type="number" id="mod-monto" value="${s.monto}" style="padding-left:28px"></div>
        </div>
      </div>`;
  }

  const panel = document.createElement('div');
  panel.id='modal-overlay';
  panel.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center';
  panel.innerHTML=`
    <div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);width:520px;max-height:80vh;overflow-y:auto;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div style="font-size:16px;font-weight:600">Revisión de Solicitud</div>
        <div style="font-family:var(--font-mono);font-size:12px;color:var(--t3)">${s.id}</div>
      </div>
      <div class="approval-emp">
        <div class="approval-row"><span class="key">Empleado</span><span class="val">${s.emp.nom}</span></div>
        <div class="approval-row"><span class="key">Legajo</span><span class="val td-mono">${s.emp.leg}</span></div>
        <div class="approval-row"><span class="key">CUIL</span><span class="val td-mono">${s.emp.cuil}</span></div>
        <div class="approval-row"><span class="key">Empresa</span><span class="val">${s.emp.emp}</span></div>
        <div class="approval-row"><span class="key">Sueldo Bruto</span><span class="val td-mono">${fmt(s.emp.bruto)}</span></div>
        <div class="approval-row"><span class="key">Sueldo Neto (80%)</span><span class="val td-mono" style="color:var(--accent2)">${fmt(s.emp.neto)}</span></div>
        <div class="approval-row"><span class="key">Límite (50% neto)</span><span class="val td-mono" style="color:var(--green)">${fmt(s.emp.lim)}</span></div>
        <div class="approval-row"><span class="key">Monto solicitado</span><span class="val td-mono" style="color:var(--accent2);font-size:15px">${fmt(s.monto)}</span></div>
        <div class="approval-row"><span class="key">Motivo</span><span class="val">${s.motivo}</span></div>
        <div class="approval-row"><span class="key">Gerente validador</span><span class="val" style="color:var(--accent2)">${s.validador} <span style="color:var(--t3);font-size:11px">(${s.validadorArea})</span></span></div>
        ${s.obs?`<div class="approval-row"><span class="key">Obs.</span><span class="val">${s.obs}</span></div>`:''}
        ${s.exceso?`<div class="approval-row"><span class="key">Supera límite</span><span class="val" style="color:var(--yellow)">Sí</span></div>`:''}
      </div>
      ${cuotasField}
      <div class="form-group" style="margin-top:16px">
        <label>Comentario ${isHR?'RR.HH.':'Gerente'}</label>
        <textarea id="mod-comment" rows="2" placeholder="Comentario opcional..."></textarea>
      </div>
      <div class="reject-box show" id="rej-box" style="display:none">
        <div class="form-group">
          <label>Motivo de rechazo *</label>
          <textarea id="mod-reject" rows="2" placeholder="Motivo obligatorio para rechazar..."></textarea>
        </div>
      </div>
      <div class="btn-row" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="showReject()">✕ Rechazar</button>
        <button class="btn btn-success" onclick="approveAction()">${actionLabel} ✓</button>
      </div>
    </div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click',e=>{ if(e.target===panel) closeModal(); });
}

function showReject(){
  const box=document.getElementById('rej-box');
  if(box) box.style.display='block';
}

function closeModal(){
  const m=document.getElementById('modal-overlay');
  if(m) m.remove();
}

function approveAction(){
  const s = solicitudes.find(x=>x.id===currentSolId);
  if(!s) return;
  
  if(currentRole==='manager'){
    s.status='pending_hr';
    s.managerComment=document.getElementById('mod-comment')?.value||'';
    toast('✓ Validado por Gerente — pasa a RR.HH.','var(--green)');
    // ── Auditoría: aval del gerente ──
    if(typeof auditAnticipo === 'function'){
      auditAnticipo('aval_gerente', s.emp, {
        id: s.id,
        detail: `Monto solicitado: $${(s.monto||0).toLocaleString('es-AR')}${s.managerComment?' · '+s.managerComment:''}`
      });
    }
  } else {
    // HR approval — siempre lee los campos de cuotas/plazo/monto
    const cuotas = parseInt(document.getElementById('mod-cuotas')?.value, 10)||null;
    const plazo  = parseInt(document.getElementById('mod-plazo')?.value, 10)||null;
    const monto  = parseFloat(document.getElementById('mod-monto')?.value)||s.monto;
    s.cuotas = cuotas; s.plazo = plazo; s.montoAprobado = monto;
    s.status='approved';
    s.hrComment=document.getElementById('mod-comment')?.value||'';
    toast('✓ Solicitud AUTORIZADA por RR.HH.','var(--green)');
    // ── Auditoría: aprobación final RR.HH. ──
    if(typeof auditAnticipo === 'function'){
      auditAnticipo('aprobacion_rrhh', s.emp, {
        id: s.id,
        before: `Solicitado: $${(s.monto||0).toLocaleString('es-AR')}`,
        after: `Aprobado: $${(monto||0).toLocaleString('es-AR')} en ${cuotas||'?'} cuota(s)`,
        detail: s.hrComment || null
      });
    }
  }
  updateCounts();
  saveSolicitudes();
  closeModal();
  if(currentRole==='manager') renderPendientes();
  else renderRRHH();
}

function rejectAction(){
  const s = solicitudes.find(x=>x.id===currentSolId);
  if(!s) return;
  const motivo=document.getElementById('mod-reject')?.value?.trim();
  if(!motivo){toast('⚠ Ingresá el motivo de rechazo','var(--yellow)');return;}
  s.status='rejected';
  s.rejectReason=motivo;
  updateCounts();
  saveSolicitudes();
  closeModal();
  toast('Solicitud rechazada','var(--red)');
  // ── Auditoría: rechazo gerente o RR.HH. (según el rol que está rechazando) ──
  if(typeof auditAnticipo === 'function'){
    const accion = (currentRole==='manager') ? 'rechazo_gerente' : 'rechazo_rrhh';
    auditAnticipo(accion, s.emp, {
      id: s.id,
      detail: `Motivo: ${motivo} · Monto solicitado: $${(s.monto||0).toLocaleString('es-AR')}`
    });
  }
  if(currentRole==='manager') renderPendientes();
  else renderRRHH();
}

// override reject btn
document.addEventListener('click',function(e){
  if(e.target.textContent==='✕ Rechazar' && currentSolId){
    const box=document.getElementById('rej-box');
    if(box&&box.style.display==='none'){box.style.display='block';return;}
    if(box&&box.style.display!=='none') rejectAction();
  }
});

// ─── COUNTS ───
function updateCounts(){
  // Badge Panel Gerente: solo las solicitudes del gerente logueado
  const gerNom = currentUser?.emp?.nom?.toUpperCase().split(',')[0].trim() || '';
  const pend = solicitudes.filter(s =>
    s.status==='pending_manager' &&
    s.validador && s.validador.toUpperCase().includes(gerNom)
  ).length;
  const rrhh = solicitudes.filter(s=>s.status==='pending_hr').length;
  const cntPend = document.getElementById('cnt-pend');
  const cntRrhh = document.getElementById('cnt-rrhh');
  if(cntPend) cntPend.textContent = pend || '';
  if(cntRrhh) cntRrhh.textContent = rrhh || '';
}

// ─── TOAST ───
// `duration` (ms) opcional — varios callsites pasan 3500/4000/5000 como tercer
// argumento; antes se ignoraba silenciosamente. Default 3000.
function toast(msg, color='var(--green)', duration=3000){
  const t=document.getElementById('toast');
  if(!t) return;
  // Cancelar timeout anterior si quedó pendiente
  if(toast._tid){ clearTimeout(toast._tid); toast._tid=null; }
  t.textContent=msg;
  t.style.borderColor=color;
  t.style.color=color;
  t.classList.add('show');
  toast._tid = setTimeout(()=>{ t.classList.remove('show'); toast._tid=null; }, duration);
}
