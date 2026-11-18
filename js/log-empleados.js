// ============================================================================
// Aguila Motors · Log de empleados en Discord (v149).
// La página avisa al bot (función log-empleados de Supabase) cada vez que se
// guarda un cambio de un empleado, y él publica o edita su mensaje en el canal
// del log. El token del bot nunca pasa por aquí: lo tiene Supabase.
// ============================================================================

const LOGEMP = { queue: new Set(), timer: 0, missing: false, last: null };

function logEmpNames() {
  const out = {};
  for (const r of RANKS) out[r.label] = rankLabel(r.label);
  return out;
}

async function logEmpCall(body) {
  const tok = await cvCloud.token();
  if (!tok) throw new Error("Inicia sesión para actualizar el log de Discord.");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 140000);
  try {
    const r = await fetch(`${CV_CLOUD_URL}/functions/v1/log-empleados`, {
      method: "POST",
      headers: { apikey: CV_CLOUD_KEY, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, nombres: logEmpNames() }),
      signal: ctl.signal,
    });
    if (r.status === 404) {
      LOGEMP.missing = true;
      throw new Error("Falta crear la función log-empleados en Supabase (paso 18).");
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || j.errores?.[0] || `El bot respondió ${r.status}.`);
    LOGEMP.missing = false;
    return j;
  } finally {
    clearTimeout(timer);
  }
}

// Se llama sin esperar despues de guardar. Junta los cambios de 2 s en una sola llamada.
function logEmpPush(...ids) {
  if (!hasAccess() || LOGEMP.missing) return;
  ids.flat().filter(Boolean).forEach((id) => LOGEMP.queue.add(String(id)));
  clearTimeout(LOGEMP.timer);
  LOGEMP.timer = setTimeout(async () => {
    const list = [...LOGEMP.queue];
    LOGEMP.queue.clear();
    if (!list.length) return;
    try {
      LOGEMP.last = await logEmpCall({ ids: list });
    } catch (err) {
      console.warn("[log-empleados]", err);
      if (!LOGEMP.missing) toastLogEmp(`⚠ No se pudo actualizar el log de Discord: ${err.message || err}`);
    }
  }, 2000);
}

function toastLogEmp(text) {
  let t = document.getElementById("logemp-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "logemp-toast";
    t.className = "logemp-toast";
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.hidden = true), 7000);
}

// Botón «Sincronizar log de Discord» (lista de Empleados).
async function logEmpSyncAll(reordenar = false) {
  const j = await logEmpCall({ sync: true, reordenar });
  const parts = [];
  if (j.publicados) parts.push(`${j.publicados} publicados`);
  if (j.editados) parts.push(`${j.editados} corregidos`);
  if (j.borrados) parts.push(`${j.borrados} mensajes viejos borrados`);
  let msg = `📋 Log de Discord al día${parts.length ? `: ${parts.join(" · ")}` : ""}.`;
  if (j.sinPermiso) msg += ` ⚠ ${j.sinPermiso} mensajes viejos no se pudieron borrar: dale al bot el permiso «Gestionar mensajes» en ese canal, o bórralos a mano.`;
  if (j.errores?.length) msg += ` ⚠ ${j.errores.slice(0, 2).join(" ")}`;
  return msg;
}
