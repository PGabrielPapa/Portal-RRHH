import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Empleado } from '../lib/types';

interface Doc { tipo: string; refId: number; modulo: string; empleado: string; legNum: string; empresa: string; detalle: string; fecha?: string; estado?: string; }
const fmt = (d?: string) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR') : '—';
const TIPOS = [['', 'Todos'], ['sancion', 'Sanciones'], ['certificado', 'Certificados'], ['licencia', 'Licencias']];

export default function DocumentosFirmados() {
  const nav = useNavigate();
  const [items, setItems] = useState<Doc[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [tipo, setTipo] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  async function load() { setErr(''); try { const p = new URLSearchParams(); if (empresa) p.set('empresa', empresa); if (tipo) p.set('tipo', tipo); setItems(await api.get<Doc[]>(`/reportes/documentos?${p}`)); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresa, tipo]);

  const colorTipo = (t: string) => t === 'Sanción' ? 'var(--red)' : t === 'Certificado de trabajo' ? 'var(--accent2)' : 'var(--green)';

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Documentos firmados</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>Repositorio de documentos generados en el sistema (sanciones notificadas, certificados de trabajo y licencias). Abrí el módulo correspondiente para ver e imprimir cada documento con la firma de RR.HH.</p>
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field"><label>Tipo</label><select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
      </div>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Tipo</th><th>Empleado</th><th>Empresa</th><th>Detalle</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {items.map((d, i) => (
              <tr key={i}>
                <td><span className="badge" style={{ color: colorTipo(d.tipo) }}>{d.tipo}</span></td>
                <td>{d.empleado} <span className="muted">({d.legNum})</span></td>
                <td>{d.empresa}</td><td className="muted">{d.detalle}</td><td>{fmt(d.fecha)}</td><td>{d.estado}</td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => nav(`/m/${d.modulo}`)}>Abrir módulo →</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>No hay documentos para esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
