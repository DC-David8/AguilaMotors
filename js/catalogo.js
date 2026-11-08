// Aguila Motors · Catálogo de vehículos del servidor.
// (catalogo.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ===================== Catálogo de vehículos del servidor =====================
// Datos en catalogo/vehiculos.js (window.AGUILA_CATALOGO) y fotos en catalogo/fotos.
// Se usa en la Caja (buscar el vehículo que se tunea) y en Compraventa (precios
// de referencia para comprar y revender).

// Categoría del catálogo -> pestaña de tuning de la Caja (solo las que son seguras).
const CAT_GAMA = {
  motos: "motos",
  "gama baja": "gama_baja",
  "gama media": "gama_media",
  "gama alta": "gama_alta",
  camiones: "camiones",
  aviones: "aereos",
  helicopteros: "aereos",
};

// El catalogo vive en Supabase (tabla "catalogo", la edita el Jefe Aguila). Si aun
// no esta subido, o no hay conexion, se usa la copia fija de catalogo/vehiculos.js.
const CATALOG = {
  list: Array.isArray(window.AGUILA_CATALOGO?.vehiculos) ? window.AGUILA_CATALOGO.vehiculos : [],
  source: "static", // "static" | "cloud"
  missing: false, // falta crear la tabla en Supabase
};
const CAT_BUCKET = "catalogo-fotos";

function catVehicles() {
  return CATALOG.list;
}

function catRowFromDb(r) {
  const n = r.precio == null || r.precio === "" ? null : Number(r.precio);
  return {
    id: String(r.id),
    nombre: String(r.nombre || ""),
    modelo: r.modelo || null,
    precio: Number.isFinite(n) ? n : null,
    categoria: r.categoria || "",
    concesionario: r.concesionario || "",
    seccion: r.seccion || null,
    foto: r.foto || "",
  };
}

async function loadCatalogCloud() {
  try {
    const rows = await cvCloud.selectAll("catalogo", "nombre.asc");
    CATALOG.missing = false;
    if (rows.length) {
      CATALOG.list = rows.map(catRowFromDb);
      CATALOG.source = "cloud";
    }
  } catch (e) {
    CATALOG.missing = e.status === 404 || e.code === "PGRST205" || e.code === "42P01";
  }
}

function catSlug(s) {
  return normalizeKeySimple(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "vehiculo";
}

// Vehiculos de donacion: el dueno del servidor les pone precio 9999999999999.
const CAT_DONATION_PRICE = 1e12;
function catIsDonation(v) {
  return typeof v?.precio === "number" && v.precio >= CAT_DONATION_PRICE;
}

// Gama por precio para las categorias que no son una gama (Coches, Street
// Tuning, King of the Street, Coches Rally, Vapid...): analisis del 1/11/2026
// con los precios de las gamas que si estan en el catalogo.
const CAT_GAMA_LIMITS = { baja: 50000, media: 150000 }; // < baja: Baja · < media: Media · resto: Alta
const CAT_NO_TUNING = ["bicicletas"]; // no se tunean

function catGamaKey(v) {
  if (!v) return "";
  if (catIsDonation(v)) return "gama_vip";
  const cat = normalizeKeySimple(v.categoria);
  if (CAT_GAMA[cat]) return CAT_GAMA[cat];
  if (CAT_NO_TUNING.includes(cat)) return "";
  if (typeof v.precio !== "number" || !(v.precio > 0)) return "";
  if (v.precio < CAT_GAMA_LIMITS.baja) return "gama_baja";
  if (v.precio < CAT_GAMA_LIMITS.media) return "gama_media";
  return "gama_alta";
}

// Precio para mostrar (los de donacion no tienen precio en dinero del juego).
function catPriceText(v) {
  if (catIsDonation(v)) return "Donación (VIP)";
  return typeof v?.precio === "number" ? fmtMoney(v.precio) : "Pendiente";
}

// Busca por nombre o modelo. Primero lo que empieza igual, luego lo que lo contiene.
function catSearch(q, limit = 8) {
  const k = normalizeKeySimple(q);
  if (!k) return [];
  const out = [];
  for (const v of catVehicles()) {
    const name = normalizeKeySimple(v.nombre);
    const model = normalizeKeySimple(v.modelo);
    let score = -1;
    if (model && model === k) score = 0;
    else if (name.startsWith(k) || (model && model.startsWith(k))) score = 1;
    else if (name.split(" ").some((w) => w.startsWith(k))) score = 2;
    else if (name.includes(k) || (model && model.includes(k)) || normalizeKeySimple(v.categoria).includes(k)) score = 3;
    if (score >= 0) out.push({ v, score });
  }
  out.sort((x, y) => x.score - y.score || String(x.v.nombre).localeCompare(String(y.v.nombre), "es"));
  return out.slice(0, limit).map((x) => x.v);
}

// Asociaciones hechas a mano: modelo del log -> id del catalogo (el log a veces
// corta el modelo, p. ej. "drafterhatc"). Las guarda el Jefe Aguila.
let CV_ALIAS = {};
async function loadCvAlias() {
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.cv_alias");
    const v = rows?.[0]?.value;
    if (v && typeof v === "object") CV_ALIAS = v;
  } catch {
    // sin asociaciones
  }
}
async function saveCvAlias(model, catId) {
  const k = normalizeKeySimple(model);
  const next = { ...CV_ALIAS };
  if (catId) next[k] = catId;
  else delete next[k];
  await cvCloud.upsert("app_settings", [{ key: "cv_alias", value: next }], "key");
  CV_ALIAS = next;
}

