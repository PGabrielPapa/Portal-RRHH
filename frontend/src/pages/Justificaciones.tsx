import { useEffect, useRef, useState } from 'react';
import { api, fetchBlob } from '../lib/api';
import MiBanner from '../components/MiBanner';

interface Lic {
  id: number; tipo: string; desde: string; hasta: string; dias: number; motivo?: string;
  estado: string; justificacion?: boolean; comprobante_nombre?: string; tiene_comprobante?: boolean;
}

function fmt(d?: string) { if (!d) return '—'; const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; }
const MAX = 5 * 1024 * 1024;
const colorEstado = (e: string) => e === 'aprobada' ? 'var(--green)' : e === 'rechazada' ? 'var(--red)' : 'var(--yellow)';

export default function Justificaciones() {
  const [items, setItems] = useState<Lic[]>([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  async function load() {
    try { setItems(await api.get<Lic[]>('/licencias/mias')); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(new Error('No se pudo leer el archivo'));
      r.readAsDataURL(file);
    });
  }

  async function adjuntar(l: Lic, file: File) {
    setErr(''); setOk('');
    if (file.size > MAX) { setErr('El comprobante no puede superar 5 MB.'); return; }
    setBusyId(l.id);
    try {
      const comprobanteData = await readFile(file);
      await api.post(`/licencias/${l.id}/comprobante`, { comprobanteNombre: file.name, comprobanteMime: file.type, comprobanteData });
      setOk(`Comprobante adjuntado a tu licencia de ${l.tipo}.`);
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusyId(null); }
  }

  async function ver(id: number) {
    try { const b = await fetchBlob(`/licencias/${id}/comprobante`); const u = URL.createObjectURL(b); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <MiBanner subtitulo="Adjuntá el comprobante de tus licencias" />
      <p className="muted" style={{ marginTop: -6, marginBottom: 16 }}>
        Las licencias se solicitan en "Mis licencias" y pasan a conocimiento del gerente y de RR.HH.
        Aquí, posteriormente, justificás cada licencia adjuntando el comprobante correspondiente.
      </p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="muted" style={{ marginBottom: 12, color: 'var(--green)' }}>✓ {ok}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Estado</th><th>Comprobante</th></tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>{l.tipo}</td><td>{fmt(l.desde)}</td><td>{fmt(l.hasta)}</td><td>{l.dias}</td>
                <td><span className="badge" style={{ color: colorEstado(l.estado) }}>{l.estado}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <input ref={(el) => { inputs.current[l.id] = el; }} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                    onChange={(e) => { const fl = e.target.files?.[0]; if (fl) adjuntar(l, fl); e.target.value = ''; }} />
                  {l.tiene_comprobante && (
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => ver(l.id)}>📄 Ver</button>
                  )}
                  <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} disabled={busyId === l.id}
                    onClick={() => inputs.current[l.id]?.click()}>
                    {busyId === l.id ? 'Subiendo…' : (l.tiene_comprobante ? 'Reemplazar' : 'Adjuntar comprobante')}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>No tenés licencias solicitadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
