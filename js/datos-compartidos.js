// Aguila Motors · Datos compartidos (datos.js publicado en el repositorio).
// (datos-compartidos.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Datos compartidos (datos.js en el repositorio)
// ----------------------------------------------------------------------------
// El encargado edita en su PC (modo encargado) y exporta datos.js. Al subirlo
// al repositorio, todos los que abren la pagina cargan esos empleados (con
// rango y Discord) y productos, en solo lectura. Sin datos.js publicado, cada
// PC sigue usando sus propios datos como siempre.
// ============================================================================

const SHARED_DATA_FILE = "datos.js";
const SHARED_DATA_LIVE_URL = "https://dc-david8.github.io/AguilaMotors/" + SHARED_DATA_FILE;
// Huella SHA-256 de la contrasena del encargado (la contrasena no esta en el codigo).
const EDITOR_PASSWORD_SHA256 = "6cd247cdd58ad88f2bf53d07ed2845c17375143c377648c4b26a981d2f7906b8";
const EDITOR_STORAGE_KEY = "aguila_editor_v1";

let SHARED_DATA = null;

function isEditorMode() {
  try {
    return localStorage.getItem(EDITOR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setEditorMode(on) {
  try {
    if (on) localStorage.setItem(EDITOR_STORAGE_KEY, "1");
    else localStorage.removeItem(EDITOR_STORAGE_KEY);
  } catch {
    // sin almacenamiento
  }
}

// Hay datos publicados y quien mira no es el encargado: todo lo compartido es de solo lectura.
function isSharedReadOnly() {
  return !!SHARED_DATA && !isEditorMode();
}

// SHA-256 en JavaScript puro: crypto.subtle no existe en paginas abiertas como
// archivo (programa de escritorio) ni fuera de https.
function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text));
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = bytes.length;
  const total = Math.ceil((len + 9) / 64) * 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[len] = 0x80;
  const bits = len * 8;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 8, Math.floor(bits / 0x100000000));
  dv.setUint32(total - 4, bits >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

function normalizeSharedData(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.employees)) return null;
  const employees = raw.employees
    .map((e, i) => ({
      id: `shared-${i}`,
      name: String(e?.name || "").trim(),
      surname: String(e?.surname || "").trim(),
      rank: String(e?.rank || "").trim(),
      discord: parseDiscordId(e?.discord) || "",
      iban: parseIban(e?.iban) || "",
      noPay: e?.noPay === true,
    }))
    .filter((e) => e.name && e.surname);
  const discord = {};
  const iban = {};
  const noPay = {};
  for (const e of employees) {
    const key = normalizeKeySimple(fullName(e));
    if (e.noPay) noPay[key] = true;
    if (e.discord) discord[key] = e.discord;
    if (e.iban) iban[key] = e.iban;
  }
  return {
    publishedAt: String(raw.publishedAt || ""),
    employees,
    discord,
    iban,
    noPay,
    customProducts: Array.isArray(raw.customProducts) ? raw.customProducts : [],
    productOverrides: raw.productOverrides && typeof raw.productOverrides === "object" ? raw.productOverrides : {},
    compraventa: cvNormalizeShared(raw.compraventa),
  };
}

function loadScriptOnce(src, timeoutMs) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    const done = (ok) => {
      clearTimeout(timer);
      s.onload = s.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    s.onload = () => done(true);
    s.onerror = () => done(false);
    s.src = src;
    document.head.appendChild(s);
  });
}

// Se carga siempre la ultima version publicada (el ?t= evita la cache). En la
// web se pide al mismo sitio; en el programa de escritorio se pide primero a la
// web publicada y, si no hay internet, al datos.js de la carpeta.
async function loadSharedData() {
  const t = Date.now();
  const onPublishedSite = /^https?:$/.test(location.protocol) && /github\.io$/i.test(location.hostname);
  const sources = onPublishedSite ? [SHARED_DATA_FILE] : [SHARED_DATA_LIVE_URL, SHARED_DATA_FILE];
  for (const src of sources) {
    window.AGUILA_DATOS = undefined;
    const ok = await loadScriptOnce(`${src}?t=${t}`, 5000);
    if (ok && window.AGUILA_DATOS) {
      SHARED_DATA = normalizeSharedData(window.AGUILA_DATOS);
      if (SHARED_DATA) return;
    }
  }
  SHARED_DATA = null;
}

