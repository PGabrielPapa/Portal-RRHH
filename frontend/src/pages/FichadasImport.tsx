import { useState } from 'react';
import { api } from '../lib/api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DiaRevisar { fecha: string; motivo: string; tarde?: string; }
interface Matcheado {
  empleadoId: number; legNum: string; nom: string; empresa: string; legajoProsoft: string;
  diasTrabajados: number; horasExtra50: string; horasExtra100: string; tardanzas: string;
  diasTardanza: number; diasARevisar: DiaRevisar[]; bancoNeto: string; bancoNetoMin: number;
}
interface SinMatch {
  legajoProsoft: string; empleado: string; empresaProsoft: string; area: string;
  diasTrabajados: number; horasExtra50: string; tardanzas: string;
}
interface Resumen { filas: number; legajos: number; matcheados: number; sinMatch: number; conRevisar: number; }
interface Preview { confirmado: boolean; periodo: { anio: number; mes: number }; resumen: Resumen; matcheados: Matcheado[]; sinMatch: SinMatch[]; }

export default function FichadasImport() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  function buildForm(): FormData {
    const fd = new FormData();
    fd.append('archivo', file as File);
    fd.append('anio', String(anio));
    fd.append('mes', String(mes));
    return fd;
  }

  async function previsualizar() {
    setErr(''); setOk(''); setPreview(null);
    if (!file) { setErr('Elegí el Excel "Reporte Marcas Extendido" de Pro-Soft.'); return; }
    setBusy(true);
    try {
      const r = await api.postForm<Preview>('/fichadas/importar', buildForm());
      setPreview(r);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function confirmar() {
    setErr(''); setOk('');
    if (!file) return;
    setBusy(true);
    try {
      const r = await api.postForm<Preview>('/fichadas/importar?confirmar=true', buildForm());
      setPreview(r);
      setOk(`Importación confirmada: ${r.resumen.matcheados} empleados actualizados para ${MESES[mes - 1]} ${anio}.`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Subí el <b>Reporte Marcas Extendido</b> de Pro-Soft (Reportes → Resumen → Excel Extendido) del período. El sistema lo cruza por
        legajo y carga, por empleado, los días trabajados, horas extra y tardanzas. Las tardanzas solo se cuentan en días con marca completa;
        el resto queda <b>a revisar</b>. Las horas extra son <b>informativas</b> (no se liquidan automáticamente).
      </p>

      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}
      {ok && <div className="ok" style={{ marginBottom: 12 }}>✓ {ok}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field"><label>Mes</label>
            <select className="input" value={mes} onChange={(e) => { setMes(Number(e.target.value)); setPreview(null); }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Año</label>
            <input className="input" type="number" style={{ width: 100 }} value={anio} onChange={(e) => { setAnio(Number(e.target.value)); setPreview(null); }} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 240 }}><label>Archivo Excel (.xlsx)</label>
            <input className="input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setOk(''); }} />
          </div>
          <button className="btn" onClick={previsualizar} disabled={busy || !file}>{busy ? '…' : '👁 Previsualizar'}</button>
          {preview && !preview.confirmado && (
            <button className="btn" style={{ background: '#16a34a' }} onClick={confirmar} disabled={busy}>✓ Confirmar importación</button>
          )}
        </div>
      </div>

      {preview && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Resumen del período {MESES[preview.periodo.mes - 1]} {preview.periodo.anio} {preview.confirmado ? '— ✓ importado' : '— (previsualización)'}</h3>
            <div className="row" style={{ gap: 24, flexWrap: 'wrap' }}>
              <Stat n={preview.resumen.legajos} label="Legajos en el archivo" />
              <Stat n={preview.resumen.matcheados} label="Cruzaron con el portal" color="#16a34a" />
              <Stat n={preview.resumen.sinMatch} label="Sin match" color={preview.resumen.sinMatch ? '#dc2626' : undefined} />
              <Stat n={preview.resumen.conRevisar} label="Con días a revisar" color={preview.resumen.conRevisar ? '#d97706' : undefined} />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: 16 }}>
            <table>
              <thead><tr><th>Legajo</th><th>Empleado</th><th>Empresa</th><th style={{ textAlign: 'right' }}>Días trab.</th><th style={{ textAlign: 'right' }}>Hs Extra 50</th><th style={{ textAlign: 'right' }}>Tardanzas</th><th style={{ textAlign: 'right' }}>Banco mes</th><th style={{ textAlign: 'right' }}>A revisar</th></tr></thead>
              <tbody>
                {preview.matcheados.map((m) => (
                  <tr key={m.empleadoId}>
                    <td className="muted">{m.legNum}</td>
                    <td>{m.nom}</td>
                    <td className="muted">{m.empresa}</td>
                    <td style={{ textAlign: 'right' }}>{m.diasTrabajados}</td>
                    <td style={{ textAlign: 'right' }}>{m.horasExtra50}</td>
                    <td style={{ textAlign: 'right' }}>{m.tardanzas}{m.diasTardanza ? <span className="muted"> ({m.diasTardanza}d)</span> : null}</td>
                    <td style={{ textAlign: 'right', color: m.bancoNetoMin < 0 ? '#dc2626' : '#16a34a' }}>{m.bancoNeto}</td>
                    <td style={{ textAlign: 'right', color: m.diasARevisar.length ? '#d97706' : undefined }}>{m.diasARevisar.length || '—'}</td>
                  </tr>
                ))}
                {!preview.matcheados.length && <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 20 }}>Ningún legajo cruzó con el portal.</td></tr>}
              </tbody>
            </table>
          </div>

          {preview.sinMatch.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <h3 style={{ margin: '12px 16px' }}>Legajos sin match en el portal ({preview.sinMatch.length})</h3>
              <table>
                <thead><tr><th>Legajo Pro-Soft</th><th>Empleado</th><th>Empresa</th><th>Área</th></tr></thead>
                <tbody>
                  {preview.sinMatch.map((s, i) => (
                    <tr key={i}><td className="muted">{s.legajoProsoft}</td><td>{s.empleado}</td><td className="muted">{s.empresaProsoft || '—'}</td><td className="muted">{s.area || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ margin: '10px 16px 14px' }}>Estos empleados están en Pro-Soft pero no tienen un legajo equivalente cargado en el portal. Sus novedades no se importan hasta que existan.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{n}</div>
      <div className="muted" style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}
