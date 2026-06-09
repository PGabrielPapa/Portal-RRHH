// ═══════════════════════════════════════════════════════════════════════
// ═══   CONSTANTES GLOBALES — claves localStorage, config del sistema  ═══
// ═══   Módulo 00 — se carga primero, antes que cualquier otro módulo  ═══
// ═══════════════════════════════════════════════════════════════════════

'use strict';

// ── Claves localStorage (todas con prefijo lsg_ para namespace) ──────────────
const LS = Object.freeze({
  // Auth / usuarios
  PASSWORDS:       'lsg_passwords',
  USER_LEVELS:     'lsg_user_levels',
  USER_DISABLED:   'lsg_user_disabled',
  BLANQUEO:        'lsg_blanqueo',

  // Anticipos
  SOLICITUDES:     'lsg_solicitudes',

  // ABM empleados
  ABM_ALTAS:       'lsg_abm_altas',
  ABM_BAJAS:       'lsg_abm_bajas',
  ABM_OVERRIDES:   'lsg_abm_overrides',

  // Domicilios
  DOM_OVERRIDES:   'lsg_dom_overrides',

  // Liquidaciones
  LIQ_REAPERTURAS: 'lsg_liq_reaperturas',
  LIQ_RECHAZOS:    'lsg_liq_rechazos',

  // Contabilidad
  ASIENTO_PLAN:    'lsg_asiento_plan_cuentas',

  // CBU
  CBU_EMPLEADOS:   'lsg_cbu_empleados',
  CBU_PORCENTAJES: 'lsg_cbu_porcentajes',

  // Auditoría
  AUDIT_LOG:       'lsg_audit_log',

  // Simulaciones
  SIM_SCENARIOS:   'lsg_sim_scenarios',

  // Liquidación — parámetros
  LIQ_PARAMS:      'lsg_liq_params',
  LIQ_APORTES_TOPES: 'lsg_aportes_topes',
  LIQ_GAN_PARAMS:  'lsg_gan_params_periodos',

  // Reportes
  REP_TEMPLATES:   'lsg_rep_templates',

  // Catálogo overrides
  CAT_OVERRIDES:   'lsg_catalogo_overrides',

  // Cierre de períodos contables
  CIERRES:         'lsg_cierres_contables',
});

// ── Configuración de negocio ─────────────────────────────────────────────────
const CFG = Object.freeze({
  // Anticipos: meses en que NO se otorgan adelantos (1=Ene, 6=Jun, 7=Jul, 12=Dic)
  ANTICIPO_MESES_BLOQUEADOS: [1, 6, 7, 12],

  // Anticipo: límite porcentaje del sueldo neto
  ANTICIPO_TOPE_PCT: 0.50,

  // Anticipos: un anticipo por trimestre
  ANTICIPO_BLOQUEO_TRIMESTRAL: true,

  // Valor hora: divisor unificado LCT + UOCRA (decisión empresarial LEITEN)
  HORA_DIVISOR: 173,

  // Nómina de admins iniciales (por nombre exacto en data/empleados.js)
  ADMINS_INICIALES: [
    'PARERA, MARTIN',
    'PAPA, PABLO GABRIEL',
    'PAPA, LUCIANO',
    'OLIVERA, WALTER',
  ],
});

// ── Modal de confirmación reutilizable (reemplaza confirm() nativo) ──────────
/**
 * showConfirm(opts) → Promise<boolean>
 *
 * opts = {
 *   titulo:    string   (ej: 'Eliminar recibos')
 *   mensaje:   string   (HTML permitido, ej: '<b>12 recibo(s)</b> serán borrados')
 *   labelOk:   string   (ej: 'Eliminar')    — default: 'Confirmar'
 *   labelCancel: string                     — default: 'Cancelar'
 *   peligroso: boolean  (true → botón rojo) — default: false
 * }
 */
