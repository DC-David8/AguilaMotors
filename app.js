// ============================================================================
// Aguila Motors - Caja / Facturas / Gestion de productos y empleados
// ============================================================================

const byId = (id) => document.getElementById(id);

function stripWrap(s) {
  return String(s ?? "").trim().replace(/^`+|`+$/g, "").trim();
}

function normalizeKeySimple(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function parseMoney(raw) {
  return Number(String(raw).replace(/[.,]/g, "")) || 0;
}

function fmtMoney(n) {
  return `$ ${Number(n || 0).toLocaleString("es-ES")}`;
}

function fmtMoneyPlain(n) {
  return Number(n || 0).toLocaleString("es-ES");
}

function safeRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function escapeCsvCell(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sortByValueDescThenName(a, b) {
  if (b[1] !== a[1]) return b[1] - a[1];
  return a[0].localeCompare(b[0], "es", { sensitivity: "base" });
}

async function copyText(text) {
  const safe = String(text ?? "");

  try {
    const ta = document.createElement("textarea");
    ta.value = safe;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "0";
    ta.style.top = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.opacity = "0";

    const openDlg = document.querySelector("dialog[open]");
    (openDlg || document.body).appendChild(ta);

    try { ta.focus({ preventScroll: true }); } catch { ta.focus(); }
    ta.select();
    try { ta.setSelectionRange(0, ta.value.length); } catch { /* ignore */ }

    const ok = typeof document.execCommand === "function" && document.execCommand("copy");
    ta.remove();
    if (ok) return true;
  } catch {
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(safe);
      return true;
    } catch {
    }
  }

  return false;
}

function openCopyFallback(text) {
  const textStr = String(text ?? "");

  const modal = byId("copy-fallback-modal");
  const ta = byId("copy-fallback-text");

  function openOverlay() {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,.55)";
    overlay.style.zIndex = "99999";
    overlay.style.display = "grid";
    overlay.style.placeItems = "center";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const box = document.createElement("div");
    box.style.width = "min(720px, 92vw)";
    box.style.background = "#0f0d0a";
    box.style.border = "1px solid rgba(255,255,255,.12)";
    box.style.borderRadius = "14px";
    box.style.padding = "14px";
    box.style.boxShadow = "0 20px 60px rgba(0,0,0,.6)";

    const p = document.createElement("p");
    p.textContent = "Tu navegador ha bloqueado la copia automática (HTTP). El texto está seleccionado: pulsa Ctrl+C (o ⌘C).";
    p.style.margin = "0 0 10px 0";
    p.style.opacity = "0.9";

    const t = document.createElement("textarea");
    t.value = textStr;
    t.readOnly = true;
    t.style.width = "100%";
    t.style.minHeight = "180px";
    t.style.borderRadius = "12px";
    t.style.padding = "12px";
    t.style.background = "#0b0a08";
    t.style.color = "#f6efe6";
    t.style.border = "1px solid rgba(255,255,255,.12)";
    t.style.resize = "vertical";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.marginTop = "10px";
    row.style.justifyContent = "flex-end";

    const btn = (label) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.padding = "10px 12px";
      b.style.borderRadius = "12px";
      b.style.border = "1px solid rgba(255,255,255,.14)";
      b.style.background = "#1c1712";
      b.style.color = "#f6efe6";
      b.style.cursor = "pointer";
      return b;
    };

    const bSelect = btn("Seleccionar todo");
    bSelect.addEventListener("click", () => {
      try { t.focus({ preventScroll: true }); } catch { t.focus(); }
      t.select();
    });

    const bClose = btn("Cerrar");
    bClose.addEventListener("click", () => overlay.remove());

    row.appendChild(bSelect);
    row.appendChild(bClose);

    box.appendChild(p);
    box.appendChild(t);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(() => {
      try { t.focus({ preventScroll: true }); } catch { t.focus(); }
      t.select();
    }, 30);
  }

  if (!modal || !ta) {
    openOverlay();
    return;
  }

  ta.value = textStr;

  if (typeof modal.showModal === "function") {
    try { modal.showModal(); } catch { /* ignore */ }
    setTimeout(() => {
      try { ta.focus({ preventScroll: true }); } catch { ta.focus(); }
      ta.select();
      try { ta.setSelectionRange(0, ta.value.length); } catch { /* ignore */ }
    }, 50);
  } else {
    openOverlay();
  }
}

function setupCopyFallbackModal() {
  const btnSelect = byId("copy-fallback-select");
  const btnCopy = byId("copy-fallback-copy");
  const btnDl = byId("copy-fallback-download");
  const ta = byId("copy-fallback-text");
  const note = byId("copy-fallback-note");

  if (!ta) return;

  function selectAll() {
    try { ta.focus({ preventScroll: true }); } catch { ta.focus(); }
    ta.select();
  }

  if (btnSelect) btnSelect.addEventListener("click", selectAll);

  if (btnCopy) {
    btnCopy.addEventListener("click", async () => {
      const ok = await copyText(ta.value);
      if (note) {
        note.textContent = ok
          ? "✅ Copiado al portapapeles."
          : "⚠️ El navegador no permite copiar en HTTP. Pulsa Ctrl+C (o ⌘C) con el texto seleccionado.";
      }
      if (!ok) selectAll();
    });
  }

  if (btnDl) {
    btnDl.addEventListener("click", () => {
      try {
        const blob = new Blob([String(ta.value ?? "")], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aguila_copia.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        if (note) note.textContent = "✅ Descargado: aguila_copia.txt";
      } catch {
        if (note) note.textContent = "⚠️ No se pudo descargar. Pulsa Ctrl+C (o ⌘C) para copiar.";
        selectAll();
      }
    });
  }
}

function showAccessModal({ sectionLabel, requiredPassword }) {
  const dlg = byId("access-modal");
  const titleEl = byId("access-title");
  const input = byId("access-pass");
  const errEl = byId("access-error");
  const btnEnter = byId("access-enter");
  const btnCancel = byId("access-cancel");
  const btnToggle = byId("access-toggle");

  if (!dlg || !titleEl || !input || !errEl || !btnEnter || !btnCancel || !btnToggle) {
    const pass = window.prompt("Introduce la contrasena:");
    return Promise.resolve(pass === requiredPassword);
  }

  titleEl.textContent = sectionLabel ? `Acceso: ${sectionLabel}` : "Acceso restringido";
  errEl.textContent = "";
  input.value = "";
  input.type = "password";
  btnToggle.textContent = "Mostrar";

  return new Promise((resolve) => {
    const onOk = () => {
      const pass = String(input.value || "");
      if (pass !== String(requiredPassword || "")) {
        errEl.textContent = "Contrasena incorrecta.";
        input.focus();
        input.select();
        return;
      }
      dlg.close("ok");
    };

    const onCancel = () => dlg.close("cancel");

    const onToggle = () => {
      if (input.type === "password") {
        input.type = "text";
        btnToggle.textContent = "Ocultar";
      } else {
        input.type = "password";
        btnToggle.textContent = "Mostrar";
      }
      input.focus();
    };

    const onKey = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        onOk();
      }
    };

    const onClose = () => {
      const ok = dlg.returnValue === "ok";
      cleanup();
      resolve(ok);
    };

    const cleanup = () => {
      btnEnter.removeEventListener("click", onOk);
      btnCancel.removeEventListener("click", onCancel);
      btnToggle.removeEventListener("click", onToggle);
      input.removeEventListener("keydown", onKey);
      dlg.removeEventListener("close", onClose);
    };

    btnEnter.addEventListener("click", onOk);
    btnCancel.addEventListener("click", onCancel);
    btnToggle.addEventListener("click", onToggle);
    input.addEventListener("keydown", onKey);
    dlg.addEventListener("close", onClose);

    dlg.showModal();
    setTimeout(() => input.focus(), 50);
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  const unlocked = new Set();

  const openTab = (tab) => {
    tabs.forEach((t) => t.classList.remove("is-active"));
    panels.forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    byId(tab.dataset.tabTarget).classList.add("is-active");
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const target = tab.dataset.tabTarget;
      const required = ACCESS_PASSWORDS[target];
      if (required && !unlocked.has(target)) {
        const ok = await showAccessModal({
          sectionLabel: tab.textContent?.trim() || "Acceso restringido",
          requiredPassword: required,
        });
        if (!ok) return;
        unlocked.add(target);
      }
      openTab(tab);
    });
  });
}

// ============================================================================
// Catalogo: gamas de vehiculos, piezas de tuning, servicios y rangos
// ============================================================================

const PRODUCT_CATEGORIES = [
  { key: "motos", label: "Motos" },
  { key: "gama_baja", label: "Gama Baja" },
  { key: "gama_media", label: "Gama Media" },
  { key: "gama_alta", label: "Gama Alta" },
  { key: "gama_vip", label: "Gama VIP" },
  { key: "aereos", label: "Aéreos" },
  { key: "full_tuning", label: "Full Tuning" },
  { key: "servicios_taller", label: "Servicios (Taller)" },
  { key: "servicios_grua", label: "Servicios (Grúa)" },
  { key: "camaleonica", label: "Camaleónica" },
  { key: "nitro", label: "Nitro" },
  { key: "neones", label: "Neones RGB" },
  { key: "compraventa", label: "Compraventa" },
  { key: "otros", label: "Otros" },
];

function categoryLabel(key) {
  return PRODUCT_CATEGORIES.find((c) => c.key === key)?.label || "Otros";
}

// Piezas de tuning, en el mismo orden que las columnas de precio de cada gama.
const TUNING_PIECES = [
  "Pintura",
  "Neones",
  "Cambio de Luces",
  "Ruedas",
  "Humo de Ruedas",
  "Carrocería",
  "Claxon",
  "Tintado de Lunas",
  "Turbo",
  "Motor",
  "Transmisión",
  "Blindaje",
  "Suspensión",
  "Frenos",
  "Full Tuning",
];

const GAMAS = [
  { key: "motos", label: "Motos" },
  { key: "gama_baja", label: "Gama Baja" },
  { key: "gama_media", label: "Gama Media" },
  { key: "gama_alta", label: "Gama Alta" },
  { key: "gama_vip", label: "Gama VIP" },
  { key: "aereos", label: "Aéreos" },
];

