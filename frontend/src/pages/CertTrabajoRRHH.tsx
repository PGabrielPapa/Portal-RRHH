import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { imprimirCertificado, CertData } from '../lib/certificado';

interface Pedido { id: number; destinatario?: string; estado: string; created_at: string; nom?: string; leg_num?: string; empresa?: string; }
const estadoColor = (e: string) => e === 'generado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function CertTrabajoRRHH() {
  const [items, setItems] = useState<Pedido[]>([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() {
    try { const p = new URLSearchParams(); if (q) p.set('q', q); if (estado) p.set('estado', estado); setItems(await api.get<Pedido[]>(`/certificados?${p}`)); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, estado]);

  async function generar(p: Pedido) {
    try { await api.patch(`/certificados/${p.id}`, { estado: 'generado' }); imprimirCertificado(await api.get<CertData>(`/certificados/${p.id}/datos`)); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function rechazar(p: Pedido) {
    const motivo = prompt('Motivo del rechazo (opcional):') || '';
    try { await api.patch(`/certificados/${p.id}`, { estado: 'rechazado', motivo }); load(); } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function imprimir(id: number) { try { imprimirCertificado(await api.get<CertData>(`/certificados/${id}/datos`)); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }

  return (
    <>
      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 12 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 180 }} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option><option value="pendiente">Pendientes</option><option value="generado">Generados</option><option value="rechazado">Rechazados</option>
        </select>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Empresa</th><th>Destinatario</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.nom} <span className="muted">({p.leg_num})</span></td><td>{p.empresa}</td><td>{p.destinatario || '—'}</td>
                <td>{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                <td><span className="badge" style={{ color: estadoColor(p.estado) }}>{p.estado}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {p.estado === 'pendiente' ? <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => generar(p)}>Generar e imprimir</button>
                    <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => rechazar(p)}>Rechazar</button>
                  </> : p.estado === 'generado' ? <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => imprimir(p.id)}>🖨 Imprimir</button> : null}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
