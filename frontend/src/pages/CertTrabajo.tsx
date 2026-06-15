import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { imprimirCertificado, CertData } from '../lib/certificado';

interface Pedido { id: number; destinatario?: string; campos: Record<string, boolean>; estado: string; motivo?: string; created_at: string; }
const CAMPOS = [
  { k: 'fecha_ingreso', l: 'Fecha de ingreso', def: true },
  { k: 'antiguedad', l: 'Antigüedad', def: true },
  { k: 'categoria', l: 'Categoría / cargo', def: false },
  { k: 'condicion', l: 'Condición', def: false },
  { k: 'lugar_trabajo', l: 'Lugar de trabajo', def: false },
  { k: 'remuneracion', l: 'Remuneración bruta mensual', def: false },
];
const estadoColor = (e: string) => e === 'generado' ? 'var(--green)' : e === 'rechazado' ? 'var(--red)' : 'var(--yellow)';

export default function CertTrabajo() {
  const [items, setItems] = useState<Pedido[]>([]);
  const [destinatario, setDestinatario] = useState('');
  const [campos, setCampos] = useState<Record<string, boolean>>(Object.fromEntries(CAMPOS.map((c) => [c.k, c.def])));
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function load() { try { setItems(await api.get<Pedido[]>('/certificados/mias')); } catch (e: any) { setMsg({ t: e.message, ok: false }); } }
  useEffect(() => { load(); }, []);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    try { await api.post('/certificados', { destinatario, campos }); setMsg({ t: 'Solicitud enviada a RR.HH.', ok: true }); setDestinatario(''); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  async function imprimir(id: number) {
    try { imprimirCertificado(await api.get<CertData>(`/certificados/${id}/datos`)); } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }

  return (
    <>
      <form className="card" style={{ marginBottom: 18 }} onSubmit={solicitar}>
        <h3 style={{ marginTop: 0 }}>Solicitar certificado</h3>
        <div className="field" style={{ marginBottom: 10 }}><label>Destinatario (opcional — ej. banco, organismo)</label><input className="input" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} /></div>
        <div className="muted" style={{ marginBottom: 6 }}>Siempre incluye: nombre, DNI, CUIL, legajo y empresa. Campos adicionales:</div>
        <div className="grid2" style={{ marginBottom: 12 }}>
          {CAMPOS.map((c) => (
            <label key={c.k} className="row muted" style={{ gap: 6 }}>
              <input type="checkbox" checked={!!campos[c.k]} onChange={(e) => setCampos({ ...campos, [c.k]: e.target.checked })} /> {c.l}
            </label>
          ))}
        </div>
        {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
        <button className="btn">Solicitar</button>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Fecha</th><th>Destinatario</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                <td>{p.destinatario || '—'}</td>
                <td><span className="badge" style={{ color: estadoColor(p.estado) }}>{p.estado}</span>{p.estado === 'rechazado' && p.motivo ? <span className="muted"> · {p.motivo}</span> : ''}</td>
                <td style={{ textAlign: 'right' }}>{p.estado === 'generado' && <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => imprimir(p.id)}>🖨 Imprimir</button>}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>No solicitaste certificados.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