// El log de compraventa trae el modelo (codigo de spawn) o el nombre.
function catFind(model) {
  const k = normalizeKeySimple(model);
  if (!k) return null;
  const list = catVehicles();
  const alias = CV_ALIAS[k];
  if (alias) {
    const v = list.find((x) => x.id === alias);
    if (v) return v;
  }
  return list.find((v) => v.modelo && normalizeKeySimple(v.modelo) === k) || list.find((v) => normalizeKeySimple(v.nombre) === k) || null;
}

// Parecidos para cuando no hay coincidencia exacta (modelo cortado, nombre...).
function catGuess(model, limit = 3) {
  const k = normalizeKeySimple(model).replace(/[^a-z0-9]/g, "");
  if (k.length < 4) return [];
  const scored = [];
  for (const v of catVehicles()) {
    const m = normalizeKeySimple(v.modelo).replace(/[^a-z0-9]/g, "");
    const n = normalizeKeySimple(v.nombre).replace(/[^a-z0-9 ]/g, "");
    let s = 0;
    if (m && (m.startsWith(k) || k.startsWith(m))) s = 3;
    else if (n.split(" ").some((w) => w.length >= 4 && (w === k || w.startsWith(k) || (w.length >= 6 && k.startsWith(w))))) s = 2;
    else if (m && m.length >= 5 && (m.includes(k) || k.includes(m))) s = 1;
    if (s) scored.push({ v, s, d: Math.abs((m || n).length - k.length) });
  }
  scored.sort((x, y) => y.s - x.s || x.d - y.d);
  return scored.slice(0, limit).map((x) => x.v);
}

// Margenes de compraventa (% del precio de concesionario). Los cambia el Jefe Aguila.
const CV_MARGINS_DEFAULT = { buyMin: 0.5, buyMax: 0.6, sellMin: 0.75, sellMax: 0.8 };
let CV_MARGINS = { ...CV_MARGINS_DEFAULT };

async function loadCvMargins() {
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.cv_margins");
    const v = rows?.[0]?.value;
    if (v && typeof v === "object") CV_MARGINS = { ...CV_MARGINS_DEFAULT, ...v };
  } catch {
    // se quedan los de por defecto
  }
}

function cvRef(price) {
  if (typeof price !== "number" || !(price > 0) || price >= CAT_DONATION_PRICE) return null;
  const m = CV_MARGINS;
  const r = (x) => Math.round(price * x);
  return {
    buy: [r(m.buyMin), r(m.buyMax)],
    sell: [r(m.sellMin), r(m.sellMax)],
    // Margen: peor caso (comprar caro y vender barato) y mejor caso.
    margin: [r(m.sellMin) - r(m.buyMax), r(m.sellMax) - r(m.buyMin)],
  };
}

