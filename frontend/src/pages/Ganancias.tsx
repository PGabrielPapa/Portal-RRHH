import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import EmpleadoPicker from '../components/EmpleadoPicker';
import type { Empleado } from '../lib/types';

interface F1357 {
  empleado: { legNum: string; nom: string; empresa: string; cuil?: string; cat?: string };
  periodo: { anio: number; mes: number; periodoLabel: string; tablas: string; anualizada?: boolean; mesesTranscurridos?: number };
  gravadas: { remBrutaNoHab: number; sac: number; totalGravada: number };
  dedGenerales: { jubilacion: number; obraSocial: number; cuotaSindical: number; total: number };
  dedPersonales: { mni: number; cargasFamilia: { total: number; nHijos: number; nHijosInc: number; tieneConyuge: boolean }; dedEspecial: number; dedEspecial2: number; dedVoluntarias: number; total: number };
  determinacion: { remSujeta: number; impuestoDeterminado: number; retenidoAnterior: number; impuestoARetener: number; devolucion: number };
  nota: string;
}

const $ = (n: number) => (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function Fila({ l, v, bold, bg }: { l: string; v: number; bold?: boolean; bg?: string }) {
  return (
    <tr style={{ background: bg, fontWeight: bold ? 700 : 400 }}>
      <td style={{ padding: '3px 10px', borderBottom: '1px solid var(--border)' }}>{l}</td>
      <td style={{ padding: '3px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>$ {$(v)}</td>
    </tr>
  );
}
const Banda = ({ t }: { t: string }) => (
  <tr><td colSpan={2} style={{ padding: '5px 10px', fontWeight: 700, fontSize: 12, background: 'var(--bg2)', borderTop: '2px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t}</td></tr>
);

function Formulario({ f }: { f: F1357 }) {
  const cf = f.dedPersonales.cargasFamilia;
  const print = () => {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>F.1357 ${f.empleado.nom} ${f.periodo.periodoLabel}</title></head><body>${document.getElementById('f1357-print')?.innerHTML || ''}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <strong>{f.empleado.nom}</strong> <span className="muted">· Leg. {f.empleado.legNum} · {f.empleado.empresa}</span>
          <div className="muted" style={{ fontSize: 12 }}>CUIL {f.empleado.cuil || '—'} · Período acumulado a {f.periodo.periodoLabel} · Tablas {f.periodo.tablas}</div>
        </div>
        <button className="btn ghost" onClick={print}>🖨 Imprimir / PDF</button>
      </div>
      <div id="f1357-print">
        <h3 style={{ margin: '0 0 8px' }}>Impuesto a las Ganancias — F.1357 <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({f.periodo.anualizada ? 'anualizado' : `acumulado a ${f.periodo.mesesTranscurridos} mes(es)`})</span></h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <Banda t="Remuneraciones gravadas" />
            <Fila l="Remuneración bruta y no habituales" v={f.gravadas.remBrutaNoHab} />
            <Fila l="SAC" v={f.gravadas.sac} />
            <Fila l="Total remuneración gravada" v={f.gravadas.totalGravada} bold />
            <Banda t="Deducciones generales" />
            <Fila l="Aportes jubilatorios (ANSES)" v={f.dedGenerales.jubilacion} />
            <Fila l="Aportes a Obra Social" v={f.dedGenerales.obraSocial} />
            <Fila l="Cuotas sindicales" v={f.dedGenerales.cuotaSindical} />
            <Fila l="Total deducciones generales" v={f.dedGenerales.total} bold />
            <Banda t="Deducciones personales" />
            <Fila l="Ganancia no imponible (MNI)" v={f.dedPersonales.mni} />
            <Fila l={`Cargas de familia (cónyuge: ${cf.tieneConyuge ? 'sí' : 'no'} · hijos: ${cf.nHijos}${cf.nHijosInc ? ` · incap.: ${cf.nHijosInc}` : ''})`} v={cf.total} />
            <Fila l="Deducción especial" v={f.dedPersonales.dedEspecial} />
            <Fila l="Deducción especial (2° párr. art. 30)" v={f.dedPersonales.dedEspecial2} />
            {f.dedPersonales.dedVoluntarias > 0 && <Fila l="Deducciones generales (SIRADIG)" v={f.dedPersonales.dedVoluntarias} />}
            <Fila l="Total deducciones personales" v={f.dedPersonales.total} bold />
            <Banda t="Determinación del impuesto" />
            <Fila l="Remuneración sujeta a impuesto" v={f.determinacion.remSujeta} bold />
            <Fila l="Impuesto determinado (acumulado)" v={f.determinacion.impuestoDeterminado} bold bg="var(--bg2)" />
            <Fila l="Retenido en períodos anteriores" v={f.determinacion.retenidoAnterior} />
            {f.determinacion.devolucion > 0
              ? <Fila l="Devolución a favor del empleado" v={f.determinacion.devolucion} bold bg="var(--bg2)" />
              : <Fila l="Impuesto a retener del período" v={f.determinacion.impuestoARetener} bold bg="var(--bg2)" />}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>{f.nota}</p>
      </div>
    </div>
  );
}

export default function Ganancias() {
  const { key } = useParams();
  const esRRHH = key === 'ganancias-rrhh';
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [emp, setEmp] = useState<Empleado | null>(null);
  const [data, setData] = useState<F1357 | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setErr(''); setBusy(true); setData(null);
    try {
      const qs = `?anio=${anio}&mes=${mes}`;
      const out = esRRHH
        ? (emp ? await api.get<F1357>(`/ganancias/f1357/${emp.id}${qs}`) : null)
        : await api.get<F1357>(`/ganancias/f1357${qs}`);
      setData(out);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { if (!esRRHH) cargar(); /* eslint-disable-next-line */ }, [anio, mes]);
  useEffect(() => { if (esRRHH && emp) cargar(); /* eslint-disable-next-line */ }, [emp, anio, mes]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Ganancias — F.1357</h2>
      <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {esRRHH && <div className="field" style={{ minWidth: 260 }}><label>Empleado</label><EmpleadoPicker onSelect={setEmp} /></div>}
        <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
        <div className="field"><label>Año</label><input className="input" style={{ width: 100 }} type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} /></div>
      </div>
      {busy && <div className="muted">Calculando…</div>}
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {esRRHH && !emp && <div className="muted">Elegí un empleado para ver su F.1357.</div>}
      {data && <Formulario f={data} />}
    </>
  );
}
