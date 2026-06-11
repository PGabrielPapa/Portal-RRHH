import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import ReciboView, { Recibo } from '../components/ReciboView';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const money = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

interface Item { id: number; anio: number; mes: number; tipo: string; neto: number; created_at: string; }

export default function MisRecibos() {
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<Recibo | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Item[]>('/recibos').then(setItems).catch((e) => setErr(e.message));
  }, []);

  async function ver(it: Item) {
    setErr('');
    try { setSel(await api.get<Recibo>(`/recibos/${it.id}`)); } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Mis recibos</h2>
      {err && <div className="err" style={{ marginBottom: 12 }}>⚠ {err}</div>}

      {sel ? (
        <>
          <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => setSel(null)}>← Volver</button>
          <div className="card"><ReciboView recibo={sel} /></div>
        </>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>Período</th><th>Tipo</th><th>Neto</th><th></th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{MESES[it.mes - 1]} {it.anio}</td>
                  <td>{it.tipo}</td>
                  <td style={{ fontFamily: 'monospace' }}>{money(it.neto)}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => ver(it)}>Ver</button></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>Todavía no tenés recibos publicados.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
