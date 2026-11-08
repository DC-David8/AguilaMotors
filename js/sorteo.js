// Aguila Motors · Sorteo.
// (sorteo.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Modulo de Almacen: retirado en la version 21 porque el log copiado de Discord
// no trae bien quien mueve el almacen. Esta guardado completo en la rama
// "idea-almacen" del repositorio (ver README → Ideas guardadas).
// ============================================================================

// ============================================================================
// Modulo de Sorteo
// ----------------------------------------------------------------------------
// Se pegan las facturas del datafono. Una factura vale para el sorteo si:
//   1) tiene nombre del comprador (Cliente), 2) el concepto lleva "sorteo" y
//   3) no es venta a si mismo (Cliente distinto del Cobrador).
// Los boletos salen del monto (1 cada X $) o 1 por factura. Al sortear el primer
// premio se "sella" la lista (huella SHA-256) y cada premio sale al azar segun
// los boletos de cada persona. Todo queda guardado en el navegador.
// ============================================================================
const SORTEO_STORAGE_KEY = "aguila_sorteo_v1";
const SORTEO_ICONS = ["💎", "⭐", "🚗", "🏍️", "🚛", "✈️", "🔧", "🎨", "🚀", "🌈", "🎁", "💰", "🛞", "🏆"];
const SORTEO_DEFAULT_PRIZES = [
  { icon: "💎", name: "Coche VIP" },
  { icon: "⭐", name: "Coche Prime" },
  { icon: "🚗", name: "Coche del concesionario" },
];

function sorteoEmptyState() {
  return {
    text: "",
    mode: "amount",
    price: 1000,
    from: "",
    to: "",
    noStaff: false,
    oneEach: true,
    prizes: SORTEO_DEFAULT_PRIZES.map((p) => ({ ...p, winner: null })),
    seal: null, // { hash, tickets, people, at }
  };
}

function sorteoLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(SORTEO_STORAGE_KEY) || "null");
    if (raw && Array.isArray(raw.prizes)) return { ...sorteoEmptyState(), ...raw };
  } catch {
    // sin almacenamiento
  }
  return sorteoEmptyState();
}

function sorteoSave(st) {
  try {
    localStorage.setItem(SORTEO_STORAGE_KEY, JSON.stringify(st));
  } catch {
    // sin almacenamiento
  }
}

