import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import MiBanner from '../components/MiBanner';
import { bancoDesdeCBU, validarCBU } from '../lib/cbu';

interface Cbu { id: number; cbu: string; banco?: string; alias?: string; titular?: string; porcentaje: number; activo: boolean; vigencia_desde?: string; vigencia_hasta?: string; }
interface Resp { items: Cbu[]; historial: Cbu[]; sumaActivos: number; }
interface Row { id?: number; cbu: string; banco: string; alias: string; titular: string; porcentaje: string; }

const fmtCbu = (c: string) => (c || '').replace(/(.{4})/g, '$1 ').trim();
const fmtFecha = (s?: string) => s ? new Date(s).toLocaleDateString('es-AR') : '—';

export default function MisCbus() {
  const [rows, setRows] = useState<Row[]>([]);
  const [historial, setHistorial] = useState<Cbu[]>([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api.get<Resp>('/cbus');
      setRows(r.items.map((c) => ({ id: c.id, cbu: c.cbu, banco: c.banco || '', alias: c.alias || '', titular: c.titular || '', porcentaje: String(c.porcentaje) })));
      setHistorial(r.historial || []);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const suma = useMemo(() => Math.round(rows.reduce((a, r) => a + (Number(r.porcentaje) || 0), 0) * 100) / 100, [rows]);
  const sumaOk = Math.abs(suma - 100) < 0.01;
  const cbusOk = rows.length > 0 && rows.every((r) => validarCBU(r.cbu).ok && Number(r.porcentaje) > 0);
  const puedeGuardar = sumaOk && cbusOk;

  const upd = (i: number, k: keyof Row, v: string) => setRows((p) => p.map((r, j) => j === i ? { ...r, [k]: v, ...(k === 'cbu' ? { banco: r.banco || bancoDesdeCBU(v) || '' } : {}) } : r));
  const addRow = () => setRows((p) => [...p, { cbu: '', banco: '', alias: '', titular: '', porcentaje: '' }]);
  const delRow = (i: number) => setRows((p) => p.filter((_, j) => j !== i));
  const repartirParejo = () => setRows((p) => {
    if (!p.length) return p;
    const base = Math.floor(10000 / p.length) / 100;            // 2 decimales hacia abajo
    return p.map((r, i) => ({ ...r, porcentaje: String(i === p.length - 1 ? Math.round((100 - base * (p.length - 1)) * 100) / 100 : base) }));
  });

  async function guardar() {
    setErr(''); setOk(''); setBusy(true);
    try {
      await api.put('/cbus/distribucion', { cuentas: rows.map((r) => ({ id: r.id, cbu: r.cbu, banco: r.banco, alias: r.alias, titular: r.titular, porcentaje: Number(r.porcentaje) })) });
      setOk('Distribución guardada (100% de acreditación).'); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <MiBanner />
      <div className="card" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.6 }}>
        💡 Repartí tu sueldo entre tus cuentas indicando el porcentaje del neto que va a cada una.
        <strong> La suma de las cuentas activas debe ser siempre 100%</strong>: el sistema no guarda una distribución que no sume 100%.
      </div>

      <div className="card" style={{ marginBottom: 14, padding: '8px 14px', fontSize: 13,
        background: sumaOk ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
        border: `1px solid ${sumaOk ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
        color: sumaOk ? 'var(--green)' : 'var(--red)' }}>
        {sumaOk ? '✓ Distribución completa: 100%' : `⚠ Las cuentas suman ${suma}% — ajustá para que sumen 100% (faltan ${Math.round((100 - suma) * 100) / 100}%)`}
      </div>

      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>CBU (22 dígitos)</th><th>Banco</th><th>Alias</th><th>Titular</th><th style={{ width: 110 }}>% acreditación</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const v = r.cbu ? validarCBU(r.cbu) : null;
              return (
                <tr key={i}>
                  <td>
                    <input className="input" maxLength={22} inputMode="numeric" style={{ fontFamily: 'monospace', letterSpacing: 1, minWidth: 220 }}
                      value={r.cbu} onChange={(e) => upd(i, 'cbu', e.target.value.replace(/\D/g, ''))} />
                    {r.cbu && v && !v.ok && <div style={{ color: 'var(--yellow)', fontSize: 11 }}>⚠ {v.error}</div>}
                  </td>
                  <td><input className="input" style={{ minWidth: 120 }} value={r.banco} onChange={(e) => upd(i, 'banco', e.target.value)} placeholder={bancoDesdeCBU(r.cbu) || ''} /></td>
                  <td><input className="input" style={{ minWidth: 110 }} value={r.alias} onChange={(e) => upd(i, 'alias', e.target.value)} /></td>
                  <td><input className="input" style={{ minWidth: 110 }} value={r.titular} onChange={(e) => upd(i, 'titular', e.target.value)} /></td>
                  <td><input className="input" type="number" step="0.01" min="0.01" max="100" style={{ width: 90 }} value={r.porcentaje} onChange={(e) => upd(i, 'porcentaje', e.target.value)} /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => delRow(i)}>✕</button></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 18 }}>No tenés cuentas. Agregá una al 100% o repartí entre varias.</td></tr>}
          </tbody>
        </table>
      </div>

      {err && <div className="err" style={{ marginBottom: 10 }}>⚠ {err}</div>}
      {ok && <div className="muted" style={{ color: 'var(--green)', marginBottom: 10 }}>✓ {ok}</div>}
      <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn ghost" onClick={addRow}>+ Agregar cuenta</button>
        {rows.length > 1 && <button className="btn ghost" onClick={repartirParejo}>Repartir en partes iguales</button>}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={guardar} disabled={busy || !puedeGuardar} title={!sumaOk ? 'Debe sumar 100%' : (!cbusOk ? 'Revisá los CBU y porcentajes' : '')}>{busy ? 'Guardando…' : 'Guardar distribución (100%)'}</button>
      </div>

      {historial.length > 0 && <>
        <h3 style={{ marginTop: 6, marginBottom: 8 }}>Historial de cuentas</h3>
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>CBU</th><th>Banco</th><th>%</th><th>Vigencia</th></tr></thead>
            <tbody>
              {historial.map((c) => (
                <tr key={c.id} style={{ opacity: 0.7 }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtCbu(c.cbu)}</td>
                  <td>{c.banco || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{Number(c.porcentaje).toFixed(0)}%</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmtFecha(c.vigencia_desde)} → {fmtFecha(c.vigencia_hasta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </>
  );
}
