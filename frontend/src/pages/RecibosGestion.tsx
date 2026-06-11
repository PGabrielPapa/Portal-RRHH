import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';
import ReciboView, { Recibo } from '../components/ReciboView';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

interface Item { id: number; anio: number; mes: number; tipo: string; neto: number; created_at: string; created_by?: string; nom: string; leg_num: string; empresa: string; }

export default function RecibosGestion() {
  const [items, setItems] = useState<Item[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [mes, setMes] = useState(0);
  const [anio, setAnio] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Recibo | null>(null);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const p = new URLSearchParams();
      if (empresa) p.set('empresa', empresa);
      if (mes) p.set('mes', String(mes));
      if (anio) p.set('anio', anio);
      if (q) p.set('q', q);
      setItems(await api.get<Item[]>(`/recibos/gestion?${p.toString()}`));
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => {
    api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {});
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresa, mes, anio, q]);

  async function ver(it: Item) {
    setErr('');
    try { setSel(await api.get<Recibo>(`/recibos/${it.id}`)); } catch (e: any) { setErr(e.message); }
  }

  if (sel) return (
    <>
      <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => setSel(null)}>← Volver a la lista</button>
      <div className="card"><ReciboView recibo={sel} /></div>
    </>
  );

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Recibos (gestión)</h2>
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar empleado o legajo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          {empresas.map((em) => <option key={em} value={em}>{em}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 150 }} value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          <option value={0}>Todos los meses</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 110 }} type="number" placeholder="Año" value={anio} onChange={(e) => setAnio(e.target.value)} />
      </div>
      {err && <div className="err" style={{ marginBottom: 10 }}>⚠ {err}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Empleado</th><th>Empresa</th><th>Período</th><th>Neto</th><th>Liquidado por</th><th></th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.nom} <span className="muted">({it.leg_num})</span></td>
                <td>{it.empresa}</td>
                <td>{MESES[it.mes - 1]} {it.anio}</td>
                <td style={{ fontFamily: 'monospace' }}>{money(it.neto)}</td>
                <td className="muted">{it.created_by || '—'}</td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => ver(it)}>Ver</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>No hay recibos liquidados con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{items.length} recibo(s)</p>
    </>
  );
}
