// Aguila Motors · Catálogo de la Caja: gamas, piezas de tuning, servicios, rangos, mensajes de Discord y productos gestionados.
// (productos.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

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
  { key: "compraventa", label: "Mediación de Venta" },
  { key: "informes", label: "Informes" },
  { key: "informes_policia", label: "Informes · Policía" },
  { key: "informes_particular", label: "Informes · Particular" },
  { key: "informes_recargos", label: "Informes · Recargos" },
  { key: "otros", label: "Otros" },
];

// Iconos pequenos de las pestanas de categoria (v85).
const CAT_TAB_ICONS = {
  informes: '<path d="M12 2.5l8 3v6c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10v-6z"/><path d="M8.5 12l2.4 2.4 4.6-4.8"/>',
  informes_policia: '<path d="M12 3l1.8 3.6 4 .6-2.9 2.8.7 4L12 12.1 8.4 14l.7-4-2.9-2.8 4-.6z"/><path d="M7 21h10M9 17h6"/>',
  informes_particular: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  informes_recargos: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  motos: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-6h5l4 6M9.5 10.5L8 7H5.5M14.5 10.5l1.5-3.5h2.5"/>',
  car: '<path d="M3 15l2-5h14l2 5v3H3z"/><path d="M7 10l2-3h6l2 3"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>',
  vip: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12"/>',
  camiones: '<path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  aereos: '<path d="M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4l8 2z"/>',
  full_tuning: '<path d="M12 2.2l8.3 3.1v6.2c0 5.2-3.6 8.8-8.3 10.3-4.7-1.5-8.3-5.1-8.3-10.3V5.3z"/><path d="M7.5 14a4.5 4.5 0 0 1 9 0"/><path d="M12 14l3-2.8"/>',
  servicios_taller: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0 5-5l-2 2-2-2z"/>',
  servicios_grua: '<path d="M4 20h16M6 20V8l10-4v4"/><path d="M16 8v5a2 2 0 1 1-2 2"/>',
  tienda: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  camaleonica: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-2c1-3-2-11-7-11z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/>',
  nitro: '<rect x="7" y="5" width="10" height="17" rx="3.8"/><path d="M10.5 5V2.8h3V5M9 2.4h6"/><rect x="7.8" y="10" width="8.4" height="6.5" rx="1" fill="currentColor" stroke="none"/>',
  neones: '<path d="M4 16c2-4 4-4 6 0s4 4 6 0 4-4 4-4"/><path d="M4 10c2-4 4-4 6 0s4 4 6 0"/>',
  compraventa: '<path d="M2 8l4-2 4 2 3-2 4 1 5 3"/><path d="M2 8v6l3 2M22 10v5l-3 2"/><path d="M8 14l3 3a1.5 1.5 0 0 0 2.2-2l-3-3"/><path d="M11 17l1.5 1.5a1.5 1.5 0 0 0 2.2-2L13 15M14.5 16.5a1.5 1.5 0 0 0 2.2-2L13 11l-2 1.5a1.8 1.8 0 0 1-2.5-2.5L10 8"/>',
  otros: '<circle cx="12" cy="12" r="3"/>',
};
function catTabIconSvg(key) {
  const d = CAT_TAB_ICONS[key] || (/^gama_(baja|media|alta)$/.test(key) ? CAT_TAB_ICONS.car : CAT_TAB_ICONS[key === "gama_vip" ? "vip" : "otros"]);
  return `<svg class="cat-ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
}

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
  motos:      [800, 800, 800, 800, 800, 650, 800, 800, 900, 900, 900, 900, 900, 900, 10000],
  gama_baja:  [600, 600, 600, 600, 800, 450, 600, 600, 700, 700, 700, 700, 700, 700, 10000],
  gama_media: [950, 950, 950, 950, 950, 750, 950, 950, 1100, 1100, 1100, 1100, 1100, 1100, 20000],
  gama_alta:  [1550, 1550, 1550, 1500, 1550, 1150, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
  gama_vip:   [1550, 1550, 1550, 1500, 1550, 1150, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 1600, 50000],
  // Camiones: mismos precios que Gama Alta (su precio de compra es parecido).
  camiones:   [1550, 1550, 1550, 1500, 1550, 1150, 1500, 1500, 1600, 1600, 1600, 1600, 1600, 1600, 40000],
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
  "Repostaje + Limpieza (Grúa)": ["Gas+Limp", "G"],
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
  "Mediación de Venta (Gama Baja)": ["Mediac", "GB"],
  "Mediación de Venta (Gama Media)": ["Mediac", "GM"],
  "Mediación de Venta (Gama Alta)": ["Mediac", "GA"],
  "Mediación de Venta (Gama Camiones)": ["Mediac", "CAM"],
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
  // Orden: Reparacion, Limpieza, Repostaje y luego los packs de menor a mayor.
  // Packs: siempre mas baratos que por separado; el de 3 servicios, mas que cualquiera de 2.
  { name: "Reparación (Taller)", price: 800, category: "servicios_taller" },
  { name: "Limpieza (Taller)", price: 400, category: "servicios_taller" },
  { name: "Repostaje (Taller)", price: 300, category: "servicios_taller" },
  { name: "Repostaje + Limpieza (Taller)", price: 600, category: "servicios_taller" },
  { name: "Reparación + Repostaje (Taller)", price: 900, category: "servicios_taller" },
  { name: "Reparación + Limpieza (Taller)", price: 1000, category: "servicios_taller" },
  { name: "Reparación + Limpieza + Repostaje (Taller)", price: 1200, category: "servicios_taller" },

  // Servicios fuera del taller (grua)
  { name: "Reparación (Grúa)", price: 800, category: "servicios_grua" },
  { name: "Bayetas o Limpieza (Grúa)", price: 400, category: "servicios_grua" },
  { name: "Repostaje (Grúa)", price: 300, category: "servicios_grua" },
  { name: "Repostaje + Limpieza (Grúa)", price: 600, category: "servicios_grua" },
  { name: "Reparación + Repostaje (Grúa)", price: 900, category: "servicios_grua" },
  { name: "Reparación + Limpieza (Grúa)", price: 1000, category: "servicios_grua" },
  { name: "Reparación + Limpieza + Repostaje (Grúa)", price: 1200, category: "servicios_grua" },
  { name: "Grúa Terrestre", price: 1500, category: "servicios_grua" },
  { name: "Grúa Aérea", price: 3500, category: "servicios_grua" },
  { name: "Rescate Aéreo Completo", price: 4500, category: "servicios_grua", note: "Incluye grúa aérea, reparación, limpieza y repostaje" },

  // Informes de inspeccion (v104): solo los ve el Jefe Aguila en la Caja.
  // Tarifa policia / particular y recargos (los de % se calculan con los informes del ticket).
  { name: "Informe Nitro (Policía)", price: 15000, category: "informes_policia", short: "Nitro", group: "Inf Pol" },
  { name: "Informe Incautado (Policía)", price: 12000, category: "informes_policia", short: "Incaut", group: "Inf Pol" },
  { name: "Peritaje Daños (Policía)", price: 10000, category: "informes_policia", short: "Perit", group: "Inf Pol" },
  { name: "Certif. Modificaciones (Policía)", price: 8000, category: "informes_policia", short: "Modif", group: "Inf Pol" },
  { name: "Gestión Grúa (Policía)", price: 5000, category: "informes_policia", short: "Grua", group: "Inf Pol" },
  { name: "Informe Nitro (Particular)", price: 3000, category: "informes_particular", short: "Nitro", group: "Inf Part" },
  { name: "Peritaje Daños (Particular)", price: 2500, category: "informes_particular", short: "Perit", group: "Inf Part" },
  { name: "Certif. Modificaciones (Particular)", price: 2500, category: "informes_particular", short: "Modif", group: "Inf Part" },
  { name: "Presupuesto (Particular)", price: 500, category: "informes_particular", short: "Presup", group: "Inf Part" },
  { name: "Urgencia +50% (Informe)", price: 0, category: "informes_recargos", short: "Urg", group: "Rec", note: "50 % de los informes del ticket" },
  { name: "Horario Nocturno +100% (Informe)", price: 0, category: "informes_recargos", short: "Noct", group: "Rec", note: "100 % de los informes del ticket" },
  { name: "Fuera del Taller (Informe)", price: 5000, category: "informes_recargos", short: "Fuera", group: "Rec" },
  { name: "Vehículo Adicional 70% (Informe)", price: 0, category: "informes_recargos", short: "VehAd", group: "Rec", note: "70 % del informe más caro, por cada vehículo" },

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
  { name: "Mediación de Venta (Gama Baja)", price: 2500, category: "compraventa" },
  { name: "Mediación de Venta (Gama Media)", price: 5000, category: "compraventa" },
  { name: "Mediación de Venta (Gama Alta)", price: 10000, category: "compraventa" },
  { name: "Mediación de Venta (Gama Camiones)", price: 7500, category: "compraventa" },
];

// v129 · Precio de empleado (solo el Jefe Aguila lo activa en la Caja).
// Porcentaje por tipo de servicio, sobre el precio vigente y redondeado a 50:
// tuning (piezas y Full Tuning) 50 %, neones RGB 50 %, servicios de taller y
// grúa 50 %, camaleónica 40 %, instalación de nitro 35.000 → 25.000 (5/7),
// botella de nitro 25 %. Tienda, informes y compraventa: sin descuento.
const EMP_PRICE_FACTOR = {
  motos: 0.5, gama_baja: 0.5, gama_media: 0.5, gama_alta: 0.5, gama_vip: 0.5, camiones: 0.5, aereos: 0.5, full_tuning: 0.5,
  neones: 0.5, servicios_taller: 0.5, servicios_grua: 0.5, camaleonica: 0.6,
};
function empPrice(p) {
  if (!p || !(p.price > 0)) return p?.price || 0;
  const r50 = (v) => Math.round(v / 50) * 50;
  if (p.category === "nitro") return r50(p.price * (/instalaci/i.test(p.name) ? 5 / 7 : 0.75));
  const f = EMP_PRICE_FACTOR[p.category];
  return f ? r50(p.price * f) : p.price;
}
const EMP_CONCEPT_TAG = "EMP"; // marca en el concepto del datáfono: "EMP Turbo GA"

const PRODUCTS = [
  ...buildTuningProducts(),
  ...SERVICE_PRODUCTS.map((p) => {
    const [short, group] = SERVICE_SHORT[p.name] || [p.short || p.name, p.group || ""];
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

// Nombres que se ven (desde la v78, los mismos que en el juego). Por dentro, en
// la base y en las reglas, cada rango conserva su nombre original (Chalan,
// Experimentado, Subjefe, Jefe): asi no cambian permisos, comisiones ni roles.
// "Mano Derecha" solo existe en Discord y en las pagas: no se renombra.
const DEFAULT_RANK_NAMES = {
  "Chalán": "Aprendiz",
  "Experimentado": "Especialista",
  "Subjefe": "Jefe de Taller",
  "Jefe": "Gerente",
};

function rankLabel(rank) {
  const found = RANKS.find((r) => normalizeKeySimple(r.label) === normalizeKeySimple(rank));
  if (!found) return rank || "";
  return String(RANK_NAMES[found.label] || "").trim() || DEFAULT_RANK_NAMES[found.label] || found.label;
}

// Empleado de la Semana: quien mas cobra (sin bono) entre los que cobran,
// sin contar al Jefe Aguila (con el 100 % ganaria siempre). Si hay empate,
// cada ganador recibe el bono completo.
const WEEK_BONUS = 10000;

// ---------------------------------------------------------------------------
// Ascensos y descensos: se mide lo FACTURADO en la semana (facturas + kits).
// Minimo igual para todos para mantener el rango (los Chalanes no bajan) y
// una meta por rango para ascender. Jefe, Mano Derecha y Jefe Aguila los da
// solo el Jefe Aguila: aqui nunca se proponen. Los umbrales los cambia el
// Jefe Aguila (se guardan en linea, app_settings "rank_rules").
// ---------------------------------------------------------------------------
const RANK_ROLE_IDS = {
  "Chalán": "1263156546532151376",
  "Mecánico": "1263156546532151377",
  "Experimentado": "1263156546532151378",
  "Subjefe": "1263156546532151383",
  "Jefe": "1263156546532151385",
};
const RANK_RULES_DEFAULT = { min: 40000, up: { "Chalán": 60000, "Mecánico": 120000, "Experimentado": 200000 }, candidate: 300000 };
let RANK_RULES = JSON.parse(JSON.stringify(RANK_RULES_DEFAULT));
const PROMO_LADDER = ["Chalán", "Mecánico", "Experimentado", "Subjefe"];
const UP_REASONS = [
  "por su excelente labor y compromiso con el taller. 🏆",
  "por su gran rendimiento esta semana. 🔧",
  "por su constancia y dedicación. 💪",
  "por estar a la altura y dar siempre el máximo. 🔥",
];
const DOWN_REASON = "por no alcanzar el mínimo de facturación de su rango.";

// ---------------------------------------------------------------------------
// v117 · Ascensos de la semana para Discord (Gestión de empleados → 📣).
// Lee del historial (emp_historial, tipo "rango") los ascensos hechos al
// cerrar una semana y arma el mensaje con la mención de cada empleado, los
// roles de Discord del rango anterior y del nuevo y una felicitación al azar
// para cada uno. Cierra con una frase del taller y la etiqueta de Jefatura.
// ---------------------------------------------------------------------------
const ASC_MOTIVOS = [
  "por su excelente labor y compromiso con el taller. 🏆",
  "por su gran rendimiento esta semana. 🔧",
  "por su constancia y dedicación. 💪",
  "por estar a la altura y dar siempre el máximo. 🔥",
  "por dejar cada vehículo como recién salido de fábrica. 🚗",
  "por no soltar la llave inglesa ni un solo turno. 🛠️",
  "por su trabajo impecable bajo el capó. ⚙️",
  "por ser de los que más facturan y mejor atienden. 💰",
  "por su seriedad y profesionalidad con cada cliente. 🤝",
  "por tirar del taller cuando más falta hacía. 🦅",
  "por su precisión en cada reparación. 🔩",
  "por ir siempre a toda máquina. 🏎️",
  "por ser un ejemplo para sus compañeros de box. ⭐",
  "por su esfuerzo diario en el elevador. 💪",
  "por ponerle turbo a la facturación del taller. 📈",
  "por su compromiso y buen hacer con las herramientas. 🧰",
  "por demostrar semana tras semana de qué pasta está hecho. 🦅",
  "por su dedicación incansable en el taller. ⏱️",
  "por convertir cada encargo en un trabajo de primera. 🥇",
  "por su ética de trabajo y su constancia en el box. 🔧",
  "por superar con creces lo que se esperaba de su rango. 🚀",
  "por su trato impecable con los clientes. 🤝",
  "por no bajar el ritmo ni en los turnos más duros. 💪",
  "por su compromiso con el nombre de Aguila Motors. 🏆",
  "por afinar cada motor como si fuera el suyo. ⚙️",
  "por ganarse el ascenso a base de horas de elevador. 🛞",
  "por su talento con las llaves y su actitud en el equipo. 🛠️",
  "por ser de los primeros en llegar y de los últimos en irse. 🌙",
  "por su evolución imparable dentro del taller. 📈",
  "por dar siempre un extra en cada reparación. ✨",
];
const ASC_FRASES = [
  "Más rango, más responsabilidad: que se note en cada reparación. 🔧",
  "Las llaves pesan más arriba, pero sabemos que podéis con ellas. 🛠️",
  "El taller crece con gente como vosotros. ¡A por más! 🦅",
  "Motor afinado y a toda máquina: ¡enhorabuena por el ascenso! 🏁",
  "Cada coche que sale perfecto lleva vuestra firma. ¡Seguid así! 🚗",
  "Grasa en las manos y el rango en el pecho. ¡Os lo habéis ganado! 💪",
  "De la llave inglesa al siguiente nivel: el esfuerzo tiene premio. 🔩",
  "Turbo activado: el Aguila sube con vosotros. 🔥",
  "Buen trabajo, mejor equipo. ¡Felicidades y a seguir apretando tuercas! ⚙️",
  "Aquí nadie regala nada: cada ascenso se gana en el elevador. 🏆",
  "Pistones a tope y sin frenar: ¡enhorabuena a los ascendidos! 🏎️",
  "El orgullo del taller sois vosotros. ¡Que siga rugiendo el motor! 🦅",
  "Diagnóstico claro: talento, constancia y compromiso. ¡Felicidades! 🔧",
  "Nuevo rango, mismo hambre: a dejar el listón del taller bien alto. 📈",
  "Del box al siguiente escalón: Aguila Motors está orgulloso de vosotros. 🏁",
  "Nuevo rango, nuevas metas: el taller confía en vosotros. ¡A por ellas! 🎯",
  "El esfuerzo siempre encuentra su recompensa en este taller. ¡Enhorabuena! 🏆",
  "Seguid apretando tuercas, que el Aguila no deja de crecer. 🦅",
  "Hoy subís un escalón; mañana, a por el siguiente. ¡Felicidades! 🪜",
  "Con mecánicos así, el motor del taller nunca se para. ⚙️",
  "Os lo habéis currado: disfrutad del ascenso y a seguir sumando. 💪",
  "Que este rango sea solo el principio. ¡Enhorabuena, equipo! 🚀",
  "El trabajo bien hecho no pasa desapercibido en Aguila Motors. ⭐",
  "Más arriba, más ejemplo: que se note el nuevo rango en el box. 🔧",
  "Gasolina en el depósito y ganas de más: ¡felicidades a los ascendidos! ⛽",
];
const ascFraseAzar = (prev = "") => {
  const pool = ASC_FRASES.filter((f) => f !== prev);
  return pool[Math.floor(Math.random() * pool.length)] || ASC_FRASES[0];
};
// Una felicitación distinta para cada uno (sin repetir mientras haya).
function ascMotivosAzar(n) {
  const out = [];
  let bag = [];
  for (let i = 0; i < n; i++) {
    if (!bag.length) bag = [...ASC_MOTIVOS].sort(() => Math.random() - 0.5);
    out.push(bag.pop());
  }
  return out;
}
// Rol de Discord de la Jefatura: se etiqueta siempre al final del mensaje.
// Para cambiar de rol, cambia solo el número.
const DC_JEFATURA_ID = "1430927770938114230";
// Emoji oficial del Aguila Motors en el servidor de Discord (:aguilamotors:).
// En los mensajes para Discord sustituye al 🦅.
const DC_AGUILA_EMOJI = "<:aguilamotors:1553837572307030126>";
// Rol de toda la plantilla (Mecánicos): se etiqueta en los avisos para todos.
const DC_STAFF_ROLE_ID = "1263156546519433335";
const dcStaff = () => (DC_STAFF_ROLE_ID ? `📣 <@&${DC_STAFF_ROLE_ID}> · ` : "");
const dcAguila = (t) => String(t || "").replace(/🦅/g, DC_AGUILA_EMOJI);
// Nombre visible (o interno) de un rango → nombre interno ("Aprendiz" → "Chalán").
function rankFromText(t) {
  const k = normalizeKeySimple(t);
  if (!k || k === "sin rango") return "";
  const r = RANKS.find((x) => normalizeKeySimple(x.label) === k || normalizeKeySimple(rankLabel(x.label)) === k || normalizeKeySimple(DEFAULT_RANK_NAMES[x.label] || "") === k);
  return r ? r.label : null;
}
// "⬆️ Ascendido de Aprendiz a Mecánico" → { up, from, to } (rangos internos).
function parseRankLog(texto) {
  const m = String(texto || "").match(/(Ascendido|Bajado) de (.+)$/);
  if (!m) return null;
  const parts = m[2].split(" a ");
  for (let i = 1; i < parts.length; i++) {
    const from = rankFromText(parts.slice(0, i).join(" a "));
    const to = rankFromText(parts.slice(i).join(" a "));
    if (from !== null && to !== null) return { up: m[1] === "Ascendido", from, to };
  }
  return null;
}
// Semanas de domingo a sábado (las mismas de Pagos y los strikes).
const ascDay = (d, add = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);
const ascSunday = (d) => ascDay(d, -d.getDay());
const ascDM = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
// Semana que se anuncia por defecto: la última cerrada (los ascensos se dan
// al cerrarla). Hoy domingo 08/11 → semana del 01/11 al 07/11.
const ascDefaultWeek = () => ascSunday(ascDay(new Date(), -7));
// Ascensos de la semana que empieza el domingo `sun`: los dados desde su
// sábado de cierre hasta el sábado siguiente. Si alguien sube dos veces se
// junta en uno (de su primer rango al último).
async function ascensosSemana(sun, people) {
  const a = ascDay(sun, 6).toISOString();
  const b = ascDay(sun, 14).toISOString();
  const rows = await cvCloud.req(`/rest/v1/emp_historial?select=employee_id,at,texto&tipo=eq.rango&at=gte.${encodeURIComponent(a)}&at=lt.${encodeURIComponent(b)}&order=at.asc`, { auth: true });
  const by = new Map();
  for (const r of rows || []) {
    const p = parseRankLog(r.texto);
    if (!p) continue;
    const cur = by.get(String(r.employee_id));
    if (cur) cur.to = p.to;
    else by.set(String(r.employee_id), { id: String(r.employee_id), from: p.from, to: p.to, at: r.at });
  }
  const out = [];
  for (const it of by.values()) {
    if (rankOrder(it.to) <= rankOrder(it.from)) continue;
    const e = people.find((x) => String(x.id) === it.id);
    if (!e) continue;
    out.push({ ...it, name: fullName(e), discord: String(e.discord || "").replace(/\D/g, "") });
  }
  return out.sort((p, q) => rankOrder(q.to) - rankOrder(p.to) || p.name.localeCompare(q.name, "es"));
}
function ascDiscordText(items, sun, frase) {
  if (!items.length) return "";
  const role = (r) => (RANK_ROLE_IDS[r] ? `<@&${RANK_ROLE_IDS[r]}>` : `**${rankLabel(r) || "sin rango"}**`);
  const who = (it) => (it.discord ? `<@${it.discord}>` : `**${it.name}**`);
  const lines = items.map((it) => `⬆️ ${who(it)} pasa de ${role(it.from)} a ${role(it.to)} ${it.motivo}`);
  const jef = DC_JEFATURA_ID ? `<@&${DC_JEFATURA_ID}>` : "**Jefatura**";
  return dcAguila(`# 📈 ASCENSOS DE LA SEMANA\n-# Semana del ${ascDM(sun)} al ${ascDM(ascDay(sun, 6))} · Aguila Motors 🦅\n\n${lines.join("\n")}\n\n${frase}\n-# — ${jef} · Aguila Motors`);
}

