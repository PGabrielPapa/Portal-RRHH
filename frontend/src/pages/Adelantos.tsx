import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Anticipo { id: number; monto: number; motivo?: string; cuotas: number; cuota_desde?: string; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; resuelto_por?: string; }

const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const colorEstado = (e: string) => e === 'aprobado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function Adelantos() {
  const { key } = useParams();
  const modoMios = key === 'anticipos';   // personal vs aprobaciones
  const puedeAprobar = !modoMios;
  const [items, setItems] = useState<Anticipo[]>([]);
  const [f, setF] = useState<Record<string, string>>({ cuotas: '1' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const proxMes = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const [aprob, setAprob] = useState<Record<number, { cuotas: string; cuotaDesde: string }>>({});

  async function load() { try { setItems(await api.get<Anticipo[]>(modoMios ? '/anticipos/mias' : '/anticipos')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key]);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/anticipos', { monto: f.monto, motivo: f.motivo, cuotas: f.cuotas }); setF({ cuotas: '1' }); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function resolver(a: Anticipo, estado: string) {
    try {
      const cfg = aprob[a.id] || { cuotas: String(a.cuotas || 1), cuotaDesde: proxMes };
      const body: any = { estado };
      if (estado === 'aprobado') { body.cuotas = Number(cfg.cuotas) || 1; body.cuotaDesde = cfg.cuotaDesde || proxMes; }
      await api.patch(`/anticipos/${a.id}`, body); load();
    } catch (e: any) { setErr(e.message); }
  }
  const setAp = (id: number, k: string, v: string, a: Anticipo) => { const cur = aprob[id] || { cuotas: String(a.cuotas || 1), cuotaDesde: proxMes }; setAprob({ ...aprob, [id]: { ...cur, [k]: v } }); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{modoMios ? 'Adelantos' : 'Aprobaciones — adelantos'}</h2>

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
            <th>Monto</th><th>Cuotas</th><th>1ª cuota</th><th>Motivo</th><th>Fecha</th><th>Estado</th>{puedeAprobar && <th></th>}
          </tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                {puedeAprobar && <td>{a.nom} <span className="muted">({a.leg_num} · {a.empresa})</span></td>}
                <td>{money(a.monto)}</td>
                <td>{puedeAprobar && a.estado === 'pendiente'
                  ? <input className="input" style={{ width: 60 }} type="number" min="1" value={(aprob[a.id]?.cuotas) ?? String(a.cuotas || 1)} onChange={(e) => setAp(a.id, 'cuotas', e.target.value, a)} />
                  : a.cuotas}</td>
                <td>{puedeAprobar && a.estado === 'pendiente'
                  ? <input className="input" style={{ width: 110 }} type="month" value={(aprob[a.id]?.cuotaDesde) ?? proxMes} onChange={(e) => setAp(a.id, 'cuotaDesde', e.target.value, a)} />
                  : (a.cuota_desde || '—')}</td>
                <td>{a.motivo || '—'}</td>
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
            {!items.length && <tr><td colSpan={puedeAprobar ? 8 : 6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin adelantos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
