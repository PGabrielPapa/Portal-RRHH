// Organigrama — getValidador + construcción del árbol (portado de la app vanilla, js/04 y js/19).
// La lógica es pura sobre los campos del empleado (nom, lugar, cat, emp, validador…).
/* eslint-disable */
export interface Emp { nom: string; leg?: string; legNum?: string; emp?: string; empresa?: string; lugar?: string; cat?: string; tramo?: string; validador?: string; areaOrg?: string; area?: string; validadorGoToHR?: boolean; validadorAutoApproved?: boolean; }

export function getValidador(emp: any) {
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

export interface OrgNode {
  nombre: string;
  area: string;
  empleado: Emp | null;
  directos: { emp: Emp; area: string }[];
  subManagers: Record<string, OrgNode>;
  totalRecursivo: number;
}

// Normaliza el campo empresa del DTO (puede venir como `empresa` o `emp`).
function empresaDe(e: Emp): string { return String(e.empresa || e.emp || '').toUpperCase(); }

export function construirOrganigrama(nomina: Emp[], filtroEmpresa?: string) {
  const lista = nomina.filter((e) => !filtroEmpresa || empresaDe(e) === filtroEmpresa.toUpperCase());
  const empPorNombre: Record<string, Emp> = {};
  for (const e of lista) empPorNombre[e.nom.toUpperCase().trim()] = e;

  const nodos: Record<string, OrgNode> = {};
  const getNodo = (nombre: string, area?: string): OrgNode => {
    if (!nodos[nombre]) nodos[nombre] = { nombre, area: area || '', empleado: empPorNombre[nombre] || null, directos: [], subManagers: {}, totalRecursivo: 0 };
    return nodos[nombre];
  };

  // Pasada 1: cada empleado cae bajo su validador.
  for (const emp of lista) {
    const v = getValidador({ ...emp, emp: empresaDe(emp) });
    if (!v || !v.validador) continue;
    getNodo(v.validador, v.area).directos.push({ emp, area: v.area });
  }

  // Pasada 2: conectar jerarquía.
  const tieneSuperior = new Set<string>();
  for (const nombre of Object.keys(nodos)) {
    const emp = empPorNombre[nombre];
    if (!emp) continue;
    const v = getValidador({ ...emp, emp: empresaDe(emp) });
    if (!v || !v.validador || v.validador === nombre) continue;
    const superior = nodos[v.validador];
    if (superior) { superior.subManagers[nombre] = nodos[nombre]; tieneSuperior.add(nombre); }
  }

  // Quitar de "directos" los que también son subManagers.
  for (const nodo of Object.values(nodos)) {
    const subSet = new Set(Object.keys(nodo.subManagers));
    nodo.directos = nodo.directos.filter((d) => !subSet.has(d.emp.nom.toUpperCase().trim()));
  }

  // Total recursivo.
  const totalRecur = (nodo: OrgNode, vis: Set<string>): number => {
    if (vis.has(nodo.nombre)) return 0;
    vis.add(nodo.nombre);
    let total = nodo.directos.length;
    for (const sub of Object.values(nodo.subManagers)) total += 1 + totalRecur(sub, vis);
    return total;
  };
  for (const nodo of Object.values(nodos)) nodo.totalRecursivo = totalRecur(nodo, new Set());

  const raices = Object.keys(nodos).filter((n) => !tieneSuperior.has(n)).map((n) => nodos[n]).sort((a, b) => b.totalRecursivo - a.totalRecursivo);
  return { nodos, raices, totalEmpleados: lista.length };
}
