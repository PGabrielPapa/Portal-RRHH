// ═══════════════════════════════════════════════════════════════════════
// ═══   RECIBOS DE SUELDO — Vista y descarga de recibos del empleado   ═══
// ═══   Módulo 06                                                       ═══
// ═══════════════════════════════════════════════════════════════════════


// Inicializar cumpleaños desde datos embebidos (solo la primera vez)
async function inicializarCumpleanos(){
  const db = await abrirIDB();
  const count = await new Promise((res,rej)=>{
    const tx = db.transaction('cumpleanos','readonly');
    const req = tx.objectStore('cumpleanos').count();
    req.onsuccess = ()=>res(req.result);
    req.onerror = e=>rej(e.target.error);
  });
  if(count > 0) return; // Ya inicializado
  const db2 = await abrirIDB();
  const tx = db2.transaction('cumpleanos','readwrite');
  const store = tx.objectStore('cumpleanos');
  for(const c of CUMPLE_DATA){
    const emp = empByLeg(c.leg);
    store.put({leg:c.leg, fecha:c.fecha, nom:emp?.nom||'', emp:emp?.emp||''});
  }
  await new Promise((res,rej)=>{ tx.oncomplete=res; tx.onerror=e=>rej(e.target.error); });
}

// ─── RECIBOS DE HABERES ───
let _reciboActual = null; // { key, nom, periodo, data }

// ─── INDEXEDDB (recibos + readlog) ───
const IDB_NAME = 'lsg_db', IDB_VER = 14;
let _idb = null;

function abrirIDB(){
  if(_idb) return Promise.resolve(_idb);
  return new Promise((res,rej)=>{
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains('recibos'))
        db.createObjectStore('recibos', {keyPath:'key'});
      if(!db.objectStoreNames.contains('readlog'))
        db.createObjectStore('readlog', {autoIncrement:true});
      if(!db.objectStoreNames.contains('cumpleanos'))
        db.createObjectStore('cumpleanos', {keyPath:'leg'});
      if(!db.objectStoreNames.contains('ganancias'))
        db.createObjectStore('ganancias', {keyPath:'key'});
      if(!db.objectStoreNames.contains('licencias'))
        db.createObjectStore('licencias', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('cambios_domicilio'))
        db.createObjectStore('cambios_domicilio', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('mensajes'))
        db.createObjectStore('mensajes', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('informes_licencias'))
        db.createObjectStore('informes_licencias', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('licencias_anuales'))
        db.createObjectStore('licencias_anuales', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('liquidaciones'))
        db.createObjectStore('liquidaciones', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('novedades_liq'))
        db.createObjectStore('novedades_liq', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('licencias_especiales'))
        db.createObjectStore('licencias_especiales', {keyPath:'id', autoIncrement:true});
      if(!db.objectStoreNames.contains('empleado_historial')){
        const st = db.createObjectStore('empleado_historial', {keyPath:'id', autoIncrement:true});
        st.createIndex('leg', 'leg', {unique:false});
        st.createIndex('leg_campo', ['leg','campo'], {unique:false});
      }
      if(!db.objectStoreNames.contains('evaluaciones_desempeno')){
        const st = db.createObjectStore('evaluaciones_desempeno', {keyPath:'id', autoIncrement:true});
        st.createIndex('leg', 'leg', {unique:false});
        st.createIndex('tipo', 'tipo', {unique:false});
        st.createIndex('estado', 'estado', {unique:false});
        st.createIndex('leg_tipo_periodo', ['leg','tipo','periodo'], {unique:true});
      }
      if(!db.objectStoreNames.contains('empresas_abm')){
        const st = db.createObjectStore('empresas_abm', {keyPath:'id', autoIncrement:true});
        st.createIndex('nombre', 'nombre', {unique:true});
      }
      if(!db.objectStoreNames.contains('conceptos_custom')){
        const st = db.createObjectStore('conceptos_custom', {keyPath:'id', autoIncrement:true});
        st.createIndex('codigo', 'codigo', {unique:true});
        st.createIndex('estado', 'estado', {unique:false});
        st.createIndex('tipo', 'tipo', {unique:false});
      }
    };
    req.onsuccess = e=>{
      _idb = e.target.result;
      // Manejar cambios de versión desde otras pestañas (cerrar cleanly)
      _idb.onversionchange = () => {
        console.warn('IndexedDB: otra pestaña solicitó actualización. Cerrando conexión.');
        try { _idb.close(); } catch(_){}
        _idb = null;
      };
      res(_idb);
    };
    req.onerror = e => {
      console.error('Error al abrir IndexedDB:', e.target.error);
      rej(e.target.error);
    };
    req.onblocked = () => {
      console.warn('IndexedDB: upgrade bloqueado por otra pestaña. Cerrá las demás pestañas del portal y recargá.');
      showAlert('Para aplicar la última actualización del sistema, por favor cerrá todas las demás pestañas del Portal de RR.HH. que tengas abiertas y recargá esta página.', 'warning');
    };
  });
}

async function getRecibos(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('recibos','readonly');
    const req = tx.objectStore('recibos').getAll();
    req.onsuccess = ()=>{
      const obj={};
      req.result.forEach(r=>{ obj[r.key]=r; });
      res(obj);
    };
    req.onerror = e=>rej(e.target.error);
  });
}

async function setRecibo(key, rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('recibos','readwrite');
    const req = tx.objectStore('recibos').put({...rec, key});
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}

async function deleteRecibo(key){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('recibos','readwrite');
    const req = tx.objectStore('recibos').delete(key);
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}

async function getReadLog(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('readlog','readonly');
    const req = tx.objectStore('readlog').getAll();
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}

async function addReadLog(entry){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('readlog','readwrite');
    const req = tx.objectStore('readlog').add(entry);
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}