function customProductsSource() {
  if (PROD_CLOUD.ok) return PROD_CLOUD.custom;
  return isSharedReadOnly() ? SHARED_DATA.customProducts : loadCustomProductsLocal();
}

function productOverridesSource() {
  if (PROD_CLOUD.ok) return PROD_CLOUD.overrides;
  return isSharedReadOnly() ? SHARED_DATA.productOverrides : loadProductOverridesLocal();
}

function fmtStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Arma datos.js con los datos de ESTA PC (los que edita el encargado).
async function buildSharedDataFile() {
  // Si los empleados estan en linea, no se copian a datos.js (que es publico en GitHub).
  const employees = (EMP_CLOUD.ok ? [] : await listEmployees())
    .map((e) => ({
      name: String(e.name || "").trim(),
      surname: String(e.surname || "").trim(),
      rank: String(e.rank || "").trim(),
      discord: getEmployeeDiscord(fullName(e)),
      iban: getEmployeeIban(fullName(e)),
      noPay: isEmployeeNoPay(fullName(e)),
    }))
    .filter((e) => e.name && e.surname)
    .sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, "es", { sensitivity: "base" }));
  const data = {
    publishedAt: fmtStamp(),
    employees,
    customProducts: loadCustomProductsLocal(),
    productOverrides: loadProductOverridesLocal(),
    compraventa: cvForExport(),
  };
  const text =
    "// Datos compartidos de Aguila Motors. Se generan desde la pagina\n" +
    "// (Modulo de Pagos → Datos compartidos → Exportar datos). No editar a mano.\n" +
    "window.AGUILA_DATOS = " + JSON.stringify(data, null, 1) + ";\n";
  return { data, text };
}

// Copia lo publicado a esta PC (para el encargado en una PC nueva o en el programa de escritorio).
async function importSharedIntoLocal() {
  const local = await listEmployees();
  for (const e of local) await deleteEmployee(e.id, accessPassword());
  saveEmployeeDiscordMap(SHARED_DATA.discord);
  saveEmployeeIbanMap(SHARED_DATA.iban);
  saveEmployeeNoPayMap(SHARED_DATA.noPay);
  for (const e of SHARED_DATA.employees) {
    await addEmployee({ name: e.name, surname: e.surname, rank: e.rank }, accessPassword());
  }
  saveCustomProductsLocal(SHARED_DATA.customProducts);
  saveProductOverridesLocal(SHARED_DATA.productOverrides);
  if (SHARED_DATA.compraventa.tx.length || !cvLoadLocal().tx.length) cvSaveLocal(SHARED_DATA.compraventa);
}

