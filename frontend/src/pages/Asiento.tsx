import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import { useAuth } from '../lib/auth';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Linea { numero?: string; cuenta: string; debe: number; haber: number; }
interface Cuenta { id: number; numero: string; nombre: string; naturaleza: string; componentes: string[]; orden: number; activo: boolean; }
interface Comp { key: string; label: string; }
interface Asiento { empresa: string; lineas: Linea[]; totalDebe: number; totalHaber: number; balanceado: boolean; }

export default function Asiento() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [err, setErr] = useState('');
  const { user } = useAuth();
  const puede = user?.role === 'rrhh' || user?.role === 'admin';
  const [verPlan, setVerPlan] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [comps, setComps] = useState<Comp[]>([]);
  const compLabel = (k: string) => comps.find((c) => c.key === k)?.label || k;
  async function cargarPlan() { try { const r = await api.get<{ cuentas: Cuenta[]; componentes: Comp[] }>('/reportes/plan-cuentas'); setCuentas(r.cuentas); setComps(r.componentes); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { if (puede) cargarPlan(); /* eslint-disable-next-line */ }, [puede]);

  const blank = { numero: '', nombre: '', naturaleza: 'debe', componentes: [] as string[], orden: String(cuentas.length + 1) };
  const [cf, setCf] = useState<any>(blank);
  const toggleComp = (k: string) => setCf((p: any) => ({ ...p, componentes: p.componentes.includes(k) ? p.componentes.filter((x: string) => x !== k) : [...p.componentes, k] }));
  async function guardarCuenta() {
    setErr('');
    try {
      const body = { numero: cf.numero, nombre: cf.nombre, naturaleza: cf.naturaleza, componentes: cf.componentes, orden: Number(cf.orden) || 0 };
      if (cf.id) await api.put(`/reportes/plan-cuentas/${cf.id}`, body); else await api.post('/reportes/plan-cuentas', body);
      setCf(blank); cargarPlan(); cargar();
    } catch (e: any) { setErr(e.message); }
  }
  async function borrarCuenta(id: number) { try { await api.del(`/reportes/plan-cuentas/${id}`); cargarPlan(); cargar(); } catch (e: any) { setErr(e.message); } }

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function cargar() { setErr(''); try { const p = new URLSearchParams({ anio: String(anio), mes: String(mes) }); if (empresa) p.set('empresa', empresa); const r = await api.get<{ asientos: Asiento[] }>(`/reportes/asiento?${p}`); setAsientos(r.asientos); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [anio, mes, empresa]);

  return (
    <>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
        <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
      </div>
      {puede && <div style={{ marginBottom: 12 }}><button className="btn ghost" onClick={() => setVerPlan((v) => !v)}>{verPlan ? '▾' : '▸'} Plan de cuentas contables ({cuentas.length})</button></div>}
      {puede && verPlan && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>Plan de cuentas contables</h3>
          <p className="muted" style={{ marginTop: -6, fontSize: 12 }}>Definí las cuentas (número y nombre) y agrupá en cada una los conceptos de nómina. El asiento se arma con este plan.</p>
          <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead><tr><th>N° cuenta</th><th>Nombre</th><th>Naturaleza</th><th>Conceptos agrupados</th><th></th></tr></thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace' }}>{c.numero}</td>
                    <td>{c.nombre}</td>
                    <td><span className="badge" style={{ color: c.naturaleza === 'debe' ? 'var(--accent2)' : 'var(--green)' }}>{c.naturaleza}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>{(c.componentes || []).map(compLabel).join(', ') || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 12, marginRight: 6 }} onClick={() => setCf({ id: c.id, numero: c.numero, nombre: c.nombre, naturaleza: c.naturaleza, componentes: c.componentes || [], orden: String(c.orden) })}>Editar</button>
                      <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 12, color: 'var(--red)' }} onClick={() => borrarCuenta(c.id)}>✕</button>
                    </td>
                  </tr>
                ))}
                {!cuentas.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 14 }}>Sin cuentas.</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <strong style={{ fontSize: 13 }}>{cf.id ? 'Editar cuenta' : 'Nueva cuenta'}</strong>
            <div className="grid2" style={{ margin: '8px 0' }}>
              <div className="field"><label>N° de cuenta</label><input className="input" value={cf.numero} onChange={(e) => setCf({ ...cf, numero: e.target.value })} placeholder="ej. 410100" /></div>
              <div className="field"><label>Nombre</label><input className="input" value={cf.nombre} onChange={(e) => setCf({ ...cf, nombre: e.target.value })} /></div>
              <div className="field"><label>Naturaleza</label><select className="input" value={cf.naturaleza} onChange={(e) => setCf({ ...cf, naturaleza: e.target.value })}><option value="debe">Debe</option><option value="haber">Haber</option></select></div>
              <div className="field"><label>Orden</label><input className="input" type="number" value={cf.orden} onChange={(e) => setCf({ ...cf, orden: e.target.value })} /></div>
            </div>
            <div className="field"><label>Conceptos de nómina a agrupar</label>
              <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {comps.map((c) => (
                  <label key={c.key} className="row" style={{ gap: 5, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={cf.componentes.includes(c.key)} onChange={() => toggleComp(c.key)} /> {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn" onClick={guardarCuenta} disabled={!cf.numero || !cf.nombre}>{cf.id ? 'Guardar cambios' : '+ Agregar cuenta'}</button>
              {cf.id && <button className="btn ghost" onClick={() => setCf(blank)}>Cancelar</button>}
            </div>
          </div>
        </div>
      )}
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {!asientos.length && <div className="muted">Sin recibos liquidados para ese período.</div>}
      {asientos.map((a, i) => (
        <div key={i} className="card" style={{ marginBottom: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{a.empresa}</strong>
            <span className="badge" style={{ color: a.balanceado ? 'var(--green)' : 'var(--red)' }}>{a.balanceado ? '✓ Balanceado' : '⚠ No balancea'}</span>
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Cuenta</th><th style={{ textAlign: 'right' }}>Debe</th><th style={{ textAlign: 'right' }}>Haber</th></tr></thead>
            <tbody>
              {a.lineas.map((l, j) => (
                <tr key={j}><td>{l.numero ? <span className="muted" style={{ fontFamily: 'monospace', marginRight: 6 }}>{l.numero}</span> : ''}{l.cuenta}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{l.debe ? $(l.debe) : ''}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{l.haber ? $(l.haber) : ''}</td></tr>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop: '2px solid var(--border)' }}><td style={{ fontWeight: 700 }}>Totales</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(a.totalDebe)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(a.totalHaber)}</td></tr></tfoot>
          </table>
        </div>
      ))}
    </>
  );
}
