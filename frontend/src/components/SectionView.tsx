import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ComponentType } from 'react';
import { findSection } from '../lib/sections';
import { META, fallback } from '../lib/meta';
import Placeholder from './Placeholder';
import Empleados from '../pages/Empleados';
import MisDatos from '../pages/MisDatos';
import Mensajes from '../pages/Mensajes';
import MensajesRRHH from '../pages/MensajesRRHH';
import Organigrama from '../pages/Organigrama';
import Ganancias from '../pages/Ganancias';
import GananciasParams from '../pages/GananciasParams';
import LibroSueldos from '../pages/LibroSueldos';
import F931 from '../pages/F931';
import Asiento from '../pages/Asiento';
import ArchivosBanco from '../pages/ArchivosBanco';
import GeneradorReportes from '../pages/GeneradorReportes';
import Simulaciones from '../pages/Simulaciones';
import DdjjSindical from '../pages/DdjjSindical';
import Sindicatos from '../pages/Sindicatos';
import DocumentosFirmados from '../pages/DocumentosFirmados';
import Hys from '../pages/Hys';
import Reglamento from '../pages/Reglamento';
import CierrePeriodos from '../pages/CierrePeriodos';
import NivelesUsuario from '../pages/NivelesUsuario';
import LiquidacionAnual from '../pages/LiquidacionAnual';
import CbuNovedades from '../pages/CbuNovedades';
import Escalas from '../pages/Escalas';
import ArtEmpresas from '../pages/ArtEmpresas';
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
  'mensajes-rrhh': MensajesRRHH,
  'organigrama': Organigrama,
  'mis-ganancias': Ganancias,
  'ganancias-rrhh': Ganancias,
  'ganancias-params': GananciasParams,
  'libro-sueldos': LibroSueldos,
  'f931': F931,
  'asiento': Asiento,
  'bancos': ArchivosBanco,
  'reportes': GeneradorReportes,
  'simulaciones': Simulaciones,
  'ddjj-sindical': DdjjSindical,
  'sindicatos': Sindicatos,
  'documentos': DocumentosFirmados,
  'hys': Hys,
  'reglamento': Reglamento,
  'cierre-periodos': CierrePeriodos,
  'user-levels': NivelesUsuario,
  'liquidacion-anual': LiquidacionAnual,
  'cbu-novedades': CbuNovedades,
  'escalas': Escalas,
  'art-empresas': ArtEmpresas,
  'mis-cbus': MisCbus,
  'anticipos': Adelantos,
  'aprobaciones': Adelantos,
  'adelantos-rrhh': Adelantos,
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
  return (
    <>
      <PageHeader sectionKey={section.key} label={section.label} />
      {Comp ? <Comp /> : <Placeholder label={section.label} />}
    </>
  );
}

function PageHeader({ sectionKey, label }: { sectionKey: string; label: string }) {
  const nav = useNavigate();
  const m = META[sectionKey] || fallback;
  return (
    <>
      <button className="page-back" onClick={() => nav('/')} title="Volver al menú">← Volver al inicio</button>
      <div className="page-header">
        <div className="page-ico" style={{ background: `rgba(${m.col},.1)`, border: `1px solid rgba(${m.col},.3)` }}>{m.ico}</div>
        <div>
          <div className="page-title">{label}</div>
          {m.desc && <div className="page-sub">{m.desc}</div>}
        </div>
      </div>
    </>
  );
}
