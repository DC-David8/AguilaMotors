// Aguila Motors · Facturas desde el Discord del taller (tabla discord_log).
// (discord-log.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ===================== Facturas desde el Discord del taller =====================
// Un bot (funcion "leer-logs" en Supabase) copia el canal de facturas a la
// tabla discord_log. Aqui se traen por fechas y se convierten al mismo texto
// que sale al copiar a mano desde Discord, para usar el lector de siempre.

function dlogClean(t) {
  return String(t || "")
    .replace(/\u001b?\[[\d;]*m/g, "") // colores ANSI del bloque ```ansi
    .replace(/```[a-z]*[ \t]*\n?/gi, "") // aperturas/cierres de bloque de codigo
    .replace(/\*|__|~~|`/g, "")
    .replace(/^[ \t]*(?:-#|#{1,3})[ \t]+/gm, "") // titulos "# 150000€" y subtexto "-#"
    .replace(/^\s*>\s?/gm, "");
}

function dlogDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function dlogMessageText(m) {
  const out = [];
  const push = (t) => {
    const c = dlogClean(t).trim();
    if (c) out.push(c);
  };
  push(m.content);
  for (const e of Array.isArray(m.embeds) ? m.embeds : []) {
    push(e.author?.name);
    push(e.title);
    push(e.description);
    for (const f of e.fields || []) {
      const name = dlogClean(f.name).trim().replace(/:\s*$/, "");
      const value = dlogClean(f.value).trim();
      if (!name || name === "​") push(value);
      else if (!value || value === "​") push(name);
      else if (/^[\d.,]+\s*€$/.test(value) || value.includes("\n")) {
        push(name);
        push(value);
      } else push(`${name}: ${value}`);
    }
    const foot = dlogClean(e.footer?.text).trim();
    const when = dlogDate(e.timestamp || m.ts);
    if (foot) out.push(foot.includes("•") && when && !/\d{1,2}[/:]\d{2}/.test(foot.split("•").pop()) ? `${foot} • ${when}` : foot);
  }
  return out.join("\n");
}

// Partes de una fecha vista en hora de España (Europe/Madrid).
function dlogMadridParts(ms) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", weekday: "short", hourCycle: "h23",
  }).formatToParts(new Date(ms))) parts[p.type] = p.value;
  return {
    y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour % 24, mi: +parts.minute, s: +parts.second,
    wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday),
  };
}

// Instante (ms) de las 00:00 en España del dia "AAAA-MM-DD" (+ addDays).
function dlogMadridMidnight(isoDay, addDays = 0) {
  const [y, m, d] = isoDay.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d + addDays);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = dlogMadridParts(guess);
    const seen = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    guess += target - seen;
  }
  return guess;
}

function dlogToText(rows) {
  return rows.map(dlogMessageText).filter(Boolean).join("\n\n");
}

const DLOG_SEP = "1211602620565950514"; // id del GIF separador del Aguila

