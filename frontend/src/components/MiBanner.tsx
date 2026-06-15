import { useAuth } from '../lib/auth';

// Encabezado personal del empleado (avatar + nombre + empresa), estilo vanilla.
export default function MiBanner({ titulo }: { titulo?: string; subtitulo?: string }) {
  const { user } = useAuth();
  const ini = String(user?.nom || '').replace(/,/g, '').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '14px 18px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(61,127,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--accent2)', flexShrink: 0 }}>{ini}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{user?.nom}</div>
        <div className="muted" style={{ fontFamily: 'var(--font-mono)', marginTop: 2 }}>{user?.empresa}{titulo ? ` · ${titulo}` : ''}</div>
      </div>
    </div>
  );
}
