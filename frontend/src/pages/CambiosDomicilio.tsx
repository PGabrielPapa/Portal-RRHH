import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface C { id: number; calle?: string; nro?: string; dom_anterior?: string; dom_nuevo?: string; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; resuelto_por?: string; }
const estadoColor = (e: string) => e === 'aprobado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function CambiosDomicilio() {
  const [items, setItems] = useState<C[]>([]);
  const [q, setQ] = useState(''); const [estado, setEstado] = useState('');
  const [err, setErr] = useState('');
  async function load() { try { const p = new URLSearchParams(); if (q) p.set('q', q); if (estado) p.set('estado', estado); setItems(await api.get<C[]>(`/cambios-domicilio?${p}`)); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, estado]);
  async function resolver(c: C, est: string) { try { await api.patch(`/cambios-domicilio/${c.id}`, { estado: est }); load(); } catch (e: any) { setErr(e.message); } }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Cambios de domicilio</h2>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 180 }} value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos los estados</option><option value="pendiente">Pendientes</option><option value="aprobado">Aprobados</option><option value="rechazado">Rechazados</option></select>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Empresa</th><th>Domicilio anterior</th><th>Nuevo domicilio</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.nom} <span className="muted">({c.leg_num})</span></td><td>{c.empresa}</td>
                <td className="muted">{c.dom_anterior || '—'}</td><td>{c.dom_nuevo}</td>
                <td><span className="badge" style={{ color: estadoColor(c.estado) }}>{c.estado}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{c.estado === 'pendiente' ? <>
                  <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => resolver(c, 'aprobado')}>Aprobar</button>
                  <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => resolver(c, 'rechazado')}>Rechazar</button>
                </> : <span className="muted" style={{ fontSize: 12 }}>{c.resuelto_por ? `por ${c.resuelto_por}` : ''}</span>}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin cambios de domicilio.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
