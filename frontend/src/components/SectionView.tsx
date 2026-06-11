import { useParams, Navigate } from 'react-router-dom';
import { ComponentType } from 'react';
import { findSection } from '../lib/sections';
import Placeholder from './Placeholder';
import Empleados from '../pages/Empleados';
import MisDatos from '../pages/MisDatos';
import Mensajes from '../pages/Mensajes';
import MisCbus from '../pages/MisCbus';
import Adelantos from '../pages/Adelantos';

// Módulos ya migrados (clave de sección → componente).
const COMPONENTS: Record<string, ComponentType> = {
  'empleados': Empleados,
  'mis-datos': MisDatos,
  'mensajes': Mensajes,
  'mis-cbus': MisCbus,
  'anticipos': Adelantos,
};

export default function SectionView() {
  const { key } = useParams();
  const section = key ? findSection(key) : undefined;
  if (!section) return <Navigate to="/" replace />;
  const Comp = COMPONENTS[section.key];
  return Comp ? <Comp /> : <Placeholder label={section.label} />;
}
