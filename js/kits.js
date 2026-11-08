// Aguila Motors · Copiador de kits (marcador para Edge).
// (kits.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ===================== Copiador de kits (marcador para Edge) =====================
// El log de kits esta en el Discord de la ciudad, donde no podemos meter un bot.
// Este marcador se ejecuta en discord.com y solo lee los mensajes que ya ves en
// pantalla (no usa tu cuenta ni la API, no se desplaza solo). Recoge los de la
// semana (hora de España) mientras subes con la rueda y los copia.
function aguilaKitsCopier() {
  if (window.__aguilaKits) { window.__aguilaKits.show(); return; }
  if (!/discord\.com$/.test(location.hostname)) { alert("Abre el canal de kits o de compraventa en discord.com (en el navegador, no en la aplicación) y pulsa otra vez el marcador."); return; }
  const MODES = {
    kits: { re: /venta\s+de\s+kits/i, what: "ventas de kits", btn: "Copiar kits de la semana" },
    cv: { re: /transacci[oó]n de veh[ií]culo/i, what: "transacciones de vehículos", btn: "Copiar compraventa" },
  };
  let mode = "";
  const SEP = "1211602620565950514";
  const seps = new Set();
  const pad2 = (n) => String(n).padStart(2, "0");
  const stamp = (ms) => { const d = new Date(ms); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const textOf = (li) => {
    let t = li.innerText || "";
    let from = 0;
    for (const c of li.querySelectorAll("code")) {
      const ct = (c.innerText || "").trim();
      if (!ct || ct.includes("\n")) continue;
      const i = t.indexOf(ct, from);
      if (i < 0) continue;
      t = t.slice(0, i) + "`" + ct + "`" + t.slice(i + ct.length);
      from = i + ct.length + 2;
    }
    return t.trim();
  };
  const EPOCH = 1420070400000n;
  const seen = new Map();
  const tsOf = (id) => { try { return Number((BigInt(id) >> 22n) + EPOCH); } catch { return 0; } };
  const madrid = (ms) => {
    const p = {};
    for (const x of new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short", hourCycle: "h23" }).formatToParts(new Date(ms))) p[x.type] = x.value;
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
  };
  const midnight = (iso, add = 0) => {
    const [y, m, d] = iso.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d + add);
    let g = t;
    for (let i = 0; i < 3; i++) { const p = madrid(g); g += t - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s); }
    return g;
  };
  const md = madrid(Date.now());
  const today = Date.UTC(md.y, md.m - 1, md.d);
  const startDay = new Date(today - (md.wd === 0 ? 7 : md.wd) * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  const fmt = (ms) => new Date(ms).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).replace(/,/g, "");

  let chan = "";
  const grab = () => {
    const cur = (location.pathname.match(/\/channels\/[^/]+\/(\d+)/) || [])[1] || "";
    if (cur !== chan) { chan = cur; seen.clear(); seps.clear(); }
    for (const li of document.querySelectorAll('li[id^="chat-messages-"]')) {
      const parts = li.id.split("-");
      const id = parts.pop();
      if (!/^\d+$/.test(id) || (chan && parts.pop() !== chan)) continue;
      if (li.innerHTML.includes(SEP)) { seps.add(id); seen.delete(id); continue; }
      const txt = textOf(li);
      if (txt) {
        // La fecha exacta del mensaje, justo antes de "Transaccion..." / "Venta de kits"
        // (asi no la pisa la cabecera "Hoy a las ..." de Discord).
        const lines = txt.split("\n");
        const at = lines.findIndex((l) => MODES.kits.re.test(l) || MODES.cv.re.test(l));
        lines.splice(at < 0 ? 0 : at, 0, stamp(tsOf(id)));
        seen.set(id, lines.join("\n"));
      }
    }
    update();
  };

  const box = document.createElement("div");
  box.style.cssText = "position:fixed;top:70px;right:20px;z-index:99999;width:320px;background:#1b1714;color:#f3eee8;border:1px solid #f08a24;border-radius:12px;padding:12px 14px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)";
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:14px">🦅 Copiador de logs</b><button data-x style="background:none;border:0;color:#aaa;font-size:18px;cursor:pointer">×</button></div>
    <label style="display:block;font-size:11px;opacity:.8;margin-bottom:6px">Qué copiar<select data-k style="width:100%;margin-top:2px;background:#2a2420;color:#fff;border:1px solid #555;border-radius:6px;padding:4px"><option value="kits">🧩 Venta de kits</option><option value="cv">🚗 Compraventa de vehículos</option></select></label>
    <label style="display:block;font-size:11px;opacity:.8;margin-bottom:6px">Hasta dónde<select data-r style="width:100%;margin-top:2px;background:#2a2420;color:#fff;border:1px solid #555;border-radius:6px;padding:4px"><option value="dates">📅 Por fechas</option><option value="between">🦅 Entre los dos últimos separadores (cierre)</option><option value="last">🦅 Desde el último separador hasta ahora</option></select></label>
    <div data-dates style="display:flex;gap:8px;margin-bottom:6px">
      <label style="flex:1;font-size:11px;opacity:.8">Desde (domingo)<input data-f type="date" style="width:100%;margin-top:2px;background:#2a2420;color:#fff;border:1px solid #555;border-radius:6px;padding:4px;color-scheme:dark"></label>
      <label style="flex:1;font-size:11px;opacity:.8">Hasta (sábado)<input data-t type="date" style="width:100%;margin-top:2px;background:#2a2420;color:#fff;border:1px solid #555;border-radius:6px;padding:4px;color-scheme:dark"></label>
    </div>
    <div data-s style="margin:8px 0;min-height:54px"></div>
    <button data-c style="width:100%;padding:9px;border:0;border-radius:8px;background:#f08a24;color:#1b1714;font-weight:700;cursor:pointer">Copiar kits de la semana</button>
    <div style="font-size:11px;opacity:.6;margin-top:6px">Solo lee lo que ya ves en pantalla. Ve subiendo con la rueda del ratón.</div>`;
  document.body.appendChild(box);
  const $ = (s) => box.querySelector(s);
  $("[data-f]").value = iso(startDay);
  $("[data-t]").value = iso(new Date(startDay.getTime() + 6 * 86400000));

  const inRange = () => {
    const r = $("[data-r]").value;
    const list = [...seen.entries()].map(([id, t]) => ({ id, t, ts: tsOf(id) })).sort((x, y) => x.ts - y.ts);
    const sp = [...seps].map(tsOf).sort((x, y) => x - y);
    let a, b, need = 0;
    if (r === "last") { a = sp.length ? sp[sp.length - 1] + 1 : Infinity; b = Infinity; need = 1; }
    else if (r === "between") { a = sp.length >= 2 ? sp[sp.length - 2] + 1 : Infinity; b = sp.length ? sp[sp.length - 1] : -Infinity; need = 2; }
    else { a = midnight($("[data-f]").value); b = midnight($("[data-t]").value, 1); }
    return { r, a, b, list, need, nsep: sp.length, sel: list.filter((m) => m.ts >= a && m.ts < b) };
  };
  function update() {
    if (!$("[data-f]").value || !$("[data-t]").value) return;
    const { r, a, b, list, sel, need, nsep } = inRange();
    const oldest = list[0]?.ts, newest = list[list.length - 1]?.ts;
    if (!mode) {
      const nk = list.filter((m) => MODES.kits.re.test(m.t)).length;
      const nc = list.filter((m) => MODES.cv.re.test(m.t)).length;
      if (nk || nc) { mode = nc > nk ? "cv" : "kits"; $("[data-k]").value = mode; $("[data-c]").textContent = MODES[mode].btn; }
    }
    const M = MODES[mode || "kits"];
    const kits = sel.filter((m) => M.re.test(m.t)).length;
    let s = `<b>${kits}</b> ${M.what} recogidas.<br>`;
    if (!list.length) s += "⏳ No veo mensajes: abre el canal de kits o de compraventa.";
    else if (r !== "dates") {
      s += nsep >= need
        ? `<span style="color:#6fdc8c">✅ Separador${need > 1 ? "es" : ""} encontrado${need > 1 ? "s" : ""}. Pulsa Copiar.</span>`
        : `<span style="color:#ffb020">⬆ Sube hasta ver ${need - nsep === 2 ? "los dos últimos separadores" : need > 1 ? "el separador anterior" : "el último separador"} 🦅.</span>`;
    }
    else if (oldest >= a) s += `<span style="color:#ffb020">⬆ Sigue subiendo hasta pasar el <b>${fmt(a)}</b> (tu hora). Ahora llegas al ${fmt(oldest)}.</span>`;
    else if (newest < b && b < Date.now() - 60000) s += `<span style="color:#ffb020">⬇ Baja hasta pasar el <b>${fmt(b)}</b> (tu hora).</span>`;
    else s += `<span style="color:#6fdc8c">✅ Fechas completas. Pulsa Copiar.</span>`;
    if ($("[data-s]").innerHTML !== s) $("[data-s]").innerHTML = s;
  }

  $("[data-k]").addEventListener("change", () => { mode = $("[data-k]").value; $("[data-c]").textContent = MODES[mode].btn; update(); });
  $("[data-r]").addEventListener("change", () => { $("[data-dates]").style.display = $("[data-r]").value === "dates" ? "flex" : "none"; update(); });
  $("[data-f]").addEventListener("change", update);
  $("[data-t]").addEventListener("change", update);
  $("[data-x]").addEventListener("click", () => { box.style.display = "none"; });
  $("[data-c]").addEventListener("click", async () => {
    grab();
    const M = MODES[mode || "kits"];
    const pick = inRange().sel.filter((m) => M.re.test(m.t));
    const text = pick.map((m) => m.t).join("\n\n");
    if (!text) { $("[data-s]").innerHTML += `<br>No hay ${M.what} en esas fechas.`; return; }
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {}
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
    }
    $("[data-c]").textContent = ok ? `✅ Copiados ${pick.length} mensajes` : "No se pudo copiar";
    setTimeout(() => { $("[data-c]").textContent = M.btn; }, 3000);
  });

  const obs = new MutationObserver((muts) => {
    if (muts.every((m) => box.contains(m.target))) return;
    clearTimeout(window.__aguilaKitsT);
    window.__aguilaKitsT = setTimeout(grab, 150);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  window.__aguilaKits = { show: () => { box.style.display = ""; grab(); } };
  grab();
}

function kitsBookmarkletHref() {
  return "javascript:" + encodeURIComponent(`(${aguilaKitsCopier.toString()})();`);
}

function setupKitsCopier() {
  const dlg = byId("kits-dlg");
  const open = byId("kits-install");
  if (!dlg || !open) return;
  const link = byId("kits-bm");
  link.href = kitsBookmarkletHref();
  link.addEventListener("click", (e) => {
    e.preventDefault();
    alert("No lo pulses aquí: arrástralo a tu barra de favoritos y úsalo dentro de Discord.");
  });
  open.addEventListener("click", () => dlg.showModal());
  byId("kits-install-cv")?.addEventListener("click", () => dlg.showModal());
  byId("kits-copy-code")?.addEventListener("click", async () => {
    const ok = await copyText(link.href);
    byId("kits-copy-code").textContent = ok ? "✅ Código copiado" : "No se pudo copiar";
  });
}
