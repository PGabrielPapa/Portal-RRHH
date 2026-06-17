import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fF = (d?: string | null) => d ? new Date(d).toLocaleDateString('es-AR') : '—';

interface Item { legNum: string; nom: string; cuil?: string; empresa: string; baseRem: number; cuotaEmp: number; cuotaPat: number; total: number; }
interface Diseno { id: number; version: number; actualizadoAt?: string; descripcion?: string; ultimaVersion: number | null; ultimaFecha?: string | null; primeraVez: boolean; actualizado: boolean; }
interface Grupo { sindicato: string; jurisdiccion: string; items: Item[]; totales: { baseRem: number; cuotaEmp: number; cuotaPat: number; total: number }; diseno: Diseno; }
interface Resp { grupos: Grupo[]; totales: { cuotaEmp: number; cuotaPat: number; total: number }; }

export default function DdjjSindical() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function cargar() { setErr(''); try { const p = new URLSearchParams({ anio: String(anio), mes: String(mes) }); if (empresa) p.set('empresa', empresa); setData(await api.get<Resp>(`/reportes/ddjj-sindical?${p}`)); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [anio, mes, empresa]);

  async function generar(g: Grupo) {
    // DDJJ (archivo) según el diseño vigente, y registramos la generación.
    const head = 'Sindicato,Jurisdiccion,DisenoVersion,Legajo,Nombre,CUIL,Empresa,BaseRem,CuotaEmpleado,CuotaPatronal,Total';
    const lines = g.items.map((it) => `${g.sindicato},"${g.jurisdiccion}",v${g.diseno.version},${it.legNum},"${it.nom}",${it.cuil || ''},"${it.empresa}",${it.baseRem},${it.cuotaEmp},${it.cuotaPat},${it.total}`);
    const blob = new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `ddjj_${g.sindicato.replace(/[^\w]/g, '_')}_${g.jurisdiccion.replace(/[^\w]/g, '_')}_${anio}_${String(mes).padStart(2, '0')}.csv`; a.click();
    try { await api.post('/reportes/ddjj-generar', { sindicato: g.sindicato, jurisdiccion: g.jurisdiccion, anio, mes }); setOk(`DDJJ generada para ${g.sindicato} / ${g.jurisdiccion} (diseño v${g.diseno.version}).`); cargar(); } catch (e: any) { setErr(e.message); }
  }

  function boleta(g: Grupo) {
    const w = window.open('', '_blank', 'width=820,height=950'); if (!w) return;
    const filas = g.items.map((it) => `<tr><td>${it.legNum}</td><td>${it.nom}</td><td>${it.cuil || ''}</td><td style="text-align:right">$ ${$(it.baseRem)}</td><td style="text-align:right">$ ${$(it.cuotaEmp)}</td><td style="text-align:right">$ ${$(it.cuotaPat)}</td><td style="text-align:right"><b>$ ${$(it.total)}</b></td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Boleta ${g.sindicato} ${mes}/${anio}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:28px} h1{font-size:18px;margin:0} .sub{color:#444;font-size:12px;margin-bottom:14px}
      .box{border:1px solid #333;border-radius:6px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
      table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ccc;padding:3px 6px;font-size:11px;text-align:left} th{background:#f3f3f3}
      .tot{font-size:14px;font-weight:bold} .firma{margin-top:60px;border-top:1px solid #333;width:260px;text-align:center;padding-top:4px;font-size:10px}</style></head><body>
      <h1>Boleta de aportes y contribuciones sindicales</h1>
      <div class="sub">${g.sindicato} — Jurisdicción: ${g.jurisdiccion} · Período ${MESES[mes - 1]} ${anio} · Diseño de registro v${g.diseno.version}</div>
      <div class="box">
        <div><b>Empleados:</b> ${g.items.length}</div>
        <div><b>Cuota empleado:</b> $ ${$(g.totales.cuotaEmp)}</div>
        <div><b>Cuota patronal:</b> $ ${$(g.totales.cuotaPat)}</div>
        <div class="tot">Total a depositar: $ ${$(g.totales.total)}</div>
      </div>
      <table><thead><tr><th>Legajo</th><th>Nombre</th><th>CUIL</th><th style="text-align:right">Base rem.</th><th style="text-align:right">Cuota empl.</th><th style="text-align:right">Cuota patr.</th><th style="text-align:right">Total</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="firma">Firma y sello — RR.HH.</div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  async function actualizarDiseno(g: Grupo) {
    const descripcion = window.prompt(`Describí la actualización del diseño de registro de ${g.sindicato} / ${g.jurisdiccion}:`, '');
    if (descripcion === null) return;
    try { await api.patch(`/reportes/ddjj-disenos/${g.diseno.id}`, { descripcion }); setOk('Diseño de registro actualizado a una nueva versión.'); cargar(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>DDJJ y boletas de aportes/contribuciones sindicales por <strong>sindicato y jurisdicción (lugar de trabajo)</strong>, según el diseño de registro vigente. Antes de generar, el sistema verifica estar al día.</p>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div className="field"><label>Año</label><input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
        <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="muted" style={{ marginBottom: 12, color: 'var(--green)' }}>✓ {ok}</div>}
      {data && <div className="card" style={{ marginBottom: 14, fontSize: 13 }}>Total cuota empleado <strong>$ {$(data.totales.cuotaEmp)}</strong> · patronal <strong>$ {$(data.totales.cuotaPat)}</strong> · <strong style={{ color: 'var(--accent2)' }}>Total a depositar $ {$(data.totales.total)}</strong></div>}
      {data && !data.grupos.length && <div className="muted">No hay recibos liquidados para ese período.</div>}
      {data?.grupos.map((g) => {
        const d = g.diseno;
        return (
        <div key={g.sindicato + g.jurisdiccion} className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <strong>{g.sindicato} <span className="muted" style={{ fontWeight: 400 }}>· {g.jurisdiccion}</span> <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({g.items.length})</span></strong>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => actualizarDiseno(g)}>✎ Actualizar diseño</button>
              <button className="btn ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => boleta(g)}>🧾 Boleta</button>
              <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => generar(g)}>⬇ Generar DDJJ</button>
            </div>
          </div>
          <div style={{ marginBottom: 8, padding: '6px 10px', fontSize: 12, borderRadius: 'var(--r)',
            background: d.actualizado ? 'rgba(234,179,8,.08)' : 'rgba(34,197,94,.06)',
            border: `1px solid ${d.actualizado ? 'rgba(234,179,8,.35)' : 'rgba(34,197,94,.25)'}` }}>
            {d.actualizado
              ? <b style={{ color: 'var(--yellow)' }}>⚠ El diseño de registro se actualizó a la v{d.version} ({fF(d.actualizadoAt)}). La DDJJ/boleta se genera con el diseño actualizado.</b>
              : d.primeraVez
                ? <span>Diseño de registro vigente <b>v{d.version}</b>. Primera generación para este sindicato/jurisdicción.</span>
                : <span style={{ color: 'var(--green)' }}>✓ Diseño de registro vigente <b>v{d.version}</b> — sin cambios desde la última generación (v{d.ultimaVersion}, {fF(d.ultimaFecha)}).</span>}
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
            <tfoot><tr style={{ borderTop: '2px solid var(--border)' }}><td colSpan={4} style={{ fontWeight: 700 }}>Totales</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(g.totales.cuotaEmp)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(g.totales.cuotaPat)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{$(g.totales.total)}</td></tr></tfoot>
          </table>
        </div>
      ); })}
    </>
  );
}