// ── Cumpleaños ──
async function getCumpleanos(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('cumpleanos','readonly');
    const req = tx.objectStore('cumpleanos').getAll();
    req.onsuccess = ()=>res(req.result);
    req.onerror   = e=>rej(e.target.error);
  });
}
async function setCumpleanos(leg, fecha){ // fecha = 'DD/MM'
  const db = await abrirIDB();
  const emp = empByLeg(leg);
  return new Promise((res,rej)=>{
    const tx = db.transaction('cumpleanos','readwrite');
    const req = fecha
      ? tx.objectStore('cumpleanos').put({leg, fecha, nom:emp?.nom||'', emp:emp?.emp||''})
      : tx.objectStore('cumpleanos').delete(leg);
    req.onsuccess = ()=>res();
    req.onerror   = e=>rej(e.target.error);
  });
}
function periodoLabel(ym){ // "2025-04" → "Abril 2025"
  if(!ym) return '';
  const parts = String(ym).split('-');
  if(parts.length < 2) return String(ym);            // período no estándar (p.ej. anual) → tal cual
  const [y,m] = parts;
  const mi = parseInt(m);
  if(isNaN(mi) || mi < 1 || mi > 12) return String(ym);
  const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${meses[mi]} ${y}`;
}

// ── Empleado: ver sus recibos ──
async function renderRecibos(){
  const leg = currentUser?.emp?.leg;
  if(!leg) return;
  const div = document.getElementById('list-recibos');
  if(!div) return;
  try{
    const recibos = await getRecibos();
    const readLog = await getReadLog();
  // Filter recibos for this employee
  const propios = Object.entries(recibos)
    .filter(([k]) => k.startsWith(leg + '_'))
    .sort((a,b) => b[0].localeCompare(a[0]));
  if(!propios.length){
    div.innerHTML='<div class="empty"><div class="empty-icon">📄</div><div class="empty-text">No tenés recibos disponibles aún</div></div>';
    actualizarCntRecibos();
    return;
  }
  // Build leídos set for this employee
  const leidos = new Set(readLog.filter(r=>r.leg===leg).map(r=>r.periodo));
  div.innerHTML = `<div class="card" style="padding:0;overflow:hidden">` +
    propios.map(([key, rec]) => {
      const leidoFlag = leidos.has(rec.periodo);
      return `<div class="rec-row">
        <div style="font-size:22px;margin-right:4px">📄</div>
        <div style="flex:1">
          <div class="rec-periodo">Período: ${periodoLabel(rec.periodo)}</div>
          <div class="rec-meta">${rec.nom} · ${rec.emp} · Cargado: ${rec.uploadedAt}</div>
        </div>
        <span class="${leidoFlag?'rec-badge-leido':'rec-badge-nuevo'}">${leidoFlag?'✓ Leído':'● Nuevo'}</span>
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;margin-left:8px" onclick="verRecibo('${key}')">Ver recibo</button>
      </div>`;
    }).join('') + `</div>`;
  actualizarCntRecibos();
  }catch(err){
    console.error('renderRecibos:', err);
    if(div) div.innerHTML = '<div class="empty"><div class="empty-icon">⚠</div><div class="empty-text">No se pudieron cargar los recibos. Recargá la página.</div></div>';
  }
}

async function actualizarCntRecibos(){
  if(!currentUser) return;
  const leg = currentUser.emp.leg;
  const recibos = await getRecibos();
  const readLog = await getReadLog();
  const leidos = new Set(readLog.filter(r=>r.leg===leg).map(r=>r.periodo));
  const nuevos = Object.entries(recibos).filter(([k,r])=>k.startsWith(leg+'_') && !leidos.has(r.periodo)).length;
  const el = document.getElementById('cnt-recibos-new');
  if(el) el.textContent = nuevos > 0 ? `${nuevos} nuevo${nuevos>1?'s':''}` : '';
}

async function verRecibo(key){
  const recibos = await getRecibos();
  const rec = recibos[key];
  if(!rec){ toast('⚠ Recibo no encontrado','var(--yellow)'); return; }

  // Log de lectura
  if(currentUser){
    const log = await getReadLog();
    const yaLeido = log.some(r=>r.leg===currentUser.emp.leg && r.periodo===rec.periodo);
    if(!yaLeido){
      const now = new Date();
      await addReadLog({
        leg: currentUser.emp.leg, dni: currentUser.emp.dni,
        nom: currentUser.emp.nom, emp: currentUser.emp.emp,
        periodo: rec.periodo, periodoLabel: periodoLabel(rec.periodo),
        fecha: now.toLocaleDateString('es-AR'),
        hora: now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
      });
    }
  }

  _reciboActual = { key, ...rec };

  // Abrir PDF en nueva pestaña (más confiable que iframe en file://)
  const blob = b64toBlob(rec.data, 'application/pdf');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  // Si el navegador bloqueó la nueva pestaña, mostrar modal con object tag como fallback
  if(!win || win.closed || typeof win.closed === 'undefined'){
    mostrarReciboEnModal(rec, url);
  } else {
    // Registrar para revocar el blob cuando se cierre (no podemos detectar el cierre exacto)
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
    toast(`✓ Recibo abierto en nueva pestaña`, 'var(--green)');
  }

  if(document.getElementById('sec-recibos').classList.contains('active')) renderRecibos();
}

function mostrarReciboEnModal(rec, url){
  document.getElementById('rec-modal-title').textContent = `Recibo — ${periodoLabel(rec.periodo)}`;
  document.getElementById('rec-modal-sub').textContent = `${rec.nom} · ${rec.emp}`;
  // Usar <object> en vez de <iframe> — mejor soporte para PDFs
  const container = document.getElementById('rec-iframe').parentElement;
  container.innerHTML = `<object data="${url}" type="application/pdf"
    style="width:100%;height:100%;border:none;border-radius:var(--r)">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:var(--t2)">
      <div style="font-size:32px">📄</div>
      <div style="font-size:14px">Tu navegador no puede mostrar el PDF en esta ventana.</div>
      <button class="btn btn-primary" onclick="downloadReciboActual()">↓ Descargar recibo</button>
    </div>
  </object>`;
  document.getElementById('modal-recibo').style.display='flex';
}

async function cerrarRecibo(){
  document.getElementById('modal-recibo').style.display='none';
  // Restaurar el iframe original por si se reemplazó con object
  const container = document.querySelector('#modal-recibo iframe, #modal-recibo object');
  if(container && container.tagName==='OBJECT'){
    container.parentElement.innerHTML = '<iframe id="rec-iframe" style="width:100%;height:100%;border:none;border-radius:var(--r);background:#fff"></iframe>';
  } else if(container){
    container.src='';
  }
}

async function downloadReciboActual(){
  if(!_reciboActual) return;
  const blob = b64toBlob(_reciboActual.data, 'application/pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo_${_reciboActual.leg}_${_reciboActual.periodo}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Recibo descargado', 'var(--green)');
}

function b64toBlob(b64, mime){
  const bytes = atob(b64);
  const ab = new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++) ab[i]=bytes.charCodeAt(i);
  return new Blob([ab],{type:mime});
}

// ── RR.HH.: Procesamiento masivo PDF ──
let _procesadosPendientes = []; // [{leg, nom, emp, periodo, b64}]

// Actualizar badge de recibos nuevos en home
async function actualizarHomeBadges(){
  if(!currentUser) return;
  const badge = document.getElementById('home-recibos-badge');
  const titleEl = document.getElementById('home-title');
  const subEl = document.getElementById('home-sub');
  if(titleEl){
    const firstName = currentUser.emp.nom.split(',')[1]?.trim().split(' ')[0]
      || currentUser.emp.nom.split(',')[0].trim();
    titleEl.textContent = `Hola, ${firstName}`;
  }
  if(subEl) subEl.textContent = '¿Qué querés hacer hoy?';
  if(!badge) return;
  const recibos = await getRecibos();
  const readLog = await getReadLog();
  const leg = currentUser.emp.leg;
  const leidos = new Set(readLog.filter(r=>r.leg===leg).map(r=>r.periodo));
  const nuevos = Object.entries(recibos).filter(([k,r])=>k.startsWith(leg+'_') && !leidos.has(r.periodo)).length;
  if(nuevos > 0){
    badge.style.display='inline-block';
    badge.textContent = `${nuevos} nuevo${nuevos>1?'s':''}`;
  } else {
    badge.style.display='none';
  }

  // Contador de familiares en la home-card "Mis Familiares"
  try {
    const famBadge = document.getElementById('home-fam-count');
    if(famBadge && typeof getFamiliaresEmp === 'function'){
      const fams = getFamiliaresEmp(leg);
      if(fams.length > 0){
        famBadge.style.display = 'inline-block';
        famBadge.textContent = `${fams.length} cargado${fams.length!==1?'s':''}`;
      } else {
        famBadge.style.display = 'none';
      }
    }
  } catch(_){ /* getFamiliaresEmp aún no cargado en init temprano */ }
}

// ─── RECIBOS: CARGA Y PROCESAMIENTO PDF ───
let _pdfSrcDoc = null;
let _pdfPeriodo = '';
let _pdfNumPages = 0;
let _asignaciones = [];  // [{pageIdx, emp}]

function setProgress(txt, pct){
  document.getElementById('rec-progress').style.display = 'block';
  document.getElementById('rec-progress-txt').textContent = txt;
  document.getElementById('rec-progress-bar').style.width = pct + '%';
}

function uint8ToB64(bytes){
  let bin=''; const len=bytes.byteLength;
  for(let i=0;i<len;i++) bin+=String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Busca el CUIL de la DB dentro de un texto extraído de una página PDF.
// Concatena los items sin espacios para capturar CUILs divididos en múltiples fragments.
// Detecta CUIL probando TODAS las posibles combinaciones de 11 dígitos en la página
function detectarCUIL(items){
  // Unir items de múltiples formas para capturar cualquier fragmentación
  const strs = items.map(it => (it.str||'').trim());
  const textos = [
    strs.join(' '),          // normal
    strs.join(''),           // sin espacio
    strs.join('-'),          // con guion
  ];

  for(const texto of textos){
    // 1. CUIL con guion XX-XXXXXXXX-X (7 u 8 dígitos en el cuerpo)
    const r1 = /(\d{2})-(\d{7,8})-(\d)/g; let m;
    while((m=r1.exec(texto))!==null){
      const cuil=`${m[1]}-${m[2]}-${m[3]}`;
      const emp=empByCuil(cuil);
      if(emp) return emp;
    }
    // 2. CUIL con espacio XX XXXXXXXX X
    const r2 = /(\d{2})\s(\d{7,8})\s(\d)/g;
    while((m=r2.exec(texto))!==null){
      const cuil=`${m[1]}-${m[2]}-${m[3]}`;
      const emp=empByCuil(cuil);
      if(emp) return emp;
    }
  }

  // 3. Extraer TODOS los dígitos y buscar secuencias de 11 que sean CUILs de la DB
  const soloDigitos = strs.join('').replace(/\D/g,'');
  for(let i=0; i<=soloDigitos.length-11; i++){
    const s11 = soloDigitos.substring(i,i+11);
    // Probar como XX-XXXXXXXX-X (8 dígitos cuerpo)
    const c1 = `${s11.substring(0,2)}-${s11.substring(2,10)}-${s11.substring(10)}`;
    if(empByCuil(c1)) return empByCuil(c1);
  }
  for(let i=0; i<=soloDigitos.length-10; i++){
    const s10 = soloDigitos.substring(i,i+10);
    // Probar como XX-XXXXXXX-X (7 dígitos cuerpo)
    const c2 = `${s10.substring(0,2)}-${s10.substring(2,9)}-${s10.substring(9)}`;
    if(empByCuil(c2)) return empByCuil(c2);
  }
  return null;
}

async function cargarPDFParaAsignar(){
  const periodo = document.getElementById('rec-periodo').value;
  const fileInput = document.getElementById('rec-file');
  if(!periodo){ toast('⚠ Seleccioná el período','var(--yellow)'); return; }
  if(!fileInput.files[0]){ toast('⚠ Seleccioná el PDF','var(--yellow)'); return; }
  if(typeof pdfjsLib==='undefined'||typeof PDFLib==='undefined'){
    toast('⚠ Las librerías aún se cargan, reintentá en segundos','var(--yellow)'); return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  const btn=document.getElementById('btn-procesar-pdf');
  btn.disabled=true;
  document.getElementById('rec-progress').style.display='block';
  document.getElementById('rec-progress-bar').style.width='5%';
  document.getElementById('rec-progress-txt').textContent='Leyendo PDF...';

  try {
    const ab = await fileInput.files[0].arrayBuffer();
    const uint8 = new Uint8Array(ab);
    if(uint8.length<5||String.fromCharCode(uint8[0],uint8[1],uint8[2],uint8[3])!=='%PDF')
      throw new Error('El archivo no es un PDF válido.');

    document.getElementById('rec-progress-bar').style.width='12%';
    document.getElementById('rec-progress-txt').textContent='Cargando con pdf-lib...';
    const {PDFDocument}=PDFLib;
    _pdfSrcDoc=await PDFDocument.load(uint8.slice(),{ignoreEncryption:true});
    _pdfNumPages=_pdfSrcDoc.getPageCount();
    _pdfPeriodo=periodo;

    document.getElementById('rec-progress-bar').style.width='20%';
    document.getElementById('rec-progress-txt').textContent='Extrayendo texto con PDF.js...';
    const pdfJsDoc=await pdfjsLib.getDocument({data:uint8.slice()}).promise;

    _asignaciones=[];
    for(let p=1;p<=_pdfNumPages;p++){
      document.getElementById('rec-progress-bar').style.width=(20+Math.round((p/_pdfNumPages)*70))+'%';
      document.getElementById('rec-progress-txt').textContent=`Analizando página ${p} de ${_pdfNumPages}...`;
      const page=await pdfJsDoc.getPage(p);
      const tc=await page.getTextContent();
      const emp=detectarCUIL(tc.items);
      // Guardar texto para diagnóstico
      const textoDebug=tc.items.map(it=>it.str||'').join(' ').substring(0,400);
      _asignaciones.push({pageIdx:p-1, emp, textoDebug});
    }

    document.getElementById('rec-progress-bar').style.width='100%';
    document.getElementById('rec-progress-txt').textContent='¡Listo!';
    setTimeout(()=>document.getElementById('rec-progress').style.display='none',500);
    abrirModalAsignacion();
  } catch(e){
    document.getElementById('rec-progress').style.display='none';
    toast('⚠ '+e.message,'var(--red)');
    console.error(e);
  }
  btn.disabled=false;
}

function abrirModalAsignacion(){
  const auto=_asignaciones.filter(a=>a.emp).length;
  document.getElementById('proc-resumen').textContent=
    `${_pdfNumPages} páginas · ${auto} asignadas automáticamente · ${_pdfNumPages-auto} sin detectar`;
  document.getElementById('bulk-emp-search').value='';
  document.getElementById('bulk-search-results').style.display='none';
  renderAsignacionLista();
  document.getElementById('modal-proceso').style.display='flex';
}

function renderAsignacionLista(){
  const lista=document.getElementById('proc-lista');
  lista.innerHTML=_asignaciones.map((a,i)=>{
    const nom=a.emp?a.emp.nom:'';
    const color=a.emp?'var(--accent)':'var(--border)';
    const badge=a.emp
      ?`<span style="font-size:10px;font-family:var(--font-mono);color:var(--green);border:1px solid rgba(34,197,94,.3);padding:2px 7px;border-radius:10px;white-space:nowrap">✓ Auto</span>`
      :`<span style="font-size:10px;color:var(--red);white-space:nowrap">Sin detectar</span>`;
    const debugTxt = (!a.emp && a.textoDebug)
      ? `<div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:3px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${a.textoDebug.replace(/"/g,'&quot;')}">Texto PDF: ${a.textoDebug||'(vacío)'}</div>`
      : '';
    return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px;font-family:var(--font-mono);color:var(--t3);min-width:52px">Pág ${i+1}</span>
        <div style="flex:1;position:relative">
          <input type="text" data-page="${i}" value="${nom}"
            placeholder="Buscar empleado..."
            oninput="buscarEmpPagina(this)" onfocus="buscarEmpPagina(this)"
            style="width:100%;background:var(--bg2);border:1px solid ${color};border-radius:var(--r);padding:6px 10px;color:var(--t1);font-size:12px;outline:none">
          <div id="pag-results-${i}" style="display:none;position:absolute;left:0;right:0;background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);z-index:50;max-height:150px;overflow-y:auto;top:100%;margin-top:2px;box-shadow:0 8px 24px rgba(0,0,0,.3)"></div>
        </div>
        ${badge}
        <button onclick="limpiarPagina(${i})" title="Limpiar" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:2px 6px">✕</button>
      </div>
      ${debugTxt}
    </div>`;
  }).join('');
  actualizarContadorAsignados();
}

