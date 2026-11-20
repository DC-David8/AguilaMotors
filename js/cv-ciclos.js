// ============================================================================
// Aguila Motors · Compraventa: seguimiento de cada coche (v157).
// Une la compra y la venta de cada matrícula en un «ciclo»: cuándo se compró,
// cuándo se vendió, días en el almacén, gastos y ganancia. Las compras o
// ventas a $ 0 son traspasos y no cuentan en las ganancias. Los gastos de
// cada coche van en la tabla cv_gastos (SQL 22). Solo el Jefe Aguila.
// ============================================================================

const CV_SLOW_DAYS = 14; // aviso de coche parado
const CVG = { ok: null, rows: [], at: 0, err: "" };

// «19/11/2026 17:05» → Date (null si no hay fecha).
function cvDateOf(ts) {
  const m = String(ts || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0)) : null;
}
const cvDays = (a, b) => (a && b ? Math.max(0, Math.floor((b - a) / 86400000)) : null);
const cvDM = (d) => (d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : "—");
const cvCycleKey = (plate, buy) => `${plate}|${buy?.sort || buy?.ts || ""}`;

async function cvGastosLoad(force = false) {
  if (!AUTH.aguila) return CVG;
  if (!force && CVG.ok && Date.now() - CVG.at < 60000) return CVG;
  try {
    CVG.rows = (await cvCloud.req("/rest/v1/cv_gastos?select=*&order=fecha.asc,id.asc", { auth: true })) || [];
    CVG.ok = true;
    CVG.at = Date.now();
  } catch (err) {
    CVG.ok = /PGRST205|42P01|does not exist|404/.test(String(err?.message || err)) ? false : CVG.ok;
    CVG.err = err?.message || String(err);
  }
  return CVG;
}

// Ciclos de compraventa a partir de los movimientos (ya en orden de fecha).
//   estado: almacen · vendido · traspaso · sincompra
function cvCycles(tx) {
  const gastosBy = new Map();
  for (const g of CVG.rows) {
    const k = String(g.ciclo || "");
    if (!gastosBy.has(k)) gastosBy.set(k, []);
    gastosBy.get(k).push(g);
  }
  const open = new Map();
  const out = [];
  const close = (c) => {
    c.gastos = gastosBy.get(c.key) || [];
    c.gasto = c.gastos.reduce((a, g) => a + (Number(g.importe) || 0), 0);
    const now = new Date();
    c.dBuy = c.buy ? cvDateOf(c.buy.ts) : null;
    c.dSell = c.sell ? cvDateOf(c.sell.ts) : null;
    c.days = c.dBuy ? cvDays(c.dBuy, c.dSell || now) : null;
    c.cost = (c.buy ? Number(c.buy.price) || 0 : 0) + c.gasto;
    if (c.estado === "vendido") {
      c.profit = (Number(c.sell.price) || 0) - c.cost;
      c.pct = c.cost > 0 ? c.profit / c.cost : null;
    }
    const cat = catFind((c.buy || c.sell).model);
    const ref = cat ? cvRef(cat.precio) : null;
    c.cat = cat;
    // Desde cuánto venderlo: el mínimo del catálogo, y nunca por debajo de lo que costó + 10 %.
    c.target = Math.max(ref ? ref.sell[0] : 0, Math.round(c.cost * 1.1));
    out.push(c);
  };
  // v162: una salida a $ 0 queda «en espera»: si el coche vuelve al taller a $ 0
  // antes de otra cosa, es un ida y vuelta (moverlo, probarlo…) y no cuenta.
  const pend = new Map(); // matrícula → { c, out }
  const settle = (plate) => {
    const p = pend.get(plate);
    if (!p) return;
    pend.delete(plate);
    p.c.sell = p.out;
    p.c.estado = p.c.zeroIn ? "traspaso" : "vendido";
    close(p.c);
  };
  for (const t of tx) {
    const k = cvKind(t);
    const zero = !(Number(t.price) > 0);
    if (k === "compra") {
      const p = pend.get(t.plate);
      if (p && zero) {
        // Vuelve a $ 0: se ignoran la salida y la vuelta, el coche sigue en su ciclo.
        pend.delete(t.plate);
        (p.c.trips = p.c.trips || []).push(p.out, t);
        open.set(t.plate, p.c);
        continue;
      }
      settle(t.plate);
      const prev = open.get(t.plate);
      if (prev) {
        // Comprado otra vez sin venta registrada: el anterior se cierra tal cual.
        prev.estado = "sinventa";
        close(prev);
      }
      open.set(t.plate, { plate: t.plate, model: t.model, buy: t, sell: null, zeroIn: zero, trips: [], key: cvCycleKey(t.plate, t) });
    } else if (k === "venta") {
      settle(t.plate);
      const c = open.get(t.plate);
      if (c) {
        open.delete(t.plate);
        if (zero) {
          pend.set(t.plate, { c, out: t });
          continue;
        }
        // v160: solo es traspaso si entró Y salió a $ 0; si entró a $ 0 y se
        // vendió con dinero, es una venta normal (coste 0 + gastos).
        c.sell = t;
        c.estado = "vendido";
        close(c);
      } else {
        close({ plate: t.plate, model: t.model, buy: null, sell: t, trips: [], key: cvCycleKey(t.plate, t), estado: zero ? "traspaso" : "sincompra" });
      }
    }
  }
  for (const plate of [...pend.keys()]) settle(plate);
  for (const c of open.values()) {
    c.estado = "almacen";
    close(c);
  }
  // Lo más reciente arriba (por la última fecha del ciclo).
  const last = (c) => (c.sell || c.buy)?.sort || "";
  return out.sort((a, b) => last(b).localeCompare(last(a)));
}

