import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { bancoDesdeCBU, validarCBU } from '../lib/cbu';

interface Cbu { id: number; cbu: string; banco?: string; alias?: string; titular?: string; porcentaje: number; activo: boolean; vigencia_desde?: string; vigencia_hasta?: string; }
interface Resp { items: Cbu[]; historial: Cbu[]; sumaActivos: number; }

const fmtCbu = (c: string) => (c || '').replace(/(.{4})/g, '$1 ').trim();
const fmtFecha = (s?: string) => s ? new Date(s).toLocaleDateString('es-AR') : '—';

export default function MisCbus() {
  const [items, setItems] = useState<Cbu[]>([]);
  const [historial, setHistorial] = useState<Cbu[]>([]);
  const [suma, setSuma] = useState(0);
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editPct, setEditPct] = useState('');

  async function load() {
    try { const r = await api.get<Resp>('/cbus'); setItems(r.items); setHistorial(r.historial || []); setSuma(r.sumaActivos); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const disponible = Math.max(0, Math.round((100 - suma) * 100) / 100);
  const cbuVal = useMemo(() => f.cbu ? validarCBU(f.cbu) : null, [f.cbu]);
  const bancoAuto = useMemo(() => bancoDesdeCBU(f.cbu || ''), [f.cbu]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api.post('/cbus', { cbu: f.cbu, banco: f.banco || bancoAuto, alias: f.alias, titular: f.titular, porcentaje: Number(f.porcentaje) });
      setF({}); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function toggle(c: Cbu) { setErr(''); try { await api.patch(`/cbus/${c.id}/activo`, { activo: !c.activo }); load(); } catch (e: any) { setErr(e.message); } }
  async function quitar(c: Cbu) { setErr(''); try { await api.del(`/cbus/${c.id}`); load(); } catch (e: any) { setErr(e.message); } }
  async function guardarPct(c: Cbu) { setErr(''); try { await api.patch(`/cbus/${c.id}`, { porcentaje: Number(editPct) }); setEditId(null); load(); } catch (e: any) { setErr(e.message); } }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const sumaOk = Math.abs(suma - 100) < 0.01;

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mis CBUs</h2>
      <div className="card" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.6 }}>
        💡 Podés <strong>repartir tu sueldo entre varias cuentas</strong> indicando el porcentaje del neto que va a cada una.
        Los porcentajes de las cuentas activas deben sumar 100%.
      </div>
      {items.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: '8px 14px', fontSize: 13,
          background: sumaOk ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
          border: `1px solid ${sumaOk ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
          color: sumaOk ? 'var(--green)' : 'var(--red)' }}>
          {sumaOk ? '✓ Distribución completa: 100%' : `⚠ Los porcentajes activos suman ${suma}% — debés ajustar para que sumen 100%`}
        </div>
      )}

      <form className="card" style={{ marginBottom: 18 }} onSubmit={add}>
        <h3 style={{ marginTop: 0 }}>Agregar cuenta</h3>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field">
            <label>CBU (22 dígitos) *</label>
            <input className="input" maxLength={22} inputMode="numeric" value={f.cbu || ''} onChange={(e) => setF({ ...f, cbu: e.target.value.replace(/\D/g, '') })} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
            {f.cbu && (
              <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                Banco: <strong>{bancoAuto || '—'}</strong>
                {cbuVal && (cbuVal.ok
                  ? <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ CBU válido</span>
                  : <span style={{ color: 'var(--yellow)', marginLeft: 8 }}>⚠ {cbuVal.error}</span>)}
              </div>
            )}
          </div>
          <div className="field"><label>Banco (autodetectado)</label><input className="input" value={f.banco ?? bancoAuto} onChange={set('banco')} placeholder={bancoAuto} /></div>
          <div className="field"><label>Alias</label><input className="input" value={f.alias || ''} onChange={set('alias')} placeholder="ej: SUELDO.GALICIA" /></div>
          <div className="field"><label>Titular</label><input className="input" value={f.titular || ''} onChange={set('titular')} /></div>
          <div className="field"><label>Porcentaje del neto * (disponible: {disponible}%)</label>
            <input className="input" type="number" step="0.01" min="0.01" max="100" value={f.porcentaje || ''} onChange={set('porcentaje')} placeholder={String(disponible)} /></div>
        </div>
        {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
        <button className="btn" disabled={busy || !f.cbu || !f.porcentaje || (cbuVal ? !cbuVal.ok : false)}>{busy ? 'Guardando…' : '+ Agregar cuenta'}</button>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>CBU</th><th>Banco</th><th>Alias</th><th>Titular</th><th>% Acreditación</th><th>Vigente desde</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtCbu(c.cbu)}</td>
                <td>{c.banco || '—'}</td><td>{c.alias || '—'}</td><td>{c.titular || '—'}</td>
                <td>
                  {editId === c.id
                    ? <span className="row" style={{ gap: 4 }}>
                        <input className="input" style={{ width: 80 }} type="number" step="0.01" min="0.01" max="100" value={editPct} onChange={(e) => setEditPct(e.target.value)} />
                        <button className="btn" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => guardarPct(c)}>✓</button>
                        <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => setEditId(null)}>✕</button>
                      </span>
                    : <span style={{ fontFamily: 'monospace', cursor: 'pointer' }} onClick={() => { setEditId(c.id); setEditPct(String(c.porcentaje)); }} title="Editar">
                        {Number(c.porcentaje).toFixed(Number(c.porcentaje) % 1 === 0 ? 0 : 2)}% ✎
                      </span>}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmtFecha(c.vigencia_desde)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => toggle(c)}>Desactivar</button>
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => quitar(c)}>✕ Quitar</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>No tenés cuentas activas.</td></tr>}
          </tbody>
        </table>
      </div>

      {historial.length > 0 && <>
        <h3 style={{ marginTop: 22, marginBottom: 8 }}>Historial de cuentas</h3>
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>CBU</th><th>Banco</th><th>%</th><th>Vigencia</th><th></th></tr></thead>
            <tbody>
              {historial.map((c) => (
                <tr key={c.id} style={{ opacity: 0.7 }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtCbu(c.cbu)}</td>
                  <td>{c.banco || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{Number(c.porcentaje).toFixed(0)}%</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmtFecha(c.vigencia_desde)} → {fmtFecha(c.vigencia_hasta)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => toggle(c)}>Reactivar</button>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => quitar(c)}>✕ Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </>
  );
}