// ---------------------------------------------------------------------------
// v119 · Descensos y bajas de la semana (mismo mensaje). El tipo de baja se
// elige al despedir y se guarda al principio del motivo ("Inactividad: …"),
// así no hace falta tocar la base. Los despidos antiguos se clasifican por
// su texto. Las notas del motivo nunca salen en el mensaje.
// ---------------------------------------------------------------------------
const BAJA_TIPOS = [
  { k: "voluntaria", e: "👋", label: "Baja voluntaria", hint: "Se va del taller por decisión propia" },
  { k: "inactividad", e: "💤", label: "Inactividad", hint: "Deja de aparecer por el taller" },
  { k: "strikes", e: "⚠️", label: "3 strikes", hint: "No llegó al mínimo de facturación" },
  { k: "expulsion", e: "🚫", label: "Expulsión", hint: "Conducta, normas o sanción" },
  { k: "ck", e: "🕊️", label: "CK del personaje", hint: "El personaje fallece" },
  { k: "otro", e: "📋", label: "Otro", hint: "Cualquier otro motivo" },
];
const BAJA_FRASES = {
  voluntaria: [
    "deja el taller por decisión propia. ¡Gracias por cada reparación y mucha suerte en tu camino! 🤝",
    "cuelga el mono del Aguila. ¡Gracias por tu esfuerzo, las puertas del taller quedan abiertas! 🦅",
    "se despide del taller. ¡Gracias por todo lo aportado y suerte en lo que venga! 🍀",
    "nos deja por voluntad propia. ¡Gracias por tu trabajo en el box, compañero! 🔧",
    "pone rumbo a nuevos caminos. ¡Gracias por formar parte de Aguila Motors! 🛣️",
    "guarda la caja de herramientas y se despide. ¡Gracias por tu dedicación y hasta pronto! 🧰",
    "entrega las llaves del taller. ¡Gracias por cada turno y por dejar el listón tan alto! 🏁",
  ],
  inactividad: [
    "causa baja por inactividad.",
    "causa baja por falta de actividad en el taller.",
    "causa baja por inactividad prolongada.",
  ],
  strikes: [
    "sale del taller tras acumular 3 strikes sin llegar al mínimo de facturación.",
    "queda fuera del taller al sumar 3 strikes seguidos.",
  ],
  expulsion: [
    "queda expulsado de Aguila Motors por incumplir las normas del taller.",
    "queda fuera del taller por conducta inapropiada.",
  ],
  ck: [
    "nos ha dejado para siempre. Descansa en paz, compañero; tu llave inglesa seguirá colgada en el taller. 🕯️",
    "ha fallecido. Todo Aguila Motors acompaña a su familia y amigos en este momento tan duro. 🕯️",
    "se ha ido. Hoy el motor del taller suena más bajo. Descanse en paz. 🖤",
    "ya no está con nosotros. Gracias por cada reparación; siempre serás parte del Aguila. 🖤",
    "ha partido. El box queda en silencio en su memoria. Nuestro más sentido pésame. 🕯️",
  ],
  otro: ["deja de formar parte del taller."],
};
const DESC_MOTIVOS = [
  { k: "minimo", label: "No llegó al mínimo", f: ["por no alcanzar el mínimo de facturación de su rango.", "al quedarse por debajo del mínimo de facturación de la semana."] },
  { k: "actividad", label: "Baja actividad", f: ["por su baja actividad en el taller.", "por falta de presencia en los turnos del taller."] },
  { k: "sancion", label: "Sanción", f: ["como sanción por incumplir las normas del taller.", "por una sanción interna de la Jefatura."] },
];
const DESC_CIERRES = [
  "Cada semana es una nueva oportunidad para volver a subir. 💪",
  "El elevador sube y baja: lo importante es volver a apretar tuercas. 🔧",
  "Aquí cada rango se recupera con trabajo. ¡A por ello! 🛠️",
  "Un mal turno no define a un mecánico. ¡A volver a subir! 🦅",
  "La llave inglesa sigue en vuestras manos: el rango se vuelve a ganar. ⚙️",
];
const BAJAS_CIERRES = [
  "Gracias a todos por vuestro trabajo en el taller. 🦅",
  "El Aguila sigue en marcha. ¡A seguir apretando tuercas! 🔧",
];
const pickOne = (arr, prev = "") => {
  const pool = arr.filter((x) => x !== prev);
  return pool[Math.floor(Math.random() * pool.length)] || arr[0];
};
const bajaTipo = (k) => BAJA_TIPOS.find((t) => t.k === k) || BAJA_TIPOS[BAJA_TIPOS.length - 1];
// Motivo guardado → { tipo, nota }.
function parseBaja(motivo) {
  const m = String(motivo || "").trim();
  for (const t of BAJA_TIPOS) {
    if (normalizeKeySimple(m.slice(0, t.label.length)) === normalizeKeySimple(t.label)) return { tipo: t.k, nota: m.slice(t.label.length).replace(/^\s*[:·-]\s*/, "") };
  }
  const k = normalizeKeySimple(m);
  const tipo = /\bck\b|fallec|muri|muert/.test(k) ? "ck"
    : /strike/.test(k) ? "strikes"
    : /inactiv|no aparece|no viene|desaparec|ausen/.test(k) ? "inactividad"
    : /volunt|renunc|dimit|se va|se fue|deja el taller|por su cuenta|decision propia/.test(k) ? "voluntaria"
    : /expuls|conduct|sancion|norma|robo|toxic|falta de respeto|insult/.test(k) ? "expulsion"
    : "otro";
  return { tipo, nota: m };
}
const bajaMotivoText = (tipo, nota) => `${bajaTipo(tipo).label}${nota ? `: ${nota}` : ""}`;
// Descensos (dados al cerrar la semana) y bajas (despidos) de la semana `sun`.
async function descensosSemana(sun, people, fired) {
  const a = ascDay(sun, 6), b = ascDay(sun, 14);
  const rows = await cvCloud.req(`/rest/v1/emp_historial?select=employee_id,at,texto&tipo=eq.rango&at=gte.${encodeURIComponent(a.toISOString())}&at=lt.${encodeURIComponent(b.toISOString())}&order=at.asc`, { auth: true });
  const inWeek = (iso) => { const t = new Date(iso); return t >= a && t < b; };
  const bajas = fired
    .filter((f) => f.firedAt && inWeek(f.firedAt))
    .map((f) => ({ id: String(f.id), name: fullName(f), rank: f.rank, discord: String(f.discordPrev || f.discord || "").replace(/\D/g, ""), ...parseBaja(f.firedReason) }))
    .sort((p, q) => BAJA_TIPOS.findIndex((t) => t.k === p.tipo) - BAJA_TIPOS.findIndex((t) => t.k === q.tipo) || p.name.localeCompare(q.name, "es"));
  const gone = new Set(bajas.map((x) => x.id));
  const by = new Map();
  for (const r of rows || []) {
    const p = parseRankLog(r.texto);
    if (!p) continue;
    const cur = by.get(String(r.employee_id));
    if (cur) cur.to = p.to;
    else by.set(String(r.employee_id), { id: String(r.employee_id), from: p.from, to: p.to });
  }
  const desc = [];
  for (const it of by.values()) {
    if (gone.has(it.id) || rankOrder(it.to) >= rankOrder(it.from)) continue;
    const e = people.find((x) => String(x.id) === it.id);
    if (!e) continue;
    desc.push({ ...it, name: fullName(e), discord: String(e.discord || "").replace(/\D/g, ""), motivo: "minimo" });
  }
  desc.sort((p, q) => rankOrder(q.from) - rankOrder(p.from) || p.name.localeCompare(q.name, "es"));
  return { desc, bajas };
}
function descDiscordText(desc, bajas, sun, cierre) {
  if (!desc.length && !bajas.length) return "";
  const role = (r) => (RANK_ROLE_IDS[r] ? `<@&${RANK_ROLE_IDS[r]}>` : `**${rankLabel(r) || "sin rango"}**`);
  const who = (it) => (it.discord && it.mention !== false ? `<@${it.discord}>` : `**${it.name}**`);
  const title = desc.length && bajas.length ? "📉 DESCENSOS Y BAJAS DE LA SEMANA" : desc.length ? "📉 DESCENSOS DE LA SEMANA" : "🚪 BAJAS DE LA SEMANA";
  const parts = [];
  if (desc.length) parts.push(desc.map((it) => `⬇️ ${who(it)} pasa de ${role(it.from)} a ${role(it.to)} ${it.frase}`).join("\n"));
  if (bajas.length) parts.push(bajas.map((it) => `${bajaTipo(it.tipo).e} ${who(it)}${it.rank ? ` (${role(it.rank)})` : ""} ${it.frase}`).join("\n"));
  const jef = DC_JEFATURA_ID ? `<@&${DC_JEFATURA_ID}>` : "**Jefatura**";
  return dcAguila(`# ${title}\n-# Semana del ${ascDM(sun)} al ${ascDM(ascDay(sun, 6))} · Aguila Motors 🦅\n\n${parts.join("\n\n")}\n\n${cierre}\n-# — ${jef} · Aguila Motors`);
}
// v120 · Un solo mensaje con ascensos, descensos y bajas (secciones que
// salen solo si tienen a alguien).
// v126 · Empleado de la Semana: va después de los ascensos, sin cifras, con
// la mención de la persona, el rol de Empleado de la Semana y una frase al azar.
const EOW_FRASES = [
  "Gracias por tirar del taller como nadie esta semana: cada coche que sale perfecto lleva tu firma. ¡A por la siguiente! 🦅",
  "Tu esfuerzo se nota en cada reparación. El Aguila vuela más alto gracias a ti. ¡Enhorabuena y gracias! 🏆",
  "Constancia, calidad y compromiso: eres el motor de la semana. Gracias por dar ejemplo en el box. ⚙️",
  "Las llaves no se mueven solas: gracias por tu entrega. ¡Que no pare la racha! 🔧",
  "Has puesto el listón muy alto. Gracias por tu trabajo y por hacer grande a Aguila Motors. 📈",
  "Semana de diez: clientes contentos y coches impecables. ¡Gracias por tanto, crack! 🏁",
  "Lo tuyo no es suerte, es trabajo duro. Gracias por dejarte la piel en el elevador. 💪",
  "Turbo a tope toda la semana. Gracias por empujar al equipo hacia arriba. 🔥",
  "Cada tuerca bien apretada cuenta, y tú no fallaste ni una. ¡Enhorabuena y gracias! 🔩",
  "Eres el ejemplo de lo que significa ser del Aguila. Gracias por tu compromiso. 🦅",
  "El taller ruge más fuerte contigo. Gracias por tu energía y tus ganas. 🏎️",
  "Trabajo limpio, trato de diez y ganas de sobra. ¡Gracias por ser así! ⭐",
  "Nadie sostuvo la llave inglesa como tú esta semana. Gracias por tanto esfuerzo. 🛠️",
  "Te lo has ganado a pulso, turno a turno. Gracias por no bajar nunca el ritmo. ⏱️",
  "Que este reconocimiento te dé gasolina para seguir igual. ¡Gracias, campeón! ⛽",
  "Profesionalidad, constancia y buen rollo: la receta perfecta. Gracias por aportarla. 🧰",
  "Cuando el taller aprieta, tú respondes. Gracias por estar siempre a la altura. 🚀",
  "Tu trabajo habla por sí solo. Gracias por llevar el nombre del Aguila tan alto. 👑",
  "Una semana para enmarcar. Gracias por tu dedicación y que sigan llegando muchas más. 🖼️",
  "Pocos aprietan tanto como tú. Gracias por ser pieza clave de este equipo. 🧩",
];
function movDiscordText(up, desc, bajas, sun, cierre, eow = []) {
  if (!up.length && !desc.length && !bajas.length && !eow.length) return "";
  const role = (r) => (RANK_ROLE_IDS[r] ? `<@&${RANK_ROLE_IDS[r]}>` : `**${rankLabel(r) || "sin rango"}**`);
  const who = (it) => (it.discord && it.mention !== false ? `<@${it.discord}>` : `**${it.name}**`);
  const parts = [];
  if (up.length) parts.push(`## 📈 Ascensos\n${up.map((it) => `⬆️ ${who(it)} pasa de ${role(it.from)} a ${role(it.to)} ${it.motivo}`).join("\n")}`);
  if (eow.length) parts.push(`## 🏆 Empleado de la Semana\n${eow.map((it) => `> 👑 ${who(it)} · ${EMPLOYEE_OF_WEEK_TAG}\n> *${it.frase}*`).join("\n\n")}`);
  if (desc.length) parts.push(`## 📉 Descensos\n${desc.map((it) => `⬇️ ${who(it)} pasa de ${role(it.from)} a ${role(it.to)} ${it.frase}`).join("\n")}`);
  if (bajas.length) parts.push(`## 🚪 Bajas del taller\n${bajas.map((it) => `${bajaTipo(it.tipo).e} ${who(it)}${it.rank ? ` (${role(it.rank)})` : ""} ${it.frase}`).join("\n")}`);
  const jef = DC_JEFATURA_ID ? `<@&${DC_JEFATURA_ID}>` : "**Jefatura**";
  return dcAguila(`# 🦅 MOVIMIENTOS DE PERSONAL DE LA SEMANA\n-# ${dcStaff()}Semana del ${ascDM(sun)} al ${ascDM(ascDay(sun, 6))} · Aguila Motors\n\n${parts.join("\n\n")}\n\n${cierre}\n-# — ${jef} · 🦅 Aguila Motors`);
}