// Periodo del resumen: semana (7 días) · mes (este mes) · todo.
function cvInPeriod(d, period) {
  if (period === "todo") return true;
  if (!d) return false;
  const now = new Date();
  if (period === "semana") return now - d <= 7 * 86400000;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function setupCvTracking({ source, rerender, el }) {
  const $ = (id) => document.getElementById(id);
  let period = "mes";
  let filter = "todos";
  let cycles = [];
  const money = (v) => fmtMoney(Math.round(v || 0));
  const signed = (v) => `${v >= 0 ? "+" : "−"}${fmtMoney(Math.abs(Math.round(v || 0)))}`;
  const pctS = (p) => (p == null ? "entró a $ 0" : `${p >= 0 ? "+" : "−"}${Math.abs(Math.round(p * 100))} %`);
  const nameOf = (c) => (c.cat?.nombre || (c.buy || c.sell).model || "").toString();
  const who = (n) => cvDisplayName(n);

  function compute() {
    cycles = cvCycles(source().tx);
    return cycles;
  }

  // ---------- Resumen y avisos ----------
  function renderSummary() {
    const box = $("cv-track-sum");
    if (!box) return;
    box.textContent = "";
    const sold = cycles.filter((c) => c.estado === "vendido" && cvInPeriod(c.dSell, period));
    const stock = cycles.filter((c) => c.estado === "almacen");
    const profit = sold.reduce((a, c) => a + c.profit, 0);
    const pcts = sold.filter((c) => c.pct != null);
    const avgPct = pcts.length ? pcts.reduce((a, c) => a + c.pct, 0) / pcts.length : null;
    const days = sold.filter((c) => c.days != null);
    const avgDays = days.length ? Math.round(days.reduce((a, c) => a + c.days, 0) / days.length) : null;
    const best = sold.slice().sort((a, b) => b.profit - a.profit)[0];
    const byMed = new Map();
    for (const c of sold) {
      const m = who(c.sell.mediator);
      byMed.set(m, (byMed.get(m) || 0) + c.profit);
    }
    const topMed = [...byMed.entries()].sort((a, b) => b[1] - a[1])[0];
    const kpi = (val, txt, cls = "") => {
      const k = el("div", "cvt-k");
      k.append(el("b", cls, val), el("span", "", txt));
      box.appendChild(k);
    };
    kpi(sold.length ? signed(profit) : "—", `beneficio de reventas · ${sold.length} ${sold.length === 1 ? "coche" : "coches"}`, profit > 0 ? "g" : profit < 0 ? "r" : "");
    kpi(avgPct == null ? "—" : pctS(avgPct), "margen medio sobre lo que costó");
    kpi(avgDays == null ? "—" : `${avgDays} ${avgDays === 1 ? "día" : "días"}`, "de media hasta venderse");
    kpi(money(stock.reduce((a, c) => a + c.cost, 0)), `parado en el almacén · ${stock.length} ${stock.length === 1 ? "coche" : "coches"}`);
    kpi(best ? nameOf(best) : "—", best ? `mejor reventa · ${signed(best.profit)}` : "mejor reventa", best ? "g" : "");
    kpi(topMed ? topMed[0] : "—", topMed ? `mediador con más beneficio · ${signed(topMed[1])}` : "mediador con más beneficio");

    // Avisos
    const al = $("cv-track-alerts");
    if (!al) return;
    al.textContent = "";
    const slow = stock.filter((c) => (c.days || 0) > CV_SLOW_DAYS).sort((a, b) => b.days - a.days);
    if (slow.length) {
      const a = el("div", "cvt-a slow");
      a.appendChild(el("b", "", `🐢 ${slow.length} ${slow.length === 1 ? "coche parado" : "coches parados"} más de ${CV_SLOW_DAYS} días`));
      a.append(`${slow.slice(0, 6).map((c) => `${nameOf(c)} (${c.days} d)`).join(" · ")}${slow.length > 6 ? " …" : ""} — ${money(slow.reduce((s, c) => s + c.cost, 0))} sin moverse`);
      a.addEventListener("click", () => setFilter("lentos"));
      al.appendChild(a);
    }
    const loss = cycles.filter((c) => c.estado === "vendido" && c.profit < 0 && cvInPeriod(c.dSell, period));
    if (loss.length) {
      const a = el("div", "cvt-a loss");
      a.appendChild(el("b", "", `🔻 ${loss.length} ${loss.length === 1 ? "venta" : "ventas"} con pérdida`));
      a.append(loss.slice(0, 4).map((c) => `${nameOf(c)}: comprado ${money(c.cost)} · vendido ${money(c.sell.price)} → ${signed(c.profit)}`).join(" · "));
      a.addEventListener("click", () => setFilter("perdida"));
      al.appendChild(a);
    }
    al.hidden = !al.children.length;
  }

  // ---------- Ciclos ----------
  const FILTERS = [
    ["todos", "Todos", () => true],
    ["almacen", "⏳ En almacén", (c) => c.estado === "almacen"],
    ["ganancia", "✅ Con ganancia", (c) => c.estado === "vendido" && c.profit >= 0],
    ["perdida", "🔻 Con pérdida", (c) => c.estado === "vendido" && c.profit < 0],
    ["traspaso", "🔁 Traspasos", (c) => c.estado === "traspaso"],
    ["lentos", "🐢 Parados", (c) => c.estado === "almacen" && (c.days || 0) > CV_SLOW_DAYS],
  ];
  function setFilter(k) {
    filter = k;
    document.querySelector('[data-cv="cv-p-cyc"]')?.click();
    renderCycles();
  }
  function stateTag(c) {
    if (c.estado === "vendido") return el("span", `cvt-st ${c.profit >= 0 ? "s-g" : "s-p"}`, c.profit >= 0 ? "✅ Vendido" : "🔻 Con pérdida");
    if (c.estado === "traspaso") return el("span", "cvt-st s-z", "🔁 Traspaso");
    if (c.estado === "sincompra") return el("span", "cvt-st s-z", "Sin compra registrada");
    if (c.estado === "sinventa") return el("span", "cvt-st s-z", "Sin venta registrada");
    return el("span", "cvt-st s-alm", "⏳ En almacén");
  }
  function plateBtn(plate, model) {
    const b = el("button", "cvt-plate", "");
    b.type = "button";
    b.append(el("b", "", (model || "").toUpperCase()), el("span", "cv-plate-sm", plate));
    b.title = "Ver todo lo que ha pasado con esta matrícula";
    b.addEventListener("click", () => openFicha(plate));
    return b;
  }
  function renderCycles() {
    const fbar = $("cv-cyc-filters");
    const body = $("cv-cyc");
    if (!fbar || !body) return;
    fbar.textContent = "";
    for (const [k, label, fn] of FILTERS) {
      const n = cycles.filter(fn).length;
      if (k === "lentos" && !n) continue;
      const b = el("button", "cvt-f" + (filter === k ? " on" : ""), `${label}${k === "todos" ? "" : ` · ${n}`}`);
      b.type = "button";
      b.addEventListener("click", () => {
        filter = k;
        renderCycles();
      });
      fbar.appendChild(b);
    }
    const q = normalizeKeySimple($("cv-cyc-q")?.value || "");
    const fn = (FILTERS.find((f) => f[0] === filter) || FILTERS[0])[2];
    const rows = cycles.filter(fn).filter((c) => !q || normalizeKeySimple(`${c.plate} ${c.model} ${nameOf(c)} ${c.buy?.owner || ""} ${c.sell?.buyer || ""} ${c.buy?.mediator || ""} ${c.sell?.mediator || ""}`).includes(q));
    body.textContent = "";
    for (const c of rows) {
      const tr = el("tr");
      const tdV = el("td");
      tdV.appendChild(plateBtn(c.plate, c.cat?.nombre || c.model));
      tr.appendChild(tdV);
      const tdB = el("td");
      if (c.buy) {
        tdB.append(el("span", "", c.buy.ts ? c.buy.ts.slice(0, 16) : "—"), el("small", "cvt-sub", `de ${who(c.buy.owner)}${c.buy.mediator ? ` · vía ${who(c.buy.mediator)}` : ""}`));
      } else tdB.appendChild(el("span", "muted", "—"));
      tr.appendChild(tdB);
      const tdS = el("td");
      if (c.sell) tdS.append(el("span", "", c.sell.ts ? c.sell.ts.slice(0, 16) : "—"), el("small", "cvt-sub", `a ${who(c.sell.buyer)}${c.sell.mediator ? ` · vía ${who(c.sell.mediator)}` : ""}`));
      else tdS.appendChild(el("span", "muted", "—"));
      tr.appendChild(tdS);
      const slow = c.estado === "almacen" && (c.days || 0) > CV_SLOW_DAYS;
      tr.appendChild(el("td", "num" + (slow ? " cvt-y" : ""), c.days == null ? "—" : `${c.days}${slow ? " 🐢" : ""}`));
      tr.appendChild(el("td", "num", c.buy ? money(c.buy.price) : "—"));
      tr.appendChild(el("td", "num" + (c.gasto ? "" : " muted"), c.gasto ? money(c.gasto) : "—"));
      tr.appendChild(el("td", "num", c.sell ? money(c.sell.price) : c.estado === "almacen" ? `≥ ${money(c.target)}` : "—"));
      const tdR = el("td", "num");
      if (c.estado === "vendido") tdR.append(el("b", c.profit >= 0 ? "cvt-g" : "cvt-r", signed(c.profit)), el("small", "cvt-sub", pctS(c.pct)));
      else tdR.appendChild(el("span", "muted", c.estado === "traspaso" ? "no cuenta" : "—"));
      tr.appendChild(tdR);
      const tdE = el("td");
      tdE.appendChild(stateTag(c));
      tr.appendChild(tdE);
      body.appendChild(tr);
    }
    const empty = $("cv-cyc-empty");
    if (empty) empty.hidden = rows.length > 0;
  }

  // ---------- Historial: columna «Resultado» y ranking de mediadores ----------
  function resultFor(t) {
    const k = cvKind(t);
    const td = el("td", "cvt-res");
    if (cycles.some((x) => x.trips?.includes(t))) {
      td.append(el("span", "cvt-st s-z", "↔ Salida y vuelta a $ 0"), el("small", "cvt-sub", "no cuenta: el coche siguió en el taller"));
      return td;
    }
    const c = cycles.find((x) => (k === "venta" ? x.sell === t : x.buy === t));
    if (!c || k === "traspaso") return td;
    if (c.estado === "traspaso") {
      td.appendChild(el("span", "cvt-st s-z", "🔁 Traspaso"));
      return td;
    }
    if (k === "venta") {
      if (c.estado === "sincompra") {
        td.append(el("span", "muted", "Sin compra registrada"));
        return td;
      }
      td.append(el("b", c.profit >= 0 ? "cvt-g" : "cvt-r", `${signed(c.profit)} · ${pctS(c.pct)}`), el("small", "cvt-sub", `comprado el ${cvDM(c.dBuy)} · ${c.days ?? "?"} ${c.days === 1 ? "día" : "días"} en almacén${c.gasto ? ` · ${money(c.gasto)} de gastos` : ""}`));
      return td;
    }
    if (c.estado === "vendido") {
      td.append(el("span", "", `Vendido el ${cvDM(c.dSell)}`), el("small", "cvt-sub", `${signed(c.profit)} (${pctS(c.pct)})`));
    } else if (c.estado === "almacen") {
      td.append(el("b", "cvt-y", `⏳ ${c.days === 0 ? "En almacén desde hoy" : `${c.days} ${c.days === 1 ? "día" : "días"} en almacén`}`), el("small", "cvt-sub", `vender desde ${money(c.target)}`));
    }
    return td;
  }
  function renderRanking() {
    const box = $("cv-rank");
    if (!box) return;
    box.textContent = "";
    const stat = new Map();
    const get = (n) => {
      const k = who(n || "—");
      if (!stat.has(k)) stat.set(k, { buys: 0, sells: 0, profit: 0, n: 0 });
      return stat.get(k);
    };
    for (const c of cycles) {
      if (c.buy && cvInPeriod(c.dBuy, period) && c.estado !== "traspaso" && c.buy.mediator) get(c.buy.mediator).buys++;
      if (c.sell && cvInPeriod(c.dSell, period) && c.sell.mediator && c.estado !== "traspaso") {
        const s = get(c.sell.mediator);
        s.sells++;
        if (c.estado === "vendido") {
          s.profit += c.profit;
          s.n++;
        }
      }
    }
    const rows = [...stat.entries()].sort((a, b) => b[1].profit - a[1].profit || b[1].sells + b[1].buys - (a[1].sells + a[1].buys));
    if (!rows.length) {
      box.appendChild(el("p", "muted", "Sin compras ni ventas en este periodo."));
      return;
    }
    const tb = el("table", "cvt-rank");
    const h = el("tr");
    ["Mediador", "Compras", "Ventas", "Beneficio de sus ventas"].forEach((x, i) => h.appendChild(el("th", i ? "num" : "", x)));
    tb.appendChild(h);
    for (const [name, s] of rows) {
      const tr = el("tr");
      tr.appendChild(el("td", "", name));
      tr.appendChild(el("td", "num", String(s.buys)));
      tr.appendChild(el("td", "num", String(s.sells)));
      tr.appendChild(el("td", "num " + (s.n ? (s.profit >= 0 ? "cvt-g" : "cvt-r") : "muted"), s.n ? signed(s.profit) : "—"));
      tb.appendChild(tr);
    }
    box.appendChild(tb);
  }

  // ---------- Ficha de la matrícula ----------
  let dlg = null;
  let fichaPlate = "";
  function ensureDlg() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.className = "cvt-dlg";
    dlg.innerHTML = '<form method="dialog" class="modal-card"><header class="modal-head"><h3 id="cvt-f-title">Ficha</h3><button value="cancel" class="ghost">Cerrar</button></header><div id="cvt-f-body"></div></form>';
    document.body.appendChild(dlg);
    return dlg;
  }
  async function openFicha(plate) {
    fichaPlate = plate;
    ensureDlg();
    paintFicha();
    if (!dlg.open) dlg.showModal();
    await cvGastosLoad();
    if (dlg.open && fichaPlate === plate) paintFicha();
  }
  function paintFicha() {
    const plate = fichaPlate;
    const { tx } = source();
    const mine = tx.filter((t) => t.plate === plate);
    const cyc = cycles.filter((c) => c.plate === plate);
    const cur = cyc[0];
    const model = (mine[mine.length - 1] || {}).model || "";
    const cat = catFind(model);
    const title = $("cvt-f-title");
    title.textContent = "";
    title.append(`${(cat?.nombre || model).toUpperCase()} `, el("span", "cv-plate-sm", plate));
    const body = $("cvt-f-body");
    body.textContent = "";
    // Línea de tiempo (movimientos + gastos).
    // Movimientos en orden; los gastos de cada coche van justo después de su compra
    // (la hora del juego y la hora real no tienen por qué coincidir).
    const items = [];
    for (const t of mine) {
      items.push({ t });
      const c = cyc.find((x) => x.buy === t);
      if (c) for (const g of c.gastos) items.push({ d: new Date(g.fecha), g, c });
    }
    const tl = el("div", "cvt-tl");
    for (const it of items) {
      if (it.t) {
        const k = cvKind(it.t);
        const zero = !(Number(it.t.price) > 0);
        const row = el("div", `cvt-ti ${k === "venta" ? "v" : k === "compra" ? "c" : "x"}`);
        const trip = cyc.some((x) => x.trips?.includes(it.t));
        row.appendChild(el("b", "", `${it.t.ts || "Sin fecha"} · ${trip ? (k === "venta" ? "Sale a $ 0 (ida y vuelta, no cuenta)" : "Vuelve a $ 0 (ida y vuelta, no cuenta)") : zero && k !== "traspaso" ? "Traspaso" : k === "compra" ? "Compra" : k === "venta" ? "Venta" : "Traspaso entre particulares"} · ${money(it.t.price)}`));
        if (trip) row.className = "cvt-ti x";
        row.appendChild(el("div", "", `${k === "venta" ? `A ${who(it.t.buyer)}` : `De ${who(it.t.owner)}${k === "traspaso" ? ` a ${who(it.t.buyer)}` : ""}`}${it.t.mediator ? ` · mediador ${who(it.t.mediator)}` : ""}`));
        tl.appendChild(row);
      } else {
        const row = el("div", "cvt-ti gx");
        row.appendChild(el("b", "", `${cvDM(it.d)} · Gasto · ${money(it.g.importe)}`));
        row.appendChild(el("div", "", `${it.g.concepto || "Sin concepto"}${it.g.por ? ` · ${it.g.por}` : ""}`));
        tl.appendChild(row);
      }
    }
    if (cur?.estado === "almacen") {
      const row = el("div", "cvt-ti p");
      row.appendChild(el("b", "", "Pendiente de venta"));
      row.appendChild(el("div", "", `Vender desde ${money(cur.target)}${cur.cat ? " (mínimo del catálogo o lo que costó + 10 %)" : " (lo que costó + 10 %)"}`));
      tl.appendChild(row);
    }
    body.appendChild(tl);
    if (!cur) return;
    // Cifras del ciclo actual (o el último).
    const sum = el("div", "cvt-fsum");
    const box = (v, t, cls = "") => {
      const d = el("div");
      d.append(el("b", cls, v), el("span", "", t));
      sum.appendChild(d);
    };
    box(cur.buy ? money(cur.buy.price) : "—", "compra");
    box(money(cur.gasto), "gastos");
    box(money(cur.cost), "coste total");
    if (cur.estado === "vendido") box(signed(cur.profit), `resultado · ${pctS(cur.pct)}`, cur.profit >= 0 ? "cvt-g" : "cvt-r");
    else if (cur.estado === "almacen") box(`≥ ${money(cur.target)}`, cur.cost > 0 ? `para ganar al menos un ${Math.max(0, Math.round((cur.target / cur.cost - 1) * 100))} %` : "entró a $ 0: todo lo que se venda es ganancia", "cvt-y");
    else box(cur.estado === "traspaso" ? "🔁" : "—", cur.estado === "traspaso" ? "traspaso (no cuenta)" : "sin compra registrada");
    body.appendChild(sum);
    if (cyc.length > 1) body.appendChild(el("p", "muted cvt-small", `Este coche ha pasado ${cyc.length} veces por el taller: las cifras son de la última.`));

    // Gastos del ciclo actual.
    if (!cur.buy) return;
    const gb = el("div", "cvt-gbox");
    gb.appendChild(el("h4", "", "Gastos de este coche"));
    if (CVG.ok === false) {
      gb.appendChild(el("p", "muted cvt-small", "Para apuntar gastos, ejecuta en Supabase el SQL 22_cv_gastos.sql."));
      body.appendChild(gb);
      return;
    }
    for (const g of cur.gastos) {
      const r = el("div", "cvt-gl");
      r.append(el("span", "", `${g.concepto || "Sin concepto"} · ${cvDM(new Date(g.fecha))}`), el("b", "", money(g.importe)));
      const x = el("button", "cvt-x", "✕");
      x.type = "button";
      x.title = "Quitar este gasto";
      x.addEventListener("click", async () => {
        if (!confirm(`¿Quitar el gasto «${g.concepto}» (${money(g.importe)})?`)) return;
        try {
          await cvCloud.del("cv_gastos", `id=eq.${Number(g.id)}`);
          await cvGastosLoad(true);
          compute();
          paintFicha();
          rerender();
        } catch (err) {
          alert(`No se pudo quitar: ${err.message || err}`);
        }
      });
      r.appendChild(x);
      gb.appendChild(r);
    }
    if (!cur.gastos.length) gb.appendChild(el("p", "muted cvt-small", "Sin gastos apuntados."));
    const f = el("div", "cvt-gform");
    const ci = el("input", "text-input");
    ci.placeholder = "Concepto (reparación, tuning, pintura…)";
    ci.maxLength = 80;
    const ii = el("input", "text-input");
    ii.type = "number";
    ii.min = "1";
    ii.step = "1";
    ii.placeholder = "Importe";
    const add = el("button", "", "➕ Añadir");
    add.type = "button";
    add.addEventListener("click", async () => {
      const imp = Math.round(Number(ii.value));
      if (!ci.value.trim()) return alert("Pon el concepto del gasto.");
      if (!(imp > 0)) return alert("Pon el importe.");
      add.disabled = true;
      try {
        await cvCloud.req("/rest/v1/cv_gastos", {
          method: "POST",
          auth: true,
          headers: { Prefer: "return=minimal" },
          body: [{ ciclo: cur.key, plate: cur.plate, concepto: ci.value.trim().slice(0, 80), importe: imp, por: AUTH.name || null }],
        });
        await cvGastosLoad(true);
        compute();
        paintFicha();
        rerender();
      } catch (err) {
        add.disabled = false;
        alert(`No se pudo guardar: ${err.message || err}`);
      }
    });
    f.append(ci, ii, add);
    gb.appendChild(f);
    gb.appendChild(el("p", "muted cvt-small", "El resultado de la venta será: venta − compra − gastos."));
    body.appendChild(gb);
  }

  // ---------- 🧾 Comisiones históricas (pago aparte, una sola vez) ----------
  // Ventas anteriores al domingo en que empezó la comisión automática: esas no
  // las paga Pagos; aquí se calculan con las mismas reglas y se arma el mensaje.
  function openHistorico() {
    const all = cvCommissions(cycles).filter((x) => x.semana < CV_COM_START);
    const emps = (typeof EMP_CLOUD !== "undefined" && EMP_CLOUD.list) || [];
    const empOf = (n) => emps.find((e) => normalizeKeySimple(fullName(e)) === normalizeKeySimple(n || ""));
    const per = new Map();
    const outside = new Map();
    const add = (n, amount, item) => {
      if (!n || !(amount > 0)) return;
      const e = empOf(n);
      const target = e && !isEmployeeNoPay(fullName(e)) ? per : outside;
      const k = e ? fullName(e) : n;
      if (!target.has(k)) target.set(k, { name: k, e, amount: 0, cars: 0 });
      const x = target.get(k);
      x.amount += amount;
      x.cars++;
    };
    for (const c of all) {
      add(c.med_venta, c.com_venta, c);
      add(c.med_compra, c.com_compra, c);
    }
    const people = [...per.values()].sort((a, b) => b.amount - a.amount);
    const total = people.reduce((a, p) => a + p.amount, 0);
    const $m = (n) => `$ ${Math.round(n || 0).toLocaleString("de-DE")}`;
    const tag = (p) => {
      const d = p.e ? getEmployeeDiscord(fullName(p.e)) : "";
      return d ? `<@${d}>` : `**${p.name}**`;
    };
    const mention = (n) => {
      const e = empOf(n);
      const d = e ? getEmployeeDiscord(fullName(e)) : "";
      return d && e && !isEmployeeNoPay(fullName(e)) ? `<@${d}>` : n;
    };
    const first = all.map((c) => c.semana).sort()[0];
    const dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
    const startD = new Date(`${CV_COM_START}T12:00:00Z`);
    const lastDay = new Date(startD - 86400000).toISOString().slice(0, 10);
    const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const sold = cycles.filter((c) => c.sell && cvPayWeekOf(c.dSell) < CV_COM_START);
    const loss = sold.filter((c) => c.estado === "vendido" && c.profit <= 0).length;
    const tras = sold.filter((c) => c.estado === "traspaso").length;
    const detail = all.map((c) => {
      const p = [];
      if (c.med_venta && c.com_venta > 0 && per.has(fullName(empOf(c.med_venta) || { name: c.med_venta, surname: "" }))) p.push(`Venta: ${mention(c.med_venta)} ${$m(c.com_venta)}`);
      if (c.med_compra && c.com_compra > 0 && per.has(fullName(empOf(c.med_compra) || { name: c.med_compra, surname: "" }))) p.push(`Compra: ${mention(c.med_compra)} ${$m(c.com_compra)}`);
      return p.length ? `> 🚙 **${c.modelo || c.plate}** \`${c.plate}\` · ganancia ${$m(c.ganancia)}\n> -# ${p.join(" · ")}` : "";
    }).filter(Boolean);
    const head = `# 🦅 COMISIONES DEL COMPRAVENTA · HISTÓRICO\n-# Ventas ${first ? `desde la semana del ${dmy(first)} ` : ""}hasta el ${dmy(lastDay)} · pagadas el ${today}\n\nComisión: **10 %** de la ganancia para quien medió la venta y **5 %** para quien medió la compra (ganancia = venta − compra − gastos). Sin comisión en ventas con pérdida ni en traspasos a $ 0.`;
    const byPerson = `## 💰 Por empleado\n${people.map((p) => `> 💰 ${tag(p)} — **${$m(p.amount)}** · ${getEmployeeIban(p.name) ? `\`${getEmployeeIban(p.name)}\`` : "*IBAN pendiente*"} · ${p.cars} ${p.cars === 1 ? "coche" : "coches"}`).join("\n")}`;
    const resumen = `## 🏦 Resumen\n> 👥 **${people.length}** ${people.length === 1 ? "empleado cobra" : "empleados cobran"}\n> 💵 **Total retirado de la caja: ${$m(total)}**`;
    const firma = `-# — <@&${DC_JEFATURA_ID}> · 🦅 Aguila Motors`;
    const msg = dcAguila([head, byPerson, `## 🚙 Detalle por coche\n${detail.join("\n")}`, resumen, firma].join("\n\n"));

    // Ventana
    let d = document.getElementById("cvt-hist-dlg");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "cvt-hist-dlg";
      d.className = "cvt-dlg";
      document.body.appendChild(d);
    }
    d.innerHTML = '<form method="dialog" class="modal-card"><header class="modal-head"><h3>🧾 Comisiones históricas del compraventa</h3><button value="cancel" class="ghost">Cerrar</button></header><div id="cvt-h-body"></div></form>';
    const body = d.querySelector("#cvt-h-body");
    body.appendChild(el("p", "muted cvt-small", `Ventas anteriores al ${dmy(CV_COM_START)} (desde esa semana la comisión la paga Pagos sola). ${all.length} ${all.length === 1 ? "venta con ganancia" : "ventas con ganancia"}${loss ? ` · ${loss} con pérdida (sin comisión)` : ""}${tras ? ` · ${tras} traspasos (no cuentan)` : ""}.`));
    if (!all.length) {
      body.appendChild(el("p", "", "No hay ventas con ganancia anteriores a esa fecha."));
      d.showModal();
      return;
    }
    const tb = el("table", "cvt-rank");
    const hr = el("tr");
    ["Empleado", "Coches", "Comisión"].forEach((x, i) => hr.appendChild(el("th", i ? "num" : "", x)));
    tb.appendChild(hr);
    for (const p of people) {
      const tr = el("tr");
      tr.append(el("td", "", p.name), el("td", "num", String(p.cars)), el("td", "num cvt-g", fmtMoney(p.amount)));
      tb.appendChild(tr);
    }
    const tt = el("tr");
    tt.append(el("td", "", "Total"), el("td"), el("td", "num", fmtMoney(total)));
    tt.style.fontWeight = "800";
    tb.appendChild(tt);
    body.appendChild(tb);
    if (outside.size) body.appendChild(el("p", "cvt-small", `⚠ No se pagan (no son empleados o no cobran): ${[...outside.values()].map((p) => `${p.name} (${fmtMoney(p.amount)})`).join(", ")}. Si alguno es un empleado con otro nombre en su ficha, corrígelo y vuelve a abrir esto.`));
    // Mensaje (partido si no cabe en 2.000 caracteres)
    const parts = [];
    let cur = "";
    for (const block of msg.split("\n\n")) {
      for (const piece of block.length > 1950 ? block.split("\n") : [block]) {
        const sep = block.length > 1950 ? "\n" : "\n\n";
        if (!cur) cur = piece;
        else if ((cur + sep + piece).length <= 1950) cur += sep + piece;
        else {
          parts.push(cur);
          cur = piece;
        }
      }
    }
    if (cur) parts.push(cur);
    body.appendChild(el("h4", "cvt-h4", `Mensaje para el canal de pagas${parts.length > 1 ? ` · ${parts.length} partes (Discord no deja más de 2.000 caracteres por mensaje)` : ""}`));
    parts.forEach((t, i) => {
      const ta = el("textarea", "text-input cvt-ta");
      ta.value = t;
      ta.readOnly = true;
      ta.rows = Math.min(14, t.split("\n").length + 1);
      const b = el("button", "", parts.length > 1 ? `📋 Copiar parte ${i + 1} de ${parts.length}` : "📋 Copiar mensaje");
      b.type = "button";
      b.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(t);
        } catch {
          ta.select();
          document.execCommand("copy");
        }
        b.textContent = "✔ Copiado";
        setTimeout(() => (b.textContent = parts.length > 1 ? `📋 Copiar parte ${i + 1} de ${parts.length}` : "📋 Copiar mensaje"), 1800);
      });
      body.append(ta, b);
    });
    body.appendChild(el("p", "muted cvt-small", "Es un pago aparte, una sola vez: no se suma a las pagas de Pagos. Paga a cada uno en el juego y pega el mensaje en el canal de pagas."));
    d.showModal();
  }
  $("cv-com-hist")?.addEventListener("click", async () => {
    await cvGastosLoad(true);
    compute();
    openHistorico();
  });

  // Periodo del resumen y del ranking.
  document.querySelectorAll("[data-cvt-period]").forEach((b) =>
    b.addEventListener("click", () => {
      period = b.dataset.cvtPeriod;
      document.querySelectorAll("[data-cvt-period]").forEach((x) => x.classList.toggle("on", x.dataset.cvtPeriod === period));
      renderSummary();
      renderRanking();
    }),
  );
  $("cv-cyc-q")?.addEventListener("input", renderCycles);

  return {
    // Se llama en cada render() del Compraventa (antes de pintar el historial).
    render() {
      if (!AUTH.aguila) return;
      compute();
      renderSummary();
      renderCycles();
      renderRanking();
      cvComSync(cycles);
    },
    resultFor,
    openFicha,
    load: async () => {
      await cvGastosLoad();
      return CVG.ok;
    },
  };
}