function setupDiscordLog(refs, processCurrent, invoiceCount) {
  const box = byId("dlog-box");
  if (!box) return;
  if (!hasAccess()) return; // solo Jefes (la tabla tampoco deja leer a nadie mas)
  box.classList.remove("hidden");
  const from = byId("dlog-from");
  const to = byId("dlog-to");
  const btn = byId("dlog-load");
  const status = byId("dlog-status");
  // Semana de pago: domingo 00:00 a sabado 24:00 en hora de ESPAÑA (se paga
  // el domingo). En Guatemala el cierre cae el sabado a las 16:00 (verano
  // europeo) o a las 17:00 (invierno europeo); el calculo lo hace solo.
  // Por defecto: si en España ya es domingo, la semana que acaba de cerrar;
  // si no, la semana en curso.
  const md = dlogMadridParts(Date.now());
  const todayUtc = Date.UTC(md.y, md.m - 1, md.d);
  const startDay = md.wd === 0 ? new Date(todayUtc - 7 * 86400000) : new Date(todayUtc - md.wd * 86400000);
  const isoU = (d) => d.toISOString().slice(0, 10);
  from.value = isoU(startDay);
  to.value = isoU(new Date(startDay.getTime() + 6 * 86400000));
  const rangeBox = byId("dlog-range");
  // Banderas en SVG: Windows no dibuja los emojis de banderas (salen "ES"/"GT").
  const FLAG_ES = '<svg class="flag" viewBox="0 0 30 20" aria-label="España"><rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/></svg>';
  const FLAG_GT = '<svg class="flag" viewBox="0 0 30 20" aria-label="Guatemala"><rect width="30" height="20" fill="#4997d0"/><rect x="10" width="10" height="20" fill="#fff"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#6a9a3a" stroke-width="1.1"/></svg>';
  const fmtIn = (ms, tz) =>
    new Date(ms).toLocaleString("es-ES", { timeZone: tz, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).replace(/,/g, "").replace(/ (\d{2}:\d{2})$/, " a las $1");
  const showRange = () => {
    if (!from.value || !to.value || !rangeBox) return;
    const s = dlogMadridMidnight(from.value);
    const e = dlogMadridMidnight(to.value, 1);
    const esFrom = fmtIn(s, "Europe/Madrid");
    const esTo = fmtIn(e - 60000, "Europe/Madrid").replace(/23:59$/, "24:00");
    rangeBox.innerHTML =
      `<div class="dlog-tz">${FLAG_ES}<span><b>España:</b> del ${esFrom} al ${esTo}</span></div>` +
      `<div class="dlog-tz">${FLAG_GT}<span><b>Guatemala:</b> del ${fmtIn(s, "America/Guatemala")} al ${fmtIn(e, "America/Guatemala")}</span></div>`;
  };
  from.addEventListener("change", showRange);
  to.addEventListener("change", showRange);
  showRange();
  const say = (msg, kind = "") => {
    status.className = `dlog-status ${kind}`;
    status.innerHTML = msg;
  };

  // Separador universal (el GIF del Aguila): marca los cierres en los canales.
  const modeSel = byId("dlog-mode");
  const syncMode = () => {
    const dates = !modeSel || modeSel.value === "dates";
    box.querySelectorAll(".dlog-date").forEach((x) => (x.hidden = !dates));
    if (rangeBox) rangeBox.hidden = !dates;
  };
  modeSel?.addEventListener("change", syncMode);
  syncMode();

  btn.addEventListener("click", async () => {
    const sepMode = modeSel && modeSel.value !== "dates";
    let start, end;
    if (!sepMode) {
      if (!from.value || !to.value) return say("Elige las dos fechas.", "err");
      start = new Date(dlogMadridMidnight(from.value));
      end = new Date(dlogMadridMidnight(to.value, 1));
      if (end <= start) return say("La fecha <b>Hasta</b> debe ser igual o posterior a <b>Desde</b>.", "err");
    }
    btn.disabled = true;
    try {
      // 1) Pide al bot que copie lo ultimo del canal (si falla, se usa lo ya guardado).
      say("Actualizando desde Discord…");
      let botNote = "";
      try {
        const tok = await cvCloud.token();
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 60000);
        const r = await fetch(`${CV_CLOUD_URL}/functions/v1/leer-logs`, {
          method: "POST",
          headers: { apikey: CV_CLOUD_KEY, Authorization: `Bearer ${tok || CV_CLOUD_KEY}`, "Content-Type": "application/json" },
          body: "{}",
          signal: ctl.signal,
        }).finally(() => clearTimeout(timer));
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) botNote = " ⚠ El bot no respondió bien; se usó lo ya guardado.";
      } catch {
        botNote = " ⚠ No se pudo avisar al bot; se usó lo ya guardado.";
      }
      // 1b) Con separadores: busca los dos ultimos GIF de cierre.
      let gtOp = "gte";
      if (sepMode) {
        const sp = (await cvCloud.req(`/rest/v1/discord_log?select=id,ts&content=ilike.*${DLOG_SEP}*&order=ts.desc&limit=2`, { auth: true })) || [];
        const need = modeSel.value === "between" ? 2 : 1;
        if (sp.length < need) {
          say(`No encuentro ${need === 2 ? "dos separadores" : "ningún separador"} 🦅 en el canal de facturas. Ponlo en el canal (pegando su enlace) y vuelve a intentarlo.${botNote}`, "err");
          return;
        }
        if (need === 2) {
          start = new Date(sp[1].ts);
          end = new Date(sp[0].ts);
        } else {
          start = new Date(sp[0].ts);
          end = new Date(Date.now() + 86400000);
        }
        gtOp = "gt";
      }
      // 2) Lee los mensajes del rango, por paginas de 1000.
      say("Leyendo facturas…");
      const rows = [];
      for (let off = 0; ; off += 1000) {
        const q = `/rest/v1/discord_log?select=id,ts,author,content,embeds&ts=${gtOp}.${encodeURIComponent(start.toISOString())}&ts=lt.${encodeURIComponent(end.toISOString())}&order=ts.asc,id.asc&limit=1000&offset=${off}`;
        const part = await cvCloud.req(q, { auth: true });
        if (!Array.isArray(part)) break;
        rows.push(...part);
        if (part.length < 1000) break;
      }
      if (!rows.length) {
        say(`No hay mensajes guardados entre esas fechas.${botNote}`, "err");
        return;
      }
      refs.input.value = dlogToText(rows.filter((r) => !String(r.content || "").includes(DLOG_SEP)));
      refs.input.dataset.discord = "1";
      await processCurrent();
      const n = invoiceCount();
      say(`✅ ${rows.length} mensajes · <b>${n}</b> facturas cargadas. Ahora copia el log de <b>kits</b> y pulsa <strong>Pegar + Procesar</strong> (se añade debajo).${botNote}`, "ok");
    } catch (e) {
      say(`No se pudieron traer: ${String(e.message).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c])}`, "err");
    } finally {
      btn.disabled = false;
    }
  });
}