// v128 · Strikes de la semana: mensaje aparte (se avisa por separado). Una
// línea por persona con su strike y el motivo, y una frase de cierre al azar.
const STRIKE_CIERRES = [
  "Toca ponerse las pilas: aquí el que no factura, no se queda. ⚡",
  "Aviso serio: o se aprieta el acelerador o se acaba el camino en el taller. 🚦",
  "El mínimo no es una sugerencia. Pilas, o la puerta está abierta. 🚪",
  "Semana nueva, oportunidad nueva. La próxima no hay excusas. ⏳",
  "En el Aguila se viene a trabajar. Quien no rinda, deja su sitio a otro. 🦅",
  "Tres strikes y fuera: no dejéis que se llene el marcador. ⚾",
  "Las llaves no se mueven solas. A espabilar, que el taller no espera. 🔧",
  "Esto es un toque de atención: o se nota el cambio, o hasta aquí. ⚠️",
  "El box necesita gente comprometida. Pilas puestas desde ya. 🔋",
  "Nadie regala el sitio en este taller: se gana cada semana. Arriba ese ritmo. 📈",
  "Última llamada para los que van justos: a facturar o a la calle. 📣",
  "Quien quiera seguir en el Aguila, que lo demuestre esta semana. 💪",
  "El motor del taller no se para por nadie. O empujáis, o os bajáis. 🚗",
  "Strikes que se acumulan, puestos que se pierden. A ponerse las pilas. 🧯",
  "Aquí se premia el esfuerzo y se corrige la dejadez. Tomad nota. 📝",
];
function strikesDiscordText(items, sun, cierre) {
  if (!items.length) return "";
  const who = (it) => (it.discord && it.mention !== false ? `<@${it.discord}>` : `**${it.name}**`);
  const role = (r) => (RANK_ROLE_IDS[r] ? `<@&${RANK_ROLE_IDS[r]}>` : `**${rankLabel(r) || "sin rango"}**`);
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
  const lines = items.map((it) => `${it.n >= STRIKE_MAX ? "🚫" : "⚠️"} ${who(it)}${it.rank ? ` (${role(it.rank)})` : ""} · ${strikeTag(it.n)} — ${cap(it.reason).replace(/\.$/, "")}.`);
  const jef = DC_JEFATURA_ID ? `<@&${DC_JEFATURA_ID}>` : "**Jefatura**";
  return dcAguila(`# ⚠️ STRIKES DE LA SEMANA\n-# ${dcStaff()}Semana del ${ascDM(sun)} al ${ascDM(ascDay(sun, 6))} · Aguila Motors\n\n${lines.join("\n")}\n\n${cierre}\n-# — ${jef} · 🦅 Aguila Motors`);
}