// ============================================================================
// v158 · Comisiones del compraventa: 10 % de la ganancia al mediador de la
// venta y 5 % al de la compra. Se pagan con la semana en que se vendió.
// ============================================================================
const CV_COM_VENTA = 0.1;
const CV_COM_COMPRA = 0.05;
const CV_COM_START = "2026-11-15"; // semana desde la que Pagos suma la comisión sola (v158)
const CVCOM = { semana: "", ok: null, rows: [], byName: new Map(), logAt: "", busy: null, lastSig: "" };

// Domingo (AAAA-MM-DD) de la semana de pago de una fecha del log (hora de España).
function cvPayWeekOf(d) {
  if (!d) return "";
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return new Date(u - u.getUTCDay() * 86400000).toISOString().slice(0, 10);
}

// Comisiones de los coches vendidos con ganancia.
function cvCommissions(cycles) {
  const out = [];
  for (const c of cycles) {
    if (c.estado !== "vendido" || !(c.profit > 0) || !c.sell) continue;
    out.push({
      venta_uid: String(c.sell.uid || c.key),
      semana: cvPayWeekOf(c.dSell),
      plate: c.plate,
      modelo: String(c.cat?.nombre || c.model || "").slice(0, 60),
      ganancia: Math.round(c.profit),
      med_venta: cvDisplayName(c.sell.mediator || "") || null,
      com_venta: c.sell.mediator ? Math.round(c.profit * CV_COM_VENTA) : 0,
      med_compra: c.buy?.mediator ? cvDisplayName(c.buy.mediator) : null,
      com_compra: c.buy?.mediator ? Math.round(c.profit * CV_COM_COMPRA) : 0,
    });
  }
  return out.filter((x) => x.semana);
}