const pctTxt = (x) => `${Math.round(x * 100)}`;
const moneyRange = ([a, b]) => (a === b ? fmtMoney(a) : `${fmtMoney(a)} – ${fmtMoney(b)}`);

function catPhoto(v) {
  return v?.foto || "";
}

// ExcelJS (crea el .xlsx en el navegador). Se carga solo al exportar.
let EXCELJS_PROMISE = null;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (EXCELJS_PROMISE) return EXCELJS_PROMISE;
  const urls = [
    "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
    "https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js",
  ];
  EXCELJS_PROMISE = new Promise((resolve, reject) => {
    const tryAt = (i) => {
      if (i >= urls.length) {
        EXCELJS_PROMISE = null;
        return reject(new Error("no se pudo cargar el generador de Excel (¿sin internet?)."));
      }
      const s = document.createElement("script");
      s.src = urls[i];
      s.onload = () => (window.ExcelJS ? resolve(window.ExcelJS) : tryAt(i + 1));
      s.onerror = () => {
        s.remove();
        tryAt(i + 1);
      };
      document.head.appendChild(s);
    };
    tryAt(0);
  });
  return EXCELJS_PROMISE;
}

// Foto del catalogo reducida a JPEG (base64) para meterla en el Excel. Si no
// se puede leer (sin foto, error o sin permiso), devuelve null.
function catPhotoJpeg(src, w = 320, h = 180) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (v) => {
      clearTimeout(t);
      resolve(v);
    };
    const t = setTimeout(() => done(null), 15000);
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const g = c.getContext("2d");
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, w, h);
        const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * r;
        const dh = img.naturalHeight * r;
        g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        done(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = src;
  });
}

