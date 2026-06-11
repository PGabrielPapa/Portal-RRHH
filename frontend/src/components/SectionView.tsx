import { useParams, Navigate } from 'react-router-dom';
import { findSection } from '../lib/sections';
import Placeholder from './Placeholder';
import Empleados from '../pages/Empleados';

export default function SectionView() {
  const { key } = useParams();
  const section = key ? findSection(key) : undefined;
  if (!section) return <Navigate to="/" replace />;
  if (section.key === 'empleados') return <Empleados />;
  return <Placeholder label={section.label} />;
}
