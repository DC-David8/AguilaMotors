// Aguila Motors · Log de empleados en Discord (paso 18)
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: log-empleados   ·   Pega todo este archivo y pulsa Deploy.
//
// Usa el MISMO bot que las facturas: el secreto DISCORD_BOT_TOKEN ya está
// puesto (no hay que añadir nada). SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
//
// Qué hace: mantiene un mensaje por empleado en el canal del log. La página
// la llama al dar de alta, editar, cambiar de rango, despedir o readmitir, y
// con el botón «Sincronizar log de Discord». Solo la Jefatura puede usarla.
// Nunca menciona (no salta notificación a nadie al publicar o editar).

const API = "https://discord.com/api/v10";
const CANAL_LOG = "1263156547052244993"; // #log de empleados

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Rango interno → color del cuadrado y nombre por defecto.
const RANGOS: Record<string, { c: string; n: string; o: number }> = {
  "chalan": { c: "🟩", n: "Aprendiz", o: 1 },
  "mecanico": { c: "🟦", n: "Mecánico", o: 2 },
  "experimentado": { c: "🟪", n: "Especialista", o: 3 },
  "subjefe": { c: "🟧", n: "Jefe de Taller", o: 4 },
  "jefe": { c: "🟫", n: "Gerente", o: 5 },
  "mano derecha": { c: "🟥", n: "Mano Derecha", o: 6 },
  "jefe aguila": { c: "🟨", n: "Jefe Aguila", o: 7 },
};
const BAJAS = ["Baja voluntaria", "Inactividad", "3 strikes", "Expulsión", "CK del personaje", "Otro"];

