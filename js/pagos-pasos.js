// Aguila Motors · Pagos como cierre guiado (v137).
// Lleva el estado de los 7 pasos (hecho / ahora / pendiente), su resumen y
// qué paso queda abierto. No calcula nada: escucha el aviso "aguila-pagos"
// que lanza js/pagos.js cada vez que cambian los datos de la semana.

function setupPagosPasos() {
  const root = byId("tab-conta");
  const stepsBox = byId("pgs-steps");
  if (!root || !stepsBox) return;
  const steps = [...stepsBox.querySelectorAll(".pgs-step")];
  const el = (n) => steps.find((s) => s.dataset.step === String(n));
  const money = (v) => fmtMoney(Math.round(v || 0));
  const dm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  // Lo que no se puede deducir de los datos (se copió el mensaje, se
  // aplicaron los rangos, se abrieron los anuncios) se apunta por semana en
  // este navegador.
  const FLAGS_KEY = "aguila_pagos_pasos_v1";
  const flags = (() => {
    try {
      return JSON.parse(localStorage.getItem(FLAGS_KEY) || "{}") || {};
    } catch {
      return {};
    }
  })();
  const flag = (wk, k) => !!(wk && flags[wk]?.[k]);
  function setFlag(wk, k) {
    if (!wk || flag(wk, k)) return;
    flags[wk] = { ...(flags[wk] || {}), [k]: true };
    // Solo se guardan las 8 semanas más recientes.
    for (const old of Object.keys(flags).sort().slice(0, -8)) delete flags[old];
    try {
      localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
    } catch {
      // sin almacenamiento: vale para esta sesión
    }
    render();
  }

  let last = { inv: { count: 0, total: 0 }, kits: { qty: 0, total: 0 }, pay: 0, week: "", to: "", snap: null, promo: { up: 0, down: 0 } };
  let current = 0;
  const userToggled = new Set();

  function open(n, on = true) {
    const s = el(n);
    if (!s) return;
    s.querySelector(".pgs-body").hidden = !on;
    s.querySelector(".pgs-head").setAttribute("aria-expanded", String(on));
    s.classList.toggle("is-open", on);
  }

  function render() {
    const d = last;
    const wk = d.week;
    const hasInv = d.inv.count > 0;
    const hasKits = d.kits.qty > 0;
    const closedRow = wk ? STRIKE_HIST.find((w) => String(w.semana) === wk) : null;
    const closed = !!closedRow;
    const rows = d.snap?.rows || [];
    const nStrikes = rows.filter((r) => r.strike).length;
    const nPay = rows.filter((r) => !r.noPay && r.payout > 0).length;
    const aguila = !!AUTH.aguila;
    const nPromo = d.promo.up + d.promo.down;

    // [hecho, resumen]
    const st = {
      1: [hasInv, hasInv ? `${pl(d.inv.count, "factura", "facturas")} del canal · ${money(d.inv.total)}` : "Trae las facturas de la semana desde el Discord del taller"],
      2: [hasKits, hasKits ? `${pl(d.kits.qty, "kit", "kits")} · ${money(d.kits.total)}` : hasInv ? "Pega los kits de la ciudad (si no hubo, sáltalo)" : "Después de las facturas"],
      3: [closed || (hasInv && flag(wk, "revisado")), hasInv ? `${pl(rows.length, "persona", "personas")} · ${pl(nStrikes, "strike", "strikes")} esta semana` : "Ranking y avisos de la semana"],
      4: [closed, closed ? `Cerrada${closedRow.cerrada_por ? ` por ${closedRow.cerrada_por}` : ""}` : hasInv ? "Guarda la semana y sus strikes" : "Cuando estén las facturas y los kits"],
      5: [flag(wk, "pagas"), hasInv ? `${pl(nPay, "empleado cobra", "empleados cobran")} · total ${byId("conta-total-a-pagar")?.textContent || money(d.pay)}` : "Mensaje de pagas y total a retirar de la caja"],
      6: [flag(wk, "rangos") || (hasInv && closed && aguila && nPromo === 0), !aguila ? "Lo revisa el Jefe Aguila" : hasInv ? (nPromo ? `Propuesta: ${pl(d.promo.up, "ascenso", "ascensos")} · ${pl(d.promo.down, "descenso", "descensos")}` : "Sin cambios propuestos esta semana") : "Propuesta de cambios de rango"],
      7: [flag(wk, "anuncio"), "Movimientos de personal, Empleado de la Semana y strikes"],
    };
    // El paso de kits no bloquea: si la semana ya está cerrada se da por hecho.
    if (!st[2][0] && (closed || (hasInv && flag(wk, "revisado")))) st[2] = [true, "Sin kits esta semana"];

    const order = [1, 2, 3, 4, 5, 6, 7].filter((n) => n !== 6 || aguila);
    const next = order.find((n) => !st[n][0]) || 0;
    for (const s of steps) {
      const n = +s.dataset.step;
      const [done, sum] = st[n];
      const now = n === next;
      s.hidden = n === 6 && !aguila;
      s.classList.toggle("is-done", done);
      s.classList.toggle("is-now", now);
      s.querySelector(".pgs-n").textContent = done ? "✓" : String(n);
      s.querySelector("[data-sum]").textContent = sum;
      const chip = s.querySelector("[data-chip]");
      chip.textContent = done ? (n === 4 ? "CERRADA" : "HECHO") : now ? "AHORA" : "PENDIENTE";
      chip.className = `pgs-chip ${done ? "d" : now ? "c" : "p"}`;
      s.querySelectorAll("[data-need-closed]").forEach((w) => (w.hidden = closed || !hasInv));
    }
    // Barra de progreso y cabecera.
    const prog = byId("pgs-prog");
    prog.textContent = "";
    for (const n of order) {
      const i = document.createElement("i");
      i.className = st[n][0] ? "d" : n === next ? "c" : "";
      prog.appendChild(i);
    }
    byId("pgs-week").textContent = wk ? `Semana del ${dm(wk)} al ${dm(d.to)}` : "";
    byId("pgs-lead").textContent = next ? `Sigue los pasos de arriba abajo. Vas por el paso ${order.indexOf(next) + 1} de ${order.length}: ${el(next).querySelector(".pgs-t").textContent}.` : "✅ Semana completa: todos los pasos están hechos.";
    byId("pgs-promo-empty").hidden = !byId("pg-promos").hidden || !aguila;
    const rulesBtn = byId("pg-rules-edit");
    if (rulesBtn) rulesBtn.hidden = !aguila;
    // Al cambiar el paso que toca, se abre ese y se pliegan los que no tocó el usuario.
    if (next !== current) {
      current = next;
      for (const n of order) if (!userToggled.has(n)) open(n, n === next);
    }
  }

  steps.forEach((s) =>
    s.querySelector(".pgs-head").addEventListener("click", () => {
      const n = +s.dataset.step;
      userToggled.add(n);
      open(n, s.querySelector(".pgs-body").hidden);
    })
  );
  byId("pgs-reviewed")?.addEventListener("click", () => {
    if (!(last.inv.count > 0)) return alert("Primero trae las facturas de la semana (paso 1).");
    userToggled.delete(3);
    userToggled.delete(4);
    setFlag(last.week, "revisado");
    open(3, false);
    open(4, true);
  });
  byId("pgs-settings-btn")?.addEventListener("click", () => {
    const box = byId("pgs-settings");
    box.hidden = !box.hidden;
    byId("pgs-settings-btn").setAttribute("aria-expanded", String(!box.hidden));
  });

  document.addEventListener("aguila-pagos", (ev) => {
    last = ev.detail;
    render();
  });
  // Pagas copiadas / rangos aplicados: se ve en sus mensajes de estado.
  const watch = (id, re, k) => {
    const node = byId(id);
    if (node) new MutationObserver(() => re.test(node.textContent) && setFlag(last.week, k)).observe(node, { childList: true, characterData: true, subtree: true });
  };
  watch("pg-copy-status", /Copiado/, "pagas");
  watch("pg-promo-status", /rangos? actualizados?/, "rangos");

  // Paso 7: abre Gestión de empleados → Para Discord con la semana de Pagos.
  const openDiscord = (strikes) => {
    const m = byId("employees-admin-modal");
    if (!m) return;
    m.showModal();
    m.dispatchEvent(new Event("aguila-open"));
    m.dispatchEvent(new CustomEvent("aguila-open-discord", { detail: { week: last.week, strikes } }));
    setFlag(last.week, "anuncio");
  };
  byId("pgs-open-mov")?.addEventListener("click", () => openDiscord(false));
  byId("pgs-open-strikes")?.addEventListener("click", () => openDiscord(true));

  // Móvil: «ver detalle» de la barra del total lleva al paso de Pagas abierto.
  byId("m-pay-jump")?.addEventListener("click", () => {
    userToggled.add(5);
    open(5, true);
  }, true);

  render();
  // Pide a Pagos su estado actual (por si ya había datos antes de engancharse).
  setTimeout(() => byId("dlog-from")?.dispatchEvent(new Event("change")), 0);
}
