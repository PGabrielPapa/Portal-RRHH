import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Nov { id: number; accion: string; detalle?: string; leida: boolean; created_at: string; nom: string; leg_num: string; empresa: string; }
const fmt = (d: string) => new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const accionLbl: Record<string, string> = { alta: 'Alta de cuenta', edicion: 'Edición', activacion: 'Activación', desactivacion: 'Desactivación', baja: 'Baja de cuenta' };
const accionColor = (a: string) => a === 'alta' ? 'var(--green)' : a === 'baja' || a === 'desactivacion' ? 'var(--red)' : 'var(--accent2)';

export default function CbuNovedades() {
  const [items, setItems] = useState<Nov[]>([]);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [err, setErr] = useState('');

  async function load() { setErr(''); try { setItems(await api.get<Nov[]>(`/cbus/novedades${soloNoLeidas ? '?noLeidas=1' : ''}`)); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [soloNoLeidas]);

  async function leer(id: number) { try { await api.patch(`/cbus/novedades/${id}/leida`, {}); load(); } catch (e: any) { setErr(e.message); } }
  async function leerTodas() { try { await api.post('/cbus/novedades/leer-todas', {}); load(); } catch (e: any) { setErr(e.message); } }
  const noLeidas = items.filter((n) => !n.leida).length;

  return (
    <>
      <h2 style={{ marginTop: 0 }}>CBU — novedades</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Avisos cuando un empleado da de alta, modifica o quita una cuenta bancaria, para validar antes de la próxima acreditación.</p>
      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <label className="row" style={{ gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={soloNoLeidas} onChange={(e) => setSoloNoLeidas(e.target.checked)} /> Solo sin leer</label>
        {noLeidas > 0 && <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={leerTodas}>✓ Marcar todas como leídas ({noLeidas})</button>}
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Empresa</th><th>Acción</th><th>Detalle</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} style={{ background: n.leida ? undefined : 'rgba(61,127,255,.04)' }}>
                <td>{n.nom} <span className="muted">({n.leg_num})</span></td><td>{n.empresa}</td>
                <td><span className="badge" style={{ color: accionColor(n.accion) }}>{accionLbl[n.accion] || n.accion}</span></td>
                <td className="muted">{n.detalle || '—'}</td><td className="muted">{fmt(n.created_at)}</td>
                <td style={{ textAlign: 'right' }}>{!n.leida && <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12 }} onClick={() => leer(n.id)}>Marcar leída</button>}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin novedades.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
