// ═══════════════════════════════════════════════════════════════════════
// ═══   AUTENTICACIÓN — Login / logout / sesión activa                 ═══
// ═══   Módulo 02 — carga después de 01-state-storage                  ═══
// ═══════════════════════════════════════════════════════════════════════

// Escapa caracteres HTML para evitar inyección en innerHTML (XSS).
const _escAuth = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function loginStep1(){
  const dni = document.getElementById('ls-dni').value.trim();
  const errEl = document.getElementById('ls-err-1');
  if(!dni){
    if(errEl){ errEl.textContent = '⚠ Ingresá tu DNI'; errEl.style.display = 'block'; }
    return;
  }
  if(dni.length < 6){
    if(errEl){ errEl.textContent = '⚠ DNI inválido (muy corto)'; errEl.style.display = 'block'; }
    return;
  }
  // Buscar en nómina completa (DB + altas ABM)
  const found = getNomina().find(e => e.dni === dni);
  if(!found){
    if(errEl){ errEl.textContent = '⚠ DNI no encontrado en la nómina. Consultá con RR.HH.'; errEl.style.display = 'block'; }
    return;
  }
  // Verificar si está dado de baja
  if(found._deBaja || found.egreso){
    if(errEl){ errEl.textContent = '⚠ Este legajo figura como baja. Consultá con RR.HH.'; errEl.style.display = 'block'; }
    return;
  }
  loginEmp = found;
  if(errEl) errEl.style.display = 'none';
  const pwds = getPasswords();
  if(pwds[dni]){
    // Returning user
    document.getElementById('ls-empname').innerHTML = `<strong>${_escAuth(found.nom)}</strong><br><span style="font-size:11px;color:var(--t3)">${_escAuth(found.leg)} · ${_escAuth(found.emp)}</span>`;
    showLoginStep('ls-step2');
    setTimeout(()=>document.getElementById('ls-pwd').focus(),100);
  } else {
    // First time
    document.getElementById('ls-empname2').textContent = `${found.nom} · ${found.leg} · ${found.emp}`;
    showLoginStep('ls-step3');
    setTimeout(()=>document.getElementById('ls-newpwd').focus(),100);
  }
}

function loginStep2(){
  const dni = loginEmp.dni;
  const pwd = document.getElementById('ls-pwd').value;
  const errEl = document.getElementById('ls-err-2');
  if(!pwd){
    if(errEl){ errEl.textContent = '⚠ Ingresá tu contraseña'; errEl.style.display = 'block'; }
    return;
  }
  const stored = getPasswords()[dni];
  if(pwd !== stored){
    document.getElementById('ls-pwd').value='';
    if(errEl){ errEl.textContent = '⚠ Contraseña incorrecta'; errEl.style.display = 'block'; }
    // ── Auditoría: login fallido ──
    if(typeof auditAuth === 'function'){
      auditAuth('login_fail', loginEmp, { detail: 'Contraseña incorrecta' });
    }
    return;
  }
  if(errEl) errEl.style.display = 'none';
  doLogin(loginEmp);
}

function loginStep3(){
  const pwd = document.getElementById('ls-newpwd').value;
  const confirmPwd = document.getElementById('ls-confirmpwd').value;
  const errEl = document.getElementById('ls-err-3');
  if(pwd.length < 6){
    if(errEl){ errEl.textContent = '⚠ La contraseña debe tener al menos 6 caracteres'; errEl.style.display = 'block'; }
    return;
  }
  if(pwd !== confirmPwd){
    if(errEl){ errEl.textContent = '⚠ Las contraseñas no coinciden'; errEl.style.display = 'block'; }
    return;
  }
  // Si estamos en cambio forzado, no permitir mantener el DNI como contraseña
  const stored = getPasswords()[loginEmp.dni];
  const eraForzado = (typeof isPwdChangeForced === 'function' && isPwdChangeForced(loginEmp.dni));
  if(eraForzado && pwd === loginEmp.dni){
    if(errEl){ errEl.textContent = '⚠ La nueva contraseña no puede ser igual al DNI'; errEl.style.display = 'block'; }
    return;
  }
  if(errEl) errEl.style.display = 'none';
  savePassword(loginEmp.dni, pwd);
  // Limpiar marca de cambio forzado si existía
  if(typeof clearForcedPwdChange === 'function') clearForcedPwdChange(loginEmp.dni);
  // ── Auditoría: cambio / set inicial de contraseña ──
  if(typeof auditAuth === 'function'){
    if(eraForzado)        auditAuth('cambio_pwd_forzado', loginEmp);
    else if(stored)       auditAuth('cambio_pwd', loginEmp);
    else                  auditAuth('pwd_set_inicial', loginEmp);
  }
  doLogin(loginEmp);
}

