// ============================================================================
// Aguila Motors · Semana en vivo (v145).
// Lo que lleva facturado cada empleado en la semana EN CURSO, sin pasar por
// Pagos: se calcula con las facturas del canal (tabla discord_log), igual que
// la semana abierta del Panel del Jefe. No incluye kits (esos se pegan a mano
// en Pagos al cerrar). Lo usan el listado y la ficha de Empleados.
// ============================================================================

const LIVE = { sun: "", map: null, total: 0, facturas: 0, at: 0, busy: null, err: "" };
const LIVE_EVERY = 2 * 60 * 1000; // se refresca solo cada 2 min mientras se mira

async function liveLoad(force = false) {
  if (!hasAccess()) return LIVE;
  if (LIVE.busy) return LIVE.busy;
  const sun = jpOpenSun();
  if (!force && LIVE.map && LIVE.sun === sun && Date.now() - LIVE.at < LIVE_EVERY - 5000) return LIVE;
  LIVE.busy = (async () => {
    try {
      const w = await jpWeek(sun);
      const map = new Map();
      for (const p of w.people || []) map.set(normalizeKeySimple(p.name), Number(p.gross) || 0);
      Object.assign(LIVE, { sun, map, total: w.facturado || 0, facturas: w.facturas || 0, at: Date.now(), err: "" });
    } catch (err) {
      LIVE.err = err?.message || String(err);
    } finally {
      LIVE.busy = null;
      document.dispatchEvent(new CustomEvent("aguila-live"));
    }
    return LIVE;
  })();
  return LIVE.busy;
}

// Facturado de la semana en curso de una persona.
//  · Si Pagos tiene cargada ESA misma semana, manda Pagos (incluye kits).
//  · Si no, el cálculo en vivo con las facturas del canal (sin kits).
function liveGrossOf(name) {
  const k = normalizeKeySimple(name);
  if (PAGOS_WEEK_GROSS && LIVE.sun && payWeekKey() === LIVE.sun && PAGOS_WEEK_GROSS.has(k)) {
    return { v: PAGOS_WEEK_GROSS.get(k), src: "pagos" };
  }
  if (LIVE.map) return { v: LIVE.map.get(k) || 0, src: "live" };
  if (PAGOS_WEEK_GROSS?.has(k)) return { v: PAGOS_WEEK_GROSS.get(k), src: "pagos-otra" };
  return null;
}

const liveDM = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const liveWeekLabel = () => (LIVE.sun ? `${liveDM(LIVE.sun)} al ${liveDM(jpIsoAdd(LIVE.sun, 6))}` : "");
const liveAgo = () => {
  if (!LIVE.at) return "";
  const m = Math.floor((Date.now() - LIVE.at) / 60000);
  return m < 1 ? "ahora mismo" : `hace ${m} min`;
};

// v148: ¿Pagos tiene kits pegados para la semana cargada? (si no, se muestran
// como «sin pegar» en vez de 0).
function pagosKitsLoaded() {
  return !!PAGOS_WEEK_KITS && [...PAGOS_WEEK_KITS.values()].some((v) => (v?.qty || 0) > 0);
}