async function buildCatalogXlsx(ExcelJS, list, { filters = [], onProgress } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aguila Motors";
  wb.created = new Date();
  const ws = wb.addWorksheet("Catálogo", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
  const m = CV_MARGINS;
  const pc = (x) => `${Math.round(x * 100)} %`;
  ws.columns = [
    { header: "Foto", key: "foto", width: 25 },
    { header: "Vehículo", key: "nombre", width: 28 },
    { header: "Modelo (spawn)", key: "modelo", width: 18 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Gama en Caja", key: "gama", width: 15 },
    { header: "Concesionario", key: "concesionario", width: 16 },
    { header: "Sección", key: "seccion", width: 16 },
    { header: "Precio concesionario", key: "precio", width: 15 },
    { header: `Comprar desde (${pc(m.buyMin)})`, key: "buyMin", width: 15 },
    { header: `Comprar hasta (${pc(m.buyMax)})`, key: "buyMax", width: 15 },
    { header: `Vender desde (${pc(m.sellMin)})`, key: "sellMin", width: 15 },
    { header: `Vender hasta (${pc(m.sellMax)})`, key: "sellMax", width: 15 },
    { header: "Margen mínimo", key: "marMin", width: 14 },
    { header: "Margen máximo", key: "marMax", width: 14 },
    { header: "Donación (VIP)", key: "don", width: 11 },
    { header: "Modelos del log asociados", key: "alias", width: 22 },
    { header: "Enlace de la foto", key: "url", width: 30 },
    { header: "ID", key: "id", width: 18 },
  ];
  const head = ws.getRow(1);
  head.height = 34;
  head.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FF1A0F04" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF97D02" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: "FF7A3D00" } } };
  });
  const aliasOf = {};
  for (const [k, id] of Object.entries(CV_ALIAS || {})) (aliasOf[id] ||= []).push(k);
  const abs = (u) => {
    try {
      return u ? new URL(u, location.href).href : "";
    } catch {
      return u || "";
    }
  };
  const MONEY = '"$" #,##0';
  list.forEach((v, i) => {
    const ref = cvRef(v.precio);
    const gk = catGamaKey(v);
    const url = abs(catPhoto(v));
    const row = ws.addRow({
      nombre: v.nombre || "",
      modelo: v.modelo || "",
      categoria: v.categoria || "",
      gama: gk ? categoryLabel(gk) : "",
      concesionario: v.concesionario || "",
      seccion: v.seccion || "",
      precio: catIsDonation(v) ? "Donación" : typeof v.precio === "number" ? v.precio : "Pendiente",
      buyMin: ref ? ref.buy[0] : null,
      buyMax: ref ? ref.buy[1] : null,
      sellMin: ref ? ref.sell[0] : null,
      sellMax: ref ? ref.sell[1] : null,
      marMin: ref ? ref.margin[0] : null,
      marMax: ref ? ref.margin[1] : null,
      don: catIsDonation(v) ? "Sí" : "No",
      alias: (aliasOf[v.id] || []).join(", "),
      url: url ? { text: "Abrir foto", hyperlink: url } : "",
      id: v.id || "",
    });
    row.height = 82;
    row.alignment = { vertical: "middle", wrapText: true };
    for (const k of ["precio", "buyMin", "buyMax", "sellMin", "sellMax", "marMin", "marMax"]) row.getCell(k).numFmt = MONEY;
    row.getCell("nombre").font = { bold: true };
    if (url) row.getCell("url").font = { color: { argb: "FF1F5FBF" }, underline: true };
    if (i % 2) row.eachCell({ includeEmpty: true }, (c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4E8" } }));
  });
  ws.autoFilter = { from: { row: 1, column: 2 }, to: { row: 1, column: ws.columns.length } };

  // Fotos: de 6 en 6 para no saturar.
  let done = 0;
  const jobs = list.map((v, i) => async () => {
    const b64 = await catPhotoJpeg(catPhoto(v));
    done++;
    onProgress?.(done, list.length);
    if (!b64) {
      const c = ws.getCell(i + 2, 1);
      c.value = catPhoto(v) ? "(foto no disponible)" : "(sin foto)";
      c.font = { italic: true, color: { argb: "FF999999" } };
      c.alignment = { vertical: "middle", horizontal: "center" };
      return;
    }
    const id = wb.addImage({ base64: b64, extension: "jpeg" });
    ws.addImage(id, { tl: { col: 0.08, row: i + 1.06 }, ext: { width: 170, height: 96 }, editAs: "oneCell" });
  });
  const workers = Array.from({ length: 6 }, async () => {
    while (jobs.length) await jobs.shift()();
  });
  await Promise.all(workers);

  // Hoja de informacion
  const info = wb.addWorksheet("Información");
  info.columns = [{ width: 30 }, { width: 70 }];
  const rows = [
    ["Aguila Motors · Catálogo de vehículos", ""],
    ["Exportado", new Date().toLocaleString("es-ES")],
    ["Vehículos en este archivo", list.length],
    ["Vehículos en el catálogo", catVehicles().length],
    ["Filtros aplicados", filters.length ? filters.join(" · ") : "Ninguno (catálogo completo)"],
    ["Comprar (sobre el precio de concesionario)", `${pc(m.buyMin)} – ${pc(m.buyMax)}`],
    ["Vender (sobre el precio de concesionario)", `${pc(m.sellMin)} – ${pc(m.sellMax)}`],
    ["Margen", "Vender − Comprar (peor y mejor caso)"],
    ["Gama en Caja", "La gama con la que se cobra el tuning en la Caja (por categoría o por precio). Donación = Gama VIP."],
    ["Origen de los datos", CATALOG.source === "cloud" ? "Catálogo en línea (Supabase)" : "Catálogo de la página (catalogo/vehiculos.js)"],
  ];
  rows.forEach((r) => info.addRow(r));
  info.getRow(1).font = { bold: true, size: 14, color: { argb: "FFF97D02" } };
  info.getColumn(1).font = { bold: true };
  info.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFF97D02" } };
  info.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ---------- Caja: buscador de vehículo ----------
function setupVehicleSearch({ onGama } = {}) {
  const q = byId("veh-q");
  const results = byId("veh-results");
  const card = byId("veh-card");
  if (!q || !results || !card) return { clear() {} };
  if (!catVehicles().length) {
    byId("veh-search")?.setAttribute("hidden", "");
    return { clear() {} };
  }
  let items = [];
  let idx = -1;
  let picked = null;

  const closeList = () => {
    results.hidden = true;
    results.innerHTML = "";
    idx = -1;
  };
  const renderList = () => {
    items = catSearch(q.value, 8);
    results.innerHTML = "";
    if (!q.value.trim()) return closeList();
    if (!items.length) {
      results.innerHTML = '<div class="veh-none">Ningún vehículo coincide.</div>';
      results.hidden = false;
      return;
    }
    items.forEach((v, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "veh-opt" + (i === idx ? " is-active" : "");
      b.innerHTML = `<img alt="" loading="lazy"><span class="veh-opt-txt"><b></b><small></small></span><span class="veh-opt-price"></span>`;
      const img = b.querySelector("img");
      if (catPhoto(v)) img.src = catPhoto(v);
      else img.remove();
      b.querySelector("b").textContent = v.nombre;
      b.querySelector("small").textContent = [v.modelo, v.categoria].filter(Boolean).join(" · ");
      b.querySelector(".veh-opt-price").textContent = catPriceText(v);
      b.addEventListener("mousedown", (ev) => ev.preventDefault());
      b.addEventListener("click", () => pick(v));
      results.appendChild(b);
    });
    results.hidden = false;
  };

  function pick(v) {
    picked = v;
    q.value = "";
    closeList();
    const gama = catGamaKey(v);
    const gamaLabel = gama ? categoryLabel(gama) : "";
    card.innerHTML = `
      <div class="veh-pic"></div>
      <div class="veh-info">
        <div class="veh-name"></div>
        <div class="veh-meta"></div>
        <div class="veh-price"><span>Precio de concesionario</span><b></b></div>
        <div class="veh-gama"></div>
      </div>
      <button type="button" class="veh-x" aria-label="Quitar vehículo">✕</button>`;
    const pic = card.querySelector(".veh-pic");
    if (catPhoto(v)) {
      const img = document.createElement("img");
      img.src = catPhoto(v);
      img.alt = v.nombre;
      pic.appendChild(img);
    }
    card.querySelector(".veh-name").textContent = v.nombre;
    const meta = card.querySelector(".veh-meta");
    if (v.modelo) {
      const code = document.createElement("button");
      code.type = "button";
      code.className = "veh-code";
      code.title = "Copiar modelo";
      code.textContent = v.modelo;
      code.addEventListener("click", async () => {
        if (await copyText(v.modelo)) code.textContent = "✔ copiado";
        setTimeout(() => (code.textContent = v.modelo), 1200);
      });
      meta.appendChild(code);
    }
    meta.append(` ${[v.categoria, v.concesionario].filter(Boolean).join(" · ")}`);
    card.querySelector(".veh-price b").textContent = catPriceText(v);
    const g = card.querySelector(".veh-gama");
    if (gama) {
      g.innerHTML = `🛠️ Se cobra con <b></b>`;
      g.querySelector("b").textContent = gamaLabel;
      g.className = "veh-gama ok";
      onGama?.(gama);
    } else if (CAT_NO_TUNING.includes(normalizeKeySimple(v.categoria))) {
      g.textContent = "🚲 Las bicicletas no se tunean: solo servicios de taller.";
      g.className = "veh-gama warn";
    } else {
      g.textContent = `⚠ «${v.categoria || "Sin categoría"}»${typeof v.precio === "number" ? "" : " sin precio"}: elige tú la gama de tuning.`;
      g.className = "veh-gama warn";
    }
    card.querySelector(".veh-x").addEventListener("click", clear);
    card.hidden = false;
  }

  function clear() {
    picked = null;
    card.hidden = true;
    card.innerHTML = "";
  }

  q.addEventListener("input", () => {
    idx = -1;
    renderList();
  });
  q.addEventListener("keydown", (ev) => {
    if (results.hidden && ev.key !== "Enter") return;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!items.length) return;
      idx = ev.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      renderList();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      if (items.length) pick(items[Math.max(0, idx)]);
    } else if (ev.key === "Escape") {
      q.value = "";
      closeList();
    }
  });
  q.addEventListener("blur", () => setTimeout(closeList, 120));
  q.addEventListener("focus", () => q.value.trim() && renderList());
  return { clear, get picked() { return picked; } };
}
