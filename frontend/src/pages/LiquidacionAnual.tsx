import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Item { empleadoId: number; nom: string; legNum: string; cuil?: string; empresa: string; remunAnual: number; aportesAnual: number; cargas: number; remSujeta: number; impuestoDeterminado: number; retenidoAnual: number; diferencia: number; accion: string; }
interface Resp { anio: number; tablaPeriodo: string; items: Item[]; totales: { cant: number; aRetener: number; aDevolver: number }; }

export default function LiquidacionAnual() {
  const [anio, setAnio] = useState(new Date().getFullYear() - 1);
  const [empresa, setEmpresa] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function cargar() {
    setErr(''); setBusy(true); setData(null);
    try { const p = new URLSearchParams({ anio: String(anio) }); if (empresa) p.set('empresa', empresa); setData(await api.get<Resp>(`/ganancias/anual?${p}`)); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  function csv() {
    if (!data) return;
    const head = 'Legajo,Nombre,CUIL,Empresa,Remun anual,Aportes,Cargas,Rem sujeta,Impuesto det.,Retenido,Diferencia,Acción';
    const lines = data.items.map((x) => `${x.legNum},"${x.nom}",${x.cuil || ''},"${x.empresa}",${x.remunAnual},${x.aportesAnual},${x.cargas},${x.remSujeta},${x.impuestoDeterminado},${x.retenidoAnual},${x.diferencia},${x.accion}`);
    const blob = new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `liquidacion_anual_ganancias_${anio}.csv`; a.click();
  }
  const col = (d: number) => d > 0.5 ? 'var(--red)' : d < -0.5 ? 'var(--green)' : 'var(--t3)';

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Liquidación anual de Ganancias <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(ajuste anual — RG 4003/17)</span></h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Impuesto anual con deducciones completas menos lo retenido durante el año. La diferencia se imputa en la liquidación de abril del año siguiente (retención adicional o devolución).</p>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Año fiscal</label><input className="input" type="number" style={{ width: 110 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
        <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
        <button className="btn" onClick={cargar} disabled={busy}>{busy ? 'Calculando…' : 'Calcular ajuste anual'}</button>
        <button className="btn ghost" onClick={csv} disabled={!data?.items.length}>⬇ CSV</button>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {data && <div className="card" style={{ marginBottom: 12, fontSize: 13 }}>{data.totales.cant} empleados · tabla {data.tablaPeriodo} · <strong style={{ color: 'var(--red)' }}>A retener: $ {$(data.totales.aRetener)}</strong> · <strong style={{ color: 'var(--green)' }}>A devolver: $ {$(data.totales.aDevolver)}</strong></div>}
      {data && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>Legajo</th><th>Empleado</th><th>Empresa</th><th style={{ textAlign: 'right' }}>Remun. anual</th><th style={{ textAlign: 'right' }}>Rem. sujeta</th><th style={{ textAlign: 'right' }}>Impuesto det.</th><th style={{ textAlign: 'right' }}>Retenido</th><th style={{ textAlign: 'right' }}>Diferencia</th><th>Acción</th></tr></thead>
            <tbody>
              {data.items.map((x) => (
                <tr key={x.empleadoId}><td>{x.legNum}</td><td>{x.nom}</td><td>{x.empresa}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(x.remunAnual)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(x.remSujeta)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(x.impuestoDeterminado)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{$(x.retenidoAnual)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: col(x.diferencia) }}>{$(x.diferencia)}</td>
                  <td style={{ color: col(x.diferencia) }}>{x.accion}</td></tr>
              ))}
              {!data.items.length && <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 20 }}>No hay recibos liquidados para ese año.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
