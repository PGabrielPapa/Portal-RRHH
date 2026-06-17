import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fmt = (d?: string) => d ? new Date(d).toLocaleString('es-AR') : '—';

// minutos → "HH:MM" (negativos con signo).
function minToHhmm(min: number): string {
  const neg = min < 0;
  const a = Math.abs(Math.round(min || 0));
  const h = Math.floor(a / 60), m = a % 60;
  return `${neg ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface DiaDetalle {
  fecha: string; dia: string; entrada?: string; salida?: string;
  hsNetasMin: number; hsNormalMin: number; saldoMin: number | null;
  extra50Min: number; extra100Min: number; extraComputa: boolean;
  tardeMin: number; completa: boolean; estado: 'ok' | 'no-laborable' | 'revisar';
}
interface DiaRevisar { fecha: string; motivo: string; tarde?: string; }
interface FichadaData {
  legajoProsoft?: string; diasTrabajados?: number; horasExtra50Min?: number; horasExtra100Min?: number;
  horasExtraDescartadaMin?: number; tardanzasMin?: number; diasTardanza?: number;
  diasARevisar?: DiaRevisar[]; bancoNetoMin?: number; dias?: DiaDetalle[];
}
interface Row {
  empleado_id: number; leg_num: string; nom: string; empresa: string;
  data: FichadaData; importado_por?: string; updated_at?: string;
}
interface ImportLog {
  id: number; anio: number; mes: number; archivo?: string; filas: number; legajos: number;
  matcheados: number; sin_match: number; importado_por?: string; created_at?: string;
}

export default function FichadasConsulta() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<ImportLog[]>([]);
  const [expand, setExpand] = useState<Set<number>>(new Set());
  const [soloRevisar, setSoloRevisar] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setErr(''); setExpand(new Set());
    try {
      const r = await api.get<Row[]>(`/fichadas/${anio}/${mes}`);
      setRows(r); setLoaded(true);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { api.get<ImportLog[]>('/fichadas/importaciones/log').then(setLog).catch(() => {}); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function toggle(id: number) {
    setExpand((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const visibles = soloRevisar ? rows.filter((r) => (r.data.diasARevisar?.length || 0) > 0) : rows;
  const tot = rows.reduce((acc, r) => {
    acc.dias += r.data.diasTrabajados || 0;
    acc.banco += r.data.bancoNetoMin || 0;
    acc.e50 += r.data.horasExtra50Min || 0;
    acc.tarde += r.data.tardanzasMin || 0;
    acc.rev += (r.data.diasARevisar?.length || 0);
    return acc;
  }, { dias: 0, e50: 0, tarde: 0, rev: 0, banco: 0 });

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Hacé clic en un empleado para ver el <b>detalle día por día</b>: marcas, jornada esperada y el saldo de cada día que arma el banco de horas. Para cargar un período nuevo usá <b>Importar fichadas (Pro-Soft)</b>.
      </p>

      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field"><label>Mes</label>
            <select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Año</label>
            <input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
          </div>
          <button className="btn" onClick={load}>🔍 Consultar</button>
          {loaded && rows.length > 0 && (
            <label className="row" style={{ gap: 6, alignItems: 'center', marginLeft: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={soloRevisar} onChange={(e) => setSoloRevisar(e.target.checked)} />
              <span className="muted">Solo con días a revisar</span>
            </label>
          )}
        </div>
      </div>

      {loaded && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
            <Stat n={rows.length} label={`Empleados con fichadas (${MESES[mes - 1]} ${anio})`} />
            <Stat n={tot.dias} label="Días trabajados (total)" />
            <Stat txt={minToHhmm(tot.e50)} label="Hs extra 50 (total)" />
            <Stat txt={minToHhmm(tot.banco)} label="Banco de horas (saldo total)" color={tot.banco < 0 ? '#dc2626' : '#16a34a'} />
            <Stat txt={minToHhmm(tot.tarde)} label="Tardanzas (total)" />
            <Stat n={tot.rev} label="Días a revisar (total)" color={tot.rev ? '#d97706' : undefined} />
          </div>
        </div>
      )}

      {loaded && (
        <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 16 }}>
          <table>
            <thead><tr><th style={{ width: 24 }}></th><th>Legajo</th><th>Empleado</th><th>Empresa</th><th style={{ textAlign: 'right' }}>Días trab.</th><th style={{ textAlign: 'right' }}>Hs Extra 50</th><th style={{ textAlign: 'right' }}>Tardanzas</th><th style={{ textAlign: 'right' }}>Banco mes</th><th style={{ textAlign: 'right' }}>A revisar</th></tr></thead>
            <tbody>
              {visibles.map((r) => (
                <FilaEmpleado key={r.empleado_id} r={r} abierto={expand.has(r.empleado_id)} onToggle={() => toggle(r.empleado_id)} />
              ))}
              {!visibles.length && <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 20 }}>{rows.length ? 'Ningún empleado con días a revisar.' : `No hay fichadas importadas para ${MESES[mes - 1]} ${anio}.`}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <h3 style={{ margin: '12px 16px' }}>Historial de importaciones</h3>
        <table>
          <thead><tr><th>Período</th><th style={{ textAlign: 'right' }}>Filas</th><th style={{ textAlign: 'right' }}>Legajos</th><th style={{ textAlign: 'right' }}>Cruzaron</th><th style={{ textAlign: 'right' }}>Sin match</th><th>Archivo</th><th>Importado por</th><th>Fecha</th></tr></thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id}>
                <td>{MESES[l.mes - 1]} {l.anio}</td>
                <td style={{ textAlign: 'right' }}>{l.filas}</td>
                <td style={{ textAlign: 'right' }}>{l.legajos}</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>{l.matcheados}</td>
                <td style={{ textAlign: 'right', color: l.sin_match ? '#dc2626' : undefined }}>{l.sin_match}</td>
                <td className="muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.archivo || '—'}</td>
                <td className="muted">{l.importado_por || '—'}</td>
                <td className="muted">{fmt(l.created_at)}</td>
              </tr>
            ))}
            {!log.length && <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 20 }}>Todavía no se importó ningún período.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilaEmpleado({ r, abierto, onToggle }: { r: Row; abierto: boolean; onToggle: () => void }) {
  const d = r.data || {};
  const nRev = d.diasARevisar?.length || 0;
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={{ textAlign: 'center', color: '#888' }}>{abierto ? '▼' : '▸'}</td>
        <td className="muted">{r.leg_num}</td>
        <td>{r.nom}</td>
        <td className="muted">{r.empresa}</td>
        <td style={{ textAlign: 'right' }}>{d.diasTrabajados ?? 0}</td>
        <td style={{ textAlign: 'right' }}>{minToHhmm(d.horasExtra50Min || 0)}</td>
        <td style={{ textAlign: 'right' }}>{minToHhmm(d.tardanzasMin || 0)}{d.diasTardanza ? <span className="muted"> ({d.diasTardanza}d)</span> : null}</td>
        <td style={{ textAlign: 'right', color: (d.bancoNetoMin || 0) < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{minToHhmm(d.bancoNetoMin || 0)}</td>
        <td style={{ textAlign: 'right', color: nRev ? '#d97706' : undefined }}>{nRev || '—'}</td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={9} style={{ background: 'rgba(120,130,160,.06)', padding: '4px 10px 14px' }}>
            <DetalleDias d={d} nom={r.nom} />
          </td>
        </tr>
      )}
    </>
  );
}

function DetalleDias({ d, nom }: { d: FichadaData; nom: string }) {
  const dias = d.dias || [];
  if (!dias.length) return <span className="muted">Sin detalle diario para este empleado (importado con una versión anterior; reimportá el período).</span>;
  const extraDe = (x: DiaDetalle) => {
    const e = (x.extra50Min || 0) + (x.extra100Min || 0);
    if (e <= 0) return '—';
    return minToHhmm(e) + (x.extraComputa ? '' : ' (<30m)');
  };
  return (
    <div style={{ overflow: 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 2px 6px' }}>Detalle diario de {nom} — el banco del mes es la suma de la columna "Saldo día".</div>
      <table style={{ fontSize: 12.5 }}>
        <thead><tr>
          <th>Fecha</th><th>Día</th><th>Entrada</th><th>Salida</th>
          <th style={{ textAlign: 'right' }}>Hs Netas</th><th style={{ textAlign: 'right' }}>Jornada</th>
          <th style={{ textAlign: 'right' }}>Saldo día</th><th style={{ textAlign: 'right' }}>Extra</th>
          <th style={{ textAlign: 'right' }}>Tarde</th><th>Estado</th>
        </tr></thead>
        <tbody>
          {dias.map((x, i) => (
            <tr key={i} style={{ background: x.estado === 'revisar' ? 'rgba(217,119,6,.10)' : undefined }}>
              <td className="muted">{x.fecha}</td>
              <td>{x.dia}</td>
              <td>{x.entrada || '—'}</td>
              <td>{x.salida || '—'}</td>
              <td style={{ textAlign: 'right' }}>{minToHhmm(x.hsNetasMin)}</td>
              <td style={{ textAlign: 'right' }} className="muted">{minToHhmm(x.hsNormalMin)}</td>
              <td style={{ textAlign: 'right', color: x.saldoMin == null ? '#888' : (x.saldoMin < 0 ? '#dc2626' : '#16a34a') }}>{x.saldoMin == null ? '—' : minToHhmm(x.saldoMin)}</td>
              <td style={{ textAlign: 'right' }}>{extraDe(x)}</td>
              <td style={{ textAlign: 'right', color: x.tardeMin > 0 && x.completa ? '#d97706' : undefined }}>{x.tardeMin > 0 ? minToHhmm(x.tardeMin) : '—'}</td>
              <td>{x.estado === 'ok' ? <span style={{ color: '#16a34a' }}>OK</span> : x.estado === 'no-laborable' ? <span className="muted">finde/feriado (a favor)</span> : <span style={{ color: '#d97706' }}>⚠ revisar (marca incompleta)</span>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 600, borderTop: '2px solid rgba(120,130,160,.3)' }}>
            <td colSpan={6} style={{ textAlign: 'right' }}>Banco del mes (suma de saldos):</td>
            <td style={{ textAlign: 'right', color: (d.bancoNetoMin || 0) < 0 ? '#dc2626' : '#16a34a' }}>{minToHhmm(d.bancoNetoMin || 0)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Stat({ n, txt, label, color }: { n?: number; txt?: string; label: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{txt ?? n}</div>
      <div className="muted" style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}