// v130 · Ventana para readmitir. Tras un CK la persona vuelve con otro
// personaje: nombre, apellido e IBAN nuevos, y su antigüedad empieza de cero.
// Devuelve { name, surname, iban, rank, newChar } o null si se cancela.
function askReadmit(f) {
  return new Promise((resolve) => {
    const ck = parseBaja(f.firedReason).tipo === "ck";
    const dlg = document.createElement("dialog");
    dlg.className = "baja-dlg";
    const form = document.createElement("form");
    form.method = "dialog";
    form.className = "modal-card readmit-form";
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    const field = (label, input) => {
      const l = el("label", "readmit-f");
      l.append(el("span", "", label), input);
      return l;
    };
    const inp = (value, ph = "") => {
      const i = document.createElement("input");
      i.type = "text";
      i.value = value || "";
      i.placeholder = ph;
      return i;
    };
    form.append(el("h3", "", `↩️ Readmitir a ${fullName(f)}`));
    const nc = document.createElement("input");
    nc.type = "checkbox";
    nc.checked = ck;
    const ncl = el("label", "readmit-ck");
    ncl.append(nc, el("span", "", "🕊️ Vuelve con un personaje nuevo (CK): nombre, apellido e IBAN nuevos, y su antigüedad empieza hoy"));
    form.append(ncl);
    const name = inp(ck ? "" : f.name, f.name);
    const surname = inp(ck ? "" : f.surname, f.surname);
    const iban = inp(ck ? "" : f.iban, f.iban || "Ej. J123456");
    iban.maxLength = 7;
    const rank = document.createElement("select");
    rank.appendChild(new Option("Sin rango", ""));
    for (const r of RANKS.slice().reverse()) {
      if (isTopRank(r.label) && !AUTH.aguila) continue;
      rank.appendChild(new Option(rankLabel(r.label), r.label));
    }
    rank.value = [...rank.options].some((o) => o.value === f.rank) ? f.rank : "";
    const grid = el("div", "readmit-grid");
    grid.append(field("Nombre", name), field("Apellido", surname), field("IBAN", iban), field("Rango", rank));
    form.append(grid);
    const note = el("p", "muted readmit-note", f.discordPrev ? "Recupera su Discord y su acceso a la página." : "No tenía Discord guardado: añádelo luego en su ficha.");
    form.append(note);
    const err = el("p", "readmit-err", "");
    const acts = el("div", "emp-acts");
    const ok = el("button", "", "Readmitir");
    ok.type = "submit";
    const no = el("button", "ghost", "Cancelar");
    no.type = "button";
    acts.append(ok, no);
    form.append(err, acts);
    dlg.append(form);
    const sync = () => {
      for (const [i, old] of [[name, f.name], [surname, f.surname], [iban, f.iban]]) {
        if (!nc.checked && !i.value) i.value = old || "";
        i.placeholder = nc.checked ? (i === iban ? "IBAN del personaje nuevo" : "Del personaje nuevo") : old || "";
      }
    };
    sync();
    nc.addEventListener("change", () => {
      if (nc.checked) for (const i of [name, surname, iban]) i.value = "";
      sync();
      name.focus();
    });
    let result = null;
    form.addEventListener("submit", (ev) => {
      const v = { name: name.value.trim().replace(/\s+/g, " "), surname: surname.value.trim().replace(/\s+/g, " "), iban: parseIban(iban.value), rank: rank.value, newChar: nc.checked };
      const bad = (t) => {
        ev.preventDefault();
        err.textContent = t;
      };
      if (!v.name || !v.surname) return bad("Pon nombre y apellido.");
      if (v.iban === null) return bad("El IBAN no es válido: una letra y 6 números (ej. J123456), o déjalo vacío.");
      const k = normalizeKeySimple(`${v.name} ${v.surname}`);
      if (EMP_CLOUD.list.some((e) => String(e.id) !== String(f.id) && normalizeKeySimple(fullName(e)) === k)) return bad("Ya hay un empleado con ese nombre.");
      if (v.newChar && k === normalizeKeySimple(fullName(f))) return bad("Es un personaje nuevo: cambia el nombre, o quita la casilla de CK.");
      result = v;
    });
    no.addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => {
      dlg.remove();
      resolve(result);
    });
    (document.querySelector("dialog[open]") || document.body).appendChild(dlg);
    dlg.showModal();
    setTimeout(() => (ck ? name : ok).focus(), 50);
  });
}

