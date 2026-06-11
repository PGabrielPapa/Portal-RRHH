import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { groupsForRole } from '../lib/sections';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const groups = groupsForRole(user?.role || 'employee');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 250, flex: 'none', background: 'var(--bg2)', borderRight: '1px solid var(--border)', overflowY: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <strong>Portal RR.HH.</strong>
          <div className="muted">Grupo LEITEN</div>
        </div>
        <nav style={{ padding: '8px 10px' }}>
          {groups.map((g) => (
            <div key={g.panel} style={{ marginBottom: 14 }}>
              <div className="muted" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '.08em', padding: '6px 10px' }}>{g.panel}</div>
              {g.items.map((it) => (
                <NavLink key={it.key} to={`/m/${it.key}`}
                  style={({ isActive }) => ({
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', borderRadius: 6, fontSize: 13, textDecoration: 'none',
                    color: isActive ? '#fff' : 'var(--t2)', background: isActive ? 'var(--accent)' : 'transparent',
                  })}>
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
          <span className="muted">Panel</span>
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