function buscarEmpPagina(input){
  const i = parseInt(input.dataset.page);
  const q = input.value.toLowerCase().trim();
  const res = document.getElementById(`pag-results-${i}`);
  _asignaciones[i].emp = null;
  input.style.borderColor='var(--border)';
  if(!q){res.style.display='none';return;}
  const lista=getNomina().filter(e=>e.nom.toLowerCase().includes(q)||e.leg.includes(q)||e.cuil.includes(q)).slice(0,8);
  if(!lista.length){res.style.display='none';return;}
  res.style.display='block';
  res.innerHTML=lista.map(e=>`
    <div style="padding:7px 12px;cursor:pointer;font-size:12px;color:var(--t1);border-bottom:1px solid var(--border)"
      onmousedown="asignarEmpPagina(${i},'${e.leg}')">
      <strong>${e.nom}</strong> <span style="color:var(--t3)">· ${e.leg} · CUIL: ${e.cuil}</span>
    </div>`).join('');
}

function asignarEmpPagina(pageIdx, leg){
  const emp=empByLeg(leg); if(!emp)return;
  _asignaciones[pageIdx].emp=emp;
  renderAsignacionLista();
  actualizarContadorAsignados();
}

function limpiarPagina(i){
  _asignaciones[i].emp=null;
  renderAsignacionLista();
}

function actualizarContadorAsignados(){
  const n=_asignaciones.filter(a=>a.emp).length;
  document.getElementById('proc-assigned-count').textContent=`${n} de ${_pdfNumPages} páginas asignadas`;
}

async function renderBulkSearch(){
  const q=document.getElementById('bulk-emp-search').value.toLowerCase();
  const res=document.getElementById('bulk-search-results');
  if(!q){res.style.display='none';return;}
  const lista=getNomina().filter(e=>e.nom.toLowerCase().includes(q)||e.leg.includes(q)).slice(0,6);
  if(!lista.length){res.style.display='none';return;}
  res.style.display='block';
  res.innerHTML=lista.map(e=>`
    <div style="padding:7px 14px;cursor:pointer;font-size:12px;color:var(--t1);border-bottom:1px solid var(--border)"
      onmousedown="asignarTodas('${e.leg}')">
      <strong>${e.nom}</strong> <span style="color:var(--t3)">· ${e.leg}</span>
    </div>`).join('');
}

function asignarTodas(leg){
  const emp=empByLeg(leg); if(!emp)return;
  _asignaciones.forEach(a=>{if(!a.emp) a.emp=emp;});
  document.getElementById('bulk-emp-search').value='';
  document.getElementById('bulk-search-results').style.display='none';
  renderAsignacionLista();
}