// Ventana para despedir: tipo de baja + nota opcional. Devuelve el motivo
// listo para guardar ("Inactividad: no aparece desde el 20/10") o null.
function askBaja(label, suggest = "") {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "baja-dlg";
    const form = document.createElement("form");
    form.method = "dialog";
    form.className = "modal-card";
    const h = document.createElement("h3");
    h.textContent = `🚪 Despedir a ${label}`;
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Queda en el registro de despedidos y pierde el acceso a la página. Se puede readmitir. ¿Por qué se va?";
    const grid = document.createElement("div");
    grid.className = "baja-tipos";
    BAJA_TIPOS.forEach((t) => {
      const l = document.createElement("label");
      l.className = "baja-tipo";
      const r = document.createElement("input");
      r.type = "radio";
      r.name = "baja";
      r.value = t.k;
      if (t.k === suggest) r.checked = true;
      const txt = document.createElement("span");
      txt.innerHTML = `<b>${t.e} ${t.label}</b><small>${t.hint}</small>`;
      l.append(r, txt);
      grid.append(l);
    });
    const nl = document.createElement("label");
    nl.className = "baja-nota";
    nl.textContent = "Nota (opcional, no sale en Discord)";
    const nota = document.createElement("input");
    nota.type = "text";
    nota.maxLength = 160;
    nota.placeholder = "Ej. no aparece desde el 20/10";
    nl.append(nota);
    const acts = document.createElement("div");
    acts.className = "emp-acts";
    const ok = document.createElement("button");
    ok.type = "submit";
    ok.textContent = "Despedir";
    const no = document.createElement("button");
    no.type = "button";
    no.className = "ghost";
    no.textContent = "Cancelar";
    acts.append(ok, no);
    form.append(h, p, grid, nl, acts);
    dlg.append(form);
    let result = null;
    form.addEventListener("submit", (ev) => {
      const sel = form.querySelector('input[name="baja"]:checked');
      if (!sel) {
        ev.preventDefault();
        alert("Elige el tipo de baja.");
        return;
      }
      result = bajaMotivoText(sel.value, nota.value.trim());
    });
    no.addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => {
      dlg.remove();
      resolve(result);
    });
    (document.querySelector("dialog[open]") || document.body).appendChild(dlg);
    dlg.showModal();
  });
}

async function loadRankRules() {
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.rank_rules");
    const v = rows?.[0]?.value;
    if (v && typeof v === "object") RANK_RULES = { ...RANK_RULES_DEFAULT, ...v, up: { ...RANK_RULES_DEFAULT.up, ...(v.up || {}) } };
  } catch {
    // se quedan los de por defecto
  }
}
// Strikes: quien no factura nada o no llega al minimo de la semana
// (RANK_RULES.min, facturas + kits) y si cobra, se lleva un strike.
// Se acumulan semana a semana (semanas cerradas en Pagos) y se borran en
// cuanto la persona factura algo. Con STRIKE_MAX toca despido.
const STRIKE_MAX = 3;
let STRIKE_HIST = []; // semanas cerradas (tabla pagos_semanas), la mas reciente primero

async function loadStrikeHist() {
  try {
    const r = await cvCloud.req("/rest/v1/pagos_semanas?select=semana,desde,hasta,datos,cerrada_por,created_at&order=semana.desc&limit=30");
    STRIKE_HIST = Array.isArray(r) ? r : [];
  } catch {
    STRIKE_HIST = [];
  }
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.strike_adj");
    const v = rows?.[0]?.value;
    STRIKE_ADJ = v && typeof v === "object" ? v : {};
  } catch {
    STRIKE_ADJ = {};
  }
}

// Strikes puestos o quitados a mano por el Jefe Aguila (app_settings "strike_adj"):
// { "AAAA-MM-DD" (domingo de la semana): { "id:12": { s: true|false, m: "motivo", por, at } } }
// s:true = strike puesto a mano (aunque facturara). s:false = strike quitado:
// esa semana ni suma ni corta la cuenta de strikes seguidos.
let STRIKE_ADJ = {};
function strikeKey(id, name) {
  return id != null && id !== "" ? `id:${id}` : `n:${normalizeKeySimple(name)}`;
}
function strikeAdjFor(wk, id, name) {
  const w = STRIKE_ADJ[wk];
  if (!w) return null;
  return w[strikeKey(id, name)] || w[`n:${normalizeKeySimple(name)}`] || null;
}
// Strike de una semana para una persona: el automatico (no facturar o no llegar
// al minimo) salvo que el jefe lo haya puesto o quitado a mano.
function weekStrike(wk, id, name, gross, noPay) {
  const auto = !noPay && gross < RANK_RULES.min;
  const adj = noPay ? null : strikeAdjFor(wk, id, name);
  if (!adj) return { on: auto, auto, reason: auto ? strikeReason(gross) : "" };
  if (adj.s) return { on: true, auto, manual: true, reason: adj.m || "puesto por el jefe" };
  return { on: false, auto, forgiven: true, reason: adj.m || "" };
}
async function saveStrikeAdj(wk, id, name, value) {
  return saveStrikeAdjMany([{ wk, value }], id, name);
}
// Varios cambios de una persona de una vez: [{ wk, value }] (value null = como lo calcula la app).
async function saveStrikeAdjMany(changes, id, name) {
  const next = JSON.parse(JSON.stringify(STRIKE_ADJ || {}));
  for (const { wk, value } of changes) {
    const w = next[wk] || (next[wk] = {});
    delete w[`n:${normalizeKeySimple(name)}`];
    if (value) w[strikeKey(id, name)] = { ...value, por: AUTH.name || "", at: new Date().toISOString() };
    else delete w[strikeKey(id, name)];
    if (!Object.keys(w).length) delete next[wk];
  }
  await cvCloud.upsert("app_settings", [{ key: "strike_adj", value: next }], "key");
  STRIKE_ADJ = next;
  const dm = (iso) => `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}`;
  for (const { wk, value } of changes) {
    if (value?.s) empLog(id, "strike", `⚠️ Strike puesto (semana del ${dm(wk)})${value.m ? `: ${value.m}` : ""}`);
    else if (value) empLog(id, "strike", `✅ Strike quitado (semana del ${dm(wk)})${value.m ? `: ${value.m}` : ""}`);
    else empLog(id, "strike", `↺ Strike de la semana del ${dm(wk)} vuelve a lo que calcula la página`);
  }
}

// ---------------------------------------------------------------------------
// Historial de cada empleado (tabla emp_historial, SQL 10). Se guarda sin
// esperar: si la tabla no existe todavia, simplemente no se apunta nada.
// ---------------------------------------------------------------------------
function empLog(empId, tipo, texto) {
  if (!empId || !empCloudOn() || !cvCloud.session) return;
  cvCloud
    .req("/rest/v1/emp_historial", {
      method: "POST",
      auth: true,
      headers: { Prefer: "return=minimal" },
      body: [{ employee_id: String(empId), tipo, texto, por: AUTH.name || "" }],
    })
    .catch(() => {});
}
async function empHistory(empId) {
  return cvCloud.req(`/rest/v1/emp_historial?select=at,tipo,texto,por&employee_id=eq.${encodeURIComponent(empId)}&order=at.desc&limit=60`, { auth: true });
}

// Strikes: a que semana va un ＋1 y cual quita un −1 (mismas reglas que el editor).
function strikePlusWeek(emp) {
  return strikeHistoryOf(emp.id, fullName(emp)).find((h) => !h.on) || null;
}
function strikeMinusWeek(emp) {
  return strikeHistoryOf(emp.id, fullName(emp)).find((h) => h.counted) || null;
}
const strikeValueFor = (h, want, motivo) => (want === h.auto ? null : { s: want, m: motivo });

// Lo facturado esta semana por persona (lo deja Pagos al cargar las facturas).
let PAGOS_WEEK_GROSS = null;