function setupSharedData() {
  const statusEl = byId("shared-status");
  if (!statusEl) return;
  const btnEditor = byId("shared-editor");
  const btnExport = byId("shared-export");
  const btnCopy = byId("shared-copy");
  const btnImport = byId("shared-import");
  const btnExit = byId("shared-exit");

  const editor = isEditorMode();
  btnEditor.hidden = editor;
  btnExport.hidden = !editor;
  btnCopy.hidden = !editor;
  btnExit.hidden = !editor;
  btnImport.hidden = !(editor && SHARED_DATA);

  const when = SHARED_DATA?.publishedAt ? ` el ${SHARED_DATA.publishedAt}` : "";
  if (editor) {
    statusEl.textContent =
      "Modo encargado: editas los datos de esta PC. Para que los demás los vean, exporta datos.js y súbelo al repositorio." +
      (SHARED_DATA ? ` Última publicación${when}.` : " Todavía no hay datos publicados.");
  } else if (SHARED_DATA) {
    statusEl.textContent = `Empleados y productos publicados por el encargado${when}. Aquí solo se pueden ver.`;
  } else {
    statusEl.textContent = "Todavía no hay datos publicados: cada PC usa sus propios empleados y productos.";
  }

  if (empCloudOn()) {
    statusEl.textContent +=
      " · Los empleados ya están en línea (Supabase): se editan en Gestión de empleados con la sesión de encargado y todos los ven al momento.";
  }

  btnEditor.addEventListener("click", async () => {
    const pass = window.prompt("Contraseña del encargado:");
    if (pass == null) return;
    if (sha256Hex(pass) !== EDITOR_PASSWORD_SHA256) {
      alert("Contraseña incorrecta.");
      return;
    }
    setEditorMode(true);
    location.reload();
  });

  btnExit.addEventListener("click", () => {
    if (!window.confirm("¿Salir del modo encargado en esta PC? Verás los datos publicados en solo lectura.")) return;
    setEditorMode(false);
    location.reload();
  });

  btnExport.addEventListener("click", async () => {
    const { data, text } = await buildSharedDataFile();
    if (!data.employees.length && !window.confirm("No hay empleados en esta PC. ¿Exportar igualmente?")) return;
    const blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = SHARED_DATA_FILE;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent =
      `Exportado: ${data.employees.length} empleados, ${data.customProducts.length} productos agregados y ${data.compraventa.tx.length} movimientos de compraventa. ` +
      "Sube el archivo al repositorio con el nombre datos.js (si el navegador lo guardó como «datos (1).js», cámbiale el nombre).";
  });

  btnCopy.addEventListener("click", async () => {
    const { text } = await buildSharedDataFile();
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    else statusEl.textContent = "Datos copiados. Pégalos en un archivo datos.js o mándamelos para subirlos.";
  });

  btnImport.addEventListener("click", async () => {
    if (!window.confirm("Esto reemplaza los empleados, Discord, IBAN, productos y compraventa de esta PC por los publicados. ¿Continuar?")) return;
    statusEl.textContent = "Cargando los datos publicados en esta PC…";
    btnImport.disabled = true;
    try {
      await importSharedIntoLocal();
      location.reload();
    } catch (e) {
      alert(String(e?.message || e || "No se pudo cargar."));
      btnImport.disabled = false;
    }
  });
}
const EMPLOYEE_STORAGE_KEY = "aguila_employees_v1";

function loadEmployeesLocal() {
  try {
    const raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e) => ({
        id: String(e?.id || safeRandomId()),
        name: String(e?.name || "").trim(),
        surname: String(e?.surname || "").trim(),
        rank: String(e?.rank || "").trim(),
      }))
      .filter((e) => e.name && e.surname);
  } catch {
    return [];
  }
}

function saveEmployeesLocal(list) {
  localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(list || []));
}

let _pyApiGaveUp = false;

async function waitPyApi(maxMs = 2500) {
  // En la version web (navegador) no existe el backend de escritorio: tras el
  // primer intento fallido no se vuelve a esperar, para no retrasar cada accion.
  if (_pyApiGaveUp) return window?.pywebview?.api || null;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const api = window?.pywebview?.api;
    if (api) return api;
    await new Promise((r) => setTimeout(r, 50));
  }
  _pyApiGaveUp = true;
  return null;
}

async function listEmployees() {
  if (empCloudOn()) return EMP_CLOUD.list.map((e) => ({ ...e }));
  if (isSharedReadOnly()) return SHARED_DATA.employees.map((e) => ({ ...e }));
  const api = await waitPyApi();
  if (api && typeof api.emp_list === "function") {
    try {
      const data = await api.emp_list();
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.employees) ? data.employees : []);
      return arr;
    } catch {
    }
  }
  return loadEmployeesLocal();
}

async function addEmployee(payload, password) {
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }

  if (empCloudOn()) {
    // Todo en un solo guardado (v100): antes Discord e IBAN iban en guardados
    // aparte, sin esperar, y se pisaban entre ellos o con la recarga de la lista.
    const e = { id: safeRandomId(), name: payload.name, surname: payload.surname, rank: payload.rank || "", discord: payload.discord || "", iban: payload.iban || "", noPay: !!payload.noPay, altaAt: payload.altaAt || empToday(), contratadoAt: payload.contratadoAt || payload.altaAt || empToday() };
    await empCloudSave(e);
    EMP_CLOUD.list.push(e);
    empLog(e.id, "alta", `➕ Entró al taller${e.rank ? ` como ${rankLabel(e.rank)}` : ""}`);
    return true;
  }

  const api = await waitPyApi();
  if (api && typeof api.emp_add === "function") {
    await api.emp_add(payload, BACKEND_LEGACY_PASSWORD);
    return true;
  }

  const current = loadEmployeesLocal();
  current.push({ id: safeRandomId(), ...payload });
  saveEmployeesLocal(current);
  return true;
}

