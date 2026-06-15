import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Empleado } from '../lib/types';

interface Alic { desde: string; pct: number; nota?: string; }
interface Contrato { id: number; empresaId: number; empresa: string; artCodigo: string; artNombre: string; nroContrato?: string; fechaInicio?: string; fechaFin?: string; activo: boolean; alicuotas: Alic[]; }
interface ArtCat { codigo: string; nombre: string; cuit: string; }

const fmt = (d?: string) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR') : '—';
const alicVigente = (a: Alic[]) => { const s = a.filter((x) => x.desde <= new Date().toISOString().slice(0, 10)); return (s.length ? s[s.length - 1] : a[0])?.pct; };

export default function ArtEmpresas() {
  const { user } = useAuth();
  const puede = user?.role === 'rrhh' || user?.role === 'admin';
  const [items, setItems] = useState<Contrato[]>([]);
  const [cat, setCat] = useState<ArtCat[]>([]);
  const [empresas, setEmpresas] = useState<{ id: number; nombre: string }[]>([]);
  const [err, setErr] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  const [alic, setAlic] = useState<Record<number, Record<string, string>>>({});

  async function load() {
    try { setItems(await api.get<Contrato[]>('/art')); } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => {
    load();
    api.get<ArtCat[]>('/art/catalogo').then(setCat).catch(() => {});
    api.get<Empleado[]>('/empleados').then((es) => {
      const map = new Map<number, string>();
      es.forEach((e: any) => { if (e.empresaId) map.set(e.empresaId, e.empresa); });
      setEmpresas([...map.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }).catch(() => {});
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    try {
      await api.post('/art', { empresaId: Number(f.empresaId), artCodigo: f.artCodigo, nroContrato: f.nroContrato, fechaInicio: f.fechaInicio, fechaFin: f.fechaFin, alicuotaInicial: f.alicuotaInicial ? Number(f.alicuotaInicial) : undefined });
      setF({}); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function agregarAlic(c: Contrato) {
    setErr(''); const a = alic[c.id] || {};
    try { await api.post(`/art/${c.id}/alicuota`, { desde: a.desde, pct: Number(a.pct), nota: a.nota }); setAlic({ ...alic, [c.id]: {} }); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function toggle(c: Contrato) { try { await api.put(`/art/${c.id}`, { nroContrato: c.nroContrato, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, activo: !c.activo }); load(); } catch (e: any) { setErr(e.message); } }
  async function borrar(c: Contrato) { try { await api.del(`/art/${c.id}`); load(); } catch (e: any) { setErr(e.message); } }
  const setAl = (id: number, k: string) => (e: any) => setAlic({ ...alic, [id]: { ...(alic[id] || {}), [k]: e.target.value } });

  return (
    <>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {puede && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={crear}>
          <h3 style={{ marginTop: 0 }}>Nuevo contrato de ART</h3>
          <div className="grid2" style={{ marginBottom: 10 }}>
            <div className="field"><label>Empresa *</label><select className="input" value={f.empresaId || ''} onChange={(e) => setF({ ...f, empresaId: e.target.value })}><option value="">—</option>{empresas.map((em) => <option key={em.id} value={em.id}>{em.nombre}</option>)}</select></div>
            <div className="field"><label>ART *</label><select className="input" value={f.artCodigo || ''} onChange={(e) => setF({ ...f, artCodigo: e.target.value })}><option value="">—</option>{cat.map((a) => <option key={a.codigo} value={a.codigo}>{a.nombre}</option>)}</select></div>
            <div className="field"><label>Nº de contrato</label><input className="input" value={f.nroContrato || ''} onChange={(e) => setF({ ...f, nroContrato: e.target.value })} /></div>
            <div className="field"><label>Alícuota inicial %</label><input className="input" type="number" step="0.01" value={f.alicuotaInicial || ''} onChange={(e) => setF({ ...f, alicuotaInicial: e.target.value })} /></div>
            <div className="field"><label>Vigencia desde</label><input className="input" type="date" value={f.fechaInicio || ''} onChange={(e) => setF({ ...f, fechaInicio: e.target.value })} /></div>
            <div className="field"><label>Vigencia hasta</label><input className="input" type="date" value={f.fechaFin || ''} onChange={(e) => setF({ ...f, fechaFin: e.target.value })} /></div>
          </div>
          <button className="btn" disabled={!f.empresaId || !f.artCodigo}>+ Agregar contrato</button>
        </form>
      )}

      {!items.length && <div className="muted">No hay contratos de ART cargados.</div>}
      {items.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: 12, opacity: c.activo ? 1 : 0.6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{c.empresa}</strong> — {c.artNombre}
              <div className="muted" style={{ fontSize: 12 }}>Nº {c.nroContrato || '—'} · {fmt(c.fechaInicio)} → {c.fechaFin ? fmt(c.fechaFin) : 'sin vencimiento'} · <span className="badge" style={{ color: c.activo ? 'var(--green)' : 'var(--t3)' }}>{c.activo ? 'Vigente' : 'Cerrado'}</span></div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 15, color: 'var(--accent2)' }}>{alicVigente(c.alicuotas) != null ? `${alicVigente(c.alicuotas)}%` : 's/alícuota'}</span>
              {puede && <><button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12 }} onClick={() => toggle(c)}>{c.activo ? 'Cerrar' : 'Reactivar'}</button>
                <button className="btn ghost" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrar(c)}>✕</button></>}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Histórico de alícuotas</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {c.alicuotas.map((a, i) => {
                  const hasta = c.alicuotas[i + 1]?.desde;   // la vigencia termina cuando empieza la siguiente
                  return (
                  <tr key={i}><td style={{ padding: '3px 8px', fontFamily: 'monospace', fontSize: 12 }}>{fmt(a.desde)} → {hasta ? fmt(hasta) : 'vigente'}</td><td style={{ padding: '3px 8px', fontFamily: 'monospace' }}>{a.pct}%</td><td style={{ padding: '3px 8px' }} className="muted">{a.nota || ''}</td></tr>
                ); })}
                {!c.alicuotas.length && <tr><td className="muted" style={{ padding: '3px 8px' }}>Sin alícuotas cargadas.</td></tr>}
              </tbody>
            </table>
            {puede && (
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <input className="input" type="date" style={{ width: 150 }} value={(alic[c.id]?.desde) || ''} onChange={setAl(c.id, 'desde')} />
                <input className="input" type="number" step="0.01" placeholder="%" style={{ width: 90 }} value={(alic[c.id]?.pct) || ''} onChange={setAl(c.id, 'pct')} />
                <input className="input" placeholder="Nota" style={{ flex: 1 }} value={(alic[c.id]?.nota) || ''} onChange={setAl(c.id, 'nota')} />
                <button className="btn ghost" onClick={() => agregarAlic(c)}>+ Alícuota</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
