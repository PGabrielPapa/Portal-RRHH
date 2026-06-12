import { useEffect, useState } from 'react';
import { api, fetchBlob } from '../lib/api';

interface Lic {
  id: number; tipo: string; desde: string; hasta: string; dias: number; motivo?: string;
  estado: string; justificacion?: boolean; comprobante_nombre?: string; tiene_comprobante?: boolean;
}

// Licencias imprevisibles que el empleado justifica a posteriori adjuntando comprobante.
const TIPOS = ['Enfermedad', 'Fallecimiento familiar', 'Nacimiento', 'Accidente', 'Otra'];

function fmt(d?: string) { if (!d) return '—'; const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; }
const MAX = 5 * 1024 * 1024;

export default function Justificaciones() {
  const [items, setItems] = useState<Lic[]>([]);
  const [f, setF] = useState<Record<string, string>>({ tipo: 'Enfermedad' });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { const all = await api.get<Lic[]>('/licencias/mias'); setItems(all.filter((l) => l.justificacion || l.tiene_comprobante)); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(new Error('No se pudo leer el archivo'));
      r.readAsDataURL(file);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setOk('');
    if (!file) { setErr('Adjuntá el comprobante que justifica la licencia.'); return; }
    if (file.size > MAX) { setErr('El comprobante no puede superar 5 MB.'); return; }
    setBusy(true);
    try {
      const comprobanteData = await readFile(file);
      await api.post('/licencias/justificar', {
        tipo: f.tipo, desde: f.desde, hasta: f.hasta, motivo: f.motivo,
        comprobanteNombre: file.name, comprobanteMime: file.type, comprobanteData,
      });
      setOk('Justificación enviada correctamente. Queda pendiente de revisión por RR.HH.');
      setF({ tipo: 'Enfermedad' }); setFile(null);
      (document.getElementById('comprobante-input') as HTMLInputElement | null)?.value && ((document.getElementById('comprobante-input') as HTMLInputElement).value = '');
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function verComprobante(id: number) {
    try {
      const blob = await fetchBlob(`/licencias/${id}/comprobante`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) { setErr(e.message); }
  }

  const badge = (es: string) => ({ aprobada: 'var(--green)', rechazada: 'var(--red)' } as any)[es] || 'var(--t3)';

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Justificación de licencias</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 16 }}>
        Las licencias imprevisibles (enfermedad, fallecimiento de familiar, nacimiento) no se solicitan con anticipación:
        se justifican aquí adjuntando el comprobante. Quedan pendientes de revisión por RR.HH.
      </p>

      <form className="card" style={{ marginBottom: 18 }} onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>Justificar una licencia</h3>
        <div className="grid2" style={{ marginBottom: 10 }}>
          <div className="field"><label>Tipo *</label>
            <select className="input" value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div className="field"><label>Motivo / detalle</label><input className="input" value={f.motivo || ''} onChange={set('motivo')} /></div>
          <div className="field"><label>Desde *</label><input type="date" className="input" value={f.desde || ''} onChange={set('desde')} /></div>
          <div className="field"><label>Hasta *</label><input type="date" className="input" value={f.hasta || ''} onChange={set('hasta')} /></div>
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Comprobante * (PDF o imagen, máx. 5 MB)</label>
          <input id="comprobante-input" type="file" className="input" accept=".pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file && <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>📎 {file.name} ({Math.round(file.size / 1024)} KB)</div>}
        </div>
        {err && <div className="err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
        {ok && <div className="muted" style={{ marginBottom: 8, color: 'var(--green)' }}>✓ {ok}</div>}
        <button className="btn" disabled={busy || !f.desde || !f.hasta || !file}>{busy ? 'Enviando…' : 'Enviar justificación'}</button>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Motivo</th><th>Estado</th><th>Comprobante</th></tr></thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <td>{l.tipo}</td><td>{fmt(l.desde)}</td><td>{fmt(l.hasta)}</td><td>{l.dias}</td><td>{l.motivo || '—'}</td>
                <td><span className="badge" style={{ color: badge(l.estado) }}>{l.estado}</span></td>
                <td>{l.tiene_comprobante
                  ? <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => verComprobante(l.id)}>📄 Ver</button>
                  : '—'}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>No tenés licencias justificadas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
