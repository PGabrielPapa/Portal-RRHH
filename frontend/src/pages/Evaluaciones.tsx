import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import EmpleadoPicker from '../components/EmpleadoPicker';
import { EVAL_ITEMS, EVAL_LABELS } from '../lib/evalItems';

interface V { id: number; periodo: string; tipo?: string; calificacion?: string; comentarios?: string; promedio?: number; datos?: any; nom?: string; leg_num?: string; empresa?: string; created_by?: string; }
const TIPOS = ['Anual', 'Período de prueba', 'Semestral'];
const CALIF = ['Excelente', 'Muy bueno', 'Bueno', 'Regular', 'Insuficiente'];

export default function Evaluaciones() {
  const { key } = useParams();
  const modoMias = key === 'mis-evaluaciones';
  const esRRHH = key === 'evaluaciones';
  const titulo = modoMias ? 'Mis evaluaciones' : esRRHH ? 'Evaluaciones — RR.HH.' : 'Evaluaciones del equipo';

  const [items, setItems] = useState<V[]>([]);
  const [q, setQ] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'Anual', calificacion: 'Bueno', periodo: `Anual ${new Date().getFullYear()}` });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [scores, setScores] = useState<Record<string, Record<number, number>>>({});
  const setScore = (cat: string, i: number, v: number) => setScores((p) => ({ ...p, [cat]: { ...(p[cat] || {}), [i]: v } }));
  const promedio = (() => { const a: number[] = []; Object.values(scores).forEach((c) => Object.values(c).forEach((v) => v > 0 && a.push(v))); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100) / 100 : 0; })();
  const puedeRegistrar = esRRHH || key === 'evaluaciones-equipo';  // gerente y RR.HH. registran

  async function load() {
    try {
      if (modoMias) { setItems(await api.get<V[]>('/evaluaciones/mias')); return; }
      const p = new URLSearchParams(); if (q) p.set('q', q); if (empresa) p.set('empresa', empresa);
      setItems(await api.get<V[]>(`/evaluaciones?${p}`));
    } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  useEffect(() => { if (esRRHH) api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, [esRRHH]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key, q, empresa]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); if (!emp) return;
    try { await api.post('/evaluaciones', { empleadoId: emp.id, periodo: f.periodo, tipo: f.tipo, calificacion: f.calificacion, comentarios: f.comentarios, datos: { items: scores } }); setMsg({ t: 'Evaluación registrada', ok: true }); setEmp(null); setScores({}); load(); }
    catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      {puedeRegistrar && (
        <form className="card" style={{ marginBottom: 18 }} onSubmit={registrar}>
          <h3 style={{ marginTop: 0 }}>Registrar evaluación</h3>
          <div className="field" style={{ marginBottom: 10 }}><label>Empleado *</label><EmpleadoPicker onSelect={setEmp} /></div>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Período *</label><input className="input" value={f.periodo || ''} onChange={set('periodo')} /></div>
            <div className="field"><label>Tipo</label><select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Calificación</label><select className="input" value={f.calificacion} onChange={set('calificacion')}>{CALIF.map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Matriz de competencias (1 a 5) {promedio > 0 ? `· promedio ${promedio.toFixed(2)} (${EVAL_LABELS[Math.round(promedio)] || ''})` : ''}</div>
            {Object.entries(EVAL_ITEMS).map(([cat, def]) => (
              <details key={cat} style={{ marginBottom: 6 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--accent2)' }}>{def.label}</summary>
                <table style={{ width: '100%', fontSize: 12, marginTop: 6 }}><tbody>
                  {def.items.map((it, i) => (
                    <tr key={i}><td style={{ padding: '2px 6px' }}>{it}</td>
                      <td style={{ padding: '2px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} title={EVAL_LABELS[n]} style={{ marginLeft: 6, cursor: 'pointer' }}><input type="radio" name={`${cat}-${i}`} checked={(scores[cat]?.[i] || 0) === n} onChange={() => setScore(cat, i, n)} /> {n}</label>
                        ))}
                      </td></tr>
                  ))}
                </tbody></table>
              </details>
            ))}
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Comentarios</label><textarea className="input" rows={2} value={f.comentarios || ''} onChange={set('comentarios')} /></div>
          {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 8 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
          <button className="btn" disabled={!emp || !f.periodo}>Registrar</button>
        </form>
      )}
      {!puedeRegistrar && msg && !msg.ok && <div className="err" style={{ marginBottom: 12 }}>⚠ {msg.t}</div>}

      {!modoMias && (
        <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
          {esRRHH && <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Todas las empresas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>{!modoMias && <th>Empleado</th>}{esRRHH && <th>Empresa</th>}<th>Período</th><th>Tipo</th><th>Calificación</th><th>Promedio</th><th>Comentarios</th></tr></thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id}>{!modoMias && <td>{v.nom} <span className="muted">({v.leg_num})</span></td>}{esRRHH && <td>{v.empresa}</td>}<td>{v.periodo}</td><td>{v.tipo || '—'}</td><td>{v.calificacion || '—'}</td><td style={{ fontFamily: 'monospace' }}>{v.promedio != null ? Number(v.promedio).toFixed(2) : '—'}</td><td>{v.comentarios || '—'}</td></tr>
            ))}
            {!items.length && <tr><td colSpan={modoMias ? 4 : (esRRHH ? 6 : 5)} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin evaluaciones.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
