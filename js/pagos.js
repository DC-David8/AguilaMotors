// Aguila Motors · Pagos: facturas, kits, ranking, cierre de semana y ascensos.
// (pagos.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Facturas / Kits
// ============================================================================

const KIT_PRICE_STORAGE_KEY = "aguila_kit_price_v1";
function getKitPrice() {
  const raw = Number(localStorage.getItem(KIT_PRICE_STORAGE_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 800;
}
function setKitPrice(v) {
  const n = Number(v);
  localStorage.setItem(KIT_PRICE_STORAGE_KEY, String(Number.isFinite(n) && n >= 0 ? n : 800));
}

function setupContabilidad() {
  const state = {
    invoices: {},
    kitsSales: [],
    invByIssuer: {},
    invByIssuerPaid: {},
    invByIssuerPending: {},
    kitsBySeller: {},
    kitsSelfBySeller: {},
    ignoredOtherBusiness: 0,
  };

  // El detalle de facturas/kits por separado se quito de la pagina (v91): si no
  // existe, se escribe en un elemento suelto que no se ve.
  const off = (id, tag = "div") => byId(id) || document.createElement(tag);
  const refs = {
    input: byId("conta-input"),
    invLine1: off("inv-line1"),
    kitsLine1: off("kits-line1"),
    kitsLine2: off("kits-line2"),
    kitsLine3: off("kits-line3"),
    kitPrice: byId("kit-price"),
    kitsSelf: byId("kits-line-self"),
    loaded: off("conta-loaded"),
    invTable: off("inv-table", "tbody"),
    salesTable: off("sales-table", "tbody"),
    totalGeneral: off("conta-total-general"),
    totalAPagar: byId("conta-total-a-pagar"),
    footer: off("conta-footer"),
  };

  if (refs.kitPrice) refs.kitPrice.value = getKitPrice();

  // Ranking de la semana: una fila por persona con facturas + kits, su rango,
  // lo que hay que pagarle y avisos (sin IBAN, no cobra, kits a si mismo).
  const RANK_BADGE = { "jefe aguila": "r-aguila", jefe: "r-jefe", "mano derecha": "r-jefe", subjefe: "r-subjefe", mecanico: "r-mecanico", chalan: "r-chalan", experimentado: "r-exp" };

  // Cuanto le falta a cada uno para el minimo (strike) y para su ascenso.
  function rankProgress(r) {
    const R = RANK_RULES;
    const out = { min: 0, goal: 0, goalLabel: "", note: "", noteCls: "", low: false };
    if (!r.emp || r.noPay) return out;
    out.min = R.min;
    const i = PROMO_LADDER.indexOf(r.rank);
    if (i >= 0 && R.up[r.rank]) {
      out.goal = R.up[r.rank];
      out.goalLabel = `${rankLabel(PROMO_LADDER[i + 1])} ${fmtMoney(out.goal)}`;
    } else if (r.rank === "Subjefe" && R.candidate) {
      out.goal = R.candidate;
      out.goalLabel = `⭐ ${rankLabel("Jefe")} ${fmtMoney(out.goal)}`;
    }
    if (r.total < R.min) {
      out.low = true;
      out.note = `Le faltan ${fmtMoney(R.min - r.total)} para evitar el strike`;
      out.noteCls = "bad";
    } else if (out.goal && r.total < out.goal) {
      out.note = `Mínimo cubierto ✅ · le faltan ${fmtMoney(out.goal - r.total)} para ${r.rank === "Subjefe" ? "ser candidato" : "ascender"}`;
      out.noteCls = "ok";
    } else if (out.goal) {
      out.note = r.rank === "Subjefe" ? "⭐ Candidato a ascenso" : "⬆️ Meta de ascenso alcanzada";
      out.noteCls = "ok";
    } else {
      out.note = "Mínimo cubierto ✅";
      out.noteCls = "ok";
    }
    return out;
  }

  let warnOpen = null; // plegado del cuadro de strikes (se recuerda mientras no se recarga)
  function renderRanking({ employees, kitPrice, invSummary, kitsSummary, totalAPagar: baseTotal }) {
    let totalAPagar = baseTotal;
    lastSnapshot = null;
    const list = byId("pg-ranking");
    if (!list) return;
    const byKey = new Map();
    const row = (name) => {
      const key = normalizeKeySimple(name);
      if (!byKey.has(key)) byKey.set(key, { name, fact: 0, kits: 0, self: 0 });
      return byKey.get(key);
    };
    for (const [name, total] of Object.entries(state.invByIssuerPaid)) row(name).fact += Number(total || 0);
    for (const [name, qty] of Object.entries(state.kitsBySeller)) {
      const r = row(name);
      r.kits += qty;
      r.self += state.kitsSelfBySeller[name] || 0;
    }
    const empByKey = new Map(employees.map((e) => [normalizeKeySimple(fullName(e)), e]));
    const rows = [...byKey.entries()].map(([key, r]) => {
      const e = empByKey.get(key);
      const name = e ? fullName(e) : r.name;
      const total = r.fact + r.kits * kitPrice;
      const pct = e ? pctForRank(e.rank) : 0;
      const payout = Math.round(total * pct);
      return { ...r, name, emp: e, rank: e?.rank || "", total, payout, noPay: isEmployeeNoPay(name), iban: getEmployeeIban(name) };
    });
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));

    const maxTotal = Math.max(1, ...rows.map((r) => r.total));
    // Empleado de la Semana (misma regla que Totales) y su bono.
    const winners = weekWinners(rows, (r) => !!r.emp);
    const top = rows.find((r) => winners.has(r));
    const bonusTotal = WEEK_BONUS * winners.size;
    totalAPagar += bonusTotal;
    if (byId("conta-total-a-pagar")) byId("conta-total-a-pagar").textContent = fmtMoney(totalAPagar);
    const kitsQty = kitsSummary.qty || 0;
    const selfQty = rows.reduce((a, r) => a + r.self, 0);
    const paying = rows.filter((r) => !r.noPay && r.payout > 0).length;

    byId("pg-kpi-fact").textContent = fmtMoney(invSummary.total + kitsSummary.total);
    byId("pg-kpi-fact-sub").textContent = rows.length ? `${invSummary.count} facturas · ${rows.length} ${rows.length === 1 ? "persona" : "personas"}` : "Sin datos";
    byId("pg-kpi-pay").textContent = fmtMoney(totalAPagar);
    byId("pg-kpi-kits").textContent = String(kitsQty);
    const kitsSub = byId("pg-kpi-kits-sub");
    kitsSub.textContent = kitsQty ? `${selfQty} a sí mismos (${Math.round((selfQty / kitsQty) * 100)}%)` : "-";
    kitsSub.classList.toggle("warn", kitsQty > 0 && selfQty / kitsQty >= 0.5);
    byId("pg-kpi-top").textContent = top ? top.name : "-";
    byId("pg-kpi-top").title = top ? top.name : "";
    byId("pg-kpi-top-sub").textContent = top ? `${fmtMoney(top.total)} facturados` : "-";
    byId("pg-total-label").textContent = paying ? `TOTAL A PAGAR · ${paying} ${paying === 1 ? "empleado" : "empleados"}` : "TOTAL A PAGAR";

    PAGOS_WEEK_GROSS = new Map(rows.map((r) => [normalizeKeySimple(r.name), r.total]));
    renderPromos(rows, employees);
    list.textContent = "";
    if (!rows.length) {
      const p = document.createElement("p");
      p.className = "muted pg-empty";
      p.textContent = "Pega el texto de Discord y pulsa Procesar para ver el ranking.";
      list.appendChild(p);
      return;
    }
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    for (const r of rows) {
      const isWinner = winners.has(r);
      const card = el("div", "pg-row" + (isWinner ? " first" : ""));
      const initials = r.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const av = r.rank ? rankAvatar(r.rank, initials, "pg-av" + (r.noPay ? " np" : "")) : el("div", "pg-av" + (r.noPay ? " np" : ""), initials);
      if (isWinner) av.appendChild(el("span", "crown", "🏆"));

      const mid = el("div", "pg-mid");
      const nameRow = el("div", "pg-name");
      nameRow.appendChild(el("span", "", r.name));
      if (r.rank) nameRow.appendChild(el("span", "pg-badge " + (RANK_BADGE[normalizeKeySimple(r.rank)] || ""), rankLabel(r.rank)));
      else nameRow.appendChild(el("span", "pg-badge w-nopay", "Sin registrar"));
      if (r.emp && r.noPay) nameRow.appendChild(el("span", "pg-badge w-nopay", "No cobra"));
      else if (r.emp && !r.iban) nameRow.appendChild(el("span", "pg-badge w-iban", "⚠ Sin IBAN"));
      if (r.kits && r.self / r.kits >= 0.5) nameRow.appendChild(el("span", "pg-badge w-self", `${r.self}/${r.kits} kits a sí mismo`));
      // Barra de progreso: minimo (rayita blanca) y meta de ascenso (rayita verde).
      const prog = rankProgress(r);
      const bar = el("div", "pg-prog");
      const fill = el("i", prog.low ? "low" : "");
      const scale = Math.max(prog.goal || 0, prog.min || 0, r.total, 1) * (prog.goal ? 1 : 1.15);
      fill.style.width = `${Math.max(2, Math.min(100, (r.total / scale) * 100))}%`;
      bar.appendChild(fill);
      const mark = (val, cls, label) => {
        const m = el("span", `pg-mk ${cls}${cls !== "goal" && prog.goal && val / scale > 0.5 ? " below" : ""}`);
        m.style.left = `${Math.min(100, (val / scale) * 100)}%`;
        m.appendChild(el("em", "", label));
        bar.appendChild(m);
      };
      if (prog.min) mark(prog.min, "", `mín. ${fmtMoney(prog.min)}`);
      if (prog.goal) mark(prog.goal, "goal", prog.goalLabel);
      const meta = [`${fmtMoney(r.total)} facturados`];
      if (r.kits) meta.push(`${r.kits} ${r.kits === 1 ? "kit" : "kits"}`);
      if (r.iban) meta.push(`IBAN ${r.iban}`);
      mid.append(nameRow, bar, el("div", "pg-meta", meta.join(" · ")));
      if (prog.note) mid.appendChild(el("div", `pg-prog-note ${prog.noteCls}`, prog.note));

      const amt = el("div", "pg-amt");
      if (r.noPay) {
        amt.append(el("small", "", "No cobra"), el("b", "pg-dash", "—"));
      } else if (!r.emp) {
        amt.append(el("small", "", "Sin rango"), el("b", "pg-dash", "$ 0"));
      } else {
        amt.append(el("small", "", isWinner ? "A pagar · incl. bono 🏆" : "A pagar"), el("b", "pay", fmtMoney(r.payout + (isWinner ? WEEK_BONUS : 0))));
      }
      card.append(av, mid, amt);
      list.appendChild(card);
    }

    // Strike: no facturar o no llegar al minimo (solo se libran los que no cobran),
    // salvo que el Jefe Aguila lo quite o lo ponga a mano.
    const grossOf = (e) => rows.find((x) => x.emp === e)?.total || 0;
    const wk = payWeekKey();
    const wsOf = new Map(employees.map((e) => [e, weekStrike(wk, e.id, fullName(e), grossOf(e), isEmployeeNoPay(fullName(e)))]));
    const idle = employees.filter((e) => wsOf.get(e).on).sort(byRankThenName);
    const forgiven = employees.filter((e) => wsOf.get(e).forgiven && wsOf.get(e).auto).sort(byRankThenName);
    lastSnapshot = {
      rows: employees.map((e) => {
        const name = fullName(e);
        const r = rows.find((x) => x.emp === e);
        const noPay = isEmployeeNoPay(name);
        const ws = wsOf.get(e);
        return {
          id: e.id ?? null,
          name,
          rank: e.rank || "",
          gross: r ? r.total : 0,
          payout: r && !noPay ? r.payout + (winners.has(r) ? WEEK_BONUS : 0) : 0,
          bonus: r && winners.has(r) && !noPay ? WEEK_BONUS : 0,
          noPay,
          strike: ws.on,
          ...(ws.manual || ws.forgiven ? { strikeMotivo: ws.reason } : {}),
        };
      }),
      total: invSummary.total + kitsSummary.total,
      facturas: invSummary.count,
    };
    const boss = AUTH.aguila && wk;
    const act = async (btn, fn) => {
      btn.disabled = true;
      try {
        await fn();
        refresh();
      } catch (err) {
        btn.disabled = false;
        alert(`No se pudo guardar: ${err.message || err}`);
      }
    };
    if (idle.length || forgiven.length || boss) {
      // En el movil sale plegado (solo el titulo); se abre al tocarlo.
      const box = el("details", "pg-warn-box");
      box.open = warnOpen ?? !window.matchMedia("(max-width: 700px)").matches;
      box.addEventListener("toggle", () => (warnOpen = box.open));
      const head = el("summary", "pg-warn-head", `⚠️ Strikes de esta semana · no facturaron o no llegaron a ${fmtMoney(RANK_RULES.min)} (${idle.length})`);
      box.appendChild(head);
      const chips = el("div", "pg-warn-list");
      if (!idle.length) chips.appendChild(el("span", "muted pg-strike-why", "Nadie tiene strike esta semana."));
      for (const e of idle) {
        const ws = wsOf.get(e);
        const n = strikesBefore(e.id, fullName(e), wk) + 1;
        const chip = el("span", "pg-warn-chip" + (n >= STRIKE_MAX ? " max" : "") + (ws.manual ? " manual" : ""));
        chip.appendChild(el("b", "", fullName(e)));
        if (e.rank) chip.appendChild(el("span", "pg-badge " + (RANK_BADGE[normalizeKeySimple(e.rank)] || ""), rankLabel(e.rank)));
        const g = grossOf(e);
        chip.appendChild(el("span", "pg-strike-why", ws.manual ? `✍️ ${ws.reason}` : g > 0 ? `${fmtMoney(g)} de ${fmtMoney(RANK_RULES.min)}` : "Sin facturar"));
        chip.appendChild(el("span", "pg-strike" + (n >= STRIKE_MAX ? " max" : ""), n >= STRIKE_MAX ? `🚫 ${strikeLabel(n)}` : strikeLabel(n)));
        if (boss) {
          const x = el("button", "pg-chip-btn", "✕");
          x.type = "button";
          x.title = ws.manual ? "Quitar este strike puesto a mano" : "Quitar el strike (ausencia justificada, etc.)";
          x.addEventListener("click", () => {
            if (ws.manual && !ws.auto) return act(x, () => saveStrikeAdj(wk, e.id, fullName(e), null));
            const m = prompt(`Quitar el strike de ${fullName(e)} esta semana.\n\nMotivo (opcional, p. ej. «ausencia justificada»):`, "");
            if (m === null) return;
            act(x, () => saveStrikeAdj(wk, e.id, fullName(e), { s: false, m: m.trim() }));
          });
          chip.appendChild(x);
        }
        chips.appendChild(chip);
      }
      box.appendChild(chips);
      if (forgiven.length) {
        const fl = el("div", "pg-warn-list pg-forgiven");
        fl.appendChild(el("span", "pg-strike-why", "Quitados por el jefe:"));
        for (const e of forgiven) {
          const ws = wsOf.get(e);
          const chip = el("span", "pg-warn-chip off");
          chip.appendChild(el("b", "", fullName(e)));
          if (ws.reason) chip.appendChild(el("span", "pg-strike-why", ws.reason));
          if (boss) {
            const u = el("button", "pg-chip-btn", "↺");
            u.type = "button";
            u.title = "Volver a poner el strike";
            u.addEventListener("click", () => act(u, () => saveStrikeAdj(wk, e.id, fullName(e), null)));
            chip.appendChild(u);
          }
          fl.appendChild(chip);
        }
        box.appendChild(fl);
      }
      if (boss) box.appendChild(strikeManager(employees, wsOf, wk, act));
      list.appendChild(box);
    }
  }

  // Solo Jefe Aguila: poner un strike a mano (mal comportamiento IC, etc.) y
  // quitar strikes acumulados de semanas anteriores.
  function strikeManager(employees, wsOf, wk, act) {
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    const wrap = el("div", "pg-strike-tools");
    const add = el("div", "pg-strike-add");
    const sel = document.createElement("select");
    sel.className = "text-input";
    sel.appendChild(new Option("Poner strike a…", ""));
    for (const e of [...employees].sort(byRankThenName)) {
      const ws = wsOf.get(e);
      if (ws.on || isEmployeeNoPay(fullName(e))) continue;
      sel.appendChild(new Option(`${fullName(e)}${e.rank ? ` (${rankLabel(e.rank)})` : ""}`, String(employees.indexOf(e))));
    }
    const why = document.createElement("input");
    why.className = "text-input";
    why.placeholder = "Motivo (p. ej. mal comportamiento IC)";
    why.maxLength = 120;
    const go = el("button", "", "➕ Poner strike");
    go.type = "button";
    go.addEventListener("click", () => {
      const e = employees[Number(sel.value)];
      if (!sel.value || !e) return alert("Elige a quién ponerle el strike.");
      const m = why.value.trim();
      if (!m) return alert("Escribe el motivo del strike.");
      act(go, () => saveStrikeAdj(wk, e.id, fullName(e), { s: true, m }));
    });
    add.append(sel, why, go);
    wrap.appendChild(add);

    const acc = employees
      .map((e) => ({ e, n: strikesBefore(e.id, fullName(e), wk) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || byRankThenName(a.e, b.e));
    if (acc.length) {
      const al = el("div", "pg-warn-list pg-acc");
      al.appendChild(el("span", "pg-strike-why", "Acumulados de semanas anteriores:"));
      for (const { e, n } of acc) {
        const chip = el("span", "pg-warn-chip" + (n >= STRIKE_MAX ? " max" : ""));
        chip.appendChild(el("b", "", fullName(e)));
        chip.appendChild(el("span", "pg-strike" + (n >= STRIKE_MAX ? " max" : ""), `${n}/${STRIKE_MAX}`));
        const minus = el("button", "pg-chip-btn", "−1");
        minus.type = "button";
        minus.title = "Quitar el último strike acumulado";
        minus.addEventListener("click", () => {
          const w = lastCountedStrikeWeek(e.id, fullName(e), wk);
          if (!w) return;
          const m = prompt(`Quitar a ${fullName(e)} el strike de la semana del ${w.slice(8, 10)}/${w.slice(5, 7)}.\n\nMotivo (opcional):`, "");
          if (m === null) return;
          act(minus, () => saveStrikeAdj(w, e.id, fullName(e), { s: false, m: m.trim() || "quitado por el jefe" }));
        });
        chip.appendChild(minus);
        al.appendChild(chip);
      }
      wrap.appendChild(al);
    }
    return wrap;
  }

  // ---------- Cierre de semana (guarda la semana para contar strikes) ----------
  let lastSnapshot = null;
  const fmtDay = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
  function renderClose() {
    const box = byId("pg-close");
    if (!box) return;
    box.hidden = !hasAccess();
    if (box.hidden) return;
    const wk = payWeekKey();
    const to = byId("dlog-to")?.value || "";
    const done = STRIKE_HIST.find((w) => String(w.semana) === wk);
    const hasData = !!(lastSnapshot && lastSnapshot.rows.length && (lastSnapshot.total > 0));
    byId("pg-close-week").textContent = wk ? `dom ${fmtDay(wk)} – sáb ${fmtDay(to)}` : "";
    const btn = byId("pg-close-btn");
    const reopen = byId("pg-reopen-btn");
    const info = byId("pg-close-info");
    reopen.hidden = !done;
    btn.disabled = !hasData || !wk;
    btn.textContent = done ? "Volver a guardar" : "Cerrar semana";
    if (done) {
      const n = (done.datos?.rows || []).filter((r) => r.strike).length;
      const when = done.created_at ? new Date(done.created_at).toLocaleString("es-GT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
      info.textContent = `✅ Cerrada${when ? ` el ${when}` : ""}${done.cerrada_por ? ` por ${done.cerrada_por}` : ""} · ${n} ${n === 1 ? "strike" : "strikes"} guardados.`;
    } else if (!hasData) {
      info.textContent = "Carga las facturas y los kits de la semana para poder cerrarla.";
    } else {
      info.textContent = "Cuando hayas pagado, ciérrala: así se guardan los strikes para las próximas semanas.";
    }
  }

  byId("pg-close-btn")?.addEventListener("click", async () => {
    const wk = payWeekKey();
    const to = byId("dlog-to")?.value || "";
    if (!wk || !lastSnapshot) return;
    const strikes = lastSnapshot.rows.filter((r) => r.strike).map((r) => `${r.name} (${strikeLabel(strikesBefore(r.id, r.name, wk) + 1)})`);
    const msg = `¿Cerrar la semana del domingo ${fmtDay(wk)} al sábado ${fmtDay(to)}?\n\n` +
      (strikes.length ? `Strikes que se guardan:\n• ${strikes.join("\n• ")}` : "Nadie recibe strike esta semana.");
    if (!confirm(msg)) return;
    const btn = byId("pg-close-btn");
    btn.disabled = true;
    try {
      await cvCloud.req("/rest/v1/pagos_semanas?on_conflict=semana", {
        method: "POST",
        auth: true,
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: { semana: wk, desde: wk, hasta: to || wk, datos: lastSnapshot, cerrada_por: AUTH.name || "", created_at: new Date().toISOString() },
      });
      await loadStrikeHist();
      refresh();
    } catch (e) {
      alert(`No se pudo cerrar la semana: ${e.message}\n\n¿Ejecutaste el SQL de la tabla pagos_semanas?`);
    } finally {
      renderClose();
    }
  });

  byId("pg-reopen-btn")?.addEventListener("click", async () => {
    const wk = payWeekKey();
    if (!wk || !confirm(`¿Reabrir la semana del ${fmtDay(wk)}? Se borran sus strikes guardados.`)) return;
    try {
      await cvCloud.req(`/rest/v1/pagos_semanas?semana=eq.${wk}`, { method: "DELETE", auth: true });
      await loadStrikeHist();
      refresh();
    } catch (e) {
      alert(`No se pudo reabrir: ${e.message}`);
    } finally {
      renderClose();
    }
  });
  for (const id of ["dlog-from", "dlog-to"]) byId(id)?.addEventListener("change", () => refresh());

  // ---------- Ascensos y descensos ----------
  let promo = { up: [], down: [], cand: [], week: "" };
  // Quien ya cambio de rango con "Aplicar" no vuelve a salir hasta otra semana (otro log).
  let promoApplied = new Set();
  let promoLogKey = "";

  function weekRange() {
    const ds = [];
    for (const v of Object.values(state.invoices)) {
      const m = String(v.paid_at || v.sent_at || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) ds.push(new Date(+m[3], +m[2] - 1, +m[1]));
    }
    if (!ds.length) return "";
    const f = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const a = new Date(Math.min(...ds)), b = new Date(Math.max(...ds));
    return +a === +b ? `Semana del ${f(a)}` : `Semana del ${f(a)} al ${f(b)}`;
  }

  // El Jefe Aguila decide: nada sale marcado; marca los que si van (tras revisar
  // ausencias y comportamiento IC) y puede añadir ascensos/descensos a mano.
  let promoSel = new Map(); // "up:nombre" -> { on, motivo }
  let promoManual = []; // [{ kind, id }]
  let promoEmployees = [];
  const selOf = (kind, name) => {
    const k = `${kind}:${normalizeKeySimple(name)}`;
    if (!promoSel.has(k)) promoSel.set(k, { on: false, motivo: "" });
    return promoSel.get(k);
  };

  function renderPromos(rows, employees) {
    const box = byId("pg-promos");
    if (!box) return;
    const hasData = rows.some((r) => r.total > 0);
    box.hidden = !hasData || !AUTH.aguila;
    if (box.hidden) return;
    promoEmployees = employees;
    const billed = new Map(rows.map((r) => [normalizeKeySimple(r.name), r.total]));
    const R = RANK_RULES;
    promo = { up: [], down: [], cand: [], week: weekRange() };
    const logKey = Object.keys(state.invoices).sort().join("|");
    if (logKey !== promoLogKey) {
      promoLogKey = logKey;
      promoApplied = new Set();
      promoSel = new Map();
      promoManual = [];
    }
    const ladderIdx = (e) => PROMO_LADDER.findIndex((x) => normalizeKeySimple(x) === normalizeKeySimple(e.rank));
    const wk = payWeekKey();
    const itemOf = (e, kind, manual = false) => {
      const name = fullName(e);
      const i = ladderIdx(e);
      const total = billed.get(normalizeKeySimple(name)) || 0;
      const sel = selOf(kind, name);
      const ws = weekStrike(wk, e.id, name, total, false);
      const strikes = strikesBefore(e.id, name, wk) + (ws.on ? 1 : 0);
      return {
        id: e.id, name, discord: getEmployeeDiscord(name), from: PROMO_LADDER[i], total, sel, manual, strikes,
        to: PROMO_LADDER[kind === "up" ? i + 1 : i - 1],
        goal: kind === "up" ? R.up[PROMO_LADDER[i]] : R.min,
        get on() { return this.sel.on; },
      };
    };
    const used = new Set();
    for (const e of employees) {
      const name = fullName(e);
      if (isEmployeeNoPay(name) || promoApplied.has(normalizeKeySimple(name))) continue;
      const i = ladderIdx(e);
      if (i < 0) continue; // sin rango, Jefe, Mano Derecha y Jefe Aguila: fuera
      const rank = PROMO_LADDER[i];
      const total = billed.get(normalizeKeySimple(name)) || 0;
      const goal = R.up[rank];
      if (goal && total >= goal) promo.up.push(itemOf(e, "up"));
      else if (i > 0 && total < R.min) promo.down.push(itemOf(e, "down"));
      else if (rank === "Subjefe" && total >= R.candidate) promo.cand.push({ name, from: rank, total });
      else continue;
      used.add(normalizeKeySimple(name));
    }
    promoManual = promoManual.filter((m) => {
      const e = employees.find((x) => String(x.id) === String(m.id));
      if (!e || used.has(normalizeKeySimple(fullName(e))) || promoApplied.has(normalizeKeySimple(fullName(e)))) return false;
      used.add(normalizeKeySimple(fullName(e)));
      promo[m.kind].push(itemOf(e, m.kind, true));
      return true;
    });
    promo.up.sort((a, b) => a.manual - b.manual || b.total - a.total);
    promo.down.sort((a, b) => a.manual - b.manual || a.total - b.total);
    byId("pg-promo-rules").textContent =
      `Mínimo ${fmtMoney(R.min)} · Metas: ${rankLabel("Chalán")} ${fmtMoney(R.up["Chalán"])} · ${rankLabel("Mecánico")} ${fmtMoney(R.up["Mecánico"])} · ${rankLabel("Experimentado")} ${fmtMoney(R.up["Experimentado"])}`;
    const updCounts = () => {
      for (const kind of ["up", "down"]) {
        const items = promo[kind];
        const on = items.filter((x) => x.on).length;
        byId(kind === "up" ? "pg-up-count" : "pg-down-count").textContent = items.length ? `(${on} de ${items.length} marcados)` : "(0)";
      }
    };
    const draw = (listId, items, kind) => {
      const list = byId(listId);
      list.textContent = "";
      if (!items.length) {
        const p = document.createElement("p");
        p.className = "muted pg-promo-empty";
        p.textContent = kind === "up" ? "Nadie alcanza la meta esta semana." : "Todos superan el mínimo. 👏";
        list.appendChild(p);
      }
      for (const it of items) {
        const row = document.createElement("div");
        row.className = "pg-promo-row" + (it.on ? " on" : "") + (it.manual ? " manual" : "");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = it.on;
        cb.title = kind === "up" ? "Marcar: este ascenso sí va" : "Marcar: este descenso sí va";
        cb.addEventListener("change", () => {
          it.sel.on = cb.checked;
          row.classList.toggle("on", cb.checked);
          updCounts();
        });
        const txt = document.createElement("span");
        const top = document.createElement("span");
        top.className = "pg-promo-top";
        const n = document.createElement("b");
        n.textContent = it.name;
        top.appendChild(n);
        if (it.manual) {
          const tag = document.createElement("em");
          tag.className = "pg-promo-tag";
          tag.textContent = "a mano";
          top.appendChild(tag);
        }
        if (it.strikes) {
          const st = document.createElement("span");
          st.className = "pg-strike" + (it.strikes >= STRIKE_MAX ? " max" : "");
          st.textContent = `⚠️ ${it.strikes}/${STRIKE_MAX}`;
          st.title = "Strikes seguidos (contando esta semana)";
          top.appendChild(st);
        }
        const ranks = document.createElement("span");
        ranks.className = "pg-promo-ranks";
        ranks.textContent = `${rankLabel(it.from)} → ${rankLabel(it.to)}`;
        const meta = document.createElement("small");
        meta.textContent = it.manual
          ? `${fmtMoney(it.total)} facturados · decisión del jefe`
          : `${fmtMoney(it.total)} facturados · ${kind === "up" ? "meta" : "mínimo"} ${fmtMoney(it.goal)}`;
        const why = document.createElement("input");
        why.className = "text-input pg-promo-why";
        why.maxLength = 140;
        why.placeholder = it.manual
          ? kind === "up" ? "Motivo (p. ej. buen comportamiento IC)" : "Motivo (p. ej. mal comportamiento IC)"
          : "Motivo (opcional, sale en Discord)";
        why.value = it.sel.motivo;
        why.addEventListener("input", () => (it.sel.motivo = why.value));
        txt.append(top, ranks, meta, why);
        row.append(cb, txt);
        if (it.manual) {
          const x = document.createElement("button");
          x.type = "button";
          x.className = "pg-chip-btn";
          x.textContent = "✕";
          x.title = "Quitar de la lista";
          x.addEventListener("click", () => {
            promoManual = promoManual.filter((m) => String(m.id) !== String(it.id));
            promoSel.delete(`${kind}:${normalizeKeySimple(it.name)}`);
            refresh();
          });
          row.appendChild(x);
        }
        list.appendChild(row);
      }
      if (kind === "up") {
        for (const c of promo.cand) {
          const p = document.createElement("p");
          p.className = "pg-promo-cand";
          p.textContent = `⭐ ${c.name} (${rankLabel(c.from)}) es candidato a ${rankLabel("Jefe")}: ${fmtMoney(c.total)} facturados. Lo decide el Jefe Aguila.`;
          list.appendChild(p);
        }
      }
    };
    draw("pg-up-list", promo.up, "up");
    draw("pg-down-list", promo.down, "down");
    updCounts();
    byId("pg-rules-edit").hidden = !AUTH.aguila;

    // Añadir a mano: cualquiera de la escalera que no este ya en las listas.
    const sel = byId("pg-add-emp");
    const dir = byId("pg-add-dir");
    if (sel && dir) {
      const prev = sel.value;
      sel.textContent = "";
      sel.appendChild(new Option("Elige empleado…", ""));
      for (const e of [...employees].sort(byRankThenName)) {
        const i = ladderIdx(e);
        const name = fullName(e);
        if (i < 0 || isEmployeeNoPay(name) || used.has(normalizeKeySimple(name)) || promoApplied.has(normalizeKeySimple(name))) continue;
        sel.appendChild(new Option(`${name} (${rankLabel(e.rank)})`, String(e.id)));
      }
      if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    }
  }

  byId("pg-add-btn")?.addEventListener("click", () => {
    const id = byId("pg-add-emp").value;
    const kind = byId("pg-add-dir").value;
    if (!id) return alert("Elige a quién.");
    const e = promoEmployees.find((x) => String(x.id) === id);
    if (!e) return;
    const i = PROMO_LADDER.findIndex((x) => normalizeKeySimple(x) === normalizeKeySimple(e.rank));
    if (kind === "up" && i >= PROMO_LADDER.length - 1) return alert(`${fullName(e)} ya es ${rankLabel(e.rank)}: el siguiente rango lo das tú en Gestión de empleados.`);
    if (kind === "down" && i <= 0) return alert(`${fullName(e)} ya está en el rango más bajo.`);
    const name = fullName(e);
    const s = selOf(kind, name);
    s.on = true;
    s.motivo = byId("pg-add-why").value.trim();
    promoManual.push({ kind, id });
    byId("pg-add-why").value = "";
    byId("pg-add-emp").value = "";
    refresh();
  });

  function promoText(kind) {
    const items = (kind === "up" ? promo.up : promo.down).filter((x) => x.on);
    if (!items.length) return "";
    const why = (it) => {
      const m = String(it.sel?.motivo || "").trim().replace(/[.\s]+$/, "");
      if (!m) return "";
      return /^(por|tras|al|debido|gracias|para)\b/i.test(m) ? `${m}.` : `por ${m.charAt(0).toLowerCase()}${m.slice(1)}.`;
    };
    const who = (it) => (it.discord ? `<@${it.discord}>` : `**${it.name}**`);
    const role = (r) => (RANK_ROLE_IDS[r] ? `<@&${RANK_ROLE_IDS[r]}>` : `**${rankLabel(r)}**`);
    const lines = items.map((it, i) =>
      kind === "up"
        ? `⬆️ ${who(it)} pasa de ${role(it.from)} a ${role(it.to)} ${why(it) || UP_REASONS[i % UP_REASONS.length]}`
        : `⬇️ ${who(it)} pasa de ${role(it.from)} a ${role(it.to)} ${why(it) || DOWN_REASON}`
    );
    const week = promo.week ? `${promo.week} · ` : "";
    return kind === "up"
      ? `@silent\n# 📈 ASCENSOS DE LA SEMANA\n-# ${week}Aguila Motors 🦅\n\n${lines.join("\n")}\n\n-# ¡Enhorabuena y a seguir así! 🔥`
      : `@silent\n# 📉 DESCENSOS DE LA SEMANA\n-# ${week}Aguila Motors 🦅\n\n${lines.join("\n")}\n\n-# Cada semana es una nueva oportunidad para volver a subir. 💪`;
  }

  const promoStatus = (t) => {
    const s = byId("pg-promo-status");
    if (!s) return;
    s.textContent = t;
    setTimeout(() => (s.textContent = ""), 5000);
  };
  for (const kind of ["up", "down"]) {
    byId(kind === "up" ? "pg-copy-up" : "pg-copy-down")?.addEventListener("click", async () => {
      const text = promoText(kind);
      if (!text) return alert(kind === "up" ? "No hay ascensos marcados." : "No hay descensos marcados.");
      const ok = await copyText(text);
      if (!ok) openCopyFallback(text);
      else promoStatus(`✔ Copiados los ${kind === "up" ? "ascensos" : "descensos"}. Pégalos en su canal de Discord.`);
    });
  }
  byId("pg-apply-ranks")?.addEventListener("click", async () => {
    const items = [...promo.up, ...promo.down].filter((x) => x.on);
    if (!items.length) return alert("No hay cambios marcados.");
    const list = items.map((x) => `• ${x.name}: ${rankLabel(x.from)} → ${rankLabel(x.to)}`).join("\n");
    if (!confirm(`¿Cambiar estos rangos en Gestión de empleados?\n\n${list}`)) return;
    const btn = byId("pg-apply-ranks");
    btn.disabled = true;
    let done = 0;
    try {
      for (const it of items) {
        await updateEmployee(it.id, { rank: it.to }, "jefe");
        promoApplied.add(normalizeKeySimple(it.name));
        done++;
      }
      promoStatus(`✔ ${done} ${done === 1 ? "rango actualizado" : "rangos actualizados"} en Gestión de empleados.`);
    } catch (err) {
      alert(`Se aplicaron ${done} de ${items.length}. Error: ${err.message || err}`);
    } finally {
      btn.disabled = false;
      await refresh();
    }
  });
  byId("pg-rules-edit")?.addEventListener("click", () => {
    const box = byId("pg-rules-box");
    box.hidden = !box.hidden;
    byId("rr-min").value = RANK_RULES.min;
    byId("rr-chalan").value = RANK_RULES.up["Chalán"];
    byId("rr-mecanico").value = RANK_RULES.up["Mecánico"];
    byId("rr-exp").value = RANK_RULES.up["Experimentado"];
    byId("rr-cand").value = RANK_RULES.candidate;
  });
  byId("rr-save")?.addEventListener("click", async () => {
    const n = (id) => Math.max(0, Math.round(Number(byId(id).value) || 0));
    const rules = { min: n("rr-min"), up: { "Chalán": n("rr-chalan"), "Mecánico": n("rr-mecanico"), "Experimentado": n("rr-exp") }, candidate: n("rr-cand") };
    try {
      await cvCloud.upsert("app_settings", [{ key: "rank_rules", value: rules }], "key");
      RANK_RULES = rules;
      byId("pg-rules-box").hidden = true;
      promoStatus("✔ Umbrales guardados.");
      await refresh();
    } catch (err) {
      alert(`No se pudieron guardar: ${err.message || err}`);
    }
  });

  async function refresh() {
    const invSummary = {
      count: Object.keys(state.invoices).length,
      total: Object.values(state.invoices).reduce((a, v) => a + (v.amount || 0), 0),
      paid_count: Object.values(state.invoices).filter((v) => v.paid_at).length,
      paid_total: Object.values(state.invoices).filter((v) => v.paid_at).reduce((a, v) => a + (v.amount || 0), 0),
      pending_count: Object.values(state.invoices).filter((v) => !v.paid_at).length,
      pending_total: Object.values(state.invoices).filter((v) => !v.paid_at).reduce((a, v) => a + (v.amount || 0), 0),
    };
    const kitPrice = getKitPrice();
    const kitsQty = state.kitsSales.reduce((a, s) => a + (s.qty || 0), 0);
    const kitsSummary = { count: state.kitsSales.length, qty: kitsQty, total: kitsQty * kitPrice };

    refs.invLine1.textContent = `Total: ${invSummary.count} | ${fmtMoney(invSummary.total)}`;
    refs.kitsLine1.textContent = `Ventas: ${kitsSummary.count}`;
    refs.kitsLine2.textContent = `Unidades: ${kitsSummary.qty}`;
    const selfQty = Object.values(state.kitsSelfBySeller).reduce((a, n) => a + n, 0);
    if (refs.kitsSelf) {
      refs.kitsSelf.textContent = kitsQty
        ? `A sí mismos: ${selfQty} de ${kitsQty} (${Math.round((selfQty / kitsQty) * 100)}%)`
        : "A sí mismos: -";
      refs.kitsSelf.classList.toggle("warn", kitsQty > 0 && selfQty / kitsQty >= 0.5);
    }
    refs.kitsLine3.textContent = `Total: ${fmtMoney(kitsSummary.total)}`;

    refs.invTable.innerHTML = "";
    const invEntries = Object.entries(state.invByIssuer).sort(sortByValueDescThenName);
    let employees = [];
    try {
      employees = await listEmployees();
    } catch {
      employees = [];
    }
    const rankByName = new Map();
    for (const e of employees) {
      rankByName.set(normalizeKeySimple(fullName(e)), e.rank || "");
    }
    // Quien no cobra sigue apareciendo, pero no suma al Total a Pagar.
    const pendingCell = (name, amount) => (isEmployeeNoPay(name) ? NO_PAY_TEXT : fmtMoney(amount));
    let totalAPagar = 0;
    for (const [name, total] of invEntries) {
      const rank = rankByName.get(normalizeKeySimple(name)) || "";
      const pct = pctForRank(rank);
      const pendientePago = Math.round(total * pct);
      if (!isEmployeeNoPay(name)) totalAPagar += pendientePago;
      const pctText = rank ? (pct ? `${Math.round(pct * 100)}%` : "0% (sin rango)") : "Sin registrar";
      refs.invTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${name}</td>
          <td class="num">${fmtMoney(total)}</td>
          <td class="num">${pctText}</td>
          <td class="num">${pendingCell(name, pendientePago)}</td>
        </tr>`
      );
    }

    refs.salesTable.innerHTML = "";
    const kitEntries = Object.entries(state.kitsBySeller).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    // "9 (75%)": kits que se vendio a si mismo; en naranja si es la mitad o mas.
    const selfCell = (name, qty) => {
      const n = state.kitsSelfBySeller[name] || 0;
      if (!n) return "0";
      const pct = Math.round((n / qty) * 100);
      return `<span class="${pct >= 50 ? "warn" : ""}">${n} (${pct}%)</span>`;
    };
    for (const [name, qty] of kitEntries) {
      const rank = rankByName.get(normalizeKeySimple(name)) || "";
      const pct = pctForRank(rank);
      const kitsValue = qty * kitPrice;
      const pendientePago = Math.round(kitsValue * pct);
      if (!isEmployeeNoPay(name)) totalAPagar += pendientePago;
      const pctText = rank ? (pct ? `${Math.round(pct * 100)}%` : "0% (sin rango)") : "Sin registrar";
      refs.salesTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>${name}</td>
          <td class="num">${qty}</td>
          <td class="num">${selfCell(name, qty)}</td>
          <td class="num">${pctText}</td>
          <td class="num">${pendingCell(name, pendientePago)}</td>
        </tr>`
      );
    }

    const totalGeneral = invSummary.total + kitsSummary.total;
    refs.totalGeneral.textContent = fmtMoney(totalGeneral);
    if (refs.totalAPagar) refs.totalAPagar.textContent = fmtMoney(totalAPagar);
    let footerText = `Facturas: ${invSummary.count} | Kits: ${kitsSummary.count} | Total: ${fmtMoney(totalGeneral)}`;
    if (state.ignoredOtherBusiness > 0) {
      footerText += ` | Ignorados (otro comercio): ${state.ignoredOtherBusiness}`;
    }
    refs.footer.textContent = footerText;
    refs.loaded.textContent = invSummary.count || kitsSummary.count ? "Datos cargados" : "Sin datos";
    renderRanking({ employees, kitPrice, invSummary, kitsSummary, totalAPagar });
    renderClose();
    syncMobilePagos(invSummary, kitsSummary);
  }

  // ---------- Movil (v98): "Texto de Discord" plegado y barra fija con el total ----------
  let srcOpen = false;
  function syncMobilePagos(invSummary, kitsSummary) {
    const loaded = invSummary.count > 0 || kitsSummary.qty > 0;
    const sum = byId("pg-src-sum");
    const card = byId("pg-src");
    if (sum && card) {
      sum.hidden = !loaded;
      card.classList.toggle("is-folded", loaded && !srcOpen);
      byId("pg-src-sum-txt").textContent = `✅ ${invSummary.count} ${invSummary.count === 1 ? "factura" : "facturas"} · ${kitsSummary.qty} ${kitsSummary.qty === 1 ? "kit" : "kits"} cargados`;
      byId("pg-src-toggle").textContent = srcOpen ? "Plegar" : "Ver / cambiar";
    }
    const bar = byId("m-pay-bar");
    if (bar) {
      bar.hidden = !loaded;
      byId("m-pay-total").textContent = byId("conta-total-a-pagar")?.textContent || "$ 0";
      byId("m-pay-label").textContent = byId("pg-total-label")?.textContent || "Total a pagar";
    }
  }
  byId("pg-src-toggle")?.addEventListener("click", () => {
    srcOpen = !srcOpen;
    refresh();
  });
  byId("pg-src-paste")?.addEventListener("click", () => byId("conta-paste")?.click());
  byId("m-pay-copy")?.addEventListener("click", () => byId("pg-copy-discord")?.click());
  byId("m-pay-jump")?.addEventListener("click", () => document.querySelector("#tab-conta .pg-total")?.scrollIntoView({ block: "center", behavior: "smooth" }));

  function clearState() {
    state.invoices = {};
    state.kitsSales = [];
    state.invByIssuer = {};
    state.invByIssuerPaid = {};
    state.invByIssuerPending = {};
    state.kitsBySeller = {};
    state.kitsSelfBySeller = {};
    state.ignoredOtherBusiness = 0;
    refresh();
  }

  async function processCurrent() {
    const text = refs.input.value.trim();
    if (!text) {
      alert("Pega el texto antes de procesar.");
      return;
    }
    const out = processText(text);
    state.invoices = out.invoices;
    state.kitsSales = out.kitsSales;
    state.invByIssuer = out.invByIssuer;
    state.invByIssuerPaid = out.invByIssuerPaid;
    state.invByIssuerPending = out.invByIssuerPending;
    state.kitsBySeller = out.kitsBySeller;
    state.kitsSelfBySeller = out.kitsSelfBySeller || {};
    state.ignoredOtherBusiness = out.ignoredOtherBusiness || 0;
    refresh();
  }

  byId("conta-process").addEventListener("click", processCurrent);
  byId("conta-clear").addEventListener("click", () => {
    refs.input.value = "";
    delete refs.input.dataset.discord;
    clearState();
  });
  setupDiscordLog(refs, processCurrent, () => Object.keys(state.invoices || {}).length);
  setupKitsCopier();
  refs.kitPrice?.addEventListener("change", () => {
    setKitPrice(refs.kitPrice.value);
    refs.kitPrice.value = getKitPrice();
    refresh();
  });
  byId("conta-paste").addEventListener("click", async () => {
    try {
      const clip = await navigator.clipboard.readText();
      // Si ya se trajeron las facturas del Discord, lo pegado (los kits) se
      // añade debajo en vez de reemplazarlas.
      const keep = refs.input.dataset.discord === "1" ? refs.input.value.trim() : "";
      refs.input.value = keep ? `${keep}\n\n${clip}` : clip;
      await processCurrent();
    } catch {
      alert("No se pudo leer el portapapeles.");
    }
  });
  byId("conta-export").addEventListener("click", () => {
    if (!Object.keys(state.invoices).length && !state.kitsSales.length) {
      alert("No hay datos para exportar.");
      return;
    }
    const sortInvoices = (a, b) => {
      const an = Number(a.invoice_id);
      const bn = Number(b.invoice_id);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return String(a.invoice_id).localeCompare(String(b.invoice_id), "es");
    };
    const invoicesRows = Object.values(state.invoices)
      .sort(sortInvoices)
      .map((v) => [
        v.invoice_id,
        v.issuer || "",
        v.recipient || "",
        v.concept || "",
        v.amount ?? "",
        v.sent_at || "",
        v.paid_at || "",
        v.paid_at ? "PAGADA" : "PENDIENTE",
        v.method || "facturas",
      ]);
    const kitsRows = state.kitsSales.map((s) => [s.seller || "", s.buyer || "", s.qty ?? "", s.ts || ""]);
    downloadCsv(
      "facturas_resultado.csv",
      ["invoice_id", "issuer", "recipient", "concept", "amount", "sent_at", "paid_at", "status", "metodo"],
      invoicesRows
    );
    downloadCsv("ventas_kits.csv", ["seller", "buyer", "qty", "timestamp"], kitsRows);
  });

  setupEmployeesModal(state, refresh);
  clearState();
}

function setupEmployeesModal(state, refreshPagos) {
  const adminModal = byId("employees-admin-modal");

  // La ventana "Totales empleados" se quito en v97: los totales se arman aqui
  // solo para "Copiar para Discord".
  let totalsRows = [];

  function sumByNormalizedName(map, name) {
    const target = normalizeKeySimple(name);
    let sum = 0;
    for (const [k, v] of Object.entries(map || {})) {
      if (normalizeKeySimple(k) === target) sum += Number(v || 0);
    }
    return sum;
  }

  async function buildTotalsRows() {
    const employees = await listEmployees();
    const kitPrice = getKitPrice();
    totalsRows = employees.map((e) => {
      const name = fullName(e);
      const paid = sumByNormalizedName(state.invByIssuerPaid, name);
      const kitsUnits = sumByNormalizedName(state.kitsBySeller, name);
      const kitsSelf = sumByNormalizedName(state.kitsSelfBySeller, name);
      const kitsValue = kitsUnits * kitPrice;
      const gross = paid + kitsValue;
      const pct = pctForRank(e.rank);
      const payout = Math.round(gross * pct);
      return { id: e.id, name, rank: e.rank || "", pct, gross, payout, discord: getEmployeeDiscord(name), iban: getEmployeeIban(name), noPay: isEmployeeNoPay(name), kitsUnits, kitsSelf };
    });
    // Empleado de la Semana: se decide aqui (con lo que cobra sin bono) y se le suma el bono.
    const winners = weekWinners(totalsRows);
    const hasData = totalsRows.some((r) => r.gross > 0);
    for (const r of totalsRows) {
      const ws = weekStrike(payWeekKey(), r.id, r.name, r.gross, r.noPay);
      r.warn = hasData && ws.on;
      r.strikeWhy = ws.reason;
      r.strikeN = r.warn ? strikesBefore(r.id, r.name, payWeekKey()) + 1 : 0;
      r.base = r.payout;
      r.week = winners.has(r);
      r.bonus = r.week ? WEEK_BONUS : 0;
      r.payout = r.base + r.bonus;
    }
    // Mismo orden que la plantilla (por rango): asi sale tambien al copiar para las pagas.
    totalsRows.sort((a, b) => rankOrder(b.rank) - rankOrder(a.rank) || a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }

  // Quien mas cobra en la lista es el empleado de la semana (si hay empate, todos).
  // El Jefe Aguila (100 %) no compite: si no, lo ganaria siempre.
  // Se decide al armar los totales (ver weekWinners): quitar a alguien de la lista no cambia al ganador.
  function isEmployeeOfWeek(row) {
    return !!row.week;
  }

  // "Nombre (Rango) <@ID>": el nombre de rol se mantiene y, si tiene Discord, se le etiqueta.
  function labelForCopy(row) {
    let label = row.rank ? `${row.name} (${rankLabel(row.rank)})` : row.name;
    if (row.discord) label += ` <@${row.discord}>`;
    return label;
  }

  const ibanForCopy = (row) => (row.iban ? `IBAN ${row.iban}` : IBAN_PENDING_TEXT);

  // Suma solo a quien sigue en la lista y cobra (los "No cobra" no cuentan).
  function bankTotalOf(rows) {
    return rows.reduce((acc, r) => acc + (r.noPay ? 0 : r.payout), 0);
  }

  // Texto para el canal de pagas (el mismo de "Copiar todo").
  function discordPayText(rows = totalsRows) {
    const lines = rows
      .map((r) => {
        let line = r.noPay
          ? `* ${labelForCopy(r)}: ${NO_PAY_TEXT}`
          : `* ${labelForCopy(r)}: ${fmtMoneyPlain(r.payout)} · ${ibanForCopy(r)}`;
        if (isEmployeeOfWeek(r)) line += ` ${EMPLOYEE_OF_WEEK_TAG}`;
        if (r.warn) line += ` ${strikeText(r.strikeN, r.gross, r.strikeWhy)}`;
        if (r.bonus && !r.noPay) line += `\n  ↳ 🏆 Incluye bono de Empleado de la Semana: ${fmtMoneyPlain(r.bonus)}`;
        return line;
      })
      .join("\n");
    const paying = rows.filter((r) => !r.noPay && r.payout > 0).length;
    const bonusN = rows.filter((r) => r.bonus && !r.noPay).length;
    const bonusTxt = bonusN ? ` · incluye Bono por Empleado de la Semana de ${fmtBonus(WEEK_BONUS)}${bonusN > 1 ? ` (x${bonusN})` : ""}` : "";
    const total = `**Total a retirar de la cuenta de la empresa: ${fmtMoney(bankTotalOf(rows))}** (${paying} ${paying === 1 ? "empleado" : "empleados"} a pagar${bonusTxt})`;
    return `${lines}\n\n${total}`;
  }

  // Boton del panel de Pagos: arma los totales sin abrir la ventana y copia.
  byId("pg-copy-discord")?.addEventListener("click", async () => {
    const status = byId("pg-copy-status");
    try {
      await buildTotalsRows();
    } catch {
      alert("No se pudieron cargar los empleados.");
      return;
    }
    if (!totalsRows.length) {
      alert("No hay empleados en la lista. Entra en 'Gestión de empleados' para añadirlos.");
      return;
    }
    // Los marcados como "No cobra" no salen en el mensaje de pagas.
    const rows = totalsRows.filter((r) => !r.noPay);
    const skipped = totalsRows.length - rows.length;
    if (!rows.length) {
      alert("Todos los empleados están marcados como «No cobra»: no hay nada que copiar.");
      return;
    }
    const text = discordPayText(rows);
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    if (status) {
      status.textContent = ok
        ? `✔ Copiado: ${rows.length} empleados · Total a retirar ${fmtMoney(bankTotalOf(rows))}` +
          (skipped ? ` · ${skipped} «No cobra» fuera de la lista` : "") +
          ". Pégalo en el canal de pagas."
        : "";
      setTimeout(() => (status.textContent = ""), 4000);
    }
  });

  function openAdminModal() {
    adminModal.showModal();
    adminModal.dispatchEvent(new Event("aguila-open"));
  }

  byId("conta-manage-employees").addEventListener("click", openAdminModal);

  setupEmployeesAdminModal({
    onChanged: async () => {
      // Rango, Discord, IBAN o "No cobra" cambian lo que muestra Pagos.
      await refreshPagos?.();
    },
  });
}
