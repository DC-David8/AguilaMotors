// Aguila Motors · Caja: productos, ticket y Gestión de Productos.
// (caja.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Caja
// ============================================================================

function setupCaja() {
  const state = {
    cart: {},
    history: [],
    selected: null,
    activeCategory: null,
    emp: false, // 👷 precio de empleado (solo el Jefe Aguila)
  };
  const priceOf = (p) => (state.emp && AUTH.aguila ? empPrice(p) : p?.price || 0);
  const priceByName = (name) => priceOf(getAllProducts().find((p) => p.name === name));

  const productGrid = byId("product-grid");
  const catTabsEl = byId("cat-tabs");
  const catNoteEl = byId("cat-note");
  const ticketBody = byId("ticket-body");
  const ticketTotal = byId("ticket-total");
  const conceptInfo = byId("ticket-concept-info");

  // Lineas del ticket en el orden del catalogo (los nombres que ya no existen, al final).
  function ticketItems() {
    const all = getAllProducts();
    const items = [];
    const seen = new Set();
    for (const p of all) {
      const row = state.cart[p.name];
      if (row?.qty > 0) {
        items.push({ name: p.name, qty: row.qty, price: row.price, short: p.short || p.name, group: p.group || "" });
        seen.add(p.name);
      }
    }
    for (const [name, row] of Object.entries(state.cart)) {
      if (!seen.has(name) && row?.qty > 0) items.push({ name, qty: row.qty, price: row.price, short: name, group: "" });
    }
    return items;
  }

  const empTag = () => (state.emp ? `${EMP_CONCEPT_TAG} ` : "");
  const fullConcept = (items) => empTag() + items.map((it) => `x${it.qty} ${it.name}`).join(" ");

  // "2xRued+Turbo GA, Rep T": cada grupo (gama, taller, grua) se escribe una vez.
  function shortConcept(items) {
    const groups = new Map();
    for (const it of items) {
      const part = it.qty > 1 ? `${it.qty}x${it.short}` : it.short;
      if (!groups.has(it.group)) groups.set(it.group, []);
      groups.get(it.group).push(part);
    }
    return empTag() + [...groups.entries()].map(([g, parts]) => parts.join("+") + (g ? ` ${g}` : "")).join(", ");
  }

  // Si ni abreviado cabe, se reparte en varios cobros que si caben.
  function splitIntoCharges(items) {
    const charges = [];
    let current = [];
    for (const it of items) {
      for (let n = 0; n < it.qty; n++) {
        const unit = { ...it, qty: 1 };
        const tryItems = mergeQty([...current, unit]);
        if (current.length && shortConcept(tryItems).length > CONCEPT_MAX) {
          charges.push(mergeQty(current));
          current = [unit];
        } else {
          current.push(unit);
        }
      }
    }
    if (current.length) charges.push(mergeQty(current));
    return charges.map((list) => ({
      concept: shortConcept(list),
      total: list.reduce((a, it) => a + it.price * it.qty, 0),
    }));
  }

  function mergeQty(list) {
    const out = [];
    for (const it of list) {
      const prev = out.find((x) => x.name === it.name);
      if (prev) prev.qty += it.qty;
      else out.push({ ...it });
    }
    return out;
  }

  // Lo que copia "Copiar concepto": completo si cabe; si no, abreviado; si no, en cobros.
  function conceptPlan() {
    const items = ticketItems();
    if (!items.length) return { kind: "empty" };
    const full = fullConcept(items);
    if (full.length <= CONCEPT_MAX) return { kind: "full", text: full };
    const short = shortConcept(items);
    if (short.length <= CONCEPT_MAX) return { kind: "short", text: short };
    return { kind: "split", charges: splitIntoCharges(items) };
  }

  function renderConceptInfo() {
    if (!conceptInfo) return;
    const plan = conceptPlan();
    conceptInfo.className = "concept-info";
    if (plan.kind === "empty") {
      conceptInfo.textContent = "";
    } else if (plan.kind === "full") {
      conceptInfo.textContent = `Concepto: ${plan.text.length}/${CONCEPT_MAX} · completo`;
    } else if (plan.kind === "short") {
      conceptInfo.textContent = `Concepto: ${plan.text.length}/${CONCEPT_MAX} · abreviado (el completo no cabe en el datáfono)`;
      conceptInfo.title = plan.text;
    } else {
      conceptInfo.classList.add("is-over");
      conceptInfo.textContent = `No cabe en un cobro: se divide en ${plan.charges.length} cobros al copiar el concepto`;
    }
  }

  function openChargesDialog(charges) {
    const dlg = byId("charges-modal");
    const body = byId("charges-body");
    if (!dlg || !body) return;
    body.innerHTML = "";
    charges.forEach((c, i) => {
      const tr = document.createElement("tr");
      const tdN = document.createElement("td");
      tdN.textContent = `${i + 1} de ${charges.length}`;
      const tdC = document.createElement("td");
      tdC.textContent = c.concept;
      tdC.title = `${c.concept.length}/${CONCEPT_MAX} caracteres`;
      const tdT = document.createElement("td");
      tdT.className = "num";
      tdT.textContent = fmtMoney(c.total);
      const tdA = document.createElement("td");
      tdA.className = "num";
      const mk = (label, text) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "small";
        b.textContent = label;
        b.addEventListener("click", async () => {
          const ok = await copyText(text);
          if (!ok) openCopyFallback(text);
          tr.classList.add("is-selected");
        });
        return b;
      };
      tdA.append(mk("Copiar total", String(c.total)), document.createTextNode(" "), mk("Copiar concepto", c.concept));
      tr.append(tdN, tdC, tdT, tdA);
      body.appendChild(tr);
    });
    dlg.showModal();
  }

  // Aviso breve abajo a la derecha al anadir un producto (solo en PC).
  let toastTimer = null;
  // Mismo aviso para los botones del ticket: showToast("✔ Añadido", nombre, " · $ 800").
  function showToast(lead, bold = "", tail = "", isAction = true) {
    let el = byId("add-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "add-toast";
      el.className = "add-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.innerHTML = "";
    el.append(`${lead} `);
    if (bold) {
      const b = document.createElement("b");
      b.textContent = bold.length > 60 ? `${bold.slice(0, 57)}…` : bold;
      el.append(b);
    }
    if (tail) el.append(tail);
    el.classList.toggle("act", isAction);
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 1600);
  }
  function showAddedToast(name, price) {
    showToast("✔ Añadido", name, ` · ${fmtMoney(price)}`, false);
  }

  function addItemDelta(name, price, delta) {
    if (delta > 0) showAddedToast(name, price);
    const row = state.cart[name];
    if (!row) {
      if (delta > 0) state.cart[name] = { price, qty: delta };
      else return;
    } else {
      const next = row.qty + delta;
      if (next <= 0) delete state.cart[name];
      else row.qty = next;
    }
    state.history.push([name, delta]);
    renderTicket();
  }

  function renderTicket() {
    refreshInfDyn();
    ticketBody.innerHTML = "";
    let total = 0;
    for (const [name, row] of Object.entries(state.cart)) {
      const tr = document.createElement("tr");
      if (state.selected === name) tr.classList.add("is-selected");
      tr.addEventListener("click", (ev) => {
        if (ev.target?.closest?.("input, button")) return;
        state.selected = name;
        renderTicket();
      });

      const qtyInput = document.createElement("input");
      qtyInput.className = "qty-input";
      qtyInput.type = "number";
      qtyInput.min = "0";
      qtyInput.step = "1";
      qtyInput.inputMode = "numeric";
      qtyInput.value = row.qty;
      qtyInput.addEventListener("click", (ev) => ev.stopPropagation());
      qtyInput.addEventListener("mousedown", (ev) => ev.stopPropagation());
      qtyInput.addEventListener(
        "wheel",
        (ev) => {
          ev.preventDefault();
        },
        { passive: false }
      );
      qtyInput.addEventListener("change", () => {
        const n = Math.floor(Number(qtyInput.value));
        if (!Number.isFinite(n) || n <= 0) delete state.cart[name];
        else state.cart[name].qty = n;
        renderTicket();
      });

      const trashBtn = document.createElement("button");
      trashBtn.type = "button";
      trashBtn.className = "trash-btn";
      trashBtn.setAttribute("aria-label", `Borrar ${name}`);
      trashBtn.innerHTML = "&#128465;";
      trashBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        delete state.cart[name];
        if (state.selected === name) state.selected = null;
        renderTicket();
      });

      const sub = row.price * row.qty;
      total += sub;
      tr.innerHTML = `
        <td>${name}</td>
        <td class="num"></td>
        <td class="num">${fmtMoney(row.price)}</td>
        <td class="num">${fmtMoney(sub)}</td>
        <td class="num"></td>
      `;
      tr.children[1].appendChild(qtyInput);
      tr.children[4].appendChild(trashBtn);
      ticketBody.appendChild(tr);
    }
    ticketTotal.textContent = fmtMoney(total);
    const receiptDate = byId("receipt-date");
    if (receiptDate) {
      const d = new Date();
      const p2 = (n) => String(n).padStart(2, "0");
      receiptDate.textContent = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    }
    renderConceptInfo();
    renderQtyBadges();
    const units = Object.values(state.cart).reduce((a, r) => a + (r.qty || 0), 0);
    document.dispatchEvent(new CustomEvent("aguila-ticket", { detail: { units, total } }));
  }

  // Cuantas unidades de cada producto hay en el ticket (se ve en el movil).
  function renderQtyBadges() {
    productGrid.querySelectorAll(".product-btn").forEach((btn) => {
      const qty = state.cart[btn.dataset.name]?.qty || 0;
      const badge = btn.querySelector(".qty-badge");
      if (!badge) return;
      badge.textContent = qty ? `×${qty}` : "";
      btn.classList.toggle("in-ticket", qty > 0);
    });
  }

  // Categorias que se muestran juntas en una pestana, con subdivisiones (v99):
  // Servicios (Taller) reune Taller, Tienda y Neones RGB.
  const CAT_GROUPS = {
    servicios_taller: [
      { key: "servicios_taller", label: "Taller" },
      { key: "tienda", label: "Tienda" },
      { key: "neones", label: "Neones RGB" },
    ],
    informes: [
      { key: "informes_policia", label: "Policía" },
      { key: "informes_particular", label: "Particular" },
      { key: "informes_recargos", label: "Recargos" },
    ],
  };
  // Informes: solo el Jefe Aguila los ve y los cobra en la Caja (v104).
  const isInfCat = (c) => String(c || "").startsWith("informes");
  const cajaProducts = () => getAllProducts().filter((p) => AUTH.aguila || !isInfCat(p.category));
  // Recargos que se calculan con los informes del ticket.
  const INF_DYN = {
    "Urgencia +50% (Informe)": (base) => Math.round(base.sum * 0.5),
    "Horario Nocturno +100% (Informe)": (base) => Math.round(base.sum),
    "Vehículo Adicional 70% (Informe)": (base) => Math.round(base.max * 0.7),
  };
  function infBase() {
    const all = getAllProducts();
    let sum = 0;
    let max = 0;
    for (const [name, row] of Object.entries(state.cart)) {
      const p = all.find((x) => x.name === name);
      if (!p || !["informes_policia", "informes_particular"].includes(p.category)) continue;
      sum += row.price * row.qty;
      max = Math.max(max, row.price);
    }
    return { sum, max };
  }
  function refreshInfDyn() {
    const base = infBase();
    for (const [name, fn] of Object.entries(INF_DYN)) {
      const row = state.cart[name];
      if (!row) continue;
      row.price = fn(base);
      if (name !== "Vehículo Adicional 70% (Informe)") row.qty = 1;
    }
  }
  const CAT_CHILD = {};
  for (const [g, subs] of Object.entries(CAT_GROUPS)) for (const s of subs) if (s.key !== g) CAT_CHILD[s.key] = g;
  const groupOf = (key) => CAT_CHILD[key] || key;
  state.activeSub = "all";
  let catSubEl = byId("cat-sub");
  if (!catSubEl) {
    catSubEl = document.createElement("div");
    catSubEl.id = "cat-sub";
    catSubEl.className = "cat-sub";
    productGrid.before(catSubEl);
  }

  function renderCategoryTabs(allProducts) {
    const present = new Set(allProducts.map((p) => groupOf(p.category || "otros")));
    let cats = PRODUCT_CATEGORIES.filter((c) => present.has(c.key));
    if (!cats.length) cats = [{ key: "otros", label: "Otros" }];
    if (!state.activeCategory || !cats.some((c) => c.key === state.activeCategory)) {
      state.activeCategory = cats[0].key;
    }
    catTabsEl.innerHTML = "";
    for (const c of cats) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-tab" + (c.key === state.activeCategory ? " is-active" : "");
      btn.dataset.cat = c.key;
      btn.innerHTML = catTabIconSvg(c.key);
      btn.append(c.label);
      btn.addEventListener("click", () => {
        if (state.activeCategory !== c.key) state.activeSub = "all";
        state.activeCategory = c.key;
        renderProductGrid();
      });
      catTabsEl.appendChild(btn);
    }
    if (catNoteEl) {
      catNoteEl.textContent =
        state.activeCategory === "nitro"
          ? "⚠ Venta restringida: verifica bien a quién se lo vendes."
          : state.activeCategory === "gama_vip"
            ? VIP_NOTE
            : "";
      catNoteEl.classList.toggle("cat-note-box", !!catNoteEl.textContent);
    }
  }

  function renderProductGrid() {
    const all = cajaProducts();
    renderCategoryTabs(all);
    let shown = all.filter((p) => groupOf(p.category || "otros") === state.activeCategory);
    const subs = (CAT_GROUPS[state.activeCategory] || []).filter((s) => shown.some((p) => (p.category || "otros") === s.key));

    // Subdivisiones: chips para filtrar y titulos dentro de la lista.
    catSubEl.textContent = "";
    catSubEl.hidden = subs.length < 2;
    if (subs.length < 2) state.activeSub = "all";
    if (!catSubEl.hidden) {
      for (const s of [{ key: "all", label: "Todos" }, ...subs]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cat-sub-chip" + (state.activeSub === s.key ? " is-on" : "");
        b.dataset.cat = s.key === "all" ? state.activeCategory : s.key;
        if (s.key !== "all") b.innerHTML = catTabIconSvg(s.key);
        b.append(s.label);
        const n = shown.filter((p) => s.key === "all" || (p.category || "otros") === s.key).length;
        const c = document.createElement("span");
        c.className = "cat-sub-n";
        c.textContent = String(n);
        b.appendChild(c);
        b.addEventListener("click", () => {
          state.activeSub = s.key;
          renderProductGrid();
        });
        catSubEl.appendChild(b);
      }
      if (state.activeSub !== "all") shown = shown.filter((p) => (p.category || "otros") === state.activeSub);
    }
    const order = subs.map((s) => s.key);
    if (order.length > 1) shown = shown.slice().sort((x, y) => order.indexOf(x.category || "otros") - order.indexOf(y.category || "otros"));

    productGrid.innerHTML = "";
    let lastSub = null;
    for (const product of shown) {
      if (subs.length > 1 && state.activeSub === "all" && (product.category || "otros") !== lastSub) {
        lastSub = product.category || "otros";
        const s = subs.find((x) => x.key === lastSub);
        const h = document.createElement("div");
        h.className = "prod-sub-h";
        h.dataset.cat = lastSub;
        h.innerHTML = catTabIconSvg(lastSub);
        h.append(s ? s.label : lastSub);
        productGrid.appendChild(h);
      }
      const button = document.createElement("button");
      button.className = "product-btn";
      button.type = "button";
      button.dataset.name = product.name;
      button.innerHTML = `
        <img src="${getProductIcon(product)}" alt="${product.name}" />
        <strong>${product.name}${product.note ? `<span class="product-note">${product.note}</span>` : ""}</strong>
        ${!INF_DYN[product.name] && priceOf(product) !== product.price ? `<small class="emp-pill" title="Precio normal ${fmtMoney(product.price)}"><s>${fmtMoney(product.price)}</s>${fmtMoney(priceOf(product))}</small>` : `<small>${INF_DYN[product.name] ? (product.name.includes("70%") ? "70 %" : product.name.includes("100%") ? "+100 %" : "+50 %") : fmtMoney(product.price)}</small>`}
        <span class="qty-badge"></span>
      `;
      button.addEventListener("click", () => {
        if (INF_DYN[product.name]) {
          const base = infBase();
          if (!base.sum) return showToast("☝ Primero añade al ticket el informe al que se aplica el recargo");
          if (product.name !== "Vehículo Adicional 70% (Informe)" && state.cart[product.name]) return showToast("ℹ Ese recargo ya está en el ticket");
          return addItemDelta(product.name, INF_DYN[product.name](base), +1);
        }
        addItemDelta(product.name, priceOf(product), +1);
      });
      button.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        addItemDelta(product.name, priceOf(product), -1);
      });
      productGrid.appendChild(button);
    }
    renderQtyBadges();
  }
  renderProductGrid();

  // Buscador de vehiculo: al elegirlo salta a su gama de tuning (si se sabe).
  const vehSearch = setupVehicleSearch({
    onGama: (key) => {
      if (getAllProducts().some((p) => (p.category || "otros") === key)) {
        state.activeCategory = key;
        renderProductGrid();
      }
    },
  });

  byId("btn-undo").addEventListener("click", () => {
    const op = state.history.pop();
    if (!op) {
      showToast("↩ Nada que deshacer");
      return;
    }
    const [name, delta] = op;
    showToast(delta > 0 ? "↩ Deshecho: quitado" : "↩ Deshecho: vuelto a añadir", name);
    const item = state.cart[name];
    const price = priceByName(name);
    if (!item) {
      if (-delta > 0) state.cart[name] = { price, qty: -delta };
    } else {
      const next = item.qty - delta;
      if (next <= 0) delete state.cart[name];
      else item.qty = next;
    }
    renderTicket();
  });

  byId("btn-remove").addEventListener("click", () => {
    if (!state.selected) {
      showToast("☝ Selecciona una línea del ticket para quitarla");
      return;
    }
    const name = state.selected;
    const price = priceByName(name);
    addItemDelta(name, price, -1);
    showToast("➖ Quitado", name, ` · ${fmtMoney(price)}`);
  });

  byId("btn-clear").addEventListener("click", () => {
    showToast(Object.keys(state.cart).length ? "🧹 Ticket limpio" : "🧹 El ticket ya estaba vacío");
    state.cart = {};
    vehSearch.clear();
    state.history = [];
    state.selected = null;
    renderTicket();
  });

  byId("btn-copy-total").addEventListener("click", async () => {
    const total = Object.values(state.cart).reduce((acc, r) => acc + r.price * r.qty, 0);
    const ok = await copyText(String(total));
    if (!ok) openCopyFallback(String(total));
    else showToast("📋 Total copiado", fmtMoney(total));
  });

  byId("btn-copy-concept").addEventListener("click", async () => {
    const plan = conceptPlan();
    if (plan.kind === "empty") {
      showToast("📋 El ticket está vacío: no hay concepto que copiar");
      return;
    }
    if (plan.kind === "split") {
      openChargesDialog(plan.charges);
      return;
    }
    const ok = await copyText(plan.text);
    if (!ok) openCopyFallback(plan.text);
    else showToast("📋 Concepto copiado", plan.text);
  });

  // 👷 Precio de empleado: solo lo ve y lo activa el Jefe Aguila. Al cambiarlo
  // se recalculan los precios del ticket (menos los recargos de informes).
  const empBtn = byId("btn-emp-price");
  const empBar = byId("ticket-emp");
  function renderEmpMode() {
    if (!AUTH.aguila) state.emp = false;
    if (empBtn) {
      empBtn.hidden = !AUTH.aguila;
      empBtn.classList.toggle("is-on", state.emp);
      empBtn.setAttribute("aria-pressed", String(state.emp));
    }
    if (empBar) empBar.hidden = !state.emp;
    document.querySelector(".ticket-card")?.classList.toggle("emp-mode", state.emp);
  }
  empBtn?.addEventListener("click", () => {
    if (!AUTH.aguila) return;
    state.emp = !state.emp;
    for (const [name, row] of Object.entries(state.cart)) {
      if (INF_DYN[name]) continue;
      const p = getAllProducts().find((x) => x.name === name);
      if (p) row.price = priceOf(p);
    }
    renderEmpMode();
    renderProductGrid();
    renderTicket();
    showToast(state.emp ? "👷 Precio de empleado activado" : "Precio normal", state.emp ? "El concepto lleva la marca EMP" : "");
  });
  renderEmpMode();

  setupProductsAdminModal(renderProductGrid);

  renderTicket();
}