// Colores por rango (mismos que en Pagos) e iniciales para el avatar.
const EMP_RANK_CLS = { "jefe aguila": "r-aguila", jefe: "r-jefe", "mano derecha": "r-jefe", subjefe: "r-subjefe", mecanico: "r-mecanico", chalan: "r-chalan", experimentado: "r-exp" };
const empRankCls = (rank) => EMP_RANK_CLS[normalizeKeySimple(rank)] || "r-none";
const empInitials = (e) => `${String(e.name || "").trim().charAt(0)}${String(e.surname || "").trim().charAt(0)}`.toUpperCase() || "?";
// Avatar por rango (v96): herramienta del rango sobre circulo de su color y
// estrellas debajo con el nivel. El Jefe Aguila lleva el logo del taller.
// Sin rango: iniciales como antes.
const RANK_ICON_SVG = {
  chalan: '<polygon points="12,2.8 20,7.4 20,16.6 12,21.2 4,16.6 4,7.4"/><circle cx="12" cy="12" r="3.4"/>',
  mecanico: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  experimentado: '<line x1="19" y1="12" x2="21.6" y2="12" stroke-width="3"/><line x1="16.95" y1="16.95" x2="18.79" y2="18.79" stroke-width="3"/><line x1="12" y1="19" x2="12" y2="21.6" stroke-width="3"/><line x1="7.05" y1="16.95" x2="5.21" y2="18.79" stroke-width="3"/><line x1="5" y1="12" x2="2.4" y2="12" stroke-width="3"/><line x1="7.05" y1="7.05" x2="5.21" y2="5.21" stroke-width="3"/><line x1="12" y1="5" x2="12" y2="2.4" stroke-width="3"/><line x1="16.95" y1="7.05" x2="18.79" y2="5.21" stroke-width="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.5"/>',
  subjefe: '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M8.5 13.5l2.5 2.5 4.5-5"/>',
  "mano derecha": '<path d="M2 8l4-2 4 2 3-2 4 1 5 3"/><path d="M2 8v6l3 2M22 10v5l-3 2"/><path d="M8 14l3 3a1.5 1.5 0 0 0 2.2-2l-3-3"/><path d="M11 17l1.5 1.5a1.5 1.5 0 0 0 2.2-2L13 15M14.5 16.5a1.5 1.5 0 0 0 2.2-2L13 11l-2 1.5a1.8 1.8 0 0 1-2.5-2.5L10 8"/>',
  jefe: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18"/><rect x="10.5" y="11" width="3" height="3" rx=".6" fill="currentColor"/>',
};
const RANK_STARS = { chalan: 1, mecanico: 2, experimentado: 3, subjefe: 4, "mano derecha": 5, jefe: 5, "jefe aguila": 5 };
const RANK_STAR_SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><polygon points="5,0.4 6.35,3.4 9.6,3.7 7.15,5.85 7.85,9.1 5,7.45 2.15,9.1 2.85,5.85 0.4,3.7 3.65,3.4" fill="currentColor"/></svg>';
function rankAvatar(rank, fallbackText = "?", extraCls = "") {
  const key = normalizeKeySimple(rank);
  const n = RANK_STARS[key] || 0;
  const div = document.createElement("div");
  div.className = `rk-av ${empRankCls(rank)}${extraCls ? " " + extraCls : ""}`;
  if (key === "jefe aguila") {
    const img = document.createElement("img");
    img.src = "aguila_motors_logo.png";
    img.alt = "";
    img.onerror = () => img.replaceWith(document.createTextNode(fallbackText));
    div.appendChild(img);
  } else if (RANK_ICON_SVG[key]) {
    div.insertAdjacentHTML("beforeend", `<svg class="rk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RANK_ICON_SVG[key]}</svg>`);
  } else {
    div.classList.add("rk-txt");
    div.textContent = fallbackText;
  }
  if (n) {
    const s = document.createElement("span");
    s.className = "rk-stars";
    s.innerHTML = RANK_STAR_SVG.repeat(n);
    div.appendChild(s);
  }
  if (rank) div.title = `${rankLabel(rank)}${n ? ` · nivel ${n}` : ""}`;
  return div;
}

// Escalera de rangos para Subir / Bajar desde la ficha.
const EMP_LADDER = ["Chalán", "Mecánico", "Experimentado", "Subjefe", "Jefe"];

// Historial de strikes de una persona en las semanas cerradas (la mas reciente primero).
function strikeHistoryOf(id, name) {
  const out = [];
  let streak = true;
  for (const w of STRIKE_HIST) {
    const r = strikeRowIn(w, id, name);
    if (!r || r.noPay) continue;
    const wk = String(w.semana);
    const adj = strikeAdjFor(wk, id, name);
    const auto = !!r.strike;
    const on = adj ? !!adj.s : auto;
    const forgiven = !!(adj && !adj.s);
    const counted = streak && on;
    if (streak && !on && !forgiven) streak = false;
    out.push({ wk, hasta: String(w.hasta || ""), auto, on, forgiven, manual: !!adj?.s && !auto, motivo: adj?.m || r.strikeMotivo || (auto ? strikeReason(r.gross || 0) : ""), counted, gross: r.gross || 0 });
  }
  return out;
}

// Editor de strikes de una persona (solo Jefe Aguila): historial por semana
// cerrada, +1 / −1 / quitar todos. onDone se llama tras guardar.
function buildStrikeEditor(emp, onDone, opts = {}) {
  const name = fullName(emp);
  const id = emp.id;
  const mk = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const dm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
  const box = mk("div", "strike-editor" + (opts.compact ? " compact" : ""));
  const hist = strikeHistoryOf(id, name);
  const n = strikesBefore(id, name);
  if (!opts.compact) {
    const head = mk("div", "strike-ed-head");
    head.appendChild(mk("b", "", `Strikes de ${name}`));
    head.appendChild(mk("span", "pg-strike" + (n >= STRIKE_MAX ? " max" : ""), `${n >= STRIKE_MAX ? "🚫" : "⚠️"} ${n}/${STRIKE_MAX} seguidos`));
    box.appendChild(head);
  }
  const run = async (btn, changes) => {
    btn.disabled = true;
    try {
      await saveStrikeAdjMany(changes, id, name);
      onDone?.();
    } catch (err) {
      btn.disabled = false;
      alert(`No se pudo guardar: ${err.message || err}`);
    }
  };
  // value para que una semana quede como "want": si coincide con lo automatico, se borra el ajuste.
  const valueFor = (h, want, motivo) => (want === h.auto ? null : { s: want, m: motivo });
  const acts = mk("div", "strike-ed-acts");
  const plus = mk("button", "", "＋1 strike");
  plus.type = "button";
  // +1: la semana mas reciente sin strike (o con el strike quitado) que alarga la racha.
  const breaker = hist.find((h) => !h.on);
  plus.disabled = !breaker;
  plus.title = breaker ? `Se marca la semana del ${dm(breaker.wk)}` : "No hay semanas cerradas donde ponerlo";
  plus.addEventListener("click", () => {
    const m = prompt(`Poner un strike a ${name} (semana del ${dm(breaker.wk)}).\n\nMotivo:`, "");
    if (m === null) return;
    if (!m.trim()) return alert("Escribe el motivo del strike.");
    run(plus, [{ wk: breaker.wk, value: valueFor(breaker, true, m.trim()) }]);
  });
  const minus = mk("button", "ghost", "−1 strike");
  minus.type = "button";
  const lastOn = hist.find((h) => h.counted);
  minus.disabled = !lastOn;
  minus.addEventListener("click", () => {
    const m = prompt(`Quitar a ${name} el strike de la semana del ${dm(lastOn.wk)}.\n\nMotivo (opcional):`, "");
    if (m === null) return;
    run(minus, [{ wk: lastOn.wk, value: valueFor(lastOn, false, m.trim() || "quitado por el jefe") }]);
  });
  const all = mk("button", "ghost", "Quitar todos");
  all.type = "button";
  const counted = hist.filter((h) => h.counted);
  all.disabled = !counted.length;
  all.addEventListener("click", () => {
    const m = prompt(`Quitar los ${counted.length} strikes seguidos de ${name}.\n\nMotivo (opcional):`, "");
    if (m === null) return;
    run(all, counted.map((h) => ({ wk: h.wk, value: valueFor(h, false, m.trim() || "quitado por el jefe") })));
  });
  acts.append(plus, minus, all);
  box.appendChild(acts);
  const weeks = mk("div", "strike-ed-weeks");
  if (!hist.length) weeks.appendChild(mk("span", "muted", "Todavía no tiene semanas cerradas."));
  for (const h of hist.slice(0, 10)) {
    const b = mk("button", "strike-week" + (h.on ? " on" : "") + (h.forgiven ? " off" : "") + (h.counted ? " counted" : ""));
    b.type = "button";
    b.appendChild(mk("b", "", `${dm(h.wk)}–${dm(h.hasta)}`));
    b.appendChild(mk("span", "", h.on ? `⚠️ ${h.manual ? "✍️ " : ""}${h.motivo || "strike"}` : h.forgiven ? `Quitado${h.motivo ? `: ${h.motivo}` : ""}` : `✅ ${fmtMoney(h.gross)}`));
    b.title = h.on ? "Clic para quitar este strike" : "Clic para poner un strike esta semana";
    b.addEventListener("click", () => {
      if (h.on) {
        const m = prompt(`Quitar el strike de ${name} de la semana del ${dm(h.wk)}.\n\nMotivo (opcional):`, "");
        if (m === null) return;
        run(b, [{ wk: h.wk, value: valueFor(h, false, m.trim() || "quitado por el jefe") }]);
      } else {
        const m = prompt(`Poner un strike a ${name} en la semana del ${dm(h.wk)}.\n\nMotivo:`, h.forgiven && h.auto ? "" : "");
        if (m === null) return;
        if (!m.trim() && !(h.forgiven && h.auto)) return alert("Escribe el motivo del strike.");
        run(b, [{ wk: h.wk, value: valueFor(h, true, m.trim()) }]);
      }
    });
    weeks.appendChild(b);
  }
  box.appendChild(weeks);
  box.appendChild(mk("p", "muted strike-ed-hint", "Cuentan los strikes seguidos desde la semana más reciente (marcados en rojo). Un strike quitado no suma ni corta la racha. Los de la semana en curso se gestionan en Pagos."));
  return box;
}

