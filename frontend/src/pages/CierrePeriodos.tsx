import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Empleado } from '../lib/types';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fmt = (d?: string) => d ? new Date(d).toLocaleString('es-AR') : '—';

interface Cierre { id: number; empresa: string; anio: number; mes: number; cerrado_por?: string; cerrado_at?: string; }

export default function CierrePeriodos() {
  const { user } = useAuth();
  const esAdmin = user?.role === 'admin';
  const [items, setItems] = useState<Cierre[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  async function load() { try { setItems(await api.get<Cierre[]>('/cierres')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);

  async function cerrar() {
    setErr(''); setOk('');
    if (!empresa) { setErr('Elegí una empresa.'); return; }
    try { await api.post('/cierres', { empresa, anio, mes }); setOk(`Período ${String(mes).padStart(2, '0')}/${anio} de ${empresa} cerrado.`); load(); }
    catch (e: any) { setErr(e.message); }
  }
  async function reabrir(c: Cierre) {
    setErr(''); setOk('');
    try { await api.del(`/cierres?empresa=${encodeURIComponent(c.empresa)}&anio=${c.anio}&mes=${c.mes}`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Cerrar un período bloquea la liquidación (corrida e individual) de esa empresa para ese mes. Solo el administrador puede cerrar o reabrir.</p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>✓ {ok}</div>}

      {esAdmin ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Cerrar período</h3>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">—</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
            <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
            <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
            <button className="btn" onClick={cerrar} disabled={!empresa}>🔒 Cerrar período</button>
          </div>
        </div>
      ) : <div className="card" style={{ marginBottom: 16 }} ><span className="muted">Solo administradores pueden cerrar o reabrir períodos. Este es el listado de períodos cerrados.</span></div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empresa</th><th>Período</th><th>Cerrado por</th><th>Fecha</th>{esAdmin && <th></th>}</tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.empresa}</td><td>{MESES[c.mes - 1]} {c.anio}</td><td className="muted">{c.cerrado_por || '—'}</td><td className="muted">{fmt(c.cerrado_at)}</td>
                {esAdmin && <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => reabrir(c)}>🔓 Reabrir</button></td>}
              </tr>
            ))}
            {!items.length && <tr><td colSpan={esAdmin ? 5 : 4} className="muted" style={{ textAlign: 'center', padding: 20 }}>No hay períodos cerrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