// El Jefe Aguila, al ver o procesar el compraventa, deja las comisiones al día
// en Supabase. Las semanas ya cerradas en Pagos no se tocan (quedan congeladas).
async function cvComSync(cycles) {
  if (!AUTH.aguila || CVCOM.ok === false) return;
  const all = cvCommissions(cycles);
  const sig0 = JSON.stringify(all);
  if (sig0 === CVCOM.lastSig) return;
  try {
    // Semanas ya cerradas en Pagos: sus comisiones quedan como se pagaron.
    const weeks = (await cvCloud.req("/rest/v1/pagos_semanas?select=semana", { auth: true })) || [];
    const closed = new Set(weeks.map((w) => String(w.semana)));
    const want = all.filter((x) => !closed.has(x.semana));
    const have = (await cvCloud.req("/rest/v1/cv_comisiones?select=venta_uid,semana", { auth: true })) || [];
    const keep = new Set(want.map((x) => x.venta_uid));
    const stale = have.filter((h) => !closed.has(String(h.semana)) && !keep.has(h.venta_uid));
    for (const h of stale) await cvCloud.del("cv_comisiones", `venta_uid=eq.${encodeURIComponent(h.venta_uid)}`);
    if (want.length) await cvCloud.upsert("cv_comisiones", want.map((x) => ({ ...x, calc_at: new Date().toISOString() })), "venta_uid");
    CVCOM.lastSig = sig0;
    CVCOM.ok = true;
    if (CVCOM.semana) cvComLoad(CVCOM.semana, true);
  } catch (err) {
    if (/PGRST205|42P01|does not exist|404/.test(String(err?.message || err))) CVCOM.ok = false;
    console.warn("[comisiones]", err);
  }
}

