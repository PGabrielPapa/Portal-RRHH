import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Tramo { key: string; label: string; }
interface Cat { cat: string; label: string; nota?: string; tramos: Record<string, number>; }
interface Reg { key: string; label: string; desc?: string; monto: number; }
interface Escala {
  id: number; vigencia: string; mesLabel?: string; origen: string; porcentaje?: number | null; alcance: string; comentario?: string;
  tramos: Tramo[]; categorias: Cat[]; regionales: Reg[]; montos_titulo?: Record<string, number>;
}

const $ = (n: number) => (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fechaHoy = () => new Date().toISOString().slice(0, 10);

export default function Escalas() {
  const { user } = useAuth();
  const puedeEditar = user?.role === 'rrhh' || user?.role === 'admin';
  const [versiones, setVersiones] = useState<Escala[]>([]);
  const [activa, setActiva] = useState<Escala | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  // form incremento
  const [pct, setPct] = useState('');
  const [vig, setVig] = useState(fechaHoy());
  const [alcance, setAlcance] = useState('todas');
  const [coment, setComent] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const vs = await api.get<Escala[]>('/escala');
      setVersiones(vs);
      setActiva(await api.get<Escala>('/escala/activa'));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function aplicar(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      await api.post('/escala/incremento', { porcentaje: Number(pct), vigencia: vig, alcance, comentario: coment });
      setOk(`Incremento del ${pct}% aplicado con vigencia ${vig}`); setPct(''); setComent(''); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function borrar(id: number) { setErr(''); try { await api.del(`/escala/${id}`); load(); } catch (e: any) { setErr(e.message); } }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Escalas / convenios</h2>

      {activa && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div><strong>Escala vigente</strong> <span className="muted">· {activa.mesLabel || activa.vigencia} {activa.porcentaje ? `· +${activa.porcentaje}%` : '· inicial'}</span></div>
          </div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={{ textAlign: 'left', padding: '4px 8px' }}>Categoría</th>
                {activa.tramos.map((t) => <th key={t.key} style={{ textAlign: 'right', padding: '4px 8px' }}>{t.label}</th>)}
              </tr></thead>
              <tbody>
                {activa.categorias.map((c) => (
                  <tr key={c.cat}>
                    <td style={{ padding: '4px 8px', borderTop: '1px solid var(--border)' }}><strong>{c.cat}</strong> <span className="muted">{c.label}{c.nota ? ` · ${c.nota}` : ''}</span></td>
                    {activa.tramos.map((t) => <td key={t.key} style={{ padding: '4px 8px', borderTop: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>$ {$(c.tramos[t.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activa.regionales?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Gerencias regionales</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {activa.regionales.map((r) => (
                    <tr key={r.key}><td style={{ padding: '3px 8px' }}>{r.label} <span className="muted">{r.desc}</span></td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', fontFamily: 'monospace' }}>$ {$(r.monto)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {puedeEditar && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={aplicar}>
          <h3 style={{ marginTop: 0 }}>Aplicar incremento (paritaria)</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Porcentaje % *</label><input className="input" type="number" step="0.01" min="0.01" value={pct} onChange={(e) => setPct(e.target.value)} /></div>
            <div className="field"><label>Vigencia desde *</label><input className="input" type="date" value={vig} onChange={(e) => setVig(e.target.value)} /></div>
            <div className="field"><label>Alcance</label><select className="input" value={alcance} onChange={(e) => setAlcance(e.target.value)}>
              <option value="todas">Categorías y regionales</option>
              <option value="categorias">Solo categorías</option>
              <option value="regionales">Solo regionales</option>
            </select></div>
            <div className="field"><label>Comentario</label><input className="input" value={coment} onChange={(e) => setComent(e.target.value)} /></div>
          </div>
          {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
          {ok && <div className="muted" style={{ marginBottom: 8, color: 'var(--green)' }}>✓ {ok}</div>}
          <button className="btn" disabled={busy || !pct || !vig}>{busy ? 'Aplicando…' : 'Aplicar incremento'}</button>
        </form>
      )}

      <h3 style={{ marginBottom: 8 }}>Historial de versiones</h3>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Vigencia</th><th>Origen</th><th>%</th><th>Alcance</th><th>Comentario</th>{puedeEditar && <th></th>}</tr></thead>
          <tbody>
            {versiones.map((v) => (
              <tr key={v.id}>
                <td>{v.mesLabel || v.vigencia}</td>
                <td>{v.origen === 'inicial' ? 'Inicial' : 'Incremento'}</td>
                <td style={{ fontFamily: 'monospace' }}>{v.porcentaje ? `+${v.porcentaje}%` : '—'}</td>
                <td>{v.alcance}</td><td className="muted">{v.comentario || '—'}</td>
                {puedeEditar && <td style={{ textAlign: 'right' }}>{v.origen !== 'inicial' && <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrar(v.id)}>✕</button>}</td>}
              </tr>
            ))}
            {!versiones.length && <tr><td colSpan={puedeEditar ? 6 : 5} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin versiones.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
