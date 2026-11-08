// ============================================================================
// Aguila Motors · Panel del Jefe (v124). Solo el Jefe Aguila.
// Se llena solo: facturas del canal (discord_log), semanas cerradas de Pagos
// (pagos_semanas), plantilla e historial, informes y almacén de compraventa.
// Primer módulo separado de app.js: usa sus funciones globales.
// ============================================================================

const JP = { sun: "", weeks: new Map(), logs: new Map(), cv: null, cvAt: 0, busy: false, all: false };

const jpIsoAdd = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const jpDM = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// Semana de pago (domingo a sábado, hora de España), igual que en Pagos:
// si en España ya es domingo, la que acaba de cerrar; si no, la que está en curso.
function jpDefaultSun() {
  const md = dlogMadridParts(Date.now());
  const today = Date.UTC(md.y, md.m - 1, md.d);
  return new Date(today - (md.wd === 0 ? 7 : md.wd) * 86400000).toISOString().slice(0, 10);
}
const jpOpenSun = () => {
  const md = dlogMadridParts(Date.now());
  return new Date(Date.UTC(md.y, md.m - 1, md.d) - md.wd * 86400000).toISOString().slice(0, 10);
};

async function jpLogsOf(sun) {
  if (JP.logs.has(sun)) return JP.logs.get(sun);
  const a = new Date(dlogMadridMidnight(sun)).toISOString();
  const b = new Date(dlogMadridMidnight(sun, 7)).toISOString();
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const part = await cvCloud.req(`/rest/v1/discord_log?select=id,ts,content,embeds&ts=gte.${encodeURIComponent(a)}&ts=lt.${encodeURIComponent(b)}&order=ts.asc,id.asc&limit=1000&offset=${off}`, { auth: true });
    if (!Array.isArray(part)) break;
    rows.push(...part);
    if (part.length < 1000) break;
  }
  if (sun !== jpOpenSun()) JP.logs.set(sun, rows);
  return rows;
}

// Cifras de una semana. Cerrada en Pagos: lo guardado (incluye kits).
// Abierta: estimación con las facturas del canal (sin kits).
async function jpWeek(sun) {
  if (JP.weeks.has(sun)) return JP.weeks.get(sun);
  const rows = await jpLogsOf(sun);
  let res;
  try {
    res = processText(dlogToText(rows));
  } catch {
    res = { invoices: {}, invSummary: { total: 0, count: 0 }, invByIssuerPaid: {} };
  }
  const closed = STRIKE_HIST.find((w) => String(w.semana) === sun && w.datos?.rows);
  const emps = EMP_CLOUD.list;
  let people;
  if (closed) {
    people = closed.datos.rows.map((r) => ({ id: r.id, name: r.name, rank: r.rank, gross: Number(r.gross) || 0, payout: Number(r.payout) || 0, noPay: !!r.noPay }));
  } else {
    const byKey = new Map(emps.map((e) => [normalizeKeySimple(fullName(e)), e]));
    const map = new Map(emps.map((e) => [normalizeKeySimple(fullName(e)), { id: e.id, name: fullName(e), rank: e.rank, gross: 0 }]));
    for (const [who, tot] of Object.entries(res.invByIssuerPaid || {})) {
      const k = normalizeKeySimple(who);
      const e = byKey.get(k);
      const p = map.get(k) || { id: null, name: who, rank: "", gross: 0, extern: !e };
      p.gross += Number(tot) || 0;
      map.set(k, p);
    }
    people = [...map.values()].map((p) => {
      const noPay = isEmployeeNoPay(p.name);
      return { ...p, noPay, payout: noPay || p.extern ? 0 : Math.round(p.gross * pctForRank(p.rank)) };
    });
    for (const w of weekWinners(people, (p) => !p.extern)) w.payout += WEEK_BONUS;
  }
  const clients = new Map();
  for (const inv of Object.values(res.invoices || {})) {
    const who = String(inv.recipient || "").trim();
    if (!who || !(inv.amount > 0)) continue;
    const k = normalizeKeySimple(who);
    const c = clients.get(k) || { name: who, total: 0, n: 0, last: "" };
    c.total += inv.amount;
    c.n++;
    const when = String(inv.paid_at || inv.sent_at || "");
    if (when > c.last) c.last = when;
    clients.set(k, c);
  }
  const w = {
    sun,
    closed: !!closed,
    facturado: closed ? Number(closed.datos.total) || 0 : Number(res.invSummary?.total) || 0,
    facturas: closed ? Number(closed.datos.facturas) || 0 : Number(res.invSummary?.count) || 0,
    nominas: people.reduce((a, p) => a + (p.payout || 0), 0),
    people,
    clients: [...clients.values()].sort((x, y) => y.total - x.total),
  };
  w.taller = w.facturado - w.nominas;
  // La semana en curso no se guarda (cambia a cada factura).
  if (sun !== jpOpenSun()) JP.weeks.set(sun, w);
  return w;
}