// "13/10/2026 19:02" o "2026-10-13 01:17:30" -> "2026-10-13" (o "" si no hay fecha)
function sorteoIsoDay(text) {
  const t = String(text || "");
  let m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

// Numero al azar seguro en [0, n)
function sorteoRandomInt(n) {
  try {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

function setupSorteo() {
  const root = byId("tab-sorteo");
  if (!root) return;
  let st = sorteoLoad();
  let staffKeys = new Set();
  let result = { valid: [], bad: [], people: [] };
  let lastWinnerIdx = -1;

  const $ = (id) => byId(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const initials = (name) => String(name).split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace(".", ",") : "0") + " %";
  const shortHash = (h) => (h ? `${h.slice(0, 4)}…${h.slice(-4)}` : "");

  // ---------- subpestanas ----------
  function showPane(id) {
    root.querySelectorAll(".sx-subtab").forEach((b) => b.classList.toggle("is-active", b.dataset.sx === id));
    root.querySelectorAll(".sx-pane").forEach((p) => p.classList.toggle("is-active", p.id === id));
  }
  root.querySelectorAll(".sx-subtab").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.sx)));

  // ---------- ajustes ----------
  $("sx-input").value = st.text || "";
  $("sx-mode").value = st.mode;
  $("sx-price").value = st.price;
  $("sx-from").value = st.from;
  $("sx-to").value = st.to;
  $("sx-no-staff").checked = !!st.noStaff;
  $("sx-one-each").checked = st.oneEach !== false;
  for (const ic of SORTEO_ICONS) $("sx-new-icon").appendChild(new Option(ic, ic));

  function readSettings() {
    st.mode = $("sx-mode").value;
    st.price = Math.max(1, Math.floor(Number($("sx-price").value) || 1000));
    st.from = $("sx-from").value;
    st.to = $("sx-to").value;
    st.noStaff = $("sx-no-staff").checked;
    st.oneEach = $("sx-one-each").checked;
    $("sx-price-wrap").hidden = st.mode !== "amount";
  }

  // ---------- reglas ----------
  function evaluate() {
    readSettings();
    const valid = [];
    const bad = [];
    if (st.text.trim()) {
      const out = processText(st.text);
      for (const inv of Object.values(out.invoices)) {
        if (inv.amount == null) continue;
        if (inv.method !== "datafono" && !inv.paid_at) continue; // factura antigua sin pagar
        const buyer = String(inv.recipient || "").trim();
        const seller = String(inv.issuer || "").trim();
        const concept = String(inv.concept || "");
        const day = sorteoIsoDay(inv.paid_at || inv.sent_at);
        const base = { amount: inv.amount, buyer, seller, concept, when: inv.paid_at && inv.paid_at !== "OK" ? inv.paid_at : inv.sent_at || "" };
        let reason = "";
        if (!buyer) reason = "Sin comprador";
        else if (!normalizeKeySimple(concept).includes("sorteo")) reason = "Sin «sorteo»";
        else if (seller && normalizeKeySimple(buyer) === normalizeKeySimple(seller)) reason = "Venta a sí mismo";
        else if (st.noStaff && staffKeys.has(normalizeKeySimple(buyer))) reason = "Empleado del taller";
        else if ((st.from && day && day < st.from) || (st.to && day && day > st.to)) reason = "Fuera de fecha";
        const tickets = st.mode === "amount" ? Math.floor(inv.amount / st.price) : 1;
        if (!reason && tickets < 1) reason = "Menos de 1 boleto";
        if (reason) bad.push({ ...base, reason });
        else valid.push({ ...base, tickets });
      }
    }
    const map = new Map();
    for (const v of valid) {
      const key = normalizeKeySimple(v.buyer);
      if (!map.has(key)) map.set(key, { key, name: v.buyer, tickets: 0, invoices: 0, amount: 0 });
      const p = map.get(key);
      p.tickets += v.tickets;
      p.invoices += 1;
      p.amount += v.amount;
    }
    const people = [...map.values()].sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name, "es"));
    result = { valid, bad, people };
  }

  // ---------- paso 1 ----------
  function renderParticipants() {
    const { valid, bad, people } = result;
    const total = people.reduce((a, p) => a + p.tickets, 0);
    $("sx-k-valid").textContent = String(valid.length);
    $("sx-k-tickets").textContent = String(total);
    $("sx-k-people").textContent = String(people.length);
    $("sx-k-bad").textContent = String(bad.length);
    $("sx-rule-note").textContent = st.mode === "amount" ? `1 boleto cada ${fmtMoney(st.price)}` : "1 boleto por factura";

    const list = $("sx-people");
    list.textContent = "";
    if (!people.length) {
      list.appendChild(el("p", "muted pg-empty", st.text.trim() ? "Ninguna factura cumple las reglas." : "Pega las facturas del sorteo y pulsa Procesar."));
    }
    const max = Math.max(1, ...people.map((p) => p.tickets));
    for (const p of people) {
      const row = el("div", "sx-row");
      const mid = el("div", "sx-mid");
      mid.appendChild(el("b", "", p.name));
      const bar = el("div", "pg-bar");
      const fill = el("i");
      fill.style.width = `${Math.max(3, Math.round((p.tickets / max) * 100))}%`;
      bar.appendChild(fill);
      mid.append(bar, el("div", "pg-meta", `${p.invoices} ${p.invoices === 1 ? "factura" : "facturas"} · ${fmtMoney(p.amount)}`));
      const tk = el("div", "sx-tk", String(p.tickets));
      tk.appendChild(el("small", "", p.tickets === 1 ? "boleto" : "boletos"));
      row.append(el("div", "pg-av", initials(p.name)), mid, tk, el("div", "sx-pc", pct(p.tickets, total)));
      list.appendChild(row);
    }

    const badEl = $("sx-bad");
    badEl.textContent = "";
    if (!bad.length) badEl.appendChild(el("p", "muted", "Ninguna."));
    const chip = { "Venta a sí mismo": "w-self", "Sin «sorteo»": "w-iban", "Sin comprador": "w-nopay" };
    for (const b of bad) {
      const row = el("div", "sx-bad");
      const txt = el("span");
      txt.append(`${fmtMoney(b.amount)} · Cobrador `, el("b", "", b.seller || "—"), " → Cliente ", el("b", "", b.buyer || "—"));
      if (b.concept) txt.append(` · «${b.concept}»`);
      row.append(txt, el("span", "pg-badge " + (chip[b.reason] || "w-nopay"), b.reason), el("span", "muted", b.when || ""));
      badEl.appendChild(row);
    }
  }

  // ---------- bombo ----------
  function winnersKeys() {
    return new Set(st.prizes.filter((p) => p.winner).map((p) => normalizeKeySimple(p.winner.name)));
  }

  function currentPool() {
    const won = st.oneEach ? winnersKeys() : new Set();
    return result.people.filter((p) => !won.has(p.key));
  }

  function sealText() {
    const lines = result.people.map((p) => `${p.key}:${p.tickets}`).sort().join("|");
    return `${lines}#${st.mode}:${st.price}`;
  }

  // ---------- paso 2 ----------
  function nextPrizeIndex() {
    return st.prizes.findIndex((p) => !p.winner);
  }

  function renderPrizes() {
    const box = $("sx-prizes");
    box.textContent = "";
    const done = st.prizes.filter((p) => p.winner).length;
    const next = nextPrizeIndex();
    st.prizes.forEach((p, i) => {
      const row = el("div", "sx-pz" + (p.winner ? " done" : "") + (i === lastWinnerIdx ? " now" : "") + (i === next && lastWinnerIdx < 0 ? " next" : ""));
      row.appendChild(el("div", "ico", p.icon || "🎁"));
      const mid = el("div", "sx-mid");
      mid.appendChild(el("b", "", p.name));
      mid.appendChild(el("small", "", p.winner ? `${p.winner.tickets} ${p.winner.tickets === 1 ? "boleto" : "boletos"} · ${p.winner.odds}` : i === next ? "Siguiente" : "Pendiente"));
      row.appendChild(mid);
      const who = el("div", "who");
      if (p.winner) {
        who.appendChild(el("b", "", (i === lastWinnerIdx ? "🏆 " : "") + p.winner.name));
      } else if (!st.seal) {
        const tools = el("div", "sx-tools");
        const mk = (label, title, fn) => {
          const b = el("button", "ghost small", label);
          b.type = "button";
          b.title = title;
          b.addEventListener("click", fn);
          return b;
        };
        if (i > 0) tools.appendChild(mk("↑", "Subir", () => { [st.prizes[i - 1], st.prizes[i]] = [st.prizes[i], st.prizes[i - 1]]; sorteoSave(st); renderLive(); }));
        if (i < st.prizes.length - 1) tools.appendChild(mk("↓", "Bajar", () => { [st.prizes[i + 1], st.prizes[i]] = [st.prizes[i], st.prizes[i + 1]]; sorteoSave(st); renderLive(); }));
        tools.appendChild(mk("✕", "Quitar", () => { st.prizes.splice(i, 1); sorteoSave(st); renderLive(); }));
        who.appendChild(tools);
      } else {
        who.appendChild(el("span", "muted", "Pendiente"));
      }
      row.appendChild(who);
      box.appendChild(row);
    });
    if (!st.prizes.length) box.appendChild(el("p", "muted pg-empty", "Añade los premios en el orden en que se sortean."));
    $("sx-prog-text").textContent = `${done} de ${st.prizes.length} premios sorteados`;
    $("sx-prog-bar").style.width = st.prizes.length ? `${Math.round((done / st.prizes.length) * 100)}%` : "0%";
    const pool = currentPool();
    $("sx-pool-text").textContent = `${pool.reduce((a, p) => a + p.tickets, 0)} boletos en el bombo`;
    root.querySelector(".sx-add").hidden = !!st.seal;
  }

  function renderStage() {
    const next = nextPrizeIndex();
    const total = st.prizes.length;
    const last = lastWinnerIdx >= 0 ? st.prizes[lastWinnerIdx] : null;
    const shown = last || (next >= 0 ? st.prizes[next] : null);
    $("sx-stage-tag").textContent = shown ? `PREMIO ${st.prizes.indexOf(shown) + 1} DE ${total}` : total ? "SORTEO TERMINADO" : "SORTEO";
    $("sx-stage-title").textContent = shown ? `${shown.icon || "🎁"} ${shown.name}` : total ? "¡Todos los premios sorteados!" : "Añade los premios";
    const btn = $("sx-draw");
    const pool = currentPool();
    if (next < 0) {
      btn.disabled = true;
      btn.textContent = total ? "✔ Sorteo terminado" : "🎰 Sortear";
    } else {
      btn.disabled = !pool.length;
      btn.textContent = pool.length ? `🎰 Sortear: ${st.prizes[next].icon || "🎁"} ${st.prizes[next].name}` : "No hay participantes en el bombo";
    }
    if (!last) {
      $("sx-odds").textContent = pool.length ? `${pool.length} participantes · ${pool.reduce((a, p) => a + p.tickets, 0)} boletos en el bombo` : "Procesa las facturas en «1 · Participantes».";
      if (!$("sx-reel").children.length) fillReelIdle();
    }
    $("sx-seal").textContent = st.seal
      ? `🔒 Lista sellada · huella ${shortHash(st.seal.hash)} · ${st.seal.tickets} boletos · ${st.seal.people} participantes · ${st.seal.at}`
      : "La lista se sella al sortear el primer premio.";
  }

  function fillReelIdle() {
    const ul = $("sx-reel");
    ul.style.transition = "none";
    ul.style.transform = "translateY(0)";
    ul.textContent = "";
    const names = result.people.map((p) => p.name);
    const show = names.length ? names : ["—", "—", "—"];
    for (let i = 0; i < 3; i++) ul.appendChild(el("li", "", show[i % show.length]));
  }

  function discordText() {
    const done = st.prizes.filter((p) => p.winner);
    const lines = [
      "# 🎉 AGUILA MOTORS · ¡GANADORES DEL SORTEO! 🎉",
      "> *Tu vehículo, nuestra pasión*",
      "",
      "## 🏆 PREMIOS",
    ];
    for (const p of st.prizes) {
      lines.push(p.winner ? `${p.icon || "🎁"} **${p.name}** → **${p.winner.name}**` : `${p.icon || "🎁"} ${p.name} → *por sortear…*`);
    }
    lines.push("");
    if (st.seal) lines.push(`-# 🎟️ ${st.seal.tickets} boletos · ${st.seal.people} participantes · 🔒 Huella de la lista: ${shortHash(st.seal.hash)}`);
    if (done.length) lines.push("Pasad por el taller para recoger vuestro premio 🔧");
    return lines.join("\n");
  }

  function renderDiscord() {
    $("sx-discord").textContent = discordText();
  }

  function renderLive() {
    renderPrizes();
    renderStage();
    renderDiscord();
  }

  function renderAll() {
    evaluate();
    renderParticipants();
    renderLive();
  }

  // ---------- confeti ----------
  function confetti() {
    const box = $("sx-confetti");
    box.textContent = "";
    const cols = ["#f97d02", "#ffb15c", "#ffffff", "#8ce99a", "#ffd29a"];
    for (let i = 0; i < 70; i++) {
      const c = el("i");
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = `${Math.random() * 0.6}s`;
      c.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(c);
    }
    setTimeout(() => (box.textContent = ""), 3800);
  }

  // ---------- sortear ----------
  let spinning = false;
  async function draw() {
    if (spinning) return;
    const next = nextPrizeIndex();
    const pool = currentPool();
    if (next < 0 || !pool.length) return;
    if (!st.seal) {
      const hash = sha256Hex(sealText());
      st.seal = {
        hash,
        tickets: result.people.reduce((a, p) => a + p.tickets, 0),
        people: result.people.length,
        at: fmtStamp(),
      };
    }
    const total = pool.reduce((a, p) => a + p.tickets, 0);
    let r = sorteoRandomInt(total);
    let winner = pool[pool.length - 1];
    for (const p of pool) {
      if (r < p.tickets) {
        winner = p;
        break;
      }
      r -= p.tickets;
    }
    const odds = pct(winner.tickets, total);
    st.prizes[next].winner = { name: winner.name, tickets: winner.tickets, odds, at: fmtStamp() };
    sorteoSave(st);

    // animacion: la lista gira y se para en el ganador
    spinning = true;
    $("sx-draw").disabled = true;
    lastWinnerIdx = -1;
    const prize = st.prizes[next];
    $("sx-stage-tag").textContent = `PREMIO ${next + 1} DE ${st.prizes.length}`;
    $("sx-stage-title").textContent = `${prize.icon || "🎁"} ${prize.name}`;
    $("sx-odds").textContent = "Girando…";
    const ul = $("sx-reel");
    ul.style.transition = "none";
    ul.style.transform = "translateY(0)";
    ul.textContent = "";
    const names = pool.map((p) => p.name);
    // Nombres de relleno; junto al ganador no se repite su nombre para que no confunda.
    const others = names.filter((n) => n !== winner.name);
    const filler = (avoidWinner) => {
      const src = avoidWinner && others.length ? others : names;
      return src[sorteoRandomInt(src.length)];
    };
    const N = 34;
    for (let i = 0; i < N; i++) ul.appendChild(el("li", "", filler(i >= N - 2)));
    const win = el("li", "win", `🏆 ${winner.name}`);
    ul.appendChild(win);
    ul.appendChild(el("li", "", filler(true)));
    ul.appendChild(el("li", "", filler(true)));
    const item = 56;
    void ul.offsetHeight;
    ul.style.transition = "transform 4.2s cubic-bezier(0.12, 0.7, 0.12, 1)";
    ul.style.transform = `translateY(${-(N * item) + item}px)`;
    await new Promise((res) => setTimeout(res, 4300));
    spinning = false;
    lastWinnerIdx = next;
    $("sx-odds").innerHTML = "";
    $("sx-odds").append(`${winner.name} tenía `, el("b", "", `${winner.tickets} ${winner.tickets === 1 ? "boleto" : "boletos"} de ${total}`), ` (${odds})`);
    confetti();
    renderPrizes();
    renderDiscord();
    const nx = nextPrizeIndex();
    const btn = $("sx-draw");
    const poolAfter = currentPool();
    if (nx < 0) {
      btn.disabled = true;
      btn.textContent = "✔ Sorteo terminado";
    } else {
      btn.disabled = !poolAfter.length;
      btn.textContent = poolAfter.length ? `🎰 Sortear: ${st.prizes[nx].icon || "🎁"} ${st.prizes[nx].name}` : "No quedan participantes en el bombo";
    }
    renderStage();
    $("sx-odds").innerHTML = "";
    $("sx-odds").append(`${winner.name} tenía `, el("b", "", `${winner.tickets} ${winner.tickets === 1 ? "boleto" : "boletos"} de ${total}`), ` (${odds})`);
  }

  // ---------- eventos ----------
  async function process() {
    st.text = $("sx-input").value;
    if (st.seal && !window.confirm("El sorteo ya empezó y la lista está sellada. Si cambias las facturas, la lista ya no coincidirá con la huella. ¿Continuar?")) return;
    sorteoSave(st);
    renderAll();
  }
  $("sx-process").addEventListener("click", process);
  $("sx-paste").addEventListener("click", async () => {
    try {
      $("sx-input").value = await navigator.clipboard.readText();
      process();
    } catch {
      alert("No se pudo leer el portapapeles. Pega con Ctrl+V y pulsa Procesar.");
    }
  });
  $("sx-clear").addEventListener("click", () => {
    $("sx-input").value = "";
  });
  ["sx-mode", "sx-price", "sx-from", "sx-to", "sx-no-staff"].forEach((id) =>
    $(id).addEventListener("change", () => {
      readSettings();
      sorteoSave(st);
      renderAll();
    })
  );
  $("sx-one-each").addEventListener("change", () => {
    st.oneEach = $("sx-one-each").checked;
    sorteoSave(st);
    renderLive();
  });
  $("sx-go-live").addEventListener("click", () => showPane("sx-live"));
  $("sx-copy-seal").addEventListener("click", async () => {
    if (!result.people.length) {
      alert("Primero procesa las facturas del sorteo.");
      return;
    }
    const hash = st.seal ? st.seal.hash : sha256Hex(sealText());
    const total = result.people.reduce((a, p) => a + p.tickets, 0);
    const text = [
      "# 🎟️ AGUILA MOTORS · LISTA DEL SORTEO 🎟️",
      `> **${result.people.length}** participantes · **${total}** boletos`,
      "",
      ...result.people.map((p) => `• ${p.name}: ${p.tickets} ${p.tickets === 1 ? "boleto" : "boletos"}`),
      "",
      `🔒 Huella de la lista: \`${hash}\``,
      "-# La lista queda sellada: después del sorteo se puede comprobar que no se cambió.",
    ].join("\n");
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
  });
  $("sx-add-prize").addEventListener("click", () => {
    const name = $("sx-new-name").value.trim();
    if (!name) return;
    st.prizes.push({ icon: $("sx-new-icon").value, name, winner: null });
    $("sx-new-name").value = "";
    sorteoSave(st);
    renderLive();
  });
  $("sx-new-name").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") $("sx-add-prize").click();
  });
  $("sx-draw").addEventListener("click", draw);
  $("sx-reset").addEventListener("click", () => {
    if (!window.confirm("¿Empezar un sorteo nuevo? Se borran los ganadores y el sello (los premios y las facturas se mantienen).")) return;
    st.prizes = st.prizes.map((p) => ({ ...p, winner: null }));
    st.seal = null;
    lastWinnerIdx = -1;
    sorteoSave(st);
    fillReelIdle();
    renderAll();
  });
  $("sx-copy-all").addEventListener("click", async () => {
    const text = discordText();
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    $("sx-copy-status").textContent = ok ? "✔ Anuncio copiado." : "";
  });
  $("sx-copy-last").addEventListener("click", async () => {
    const p = lastWinnerIdx >= 0 ? st.prizes[lastWinnerIdx] : [...st.prizes].reverse().find((x) => x.winner);
    if (!p?.winner) {
      alert("Todavía no ha salido ningún ganador.");
      return;
    }
    const text = `🏆 **${p.name}** → **${p.winner.name}** 🎉\n-# ${p.winner.tickets} ${p.winner.tickets === 1 ? "boleto" : "boletos"} · ${p.winner.odds} · Sorteo Aguila Motors`;
    const ok = await copyText(text);
    if (!ok) openCopyFallback(text);
    $("sx-copy-status").textContent = ok ? `✔ Copiado: ${p.name} → ${p.winner.name}` : "";
  });
  $("sx-export").addEventListener("click", () => {
    const rows = [
      ...st.prizes.map((p, i) => ["Premio", i + 1, `${p.icon} ${p.name}`, p.winner?.name || "", p.winner?.tickets ?? "", p.winner?.odds || "", p.winner?.at || ""]),
      ...result.people.map((p) => ["Participante", "", "", p.name, p.tickets, "", ""]),
      ...result.bad.map((b) => ["Descartada", "", b.reason, b.buyer, "", fmtMoney(b.amount), b.when]),
    ];
    if (st.seal) rows.push(["Huella", "", st.seal.hash, "", st.seal.tickets, "", st.seal.at]);
    downloadCsv("sorteo_aguila_motors.csv", ["Tipo", "N", "Premio / Motivo", "Persona", "Boletos", "Probabilidad / Monto", "Fecha"], rows);
  });

  // empleados del taller (para la opcion de excluirlos)
  listEmployees()
    .then((list) => {
      staffKeys = new Set(list.map((e) => normalizeKeySimple(fullName(e))));
      renderAll();
    })
    .catch(() => renderAll());
  renderAll();
}