function strikeRowIn(week, id, name) {
  const key = normalizeKeySimple(name);
  return (week?.datos?.rows || []).find((r) => (id != null && r.id != null && String(r.id) === String(id)) || normalizeKeySimple(r.name) === key);
}

// Strikes seguidos en semanas cerradas anteriores a "beforeWeek" (AAAA-MM-DD;
// vacio = todas). Una semana en la que facturo corta la cuenta.
function strikesBefore(id, name, beforeWeek = "") {
  let n = 0;
  for (const w of STRIKE_HIST) {
    if (beforeWeek && String(w.semana) >= beforeWeek) continue;
    const r = strikeRowIn(w, id, name);
    if (!r || r.noPay) continue; // no estaba o no cobraba: no cuenta
    const adj = strikeAdjFor(String(w.semana), id, name);
    if (adj && !adj.s) continue; // quitado por el jefe: ni suma ni corta
    if (r.strike || adj?.s) n++;
    else break;
  }
  return n;
}

// Ultima semana cerrada cuyo strike cuenta en la racha (para quitarlo con "−1").
function lastCountedStrikeWeek(id, name, beforeWeek = "") {
  for (const w of STRIKE_HIST) {
    if (beforeWeek && String(w.semana) >= beforeWeek) continue;
    const r = strikeRowIn(w, id, name);
    if (!r || r.noPay) continue;
    const adj = strikeAdjFor(String(w.semana), id, name);
    if (adj && !adj.s) continue;
    if (r.strike || adj?.s) return String(w.semana);
    break;
  }
  return "";
}

function strikeLabel(n) {
  return n >= STRIKE_MAX ? `Strike ${n}/${STRIKE_MAX} · despido` : `Strike ${n}/${STRIKE_MAX}`;
}

// v133 · Roles de Discord de cada strike (1.º, 2.º y 3.º): en los mensajes
// para Discord se etiqueta el que corresponde en vez de "Strike n/3".
const STRIKE_ROLE_IDS = { 1: "1263156546519433331", 2: "1263156546519433330", 3: "1263156546519433329" };
function strikeTag(n) {
  const id = STRIKE_ROLE_IDS[Math.min(Math.max(1, n), STRIKE_MAX)];
  if (!id) return `**${strikeLabel(n)}**`;
  return n >= STRIKE_MAX ? `<@&${id}> · **despido**` : `<@&${id}>`;
}

// Motivo del strike: no facturar nada o no llegar al minimo de la semana.
function strikeReason(gross) {
  return gross > 0 ? `no llegó al mínimo: ${fmtMoney(gross)} de ${fmtMoney(RANK_RULES.min)}` : "no facturó";
}

function strikeText(n, gross = 0, why = "") {
  return `${n >= STRIKE_MAX ? "🚫" : "⚠️"} **${strikeLabel(n)}** (${why || strikeReason(gross)})`;
}

// Semana que se esta revisando en Pagos (domingo, del cuadro de fechas).
function payWeekKey() {
  return byId("dlog-from")?.value || "";
}
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

// ---------------------------------------------------------------------------
// v122 · Precios en línea (tabla productos, SQL 14). Los ve todo el mundo (la
// Caja no pide sesión) y solo el Jefe Aguila los cambia (lo impide la base).
// Sin la tabla, o sin conexión, sigue como antes: ajustes guardados en este PC.
//   tipo "ajuste": cambio sobre un producto fijo (id = nombre normalizado):
//                  precio y/o imagen nuevos, u oculto.
//   tipo "nuevo":  producto agregado desde la app.
// ---------------------------------------------------------------------------
const PROD_CLOUD = { ok: false, overrides: {}, custom: [], at: 0 };
async function prodCloudLoad() {
  try {
    const rows = await cvCloud.req("/rest/v1/productos?select=id,tipo,nombre,precio,imagen,categoria,oculto&order=nombre.asc");
    const overrides = {};
    const custom = [];
    for (const r of rows || []) {
      if (r.tipo === "nuevo") {
        custom.push({ id: String(r.id), name: String(r.nombre || ""), price: Number(r.precio) || 0, image: String(r.imagen || ""), category: String(r.categoria || "otros") });
      } else {
        const ov = {};
        if (r.precio != null) ov.price = Number(r.precio);
        if (r.imagen) ov.image = String(r.imagen);
        if (r.oculto) ov.hidden = true;
        overrides[String(r.id)] = ov;
      }
    }
    Object.assign(PROD_CLOUD, { ok: true, overrides, custom: custom.filter((p) => p.name), at: Date.now() });
  } catch {
    // tabla aun sin crear o sin conexion: se queda lo que hubiera
  }
  return PROD_CLOUD.ok;
}
function prodCloudCan() {
  if (!PROD_CLOUD.ok) return false;
  if (!AUTH.aguila) throw new Error("Solo el Jefe Aguila puede cambiar precios y productos.");
  return true;
}
const prodBy = () => AUTH.name || "";
async function prodCloudUpsert(row) {
  await cvCloud.req("/rest/v1/productos?on_conflict=id", {
    method: "POST",
    auth: true,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: [{ ...row, updated_at: new Date().toISOString(), updated_by: prodBy() }],
  });
}
// Sube a la base los ajustes guardados solo en este PC (una vez).
function prodLocalPending() {
  const ov = loadProductOverridesLocal();
  const ovKeys = Object.keys(ov).filter((k) => !PROD_CLOUD.overrides[k] && (ov[k]?.price != null || ov[k]?.image || ov[k]?.hidden));
  const cloudNames = new Set(PROD_CLOUD.custom.map((p) => normalizeKeySimple(p.name)));
  const custom = loadCustomProductsLocal().filter((p) => !cloudNames.has(normalizeKeySimple(p.name)));
  return { ov, ovKeys, custom };
}
async function prodUploadLocal() {
  const { ov, ovKeys, custom } = prodLocalPending();
  const byKey = new Map(PRODUCTS.map((p) => [normalizeKeySimple(p.name), p.name]));
  const rows = [
    ...ovKeys.filter((k) => byKey.has(k)).map((k) => ({ id: k, tipo: "ajuste", nombre: byKey.get(k), precio: ov[k].price ?? null, imagen: ov[k].image || null, oculto: !!ov[k].hidden })),
    ...custom.map((p) => ({ id: `n-${p.id}`, tipo: "nuevo", nombre: p.name, precio: p.price, imagen: p.image, categoria: p.category, oculto: false })),
  ];
  if (!rows.length) return 0;
  const at = new Date().toISOString();
  await cvCloud.req("/rest/v1/productos?on_conflict=id", {
    method: "POST",
    auth: true,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: rows.map((r) => ({ ...r, updated_at: at, updated_by: prodBy() })),
  });
  await prodCloudLoad();
  return rows.length;
}

async function addCustomProduct(payload, password) {
  if (prodCloudCan()) {
    await prodCloudUpsert({ id: `n-${safeRandomId()}`, tipo: "nuevo", nombre: payload.name, precio: payload.price, imagen: payload.image || null, categoria: payload.category || "otros", oculto: false });
    await prodCloudLoad();
    return true;
  }
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  current.push({ id: safeRandomId(), ...payload });
  saveCustomProductsLocal(current);
  return true;
}