async function updateEmployee(id, payload, password) {
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }

  if (empCloudOn()) {
    const cur = EMP_CLOUD.list.find((e) => String(e.id) === String(id));
    if (!cur) throw new Error("Empleado no encontrado");
    const next = { ...cur, ...payload };
    await empCloudSave(next);
    const before = { ...cur };
    Object.assign(cur, next);
    if ("rank" in payload && normalizeKeySimple(before.rank) !== normalizeKeySimple(next.rank)) {
      const up = rankOrder(next.rank) > rankOrder(before.rank);
      empLog(id, "rango", `${up ? "⬆️ Ascendido" : "⬇️ Bajado"} de ${before.rank ? rankLabel(before.rank) : "sin rango"} a ${next.rank ? rankLabel(next.rank) : "sin rango"}`);
    }
    if (("name" in payload || "surname" in payload) && fullName(before) !== fullName(next)) empLog(id, "datos", `✏️ Cambio de nombre: ${fullName(before)} → ${fullName(next)}`);
    if ("noPay" in payload && !!before.noPay !== !!next.noPay) empLog(id, "datos", next.noPay ? "💸 Marcado como «No cobra»" : "💸 Vuelve a cobrar la nómina");
    if ("discord" in payload && (before.discord || "") !== (next.discord || "")) empLog(id, "datos", next.discord ? "🔗 Discord cambiado" : "🔗 Discord quitado");
    if ("iban" in payload && (before.iban || "") !== (next.iban || "")) empLog(id, "datos", `🏦 IBAN: ${next.iban || "quitado"}`);
    if ("altaAt" in payload && (before.altaAt || "") !== (next.altaAt || "")) empLog(id, "datos", `📅 Fecha de ingreso al taller: ${empDate(next.altaAt) || "sin fecha"}`);
    if ("contratadoAt" in payload && (before.contratadoAt || "") !== (next.contratadoAt || "")) empLog(id, "datos", `📝 Fecha de contratación: ${empDate(next.contratadoAt) || "sin fecha"}`);
    return true;
  }

  const api = await waitPyApi();

  if (api && typeof api.emp_update === "function") {
    await api.emp_update(id, payload, BACKEND_LEGACY_PASSWORD);
    return true;
  }

  // El backend de la app de escritorio (el .exe) guarda los empleados por su
  // cuenta vía emp_list/emp_add/emp_delete, pero no tiene una funcion para
  // editar directamente (no tenemos el codigo fuente para agregarsela). Asi
  // que "editar" se hace por dentro como borrar + volver a anadir con los
  // mismos datos y el campo cambiado, de forma transparente para quien usa
  // el programa.
  if (api && typeof api.emp_add === "function" && typeof api.emp_delete === "function") {
    const list = await listEmployees();
    const existing = list.find((e) => String(e.id) === String(id));
    if (!existing) throw new Error("Empleado no encontrado");
    const merged = {
      name: existing.name,
      surname: existing.surname,
      rank: existing.rank || "",
      ...payload,
    };
    await api.emp_delete(id, BACKEND_LEGACY_PASSWORD);
    await api.emp_add(merged, BACKEND_LEGACY_PASSWORD);
    return true;
  }

  // Sin backend de escritorio (ej. version web en el navegador): los
  // empleados viven en localStorage, se puede editar directo.
  const current = loadEmployeesLocal();
  const idx = current.findIndex((e) => String(e.id) === String(id));
  if (idx === -1) throw new Error("Empleado no encontrado");
  current[idx] = { ...current[idx], ...payload };
  saveEmployeesLocal(current);
  return true;
}

async function deleteEmployee(id, password) {
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }

  if (empCloudOn()) {
    empCloudRequireSession();
    await cvCloud.del("employees", `id=eq.${encodeURIComponent(id)}`);
    EMP_CLOUD.list = EMP_CLOUD.list.filter((e) => String(e.id) !== String(id));
    return true;
  }

  const api = await waitPyApi();
  if (api && typeof api.emp_delete === "function") {
    await api.emp_delete(id, BACKEND_LEGACY_PASSWORD);
    return true;
  }

  const current = loadEmployeesLocal();
  const next = current.filter((e) => String(e.id) !== String(id));
  saveEmployeesLocal(next);
  return true;
}
