// Registro de secciones (módulos) agrupadas por panel, con los roles que las ven.
// ready=true → ya migrada (tiene componente). ready=false → placeholder.
export type Role = 'employee' | 'manager' | 'rrhh' | 'admin';

export interface Section { key: string; label: string; ready?: boolean; }
export interface Group { panel: string; roles: Role[]; items: Section[]; }

export const GROUPS: Group[] = [
  {
    panel: 'Mi espacio', roles: ['employee', 'manager', 'rrhh', 'admin'],
    items: [
      { key: 'mis-recibos', label: 'Mis recibos', ready: true },
      { key: 'mis-ganancias', label: 'Ganancias (F.1357)' },
      { key: 'mis-datos', label: 'Mis datos', ready: true },
      { key: 'anticipos', label: 'Adelantos', ready: true },
      { key: 'mis-licencias', ready: true, label: 'Mis licencias' },
      { key: 'mensajes', label: 'Mensajes', ready: true },
      { key: 'mis-cbus', label: 'Mis CBUs', ready: true },
      { key: 'cert-trabajo', label: 'Certificado de trabajo', ready: true },
      { key: 'mis-sanciones', label: 'Mis sanciones', ready: true },
      { key: 'mis-evaluaciones', label: 'Mis evaluaciones', ready: true },
      { key: 'mis-familiares', label: 'Mis familiares', ready: true },
    ],
  },
  {
    panel: 'Gerencia', roles: ['manager', 'admin'],
    items: [
      { key: 'aprobaciones', label: 'Aprobaciones (adelantos)', ready: true },
      { key: 'licencias-equipo', ready: true, label: 'Licencias del equipo' },
      { key: 'organigrama', label: 'Organigrama / equipo' },
      { key: 'sanciones-equipo', label: 'Sanciones del equipo', ready: true },
      { key: 'evaluaciones-equipo', label: 'Evaluaciones del equipo', ready: true },
    ],
  },
  {
    panel: 'RR.HH.', roles: ['rrhh', 'admin'],
    items: [
      { key: 'empleados', label: 'ABM Empleados', ready: true },
      { key: 'liquidacion', label: 'Liquidación', ready: true },
      { key: 'recibos-gestion', label: 'Recibos (gestión)', ready: true },
      { key: 'ganancias-rrhh', label: 'Ganancias / F.1357' },
      { key: 'liquidacion-anual', label: 'Liquidación anual ganancias' },
      { key: 'escalas', label: 'Escalas / convenios' },
      { key: 'conceptos', label: 'Conceptos', ready: true },
      { key: 'sanciones', label: 'Sanciones', ready: true },
      { key: 'evaluaciones', label: 'Evaluaciones de desempeño', ready: true },
      { key: 'simulaciones', label: 'Simulaciones' },
      { key: 'licencias-rrhh', ready: true, label: 'Licencias (gestión)' },
      { key: 'hys', label: 'Higiene y Seguridad' },
      { key: 'beneficios', label: 'Beneficios', ready: true },
      { key: 'elementos-trabajo', label: 'Elementos de trabajo', ready: true },
      { key: 'reportes', label: 'Generador de reportes' },
      { key: 'f931', label: 'F.931' },
      { key: 'libro-sueldos', label: 'Libro de sueldos' },
      { key: 'asiento', label: 'Asiento contable' },
      { key: 'bancos', label: 'Archivos de banco' },
      { key: 'cbu-novedades', label: 'CBU — novedades' },
      { key: 'ddjj-sindical', label: 'DDJJ sindical' },
      { key: 'documentos', label: 'Documentos firmados' },
      { key: 'cert-trabajo-rrhh', label: 'Certificados de trabajo', ready: true },
      { key: 'cambios-domicilio', label: 'Cambios de domicilio', ready: true },
      { key: 'art-empresas', label: 'ART por empresa' },
      { key: 'sindicatos', label: 'Sindicatos' },
      { key: 'reglamento', label: 'Reglamento / licencias esp.' },
      { key: 'cierre-periodos', label: 'Cierre de períodos' },
    ],
  },
  {
    panel: 'Administración', roles: ['admin'],
    items: [
      { key: 'admin-empresas', label: 'Empresas', ready: true },
      { key: 'admin-usuarios', label: 'Usuarios', ready: true },
      { key: 'user-levels', label: 'Niveles de usuario' },
      { key: 'auditoria', label: 'Auditoría', ready: true },
      { key: 'parametros', label: 'Parámetros de liquidación', ready: true },
    ],
  },
];

export function groupsForRole(role: string): Group[] {
  return GROUPS
    .filter((g) => g.roles.includes(role as Role))
    .map((g) => ({ ...g }));
}

export function findSection(key: string): Section | undefined {
  for (const g of GROUPS) { const s = g.items.find((i) => i.key === key); if (s) return s; }
  return undefined;
}
