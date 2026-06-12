import { useParams, Navigate } from 'react-router-dom';
import { ComponentType } from 'react';
import { findSection } from '../lib/sections';
import Placeholder from './Placeholder';
import Empleados from '../pages/Empleados';
import MisDatos from '../pages/MisDatos';
import Mensajes from '../pages/Mensajes';
import MisCbus from '../pages/MisCbus';
import Adelantos from '../pages/Adelantos';
import Parametros from '../pages/Parametros';
import Conceptos from '../pages/Conceptos';
import Liquidacion from '../pages/Liquidacion';
import MisRecibos from '../pages/MisRecibos';
import RecibosGestion from '../pages/RecibosGestion';
import Licencias from '../pages/Licencias';
import Sanciones from '../pages/Sanciones';
import Evaluaciones from '../pages/Evaluaciones';
import CertTrabajo from '../pages/CertTrabajo';
import CertTrabajoRRHH from '../pages/CertTrabajoRRHH';
import AdminUsuarios from '../pages/AdminUsuarios';
import AdminAuditoria from '../pages/AdminAuditoria';
import AdminEmpresas from '../pages/AdminEmpresas';
import Elementos from '../pages/Elementos';
import Beneficios from '../pages/Beneficios';
import CambiosDomicilio from '../pages/CambiosDomicilio';
import MisFamiliares from '../pages/MisFamiliares';
import Justificaciones from '../pages/Justificaciones';

// Módulos ya migrados (clave de sección → componente).
const COMPONENTS: Record<string, ComponentType> = {
  'empleados': Empleados,
  'mis-datos': MisDatos,
  'mensajes': Mensajes,
  'mis-cbus': MisCbus,
  'anticipos': Adelantos,
  'aprobaciones': Adelantos,
  'parametros': Parametros,
  'conceptos': Conceptos,
  'liquidacion': Liquidacion,
  'mis-recibos': MisRecibos,
  'recibos-gestion': RecibosGestion,
  'mis-licencias': Licencias,
  'licencias-equipo': Licencias,
  'licencias-rrhh': Licencias,
  'sanciones': Sanciones,
  'mis-sanciones': Sanciones,
  'sanciones-equipo': Sanciones,
  'evaluaciones': Evaluaciones,
  'mis-evaluaciones': Evaluaciones,
  'evaluaciones-equipo': Evaluaciones,
  'cert-trabajo': CertTrabajo,
  'cert-trabajo-rrhh': CertTrabajoRRHH,
  'admin-usuarios': AdminUsuarios,
  'auditoria': AdminAuditoria,
  'admin-empresas': AdminEmpresas,
  'elementos-trabajo': Elementos,
  'beneficios': Beneficios,
  'cambios-domicilio': CambiosDomicilio,
  'mis-familiares': MisFamiliares,
  'justificar-licencia': Justificaciones,
};

export default function SectionView() {
  const { key } = useParams();
  const section = key ? findSection(key) : undefined;
  if (!section) return <Navigate to="/" replace />;
  const Comp = COMPONENTS[section.key];
  return Comp ? <Comp /> : <Placeholder label={section.label} />;
}