async function confirmarAsignacion(){
  const asig=_asignaciones.filter(a=>a.emp);
  if(!asig.length){toast('⚠ Asigná al menos una página','var(--yellow)');return;}
  const btn=document.getElementById('btn-confirmar-recibos');
  btn.disabled=true; btn.textContent='Generando PDFs...';

  const errores=[];
  let n=0;

  try {
    const {PDFDocument}=PDFLib;
    // Agrupar páginas por empleado
    const grupos={};
    asig.forEach(a=>{
      if(!grupos[a.emp.leg]) grupos[a.emp.leg]={emp:a.emp,pages:[]};
      grupos[a.emp.leg].pages.push(a.pageIdx);
    });

    const lista=Object.values(grupos);
    for(let gi=0;gi<lista.length;gi++){
      const {emp,pages}=lista[gi];
      btn.textContent=`Generando ${gi+1}/${lista.length}...`;
      try {
        // Generar PDF individual
        const nd=await PDFDocument.create();
        const cp=await nd.copyPages(_pdfSrcDoc,pages);
        cp.forEach(p=>nd.addPage(p));
        const bytes=await nd.save();
        const b64=uint8ToB64(bytes);

        // Guardar en IndexedDB
        const key=`${emp.leg}_${_pdfPeriodo}`;
        try {
          await setRecibo(key, {
            leg:emp.leg,dni:emp.dni,nom:emp.nom,emp:emp.emp,
            periodo:_pdfPeriodo,data:b64,
            uploadedAt:new Date().toLocaleDateString('es-AR'),
            uploadedBy:currentUser?.emp?.nom||'RR.HH.'
          });
          n++;
        } catch(storageErr){
          errores.push(`${emp.nom}: ${storageErr.message}`);
        }
      } catch(pdfErr){
        errores.push(`${emp.nom}: error al generar PDF — ${pdfErr.message}`);
      }
    }

    cerrarModalProceso();
    renderRecibosAdmin();
    actualizarCntRecibos();

    if(n>0) toast(`✓ ${n} recibo(s) guardados para ${periodoLabel(_pdfPeriodo)}`,'var(--green)');

    if(errores.length){
      setTimeout(()=>{
        showAlert(`⚠ No se pudieron guardar ${errores.length} recibo(s):\n\n${errores.join('\n')}\n\n` +
          (errores.some(e=>e.includes('almacenamiento'))?
          'El almacenamiento del navegador está lleno. Eliminá recibos de períodos anteriores y reintentá.':''), 'error');
      },300);
    }

    document.getElementById('rec-file').value='';
    document.getElementById('rec-periodo').value='';
    _pdfSrcDoc=null;

  } catch(e){
    showAlert('⚠ Error inesperado al guardar:\n\n'+e.message, "error");
    console.error(e);
  }
  btn.disabled=false; btn.textContent='✓ Guardar recibos asignados';
}

function cerrarModalProceso(){
  document.getElementById('modal-proceso').style.display='none';
}


// ── Búsqueda de empleado para borrado ──
const _delEmpSel = {rec: null, gan: null};

async function renderDelEmpSearch(tipo){
  const q = document.getElementById(`del-emp-search-${tipo}`).value.toLowerCase();
  const res = document.getElementById(`del-emp-results-${tipo}`);
  _delEmpSel[tipo] = null;
  if(!q){ res.style.display='none'; return; }
  const lista = getNomina().filter(e=>e.nom.toLowerCase().includes(q)||e.leg.includes(q)).slice(0,8);
  if(!lista.length){ res.style.display='none'; return; }
  res.style.display='block';
  res.innerHTML = lista.map(e=>`
    <div style="padding:7px 12px;cursor:pointer;font-size:12px;color:var(--t1);border-bottom:1px solid var(--border)"
      onmousedown="selDelEmp('${tipo}','${e.leg}')">
      <strong>${e.nom}</strong> <span style="color:var(--t3)">· ${e.leg}</span>
    </div>`).join('');
}

function selDelEmp(tipo, leg){
  const emp = empByLeg(leg); if(!emp) return;
  _delEmpSel[tipo] = emp;
  document.getElementById(`del-emp-search-${tipo}`).value = emp.nom;
  document.getElementById(`del-emp-results-${tipo}`).style.display='none';
}

