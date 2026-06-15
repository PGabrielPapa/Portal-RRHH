import { useNavigate } from 'react-router-dom';
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
  'mis-sanciones': { ico: '⚠️', col: '239,68,68', desc: 'Consultá tus sanciones y notificaciones' },
  'mis-evaluaciones': { ico: '📈', col: '94,194,255', desc: 'Consultá tus evaluaciones de desempeño' },
  'mis-familiares': { ico: '👨‍👩‍👧', col: '94,194,255', desc: 'Cargá y gestioná tu grupo familiar' },
};
const fallback = { ico: '▸', col: '92,104,128', desc: '' };

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const groups = groupsForRole(user?.role || 'employee').filter((g) => g.items.some((it) => it.ready));
  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = (user?.nom || '').split(',')[1]?.trim() || (user?.nom || '').split(' ')[0] || '';

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: 0 }}>{saludo}{nombre ? `, ${nombre}` : ''} 👋</h2>
        <div className="muted" style={{ fontSize: 13 }}>¿Qué querés hacer hoy?</div>
      </div>

      {groups.map((g) => (
        <div key={g.panel} style={{ marginBottom: 26 }}>
          <div className="sb-group-label" style={{ padding: '0 0 10px' }}>{g.panel}</div>
          <div className="home-grid">
            {g.items.filter((it) => it.ready).map((it) => {
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