// Precio de cada pieza (mismo orden que TUNING_PIECES) por gama.
const TUNING_PRICES = {
  motos:      [800, 800, 800, 800, 800, 650, 800, 800, 900, 900, 900, 900, 900, 900, 10000],
  gama_baja:  [600, 600, 600, 600, 600, 450, 600, 600, 700, 700, 700, 700, 700, 700, 10000],
  gama_media: [950, 950, 950, 950, 950, 750, 950, 950, 1100, 1100, 1100, 1100, 1100, 1100, 20000],
  gama_alta:  [1550, 1550, 1550, 1550, 1550, 1150, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
  gama_vip:   [1550, 1550, 1550, 1550, 1550, 1150, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
  aereos:     [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 10000, 10000, 10000, 10000, 10000, 10000, 50000],
};

function buildTuningProducts() {
  const out = [];
  for (const gama of GAMAS) {
    const prices = TUNING_PRICES[gama.key];
    TUNING_PIECES.forEach((piece, i) => {
      // El Full Tuning de todas las gamas va junto en su propia pestaña.
      const category = piece === "Full Tuning" ? "full_tuning" : gama.key;
      out.push({ name: `${piece} (${gama.label})`, price: prices[i], category });
    });
  }
  return out;
}

const SERVICE_PRODUCTS = [
  // Servicios dentro del taller
  { name: "Kit de Reparación (Taller)", price: 800, category: "servicios_taller" },
  { name: "Bayetas (Taller)", price: 400, category: "servicios_taller" },
  { name: "Limpieza (Taller)", price: 400, category: "servicios_taller" },
  { name: "Reparación (Taller)", price: 800, category: "servicios_taller" },
  { name: "Reparación + Limpieza (Taller)", price: 1000, category: "servicios_taller" },
  { name: "Reparación + Repostaje (Taller)", price: 1200, category: "servicios_taller" },
  { name: "Reparación + Limpieza + Repostaje (Taller)", price: 1250, category: "servicios_taller" },
  { name: "Repostaje (Taller)", price: 300, category: "servicios_taller" },
  { name: "Kit de Desvuelco (Taller)", price: 1500, category: "servicios_taller" },
  { name: "Rueda (Taller)", price: 500, category: "servicios_taller" },

  // Servicios fuera del taller (grua)
  { name: "Kit de Reparación (Grúa)", price: 800, category: "servicios_grua" },
  { name: "Bayetas o Limpieza (Grúa)", price: 400, category: "servicios_grua" },
  { name: "Reparación (Grúa)", price: 800, category: "servicios_grua" },
  { name: "Reparación + Limpieza (Grúa)", price: 1100, category: "servicios_grua" },
  { name: "Reparación + Repostaje (Grúa)", price: 1300, category: "servicios_grua" },
  { name: "Reparación + Limpieza + Repostaje (Grúa)", price: 1350, category: "servicios_grua" },
  { name: "Repostaje (Grúa)", price: 350, category: "servicios_grua" },
  { name: "Kit de Desvuelco (Grúa)", price: 1500, category: "servicios_grua" },
  { name: "Rueda (Grúa)", price: 500, category: "servicios_grua" },
  { name: "Servicio de Grúa (desplazamiento)", price: 500, category: "servicios_grua" },

  // Pintura camaleonica
  { name: "Pintura Camaleónica (primera vez)", price: 20000, category: "camaleonica" },
  { name: "Cambio de Color Camaleónico", price: 5000, category: "camaleonica" },
  { name: "Cambio de Color Camaleónico (Aéreos)", price: 10000, category: "camaleonica" },

  // Nitro (venta restringida, revisar al cliente)
  { name: "Instalación de Nitro ⚠", price: 35000, category: "nitro" },
  { name: "Botella de Nitro", price: 2000, category: "nitro" },

  // Neones RGB
  { name: "Instalación de Neones RGB", price: 10000, category: "neones" },
  { name: "Mando de Neones RGB", price: 2000, category: "neones" },

  // Compraventa (cambio de papeles)
  { name: "Compraventa Gama Baja", price: 2500, category: "compraventa" },
  { name: "Compraventa Gama Media", price: 5000, category: "compraventa" },
  { name: "Compraventa Gama Alta", price: 10000, category: "compraventa" },
];

const PRODUCTS = [...buildTuningProducts(), ...SERVICE_PRODUCTS];

const RANKS = [
  { label: "Chalán", pct: 0.40 },
  { label: "Mecánico", pct: 0.45 },
  { label: "Experimentado", pct: 0.50 },
  { label: "Subjefe", pct: 0.50 },
  { label: "Jefe", pct: 0.50 },
];

function pctForRank(rank) {
  const key = normalizeKeySimple(rank);
  const found = RANKS.find((r) => normalizeKeySimple(r.label) === key);
  return found ? found.pct : 0;
}

function fullName(e) {
  return `${String(e?.name || "").trim()} ${String(e?.surname || "").trim()}`.replace(/\s+/g, " ").trim();
}

// ============================================================================
// Productos gestionados desde la app ("Gestión de Productos")
// ============================================================================

const PRODUCT_ADMIN_PASSWORD = "DCAguilaMotors1992$";
const CUSTOM_PRODUCTS_STORAGE_KEY = "aguila_custom_products_v1";
// Ajustes sobre productos FIJOS (del codigo): precio/imagen personalizados y
// si esta oculto del catalogo. El nombre y la categoria de un fijo no cambian.
const PRODUCT_OVERRIDES_STORAGE_KEY = "aguila_product_overrides_v1";

function loadCustomProductsLocal() {
  try {
    const raw = localStorage.getItem(CUSTOM_PRODUCTS_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => ({
        id: String(p?.id || safeRandomId()),
        name: String(p?.name || "").trim(),
        price: Number(p?.price) || 0,
        image: String(p?.image || ""),
        category: String(p?.category || "otros").trim() || "otros",
      }))
      .filter((p) => p.name && p.image);
  } catch {
    return [];
  }
}

function saveCustomProductsLocal(list) {
  localStorage.setItem(CUSTOM_PRODUCTS_STORAGE_KEY, JSON.stringify(list || []));
}

function loadProductOverridesLocal() {
  try {
    const raw = localStorage.getItem(PRODUCT_OVERRIDES_STORAGE_KEY);
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveProductOverridesLocal(map) {
  localStorage.setItem(PRODUCT_OVERRIDES_STORAGE_KEY, JSON.stringify(map || {}));
}

function addCustomProduct(payload, password) {
  if (String(password || "") !== String(PRODUCT_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  current.push({ id: safeRandomId(), ...payload });
  saveCustomProductsLocal(current);
  return true;
}

function updateCustomProduct(id, payload, password) {
  if (String(password || "") !== String(PRODUCT_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  const idx = current.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) throw new Error("Producto no encontrado");
  current[idx] = { ...current[idx], ...payload, id: current[idx].id };
  saveCustomProductsLocal(current);
  return true;
}

function deleteCustomProduct(id, password) {
  if (String(password || "") !== String(PRODUCT_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  saveCustomProductsLocal(current.filter((p) => String(p.id) !== String(id)));
  return true;
}

function setFixedProductOverride(originalName, patch, password) {
  if (String(password || "") !== String(PRODUCT_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
  }
  const key = normalizeKeySimple(originalName);
  const overrides = loadProductOverridesLocal();
  overrides[key] = { ...(overrides[key] || {}), ...patch };
  saveProductOverridesLocal(overrides);
  return true;
}

function setFixedProductHidden(originalName, hidden, password) {
  setFixedProductOverride(originalName, { hidden: !!hidden }, password);
}

// Todos los productos disponibles en la Caja: los fijos visibles (con sus
// ajustes aplicados) + los agregados desde la app.
function getAllProducts() {
  const overrides = loadProductOverridesLocal();
  const fixedVisible = PRODUCTS.filter((p) => !overrides[normalizeKeySimple(p.name)]?.hidden).map((p) => {
    const ov = overrides[normalizeKeySimple(p.name)];
    if (!ov) return { name: p.name, price: p.price, image: p.image, category: p.category };
    return {
      name: p.name,
      price: ov.price != null ? Number(ov.price) : p.price,
      image: ov.image || p.image,
      category: p.category,
    };
  });
  const custom = loadCustomProductsLocal().map((p) => ({
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
  }));
  return [...fixedVisible, ...custom];
}

// Lista combinada para la tabla de "Editar / Quitar": incluye tambien los
// fijos ocultos (para poder restaurarlos) y trae el origen/id de cada fila.
function listProductsForAdmin() {
  const overrides = loadProductOverridesLocal();
  const fixed = PRODUCTS.map((p) => {
    const key = normalizeKeySimple(p.name);
    const ov = overrides[key] || {};
    return {
      source: "fixed",
      key,
      name: p.name,
      price: ov.price != null ? Number(ov.price) : p.price,
      image: ov.image || p.image,
      category: p.category,
      hidden: !!ov.hidden,
    };
  });
  const custom = loadCustomProductsLocal().map((p) => ({
    source: "custom",
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
    hidden: false,
  }));
  return [...fixed, ...custom];
}

// Genera un icono simple (iniciales + color) para productos sin imagen propia.
function generatePlaceholderIcon(name) {
  const label = String(name || "?")
    .replace(/[^\p{L}\s]/gu, " ")
    .trim();
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";

  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  const palette = ["#f97d02", "#c75e00", "#8a4b02", "#a1622f", "#914b02", "#7a3a00", "#d98a1f"];
  const color = palette[hash % palette.length];

  const size = 200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 28);
  ctx.fill();
  ctx.fillStyle = "#0e0b08";
  ctx.font = "bold 84px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, size / 2, size / 2 + 6);
  return canvas.toDataURL("image/png");
}

const _placeholderIconCache = new Map();
function getProductIcon(product) {
  if (product.image) return product.image;
  if (_placeholderIconCache.has(product.name)) return _placeholderIconCache.get(product.name);
  const icon = generatePlaceholderIcon(product.name);
  _placeholderIconCache.set(product.name, icon);
  return icon;
}

// ============================================================================
// Empleados
// ============================================================================

const ACCESS_PASSWORDS = {
  "tab-conta": "DCAguilaMotors1992$",
  "tab-almacen": "DCAguilaMotors1992$",
};

// El programa de escritorio (.exe) recibe su propia clave al guardar empleados.
// Se mantiene la antigua para que siga funcionando; la nueva se valida aqui.
const BACKEND_LEGACY_PASSWORD = "0000";

const EMPLOYEE_ADMIN_PASSWORD = ACCESS_PASSWORDS["tab-conta"];
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
  if (String(password || "") !== String(EMPLOYEE_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
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
  if (String(password || "") !== String(EMPLOYEE_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
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
  if (String(password || "") !== String(EMPLOYEE_ADMIN_PASSWORD || "")) {
    throw new Error("Contrasena incorrecta");
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

// ============================================================================
// Caja
// ============================================================================

function setupCaja() {
  const state = {
    cart: {},
    history: [],
    selected: null,
    activeCategory: null,
  };

  const productGrid = byId("product-grid");
  const catTabsEl = byId("cat-tabs");
  const catNoteEl = byId("cat-note");
  const ticketBody = byId("ticket-body");
  const ticketTotal = byId("ticket-total");

  function addItemDelta(name, price, delta) {
    const row = state.cart[name];
    if (!row) {
      if (delta > 0) state.cart[name] = { price, qty: delta };
      else return;
    } else {
      const next = row.qty + delta;
      if (next <= 0) delete state.cart[name];
      else row.qty = next;
    }
    state.history.push([name, delta]);
    renderTicket();
  }

  function renderTicket() {
    ticketBody.innerHTML = "";
    let total = 0;
    for (const [name, row] of Object.entries(state.cart)) {
      const tr = document.createElement("tr");
      if (state.selected === name) tr.classList.add("is-selected");
      tr.addEventListener("click", (ev) => {
        if (ev.target?.closest?.("input, button")) return;
        state.selected = name;
        renderTicket();
      });

      const qtyInput = document.createElement("input");
      qtyInput.className = "qty-input";
      qtyInput.type = "number";
      qtyInput.min = "0";
      qtyInput.step = "1";
      qtyInput.inputMode = "numeric";
      qtyInput.value = row.qty;
      qtyInput.addEventListener("click", (ev) => ev.stopPropagation());
      qtyInput.addEventListener("mousedown", (ev) => ev.stopPropagation());
      qtyInput.addEventListener(
        "wheel",
        (ev) => {
          ev.preventDefault();
        },
        { passive: false }
      );
      qtyInput.addEventListener("change", () => {
        const n = Math.floor(Number(qtyInput.value));
        if (!Number.isFinite(n) || n <= 0) delete state.cart[name];
        else state.cart[name].qty = n;
        renderTicket();
      });

      const trashBtn = document.createElement("button");
      trashBtn.type = "button";
      trashBtn.className = "trash-btn";
      trashBtn.setAttribute("aria-label", `Borrar ${name}`);
      trashBtn.innerHTML = "&#128465;";
      trashBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        delete state.cart[name];
        if (state.selected === name) state.selected = null;
        renderTicket();
      });

      const sub = row.price * row.qty;
      total += sub;
      tr.innerHTML = `
        <td>${name}</td>
        <td class="num"></td>
        <td class="num">${fmtMoney(row.price)}</td>
        <td class="num">${fmtMoney(sub)}</td>
        <td class="num"></td>
      `;
      tr.children[1].appendChild(qtyInput);
      tr.children[4].appendChild(trashBtn);
      ticketBody.appendChild(tr);
    }
    ticketTotal.textContent = fmtMoney(total);
  }

  function renderCategoryTabs(allProducts) {
    const present = new Set(allProducts.map((p) => p.category || "otros"));
    let cats = PRODUCT_CATEGORIES.filter((c) => present.has(c.key));
    if (!cats.length) cats = [{ key: "otros", label: "Otros" }];
    if (!state.activeCategory || !cats.some((c) => c.key === state.activeCategory)) {
      state.activeCategory = cats[0].key;
    }
    catTabsEl.innerHTML = "";
    for (const c of cats) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-tab" + (c.key === state.activeCategory ? " is-active" : "");
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        state.activeCategory = c.key;
        renderProductGrid();
      });
      catTabsEl.appendChild(btn);
    }
    if (catNoteEl) {
      catNoteEl.textContent =
        state.activeCategory === "nitro"
          ? "⚠ Venta restringida: verifica bien a quién se lo vendes."
          : "";
    }
  }

  function renderProductGrid() {
    const all = getAllProducts();
    renderCategoryTabs(all);
    const shown = all.filter((p) => (p.category || "otros") === state.activeCategory);

    productGrid.innerHTML = "";
    for (const product of shown) {
      const button = document.createElement("button");
      button.className = "product-btn";
      button.type = "button";
      button.innerHTML = `
        <img src="${getProductIcon(product)}" alt="${product.name}" />
        <strong>${product.name}</strong>
        <small>${fmtMoney(product.price)}</small>
      `;
      button.addEventListener("click", () => addItemDelta(product.name, product.price, +1));
      button.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        addItemDelta(product.name, product.price, -1);
      });
      productGrid.appendChild(button);
    }
  }
  renderProductGrid();

  byId("btn-undo").addEventListener("click", () => {
    const op = state.history.pop();
    if (!op) return;
    const [name, delta] = op;
    const item = state.cart[name];
    const price = getAllProducts().find((p) => p.name === name)?.price || 0;
    if (!item) {
      if (-delta > 0) state.cart[name] = { price, qty: -delta };
    } else {
      const next = item.qty - delta;
      if (next <= 0) delete state.cart[name];
      else item.qty = next;
    }
    renderTicket();
  });

  byId("btn-remove").addEventListener("click", () => {
    if (!state.selected) return;
    const price = getAllProducts().find((p) => p.name === state.selected)?.price || 0;
    addItemDelta(state.selected, price, -1);
  });

  byId("btn-clear").addEventListener("click", () => {
    state.cart = {};
    state.history = [];
    state.selected = null;
    renderTicket();
  });

  byId("btn-copy-total").addEventListener("click", async () => {
    const total = Object.values(state.cart).reduce((acc, r) => acc + r.price * r.qty, 0);
    const ok = await copyText(String(total));
    if (!ok) openCopyFallback(String(total));
  });

  byId("btn-copy-concept").addEventListener("click", async () => {
    const parts = [];
    const allProducts = getAllProducts();
    const inProducts = new Set(allProducts.map((p) => p.name));

    for (const p of allProducts) {
      const row = state.cart[p.name];
      if (row?.qty > 0) parts.push(`x${row.qty} ${p.name}`);
    }

    for (const [name, row] of Object.entries(state.cart)) {
      if (!inProducts.has(name) && row?.qty > 0) parts.push(`x${row.qty} ${name}`);
    }

    const concept = parts.join(" ").trim();
    if (!concept) {
      alert("El ticket esta vacio.");
      return;
    }
    const ok = await copyText(concept);
    if (!ok) openCopyFallback(concept);
  });

  setupProductsAdminModal(renderProductGrid);

  renderTicket();
}

function setupProductsAdminModal(onProductsChanged) {
  const btnOpen = byId("btn-add-product");
  const dlg = byId("add-product-modal");
  if (!btnOpen || !dlg) return;

  const nameEl = byId("prod-new-name");
  const priceEl = byId("prod-new-price");
  const categoryEl = byId("prod-new-category");
  const imageEl = byId("prod-new-image");
  const imageHintEl = byId("prod-new-image-hint");
  const previewWrap = byId("prod-new-preview");
  const previewImg = byId("prod-new-preview-img");
  const errorEl = byId("prod-new-error");
  const saveBtn = byId("prod-new-save");
  const cancelEditBtn = byId("prod-new-cancel-edit");
  const searchEl = byId("prod-search");
  const adminBody = byId("prod-admin-body");

  const subtabButtons = dlg.querySelectorAll(".subtab");
  const subtabPanels = dlg.querySelectorAll(".subtab-panel");

  if (categoryEl && !categoryEl.dataset.filled) {
    categoryEl.dataset.filled = "1";
    for (const c of PRODUCT_CATEGORIES) {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = c.label;
      categoryEl.appendChild(opt);
    }
    categoryEl.value = "otros";
  }

  let pendingImageDataUrl = "";
  let currentEditingImage = "";
  let editingTarget = null; // { source: "custom", id } | { source: "fixed", key, originalName }

  function switchSubtab(target) {
    subtabButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.subtabTarget === target));
    subtabPanels.forEach((p) => p.classList.toggle("is-active", p.id === target));
  }
  subtabButtons.forEach((b) => b.addEventListener("click", () => switchSubtab(b.dataset.subtabTarget)));

  function resetForm() {
    if (nameEl) {
      nameEl.value = "";
      nameEl.disabled = false;
    }
    if (priceEl) priceEl.value = "";
    if (categoryEl) {
      categoryEl.value = "otros";
      categoryEl.disabled = false;
    }
    if (imageEl) imageEl.value = "";
    if (errorEl) errorEl.textContent = "";
    if (imageHintEl) imageHintEl.textContent = "Si no subes una imagen, se genera un icono simple automaticamente.";
    pendingImageDataUrl = "";
    if (previewWrap) previewWrap.style.display = "none";
    if (previewImg) previewImg.src = "";
  }

  function exitEditMode() {
    editingTarget = null;
    currentEditingImage = "";
    if (saveBtn) saveBtn.textContent = "Guardar producto";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    resetForm();
  }

  function enterEditMode(row) {
    editingTarget =
      row.source === "custom" ? { source: "custom", id: row.id } : { source: "fixed", key: row.key, originalName: row.name };
    currentEditingImage = row.image || "";
    if (nameEl) {
      nameEl.value = row.name;
      nameEl.disabled = row.source === "fixed";
    }
    if (priceEl) priceEl.value = row.price;
    if (categoryEl) {
      categoryEl.value = row.category || "otros";
      categoryEl.disabled = row.source === "fixed";
    }
    if (imageEl) imageEl.value = "";
    pendingImageDataUrl = "";
    if (previewImg) previewImg.src = currentEditingImage;
    if (previewWrap) previewWrap.style.display = currentEditingImage ? "" : "none";
    if (errorEl) errorEl.textContent = "";
    if (imageHintEl) {
      imageHintEl.textContent =
        row.source === "fixed"
          ? "Sube una imagen solo si quieres reemplazar el icono original."
          : "Sube una imagen solo si quieres cambiarla (si no, se mantiene la actual).";
    }
    if (saveBtn) saveBtn.textContent = "Actualizar producto";
    if (cancelEditBtn) cancelEditBtn.style.display = "";
    switchSubtab("prod-tab-add");
    setTimeout(() => (nameEl?.disabled ? priceEl : nameEl)?.focus(), 50);
  }

  function isDuplicateName(name, target) {
    const wanted = normalizeKeySimple(name);
    return listProductsForAdmin().some((row) => {
      if (target?.source === "custom" && row.source === "custom" && String(row.id) === String(target.id)) return false;
      if (target?.source === "fixed" && row.source === "fixed" && row.key === target.key) return false;
      return normalizeKeySimple(row.name) === wanted;
    });
  }

  function renderAdminTable() {
    if (!adminBody) return;
    const q = normalizeKeySimple(String(searchEl?.value || ""));
    adminBody.innerHTML = "";
    const rows = listProductsForAdmin().filter((r) => !q || normalizeKeySimple(r.name).includes(q));

    for (const row of rows) {
      const tr = document.createElement("tr");

      const tdImg = document.createElement("td");
      const img = document.createElement("img");
      img.className = "prod-thumb";
      img.src = row.image || generatePlaceholderIcon(row.name);
      img.alt = row.name;
      tdImg.appendChild(img);

      const tdName = document.createElement("td");
      tdName.textContent = row.name;

      const tdPrice = document.createElement("td");
      tdPrice.className = "num";
      tdPrice.textContent = fmtMoney(row.price);

      const tdCategory = document.createElement("td");
      tdCategory.textContent = categoryLabel(row.category);

      const tdOrigin = document.createElement("td");
      const pill = document.createElement("span");
      if (row.hidden) {
        pill.className = "tag-pill tag-oculto";
        pill.textContent = "Oculto";
      } else if (row.source === "fixed") {
        pill.className = "tag-pill tag-fijo";
        pill.textContent = "Fijo";
      } else {
        pill.className = "tag-pill tag-agregado";
        pill.textContent = "Agregado";
      }
      tdOrigin.appendChild(pill);

      const tdActions = document.createElement("td");
      tdActions.className = "num";

      if (row.hidden) {
        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.textContent = "Restaurar";
        restoreBtn.addEventListener("click", () => {
          setFixedProductHidden(row.name, false, PRODUCT_ADMIN_PASSWORD);
          renderAdminTable();
          onProductsChanged?.();
        });
        tdActions.appendChild(restoreBtn);
      } else {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Editar";
        editBtn.addEventListener("click", () => enterEditMode(row));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "danger";
        delBtn.style.marginLeft = "6px";
        delBtn.textContent = row.source === "fixed" ? "Ocultar" : "Quitar";
        delBtn.addEventListener("click", () => {
          const action = row.source === "fixed" ? "ocultar" : "quitar";
          if (!window.confirm(`¿Seguro que quieres ${action} "${row.name}"?`)) return;
          try {
            if (row.source === "fixed") setFixedProductHidden(row.name, true, PRODUCT_ADMIN_PASSWORD);
            else deleteCustomProduct(row.id, PRODUCT_ADMIN_PASSWORD);
          } catch (e) {
            alert(String(e?.message || e));
            return;
          }
          const editingThisRow =
            editingTarget &&
            ((editingTarget.source === "custom" && String(editingTarget.id) === String(row.id)) ||
              (editingTarget.source === "fixed" && editingTarget.key === row.key));
          if (editingThisRow) exitEditMode();
          renderAdminTable();
          onProductsChanged?.();
        });

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);
      }

      tr.append(tdImg, tdName, tdPrice, tdCategory, tdOrigin, tdActions);
      adminBody.appendChild(tr);
    }
  }

  searchEl?.addEventListener("input", renderAdminTable);

  imageEl?.addEventListener("change", () => {
    const file = imageEl.files?.[0];
    if (!file) {
      pendingImageDataUrl = "";
      if (previewWrap) previewWrap.style.display = editingTarget && currentEditingImage ? "" : "none";
      if (previewImg && editingTarget) previewImg.src = currentEditingImage;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingImageDataUrl = String(reader.result || "");
      if (previewImg) previewImg.src = pendingImageDataUrl;
      if (previewWrap) previewWrap.style.display = "";
    };
    reader.readAsDataURL(file);
  });

  cancelEditBtn?.addEventListener("click", () => exitEditMode());

  btnOpen.addEventListener("click", async () => {
    const ok = await showAccessModal({
      sectionLabel: "Gestión de Productos",
      requiredPassword: PRODUCT_ADMIN_PASSWORD,
    });
    if (!ok) return;
    exitEditMode();
    switchSubtab("prod-tab-add");
    renderAdminTable();
    dlg.showModal();
    setTimeout(() => nameEl?.focus(), 50);
  });

  saveBtn?.addEventListener("click", () => {
    const name = String(nameEl?.value || "").trim();
    const price = Number(priceEl?.value);
    const category = String(categoryEl?.value || "otros");

    if (!name) {
      if (errorEl) errorEl.textContent = "Ponle un nombre al producto.";
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      if (errorEl) errorEl.textContent = "El precio no es valido.";
      return;
    }
    if (isDuplicateName(name, editingTarget)) {
      if (errorEl) errorEl.textContent = "Ya existe un producto con ese nombre.";
      return;
    }

    try {
      if (!editingTarget) {
        const image = pendingImageDataUrl || generatePlaceholderIcon(name);
        addCustomProduct({ name, price, image, category }, PRODUCT_ADMIN_PASSWORD);
      } else if (editingTarget.source === "custom") {
        const image = pendingImageDataUrl || currentEditingImage;
        updateCustomProduct(editingTarget.id, { name, price, image, category }, PRODUCT_ADMIN_PASSWORD);
      } else {
        const patch = { price };
        if (pendingImageDataUrl) patch.image = pendingImageDataUrl;
        setFixedProductOverride(editingTarget.originalName, patch, PRODUCT_ADMIN_PASSWORD);
      }
    } catch (e) {
      if (errorEl) errorEl.textContent = String(e?.message || e);
      return;
    }

    const wasEditing = !!editingTarget;
    exitEditMode();
    onProductsChanged?.();
    renderAdminTable();
    if (wasEditing) switchSubtab("prod-tab-edit");
  });
}

// ============================================================================
// Procesado del texto de Discord: Facturas (Datafono TPV) y Venta de Kits
// ============================================================================

// Formato viejo "Sistema de Facturas" (Nueva Factura / Factura Pagada)
const RE_NEW = /^\s*Nueva\s+Factura\s*$/i;
const RE_PAID = /^\s*Factura\s+Pagada\s*$/i;
const RE_ID = /^\s*ID\s*Factura:\s*`?(\d+)`?\s*$/i;
const RE_ISSUER = /^\s*Emitida\s*por:\s*(.+?)\s*$/i;
const RE_TO = /^\s*Para:\s*(.+?)\s*$/i;
const RE_AMOUNT = /^\s*Cantidad:\s*\$?\s*`?([\d.,]+)`?\s*$/i;
const RE_CONCEPT = /^\s*Concepto:\s*(.+?)\s*$/i;
const RE_TS = /^\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/i;
const RE_IGNORE = /^(Haz clic para reaccionar|Anadir reaccion|Añadir reaccion|Responder|Reenviar|Mas|Más|:\w+:)$/i;

// Formato nuevo: Datafono TPV. El bloque se abre con la linea de importe
// ("1€", "2.500€", etc.) porque la cabecera "Datáfono TPVAPP — HH:MM" suele
// llegar partida en varias lineas cuando se copia de verdad desde Discord.
const RE_DTF_AMOUNT = /^\s*`?([\d.,]+)`?\s*€\s*$/;
const RE_DTF_COMERCIO = /^\s*Comercio:\s*(.+?)\s*$/i;
const RE_DTF_COBRADOR = /^\s*Cobrador:\s*(.+?)\s*(?:\(ID:\s*\d+\))?\s*$/i;
const RE_DTF_CLIENTE = /^\s*Cliente:\s*(.+?)\s*(?:\(ID:\s*\d+\))?\s*$/i;
const RE_DTF_AUT = /^\s*AUT:\s*([^\s•]+)\s*•\s*TARJETA:\s*(.+?)\s*•\s*Dat[áa]fono\s*TPV\s*•\s*(.+?)\s*$/i;

// Venta de Kits: "Venta de kits" es la linea fija que abre el bloque (la
// cabecera con el nombre del bot y la hora no se usa, por la misma razon
// de arriba). Solo interesa Vendedor y Cantidad.
const RE_KITS = /^\s*Venta\s+de\s+kits\s*$/i;
const RE_SELLER = /^\s*Vendedor:\s*(.+?)\s*$/i;
const RE_BUYER = /^\s*Comprador:\s*(.+?)\s*$/i;
const RE_KITS_QTY = /^\s*Cantidad:\s*`?(\d+)`?\s*$/i;

function processText(rawText) {
  const lines = rawText.split(/\r?\n/);
  const invoices = {};
  const kitsSales = [];
  let currentKind = null; // "sent" | "paid" | "datafono" | "kits"
  let current = {};
  let dtfSeq = 0;
  let ignoredOtherBusiness = 0;

  const flushBlock = () => {
    if (!currentKind) return;

    if (currentKind === "kits") {
      if (current.qty != null) {
        kitsSales.push({
          seller: current.seller || null,
          buyer: current.buyer || null,
          qty: current.qty,
          ts: current.timestamp || null,
        });
      }
      currentKind = null;
      current = {};
      return;
    }

    if (currentKind === "datafono") {
      if (current.amount == null) {
        currentKind = null;
        current = {};
        return;
      }
      // Si el recibo trae "Comercio:" y no es Aguila Motors, se ignora
      // (por si algun dia se pega un log con varios negocios mezclados).
      if (current.comercio && !normalizeKeySimple(current.comercio).includes("aguila")) {
        ignoredOtherBusiness++;
        currentKind = null;
        current = {};
        return;
      }
      const key = current.aut ? `AUT-${current.aut}` : `DTF-${++dtfSeq}`;
      invoices[key] = {
        invoice_id: current.aut || key,
        issuer: current.issuer || null,
        recipient: current.recipient || null,
        concept: current.concept || null,
        amount: current.amount,
        sent_at: current.timestampText || null,
        // El datafono cobra al instante: se considera pagada siempre que tenga importe.
        paid_at: current.timestampText || "OK",
        method: "datafono",
        card: current.card || null,
        comercio: current.comercio || null,
      };
      currentKind = null;
      current = {};
      return;
    }

    if (current.invoice_id == null) {
      currentKind = null;
      current = {};
      return;
    }
    const invId = Number(current.invoice_id);
    if (!invoices[invId]) {
      invoices[invId] = {
        invoice_id: invId,
        issuer: null,
        recipient: null,
        concept: null,
        amount: null,
        sent_at: null,
        paid_at: null,
        method: "facturas",
      };
    }
    const row = invoices[invId];
    if (currentKind === "sent") {
      if (current.issuer) row.issuer = current.issuer;
      if (current.recipient) row.recipient = current.recipient;
      if (current.concept) row.concept = current.concept;
      if (current.amount != null) row.amount = current.amount;
      if (current.timestamp) row.sent_at = current.timestamp;
    } else {
      if (current.concept) row.concept = current.concept;
      if (current.amount != null) row.amount = current.amount;
      if (current.timestamp) row.paid_at = current.timestamp;
    }
    currentKind = null;
    current = {};
  };

  for (let line of lines) {
    line = line.trim();
    if (!line || RE_IGNORE.test(line)) continue;

    if (RE_DTF_AMOUNT.test(line)) {
      flushBlock();
      const m = RE_DTF_AMOUNT.exec(line);
      currentKind = "datafono";
      current = { amount: parseMoney(m[1]) };
      continue;
    }
    if (RE_KITS.test(line)) {
      flushBlock();
      currentKind = "kits";
      current = {};
      continue;
    }
    if (RE_NEW.test(line)) {
      flushBlock();
      currentKind = "sent";
      current = {};
      continue;
    }
    if (RE_PAID.test(line)) {
      flushBlock();
      currentKind = "paid";
      current = {};
      continue;
    }

    if (currentKind === "datafono") {
      let m = RE_CONCEPT.exec(line);
      if (m) { current.concept = stripWrap(m[1]); continue; }
      m = RE_DTF_COMERCIO.exec(line);
      if (m) { current.comercio = stripWrap(m[1]); continue; }
      m = RE_DTF_COBRADOR.exec(line);
      if (m) { current.issuer = stripWrap(m[1]); continue; }
      m = RE_DTF_CLIENTE.exec(line);
      if (m) { current.recipient = stripWrap(m[1]); continue; }
      m = RE_DTF_AUT.exec(line);
      if (m) {
        current.aut = stripWrap(m[1]);
        current.card = stripWrap(m[2]);
        current.timestampText = stripWrap(m[3]);
      }
      continue;
    }

    if (currentKind === "kits") {
      let m = RE_SELLER.exec(line);
      if (m) { current.seller = stripWrap(m[1]).split("(")[0].trim(); continue; }
      m = RE_BUYER.exec(line);
      if (m) { current.buyer = stripWrap(m[1]).split("(")[0].trim(); continue; }
      m = RE_KITS_QTY.exec(line);
      if (m) { current.qty = Number(m[1]); continue; }
      m = RE_TS.exec(line);
      if (m) { current.timestamp = m[1]; }
      continue;
    }

    if (currentKind) {
      let m = RE_ID.exec(line);
      if (m) { current.invoice_id = Number(m[1]); continue; }
      m = RE_ISSUER.exec(line);
      if (m) { current.issuer = stripWrap(m[1]); continue; }
      m = RE_TO.exec(line);
      if (m) { current.recipient = stripWrap(m[1]); continue; }
      m = RE_AMOUNT.exec(line);
      if (m) { current.amount = parseMoney(m[1]); continue; }
      m = RE_CONCEPT.exec(line);
      if (m) { current.concept = stripWrap(m[1]); continue; }
      m = RE_TS.exec(line);
      if (m) { current.timestamp = m[1]; }
      continue;
    }
  }
  flushBlock();

  const invValues = Object.values(invoices);
  const invSummary = {
    count: invValues.length,
    total: invValues.reduce((a, v) => a + (v.amount || 0), 0),
    paid_count: invValues.filter((v) => v.paid_at).length,
    paid_total: invValues.filter((v) => v.paid_at).reduce((a, v) => a + (v.amount || 0), 0),
    pending_count: invValues.filter((v) => !v.paid_at).length,
    pending_total: invValues.filter((v) => !v.paid_at).reduce((a, v) => a + (v.amount || 0), 0),
  };

  const invByIssuer = {};
  const invByIssuerPaid = {};
  const invByIssuerPending = {};
  for (const inv of invValues) {
    if (!inv.issuer || inv.amount == null) continue;
    invByIssuer[inv.issuer] = (invByIssuer[inv.issuer] || 0) + inv.amount;
    if (inv.paid_at) invByIssuerPaid[inv.issuer] = (invByIssuerPaid[inv.issuer] || 0) + inv.amount;
    else invByIssuerPending[inv.issuer] = (invByIssuerPending[inv.issuer] || 0) + inv.amount;
  }

  const kitsSummary = {
    count: kitsSales.length,
    qty: kitsSales.reduce((a, s) => a + (s.qty || 0), 0),
  };
  const kitsBySeller = {};
  for (const s of kitsSales) {
    if (!s.seller) continue;
    kitsBySeller[s.seller] = (kitsBySeller[s.seller] || 0) + (s.qty || 0);
  }

  return {
    invoices,
    invSummary,
    invByIssuer,
    invByIssuerPaid,
    invByIssuerPending,
    kitsSales,
    kitsSummary,
    kitsBySeller,
    ignoredOtherBusiness,
  };
}

// ============================================================================
// Facturas / Kits
// ============================================================================

const KIT_PRICE_STORAGE_KEY = "aguila_kit_price_v1";
function getKitPrice() {
  const raw = Number(localStorage.getItem(KIT_PRICE_STORAGE_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 800;
}
function setKitPrice(v) {
  const n = Number(v);
  localStorage.setItem(KIT_PRICE_STORAGE_KEY, String(Number.isFinite(n) && n >= 0 ? n : 800));
}

function setupContabilidad() {
  const state = {
    invoices: {},
    kitsSales: [],
    invByIssuer: {},
    invByIssuerPaid: {},
    invByIssuerPending: {},
    kitsBySeller: {},
    ignoredOtherBusiness: 0,
  };

  const refs = {
    input: byId("conta-input"),
    invLine1: byId("inv-line1"),
    kitsLine1: byId("kits-line1"),
    kitsLine2: byId("kits-line2"),
    kitsLine3: byId("kits-line3"),
    kitPrice: byId("kit-price"),
    loaded: byId("conta-loaded"),
    invTable: byId("inv-table"),
    salesTable: byId("sales-table"),
    totalGeneral: byId("conta-total-general"),
    totalAPagar: byId("conta-total-a-pagar"),
    footer: byId("conta-footer"),
  };

  if (refs.kitPrice) refs.kitPrice.value = getKitPrice();

  async function refresh() {
    const invSummary = {
      count: Object.keys(state.invoices).length,
      total: Object.values(state.invoices).reduce((a, v) => a + (v.amount || 0), 0),
      paid_count: Object.values(state.invoices).filter((v) => v.paid_at).length,
      paid_total: Object.values(state.invoices).filter((v) => v.paid_at).reduce((a, v) => a + (v.amount || 0), 0),
      pending_count: Object.values(state.invoices).filter((v) => !v.paid_at).length,
      pending_total: Object.values(state.invoices).filter((v) => !v.paid_at).reduce((a, v) => a + (v.amount || 0), 0),
    };
    const kitPrice = getKitPrice();
    const kitsQty = state.kitsSales.reduce((a, s) => a + (s.qty || 0), 0);
    const kitsSummary = { count: state.kitsSales.length, qty: kitsQty, total: kitsQty * kitPrice };

    refs.invLine1.textContent = `Total: ${invSummary.count} | ${fmtMoney(invSummary.total)}`;
    refs.kitsLine1.textContent = `Ventas: ${kitsSummary.count}`;
    refs.kitsLine2.textContent = `Unidades: ${kitsSummary.qty}`;
    refs.kitsLine3.textContent = `Total: ${fmtMoney(kitsSummary.total)}`;

    refs.invTable.innerHTML = "";
    const invEntries = Object.entries(state.invByIssuer).sort(sortByValueDescThenName);
    let employees = [];
    try {
      employees = await listEmployees();
    } catch {
      employees = [];
    }
    const rankByName = new Map();
    for (const e of employees) {
      rankByName.set(normalizeKeySimple(fullName(e)), e.rank || "");
    }
    let totalAPagar = 0;
    for (const [name, total] of invEntries) {
      const rank = rankByName.get(normalizeKeySimple(name)) || "";
      const pct = pctForRank(rank);
      const pendientePago = Math.round(total * pct);
      totalAPagar += pendientePago;
      const pctText = rank ? (pct ? `${Math.round(pct * 100)}%` : "0% (sin rango)") : "Sin registrar";
      refs.invTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${name}</td>
          <td class="num">${fmtMoney(total)}</td>
          <td class="num">${pctText}</td>
          <td class="num">${fmtMoney(pendientePago)}</td>
        </tr>`
      );
    }

    refs.salesTable.innerHTML = "";
    const kitEntries = Object.entries(state.kitsBySeller).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    for (const [name, qty] of kitEntries) {
      const rank = rankByName.get(normalizeKeySimple(name)) || "";
      const pct = pctForRank(rank);
      const kitsValue = qty * kitPrice;
      const pendientePago = Math.round(kitsValue * pct);
      totalAPagar += pendientePago;
      const pctText = rank ? (pct ? `${Math.round(pct * 100)}%` : "0% (sin rango)") : "Sin registrar";
      refs.salesTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${name}</td>
          <td class="num">${qty}</td>
          <td class="num">${pctText}</td>
          <td class="num">${fmtMoney(pendientePago)}</td>
        </tr>`
      );
    }

    const totalGeneral = invSummary.total + kitsSummary.total;
    refs.totalGeneral.textContent = fmtMoney(totalGeneral);
    if (refs.totalAPagar) refs.totalAPagar.textContent = fmtMoney(totalAPagar);
    let footerText = `Facturas: ${invSummary.count} | Kits: ${kitsSummary.count} | Total: ${fmtMoney(totalGeneral)}`;
    if (state.ignoredOtherBusiness > 0) {
      footerText += ` | Ignorados (otro comercio): ${state.ignoredOtherBusiness}`;
    }
    refs.footer.textContent = footerText;
    refs.loaded.textContent = invSummary.count || kitsSummary.count ? "Datos cargados" : "Sin datos";
  }

  function clearState() {
    state.invoices = {};
    state.kitsSales = [];
    state.invByIssuer = {};
    state.invByIssuerPaid = {};
    state.invByIssuerPending = {};
    state.kitsBySeller = {};
    state.ignoredOtherBusiness = 0;
    refresh();
  }

  async function processCurrent() {
    const text = refs.input.value.trim();
    if (!text) {
      alert("Pega el texto antes de procesar.");
      return;
    }
    const out = processText(text);
    state.invoices = out.invoices;
    state.kitsSales = out.kitsSales;
    state.invByIssuer = out.invByIssuer;
    state.invByIssuerPaid = out.invByIssuerPaid;
    state.invByIssuerPending = out.invByIssuerPending;
    state.kitsBySeller = out.kitsBySeller;
    state.ignoredOtherBusiness = out.ignoredOtherBusiness || 0;
    refresh();
  }

  byId("conta-process").addEventListener("click", processCurrent);
  byId("conta-clear").addEventListener("click", () => {
    refs.input.value = "";
    clearState();
  });
  refs.kitPrice?.addEventListener("change", () => {
    setKitPrice(refs.kitPrice.value);
    refs.kitPrice.value = getKitPrice();
    refresh();
  });
  byId("conta-paste").addEventListener("click", async () => {
    try {
      refs.input.value = await navigator.clipboard.readText();
      await processCurrent();
    } catch {
      alert("No se pudo leer el portapapeles.");
    }
  });
  byId("conta-export").addEventListener("click", () => {
    if (!Object.keys(state.invoices).length && !state.kitsSales.length) {
      alert("No hay datos para exportar.");
      return;
    }
    const sortInvoices = (a, b) => {
      const an = Number(a.invoice_id);
      const bn = Number(b.invoice_id);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return String(a.invoice_id).localeCompare(String(b.invoice_id), "es");
    };
    const invoicesRows = Object.values(state.invoices)
      .sort(sortInvoices)
      .map((v) => [
        v.invoice_id,
        v.issuer || "",
        v.recipient || "",
        v.concept || "",
        v.amount ?? "",
        v.sent_at || "",
        v.paid_at || "",
        v.paid_at ? "PAGADA" : "PENDIENTE",
        v.method || "facturas",
      ]);
    const kitsRows = state.kitsSales.map((s) => [s.seller || "", s.buyer || "", s.qty ?? "", s.ts || ""]);
    downloadCsv(
      "facturas_resultado.csv",
      ["invoice_id", "issuer", "recipient", "concept", "amount", "sent_at", "paid_at", "status", "metodo"],
      invoicesRows
    );
    downloadCsv("ventas_kits.csv", ["seller", "buyer", "qty", "timestamp"], kitsRows);
  });

  setupEmployeesModal(state);
  clearState();
}

function setupEmployeesModal(state) {
  const totalsModal = byId("employees-modal");
  const totalsBody = byId("employees-body");
  const adminModal = byId("employees-admin-modal");

  let selectedId = null;
  let totalsRows = [];

  function sumByNormalizedName(map, name) {
    const target = normalizeKeySimple(name);
    let sum = 0;
    for (const [k, v] of Object.entries(map || {})) {
      if (normalizeKeySimple(k) === target) sum += Number(v || 0);
    }
    return sum;
  }

  async function buildTotalsRows() {
    const employees = await listEmployees();
    const kitPrice = getKitPrice();
    totalsRows = employees.map((e) => {
      const name = fullName(e);
      const paid = sumByNormalizedName(state.invByIssuerPaid, name);
      const kitsUnits = sumByNormalizedName(state.kitsBySeller, name);
      const kitsValue = kitsUnits * kitPrice;
      const gross = paid + kitsValue;
      const pct = pctForRank(e.rank);
      const payout = Math.round(gross * pct);
      return { id: e.id, name, rank: e.rank || "", pct, gross, payout };
    });
    totalsRows.sort((a, b) => b.payout - a.payout || a.name.localeCompare(b.name, "es"));
  }

  function renderTotalsRows() {
    totalsBody.innerHTML = "";
    for (const row of totalsRows) {
      const tr = document.createElement("tr");
      if (row.id === selectedId) tr.classList.add("is-selected");
      tr.innerHTML = `
        <td>${row.name}</td>
        <td>${row.rank || "-"}</td>
        <td class="num">${row.pct ? Math.round(row.pct * 100) + "%" : "-"}</td>
        <td class="num">${fmtMoney(row.gross)}</td>
        <td class="num">${fmtMoney(row.payout)}</td>
      `;
      tr.addEventListener("click", () => {
        selectedId = row.id;
        renderTotalsRows();
      });
      tr.addEventListener("dblclick", async () => {
        const text = String(row.payout);
        const ok = await copyText(text);
        if (!ok) openCopyFallback(text);
      });
      totalsBody.appendChild(tr);
    }
    const bankTotal = totalsRows.reduce((acc, r) => acc + r.payout, 0);
    byId("employees-bank-total").textContent = `Total a pagar: ${fmtMoney(bankTotal)}`;
  }

  async function openTotalsModal() {
    const employees = await listEmployees();
    if (!employees.length) {
      alert("No hay empleados en la lista. Entra en 'Gestion empleados' para anadirlos.");
      return;
    }
    await buildTotalsRows();
    selectedId = null;
    renderTotalsRows();
    totalsModal.showModal();
  }

  byId("conta-employees").addEventListener("click", () => {
    openTotalsModal().catch(() => alert("No se pudieron cargar los empleados."));
  });

  byId("employees-copy-sel").addEventListener("click", async () => {
    const row = totalsRows.find((r) => r.id === selectedId);
    if (!row) return;
    const name = row.rank ? `${row.name} (${row.rank})` : row.name;
    const pctTxt = row.pct ? `${Math.round(row.pct * 100)}%` : "-";
    const text = `${name} | ${pctTxt} | Bruto: ${fmtMoney(row.gross)} | A pagar: ${fmtMoney(row.payout)}`;

    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
  });

  byId("employees-remove")?.addEventListener("click", () => {
    const row = totalsRows.find((r) => r.id === selectedId);
    if (!row) return;
    totalsRows = totalsRows.filter((r) => r.id !== selectedId);
    selectedId = null;
    renderTotalsRows();
  });

  byId("employees-copy-all").addEventListener("click", async () => {
    if (!totalsRows.length) {
      return;
    }
    const maxPayout = Math.max(0, ...totalsRows.map((r) => r.payout));
    const lines = totalsRows.map((r) => {
      const name = r.rank ? `${r.name} (${r.rank})` : r.name;
      let line = `* ${name}: ${fmtMoneyPlain(r.payout)}`;
      if (r.payout === maxPayout && maxPayout > 0) {
        line += " 🏆";
      }
      return line;
    });
    const text = lines.join("\n");

    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
  });

  function openAdminModal() {
    adminModal.showModal();
    adminModal.dispatchEvent(new Event("aguila-open"));
  }

  byId("conta-manage-employees").addEventListener("click", openAdminModal);
  byId("employees-manage").addEventListener("click", () => {
    totalsModal.close();
    openAdminModal();
  });

  setupEmployeesAdminModal({
    onChanged: async () => {
      if (totalsModal.open) {
        await buildTotalsRows();
        renderTotalsRows();
      }
    },
  });
}

function setupEmployeesAdminModal({ onChanged }) {
  const modal = byId("employees-admin-modal");
  const status = byId("emp-admin-status");
  const passInput = byId("emp-admin-pass");

  const nameInput = byId("emp-new-name");
  const surInput = byId("emp-new-surname");
  const rankInput = byId("emp-new-rank");

  const searchInput = byId("emp-search");
  const body = byId("emp-admin-body");

  if (rankInput && !rankInput.dataset.filled) {
    rankInput.dataset.filled = "1";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Sin rango";
    rankInput.appendChild(blank);
    for (const r of RANKS) {
      const opt = document.createElement("option");
      opt.value = r.label;
      opt.textContent = `${r.label} (${Math.round(r.pct * 100)}%)`;
      rankInput.appendChild(opt);
    }
  }

  let unlocked = false;
  let adminPass = "";
  let employees = [];

  function setStatus(text, ok = false) {
    status.textContent = text;
    status.style.color = ok ? "var(--ok)" : "var(--muted)";
  }

  function normalizeForSearch(s) {
    return normalizeKeySimple(String(s || ""));
  }

  function renderList() {
    const q = normalizeForSearch(searchInput.value);
    const shown = !q
      ? employees
      : employees.filter((e) => {
          const full = `${e.name} ${e.surname} ${e.rank || ""}`;
          return normalizeForSearch(full).includes(q);
        });

    body.innerHTML = "";
    for (const e of shown) {
      const tr = document.createElement("tr");
      const full = `${e.name} ${e.surname}`.replace(/\s+/g, " ").trim();
      const pct = pctForRank(e.rank);
      const pctText = e.rank ? (pct ? `${Math.round(pct * 100)}%` : "0%") : "-";
      tr.innerHTML = `
        <td>${full}</td>
        <td><select class="text-input emp-rank-select" data-id="${String(e.id)}"></select></td>
        <td class="num" data-pct-cell="${String(e.id)}">${pctText}</td>
        <td class="num">
          <button type="button" class="danger" data-del="${String(e.id)}">Eliminar</button>
        </td>
      `;
      body.appendChild(tr);

      const select = tr.querySelector(".emp-rank-select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Sin rango";
      select.appendChild(blank);
      for (const r of RANKS) {
        const opt = document.createElement("option");
        opt.value = r.label;
        opt.textContent = `${r.label} (${Math.round(r.pct * 100)}%)`;
        select.appendChild(opt);
      }
      select.value = e.rank || "";
    }

    body.querySelectorAll("select.emp-rank-select").forEach((select) => {
      select.addEventListener("change", async () => {
        const id = select.getAttribute("data-id");
        const emp = employees.find((x) => String(x.id) === String(id));
        if (!unlocked) {
          alert("Primero desbloquea con la contrasena.");
          select.value = emp?.rank || "";
          return;
        }
        const newRank = select.value;
        try {
          await updateEmployee(id, { rank: newRank }, adminPass);
          // El id puede cambiar por dentro (ver updateEmployee), asi que se
          // vuelve a cargar toda la lista en vez de solo parchar esta fila.
          await refresh();
          await (onChanged?.());
        } catch (err) {
          alert(String(err?.message || err || "Error"));
          select.value = emp?.rank || "";
        }
      });
    });

    body.querySelectorAll("button[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!unlocked) {
          alert("Primero desbloquea con la contrasena.");
          return;
        }
        const emp = employees.find((x) => String(x.id) === String(id));
        const label = emp ? `${emp.name} ${emp.surname}` : `ID ${id}`;
        if (!confirm(`Eliminar a ${label}?`)) return;
        try {
          await deleteEmployee(id, adminPass);
          await refresh();
          await (onChanged?.());
        } catch (err) {
          alert(String(err?.message || err || "Error"));
        }
      });
    });
  }

  async function refresh() {
    try {
      employees = await listEmployees();
      employees.sort((a, b) =>
        `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, "es", { sensitivity: "base" })
      );
      renderList();
    } catch {
      alert("No se pudieron cargar los empleados.");
    }
  }

  byId("emp-admin-unlock").addEventListener("click", () => {
    const p = String(passInput.value || "");
    if (!p) {
      setStatus("Escribe la contrasena.");
      return;
    }
    if (p !== String(EMPLOYEE_ADMIN_PASSWORD || "")) {
      unlocked = false;
      adminPass = "";
      setStatus("Contrasena incorrecta.");
      return;
    }
    unlocked = true;
    adminPass = p;
    setStatus("Desbloqueado", true);
  });

  byId("emp-new-add").addEventListener("click", async () => {
    const name = String(nameInput.value || "").trim();
    const surname = String(surInput.value || "").trim();
    const rank = String(rankInput.value || "").trim();

    if (!name || !surname) {
      alert("Pon Nombre y Apellido.");
      return;
    }
    if (!unlocked) {
      alert("Primero desbloquea con la contrasena.");
      return;
    }
    try {
      await addEmployee({ name, surname, rank }, adminPass);
      nameInput.value = "";
      surInput.value = "";
      rankInput.value = "";
      await refresh();
      await (onChanged?.());
    } catch (err) {
      alert(String(err?.message || err || "Error"));
    }
  });

  byId("emp-refresh").addEventListener("click", refresh);
  searchInput.addEventListener("input", renderList);

  modal.addEventListener("close", () => {
  });
  modal.addEventListener("cancel", () => {
  });

  modal.addEventListener("aguila-open", refresh);

  refresh();
}

// ============================================================================
// Modulo de Almacen: inventario del taller a partir del log de Discord
// ============================================================================
const ALM_STORAGE_KEY = "aguila_almacen_v1";
const ALM_INVENTORY = "mecanico_storage_aguilamotor";
const ALM_TRACKED = [
  { key: "bayeta", label: "Bayetas", names: ["bayeta", "bayetas"], min: 100 },
  { key: "mando_neon", label: "Mandos de Neón", names: ["neones", "neon", "mando de neon", "mando de neones", "mando de neones rgb"], min: 10 },
  { key: "kit_desvuelco", label: "Kits de Desvuelco", names: ["desvolcar vehiculo", "desvolcarvehiculo", "kit de desvuelco", "kits de desvuelco", "desvolcar"], min: 10 },
  { key: "rueda", label: "Ruedas", names: ["rueda", "ruedas"], min: 8 },
];

function almNorm(s) {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function almItemInfo(rawName) {
  const n = almNorm(rawName);
  for (const t of ALM_TRACKED) {
    if (t.names.includes(n)) return { key: t.key, label: t.label, tracked: true };
  }
  return { key: "otro:" + n, label: String(rawName).trim(), tracked: false };
}

function almPad(n) {
  return String(n).padStart(2, "0");
}

function almIsoDay(d) {
  return `${d.getFullYear()}-${almPad(d.getMonth() + 1)}-${almPad(d.getDate())}`;
}

// Resuelve la cabecera de fecha del log ("5/10/2026 20:51", "ayer a las 18:44", "20:16").
function almResolveTs(text, refDate, prev, info) {
  const t = String(text).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return { day: d, hm: `${almPad(m[4])}:${m[5]}` };
  }
  m = t.match(/^(hoy|ayer)\D*(\d{1,2}):(\d{2})/i);
  if (m) {
    info.relative = true;
    const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    if (m[1].toLowerCase() === "ayer") d.setDate(d.getDate() - 1);
    return { day: d, hm: `${almPad(m[2])}:${m[3]}` };
  }
  m = t.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const base = prev ? prev.day : new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    if (!prev) info.relative = true;
    return { day: base, hm: `${almPad(m[1])}:${m[2]}` };
  }
  return prev;
}

// Lee el texto copiado de Discord. Devuelve los movimientos del almacen del taller.
function almParseLog(raw, refDate) {
  const info = { events: [], ignored: 0, noDiscord: 0, noTime: 0, relative: false };
  const counts = new Map();
  let cur = null;

  for (const line of String(raw || "").split(/\r?\n/)) {
    const hm = line.match(
      /Logs?\s+de\s+inventarios?\w*\s*[—–-]\s*(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}|(?:hoy|ayer)\D*?\d{1,2}:\d{2}|\d{1,2}:\d{2})/i
    );
    if (hm) cur = almResolveTs(hm[1], refDate, cur, info);

    const m = line.match(/(METER|SACAR)\s+(.+?)\((\d+)\)[\s`]*\u{1F4E6}\s*(.+?)\s*\((\d+)\)/iu);
    if (!m) continue;

    const inv = line.match(/Inventory=%22([^%&"]+)%22/i);
    if (inv && inv[1] !== ALM_INVENTORY) {
      info.ignored += 1;
      continue;
    }

    const action = m[1].toUpperCase();
    const player = m[2].replace(/[`\s]+$/g, "").trim();
    const pid = m[3];
    const itemRaw = m[4].trim();
    const qty = Number(m[5]);
    const dm = line.match(/discord(?::|%3A)(\d{15,20})/i);
    const discord = dm ? dm[1] : "";
    if (!discord) info.noDiscord += 1;

    let ts;
    if (cur) ts = `${almIsoDay(cur.day)} ${cur.hm}`;
    else {
      ts = `${almIsoDay(refDate)} 00:00`;
      info.noTime += 1;
    }

    const item = almItemInfo(itemRaw);
    const base = [ts, action, discord || player, item.key, qty].join("|");
    const n = (counts.get(base) || 0) + 1;
    counts.set(base, n);

    info.events.push({
      id: `${base}|${n}`,
      ts,
      action,
      player,
      pid,
      discord,
      item: item.key,
      itemLabel: item.label,
      qty,
      source: "log",
    });
  }
  return info;
}

function almEmptyState() {
  return { events: [], min: {}, alias: {} };
}

function almLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(ALM_STORAGE_KEY) || "null");
    if (raw && Array.isArray(raw.events)) {
      return { events: raw.events, min: raw.min || {}, alias: raw.alias || {} };
    }
  } catch {
    // sin almacenamiento
  }
  return almEmptyState();
}

function almSave(state) {
  try {
    localStorage.setItem(ALM_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sin almacenamiento
  }
}

function almStock(events) {
  const stock = {};
  for (const e of events) {
    const sign = e.action === "METER" ? 1 : e.action === "SACAR" ? -1 : 1; // AJUSTE ya trae signo
    stock[e.item] = (stock[e.item] || 0) + sign * Number(e.qty || 0);
  }
  return stock;
}

function almPeople(events, alias) {
  const map = new Map();
  for (const e of events) {
    if (e.action === "AJUSTE") continue;
    const key = e.discord || "n:" + almNorm(e.player);
    let p = map.get(key);
    if (!p) {
      p = { key, discord: e.discord || "", player: e.player, last: e.ts, items: {} };
      map.set(key, p);
    }
    if (e.ts >= p.last) {
      p.last = e.ts;
      p.player = e.player;
    }
    const slot = (p.items[e.item] = p.items[e.item] || { in: 0, out: 0 });
    if (e.action === "METER") slot.in += Number(e.qty);
    else slot.out += Number(e.qty);
  }
  return [...map.values()].sort((a, b) => (b.last > a.last ? 1 : -1));
}

function setupAlmacen() {
  const root = byId("tab-almacen");
  if (!root) return;

  let state = almLoad();
  const cardsEl = byId("alm-cards");
  const inputEl = byId("alm-input");
  const statusEl = byId("alm-status");
  const refDateEl = byId("alm-refdate");
  const peopleBody = byId("alm-people-body");
  const histBody = byId("alm-hist-body");
  const othersBody = byId("alm-others-body");
  const fItem = byId("alm-f-item");
  const fPerson = byId("alm-f-person");
  const fAction = byId("alm-f-action");
  const mItem = byId("alm-m-item");

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const num = (n) => Number(n).toLocaleString("es-ES");

  const labelFor = (itemKey) => {
    const t = ALM_TRACKED.find((x) => x.key === itemKey);
    if (t) return t.label;
    const ev = state.events.find((e) => e.item === itemKey);
    return ev ? ev.itemLabel : itemKey;
  };
  const personLabel = (p) => state.alias[p.key] || p.player;
  const minFor = (t) => (state.min[t.key] !== undefined ? Number(state.min[t.key]) : t.min);

  function setStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? "var(--ok)" : "var(--warn)";
  }

  function renderCards() {
    cardsEl.textContent = "";
    const stock = almStock(state.events);
    for (const t of ALM_TRACKED) {
      const qty = stock[t.key] || 0;
      const min = minFor(t);
      const low = qty <= min;
      const card = el("article", "mini-card alm-card" + (low ? " is-low" : ""));
      card.appendChild(el("h3", "", t.label));
      card.appendChild(el("p", "alm-qty", num(qty)));
      card.appendChild(el("p", low ? "warn" : "muted", low ? "⚠ Reponer pronto" : "En existencia"));

      const row = el("div", "form-row alm-mini-row");
      const minIn = el("input", "text-input");
      minIn.type = "number";
      minIn.min = "0";
      minIn.value = String(min);
      minIn.title = "Mínimo para avisar";
      minIn.addEventListener("change", () => {
        state.min[t.key] = Math.max(0, Number(minIn.value) || 0);
        almSave(state);
        renderCards();
      });
      row.appendChild(el("label", "muted", "Avisar en"));
      row.appendChild(minIn);
      card.appendChild(row);

      const row2 = el("div", "form-row alm-mini-row");
      const realIn = el("input", "text-input");
      realIn.type = "number";
      realIn.min = "0";
      realIn.placeholder = "Conteo real";
      const setBtn = el("button", "ghost small", "Fijar");
      setBtn.type = "button";
      setBtn.addEventListener("click", () => {
        if (realIn.value === "") return;
        const real = Math.max(0, Math.floor(Number(realIn.value)));
        const delta = real - (almStock(state.events)[t.key] || 0);
        if (delta === 0) {
          setStatus(`${t.label}: ya coincide con el conteo (${num(real)}).`, true);
          return;
        }
        state.events.push({
          id: "adj-" + safeRandomId(),
          ts: almNowIso(),
          action: "AJUSTE",
          player: "Conteo real",
          pid: "",
          discord: "",
          item: t.key,
          itemLabel: t.label,
          qty: delta,
          source: "manual",
        });
        almSave(state);
        setStatus(`${t.label}: ajustado a ${num(real)} (${delta > 0 ? "+" : ""}${num(delta)}).`, true);
        renderAll();
      });
      row2.appendChild(realIn);
      row2.appendChild(setBtn);
      card.appendChild(row2);
      cardsEl.appendChild(card);
    }
  }

  function almNowIso() {
    const d = new Date();
    return `${almIsoDay(d)} ${almPad(d.getHours())}:${almPad(d.getMinutes())}`;
  }

  function renderPeople() {
    peopleBody.textContent = "";
    const people = almPeople(state.events, state.alias);
    if (!people.length) {
      const tr = el("tr");
      const td = el("td", "muted", "Sin movimientos todavía.");
      td.colSpan = 7;
      tr.appendChild(td);
      peopleBody.appendChild(tr);
      return;
    }
    for (const p of people) {
      const tr = el("tr");
      const nameTd = el("td");
      const nameIn = el("input", "text-input alm-alias");
      nameIn.type = "text";
      nameIn.value = personLabel(p);
      nameIn.title = "Escribe un nombre para reconocerlo";
      nameIn.addEventListener("change", () => {
        const v = nameIn.value.trim();
        if (v && v !== p.player) state.alias[p.key] = v;
        else delete state.alias[p.key];
        almSave(state);
        renderAll();
      });
      nameTd.appendChild(nameIn);
      tr.appendChild(nameTd);

      const dTd = el("td");
      if (p.discord) {
        const a = el("a", "alm-link", p.discord);
        a.href = "https://discord.com/users/" + p.discord;
        a.target = "_blank";
        a.rel = "noopener";
        dTd.appendChild(a);
        const cp = el("button", "ghost small", "Copiar mención");
        cp.type = "button";
        cp.title = "Copia <@id>: pégalo en Discord y verás el nombre";
        cp.addEventListener("click", () => copyText(`<@${p.discord}>`));
        dTd.appendChild(document.createTextNode(" "));
        dTd.appendChild(cp);
      } else {
        dTd.appendChild(el("span", "muted", "—"));
      }
      tr.appendChild(dTd);

      for (const t of ALM_TRACKED) {
        const s = p.items[t.key];
        tr.appendChild(el("td", "num", s ? `+${num(s.in)} / −${num(s.out)}` : "—"));
      }
      let oi = 0;
      let oo = 0;
      for (const [k, v] of Object.entries(p.items)) {
        if (k.startsWith("otro:")) {
          oi += v.in;
          oo += v.out;
        }
      }
      tr.appendChild(el("td", "num", oi || oo ? `+${num(oi)} / −${num(oo)}` : "—"));
      peopleBody.appendChild(tr);
    }
  }

  function renderOthers() {
    othersBody.textContent = "";
    const stock = almStock(state.events);
    const keys = Object.keys(stock).filter((k) => k.startsWith("otro:"));
    if (!keys.length) {
      const tr = el("tr");
      const td = el("td", "muted", "—");
      td.colSpan = 2;
      tr.appendChild(td);
      othersBody.appendChild(tr);
      return;
    }
    keys.sort((a, b) => labelFor(a).localeCompare(labelFor(b), "es"));
    for (const k of keys) {
      const tr = el("tr");
      tr.appendChild(el("td", "", labelFor(k)));
      tr.appendChild(el("td", "num", num(stock[k])));
      othersBody.appendChild(tr);
    }
  }

  function renderFilters() {
    const keepI = fItem.value;
    const keepP = fPerson.value;
    fItem.textContent = "";
    fItem.appendChild(new Option("Todos los artículos", ""));
    const itemKeys = [...new Set(state.events.map((e) => e.item))];
    itemKeys.sort((a, b) => labelFor(a).localeCompare(labelFor(b), "es"));
    for (const k of itemKeys) fItem.appendChild(new Option(labelFor(k), k));
    fItem.value = itemKeys.includes(keepI) ? keepI : "";

    fPerson.textContent = "";
    fPerson.appendChild(new Option("Todas las personas", ""));
    const people = almPeople(state.events, state.alias);
    for (const p of people) fPerson.appendChild(new Option(personLabel(p), p.key));
    fPerson.value = people.some((p) => p.key === keepP) ? keepP : "";
  }

  function eventPersonKey(e) {
    return e.discord || "n:" + almNorm(e.player);
  }

  function renderHistory() {
    histBody.textContent = "";
    let rows = state.events.slice();
    if (fItem.value) rows = rows.filter((e) => e.item === fItem.value);
    if (fPerson.value) rows = rows.filter((e) => eventPersonKey(e) === fPerson.value);
    if (fAction.value) rows = rows.filter((e) => e.action === fAction.value);
    rows.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
    const total = rows.length;
    rows = rows.slice(0, 300);
    byId("alm-hist-count").textContent = total > 300 ? `Mostrando 300 de ${num(total)}` : `${num(total)} movimientos`;

    for (const e of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "", e.ts));
      const who =
        e.action === "AJUSTE"
          ? "Conteo real"
          : state.alias[eventPersonKey(e)] || e.player;
      tr.appendChild(el("td", "", who));
      tr.appendChild(el("td", "", labelFor(e.item)));
      const act = e.action === "METER" ? "Metió" : e.action === "SACAR" ? "Sacó" : "Ajuste";
      const cls = e.action === "METER" ? "alm-in" : e.action === "SACAR" ? "alm-out" : "alm-adj";
      tr.appendChild(el("td", cls, act));
      const q = e.action === "AJUSTE" ? (e.qty > 0 ? "+" : "") + num(e.qty) : num(e.qty);
      tr.appendChild(el("td", "num", q));
      const delTd = el("td", "num");
      const del = el("button", "ghost small", "Quitar");
      del.type = "button";
      del.addEventListener("click", () => {
        state.events = state.events.filter((x) => x.id !== e.id);
        almSave(state);
        renderAll();
      });
      delTd.appendChild(del);
      tr.appendChild(delTd);
      histBody.appendChild(tr);
    }
  }

  function renderAll() {
    renderCards();
    renderPeople();
    renderOthers();
    renderFilters();
    renderHistory();
  }

  function processLog() {
    const text = inputEl.value;
    if (!text.trim()) {
      setStatus("Pega primero el texto del log.", false);
      return;
    }
    const parts = String(refDateEl.value || "").split("-");
    const ref = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date();
    const res = almParseLog(text, ref);
    const have = new Set(state.events.map((e) => e.id));
    let added = 0;
    let dup = 0;
    for (const e of res.events) {
      if (have.has(e.id)) {
        dup += 1;
        continue;
      }
      have.add(e.id);
      state.events.push(e);
      added += 1;
    }
    almSave(state);
    const bits = [`${added} movimientos nuevos`];
    if (dup) bits.push(`${dup} ya estaban`);
    if (res.ignored) bits.push(`${res.ignored} de otro almacén ignorados`);
    if (res.noDiscord) bits.push(`${res.noDiscord} sin Discord (el texto copiado no trae el enlace)`);
    if (res.relative) bits.push(`usé ${refDateEl.value || "hoy"} como "hoy" para las fechas relativas`);
    if (res.noTime) bits.push(`${res.noTime} sin hora`);
    if (!res.events.length) setStatus("No encontré movimientos en ese texto.", false);
    else setStatus(bits.join(" · "), added > 0 || dup > 0);
    renderAll();
  }

  refDateEl.value = almIsoDay(new Date());

  byId("alm-process").addEventListener("click", processLog);
  byId("alm-paste").addEventListener("click", async () => {
    try {
      inputEl.value = await navigator.clipboard.readText();
      processLog();
    } catch {
      alert("No se pudo leer el portapapeles. Pega con Ctrl+V y pulsa Procesar.");
    }
  });
  byId("alm-clear-input").addEventListener("click", () => {
    inputEl.value = "";
    setStatus("", true);
  });

  for (const t of ALM_TRACKED) mItem.appendChild(new Option(t.label, t.key));

  byId("alm-m-add").addEventListener("click", () => {
    const qty = Math.floor(Number(byId("alm-m-qty").value));
    const who = byId("alm-m-who").value.trim() || "Manual";
    const action = byId("alm-m-action").value;
    if (!qty || qty < 1) {
      setStatus("Pon una cantidad válida.", false);
      return;
    }
    const t = ALM_TRACKED.find((x) => x.key === mItem.value);
    const known = almPeople(state.events, state.alias).find(
      (p) => almNorm(p.player) === almNorm(who) || almNorm(state.alias[p.key] || "") === almNorm(who)
    );
    state.events.push({
      id: "man-" + safeRandomId(),
      ts: almNowIso(),
      action,
      player: known ? known.player : who,
      pid: "",
      discord: known ? known.discord : "",
      item: t.key,
      itemLabel: t.label,
      qty,
      source: "manual",
    });
    almSave(state);
    byId("alm-m-qty").value = "";
    setStatus(`${action === "METER" ? "Entrada" : "Salida"} registrada: ${num(qty)} ${t.label}.`, true);
    renderAll();
  });

  [fItem, fPerson, fAction].forEach((n) => n.addEventListener("change", renderHistory));

  byId("alm-export").addEventListener("click", () => {
    if (!state.events.length) {
      alert("No hay movimientos para exportar.");
      return;
    }
    const rows = state.events
      .slice()
      .sort((a, b) => (a.ts < b.ts ? -1 : 1))
      .map((e) => [
        e.ts,
        e.action,
        state.alias[eventPersonKey(e)] || e.player,
        e.pid,
        e.discord,
        labelFor(e.item),
        e.qty,
      ]);
    downloadCsv("almacen_taller.csv", ["Fecha", "Accion", "Persona", "ID juego", "Discord", "Articulo", "Cantidad"], rows);
  });

  byId("alm-backup-copy").addEventListener("click", () => copyText(JSON.stringify(state)));
  byId("alm-backup-restore").addEventListener("click", () => {
    const box = byId("alm-backup-text");
    try {
      const data = JSON.parse(box.value);
      if (!data || !Array.isArray(data.events)) throw new Error("x");
      if (!window.confirm("Esto reemplaza lo que hay ahora en el almacén. ¿Continuar?")) return;
      state = { events: data.events, min: data.min || {}, alias: data.alias || {} };
      almSave(state);
      box.value = "";
      setStatus("Respaldo restaurado.", true);
      renderAll();
    } catch {
      setStatus("El respaldo no es válido.", false);
    }
  });

  byId("alm-reset").addEventListener("click", () => {
    if (!window.confirm("¿Borrar TODO el historial y las existencias del almacén? No se puede deshacer.")) return;
    state = almEmptyState();
    almSave(state);
    setStatus("Almacén reiniciado.", true);
    renderAll();
  });

  renderAll();
}

setupCopyFallbackModal();
setupTabs();
setupCaja();
setupContabilidad();
setupAlmacen();
