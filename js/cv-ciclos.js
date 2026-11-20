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
  for (const t of tx) {
    const k = cvKind(t);
    if (k === "compra") {
      const prev = open.get(t.plate);
      if (prev) {
        // Comprado otra vez sin venta registrada: el anterior se cierra tal cual.
        prev.estado = prev.zeroIn ? "traspaso" : "sinventa";
        close(prev);
      }
      open.set(t.plate, { plate: t.plate, model: t.model, buy: t, sell: null, zeroIn: !(Number(t.price) > 0), key: cvCycleKey(t.plate, t) });
    } else if (k === "venta") {
      const c = open.get(t.plate);
      if (c) {
        open.delete(t.plate);
        c.sell = t;
        c.estado = c.zeroIn || !(Number(t.price) > 0) ? "traspaso" : "vendido";
        close(c);
      } else {
        close({ plate: t.plate, model: t.model, buy: null, sell: t, key: cvCycleKey(t.plate, t), estado: Number(t.price) > 0 ? "sincompra" : "traspaso" });
      }
    }
  }
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
  const pctS = (p) => (p == null ? "" : `${p >= 0 ? "+" : "−"}${Math.abs(Math.round(p * 100))} %`);
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
    const stock = cycles.filter((c) => c.estado === "almacen" && !c.zeroIn);
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
    ["lentos", "🐢 Parados", (c) => c.estado === "almacen" && !c.zeroIn && (c.days || 0) > CV_SLOW_DAYS],
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
    return el("span", "cvt-st s-alm", c.zeroIn ? "⏳ En almacén (traspaso)" : "⏳ En almacén");
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
      const slow = c.estado === "almacen" && !c.zeroIn && (c.days || 0) > CV_SLOW_DAYS;
      tr.appendChild(el("td", "num" + (slow ? " cvt-y" : ""), c.days == null ? "—" : `${c.days}${slow ? " 🐢" : ""}`));
      tr.appendChild(el("td", "num", c.buy ? money(c.buy.price) : "—"));
      tr.appendChild(el("td", "num" + (c.gasto ? "" : " muted"), c.gasto ? money(c.gasto) : "—"));
      tr.appendChild(el("td", "num", c.sell ? money(c.sell.price) : c.estado === "almacen" && !c.zeroIn ? `≥ ${money(c.target)}` : "—"));
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
    const c = cycles.find((x) => (k === "venta" ? x.sell === t : x.buy === t));
    const td = el("td", "cvt-res");
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
        row.appendChild(el("b", "", `${it.t.ts || "Sin fecha"} · ${zero && k !== "traspaso" ? "Traspaso" : k === "compra" ? "Compra" : k === "venta" ? "Venta" : "Traspaso entre particulares"} · ${money(it.t.price)}`));
        row.appendChild(el("div", "", `${k === "venta" ? `A ${who(it.t.buyer)}` : `De ${who(it.t.owner)}${k === "traspaso" ? ` a ${who(it.t.buyer)}` : ""}`}${it.t.mediator ? ` · mediador ${who(it.t.mediator)}` : ""}`));
        tl.appendChild(row);
      } else {
        const row = el("div", "cvt-ti gx");
        row.appendChild(el("b", "", `${cvDM(it.d)} · Gasto · ${money(it.g.importe)}`));
        row.appendChild(el("div", "", `${it.g.concepto || "Sin concepto"}${it.g.por ? ` · ${it.g.por}` : ""}`));
        tl.appendChild(row);
      }
    }
    if (cur?.estado === "almacen" && !cur.zeroIn) {
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
    else if (cur.estado === "almacen" && !cur.zeroIn) box(`≥ ${money(cur.target)}`, `para ganar al menos un ${Math.max(0, Math.round((cur.target / Math.max(1, cur.cost) - 1) * 100))} %`, "cvt-y");
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
    },
    resultFor,
    openFicha,
    load: async () => {
      await cvGastosLoad();
      return CVG.ok;
    },
  };
}
