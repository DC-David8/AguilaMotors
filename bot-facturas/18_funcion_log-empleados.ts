// Aguila Motors · Log de empleados en Discord (paso 18)
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: log-empleados   ·   Pega todo este archivo y pulsa Deploy.
//
// Usa el MISMO bot que las facturas: el secreto DISCORD_BOT_TOKEN ya está
// puesto (no hay que añadir nada). SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
//
// Con { nitro: true } mantiene además los 4 mensajes del canal de licencias de
// nitro (inversiones, asignación, normas e historial; tablas del paso 20).
//
// Qué hace: mantiene un mensaje por empleado en el canal del log. La página
// la llama al dar de alta, editar, cambiar de rango, despedir o readmitir, y
// con el botón «Sincronizar log de Discord». Solo la Jefatura puede usarla.
// Nunca menciona (no salta notificación a nadie al publicar o editar).

const API = "https://discord.com/api/v10";
const CANAL_LOG = "1263156547052244993"; // #log de empleados
const CANAL_NITRO = "1562541884222738472"; // #licencias de nitro (paso 20)
const ROL_JEFATURA = "1430927770938114230";

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
const LICENCIAS: [string, string][] = [["coche", "🚗 Coche"], ["moto", "🏍️ Moto"], ["camion", "🚚 Camión"], ["avion", "✈️ Avión"]];
function licencias(v: unknown) {
  const s = llave(String(v || ""));
  if (s === "tiene") return "*Tiene* ✅";
  const tiene = LICENCIAS.filter(([k]) => s.split(/[,;\s]+/).includes(k)).map(([, t]) => t);
  return tiene.length ? tiene.join(" · ") : "*Pendiente*";
}
// Tipo de baja: igual que la página (parseBaja). Primero el tipo elegido al
// despedir; si el motivo es de antes de los tipos (texto libre), por palabras.
function tipoBaja(motivo: string) {
  const m = String(motivo || "").trim();
  if (!m) return "sin motivo";
  const t = BAJAS.find((x) => llave(m).startsWith(llave(x)));
  if (t) return t;
  const k = llave(m);
  return /\bck\b|fallec|muri|muert/.test(k) ? "CK del personaje"
    : /strike/.test(k) ? "3 strikes"
    : /inactiv|no aparece|no viene|desaparec|ausen/.test(k) ? "Inactividad"
    : /volunt|renunc|dimit|se va|se fue|deja el taller|por su cuenta|decision propia/.test(k) ? "Baja voluntaria"
    : /expuls|conduct|sancion|norma|robo|toxic|falta de respeto|insult/.test(k) ? "Expulsión"
    : "Otro";
}
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
  const motivo = String(e.despedido_motivo || "");
  const tipo = tipoBaja(motivo);
  const estado = baja
    ? `❌ **Baja** · ${tipo} · __${fecha(e.despedido_at)}__`
    : "✅ **Activo**";
  return [
    `### ${baja ? "⬛" : r?.c || "⬜"} ${nombre}${discord ? ` — <@${discord}>` : ""}`,
    `> 🔧 **Rango:** *${rango}*`,
    `> 💳 **IBAN:** ${e.no_pay ? "*No cobra*" : e.iban ? `\`${limpio(e.iban, 12)}\`` : "*Falta*"}`,
    `> 🪪 **Licencias:** ${licencias(e.licencia)}`,
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

  // ---------------------------------------------------------------- NITRO ---
  async function nitro() {
    const res = { ok: true, publicados: 0, editados: 0, borrados: 0, sinPermiso: 0, errores: [] as string[] };
    const get = (t: string) => sb(t).then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))));
    let lic: Emp[], don: Emp[], movs: Emp[], msgs: Emp[];
    try {
      [lic, don, movs, msgs] = await Promise.all([
        get("nitro_licencias?select=*&order=n.asc"),
        get("nitro_donaciones?select=*&order=fecha.asc,id.asc"),
        get("nitro_movs?select=*&order=fecha.asc,id.asc"),
        get("nitro_msgs?select=*"),
      ]);
    } catch {
      return { ...res, ok: false, error: "Faltan las tablas de nitro (ejecuta el SQL 20 en Supabase)." };
    }
    const byId = new Map(emps.map((e) => [String(e.id), e]));
    const who = (id: unknown, nombre?: unknown) => {
      const e = byId.get(String(id || ""));
      const d = String((e?.despedido_at ? e?.discord_previo : e?.discord) || "").replace(/\D/g, "");
      if (d) return `<@${d}>`;
      return e ? limpio(`${e.name} ${e.surname}`) : limpio(nombre) || "—";
    };
    const rangoDe = (id: unknown) => {
      const e = byId.get(String(id || ""));
      if (!e) return "—";
      return limpio(nombres[e.rank] || RANGOS[llave(e.rank)]?.n || e.rank || "—", 30);
    };
    const eur = (v: unknown) => `${Number(v || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
    const usd = (v: unknown) => `$${Math.round(Number(v || 0)).toLocaleString("es-ES")}`;
    const hoy = fecha(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
    const SEP = "━━━━━━━━━━━━━━━━━━━━";
    const total = don.reduce((a, d) => a + Number(d.importe || 0), 0);
    const nLic = lic.length;
    const asig = lic.filter((l) => l.employee_id).length;

    // 1) Inversiones (las donaciones antiguas pasan a una línea si no cabe).
    const donFull = (d: Emp, i: number) => [
      `## 🧾 Donación nº ${i + 1}`,
      `> 📅 **Fecha:** ${fecha(d.fecha)}`,
      `> 💶 **Importe:** **${eur(d.importe)}**`,
      `> 🎯 **Concepto:** ${d.licencias} ${Number(d.licencias) === 1 ? "licencia adicional" : "licencias adicionales"} de **Instalación de Nitro**`,
      `> 👤 **Realizada por:** ${who(d.por_id)}${d.por_id ? ` · ${rangoDe(d.por_id)}` : ""}`,
      `> 📊 **Coste por licencia:** ${eur(Number(d.importe || 0) / Math.max(1, Number(d.licencias) || 1))}`,
    ].join("\n");
    const donShort = (d: Emp, i: number) => `\`${fecha(d.fecha)}\` 🧾 nº ${i + 1} · **${eur(d.importe)}** · ${d.licencias} lic. · ${who(d.por_id)}`;
    let inversiones = "";
    for (let full = don.length; full >= 0; full--) {
      const cut = don.length - full;
      const parts = [
        "# 💶 REGISTRO DE INVERSIONES · NITRO",
        "-# Control interno · Aguila Motors 🦅",
        "",
        SEP,
        ...(cut ? [don.slice(0, cut).map(donShort).join("\n"), ""] : []),
        ...don.slice(cut).map((d, i) => donFull(d, cut + i)),
        ...(don.length ? [] : ["*Todavía no hay donaciones.*"]),
        "",
        SEP,
        `### 📈 Total invertido: **${eur(total)}** · Licencias del taller: **${nLic}**`,
        "-# Se actualiza solo desde la página del taller.",
      ];
      inversiones = parts.join("\n");
      if (inversiones.length <= 1950) break;
    }

    // 2) Asignación actual.
    const bloque = lic.map((l) => {
      const libre = !l.employee_id;
      if (l.principal) return [`## 👑 Licencia ${l.n} · Principal`, `> 👤 **Titular:** ${libre ? "*Por asignar*" : who(l.employee_id)}`, `> 🏅 **Rango:** ${libre ? "—" : rangoDe(l.employee_id)}`, `> 📅 **Asignación:** ${l.asignada_at ? fecha(l.asignada_at) : "—"}`].join("\n");
      return [
        `## ${libre ? "⏳" : "⚡"} Licencia ${l.n}`,
        `> 👤 **Empleado:** ${libre ? "*Por asignar*" : who(l.employee_id)}`,
        `> 🏅 **Rango:** ${libre ? "—" : rangoDe(l.employee_id)}`,
        `> 📅 **Asignación:** ${l.asignada_at ? fecha(l.asignada_at) : "—"}`,
        "> 🔁 **Uso:** se da al personal **según la necesidad**",
      ].join("\n");
    });
    let asignacion = ["# ⚡ LICENCIAS DE NITRO · ASIGNACIÓN ACTUAL", `-# Última actualización: ${hoy}`, "", SEP, bloque.join("\n\n"), "", SEP, `-# 🟢 Asignadas: ${asig} de ${nLic} · 🟡 Libres: ${nLic - asig}`].join("\n");
    if (asignacion.length > 1990) asignacion = asignacion.replace(/\n> 🔁 \*\*Uso:\*\* se da al personal \*\*según la necesidad\*\*/g, "");

    // 3) Normas (las escribe el Jefe Aguila en la página).
    const precio = Number(body.precioNitro) > 0 ? usd(body.precioNitro) : "$35.000";
    const normasTxt: string[] = Array.isArray(body.normas) && body.normas.length ? body.normas.map((x: unknown) => String(x).slice(0, 300)).slice(0, 12) : [
      "🔒 La licencia es **personal**: no se presta ni se comparte.",
      "🤫 Las instalaciones se hacen **solo en la trastienda**.",
      "🧾 Toda instalación se **factura** como «Instalación de Nitro» ({precio}).",
      "⛔ Mal uso, filtración o no facturar = **retirada de la licencia**.",
      "🔁 La asigna y la retira el **Jefe Aguila**, solo a personal de confianza. Si el titular deja el taller, la licencia **vuelve a la {jefatura}**.",
    ];
    const normas = ["# 📜 NORMAS DE LA LICENCIA DE NITRO", ...normasTxt.map((x) => `> ${x.replace(/\{precio\}/g, precio).replace(/\{jefatura\}/g, `<@&${ROL_JEFATURA}>`).replace(/@(everyone|here)/g, "@\u200b$1")}`)].join("\n");

    // 4) Historial (los últimos que quepan, máx. 25).
    const linea = (m: Emp) => {
      const f = `\`${fecha(m.fecha)}\``;
      const t = limpio(m.texto, 120);
      if (m.tipo === "compra") return `${f} ➕ Adquirida 1 licencia${t ? ` ${t}` : ""}`;
      if (m.tipo === "donacion") return `${f} ➕ Compradas ${t || "licencias nuevas"}`;
      if (m.tipo === "asigna") return `${f} ✅ Licencia ${m.n} asignada a ${who(m.employee_id, m.nombre)}`;
      if (m.tipo === "retira") return `${f} ✖️ Licencia ${m.n} retirada a ${who(m.employee_id, m.nombre)}${t ? ` · ${t}` : ""}`;
      if (m.tipo === "devuelta") return `${f} 🔁 Licencia ${m.n} devuelta · ${who(m.employee_id, m.nombre)}${t ? ` (${t})` : ""}`;
      return `${f} ${t}`;
    };
    let lines = movs.map(linea).slice(-25);
    const histOf = (ls: string[], more: boolean) => ["## 🗂️ HISTORIAL DE MOVIMIENTOS", ...(ls.length ? ls : ["*Sin movimientos.*"]), ...(more ? ["-# Últimos movimientos · el historial completo está en la página del taller."] : [])].join("\n");
    let historial = histOf(lines, movs.length > lines.length);
    while (historial.length > 1950 && lines.length > 1) {
      lines = lines.slice(1);
      historial = histOf(lines, true);
    }

    const textos: [string, string][] = [["inversiones", inversiones], ["asignacion", asignacion], ["normas", normas], ["historial", historial]];
    const ids = new Map(msgs.map((m) => [String(m.clave), String(m.msg_id || "")]));
    const guardar = (clave: string, id: string) =>
      sb("nitro_msgs?on_conflict=clave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify([{ clave, msg_id: id }]) });

    // Sincronizar: borra los mensajes escritos a mano y los del bot, y publica los 4 en orden.
    if (body.limpiar === true) {
      let antes = "";
      for (let p = 0; p < 10; p++) {
        const r = await dc(`/channels/${CANAL_NITRO}/messages?limit=100${antes ? `&before=${antes}` : ""}`);
        if (!r.ok) {
          res.errores.push(r.status === 403 ? "El bot no puede ver el canal de nitro (permisos Ver canal y Leer el historial)." : `Discord respondió ${r.status} al leer el canal de nitro.`);
          break;
        }
        const list = await r.json();
        if (!Array.isArray(list) || !list.length) break;
        for (const m of list) {
          const viejo = /REGISTRO DE INVERSIONES · NITRO|LICENCIAS DE NITRO · ASIGNACI|NORMAS DE LA LICENCIA DE NITRO|HISTORIAL DE MOVIMIENTOS/.test(m.content || "");
          if (m.author?.id !== yo.id && !viejo) continue;
          const d = await dc(`/channels/${CANAL_NITRO}/messages/${m.id}`, { method: "DELETE" });
          if (d.ok || d.status === 404) res.borrados++;
          else if (d.status === 403) res.sinPermiso++;
          await sleep(350);
        }
        antes = list[list.length - 1].id;
        if (list.length < 100) break;
      }
      ids.clear();
    }
    for (const [clave, content] of textos) {
      const payload = JSON.stringify({ content, allowed_mentions: { parse: [] } });
      const id = ids.get(clave);
      if (id) {
        const r = await dc(`/channels/${CANAL_NITRO}/messages/${id}`, { method: "PATCH", body: payload });
        if (r.ok) {
          res.editados++;
          await sleep(250);
          continue;
        }
        if (r.status !== 404) {
          res.errores.push(`Discord respondió ${r.status} al editar «${clave}».`);
          continue;
        }
      }
      const r = await dc(`/channels/${CANAL_NITRO}/messages`, { method: "POST", body: payload });
      if (!r.ok) {
        res.errores.push(r.status === 403 ? "El bot no puede escribir en el canal de nitro (permiso Enviar mensajes)." : `Discord respondió ${r.status} al publicar «${clave}».`);
        if (r.status === 403) break;
        continue;
      }
      const m = await r.json();
      await guardar(clave, m.id);
      res.publicados++;
      await sleep(400);
    }
    if (res.errores.length) res.ok = res.publicados + res.editados > 0;
    return res;
  }

  const emps: Emp[] = await sb(
    "employees?select=id,name,surname,rank,discord,discord_previo,iban,no_pay,alta_at,contratado_at,despedido_at,despedido_motivo,licencia,log_msg_id",
  ).then((r) => r.json());
  if (!Array.isArray(emps)) return json({ ok: false, error: "No se pudo leer la tabla de empleados (¿falta el SQL 17?)." }, 500);

  const yo = await dc("/users/@me").then((r) => r.json()).catch(() => ({}));
  if (body.nitro === true) return json(await nitro());
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