// Eliminar recibo individual (empleado + período)
async function eliminarReciboEmpPeriodo(){
  const emp = _delEmpSel.rec;
  const periodo = document.getElementById('del-emp-periodo-rec').value;
  if(!emp){ toast('⚠ Seleccioná un empleado','var(--yellow)'); return; }
  if(!periodo){ toast('⚠ Seleccioná el período','var(--yellow)'); return; }
  const key = `${emp.leg}_${periodo}`;
  const recibos = await getRecibos();
  if(!recibos[key]){ toast(`No hay recibo de ${emp.nom.split(',')[0].trim()} para ${periodoLabel(periodo)}`,'var(--t3)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar el recibo de ${emp.nom} (${periodoLabel(periodo)})?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  await deleteRecibo(key);
  toast('✓ Recibo eliminado','var(--yellow)');
  _delEmpSel.rec=null;
  document.getElementById('del-emp-search-rec').value='';
  document.getElementById('del-emp-periodo-rec').value='';
  actualizarCntRecibos();
}

// No se muestra lista — función vacía para compatibilidad
function renderRecibosAdmin(){ actualizarCntRecibos(); }

// (eliminada) eliminarRecibo(key): función huérfana sin callers, además
// escribía a localStorage('lsg_recibos') mientras getRecibos() lee desde
// IndexedDB → cualquier eliminación se perdía silenciosamente al recargar.
// El path activo es eliminarReciboEmpPeriodo() que sí usa deleteRecibo().

async function eliminarPeriodo(periodo){
  const recibos = await getRecibos();
  const keys = Object.keys(recibos).filter(k => recibos[k].periodo === periodo);
  if(!keys.length){
    toast(`No hay recibos guardados para ${periodoLabel(periodo)}`, 'var(--t3)');
    return;
  }
  const _ok06 = await showConfirm({titulo:'Eliminar recibos', mensaje:`¿Eliminar <b>TODOS</b> los recibos de <b>${periodoLabel(periodo)}</b>?<br><br><span style="color:var(--red)">${keys.length} recibo(s) serán borrados permanentemente.</span>`, labelOk:'Eliminar', peligroso:true});
    if(!_ok06) return;

  // Borrar de a uno para manejar errores gracefully
  try {
    for(const k of keys) await deleteRecibo(k);
    toast(`✓ ${keys.length} recibo(s) de ${periodoLabel(periodo)} eliminados`, 'var(--yellow)');
  } catch(e){
    toast('⚠ Error al eliminar: '+e.message, 'var(--red)');
  }
  renderRecibosAdmin();
  actualizarCntRecibos();
}

function eliminarPeriodoCompleto(){
  const periodo = document.getElementById('del-periodo-input').value;
  if(!periodo){ toast('⚠ Seleccioná un período primero','var(--yellow)'); return; }
  eliminarPeriodo(periodo);
  document.getElementById('del-periodo-input').value='';
}

// ── RR.HH.: log de lectura ──
async function renderReadLog(){
  const q = (document.getElementById('log-search')?.value||'').toLowerCase();
  const log = (await getReadLog()).slice().reverse();
  const div = document.getElementById('list-readlog');
  const lista = q ? log.filter(r=>r.nom.toLowerCase().includes(q)||r.periodoLabel?.toLowerCase().includes(q)||r.leg.includes(q)) : log;
  if(!lista.length){
    div.innerHTML='<div style="padding:16px 18px;color:var(--t3);font-size:13px">Sin lecturas registradas</div>';
    return;
  }
  div.innerHTML = `<div class="log-row log-header"><span>Tipo</span><span>Período</span><span>Empleado</span><span>Empresa</span><span>Fecha/Hora</span></div>` +
    lista.map(r=>`<div class="log-row">
      <span style="font-size:10px;padding:2px 7px;border-radius:8px;background:${r.tipo==='ganancia'?'rgba(251,191,36,.12)':'rgba(61,127,255,.1)'};color:${r.tipo==='ganancia'?'rgb(251,191,36)':'var(--accent2)'};">${r.tipo==='ganancia'?'🧾 Gan.':'📄 Rec.'}</span>
      <span style="color:var(--accent2)">${r.periodoLabel||r.periodo}</span>
      <span>${r.nom} <span style="color:var(--t3)">(${r.leg})</span></span>
      <span style="color:var(--t3)">${r.emp||''}</span>
      <span>${r.fecha} ${r.hora}</span>
    </div>`).join('');
}

async function exportarLog(){
  const log = await getReadLog();
  if(!log.length){ toast('⚠ El log está vacío','var(--yellow)'); return; }
  const header = 'Tipo;Legajo;DNI;Nombre;Empresa;Período;Fecha;Hora\r\n';
  const rows = log.map(r=>`${r.tipo||'recibo'};${r.leg};${r.dni||''};${r.nom};${r.emp||''};${r.periodoLabel||r.periodo};${r.fecha};${r.hora}`).join('\r\n');
  const blob = new Blob([header+rows],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url;
  a.download=`log_documentos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('✓ Log exportado como CSV','var(--green)');
}

// ─── CUMPLEAÑOS ───
async function renderCumpleTable(){
  const q = (document.getElementById('cumple-search')?.value||'').toLowerCase();
  const wrap = document.getElementById('cumple-table-wrap');
  if(!wrap) return;
  const guardados = await getCumpleanos();
  const mapaFechas = {};
  guardados.forEach(c=>{ mapaFechas[c.leg]=c.fecha; });
  const lista = getNomina().filter(e=>
    !q || e.nom.toLowerCase().includes(q) || e.leg.includes(q)
  );
  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 140px 110px;padding:8px 18px;background:var(--bg2);font-size:10px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)">
      <span>Empleado</span><span>Empresa</span><span style="text-align:center">Cumpleaños</span>
    </div>` +
    lista.map(e=>{
      const fecha = mapaFechas[e.leg]||'';
      return `<div style="display:grid;grid-template-columns:1fr 140px 110px;padding:8px 18px;border-bottom:1px solid var(--border);align-items:center;font-size:12px">
        <div>
          <div style="font-weight:500;color:var(--t1)">${e.nom}</div>
          <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${e.leg}</div>
        </div>
        <div style="font-size:11px;color:var(--t3)">${e.emp}</div>
        <div style="text-align:center">
          <input type="text" data-leg="${e.leg}" value="${fecha}" placeholder="DD/MM"
            maxlength="5" oninput="formatCumpleInput(this)" onchange="guardarCumple(this)"
            style="width:72px;text-align:center;background:var(--bg2);border:1px solid ${fecha?'var(--accent)':'var(--border)'};border-radius:var(--r);padding:4px 8px;color:var(--t1);font-size:12px;font-family:var(--font-mono);outline:none">
        </div>
      </div>`;
    }).join('');
}

function formatCumpleInput(input){
  let v = input.value.replace(/\D/g,'');
  if(v.length>2) v = v.substring(0,2)+'/'+v.substring(2,4);
  input.value = v;
}

async function guardarCumple(input){
  const leg = input.dataset.leg;
  const fecha = input.value.trim();
  // Validar formato DD/MM
  if(fecha && !/^\d{2}\/\d{2}$/.test(fecha)){
    toast('⚠ Formato inválido. Usá DD/MM (ej: 15/03)','var(--yellow)');
    input.value=''; return;
  }
  const [dd,mm] = fecha ? fecha.split('/').map(Number) : [0,0];
  if(fecha && (dd<1||dd>31||mm<1||mm>12)){
    toast('⚠ Fecha inválida','var(--yellow)');
    input.value=''; return;
  }
  await setCumpleanos(leg, fecha||null);
  input.style.borderColor = fecha?'var(--accent)':'var(--border)';
  toast(fecha?`✓ Cumpleaños guardado`:'✓ Fecha eliminada','var(--green)');
}

function mostrarBannerCumpleanos(){
  const banner = document.getElementById('banner-cumple');
  if(!banner) return;

  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2,'0');
  const mm = String(hoy.getMonth()+1).padStart(2,'0');
  const hoyStr = `${dd}/${mm}`;
  const miLeg = currentUser?.emp?.leg;

  // Construir lista enriquecida de todos los cumpleaños
  const todos = CUMPLE_DATA
    .filter(c => c.leg !== miLeg)
    .map(c => {
      const emp = empByLeg(c.leg);
      if(!emp) return null;
      const [cdd, cmm] = c.fecha.split('/').map(Number);
      const primerNombre = emp.nom.split(',')[1]?.trim().split(' ')[0] || emp.nom.split(',')[0].trim();
      const apellido = emp.nom.split(',')[0].trim();
      const iniciales = apellido.substring(0,2).toUpperCase();
      // Días hasta el próximo cumpleaños
      const proximoCumple = new Date(hoy.getFullYear(), cmm-1, cdd);
      if(proximoCumple < hoy && !(cdd===parseInt(dd) && cmm===parseInt(mm)))
        proximoCumple.setFullYear(hoy.getFullYear()+1);
      const diasHasta = Math.round((proximoCumple - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);
      const area = getValidador(emp)?.area || '';
      return { leg:c.leg, fecha:c.fecha, nom:emp.nom, empNom:emp.emp, lugar:emp.lugar||'', area, primerNombre, apellido, iniciales, diasHasta };
    })
    .filter(Boolean);

  const hoy_cumple = todos.filter(c => c.diasHasta === 0);
  // Próximos cumpleaños: tomar los próximos 5 (sin filtro de días) para que el banner siempre muestre algo útil
  const proximos = todos
    .filter(c => c.diasHasta > 0)
    .sort((a,b)=>a.diasHasta-b.diasHasta)
    .slice(0, 5);

  banner.style.display = 'block';

  const tarjetaHoy = c => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.25);border-radius:var(--r)">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,rgba(234,179,8,.35),rgba(251,146,60,.35));border:1px solid rgba(234,179,8,.5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--yellow);flex-shrink:0">${c.iniciales}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--t1)">${c.primerNombre} ${c.apellido}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${c.empNom}${c.area?' · '+c.area:''}${c.lugar?' · '+c.lugar:''}</div>
      </div>
      <span style="font-size:22px">🎂</span>
    </div>`;

  const tarjetaProximo = c => {
    // Si está a más de 7 días, mostrar la fecha; si no, mostrar "en N días"
    const etiqueta = c.diasHasta <= 7
      ? `en ${c.diasHasta} día${c.diasHasta!==1?'s':''}`
      : c.fecha;
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r)">
      <div style="width:34px;height:34px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--t3);flex-shrink:0">${c.iniciales}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:500;color:var(--t1)">${c.primerNombre} ${c.apellido}</div>
        <div style="font-size:10px;color:var(--t3);font-family:var(--font-mono)">${c.empNom}${c.area?' · '+c.area:''}${c.lugar?' · '+c.lugar:''}</div>
      </div>
      <span style="font-size:11px;font-family:var(--font-mono);color:var(--t3);white-space:nowrap">${etiqueta}</span>
    </div>`;
  };

  let html = `<div style="background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);overflow:hidden">`;

  if(hoy_cumple.length){
    html += `
      <div style="padding:12px 16px;background:linear-gradient(135deg,rgba(234,179,8,.1),rgba(251,146,60,.06));border-bottom:1px solid rgba(234,179,8,.2);display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">🎉</span>
        <span style="font-size:13px;font-weight:600;color:var(--yellow)">${hoy_cumple.length===1?'¡Hoy cumple años un compañero!':'¡Hoy cumplen años '+hoy_cumple.length+' compañeros!'}</span>
        <span style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-left:auto">${dd}/${mm}</span>
      </div>
      <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px">
        ${hoy_cumple.map(tarjetaHoy).join('')}
      </div>`;
    if(proximos.length){
      html += `<div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2);font-size:11px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.07em">Próximos cumpleaños</div>
      <div style="padding:10px 16px;display:flex;flex-direction:column;gap:6px">${proximos.map(tarjetaProximo).join('')}</div>`;
    }
  } else {
    html += `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🎂</span>
        <span style="font-size:13px;font-weight:600;color:var(--t1)">Cumpleaños</span>
        <span style="font-size:13px;color:var(--t2);margin-left:auto"><strong style="text-decoration:underline;text-underline-offset:3px">Hoy no hay cumpleaños</strong></span>
      </div>
      <div style="padding:10px 16px;display:flex;flex-direction:column;gap:6px">
        ${proximos.map(tarjetaProximo).join('')}
      </div>`;
  }

  html += `</div>`;
  banner.innerHTML = html;
}

// ─── GANANCIAS IDB ───
async function getGanancias(){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('ganancias','readonly');
    const req = tx.objectStore('ganancias').getAll();
    req.onsuccess = ()=>{ const obj={}; req.result.forEach(r=>{ obj[r.key]=r; }); res(obj); };
    req.onerror = e=>rej(e.target.error);
  });
}
async function setGanancia(key, rec){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('ganancias','readwrite');
    const req = tx.objectStore('ganancias').put({...rec, key});
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });
}
async function deleteGanancia(key){
  const db = await abrirIDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction('ganancias','readwrite');
    const req = tx.objectStore('ganancias').delete(key);
    req.onsuccess=()=>res(); req.onerror=e=>rej(e.target.error);
  });
}

