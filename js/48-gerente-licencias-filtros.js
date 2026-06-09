// ═══════════════════════════════════════════════════════════════════════════
// FILTROS EXTENDIDOS DE LICENCIAS — PANEL GERENTE
// ───────────────────────────────────────────────────────────────────────────
// Suma a los tabs "Licencias de mi área", "Licencias Anuales" y "Licencias
// Especiales":
//   - Filtro por empleado a cargo (dropdown poblado con el equipo)
//   - Rango de fechas (desde / hasta)
//   - Búsqueda mejorada por nombre o legajo
//
// Wrapping pattern: extiende las funciones existentes sin reescribirlas.
// Cada render original se llama al final para mantener compatibilidad.
// ═══════════════════════════════════════════════════════════════════════════

// ── Helper: obtener equipo a cargo del gerente actual ────────────────
function _gerEquipoACargo(){
  if(!currentUser) return [];
  if(typeof _getEquipoDelGerente === 'function'){
    try { return _getEquipoDelGerente(true) || []; }  // incluye bajas para historial
    catch(_){}
  }
  // Fallback inline
  const gerNom = currentUser.emp.nom.toUpperCase().trim();
  const esPapa = gerNom.includes('PAPA, PABLO GABRIEL');
  return getNomina().filter(e => {
    const v = (typeof getValidador === 'function') ? getValidador(e) : null;
    if(!v || !v.validador) return false;
    if(esPapa) return v.validador.toUpperCase().includes('PAPA, PABLO GABRIEL');
    return v.validador.toUpperCase() === gerNom;
  });
}

// ── Poblar dropdown de empleados a cargo ─────────────────────────────
function _gerLicPoblarSelectEmpleado(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  // No repoblar si ya está poblado
  if(sel.options.length > 1) return;
  const equipo = _gerEquipoACargo();
  // Ordenar por nombre
  equipo.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  equipo.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.leg;
    const nombre = (e.nom || '').split(',')[0];  // solo apellido si está disponible
    opt.textContent = `${nombre} (${legD(e.leg)})`;
    sel.appendChild(opt);
  });
}

// ── Helper: limpiar fechas de un tab ─────────────────────────────────
function _gerLicLimpiarFechas(tab){
  const desde = document.getElementById(`ger-${tab}-desde`);
  const hasta = document.getElementById(`ger-${tab}-hasta`);
  if(desde) desde.value = '';
  if(hasta) hasta.value = '';
  // Disparar render correspondiente
  if(tab === 'lic'   && typeof renderLicenciasGerente   === 'function') renderLicenciasGerente();
  if(tab === 'anual' && typeof renderLicAnualGerente    === 'function') renderLicAnualGerente();
  if(tab === 'esp'   && typeof renderLicEspecialGerente === 'function') renderLicEspecialGerente();
}

