import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

// Campos disponibles del dataset Empleados (clave en el DTO → etiqueta).
const CAMPOS: [string, string][] = [
  ['legNum', 'Legajo'], ['nom', 'Nombre'], ['dni', 'DNI'], ['cuil', 'CUIL'], ['empresa', 'Empresa'],
  ['cat', 'Categoría'], ['tramo', 'Tramo'], ['ingreso', 'Ingreso'], ['bruto', 'Bruto'], ['neto', 'Neto'],
  ['lugar', 'Lugar'], ['mail', 'Email'], ['tarea', 'Tarea'], ['condicion', 'Condición'],
  ['cod_convenio', 'Convenio'], ['cod_sindicato', 'Sindicato'], ['fecha_nac', 'Fecha nac.'], ['sexo', 'Sexo'],
  ['estado_civil', 'Estado civil'], ['nacionalidad', 'Nacionalidad'],
  ['dom_calle', 'Domicilio calle'], ['dom_nro', 'Nº'], ['dom_loc', 'Localidad'], ['dom_prov', 'Provincia'], ['dom_cp', 'CP'],
];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esNum = (k: string) => ['bruto', 'neto'].includes(k);

export default function GeneradorReportes() {
  const [emps, setEmps] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [sel, setSel] = useState<string[]>(['legNum', 'nom', 'cuil', 'empresa', 'cat', 'bruto']);
  const [empresa, setEmpresa] = useState('');
  const [q, setQ] = useState('');
  const [ordenPor, setOrdenPor] = useState('nom');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Empleado[]>('/empleados').then((es) => { setEmps(es); setEmpresas([...new Set(es.map((e) => e.empresa))].sort()); }).catch((e) => setErr(e.message));
  }, []);

  const filas = useMemo(() => {
    let f = emps;
    if (empresa) f = f.filter((e) => e.empresa === empresa);
    if (q.trim()) { const ql = q.toLowerCase(); f = f.filter((e) => String(e.nom || '').toLowerCase().includes(ql) || String(e.legNum || '').includes(q) || String(e.dni || '').includes(q)); }
    return [...f].sort((a, b) => { const x = a[ordenPor], y = b[ordenPor]; if (esNum(ordenPor)) return (Number(x) || 0) - (Number(y) || 0); return String(x ?? '').localeCompare(String(y ?? '')); });
  }, [emps, empresa, q, ordenPor]);

  const toggle = (k: string) => setSel((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);
  const val = (e: any, k: string) => { const v = e[k]; if (v == null || v === '') return '—'; if (esNum(k)) return '$ ' + $(v); if (k === 'ingreso' || k === 'fecha_nac') return String(v).slice(0, 10); return String(v); };

  function csv() {
    const head = sel.map((k) => CAMPOS.find((c) => c[0] === k)?.[1] || k).join(',');
    const lines = filas.map((e) => sel.map((k) => { const v = e[k]; const s = v == null ? '' : esNum(k) ? Number(v) : String(v); return `"${String(s).replace(/"/g, '""')}"`; }).join(','));
    const blob = new Blob(['﻿' + [head, ...lines].join('\r\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reporte_empleados.csv'; a.click();
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Generador de reportes</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Dataset: Nómina de empleados. Elegí los campos, filtrá y exportá a CSV.</p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Campos a incluir</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CAMPOS.map(([k, l]) => (
            <label key={k} className="badge" style={{ cursor: 'pointer', background: sel.includes(k) ? 'var(--accent-glow, rgba(61,127,255,.15))' : 'var(--bg2)', border: `1px solid ${sel.includes(k) ? 'var(--accent2)' : 'var(--border)'}` }}>
              <input type="checkbox" style={{ marginRight: 4 }} checked={sel.includes(k)} onChange={() => toggle(k)} />{l}
            </label>
          ))}
        </div>
        <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
          <div className="field"><label>Buscar</label><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nombre, legajo, DNI" /></div>
          <div className="field"><label>Ordenar por</label><select className="input" value={ordenPor} onChange={(e) => setOrdenPor(e.target.value)}>{sel.map((k) => <option key={k} value={k}>{CAMPOS.find((c) => c[0] === k)?.[1] || k}</option>)}</select></div>
          <button className="btn ghost" onClick={csv} disabled={!sel.length}>⬇ CSV</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr>{sel.map((k) => <th key={k} style={{ textAlign: esNum(k) ? 'right' : 'left' }}>{CAMPOS.find((c) => c[0] === k)?.[1] || k}</th>)}</tr></thead>
          <tbody>
            {filas.map((e, i) => (
              <tr key={i}>{sel.map((k) => <td key={k} style={{ textAlign: esNum(k) ? 'right' : 'left', fontFamily: esNum(k) ? 'monospace' : undefined }}>{val(e, k)}</td>)}</tr>
            ))}
            {!filas.length && <tr><td colSpan={sel.length || 1} className="muted" style={{ textAlign: 'center', padding: 20 }}>Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{filas.length} fila(s) · {sel.length} columna(s)</p>
    </>
  );
}
