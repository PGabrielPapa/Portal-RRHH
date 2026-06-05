// ─── ORGANIGRAMA: MAPA DE VALIDADORES ───
function getValidador(emp){
  const nom = emp.nom.toUpperCase().trim();
  const lugar = (emp.lugar||'').toUpperCase();

  // ═══════════════════════════════════════════════════════════════════
  // OVERRIDE MANUAL — Si el empleado tiene validador cargado explícitamente
  // desde el ABM, ese tiene prioridad sobre las reglas automáticas.
  // ═══════════════════════════════════════════════════════════════════
  if(emp.validador && emp.validador.trim()){
    return {
      validador: emp.validador.toUpperCase().trim(),
      area:      (emp.areaOrg || emp.area || 'General').trim(),
      goToHR:    emp.validadorGoToHR !== undefined ? emp.validadorGoToHR : true,
      autoApproved: !!emp.validadorAutoApproved,
      _override: true
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CEO — PARERA, MARTIN (top del árbol, sus requests autoaprueban)
  // Dirige las 5 empresas del grupo
  // ═══════════════════════════════════════════════════════════════════
  if(nom.includes('PARERA, MARTIN'))
    return {validador:'PARERA, MARTIN', area:'CEO — LEITEN · LEITEN SALTA · IDEE · SINIS · BARTON REBAR', goToHR:true, autoApproved:true};

  // ═══════════════════════════════════════════════════════════════════
  // C-LEVEL — Reportan directo al CEO (Parera Martin)
  // ═══════════════════════════════════════════════════════════════════
  if(nom.includes('PAPA, PABLO GABRIEL'))
    return {validador:'PARERA, MARTIN', area:'Legales y RR.HH.', goToHR:true, autoApproved:true};
  if(nom.includes('GARRIDO, JUAN MANUEL'))
    return {validador:'PARERA, MARTIN', area:'Gerencia Comercial General', goToHR:true};
  if(nom.includes('PARERA, PABLO ANDRES'))
    return {validador:'PARERA, MARTIN', area:'Operaciones / Servicio Técnico', goToHR:true};
  if(nom.includes('KEOGAN'))
    return {validador:'PARERA, MARTIN', area:'Desarrollo / Barton Rebar', goToHR:true};
  if(nom.includes('YAKUS'))
    return {validador:'PARERA, MARTIN', area:'Producto y Marketing', goToHR:true};
  if(nom.includes('BOTTAZZI'))
    return {validador:'PARERA, MARTIN', area:'Administración LEITEN', goToHR:true};
  if(nom.includes('FERNANDEZ, RODOLFO'))
    return {validador:'PARERA, MARTIN', area:'Administración SINIS', goToHR:true};
  // Rodriguez Adrian Roberto → Gerente Zonal LEITEN SALTA
  if(nom.includes('RODRIGUEZ, ADRIAN'))
    return {validador:'PARERA, MARTIN', area:'Gerencia Zonal LEITEN SALTA', goToHR:true};

  // ═══════════════════════════════════════════════════════════════════
  // GERENTES COMERCIAL / REGIONAL  →  bajo Garrido (Gte. Comercial General)
  // Guillen (LEITEN), Carrera (SINIS), Basso (regional Centro/Cuyo),
  // Nicolosi (regional Litoral/NOA).  Van ANTES que el catch-all de GER
  // para no caer en "RR.HH." por su categoría.
  // ═══════════════════════════════════════════════════════════════════
  if(nom.includes('GUILLEN'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Comercial LEITEN — Gerencia Buenos Aires', goToHR:false};
  if(nom.includes('CARRERA'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Comercial SINIS', goToHR:false};
  if(nom.includes('BASSO'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Gerencia Regional (Córdoba/Neuquén/Mendoza)', goToHR:false};
  if(nom.includes('NICOLOSI'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Gerencia Regional (Santa Fe/Corrientes/Rosario/Salta)', goToHR:false};

  // ── GERENTES (cat GER) → van directo a RR.HH. ────────────────────
  if(emp.cat === 'GER')
    return {validador:'RR.HH.', area:'Gerencia', goToHR:true};

  // ═══════════════════════════════════════════════════════════════════
  // LEITEN SALTA (bajo Rodriguez Adrian — por empresa o sucursal)
  // Todos los empleados cuya empresa sea LEITEN SALTA o cuyo lugar sea
  // la SUCURSAL SALTA quedan bajo su gerencia zonal.
  // ═══════════════════════════════════════════════════════════════════
  {
    const empCo = (emp.emp||'').toUpperCase();
    if(empCo.includes('LEITEN SALTA') || lugar.includes('SUCURSAL SALTA'))
      return {validador:'RODRIGUEZ, ADRIAN ROBERTO', area:'LEITEN SALTA', goToHR:false};
  }

  // ═══════════════════════════════════════════════════════════════════
  // LEGALES / RECURSOS HUMANOS  (bajo Papa, Pablo Gabriel)
  // Dotación: BOZZUTO MINNA, AGUIAR LUNA, DONATO DELFINA, PAPA LUCIANO
  //           GONZALEZ WALTER MANUEL, OLIVERA WALTER ADRIAN (seg.e hig/maestranza)
  //           BIZZOTTO JULIETA VERONICA
  // ═══════════════════════════════════════════════════════════════════
  const legalesRRHH = [
    'BOZZUTO','AGUIAR, LUNA','DONATO','PAPA, LUCIANO',
    'GONZALEZ, WALTER','OLIVERA, WALTER','BIZZOTTO'
  ];
  if(legalesRRHH.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'PAPA, PABLO GABRIEL', area:'Legales y RR.HH.', goToHR:true};

  // ═══════════════════════════════════════════════════════════════════
  // COMEX  (bajo Parera Martin → directo RR.HH.)
  // Dotación: HEINZE NICOLAS FEDERICO
  // ═══════════════════════════════════════════════════════════════════
  if(nom.includes('HEINZE'))
    return {validador:'PARERA, MARTIN', area:'COMEX', goToHR:true};

  // ═══════════════════════════════════════════════════════════════════
  // COMERCIAL
  // Garrido (Gerente Comercial General) → Guillen (LEITEN), Carrera (SINIS),
  //                                       Nicolosi y Basso (Regionales)
  // ═══════════════════════════════════════════════════════════════════
  // Ventas LEITEN (bajo Guillen — Gerencia Buenos Aires) — incluye Martinez Tortelli
  const comercialLeiten = [
    'BERTOSSI','TORRES MAGNE','QUINTANA, WALTER','DIAZ, JENNIFER',
    'TORTELLI'
  ];
  if(comercialLeiten.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'GUILLEN, HERNAN NICOLAS', area:'Comercial LEITEN — Gerencia Buenos Aires', goToHR:false};

  // Ventas SINIS (bajo Carrera)
  const comercialSinis = [
    'PUJOL','GALVAN , MARCOS',
    'VILLANUEVA SILVEIRA','SOTELO','ALBINES GUEVARA','GERVASIO'
  ];
  if(comercialSinis.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'CARRERA, IVO GABRIEL', area:'Comercial SINIS', goToHR:false};

  // Guillen y Carrera (gerentes Comercial) → bajo Garrido
  if(nom.includes('GUILLEN'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Comercial LEITEN', goToHR:false};
  if(nom.includes('CARRERA'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Comercial SINIS', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // ADMINISTRACIÓN
  // Bottazzi → equipo LEITEN
  // Fernandez Rodolfo → equipo SINIS
  // ═══════════════════════════════════════════════════════════════════
  // Admin LEITEN (bajo Bottazzi)
  const adminLeiten = [
    'VATRANO','FIUZA','GIMENEZ, MARINA','ZEBALLOS',
    'ALONSO','DARRUSPE','LONGO, MORENA'
  ];
  if(adminLeiten.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'BOTTAZZI, ROBERTO OMAR', area:'Administración LEITEN', goToHR:false};

  // Admin SINIS (bajo Fernandez Rodolfo)
  const adminSinis = [
    'NICODEMO','VITKAUSKAS','LEIMETER','MARTINEZ, LOURDES',
    'FERNANDEZ CALVO','GALLARDO, NORA','JEREZ'
  ];
  if(adminSinis.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'FERNANDEZ, RODOLFO EMILIO', area:'Administración SINIS', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // PRODUCTO Y MARKETING  (bajo Yakus Marcelo)
  // Dotación: DIEGUEZ, MOYANO LUCIANO, OLIVERA WALTER, GARCIA AROS
  // ═══════════════════════════════════════════════════════════════════
  const productoMkt = ['DIEGUEZ','MOYANO , LUCIANO','GARCIA AROS'];
  if(productoMkt.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'YAKUS, MARCELO ROBERTO', area:'Producto y Marketing', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // SERVICIO TÉCNICO  (bajo Parera Pablo Andres → supervisor Morini)
  // ═══════════════════════════════════════════════════════════════════
  const servTecnico = [
    'OLIVERA, MATIAS','YDOY','MUSLADINI','PINOTTI',
    'AGUIAR , AGUSTIN','PEREZ, CIRO','VELIZ',
    'OLIVERA, GUSTAVO','VARELA , AXEL','FERREIRA , VALENTINO','ABIBE'
  ];
  if(servTecnico.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'PARERA, PABLO ANDRES', area:'Servicio Técnico', goToHR:false};

  if(nom.includes('MORINI'))
    return {validador:'PARERA, PABLO ANDRES', area:'Servicio Técnico', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // PROGRAMACIÓN  (bajo Parera Pablo Andres)
  // ═══════════════════════════════════════════════════════════════════
  if(nom.includes('RAPAPORT') || nom.includes('POLETTO'))
    return {validador:'PARERA, PABLO ANDRES', area:'Programación', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // OPERACIONES  (bajo Parera Pablo Andres)
  // ═══════════════════════════════════════════════════════════════════
  const operaciones = [
    'DI FLORIO','DIAZ OLIVIERI','MIRANDA','HERRERA, YESICA','RODRIGUEZ FERREYRA',
    'CORDERO ROA','PEREYRA','PAEZ, FACUNDO','CESARIO','AGUIAR, YANINA',
    'RAMOS GENEROSO',
    'MENDIETA','BARREDA','MEZA, ALBERTO','RODRIGUEZ, GUSTAVO',
    'MARTINEZ , JUAN','DE LA ROSA','PAEZ, FRANCO','GENTILE',
    'QUIROZ','FARIÑA','OSORES','SPRING'
  ];
  if(operaciones.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'PARERA, PABLO ANDRES', area:'Operaciones', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // DESARROLLO  (bajo Keogan Patricio)
  // Dotación: LOSTES, GIGENA, ZABALA CRUZ, FROLA
  // ═══════════════════════════════════════════════════════════════════
  const desarrollo = ['LOSTES','GIGENA','ZABALA CRUZ','FROLA'];
  if(desarrollo.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'KEOGAN, PATRICIO MATIAS', area:'Desarrollo', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // BARTON REBAR  (bajo Keogan Patricio)
  // Dotación: ARCE, MEZA ALINCASTRO, NUÑEZ DANTE, PALOMEQUE, RODRIGUEZ FERNANDO, TORMAKH
  // ═══════════════════════════════════════════════════════════════════
  const barton = ['MEZA ALINCASTRO','NUÑEZ, DANTE','PALOMEQUE','RODRIGUEZ, FERNANDO','TORMAKH','ARCE'];
  if(barton.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'KEOGAN, PATRICIO MATIAS', area:'Barton Rebar', goToHR:false};

  // ═══════════════════════════════════════════════════════════════════
  // GERENCIA REGIONAL  (bajo Garrido — Gerente Comercial General)
  // Basso (Córdoba, Neuquén, Mendoza)
  // Nicolosi (Santa Fe, Corrientes, Rosario, Salta)
  // ═══════════════════════════════════════════════════════════════════
  const regionBasso = [
    'YAÑEZ','MORALES','LOBOS','ARGUELLO','ALVAREZ, LUCIANA',
    'SOSA BASTIAS','SCHMIDT','ARANEGA','CARMONA SALINAS',
    'JALIL','AZARIO','BUSTOS'
  ];
  if(regionBasso.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'BASSO, ARIEL MARIANO', area:'Gerencia Regional (Córdoba/Neuquén/Mendoza)', goToHR:false};

  const regionNicolosi = [
    'ABADIA','RUATTA','CORIA','GUANCA','GOMEZ, GUSTAVO',
    'FERNANDEZ, OSVALDO','SOSA , FABIAN','PARRA',
    'GALLARDO, GONZALO','AQUINO','SOTOMAYOR','GAGLIARDI',
    'FARIAS , MARTIN','SANCHEZ, ANDRES','AYALA','GONZALEZ , DEBORA',
    'CHANAMPA','SANCHEZ, ALICIA','SBROCCO','OLIVER OBED',
    'RONDOLETTO','MALGIOGLIO'
  ];
  if(regionNicolosi.some(s=>nom.includes(s.toUpperCase())))
    return {validador:'NICOLOSI, ADRIAN PABLO', area:'Gerencia Regional (Santa Fe/Corrientes/Rosario/Salta)', goToHR:false};

  // Basso y Nicolosi (Gerentes Regionales) → bajo Garrido
  if(nom.includes('BASSO'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Gerencia Regional (Córdoba/Neuquén/Mendoza)', goToHR:false};
  if(nom.includes('NICOLOSI'))
    return {validador:'GARRIDO, JUAN MANUEL', area:'Gerencia Regional (Santa Fe/Corrientes/Rosario/Salta)', goToHR:false};

  // Fallback por lugar (Salta queda cubierto arriba por regla específica)
  if(['CORDOBA','NEUQUEN','MENDOZA'].some(l=>lugar.includes(l)))
    return {validador:'BASSO, ARIEL MARIANO', area:'Gerencia Regional', goToHR:false};
  if(['SANTA FE','CORRIENTES','ROSARIO'].some(l=>lugar.includes(l)))
    return {validador:'NICOLOSI, ADRIAN PABLO', area:'Gerencia Regional', goToHR:false};

  // Fallback final
  return {validador:'RR.HH.', area:'General', goToHR:true};
}

// ─── STEPS ───
function goStep(n){
  // Only steps 3 (form) and 4 (confirmation) exist now
  // Map old step numbers: treat 1,2,3 → show form; 4 → show confirmation
  const showForm = (n <= 3);
  document.getElementById('step3').style.display = showForm ? 'block' : 'none';
  document.getElementById('step4').style.display = showForm ? 'none' : 'block';
  // Update step indicators
  const st3 = document.getElementById('st3');
  const sl3 = document.getElementById('sl3');
  const st4 = document.getElementById('st4');
  const sl4 = document.getElementById('sl4');
  const line3 = document.getElementById('line3');
  if(showForm){
    st3.className='step-circle active'; st3.textContent='1'; sl3.className='step-label active';
    st4.className='step-circle'; st4.textContent='2'; sl4.className='step-label';
    if(line3) line3.className='step-line';
  } else {
    st3.className='step-circle done'; st3.textContent='✓'; sl3.className='step-label';
    st4.className='step-circle active'; st4.textContent='2'; sl4.className='step-label active';
    if(line3) line3.className='step-line done';
  }
}
// ─── STEP 1: EMPRESAS ───
function renderEmpresas(){
  const counts={};
  getNomina().forEach(e=>{ counts[e.emp]=(counts[e.emp]||0)+1; });
  const grid=document.getElementById('empresa-grid');
  grid.innerHTML=Object.entries(counts).map(([emp,cnt])=>`
    <div class="empresa-card" data-emp="${emp}" onclick="selectEmpresa('${emp.replace(/'/g,"\\'")}')">
      <div style="height:54px;display:flex;align-items:center;margin-bottom:10px">
        ${LOGOS[emp] || `<span class="empresa-name">${emp}</span>`}
      </div>
      <div class="empresa-count">${cnt} empleados</div>
    </div>`).join('');
}

function selectEmpresa(emp){
  empresaActual=emp;
  document.querySelectorAll('.empresa-card').forEach(c=>{
    c.classList.toggle('selected', c.dataset.emp===emp);
  });
  empFiltrados = getNomina().filter(e=>e.emp===emp);
  renderTabla(empFiltrados);
  document.getElementById('busqueda').value='';
  goStep(2);
}

// ─── STEP 2: TABLA ───
function fmt(n){ return '$ '+n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

function renderTabla(lista){
  const tbody=document.getElementById('emp-table');
  if(!lista.length){
    tbody.innerHTML='<tr><td colspan="6" class="empty"><div class="empty-text">Sin resultados</div></td></tr>';
    return;
  }
  tbody.innerHTML=lista.map(e=>`
    <tr onclick="selectEmp('${e.leg}','${e.emp.replace(/'/g,"\'")}')">
      <td class="td-mono">${e.leg}</td>
      <td class="td-name">${e.nom}</td>
      <td><span class="cat-badge">${e.cat||'-'}</span></td>
      <td style="color:var(--t2);font-size:12px">${e.lugar}</td>
      <td class="td-mono">${fmt(e.neto)}</td>
      <td class="td-mono" style="color:var(--green)">${fmt(e.lim)}</td>
    </tr>`).join('');
}

function filtrarEmpleados(){
  const q=document.getElementById('busqueda').value.toLowerCase();
  const lista=q?empFiltrados.filter(e=>e.nom.toLowerCase().includes(q)||e.leg.includes(q)):empFiltrados;
  renderTabla(lista);
}

// ─── CARGAR DATOS DEL EMPLEADO LOGUEADO ───
function selectEmp(){
  if(!currentUser) return;
  empActual = currentUser.emp;

  // Check blocked months
  const mes = new Date().getMonth()+1;
  const blocked = [6,7,12,1];
  const mNames = {6:'Junio',7:'Julio',12:'Diciembre',1:'Enero'};
  const alertBox = document.getElementById('alert-block');
  if(blocked.includes(mes)){
    alertBox.innerHTML=`<div class="alert alert-err">⛔ Mes bloqueado: No se otorgan adelantos en ${mNames[mes]}. (Jun, Jul, Dic, Ene)</div>`;
    alertBox.style.display='block';
  } else {
    alertBox.style.display='none';
  }

  // Personal banner — same for all roles
  const initials = empActual.nom.split(',')[0].trim().substring(0,2);
  document.getElementById('epb-avatar').textContent = initials;
  document.getElementById('epb-name').textContent = empActual.nom;
  document.getElementById('epb-meta').textContent = `Legajo ${empActual.leg} · ${empActual.emp} · Ingreso: ${empActual.ing}`;
  document.getElementById('epb-stats').innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Sueldo Neto (80%)</div>
      <div style="font-size:14px;font-weight:600;font-family:var(--font-mono);color:var(--accent2)">${fmt(empActual.neto)}</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Límite adelanto (50%)</div>
      <div style="font-size:14px;font-weight:600;font-family:var(--font-mono);color:var(--green)">${fmt(empActual.lim)}</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Lugar de trabajo</div>
      <div style="font-size:12px;font-weight:500;color:var(--t1)">${empActual.lugar}</div>
    </div>`;

  document.getElementById('f-monto').value='';
  document.getElementById('limit-fill').style.width='0%';
  document.getElementById('limit-show').textContent=fmt(empActual.lim);
  document.getElementById('pct-show').textContent='0%';
  excessEnabled=false;
  document.getElementById('f-motivo').value='';
  document.getElementById('f-obs').value='';

  const vInfo = getValidador(empActual);

  if(vInfo.autoApproved){
    document.getElementById('btn-enviar').textContent = 'Registrar y Aprobar →';
    alertBox.innerHTML = `<div class="alert alert-ok">★ <strong>PAPA, PABLO GABRIEL</strong> es Gerente de RR.HH. — la solicitud se aprobará automáticamente.</div>`;
    alertBox.style.display = 'block';
  } else if(vInfo.goToHR){
    document.getElementById('btn-enviar').textContent = 'Enviar a RR.HH. →';
    alertBox.innerHTML = `<div class="alert alert-info">★ Categoría <strong>${empActual.cat}</strong> / Área <strong>${vInfo.area}</strong> — solicitud va directo a RR.HH. sin validación de gerente de área.</div>`;
    alertBox.style.display = 'block';
  } else {
    document.getElementById('btn-enviar').textContent = 'Enviar solicitud →';
    alertBox.innerHTML = `<div class="alert alert-info" style="background:rgba(61,127,255,.06)">📋 Gerente validador: <strong>${vInfo.validador}</strong> <span style="color:var(--t3)">(${vInfo.area})</span></div>`;
    alertBox.style.display = 'block';
  }

  goStep(3);
}

function actualizarBarra(){
  if(!empActual) return;
  const monto=parseFloat(document.getElementById('f-monto')?.value || '0')||0;
  const pct=(monto/empActual.lim)*100;
  const fill=document.getElementById('limit-fill');
  fill.style.width=Math.min(pct,100)+'%';
  fill.className='limit-fill'+(pct>100?' over':pct>80?' warn':'');
  document.getElementById('pct-show').textContent=Math.round(pct)+'%';
  // Si supera el límite, detectar automáticamente (sin mostrar al empleado)
  excessEnabled = pct > 100;
}

function toggleExceso(){ /* ya no se usa desde el formulario */ }

// ─── ENVIAR ───
function enviarSolicitud(){
  const monto=parseFloat(document.getElementById('f-monto')?.value || '0');
  const motivo=document.getElementById('f-motivo').value.trim();
  if(!monto||monto<=0){ toast('⚠ Ingresá un monto válido','var(--yellow)'); return; }
  if(!motivo){
    toast('⚠ El motivo es obligatorio para solicitar un adelanto', 'var(--yellow)');
    const el = document.getElementById('f-motivo');
    if(el){ el.style.borderColor='rgba(239,68,68,.7)'; el.focus(); }
    return;
  }
  // Limpiar el borde rojo si el motivo fue completado
  const mEl = document.getElementById('f-motivo');
  if(mEl) mEl.style.borderColor = 'var(--border)';

  const vInfo = getValidador(empActual);

  let status;
  if(vInfo.autoApproved) status = 'approved';      // PAPA como empleado → auto-aprobado
  else                    status = 'pending_manager'; // Todos los demás pasan por el gerente primero

  const sol={
    id: 'SOL-'+Date.now(),
    emp: {...empActual},
    monto,
    motivo,
    obs: document.getElementById('f-obs').value,
    exceso: excessEnabled,   // se guarda para que RR.HH. lo sepa
    cuotas: null,            // RR.HH. define esto al aprobar
    plazo: null,             // RR.HH. define esto al aprobar
    fecha: document.getElementById('f-fecha').value,
    status,
    validador: vInfo.validador,
    validadorArea: vInfo.area,
    created: new Date().toLocaleString('es-AR')
  };
  
  solicitudes.push(sol);
  saveSolicitudes();
  updateCounts();

  // ── Auditoría: solicitud de anticipo creada ──
  if(typeof auditAnticipo === 'function'){
    auditAnticipo('solicitud_creada', sol.emp, {
      id: sol.id,
      detail: `Monto: $${monto.toLocaleString('es-AR')} · Motivo: ${motivo}${vInfo.autoApproved?' · Auto-aprobada':''}`
    });
  }
  
  let nextStep, tagClass, tagLabel;
  if(vInfo.autoApproved){
    nextStep = 'La solicitud fue <strong>aprobada automáticamente</strong> — Pablo Gabriel Papa es Gerente de RR.HH.';
    tagClass = 'approved'; tagLabel = 'Aprobada';
  } else {
    nextStep = `La solicitud fue enviada a <strong>${vInfo.validador}</strong> para su validación. Una vez validada por el gerente pasará a RR.HH. para su aprobación final.`;
    tagClass = 'pending'; tagLabel = 'Pendiente Gerente';
  }

  document.getElementById('conf-resumen').innerHTML=`
    <div class="approval-row"><span class="key">ID</span><span class="val" style="font-family:var(--font-mono)">${sol.id}</span></div>
    <div class="approval-row"><span class="key">Empleado</span><span class="val">${sol.emp.nom}</span></div>
    <div class="approval-row"><span class="key">Empresa</span><span class="val">${sol.emp.emp}</span></div>
    <div class="approval-row"><span class="key">Monto</span><span class="val" style="color:var(--accent2)">${fmt(sol.monto)}</span></div>
    <div class="approval-row"><span class="key">Gerente validador</span><span class="val">${sol.validador} <span style="color:var(--t3);font-size:11px">(${sol.validadorArea})</span></span></div>
    <div class="approval-row"><span class="key">Estado</span><span class="val"><span class="sol-tag ${tagClass}">${tagLabel}</span></span></div>`;

  document.querySelector('#step4 .card > div:nth-child(3)').innerHTML = nextStep;
  
  goStep(4);
}

function nuevaSolicitud(){
  if(currentUser){
    selectEmp();
  }
}

// ─── GERENTE ───
function renderPendientes(){
  const gerNom = currentUser?.emp?.nom?.toUpperCase() || '';
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
  // PAPA ve todas; otros gerentes solo las de su área
  const pend = esPapa
    ? solicitudes.filter(s => s.status === 'pending_manager')
    : solicitudes.filter(s =>
        s.status === 'pending_manager' &&
        s.validador && s.validador.toUpperCase().includes(gerNom.split(',')[0].trim())
      );
  const div = document.getElementById('list-pend');
  if(!pend.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">No hay solicitudes pendientes para tu área</div></div>';
    return;
  }

  div.innerHTML = pend.map(s=>`
    <div class="sol-item" onclick="openApproval('${s.id}','manager')">
      <div class="sol-status pending"></div>
      <div class="sol-info">
        <div class="sol-name">${s.emp.nom}</div>
        <div class="sol-meta">${s.emp.leg} · ${s.emp.emp} · ${s.created}</div>
        <div class="sol-meta">Motivo: ${s.motivo}</div>
      </div>
      <div>
        <div class="sol-amount">${fmt(s.monto)}</div>
        <div style="text-align:right;margin-top:4px"><span class="sol-tag pending">Pendiente</span></div>
        ${s.exceso?'<div style="text-align:right;margin-top:3px"><span class="sol-tag manager">Exceso</span></div>':''}
      </div>
    </div>`).join('');
}

// ─── PANEL RR.HH. — NAVEGACIÓN POR SECCIONES ───
const RRHH_SUBS = ['solicitudes','recibos','ganancias','contraseñas','delegacion','exportar','licencias','domicilios','mensajes','repositorio','abm','empresas','lic-anuales','lic-especiales','liquidacion','simulacion','evaluaciones','escala','sindicatos','hys','familiares','sanciones','conceptos-custom','reportes','reporte-conceptos','importar-conceptos','cert-trabajo','lic-anual-gan'];

function navRRHH(sub){
  const _navRole = currentUser?.role; const _navLevel = (typeof getUserLevel === 'function') ? getUserLevel(currentUser?.emp?.dni) : currentUser?.level;
  if(_navRole !== 'rrhh' && _navLevel !== 'admin'){ mostrarAccesoNoAutorizado(); return; }
  document.getElementById('rrhh-home').style.display = sub ? 'none' : 'block';
  RRHH_SUBS.forEach(s=>{
    const el = document.getElementById(`rrhh-sub-${s}`);
    if(el) el.style.display = (s===sub) ? 'block' : 'none';
  });
  if(!sub) return;
  if(sub==='solicitudes'){ renderRRHH(); renderPendientesGerentes(); }
  if(sub==='recibos'){ renderReadLog(); if(typeof repRecReset==='function') repRecReset(); }
  if(sub==='contraseñas'){ renderPwdTable(); renderSolicitudesBlanqueo(); }
  if(sub==='delegacion'){ renderDelegacionSub(); }
  if(sub==='licencias'){ renderLicenciasAdmin(); rrhhLicTab('comp'); }
  if(sub==='lic-anuales'){ renderLicAnualRRHH(); }
  if(sub==='lic-especiales'){ renderLicEspecialRRHH(); }
  if(sub==='liquidacion'){ liqTab('periodos'); renderLiqPeriodos(); }
  if(sub==='lic-anual-gan'){ renderLiqAnualGan(); }
  if(sub==='simulacion'){ simTab('mensual'); }
  if(sub==='domicilios'){ renderCambiosDomicilio(); }
  if(sub==='mensajes'){ renderMensajesAdmin(); }
  if(sub==='repositorio'){ actualizarContadoresRepo(); }
  if(sub==='abm'){ renderAbmLista(); }
  if(sub==='empresas'){ renderAbmEmpresasLista(); }
  if(sub==='evaluaciones'){ renderEvaluacionesRRHH(); }
  if(sub==='escala'){ renderEscalaSalarial(); }
  if(sub==='sindicatos'){ renderSindicatosPanel(); }
  if(sub==='hys'){ renderHysPanel(); }
  if(sub==='familiares'){ renderFamiliaresPanel(); }
  if(sub==='sanciones'){ renderSancionesPanelRRHH(); }
  if(sub==='conceptos-custom'){ abrirPanelConceptosCustom(); }
  if(sub==='reportes'){ abrirGeneradorReportes(); }
  if(sub==='reporte-conceptos'){ renderReporteConceptos(); }
  if(sub==='importar-conceptos'){ renderImportadorConceptos(); }
  if(sub==='cert-trabajo'){ renderCertTrabajoPedidos(); _certActualizarBadge(); }
}

function renderDelegacionSub(){
  const cont = document.getElementById('rrhh-delegacion-content');
  if(!cont) return;

  const userNom = (currentUser?.emp?.nom || '').toUpperCase();
  const isOwner = userNom.includes('PAPA, PABLO GABRIEL') || userNom.includes('PAPA PABLO GABRIEL');
  const isRRHH = currentUser?.role === 'rrhh';
  const isCEO = userNom.includes('PARERA, MARTIN') || userNom.includes('PARERA MARTIN');
  // ¿Es gerente con equipo a cargo? (cualquier validador en el sistema)
  const tieneEquipo = (typeof _getEquipoDelGerente === 'function')
    ? _getEquipoDelGerente(false).length > 0
    : (currentUser?.emp?.cat === 'GER');
  const puedeDelegar = isOwner || isCEO || isRRHH || tieneEquipo;

  // Mi delegación EMITIDA (la que yo le di a otro)
  const miDeleg = (typeof getMiDelegacionEmitida === 'function') ? getMiDelegacionEmitida() : null;

  // Vigencia para mi delegación
  const hoy = new Date().toISOString().split('T')[0];
  const miDelegVigente = miDeleg &&
    (!miDeleg.inicio || hoy >= miDeleg.inicio) &&
    (!miDeleg.fin    || hoy <= miDeleg.fin);

  const miDelegHtml = miDeleg ? `
    <div style="padding:12px 14px;background:${miDelegVigente?'rgba(34,197,94,.06)':'rgba(234,179,8,.06)'};border:1px solid ${miDelegVigente?'rgba(34,197,94,.3)':'rgba(234,179,8,.25)'};border-radius:var(--r);font-size:12px;color:var(--t2);margin-bottom:14px">
      <div style="font-weight:600;color:${miDelegVigente?'var(--green)':'var(--yellow)'};margin-bottom:3px">${miDelegVigente?'✓ Tu delegación está activa':'⏱ Tu delegación está fuera de vigencia'}</div>
      <div>Delegaste tus autorizaciones a: <strong style="color:var(--t1)">${miDeleg.delegadoNom}</strong></div>
      <div style="font-size:11px;color:var(--t3);margin-top:3px">Vigencia: ${miDeleg.inicio || '—'} → ${miDeleg.fin || '—'}</div>
    </div>
  ` : `
    <div style="padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);font-size:12px;color:var(--t3);margin-bottom:14px">
      No tenés ninguna delegación activa. Las solicitudes de tu equipo te llegan directamente.
    </div>
  `;

  // Listado de delegaciones existentes en el grupo (visibilidad para todo el RR.HH.)
  let resumenGrupoHtml = '';
  if(isOwner || isRRHH){
    try {
      const mapa = (typeof getDelegacionesMapa === 'function') ? getDelegacionesMapa() : {};
      const activas = Object.values(mapa).filter(d => {
        if(d.inicio && hoy < d.inicio) return false;
        if(d.fin    && hoy > d.fin) return false;
        return true;
      });
      if(activas.length){
        const filas = activas.map(d => `
          <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);font-size:11px">
            <div style="flex:1;min-width:0">
              <div style="color:var(--t1)"><strong>${d.deleganteNom || '?'}</strong> → ${d.delegadoNom || '?'}</div>
              <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">${d.inicio || '—'} → ${d.fin || '—'}</div>
            </div>
          </div>
        `).join('');
        resumenGrupoHtml = `
          <div class="card" style="padding:0;overflow:hidden;margin-top:14px">
            <div style="padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.05em">
              Delegaciones activas en el grupo (${activas.length})
            </div>
            ${filas}
          </div>
        `;
      }
    } catch(_){}
  }

  if(!puedeDelegar){
    cont.innerHTML = `<div class="card" style="padding:20px;color:var(--t3);text-align:center">Las delegaciones de autorización son para gerentes y staff de RR.HH. con equipo a cargo.</div>`;
    return;
  }

  // Panel principal — todos los autorizados ven los mismos controles
  const rolLabel = isOwner ? 'Gerente de RR.HH.' :
                   isCEO   ? 'CEO' :
                   isRRHH  ? 'Staff RR.HH.' :
                             'Gerente de área';

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;max-width:680px">
      <div class="card" style="padding:20px">
        <div style="font-size:13px;color:var(--t1);font-weight:600;margin-bottom:4px">Delegación de autorizaciones</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:14px">
          Durante el período que indiques, otra persona podrá aprobar en tu lugar las solicitudes que normalmente te llegan.
          ${isOwner ? 'Aplica a aprobaciones de RR.HH.' : isCEO ? 'Aplica a tus aprobaciones como CEO.' : 'Aplica a las solicitudes de tu equipo.'}
        </div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Estás logueado como: ${rolLabel}</div>
        <div id="delegacion-banner-sub" style="margin-bottom:16px"></div>
        ${miDelegHtml}
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="abrirDelegacion()" style="font-size:13px;padding:9px 16px">👤 ${miDeleg?'Cambiar delegado':'Delegar autorización'}</button>
          <button class="btn btn-ghost" onclick="revocarDelegacion()" style="font-size:13px;padding:9px 16px;color:var(--red);border-color:rgba(239,68,68,.3)" ${!miDeleg ? 'disabled' : ''}>✕ Revocar mi delegación</button>
        </div>
      </div>
      ${resumenGrupoHtml}
    </div>`;
  if(typeof actualizarBannerDelegacion === 'function') actualizarBannerDelegacion();
}

function actualizarRRHHBadges(){
  // Badge solicitudes pendientes
  const pend = solicitudes.filter(s=>s.status==='pending_hr').length;
  const bs = document.getElementById('rrhh-badge-sol');
  if(bs){ bs.style.display=pend?'inline-block':'none'; bs.textContent=`${pend} pendiente${pend!==1?'s':''}`; }
  // Badge novedades CBU
  if(typeof _refrescarBadgeCBUNovedades === 'function') _refrescarBadgeCBUNovedades();
  // Badge contraseñas
  const bp = document.getElementById('rrhh-badge-pwd');
  const blq = getSolicitudesBlanqueo().filter(s=>s.estado==='pendiente').length;
  if(bp){ bp.style.display=blq?'inline-block':'none'; bp.textContent=`${blq} solicitud${blq!==1?'es':''}`; }
  // Badge domicilios pendientes
  getCambiosDomicilio().then(todos=>{
    const bd = document.getElementById('rrhh-badge-dom');
    const pend = todos.filter(c=>c.estado==='pendiente').length;
    if(bd){ bd.style.display=pend?'inline-block':'none'; bd.textContent=`${pend} pendiente${pend!==1?'s':''}`; }
  });
  // Badge licencias anuales (aprobadas por gerente, esperando RR.HH.)
  getLicAnuales().then(todos=>{
    const bl = document.getElementById('rrhh-badge-lic-anual');
    const pend = todos.filter(l=>l.estado==='aprobada_gerente').length;
    if(bl){ bl.style.display=pend?'inline-block':'none'; bl.textContent=`${pend} nueva${pend!==1?'s':''}`; }
  });
  // Badge mensajes nuevos
  getMensajes().then(todos=>{
    const bm = document.getElementById('rrhh-badge-msg');
    const nuevos = todos.filter(m=>m.estado==='nuevo').length;
    if(bm){ bm.style.display=nuevos?'inline-block':'none'; bm.textContent=`${nuevos} nuevo${nuevos!==1?'s':''}`; }
  });
  // Badge evaluaciones pendientes de registrar
  actualizarBadgesEvalRRHH();
}
function renderPendientesGerentes(){
  const div = document.getElementById('list-rrhh-gerentes');
  if(!div) return;
  const pendGerente = solicitudes.filter(s => s.status === 'pending_manager');

  if(!pendGerente.length){
    div.innerHTML = `<div class="card" style="padding:14px 18px;color:var(--t3);font-size:13px">
      <span style="color:var(--green)">✓</span> No hay solicitudes pendientes en gerentes.
    </div>`;
    return;
  }

  // Agrupar por validador (gerente)
  const porGerente = {};
  pendGerente.forEach(s => {
    const ger = s.validador || 'Sin asignar';
    if(!porGerente[ger]) porGerente[ger] = { area: s.validadorArea||'', items:[] };
    porGerente[ger].items.push(s);
  });

  div.innerHTML = Object.entries(porGerente).map(([ger, {area, items}]) => `
    <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
      <div style="padding:10px 18px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-glow);border:1px solid rgba(61,127,255,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent2)">${ger.split(',')[0].trim().substring(0,2)}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${ger}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${area} · ${items.length} solicitud${items.length!==1?'es':''} pendiente${items.length!==1?'s':''}</div>
        </div>
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--yellow);border:1px solid rgba(234,179,8,.3);padding:2px 8px;border-radius:10px">${items.length} pendiente${items.length!==1?'s':''}</span>
      </div>
      ${items.map(s => {
        const emp = s.emp || {};
        return `<div style="display:flex;align-items:center;padding:10px 18px;border-bottom:1px solid var(--border);gap:14px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--t1)">${emp.nom||''}</div>
            <div style="font-size:11px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">${emp.emp||''} · ${emp.lugar||''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:14px;font-weight:600;color:var(--accent2)">${fmt(s.monto)}</div>
            <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">${s.fecha}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
  // Badge domicilios pendientes
  getCambiosDomicilio().then(todos=>{
    const bd = document.getElementById('rrhh-badge-dom');
    const pend = todos.filter(c=>c.estado==='pendiente').length;
    if(bd){ bd.style.display=pend?'inline-block':'none'; bd.textContent=`${pend} pendiente${pend!==1?'s':''}`; }
  });
}
// ─── DELEGACIÓN DE AUTORIZACIÓN ───
// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE DELEGACIÓN — v2: múltiples delegaciones por delegante
// ───────────────────────────────────────────────────────────────────
// Antes: una sola delegación global (solo Papa podía delegar).
// Ahora: cada gerente, RR.HH. y CEO pueden delegar sus propias
// autorizaciones a sus subordinados. Cada delegación se almacena
// indexada por el DNI del delegante.
//
// Compat: si existe legacy 'lsg_delegacion' (formato antiguo), se
// migra automáticamente al primer acceso al nuevo mapa.
// ═══════════════════════════════════════════════════════════════════
const _LS_DELEG_MAP = 'lsg_delegaciones';
const _LS_DELEG_LEGACY = 'lsg_delegacion';

function _migrarDelegacionLegacy(){
  // Migración silenciosa una sola vez: si hay legacy y NO hay mapa nuevo,
  // se traslada al mapa nuevo bajo el DNI del delegante (Papa).
  try {
    const mapa = JSON.parse(localStorage.getItem(_LS_DELEG_MAP) || 'null');
    const legacy = JSON.parse(localStorage.getItem(_LS_DELEG_LEGACY) || 'null');
    if(mapa) return; // ya migrado
    if(legacy && legacy.delegadoDni){
      // El legacy no guardaba el delegante DNI (siempre era Papa). Buscar a Papa en nómina.
      const papa = getNomina().find(e => e.nom && e.nom.toUpperCase().includes('PAPA, PABLO GABRIEL'));
      const delegantedni = legacy.deleganteDni || (papa && papa.dni) || 'unknown';
      const nuevoMapa = {};
      nuevoMapa[delegantedni] = {
        ...legacy,
        deleganteDni: delegantedni,
        deleganteNom: legacy.deleganteNom || (papa && papa.nom) || 'PAPA, PABLO GABRIEL'
      };
      try{localStorage.setItem(_LS_DELEG_MAP, JSON.stringify(nuevoMapa));}catch(e){}
    } else {
      try{localStorage.setItem(_LS_DELEG_MAP, JSON.stringify({}));}catch(e){}
    }
  } catch(_){}
}

function getDelegacionesMapa(){
  _migrarDelegacionLegacy();
  try { return JSON.parse(localStorage.getItem(_LS_DELEG_MAP) || '{}'); }
  catch(_){ return {}; }
}

function saveDelegacionesMapa(mapa){
  localStorage.setItem(_LS_DELEG_MAP, JSON.stringify(mapa));
}

// Devuelve la delegación HACIA el dni dado (es decir, alguien delegó EN ESTE usuario).
// Esta es la que usa el login para subir de nivel.
function getDelegacion(){
  // Compat: el código viejo de auth llama getDelegacion() para verificar si
  // ESTE usuario tiene una delegación recibida. Buscamos en el mapa una
  // delegación cuyo delegadoDni coincida con emp.dni del que pregunta.
  // PROBLEMA: getDelegacion() se llama SIN el dni (durante login).
  // Solución compat: devolvemos la PRIMERA delegación vigente que matchee con
  // loginEmp.dni (la persona que está intentando ingresar) si está disponible.
  const mapa = getDelegacionesMapa();
  const dniLogin = (typeof loginEmp !== 'undefined' && loginEmp?.dni) ||
                   currentUser?.emp?.dni;
  if(!dniLogin) return null;
  const hoy = new Date().toISOString().split('T')[0];
  for(const d of Object.values(mapa)){
    if(d.delegadoDni !== dniLogin) continue;
    if(d.inicio && hoy < d.inicio) continue;
    if(d.fin    && hoy > d.fin) continue;
    return d; // primera vigente
  }
  return null;
}

// Devuelve la delegación QUE EMITIÓ el usuario actual (su propia delegación activa).
function getMiDelegacionEmitida(){
  const mapa = getDelegacionesMapa();
  const dni = currentUser?.emp?.dni;
  if(!dni) return null;
  return mapa[dni] || null;
}

function saveDelegacion(d){
  // d incluye: deleganteDni, deleganteNom, delegadoDni, delegadoNom, inicio, fin, fecha
  const mapa = getDelegacionesMapa();
  mapa[d.deleganteDni] = d;
  saveDelegacionesMapa(mapa);
}

function clearDelegacion(){
  // Limpia SOLO la delegación emitida por el usuario actual
  const mapa = getDelegacionesMapa();
  const dni = currentUser?.emp?.dni;
  if(dni && mapa[dni]){
    delete mapa[dni];
    saveDelegacionesMapa(mapa);
  }
}

function abrirDelegacion(){
  // Validar permisos antes de abrir el modal
  const userNom = (currentUser?.emp?.nom || '').toUpperCase();
  const isOwner = userNom.includes('PAPA, PABLO GABRIEL') || userNom.includes('PAPA PABLO GABRIEL');
  const isCEO = userNom.includes('PARERA, MARTIN') || userNom.includes('PARERA MARTIN');
  const isRRHH = currentUser?.role === 'rrhh';
  const tieneEquipo = (typeof _getEquipoDelGerente === 'function')
    ? _getEquipoDelGerente(false).length > 0
    : (currentUser?.emp?.cat === 'GER');
  if(!isOwner && !isCEO && !isRRHH && !tieneEquipo){
    toast('⚠ Solo gerentes y staff de RR.HH. pueden delegar autorizaciones', 'var(--red)');
    return;
  }
  const modal = document.getElementById('modal-delegacion');
  if(!modal){
    console.error('Modal delegación no encontrado en DOM');
    toast('⚠ Error al abrir el modal. Recargá la página.', 'var(--red)');
    return;
  }
  modal.style.display = 'flex';
  const searchEl = document.getElementById('del-search');
  const inicioEl = document.getElementById('del-inicio');
  const finEl    = document.getElementById('del-fin');
  if(searchEl) searchEl.value = '';
  // Pre-fill: today → 30 days from now
  const hoy = new Date();
  const fin = new Date(); fin.setDate(fin.getDate() + 30);
  const fmt = d => d.toISOString().split('T')[0];
  if(inicioEl) inicioEl.value = fmt(hoy);
  if(finEl) finEl.value = fmt(fin);
  if(typeof renderDelList === 'function') renderDelList();
  setTimeout(()=>{ if(searchEl) searchEl.focus(); }, 100);
}
function cerrarDelegacion(){
  document.getElementById('modal-delegacion').style.display = 'none';
}

// Mapa temporal para el modal de delegación
const _delMap = {};

function renderDelList(){
  const q = document.getElementById('del-search').value.toLowerCase();
  const userNom = (currentUser?.emp?.nom || '').toUpperCase();
  const isOwner = userNom.includes('PAPA, PABLO GABRIEL') || userNom.includes('PAPA PABLO GABRIEL');
  const isCEO = userNom.includes('PARERA, MARTIN') || userNom.includes('PARERA MARTIN');
  const isRRHH = currentUser?.role === 'rrhh';

  const rrhhStaff = ['BOZZUTO','AGUIAR, LUNA','DONATO','PAPA, LUCIANO'];

  let esElegible;
  if(isOwner || isCEO || isRRHH){
    // Papa, CEO y staff RRHH delegan a gerentes o staff de RRHH
    esElegible = e =>
      e.dni !== currentUser?.emp?.dni &&
      !e._deBaja && !e.egreso &&
      (e.cat === 'GER' || rrhhStaff.some(s => e.nom.toUpperCase().includes(s.toUpperCase())));
  } else {
    // Gerente regular: delega a su propio equipo o a otros gerentes
    const equipo = (typeof _getEquipoDelGerente === 'function')
      ? _getEquipoDelGerente(false)
      : [];
    const equipoLegs = new Set(equipo.map(e => e.leg));
    esElegible = e =>
      e.dni !== currentUser?.emp?.dni &&
      !e._deBaja && !e.egreso &&
      (equipoLegs.has(e.leg) || e.cat === 'GER');
  }

  const lista = getNomina().filter(e =>
    esElegible(e) &&
    (q === '' || e.nom.toLowerCase().includes(q) || e.leg.includes(q))
  );
  const div = document.getElementById('del-list');
  if(!lista.length){
    div.innerHTML='<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Sin resultados</div>';
    return;
  }
  // Store data in map to avoid escaping issues in onclick
  lista.forEach(e => { _delMap[e.dni] = e; });
  div.innerHTML = lista.map(e => {
    const etiqueta = e.cat === 'GER' ? 'GERENTE' :
                     rrhhStaff.some(s => e.nom.toUpperCase().includes(s)) ? 'RR.HH.' :
                     'EQUIPO';
    const color = etiqueta === 'GERENTE' ? 'var(--accent2)' :
                  etiqueta === 'RR.HH.'  ? 'var(--green)'   :
                                           'var(--t2)';
    const iniciales = e.nom.split(',')[0].trim().substring(0,2).toUpperCase();
    return `<div data-dni="${e.dni}" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
      <div style="width:34px;height:34px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--t1);flex-shrink:0">${iniciales}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--t1);font-weight:500">${e.nom}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:2px">Leg. ${e.leg} · ${e.emp}</div>
      </div>
      <span style="font-size:10px;font-family:var(--font-mono);color:${color};border:1px solid ${color};padding:2px 7px;border-radius:10px;opacity:.85;flex-shrink:0">${etiqueta}</span>
      <span style="font-size:13px;color:var(--accent2);font-family:var(--font-mono);flex-shrink:0">→</span>
    </div>`;
  }).join('');
  // Attach listeners via event delegation on container
  div.onclick = ev => {
    const row = ev.target.closest('[data-dni]');
    if(!row) return;
    const emp = _delMap[row.dataset.dni];
    if(emp) confirmarDelegacion(emp);
  };
}

async function confirmarDelegacion(e){
  const inicio = document.getElementById('del-inicio').value;
  const fin    = document.getElementById('del-fin').value;
  if(!inicio || !fin){
    toast('⚠ Ingresá las fechas de inicio y finalización', 'var(--yellow)'); return;
  }
  if(fin <= inicio){
    toast('⚠ La fecha de finalización debe ser posterior al inicio', 'var(--yellow)'); return;
  }
  const fmtDisplay = iso => { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const nombre = e.nom.split(',')[0].trim();
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Delegar tus autorizaciones a ${e.nom}?<br><br>Período: ${fmtDisplay(inicio)} al ${fmtDisplay(fin)}<br><br>${nombre} podrá aprobar en tu lugar durante ese período.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  saveDelegacion({
    deleganteDni: currentUser.emp.dni,
    deleganteNom: currentUser.emp.nom,
    deleganteLeg: currentUser.emp.leg,
    delegadoDni: e.dni,
    delegadoNom: e.nom,
    delegadoLeg: e.leg,
    delegadoEmp: e.emp,
    delegadoPor: currentUser.emp.nom,
    inicio,
    fin,
    fecha: new Date().toLocaleDateString('es-AR')
  });
  if(typeof logAuditX === 'function'){
    logAuditX('delegacion', 'crear', {
      delegante: currentUser.emp.nom,
      delegado: e.nom,
      inicio, fin
    });
  }
  cerrarDelegacion();
  actualizarBannerDelegacion();
  // Refrescar el panel para mostrar la nueva delegación
  if(typeof renderDelegacionSub === 'function') renderDelegacionSub();
  toast(`✓ Autorización delegada a ${nombre} hasta el ${fmtDisplay(fin)}`, 'var(--green)');
}

async function revocarDelegacion(){
  const d = getMiDelegacionEmitida();
  if(!d){
    toast('No tenés delegación activa para revocar', 'var(--t3)');
    return;
  }
  const nombre = (d.delegadoNom || '').split(',')[0].trim() || 'la persona delegada';
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Revocar tu delegación a ${d.delegadoNom || 'la persona delegada'}?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  clearDelegacion();
  if(typeof logAuditX === 'function'){
    logAuditX('delegacion', 'revocar', {
      delegante: currentUser?.emp?.nom,
      delegado: d.delegadoNom
    });
  }
  actualizarBannerDelegacion();
  if(typeof renderDelegacionSub === 'function') renderDelegacionSub();
  toast(`✓ Delegación a ${nombre} revocada`, 'var(--yellow)');
}

function actualizarBannerDelegacion(){
  const d = getDelegacion();
  const isOwner = currentUser?.emp?.nom?.toUpperCase().includes('PAPA, PABLO GABRIEL');
  const banner = document.getElementById('delegacion-banner');
  const headerActiva = document.getElementById('del-header-activa');
  const headerTxt = document.getElementById('del-header-txt');
  const btnDelegar = document.getElementById('btn-delegar');

  const fmtD = iso => { if(!iso) return ''; const [y,m,day] = iso.split('-'); return `${day}/${m}/${y}`; };
  const hoy = new Date().toISOString().split('T')[0];

  if(d){
    const vigente = (!d.inicio || hoy >= d.inicio) && (!d.fin || hoy <= d.fin);
    const estadoColor = vigente ? 'var(--green)' : 'var(--red)';
    const estadoTxt   = vigente ? '● Vigente' : '● Vencida';
    const periodo = (d.inicio && d.fin) ? `${fmtD(d.inicio)} → ${fmtD(d.fin)}` : d.fecha;

    // Banner inferior (info completa)
    banner.style.display = 'flex';
    if(isOwner){
      document.getElementById('del-banner-text').innerHTML =
        `Autorización delegada a: <strong>${d.delegadoNom}</strong> &nbsp;<span style="font-size:11px;color:${estadoColor}">${estadoTxt}</span>`;
      document.getElementById('del-banner-sub').textContent =
        `Legajo ${d.delegadoLeg} · ${d.delegadoEmp} · Período: ${periodo}`;
    } else {
      document.getElementById('del-banner-text').innerHTML =
        `Acceso delegado por: <strong>${d.delegadoPor}</strong> &nbsp;<span style="font-size:11px;color:${estadoColor}">${estadoTxt}</span>`;
      document.getElementById('del-banner-sub').textContent = `Período: ${periodo}`;
    }

    // Header: mostrar estado + revocar (solo para PAPA)
    if(isOwner && headerActiva){
      headerActiva.style.display = 'flex';
      headerTxt.innerHTML = `👤 Delegado a <strong style="color:var(--t1)">${d.delegadoNom.split(',')[0].trim()}</strong> · <span style="color:${estadoColor}">${estadoTxt}</span>`;
      if(btnDelegar) btnDelegar.style.display = 'none'; // ocultar "Delegar" mientras hay una activa
    }
  } else {
    banner.style.display = 'none';
    if(headerActiva) headerActiva.style.display = 'none';
    if(isOwner && btnDelegar) btnDelegar.style.display = 'inline-flex';
  }

  // Sub-banner dentro de la sub-página de Delegación (sumario visible siempre que se entra al módulo)
  const bannerSub = document.getElementById('delegacion-banner-sub');
  if(bannerSub){
    if(d){
      const vigente = (!d.inicio || hoy >= d.inicio) && (!d.fin || hoy <= d.fin);
      const estadoColor = vigente ? 'var(--green)' : 'var(--red)';
      const estadoTxt   = vigente ? '● Vigente' : '● Vencida';
      const periodo = (d.inicio && d.fin) ? `${fmtD(d.inicio)} → ${fmtD(d.fin)}` : d.fecha;
      bannerSub.innerHTML = `
        <div style="background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);padding:12px 14px;display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:18px;flex-shrink:0">👤</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--t1);font-weight:600">Hay una delegación activa</div>
            <div style="font-size:11px;color:var(--t2);margin-top:3px;line-height:1.4">
              Delegada a: <strong>${d.delegadoNom}</strong> &nbsp;<span style="font-size:10px;color:${estadoColor}">${estadoTxt}</span><br>
              <span style="color:var(--t3);font-family:var(--font-mono);font-size:10px">Legajo ${d.delegadoLeg} · ${d.delegadoEmp} · ${periodo}</span>
            </div>
          </div>
        </div>`;
    } else {
      bannerSub.innerHTML = `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--t3);font-size:12px;font-style:italic">
          No hay delegación activa actualmente.
        </div>`;
    }
  }
}


