import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Anticipo { id: number; monto: number; motivo?: string; cuotas: number; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; resuelto_por?: string; }

const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const colorEstado = (e: string) => e === 'aprobado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function Adelantos() {
  const { user } = useAuth();
  const puedeAprobar = ['manager', 'rrhh', 'admin'].includes(user?.role || '');
  const [items, setItems] = useState<Anticipo[]>([]);
  const [f, setF] = useState<Record<string, string>>({ cuotas: '1' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() { try { setItems(await api.get<Anticipo[]>('/anticipos')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/anticipos', { monto: f.monto, motivo: f.motivo, cuotas: f.cuotas }); setF({ cuotas: '1' }); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function resolver(a: Anticipo, estado: string) {
    try { await api.patch(`/anticipos/${a.id}`, { estado }); load(); } catch (e: any) { setErr(e.message); }
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Adelantos</h2>

      {!puedeAprobar && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={solicitar}>
          <h3 style={{ marginTop: 0 }}>Solicitar adelanto</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Monto *</label><input className="input" value={f.monto || ''} onChange={set('monto')} /></div>
            <div className="field"><label>Cuotas</label><input className="input" value={f.cuotas || ''} onChange={set('cuotas')} /></div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Motivo</label><textarea className="input" rows={2} value={f.motivo || ''} onChange={set('motivo')} /></div>
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          <button className="btn" disabled={busy || !f.monto}>{busy ? 'Enviando…' : 'Solicitar'}</button>
        </form>
      )}
      {puedeAprobar && err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>
            {puedeAprobar && <th>Empleado</th>}
            <th>Monto</th><th>Cuotas</th><th>Motivo</th><th>Fecha</th><th>Estado</th>{puedeAprobar && <th></th>}
          </tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                {puedeAprobar && <td>{a.nom} <span className="muted">({a.leg_num} · {a.empresa})</span></td>}
                <td>{money(a.monto)}</td><td>{a.cuotas}</td><td>{a.motivo || '—'}</td>
                <td className="muted">{new Date(a.created_at).toLocaleDateString('es-AR')}</td>
                <td><span className="badge" style={{ color: colorEstado(a.estado) }}>{a.estado}</span></td>
                {puedeAprobar && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {a.estado === 'pendiente' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(a, 'aprobado')}>Aprobar</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(a, 'rechazado')}>Rechazar</button>
                  </> : <span className="muted" style={{ fontSize: 12 }}>{a.resuelto_por ? `por ${a.resuelto_por}` : ''}</span>}
                </td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={puedeAprobar ? 7 : 5} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin adelantos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
