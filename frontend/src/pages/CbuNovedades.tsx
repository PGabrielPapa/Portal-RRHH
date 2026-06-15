import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Nov { id: number; accion: string; detalle?: string; leida: boolean; created_at: string; nom: string; leg_num: string; empresa: string; }
interface Incompleto { id: number; nom: string; leg_num: string; empresa: string; suma: number; falta: number; cuentas: number; }
const fmt = (d: string) => new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const accionLbl: Record<string, string> = { alta: 'Alta de cuenta', edicion: 'Edición', activacion: 'Activación', desactivacion: 'Desactivación', baja: 'Baja de cuenta' };
const accionColor = (a: string) => a === 'alta' ? 'var(--green)' : a === 'baja' || a === 'desactivacion' ? 'var(--red)' : 'var(--accent2)';

export default function CbuNovedades() {
  const [items, setItems] = useState<Nov[]>([]);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [err, setErr] = useState('');
  const [incompletos, setIncompletos] = useState<Incompleto[]>([]);

  async function load() { setErr(''); try { setItems(await api.get<Nov[]>(`/cbus/novedades${soloNoLeidas ? '?noLeidas=1' : ''}`)); } catch (e: any) { setErr(e.message); } }
  async function checkAcred() { try { setIncompletos(await api.get<Incompleto[]>('/cbus/incompletos')); } catch { /* */ } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [soloNoLeidas]);
  useEffect(() => { checkAcred(); }, []);

  async function leer(id: number) { try { await api.patch(`/cbus/novedades/${id}/leida`, {}); load(); } catch (e: any) { setErr(e.message); } }
  async function leerTodas() { try { await api.post('/cbus/novedades/leer-todas', {}); load(); } catch (e: any) { setErr(e.message); } }
  const noLeidas = items.filter((n) => !n.leida).length;

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Avisos cuando un empleado da de alta, modifica o quita una cuenta bancaria, para validar antes de la próxima acreditación.</p>
      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <label className="row" style={{ gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={soloNoLeidas} onChange={(e) => setSoloNoLeidas(e.target.checked)} /> Solo sin leer</label>
        {noLeidas > 0 && <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={leerTodas}>✓ Marcar todas como leídas ({noLeidas})</button>}
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ marginBottom: 14, padding: '10px 14px',
        background: incompletos.length ? 'rgba(239,68,68,.07)' : 'rgba(34,197,94,.06)',
        border: `1px solid ${incompletos.length ? 'rgba(239,68,68,.35)' : 'rgba(34,197,94,.25)'}` }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <strong style={{ color: incompletos.length ? 'var(--red)' : 'var(--green)' }}>
            {incompletos.length
              ? `⚠ Acreditación incompleta: ${incompletos.length} empleado(s) con cuentas activas que NO suman 100%`
              : '✓ Todos los empleados con cuentas activas tienen el 100% de acreditación'}
          </strong>
          <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={checkAcred}>↻ Re-verificar</button>
        </div>
        {incompletos.length > 0 && (
          <table style={{ width: '100%', fontSize: 13, marginTop: 8 }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Empleado</th><th style={{ textAlign: 'left' }}>Empresa</th><th style={{ textAlign: 'right' }}>Asignado</th><th style={{ textAlign: 'right' }}>Falta</th></tr></thead>
            <tbody>
              {incompletos.map((x) => (
                <tr key={x.id}>
                  <td>{x.nom} <span className="muted">({x.leg_num})</span></td>
                  <td>{x.empresa}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{x.suma}%</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{x.falta}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