// ── Empleado: importar el impuesto a las ganancias de su liquidación mensual ──
// Recolecta, desde las liquidaciones de haberes ya confirmadas (no borrador), el
// impuesto a las ganancias del empleado por período. item.ganancias trae el signo:
// positivo = retención del mes; negativo = devolución/reintegro a favor.
async function _gananciasDesdeLiquidaciones(leg){
  let liqs = [];
  try { liqs = (typeof getLiquidaciones === 'function') ? await getLiquidaciones() : []; }
  catch(_){ liqs = []; }
  const porPeriodo = {};   // periodo -> registro (gana la liquidación de mayor id)
  (liqs || []).forEach(liq => {
    if(!liq || !Array.isArray(liq.items)) return;
    if(liq.estado === 'borrador') return;                          // solo confirmadas
    if(liq.tipo === 'final' || liq.tipo === 'alimentos') return;   // detalle de haberes mensual
    const it = liq.items.find(x => x.leg === leg);
    if(!it) return;
    const periodo = liq.periodo || (liq.anio && liq.mes ? `${liq.anio}-${String(liq.mes).padStart(2,'0')}` : null);
    if(!periodo) return;
    const reg = {
      periodo,
      anio: liq.anio || +String(periodo).slice(0,4),
      mes:  liq.mes  || +String(periodo).slice(5,7),
      impuesto: $m(it.ganancias),               // con signo
      tipo: liq.tipo, estado: liq.estado, liqId: liq.id
    };
    const prev = porPeriodo[periodo];
    if(!prev || ($m(reg.liqId) >= $m(prev.liqId))) porPeriodo[periodo] = reg;
  });
  return Object.values(porPeriodo).sort((a,b)=> b.periodo.localeCompare(a.periodo));
}

// ── Empleado: ver sus ganancias ──
async function renderGanancias(){
  const leg = currentUser?.emp?.leg;
  if(!leg) return;
  const div = document.getElementById('list-ganancias');
  if(!div) return;
  try{
    const [todos, readLog, detalle] = await Promise.all([
      getGanancias(), getReadLog(), _gananciasDesdeLiquidaciones(leg)
    ]);

  // 1) Tabla del impuesto importada de la liquidación mensual (año fiscal más reciente)
  let tablaHTML = '';
  if(detalle.length){
    const anioActual = Math.max(...detalle.map(d=>d.anio));
    const delAnio = detalle.filter(d=>d.anio===anioActual);
    const totalAnio = delAnio.reduce((s,d)=>s + d.impuesto, 0);
    let acum = 0;
    const filas = [...delAnio].sort((a,b)=>a.periodo.localeCompare(b.periodo))
      .map(d=>{ acum = Math.round((acum + d.impuesto)*100)/100; return { ...d, acum }; })
      .sort((a,b)=>b.periodo.localeCompare(a.periodo));
    tablaHTML = `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div>
            <div class="card-title" style="margin:0">Impuesto a las Ganancias ${anioActual}</div>
            <div style="font-size:11px;color:var(--t3)">Importado de tu liquidación de haberes mensual</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Retenido en el año</div>
            <div style="font-size:18px;font-weight:700;color:${totalAnio>0?'var(--red)':'var(--green)'}">${fmtPesos(Math.abs(totalAnio))}${totalAnio<0?' a favor':''}</div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead><tr style="border-bottom:1px solid var(--border);color:var(--t3);text-align:left">
              <th style="padding:8px 6px;font-weight:600">Período</th>
              <th style="padding:8px 6px;font-weight:600;text-align:right">Impuesto del mes</th>
              <th style="padding:8px 6px;font-weight:600;text-align:right">Acumulado</th>
              <th style="padding:8px 6px;font-weight:600;text-align:center">Planilla</th>
            </tr></thead>
            <tbody>
              ${filas.map(d=>{
                const dev = d.impuesto < -0.005;
                const sinRet = Math.abs(d.impuesto) < 0.005;
                const tienePDF = !!todos[`${leg}_${d.periodo}`];
                const montoCol = sinRet ? 'var(--t3)' : (dev ? 'var(--green)' : 'var(--t1)');
                const montoTxt = sinRet ? '—' : (dev ? '+ '+fmtPesos(Math.abs(d.impuesto))+' (devol.)' : fmtPesos(d.impuesto));
                return `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px 6px">${periodoLabel(d.periodo)||d.periodo}</td>
                  <td style="padding:8px 6px;text-align:right;color:${montoCol};font-weight:600">${montoTxt}</td>
                  <td style="padding:8px 6px;text-align:right;color:var(--t2)">${fmtPesos(Math.abs(d.acum))}${d.acum<-0.005?' a favor':''}</td>
                  <td style="padding:8px 6px;text-align:center"><button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="verFormularioGanancias('${d.periodo}')">Ver F.1357</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="font-size:10.5px;color:var(--t3);margin-top:8px;line-height:1.5">
          El impuesto del mes es la retención de Impuesto a las Ganancias (4ta categoría) calculada en tu recibo. Un valor en verde indica una devolución a tu favor.
        </div>
      </div>`;
  }

  // 2) Planillas PDF publicadas por RR.HH. (si las hubiera)
  const propios = Object.entries(todos)
    .filter(([k]) => k.startsWith(leg+'_'))
    .sort((a,b) => b[0].localeCompare(a[0]));
  const leidos = new Set(readLog.filter(r=>r.leg===leg && r.tipo==='ganancia').map(r=>r.periodo));
  let pdfHTML = '';
  if(propios.length){
    pdfHTML = `<div style="font-size:12px;font-family:var(--font-mono);color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin:4px 2px 10px">Planillas publicadas</div>` +
      `<div class="card" style="padding:0;overflow:hidden">` +
      propios.map(([key,rec])=>{
        const leidoFlag = leidos.has(rec.periodo);
        return `<div class="rec-row">
          <div style="font-size:22px;margin-right:4px">🧾</div>
          <div style="flex:1">
            <div class="rec-periodo">Período: ${periodoLabel(rec.periodo)||rec.periodo}</div>
            <div class="rec-meta">${rec.nom} · ${rec.emp} · Cargado: ${rec.uploadedAt}</div>
          </div>
          <span class="${leidoFlag?'rec-badge-leido':'rec-badge-nuevo'}">${leidoFlag?'✓ Leído':'● Nuevo'}</span>
          <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;margin-left:8px" onclick="verGanancia('${key}')">Ver</button>
          <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="downloadGanancia('${key}')">↓ Descargar</button>
        </div>`;
      }).join('') + `</div>`;
  }

  if(!tablaHTML && !pdfHTML){
    div.innerHTML='<div class="empty"><div class="empty-icon">🧾</div><div class="empty-text">No tenés cálculos de ganancias disponibles aún</div></div>';
    return;
  }
  div.innerHTML = tablaHTML + pdfHTML;
  }catch(err){
    console.error('renderGanancias:', err);
    if(div) div.innerHTML = '<div class="empty"><div class="empty-icon">⚠</div><div class="empty-text">No se pudieron cargar los datos de ganancias. Recargá la página.</div></div>';
  }
}

// Genera y abre el formulario F.1357 (Control de Liquidación del Impuesto a las
// Ganancias) del empleado para un período, a partir de la liquidación mensual.
async function verFormularioGanancias(periodo){
  try{
    if(!currentUser){ return; }
    const leg = currentUser.emp.leg;
    let liqs = [];
    try { liqs = (typeof getLiquidaciones === 'function') ? await getLiquidaciones() : []; } catch(_){ liqs = []; }
    const liq = (liqs || [])
      .filter(l => l && l.estado !== 'borrador' && l.tipo !== 'final' && l.tipo !== 'alimentos'
                && Array.isArray(l.items) && l.items.some(i => i.leg === leg)
                && (l.periodo === periodo || `${l.anio}-${String(l.mes).padStart(2,'0')}` === periodo))
      .sort((a,b)=> $m(b.id) - $m(a.id))[0];
    if(!liq){ toast('⚠ No se encontró la liquidación del período','var(--yellow)'); return; }
    if(typeof planillaGananciasHTML !== 'function'){ toast('⚠ Módulo de ganancias no disponible — recargá la página','var(--yellow)'); return; }
    const item = liq.items.find(i => i.leg === leg);
    const params = (typeof getLiqParams === 'function') ? getLiqParams() : {};
    const nov = { _importadoSiradig: (item && item.nov && item.nov._importadoSiradig) || false };
    const html = await planillaGananciasHTML(item, liq, params, nov);

    // Visualización en modal in-app (iframe srcdoc) — no depende de popups,
    // que en el entorno embebido suelen quedar bloqueados.
    const lbl = (typeof periodoLabel === 'function' ? periodoLabel(periodo) : periodo) || periodo;
    const prev = document.getElementById('modal-f1357');
    if(prev) prev.remove();
    const ov = document.createElement('div');
    ov.id = 'modal-f1357';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;flex-direction:column;padding:16px;box-sizing:border-box';
    ov.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;color:#fff;margin-bottom:10px;flex-wrap:wrap">
        <div style="font-size:15px;font-weight:600;flex:1;min-width:160px">Impuesto a las Ganancias — F.1357 · ${lbl}</div>
        <button id="f1357-print" style="background:#fff;color:#111;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px">🖨 Imprimir / PDF</button>
        <button id="f1357-close" style="background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.4);padding:7px 14px;border-radius:6px;cursor:pointer;font-size:13px">✕ Cerrar</button>
      </div>
      <iframe id="f1357-frame" style="flex:1;width:100%;border:none;border-radius:8px;background:#fff"></iframe>`;
    document.body.appendChild(ov);
    const frame = ov.querySelector('#f1357-frame');
    frame.srcdoc = html;
    const cerrar = ()=> ov.remove();
    ov.querySelector('#f1357-close').onclick = cerrar;
    ov.addEventListener('click', e=>{ if(e.target===ov) cerrar(); });
    ov.querySelector('#f1357-print').onclick = ()=>{ try{ frame.contentWindow.focus(); frame.contentWindow.print(); }catch(_){ } };
  } catch(e){ console.error('verFormularioGanancias:', e); toast('⚠ Error al generar el formulario','var(--red)'); }
}

async function verGanancia(key){
  try {
    const todos = await getGanancias();
    const rec = todos[key];
    if(!rec){ toast('⚠ Documento no encontrado','var(--yellow)'); return; }
    if(currentUser){
      const log = await getReadLog();
      if(!log.some(r=>r.leg===currentUser.emp.leg && r.tipo==='ganancia' && r.periodo===rec.periodo)){
        const now = new Date();
        await addReadLog({ leg:currentUser.emp.leg, dni:currentUser.emp.dni,
          nom:currentUser.emp.nom, emp:currentUser.emp.emp, tipo:'ganancia',
          periodo:rec.periodo, periodoLabel:periodoLabel(rec.periodo),
          fecha:now.toLocaleDateString('es-AR'),
          hora:now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) });
        renderGanancias();
      }
    }
    const blob = b64toBlob(rec.data,'application/pdf');
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url,'_blank');
    if(!win||win.closed) mostrarReciboEnModal(rec, url);
    else setTimeout(()=>URL.revokeObjectURL(url),60000);
  } catch(e){ toast('⚠ Error al abrir el documento','var(--red)'); console.error(e); }
}