function showConfirm({ titulo = 'Confirmar', mensaje = '', labelOk = 'Confirmar',
                        labelCancel = 'Cancelar', peligroso = false } = {}) {
  return new Promise(resolve => {
    let modal = document.getElementById('_confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = '_confirm-modal';
      modal.innerHTML = `
        <div id="_confirm-backdrop" style="
          position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;
          display:flex;align-items:center;justify-content:center;padding:20px">
          <div style="
            background:var(--bg,#1a1a1a);border:1px solid var(--border,#333);
            border-radius:10px;padding:28px 28px 22px;max-width:440px;width:100%;
            box-shadow:0 24px 60px rgba(0,0,0,.6)">
            <div id="_confirm-title" style="font-size:15px;font-weight:600;color:var(--t1,#fff);margin-bottom:10px"></div>
            <div id="_confirm-msg"   style="font-size:13px;color:var(--t2,#ccc);line-height:1.55;margin-bottom:22px"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end">
              <button id="_confirm-cancel" style="
                background:none;border:1px solid var(--border,#444);border-radius:6px;
                padding:8px 18px;font-size:13px;color:var(--t2,#ccc);cursor:pointer">
              </button>
              <button id="_confirm-ok" style="
                border:none;border-radius:6px;padding:8px 18px;
                font-size:13px;font-weight:600;cursor:pointer;color:#fff">
              </button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    document.getElementById('_confirm-title').textContent = titulo;
    document.getElementById('_confirm-msg').innerHTML   = mensaje;
    document.getElementById('_confirm-cancel').textContent = labelCancel;
    document.getElementById('_confirm-ok').textContent  = labelOk;
    const okBtn = document.getElementById('_confirm-ok');
    okBtn.style.background = peligroso ? 'var(--red,#c0392b)' : 'var(--accent,#3b82f6)';

    modal.style.display = 'block';

    const cleanup = (val) => {
      modal.style.display = 'none';
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };

    const ok       = document.getElementById('_confirm-ok');
    const cancel   = document.getElementById('_confirm-cancel');
    const backdrop = document.getElementById('_confirm-backdrop');

    const onOk       = () => cleanup(true);
    const onCancel   = () => cleanup(false);
    const onBackdrop = (e) => { if (e.target === backdrop) cleanup(false); };
    const onKey      = (e) => { if (e.key === 'Escape') cleanup(false); };

    ok.addEventListener('click',       onOk);
    cancel.addEventListener('click',   onCancel);
    backdrop.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}

// ── Modal de entrada de texto reutilizable (reemplaza prompt() nativo) ────────
/**
 * showPrompt(opts) → Promise<string|null>
 *
 * opts = {
 *   titulo:      string   (ej: 'Motivo del rechazo')
 *   mensaje:     string   (texto informativo, HTML permitido)
 *   placeholder: string   (ej: 'Escribí el motivo...')
 *   valorDefault: string  (valor inicial del campo)
 *   labelOk:     string   — default: 'Aceptar'
 *   labelCancel: string   — default: 'Cancelar'
 *   requerido:   boolean  — si true, no permite enviar vacío
 * }
 * Retorna: string con el valor ingresado, o null si canceló.
 */
function showPrompt({ titulo = '', mensaje = '', placeholder = '', valorDefault = '',
                      labelOk = 'Aceptar', labelCancel = 'Cancelar', requerido = false } = {}) {
  return new Promise(resolve => {
    let modal = document.getElementById('_prompt-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = '_prompt-modal';
      modal.innerHTML = `
        <div id="_prompt-backdrop" style="
          position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;
          display:flex;align-items:center;justify-content:center;padding:20px">
          <div style="
            background:var(--bg,#1a1a1a);border:1px solid var(--border,#333);
            border-radius:10px;padding:26px 26px 20px;max-width:420px;width:100%;
            box-shadow:0 24px 60px rgba(0,0,0,.6)">
            <div id="_prompt-title"  style="font-size:14px;font-weight:600;color:var(--t1,#fff);margin-bottom:8px"></div>
            <div id="_prompt-msg"    style="font-size:12px;color:var(--t2,#ccc);line-height:1.5;margin-bottom:14px"></div>
            <input  id="_prompt-inp" type="text" autocomplete="off"
              style="width:100%;background:var(--bg2,#111);border:1px solid var(--border,#444);
                     border-radius:6px;padding:9px 12px;color:var(--t1,#fff);font-size:13px;
                     outline:none;box-sizing:border-box;margin-bottom:6px">
            <div id="_prompt-err" style="font-size:11px;color:var(--red,#e55);min-height:16px;margin-bottom:12px"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end">
              <button id="_prompt-cancel" style="
                background:none;border:1px solid var(--border,#444);border-radius:6px;
                padding:7px 16px;font-size:13px;color:var(--t2,#ccc);cursor:pointer">
              </button>
              <button id="_prompt-ok" style="
                background:var(--accent,#3b82f6);border:none;border-radius:6px;
                padding:7px 16px;font-size:13px;font-weight:600;color:#fff;cursor:pointer">
              </button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    document.getElementById('_prompt-title').textContent   = titulo;
    document.getElementById('_prompt-msg').innerHTML       = mensaje;
    document.getElementById('_prompt-err').textContent     = '';
    document.getElementById('_prompt-cancel').textContent  = labelCancel;
    document.getElementById('_prompt-ok').textContent      = labelOk;
    const inp = document.getElementById('_prompt-inp');
    inp.placeholder = placeholder;
    inp.value       = valorDefault;

    modal.style.display = 'block';
    setTimeout(() => inp.focus(), 50);

    const cleanup = (val) => {
      modal.style.display = 'none';
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };

    const okBtn     = document.getElementById('_prompt-ok');
    const cancelBtn = document.getElementById('_prompt-cancel');
    const backdrop  = document.getElementById('_prompt-backdrop');
    const errDiv    = document.getElementById('_prompt-err');

    const onOk = () => {
      const val = inp.value.trim();
      if (requerido && !val) {
        errDiv.textContent = '⚠ Este campo es obligatorio.';
        inp.focus();
        return;
      }
      cleanup(val || null);
    };
    const onCancel   = () => cleanup(null);
    const onBackdrop = (e) => { if (e.target === backdrop) cleanup(null); };
    const onKey      = (e) => {
      if (e.key === 'Enter')  { onOk(); }
      if (e.key === 'Escape') { cleanup(null); }
    };

    okBtn.addEventListener('click',      onOk);
    cancelBtn.addEventListener('click',  onCancel);
    backdrop.addEventListener('click',   onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}

// ── showAlert() — reemplaza alert() nativo ────────────────────────────────────
/**
 * showAlert(mensaje, tipo?) → void
 * tipo: 'error' | 'warning' | 'info'  (default: 'error')
 * Usa toast() si está disponible, si no crea un toast temporal propio.
 */
function showAlert(mensaje, tipo = 'error') {
  const color = tipo === 'warning' ? 'var(--yellow,#ca8a04)'
              : tipo === 'info'    ? 'var(--accent,#3b82f6)'
              : 'var(--red,#dc2626)';
  if (typeof toast === 'function') {
    toast(String(mensaje), color, 5000);
    return;
  }
  // Fallback si toast() no está cargado todavía
  const t = document.createElement('div');
  t.textContent = String(mensaje);
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${color};color:#fff;padding:10px 20px;border-radius:8px;
    font-size:13px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,.4);max-width:480px;text-align:center`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

// ─── Selector de empleado genérico ────────────────────────────────────────
// Usado por módulos ET (54), Beneficios (55) y cualquier módulo futuro.
function _abrirSelectorEmpleado(titulo, modalId, onSelectFn){
  const nomina = (typeof getNomina === 'function')
    ? getNomina().filter(e => !e._deBaja && !e.egreso)
    : [];

  const prev = document.getElementById(modalId);
  if(prev) prev.remove();

  const filtroId = modalId + '-busq';
  const listaId  = modalId + '-lista';

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px';

  modal.innerHTML = `
    <div class="card" style="padding:0;max-width:480px;width:100%;border:1px solid var(--border)">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:600;color:var(--t1)">${titulo}</div>
        <button onclick="document.getElementById('${modalId}').remove()" style="background:none;border:none;color:var(--t3);font-size:20px;cursor:pointer">✕</button>
      </div>
      <div style="padding:12px 20px 4px">
        <input id="${filtroId}" placeholder="🔍 Buscar por nombre o legajo..."
          oninput="_filtrarSelectorEmp('${listaId}', this.value)"
          style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px 10px;color:var(--t1);font-size:13px;outline:none;box-sizing:border-box">
      </div>
      <div id="${listaId}" style="max-height:320px;overflow-y:auto;padding:8px 20px 16px;display:flex;flex-direction:column;gap:4px">
        ${nomina.sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map(e=>`
          <div style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--r);cursor:pointer;background:var(--bg2);transition:background .1s"
            data-leg="${e.leg}" data-nom="${(e.nom||'').toLowerCase()} ${legD(e.leg)}"
            onmouseover="this.style.background='var(--bg1)'" onmouseout="this.style.background='var(--bg2)'">
            <div style="font-size:13px;font-weight:500;color:var(--t1)">${e.nom}</div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono)">Leg ${legD(e.leg)} · ${e.emp||''}</div>
          </div>`).join('')}
      </div>
    </div>`;

  // Agregar click listeners (no inline onclick para evitar serialización de función)
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-leg]').forEach(div => {
    div.addEventListener('click', () => {
      modal.remove();
      onSelectFn(div.dataset.leg);
    });
  });
  setTimeout(() => document.getElementById(filtroId)?.focus(), 100);
}

function _filtrarSelectorEmp(listaId, q){
  const lista = document.getElementById(listaId);
  if(!lista) return;
  const lq = (q||'').toLowerCase();
  lista.querySelectorAll('[data-leg]').forEach(d => {
    d.style.display = !lq || (d.dataset.nom||'').includes(lq) ? '' : 'none';
  });
}
