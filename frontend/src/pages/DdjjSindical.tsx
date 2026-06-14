import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Item { legNum: string; nom: string; cuil?: string; empresa: string; baseRem: number; cuotaEmp: number; cuotaPat: number; total: number; }
interface Grupo { sindicato: string; items: Item[]; totales: { baseRem: number; cuotaEmp: number; cuotaPat: number; total: number }; }
interface Resp { grupos: Grupo[]; totales: { cuotaEmp: number; cuotaPat: number; total: number }; }

export default function DdjjSindical() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function cargar() { setErr(''); try { const p = new URLSearchParams({ anio: String(anio), mes: String(mes) }); if (empresa) p.set('empresa', empresa); setData(await api.get<Resp>(`/reportes/ddjj-sindical?${p}`)); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [anio, mes, empresa]);

  function csv(g: Grupo) {
    const head = 'Sindicato,Legajo,Nombre,CUIL,Empresa,Base remunerativa,Cuota empleado,Cuota patronal,Total';
    const lines = g.items.map((it) => `${g.sindicato},${it.legNum},"${it.nom}",${it.cuil || ''},"${it.empresa}",${it.baseRem},${it.cuotaEmp},${it.cuotaPat},${it.total}`);
    const blob = new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ddjj_${g.sindicato.replace(/[^\w]/g, '_')}_${anio}_${String(mes).padStart(2, '0')}.csv`; a.click();
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>DDJJ sindical</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Aportes y contribuciones sindicales del período, agrupados por sindicato, a partir de los recibos liquidados.</p>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
        <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {data && <div className="card" style={{ marginBottom: 14, fontSize: 13 }}>Total cuota empleado <strong>$ {$(data.totales.cuotaEmp)}</strong> · patronal <strong>$ {$(data.totales.cuotaPat)}</strong> · <strong style={{ color: 'var(--accent2)' }}>Total a depositar $ {$(data.totales.total)}</strong></div>}
      {data && !data.grupos.length && <div className="muted">No hay recibos liquidados para ese período.</div>}
      {data?.grupos.map((g) => (
        <div key={g.sindicato} className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{g.sindicato} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({g.items.length})</span></strong>
            <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => csv(g)}>⬇ CSV</button>
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr><th>Legajo</th><th>Nombre</th><th>Empresa</th><th style={{ textAlign: 'right' }}>Base rem.</th><th style={{ textAlign: 'right' }}>Cuota empl.</th><th style={{ textAlign: 'right' }}>Cuota patr.</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {g.items.map((it, i) => (
                <tr key={i}><td>{it.legNum}</td><td>{it.nom}</td><td>{it.empresa}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(it.baseRem)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(it.cuotaEmp)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(it.cuotaPat)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{$(it.total)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop: '2px solid var(--border)' }}><td colSpan={4} style={{ fontWeight: 700 }}>Totales {g.sindicato}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(g.totales.cuotaEmp)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(g.totales.cuotaPat)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(g.totales.total)}</td></tr></tfoot>
          </table>
        </div>
      ))}
    </>
  );
}
