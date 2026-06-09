// ═══════════════════════════════════════════════════════════════════════
// ═══   MIS DATOS — Vista del empleado: perfil, domicilio, teléfono    ═══
// ═══   Módulo 05                                                       ═══
// ═══════════════════════════════════════════════════════════════════════

function renderMisDatos(){
  const div = document.getElementById('mis-datos-content');
  if(!div || !currentUser) return;
  const e = currentUser.emp;
  const area = getValidador(e)?.area || '—';
  const fmt$ = n => n ? new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n) : '—';
  const fila = (label, valor, accent=false) => `
    <div style="display:flex;align-items:center;padding:13px 20px;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;min-width:160px">${label}</span>
      <span style="font-size:13px;font-weight:${accent?'600':'400'};color:${accent?'var(--accent2)':'var(--t1)'}">${valor}</span>
    </div>`;
  div.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden;max-width:620px">
      <div style="padding:16px 20px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-glow);border:1px solid rgba(61,127,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--accent2);flex-shrink:0">
          ${e.nom.split(',')[0].trim().substring(0,2)}
        </div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--t1)">${e.nom}</div>
          <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">Legajo ${legD(e.leg)}</div>
        </div>
      </div>
      ${fila('Empresa', e.emp)}
      ${fila('Ubicación', e.lugar||'—')}
      ${fila('Área', area)}
      ${fila('CUIL', e.cuil)}
      ${fila('Remuneración bruta', fmt$(e.bruto), true)}
      ${(()=>{ const d=DOMICILIOS[e.leg]; if(!d||!d.dom) return ''; return fila('Domicilio', d.dom + (d.ciudad ? ' — ' + d.ciudad : '')); })()}
      ${(()=>{ const d=DOMICILIOS[e.leg]; const mail=d?.mail||e.mail||''; return mail ? fila('E-mail', mail) : ''; })()}
    </div>
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="toggleFormCambioDom()">✏ Informar cambio de domicilio</button>
      <button class="btn btn-ghost" onclick="toggleMisCBUs()" style="color:var(--accent2);border-color:rgba(61,127,255,.3)">🏦 Mis cuentas de acreditación</button>
      <button class="btn btn-ghost" onclick="toggleMisTalles()" style="color:rgb(251,146,60);border-color:rgba(251,146,60,.3)">👕 Mis talles de trabajo</button>
      <button class="btn btn-ghost" onclick="toggleMiHistorial()" style="color:rgb(168,85,247);border-color:rgba(168,85,247,.3)">📜 Ver mi historial</button>
      <button class="btn btn-ghost" onclick="toggleMisLicenciasHist()" style="color:rgb(34,197,94);border-color:rgba(34,197,94,.3)">🏖 Ver mis licencias</button>
      <button class="btn btn-ghost" onclick="toggleMisEvaluaciones()" style="color:rgb(234,179,8);border-color:rgba(234,179,8,.3)">📝 Ver mis evaluaciones</button>
    </div>
    <div id="mis-cbus-wrap" style="display:none;margin-top:16px">
      <div class="card" style="padding:18px;max-width:760px">
        <div class="card-title" style="margin-bottom:14px">🏦 Mis cuentas de acreditación de haberes</div>
        <div id="mis-cbus-content"></div>
      </div>
    </div>
    <div id="mis-talles-wrap" style="display:none;margin-top:16px"></div>
    <div id="mi-historial-wrap" style="display:none;margin-top:16px">
      <div class="card" style="padding:18px;max-width:720px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div class="card-title">📜 Historial de cambios</div>
          <span id="mi-historial-count" style="font-size:11px;color:var(--t3);font-family:var(--font-mono)"></span>
        </div>
        <div id="mi-historial-content"></div>
      </div>
    </div>
    <div id="mis-licencias-wrap" style="display:none;margin-top:16px">
      <div class="card" style="padding:18px;max-width:860px">
        <div class="card-title" style="margin-bottom:12px">🏖 Mis licencias</div>
        <div id="mis-licencias-content"></div>
      </div>
    </div>
    <div id="mis-evaluaciones-wrap" style="display:none;margin-top:16px">
      <div class="card" style="padding:18px;max-width:860px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <div class="card-title">📝 Mis evaluaciones de desempeño (legajo digital)</div>
          <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">Solo se muestran las registradas por RR.HH.</span>
        </div>
        <div id="mis-evaluaciones-content"></div>
      </div>
    </div>
    <div id="form-cambio-dom" style="display:none;margin-top:16px">
      <div class="card" style="padding:20px;max-width:620px">
        <div class="card-title" style="margin-bottom:14px">Nuevo domicilio</div>
        <div class="form-grid">
          <div class="form-group full">
            <label>Calle</label>
            <input type="text" id="new-dom-calle" placeholder="Ej: Av. Corrientes" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
          <div class="form-group">
            <label>Número</label>
            <input type="text" id="new-dom-nro" placeholder="Ej: 1234" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
          <div class="form-group">
            <label>Piso</label>
            <input type="text" id="new-dom-piso" placeholder="Ej: 3 (opcional)" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
          <div class="form-group">
            <label>Departamento</label>
            <input type="text" id="new-dom-depto" placeholder="Ej: B (opcional)" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
          <div class="form-group">
            <label>Localidad</label>
            <input type="text" id="new-dom-loc" placeholder="Ej: San Isidro" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
          <div class="form-group">
            <label>Provincia</label>
            <input type="text" id="new-dom-prov" placeholder="Ej: Buenos Aires" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
          <div class="form-group">
            <label>Código Postal</label>
            <input type="text" id="new-dom-cp" placeholder="Ej: 1642" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--t1);font-size:13px;outline:none;width:100%">
          </div>
        </div>
        <div class="btn-row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn btn-ghost" onclick="toggleFormCambioDom()">Cancelar</button>
          <button class="btn btn-primary" onclick="enviarCambioDomicilio()">Enviar</button>
        </div>
      </div>
    </div>
    <div id="dom-confirmacion" style="display:none;margin-top:16px;padding:20px 24px;background:linear-gradient(135deg,rgba(34,197,94,.08),rgba(61,127,255,.05));border:1px solid rgba(34,197,94,.25);border-radius:var(--r);max-width:620px;text-align:center">
      <div style="font-size:22px;margin-bottom:10px">✅</div>
      <div style="font-size:14px;font-weight:600;color:var(--green);margin-bottom:8px">Domicilio informado</div>
      <div style="font-size:13px;color:var(--t2);line-height:1.6">Muchas gracias por la información, la misma ha sido enviada a Recursos Humanos para la incorporación definitiva en nuestra base de datos.</div>
    </div>`;
}

