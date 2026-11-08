// Aguila Motors · Vista móvil (menú lateral, barra del ticket) y logo de arranque.
// (movil.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Vista movil: menu lateral (secciones y categorias), lista de productos y
// barra del ticket abajo. En PC estos elementos no se muestran.
// ============================================================================
// ---------- Barra lateral (PC) con la cuenta atras del cierre ----------
function nextWeekClose(now = Date.now()) {
  const md = dlogMadridParts(now);
  let days = (7 - md.wd) % 7;
  if (days === 0) days = 7;
  const d = new Date(Date.UTC(md.y, md.m - 1, md.d + days));
  return dlogMadridMidnight(d.toISOString().slice(0, 10));
}

function setupSideRail() {
  const shell = document.querySelector(".app-shell");
  const top = shell?.querySelector(".topbar");
  const nav = shell?.querySelector("nav.tabs");
  if (!shell || !top || !nav || document.querySelector(".side-rail")) return;
  const rail = document.createElement("aside");
  rail.className = "side-rail";
  shell.prepend(rail);
  rail.append(top, nav);
  const spacer = document.createElement("div");
  spacer.className = "side-spacer";
  const close = document.createElement("div");
  close.className = "side-close";
  close.innerHTML = `<span>⏳ Cierre de la semana en</span><b id="side-close-left"></b><small id="side-close-when"></small>`;
  rail.append(spacer, close);
  document.body.classList.add("has-rail");
  const tick = () => {
    const t = nextWeekClose();
    let left = Math.max(0, t - Date.now());
    const d = Math.floor(left / 86400000);
    left -= d * 86400000;
    const h = Math.floor(left / 3600000);
    left -= h * 3600000;
    const m = Math.floor(left / 60000);
    byId("side-close-left").textContent = `${d ? `${d} d ` : ""}${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`;
    byId("side-close-when").textContent = new Date(t).toLocaleString("es-ES", { weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "").replace(/^./, (c) => c.toUpperCase()) + " (tu hora)";
  };
  tick();
  setInterval(tick, 30000);
}

function setupMobileNav() {
  const drawer = byId("m-drawer");
  const menuBtn = byId("m-menu-btn");
  if (!drawer || !menuBtn) return;
  const sectionsEl = byId("m-nav-sections");
  const catsEl = byId("m-nav-cats");
  const catsTitle = byId("m-nav-cats-title");
  const catLabel = byId("m-cat-label");
  const cajaPanel = byId("tab-caja");

  const isCaja = () => cajaPanel.classList.contains("is-active");

  function navButton(label, active, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "m-nav-item" + (active ? " is-active" : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function build() {
    sectionsEl.textContent = "";
    document.querySelectorAll("nav.tabs .tab").forEach((tab) => {
      if (tab.hidden) return;
      const item = navButton(tab.textContent.trim(), tab.classList.contains("is-active"), () => {
        close();
        tab.click(); // misma logica (y contrasena) que en PC
      });
      const icon = tab.querySelector(".tab-ic");
      if (icon) item.prepend(icon.cloneNode(true));
      sectionsEl.appendChild(item);
    });
    catsEl.textContent = "";
    const showCats = isCaja();
    catsTitle.hidden = !showCats;
    catsEl.hidden = !showCats;
    if (showCats) {
      document.querySelectorAll("#cat-tabs .cat-tab").forEach((ct) => {
        const item = navButton(ct.textContent.trim(), ct.classList.contains("is-active"), () => {
          ct.click();
          close();
          byId("product-grid")?.scrollIntoView({ block: "start", behavior: "smooth" });
        });
        if (ct.dataset.cat) item.dataset.cat = ct.dataset.cat;
        const cic = ct.querySelector(".cat-ic");
        if (cic) item.prepend(cic.cloneNode(true));
        catsEl.appendChild(item);
      });
    }
  }

  function open(focusCats) {
    build();
    drawer.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("m-drawer-open");
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    if (focusCats && !catsEl.hidden) setTimeout(() => catsTitle.scrollIntoView({ block: "start" }), 50);
  }

  function close() {
    drawer.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("m-drawer-open");
    setTimeout(() => {
      if (!drawer.classList.contains("is-open")) drawer.hidden = true;
    }, 220);
  }

  menuBtn.addEventListener("click", () => (drawer.hidden ? open(false) : close()));
  byId("m-cat-btn")?.addEventListener("click", () => open(true));
  drawer.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) close();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !drawer.hidden) close();
  });

  // Nombre de la categoria activa en el boton "Categoria ▾".
  const syncCat = () => {
    const active = document.querySelector("#cat-tabs .cat-tab.is-active");
    if (catLabel) {
      catLabel.textContent = active ? active.textContent.trim() : "";
      catLabel.dataset.cat = active?.dataset.cat || "";
    }
  };
  new MutationObserver(syncCat).observe(byId("cat-tabs"), { childList: true, subtree: true, attributes: true });
  syncCat();

  // Barra de secciones abajo (v98): las mismas pestanas que se ven en PC.
  const bnav = byId("m-bnav");
  const SHORT = { "tab-cv": "Compraventa", "tab-conta": "Pagos", "tab-sorteo": "Sorteo", "tab-caja": "Caja", "tab-inf": "Informes", "tab-jefe": "Panel" };
  function buildBnav() {
    if (!bnav) return;
    const vis = [...document.querySelectorAll("nav.tabs .tab")].filter((t) => !t.hidden);
    bnav.textContent = "";
    bnav.hidden = vis.length < 2;
    document.body.classList.toggle("has-bnav", !bnav.hidden);
    for (const t of vis) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "m-bnav-item" + (t.classList.contains("is-active") ? " is-active" : "");
      const ic = t.querySelector(".tab-ic");
      if (ic) b.appendChild(ic.cloneNode(true));
      const s = document.createElement("span");
      s.textContent = SHORT[t.dataset.tabTarget] || t.textContent.trim();
      b.appendChild(s);
      b.addEventListener("click", () => {
        t.click();
        window.scrollTo({ top: 0 });
      });
      bnav.appendChild(b);
    }
  }
  const tabsObs = new MutationObserver(buildBnav);
  document.querySelectorAll("nav.tabs .tab").forEach((t) => tabsObs.observe(t, { attributes: true, attributeFilter: ["class", "hidden", "style"] }));
  buildBnav();

  // La barra del ticket solo se ve en la Caja; la del total, solo en Pagos.
  const pagosPanel = byId("tab-conta");
  const syncSection = () => {
    document.body.classList.toggle("is-caja", isCaja());
    document.body.classList.toggle("is-pagos", !!pagosPanel?.classList.contains("is-active"));
  };
  if (pagosPanel) new MutationObserver(syncSection).observe(pagosPanel, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(syncSection).observe(cajaPanel, { attributes: true, attributeFilter: ["class"] });
  syncSection();

  const bar = byId("m-ticket-bar");
  bar?.addEventListener("click", () => {
    document.querySelector("#tab-caja .ticket-card")?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  document.addEventListener("aguila-ticket", (ev) => {
    const { units, total } = ev.detail || {};
    byId("m-ticket-count").textContent = units ? `${units} ${units === 1 ? "producto" : "productos"}` : "Vacío";
    byId("m-ticket-total").textContent = fmtMoney(total);
    bar?.classList.toggle("has-items", units > 0);
  });
}

// Al abrir desde la pantalla de Inicio, el logo se queda un momento y se desvanece.
(function hideAppSplash() {
  const splash = byId("app-splash");
  if (!splash || !document.documentElement.classList.contains("is-app")) return;
  const hide = () => setTimeout(() => splash.classList.add("is-hidden"), 700);
  if (document.readyState === "complete") hide();
  else window.addEventListener("load", hide, { once: true });
})();
