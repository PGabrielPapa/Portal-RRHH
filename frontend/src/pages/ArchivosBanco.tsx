import { useEffect, useState } from 'react';
import { api, fetchBlob } from '../lib/api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Banco { v: string; label: string; formato: string; }
interface Corrida { id: number; anio: number; mes: number; tipo: string; empresa?: string; estado: string; total_neto: number; cant: number; }

export default function ArchivosBanco() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [corridas, setCorridas] = useState<Corrida[]>([]);
  const [corridaId, setCorridaId] = useState<number | ''>('');
  const [banco, setBanco] = useState('generico');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [leyenda, setLeyenda] = useState('HABERES');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Banco[]>('/liquidacion/bancos').then(setBancos).catch(() => {});
    api.get<Corrida[]>('/liquidacion/corridas').then(setCorridas).catch((e) => setErr(e.message));
  }, []);

  const cfg = bancos.find((b) => b.v === banco);
  async function descargar() {
    if (!corridaId) { setErr('Elegí una corrida.'); return; }
    setErr('');
    try {
      const p = new URLSearchParams({ banco, fecha, leyenda });
      const blob = await fetchBlob(`/liquidacion/corrida/${corridaId}/banco?${p}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `acreditacion_${banco}_corrida_${corridaId}.${cfg?.formato === 'TXT' ? 'txt' : 'csv'}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Archivos de banco</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Genera el archivo de acreditación de haberes para presentar al banco, a partir de una corrida de liquidación.
        Reparte el neto según los CBU activos de cada empleado y su porcentaje.
      </p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>Corrida</label>
            <select className="input" value={corridaId} onChange={(e) => setCorridaId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Elegí una corrida —</option>
              {corridas.map((c) => <option key={c.id} value={c.id}>{String(c.mes).padStart(2, '0')}/{c.anio} · {c.tipo}{c.empresa ? ` · ${c.empresa}` : ''} · {c.cant} empl. · {c.estado}</option>)}
            </select>
          </div>
          <div className="field"><label>Banco / formato</label>
            <select className="input" value={banco} onChange={(e) => setBanco(e.target.value)}>{bancos.map((b) => <option key={b.v} value={b.v}>{b.label} ({b.formato})</option>)}</select>
          </div>
          <div className="field"><label>Fecha de acreditación</label><input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="field"><label>Leyenda</label><input className="input" value={leyenda} onChange={(e) => setLeyenda(e.target.value)} /></div>
        </div>
        <button className="btn" onClick={descargar} disabled={!corridaId}>⬇ Generar y descargar archivo</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Período</th><th>Tipo</th><th>Empresa</th><th>Empleados</th><th style={{ textAlign: 'right' }}>Neto</th><th>Estado</th></tr></thead>
          <tbody>
            {corridas.map((c) => (
              <tr key={c.id} style={{ cursor: 'pointer', background: corridaId === c.id ? 'var(--bg2)' : undefined }} onClick={() => setCorridaId(c.id)}>
                <td>{MESES[c.mes - 1]} {c.anio}</td><td>{c.tipo}</td><td>{c.empresa || 'Todas'}</td><td>{c.cant}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(c.total_neto)}</td><td>{c.estado}</td>
              </tr>
            ))}
            {!corridas.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>No hay corridas. Generá una en Liquidación → Corrida.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
