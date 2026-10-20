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

// Ya no hay contrasena compartida: las secciones restringidas son para los
// Jefes (sesion con Discord o con la cuenta de correo del encargado).
function showAccessModal({ sectionLabel }) {
  if (hasAccess()) return Promise.resolve(true);
  alert(`${sectionLabel || "Esta sección"}: solo para Jefes. Inicia sesión con 🔑 Entrar (arriba).`);
  return Promise.resolve(false);
}

function showAccessModalLegacy({ sectionLabel }) {
  const dlg = byId("access-modal");
  const titleEl = byId("access-title");
  const input = byId("access-pass");
  const errEl = byId("access-error");
  const btnEnter = byId("access-enter");
  const btnCancel = byId("access-cancel");
  const btnToggle = byId("access-toggle");

  if (!dlg || !titleEl || !input || !errEl || !btnEnter || !btnCancel || !btnToggle) {
    const pass = window.prompt("Introduce la contrasena:");
    return Promise.resolve(unlockAccess(pass));
  }

  titleEl.textContent = sectionLabel ? `Acceso: ${sectionLabel}` : "Acceso restringido";
  errEl.textContent = "";
  input.value = "";
  input.type = "password";
  btnToggle.textContent = "Mostrar";

  return new Promise((resolve) => {
    const onOk = () => {
      const pass = String(input.value || "");
      if (!unlockAccess(pass)) {
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
      const required = PROTECTED_TABS.includes(target) && !(target === "tab-cv" && canSeeStock());
      if (required && !unlocked.has(target)) {
        const ok = await showAccessModal({
          sectionLabel: tab.textContent?.trim() || "Acceso restringido",
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
  { key: "camiones", label: "Gama Camiones" },
  { key: "aereos", label: "Gama Aéreos" },
  { key: "full_tuning", label: "Full Tuning" },
  { key: "servicios_taller", label: "Servicios (Taller)" },
  { key: "servicios_grua", label: "Servicios (Grúa)" },
  { key: "tienda", label: "Tienda" },
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
  { key: "camiones", label: "Gama Camiones" },
  { key: "aereos", label: "Gama Aéreos" },
];

// Aviso de la Gama VIP (en su pestana y en su Full Tuning).
const VIP_NOTE = "💎 Vehículos por donación al servidor (Prime, Deluxe, VIP, únicos, de coleccionista y personalizados): da igual si es moto, coche, avión o camión, todos se cobran con los precios de la Gama VIP.";

// Precio de cada pieza (mismo orden que TUNING_PIECES) por gama.
const TUNING_PRICES = {
  motos:      [800, 800, 800, 800, 800, 600, 800, 800, 900, 900, 900, 900, 900, 900, 10000],
  gama_baja:  [600, 600, 600, 600, 600, 400, 600, 600, 700, 700, 700, 700, 700, 700, 10000],
  gama_media: [900, 900, 900, 900, 900, 700, 900, 900, 1100, 1100, 1100, 1100, 1100, 1100, 20000],
  gama_alta:  [1500, 1500, 1500, 1500, 1500, 1100, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
  gama_vip:   [1500, 1500, 1500, 1500, 1500, 1100, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
  // Camiones: mismos precios que Gama Alta (su precio de compra es parecido).
  camiones:   [1500, 1500, 1500, 1500, 1500, 1100, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
  aereos:     [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 10000, 10000, 10000, 10000, 10000, 10000, 50000],
};

// Abreviaturas para el concepto del datafono (maximo 40 caracteres).
// Si el concepto completo no cabe, se usa "2xRued+Turbo GA, Rep T".
const CONCEPT_MAX = 40;

const PIECE_SHORT = {
  "Pintura": "Pint",
  "Neones": "Neon",
  "Cambio de Luces": "Luces",
  "Ruedas": "Rued",
  "Humo de Ruedas": "Humo",
  "Carrocería": "Carr",
  "Claxon": "Clax",
  "Tintado de Lunas": "Tint",
  "Turbo": "Turbo",
  "Motor": "Motor",
  "Transmisión": "Trans",
  "Blindaje": "Blind",
  "Suspensión": "Susp",
  "Frenos": "Fren",
  "Full Tuning": "FT",
};

const GAMA_SHORT = {
  motos: "MT",
  gama_baja: "GB",
  gama_media: "GM",
  gama_alta: "GA",
  gama_vip: "VIP",
  camiones: "CAM",
  aereos: "AE",
};

// [abreviatura, grupo]: el grupo (gama o T = taller, G = grua) se escribe una sola vez al final.
const SERVICE_SHORT = {
  "Limpieza (Taller)": ["Limp", "T"],
  "Reparación (Taller)": ["Rep", "T"],
  "Reparación + Limpieza (Taller)": ["Rep+Limp", "T"],
  "Reparación + Repostaje (Taller)": ["Rep+Gas", "T"],
  "Reparación + Limpieza + Repostaje (Taller)": ["Rep+Limp+Gas", "T"],
  "Repostaje (Taller)": ["Gas", "T"],
  "Repostaje + Limpieza (Taller)": ["Gas+Limp", "T"],
  "Bayetas o Limpieza (Grúa)": ["Limp", "G"],
  "Reparación (Grúa)": ["Rep", "G"],
  "Reparación + Limpieza (Grúa)": ["Rep+Limp", "G"],
  "Reparación + Repostaje (Grúa)": ["Rep+Gas", "G"],
  "Reparación + Limpieza + Repostaje (Grúa)": ["Rep+Limp+Gas", "G"],
  "Repostaje (Grúa)": ["Gas", "G"],
  "Grúa Terrestre": ["Grua", "G"],
  "Grúa Aérea": ["Grua aerea", ""],
  "Rescate Aéreo Completo": ["Rescate aereo", ""],
  "Kit de Desvuelco": ["Desvuelco", ""],
  "Rueda": ["Rueda", ""],
  "Bayetas": ["Bayeta", ""],
  "Pintura Camaleónica (primera vez)": ["Camaleon", ""],
  "Cambio de Color Camaleónico": ["Color cam", ""],
  "Cambio de Color Camaleónico (Aéreos)": ["Color cam", "AE"],
  "Instalación de Nitro ⚠": ["Nitro", ""],
  "Botella de Nitro": ["Bot nitro", ""],
  "Instalación de Neones RGB": ["Neon RGB", ""],
  "Mando de Neones RGB": ["Mando RGB", ""],
  "Compraventa Gama Baja": ["Compra", "GB"],
  "Compraventa Gama Media": ["Compra", "GM"],
  "Compraventa Gama Alta": ["Compra", "GA"],
  "Compraventa Camiones": ["Compra", "CAM"],
};

function buildTuningProducts() {
  const out = [];
  for (const gama of GAMAS) {
    const prices = TUNING_PRICES[gama.key];
    TUNING_PIECES.forEach((piece, i) => {
      // El Full Tuning de todas las gamas va junto en su propia pestaña.
      const category = piece === "Full Tuning" ? "full_tuning" : gama.key;
      out.push({
        name: `${piece} (${gama.label})`,
        price: prices[i],
        note: gama.key === "gama_vip" && piece === "Full Tuning" ? "Cualquier vehículo por donación: Prime, Deluxe, VIP, únicos, coleccionista y personalizados (moto, coche, avión o camión)" : undefined,
        category,
        short: PIECE_SHORT[piece] || piece,
        group: GAMA_SHORT[gama.key] || "",
      });
    });
  }
  return out;
}

const SERVICE_PRODUCTS = [
  // Servicios dentro del taller. Los kits de reparacion no estan aqui: se venden
  // desde el menu de kits del juego (no por datafono) y se cuentan en Pagos → Venta de Kits.
  { name: "Limpieza (Taller)", price: 400, category: "servicios_taller" },
  { name: "Reparación (Taller)", price: 800, category: "servicios_taller" },
  // Packs: siempre mas baratos que por separado; los de 3 servicios, mas que cualquiera de 2.
  { name: "Reparación + Limpieza (Taller)", price: 1000, category: "servicios_taller" },
  { name: "Reparación + Repostaje (Taller)", price: 900, category: "servicios_taller" },
  { name: "Reparación + Limpieza + Repostaje (Taller)", price: 1200, category: "servicios_taller" },
  { name: "Repostaje (Taller)", price: 300, category: "servicios_taller" },
  { name: "Repostaje + Limpieza (Taller)", price: 600, category: "servicios_taller" },

  // Servicios fuera del taller (grua)
  { name: "Bayetas o Limpieza (Grúa)", price: 400, category: "servicios_grua" },
  { name: "Reparación (Grúa)", price: 800, category: "servicios_grua" },
  { name: "Reparación + Limpieza (Grúa)", price: 1000, category: "servicios_grua" },
  { name: "Reparación + Repostaje (Grúa)", price: 900, category: "servicios_grua" },
  { name: "Reparación + Limpieza + Repostaje (Grúa)", price: 1200, category: "servicios_grua" },
  { name: "Repostaje (Grúa)", price: 300, category: "servicios_grua" },
  { name: "Grúa Terrestre", price: 1500, category: "servicios_grua" },
  { name: "Grúa Aérea", price: 3500, category: "servicios_grua" },
  { name: "Rescate Aéreo Completo", price: 4500, category: "servicios_grua", note: "Incluye grúa aérea, reparación, limpieza y repostaje" },

  // Tienda junto al taller: productos que se compran a precio de taller y se
  // revenden aqui.
  { name: "Kit de Desvuelco", price: 1500, category: "tienda" },
  { name: "Rueda", price: 500, category: "tienda" },
  { name: "Mando de Neones RGB", price: 2000, category: "tienda" },
  { name: "Bayetas", price: 400, category: "tienda" },

  // Pintura camaleonica
  { name: "Pintura Camaleónica (primera vez)", price: 20000, category: "camaleonica" },
  { name: "Cambio de Color Camaleónico", price: 5000, category: "camaleonica" },
  { name: "Cambio de Color Camaleónico (Aéreos)", price: 10000, category: "camaleonica" },

  // Nitro (venta restringida, revisar al cliente)
  { name: "Instalación de Nitro ⚠", price: 35000, category: "nitro" },
  { name: "Botella de Nitro", price: 2000, category: "nitro" },

  // Neones RGB
  { name: "Instalación de Neones RGB", price: 10000, category: "neones" },

  // Compraventa (cambio de papeles)
  { name: "Compraventa Gama Baja", price: 2500, category: "compraventa" },
  { name: "Compraventa Gama Media", price: 5000, category: "compraventa" },
  { name: "Compraventa Gama Alta", price: 10000, category: "compraventa" },
  { name: "Compraventa Camiones", price: 7500, category: "compraventa" },
];

const PRODUCTS = [
  ...buildTuningProducts(),
  ...SERVICE_PRODUCTS.map((p) => {
    const [short, group] = SERVICE_SHORT[p.name] || [p.name, ""];
    return { ...p, short, group };
  }),
];

const RANKS = [
  { label: "Chalán", pct: 0.40 },
  { label: "Mecánico", pct: 0.45 },
  { label: "Experimentado", pct: 0.50 },
  { label: "Subjefe", pct: 0.50 },
  { label: "Mano Derecha", pct: 0.50 },
  { label: "Jefe", pct: 0.50 },
  { label: "Jefe Aguila", pct: 1.0 },
];

// Rangos que solo el Jefe Aguila puede dar, cambiar o quitar (tambien lo
// impide la base de datos). En la base se guarda siempre el nombre original;
// el Jefe Aguila puede cambiar el nombre que se MUESTRA (RANK_NAMES).
const TOP_RANKS = ["Jefe", "Mano Derecha", "Jefe Aguila"];
let RANK_NAMES = {};

function isTopRank(rank) {
  const k = normalizeKeySimple(rank);
  return TOP_RANKS.some((r) => normalizeKeySimple(r) === k);
}

function rankLabel(rank) {
  const found = RANKS.find((r) => normalizeKeySimple(r.label) === normalizeKeySimple(rank));
  if (!found) return rank || "";
  return String(RANK_NAMES[found.label] || "").trim() || found.label;
}

// Empleado de la Semana: quien mas cobra (sin bono) entre los que cobran,
// sin contar al Jefe Aguila (con el 100 % ganaria siempre). Si hay empate,
// cada ganador recibe el bono completo.
const WEEK_BONUS = 10000;
// Quien no factura nada en la semana (y si cobra) se lleva un warn.
const WARN_TEXT = "⚠️ **Aplicar warn** (no facturó)";
const fmtBonus = (n) => `$ ${Number(n).toLocaleString("en-US")}`;

function weekWinners(rows, isRegistered = () => true) {
  const competes = (r) => isRegistered(r) && !r.noPay && normalizeKeySimple(r.rank) !== normalizeKeySimple("Jefe Aguila");
  const max = Math.max(0, ...rows.filter(competes).map((r) => r.base ?? r.payout));
  return new Set(max > 0 ? rows.filter((r) => competes(r) && (r.base ?? r.payout) === max) : []);
}

// Posicion del rango (mayor = mas arriba). Sin rango o desconocido: abajo del todo.
function rankOrder(rank) {
  const key = normalizeKeySimple(rank);
  return RANKS.findIndex((r) => normalizeKeySimple(r.label) === key);
}

// Orden de la plantilla: Jefe Aguila arriba ... Chalan abajo; dentro del rango, por apellido.
function byRankThenName(a, b) {
  return (
    rankOrder(b.rank) - rankOrder(a.rank) ||
    `${a.surname || ""} ${a.name || ""}`.localeCompare(`${b.surname || ""} ${b.name || ""}`, "es", { sensitivity: "base" })
  );
}

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
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  current.push({ id: safeRandomId(), ...payload });
  saveCustomProductsLocal(current);
  return true;
}

function updateCustomProduct(id, payload, password) {
  if (!isAccessPassword(password)) {
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
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  saveCustomProductsLocal(current.filter((p) => String(p.id) !== String(id)));
  return true;
}

function setFixedProductOverride(originalName, patch, password) {
  if (!isAccessPassword(password)) {
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
  const overrides = productOverridesSource();
  const fixedVisible = PRODUCTS.filter((p) => !overrides[normalizeKeySimple(p.name)]?.hidden).map((p) => {
    const ov = overrides[normalizeKeySimple(p.name)];
    if (!ov) return { name: p.name, price: p.price, image: p.image, category: p.category, short: p.short, group: p.group, note: p.note };
    return {
      name: p.name,
      price: ov.price != null ? Number(ov.price) : p.price,
      image: ov.image || p.image,
      category: p.category,
      short: p.short,
      group: p.group,
      note: p.note,
    };
  });
  const custom = customProductsSource().map((p) => ({
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
    short: p.name,
    group: "",
  }));
  return [...fixedVisible, ...custom];
}

// Lista combinada para la tabla de "Editar / Quitar": incluye tambien los
// fijos ocultos (para poder restaurarlos) y trae el origen/id de cada fila.
function listProductsForAdmin() {
  const overrides = productOverridesSource();
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
  const custom = customProductsSource().map((p) => ({
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
// Iconos de linea para cada pieza o servicio (en vez de las iniciales).
const PRODUCT_ICON_PATHS = {
    pintura: '<path d="M9 3h6v4H9z"/><path d="M8 7h8v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M15 4h3M18 2v4"/>',
    neon: '<path d="M4 16c2-4 4-4 6 0s4 4 6 0 4-4 4-4"/><path d="M4 10c2-4 4-4 6 0s4 4 6 0"/>',
    luces: '<path d="M10 6a6 6 0 0 0 0 12h3V6z"/><path d="M16 8h5M16 12h5M16 16h5"/>',
    rueda: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
    humo: '<path d="M7 18a4 4 0 1 1 1-7.9A5 5 0 0 1 17.6 9 3.5 3.5 0 1 1 18 18z"/>',
    carroceria: '<path d="M3 15l2-5h14l2 5v3H3z"/><path d="M7 10l2-3h6l2 3"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>',
    claxon: '<path d="M4 10h4l7-5v14l-7-5H4z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    tintado: '<path d="M4 6h16v12H4z"/><path d="M4 18L14 6M10 18l10-12"/>',
    turbo: '<circle cx="12" cy="12" r="8"/><path d="M12 12c0-3 3-4 5-2M12 12c3 0 4 3 2 5M12 12c0 3-3 4-5 2M12 12c-3 0-4-3-2-5"/>',
    motor: '<path d="M4 9h3l2-2h6v3h2l2-2h1v8h-1l-2-2h-2v3H8l-2-2H4z"/>',
    transmision: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/><circle cx="12" cy="12" r="7"/>',
    blindaje: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    suspension: '<path d="M8 3h8M8 21h8M8 5l8 2-8 2 8 2-8 2 8 2-8 2 8 2"/>',
    frenos: '<circle cx="11" cy="12" r="8"/><circle cx="11" cy="12" r="2"/><path d="M17 6a9 9 0 0 1 0 12"/>',
    ft: '<path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z"/>',
    reparacion: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0 5-5l-2 2-2-2z"/>',
    limpieza: '<path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z"/>',
    gas: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M5 10h10M15 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    grua: '<path d="M4 20h16M6 20V8l10-4v4"/><path d="M16 8v5a2 2 0 1 1-2 2"/>',
    mando: '<rect x="8" y="3" width="8" height="18" rx="3"/><circle cx="12" cy="8" r="1.5"/><path d="M10 13h4M10 16h4"/>',
    bayeta: '<path d="M4 8l8-4 8 4-8 12z"/><path d="M8 9l4 6 4-6"/>',
    nitro: '<rect x="8" y="6" width="8" height="15" rx="3"/><path d="M10 6V3h4v3M12 10v6M9 13h6"/>',
    camaleon: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-2c1-3-2-11-7-11z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
    compra: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    // Helicoptero levantando un coche con el cable.
    gruaaerea: '<path d="M3 2.5h18M12 2.5v2"/><path d="M8.5 4.5h5a3 3 0 0 1 3 3v1h-8a2 2 0 0 1 0-4z"/><path d="M16.5 6.5h4l1-2"/><path d="M12 8.5v6" stroke-dasharray="1.2 1.4"/><path d="M6 19l1.5-3h9l1.5 3v1.5H6z"/><circle cx="8.5" cy="21" r="1"/><circle cx="15.5" cy="21" r="1"/>',
    // Salvavidas bajo la helice: rescate aereo con todo incluido.
    rescate: '<path d="M4 2.5h16M12 2.5v3"/><circle cx="12" cy="14" r="7.5"/><circle cx="12" cy="14" r="3"/><path d="M12 6.5v4.5M12 17v4.5M4.5 14H9M15 14h4.5"/><path d="M19.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
    desvuelco: '<path d="M4 14l2-4h12l2 4v2H4z"/><path d="M8 6a6 6 0 0 1 9 1M17 3v4h-4"/>',
  };

const PRODUCT_ICON_KEYWORDS = [["rescate aéreo","rescate"],["grúa aérea","gruaaerea"],["full tuning","ft"],["neones rgb","mando"],["mando","mando"],["pintura camale","camaleon"],["camale","camaleon"],["pintura","pintura"],["humo","humo"],["neon","neon"],["luces","luces"],["rueda","rueda"],["carrocer","carroceria"],["claxon","claxon"],["tintado","tintado"],["turbo","turbo"],["motor","motor"],["transmis","transmision"],["blindaje","blindaje"],["suspens","suspension"],["frenos","frenos"],["reparaci","reparacion"],["repostaje","gas"],["limpieza","limpieza"],["bayeta","bayeta"],["grúa","grua"],["nitro","nitro"],["compraventa","compra"],["desvuelco","desvuelco"]];

function productIconKey(name) {
  const n = String(name || "").toLowerCase();
  for (const [word, key] of PRODUCT_ICON_KEYWORDS) if (n.includes(word)) return key;
  return "reparacion";
}

function buildProductIconSvg(name) {
  const d = PRODUCT_ICON_PATHS[productIconKey(name)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf94"/><stop offset="1" stop-color="#f97d02"/></linearGradient><radialGradient id="b"><stop offset="0" stop-color="#3a2410"/><stop offset="1" stop-color="#140e09"/></radialGradient></defs><rect x="-6" y="-6" width="36" height="36" rx="9" fill="url(#b)"/><g fill="none" stroke="url(#g)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function getProductIcon(product) {
  if (product.image) return product.image;
  if (_placeholderIconCache.has(product.name)) return _placeholderIconCache.get(product.name);
  const icon = buildProductIconSvg(product.name);
  _placeholderIconCache.set(product.name, icon);
  return icon;
}

// ============================================================================
// Empleados
// ============================================================================

// Pestanas que piden la contrasena de acceso (Pagos y Sorteo; tambien la piden
// Gestion de Productos y la gestion de empleados). En el codigo solo esta su
// huella SHA-256, no la contrasena. Para cambiarla, ver el README.
const PROTECTED_TABS = ["tab-conta", "tab-sorteo", "tab-cv"];


// Contrasena escrita al desbloquear, para las acciones internas que la piden.
let unlockedAccessPassword = "";

function isAccessPassword() {
  return hasAccess();
}

function unlockAccess(pass) {
  if (!hasAccess()) return false;
  unlockedAccessPassword = String(pass);
  return true;
}

function accessPassword() {
  return unlockedAccessPassword;
}

// El programa de escritorio (.exe) recibe su propia clave al guardar empleados.
// Se mantiene la antigua para que siga funcionando; la nueva se valida aqui.
const BACKEND_LEGACY_PASSWORD = "0000";


// Rol de Discord "Empleado de la semana". Al pegarlo en Discord, <@&ID> se ve
// como la etiqueta del rol. Para cambiar de rol, cambia solo el numero.
const EMPLOYEE_OF_WEEK_ROLE_ID = "1263156546519433333";
const EMPLOYEE_OF_WEEK_TAG = `<@&${EMPLOYEE_OF_WEEK_ROLE_ID}>`;

// ID de Discord de cada empleado, para etiquetarlo (<@ID>) al copiar los totales.
// Se guarda aparte, por nombre completo, porque el programa de escritorio solo
// guarda nombre, apellido y rango (y al editar un empleado le cambia el id).
const EMPLOYEE_DISCORD_STORAGE_KEY = "aguila_employee_discord_v1";

function loadEmployeeDiscordMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMPLOYEE_DISCORD_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEmployeeDiscordMap(map) {
  try {
    localStorage.setItem(EMPLOYEE_DISCORD_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // sin almacenamiento
  }
}

// Acepta el numero solo o pegado como <@123...> / <@!123...>. "" = borrar; null = no valido.
function parseDiscordId(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = s.match(/^<?@?!?(\d{17,20})>?$/);
  return m ? m[1] : null;
}

function getEmployeeDiscord(fullNameStr) {
  if (empCloudOn()) return empCloudFind(fullNameStr)?.discord || "";
  const map = isSharedReadOnly() ? SHARED_DATA.discord : loadEmployeeDiscordMap();
  return map[normalizeKeySimple(fullNameStr)] || "";
}

function setEmployeeDiscord(fullNameStr, id) {
  if (empCloudOn()) return empCloudSet(fullNameStr, { discord: id || "" });
  const map = loadEmployeeDiscordMap();
  const key = normalizeKeySimple(fullNameStr);
  if (id) map[key] = id;
  else delete map[key];
  saveEmployeeDiscordMap(map);
}

// IBAN del personaje (banco del servidor, p. ej. J739745) para depositar la nomina.
// Se guarda igual que el Discord: por nombre completo, en el navegador.
const EMPLOYEE_IBAN_STORAGE_KEY = "aguila_employee_iban_v1";
const IBAN_PENDING_TEXT = "**IBAN pendiente**"; // en negrita en Discord

function loadEmployeeIbanMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMPLOYEE_IBAN_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEmployeeIbanMap(map) {
  try {
    localStorage.setItem(EMPLOYEE_IBAN_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // sin almacenamiento
  }
}

// Una letra y 6 numeros (J739745); se aceptan minusculas y espacios. "" = borrar; null = no valido.
function parseIban(raw) {
  const s = String(raw ?? "").replace(/\s+/g, "").toUpperCase();
  if (!s) return "";
  return /^[A-Z]\d{6}$/.test(s) ? s : null;
}

function getEmployeeIban(fullNameStr) {
  if (empCloudOn()) return empCloudFind(fullNameStr)?.iban || "";
  const map = isSharedReadOnly() ? SHARED_DATA.iban : loadEmployeeIbanMap();
  return map[normalizeKeySimple(fullNameStr)] || "";
}

function setEmployeeIban(fullNameStr, iban) {
  if (empCloudOn()) return empCloudSet(fullNameStr, { iban: iban || "" });
  const map = loadEmployeeIbanMap();
  const key = normalizeKeySimple(fullNameStr);
  if (iban) map[key] = iban;
  else delete map[key];
  saveEmployeeIbanMap(map);
}

// Empleados que no cobran la nomina: no se les pide IBAN y no suman al Total a Pagar.
const EMPLOYEE_NOPAY_STORAGE_KEY = "aguila_employee_nopay_v1";
const NO_PAY_TEXT = "No cobra";

function loadEmployeeNoPayMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMPLOYEE_NOPAY_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEmployeeNoPayMap(map) {
  try {
    localStorage.setItem(EMPLOYEE_NOPAY_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // sin almacenamiento
  }
}

function isEmployeeNoPay(fullNameStr) {
  if (empCloudOn()) return !!empCloudFind(fullNameStr)?.noPay;
  const map = isSharedReadOnly() ? SHARED_DATA.noPay : loadEmployeeNoPayMap();
  return !!map[normalizeKeySimple(fullNameStr)];
}

function setEmployeeNoPay(fullNameStr, noPay) {
  if (empCloudOn()) return empCloudSet(fullNameStr, { noPay: !!noPay });
  const map = loadEmployeeNoPayMap();
  const key = normalizeKeySimple(fullNameStr);
  if (noPay) map[key] = true;
  else delete map[key];
  saveEmployeeNoPayMap(map);
}

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
  return isSharedReadOnly() ? SHARED_DATA.customProducts : loadCustomProductsLocal();
}

function productOverridesSource() {
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
    const e = { id: safeRandomId(), name: payload.name, surname: payload.surname, rank: payload.rank || "", discord: "", iban: "", noPay: false };
    await empCloudSave(e);
    EMP_CLOUD.list.push(e);
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
    Object.assign(cur, next);
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
  const conceptInfo = byId("ticket-concept-info");

  // Lineas del ticket en el orden del catalogo (los nombres que ya no existen, al final).
  function ticketItems() {
    const all = getAllProducts();
    const items = [];
    const seen = new Set();
    for (const p of all) {
      const row = state.cart[p.name];
      if (row?.qty > 0) {
        items.push({ name: p.name, qty: row.qty, price: row.price, short: p.short || p.name, group: p.group || "" });
        seen.add(p.name);
      }
    }
    for (const [name, row] of Object.entries(state.cart)) {
      if (!seen.has(name) && row?.qty > 0) items.push({ name, qty: row.qty, price: row.price, short: name, group: "" });
    }
    return items;
  }

  const fullConcept = (items) => items.map((it) => `x${it.qty} ${it.name}`).join(" ");

  // "2xRued+Turbo GA, Rep T": cada grupo (gama, taller, grua) se escribe una vez.
  function shortConcept(items) {
    const groups = new Map();
    for (const it of items) {
      const part = it.qty > 1 ? `${it.qty}x${it.short}` : it.short;
      if (!groups.has(it.group)) groups.set(it.group, []);
      groups.get(it.group).push(part);
    }
    return [...groups.entries()].map(([g, parts]) => parts.join("+") + (g ? ` ${g}` : "")).join(", ");
  }

  // Si ni abreviado cabe, se reparte en varios cobros que si caben.
  function splitIntoCharges(items) {
    const charges = [];
    let current = [];
    for (const it of items) {
      for (let n = 0; n < it.qty; n++) {
        const unit = { ...it, qty: 1 };
        const tryItems = mergeQty([...current, unit]);
        if (current.length && shortConcept(tryItems).length > CONCEPT_MAX) {
          charges.push(mergeQty(current));
          current = [unit];
        } else {
          current.push(unit);
        }
      }
    }
    if (current.length) charges.push(mergeQty(current));
    return charges.map((list) => ({
      concept: shortConcept(list),
      total: list.reduce((a, it) => a + it.price * it.qty, 0),
    }));
  }

  function mergeQty(list) {
    const out = [];
    for (const it of list) {
      const prev = out.find((x) => x.name === it.name);
      if (prev) prev.qty += it.qty;
      else out.push({ ...it });
    }
    return out;
  }

  // Lo que copia "Copiar concepto": completo si cabe; si no, abreviado; si no, en cobros.
  function conceptPlan() {
    const items = ticketItems();
    if (!items.length) return { kind: "empty" };
    const full = fullConcept(items);
    if (full.length <= CONCEPT_MAX) return { kind: "full", text: full };
    const short = shortConcept(items);
    if (short.length <= CONCEPT_MAX) return { kind: "short", text: short };
    return { kind: "split", charges: splitIntoCharges(items) };
  }

  function renderConceptInfo() {
    if (!conceptInfo) return;
    const plan = conceptPlan();
    conceptInfo.className = "concept-info";
    if (plan.kind === "empty") {
      conceptInfo.textContent = "";
    } else if (plan.kind === "full") {
      conceptInfo.textContent = `Concepto: ${plan.text.length}/${CONCEPT_MAX} · completo`;
    } else if (plan.kind === "short") {
      conceptInfo.textContent = `Concepto: ${plan.text.length}/${CONCEPT_MAX} · abreviado (el completo no cabe en el datáfono)`;
      conceptInfo.title = plan.text;
    } else {
      conceptInfo.classList.add("is-over");
      conceptInfo.textContent = `No cabe en un cobro: se divide en ${plan.charges.length} cobros al copiar el concepto`;
    }
  }

  function openChargesDialog(charges) {
    const dlg = byId("charges-modal");
    const body = byId("charges-body");
    if (!dlg || !body) return;
    body.innerHTML = "";
    charges.forEach((c, i) => {
      const tr = document.createElement("tr");
      const tdN = document.createElement("td");
      tdN.textContent = `${i + 1} de ${charges.length}`;
      const tdC = document.createElement("td");
      tdC.textContent = c.concept;
      tdC.title = `${c.concept.length}/${CONCEPT_MAX} caracteres`;
      const tdT = document.createElement("td");
      tdT.className = "num";
      tdT.textContent = fmtMoney(c.total);
      const tdA = document.createElement("td");
      tdA.className = "num";
      const mk = (label, text) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "small";
        b.textContent = label;
        b.addEventListener("click", async () => {
          const ok = await copyText(text);
          if (!ok) openCopyFallback(text);
          tr.classList.add("is-selected");
        });
        return b;
      };
      tdA.append(mk("Copiar total", String(c.total)), document.createTextNode(" "), mk("Copiar concepto", c.concept));
      tr.append(tdN, tdC, tdT, tdA);
      body.appendChild(tr);
    });
    dlg.showModal();
  }

  // Aviso breve abajo a la derecha al anadir un producto (solo en PC).
  let toastTimer = null;
  function showAddedToast(name, price) {
    let el = byId("add-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "add-toast";
      el.className = "add-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.innerHTML = "";
    el.append("✔ Añadido ");
    const b = document.createElement("b");
    b.textContent = name;
    el.append(b, ` · ${fmtMoney(price)}`);
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 1600);
  }

  function addItemDelta(name, price, delta) {
    if (delta > 0) showAddedToast(name, price);
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
    const receiptDate = byId("receipt-date");
    if (receiptDate) {
      const d = new Date();
      const p2 = (n) => String(n).padStart(2, "0");
      receiptDate.textContent = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    }
    renderConceptInfo();
    renderQtyBadges();
    const units = Object.values(state.cart).reduce((a, r) => a + (r.qty || 0), 0);
    document.dispatchEvent(new CustomEvent("aguila-ticket", { detail: { units, total } }));
  }

  // Cuantas unidades de cada producto hay en el ticket (se ve en el movil).
  function renderQtyBadges() {
    productGrid.querySelectorAll(".product-btn").forEach((btn) => {
      const qty = state.cart[btn.dataset.name]?.qty || 0;
      const badge = btn.querySelector(".qty-badge");
      if (!badge) return;
      badge.textContent = qty ? `×${qty}` : "";
      btn.classList.toggle("in-ticket", qty > 0);
    });
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
          : state.activeCategory === "gama_vip"
            ? VIP_NOTE
            : "";
      catNoteEl.classList.toggle("cat-note-box", !!catNoteEl.textContent);
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
      button.dataset.name = product.name;
      button.innerHTML = `
        <img src="${getProductIcon(product)}" alt="${product.name}" />
        <strong>${product.name}${product.note ? `<span class="product-note">${product.note}</span>` : ""}</strong>
        <small>${fmtMoney(product.price)}</small>
        <span class="qty-badge"></span>
      `;
      button.addEventListener("click", () => addItemDelta(product.name, product.price, +1));
      button.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        addItemDelta(product.name, product.price, -1);
      });
      productGrid.appendChild(button);
    }
    renderQtyBadges();
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
    const plan = conceptPlan();
    if (plan.kind === "empty") {
      alert("El ticket esta vacio.");
      return;
    }
    if (plan.kind === "split") {
      openChargesDialog(plan.charges);
      return;
    }
    const ok = await copyText(plan.text);
    if (!ok) openCopyFallback(plan.text);
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
      img.src = getProductIcon(row);
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
          setFixedProductHidden(row.name, false, accessPassword());
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
            if (row.source === "fixed") setFixedProductHidden(row.name, true, accessPassword());
            else deleteCustomProduct(row.id, accessPassword());
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
    if (isSharedReadOnly()) {
      alert("Los productos los gestiona el encargado. Aquí se ven los publicados y no se pueden cambiar.");
      return;
    }
    const ok = await showAccessModal({
      sectionLabel: "Gestión de Productos",
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
        addCustomProduct({ name, price, image, category }, accessPassword());
      } else if (editingTarget.source === "custom") {
        const image = pendingImageDataUrl || currentEditingImage;
        updateCustomProduct(editingTarget.id, { name, price, image, category }, accessPassword());
      } else {
        const patch = { price };
        if (pendingImageDataUrl) patch.image = pendingImageDataUrl;
        setFixedProductOverride(editingTarget.originalName, patch, accessPassword());
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
  // Kits que el vendedor se vendio a si mismo (Vendedor y Comprador son la misma persona).
  const kitsSelfBySeller = {};
  for (const s of kitsSales) {
    if (!s.seller) continue;
    kitsBySeller[s.seller] = (kitsBySeller[s.seller] || 0) + (s.qty || 0);
    s.self = !!s.buyer && normalizeKeySimple(s.buyer) === normalizeKeySimple(s.seller);
    if (s.self) kitsSelfBySeller[s.seller] = (kitsSelfBySeller[s.seller] || 0) + (s.qty || 0);
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
    kitsSelfBySeller,
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
    kitsSelfBySeller: {},
    ignoredOtherBusiness: 0,
  };

  const refs = {
    input: byId("conta-input"),
    invLine1: byId("inv-line1"),
    kitsLine1: byId("kits-line1"),
    kitsLine2: byId("kits-line2"),
    kitsLine3: byId("kits-line3"),
    kitPrice: byId("kit-price"),
    kitsSelf: byId("kits-line-self"),
    loaded: byId("conta-loaded"),
    invTable: byId("inv-table"),
    salesTable: byId("sales-table"),
    totalGeneral: byId("conta-total-general"),
    totalAPagar: byId("conta-total-a-pagar"),
    footer: byId("conta-footer"),
  };

  if (refs.kitPrice) refs.kitPrice.value = getKitPrice();

  // Ranking de la semana: una fila por persona con facturas + kits, su rango,
  // lo que hay que pagarle y avisos (sin IBAN, no cobra, kits a si mismo).
  const RANK_BADGE = { "jefe aguila": "r-aguila", jefe: "r-jefe", "mano derecha": "r-jefe", subjefe: "r-subjefe", mecanico: "r-mecanico", chalan: "r-chalan", experimentado: "r-exp" };

  function renderRanking({ employees, kitPrice, invSummary, kitsSummary, totalAPagar: baseTotal }) {
    let totalAPagar = baseTotal;
    const list = byId("pg-ranking");
    if (!list) return;
    const byKey = new Map();
    const row = (name) => {
      const key = normalizeKeySimple(name);
      if (!byKey.has(key)) byKey.set(key, { name, fact: 0, kits: 0, self: 0 });
      return byKey.get(key);
    };
    for (const [name, total] of Object.entries(state.invByIssuerPaid)) row(name).fact += Number(total || 0);
    for (const [name, qty] of Object.entries(state.kitsBySeller)) {
      const r = row(name);
      r.kits += qty;
      r.self += state.kitsSelfBySeller[name] || 0;
    }
    const empByKey = new Map(employees.map((e) => [normalizeKeySimple(fullName(e)), e]));
    const rows = [...byKey.entries()].map(([key, r]) => {
      const e = empByKey.get(key);
      const name = e ? fullName(e) : r.name;
      const total = r.fact + r.kits * kitPrice;
      const pct = e ? pctForRank(e.rank) : 0;
      const payout = Math.round(total * pct);
      return { ...r, name, emp: e, rank: e?.rank || "", total, payout, noPay: isEmployeeNoPay(name), iban: getEmployeeIban(name) };
    });
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));

    const maxTotal = Math.max(1, ...rows.map((r) => r.total));
    // Empleado de la Semana (misma regla que Totales) y su bono.
    const winners = weekWinners(rows, (r) => !!r.emp);
    const top = rows.find((r) => winners.has(r));
    const bonusTotal = WEEK_BONUS * winners.size;
    totalAPagar += bonusTotal;
    if (byId("conta-total-a-pagar")) byId("conta-total-a-pagar").textContent = fmtMoney(totalAPagar);
    const kitsQty = kitsSummary.qty || 0;
    const selfQty = rows.reduce((a, r) => a + r.self, 0);
    const paying = rows.filter((r) => !r.noPay && r.payout > 0).length;

    byId("pg-kpi-fact").textContent = fmtMoney(invSummary.total + kitsSummary.total);
    byId("pg-kpi-fact-sub").textContent = rows.length ? `${invSummary.count} facturas · ${rows.length} ${rows.length === 1 ? "persona" : "personas"}` : "Sin datos";
    byId("pg-kpi-pay").textContent = fmtMoney(totalAPagar);
    byId("pg-kpi-kits").textContent = String(kitsQty);
    const kitsSub = byId("pg-kpi-kits-sub");
    kitsSub.textContent = kitsQty ? `${selfQty} a sí mismos (${Math.round((selfQty / kitsQty) * 100)}%)` : "-";
    kitsSub.classList.toggle("warn", kitsQty > 0 && selfQty / kitsQty >= 0.5);
    byId("pg-kpi-top").textContent = top ? top.name : "-";
    byId("pg-kpi-top").title = top ? top.name : "";
    byId("pg-kpi-top-sub").textContent = top ? `${fmtMoney(top.total)} facturados` : "-";
    byId("pg-total-label").textContent = paying ? `TOTAL A PAGAR · ${paying} ${paying === 1 ? "empleado" : "empleados"}` : "TOTAL A PAGAR";

    list.textContent = "";
    if (!rows.length) {
      const p = document.createElement("p");
      p.className = "muted pg-empty";
      p.textContent = "Pega el texto de Discord y pulsa Procesar para ver el ranking.";
      list.appendChild(p);
      return;
    }
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    for (const r of rows) {
      const isWinner = winners.has(r);
      const card = el("div", "pg-row" + (isWinner ? " first" : ""));
      const initials = r.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const av = el("div", "pg-av" + (r.noPay ? " np" : ""), initials);
      if (isWinner) av.appendChild(el("span", "crown", "🏆"));

      const mid = el("div", "pg-mid");
      const nameRow = el("div", "pg-name");
      nameRow.appendChild(el("span", "", r.name));
      if (r.rank) nameRow.appendChild(el("span", "pg-badge " + (RANK_BADGE[normalizeKeySimple(r.rank)] || ""), rankLabel(r.rank)));
      else nameRow.appendChild(el("span", "pg-badge w-nopay", "Sin registrar"));
      if (r.emp && r.noPay) nameRow.appendChild(el("span", "pg-badge w-nopay", "No cobra"));
      else if (r.emp && !r.iban) nameRow.appendChild(el("span", "pg-badge w-iban", "⚠ Sin IBAN"));
      if (r.kits && r.self / r.kits >= 0.5) nameRow.appendChild(el("span", "pg-badge w-self", `${r.self}/${r.kits} kits a sí mismo`));
      const bar = el("div", "pg-bar");
      const fill = el("i");
      fill.style.width = `${Math.max(2, Math.round((r.total / maxTotal) * 100))}%`;
      bar.appendChild(fill);
      const meta = [`${fmtMoney(r.total)} facturados`];
      if (r.kits) meta.push(`${r.kits} ${r.kits === 1 ? "kit" : "kits"}`);
      if (r.iban) meta.push(`IBAN ${r.iban}`);
      mid.append(nameRow, bar, el("div", "pg-meta", meta.join(" · ")));

      const amt = el("div", "pg-amt");
      if (r.noPay) {
        amt.append(el("small", "", "No cobra"), el("b", "pg-dash", "—"));
      } else if (!r.emp) {
        amt.append(el("small", "", "Sin rango"), el("b", "pg-dash", "$ 0"));
      } else {
        amt.append(el("small", "", isWinner ? "A pagar · incl. bono 🏆" : "A pagar"), el("b", "pay", fmtMoney(r.payout + (isWinner ? WEEK_BONUS : 0))));
      }
      card.append(av, mid, amt);
      list.appendChild(card);
    }

    // Sin facturar esta semana: solo tienen derecho los que no cobran.
    const billed = new Set(rows.filter((r) => r.total > 0).map((r) => normalizeKeySimple(r.name)));
    const idle = employees
      .filter((e) => !isEmployeeNoPay(fullName(e)) && !billed.has(normalizeKeySimple(fullName(e))))
      .sort(byRankThenName);
    if (idle.length) {
      const box = el("div", "pg-warn-box");
      box.appendChild(el("div", "pg-warn-head", `⚠️ Sin facturar esta semana · aplicar warn (${idle.length})`));
      const chips = el("div", "pg-warn-list");
      for (const e of idle) {
        const chip = el("span", "pg-warn-chip");
        chip.appendChild(el("b", "", fullName(e)));
        if (e.rank) chip.appendChild(el("span", "pg-badge " + (RANK_BADGE[normalizeKeySimple(e.rank)] || ""), rankLabel(e.rank)));
        chips.appendChild(chip);
      }
      box.appendChild(chips);
      list.appendChild(box);
    }
  }

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
    const selfQty = Object.values(state.kitsSelfBySeller).reduce((a, n) => a + n, 0);
    if (refs.kitsSelf) {
      refs.kitsSelf.textContent = kitsQty
        ? `A sí mismos: ${selfQty} de ${kitsQty} (${Math.round((selfQty / kitsQty) * 100)}%)`
        : "A sí mismos: -";
      refs.kitsSelf.classList.toggle("warn", kitsQty > 0 && selfQty / kitsQty >= 0.5);
    }
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
    // Quien no cobra sigue apareciendo, pero no suma al Total a Pagar.
    const pendingCell = (name, amount) => (isEmployeeNoPay(name) ? NO_PAY_TEXT : fmtMoney(amount));
    let totalAPagar = 0;
    for (const [name, total] of invEntries) {
      const rank = rankByName.get(normalizeKeySimple(name)) || "";
      const pct = pctForRank(rank);
      const pendientePago = Math.round(total * pct);
      if (!isEmployeeNoPay(name)) totalAPagar += pendientePago;
      const pctText = rank ? (pct ? `${Math.round(pct * 100)}%` : "0% (sin rango)") : "Sin registrar";
      refs.invTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${name}</td>
          <td class="num">${fmtMoney(total)}</td>
          <td class="num">${pctText}</td>
          <td class="num">${pendingCell(name, pendientePago)}</td>
        </tr>`
      );
    }

    refs.salesTable.innerHTML = "";
    const kitEntries = Object.entries(state.kitsBySeller).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    // "9 (75%)": kits que se vendio a si mismo; en naranja si es la mitad o mas.
    const selfCell = (name, qty) => {
      const n = state.kitsSelfBySeller[name] || 0;
      if (!n) return "0";
      const pct = Math.round((n / qty) * 100);
      return `<span class="${pct >= 50 ? "warn" : ""}">${n} (${pct}%)</span>`;
    };
    for (const [name, qty] of kitEntries) {
      const rank = rankByName.get(normalizeKeySimple(name)) || "";
      const pct = pctForRank(rank);
      const kitsValue = qty * kitPrice;
      const pendientePago = Math.round(kitsValue * pct);
      if (!isEmployeeNoPay(name)) totalAPagar += pendientePago;
      const pctText = rank ? (pct ? `${Math.round(pct * 100)}%` : "0% (sin rango)") : "Sin registrar";
      refs.salesTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${name}</td>
          <td class="num">${qty}</td>
          <td class="num">${selfCell(name, qty)}</td>
          <td class="num">${pctText}</td>
          <td class="num">${pendingCell(name, pendientePago)}</td>
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
    renderRanking({ employees, kitPrice, invSummary, kitsSummary, totalAPagar });
  }

  function clearState() {
    state.invoices = {};
    state.kitsSales = [];
    state.invByIssuer = {};
    state.invByIssuerPaid = {};
    state.invByIssuerPending = {};
    state.kitsBySeller = {};
    state.kitsSelfBySeller = {};
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
    state.kitsSelfBySeller = out.kitsSelfBySeller || {};
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

  setupEmployeesModal(state, refresh);
  clearState();
}

function setupEmployeesModal(state, refreshPagos) {
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
      const kitsSelf = sumByNormalizedName(state.kitsSelfBySeller, name);
      const kitsValue = kitsUnits * kitPrice;
      const gross = paid + kitsValue;
      const pct = pctForRank(e.rank);
      const payout = Math.round(gross * pct);
      return { id: e.id, name, rank: e.rank || "", pct, gross, payout, discord: getEmployeeDiscord(name), iban: getEmployeeIban(name), noPay: isEmployeeNoPay(name), kitsUnits, kitsSelf };
    });
    // Empleado de la Semana: se decide aqui (con lo que cobra sin bono) y se le suma el bono.
    const winners = weekWinners(totalsRows);
    const hasData = totalsRows.some((r) => r.gross > 0);
    for (const r of totalsRows) {
      r.warn = hasData && !r.noPay && r.gross === 0;
      r.base = r.payout;
      r.week = winners.has(r);
      r.bonus = r.week ? WEEK_BONUS : 0;
      r.payout = r.base + r.bonus;
    }
    // Mismo orden que la plantilla (por rango): asi sale tambien al copiar para las pagas.
    totalsRows.sort((a, b) => rankOrder(b.rank) - rankOrder(a.rank) || a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }

  function renderTotalsRows() {
    totalsBody.innerHTML = "";
    for (const row of totalsRows) {
      const tr = document.createElement("tr");
      if (row.id === selectedId) tr.classList.add("is-selected");
      tr.innerHTML = `
        <td>${row.name}${row.warn ? `<br><small class="warn">⚠️ Aplicar warn (no facturó)</small>` : ""}${row.kitsSelf ? `<br><small class="${row.kitsSelf / row.kitsUnits >= 0.5 ? "warn" : "muted"}">Kits a sí mismo: ${row.kitsSelf} de ${row.kitsUnits}</small>` : ""}</td>
        <td>${row.rank ? rankLabel(row.rank) : "-"}</td>
        <td class="num">${row.pct ? Math.round(row.pct * 100) + "%" : "-"}</td>
        <td class="num">${fmtMoney(row.gross)}</td>
        <td class="num">${row.noPay ? `<span class="muted" title="Le corresponderían ${fmtMoney(row.payout)}">${NO_PAY_TEXT}</span>` : fmtMoney(row.payout)}${row.bonus ? `<br><small class="ok">🏆 incluye bono ${fmtBonus(row.bonus)}</small>` : ""}</td>
      `;
      tr.addEventListener("click", () => {
        selectedId = row.id;
        renderTotalsRows();
      });
      tr.addEventListener("dblclick", async () => {
        const text = row.noPay ? NO_PAY_TEXT : String(row.payout);
        const ok = await copyText(text);
        if (!ok) openCopyFallback(text);
      });
      totalsBody.appendChild(tr);
    }
    byId("employees-bank-total").textContent = `Total a retirar: ${fmtMoney(bankTotalOf(totalsRows))}`;
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

  // Quien mas cobra en la lista es el empleado de la semana (si hay empate, todos).
  // El Jefe Aguila (100 %) no compite: si no, lo ganaria siempre.
  // Se decide al armar los totales (ver weekWinners): quitar a alguien de la lista no cambia al ganador.
  function isEmployeeOfWeek(row) {
    return !!row.week;
  }

  // "Nombre (Rango) <@ID>": el nombre de rol se mantiene y, si tiene Discord, se le etiqueta.
  function labelForCopy(row) {
    let label = row.rank ? `${row.name} (${rankLabel(row.rank)})` : row.name;
    if (row.discord) label += ` <@${row.discord}>`;
    return label;
  }

  const ibanForCopy = (row) => (row.iban ? `IBAN ${row.iban}` : IBAN_PENDING_TEXT);

  byId("employees-copy-sel").addEventListener("click", async () => {
    const row = totalsRows.find((r) => r.id === selectedId);
    if (!row) return;
    const name = labelForCopy(row);
    const pctTxt = row.pct ? `${Math.round(row.pct * 100)}%` : "-";
    let text = row.noPay
      ? `${name} | ${pctTxt} | Bruto: ${fmtMoney(row.gross)} | ${NO_PAY_TEXT}`
      : `${name} | ${pctTxt} | Bruto: ${fmtMoney(row.gross)} | A pagar: ${fmtMoney(row.payout)}${row.bonus ? ` (incluye Bono por Empleado de la Semana de ${fmtBonus(row.bonus)})` : ""} | ${ibanForCopy(row)}`;
    if (isEmployeeOfWeek(row)) text += ` | ${EMPLOYEE_OF_WEEK_TAG}`;

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

  // Suma solo a quien sigue en la lista y cobra (los "No cobra" no cuentan).
  function bankTotalOf(rows) {
    return rows.reduce((acc, r) => acc + (r.noPay ? 0 : r.payout), 0);
  }

  // Texto para el canal de pagas (el mismo de "Copiar todo").
  function discordPayText(rows = totalsRows) {
    const lines = rows
      .map((r) => {
        let line = r.noPay
          ? `* ${labelForCopy(r)}: ${NO_PAY_TEXT}`
          : `* ${labelForCopy(r)}: ${fmtMoneyPlain(r.payout)} · ${ibanForCopy(r)}`;
        if (isEmployeeOfWeek(r)) line += ` ${EMPLOYEE_OF_WEEK_TAG}`;
        if (r.warn) line += ` ${WARN_TEXT}`;
        if (r.bonus && !r.noPay) line += `\n  ↳ 🏆 Incluye bono de Empleado de la Semana: ${fmtMoneyPlain(r.bonus)}`;
        return line;
      })
      .join("\n");
    const paying = rows.filter((r) => !r.noPay && r.payout > 0).length;
    const bonusN = rows.filter((r) => r.bonus && !r.noPay).length;
    const bonusTxt = bonusN ? ` · incluye Bono por Empleado de la Semana de ${fmtBonus(WEEK_BONUS)}${bonusN > 1 ? ` (x${bonusN})` : ""}` : "";
    const total = `**Total a retirar de la cuenta de la empresa: ${fmtMoney(bankTotalOf(rows))}** (${paying} ${paying === 1 ? "empleado" : "empleados"} a pagar${bonusTxt})`;
    return `${lines}\n\n${total}`;
  }

  byId("employees-copy-all").addEventListener("click", async () => {
    if (!totalsRows.length) {
      return;
    }
    const text = discordPayText();
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
  });

  // Boton del panel de Pagos: arma los totales sin abrir la ventana y copia.
  byId("pg-copy-discord")?.addEventListener("click", async () => {
    const status = byId("pg-copy-status");
    try {
      await buildTotalsRows();
    } catch {
      alert("No se pudieron cargar los empleados.");
      return;
    }
    if (!totalsRows.length) {
      alert("No hay empleados en la lista. Entra en 'Gestión de empleados' para añadirlos.");
      return;
    }
    // Los marcados como "No cobra" no salen en el mensaje de pagas.
    const rows = totalsRows.filter((r) => !r.noPay);
    const skipped = totalsRows.length - rows.length;
    if (!rows.length) {
      alert("Todos los empleados están marcados como «No cobra»: no hay nada que copiar.");
      return;
    }
    const text = discordPayText(rows);
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    if (status) {
      status.textContent = ok
        ? `✔ Copiado: ${rows.length} empleados · Total a retirar ${fmtMoney(bankTotalOf(rows))}` +
          (skipped ? ` · ${skipped} «No cobra» fuera de la lista` : "") +
          ". Pégalo en el canal de pagas."
        : "";
      setTimeout(() => (status.textContent = ""), 4000);
    }
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
      // Rango, Discord, IBAN o "No cobra" cambian lo que muestra Pagos.
      await refreshPagos?.();
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
  const discordInput = byId("emp-new-discord");
  const ibanInput = byId("emp-new-iban");

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

  // Solo lectura: con empleados en linea y sin sesion de encargado, o con
  // datos.js publicado y sin modo encargado. Se recalcula al abrir y al
  // iniciar / cerrar sesion.
  let readOnly = false;
  const roNote = byId("emp-readonly-note");
  function applyMode() {
    readOnly = !hasAccess() || (!empCloudOn() && isSharedReadOnly());
    unlocked = !readOnly;
    adminPass = unlocked ? "jefe" : "";
    nameInput?.closest(".admin-block")?.toggleAttribute("hidden", readOnly);
    passInput?.closest(".admin-block")?.toggleAttribute("hidden", true); // ya no hay contrasena
    if (roNote) {
      roNote.hidden = !readOnly;
      roNote.textContent = empCloudOn()
        ? "Empleados en línea. Solo los Jefes pueden cambiarlos."
        : `Empleados publicados por el encargado${SHARED_DATA?.publishedAt ? " el " + SHARED_DATA.publishedAt : ""}. Aquí solo se pueden ver.`;
    }
    const logged = hasAccess();
    const dot = byId("emp-cloud-dot");
    const txt = byId("emp-cloud-text");
    if (dot && txt) {
      if (empCloudOn()) {
        dot.className = "cv-dot is-on";
        txt.textContent = `En línea · ${EMP_CLOUD.list.length} empleados` + (logged ? ` · Jefe: ${AUTH.name} (los cambios se guardan al momento)` : "");
      } else if (EMP_CLOUD.ok) {
        dot.className = "cv-dot";
        txt.textContent = logged
          ? "La base en línea está lista pero vacía: sube los empleados para empezar a usarla."
          : "La base en línea está lista pero vacía. Inicia sesión de encargado para subir los empleados.";
      } else {
        dot.className = "cv-dot is-off";
        txt.textContent = EMP_CLOUD.tried ? `${EMP_CLOUD.error} Se usan datos.js / esta PC.` : "Conectando…";
      }
    }
    byId("emp-cloud-login")?.toggleAttribute("hidden", true);

    // Desplegable de alta: nombres visibles; los rangos altos solo para el Jefe Aguila.
    if (rankInput) {
      const cur = rankInput.value;
      rankInput.innerHTML = "";
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Sin rango";
      rankInput.appendChild(blank);
      for (const r of RANKS.slice().reverse()) {
        if (isTopRank(r.label) && !AUTH.aguila) continue;
        const opt = document.createElement("option");
        opt.value = r.label;
        opt.textContent = `${rankLabel(r.label)} (${Math.round(r.pct * 100)}%)`;
        rankInput.appendChild(opt);
      }
      rankInput.value = [...rankInput.options].some((o) => o.value === cur) ? cur : "";
    }

    // Nombres de los rangos: solo el Jefe Aguila.
    const namesBox = byId("emp-rank-names");
    if (namesBox) {
      namesBox.hidden = !(AUTH.aguila && !readOnly);
      const grid = byId("emp-rank-names-grid");
      if (!namesBox.hidden && grid && !grid.dataset.built) {
        grid.dataset.built = "1";
        for (const r of RANKS.slice().reverse()) {
          const lab = document.createElement("label");
          lab.textContent = `${r.label} (${Math.round(r.pct * 100)}%)`;
          const inp = document.createElement("input");
          inp.className = "text-input";
          inp.dataset.rank = r.label;
          inp.maxLength = 30;
          inp.placeholder = r.label;
          lab.appendChild(inp);
          grid.appendChild(lab);
        }
      }
      grid?.querySelectorAll("input[data-rank]").forEach((inp) => {
        if (document.activeElement !== inp) inp.value = RANK_NAMES[inp.dataset.rank] || "";
      });
    }
    byId("emp-cloud-migrate")?.toggleAttribute("hidden", !(EMP_CLOUD.ok && logged && !EMP_CLOUD.list.length));
  }

  byId("emp-cloud-login")?.addEventListener("click", openLoginDialog);

  byId("emp-rank-names-save")?.addEventListener("click", async () => {
    if (!AUTH.aguila) return;
    const map = {};
    byId("emp-rank-names-grid").querySelectorAll("input[data-rank]").forEach((inp) => {
      const v = inp.value.replace(/\s+/g, " ").trim();
      if (v && v !== inp.dataset.rank) map[inp.dataset.rank] = v;
    });
    const btn = byId("emp-rank-names-save");
    btn.disabled = true;
    try {
      await saveRankNames(map);
      setStatus("✔ Nombres de los rangos guardados. Se ven en toda la página y al copiar las pagas.", true);
      await refresh();
      await (onChanged?.());
    } catch (err) {
      alert(`No se pudieron guardar: ${err.message || err}`);
    } finally {
      btn.disabled = false;
    }
  });

  // Primera vez: copia a la base en linea los empleados que se ven ahora (datos.js o esta PC).
  byId("emp-cloud-migrate")?.addEventListener("click", async () => {
    const btn = byId("emp-cloud-migrate");
    try {
      // Los de esta PC (modo encargado) si los hay; si no, los publicados en datos.js.
      let src = [];
      if (!isSharedReadOnly()) {
        const dMap = loadEmployeeDiscordMap();
        const iMap = loadEmployeeIbanMap();
        const nMap = loadEmployeeNoPayMap();
        const k = (e) => normalizeKeySimple(fullName(e));
        src = loadEmployeesLocal().map((e) => ({ ...e, discord: dMap[k(e)] || "", iban: iMap[k(e)] || "", noPay: !!nMap[k(e)] }));
        const api = await waitPyApi();
        if (api && typeof api.emp_list === "function") {
          try {
            const data = await api.emp_list();
            const arr = Array.isArray(data) ? data : Array.isArray(data?.employees) ? data.employees : [];
            if (arr.length) src = arr.map((e) => ({ ...e, discord: dMap[k(e)] || "", iban: iMap[k(e)] || "", noPay: !!nMap[k(e)] }));
          } catch {
            // se queda con lo guardado en el navegador
          }
        }
      }
      let from = "de esta PC";
      if (!src.length && SHARED_DATA?.employees?.length) {
        src = SHARED_DATA.employees.map((e) => ({ ...e }));
        from = `publicados en datos.js${SHARED_DATA.publishedAt ? " (" + SHARED_DATA.publishedAt + ")" : ""}`;
      }
      if (!src.length) {
        alert("No hay empleados que subir.");
        return;
      }
      if (!confirm(`¿Subir ${src.length} empleados ${from} (con rango, Discord, IBAN y No cobra) a la base en línea?`)) return;
      btn.disabled = true;
      const rows = src
        .filter((e) => String(e.name || "").trim() && String(e.surname || "").trim())
        .map((e) =>
          empCloudRow({
            id: safeRandomId(),
            name: String(e.name || "").trim(),
            surname: String(e.surname || "").trim(),
            rank: e.rank || "",
            discord: e.discord || "",
            iban: e.iban || "",
            noPay: !!e.noPay,
          })
        );
      empCloudRequireSession();
      await cvCloud.upsert("employees", rows, "id");
      await refresh();
      await (onChanged?.());
      setStatus(`☁️ ${rows.length} empleados subidos. Ya están en línea para todos.`, true);
    } catch (err) {
      alert(`No se pudieron subir: ${err.message || err}`);
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener("aguila-auth", async () => {
    await refresh();
    await (onChanged?.());
  });

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
        <td><input class="text-input emp-discord-input" type="text" inputmode="numeric" placeholder="ID de Discord" title="ID de Discord: clic derecho sobre la persona → Copiar ID de usuario" /></td>
        <td><input class="text-input emp-iban-input" type="text" placeholder="J000000" maxlength="9" title="IBAN del banco del servidor (una letra y 6 números)" /></td>
        <td class="center"><input class="emp-nopay-input" type="checkbox" title="No cobra la nómina: no se le pide IBAN y no suma al Total a Pagar" /></td>
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
      for (const r of RANKS.slice().reverse()) {
        const opt = document.createElement("option");
        opt.value = r.label;
        opt.textContent = `${rankLabel(r.label)} (${Math.round(r.pct * 100)}%)`;
        // Solo el Jefe Aguila reparte los rangos altos.
        if (isTopRank(r.label) && !AUTH.aguila) opt.disabled = true;
        select.appendChild(opt);
      }
      select.value = e.rank || "";
      const locked = isTopRank(e.rank) && !AUTH.aguila;
      if (locked) {
        select.disabled = true;
        select.title = "Solo el Jefe Aguila puede cambiar este rango";
        tr.classList.add("emp-locked");
      }

      const dInput = tr.querySelector(".emp-discord-input");
      dInput.value = getEmployeeDiscord(full);
      const iInput = tr.querySelector(".emp-iban-input");
      iInput.value = getEmployeeIban(full);
      const npInput = tr.querySelector(".emp-nopay-input");
      npInput.checked = isEmployeeNoPay(full);
      // "No cobra" solo lo cambia el Jefe Aguila (tambien lo exige la base).
      if (!AUTH.aguila) {
        npInput.disabled = true;
        npInput.title = "Solo el Jefe Aguila puede cambiar quién cobra";
      }
      npInput.addEventListener("change", async () => {
        if (readOnly) return;
        if (!AUTH.aguila) {
          npInput.checked = isEmployeeNoPay(full);
          return;
        }
        if (!unlocked) {
          alert("Primero desbloquea con la contrasena.");
          npInput.checked = isEmployeeNoPay(full);
          return;
        }
        setEmployeeNoPay(full, npInput.checked);
        await (onChanged?.());
      });
      if (locked) {
        dInput.readOnly = true; // cambiar su Discord le daria el acceso a otra persona
        dInput.title = "Solo el Jefe Aguila puede cambiar el Discord de este rango";
        tr.querySelector("button[data-del]")?.remove();
      }
      if (readOnly) {
        npInput.disabled = true;
        select.disabled = true;
        dInput.readOnly = true;
        iInput.readOnly = true;
        tr.querySelector("button[data-del]")?.remove();
      }
      dInput.addEventListener("change", async () => {
        if (readOnly || locked) return;
        if (!unlocked) {
          alert("Primero desbloquea con la contrasena.");
          dInput.value = getEmployeeDiscord(full);
          return;
        }
        const id = parseDiscordId(dInput.value);
        if (id === null) {
          dInput.classList.add("is-bad");
          alert("Eso no parece un ID de Discord. Es un numero de 17 a 20 cifras (clic derecho sobre la persona → Copiar ID de usuario).");
          dInput.value = getEmployeeDiscord(full);
          dInput.classList.remove("is-bad");
          return;
        }
        setEmployeeDiscord(full, id);
        dInput.value = id;
        await (onChanged?.());
      });
      iInput.addEventListener("change", async () => {
        if (readOnly) return;
        if (!unlocked) {
          alert("Primero desbloquea con la contrasena.");
          iInput.value = getEmployeeIban(full);
          return;
        }
        const iban = parseIban(iInput.value);
        if (iban === null) {
          alert("El IBAN no es valido. Es una letra y 6 numeros, como J739745 (sale en el banco, en Informaciones).");
          iInput.value = getEmployeeIban(full);
          return;
        }
        setEmployeeIban(full, iban);
        iInput.value = iban;
        await (onChanged?.());
      });
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
        if (!AUTH.aguila && (isTopRank(emp?.rank) || isTopRank(newRank))) {
          alert(`Solo el Jefe Aguila puede dar o quitar los rangos ${TOP_RANKS.map(rankLabel).join(", ")}.`);
          select.value = emp?.rank || "";
          return;
        }
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
        if (emp && isTopRank(emp.rank) && !AUTH.aguila) {
          alert("Solo el Jefe Aguila puede quitar a alguien con ese rango.");
          return;
        }
        const label = emp ? `${emp.name} ${emp.surname}` : `ID ${id}`;
        if (!confirm(`Eliminar a ${label}?`)) return;
        try {
          await deleteEmployee(id, adminPass);
          if (emp) {
            setEmployeeDiscord(fullName(emp), "");
            setEmployeeIban(fullName(emp), "");
            setEmployeeNoPay(fullName(emp), false);
          }
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
      if (EMP_CLOUD.tried) await empCloudLoad();
      applyMode();
      employees = await listEmployees();
      employees.sort(byRankThenName);
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
    if (!unlockAccess(p)) {
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
    const discord = parseDiscordId(discordInput?.value);
    const iban = parseIban(ibanInput?.value);

    if (!name || !surname) {
      alert("Pon Nombre y Apellido.");
      return;
    }
    if (discord === null) {
      alert("El ID de Discord no es valido. Es un numero de 17 a 20 cifras (o dejalo vacio).");
      return;
    }
    if (iban === null) {
      alert("El IBAN no es valido. Es una letra y 6 numeros, como J739745 (o dejalo vacio).");
      return;
    }
    if (!unlocked) {
      alert("Primero desbloquea con la contrasena.");
      return;
    }
    if (isTopRank(rank) && !AUTH.aguila) {
      alert(`Solo el Jefe Aguila puede dar el rango ${rankLabel(rank)}.`);
      return;
    }
    try {
      await addEmployee({ name, surname, rank }, adminPass);
      if (discord) setEmployeeDiscord(`${name} ${surname}`, discord);
      if (discordInput) discordInput.value = "";
      if (iban) setEmployeeIban(`${name} ${surname}`, iban);
      if (ibanInput) ibanInput.value = "";
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
// Modulo de Almacen: retirado en la version 21 porque el log copiado de Discord
// no trae bien quien mueve el almacen. Esta guardado completo en la rama
// "idea-almacen" del repositorio (ver README → Ideas guardadas).
// ============================================================================

// ============================================================================
// Modulo de Sorteo
// ----------------------------------------------------------------------------
// Se pegan las facturas del datafono. Una factura vale para el sorteo si:
//   1) tiene nombre del comprador (Cliente), 2) el concepto lleva "sorteo" y
//   3) no es venta a si mismo (Cliente distinto del Cobrador).
// Los boletos salen del monto (1 cada X $) o 1 por factura. Al sortear el primer
// premio se "sella" la lista (huella SHA-256) y cada premio sale al azar segun
// los boletos de cada persona. Todo queda guardado en el navegador.
// ============================================================================
const SORTEO_STORAGE_KEY = "aguila_sorteo_v1";
const SORTEO_ICONS = ["💎", "⭐", "🚗", "🏍️", "🚛", "✈️", "🔧", "🎨", "🚀", "🌈", "🎁", "💰", "🛞", "🏆"];
const SORTEO_DEFAULT_PRIZES = [
  { icon: "💎", name: "Coche VIP" },
  { icon: "⭐", name: "Coche Prime" },
  { icon: "🚗", name: "Coche del concesionario" },
];

function sorteoEmptyState() {
  return {
    text: "",
    mode: "amount",
    price: 1000,
    from: "",
    to: "",
    noStaff: false,
    oneEach: true,
    prizes: SORTEO_DEFAULT_PRIZES.map((p) => ({ ...p, winner: null })),
    seal: null, // { hash, tickets, people, at }
  };
}

function sorteoLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(SORTEO_STORAGE_KEY) || "null");
    if (raw && Array.isArray(raw.prizes)) return { ...sorteoEmptyState(), ...raw };
  } catch {
    // sin almacenamiento
  }
  return sorteoEmptyState();
}

function sorteoSave(st) {
  try {
    localStorage.setItem(SORTEO_STORAGE_KEY, JSON.stringify(st));
  } catch {
    // sin almacenamiento
  }
}

// "13/10/2026 19:02" o "2026-10-13 01:17:30" -> "2026-10-13" (o "" si no hay fecha)
function sorteoIsoDay(text) {
  const t = String(text || "");
  let m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

// Numero al azar seguro en [0, n)
function sorteoRandomInt(n) {
  try {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

function setupSorteo() {
  const root = byId("tab-sorteo");
  if (!root) return;
  let st = sorteoLoad();
  let staffKeys = new Set();
  let result = { valid: [], bad: [], people: [] };
  let lastWinnerIdx = -1;

  const $ = (id) => byId(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const initials = (name) => String(name).split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace(".", ",") : "0") + " %";
  const shortHash = (h) => (h ? `${h.slice(0, 4)}…${h.slice(-4)}` : "");

  // ---------- subpestanas ----------
  function showPane(id) {
    root.querySelectorAll(".sx-subtab").forEach((b) => b.classList.toggle("is-active", b.dataset.sx === id));
    root.querySelectorAll(".sx-pane").forEach((p) => p.classList.toggle("is-active", p.id === id));
  }
  root.querySelectorAll(".sx-subtab").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.sx)));

  // ---------- ajustes ----------
  $("sx-input").value = st.text || "";
  $("sx-mode").value = st.mode;
  $("sx-price").value = st.price;
  $("sx-from").value = st.from;
  $("sx-to").value = st.to;
  $("sx-no-staff").checked = !!st.noStaff;
  $("sx-one-each").checked = st.oneEach !== false;
  for (const ic of SORTEO_ICONS) $("sx-new-icon").appendChild(new Option(ic, ic));

  function readSettings() {
    st.mode = $("sx-mode").value;
    st.price = Math.max(1, Math.floor(Number($("sx-price").value) || 1000));
    st.from = $("sx-from").value;
    st.to = $("sx-to").value;
    st.noStaff = $("sx-no-staff").checked;
    st.oneEach = $("sx-one-each").checked;
    $("sx-price-wrap").hidden = st.mode !== "amount";
  }

  // ---------- reglas ----------
  function evaluate() {
    readSettings();
    const valid = [];
    const bad = [];
    if (st.text.trim()) {
      const out = processText(st.text);
      for (const inv of Object.values(out.invoices)) {
        if (inv.amount == null) continue;
        if (inv.method !== "datafono" && !inv.paid_at) continue; // factura antigua sin pagar
        const buyer = String(inv.recipient || "").trim();
        const seller = String(inv.issuer || "").trim();
        const concept = String(inv.concept || "");
        const day = sorteoIsoDay(inv.paid_at || inv.sent_at);
        const base = { amount: inv.amount, buyer, seller, concept, when: inv.paid_at && inv.paid_at !== "OK" ? inv.paid_at : inv.sent_at || "" };
        let reason = "";
        if (!buyer) reason = "Sin comprador";
        else if (!normalizeKeySimple(concept).includes("sorteo")) reason = "Sin «sorteo»";
        else if (seller && normalizeKeySimple(buyer) === normalizeKeySimple(seller)) reason = "Venta a sí mismo";
        else if (st.noStaff && staffKeys.has(normalizeKeySimple(buyer))) reason = "Empleado del taller";
        else if ((st.from && day && day < st.from) || (st.to && day && day > st.to)) reason = "Fuera de fecha";
        const tickets = st.mode === "amount" ? Math.floor(inv.amount / st.price) : 1;
        if (!reason && tickets < 1) reason = "Menos de 1 boleto";
        if (reason) bad.push({ ...base, reason });
        else valid.push({ ...base, tickets });
      }
    }
    const map = new Map();
    for (const v of valid) {
      const key = normalizeKeySimple(v.buyer);
      if (!map.has(key)) map.set(key, { key, name: v.buyer, tickets: 0, invoices: 0, amount: 0 });
      const p = map.get(key);
      p.tickets += v.tickets;
      p.invoices += 1;
      p.amount += v.amount;
    }
    const people = [...map.values()].sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name, "es"));
    result = { valid, bad, people };
  }

  // ---------- paso 1 ----------
  function renderParticipants() {
    const { valid, bad, people } = result;
    const total = people.reduce((a, p) => a + p.tickets, 0);
    $("sx-k-valid").textContent = String(valid.length);
    $("sx-k-tickets").textContent = String(total);
    $("sx-k-people").textContent = String(people.length);
    $("sx-k-bad").textContent = String(bad.length);
    $("sx-rule-note").textContent = st.mode === "amount" ? `1 boleto cada ${fmtMoney(st.price)}` : "1 boleto por factura";

    const list = $("sx-people");
    list.textContent = "";
    if (!people.length) {
      list.appendChild(el("p", "muted pg-empty", st.text.trim() ? "Ninguna factura cumple las reglas." : "Pega las facturas del sorteo y pulsa Procesar."));
    }
    const max = Math.max(1, ...people.map((p) => p.tickets));
    for (const p of people) {
      const row = el("div", "sx-row");
      const mid = el("div", "sx-mid");
      mid.appendChild(el("b", "", p.name));
      const bar = el("div", "pg-bar");
      const fill = el("i");
      fill.style.width = `${Math.max(3, Math.round((p.tickets / max) * 100))}%`;
      bar.appendChild(fill);
      mid.append(bar, el("div", "pg-meta", `${p.invoices} ${p.invoices === 1 ? "factura" : "facturas"} · ${fmtMoney(p.amount)}`));
      const tk = el("div", "sx-tk", String(p.tickets));
      tk.appendChild(el("small", "", p.tickets === 1 ? "boleto" : "boletos"));
      row.append(el("div", "pg-av", initials(p.name)), mid, tk, el("div", "sx-pc", pct(p.tickets, total)));
      list.appendChild(row);
    }

    const badEl = $("sx-bad");
    badEl.textContent = "";
    if (!bad.length) badEl.appendChild(el("p", "muted", "Ninguna."));
    const chip = { "Venta a sí mismo": "w-self", "Sin «sorteo»": "w-iban", "Sin comprador": "w-nopay" };
    for (const b of bad) {
      const row = el("div", "sx-bad");
      const txt = el("span");
      txt.append(`${fmtMoney(b.amount)} · Cobrador `, el("b", "", b.seller || "—"), " → Cliente ", el("b", "", b.buyer || "—"));
      if (b.concept) txt.append(` · «${b.concept}»`);
      row.append(txt, el("span", "pg-badge " + (chip[b.reason] || "w-nopay"), b.reason), el("span", "muted", b.when || ""));
      badEl.appendChild(row);
    }
  }

  // ---------- bombo ----------
  function winnersKeys() {
    return new Set(st.prizes.filter((p) => p.winner).map((p) => normalizeKeySimple(p.winner.name)));
  }

  function currentPool() {
    const won = st.oneEach ? winnersKeys() : new Set();
    return result.people.filter((p) => !won.has(p.key));
  }

  function sealText() {
    const lines = result.people.map((p) => `${p.key}:${p.tickets}`).sort().join("|");
    return `${lines}#${st.mode}:${st.price}`;
  }

  // ---------- paso 2 ----------
  function nextPrizeIndex() {
    return st.prizes.findIndex((p) => !p.winner);
  }

  function renderPrizes() {
    const box = $("sx-prizes");
    box.textContent = "";
    const done = st.prizes.filter((p) => p.winner).length;
    const next = nextPrizeIndex();
    st.prizes.forEach((p, i) => {
      const row = el("div", "sx-pz" + (p.winner ? " done" : "") + (i === lastWinnerIdx ? " now" : "") + (i === next && lastWinnerIdx < 0 ? " next" : ""));
      row.appendChild(el("div", "ico", p.icon || "🎁"));
      const mid = el("div", "sx-mid");
      mid.appendChild(el("b", "", p.name));
      mid.appendChild(el("small", "", p.winner ? `${p.winner.tickets} ${p.winner.tickets === 1 ? "boleto" : "boletos"} · ${p.winner.odds}` : i === next ? "Siguiente" : "Pendiente"));
      row.appendChild(mid);
      const who = el("div", "who");
      if (p.winner) {
        who.appendChild(el("b", "", (i === lastWinnerIdx ? "🏆 " : "") + p.winner.name));
      } else if (!st.seal) {
        const tools = el("div", "sx-tools");
        const mk = (label, title, fn) => {
          const b = el("button", "ghost small", label);
          b.type = "button";
          b.title = title;
          b.addEventListener("click", fn);
          return b;
        };
        if (i > 0) tools.appendChild(mk("↑", "Subir", () => { [st.prizes[i - 1], st.prizes[i]] = [st.prizes[i], st.prizes[i - 1]]; sorteoSave(st); renderLive(); }));
        if (i < st.prizes.length - 1) tools.appendChild(mk("↓", "Bajar", () => { [st.prizes[i + 1], st.prizes[i]] = [st.prizes[i], st.prizes[i + 1]]; sorteoSave(st); renderLive(); }));
        tools.appendChild(mk("✕", "Quitar", () => { st.prizes.splice(i, 1); sorteoSave(st); renderLive(); }));
        who.appendChild(tools);
      } else {
        who.appendChild(el("span", "muted", "Pendiente"));
      }
      row.appendChild(who);
      box.appendChild(row);
    });
    if (!st.prizes.length) box.appendChild(el("p", "muted pg-empty", "Añade los premios en el orden en que se sortean."));
    $("sx-prog-text").textContent = `${done} de ${st.prizes.length} premios sorteados`;
    $("sx-prog-bar").style.width = st.prizes.length ? `${Math.round((done / st.prizes.length) * 100)}%` : "0%";
    const pool = currentPool();
    $("sx-pool-text").textContent = `${pool.reduce((a, p) => a + p.tickets, 0)} boletos en el bombo`;
    root.querySelector(".sx-add").hidden = !!st.seal;
  }

  function renderStage() {
    const next = nextPrizeIndex();
    const total = st.prizes.length;
    const last = lastWinnerIdx >= 0 ? st.prizes[lastWinnerIdx] : null;
    const shown = last || (next >= 0 ? st.prizes[next] : null);
    $("sx-stage-tag").textContent = shown ? `PREMIO ${st.prizes.indexOf(shown) + 1} DE ${total}` : total ? "SORTEO TERMINADO" : "SORTEO";
    $("sx-stage-title").textContent = shown ? `${shown.icon || "🎁"} ${shown.name}` : total ? "¡Todos los premios sorteados!" : "Añade los premios";
    const btn = $("sx-draw");
    const pool = currentPool();
    if (next < 0) {
      btn.disabled = true;
      btn.textContent = total ? "✔ Sorteo terminado" : "🎰 Sortear";
    } else {
      btn.disabled = !pool.length;
      btn.textContent = pool.length ? `🎰 Sortear: ${st.prizes[next].icon || "🎁"} ${st.prizes[next].name}` : "No hay participantes en el bombo";
    }
    if (!last) {
      $("sx-odds").textContent = pool.length ? `${pool.length} participantes · ${pool.reduce((a, p) => a + p.tickets, 0)} boletos en el bombo` : "Procesa las facturas en «1 · Participantes».";
      if (!$("sx-reel").children.length) fillReelIdle();
    }
    $("sx-seal").textContent = st.seal
      ? `🔒 Lista sellada · huella ${shortHash(st.seal.hash)} · ${st.seal.tickets} boletos · ${st.seal.people} participantes · ${st.seal.at}`
      : "La lista se sella al sortear el primer premio.";
  }

  function fillReelIdle() {
    const ul = $("sx-reel");
    ul.style.transition = "none";
    ul.style.transform = "translateY(0)";
    ul.textContent = "";
    const names = result.people.map((p) => p.name);
    const show = names.length ? names : ["—", "—", "—"];
    for (let i = 0; i < 3; i++) ul.appendChild(el("li", "", show[i % show.length]));
  }

  function discordText() {
    const done = st.prizes.filter((p) => p.winner);
    const lines = [
      "# 🎉 AGUILA MOTORS · ¡GANADORES DEL SORTEO! 🎉",
      "> *Tu vehículo, nuestra pasión*",
      "",
      "## 🏆 PREMIOS",
    ];
    for (const p of st.prizes) {
      lines.push(p.winner ? `${p.icon || "🎁"} **${p.name}** → **${p.winner.name}**` : `${p.icon || "🎁"} ${p.name} → *por sortear…*`);
    }
    lines.push("");
    if (st.seal) lines.push(`-# 🎟️ ${st.seal.tickets} boletos · ${st.seal.people} participantes · 🔒 Huella de la lista: ${shortHash(st.seal.hash)}`);
    if (done.length) lines.push("Pasad por el taller para recoger vuestro premio 🔧");
    return lines.join("\n");
  }

  function renderDiscord() {
    $("sx-discord").textContent = discordText();
  }

  function renderLive() {
    renderPrizes();
    renderStage();
    renderDiscord();
  }

  function renderAll() {
    evaluate();
    renderParticipants();
    renderLive();
  }

  // ---------- confeti ----------
  function confetti() {
    const box = $("sx-confetti");
    box.textContent = "";
    const cols = ["#f97d02", "#ffb15c", "#ffffff", "#8ce99a", "#ffd29a"];
    for (let i = 0; i < 70; i++) {
      const c = el("i");
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = `${Math.random() * 0.6}s`;
      c.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(c);
    }
    setTimeout(() => (box.textContent = ""), 3800);
  }

  // ---------- sortear ----------
  let spinning = false;
  async function draw() {
    if (spinning) return;
    const next = nextPrizeIndex();
    const pool = currentPool();
    if (next < 0 || !pool.length) return;
    if (!st.seal) {
      const hash = sha256Hex(sealText());
      st.seal = {
        hash,
        tickets: result.people.reduce((a, p) => a + p.tickets, 0),
        people: result.people.length,
        at: fmtStamp(),
      };
    }
    const total = pool.reduce((a, p) => a + p.tickets, 0);
    let r = sorteoRandomInt(total);
    let winner = pool[pool.length - 1];
    for (const p of pool) {
      if (r < p.tickets) {
        winner = p;
        break;
      }
      r -= p.tickets;
    }
    const odds = pct(winner.tickets, total);
    st.prizes[next].winner = { name: winner.name, tickets: winner.tickets, odds, at: fmtStamp() };
    sorteoSave(st);

    // animacion: la lista gira y se para en el ganador
    spinning = true;
    $("sx-draw").disabled = true;
    lastWinnerIdx = -1;
    const prize = st.prizes[next];
    $("sx-stage-tag").textContent = `PREMIO ${next + 1} DE ${st.prizes.length}`;
    $("sx-stage-title").textContent = `${prize.icon || "🎁"} ${prize.name}`;
    $("sx-odds").textContent = "Girando…";
    const ul = $("sx-reel");
    ul.style.transition = "none";
    ul.style.transform = "translateY(0)";
    ul.textContent = "";
    const names = pool.map((p) => p.name);
    // Nombres de relleno; junto al ganador no se repite su nombre para que no confunda.
    const others = names.filter((n) => n !== winner.name);
    const filler = (avoidWinner) => {
      const src = avoidWinner && others.length ? others : names;
      return src[sorteoRandomInt(src.length)];
    };
    const N = 34;
    for (let i = 0; i < N; i++) ul.appendChild(el("li", "", filler(i >= N - 2)));
    const win = el("li", "win", `🏆 ${winner.name}`);
    ul.appendChild(win);
    ul.appendChild(el("li", "", filler(true)));
    ul.appendChild(el("li", "", filler(true)));
    const item = 56;
    void ul.offsetHeight;
    ul.style.transition = "transform 4.2s cubic-bezier(0.12, 0.7, 0.12, 1)";
    ul.style.transform = `translateY(${-(N * item) + item}px)`;
    await new Promise((res) => setTimeout(res, 4300));
    spinning = false;
    lastWinnerIdx = next;
    $("sx-odds").innerHTML = "";
    $("sx-odds").append(`${winner.name} tenía `, el("b", "", `${winner.tickets} ${winner.tickets === 1 ? "boleto" : "boletos"} de ${total}`), ` (${odds})`);
    confetti();
    renderPrizes();
    renderDiscord();
    const nx = nextPrizeIndex();
    const btn = $("sx-draw");
    const poolAfter = currentPool();
    if (nx < 0) {
      btn.disabled = true;
      btn.textContent = "✔ Sorteo terminado";
    } else {
      btn.disabled = !poolAfter.length;
      btn.textContent = poolAfter.length ? `🎰 Sortear: ${st.prizes[nx].icon || "🎁"} ${st.prizes[nx].name}` : "No quedan participantes en el bombo";
    }
    renderStage();
    $("sx-odds").innerHTML = "";
    $("sx-odds").append(`${winner.name} tenía `, el("b", "", `${winner.tickets} ${winner.tickets === 1 ? "boleto" : "boletos"} de ${total}`), ` (${odds})`);
  }

  // ---------- eventos ----------
  async function process() {
    st.text = $("sx-input").value;
    if (st.seal && !window.confirm("El sorteo ya empezó y la lista está sellada. Si cambias las facturas, la lista ya no coincidirá con la huella. ¿Continuar?")) return;
    sorteoSave(st);
    renderAll();
  }
  $("sx-process").addEventListener("click", process);
  $("sx-paste").addEventListener("click", async () => {
    try {
      $("sx-input").value = await navigator.clipboard.readText();
      process();
    } catch {
      alert("No se pudo leer el portapapeles. Pega con Ctrl+V y pulsa Procesar.");
    }
  });
  $("sx-clear").addEventListener("click", () => {
    $("sx-input").value = "";
  });
  ["sx-mode", "sx-price", "sx-from", "sx-to", "sx-no-staff"].forEach((id) =>
    $(id).addEventListener("change", () => {
      readSettings();
      sorteoSave(st);
      renderAll();
    })
  );
  $("sx-one-each").addEventListener("change", () => {
    st.oneEach = $("sx-one-each").checked;
    sorteoSave(st);
    renderLive();
  });
  $("sx-go-live").addEventListener("click", () => showPane("sx-live"));
  $("sx-copy-seal").addEventListener("click", async () => {
    if (!result.people.length) {
      alert("Primero procesa las facturas del sorteo.");
      return;
    }
    const hash = st.seal ? st.seal.hash : sha256Hex(sealText());
    const total = result.people.reduce((a, p) => a + p.tickets, 0);
    const text = [
      "# 🎟️ AGUILA MOTORS · LISTA DEL SORTEO 🎟️",
      `> **${result.people.length}** participantes · **${total}** boletos`,
      "",
      ...result.people.map((p) => `• ${p.name}: ${p.tickets} ${p.tickets === 1 ? "boleto" : "boletos"}`),
      "",
      `🔒 Huella de la lista: \`${hash}\``,
      "-# La lista queda sellada: después del sorteo se puede comprobar que no se cambió.",
    ].join("\n");
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
  });
  $("sx-add-prize").addEventListener("click", () => {
    const name = $("sx-new-name").value.trim();
    if (!name) return;
    st.prizes.push({ icon: $("sx-new-icon").value, name, winner: null });
    $("sx-new-name").value = "";
    sorteoSave(st);
    renderLive();
  });
  $("sx-new-name").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") $("sx-add-prize").click();
  });
  $("sx-draw").addEventListener("click", draw);
  $("sx-reset").addEventListener("click", () => {
    if (!window.confirm("¿Empezar un sorteo nuevo? Se borran los ganadores y el sello (los premios y las facturas se mantienen).")) return;
    st.prizes = st.prizes.map((p) => ({ ...p, winner: null }));
    st.seal = null;
    lastWinnerIdx = -1;
    sorteoSave(st);
    fillReelIdle();
    renderAll();
  });
  $("sx-copy-all").addEventListener("click", async () => {
    const text = discordText();
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    $("sx-copy-status").textContent = ok ? "✔ Anuncio copiado." : "";
  });
  $("sx-copy-last").addEventListener("click", async () => {
    const p = lastWinnerIdx >= 0 ? st.prizes[lastWinnerIdx] : [...st.prizes].reverse().find((x) => x.winner);
    if (!p?.winner) {
      alert("Todavía no ha salido ningún ganador.");
      return;
    }
    const text = `🏆 **${p.name}** → **${p.winner.name}** 🎉\n-# ${p.winner.tickets} ${p.winner.tickets === 1 ? "boleto" : "boletos"} · ${p.winner.odds} · Sorteo Aguila Motors`;
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    $("sx-copy-status").textContent = ok ? `✔ Copiado: ${p.name} → ${p.winner.name}` : "";
  });
  $("sx-export").addEventListener("click", () => {
    const rows = [
      ...st.prizes.map((p, i) => ["Premio", i + 1, `${p.icon} ${p.name}`, p.winner?.name || "", p.winner?.tickets ?? "", p.winner?.odds || "", p.winner?.at || ""]),
      ...result.people.map((p) => ["Participante", "", "", p.name, p.tickets, "", ""]),
      ...result.bad.map((b) => ["Descartada", "", b.reason, b.buyer, "", fmtMoney(b.amount), b.when]),
    ];
    if (st.seal) rows.push(["Huella", "", st.seal.hash, "", st.seal.tickets, "", st.seal.at]);
    downloadCsv("sorteo_aguila_motors.csv", ["Tipo", "N", "Premio / Motivo", "Persona", "Boletos", "Probabilidad / Monto", "Fecha"], rows);
  });

  // empleados del taller (para la opcion de excluirlos)
  listEmployees()
    .then((list) => {
      staffKeys = new Set(list.map((e) => normalizeKeySimple(fullName(e))));
      renderAll();
    })
    .catch(() => renderAll());
  renderAll();
}

// Seguridad: si algo fallara al arrancar, que la pagina no se quede oculta.
setTimeout(() => document.documentElement.classList.remove("auth-pending"), 10000);
setupCopyFallbackModal();
setupTabs();
// Primero los datos publicados (si los hay); luego se arma la pagina con ellos.
Promise.allSettled([
  loadSharedData().catch(() => {
    SHARED_DATA = null;
  }),
  Promise.resolve()
    .then(() => authInit())
    .then(() => Promise.all([hasAccess() ? empCloudLoad() : null, canSeeStock() ? loadRankNames() : null])),
])
  .finally(() => {
    setupCaja();
    setupContabilidad();
    setupSharedData();
    setupSorteo();
    setupCompraventa();
    setupAuthUI();
    setupMobileNav();
  });

// ============================================================================
// Vista movil: menu lateral (secciones y categorias), lista de productos y
// barra del ticket abajo. En PC estos elementos no se muestran.
// ============================================================================
function setupMobileNav() {
  const drawer = byId("m-drawer");
  const menuBtn = byId("m-menu-btn");
  if (!drawer || !menuBtn) return;
  const sectionsEl = byId("m-nav-sections");
  const catsEl = byId("m-nav-cats");
  const catsTitle = byId("m-nav-cats-title");
  const catLabel = byId("m-cat-label");
  const cajaPanel = byId("tab-caja");

  const isCaja = () => cajaPanel.classList.contains("is-active");

  function navButton(label, active, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "m-nav-item" + (active ? " is-active" : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function build() {
    sectionsEl.textContent = "";
    document.querySelectorAll("nav.tabs .tab").forEach((tab) => {
      if (tab.hidden) return;
      const item = navButton(tab.textContent.trim(), tab.classList.contains("is-active"), () => {
        close();
        tab.click(); // misma logica (y contrasena) que en PC
      });
      const icon = tab.querySelector(".tab-ic");
      if (icon) item.prepend(icon.cloneNode(true));
      sectionsEl.appendChild(item);
    });
    catsEl.textContent = "";
    const showCats = isCaja();
    catsTitle.hidden = !showCats;
    catsEl.hidden = !showCats;
    if (showCats) {
      document.querySelectorAll("#cat-tabs .cat-tab").forEach((ct) => {
        catsEl.appendChild(
          navButton(ct.textContent.trim(), ct.classList.contains("is-active"), () => {
            ct.click();
            close();
            byId("product-grid")?.scrollIntoView({ block: "start", behavior: "smooth" });
          })
        );
      });
    }
  }

  function open(focusCats) {
    build();
    drawer.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("m-drawer-open");
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    if (focusCats && !catsEl.hidden) setTimeout(() => catsTitle.scrollIntoView({ block: "start" }), 50);
  }

  function close() {
    drawer.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("m-drawer-open");
    setTimeout(() => {
      if (!drawer.classList.contains("is-open")) drawer.hidden = true;
    }, 220);
  }

  menuBtn.addEventListener("click", () => (drawer.hidden ? open(false) : close()));
  byId("m-cat-btn")?.addEventListener("click", () => open(true));
  drawer.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !drawer.hidden) close();
  });

  // Nombre de la categoria activa en el boton "Categoria ▾".
  const syncCat = () => {
    const active = document.querySelector("#cat-tabs .cat-tab.is-active");
    if (catLabel) catLabel.textContent = active ? active.textContent.trim() : "";
  };
  new MutationObserver(syncCat).observe(byId("cat-tabs"), { childList: true, subtree: true, attributes: true });
  syncCat();

  // La barra del ticket solo se ve en la Caja.
  const syncSection = () => document.body.classList.toggle("is-caja", isCaja());
  new MutationObserver(syncSection).observe(cajaPanel, { attributes: true, attributeFilter: ["class"] });
  syncSection();

  const bar = byId("m-ticket-bar");
  bar?.addEventListener("click", () => {
    document.querySelector("#tab-caja .ticket-card")?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  document.addEventListener("aguila-ticket", (ev) => {
    const { units, total } = ev.detail || {};
    byId("m-ticket-count").textContent = units ? `${units} ${units === 1 ? "producto" : "productos"}` : "Vacío";
    byId("m-ticket-total").textContent = fmtMoney(total);
    bar?.classList.toggle("has-items", units > 0);
  });
}

// Al abrir desde la pantalla de Inicio, el logo se queda un momento y se desvanece.
(function hideAppSplash() {
  const splash = byId("app-splash");
  if (!splash || !document.documentElement.classList.contains("is-app")) return;
  const hide = () => setTimeout(() => splash.classList.add("is-hidden"), 700);
  if (document.readyState === "complete") hide();
  else window.addEventListener("load", hide, { once: true });
})();

// ============================================================================
// Modulo de Compraventa
// ----------------------------------------------------------------------------
// Lee el log "Transaccion de vehiculo" (Mediador, Dueno, Comprador, Precio,
// Vehiculo + matricula, Empresa). La empresa aparece como "society_..."
// (society_aguilamotor = Aguila Motors). Si la empresa compra, el dinero sale
// de la caja de la sociedad; si vende, entra. El almacen son los vehiculos cuyo
// ultimo movimiento es una compra de la empresa. El encargado procesa el log y
// lo publica en datos.js para que todos lo vean; las fotos se guardan
// comprimidas y solo se publican las de los vehiculos en existencia.
// ============================================================================
const CV_STORAGE_KEY = "aguila_compraventa_v1";
const CV_SOCIETY_NAMES = { society_aguilamotor: "Aguila Motors" };

function cvIsSociety(name) {
  return /^society_/i.test(String(name || "").trim());
}

function cvDisplayName(name) {
  const n = String(name || "").trim();
  if (!n) return "-";
  return CV_SOCIETY_NAMES[n.toLowerCase()] || n;
}

function cvLoadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(CV_STORAGE_KEY) || "null");
    if (raw && Array.isArray(raw.tx)) return { tx: raw.tx, photos: raw.photos && typeof raw.photos === "object" ? raw.photos : {} };
  } catch {
    // sin almacenamiento
  }
  return { tx: [], photos: {} };
}

function cvSaveLocal(data) {
  try {
    localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Lo que se ve: lo publicado (solo lectura) o lo de esta PC (encargado o sin publicar).
function cvSource() {
  if (isSharedReadOnly()) return SHARED_DATA.compraventa || { tx: [], photos: {} };
  return cvLoadLocal();
}

function cvNormalizeShared(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tx)) return { tx: [], photos: {} };
  return { tx: raw.tx, photos: raw.photos && typeof raw.photos === "object" ? raw.photos : {} };
}

// Fecha "dd/mm/aaaa hh:mm" -> clave ordenable "aaaammddhhmm".
function cvSortKey(ts) {
  const m = String(ts || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${m[3]}${p(m[2])}${p(m[1])}${p(m[4])}${m[5]}`;
}

function cvParseLog(text) {
  const out = [];
  let cur = null;
  let ts = "";
  const pad = (n) => String(n).padStart(2, "0");
  const clean = (v) =>
    String(v || "")
      .replace(/\*\*/g, "")
      .replace(/^[^\p{L}\p{N}_]+/u, "")
      .replace(/\bchar\d+:\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  // Cada dato del log va separado por 2+ espacios (texto pegado) o entre
  // comillas invertidas (`...`). Asi una matricula con espacio ("3Y5A 0F1")
  // queda entera. Se descartan el emoji y el "char1:..." del personaje.
  const pieces = (v) =>
    String(v || "")
      .replace(/\*\*/g, "")
      .split(/`|\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s && /[\p{L}\p{N}]/u.test(s) && !/^char\d+:/i.test(s));
  const push = () => {
    if (cur && cur.plate) out.push(cur);
    cur = null;
  };
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/\*\*/g, "").trim();
    if (!line) continue;
    // Cabecera del mensaje de Discord con la fecha.
    let d = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})/);
    if (d && !/:\s*\S/.test(line.replace(/\d{1,2}:\d{2}/, ""))) {
      ts = `${pad(d[1])}/${pad(d[2])}/${d[3]} ${pad(d[4])}:${d[5]}`;
      continue;
    }
    // "Hoy a las 08:36", "Ayer a las 08:36" o solo "— 08:36" (mensajes de hoy).
    d = line.match(/(hoy|ayer) a las (\d{1,2}):(\d{2})/i) || line.match(/(?:^|—)\s*()(\d{1,2}):(\d{2})\s*$/);
    if (d && !/^(Mediador|Due|Comprador|Precio|Veh|Empresa)/i.test(line)) {
      const day = new Date();
      if (/ayer/i.test(d[1] || "")) day.setDate(day.getDate() - 1);
      ts = `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()} ${pad(d[2])}:${d[3]}`;
      continue;
    }
    if (/^transacci[oó]n de veh[ií]culo/i.test(line)) {
      push();
      cur = { ts, mediator: "", owner: "", buyer: "", price: 0, model: "", plate: "", company: "" };
      continue;
    }
    if (!cur) continue;
    const m = line.match(/^(Mediador|Due[ñn]o|Comprador|Precio|Veh[ií]culo|Empresa)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = normalizeKeySimple(m[1]);
    const parts = pieces(m[2]);
    const val = clean(parts.length ? parts.join(" ") : m[2]);
    if (key.startsWith("mediador")) cur.mediator = val;
    else if (key.startsWith("due")) cur.owner = val;
    else if (key.startsWith("comprador")) cur.buyer = val;
    else if (key.startsWith("precio")) cur.price = Number(val.replace(/[^\d]/g, "")) || 0;
    else if (key.startsWith("empresa")) cur.company = val;
    else if (parts.length > 1) {
      // Modelo y matricula vienen como datos separados: el ultimo es la matricula.
      cur.plate = clean(parts[parts.length - 1]).toUpperCase();
      cur.model = clean(parts.slice(0, -1).join(" "));
    } else {
      // Todo junto (sin separacion clara): la ultima palabra es la matricula.
      const words = val.split(" ");
      const last = words[words.length - 1] || "";
      if (words.length > 1 && /^[A-Z0-9]{3,8}$/i.test(last)) {
        cur.plate = last.toUpperCase();
        cur.model = words.slice(0, -1).join(" ");
      } else {
        cur.plate = val.toUpperCase();
        cur.model = val;
      }
    }
  }
  push();
  // Los mensajes sin fecha al inicio del pegado van antes de la primera fecha.
  const firstKey = out.map((t) => cvSortKey(t.ts)).find(Boolean) || "";
  for (const t of out) t.sort = cvSortKey(t.ts) || firstKey;
  return out;
}

// Modelo y matricula van juntos en la firma: si antes se partieron mal
// ("PANTO 3Y5A" + "0F1"), al volver a pegar el log se reconoce y se corrige.
const cvSig = (t) => [t.mediator, t.owner, t.buyer, t.price, `${t.model} ${t.plate}`].map((x) => normalizeKeySimple(String(x))).join("|");

// Mezcla sin duplicar: pegar el mismo log dos veces no repite nada.
function cvMerge(data, incoming) {
  const used = new Set();
  let added = 0;
  let fixed = 0;
  let seq = data.tx.reduce((m, t) => Math.max(m, t.seq || 0), 0);
  for (const t of incoming) {
    const sig = cvSig(t);
    let match = data.tx.find((e, i) => !used.has(i) && cvSig(e) === sig && (e.ts || "") === (t.ts || ""));
    if (!match && t.ts) {
      match = data.tx.find((e, i) => !used.has(i) && cvSig(e) === sig && !e.ts);
      if (match) {
        match.ts = t.ts;
        match.sort = t.sort;
      }
    }
    if (match) {
      if (match.plate !== t.plate || match.model !== t.model) {
        // Corrige la matricula de un registro antiguo (y su foto, si la tenia).
        if (data.photos[match.plate] && !data.photos[t.plate]) {
          data.photos[t.plate] = data.photos[match.plate];
          delete data.photos[match.plate];
        }
        match.plate = t.plate;
        match.model = t.model;
        fixed++;
      }
      used.add(data.tx.indexOf(match));
      continue;
    }
    data.tx.push({ ...t, seq: ++seq });
    used.add(data.tx.length - 1);
    added++;
  }
  data.tx.sort((a, b) => (a.sort || "").localeCompare(b.sort || "") || a.seq - b.seq);
  data.lastFixed = fixed;
  return added;
}

function cvKind(t) {
  const b = cvIsSociety(t.buyer);
  const o = cvIsSociety(t.owner);
  if (b && !o) return "compra";
  if (o && !b) return "venta";
  return "traspaso";
}

// Ultimo movimiento de cada matricula: si fue una compra de la empresa, esta en el almacen.
function cvStock(tx) {
  const last = new Map();
  for (const t of tx) last.set(t.plate, t);
  return [...last.values()].filter((t) => cvKind(t) === "compra").reverse();
}

// Reduce la foto (max. 800 px, JPEG) para que quepa en el navegador y en datos.js.
function cvCompressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const max = 800;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Lo que se publica en datos.js: todo el historial y solo las fotos de lo que hay en el almacen.
function cvForExport() {
  if (CV_CLOUD_CACHE) return { tx: [], photos: {} }; // esta en linea: no se publica en GitHub
  const data = cvLoadLocal();
  const plates = new Set(cvStock(data.tx).map((t) => t.plate));
  const photos = {};
  for (const [p, src] of Object.entries(data.photos)) if (plates.has(p)) photos[p] = src;
  return { tx: data.tx, photos };
}

// ---------------------------------------------------------------------------
// Base de datos en linea (Supabase). La clave "publishable" es publica: solo
// deja leer. Para escribir hace falta iniciar sesion como encargado, y las
// reglas de la base (RLS) lo exigen en el servidor. Si la base no responde,
// la pestana sigue funcionando con los datos de esta PC / datos.js.
// ---------------------------------------------------------------------------
const CV_CLOUD_URL = window.AGUILA_CLOUD_URL || "https://tguizsunuekxqfgiclfq.supabase.co";
const CV_CLOUD_KEY = window.AGUILA_CLOUD_KEY || "sb_publishable_ur32LOkr30IpJlc8ek9Rfg_UDYo_D7X";
const CV_SESSION_KEY = "aguila_cv_session_v1";
const CV_PHOTO_BUCKET = "cv-fotos";
const CV_FIELDS = ["uid", "ts", "sort", "mediator", "owner", "buyer", "price", "model", "plate", "company"];
let CV_CLOUD_CACHE = null; // { tx, photoPaths } de la ultima lectura correcta

const cvCloud = {
  session: (() => {
    try {
      return JSON.parse(localStorage.getItem(CV_SESSION_KEY) || "null");
    } catch {
      return null;
    }
  })(),

  setSession(j) {
    this.session = {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000,
      email: j.user?.email || this.session?.email || "",
    };
    try {
      localStorage.setItem(CV_SESSION_KEY, JSON.stringify(this.session));
    } catch {
      // sin almacenamiento: la sesion dura hasta cerrar la pagina
    }
  },

  clearSession() {
    this.session = null;
    try {
      localStorage.removeItem(CV_SESSION_KEY);
    } catch {
      // nada
    }
  },

  async req(path, { method = "GET", body, headers = {}, auth = false } = {}) {
    const h = { apikey: CV_CLOUD_KEY, ...headers };
    if (auth) {
      const tok = await this.token();
      if (!tok) throw new Error("Tu sesión caducó: vuelve a iniciar sesión (🔑 Entrar).");
      h.Authorization = `Bearer ${tok}`;
    } else if (this.session && !path.startsWith("/auth/")) {
      // Lecturas: con sesion, el servidor decide que puede ver (solo Jefes).
      const tok = await this.token();
      if (tok) h.Authorization = `Bearer ${tok}`;
    }
    let payload = body;
    if (body !== undefined && !(body instanceof Blob)) {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    let r;
    try {
      r = await fetch(CV_CLOUD_URL + path, { method, headers: h, body: payload, signal: ctl.signal });
    } catch {
      throw new Error("No hay conexión con la base de datos en línea.");
    } finally {
      clearTimeout(timer);
    }
    const text = await r.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!r.ok) {
      const e = new Error((data && (data.error_description || data.msg || data.message || data.error)) || `Error ${r.status}`);
      e.status = r.status;
      e.code = data?.code || data?.error_code || "";
      throw e;
    }
    return data;
  },

  async login(email, password) {
    const j = await this.req("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
    this.setSession(j);
  },

  async token() {
    if (!this.session) return null;
    if (Date.now() > this.session.expires_at - 60000) {
      try {
        const j = await this.req("/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: { refresh_token: this.session.refresh_token },
        });
        this.setSession(j);
      } catch {
        this.clearSession();
        return null;
      }
    }
    return this.session.access_token;
  },

  async logout() {
    try {
      if (this.session) await this.req("/auth/v1/logout", { method: "POST", auth: true });
    } catch {
      // aunque falle, se cierra en esta PC
    }
    this.clearSession();
  },

  // Lee toda la tabla en paginas de 1000 (el limite por defecto de Supabase).
  async selectAll(table, order) {
    const out = [];
    for (let off = 0; ; off += 1000) {
      const page = await this.req(`/rest/v1/${table}?select=*&order=${order}&limit=1000&offset=${off}`);
      out.push(...(page || []));
      if (!page || page.length < 1000) return out;
    }
  },

  async upsert(table, rows, onConflict) {
    for (let i = 0; i < rows.length; i += 500) {
      await this.req(`/rest/v1/${table}?on_conflict=${onConflict}`, {
        method: "POST",
        body: rows.slice(i, i + 500),
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        auth: true,
      });
    }
  },

  del(table, filter) {
    return this.req(`/rest/v1/${table}?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" }, auth: true });
  },

  uploadPhoto(path, blob) {
    return this.req(`/storage/v1/object/${CV_PHOTO_BUCKET}/${path}`, {
      method: "POST",
      body: blob,
      headers: { "Content-Type": blob.type || "image/jpeg", "x-upsert": "true", "cache-control": "31536000" },
      auth: true,
    });
  },

  removePhotos(paths) {
    if (!paths.length) return Promise.resolve();
    return this.req(`/storage/v1/object/${CV_PHOTO_BUCKET}`, { method: "DELETE", body: { prefixes: paths }, auth: true });
  },

  publicUrl(path) {
    return `${CV_CLOUD_URL}/storage/v1/object/public/${CV_PHOTO_BUCKET}/${path}`;
  },
};

// ---------------------------------------------------------------------------
// Empleados en linea (tabla "employees" de Supabase). Si la tabla existe y
// tiene empleados, manda sobre datos.js y sobre lo guardado en la PC. Leer
// es libre; cambiar exige la sesion de encargado (la misma de Compraventa).
// ---------------------------------------------------------------------------
const EMP_CLOUD = { ok: false, tried: false, error: "", list: [] };

function empCloudOn() {
  return EMP_CLOUD.ok && EMP_CLOUD.list.length > 0;
}

async function empCloudLoad() {
  try {
    const rows = await cvCloud.selectAll("employees", "surname.asc,name.asc");
    EMP_CLOUD.list = rows
      .map((r) => ({
        id: String(r.id),
        name: String(r.name || "").trim(),
        surname: String(r.surname || "").trim(),
        rank: String(r.rank || "").trim(),
        discord: String(r.discord || ""),
        iban: String(r.iban || ""),
        noPay: r.no_pay === true,
      }))
      .filter((e) => e.name && e.surname);
    EMP_CLOUD.ok = true;
    EMP_CLOUD.error = "";
  } catch (e) {
    EMP_CLOUD.ok = false;
    EMP_CLOUD.error =
      e.code === "PGRST205" || e.code === "42P01" || e.status === 404
        ? "La tabla de empleados aún no existe en Supabase (falta pegar el SQL)."
        : e.message;
  }
  EMP_CLOUD.tried = true;
}

function empCloudFind(fullNameStr) {
  const k = normalizeKeySimple(fullNameStr);
  return EMP_CLOUD.list.find((e) => normalizeKeySimple(fullName(e)) === k);
}

function empCloudRequireSession() {
  if (!cvCloud.session || !hasAccess()) throw new Error("Solo los Jefes pueden cambiar los empleados (inicia sesión con 🔑 Entrar).");
}

const empCloudRow = (e) => ({
  id: e.id,
  name: e.name,
  surname: e.surname,
  rank: e.rank || "",
  discord: e.discord || "",
  iban: e.iban || "",
  no_pay: !!e.noPay,
});

async function empCloudSave(e) {
  empCloudRequireSession();
  await cvCloud.upsert("employees", [empCloudRow(e)], "id");
}

// Para Discord / IBAN / No cobra (se llaman sin esperar): guarda y avisa si falla.
function empCloudSet(fullNameStr, patch) {
  const e = empCloudFind(fullNameStr);
  if (!e) return;
  const prev = { ...e };
  Object.assign(e, patch);
  empCloudSave(e).catch((err) => {
    Object.assign(e, prev);
    alert(`No se pudo guardar en línea: ${err.message || err}`);
  });
}

// ---------------------------------------------------------------------------
// Sesion y permisos. Se entra con Discord (web) o con correo (programa de
// escritorio). Quien es Jefe lo decide la BASE DE DATOS (funcion es_jefe:
// cuenta de encargado, o ID de Discord de un empleado con rango Jefe), no la
// pagina: aunque alguien toque el codigo, sin ser Jefe no recibe datos.
// ---------------------------------------------------------------------------
const AUTH = { role: "none", name: "", provider: "", checked: false, error: "", aguila: false, offline: false, avatar: "", discordId: "", profile: null };

function hasAccess() {
  return AUTH.role === "jefe";
}

// Empleados registrados (Chalan a Subjefe): ven solo el Almacen de Compraventa.
function canSeeStock() {
  return AUTH.role === "jefe" || AUTH.role === "empleado";
}

function cvPersistSession() {
  try {
    localStorage.setItem(CV_SESSION_KEY, JSON.stringify(cvCloud.session));
  } catch {
    // nada
  }
}

async function authInit() {
  // Vuelta desde Discord: la sesion llega en la direccion (#access_token=...).
  const h = new URLSearchParams(location.hash.replace(/^#/, ""));
  const q = new URLSearchParams(location.search);
  const err = h.get("error_description") || q.get("error_description");
  if (h.get("access_token")) {
    cvCloud.setSession({
      access_token: h.get("access_token"),
      refresh_token: h.get("refresh_token"),
      expires_in: h.get("expires_in"),
      user: null,
    });
  }
  if (h.get("access_token") || err) {
    try {
      history.replaceState(null, "", location.pathname);
    } catch {
      // nada
    }
  }
  if (err) AUTH.error = err.replace(/\+/g, " ");
  await authRefresh();
}

async function authRefresh() {
  AUTH.role = "none";
  AUTH.name = "";
  AUTH.provider = "";
  if (!cvCloud.session) {
    AUTH.checked = true;
    return;
  }
  try {
    const u = await cvCloud.req("/auth/v1/user", { auth: true });
    const md = u?.user_metadata || {};
    AUTH.provider = u?.app_metadata?.provider || "";
    AUTH.name = md.custom_claims?.global_name || md.full_name || md.name || u?.email || "";
    AUTH.avatar = md.avatar_url || md.picture || "";
    const ident = (u?.identities || []).find((i) => i.provider === "discord");
    AUTH.discordId = String(md.provider_id || ident?.identity_data?.sub || ident?.id || "");
    if (cvCloud.session) {
      cvCloud.session.email = AUTH.name;
      cvPersistSession();
    }
  } catch (e) {
    if (!cvCloud.session || e.status === 401 || e.status === 403) {
      cvCloud.clearSession();
      AUTH.checked = true;
      return;
    }
    if (!e.status) {
      // Sin conexion con la base: con sesion guardada se deja usar la Caja.
      AUTH.offline = true;
      AUTH.role = "offline";
      AUTH.name = cvCloud.session?.email || "";
      AUTH.checked = true;
      return;
    }
  }
  try {
    const jefe = await cvCloud.req("/rest/v1/rpc/es_jefe", { method: "POST", body: {}, auth: true });
    if (jefe === true) {
      AUTH.role = "jefe";
      try {
        AUTH.aguila = (await cvCloud.req("/rest/v1/rpc/es_jefe_aguila", { method: "POST", body: {}, auth: true })) === true;
      } catch (e) {
        // Funcion aun sin crear: la cuenta de correo del encargado es la del Jefe Aguila.
        AUTH.aguila = (e.status === 404 || e.code === "PGRST202") && AUTH.provider === "email";
      }
      await loadMyProfile();
    }
    else {
      let emp = false;
      try {
        emp = (await cvCloud.req("/rest/v1/rpc/es_empleado", { method: "POST", body: {}, auth: true })) === true;
      } catch {
        // funcion aun sin crear: solo la Caja
      }
      AUTH.role = emp ? "empleado" : "invitado";
      if (emp) await loadMyProfile();
    }
  } catch (e) {
    // Sin la funcion es_jefe todavia (falta el SQL): la cuenta de correo del
    // encargado sigue funcionando como antes; con Discord, solo la Caja.
    const missing = e.status === 404 || e.code === "PGRST202" || e.code === "42883";
    AUTH.role = missing && AUTH.provider === "email" ? "jefe" : cvCloud.session ? "invitado" : "none";
    if (AUTH.role === "jefe") AUTH.aguila = true;
  }
  AUTH.checked = true;
}

// Nombres visibles de los rangos (tabla app_settings, clave "rank_names").
async function loadRankNames() {
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.rank_names");
    const v = rows?.[0]?.value;
    RANK_NAMES = v && typeof v === "object" ? v : {};
  } catch {
    RANK_NAMES = {};
  }
}

async function saveRankNames(map) {
  await cvCloud.upsert("app_settings", [{ key: "rank_names", value: map }], "key");
  RANK_NAMES = map;
}

// Nombre y rango del que entra, sacados de la lista de empleados (funcion
// mi_perfil: cada uno recibe solo SUS datos).
async function loadMyProfile() {
  try {
    const rows = await cvCloud.req("/rest/v1/rpc/mi_perfil", { method: "POST", body: {}, auth: true });
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (r && r.name) AUTH.profile = { name: String(r.name), surname: String(r.surname || ""), rank: String(r.rank || "") };
  } catch {
    // funcion aun sin crear: se intenta luego con la lista de empleados (Jefes)
  }
}

function rankBadgeClass(rank) {
  const map = { "jefe aguila": "r-aguila", jefe: "r-jefe", "mano derecha": "r-jefe", subjefe: "r-subjefe", mecanico: "r-mecanico", chalan: "r-chalan", experimentado: "r-exp" };
  return map[normalizeKeySimple(rank)] || "";
}

// Tarjeta de sesion de arriba: foto de Discord, nombre de la plantilla y rango.
function renderAuthCard() {
  const box = byId("auth-user");
  if (!box) return;
  if (!AUTH.profile && AUTH.discordId && EMP_CLOUD.list.length) {
    const e = EMP_CLOUD.list.find((x) => x.discord === AUTH.discordId);
    if (e) AUTH.profile = { name: e.name, surname: e.surname, rank: e.rank };
  }
  const p = AUTH.profile;
  const name = p ? `${p.name} ${p.surname}`.trim() : AUTH.name || "Sesión iniciada";
  const rank = p?.rank
    ? rankLabel(p.rank)
    : AUTH.aguila
      ? rankLabel("Jefe Aguila")
      : { jefe: "Jefe", empleado: "Empleado", invitado: "Sin registrar", offline: "Sin conexión" }[AUTH.role] || "";
  const rankKey = p?.rank || (AUTH.aguila ? "Jefe Aguila" : "");

  box.textContent = "";
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const av = document.createElement("span");
  av.className = "auth-avatar";
  av.textContent = initials;
  if (AUTH.avatar) {
    const img = document.createElement("img");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = AUTH.avatar;
    img.onerror = () => img.remove(); // si no carga, quedan las iniciales
    av.appendChild(img);
  }
  const txt = document.createElement("span");
  txt.className = "auth-txt";
  const n = document.createElement("b");
  n.className = "auth-name";
  n.textContent = name;
  const r = document.createElement("span");
  r.className = `pg-badge auth-rank ${rankBadgeClass(rankKey)}`;
  r.textContent = rank;
  txt.append(n, r);
  box.append(av, txt);
  box.title = `${name} · ${rank}` + (AUTH.name && p ? ` (Discord: ${AUTH.name})` : "");
}

const LIVE_SITE_URL = "https://dc-david8.github.io/AguilaMotors/";

function authDiscordLogin() {
  // En el programa de escritorio (archivo local) Discord devuelve a la web publicada.
  const back = location.protocol === "file:" ? LIVE_SITE_URL : location.origin + location.pathname;
  location.href = `${CV_CLOUD_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(back)}`;
}

function openLoginDialog() {
  const dlg = byId("cv-login-dlg");
  if (!dlg) return;
  byId("cv-login-err").textContent = "";
  dlg.showModal();
}

// Barra de sesion (arriba), secciones segun el rango y ventana de inicio de sesion.
function setupAuthUI() {
  const dlg = byId("cv-login-dlg");
  const isFile = location.protocol === "file:";
  byId("cv-login-discord")?.addEventListener("click", authDiscordLogin);
  if (isFile && byId("cv-login-discord-note")) {
    byId("cv-login-discord-note").textContent = "Con Discord, el programa abre la versión web ya con tu sesión.";
  }

  byId("cv-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = byId("cv-login-email").value.trim();
    const pass = byId("cv-login-pass").value;
    if (!email || !pass) {
      byId("cv-login-err").textContent = "Escribe el correo y la contraseña.";
      return;
    }
    byId("cv-login-ok").disabled = true;
    try {
      await cvCloud.login(email, pass);
      location.reload();
    } catch (err) {
      byId("cv-login-err").textContent = /invalid/i.test(err.message) ? "Correo o contraseña incorrectos." : err.message;
      byId("cv-login-ok").disabled = false;
    }
  });
  byId("cv-login-cancel")?.addEventListener("click", () => dlg?.close());

  byId("auth-login")?.addEventListener("click", openLoginDialog);
  byId("m-logout")?.addEventListener("click", () => byId("auth-logout")?.click());
  byId("auth-logout")?.addEventListener("click", async () => {
    if (!window.confirm("¿Cerrar sesión en este navegador?")) return;
    await cvCloud.logout();
    location.reload();
  });

  // ---------- pantalla de inicio de sesion ----------
  const gate = byId("login-gate");
  const showGate = AUTH.role === "none" || AUTH.role === "invitado";
  if (gate) {
    gate.hidden = !showGate;
    byId("gate-discord").onclick = authDiscordLogin;
    byId("gate-email").onclick = openLoginDialog;
    byId("gate-logout").onclick = async () => {
      await cvCloud.logout();
      location.reload();
    };
    const guest = AUTH.role === "invitado";
    byId("gate-discord").hidden = guest;
    byId("gate-email").hidden = guest;
    byId("gate-logout").hidden = !guest;
    byId("gate-msg").textContent = guest
      ? `${AUTH.name ? AUTH.name + ": tu" : "Tu"} Discord no está registrado en Aguila Motors. Pide a un Jefe que te añada en Gestión de empleados con tu ID de Discord y vuelve a entrar.`
      : "Inicia sesión para entrar al sistema del taller.";
  }
  document.documentElement.classList.remove("auth-pending");
  document.body.classList.toggle("is-gated", showGate);

  const logged = AUTH.role !== "none";
  byId("auth-login").hidden = logged;
  byId("auth-logout").hidden = !logged;
  if (byId("m-logout")) byId("m-logout").hidden = !logged;
  const userEl = byId("auth-user");
  userEl.hidden = !logged;
  if (logged) renderAuthCard();
  if (false) {
    const roleTxt = AUTH.aguila
      ? rankLabel("Jefe Aguila")
      : { jefe: "Jefe", empleado: "Empleado", invitado: "Sin registrar", offline: "Sin conexión" }[AUTH.role] || "";
    userEl.textContent = `👤 ${AUTH.name || "Sesión iniciada"} · ${roleTxt}`;
    userEl.title = hasAccess()
      ? "Acceso a todos los módulos"
      : AUTH.role === "empleado"
        ? "Caja y Almacén de Compraventa"
        : "Tu Discord no está en la lista de empleados: solo la Caja";
  }

  // Secciones solo para Jefes: ni se muestran.
  const tabs = document.querySelectorAll("nav.tabs .tab");
  tabs.forEach((t) => {
    const target = t.dataset.tabTarget;
    t.hidden = PROTECTED_TABS.includes(target) && !(target === "tab-cv" ? canSeeStock() : hasAccess());
  });
  const active = document.querySelector("nav.tabs .tab.is-active");
  if (active?.hidden) document.querySelector('nav.tabs .tab[data-tab-target="tab-caja"]')?.click();
  const prodBtn = byId("btn-add-product");
  if (prodBtn) prodBtn.hidden = !hasAccess();

  if (AUTH.error) {
    setTimeout(() => alert(`No se pudo entrar con Discord: ${AUTH.error}`), 300);
  }
}

// Fotos privadas: enlaces firmados (validos 1 h), guardados para no
// volver a descargarlas en cada actualizacion.
const CV_SIGNED = {};
async function cvSignedUrls(paths) {
  const now = Date.now();
  const need = paths.filter((p) => !CV_SIGNED[p] || CV_SIGNED[p].exp - now < 5 * 60000);
  if (need.length && cvCloud.session) {
    try {
      const arr = await cvCloud.req(`/storage/v1/object/sign/${CV_PHOTO_BUCKET}`, {
        method: "POST",
        body: { expiresIn: 3600, paths: need },
        auth: true,
      });
      for (const it of arr || []) {
        const url = it?.signedURL || it?.signedUrl;
        if (url && !it.error) CV_SIGNED[it.path] = { url: `${CV_CLOUD_URL}/storage/v1${url}`, exp: now + 3600 * 1000 };
      }
    } catch {
      // carpeta aun publica o sin permiso: se usa el enlace publico
    }
  }
  const out = {};
  for (const p of paths) out[p] = CV_SIGNED[p]?.url || cvCloud.publicUrl(p);
  return out;
}

function cvDataUrlToBlob(dataUrl) {
  const [head, b64] = String(dataUrl).split(",");
  const type = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64 || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Identificador ordenable: mantiene el orden de llegada dentro del mismo minuto.
function cvNewUid(i) {
  return `${Date.now().toString(36).padStart(9, "0")}-${String(i).padStart(5, "0")}-${Math.random().toString(36).slice(2, 6)}`;
}

const cvPhotoPath = (plate) => `${String(plate).replace(/[^A-Z0-9]/gi, "_")}-${Date.now().toString(36)}.jpg`;

function setupCompraventa() {
  const root = byId("tab-cv");
  if (!root) return;
  const $ = (id) => byId(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  let photoPlate = null;
  let busy = false;
  // La ventana de inicio de sesion tambien se abre desde Gestion de empleados
  // (en Pagos): fuera de la pestana para que se vea aunque esta este oculta.
  document.body.appendChild($("cv-login-dlg"));
  // Estado de la base en linea.
  const cloud = { ok: false, tried: false, error: "", tx: [], photoPaths: {}, photoUrls: {}, loadedAt: null };

  const online = () => cloud.ok;
  const canEdit = () => (online() ? hasAccess() : hasAccess() && !isSharedReadOnly());

  // Lo que se ve: la base en linea si responde; si no, esta PC o datos.js.
  function source() {
    if (online()) {
      const photos = {};
      for (const [plate, path] of Object.entries(cloud.photoPaths)) photos[plate] = cloud.photoUrls[path] || cvCloud.publicUrl(path);
      return { tx: cloud.tx, photos };
    }
    return cvSource();
  }

  function showPane(id) {
    root.querySelectorAll(".sx-subtab").forEach((b) => b.classList.toggle("is-active", b.dataset.cv === id));
    root.querySelectorAll(".sx-pane").forEach((p) => p.classList.toggle("is-active", p.id === id));
  }
  root.querySelectorAll(".sx-subtab").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.cv)));

  function setStatus(msg) {
    $("cv-status").textContent = msg;
  }

  function renderBar() {
    const logged = hasAccess();
    const stockOnly = !hasAccess();
    root.querySelector(".cv-kpis")?.toggleAttribute("hidden", stockOnly);
    root.querySelector('[data-cv="cv-p-hist"]')?.toggleAttribute("hidden", stockOnly);
    root.querySelector(".sx-subtabs")?.toggleAttribute("hidden", stockOnly); // solo hay Almacen
    if (stockOnly && !$("cv-p-stock").classList.contains("is-active")) showPane("cv-p-stock");
    const dot = $("cv-cloud-dot");
    const txt = $("cv-cloud-text");
    if (online()) {
      dot.className = "cv-dot is-on";
      const hh = cloud.loadedAt ? cloud.loadedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
      txt.textContent = `En línea · actualizado ${hh}` + (logged ? ` · Jefe: ${AUTH.name}` : "");
    } else if (!cloud.tried) {
      dot.className = "cv-dot";
      txt.textContent = "Conectando con la base en línea…";
    } else {
      dot.className = "cv-dot is-off";
      txt.textContent = cloud.error || "Sin conexión con la base en línea";
    }
    $("cv-login").hidden = true; // la sesion se inicia arriba (🔑 Entrar)
    $("cv-logout").hidden = true;
    $("cv-refresh").hidden = !cloud.tried;
    const local = cvLoadLocal();
    $("cv-migrate").hidden = !(online() && logged && (local.tx.length || Object.keys(local.photos).length));

    const when = SHARED_DATA?.publishedAt ? ` el ${SHARED_DATA.publishedAt}` : "";
    $("cv-mode").textContent = !logged && canSeeStock()
      ? "Vehículos disponibles en el almacén de la compraventa."
      : online()
      ? logged
        ? "Lo que proceses y las fotos que subas se guardan en línea: los Jefes lo ven al momento."
        : "Datos en línea. Solo los Jefes pueden verlos y cambiarlos."
      : canEdit()
        ? SHARED_DATA
          ? "Sin base en línea: lo que proceses queda en esta PC. Exporta datos.js (Pagos → Datos compartidos) para que lo vean los demás."
          : "Sin base en línea: estos datos se guardan en esta PC."
        : `Publicado por el encargado${when}. Aquí solo se puede ver.`;
    $("cv-tab-log").hidden = !canEdit();
    if (!canEdit() && $("cv-p-log").classList.contains("is-active")) showPane("cv-p-stock");
  }

  function card(t, photos) {
    const c = el("article", "cv-car");
    const pic = el("div", "cv-pic");
    if (photos[t.plate]) {
      const img = el("img");
      img.src = photos[t.plate];
      img.alt = `${t.model} ${t.plate}`;
      img.loading = "lazy";
      img.addEventListener("click", () => {
        $("cv-view-img").src = photos[t.plate];
        $("cv-view-cap").textContent = `${t.model.toUpperCase()} · ${t.plate}`;
        $("cv-view").showModal();
      });
      pic.appendChild(img);
    } else {
      pic.innerHTML =
        '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M6 22h52M10 22l4-8c1-2 3-3 5-3h18c2 0 4 1 6 3l7 6 6 1c2 0 3 1 3 3v2H4v-2c0-1 1-2 2-2"/><circle cx="18" cy="24" r="4"/><circle cx="48" cy="24" r="4"/></svg>';
      pic.appendChild(el("span", "", "Sin foto"));
    }
    pic.appendChild(el("span", "cv-plate", t.plate));
    c.appendChild(pic);
    const body = el("div", "cv-body");
    body.appendChild(el("h4", "", t.model.toUpperCase()));
    const dl = el("dl");
    const row = (k, v) => {
      dl.appendChild(el("dt", "", k));
      dl.appendChild(el("dd", "", v));
    };
    row("Comprado a", cvDisplayName(t.owner));
    row("Pagado", fmtMoney(t.price));
    row("Mediador", cvDisplayName(t.mediator));
    row("Fecha", t.ts || "Sin fecha");
    body.appendChild(dl);
    if (canEdit()) {
      const acts = el("div", "cv-acts");
      const up = el("button", "ghost", photos[t.plate] ? "📷 Cambiar foto" : "📷 Subir foto");
      up.type = "button";
      up.addEventListener("click", () => openPhotoDialog(t.plate));
      acts.appendChild(up);
      if (photos[t.plate]) {
        const del = el("button", "ghost", "Quitar foto");
        del.type = "button";
        del.addEventListener("click", () => removePhoto(t.plate));
        acts.appendChild(del);
      }
      body.appendChild(acts);
    }
    c.appendChild(body);
    return c;
  }

  function render() {
    renderBar();
    const { tx, photos } = source();
    const stock = cvStock(tx);
    const buys = tx.filter((t) => cvKind(t) === "compra");
    const sells = tx.filter((t) => cvKind(t) === "venta");
    const sum = (a) => a.reduce((s, t) => s + (Number(t.price) || 0), 0);
    $("cv-kpi-stock").textContent = String(stock.length);
    $("cv-kpi-stock-sub").textContent = `${fmtMoney(sum(stock))} invertidos`;
    $("cv-kpi-buy").textContent = fmtMoney(sum(buys));
    $("cv-kpi-buy-sub").textContent = `${buys.length} compras · sale de la sociedad`;
    $("cv-kpi-sell").textContent = fmtMoney(sum(sells));
    $("cv-kpi-sell-sub").textContent = `${sells.length} ventas · entra a la sociedad`;
    const bal = sum(sells) - sum(buys);
    $("cv-kpi-bal").textContent = (bal < 0 ? "- " : "") + fmtMoney(Math.abs(bal));
    $("cv-kpi-bal-sub").textContent = `${tx.length} movimientos registrados`;

    // Almacen
    const grid = $("cv-stock");
    grid.innerHTML = "";
    const q = normalizeKeySimple($("cv-stock-q").value);
    const shown = stock.filter((t) => !q || normalizeKeySimple(`${t.model} ${t.plate} ${t.owner} ${t.mediator}`).includes(q));
    shown.forEach((t) => grid.appendChild(card(t, photos)));
    $("cv-stock-empty").hidden = shown.length > 0;
    $("cv-stock-empty").textContent = stock.length
      ? "Ningún vehículo coincide con la búsqueda."
      : "No hay vehículos en el almacén. Aparecen aquí los que compra la empresa y todavía no se han vendido.";

    // Historial (lo mas reciente arriba)
    const hq = normalizeKeySimple($("cv-hist-q").value);
    const kindF = $("cv-hist-kind").value;
    const body = $("cv-hist");
    body.innerHTML = "";
    const rows = tx
      .slice()
      .reverse()
      .filter((t) => (!kindF || cvKind(t) === kindF) && (!hq || normalizeKeySimple(`${t.model} ${t.plate} ${t.owner} ${t.buyer} ${t.mediator}`).includes(hq)));
    const labels = { compra: "Compra", venta: "Venta", traspaso: "Traspaso" };
    for (const t of rows) {
      const tr = el("tr");
      const k = cvKind(t);
      tr.appendChild(el("td", "cv-date", t.ts || "-"));
      const tdK = el("td");
      tdK.appendChild(el("span", `cv-badge cv-${k}`, labels[k]));
      tr.appendChild(tdK);
      const tdV = el("td");
      tdV.appendChild(el("b", "", t.model.toUpperCase()));
      tdV.appendChild(el("span", "cv-plate-sm", t.plate));
      tr.appendChild(tdV);
      tr.appendChild(el("td", cvIsSociety(t.owner) ? "cv-soc" : "", cvDisplayName(t.owner)));
      tr.appendChild(el("td", cvIsSociety(t.buyer) ? "cv-soc" : "", cvDisplayName(t.buyer)));
      tr.appendChild(el("td", "", cvDisplayName(t.mediator)));
      tr.appendChild(el("td", `num cv-money-${k}`, (k === "compra" ? "− " : k === "venta" ? "+ " : "") + fmtMoney(t.price)));
      body.appendChild(tr);
    }
    $("cv-hist-empty").hidden = rows.length > 0;
  }

  // ---------- lectura de la base en linea ----------
  async function loadCloud() {
    if (!hasAccess()) return loadStockOnly();
    try {
      const [rows, photos] = await Promise.all([
        cvCloud.selectAll("cv_tx", "sort.asc,uid.asc"),
        cvCloud.selectAll("cv_photos", "plate.asc"),
      ]);
      cloud.tx = rows.map((r, i) => ({
        uid: r.uid,
        ts: r.ts || "",
        sort: r.sort || "",
        mediator: r.mediator || "",
        owner: r.owner || "",
        buyer: r.buyer || "",
        price: Number(r.price) || 0,
        model: r.model || "",
        plate: r.plate || "",
        company: r.company || "",
        seq: i + 1,
      }));
      cloud.photoPaths = {};
      for (const ph of photos) cloud.photoPaths[ph.plate] = ph.path;
      cloud.photoUrls = await cvSignedUrls(Object.values(cloud.photoPaths));
      cloud.ok = true;
      cloud.reachable = true;
      cloud.error = "";
      cloud.loadedAt = new Date();
      CV_CLOUD_CACHE = { tx: cloud.tx, photoPaths: cloud.photoPaths };
    } catch (e) {
      cloud.ok = false;
      cloud.reachable = !!e.status;
      cloud.error =
        e.code === "PGRST205" || e.code === "42P01" || e.status === 404
          ? "La base en línea aún no tiene las tablas (falta pegar el SQL en Supabase). Se usan los datos de esta PC."
          : `${e.message} Se usan los datos de esta PC.`;
    }
    cloud.tried = true;
    render();
  }

  // Empleados (no Jefes): la base solo les da lo que hay en el almacen.
  async function loadStockOnly() {
    try {
      const rows = (await cvCloud.req("/rest/v1/rpc/almacen", { method: "POST", body: {} })) || [];
      cloud.tx = rows.map((r, i) => ({
        uid: r.uid,
        ts: r.ts || "",
        sort: r.sort || "",
        mediator: r.mediator || "",
        owner: r.owner || "",
        buyer: r.buyer || "",
        price: Number(r.price) || 0,
        model: r.model || "",
        plate: r.plate || "",
        company: r.company || "",
        seq: i + 1,
      }));
      cloud.photoPaths = {};
      for (const r of rows) if (r.photo) cloud.photoPaths[r.plate] = r.photo;
      cloud.photoUrls = await cvSignedUrls(Object.values(cloud.photoPaths));
      cloud.ok = true;
      cloud.reachable = true;
      cloud.error = "";
      cloud.loadedAt = new Date();
    } catch (e) {
      cloud.ok = false;
      cloud.reachable = !!e.status;
      cloud.error =
        e.status === 404 || e.code === "PGRST202"
          ? "El almacén aún no está disponible para empleados (falta el SQL en Supabase)."
          : e.message;
    }
    cloud.tried = true;
    render();
  }

  // Aplica a la base en linea lo que cambio entre "antes" y "despues".
  async function pushChanges(before, data) {
    const old = new Map(before.tx.map((t) => [t.uid, JSON.stringify(CV_FIELDS.map((f) => t[f]))]));
    let n = 0;
    const rows = [];
    for (const t of data.tx) {
      if (!t.uid) t.uid = cvNewUid(n++);
      const cur = JSON.stringify(CV_FIELDS.map((f) => t[f]));
      if (old.get(t.uid) !== cur) rows.push(Object.fromEntries(CV_FIELDS.map((f) => [f, f === "price" ? Number(t[f]) || 0 : t[f] ?? ""])));
    }
    if (rows.length) await cvCloud.upsert("cv_tx", rows, "uid");
    // Fotos que cambiaron de matricula al corregir un registro.
    const moved = Object.entries(data.photos).filter(([plate, path]) => before.photos[plate] !== path);
    if (moved.length) await cvCloud.upsert("cv_photos", moved.map(([plate, path]) => ({ plate, path })), "plate");
    for (const plate of Object.keys(before.photos)) {
      if (!(plate in data.photos)) await cvCloud.del("cv_photos", `plate=eq.${encodeURIComponent(plate)}`);
    }
    return rows.length;
  }

  async function guarded(fn) {
    if (busy) return;
    busy = true;
    root.classList.add("is-busy");
    try {
      await fn();
    } catch (e) {
      setStatus(`⚠️ ${e.message || e}`);
      alert(`No se pudo guardar en línea: ${e.message || e}`);
    } finally {
      busy = false;
      root.classList.remove("is-busy");
    }
  }

  $("cv-stock-q").addEventListener("input", render);
  $("cv-hist-q").addEventListener("input", render);
  $("cv-hist-kind").addEventListener("change", render);

  $("cv-refresh").addEventListener("click", () => loadCloud());

  // Pasa a la nube el historial y las fotos guardados en esta PC.
  $("cv-migrate").addEventListener("click", () =>
    guarded(async () => {
      const local = cvLoadLocal();
      if (!window.confirm(`¿Subir a la base en línea las ${local.tx.length} transacciones y ${Object.keys(local.photos).length} fotos de esta PC? Lo repetido no se duplica.`)) return;
      setStatus("Subiendo el historial de esta PC…");
      await loadCloud();
      if (!online()) throw new Error(cloud.error);
      const before = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
      const data = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
      const incoming = local.tx.map(({ seq, uid, ...t }) => ({ ...t, sort: t.sort || cvSortKey(t.ts) }));
      const added = cvMerge(data, incoming);
      delete data.lastFixed;
      await pushChanges(before, data);
      let ph = 0;
      for (const [plate, src] of Object.entries(local.photos)) {
        if (data.photos[plate]) continue;
        const path = cvPhotoPath(plate);
        await cvCloud.uploadPhoto(path, cvDataUrlToBlob(src));
        await cvCloud.upsert("cv_photos", [{ plate, path }], "plate");
        ph++;
      }
      await loadCloud();
      setStatus(`☁️ Subidas ${added} transacciones nuevas y ${ph} fotos. Ya están en línea para todos.`);
      if (window.confirm("Listo. ¿Borrar la copia de esta PC? (ya está todo en línea)")) {
        cvSaveLocal({ tx: [], photos: {} });
        render();
      }
    })
  );

  // ---------- fotos: recorte con Ctrl+V, archivo o arrastrar ----------
  const photoDlg = $("cv-photo-dlg");
  const photoErr = $("cv-photo-err");

  function openPhotoDialog(plate) {
    photoPlate = plate;
    $("cv-photo-plate").textContent = plate;
    photoErr.textContent = "";
    photoDlg.showModal();
    $("cv-drop").focus();
  }

  async function savePhoto(blob) {
    if (!blob || !photoPlate) return;
    if (!String(blob.type || "").startsWith("image/")) {
      photoErr.textContent = "Eso no es una imagen. Haz el recorte y vuelve a pegar.";
      return;
    }
    let src;
    try {
      src = await cvCompressImage(blob);
    } catch (e) {
      photoErr.textContent = String(e?.message || e);
      return;
    }
    const plate = photoPlate;
    if (online()) {
      photoErr.textContent = "Subiendo la foto…";
      await guarded(async () => {
        const path = cvPhotoPath(plate);
        const old = cloud.photoPaths[plate];
        await cvCloud.uploadPhoto(path, cvDataUrlToBlob(src));
        await cvCloud.upsert("cv_photos", [{ plate, path }], "plate");
        if (old) await cvCloud.removePhotos([old]).catch(() => {});
        photoDlg.close();
        await loadCloud();
      });
      if (photoDlg.open) photoErr.textContent = "No se pudo subir la foto. Prueba otra vez.";
      return;
    }
    const data = cvLoadLocal();
    data.photos[plate] = src;
    if (!cvSaveLocal(data)) {
      photoErr.textContent = "No hay espacio para más fotos en este navegador. Quita fotos de vehículos que ya no estén.";
      return;
    }
    photoDlg.close();
    render();
  }

  function removePhoto(plate) {
    if (!window.confirm(`¿Quitar la foto de ${plate}?`)) return;
    if (online()) {
      guarded(async () => {
        const path = cloud.photoPaths[plate];
        await cvCloud.del("cv_photos", `plate=eq.${encodeURIComponent(plate)}`);
        if (path) await cvCloud.removePhotos([path]).catch(() => {});
        await loadCloud();
      });
      return;
    }
    const data = cvLoadLocal();
    delete data.photos[plate];
    cvSaveLocal(data);
    render();
  }

  const imageFrom = (items) => {
    for (const it of items || []) {
      if (it.kind === "file" && it.type.startsWith("image/")) return it.getAsFile();
    }
    return null;
  };

  document.addEventListener("paste", (e) => {
    if (!photoDlg.open) return;
    e.preventDefault();
    const img = imageFrom(e.clipboardData?.items);
    if (img) savePhoto(img);
    else photoErr.textContent = "No hay ninguna imagen copiada. Haz el recorte con Windows + Shift + S y vuelve a pulsar Ctrl + V.";
  });

  $("cv-photo-paste").addEventListener("click", async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((ty) => ty.startsWith("image/"));
        if (type) return savePhoto(await it.getType(type));
      }
      photoErr.textContent = "No hay ninguna imagen copiada. Haz el recorte con Windows + Shift + S.";
    } catch {
      photoErr.textContent = "El navegador no deja leer el portapapeles con el botón: pulsa Ctrl + V.";
    }
  });

  const drop = $("cv-drop");
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("is-over");
    const f = e.dataTransfer?.files?.[0];
    if (f) savePhoto(f);
  });

  $("cv-photo-file").addEventListener("click", () => {
    $("cv-file").value = "";
    $("cv-file").click();
  });
  $("cv-photo-cancel").addEventListener("click", () => photoDlg.close());
  $("cv-file").addEventListener("change", () => savePhoto($("cv-file").files?.[0]));

  // ---------- procesar el log ----------
  function summary(found, added, fixed) {
    return (
      `Leídas ${found} transacciones: ${added} nuevas, ${found - added} ya estaban.` +
      (fixed ? ` Se corrigió la matrícula de ${fixed}.` : "")
    );
  }

  async function process() {
    const found = cvParseLog($("cv-input").value);
    if (!found.length) {
      setStatus("No se encontró ninguna «Transacción de vehículo» en el texto.");
      return;
    }
    if (online()) {
      await guarded(async () => {
        setStatus("Guardando en línea…");
        await loadCloud(); // por si otro encargado cambio algo
        if (!online()) throw new Error(cloud.error);
        const before = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
        const data = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
        const added = cvMerge(data, found);
        const fixed = data.lastFixed || 0;
        delete data.lastFixed;
        await pushChanges(before, data);
        $("cv-input").value = "";
        await loadCloud();
        setStatus(`☁️ ${summary(found.length, added, fixed)} Ya está en línea para todos.`);
      });
      return;
    }
    const data = cvLoadLocal();
    const added = cvMerge(data, found);
    const fixed = data.lastFixed || 0;
    delete data.lastFixed;
    cvSaveLocal(data);
    setStatus(summary(found.length, added, fixed));
    $("cv-input").value = "";
    render();
  }
  $("cv-process").addEventListener("click", process);
  $("cv-paste").addEventListener("click", async () => {
    try {
      $("cv-input").value = await navigator.clipboard.readText();
    } catch {
      setStatus("No se pudo leer el portapapeles: pega el texto con Ctrl+V y pulsa Procesar.");
      return;
    }
    process();
  });
  $("cv-reset").addEventListener("click", () => {
    if (online()) {
      if (!window.confirm("¿Borrar TODO el historial y las fotos de la base EN LÍNEA? Lo dejarán de ver todos.")) return;
      if (window.prompt('Para confirmar escribe BORRAR') !== "BORRAR") return;
      guarded(async () => {
        const paths = Object.values(cloud.photoPaths);
        await cvCloud.del("cv_tx", "uid=not.is.null");
        await cvCloud.del("cv_photos", "plate=not.is.null");
        await cvCloud.removePhotos(paths).catch(() => {});
        await loadCloud();
        setStatus("Historial en línea borrado.");
      });
      return;
    }
    if (!window.confirm("¿Borrar todo el historial de compraventa y las fotos de esta PC?")) return;
    cvSaveLocal({ tx: [], photos: {} });
    setStatus("Historial borrado.");
    render();
  });

  // Se ve al momento con lo de esta PC; luego se conecta y se mantiene al dia
  // (cada 45 s mientras la pestana esta abierta y al volver a la ventana).
  render();
  if (canSeeStock()) loadCloud();
  else {
    cloud.tried = true;
    cloud.error = "Solo para Jefes.";
    render();
  }
  const tabActive = () => root.classList.contains("is-active") && document.visibilityState === "visible";
  setInterval(() => {
    if (!busy && canSeeStock() && tabActive()) loadCloud();
  }, 45000);
  document.addEventListener("visibilitychange", () => {
    if (!busy && canSeeStock() && tabActive()) loadCloud();
  });
  document.querySelector('.tab[data-tab-target="tab-cv"]')?.addEventListener("click", () => {
    if (!busy && canSeeStock() && cloud.tried) setTimeout(() => tabActive() && loadCloud(), 50);
  });
}
