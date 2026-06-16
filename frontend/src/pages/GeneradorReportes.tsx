import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Campo = [string, string, ('text' | 'num' | 'int' | 'date')?];
interface Dataset { key: string; label: string; endpoint: string; campos: Campo[]; default: string[]; }

const DATASETS: Dataset[] = [
  { key: 'empleados', label: 'Empleados (nómina)', endpoint: '/empleados', default: ['legNum', 'nom', 'cuil', 'empresa', 'cat', 'bruto'],
    campos: [['legNum', 'Legajo'], ['nom', 'Nombre'], ['dni', 'DNI'], ['cuil', 'CUIL'], ['empresa', 'Empresa'], ['cat', 'Categoría'], ['tramo', 'Tramo'], ['ingreso', 'Ingreso', 'date'], ['bruto', 'Bruto', 'num'], ['neto', 'Neto', 'num'], ['lugar', 'Lugar'], ['mail', 'Email'], ['tarea', 'Tarea'], ['condicion', 'Condición'], ['cod_convenio', 'Convenio'], ['cod_sindicato', 'Sindicato'], ['fecha_nac', 'Fecha nac.', 'date'], ['sexo', 'Sexo'], ['estado_civil', 'Estado civil'], ['dom_loc', 'Localidad'], ['dom_prov', 'Provincia']] },
  { key: 'liquidaciones', label: 'Liquidaciones (recibos)', endpoint: '/recibos/gestion', default: ['leg_num', 'nom', 'empresa', 'anio', 'mes', 'tipo', 'neto'],
    campos: [['leg_num', 'Legajo'], ['nom', 'Nombre'], ['empresa', 'Empresa'], ['anio', 'Año', 'int'], ['mes', 'Mes', 'int'], ['tipo', 'Tipo'], ['neto', 'Neto', 'num'], ['created_by', 'Liquidado por'], ['created_at', 'Fecha', 'date']] },
  { key: 'licencias', label: 'Licencias', endpoint: '/licencias', default: ['leg_num', 'nom', 'empresa', 'tipo', 'desde', 'hasta', 'dias', 'estado'],
    campos: [['leg_num', 'Legajo'], ['nom', 'Nombre'], ['empresa', 'Empresa'], ['tipo', 'Tipo'], ['desde', 'Desde', 'date'], ['hasta', 'Hasta', 'date'], ['dias', 'Días', 'int'], ['estado', 'Estado'], ['motivo', 'Motivo'], ['resuelto_por', 'Resuelto por']] },
  { key: 'sanciones', label: 'Sanciones', endpoint: '/sanciones', default: ['leg_num', 'nom', 'empresa', 'tipo', 'fecha', 'estado'],
    campos: [['leg_num', 'Legajo'], ['nom', 'Nombre'], ['empresa', 'Empresa'], ['tipo', 'Tipo'], ['falta', 'Falta'], ['fecha', 'Fecha', 'date'], ['estado', 'Estado'], ['dias', 'Días', 'int'], ['resuelto_por', 'Resuelto por']] },
  { key: 'anticipos', label: 'Adelantos', endpoint: '/anticipos', default: ['leg_num', 'nom', 'empresa', 'monto', 'cuotas', 'estado'],
    campos: [['leg_num', 'Legajo'], ['nom', 'Nombre'], ['empresa', 'Empresa'], ['monto', 'Monto', 'num'], ['motivo', 'Motivo'], ['cuotas', 'Cuotas', 'int'], ['cuotas_pagadas', 'Cuotas pagadas', 'int'], ['estado', 'Estado'], ['created_at', 'Fecha', 'date']] },
];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GeneradorReportes() {
  const [dsKey, setDsKey] = useState('empleados');
  const ds = DATASETS.find((d) => d.key === dsKey)!;
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<string[]>(ds.default);
  const [empresa, setEmpresa] = useState('');
  const [q, setQ] = useState('');
  const [ordenPor, setOrdenPor] = useState(ds.default[0]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const tipoDe = (k: string) => ds.campos.find((c) => c[0] === k)?.[2] || 'text';
  const labelDe = (k: string) => ds.campos.find((c) => c[0] === k)?.[1] || k;

  async function cargar() {
    setErr(''); setBusy(true);
    try { setRows(await api.get<any[]>(ds.endpoint)); } catch (e: any) { setErr(e.message); setRows([]); } finally { setBusy(false); }
  }
  useEffect(() => { setSel(ds.default); setOrdenPor(ds.default[0]); setEmpresa(''); setQ(''); cargar(); /* eslint-disable-next-line */ }, [dsKey]);

  const empresas = useMemo(() => [...new Set(rows.map((r) => r.empresa).filter(Boolean))].sort(), [rows]);
  const filas = useMemo(() => {
    let f = rows;
    if (empresa) f = f.filter((r) => r.empresa === empresa);
    if (q.trim()) { const ql = q.toLowerCase(); f = f.filter((r) => ['nom', 'leg_num', 'legNum', 'dni', 'motivo', 'tipo'].some((k) => String(r[k] ?? '').toLowerCase().includes(ql))); }
    return [...f].sort((a, b) => { const x = a[ordenPor], y = b[ordenPor]; if (tipoDe(ordenPor) === 'num') return (Number(x) || 0) - (Number(y) || 0); return String(x ?? '').localeCompare(String(y ?? '')); });
  }, [rows, empresa, q, ordenPor]);

  const toggle = (k: string) => setSel((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);
  const val = (r: any, k: string) => { const v = r[k]; if (v == null || v === '') return '—'; const t = tipoDe(k); if (t === 'num') return '$\u00A0' + $(v); if (t === 'int') return String(Math.round(Number(v))); if (t === 'date') return String(v).slice(0, 10); return String(v); };

  function csv() {
    const head = sel.map(labelDe).join(',');
    const lines = filas.map((r) => sel.map((k) => { const v = r[k]; const s = v == null ? '' : tipoDe(k) === 'num' ? Number(v) : String(v); return `"${String(s).replace(/"/g, '""')}"`; }).join(','));
    const blob = new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reporte_${dsKey}.csv`; a.click();
  }

  return (
    <>
      <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {DATASETS.map((d) => <button key={d.key} className={`btn ${dsKey === d.key ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setDsKey(d.key)}>{d.label}</button>)}
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Campos a incluir</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ds.campos.map(([k, l]) => (
            <label key={k} className="badge" style={{ cursor: 'pointer', background: sel.includes(k) ? 'var(--accent-glow, rgba(61,127,255,.15))' : 'var(--bg2)', border: `1px solid ${sel.includes(k) ? 'var(--accent2)' : 'var(--border)'}` }}>
              <input type="checkbox" style={{ marginRight: 4 }} checked={sel.includes(k)} onChange={() => toggle(k)} />{l}
            </label>
          ))}
        </div>
        <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {empresas.length > 0 && <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>}
          <div className="field"><label>Buscar</label><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="texto" /></div>
          <div className="field"><label>Ordenar por</label><select className="input" value={ordenPor} onChange={(e) => setOrdenPor(e.target.value)}>{sel.map((k) => <option key={k} value={k}>{labelDe(k)}</option>)}</select></div>
          <button className="btn ghost" onClick={csv} disabled={!sel.length || !filas.length}>⬇ CSV</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>{sel.map((k) => <th key={k} style={{ textAlign: tipoDe(k) === 'num' ? 'right' : 'left' }}>{labelDe(k)}</th>)}</tr></thead>
          <tbody>
            {filas.map((r, i) => <tr key={i}>{sel.map((k) => <td key={k} style={{ textAlign: tipoDe(k) === 'num' ? 'right' : 'left', fontFamily: tipoDe(k) === 'num' ? 'monospace' : undefined }}>{val(r, k)}</td>)}</tr>)}
            {!filas.length && <tr><td colSpan={sel.length || 1} className="muted" style={{ textAlign: 'center', padding: 20 }}>{busy ? 'Cargando…' : 'Sin resultados.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{filas.length} fila(s) · {sel.length} columna(s)</p>
    </>
  );
}
