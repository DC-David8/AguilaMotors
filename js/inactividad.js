// Aguila Motors · Aviso de inactividad (última factura de cada empleado).
// (inactividad.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ---------------------------------------------------------------------------
// v123 · Aviso de inactividad. Con las facturas que el bot copia del Discord
// (tabla discord_log) se sabe la última factura de cada empleado (como
// cobrador del datáfono o emisor de la factura). Se miran los últimos 30
// días; los umbrales los cambia el Jefe Aguila (app_settings "inact_dias").
// ---------------------------------------------------------------------------
const INACT_DEFAULT = { aviso: 3, alerta: 5, grave: 7 };
const INACT_VENTANA = 30; // días hacia atrás que se leen
const INACT = { ok: false, at: 0, last: new Map(), desde: 0, dias: { ...INACT_DEFAULT }, loading: null };
async function inactLoad(force = false) {
  if (!hasAccess() || !cvCloud.session) return false;
  if (!force && INACT.ok && Date.now() - INACT.at < 5 * 60000) return true;
  if (INACT.loading) return INACT.loading;
  INACT.loading = (async () => {
    try {
      const desde = Date.now() - INACT_VENTANA * 86400000;
      const rows = [];
      for (let off = 0; ; off += 1000) {
        const part = await cvCloud.req(`/rest/v1/discord_log?select=id,ts,content,embeds&ts=gte.${encodeURIComponent(new Date(desde).toISOString())}&order=ts.asc,id.asc&limit=1000&offset=${off}`, { auth: true });
        if (!Array.isArray(part)) break;
        rows.push(...part);
        if (part.length < 1000) break;
      }
      const last = new Map();
      for (const r of rows) {
        if (String(r.content || "").includes(DLOG_SEP)) continue;
        const txt = dlogMessageText(r);
        if (!txt) continue;
        let res;
        try {
          res = processText(txt);
        } catch {
          continue;
        }
        const t = +new Date(r.ts);
        for (const inv of Object.values(res.invoices || {})) {
          if (!inv.issuer) continue;
          const k = normalizeKeySimple(inv.issuer);
          if (!last.has(k) || last.get(k) < t) last.set(k, t);
        }
      }
      let dias = { ...INACT_DEFAULT };
      try {
        const st = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.inact_dias");
        if (st?.[0]?.value) dias = { ...dias, ...st[0].value };
      } catch {
        // sin ajustes: los de siempre
      }
      Object.assign(INACT, { ok: true, at: Date.now(), last, desde, dias });
    } catch {
      // sin acceso a las facturas: no se avisa
    } finally {
      INACT.loading = null;
    }
    return INACT.ok;
  })();
  return INACT.loading;
}
async function inactSaveDias(d) {
  const v = { aviso: Math.max(1, Math.round(d.aviso)), alerta: Math.max(1, Math.round(d.alerta)), grave: Math.max(1, Math.round(d.grave)) };
  if (!(v.aviso < v.alerta && v.alerta < v.grave)) throw new Error("Los días tienen que ir de menos a más (aviso < alerta < grave).");
  if (v.grave > INACT_VENTANA) throw new Error(`El máximo es ${INACT_VENTANA} días.`);
  await cvCloud.upsert("app_settings", [{ key: "inact_dias", value: v }], "key");
  INACT.dias = v;
}
// { days, last, level (0-3), more } · more = no facturó en toda la ventana.
function inactOf(e) {
  if (!INACT.ok || !e || normalizeKeySimple(e.rank) === normalizeKeySimple("Jefe Aguila")) return null;
  const now = Date.now();
  const t = INACT.last.get(normalizeKeySimple(fullName(e)));
  const alta = e.altaAt ? +new Date(`${e.altaAt}T00:00:00`) : 0;
  let days, more = false;
  if (t) days = Math.floor((now - t) / 86400000);
  else {
    const base = Math.max(INACT.desde, alta);
    days = Math.floor((now - base) / 86400000);
    more = base === INACT.desde;
  }
  const D = INACT.dias;
  const level = days >= D.grave ? 3 : days >= D.alerta ? 2 : days >= D.aviso ? 1 : 0;
  return { days, last: t || null, level, more };
}
function inactText(x) {
  if (!x) return "";
  if (x.more) return `Sin facturar en más de ${INACT_VENTANA} días`;
  if (!x.last) return x.days ? `Sin facturar desde que entró (hace ${x.days} ${x.days === 1 ? "día" : "días"})` : "Entró hoy";
  return x.days === 0 ? "Ha facturado hoy" : `Sin facturar desde hace ${x.days} ${x.days === 1 ? "día" : "días"}`;
}