async function updateCustomProduct(id, payload, password) {
  if (prodCloudCan()) {
    const cur = PROD_CLOUD.custom.find((p) => String(p.id) === String(id));
    if (!cur) throw new Error("Producto no encontrado");
    const next = { ...cur, ...payload };
    await prodCloudUpsert({ id: cur.id, tipo: "nuevo", nombre: next.name, precio: next.price, imagen: next.image || null, categoria: next.category || "otros", oculto: false });
    await prodCloudLoad();
    return true;
  }
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

async function deleteCustomProduct(id, password) {
  if (prodCloudCan()) {
    await cvCloud.req(`/rest/v1/productos?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
    await prodCloudLoad();
    return true;
  }
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }
  const current = loadCustomProductsLocal();
  saveCustomProductsLocal(current.filter((p) => String(p.id) !== String(id)));
  return true;
}

async function setFixedProductOverride(originalName, patch, password) {
  const key = normalizeKeySimple(originalName);
  if (prodCloudCan()) {
    const cur = PROD_CLOUD.overrides[key] || {};
    const next = { ...cur, ...patch };
    await prodCloudUpsert({ id: key, tipo: "ajuste", nombre: originalName, precio: next.price ?? null, imagen: next.image || null, oculto: !!next.hidden });
    await prodCloudLoad();
    return true;
  }
  if (!isAccessPassword(password)) {
    throw new Error("Contrasena incorrecta");
  }
  const overrides = loadProductOverridesLocal();
  overrides[key] = { ...(overrides[key] || {}), ...patch };
  saveProductOverridesLocal(overrides);
  return true;
}

async function setFixedProductHidden(originalName, hidden, password) {
  return setFixedProductOverride(originalName, { hidden: !!hidden }, password);
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
    ft: '<path d="M12 2.2l8.3 3.1v6.2c0 5.2-3.6 8.8-8.3 10.3-4.7-1.5-8.3-5.1-8.3-10.3V5.3z"/><path d="M7.2 12a4.8 4.8 0 0 1 9.6 0"/><path d="M12 12l3.4-3" stroke="#ff4d4d" stroke-width="1.6"/><circle cx="12" cy="12" r="1.1" fill="{C}"/><path d="M8.6 9.2l.6.5M12 7.2v.8M15.4 9.2l-.6.5" stroke-width="1.1"/><text x="12" y="17.6" font-size="4.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" text-anchor="middle" stroke="none" fill="{C}">FULL</text>',
    reparacion: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0 5-5l-2 2-2-2z"/>',
    limpieza: '<path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z"/>',
    gas: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M5 10h10M15 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    grua: '<path d="M4 20h16M6 20V8l10-4v4"/><path d="M16 8v5a2 2 0 1 1-2 2"/>',
    mando: '<rect x="8" y="3" width="8" height="18" rx="3"/><circle cx="12" cy="8" r="1.5"/><path d="M10 13h4M10 16h4"/>',
    bayeta: '<path d="M4 8l8-4 8 4-8 12z"/><path d="M8 9l4 6 4-6"/>',
    // Instalacion de nitro: cuentarrevoluciones con la aguja disparada y "N2O" (v86).
    nitro: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l5-5" stroke="#ff4d4d"/><circle cx="12" cy="17" r="1.3" fill="{C}"/><path d="M6 13.5l1 .6M8.6 9.8l.6 1M12 8.5v1.2M15.4 9.8l-.6 1"/><text x="12" y="23.3" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="4" fill="{C}" stroke="none">N₂O</text>',
    // Botella de nitro: bombona con etiqueta "N2O".
    botella: '<rect x="7" y="5" width="10" height="18" rx="3.8"/><path d="M10.5 5V2.8h3V5M9 2.4h6"/><rect x="7.75" y="10.4" width="8.5" height="6.84" rx="1" fill="{C}" stroke="none"/><text x="12" y="15.3" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="4.1" fill="#0d1416" stroke="none">N₂O</text>',
    camaleon: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-2c1-3-2-11-7-11z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
    compra: '<path d="M2 8l4-2 4 2 3-2 4 1 5 3"/><path d="M2 8v6l3 2M22 10v5l-3 2"/><path d="M8 14l3 3a1.5 1.5 0 0 0 2.2-2l-3-3"/><path d="M11 17l1.5 1.5a1.5 1.5 0 0 0 2.2-2L13 15M14.5 16.5a1.5 1.5 0 0 0 2.2-2L13 11l-2 1.5a1.8 1.8 0 0 1-2.5-2.5L10 8"/>',
    // Helicoptero levantando un coche con el cable.
    gruaaerea: '<path d="M3 2.5h18M12 2.5v2"/><path d="M8.5 4.5h5a3 3 0 0 1 3 3v1h-8a2 2 0 0 1 0-4z"/><path d="M16.5 6.5h4l1-2"/><path d="M12 8.5v6" stroke-dasharray="1.2 1.4"/><path d="M6 19l1.5-3h9l1.5 3v1.5H6z"/><circle cx="8.5" cy="21" r="1"/><circle cx="15.5" cy="21" r="1"/>',
    // Salvavidas bajo la helice: rescate aereo con todo incluido.
    rescate: '<path d="M4 2.5h16M12 2.5v3"/><circle cx="12" cy="14" r="7.5"/><circle cx="12" cy="14" r="3"/><path d="M12 6.5v4.5M12 17v4.5M4.5 14H9M15 14h4.5"/><path d="M19.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
    desvuelco: '<path d="M4 14l2-4h12l2 4v2H4z"/><path d="M8 6a6 6 0 0 1 9 1M17 3v4h-4"/>',
    // Informes (v104)
    informe: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><circle cx="11.5" cy="13" r="3"/><path d="M13.7 15.2l2.8 2.8"/>',
    incautado: '<path d="M12 2.5l8 3v6c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10v-6z"/><path d="M12 7.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z"/>',
    peritaje: '<path d="M3 15l2-5h14l2 5v3H3z"/><path d="M7 10l2-3h6l2 3"/><path d="M14 11l-2 3 3 1-2 3" stroke="#ff4d4d"/>',
    certificado: '<rect x="4" y="3" width="16" height="13" rx="1.5"/><path d="M8 7h8M8 10h5"/><circle cx="15" cy="16.5" r="3"/><path d="M13.5 19l-1 3 2.5-1 2.5 1-1-3"/>',
    presupuesto: '<path d="M6 2.5h12v19l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 7h6M9 10.5h6M9 14h4"/>',
    urgencia: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2.5h6M12 2.5V5"/>',
    nocturno: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="M17 3.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z"/>',
    salida: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    vehadd: '<path d="M2 16l1.6-4h10.8l1.6 4v2.5H2z"/><path d="M5 12l1.6-2.6h5.8L14 12"/><circle cx="5.5" cy="18.5" r="1.4"/><circle cx="12.5" cy="18.5" r="1.4"/><path d="M19 4v6M16 7h6"/>',
  };

const PRODUCT_ICON_KEYWORDS = [["informe nitro","informe"],["incautado","incautado"],["peritaje","peritaje"],["certif.","certificado"],["presupuesto","presupuesto"],["urgencia","urgencia"],["nocturno","nocturno"],["fuera del taller","salida"],["vehículo adicional","vehadd"],["gestión grúa","grua"],["rescate aéreo","rescate"],["grúa aérea","gruaaerea"],["full tuning","ft"],["neones rgb","mando"],["mando","mando"],["pintura camale","camaleon"],["camale","camaleon"],["pintura","pintura"],["humo","humo"],["neon","neon"],["luces","luces"],["rueda","rueda"],["carrocer","carroceria"],["claxon","claxon"],["tintado","tintado"],["turbo","turbo"],["motor","motor"],["transmis","transmision"],["blindaje","blindaje"],["suspens","suspension"],["frenos","frenos"],["reparaci","reparacion"],["repostaje","gas"],["limpieza","limpieza"],["bayeta","bayeta"],["grúa","grua"],["botella","botella"],["nitro","nitro"],["mediaci","compra"],["compraventa","compra"],["desvuelco","desvuelco"]];

function productIconKey(name) {
  const n = String(name || "").toLowerCase();
  for (const [word, key] of PRODUCT_ICON_KEYWORDS) if (n.includes(word)) return key;
  return "reparacion";
}

// Iconos "arcoiris": cada pieza o servicio con su propio color (v83).
const PRODUCT_ICON_COLORS = {
  pintura: "#ff5fa2", neon: "#c45cff", luces: "#ffe066", rueda: "#9aa7b8", humo: "#d0d6e0",
  carroceria: "#ff8a3d", claxon: "#ffd23f", tintado: "#7f8cff", turbo: "#ff4d4d", motor: "#ff7a1a",
  transmision: "#4dd2ff", blindaje: "#3d8bff", suspension: "#5ee38a", frenos: "#ff3b5c", ft: "#ffcc00",
  reparacion: "#5ee38a", limpieza: "#6fd6ff", gas: "#ffb020", grua: "#ffd23f", mando: "#c45cff",
  bayeta: "#6fd6ff", nitro: "#3df5ff", botella: "#3df5ff", camaleon: "#ff5fa2", compra: "#5ee38a", gruaaerea: "#4dd2ff",
  rescate: "#ff4d4d", desvuelco: "#ffb020",
  informe: "#9cc0ff", incautado: "#ffd23f", peritaje: "#ff8a3d", certificado: "#5ee38a", presupuesto: "#ffcf94",
  urgencia: "#ff4d4d", nocturno: "#b9a4ff", salida: "#ff9a3c", vehadd: "#4dd2ff",
};

// Packs ("Reparación + Limpieza (Taller)"): circulo partido en 2 o 3, cada parte
// con el icono y el color de su servicio.
function packIconKeys(name) {
  const base = String(name || "").replace(/\([^)]*\)/g, "");
  if (!base.includes("+") || /\+\s*\d/.test(base)) return null; // "+50%" no es un pack
  const keys = base.split("+").map((p) => productIconKey(p)).filter((k) => PRODUCT_ICON_PATHS[k]);
  return keys.length >= 2 && keys.length <= 3 ? keys : null;
}

function buildPackIconSvg(keys) {
  const cx = 12, cy = 12, R = 15.5;
  const n = keys.length;
  const pt = (deg, r = R) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const start = n === 2 ? 90 : 150; // primera parte a la izquierda (o arriba a la izquierda si son 3)
  const step = 360 / n;
  let sectors = "", icons = "", lines = "";
  keys.forEach((k, i) => {
    const a0 = start + i * step, a1 = a0 + step;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const col = PRODUCT_ICON_COLORS[k] || "#ffcf94";
    sectors += `<path d="M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="${col}2e"/>`;
    const [mx, my] = pt((a0 + a1) / 2, n === 2 ? 7.4 : 8.6);
    const s = n === 2 ? 0.56 : 0.47;
    icons += `<g transform="translate(${(mx - 12 * s).toFixed(2)} ${(my - 12 * s).toFixed(2)}) scale(${s})" fill="none" stroke="${col}" stroke-width="${(1.5 / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${PRODUCT_ICON_PATHS[k]}</g>`;
    const [lx, ly] = pt(a0);
    lines += `<line x1="${cx}" y1="${cy}" x2="${lx.toFixed(2)}" y2="${ly.toFixed(2)}" stroke="#ffffff38" stroke-width="0.7"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36"><rect x="-6" y="-6" width="36" height="36" rx="9" fill="#120d09"/>${sectors}${lines}<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#ffffff30" stroke-width="0.8"/>${icons}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const GAMA_ICON_COLORS = { motos: "#2ee6c8", gama_baja: "#6ad94a", gama_media: "#ffd02a", gama_alta: "#ff9a3c", gama_vip: "#c07bff", camiones: "#5a8cff", aereos: "#4cc3ff" };
function gamaIconColor(name) {
  const n = normalizeKeySimple(name);
  const g = /\bvip\b/.test(n) ? "gama_vip" : /camion/.test(n) ? "camiones" : /aereo/.test(n) ? "aereos" : /\bmotos?\b/.test(n) ? "motos"
    : /\bbaja\b/.test(n) ? "gama_baja" : /\bmedia\b/.test(n) ? "gama_media" : /\balta\b/.test(n) ? "gama_alta" : "";
  return GAMA_ICON_COLORS[g] || "";
}

function buildProductIconSvg(name) {
  const pack = packIconKeys(name);
  if (pack) return buildPackIconSvg(pack);
  const key = productIconKey(name);
  const d = PRODUCT_ICON_PATHS[key];
  // Full Tuning y Compraventa: el color de su gama (v87).
  const col = (["ft", "compra"].includes(key) && gamaIconColor(name)) || PRODUCT_ICON_COLORS[key] || "#ffcf94";
  const dd = String(d || "").split("{C}").join(col);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col}"/></linearGradient><radialGradient id="b"><stop offset="0" stop-color="${col}33"/><stop offset="1" stop-color="#120d09"/></radialGradient></defs><rect x="-6" y="-6" width="36" height="36" rx="9" fill="url(#b)"/><g fill="none" stroke="url(#g)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${dd}</g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function getProductIcon(product) {
  if (product.image) return product.image;
  if (_placeholderIconCache.has(product.name)) return _placeholderIconCache.get(product.name);
  const icon = buildProductIconSvg(product.name);
  _placeholderIconCache.set(product.name, icon);
  return icon;
}
