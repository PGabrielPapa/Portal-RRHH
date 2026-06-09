// ═══════════════════════════════════════════════════════════════════════
// ═══   STATE & STORAGE — localStorage helpers, nómina, getters       ═══
// ═══   Módulo 01 — primer módulo que se carga                         ═══
// ═══════════════════════════════════════════════════════════════════════


// State
let empresaActual = null;
let empActual = null;
let solicitudes = [];
let excessEnabled = false;
let empFiltrados = [];

function saveSolicitudes(){ try{localStorage.setItem('lsg_solicitudes', JSON.stringify(solicitudes));}catch(e){} }
function loadSolicitudes(){ try{ solicitudes = JSON.parse(localStorage.getItem('lsg_solicitudes')||'[]'); }catch(e){ solicitudes=[]; } }

// Init
window.onload = function(){
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('f-fecha').value = hoy;
  loadSolicitudes();
  updateCounts();
  setTimeout(()=>document.getElementById('ls-dni').focus(),200);
  inicializarCumpleanos();
  // Aplicar overrides de domicilio guardados por RR.HH.
  try {
    const domOverrides = JSON.parse(localStorage.getItem('lsg_dom_overrides') || '{}');
    Object.entries(domOverrides).forEach(([leg, d]) => {
      if(!DOMICILIOS[leg]) DOMICILIOS[leg] = {};
      if(d.dom)    DOMICILIOS[leg].dom    = d.dom;
      if(d.ciudad) DOMICILIOS[leg].ciudad = d.ciudad;
    });
  } catch(e) { console.error('Error cargando overrides de domicilio:', e); }
  // Renderizar logos en navbar
  const navLogos = document.getElementById('nav-logos');
  if(navLogos){
    navLogos.innerHTML = Object.entries(LOGOS).map(([, imgTag])=>
      `<div style="height:32px;display:flex;align-items:center">
        ${imgTag.replace(/style="[^"]*"/, 'style="max-height:32px;max-width:90px;object-fit:contain"')}
      </div>`
    ).join('');
  }
  // Renderizar logos en pantalla de inicio
  const logosDiv = document.getElementById('login-logos');
  if(logosDiv){
    logosDiv.innerHTML = Object.entries(LOGOS).map(([empresa, imgTag])=>`
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="height:52px;display:flex;align-items:center;justify-content:center">
          ${imgTag.replace(/style="[^"]*"/, 'style="max-height:52px;max-width:130px;object-fit:contain;filter:brightness(1.05)"')}
        </div>
      </div>`).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // DEEP-LINKING vía URL hash (para sitemap y prototipos)
  // Formato: #leg=000003&sec=hys  o  #leg=000003&sec=rrhh&sub=hys
  // Hace login automático con el empleado y navega a la sección.
  // ═══════════════════════════════════════════════════════════════
  setTimeout(()=>{
    if(!window.location.hash) return;
    try {
      const params = {};
      window.location.hash.replace(/^#/,'').split('&').forEach(p => {
        const [k, v] = p.split('=');
        if(k) params[k.trim()] = decodeURIComponent(v||'');
      });
      const legParam = params.leg || params.emp;
      const sec = params.sec || params.section || null;
      const sub = params.sub || null;

      if(legParam){
        const emp = empByLeg(legParam);
        if(emp){
          doLogin(emp);
          if(sec){
            setTimeout(()=>{
              try {
                if(sec === 'rrhh' || sec === 'rrhhpanel'){
                  nav('rrhhpanel');
                  if(sub) setTimeout(()=>navRRHH(sub), 150);
                } else {
                  nav(sec);
                }
              } catch(e){ console.error('Deep-link nav error:', e); }
            }, 250);
          }
        }
      }
    } catch(e){ console.error('Deep-link error:', e); }
  }, 350);
};

// ─── LOGOS POR EMPRESA ───
// ─── SESSION ───
let currentUser = null; // {emp, role: 'employee'|'manager'|'rrhh'}

// ═══ ABM Empresas · Cache global (declarado temprano para evitar TDZ) ═══
// Este cache es consultado desde getLogoSrc, getEmpresaDatos y getEmpresaFirma
// durante la generación de recibos. Se puebla en el login vía _refreshEmpresasABMCache.
var _empresasABMCache = []; // var intencional: compartido entre módulos 01 y 20

function getPasswords(){ try{ return JSON.parse(localStorage.getItem('lsg_passwords')||'{}'); }catch(e){return{};} }
function savePassword(dni, pwd){ const p=getPasswords(); p[dni]=pwd; localStorage.setItem('lsg_passwords', JSON.stringify(p)); }

let loginEmp = null; // employee found in step 1

// ── Handler global: captura cualquier promesa rechazada sin catch ──────────
// Evita que errores async silenciosos congelen la UI sin feedback al usuario.
window.addEventListener('unhandledrejection', event => {
  console.error('[Portal RR.HH.] Promesa no manejada:', event.reason);
  if(typeof toast === 'function'){
    toast('⚠ Ocurrió un error inesperado. Si la pantalla no responde, recargá con Ctrl+Shift+R.', 'var(--red)');
  }
  event.preventDefault();
});