// Fecha de hoy (AAAA-MM-DD, hora del equipo) y formato dd/mm/aaaa.
function empToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function empDate(iso) {
  const s = String(iso || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "";
}
// "3 meses", "1 año y 2 meses", "12 días"...
function empSeniority(iso) {
  const s = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const a = new Date(`${s}T12:00:00`);
  const b = new Date(`${empToday()}T12:00:00`);
  const days = Math.round((b - a) / 86400000);
  if (days < 0) return "";
  if (days < 31) return `${days} ${days === 1 ? "día" : "días"}`;
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} ${m === 1 ? "mes" : "meses"}`;
  return `${y} ${y === 1 ? "año" : "años"}${m ? ` y ${m} ${m === 1 ? "mes" : "meses"}` : ""}`;
}

const empCloudRow = (e) => ({
  ...(EMP_CLOUD.hasDates ? { alta_at: e.altaAt || null, contratado_at: e.contratadoAt || null } : {}),
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

// Despedir: no se borra. Se guarda fecha, quien y motivo, y se le quita el
// Discord (asi pierde el acceso a la pagina al instante). El Discord queda
// apartado en discord_previo por si se le readmite.
function empFireError(err) {
  const m = String(err?.message || err || "");
  if (/despedido_|discord_previo|column/i.test(m)) return "Falta ejecutar en Supabase el SQL de despidos (5_despidos.sql).";
  return m;
}

async function empCloudFire(e, reason) {
  empCloudRequireSession();
  await cvCloud.upsert("employees", [{
    ...empCloudRow(e),
    discord: "",
    discord_previo: e.discord || "",
    despedido_at: new Date().toISOString(),
    despedido_por: AUTH.name || "",
    despedido_motivo: reason || "",
  }], "id");
  empLog(e.id, "despido", `🚪 Despedido${reason ? `: ${reason}` : ""}`);
}

// v130: con cambios (personaje nuevo tras un CK, otro IBAN u otro rango).
async function empCloudReadmit(f, ch = null) {
  empCloudRequireSession();
  const next = ch ? { ...f, name: ch.name, surname: ch.surname, iban: ch.iban ?? f.iban, rank: ch.rank } : f;
  await cvCloud.upsert("employees", [{
    ...empCloudRow(next),
    // nuevo contrato; el ingreso solo se reinicia si es un personaje nuevo
    ...(EMP_CLOUD.hasDates ? { contratado_at: empToday(), ...(ch?.newChar ? { alta_at: empToday() } : {}) } : {}),
    discord: f.discordPrev || "",
    discord_previo: null,
    despedido_at: null,
    despedido_por: null,
    despedido_motivo: null,
  }], "id");
  const renamed = normalizeKeySimple(fullName(next)) !== normalizeKeySimple(fullName(f));
  empLog(f.id, "alta", `↩️ Readmitido${next.rank ? ` como ${rankLabel(next.rank)}` : ""}${ch?.newChar ? ` · personaje nuevo: ${fullName(next)} (antes ${fullName(f)})` : renamed ? ` · ahora ${fullName(next)} (antes ${fullName(f)})` : ""}`);
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