const llave = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const limpio = (s: unknown, max = 60) =>
  String(s ?? "").replace(/[@`*_~|>#\n\r]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const fecha = (d: unknown) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "Sin fecha";
};

type Emp = Record<string, any>;

function texto(e: Emp, nombres: Record<string, string>) {
  const r = RANGOS[llave(e.rank)];
  const rango = limpio(nombres[e.rank] || r?.n || e.rank || "Sin rango", 30);
  const baja = !!e.despedido_at;
  const discord = String((baja ? e.discord_previo : e.discord) || "").replace(/\D/g, "");
  const nombre = limpio(`${e.name} ${e.surname}`, 60);
  const lic = llave(e.licencia) === "tiene" ? "*Tiene* ✅" : "*Pendiente*";
  const motivo = String(e.despedido_motivo || "");
  const tipo = BAJAS.find((t) => llave(motivo).startsWith(llave(t))) || "Baja";
  const estado = baja
    ? `❌ **Baja** · ${tipo === "Baja" ? "sin motivo" : tipo} · __${fecha(e.despedido_at)}__`
    : "✅ **Activo**";
  return [
    `### ${baja ? "⬛" : r?.c || "⬜"} ${nombre}${discord ? ` — <@${discord}>` : ""}`,
    `> 🔧 **Rango:** *${rango}*`,
    `> 💳 **IBAN:** ${e.no_pay ? "*No cobra*" : e.iban ? `\`${limpio(e.iban, 12)}\`` : "*Falta*"}`,
    `> 🚗 **Licencia:** ${lic}`,
    `> 📅 **Alta:** __${fecha(e.alta_at || e.contratado_at)}__`,
    `> 📌 **Estado:** ${estado}`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const BOT = Deno.env.get("DISCORD_BOT_TOKEN");
  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") || SB_KEY;
  if (!BOT || !SB_URL || !SB_KEY) return json({ ok: false, error: "Falta el secreto DISCORD_BOT_TOKEN" }, 500);

  // 1) ¿Quién llama? Solo la Jefatura (la misma comprobación que usa la página).
  const auth = req.headers.get("Authorization") || "";
  const jefe = await fetch(`${SB_URL}/rest/v1/rpc/es_jefe`, {
    method: "POST",
    headers: { apikey: ANON!, Authorization: auth, "Content-Type": "application/json" },
    body: "{}",
  }).then((r) => (r.ok ? r.json() : false)).catch(() => false);
  if (jefe !== true) return json({ ok: false, error: "Solo la Jefatura puede tocar el log de empleados." }, 403);

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 60) : [];
  const sync = body.sync === true;
  const reordenar = body.reordenar === true;
  const nombres: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.nombres || {})) nombres[String(k)] = limpio(v, 30);

  const sb = (path: string, init: RequestInit = {}) =>
    fetch(`${SB_URL}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
  const dc = async (path: string, init: RequestInit = {}): Promise<Response> => {
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${API}${path}`, {
        ...init,
        headers: { Authorization: `Bot ${BOT}`, "Content-Type": "application/json", ...(init.headers || {}) },
      });
      if (r.status !== 429) return r;
      const j = await r.json().catch(() => ({}));
      await sleep(Math.ceil((Number(j.retry_after) || 1) * 1000) + 100);
    }
    return new Response(null, { status: 429 });
  };

  const emps: Emp[] = await sb(
    "employees?select=id,name,surname,rank,discord,discord_previo,iban,no_pay,alta_at,contratado_at,despedido_at,despedido_motivo,licencia,log_msg_id",
  ).then((r) => r.json());
  if (!Array.isArray(emps)) return json({ ok: false, error: "No se pudo leer la tabla de empleados (¿falta el SQL 17?)." }, 500);

  const yo = await dc("/users/@me").then((r) => r.json()).catch(() => ({}));
  const out = { ok: true, publicados: 0, editados: 0, borrados: 0, sinPermiso: 0, errores: [] as string[] };

  // 2) Sincronizar todo: borra los mensajes viejos con la plantilla (los
  //    escritos a mano) y los del bot que ya no son de nadie.
  if (sync) {
    const propios = new Set(emps.map((e) => String(e.log_msg_id || "")).filter(Boolean));
    if (reordenar) {
      propios.clear();
      for (const e of emps) e.log_msg_id = null;
    }
    let antes = "";
    for (let p = 0; p < 20; p++) {
      const r = await dc(`/channels/${CANAL_LOG}/messages?limit=100${antes ? `&before=${antes}` : ""}`);
      if (!r.ok) {
        out.errores.push(r.status === 403 ? "El bot no puede ver el canal del log (permisos Ver canal y Leer el historial)." : `Discord respondió ${r.status} al leer el canal.`);
        break;
      }
      const msgs = await r.json();
      if (!Array.isArray(msgs) || !msgs.length) break;
      for (const m of msgs) {
        const delBot = m.author?.id === yo.id && !propios.has(m.id);
        const plantilla = m.author?.id !== yo.id && /\*\*Rango:\*\*/.test(m.content || "") && /\*\*IBAN:\*\*/.test(m.content || "");
        if (!delBot && !plantilla) continue;
        const d = await dc(`/channels/${CANAL_LOG}/messages/${m.id}`, { method: "DELETE" });
        if (d.ok || d.status === 404) out.borrados++;
        else if (d.status === 403) out.sinPermiso++;
        await sleep(350);
      }
      antes = msgs[msgs.length - 1].id;
      if (msgs.length < 100) break;
    }
  }

  // 3) Publicar o editar el mensaje de cada uno.
  const objetivo = sync ? emps : emps.filter((e) => ids.includes(String(e.id)));
  objetivo.sort((a, b) =>
    (a.despedido_at ? 1 : 0) - (b.despedido_at ? 1 : 0) ||
    (RANGOS[llave(b.rank)]?.o || 0) - (RANGOS[llave(a.rank)]?.o || 0) ||
    `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, "es"));
  for (const e of objetivo) {
    if (!String(e.name || "").trim()) continue;
    const content = texto(e, nombres);
    const payload = JSON.stringify({ content, allowed_mentions: { parse: [] } });
    let msgId = e.log_msg_id ? String(e.log_msg_id) : "";
    if (msgId) {
      const r = await dc(`/channels/${CANAL_LOG}/messages/${msgId}`, { method: "PATCH", body: payload });
      if (r.ok) {
        out.editados++;
        await sleep(250);
        continue;
      }
      if (r.status !== 404) {
        out.errores.push(`${e.name} ${e.surname}: Discord respondió ${r.status} al editar.`);
        continue;
      }
      msgId = ""; // lo borraron a mano: se publica otra vez
    }
    const r = await dc(`/channels/${CANAL_LOG}/messages`, { method: "POST", body: payload });
    if (!r.ok) {
      out.errores.push(r.status === 403 ? "El bot no puede escribir en el canal del log (permiso Enviar mensajes)." : `${e.name} ${e.surname}: Discord respondió ${r.status} al publicar.`);
      if (r.status === 403) break;
      continue;
    }
    const m = await r.json();
    await sb(`employees?id=eq.${encodeURIComponent(String(e.id))}`, { method: "PATCH", body: JSON.stringify({ log_msg_id: m.id }) });
    out.publicados++;
    await sleep(400);
  }
  if (out.errores.length) out.ok = out.publicados + out.editados > 0;
  return json(out);
});
