import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { groupsForRole } from '../lib/sections';

// Ícono, color y descripción por sección (réplica del home de la vanilla).
const META: Record<string, { ico: string; col: string; desc: string }> = {
  'mis-recibos': { ico: '📄', col: '61,200,160', desc: 'Consultá y descargá tus recibos de haberes' },
  'mis-ganancias': { ico: '🧾', col: '234,179,8', desc: 'Consultá tu cálculo del Impuesto a las Ganancias (F.1357)' },
  'mis-datos': { ico: '👤', col: '92,104,128', desc: 'Tu información personal y laboral' },
  'anticipos': { ico: '💸', col: '61,127,255', desc: 'Solicitá un adelanto de tu sueldo' },
  'mis-licencias': { ico: '🏖', col: '34,197,94', desc: 'Solicitá y consultá tus licencias y vacaciones' },
  'justificar-licencia': { ico: '📎', col: '168,85,247', desc: 'Presentá el comprobante que justifica tu licencia' },
  'mensajes': { ico: '💬', col: '61,127,255', desc: 'Enviá una consulta o mensaje a Recursos Humanos' },
  'mis-cbus': { ico: '🏦', col: '61,200,160', desc: 'Cargá tus cuentas y el porcentaje de acreditación' },
  'cert-trabajo': { ico: '📋', col: '99,102,241', desc: 'Solicitá tu certificado laboral firmado' },
  'mis-sanciones': { ico: '⚖️', col: '239,68,68', desc: 'Consultá tus sanciones y notificaciones' },
  'mis-evaluaciones': { ico: '📈', col: '94,194,255', desc: 'Consultá tus evaluaciones de desempeño' },
  'mis-familiares': { ico: '👨‍👩‍👧', col: '94,194,255', desc: 'Cargá y gestioná tu grupo familiar' },
  'aprobaciones': { ico: '✅', col: '34,197,94', desc: 'Aprobá o rechazá adelantos de tu equipo' },
  'licencias-equipo': { ico: '🏖', col: '34,197,94', desc: 'Licencias y vacaciones de tu equipo' },
  'organigrama': { ico: '🗂', col: '61,127,255', desc: 'Estructura y personas a cargo' },
  'sanciones-equipo': { ico: '⚠️', col: '239,68,68', desc: 'Solicitá y seguí sanciones de tu equipo' },
  'evaluaciones-equipo': { ico: '📈', col: '94,194,255', desc: 'Evaluá el desempeño de tu equipo' },
};
const fallback = { ico: '▸', col: '92,104,128', desc: '' };

function Reloj() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const fecha = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent2)' }}>{hora}</div>
      <div className="muted" style={{ textTransform: 'capitalize' }}>{fecha}</div>
    </div>
  );
}

interface Cumple { nom: string; empresa: string; lugar?: string; fecha: string; diasHasta: number; edad?: number | null }
const inic = (nom: string) => String(nom || '').split(',')[0].trim().substring(0, 2).toUpperCase();
const primerApe = (nom: string) => { const ape = nom.split(',')[0]?.trim() || ''; const n = nom.split(',')[1]?.trim().split(' ')[0] || ''; return `${n} ${ape}`.trim(); };

function Cumpleanios() {
  const [items, setItems] = useState<Cumple[]>([]);
  useEffect(() => { api.get<Cumple[]>('/empleados/cumpleanios').then(setItems).catch(() => {}); }, []);
  const hoy = items.filter((c) => c.diasHasta === 0);
  const proximos = items.filter((c) => c.diasHasta > 0).slice(0, 5);
  if (!items.length) return null;
  const etiqueta = (c: Cumple) => c.diasHasta <= 7 ? `en ${c.diasHasta} día${c.diasHasta !== 1 ? 's' : ''}` : c.fecha;
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 22 }}>
      {hoy.length > 0 ? (
        <>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,146,60,.06))', borderBottom: '1px solid rgba(245,158,11,.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--yellow)' }}>{hoy.length === 1 ? '¡Hoy cumple años un compañero!' : `¡Hoy cumplen años ${hoy.length} compañeros!`}</span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hoy.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 'var(--r)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(245,158,11,.35),rgba(251,146,60,.35))', border: '1px solid rgba(245,158,11,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--yellow)', flexShrink: 0 }}>{inic(c.nom)}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{primerApe(c.nom)}{c.edad ? ` · cumple ${c.edad}` : ''}</div><div className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c.empresa}{c.lugar ? ` · ${c.lugar}` : ''}</div></div>
                <span style={{ fontSize: 22 }}>🎂</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: '12px 16px', borderBottom: proximos.length ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎂</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Cumpleaños</span>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>Hoy no hay cumpleaños</span>
        </div>
      )}
      {proximos.length > 0 && (
        <>
          {hoy.length > 0 && <div className="sb-group-label" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: '10px 16px' }}>Próximos cumpleaños</div>}
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {proximos.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--t3)', flexShrink: 0 }}>{inic(c.nom)}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{primerApe(c.nom)}</div><div className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{c.empresa}{c.lugar ? ` · ${c.lugar}` : ''}</div></div>
                <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>{etiqueta(c)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const groups = groupsForRole(user?.role || 'employee').filter((g) => g.items.some((it) => it.ready));
  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = (user?.nom || '').split(',')[1]?.trim() || (user?.nom || '').split(' ')[0] || '';

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{saludo}{nombre ? `, ${nombre}` : ''} 👋</h2>
          <div className="muted" style={{ fontSize: 13 }}>¿Qué querés hacer hoy?</div>
        </div>
        <Reloj />
      </div>

      <Cumpleanios />

      {groups.map((g) => (
        <div key={g.panel} style={{ marginBottom: 26 }}>
          <div className="sb-group-label" style={{ padding: '0 0 10px' }}>{g.panel}</div>
          <div className="home-grid">
            {g.items.filter((it) => it.ready).slice().sort((a, b) => a.label.localeCompare(b.label, 'es')).map((it) => {
              const m = META[it.key] || fallback;
              return (
                <a key={it.key} className="home-card" onClick={() => nav(`/m/${it.key}`)}>
                  <div className="home-ico" style={{ background: `rgba(${m.col},.1)`, border: `1px solid rgba(${m.col},.3)` }}>{m.ico}</div>
                  <div>
                    <div className="home-t">{it.label}</div>
                    <div className="home-d">{m.desc}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