function showLoginStep(id){
  document.querySelectorAll('.login-step').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function backToStep1(){
  loginEmp = null;
  document.getElementById('ls-dni').value = '';
  document.getElementById('ls-pwd').value = '';
  document.getElementById('ls-newpwd').value = '';
  document.getElementById('ls-confirmpwd').value = '';
  showLoginStep('ls-step1');
  setTimeout(()=>document.getElementById('ls-dni').focus(),100);
}

function doLogin(emp){
  // ── Verificar si el usuario está desactivado por el admin ──
  if(typeof isUserDisabled === 'function' && isUserDisabled(emp.dni)){
    const errEl = document.getElementById('ls-err-2') || document.getElementById('ls-err-1');
    if(errEl){ errEl.textContent = '⚠ Usuario desactivado. Contactá al administrador.'; errEl.style.display = 'block'; }
    return;
  }

  // ── Verificar cambio de contraseña forzado (post-blanqueo) ──
  // Si la password actual es igual al DNI Y está marcado para cambio forzado,
  // saltamos al step3 (cambio obligatorio) en lugar de hacer login completo.
  if(typeof isPwdChangeForced === 'function' && isPwdChangeForced(emp.dni)){
    const stored = getPasswords()[emp.dni];
    if(stored === emp.dni){
      // Ya validó la pwd (es el DNI). Pedir cambio antes de entrar.
      loginEmp = emp;
      const lblEl = document.getElementById('ls-empname2');
      if(lblEl) lblEl.textContent = `${emp.nom} · ${emp.leg} · ${emp.emp}`;
      // Mostrar mensaje en step3 indicando que es obligatorio
      const step3 = document.getElementById('ls-step3');
      if(step3){
        let banner = step3.querySelector('.forced-pwd-banner');
        if(!banner){
          banner = document.createElement('div');
          banner.className = 'forced-pwd-banner';
          banner.style.cssText = 'background:rgba(234,179,8,.1);border:1px solid var(--yellow);color:var(--yellow);padding:10px 12px;border-radius:var(--r);font-size:12px;margin-bottom:14px;line-height:1.5';
          banner.innerHTML = '🔑 <strong>Contraseña blanqueada.</strong> Por seguridad, definí una nueva contraseña antes de continuar.';
          step3.insertBefore(banner, step3.firstChild);
        }
      }
      showLoginStep('ls-step3');
      setTimeout(()=>document.getElementById('ls-newpwd').focus(),100);
      return;
    }
  }

  // ── Resolver el nivel del usuario (sistema de 4 niveles) ──
  let level = (typeof getUserLevel === 'function') ? getUserLevel(emp) : 'generico';
  let role  = (typeof levelToLegacyRole === 'function') ? levelToLegacyRole(level) : 'employee';

  // ── Verificar delegación vigente — sigue concediendo acceso temporal a RR.HH. ──
  const delegacion = getDelegacion();
  const hoy = new Date().toISOString().split('T')[0];
  const hasDelegation = delegacion &&
    delegacion.delegadoDni === emp.dni &&
    (!delegacion.inicio || hoy >= delegacion.inicio) &&
    (!delegacion.fin    || hoy <= delegacion.fin);

  // Si el nivel actual es Genérico/Gerente pero hay delegación, sube a RR.HH. (temporal).
  // No pisamos Admin (tiene más permisos).
  if(hasDelegation && level !== 'admin' && level !== 'rrhh'){
    level = 'rrhh';
    role  = 'rrhh';
  }

  currentUser = {emp, role, level};
  document.getElementById('login-screen').style.display = 'none';
  // Update nav chip
  const initials = emp.nom.split(',')[0].trim().substring(0,2);
  const navAv = document.getElementById('nav-avatar');
  if(navAv){
    // Si el empleado tiene foto de perfil, mostrarla; si no, iniciales
    const foto = emp.foto || '';
    if(foto){
      navAv.innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`;
      navAv.textContent = '';
    } else {
      navAv.innerHTML = '';
      navAv.textContent = initials;
    }
  }
  document.getElementById('nav-username').textContent = emp.nom.split(',')[0].trim();
  document.getElementById('nav-user-chip').style.display = 'flex';
  const badge = document.getElementById('nav-role-badge');
  badge.style.display = 'inline-block';

  // Estilizar badge según nivel (4 niveles)
  if(typeof _refreshNavBadge === 'function'){
    _refreshNavBadge();
  } else {
    // Fallback al estilo legacy
    badge.textContent = role==='rrhh'?'RR.HH.':role==='manager'?'GERENTE':'EMPLEADO';
    badge.style.background = role==='rrhh'?'rgba(34,197,94,.1)':role==='manager'?'var(--accent-glow)':'rgba(92,104,128,.1)';
    badge.style.borderColor = role==='rrhh'?'var(--green)':role==='manager'?'var(--accent)':'var(--border)';
    badge.style.color = role==='rrhh'?'var(--green)':role==='manager'?'var(--accent2)':'var(--t3)';
  }
  // Build nav
  loadSolicitudes();
  buildNav();
  // Apply employee-mode body class
  if(role === 'employee') document.body.classList.add('employee-mode');
  else document.body.classList.remove('employee-mode');
  // Go to default section
  if(role === 'rrhh') nav('rrhhpanel');
  else nav('home');
  // Welcome message
  const firstName = emp.nom.split(',')[1]?.trim().split(' ')[0] || emp.nom.split(',')[0].trim();
  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  showWelcome(`${saludo}, ${firstName} 👋`);

  // Precalentar cache de empresas ABM para lookup síncrono en recibos
  (async()=>{ try { await _refreshEmpresasABMCache(); } catch(e){ console.warn('No se pudo cargar cache empresas ABM:', e); } })();

  // ── Auditoría: login exitoso ──
  if(typeof auditAuth === 'function'){
    auditAuth('login_ok', emp, { detail: hasDelegation ? `Acceso temporal por delegación (${level})` : `Nivel: ${level}` });
  }
}

async function doLogout(){
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`'¿Cerrar sesión?'`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  // ── Auditoría: logout (registramos antes de limpiar currentUser) ──
  if(typeof auditAuth === 'function' && currentUser?.emp){
    auditAuth('logout', currentUser.emp);
  }
  currentUser = null; loginEmp = null;
  solicitudes = [];
  // Reset auto-expansión del organigrama para el próximo usuario
  if(typeof _orgUsuarioYaAutoExpandido !== 'undefined'){
    _orgUsuarioYaAutoExpandido = false;
    if(typeof _orgExpandido !== 'undefined') _orgExpandido = new Set();
  }
  document.body.classList.remove('employee-mode');
  document.getElementById('nav-user-chip').style.display = 'none';
  document.getElementById('nav-role-badge').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  backToStep1();
  updateCounts();
}

