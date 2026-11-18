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
    if (typeof nitroTouch === "function") nitroTouch(list);
    try {
      LOGEMP.last = await logEmpCall({ ids: list });
      const rc = (LOGEMP.last?.roles || []).filter((c) => c.poner?.length || c.quitar?.length);
      if (rc.length) toastLogEmp(`🔐 Discord: ${rc.map((c) => `${c.nombre}${c.quitar.length ? ` − ${c.quitar.join(", ")}` : ""}${c.poner.length ? ` + ${c.poner.join(", ")}` : ""}`).join(" · ")}`, true);
      const re = (LOGEMP.last?.errores || []).filter((x) => /roles/i.test(x));
      if (re.length) toastLogEmp(`⚠ ${re[0]}`);
    } catch (err) {
      console.warn("[log-empleados]", err);
      if (!LOGEMP.missing) toastLogEmp(`⚠ No se pudo actualizar el log de Discord: ${err.message || err}`);
    }
  }, 2000);
}

function toastLogEmp(text, ok = false) {
  let t = document.getElementById("logemp-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "logemp-toast";
    t.className = "logemp-toast";
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.classList.toggle("ok", !!ok);
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

// ---------------------------------------------------------------------------
// v150 · Licencias: tipos marcados (employees.licencia = "Coche,Moto,…") e
// imagen de la licencia (tabla privada emp_licencias, SQL 19).
// ---------------------------------------------------------------------------
const LIC_TIPOS = [
  ["Coche", "🚗"],
  ["Moto", "🏍️"],
  ["Camión", "🚚"],
  ["Avión", "✈️"],
];
function licSet(v) {
  const parts = String(v || "").split(/[,;]+/).map((x) => normalizeKeySimple(x));
  return new Set(LIC_TIPOS.map(([t]) => t).filter((t) => parts.includes(normalizeKeySimple(t))));
}
const licValue = (set) => LIC_TIPOS.map(([t]) => t).filter((t) => set.has(t)).join(",");
const licLegacy = (v) => normalizeKeySimple(v) === "tiene";

const LIC_FOTO = { ok: null, cache: new Map() };
async function licFotoGet(id) {
  id = String(id);
  if (LIC_FOTO.cache.has(id)) return LIC_FOTO.cache.get(id);
  try {
    const rows = (await cvCloud.req(`/rest/v1/emp_licencias?select=foto,updated_at,por&employee_id=eq.${encodeURIComponent(id)}`, { auth: true })) || [];
    LIC_FOTO.ok = true;
    const v = rows[0] || null;
    LIC_FOTO.cache.set(id, v);
    return v;
  } catch (err) {
    if (/PGRST205|42P01|does not exist|404/.test(String(err?.message || err))) LIC_FOTO.ok = false;
    throw err;
  }
}
async function licFotoSave(id, foto) {
  const row = { employee_id: String(id), foto, updated_at: new Date().toISOString(), por: AUTH.name || "" };
  await cvCloud.upsert("emp_licencias", [row], "employee_id");
  LIC_FOTO.cache.set(String(id), row);
}
async function licFotoDel(id) {
  await cvCloud.del("emp_licencias", `employee_id=eq.${encodeURIComponent(String(id))}`);
  LIC_FOTO.cache.set(String(id), null);
}
function licViewer(src) {
  const ov = document.createElement("div");
  ov.className = "lic-viewer";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "Licencia";
  ov.appendChild(img);
  ov.appendChild(Object.assign(document.createElement("span"), { textContent: "Toca para cerrar" }));
  ov.addEventListener("click", () => ov.remove());
  document.addEventListener("keydown", function esc(ev) {
    if (ev.key === "Escape") {
      ov.remove();
      document.removeEventListener("keydown", esc);
    }
  });
  document.body.appendChild(ov);
}

// ---------------------------------------------------------------------------
// v152 · Publicar los mensajes de la semana y roles automáticos.
// ---------------------------------------------------------------------------
const PUB_CANAL_TXT = { pagas: "canal de pagas", movs: "canal de ascensos y descensos", strikes: "canal de strikes" };
async function pubDiscord(clave, semana, content) {
  return logEmpCall({ publicar: { clave, semana, content, por: AUTH.name || "" } });
}
async function pubInfo(clave, semana) {
  try {
    const rows = await cvCloud.req(`/rest/v1/pub_msgs?select=at,por,msg_ids&semana=eq.${semana}&clave=eq.${clave}`, { auth: true });
    return rows?.[0] || null;
  } catch {
    return null;
  }
}
const pubWhen = (iso) => {
  const d = new Date(iso);
  const same = d.toDateString() === new Date().toDateString();
  return `${same ? "hoy" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} a las ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
};
// Pinta en un <span> si ese mensaje ya está publicado.
async function pubPaint(el, clave, semana) {
  if (!el || !semana) return;
  const info = await pubInfo(clave, semana);
  el.textContent = info ? `✔ Publicado ${pubWhen(info.at)}${info.por ? ` por ${info.por}` : ""} · «Publicar» corrige el mismo mensaje` : "";
  el.classList.toggle("ok", !!info);
}
// Botón «📣 Publicar en Discord» genérico.
async function pubRun(btn, statusEl, clave, semana, getText, after) {
  const text = getText();
  if (!text) return alert("No hay nada que publicar.");
  const info = await pubInfo(clave, semana);
  if (!confirm(info ? `Este mensaje ya está publicado (${pubWhen(info.at)}).\n\n¿Corregirlo con lo que ves ahora? Se edita el mismo mensaje (no avisa otra vez a nadie).` : `¿Publicar en el ${PUB_CANAL_TXT[clave]}?\n\nLo publica el bot del taller, con las menciones y etiquetas que ves en el mensaje.`)) return;
  btn.disabled = true;
  if (statusEl) statusEl.textContent = "Publicando…";
  try {
    const j = await pubDiscord(clave, semana, text);
    let extra = "";
    if (after) extra = (await after()) || "";
    if (statusEl) {
      statusEl.textContent = `✔ ${j.editado ? "Corregido" : "Publicado"} en Discord${j.mensajes > 1 ? ` (${j.mensajes} mensajes, no cabía en uno)` : ""}${extra}`;
      statusEl.classList.add("ok");
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `⚠ ${err.message || err}`;
      statusEl.classList.remove("ok");
    }
  } finally {
    btn.disabled = false;
  }
}
// Roles de la semana: strikes actuales de cada uno y Empleado de la Semana de la última semana cerrada.
function rolesSemanal() {
  const strikes = {};
  for (const e of EMP_CLOUD.list) {
    const n = Math.min(STRIKE_MAX, strikesBefore(e.id, fullName(e)));
    strikes[String(e.id)] = isEmployeeNoPay(fullName(e)) ? 0 : n;
  }
  const last = STRIKE_HIST[0];
  const eow = (last?.datos?.rows || []).filter((r) => Number(r.bonus) > 0 && r.id != null).map((r) => String(r.id));
  return { strikes, eow, semana: last ? String(last.semana) : "" };
}
async function rolesCall(q) {
  return logEmpCall({ roles: q });
}
const rolesLine = (c) =>
  c.sinDiscord ? `${c.nombre}: sin ID de Discord` : c.fueraDelServidor ? `${c.nombre}: no está en el servidor` : `${c.nombre}${c.rango ? ` (${c.rango} en la página)` : ""}:${c.quitar?.length ? ` − ${c.quitar.join(", ")}` : ""}${c.poner?.length ? ` + ${c.poner.join(", ")}` : ""}`;
const rolesSkipped = (j) => (j?.saltados?.length ? `\n\nNo se tocan (varios personajes con el mismo Discord): ${j.saltados.join(" · ")}.` : "");
