import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface A { id: number; actor_dni?: string; accion: string; detalle?: string; target?: string; created_at: string; }

export default function AdminAuditoria() {
  const [items, setItems] = useState<A[]>([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  async function load() { try { setItems(await api.get<A[]>(`/admin/auditoria?${q ? 'q=' + encodeURIComponent(q) : ''}`)); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Auditoría</h2>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 280 }} placeholder="Buscar acción, detalle o actor…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Fecha</th><th>Actor (DNI)</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="muted">{new Date(a.created_at).toLocaleString('es-AR')}</td>
                <td>{a.actor_dni || '—'}</td><td>{a.accion}</td><td>{a.detalle || '—'}{a.target ? ` (#${a.target})` : ''}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin registros de auditoría.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