// ── Helper: ¿una licencia cae dentro del rango filtrado? ─────────────
// Se considera dentro si HAY OVERLAP entre [licDesde, licHasta] y
// [filtroDesde, filtroHasta]. Si solo desde, license.hasta >= filtroDesde.
// Si solo hasta, license.desde <= filtroHasta.
function _gerLicEnRango(lic, filtroDesde, filtroHasta){
  if(!filtroDesde && !filtroHasta) return true;
  const licDesde = lic.desde || lic.fecha_desde;
  const licHasta = lic.hasta || lic.fecha_hasta || licDesde;
  if(!licDesde) return false;  // sin fecha y hay filtro → fuera
  if(filtroDesde && licHasta < filtroDesde) return false;
  if(filtroHasta && licDesde > filtroHasta) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// WRAPPING: extender los renders existentes con los filtros nuevos
// ═══════════════════════════════════════════════════════════════════════════

// Esperar a que se carguen las funciones originales (orden de scripts garantiza
// que para cuando se invocan los renders, ya están definidas).

(function(){
  // Wrap renderLicenciasGerente
  if(typeof window.renderLicenciasGerente === 'function'){
    const _orig = window.renderLicenciasGerente;
    window.renderLicenciasGerente = async function(){
      _gerLicPoblarSelectEmpleado('ger-lic-filtro-empleado');
      // Llamar al original primero
      await _orig.apply(this, arguments);
      // Aplicar filtros adicionales post-render
      _gerLicAplicarFiltrosExtra('list-lic-gerente', 'ger-lic-filtro-empleado', 'ger-lic-desde', 'ger-lic-hasta', 'ger-lic-search');
    };
  }
  if(typeof window.renderLicAnualGerente === 'function'){
    const _orig = window.renderLicAnualGerente;
    window.renderLicAnualGerente = async function(){
      _gerLicPoblarSelectEmpleado('ger-anual-filtro-empleado');
      await _orig.apply(this, arguments);
      _gerLicAplicarFiltrosExtra('list-lic-anual-gerente', 'ger-anual-filtro-empleado', 'ger-anual-desde', 'ger-anual-hasta', 'ger-anual-search');
    };
  }
  if(typeof window.renderLicEspecialGerente === 'function'){
    const _orig = window.renderLicEspecialGerente;
    window.renderLicEspecialGerente = async function(){
      _gerLicPoblarSelectEmpleado('ger-esp-filtro-empleado');
      await _orig.apply(this, arguments);
      // Especial: el filtro de tipo y estado también son nuevos, los maneja el original tras parchearlo o acá
      _gerLicAplicarFiltrosExtra('ger-pane-especiales-list', 'ger-esp-filtro-empleado', 'ger-esp-desde', 'ger-esp-hasta', 'ger-esp-search', 'ger-esp-filtro-tipo', 'ger-esp-filtro-estado');
    };
  }
})();

// ── Aplica filtros extra recorriendo el DOM ya renderizado ───────────
// Estrategia: cada fila de licencia contiene leg + fechas como data-*
// attrs. Si no las tiene (los renders viejos no las agregaban), inferimos
// del texto visible mediante regex livianas y data-leg.
function _gerLicAplicarFiltrosExtra(contenedorId, empSelId, desdeId, hastaId, searchId, tipoId, estadoId){
  const cont = document.getElementById(contenedorId);
  if(!cont) return;
  const legFiltro    = document.getElementById(empSelId)?.value || '';
  const desdeFiltro  = document.getElementById(desdeId)?.value || '';
  const hastaFiltro  = document.getElementById(hastaId)?.value || '';
  const qFiltro      = (document.getElementById(searchId)?.value || '').toLowerCase().trim();
  const tipoFiltro   = tipoId ? (document.getElementById(tipoId)?.value || '') : '';
  const estadoFiltro = estadoId ? (document.getElementById(estadoId)?.value || '') : '';

  // Si no hay filtros nuevos activos, salir
  if(!legFiltro && !desdeFiltro && !hastaFiltro && !qFiltro && !tipoFiltro && !estadoFiltro) return;

  // Recorrer cada fila / card de la lista
  const filas = cont.querySelectorAll('[data-lic-leg], [data-leg], .lic-row');
  if(filas.length){
    filas.forEach(fila => {
      const leg = fila.getAttribute('data-lic-leg') || fila.getAttribute('data-leg') || '';
      const licDesde = fila.getAttribute('data-lic-desde') || '';
      const licHasta = fila.getAttribute('data-lic-hasta') || '';
      const licTipo  = fila.getAttribute('data-lic-tipo')  || '';
      const licEstado= fila.getAttribute('data-lic-estado')|| '';
      const texto = (fila.textContent || '').toLowerCase();
      let visible = true;
      if(legFiltro && leg && leg !== legFiltro) visible = false;
      if(qFiltro && !texto.includes(qFiltro) && !leg.toLowerCase().includes(qFiltro)) visible = false;
      if(tipoFiltro && licTipo && licTipo !== tipoFiltro) visible = false;
      if(estadoFiltro && licEstado && licEstado !== estadoFiltro) visible = false;
      if(desdeFiltro || hastaFiltro){
        if(!_gerLicEnRango({ desde: licDesde, hasta: licHasta }, desdeFiltro, hastaFiltro)){
          visible = false;
        }
      }
      fila.style.display = visible ? '' : 'none';
    });
  } else {
    // Fallback: si los renders viejos no marcaron las filas con data-attrs,
    // buscamos divs que parezcan filas (children directos del contenedor)
    const directos = cont.children;
    Array.from(directos).forEach(fila => {
      const txt = (fila.textContent || '').toLowerCase();
      let visible = true;
      // Solo aplicar filtro de texto y empleado (lo demás necesita data-attrs)
      if(qFiltro && !txt.includes(qFiltro)) visible = false;
      if(legFiltro){
        // Buscar el legajo en el texto (suele estar como "Legajo: XXX" o "(XXX)")
        if(!txt.includes(legFiltro.toLowerCase())) visible = false;
      }
      fila.style.display = visible ? '' : 'none';
    });
  }

  // Mostrar mensaje si nada visible
  const algunVisible = Array.from(cont.children).some(c => c.style.display !== 'none');
  let avisoVacio = cont.querySelector('.ger-lic-filtros-vacio');
  if(!algunVisible){
    if(!avisoVacio){
      avisoVacio = document.createElement('div');
      avisoVacio.className = 'ger-lic-filtros-vacio';
      avisoVacio.style.cssText = 'padding:30px;text-align:center;color:var(--t3);font-size:13px;font-style:italic';
      avisoVacio.textContent = 'Sin resultados con los filtros aplicados';
      cont.appendChild(avisoVacio);
    } else {
      avisoVacio.style.display = '';
    }
  } else if(avisoVacio){
    avisoVacio.style.display = 'none';
  }
}
