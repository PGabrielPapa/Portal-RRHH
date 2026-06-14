import { useEffect, useState } from 'react';
import { api, fetchBlob } from '../lib/api';
import type { Empleado } from '../lib/types';
import ReciboView, { Recibo } from '../components/ReciboView';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TIPOS: [string, string][] = [['mensual', 'Mensual'], ['quincenal_1', 'Quincena 1ª (1–15)'], ['quincenal_2', 'Quincena 2ª (16–fin)'], ['sac1', 'SAC 1° semestre'], ['sac2', 'SAC 2° semestre'], ['vacaciones', 'Vacaciones'], ['anticipo', 'Anticipo de haberes'], ['complementaria', 'Ajuste de sueldo (remunerativo)'], ['anticipo_ajuste', 'Anticipo ajuste de sueldo (no rem.)'], ['final', 'Liquidación final']];
const $ = (n: any) => (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ───────────── Individual ─────────────
function Individual() {
  const [q, setQ] = useState(''); const [matches, setMatches] = useState<Empleado[]>([]); const [sel, setSel] = useState<Empleado | null>(null);
  const [empresa, setEmpresa] = useState(''); const [empresas, setEmpresas] = useState<string[]>([]);
  useEffect(() => { api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);
  const [mes, setMes] = useState(new Date().getMonth() + 1); const [anio, setAnio] = useState(new Date().getFullYear());
  const [tipo, setTipo] = useState('mensual');
  const [fin, setFin] = useState<Record<string, string>>({ motivoBaja: 'sin_causa' });
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');

  async function buscar(v: string) { setQ(v); setSel(null); if (v.trim().length < 2) { setMatches([]); return; } try { const qs = `/empleados?q=${encodeURIComponent(v)}${empresa ? `&empresa=${encodeURIComponent(empresa)}` : ''}`; setMatches((await api.get<Empleado[]>(qs)).slice(0, 8)); } catch { /* */ } }
  function elegir(e: Empleado) { setSel(e); setQ(`${e.nom} (${e.legNum})`); setMatches([]); setRecibo(null); setMsg(''); }
  const esPeriodo = (t: string) => t === 'mensual' || t === 'quincenal_1' || t === 'quincenal_2';
  function body() { const b: any = { empleadoId: sel!.id, anio, mes, tipo }; if (fin.fechaPago) b.fechaPago = fin.fechaPago;
    if (esPeriodo(tipo)) {
      const nv: any = {};
      if (fin.diasTrabajados) nv.diasTrabajados = Number(fin.diasTrabajados);
      if (fin.horasExtra50) nv.horasExtra50 = Number(fin.horasExtra50);
      if (fin.horasExtra100) nv.horasExtra100 = Number(fin.horasExtra100);
      if (fin.otrosRemun) { nv.otrosRemun = Number(fin.otrosRemun); nv.otrosRemunLabel = fin.otrosRemunLabel; }
      if (fin.otrosNoRem) { nv.otrosNoRem = Number(fin.otrosNoRem); nv.otrosNoRemLabel = fin.otrosNoRemLabel; }
      if (fin.otrosDesc) { nv.otrosDesc = Number(fin.otrosDesc); nv.otrosDescLabel = fin.otrosDescLabel; }
      if (fin.embargo) nv.embargo = Number(fin.embargo);
      if (fin.embargoAlimentosPct) nv.embargoAlimentosPct = Number(fin.embargoAlimentosPct);
      if (fin.cuotaAlimentaria) nv.cuotaAlimentaria = Number(fin.cuotaAlimentaria);
      if (fin.diasSuspension) nv.diasSuspension = Number(fin.diasSuspension);
      if (fin.ausenciasInjustificadas) nv.ausenciasInjustificadas = Number(fin.ausenciasInjustificadas);
      if (fin.feriadosTrabajados) nv.feriadosTrabajados = Number(fin.feriadosTrabajados);
      if (fin.hsExtrasExentas) nv.hsExtrasExentas = Number(fin.hsExtrasExentas);
      if (fin.bonoProductividadExento) nv.bonoProductividadExento = Number(fin.bonoProductividadExento);
      if (fin.indemnizaciones) nv.indemnizaciones = Number(fin.indemnizaciones);
      if (fin.otrosExentos) { nv.otrosExentos = Number(fin.otrosExentos); nv.otrosExentosLabel = fin.otrosExentosLabel; }
      if (fin.dedVoluntariasAnual) nv.dedVoluntariasAnual = Number(fin.dedVoluntariasAnual);
      if (fin.tieneConyuge) nv.tieneConyuge = true;
      if (fin.nroHijosMenores) nv.nroHijosMenores = Number(fin.nroHijosMenores);
      if (fin.nroHijosIncapacitados) nv.nroHijosIncapacitados = Number(fin.nroHijosIncapacitados);
      Object.assign(b, nv);
    } if (tipo === 'final') Object.assign(b, { fechaEgreso: fin.fechaEgreso, motivoBaja: fin.motivoBaja, diasVacNoGozadas: fin.diasVacNoGozadas ? Number(fin.diasVacNoGozadas) : 0, mejorRem: fin.mejorRem ? Number(fin.mejorRem) : undefined }); if (tipo === 'vacaciones' && fin.diasVac) b.diasVac = Number(fin.diasVac); if (tipo === 'anticipo') b.montoAnticipo = Number(fin.montoAnticipo || 0); if (tipo === 'complementaria') { b.montoAjuste = Number(fin.montoAjuste || 0); b.conceptoAjuste = fin.conceptoAjuste; } if (tipo === 'anticipo_ajuste') { b.montoAnticipoAjuste = Number(fin.montoAnticipoAjuste || 0); b.conceptoAjuste = fin.conceptoAjuste; } if (tipo === 'mensual' || tipo === 'quincenal_1' || tipo === 'quincenal_2') { if (fin.ajusteSueldoBruto) b.ajusteSueldoBruto = Number(fin.ajusteSueldoBruto); if (fin.anticipoAjusteDesc) b.anticipoAjusteDesc = Number(fin.anticipoAjusteDesc); } return b; }
  async function calcular() { if (!sel) return; setErr(''); setMsg(''); setBusy(true); setRecibo(null); try { setRecibo(await api.post<Recibo>('/liquidacion/calcular', body())); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } }
  async function guardar() { if (!sel) return; setErr(''); setBusy(true); try { await api.post('/liquidacion/guardar', body()); setMsg('Recibo guardado y publicado ✓ (visible en “Mis recibos”)'); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } }

  return (
    <>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field" style={{ marginBottom: 12, maxWidth: 360 }}>
          <label>Empresa</label>
          <select className="input" value={empresa} onChange={(e) => { setEmpresa(e.target.value); setSel(null); setMatches([]); setQ(''); }}>
            <option value="">Todas las empresas</option>
            {empresas.map((em) => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>
        <div className="field" style={{ position: 'relative', marginBottom: 12 }}>
          <label>Empleado</label>
          <input className="input" placeholder="Buscar por nombre, legajo o DNI…" value={q} onChange={(e) => buscar(e.target.value)} />
          {matches.length > 0 && (
            <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 240, overflow: 'auto' }}>
              {matches.map((e) => <div key={e.id} onClick={() => elegir(e)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{e.nom} <span className="muted">· {e.legNum} · {e.empresa}</span></div>)}
            </div>
          )}
        </div>
        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field"><label>Tipo</label><select className="input" value={tipo} onChange={(e) => { setTipo(e.target.value); setRecibo(null); }}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
          <div className="field"><label>Año</label><input className="input" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ width: 100 }} /></div>
          <div className="field"><label>Fecha de pago</label><input className="input" type="date" value={fin.fechaPago || ''} onChange={(e) => setFin({ ...fin, fechaPago: e.target.value })} /></div>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: -4, marginBottom: 4 }}>La fecha de pago define la tabla de Ganancias aplicable.</div>
        {tipo === 'vacaciones' && <div className="field" style={{ marginTop: 10, maxWidth: 200 }}><label>Días de vacaciones</label><input className="input" type="number" value={fin.diasVac || ''} onChange={(e) => setFin({ ...fin, diasVac: e.target.value })} placeholder="por antigüedad" /></div>}
        {tipo === 'anticipo' && <div className="field" style={{ marginTop: 10, maxWidth: 240 }}><label>Monto del anticipo *</label><input className="input" type="number" value={fin.montoAnticipo || ''} onChange={(e) => setFin({ ...fin, montoAnticipo: e.target.value })} /></div>}
        {tipo === 'complementaria' && (
          <div className="grid2" style={{ marginTop: 10 }}>
            <div className="field"><label>Concepto del ajuste</label><input className="input" value={fin.conceptoAjuste || ''} onChange={(e) => setFin({ ...fin, conceptoAjuste: e.target.value })} placeholder="Ej: Retroactivo paritaria" /></div>
            <div className="field"><label>Monto del ajuste (remunerativo) *</label><input className="input" type="number" value={fin.montoAjuste || ''} onChange={(e) => setFin({ ...fin, montoAjuste: e.target.value })} /></div>
          </div>
        )}
        {tipo === 'anticipo_ajuste' && (
          <div className="grid2" style={{ marginTop: 10 }}>
            <div className="field"><label>Concepto</label><input className="input" value={fin.conceptoAjuste || ''} onChange={(e) => setFin({ ...fin, conceptoAjuste: e.target.value })} placeholder="Ej: Anticipo ajuste paritaria" /></div>
            <div className="field"><label>Monto no remunerativo *</label><input className="input" type="number" value={fin.montoAnticipoAjuste || ''} onChange={(e) => setFin({ ...fin, montoAnticipoAjuste: e.target.value })} /></div>
          </div>
        )}
        {(tipo === 'mensual' || tipo === 'quincenal_1' || tipo === 'quincenal_2') && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--accent2)' }}>Novedades del período (días, horas extra, otros haberes/descuentos)</summary>
            <div className="grid2" style={{ marginTop: 10 }}>
              <div className="field"><label>Días trabajados (30 = mes completo)</label><input className="input" type="number" value={fin.diasTrabajados || ''} onChange={(e) => setFin({ ...fin, diasTrabajados: e.target.value })} placeholder="30" /></div>
              <div className="field"></div>
              <div className="field"><label>Horas extra 50%</label><input className="input" type="number" value={fin.horasExtra50 || ''} onChange={(e) => setFin({ ...fin, horasExtra50: e.target.value })} /></div>
              <div className="field"><label>Horas extra 100%</label><input className="input" type="number" value={fin.horasExtra100 || ''} onChange={(e) => setFin({ ...fin, horasExtra100: e.target.value })} /></div>
              <div className="field"><label>Otros haberes remunerativos — concepto</label><input className="input" value={fin.otrosRemunLabel || ''} onChange={(e) => setFin({ ...fin, otrosRemunLabel: e.target.value })} placeholder="Premio, comisión…" /></div>
              <div className="field"><label>Monto</label><input className="input" type="number" value={fin.otrosRemun || ''} onChange={(e) => setFin({ ...fin, otrosRemun: e.target.value })} /></div>
              <div className="field"><label>Otros haberes no remunerativos — concepto</label><input className="input" value={fin.otrosNoRemLabel || ''} onChange={(e) => setFin({ ...fin, otrosNoRemLabel: e.target.value })} placeholder="Viáticos…" /></div>
              <div className="field"><label>Monto</label><input className="input" type="number" value={fin.otrosNoRem || ''} onChange={(e) => setFin({ ...fin, otrosNoRem: e.target.value })} /></div>
              <div className="field"><label>Otros descuentos — concepto</label><input className="input" value={fin.otrosDescLabel || ''} onChange={(e) => setFin({ ...fin, otrosDescLabel: e.target.value })} /></div>
              <div className="field"><label>Monto</label><input className="input" type="number" value={fin.otrosDesc || ''} onChange={(e) => setFin({ ...fin, otrosDesc: e.target.value })} /></div>
              <div className="field"><label>Días de suspensión disciplinaria</label><input className="input" type="number" value={fin.diasSuspension || ''} onChange={(e) => setFin({ ...fin, diasSuspension: e.target.value })} /></div>
              <div className="field"><label>Ausencias injustificadas (días)</label><input className="input" type="number" value={fin.ausenciasInjustificadas || ''} onChange={(e) => setFin({ ...fin, ausenciasInjustificadas: e.target.value })} /></div>
              <div className="field"><label>Feriados trabajados</label><input className="input" type="number" value={fin.feriadosTrabajados || ''} onChange={(e) => setFin({ ...fin, feriadosTrabajados: e.target.value })} /></div>
              <div className="field"><label>Horas extra exentas de Ganancias</label><input className="input" type="number" value={fin.hsExtrasExentas || ''} onChange={(e) => setFin({ ...fin, hsExtrasExentas: e.target.value })} /></div>
              <div className="field"><label>Bono productividad (exento)</label><input className="input" type="number" value={fin.bonoProductividadExento || ''} onChange={(e) => setFin({ ...fin, bonoProductividadExento: e.target.value })} /></div>
              <div className="field"><label>Indemnizaciones (exento)</label><input className="input" type="number" value={fin.indemnizaciones || ''} onChange={(e) => setFin({ ...fin, indemnizaciones: e.target.value })} /></div>
              <div className="field"><label>Otros exentos — concepto</label><input className="input" value={fin.otrosExentosLabel || ''} onChange={(e) => setFin({ ...fin, otrosExentosLabel: e.target.value })} /></div>
              <div className="field"><label>Otros exentos — monto</label><input className="input" type="number" value={fin.otrosExentos || ''} onChange={(e) => setFin({ ...fin, otrosExentos: e.target.value })} /></div>
              <div className="field"><label>Embargo judicial (común)</label><input className="input" type="number" value={fin.embargo || ''} onChange={(e) => setFin({ ...fin, embargo: e.target.value })} /></div>
              <div className="field"><label>Embargo/cuota alimentaria (% del neto)</label><input className="input" type="number" value={fin.embargoAlimentosPct || ''} onChange={(e) => setFin({ ...fin, embargoAlimentosPct: e.target.value })} /></div>
              <div className="field"><label>Cuota alimentaria (monto fijo)</label><input className="input" type="number" value={fin.cuotaAlimentaria || ''} onChange={(e) => setFin({ ...fin, cuotaAlimentaria: e.target.value })} /></div>
            </div>
            <div className="muted" style={{ fontSize: 11, margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Ganancias (SIRADIG / cargas de familia)</div>
            <div className="grid2">
              <div className="field"><label>Deducciones voluntarias SIRADIG (anuales)</label><input className="input" type="number" value={fin.dedVoluntariasAnual || ''} onChange={(e) => setFin({ ...fin, dedVoluntariasAnual: e.target.value })} placeholder="seguros, alquiler, médicos…" /></div>
              <div className="field"><label>Hijos menores a cargo</label><input className="input" type="number" value={fin.nroHijosMenores || ''} onChange={(e) => setFin({ ...fin, nroHijosMenores: e.target.value })} /></div>
              <div className="field"><label>Hijos incapacitados a cargo</label><input className="input" type="number" value={fin.nroHijosIncapacitados || ''} onChange={(e) => setFin({ ...fin, nroHijosIncapacitados: e.target.value })} /></div>
              <div className="field" style={{ alignSelf: 'end' }}><label className="row" style={{ gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={!!fin.tieneConyuge} onChange={(e) => setFin({ ...fin, tieneConyuge: e.target.checked ? '1' : '' })} /> Cónyuge a cargo</label></div>
            </div>
          </details>
        )}
        {(tipo === 'mensual' || tipo === 'quincenal_1' || tipo === 'quincenal_2') && (
          <div className="grid2" style={{ marginTop: 10 }}>
            <div className="field"><label>Ajuste de sueldo — bruto remunerativo (opcional)</label><input className="input" type="number" value={fin.ajusteSueldoBruto || ''} onChange={(e) => setFin({ ...fin, ajusteSueldoBruto: e.target.value })} placeholder="0" /></div>
            <div className="field"><label>Descuento anticipo ajuste de sueldo (opcional)</label><input className="input" type="number" value={fin.anticipoAjusteDesc || ''} onChange={(e) => setFin({ ...fin, anticipoAjusteDesc: e.target.value })} placeholder="0" /></div>
          </div>
        )}
        {tipo === 'final' && (
          <div className="grid2" style={{ marginTop: 10 }}>
            <div className="field"><label>Fecha de egreso *</label><input className="input" type="date" value={fin.fechaEgreso || ''} onChange={(e) => setFin({ ...fin, fechaEgreso: e.target.value })} /></div>
            <div className="field"><label>Motivo de baja</label><select className="input" value={fin.motivoBaja} onChange={(e) => setFin({ ...fin, motivoBaja: e.target.value })}>
              <option value="sin_causa">Despido sin causa (con indemnización)</option><option value="renuncia">Renuncia</option><option value="con_causa">Despido con causa</option><option value="mutuo_acuerdo">Mutuo acuerdo (Art. 241)</option><option value="fin_contrato">Fin de contrato</option></select></div>
            <div className="field"><label>Días de vacaciones no gozadas</label><input className="input" type="number" value={fin.diasVacNoGozadas || ''} onChange={(e) => setFin({ ...fin, diasVacNoGozadas: e.target.value })} /></div>
            <div className="field"><label>Mejor remuneración (opcional)</label><input className="input" type="number" value={fin.mejorRem || ''} onChange={(e) => setFin({ ...fin, mejorRem: e.target.value })} placeholder="usa la del mes" /></div>
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={calcular} disabled={!sel || busy || (tipo === 'final' && !fin.fechaEgreso) || (tipo === 'anticipo' && !fin.montoAnticipo) || (tipo === 'complementaria' && !fin.montoAjuste) || (tipo === 'anticipo_ajuste' && !fin.montoAnticipoAjuste)}>{busy ? 'Procesando…' : 'Calcular'}</button>
          {recibo && <button className="btn ghost" onClick={guardar} disabled={busy}>Guardar y publicar</button>}
        </div>
        {err && <div className="err" style={{ marginTop: 10 }}>⚠ {err}</div>}
        {msg && <div className="ok" style={{ marginTop: 10 }}>✓ {msg}</div>}
      </div>
      {recibo && <div className="card"><ReciboView recibo={recibo} /></div>}
    </>
  );
}

// ───────────── Corrida (planilla) ─────────────
function Corrida() {
  const [mes, setMes] = useState(new Date().getMonth() + 1); const [anio, setAnio] = useState(new Date().getFullYear());
  const [tipo, setTipo] = useState('mensual'); const [empresa, setEmpresa] = useState(''); const [fechaPago, setFechaPago] = useState('');
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [corridas, setCorridas] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null); const [reporte, setReporte] = useState<any>(null); const [exp, setExp] = useState<Record<number, boolean>>({});
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  async function loadCorridas() { try { setCorridas(await api.get('/liquidacion/corridas')); } catch (e: any) { setErr(e.message); } }
  useEffect(() => { loadCorridas(); api.get<Empleado[]>('/empleados').then((es) => setEmpresas([...new Set(es.map((e) => e.empresa))].sort())).catch(() => {}); }, []);

  async function crear() { setErr(''); setBusy(true); try { const r = await api.post<any>('/liquidacion/corrida', { anio, mes, tipo, empresa: empresa || undefined, fechaPago: fechaPago || undefined }); await loadCorridas(); abrir(r.id); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } }
  async function abrir(id: number) { setErr(''); setReporte(null); try { setSel(await api.get(`/liquidacion/corrida/${id}`)); } catch (e: any) { setErr(e.message); } }
  async function aprobar() { try { await api.post(`/liquidacion/corrida/${sel.corrida.id}/aprobar`, {}); await loadCorridas(); abrir(sel.corrida.id); } catch (e: any) { setErr(e.message); } }
  async function publicar() { try { await api.post(`/liquidacion/corrida/${sel.corrida.id}/publicar`, {}); await loadCorridas(); abrir(sel.corrida.id); } catch (e: any) { setErr(e.message); } }
  async function borrar(id: number) { try { await api.del(`/liquidacion/corrida/${id}`); if (sel?.corrida.id === id) setSel(null); loadCorridas(); } catch (e: any) { setErr(e.message); } }
  async function verReporte() { try { setReporte(await api.get(`/liquidacion/corrida/${sel.corrida.id}/reporte`)); } catch (e: any) { setErr(e.message); } }
  async function bajarBanco() {
    try { const b = await fetchBlob(`/liquidacion/corrida/${sel.corrida.id}/banco`); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `acreditacion_corrida_${sel.corrida.id}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); } catch (e: any) { setErr(e.message); }
  }
  const estadoColor = (e: string) => e === 'publicada' ? 'var(--green)' : e === 'aprobada' ? 'var(--accent2)' : 'var(--yellow)';

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Nueva corrida de liquidación</h3>
        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field"><label>Tipo</label><select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.filter(([v]) => v !== 'final').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label>Mes</label><select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select></div>
          <div className="field"><label>Año</label><input className="input" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={{ width: 100 }} /></div>
          <div className="field"><label>Fecha de pago</label><input className="input" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} /></div>
          <div className="field"><label>Empresa</label><select className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)}><option value="">Todas</option>{empresas.map((em) => <option key={em} value={em}>{em}</option>)}</select></div>
          <button className="btn" onClick={crear} disabled={busy}>{busy ? 'Liquidando…' : 'Generar corrida'}</button>
        </div>
        {err && <div className="err" style={{ marginTop: 10 }}>⚠ {err}</div>}
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>Período</th><th>Tipo</th><th>Estado</th><th style={{ textAlign: 'right' }}>Neto</th><th></th></tr></thead>
            <tbody>
              {corridas.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer', background: sel?.corrida.id === c.id ? 'var(--bg2)' : undefined }} onClick={() => abrir(c.id)}>
                  <td>{String(c.mes).padStart(2, '0')}/{c.anio}{c.empresa ? <div className="muted" style={{ fontSize: 11 }}>{c.empresa}</div> : ''}</td>
                  <td>{c.tipo}</td>
                  <td><span className="badge" style={{ color: estadoColor(c.estado) }}>{c.estado}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(c.total_neto)}</td>
                  <td style={{ textAlign: 'right' }}>{c.estado !== 'publicada' && <button className="btn ghost" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={(ev) => { ev.stopPropagation(); borrar(c.id); }}>✕</button>}</td>
                </tr>
              ))}
              {!corridas.length && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 16 }}>Sin corridas.</td></tr>}
            </tbody>
          </table>
        </div>

        <div>
          {!sel && <div className="muted">Elegí o generá una corrida para ver la planilla.</div>}
          {sel && (
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <div><strong>Planilla {String(sel.corrida.mes).padStart(2, '0')}/{sel.corrida.anio}</strong> <span className="muted">· {sel.corrida.tipo} · {sel.corrida.cant} empleados · <span className="badge" style={{ color: estadoColor(sel.corrida.estado) }}>{sel.corrida.estado}</span></span></div>
              </div>
              <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {sel.corrida.estado === 'borrador' && <button className="btn" onClick={aprobar}>✓ Aprobar</button>}
                {sel.corrida.estado === 'aprobada' && <button className="btn" onClick={publicar}>📢 Publicar recibos</button>}
                <button className="btn ghost" onClick={verReporte}>📊 Reporte</button>
                <button className="btn ghost" onClick={bajarBanco}>🏦 Archivo de banco (CSV)</button>
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Conceptos liquidados — agrupados por empresa, ordenados por legajo. Clic en un empleado para ver/ocultar el detalle.</div>
              <div style={{ overflow: 'auto', maxHeight: 460 }}>
                {Object.entries(sel.items.reduce((acc: any, it: any) => { (acc[it.empresa] = acc[it.empresa] || []).push(it); return acc; }, {})).map(([empresa, lista]: any) => (
                  <div key={empresa} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--accent2)' }}>{empresa} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({lista.length})</span></div>
                    <table style={{ width: '100%', fontSize: 13 }}>
                      <thead><tr><th style={{ textAlign: 'left' }}>Legajo</th><th style={{ textAlign: 'left' }}>Empleado</th><th style={{ textAlign: 'right' }}>Remun.</th><th style={{ textAlign: 'right' }}>Desc.</th><th style={{ textAlign: 'right' }}>Neto</th></tr></thead>
                      <tbody>
                        {[...lista].sort((a: any, b: any) => String(a.legNum).localeCompare(String(b.legNum))).map((it: any) => [
                          <tr key={it.id} style={{ cursor: 'pointer' }} onClick={() => setExp((p) => ({ ...p, [it.id]: !p[it.id] }))}>
                            <td style={{ fontFamily: 'monospace' }}>{exp[it.id] ? '▾ ' : '▸ '}{it.legNum}</td>
                            <td>{it.nom}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(it.totalRemun)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(it.totalDescuentos)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>${$(it.neto)}</td>
                          </tr>,
                          exp[it.id] && (
                            <tr key={`d${it.id}`}><td colSpan={5} style={{ background: 'var(--bg2)', padding: '6px 14px' }}>
                              <div className="grid2" style={{ gap: 18 }}>
                                <div>
                                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Haberes</div>
                                  {(it.haberes || []).map((h: any, k: number) => <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}><span>{h.concepto}{h.tipo === 'norem' ? ' (no rem.)' : h.tipo === 'exento' ? ' (exento)' : ''}</span><span style={{ fontFamily: 'monospace' }}>${$(h.monto)}</span></div>)}
                                </div>
                                <div>
                                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Descuentos</div>
                                  {(it.descuentos || []).map((d: any, k: number) => <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}><span>{d.concepto}</span><span style={{ fontFamily: 'monospace' }}>${$(d.monto)}</span></div>)}
                                  {!(it.descuentos || []).length && <div className="muted" style={{ fontSize: 12 }}>—</div>}
                                </div>
                              </div>
                            </td></tr>
                          ),
                        ]).flat().filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                ))}
                <div className="row" style={{ justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: 6, fontWeight: 700 }}>
                  <span>Total neto ({sel.corrida.cant})</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--green)' }}>${$(sel.corrida.total_neto)}</span>
                </div>
              </div>

              {reporte && (
                <div style={{ marginTop: 14 }}>
                  <h4 style={{ margin: '0 0 6px' }}>Reporte de la corrida</h4>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Neto ${$(reporte.totales.neto)} · Remunerativo ${$(reporte.totales.remun)} · Descuentos ${$(reporte.totales.desc)} · Costo laboral ${$(reporte.totales.costo)}</div>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead><tr><th style={{ textAlign: 'left' }}>Empresa</th><th style={{ textAlign: 'right' }}>Empl.</th><th style={{ textAlign: 'right' }}>Neto</th><th style={{ textAlign: 'right' }}>Costo</th></tr></thead>
                    <tbody>{Object.entries(reporte.porEmpresa).map(([em, v]: any) => <tr key={em}><td>{em}</td><td style={{ textAlign: 'right' }}>{v.cant}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(v.neto)}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(v.costo)}</td></tr>)}</tbody>
                  </table>
                  <h4 style={{ margin: '12px 0 6px' }}>Descuentos por concepto</h4>
                  <table style={{ width: '100%', fontSize: 13 }}><tbody>{Object.entries(reporte.conceptos).map(([c, v]: any) => <tr key={c}><td>{c}</td><td style={{ textAlign: 'right', fontFamily: 'monospace' }}>${$(v)}</td></tr>)}</tbody></table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Liquidacion() {
  const [tab, setTab] = useState('individual');
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Liquidación</h2>
      <div className="row" style={{ gap: 6, marginBottom: 14 }}>
        <button className={`btn ${tab === 'individual' ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setTab('individual')}>Individual</button>
        <button className={`btn ${tab === 'corrida' ? '' : 'ghost'}`} style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setTab('corrida')}>Corrida / planilla</button>
      </div>
      {tab === 'individual' ? <Individual /> : <Corrida />}
    </>
  );
}
