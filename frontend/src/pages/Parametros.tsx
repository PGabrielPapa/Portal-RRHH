import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type Data = Record<string, any>;

const LABELS: Record<string, string> = {
  pctJubilacion: 'Jubilación (trab.) %', pctObraSocial: 'Obra Social (trab.) %', pctAnssal: 'ANSSAL %',
  pctPamiEmp: 'PAMI (trab.) %', pctSindicatoEmp: 'Sindicato (trab.) %', nombreSindicato: 'Nombre sindicato',
  pctJubPatronal: 'Jubilación patronal %', pctOsPatronal: 'Obra Social patronal %', pctPamiPatronal: 'PAMI patronal %',
  pctDesempleo: 'Fondo desempleo %', pctArt: 'ART %', pctSindicatoPatronal: 'Sindicato patronal %',
  scvoPercapita: 'SCVO ($ per cápita)', gan_topeRetencionPct: 'Tope retención Ganancias %',
  pctPresentismo: 'Presentismo %', pctAntiguedadPorAnio: 'Antigüedad por año %',
  smvmMensual: 'SMVM mensual', f931TopeJub: 'F.931 tope jubilación', f931TopeOS: 'F.931 tope OS',
};

const GROUPS: { titulo: string; keys: string[] }[] = [
  { titulo: 'Aportes del trabajador', keys: ['pctJubilacion', 'pctObraSocial', 'pctAnssal', 'pctPamiEmp', 'pctSindicatoEmp', 'nombreSindicato'] },
  { titulo: 'Contribuciones patronales', keys: ['pctJubPatronal', 'pctOsPatronal', 'pctPamiPatronal', 'pctDesempleo', 'pctArt', 'pctSindicatoPatronal', 'scvoPercapita'] },
  { titulo: 'Conceptos remunerativos', keys: ['pctPresentismo', 'pctAntiguedadPorAnio'] },
  { titulo: 'Ganancias / Topes', keys: ['gan_topeRetencionPct', 'smvmMensual', 'f931TopeJub', 'f931TopeOS'] },
];

export default function Parametros() {
  const { user } = useAuth();
  const canEdit = user?.role === 'rrhh' || user?.role === 'admin';
  const [data, setData] = useState<Data | null>(null);
  const [edits, setEdits] = useState<Data>({});
  const [info, setInfo] = useState('');
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api.get<{ data: Data; updated_by?: string; updated_at?: string }>('/parametros');
      setData(r.data || {});
      if (r.updated_at) setInfo(`Última actualización: ${new Date(r.updated_at).toLocaleString('es-AR')}${r.updated_by ? ` por ${r.updated_by}` : ''}`);
    } catch (e: any) { setMsg({ t: e.message, ok: false }); }
  }
  useEffect(() => { load(); }, []);

  function setField(k: string, v: string, isNum: boolean) {
    setEdits({ ...edits, [k]: isNum ? (v === '' ? '' : Number(v)) : v });
  }
  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put<{ data: Data }>('/parametros', edits);
      setData(r.data); setEdits({});
      setMsg({ t: 'Parámetros guardados', ok: true });
    } catch (e: any) { setMsg({ t: e.message, ok: false }); } finally { setBusy(false); }
  }

  if (!data) return <div className="muted">Cargando…</div>;
  const val = (k: string) => (k in edits ? edits[k] : data[k]);
  const usados = new Set(GROUPS.flatMap((g) => g.keys));
  const otros = Object.keys(data).filter((k) => !usados.has(k) && ['number', 'string'].includes(typeof data[k]));

  const renderField = (k: string) => {
    const isNum = typeof data[k] === 'number';
    return (
      <div className="field" key={k}>
        <label>{LABELS[k] || k}</label>
        <input className="input" disabled={!canEdit} type={isNum ? 'number' : 'text'} step="0.01"
          value={val(k) ?? ''} onChange={(e) => setField(k, e.target.value, isNum)} />
      </div>
    );
  };

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Parámetros de liquidación</h2>
      {info && <p className="muted" style={{ marginTop: -8 }}>{info}</p>}
      {!canEdit && <div className="muted" style={{ marginBottom: 12 }}>Solo lectura (requiere rol RR.HH. o admin para editar).</div>}

      {GROUPS.map((g) => (
        <div className="card" style={{ marginBottom: 14 }} key={g.titulo}>
          <h3 style={{ marginTop: 0 }}>{g.titulo}</h3>
          <div className="grid2">{g.keys.filter((k) => k in data).map(renderField)}</div>
        </div>
      ))}

      {otros.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>Otros parámetros</h3>
          <div className="grid2">{otros.map(renderField)}</div>
        </div>
      )}

      {msg && <div className={msg.ok ? 'ok' : 'err'} style={{ marginBottom: 10 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.t}</div>}
      {canEdit && <button className="btn" onClick={save} disabled={busy || Object.keys(edits).length === 0}>{busy ? 'Guardando…' : `Guardar cambios${Object.keys(edits).length ? ` (${Object.keys(edits).length})` : ''}`}</button>}
    </>
  );
}