async function downloadGanancia(key){
  try {
    const todos = await getGanancias();
    const rec = todos[key];
    if(!rec){ toast('⚠ Documento no encontrado','var(--yellow)'); return; }
    if(currentUser){
      const log = await getReadLog();
      if(!log.some(r=>r.leg===currentUser.emp.leg && r.tipo==='ganancia' && r.periodo===rec.periodo)){
        const now = new Date();
        await addReadLog({ leg:currentUser.emp.leg, dni:currentUser.emp.dni,
          nom:currentUser.emp.nom, emp:currentUser.emp.emp, tipo:'ganancia',
          periodo:rec.periodo, periodoLabel:periodoLabel(rec.periodo),
          fecha:now.toLocaleDateString('es-AR'),
          hora:now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) });
        renderGanancias();
      }
    }
    const blob = b64toBlob(rec.data,'application/pdf');
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download=`ganancias_${rec.leg}_${rec.periodo}.pdf`;
    a.click(); URL.revokeObjectURL(url);
    toast('✓ Documento descargado','var(--green)');
  } catch(e){ toast('⚠ Error al descargar','var(--red)'); console.error(e); }
}

// ── RR.HH.: buscar empleado para ganancias ──
let _ganEmpSeleccionado = null;
function renderGanEmpSearch(){}   // no longer used
function seleccionarGanEmp(leg){} // no longer used
function subirGanancias(){}  // no longer used

// ── Bulk PDF processing for ganancias ──
let _ganSrcDoc = null;
let _ganPeriodo = '';
let _ganNumPages = 0;
let _ganAsignaciones = [];

function setGanProgress(txt, pct){
  document.getElementById('gan-progress').style.display='block';
  document.getElementById('gan-progress-txt').textContent=txt;
  document.getElementById('gan-progress-bar').style.width=pct+'%';
}