// Pagos: comisiones de la semana, por empleado.
async function cvComLoad(semana, force = false) {
  if (!semana || !hasAccess()) return CVCOM;
  if (!force && CVCOM.semana === semana && CVCOM.at && Date.now() - CVCOM.at < 60000) return CVCOM;
  if (CVCOM.busy) return CVCOM.busy;
  CVCOM.busy = (async () => {
    try {
      const [rows, set] = await Promise.all([
        cvCloud.req(`/rest/v1/cv_comisiones?select=*&semana=eq.${semana}&order=calc_at.asc`, { auth: true }),
        cvCloud.req("/rest/v1/app_settings?select=value&key=eq.cv_log_at", { auth: true }).catch(() => []),
      ]);
      CVCOM.rows = rows || [];
      CVCOM.ok = true;
      CVCOM.logAt = set?.[0]?.value || "";
    } catch (err) {
      CVCOM.rows = [];
      if (/PGRST205|42P01|does not exist|404/.test(String(err?.message || err))) CVCOM.ok = false;
    } finally {
      CVCOM.semana = semana;
      CVCOM.at = Date.now();
      CVCOM.byName = new Map();
      const add = (name, amount, item) => {
        if (!name || !(amount > 0)) return;
        const k = normalizeKeySimple(name);
        if (!CVCOM.byName.has(k)) CVCOM.byName.set(k, { name, amount: 0, items: [] });
        const x = CVCOM.byName.get(k);
        x.amount += amount;
        x.items.push(item);
      };
      for (const r of CVCOM.rows) {
        add(r.med_venta, Number(r.com_venta) || 0, { ...r, part: "venta", amount: Number(r.com_venta) || 0 });
        add(r.med_compra, Number(r.com_compra) || 0, { ...r, part: "compra", amount: Number(r.com_compra) || 0 });
      }
      CVCOM.busy = null;
      document.dispatchEvent(new CustomEvent("aguila-cvcom"));
    }
    return CVCOM;
  })();
  return CVCOM.busy;
}
const cvComOf = (name) => (CVCOM.semana && CVCOM.semana === payWeekKey() ? CVCOM.byName.get(normalizeKeySimple(name))?.amount || 0 : 0);
