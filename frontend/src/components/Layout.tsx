import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { groupsForRole } from '../lib/sections';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const groups = groupsForRole(user?.role || 'employee');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <Link to="/" className="sb-brand" style={{ display: 'block', textDecoration: 'none' }}>
          <strong>Portal RR.HH.</strong>
          <div className="muted">Grupo LEITEN</div>
        </Link>
        <nav style={{ padding: '10px' }}>
          <NavLink to="/" end className="sb-item" style={({ isActive }) => isActive ? { background: 'var(--accent-glow)', color: 'var(--accent2)' } : {}}>🏠 Inicio</NavLink>
          {groups.map((g) => (
            <div key={g.panel} style={{ marginTop: 12 }}>
              <div className="sb-group-label">{g.panel}</div>
              {g.items.slice().sort((a, b) => a.label.localeCompare(b.label, 'es')).map((it) => (
                <NavLink key={it.key} to={`/m/${it.key}`} className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}>
                  <span>{it.label}</span>
                  {!it.ready && <span title="En migración" style={{ fontSize: 10, opacity: .6 }}>🚧</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="topbar">
          <span className="nav-logo" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent2)', letterSpacing: '.05em' }}>LEITEN · RR.HH.</span>
          <div className="row">
            <span className="muted">{user?.nom} · {user?.role}</span>
            <button className="btn ghost" onClick={() => { logout(); nav('/login'); }}>Salir</button>
          </div>
        </div>
        <div className="container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
