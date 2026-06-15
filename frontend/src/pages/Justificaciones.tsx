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

const TIPOS = [
  'Enfermedad', 'Enfermedad de familiar',
  'Fallecimiento de padre', 'Fallecimiento de madre', 'Fallecimiento de cónyuge',
  'Fallecimiento de hijo', 'Fallecimiento de hermano', 'Fallecimiento de suegro',
  'Fallecimiento de suegra', 'Fallecimiento de abuelo', 'Fallecimiento de abuela',
  'Donación de sangre', 'Trámite personal', 'Otra',
];

export default function Justificaciones() {
  const [items, setItems] = useState<Lic[]>([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});
  const nuevoFile = useRef<HTMLInputElement | null>(null);
  const [nTipo, setNTipo] = useState(''); const [nTipoOtra, setNTipoOtra] = useState('');
  const [nDesde, setNDesde] = useState(''); const [nHasta, setNHasta] = useState('');
  const [nMotivo, setNMotivo] = useState(''); const [nArchivo, setNArchivo] = useState<File | null>(null);
  const [creando, setCreando] = useState(false);

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

  async function justificarNueva() {
    setErr(''); setOk('');
    const tipo = nTipo === 'Otra' ? nTipoOtra.trim() : nTipo;
    if (!tipo) { setErr('Elegí el tipo de licencia (o especificá en "Otra").'); return; }
    if (!nDesde || !nHasta) { setErr('Indicá las fechas desde y hasta.'); return; }
    if (nHasta < nDesde) { setErr('La fecha hasta debe ser posterior a desde.'); return; }
    if (!nArchivo) { setErr('Adjuntá el comprobante que justifica la licencia.'); return; }
    if (nArchivo.size > MAX) { setErr('El comprobante no puede superar 5 MB.'); return; }
    setCreando(true);
    try {
      const comprobanteData = await readFile(nArchivo);
      await api.post('/licencias/justificar', { tipo, desde: nDesde, hasta: nHasta, motivo: nMotivo || null, comprobanteNombre: nArchivo.name, comprobanteMime: nArchivo.type, comprobanteData });
      setOk(`Licencia de ${tipo} informada y justificada. Queda a la vista de RR.HH.`);
      setNTipo(''); setNTipoOtra(''); setNDesde(''); setNHasta(''); setNMotivo(''); setNArchivo(null);
      if (nuevoFile.current) nuevoFile.current.value = '';
      load();
    } catch (e: any) { setErr(e.message); } finally { setCreando(false); }
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
        Aquí justificás cada licencia adjuntando el comprobante. Si fue una licencia imprevisible que no solicitaste antes, podés informarla y justificarla directamente con el formulario de abajo.
      </p>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="muted" style={{ marginBottom: 12, color: 'var(--green)' }}>✓ {ok}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Justificar una licencia no cargada</h3>
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
          Para licencias imprevisibles (enfermedad, fallecimiento, etc.) que no pudiste solicitar con anticipación: informalas y justificalas acá adjuntando el comprobante.
        </p>
        <div className="grid2">
          <div className="field">
            <label>Tipo de licencia *</label>
            <select className="input" value={nTipo} onChange={(e) => setNTipo(e.target.value)}>
              <option value="">Elegí un tipo…</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {nTipo === 'Otra' && (
            <div className="field"><label>Especificar tipo *</label><input className="input" value={nTipoOtra} onChange={(e) => setNTipoOtra(e.target.value)} placeholder="Detallá el motivo" /></div>
          )}
          <div className="field"><label>Desde *</label><input className="input" type="date" value={nDesde} onChange={(e) => setNDesde(e.target.value)} /></div>
          <div className="field"><label>Hasta *</label><input className="input" type="date" value={nHasta} onChange={(e) => setNHasta(e.target.value)} /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Observaciones (opcional)</label><input className="input" value={nMotivo} onChange={(e) => setNMotivo(e.target.value)} placeholder="Aclaración para RR.HH." /></div>
        </div>
        <div className="row" style={{ alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <input ref={nuevoFile} type="file" accept=".pdf,image/*" onChange={(e) => setNArchivo(e.target.files?.[0] || null)} />
          <span className="muted" style={{ fontSize: 12 }}>{nArchivo ? nArchivo.name : 'Adjuntá el comprobante (PDF o imagen, máx. 5 MB)'}</span>
          <button className="btn" style={{ marginLeft: 'auto' }} disabled={creando} onClick={justificarNueva}>{creando ? 'Enviando…' : 'Informar y justificar'}</button>
        </div>
      </div>

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
            {!items.length && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 20 }}>Todavía no tenés licencias. Usá el formulario de arriba para justificar una imprevisible.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