const JP_INF_BASE = { nitro: "Informe Nitro", incautado: "Informe Incautado", danos: "Peritaje Daños", modificaciones: "Certif. Modificaciones", grua: "Gestión Grúa", presupuesto: "Presupuesto" };
function jpInfPrice(tipo, agencia) {
  const base = JP_INF_BASE[tipo];
  if (!base) return 0;
  const pol = ["FBI", "LSPD", "LSSD"].includes(String(agencia || "").toUpperCase());
  const all = getAllProducts();
  const find = (v) => all.find((p) => p.name === `${base} (${v})`)?.price;
  return (pol ? find("Policía") ?? find("Particular") : find("Particular") ?? find("Policía")) || 0;
}
async function jpInformes(sun) {
  const a = new Date(dlogMadridMidnight(jpIsoAdd(sun, -7))).toISOString();
  const b = new Date(dlogMadridMidnight(sun, 7)).toISOString();
  const s = dlogMadridMidnight(sun);
  try {
    const rows = await cvCloud.req(`/rest/v1/informes?select=tipo,agencia,emitido_at&estado=eq.emitido&emitido_at=gte.${encodeURIComponent(a)}&emitido_at=lt.${encodeURIComponent(b)}`, { auth: true });
    const cur = (rows || []).filter((r) => +new Date(r.emitido_at) >= s);
    const prev = (rows || []).filter((r) => +new Date(r.emitido_at) < s);
    const by = {};
    for (const r of cur) by[r.agencia || "Particular"] = (by[r.agencia || "Particular"] || 0) + 1;
    return { n: cur.length, prevN: prev.length, total: cur.reduce((x, r) => x + jpInfPrice(r.tipo, r.agencia), 0), by, ok: true };
  } catch {
    return { ok: false, n: 0, prevN: 0, total: 0, by: {} };
  }
}
async function jpPlantilla(sun) {
  const s = dlogMadridMidnight(sun), e = dlogMadridMidnight(sun, 7);
  const sat = jpIsoAdd(sun, 6);
  let up = 0, down = 0;
  try {
    const rows = await cvCloud.req(`/rest/v1/emp_historial?select=texto&tipo=eq.rango&at=gte.${encodeURIComponent(new Date(s).toISOString())}&at=lt.${encodeURIComponent(new Date(e).toISOString())}`, { auth: true });
    for (const r of rows || []) {
      const p = parseRankLog(r.texto);
      if (p) p.up ? up++ : down++;
    }
  } catch {
    // sin historial
  }
  const inWeek = (iso) => !!iso && iso.slice(0, 10) >= sun && iso.slice(0, 10) <= sat;
  return {
    n: EMP_CLOUD.list.length,
    up,
    down,
    bajas: EMP_CLOUD.fired.filter((f) => f.firedAt && +new Date(f.firedAt) >= s && +new Date(f.firedAt) < e).length,
    altas: [...EMP_CLOUD.list, ...EMP_CLOUD.fired].filter((x) => inWeek(x.altaAt)).length,
  };
}
// Almacén de compraventa (lo que está listado para vender).
async function jpCompraventa(force = false) {
  if (!force && JP.cv && Date.now() - JP.cvAt < 5 * 60000) return JP.cv;
  const rows = await cvCloud.selectAll("cv_tx", "sort.asc,uid.asc");
  const tx = rows.map((r, i) => ({ ts: r.ts || "", sort: r.sort || "", owner: r.owner || "", buyer: r.buyer || "", price: Number(r.price) || 0, model: r.model || "", plate: r.plate || "", seq: i }));
  const now = Date.now();
  const days = (ts) => {
    const m = String(ts).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m ? Math.max(0, Math.floor((now - new Date(+m[3], +m[2] - 1, +m[1])) / 86400000)) : null;
  };
  const stock = cvStock(tx).map((t) => {
    const cat = catFind(t.model);
    const ref = cat ? cvRef(cat.precio) : null;
    return { name: cat?.nombre || t.model || "¿?", plate: t.plate, paid: t.price, days: days(t.ts), sell: ref?.sell || null };
  });
  JP.cv = { stock, tx };
  JP.cvAt = Date.now();
  return JP.cv;
}
function jpCvWeek(sun) {
  if (!JP.cv) return { buy: 0, sell: 0 };
  const a = sun.replace(/-/g, ""), b = jpIsoAdd(sun, 7).replace(/-/g, "");
  let buy = 0, sell = 0;
  for (const t of JP.cv.tx) {
    const k = (t.sort || "").slice(0, 8);
    if (!k || k < a || k >= b) continue;
    const kind = cvKind(t);
    if (kind === "compra") buy++;
    else if (kind === "venta") sell++;
  }
  return { buy, sell };
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------
function setupPanelJefe() {
  const root = byId("tab-jefe");
  if (!root) return;
  const $ = (id) => byId(id);
  const mk = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const money = (v) => fmtMoney(Math.round(v || 0));
  const kShort = (v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
  const delta = (cur, prev, goodUp = true) => {
    if (!prev) return mk("div", "jp-d muted", "— sin semana anterior");
    const p = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    const up = p >= 0;
    const cls = p === 0 ? "muted" : up === goodUp ? "up" : "down";
    return mk("div", `jp-d ${cls}`, `${up ? "▲" : "▼"} ${Math.abs(p)} % vs semana anterior`);
  };
  const status = (t) => ($("jp-status").textContent = t);

  async function load(force = false) {
    if (!AUTH.aguila || JP.busy) return;
    JP.busy = true;
    if (!JP.sun) JP.sun = jpDefaultSun();
    const max = jpOpenSun();
    if (JP.sun > max) JP.sun = max;
    $("jp-week").textContent = `Semana del ${jpDM(JP.sun)} al ${jpDM(jpIsoAdd(JP.sun, 6))}`;
    $("jp-next").disabled = JP.sun >= max;
    status("Cargando…");
    root.classList.add("is-loading");
    try {
      if (force) {
        JP.weeks.clear();
        JP.logs.clear();
      }
      if (!STRIKE_HIST.length) await loadStrikeHist();
      if (EMP_CLOUD.tried && !EMP_CLOUD.list.length) await empCloudLoad();
      const suns = Array.from({ length: 8 }, (_, i) => jpIsoAdd(JP.sun, -7 * (7 - i)));
      const [weeks, inf, plant, cv] = await Promise.all([
        Promise.all(suns.map(jpWeek)),
        jpInformes(JP.sun),
        jpPlantilla(JP.sun),
        jpCompraventa(force).catch(() => null),
        inactLoad(force),
      ]);
      render(weeks, inf, plant, cv);
      const open = JP.sun === jpOpenSun();
      status(`${open ? "Semana en curso (estimada con las facturas del canal, sin kits)" : weeks[7].closed ? "Semana cerrada en Pagos" : "Semana sin cerrar en Pagos (estimada, sin kits)"} · actualizado a las ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (err) {
      status(`No se pudo cargar: ${err.message || err}`);
    } finally {
      JP.busy = false;
      root.classList.remove("is-loading");
    }
  }

  function kpi(box, icon, label, value, d, sub) {
    box.textContent = "";
    box.append(mk("div", "jp-l", `${icon} ${label}`), mk("div", "jp-v", value), d, mk("div", "jp-s", sub));
  }

  function render(weeks, inf, plant, cv) {
    const w = weeks[7], p = weeks[6];
    // ---- Cifras de la semana
    const avg = w.facturas ? Math.round(w.facturado / w.facturas) : 0;
    kpi($("jp-k1"), "💰", "Facturado por el taller", money(w.facturado), delta(w.facturado, p.facturado), `${w.facturas} facturas${avg ? ` · ticket medio ${money(avg)}` : ""}`);
    const cobran = w.people.filter((x) => x.payout > 0).length;
    kpi($("jp-k2"), "👥", `Nóminas${w.closed ? "" : " (estimadas)"}`, money(w.nominas), delta(w.nominas, p.nominas, false), `${cobran} ${cobran === 1 ? "empleado cobra" : "empleados cobran"} · incluye el bono de ${money(WEEK_BONUS)}`);
    const pct = w.facturado > 0 ? Math.round((w.taller / w.facturado) * 100) : 0;
    kpi($("jp-k3"), "🦅", "Queda para el taller", money(w.taller), delta(w.taller, p.taller), `${pct} % de lo facturado`);
    const ag = Object.entries(inf.by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ");
    const dInf = mk("div", `jp-d ${inf.n > inf.prevN ? "up" : inf.n < inf.prevN ? "down" : "muted"}`, inf.n === inf.prevN ? "= igual que la semana anterior" : `${inf.n > inf.prevN ? "▲" : "▼"} ${Math.abs(inf.n - inf.prevN)} ${Math.abs(inf.n - inf.prevN) === 1 ? "informe" : "informes"} ${inf.n > inf.prevN ? "más" : "menos"}`);
    kpi($("jp-k4"), "🛡️", "Informes emitidos", `${inf.n}${inf.total ? ` · ${money(inf.total)}` : ""}`, dInf, inf.ok ? ag || "Ninguno esta semana" : "No se pudieron leer");

    // ---- Gráfica de 8 semanas
    renderChart(weeks);

    // ---- Avisos
    renderAlerts(w);

    // ---- Ranking
    renderRanking(w, p);

    // ---- Compraventa
    renderCv(cv);

    // ---- Clientes y plantilla
    const cl = $("jp-clients");
    cl.textContent = "";
    if (!w.clients.length) cl.appendChild(mk("p", "muted jp-empty", "Sin facturas con cliente esta semana."));
    for (const c of w.clients.slice(0, 5)) {
      const tr = mk("div", "jp-row");
      const l = mk("div", "jp-row-l");
      const when = (c.last.match(/(\d{1,2})\/(\d{1,2})/) || []).slice(1).map((x) => x.padStart(2, "0")).join("/");
      l.append(mk("b", "", c.name), mk("small", "muted", `${c.n} ${c.n === 1 ? "factura" : "facturas"}${when ? ` · última el ${when}` : ""}`));
      tr.append(l, mk("b", "jp-num", money(c.total)));
      cl.appendChild(tr);
    }
    const pl = $("jp-plant");
    pl.textContent = "";
    for (const [k, v] of [["En plantilla", plant.n], ["⬆️ Ascensos · ⬇️ Descensos", `${plant.up} · ${plant.down}`], ["➕ Altas · 🚪 Bajas", `${plant.altas} · ${plant.bajas}`]]) {
      const r = mk("div", "jp-mv");
      r.append(mk("span", "", k), mk("b", "", String(v)));
      pl.appendChild(r);
    }
  }

  function renderChart(weeks) {
    const box = $("jp-chart");
    const W = 720, H = 230, top = 22, base = 186, left = 44;
    const max = Math.max(1, ...weeks.map((w) => Math.max(w.facturado, w.nominas)));
    const step = 10 ** Math.floor(Math.log10(max));
    const nice = Math.ceil(max / step / 2) * step * 2 || 1;
    const y = (v) => base - (Math.max(0, v) / nice) * (base - top);
    const col = (W - left - 10) / weeks.length;
    let g = "";
    for (let i = 0; i <= 3; i++) {
      const v = (nice / 3) * i;
      g += `<line x1="${left}" y1="${y(v)}" x2="${W - 8}" y2="${y(v)}" stroke="rgba(255,255,255,.07)"/><text x="${left - 6}" y="${y(v) + 3}" fill="#a89a8c" font-size="10" text-anchor="end">${kShort(v)}</text>`;
    }
    let line = "";
    weeks.forEach((w, i) => {
      const x = left + i * col + col / 2;
      const sel = i === weeks.length - 1;
      const est = !w.closed;
      g += `<rect x="${x - 24}" y="${y(w.facturado)}" width="22" height="${base - y(w.facturado)}" rx="4" fill="${sel ? "#f97d02" : "#a5560a"}" ${est ? 'fill-opacity=".55" stroke="#f97d02" stroke-dasharray="3 2"' : ""}><title>Facturado ${money(w.facturado)}${est ? " (estimado, sin kits)" : ""}</title></rect>`;
      g += `<rect x="${x + 2}" y="${y(w.nominas)}" width="22" height="${base - y(w.nominas)}" rx="4" fill="#6b5440" ${est ? 'fill-opacity=".55"' : ""}><title>Nóminas ${money(w.nominas)}</title></rect>`;
      line += `${i ? "L" : "M"}${x},${y(w.taller)} `;
      g += `<text x="${x}" y="${base + 16}" fill="${sel ? "#ffb35c" : "#a89a8c"}" font-size="10.5" text-anchor="middle" font-weight="${sel ? 700 : 400}">${jpDM(w.sun)}${est ? "*" : ""}</text>`;
      if (sel) g += `<text x="${x - 13}" y="${y(w.facturado) - 6}" fill="#ffb35c" font-size="10.5" text-anchor="middle" font-weight="700">${kShort(w.facturado)}</text>`;
    });
    g += `<path d="${line}" fill="none" stroke="#8adbb5" stroke-width="2"/>`;
    weeks.forEach((w, i) => {
      const x = left + i * col + col / 2;
      g += `<circle cx="${x}" cy="${y(w.taller)}" r="3.5" fill="#8adbb5"><title>Para el taller ${money(w.taller)}</title></circle>`;
    });
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Facturado y nóminas de las últimas 8 semanas">${g}</svg>`;
    $("jp-chart-note").hidden = weeks.every((w) => w.closed);
  }

  function renderAlerts(w) {
    const box = $("jp-alerts");
    box.textContent = "";
    const out = [];
    const open = JP.sun === jpOpenSun();
    const gross = new Map(w.people.map((p) => [normalizeKeySimple(p.name), p.gross]));
    for (const e of EMP_CLOUD.list) {
      const name = fullName(e);
      if (normalizeKeySimple(e.rank) === normalizeKeySimple("Jefe Aguila")) continue;
      const noPay = isEmployeeNoPay(name);
      const n = noPay ? 0 : strikesBefore(e.id, name);
      const g = gross.get(normalizeKeySimple(name)) || 0;
      if (n >= STRIKE_MAX) out.push({ o: 0, i: "🚫", t: `${name} · ${n}/${STRIKE_MAX} strikes`, s: "Para despido · no llegó al mínimo semanas seguidas" });
      else if (n === STRIKE_MAX - 1 && open && g < RANK_RULES.min) out.push({ o: 3, i: "⚠️", t: `${name} · ${n}/${STRIKE_MAX} strikes`, s: `Le faltan ${money(RANK_RULES.min - g)} para el mínimo esta semana` });
      const ix = inactOf(e);
      if (ix && ix.level >= 2) out.push({ o: ix.level === 3 ? 1 : 4, i: "💤", t: `${name} · ${ix.more ? `+${INACT_VENTANA}` : ix.days} días sin facturar`, s: ix.level === 3 ? "Grave · candidato a baja por inactividad" : "Alerta · lleva varios días sin facturar" });
      const goal = RANK_RULES.up?.[e.rank];
      if (goal && g >= goal) {
        const nx = RANKS[rankOrder(e.rank) + 1]?.label;
        out.push({ o: 2, i: "⬆️", t: `${name} · listo para subir`, s: `Facturó ${money(g)} · meta de ${rankLabel(e.rank)} ${money(goal)}${nx ? ` → ${rankLabel(nx)}` : ""}` });
      }
    }
    const sinIban = EMP_CLOUD.list.filter((e) => !isEmployeeNoPay(fullName(e)) && !getEmployeeIban(fullName(e))).map(fullName);
    if (sinIban.length) out.push({ o: 5, i: "🏦", t: `${sinIban.length} ${sinIban.length === 1 ? "empleado" : "empleados"} sin IBAN`, s: `No se les puede pagar: ${sinIban.join(", ")}` });
    out.sort((a, b) => a.o - b.o);
    if (!out.length) box.appendChild(mk("p", "muted jp-empty", "✅ Todo en orden: nada que revisar."));
    const shown = JP.allAlerts ? out : out.slice(0, 6);
    for (const a of shown) {
      const r = mk("div", "jp-alert");
      const t = mk("div", "");
      t.append(mk("b", "", a.t), mk("small", "", a.s));
      r.append(mk("span", "jp-ai", a.i), t);
      box.appendChild(r);
    }
    if (out.length > 6) {
      const more = mk("button", "ghost jp-more", JP.allAlerts ? "Ver menos" : `Ver los ${out.length} avisos`);
      more.type = "button";
      more.addEventListener("click", () => {
        JP.allAlerts = !JP.allAlerts;
        renderAlerts(w);
      });
      box.appendChild(more);
    }
  }

  function renderRanking(w, p) {
    const box = $("jp-rank");
    box.textContent = "";
    const prev = new Map(p.people.map((x) => [normalizeKeySimple(x.name), x.gross]));
    const list = w.people.filter((x) => !x.extern && normalizeKeySimple(x.rank) !== normalizeKeySimple("Jefe Aguila")).sort((a, b) => b.gross - a.gross || a.name.localeCompare(b.name, "es"));
    const max = Math.max(1, ...list.map((x) => x.gross));
    const shown = JP.all ? list : list.slice(0, 5);
    if (!list.length) box.appendChild(mk("p", "muted jp-empty", "Sin datos de esta semana."));
    const emp = new Map(EMP_CLOUD.list.map((e) => [normalizeKeySimple(fullName(e)), e]));
    shown.forEach((x, i) => {
      const r = mk("div", "jp-row");
      const l = mk("div", "jp-row-l");
      const head = mk("div", "jp-rk-head");
      head.append(mk("span", "jp-pos", `${list.indexOf(x) + 1}.`), mk("b", "", x.name), mk("span", `pg-badge ${empRankCls(x.rank)}`, rankLabel(x.rank) || "sin rango"));
      const e = emp.get(normalizeKeySimple(x.name));
      const ix = e ? inactOf(e) : null;
      if (ix && ix.level) head.appendChild(mk("span", `emp-inact l${ix.level}`, `💤 ${ix.more ? `+${INACT_VENTANA}` : ix.days} d`));
      const bar = mk("div", "jp-bar");
      const fill = mk("span");
      fill.style.width = `${Math.round((x.gross / max) * 100)}%`;
      bar.appendChild(fill);
      l.append(head, bar);
      const rgt = mk("div", "jp-num");
      rgt.appendChild(mk("b", "", money(x.gross)));
      const pv = prev.get(normalizeKeySimple(x.name));
      if (pv) {
        const d = Math.round(((x.gross - pv) / pv) * 100);
        rgt.appendChild(mk("small", d >= 0 ? "up" : "down", `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)} %`));
      } else if (x.gross) rgt.appendChild(mk("small", "muted", "nuevo"));
      r.append(l, rgt);
      box.appendChild(r);
    });
    if (list.length > 5) {
      const more = mk("button", "ghost jp-more", JP.all ? "Ver solo los 5 primeros" : `Ver los ${list.length}`);
      more.type = "button";
      more.addEventListener("click", () => {
        JP.all = !JP.all;
        renderRanking(w, p);
      });
      box.appendChild(more);
    }
  }

  function renderCv(cv) {
    const box = $("jp-cv");
    box.textContent = "";
    if (!cv) return box.appendChild(mk("p", "muted jp-empty", "No se pudo leer la compraventa."));
    const st = cv.stock;
    const inv = st.reduce((a, t) => a + t.paid, 0);
    const gain = st.reduce((a, t) => (t.sell ? [a[0] + t.sell[0] - t.paid, a[1] + t.sell[1] - t.paid] : a), [0, 0]);
    const wk = jpCvWeek(JP.sun);
    const sum = mk("div", "jp-cv-sum");
    for (const [v, l] of [[String(st.length), st.length === 1 ? "coche listado" : "coches listados"], [money(inv), "invertido"], [gain[1] ? `${kShort(gain[0])}–${kShort(gain[1])}` : "—", "ganancia estimada"]]) {
      const c = mk("div", "");
      c.append(mk("b", "", v), mk("small", "muted", l));
      sum.appendChild(c);
    }
    box.appendChild(sum);
    if (!st.length) box.appendChild(mk("p", "muted jp-empty", "El almacén está vacío."));
    const list = st.slice().sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
    for (const t of list.slice(0, 5)) {
      const r = mk("div", "jp-row");
      const l = mk("div", "jp-row-l");
      l.append(mk("b", "", t.name), mk("small", "muted", `${t.plate}${t.days != null ? ` · ${t.days === 0 ? "entró hoy" : `${t.days} ${t.days === 1 ? "día" : "días"} en el almacén`}` : ""}`));
      const rgt = mk("div", "jp-num");
      rgt.append(mk("b", "", money(t.paid)), mk("small", "muted", t.sell ? `vender a ${kShort(t.sell[0])}–${kShort(t.sell[1])}` : "sin ficha"));
      if (t.days != null && t.days >= 14) l.lastChild.classList.add("jp-old");
      r.append(l, rgt);
      box.appendChild(r);
    }
    if (list.length > 5) box.appendChild(mk("p", "muted jp-small", `… y ${list.length - 5} más en la pestaña Compraventa`));
    box.appendChild(mk("p", "muted jp-small", `Esta semana: ${wk.buy} ${wk.buy === 1 ? "compra" : "compras"} · ${wk.sell} ${wk.sell === 1 ? "venta" : "ventas"}`));
  }

  $("jp-prev").addEventListener("click", () => {
    JP.sun = jpIsoAdd(JP.sun || jpDefaultSun(), -7);
    load();
  });
  $("jp-next").addEventListener("click", () => {
    JP.sun = jpIsoAdd(JP.sun || jpDefaultSun(), 7);
    load();
  });
  $("jp-refresh").addEventListener("click", async () => {
    const b = $("jp-refresh");
    b.disabled = true;
    status("Pidiendo al bot lo último del canal…");
    try {
      const tok = await cvCloud.token();
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 60000);
      await fetch(`${CV_CLOUD_URL}/functions/v1/leer-logs`, {
        method: "POST",
        headers: { apikey: CV_CLOUD_KEY, Authorization: `Bearer ${tok || CV_CLOUD_KEY}`, "Content-Type": "application/json" },
        body: "{}",
        signal: ctl.signal,
      }).finally(() => clearTimeout(timer));
    } catch {
      // si el bot no responde se usa lo ya guardado
    }
    b.disabled = false;
    await loadStrikeHist();
    load(true);
  });

  let first = true;
  const onOpen = () => {
    if (!AUTH.aguila) return;
    if (first) {
      first = false;
      JP.sun = jpDefaultSun();
    }
    load();
  };
  // Solo al entrar en la pestaña (no con cada cambio de clase, como "is-loading").
  let wasActive = root.classList.contains("is-active");
  new MutationObserver(() => {
    const on = root.classList.contains("is-active");
    if (on && !wasActive) onOpen();
    wasActive = on;
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  if (wasActive) onOpen();
}
