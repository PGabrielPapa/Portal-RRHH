import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Tramo { desde: number; hasta: number | null; fijo: number; alicuota: number; }
interface Periodo {
  id?: number; periodo: string; vigenciaDesde: string; rg?: string;
  mniAnual: number; dedEspAnual: number; dedEsp2Anual: number;
  cargaConyugeAnual: number; cargaHijoAnual: number; cargaHijoIncAnual: number;
  escala: Tramo[];
}
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vacio = (): Periodo => ({ periodo: '', vigenciaDesde: '', rg: '', mniAnual: 0, dedEspAnual: 0, dedEsp2Anual: 0, cargaConyugeAnual: 0, cargaHijoAnual: 0, cargaHijoIncAnual: 0, escala: [] });

export default function GananciasParams() {
  const [items, setItems] = useState<Periodo[]>([]);
  const [edit, setEdit] = useState<Periodo | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function load() { try { setItems(await api.get<Periodo[]>('/ganancias/periodos')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); }, []);

  async function guardar() {
    setErr(''); setOk('');
    if (!edit) return;
    if (!edit.periodo || !edit.vigenciaDesde) { setErr('Período y vigencia desde son obligatorios.'); return; }
    try {
      if (edit.id) await api.put(`/ganancias/periodos/${edit.id}`, edit);
      else await api.post('/ganancias/periodos', edit);
      setOk('Parámetros guardados.'); setEdit(null); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function borrar(p: Periodo) { setErr(''); try { await api.del(`/ganancias/periodos/${p.id}`); load(); } catch (e: any) { setErr(e.message); } }

  const setF = (k: keyof Periodo, v: any) => setEdit({ ...(edit as Periodo), [k]: v });
  const setTr = (i: number, k: keyof Tramo, v: any) => { const e = { ...(edit as Periodo) }; e.escala = e.escala.map((t, j) => j === i ? { ...t, [k]: v === '' ? (k === 'hasta' ? null : 0) : Number(v) } : t); setEdit(e); };

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Parámetros de Ganancias</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Tablas del Impuesto a las Ganancias por período. La liquidación y el F.1357 toman la vigente según la fecha de pago.
        Actualizá estos valores con cada RG oficial sin tocar el código.
      </p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>✓ {ok}</div>}

      {!edit && (
        <>
          <button className="btn" style={{ marginBottom: 12 }} onClick={() => setEdit(vacio())}>+ Nuevo período</button>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table>
              <thead><tr><th>Período</th><th>Vigencia desde</th><th>RG</th><th className="n">MNI anual</th><th className="n">Ded. especial</th><th>Tramos</th><th></th></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.periodo}</strong></td>
                    <td>{p.vigenciaDesde?.slice(0, 10)}</td>
                    <td className="muted">{p.rg || '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>$ {$(p.mniAnual)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>$ {$(p.dedEspAnual)}</td>
                    <td>{p.escala?.length || 0}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => setEdit(JSON.parse(JSON.stringify(p)))}>✎ Editar</button>
                      <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrar(p)}>✕</button>
                    </td>
                  </tr>
                ))}
                {!items.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin períodos cargados.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {edit && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{edit.id ? `Editar ${edit.periodo}` : 'Nuevo período'}</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Período (etiqueta) *</label><input className="input" value={edit.periodo} onChange={(e) => setF('periodo', e.target.value)} placeholder="Ej: 2026-S2" /></div>
            <div className="field"><label>Vigencia desde *</label><input className="input" type="date" value={edit.vigenciaDesde?.slice(0, 10) || ''} onChange={(e) => setF('vigenciaDesde', e.target.value)} /></div>
            <div className="field"><label>RG / norma</label><input className="input" value={edit.rg || ''} onChange={(e) => setF('rg', e.target.value)} placeholder="Ej: RG ARCA 5628/2025" /></div>
            <div className="field"><label>Ganancia no imponible (MNI) anual</label><input className="input" type="number" value={edit.mniAnual} onChange={(e) => setF('mniAnual', Number(e.target.value))} /></div>
            <div className="field"><label>Deducción especial anual</label><input className="input" type="number" value={edit.dedEspAnual} onChange={(e) => setF('dedEspAnual', Number(e.target.value))} /></div>
            <div className="field"><label>Deducción especial 2° párr. anual</label><input className="input" type="number" value={edit.dedEsp2Anual} onChange={(e) => setF('dedEsp2Anual', Number(e.target.value))} /></div>
            <div className="field"><label>Carga cónyuge anual</label><input className="input" type="number" value={edit.cargaConyugeAnual} onChange={(e) => setF('cargaConyugeAnual', Number(e.target.value))} /></div>
            <div className="field"><label>Carga hijo anual</label><input className="input" type="number" value={edit.cargaHijoAnual} onChange={(e) => setF('cargaHijoAnual', Number(e.target.value))} /></div>
            <div className="field"><label>Carga hijo incapacitado anual</label><input className="input" type="number" value={edit.cargaHijoIncAnual} onChange={(e) => setF('cargaHijoIncAnual', Number(e.target.value))} /></div>
          </div>

          <h4 style={{ margin: '8px 0 6px' }}>Escala progresiva (Art. 94 LIG)</h4>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead><tr><th>Desde</th><th>Hasta (vacío = sin tope)</th><th>Cuota fija</th><th>Alícuota %</th><th></th></tr></thead>
              <tbody>
                {edit.escala.map((t, i) => (
                  <tr key={i}>
                    <td><input className="input" type="number" style={{ width: 130 }} value={t.desde} onChange={(e) => setTr(i, 'desde', e.target.value)} /></td>
                    <td><input className="input" type="number" style={{ width: 130 }} value={t.hasta ?? ''} onChange={(e) => setTr(i, 'hasta', e.target.value)} /></td>
                    <td><input className="input" type="number" style={{ width: 130 }} value={t.fijo} onChange={(e) => setTr(i, 'fijo', e.target.value)} /></td>
                    <td><input className="input" type="number" style={{ width: 80 }} value={t.alicuota} onChange={(e) => setTr(i, 'alicuota', e.target.value)} /></td>
                    <td><button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => setEdit({ ...edit, escala: edit.escala.filter((_, j) => j !== i) })}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setEdit({ ...edit, escala: [...edit.escala, { desde: 0, hasta: null, fijo: 0, alicuota: 0 }] })}>+ Agregar tramo</button>

          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={guardar}>Guardar parámetros</button>
            <button className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setEdit(null); setErr(''); }}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