function setupProductsAdminModal(onProductsChanged) {
  const btnOpen = byId("btn-add-product");
  const dlg = byId("add-product-modal");
  if (!btnOpen || !dlg) return;

  const nameEl = byId("prod-new-name");
  const priceEl = byId("prod-new-price");
  const categoryEl = byId("prod-new-category");
  const imageEl = byId("prod-new-image");
  const imageHintEl = byId("prod-new-image-hint");
  const previewWrap = byId("prod-new-preview");
  const previewImg = byId("prod-new-preview-img");
  const errorEl = byId("prod-new-error");
  const saveBtn = byId("prod-new-save");
  const cancelEditBtn = byId("prod-new-cancel-edit");
  const searchEl = byId("prod-search");
  const adminBody = byId("prod-admin-body");

  const subtabButtons = dlg.querySelectorAll(".subtab");
  const subtabPanels = dlg.querySelectorAll(".subtab-panel");

  if (categoryEl && !categoryEl.dataset.filled) {
    categoryEl.dataset.filled = "1";
    for (const c of PRODUCT_CATEGORIES) {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = c.label;
      categoryEl.appendChild(opt);
    }
    categoryEl.value = "otros";
  }

  let pendingImageDataUrl = "";
  let currentEditingImage = "";
  let editingTarget = null; // { source: "custom", id } | { source: "fixed", key, originalName }

  function switchSubtab(target) {
    subtabButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.subtabTarget === target));
    subtabPanels.forEach((p) => p.classList.toggle("is-active", p.id === target));
  }
  subtabButtons.forEach((b) => b.addEventListener("click", () => switchSubtab(b.dataset.subtabTarget)));

  function resetForm() {
    if (nameEl) {
      nameEl.value = "";
      nameEl.disabled = false;
    }
    if (priceEl) priceEl.value = "";
    if (categoryEl) {
      categoryEl.value = "otros";
      categoryEl.disabled = false;
    }
    if (imageEl) imageEl.value = "";
    if (errorEl) errorEl.textContent = "";
    if (imageHintEl) imageHintEl.textContent = "Si no subes una imagen, se genera un icono simple automaticamente.";
    pendingImageDataUrl = "";
    if (previewWrap) previewWrap.style.display = "none";
    if (previewImg) previewImg.src = "";
  }

  function exitEditMode() {
    editingTarget = null;
    currentEditingImage = "";
    if (saveBtn) saveBtn.textContent = "Guardar producto";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    resetForm();
  }

  function enterEditMode(row) {
    editingTarget =
      row.source === "custom" ? { source: "custom", id: row.id } : { source: "fixed", key: row.key, originalName: row.name };
    currentEditingImage = row.image || "";
    if (nameEl) {
      nameEl.value = row.name;
      nameEl.disabled = row.source === "fixed";
    }
    if (priceEl) priceEl.value = row.price;
    if (categoryEl) {
      categoryEl.value = row.category || "otros";
      categoryEl.disabled = row.source === "fixed";
    }
    if (imageEl) imageEl.value = "";
    pendingImageDataUrl = "";
    if (previewImg) previewImg.src = currentEditingImage;
    if (previewWrap) previewWrap.style.display = currentEditingImage ? "" : "none";
    if (errorEl) errorEl.textContent = "";
    if (imageHintEl) {
      imageHintEl.textContent =
        row.source === "fixed"
          ? "Sube una imagen solo si quieres reemplazar el icono original."
          : "Sube una imagen solo si quieres cambiarla (si no, se mantiene la actual).";
    }
    if (saveBtn) saveBtn.textContent = "Actualizar producto";
    if (cancelEditBtn) cancelEditBtn.style.display = "";
    switchSubtab("prod-tab-add");
    setTimeout(() => (nameEl?.disabled ? priceEl : nameEl)?.focus(), 50);
  }

  function isDuplicateName(name, target) {
    const wanted = normalizeKeySimple(name);
    return listProductsForAdmin().some((row) => {
      if (target?.source === "custom" && row.source === "custom" && String(row.id) === String(target.id)) return false;
      if (target?.source === "fixed" && row.source === "fixed" && row.key === target.key) return false;
      return normalizeKeySimple(row.name) === wanted;
    });
  }

  function renderAdminTable() {
    if (!adminBody) return;
    const q = normalizeKeySimple(String(searchEl?.value || ""));
    adminBody.innerHTML = "";
    const rows = listProductsForAdmin().filter((r) => !q || normalizeKeySimple(r.name).includes(q));

    for (const row of rows) {
      const tr = document.createElement("tr");

      const tdImg = document.createElement("td");
      const img = document.createElement("img");
      img.className = "prod-thumb";
      img.src = getProductIcon(row);
      img.alt = row.name;
      tdImg.appendChild(img);

      const tdName = document.createElement("td");
      tdName.textContent = row.name;

      const tdPrice = document.createElement("td");
      tdPrice.className = "num";
      tdPrice.textContent = fmtMoney(row.price);

      const tdCategory = document.createElement("td");
      tdCategory.textContent = categoryLabel(row.category);

      const tdOrigin = document.createElement("td");
      const pill = document.createElement("span");
      if (row.hidden) {
        pill.className = "tag-pill tag-oculto";
        pill.textContent = "Oculto";
      } else if (row.source === "fixed") {
        pill.className = "tag-pill tag-fijo";
        pill.textContent = "Fijo";
      } else {
        pill.className = "tag-pill tag-agregado";
        pill.textContent = "Agregado";
      }
      tdOrigin.appendChild(pill);

      const tdActions = document.createElement("td");
      tdActions.className = "num";

      if (row.hidden) {
        const restoreBtn = document.createElement("button");
        restoreBtn.type = "button";
        restoreBtn.textContent = "Restaurar";
        restoreBtn.addEventListener("click", async () => {
          restoreBtn.disabled = true;
          try {
            await setFixedProductHidden(row.name, false, accessPassword());
          } catch (e) {
            restoreBtn.disabled = false;
            return alert(`No se pudo restaurar: ${e?.message || e}`);
          }
          renderAdminTable();
          onProductsChanged?.();
        });
        tdActions.appendChild(restoreBtn);
      } else {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Editar";
        editBtn.addEventListener("click", () => enterEditMode(row));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "danger";
        delBtn.style.marginLeft = "6px";
        delBtn.textContent = row.source === "fixed" ? "Ocultar" : "Quitar";
        delBtn.addEventListener("click", async () => {
          const action = row.source === "fixed" ? "ocultar" : "quitar";
          if (!window.confirm(`¿Seguro que quieres ${action} "${row.name}"?`)) return;
          delBtn.disabled = true;
          try {
            if (row.source === "fixed") await setFixedProductHidden(row.name, true, accessPassword());
            else await deleteCustomProduct(row.id, accessPassword());
          } catch (e) {
            delBtn.disabled = false;
            alert(String(e?.message || e));
            return;
          }
          const editingThisRow =
            editingTarget &&
            ((editingTarget.source === "custom" && String(editingTarget.id) === String(row.id)) ||
              (editingTarget.source === "fixed" && editingTarget.key === row.key));
          if (editingThisRow) exitEditMode();
          renderAdminTable();
          onProductsChanged?.();
        });

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);
      }

      tr.append(tdImg, tdName, tdPrice, tdCategory, tdOrigin, tdActions);
      adminBody.appendChild(tr);
    }
  }

  searchEl?.addEventListener("input", renderAdminTable);

  imageEl?.addEventListener("change", () => {
    const file = imageEl.files?.[0];
    if (!file) {
      pendingImageDataUrl = "";
      if (previewWrap) previewWrap.style.display = editingTarget && currentEditingImage ? "" : "none";
      if (previewImg && editingTarget) previewImg.src = currentEditingImage;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingImageDataUrl = String(reader.result || "");
      if (previewImg) previewImg.src = pendingImageDataUrl;
      if (previewWrap) previewWrap.style.display = "";
    };
    reader.readAsDataURL(file);
  });

  cancelEditBtn?.addEventListener("click", () => exitEditMode());

  // Otro PC o el Jefe cambia un precio: al volver a la pestaña se recargan.
  const refreshCloud = async () => {
    if (Date.now() - PROD_CLOUD.at < 30000) return;
    if (await prodCloudLoad()) {
      onProductsChanged?.();
      if (dlg.open) renderAdminTable();
    }
  };
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refreshCloud());
  window.addEventListener("focus", refreshCloud);
  setInterval(refreshCloud, 5 * 60000);

  btnOpen.addEventListener("click", async () => {
    if (PROD_CLOUD.ok) {
      if (!AUTH.aguila) return alert("Los precios y productos solo los cambia el Jefe Aguila.");
      await prodCloudLoad();
      onProductsChanged?.();
      const pend = prodLocalPending();
      const n = pend.ovKeys.length + pend.custom.length;
      if (n && confirm(`Este PC tiene ${n} ${n === 1 ? "cambio guardado" : "cambios guardados"} solo aquí (precios, imágenes, ocultos o productos agregados).\n\n¿Subirlos a la base para que todos los vean? Los que ya estén en la base no se tocan.`)) {
        try {
          const up = await prodUploadLocal();
          onProductsChanged?.();
          alert(`✔ ${up} ${up === 1 ? "cambio subido" : "cambios subidos"}.`);
        } catch (e) {
          alert(`No se pudo subir: ${e?.message || e}`);
        }
      }
    } else {
      if (isSharedReadOnly()) {
        alert("Los productos los gestiona el encargado. Aquí se ven los publicados y no se pueden cambiar.");
        return;
      }
      const ok = await showAccessModal({
        sectionLabel: "Gestión de Productos",
      });
      if (!ok) return;
    }
    exitEditMode();
    switchSubtab("prod-tab-add");
    renderAdminTable();
    dlg.showModal();
    setTimeout(() => nameEl?.focus(), 50);
  });

  saveBtn?.addEventListener("click", async () => {
    const name = String(nameEl?.value || "").trim();
    const price = Number(priceEl?.value);
    const category = String(categoryEl?.value || "otros");

    if (!name) {
      if (errorEl) errorEl.textContent = "Ponle un nombre al producto.";
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      if (errorEl) errorEl.textContent = "El precio no es valido.";
      return;
    }
    if (isDuplicateName(name, editingTarget)) {
      if (errorEl) errorEl.textContent = "Ya existe un producto con ese nombre.";
      return;
    }

    saveBtn.disabled = true;
    try {
      if (!editingTarget) {
        const image = pendingImageDataUrl || generatePlaceholderIcon(name);
        await addCustomProduct({ name, price, image, category }, accessPassword());
      } else if (editingTarget.source === "custom") {
        const image = pendingImageDataUrl || currentEditingImage;
        await updateCustomProduct(editingTarget.id, { name, price, image, category }, accessPassword());
      } else {
        const patch = { price };
        if (pendingImageDataUrl) patch.image = pendingImageDataUrl;
        await setFixedProductOverride(editingTarget.originalName, patch, accessPassword());
      }
    } catch (e) {
      if (errorEl) errorEl.textContent = String(e?.message || e);
      return;
    } finally {
      saveBtn.disabled = false;
    }

    const wasEditing = !!editingTarget;
    exitEditMode();
    onProductsChanged?.();
    renderAdminTable();
    if (wasEditing) switchSubtab("prod-tab-edit");
  });
}
