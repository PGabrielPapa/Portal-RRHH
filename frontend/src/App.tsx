import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { groupsForRole } from './lib/sections';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Layout from './components/Layout';
import SectionView from './components/SectionView';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Home() {
  const { user } = useAuth();
  const groups = groupsForRole(user?.role || 'employee');
  const first = groups[0]?.items[0]?.key || 'empleados';
  return <Navigate to={`/m/${first}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cambiar-clave" element={<Protected><ChangePassword /></Protected>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
        <Route path="/m/:key" element={<SectionView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