async function cargarGananciasParaAsignar(){
  const periodo = document.getElementById('gan-periodo').value;
  const fileInput = document.getElementById('gan-file');
  if(!periodo){ toast('⚠ Seleccioná el período','var(--yellow)'); return; }
  if(!fileInput.files[0]){ toast('⚠ Seleccioná el PDF','var(--yellow)'); return; }
  if(typeof pdfjsLib==='undefined'||typeof PDFLib==='undefined'){
    toast('⚠ Las librerías aún se cargan, reintentá','var(--yellow)'); return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  const btn = document.getElementById('btn-procesar-gan');
  btn.disabled=true;
  setGanProgress('Leyendo PDF...',5);

  try {
    const ab = await fileInput.files[0].arrayBuffer();
    const uint8 = new Uint8Array(ab);
    if(uint8.length<5||String.fromCharCode(uint8[0],uint8[1],uint8[2],uint8[3])!=='%PDF')
      throw new Error('El archivo no es un PDF válido.');

    setGanProgress('Cargando documento...',12);
    const {PDFDocument}=PDFLib;
    _ganSrcDoc = await PDFDocument.load(uint8.slice(),{ignoreEncryption:true});
    _ganNumPages = _ganSrcDoc.getPageCount();
    _ganPeriodo = periodo;

    setGanProgress('Extrayendo texto...',20);
    const pdfJsDoc = await pdfjsLib.getDocument({data:uint8.slice()}).promise;

    _ganAsignaciones=[];
    const pares = Math.ceil(_ganNumPages / 2);
    for(let p=0; p<pares; p++){
      const pag1 = p*2 + 1;
      const pag2 = p*2 + 2;
      setGanProgress(`Analizando par ${p+1} de ${pares} (pág ${pag1}-${Math.min(pag2,_ganNumPages)})...`,
        20 + Math.round(((p+1)/pares)*70));

      // Extraer texto de ambas páginas del par y combinar
      let itemsTodos = [];
      const pg1 = await pdfJsDoc.getPage(pag1);
      const tc1 = await pg1.getTextContent();
      itemsTodos = itemsTodos.concat(tc1.items);
      if(pag2 <= _ganNumPages){
        const pg2 = await pdfJsDoc.getPage(pag2);
        const tc2 = await pg2.getTextContent();
        itemsTodos = itemsTodos.concat(tc2.items);
      }

      const emp = detectarCUIL(itemsTodos);
      const textoDebug = itemsTodos.map(it=>it.str||'').join(' ').substring(0,400);
      // pages: índices 0-based de ambas páginas
      const pages = pag2 <= _ganNumPages ? [p*2, p*2+1] : [p*2];
      _ganAsignaciones.push({par: p+1, pages, emp, textoDebug});
    }

    setGanProgress('¡Listo!',100);
    setTimeout(()=>document.getElementById('gan-progress').style.display='none',500);
    abrirModalGan();
  } catch(e){
    document.getElementById('gan-progress').style.display='none';
    toast('⚠ '+e.message,'var(--red)');
    console.error(e);
  }
  btn.disabled=false;
}

function abrirModalGan(){
  const auto = _ganAsignaciones.filter(a=>a.emp).length;
  const total = _ganAsignaciones.length;
  document.getElementById('gan-proc-resumen').textContent =
    `${_ganNumPages} páginas · ${total} pares (2 pág c/u) · ${auto} asignados automáticamente · ${total-auto} sin detectar`;
  document.getElementById('gan-bulk-search').value='';
  document.getElementById('gan-bulk-results').style.display='none';
  renderGanLista();
  document.getElementById('modal-proceso-gan').style.display='flex';
}

function renderGanLista(){
  const lista = document.getElementById('gan-proc-lista');
  lista.innerHTML = _ganAsignaciones.map((a,i)=>{
    const nom = a.emp?a.emp.nom:'';
    const color = a.emp?'var(--accent)':'var(--border)';
    const pagLabel = a.pages.length===2 ? `Págs ${a.pages[0]+1}-${a.pages[1]+1}` : `Pág ${a.pages[0]+1}`;
    const badge = a.emp
      ?`<span style="font-size:10px;font-family:var(--font-mono);color:var(--green);border:1px solid rgba(34,197,94,.3);padding:2px 7px;border-radius:10px;white-space:nowrap">✓ Auto</span>`
      :`<span style="font-size:10px;color:var(--red);white-space:nowrap">Sin detectar</span>`;
    const debugTxt = (!a.emp && a.textoDebug)
      ?`<div style="font-size:10px;color:var(--t3);font-family:var(--font-mono);margin-top:3px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Texto: ${a.textoDebug||'(vacío)'}</div>`:'';
    return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px;font-family:var(--font-mono);color:var(--t3);min-width:72px">${pagLabel}</span>
        <div style="flex:1;position:relative">
          <input type="text" data-idx="${i}" value="${nom}" placeholder="Buscar empleado..."
            oninput="buscarGanPagina(this)" onfocus="buscarGanPagina(this)"
            style="width:100%;background:var(--bg2);border:1px solid ${color};border-radius:var(--r);padding:6px 10px;color:var(--t1);font-size:12px;outline:none">
          <div id="gan-pag-results-${i}" style="display:none;position:absolute;left:0;right:0;background:var(--bg1);border:1px solid var(--border);border-radius:var(--r);z-index:50;max-height:150px;overflow-y:auto;top:100%;margin-top:2px;box-shadow:0 8px 24px rgba(0,0,0,.3)"></div>
        </div>
        ${badge}
        <button onclick="limpiarGanPagina(${i})" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:2px 6px">✕</button>
      </div>${debugTxt}
    </div>`;
  }).join('');
  actualizarCntGan();
}

function buscarGanPagina(input){
  const i=parseInt(input.dataset.idx);
  const q=input.value.toLowerCase().trim();
  const res=document.getElementById(`gan-pag-results-${i}`);
  _ganAsignaciones[i].emp=null; input.style.borderColor='var(--border)';
  if(!q){res.style.display='none';return;}
  const lista=getNomina().filter(e=>e.nom.toLowerCase().includes(q)||e.leg.includes(q)||e.cuil.includes(q)).slice(0,8);
  if(!lista.length){res.style.display='none';return;}
  res.style.display='block';
  res.innerHTML=lista.map(e=>`
    <div style="padding:7px 12px;cursor:pointer;font-size:12px;color:var(--t1);border-bottom:1px solid var(--border)"
      onmousedown="asignarGanPagina(${i},'${e.leg}')">
      <strong>${e.nom}</strong> <span style="color:var(--t3)">· ${e.leg} · CUIL: ${e.cuil}</span>
    </div>`).join('');
}

function asignarGanPagina(pageIdx,leg){
  const emp=empByLeg(leg); if(!emp)return;
  _ganAsignaciones[pageIdx].emp=emp;
  renderGanLista();
}

function limpiarGanPagina(i){
  _ganAsignaciones[i].emp=null; renderGanLista();
}

function actualizarCntGan(){
  const n=_ganAsignaciones.filter(a=>a.emp).length;
  document.getElementById('gan-assigned-count').textContent=`${n} de ${_ganNumPages} páginas asignadas`;
}

async function renderGanBulkSearch(){
  const q=document.getElementById('gan-bulk-search').value.toLowerCase();
  const res=document.getElementById('gan-bulk-results');
  if(!q){res.style.display='none';return;}
  const lista=getNomina().filter(e=>e.nom.toLowerCase().includes(q)||e.leg.includes(q)).slice(0,6);
  if(!lista.length){res.style.display='none';return;}
  res.style.display='block';
  res.innerHTML=lista.map(e=>`
    <div style="padding:7px 14px;cursor:pointer;font-size:12px;color:var(--t1);border-bottom:1px solid var(--border)"
      onmousedown="asignarGanTodas('${e.leg}')">
      <strong>${e.nom}</strong> <span style="color:var(--t3)">· ${e.leg}</span>
    </div>`).join('');
}

function asignarGanTodas(leg){
  const emp=empByLeg(leg); if(!emp)return;
  _ganAsignaciones.forEach(a=>{if(!a.emp) a.emp=emp;});
  document.getElementById('gan-bulk-search').value='';
  document.getElementById('gan-bulk-results').style.display='none';
  renderGanLista();
}

async function confirmarAsignacionGan(){
  const asig=_ganAsignaciones.filter(a=>a.emp);
  if(!asig.length){toast('⚠ Asigná al menos una página','var(--yellow)');return;}
  const btn=document.getElementById('btn-confirmar-gan');
  btn.disabled=true; btn.textContent='Generando...';
  try {
    const {PDFDocument}=PDFLib;
    const grupos={};
    asig.forEach(a=>{
      if(!grupos[a.emp.leg]) grupos[a.emp.leg]={emp:a.emp,pages:[]};
      grupos[a.emp.leg].pages.push(...a.pages);
    });
    let n=0;
    for(const {emp,pages} of Object.values(grupos)){
      const nd=await PDFDocument.create();
      const cp=await nd.copyPages(_ganSrcDoc,pages);
      cp.forEach(p=>nd.addPage(p));
      const bytes=await nd.save();
      await setGanancia(`${emp.leg}_${_ganPeriodo}`,{
        leg:emp.leg, dni:emp.dni, nom:emp.nom, emp:emp.emp,
        periodo:_ganPeriodo, data:uint8ToB64(bytes),
        uploadedAt:new Date().toLocaleDateString('es-AR'),
        uploadedBy:currentUser?.emp?.nom||'RR.HH.'
      });
      n++;
    }
    cerrarModalGan();
    renderGananciasAdmin();
    toast(`✓ ${n} documento(s) de ganancias guardados para ${periodoLabel(_ganPeriodo)}`,'var(--green)');
    document.getElementById('gan-file').value='';
    document.getElementById('gan-periodo').value='';
    _ganSrcDoc=null;
  } catch(e){
    toast('⚠ Error: '+e.message,'var(--red)'); console.error(e);
  }
  btn.disabled=false; btn.textContent='✓ Guardar asignados';
}

function cerrarModalGan(){
  document.getElementById('modal-proceso-gan').style.display='none';
}

// Eliminar ganancias por período
async function eliminarGanPeriodo(){
  const periodo = document.getElementById('del-gan-periodo').value;
  if(!periodo){ toast('⚠ Seleccioná un período','var(--yellow)'); return; }
  const todos = await getGanancias();
  const keys = Object.keys(todos).filter(k=>todos[k].periodo===periodo);
  if(!keys.length){ toast(`No hay documentos para ${periodoLabel(periodo)}`,'var(--t3)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar TODOS los documentos de ganancias de ${periodoLabel(periodo)}?<br><br>${keys.length} documento(s) serán borrados.`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  for(const k of keys) await deleteGanancia(k);
  toast(`✓ ${keys.length} documento(s) de ${periodoLabel(periodo)} eliminados`,'var(--yellow)');
  document.getElementById('del-gan-periodo').value='';
}

// Eliminar ganancias individual (empleado + período)
async function eliminarGananciaEmpPeriodo(){
  const emp = _delEmpSel.gan;
  const periodo = document.getElementById('del-emp-periodo-gan').value;
  if(!emp){ toast('⚠ Seleccioná un empleado','var(--yellow)'); return; }
  if(!periodo){ toast('⚠ Seleccioná el período','var(--yellow)'); return; }
  const key = `${emp.leg}_${periodo}`;
  const todos = await getGanancias();
  if(!todos[key]){ toast(`No hay documento de ${emp.nom.split(',')[0].trim()} para ${periodoLabel(periodo)}`,'var(--t3)'); return; }
  const _cfm = await showConfirm({titulo:'Confirmar acción', mensaje:`¿Eliminar el documento de ganancias de ${emp.nom} (${periodoLabel(periodo)})?`, labelOk:'Confirmar', peligroso:true});
    if(!_cfm) return;
  await deleteGanancia(key);
  toast('✓ Documento eliminado','var(--yellow)');
  _delEmpSel.gan=null;
  document.getElementById('del-emp-search-gan').value='';
  document.getElementById('del-emp-periodo-gan').value='';
}

// No se muestra lista — función vacía para compatibilidad
function renderGananciasAdmin(){}

