// Aguila Motors · Gestión de empleados (listado, ficha, strikes, rangos, despedidos y mensajes para Discord).
// (empleados.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

function setupEmployeesAdminModal({ onChanged }) {
  const modal = byId("employees-admin-modal");
  const status = byId("emp-admin-status");
  const passInput = byId("emp-admin-pass");

  const nameInput = byId("emp-new-name");
  const surInput = byId("emp-new-surname");
  const rankInput = byId("emp-new-rank");
  const discordInput = byId("emp-new-discord");
  const ibanInput = byId("emp-new-iban");

  const searchInput = byId("emp-search");

  if (rankInput && !rankInput.dataset.filled) {
    rankInput.dataset.filled = "1";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Sin rango";
    rankInput.appendChild(blank);
    for (const r of RANKS) {
      const opt = document.createElement("option");
      opt.value = r.label;
      opt.textContent = `${rankLabel(r.label)} (${Math.round(r.pct * 100)}%)`;
      rankInput.appendChild(opt);
    }
  }

  let unlocked = false;
  let adminPass = "";
  let employees = [];

  // Solo lectura: con empleados en linea y sin sesion de encargado, o con
  // datos.js publicado y sin modo encargado. Se recalcula al abrir y al
  // iniciar / cerrar sesion.
  let readOnly = false;
  const roNote = byId("emp-readonly-note");
  function applyMode() {
    readOnly = !hasAccess() || (!empCloudOn() && isSharedReadOnly());
    unlocked = !readOnly;
    adminPass = unlocked ? "jefe" : "";
    nameInput?.closest(".admin-block")?.toggleAttribute("hidden", readOnly);
    passInput?.closest(".admin-block")?.toggleAttribute("hidden", true); // ya no hay contrasena
    if (roNote) {
      roNote.hidden = !readOnly;
      roNote.textContent = empCloudOn()
        ? "Empleados en línea. Solo los Jefes pueden cambiarlos."
        : `Empleados publicados por el encargado${SHARED_DATA?.publishedAt ? " el " + SHARED_DATA.publishedAt : ""}. Aquí solo se pueden ver.`;
    }
    const logged = hasAccess();
    const dot = byId("emp-cloud-dot");
    const txt = byId("emp-cloud-text");
    if (dot && txt) {
      if (empCloudOn()) {
        dot.className = "cv-dot is-on";
        txt.textContent = `En línea · ${EMP_CLOUD.list.length} empleados` + (logged ? ` · Jefe: ${AUTH.name} (los cambios se guardan al momento)` : "");
      } else if (EMP_CLOUD.ok) {
        dot.className = "cv-dot";
        txt.textContent = logged
          ? "La base en línea está lista pero vacía: sube los empleados para empezar a usarla."
          : "La base en línea está lista pero vacía. Inicia sesión de encargado para subir los empleados.";
      } else {
        dot.className = "cv-dot is-off";
        txt.textContent = EMP_CLOUD.tried ? `${EMP_CLOUD.error} Se usan datos.js / esta PC.` : "Conectando…";
      }
    }
    byId("emp-cloud-login")?.toggleAttribute("hidden", true);

    // Desplegable de alta: nombres visibles; los rangos altos solo para el Jefe Aguila.
    if (rankInput) {
      const cur = rankInput.value;
      rankInput.innerHTML = "";
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Sin rango";
      rankInput.appendChild(blank);
      for (const r of RANKS.slice().reverse()) {
        if (isTopRank(r.label) && !AUTH.aguila) continue;
        const opt = document.createElement("option");
        opt.value = r.label;
        opt.textContent = `${rankLabel(r.label)} (${Math.round(r.pct * 100)}%)`;
        rankInput.appendChild(opt);
      }
      rankInput.value = [...rankInput.options].some((o) => o.value === cur) ? cur : "";
    }

    // Nombres de los rangos: solo el Jefe Aguila.
    const namesBox = byId("emp-rank-names");
    if (namesBox) {
      namesBox.hidden = !(AUTH.aguila && !readOnly);
      const grid = byId("emp-rank-names-grid");
      if (!namesBox.hidden && grid && !grid.dataset.built) {
        grid.dataset.built = "1";
        for (const r of RANKS.slice().reverse()) {
          const lab = document.createElement("label");
          const base = DEFAULT_RANK_NAMES[r.label] || r.label;
          lab.textContent = `${base} (${Math.round(r.pct * 100)}%)`;
          const inp = document.createElement("input");
          inp.className = "text-input";
          inp.dataset.rank = r.label;
          inp.maxLength = 30;
          inp.placeholder = DEFAULT_RANK_NAMES[r.label] || r.label;
          lab.appendChild(inp);
          grid.appendChild(lab);
        }
      }
      grid?.querySelectorAll("input[data-rank]").forEach((inp) => {
        if (document.activeElement !== inp) inp.value = RANK_NAMES[inp.dataset.rank] || "";
      });
    }
    byId("emp-cloud-migrate")?.toggleAttribute("hidden", !(EMP_CLOUD.ok && logged && !EMP_CLOUD.list.length));
  }

  byId("emp-cloud-login")?.addEventListener("click", openLoginDialog);

  byId("emp-rank-names-save")?.addEventListener("click", async () => {
    if (!AUTH.aguila) return;
    const map = {};
    byId("emp-rank-names-grid").querySelectorAll("input[data-rank]").forEach((inp) => {
      const v = inp.value.replace(/\s+/g, " ").trim();
      if (v && v !== inp.dataset.rank && v !== DEFAULT_RANK_NAMES[inp.dataset.rank]) map[inp.dataset.rank] = v;
    });
    const btn = byId("emp-rank-names-save");
    btn.disabled = true;
    try {
      await saveRankNames(map);
      setStatus("✔ Nombres de los rangos guardados. Se ven en toda la página y al copiar las pagas.", true);
      await refresh();
      await (onChanged?.());
    } catch (err) {
      alert(`No se pudieron guardar: ${err.message || err}`);
    } finally {
      btn.disabled = false;
    }
  });

  // Primera vez: copia a la base en linea los empleados que se ven ahora (datos.js o esta PC).
  byId("emp-cloud-migrate")?.addEventListener("click", async () => {
    const btn = byId("emp-cloud-migrate");
    try {
      // Los de esta PC (modo encargado) si los hay; si no, los publicados en datos.js.
      let src = [];
      if (!isSharedReadOnly()) {
        const dMap = loadEmployeeDiscordMap();
        const iMap = loadEmployeeIbanMap();
        const nMap = loadEmployeeNoPayMap();
        const k = (e) => normalizeKeySimple(fullName(e));
        src = loadEmployeesLocal().map((e) => ({ ...e, discord: dMap[k(e)] || "", iban: iMap[k(e)] || "", noPay: !!nMap[k(e)] }));
        const api = await waitPyApi();
        if (api && typeof api.emp_list === "function") {
          try {
            const data = await api.emp_list();
            const arr = Array.isArray(data) ? data : Array.isArray(data?.employees) ? data.employees : [];
            if (arr.length) src = arr.map((e) => ({ ...e, discord: dMap[k(e)] || "", iban: iMap[k(e)] || "", noPay: !!nMap[k(e)] }));
          } catch {
            // se queda con lo guardado en el navegador
          }
        }
      }
      let from = "de esta PC";
      if (!src.length && SHARED_DATA?.employees?.length) {
        src = SHARED_DATA.employees.map((e) => ({ ...e }));
        from = `publicados en datos.js${SHARED_DATA.publishedAt ? " (" + SHARED_DATA.publishedAt + ")" : ""}`;
      }
      if (!src.length) {
        alert("No hay empleados que subir.");
        return;
      }
      if (!confirm(`¿Subir ${src.length} empleados ${from} (con rango, Discord, IBAN y No cobra) a la base en línea?`)) return;
      btn.disabled = true;
      const rows = src
        .filter((e) => String(e.name || "").trim() && String(e.surname || "").trim())
        .map((e) =>
          empCloudRow({
            id: safeRandomId(),
            name: String(e.name || "").trim(),
            surname: String(e.surname || "").trim(),
            rank: e.rank || "",
            discord: e.discord || "",
            iban: e.iban || "",
            noPay: !!e.noPay,
          })
        );
      empCloudRequireSession();
      await cvCloud.upsert("employees", rows, "id");
      await refresh();
      await (onChanged?.());
      setStatus(`☁️ ${rows.length} empleados subidos. Ya están en línea para todos.`, true);
    } catch (err) {
      alert(`No se pudieron subir: ${err.message || err}`);
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener("aguila-auth", async () => {
    await refresh();
    await (onChanged?.());
  });

  function setStatus(text, ok = false) {
    status.textContent = text;
    status.style.color = ok ? "var(--ok)" : "var(--muted)";
  }

  function normalizeForSearch(s) {
    return normalizeKeySimple(String(s || ""));
  }

  // ---------------------------------------------------------------------------
  // Interfaz por pestañas (v94): Listado · Nuevo empleado · Strikes · Rangos ·
  // Despedidos. El listado solo informa; al tocar a alguien se abre su ficha.
  // Editar, subir/bajar, despedir y los strikes: solo el Jefe Aguila.
  // ---------------------------------------------------------------------------
  const mk = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const btn = (text, cls = "ghost", title = "") => {
    const b = mk("button", cls, text);
    b.type = "button";
    if (title) b.title = title;
    return b;
  };
  const dm = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : "");
  // Strikes: solo Jefe Aguila y con empleados en linea. Editar / subir / despedir:
  // Jefe Aguila en linea, o el modo encargado de la PC (sin base en linea).
  const boss = () => AUTH.aguila && !readOnly && empCloudOn();
  const canEdit = () => !readOnly && (empCloudOn() ? AUTH.aguila : unlocked);
  const isSelf = (e) => !!(AUTH.discordId && String(empMainOf(AUTH.discordId)?.id) === String(e.id));
  const isAguilaRank = (e) => normalizeKeySimple(e.rank) === normalizeKeySimple("Jefe Aguila");
  const strikesOf = (e) => (hasAccess() ? strikesBefore(e.id, fullName(e)) : 0);
  const pctText = (e) => (e.rank ? `${Math.round(pctForRank(e.rank) * 100)} %` : "-");

  let tab = "list";
  let filter = "all";
  let sortBy = "rank";
  let fichaId = null;
  let editing = false;

  function setTab(t) {
    tab = t;
    modal.querySelectorAll(".emp-tab").forEach((b) => b.classList.toggle("is-on", b.dataset.empTab === t));
    modal.querySelectorAll(".emp-pane").forEach((p) => (p.hidden = p.dataset.empPane !== t));
    renderAll();
  }
  modal.querySelectorAll(".emp-tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.empTab)));
  byId("emp-sort")?.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-sort]");
    if (!b) return;
    sortBy = b.dataset.sort;
    byId("emp-sort").querySelectorAll("[data-sort]").forEach((x) => x.classList.toggle("is-on", x === b));
    renderList();
  });

  byId("emp-date-toggle")?.addEventListener("click", () => {
    const box = byId("emp-datefilter");
    box.hidden = !box.hidden;
    byId("emp-date-toggle").classList.toggle("is-on", !box.hidden);
    renderList();
  });
  for (const id of ["emp-df-field", "emp-df-from", "emp-df-to"]) byId(id)?.addEventListener("change", () => renderList());
  byId("emp-df-clear")?.addEventListener("click", () => {
    byId("emp-df-from").value = "";
    byId("emp-df-to").value = "";
    renderList();
  });

  function avatar(e, big = false) {
    return rankAvatar(e.rank, empInitials(e), `emp-av${big ? " big" : ""}`);
  }
  function badge(rank) {
    return mk("span", `pg-badge ${empRankCls(rank)}`, rank ? rankLabel(rank) : "Sin rango");
  }
  function strikeChip(n, zero = true) {
    if (!n && !zero) return null;
    return mk("span", "pg-strike emp-st" + (n >= STRIKE_MAX ? " max" : "") + (n ? "" : " zero"), `${n >= STRIKE_MAX ? "🚫 " : n ? "⚠️ " : ""}${n}/${STRIKE_MAX}`);
  }

  const FILTERS = [
    { k: "all", label: "En plantilla", test: () => true },
    { k: "strikes", label: "Con strikes", test: (e) => strikesOf(e) > 0, cls: "w", access: true },
    { k: "fire", label: `Para despido (${STRIKE_MAX}/${STRIKE_MAX})`, test: (e) => strikesOf(e) >= STRIKE_MAX, cls: "r", access: true },
    { k: "iban", label: "Sin IBAN", test: (e) => !getEmployeeIban(fullName(e)) && !isEmployeeNoPay(fullName(e)), cls: "w" },
    { k: "discord", label: "Sin Discord", test: (e) => !getEmployeeDiscord(fullName(e)), cls: "w" },
    { k: "nodates", label: "Sin fecha de ingreso", test: (e) => !e.altaAt, cls: "w", dates: true },
    { k: "inact", label: "Sin facturar", test: (e) => (inactOf(e)?.level || 0) >= 1, cls: "w", access: true },
  ];
  // 💤 Chip de inactividad (solo a partir del primer aviso).
  function inactChip(e, always = false) {
    const x = inactOf(e);
    if (!x || (!x.level && !always)) return null;
    const c = mk("span", `emp-inact l${x.level}`, x.level ? `💤 ${x.more ? `+${INACT_VENTANA}` : x.days} d` : "✅ Activo");
    c.title = `${inactText(x)}${x.last ? ` · última factura ${dlogDate(new Date(x.last).toISOString())}` : ""}`;
    return c;
  }
  // Filtro por fechas (ingreso o contratacion) entre "desde" y "hasta".
  const dateFilter = () => {
    const box = byId("emp-datefilter");
    if (!box || box.hidden) return null;
    const from = byId("emp-df-from").value;
    const to = byId("emp-df-to").value;
    if (!from && !to) return null;
    return { field: byId("emp-df-field").value, from, to };
  };

  function shownList() {
    const q = normalizeForSearch(searchInput.value);
    const f = FILTERS.find((x) => x.k === filter) || FILTERS[0];
    let out = employees.filter((e) => f.test(e) && (!q || normalizeForSearch(`${e.name} ${e.surname} ${e.rank || ""} ${rankLabel(e.rank)}`).includes(q)));
    const df = dateFilter();
    if (df) out = out.filter((e) => {
      const v = e[df.field] || "";
      return !!v && (!df.from || v >= df.from) && (!df.to || v <= df.to);
    });
    if (sortBy === "seniority") out = out.slice().sort((x, y) => (x.altaAt || "9999") .localeCompare(y.altaAt || "9999") || byRankThenName(x, y));
    else if (sortBy === "az") out = out.slice().sort((x, y) => fullName(x).localeCompare(fullName(y), "es", { sensitivity: "base" }));
    else if (sortBy === "strikes") out = out.slice().sort((x, y) => strikesOf(y) - strikesOf(x) || byRankThenName(x, y));
    if (filter === "inact") out = out.slice().sort((x, y) => (inactOf(y)?.days || 0) - (inactOf(x)?.days || 0));
    return out;
  }

  function renderKpis() {
    const box = byId("emp-kpis");
    if (!box) return;
    box.textContent = "";
    for (const f of FILTERS) {
      if (f.access && !hasAccess()) continue;
      if (f.dates && !EMP_CLOUD.hasDates) continue;
      const n = employees.filter(f.test).length;
      const k = mk("button", `emp-kpi${f.cls && n ? " " + f.cls : ""}${filter === f.k ? " is-on" : ""}`);
      k.type = "button";
      k.append(mk("b", "", String(n)), mk("span", "", f.label));
      k.addEventListener("click", () => {
        filter = filter === f.k ? "all" : f.k;
        renderList();
      });
      box.appendChild(k);
    }
  }

  function renderList() {
    byId("emp-tab-n-list").textContent = String(employees.length);
    const sN = hasAccess() ? employees.filter((e) => strikesOf(e) > 0).length : 0;
    byId("emp-tab-n-strikes").textContent = sN ? String(sN) : "";
    const listView = byId("emp-list-view");
    const fichaView = byId("emp-ficha-view");
    const inFicha = fichaId && employees.some((e) => String(e.id) === fichaId);
    listView.hidden = !!inFicha;
    fichaView.hidden = !inFicha;
    if (inFicha) return renderFicha();
    fichaId = null;
    renderKpis();
    const list = byId("emp-list");
    list.textContent = "";
    const shown = shownList();
    if (!shown.length) list.appendChild(mk("p", "muted emp-empty", employees.length ? "Nadie con ese filtro." : "Todavía no hay empleados."));
    for (const e of shown) {
      const full = fullName(e);
      const row = mk("button", "emp-row");
      row.type = "button";
      const nm = mk("div", "emp-row-name");
      nm.append(mk("b", "", full), mk("small", "", `${e.rank ? rankLabel(e.rank) : "Sin rango"} · ${pctText(e)}`));
      const alts = empCloudOn() ? empAltsOf(e) : [];
      if (alts.length) nm.appendChild(mk("small", "emp-alt", `👥 Mismo Discord: ${alts.map(fullName).join(", ")}`));
      if (EMP_CLOUD.hasDates || e.altaAt) {
        const parts = [];
        if (e.altaAt) parts.push(`Ingreso ${empDate(e.altaAt)}`);
        if (e.contratadoAt && e.contratadoAt !== e.altaAt) parts.push(`Contratado ${empDate(e.contratadoAt)}`);
        nm.appendChild(mk("small", "emp-dates" + (parts.length ? "" : " none"), parts.length ? `📅 ${parts.join(" · ")}` : "📅 Sin fechas"));
      }
      const flags = mk("div", "emp-row-flags");
      const disc = getEmployeeDiscord(full);
      const iban = getEmployeeIban(full);
      flags.append(
        mk("span", disc ? "emp-ok" : "emp-no", disc ? "✔ Discord" : "⚠ Sin Discord"),
        isEmployeeNoPay(full) ? mk("span", "emp-mut", "No cobra") : mk("span", iban ? "emp-ok" : "emp-no", iban ? "✔ IBAN" : "⚠ Sin IBAN")
      );
      row.append(avatar(e), nm, badge(e.rank));
      if (hasAccess()) row.append(strikeChip(strikesOf(e)));
      const ic = hasAccess() ? inactChip(e) : null;
      if (ic) flags.prepend(ic);
      row.append(flags, mk("span", "emp-go", "›"));
      row.addEventListener("click", () => {
        fichaId = String(e.id);
        editing = false;
        renderList();
        byId("emp-ficha-view")?.scrollIntoView({ block: "nearest" });
      });
      list.appendChild(row);
    }
  }

  // ---------- Ficha ----------
  function box(title, cls = "") {
    const b = mk("div", "emp-box " + cls);
    b.appendChild(mk("h6", "", title));
    return b;
  }
  function kv(k, v, cls = "") {
    const r = mk("div", "emp-kv");
    r.append(mk("span", "", k), mk("b", cls, v));
    return r;
  }

  function renderFicha() {
    const view = byId("emp-ficha-view");
    const e = employees.find((x) => String(x.id) === fichaId);
    if (!e) return;
    const full = fullName(e);
    const n = strikesOf(e);
    view.textContent = "";

    // Barra: volver y anterior / siguiente (dentro del filtro actual)
    const nav = mk("div", "emp-nav");
    const back = btn("← Listado", "emp-back");
    back.addEventListener("click", () => {
      fichaId = null;
      editing = false;
      renderList();
    });
    nav.appendChild(back);
    const seq = shownList();
    const i = seq.findIndex((x) => String(x.id) === fichaId);
    const go = (d) => {
      const t = seq[i + d];
      if (!t) return;
      fichaId = String(t.id);
      editing = false;
      renderList();
    };
    const pn = mk("div", "emp-prevnext");
    const prev = btn(seq[i - 1] ? `‹ ${fullName(seq[i - 1])}` : "‹", "emp-back");
    prev.disabled = !seq[i - 1];
    prev.addEventListener("click", () => go(-1));
    const next = btn(seq[i + 1] ? `${fullName(seq[i + 1])} ›` : "›", "emp-back");
    next.disabled = !seq[i + 1];
    next.addEventListener("click", () => go(1));
    pn.append(prev, next);
    nav.appendChild(pn);
    view.appendChild(nav);

    const card = mk("div", "emp-ficha");
    // Cabecera
    const head = mk("div", "emp-fh");
    head.appendChild(avatar(e, true));
    const who = mk("div", "emp-fh-who");
    who.appendChild(mk("b", "", full));
    const line = mk("div", "emp-fh-line");
    line.appendChild(badge(e.rank));
    if (hasAccess() && n) line.appendChild(strikeChip(n));
    const icF = hasAccess() ? inactChip(e) : null;
    if (icF) line.appendChild(icF);
    const since = e.altaAt || (STRIKE_HIST.slice().reverse().find((w) => strikeRowIn(w, e.id, full))?.semana ?? "");
    if (since) line.appendChild(mk("span", "muted", `· en el taller desde ${empDate(since)}${e.altaAt ? ` (${empSeniority(since)})` : " (primera semana cerrada)"}`));
    who.appendChild(line);
    const alts = empCloudOn() ? empAltsOf(e) : [];
    if (alts.length) who.appendChild(mk("small", "emp-alt", `👥 Mismo Discord: ${alts.map(fullName).join(", ")}`));
    head.appendChild(who);
    if (canEdit()) {
      const acts = mk("div", "emp-fh-acts");
      const edit = btn(editing ? "Cancelar" : "✏️ Editar datos");
      edit.addEventListener("click", () => {
        editing = !editing;
        renderFicha();
      });
      acts.appendChild(edit);
      if (!isAguilaRank(e) && !isSelf(e)) {
        const fire = btn("Despedir", "danger");
        fire.addEventListener("click", () => fireEmp(e));
        acts.appendChild(fire);
      }
      head.appendChild(acts);
    }
    card.appendChild(head);

    // Datos
    const datos = box("Datos", "emp-datos");
    const disc = getEmployeeDiscord(full);
    const iban = getEmployeeIban(full);
    const noPay = isEmployeeNoPay(full);
    if (editing) datos.appendChild(editForm(e));
    else {
      datos.append(
        kv("Discord", disc || "⚠ Falta", disc ? "" : "emp-no"),
        kv("IBAN", noPay ? "No cobra" : iban || "⚠ Falta", iban || noPay ? "" : "emp-no"),
        kv("Comisión", pctText(e)),
        kv("Cobra nómina", noPay ? "No" : "Sí")
      );
      if (EMP_CLOUD.hasDates || e.altaAt) {
        datos.append(
          kv("Ingreso al taller", e.altaAt ? `${empDate(e.altaAt)} · ${empSeniority(e.altaAt)}` : "⚠ Sin fecha", e.altaAt ? "" : "emp-no"),
          kv("Contratación", e.contratadoAt ? empDate(e.contratadoAt) : EMP_CLOUD.hasDates ? "⚠ Sin fecha" : "—", e.contratadoAt || !EMP_CLOUD.hasDates ? "" : "emp-no")
        );
      }
      const ix = hasAccess() ? inactOf(e) : null;
      if (ix) datos.append(kv("Última factura", ix.last ? `${dlogDate(new Date(ix.last).toISOString())} · hace ${ix.days} ${ix.days === 1 ? "día" : "días"}` : inactText(ix), ix.level >= 2 ? "emp-no" : ""));
    }
    card.appendChild(datos);

    // Rango
    const rango = box("Rango", "emp-rango");
    const li = EMP_LADDER.findIndex((x) => normalizeKeySimple(x) === normalizeKeySimple(e.rank));
    const ladder = mk("div", "emp-ladder");
    EMP_LADDER.forEach((r, k) => {
      if (k) ladder.appendChild(mk("span", "emp-ladder-sep", "›"));
      ladder.appendChild(mk("span", `pg-badge ${empRankCls(r)}${k === li ? " cur" : ""}`, rankLabel(r)));
    });
    if (li < 0) rango.appendChild(mk("p", "muted emp-small", e.rank ? `${rankLabel(e.rank)}: rango fuera de la escalera (lo cambias en «Editar datos»).` : "Sin rango."));
    else rango.appendChild(ladder);
    const gross = PAGOS_WEEK_GROSS?.get(normalizeKeySimple(full));
    if (gross != null && li >= 0) {
      const goal = RANK_RULES.up[EMP_LADDER[li]] || (EMP_LADDER[li] === "Subjefe" ? RANK_RULES.candidate : 0);
      rango.appendChild(kv("Esta semana", `${fmtMoney(gross)} facturados · mínimo ${fmtMoney(RANK_RULES.min)} ${gross >= RANK_RULES.min ? "✔" : "✖"}`, gross >= RANK_RULES.min ? "" : "emp-no"));
      if (goal) {
        const bar = mk("div", "emp-prog");
        const fill = mk("i");
        fill.style.width = `${Math.min(100, Math.round((gross / goal) * 100))}%`;
        bar.appendChild(fill);
        rango.append(bar, mk("p", "muted emp-small", EMP_LADDER[li] === "Subjefe" ? `Candidato a ${rankLabel("Jefe")} con ${fmtMoney(goal)}` : `Meta para ${rankLabel(EMP_LADDER[li + 1])}: ${fmtMoney(goal)}`));
      }
    } else if (li >= 0) rango.appendChild(mk("p", "muted emp-small", "Carga la semana en Pagos para ver lo que lleva facturado."));
    if (canEdit() && li >= 0 && !isSelf(e)) {
      const ra = mk("div", "emp-acts");
      if (EMP_LADDER[li + 1]) {
        const up = btn(`⬆️ Subir a ${rankLabel(EMP_LADDER[li + 1])}`);
        up.addEventListener("click", () => moveRank(e, EMP_LADDER[li + 1], up));
        ra.appendChild(up);
      }
      if (li > 0) {
        const down = btn(`⬇️ Bajar a ${rankLabel(EMP_LADDER[li - 1])}`);
        down.addEventListener("click", () => moveRank(e, EMP_LADDER[li - 1], down));
        ra.appendChild(down);
      }
      rango.appendChild(ra);
    }
    card.appendChild(rango);

    // Facturacion de las ultimas semanas cerradas (+ la actual si Pagos la tiene)
    if (hasAccess()) {
      const fac = box("Facturación · últimas semanas", "emp-fac");
      const pts = [];
      for (const w of STRIKE_HIST) {
        const r = strikeRowIn(w, e.id, full);
        if (r) pts.push({ label: dm(w.semana), v: Number(r.gross || 0) });
        if (pts.length >= 6) break;
      }
      pts.reverse();
      if (gross != null) pts.push({ label: "Esta", v: gross, now: true });
      if (!pts.length) fac.appendChild(mk("p", "muted emp-small", "Todavía no hay semanas cerradas con esta persona."));
      else {
        const max = Math.max(RANK_RULES.min * 1.25, ...pts.map((p) => p.v));
        const chart = mk("div", "emp-chart");
        const minLine = mk("div", "emp-chart-min");
        minLine.style.bottom = `${(RANK_RULES.min / max) * 100}%`;
        minLine.title = `Mínimo ${fmtMoney(RANK_RULES.min)}`;
        chart.appendChild(minLine);
        const labels = mk("div", "emp-chart-x");
        for (const p of pts) {
          const c = mk("div", "emp-col" + (p.v < RANK_RULES.min ? " lo" : "") + (p.now ? " now" : ""));
          c.style.height = `${Math.max(2, (p.v / max) * 100)}%`;
          c.title = `${p.label}: ${fmtMoney(p.v)}`;
          c.appendChild(mk("em", "", p.v >= 1000 ? `${Math.round(p.v / 1000)}k` : String(p.v)));
          chart.appendChild(c);
          labels.appendChild(mk("span", "", p.label));
        }
        fac.append(chart, labels);
        const closed = pts.filter((p) => !p.now);
        if (closed.length) {
          const avg = Math.round(closed.reduce((s, p) => s + p.v, 0) / closed.length);
          const best = Math.max(...closed.map((p) => p.v));
          fac.appendChild(mk("p", "muted emp-small", `Media: ${fmtMoney(avg)} · Mejor semana: ${fmtMoney(best)} · Línea = mínimo ${fmtMoney(RANK_RULES.min)}`));
        }
      }
      card.appendChild(fac);

      // Strikes
      const st = box(`Strikes · ${n >= STRIKE_MAX ? "🚫" : "⚠️"} ${n}/${STRIKE_MAX}`, "emp-strk");
      if (boss()) st.appendChild(buildStrikeEditor(e, () => renderFicha(), { compact: true }));
      else {
        const hist = strikeHistoryOf(e.id, full);
        const weeks = mk("div", "strike-ed-weeks");
        if (!hist.length) weeks.appendChild(mk("span", "muted emp-small", "Sin semanas cerradas."));
        for (const h of hist.slice(0, 6)) {
          const w = mk("span", "strike-week ro" + (h.on ? " on" : "") + (h.forgiven ? " off" : "") + (h.counted ? " counted" : ""));
          w.append(mk("b", "", dm(h.wk)), mk("span", "", h.on ? `⚠️ ${h.motivo || "strike"}` : h.forgiven ? "Quitado" : `✅ ${fmtMoney(h.gross)}`));
          weeks.appendChild(w);
        }
        st.appendChild(weeks);
      }
      card.appendChild(st);
    }

    // Historial
    const hb = box("Historial", "emp-hist");
    const tl = mk("div", "emp-tl");
    tl.appendChild(mk("p", "muted emp-small", "Cargando…"));
    hb.appendChild(tl);
    card.appendChild(hb);
    view.appendChild(card);
    loadHistory(e, tl);
  }

  async function loadHistory(e, tl) {
    const id = String(e.id);
    let rows = [];
    let err = "";
    if (!empCloudOn()) err = "El historial necesita los empleados en línea.";
    else {
      try {
        rows = (await empHistory(id)) || [];
      } catch (x) {
        err = x.code === "PGRST205" || x.code === "42P01" || x.status === 404 ? "Falta pegar en Supabase el SQL 10_historial_empleados.sql para guardar el historial." : `No se pudo cargar: ${x.message || x}`;
      }
    }
    if (fichaId !== id) return; // se cambio de ficha mientras cargaba
    tl.textContent = "";
    if (err) return tl.appendChild(mk("p", "muted emp-small", err));
    if (!rows.length) return tl.appendChild(mk("p", "muted emp-small", "Sin movimientos todavía. Desde ahora se apuntan aquí los ascensos, descensos, strikes, cambios de datos y despidos."));
    for (const r of rows) {
      const it = mk("div", "emp-tl-row");
      const d = r.at ? new Date(r.at) : null;
      it.append(mk("em", "", d ? d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }) : ""), mk("span", "", r.texto || ""));
      if (r.por) it.appendChild(mk("small", "muted", `· ${r.por}`));
      tl.appendChild(it);
    }
  }

  function editForm(e) {
    const full = fullName(e);
    const f = mk("div", "emp-edit");
    const field = (label, input) => {
      const l = mk("label", "");
      l.append(mk("span", "", label), input);
      return l;
    };
    const inp = (v, ph, extra = {}) => {
      const x = mk("input", "text-input");
      x.type = "text";
      x.value = v || "";
      x.placeholder = ph;
      Object.assign(x, extra);
      return x;
    };
    const nIn = inp(e.name, "Nombre");
    const sIn = inp(e.surname, "Apellido");
    const rSel = mk("select", "text-input");
    rSel.appendChild(new Option("Sin rango", ""));
    for (const r of RANKS.slice().reverse()) rSel.appendChild(new Option(`${rankLabel(r.label)} (${Math.round(r.pct * 100)}%)`, r.label));
    rSel.value = e.rank || "";
    const dIn = inp(getEmployeeDiscord(full), "ID de Discord", { inputMode: "numeric" });
    const iIn = inp(getEmployeeIban(full), "J000000", { maxLength: 9 });
    const np = mk("input");
    np.type = "checkbox";
    np.checked = isEmployeeNoPay(full);
    const npL = mk("label", "emp-check");
    npL.append(np, mk("span", "", "No cobra la nómina"));
    const grid = mk("div", "emp-edit-grid");
    grid.append(field("Nombre", nIn), field("Apellido", sIn), field("Rango", rSel), field("IBAN", iIn), field("ID de Discord", dIn));
    const aIn = mk("input", "text-input");
    aIn.type = "date";
    aIn.value = e.altaAt || "";
    aIn.max = empToday();
    const cIn = mk("input", "text-input");
    cIn.type = "date";
    cIn.value = e.contratadoAt || "";
    cIn.max = empToday();
    const dates = mk("div", "emp-edit-grid emp-edit-dates");
    if (EMP_CLOUD.hasDates) dates.append(field("📅 Ingreso al taller", aIn), field("📝 Contratación", cIn));
    else dates.appendChild(mk("p", "muted emp-small", "Para guardar las fechas de ingreso y contratación, pega en Supabase el SQL 11_fechas_empleados.sql."));
    const save = btn("Guardar", "");
    const cancel = btn("Cancelar");
    cancel.addEventListener("click", () => {
      editing = false;
      renderFicha();
    });
    save.addEventListener("click", async () => {
      const name = nIn.value.trim().replace(/\s+/g, " ");
      const surname = sIn.value.trim().replace(/\s+/g, " ");
      if (!name || !surname) return alert("Pon Nombre y Apellido.");
      const discord = parseDiscordId(dIn.value);
      if (discord === null) return alert("Eso no parece un ID de Discord. Es un número de 17 a 20 cifras (clic derecho sobre la persona → Copiar ID de usuario).");
      const ib = parseIban(iIn.value);
      if (ib === null) return alert("El IBAN no es válido. Es una letra y 6 números, como J739745.");
      if (EMP_CLOUD.hasDates && aIn.value && cIn.value && cIn.value < aIn.value) return alert("La fecha de contratación no puede ser anterior a la de ingreso al taller.");
      const newFull = `${name} ${surname}`;
      if (newFull !== full) {
        const clash = [...EMP_CLOUD.list, ...EMP_CLOUD.fired].find((x) => String(x.id) !== String(e.id) && normalizeKeySimple(fullName(x)) === normalizeKeySimple(newFull));
        if (clash) return alert(`Ya hay alguien llamado ${fullName(clash)}${clash.firedAt ? " (en Despedidos)" : ""}.`);
        if (!confirm(`¿Cambiar el nombre de ${full} a ${newFull}?\n\nConserva su rango, Discord, IBAN y strikes. Las facturas nuevas deben salir en Discord con el nombre nuevo.`)) return;
      }
      if (isSelf(e) && rSel.value !== (e.rank || "") && !confirm("Vas a cambiar tu propio rango. Si bajas de Jefe Aguila puedes perder el acceso. ¿Seguir?")) return;
      save.disabled = true;
      try {
        if (empCloudOn()) {
          empCloudRequireSession();
          await updateEmployee(e.id, { name, surname, rank: rSel.value, discord, iban: ib, noPay: np.checked, ...(EMP_CLOUD.hasDates ? { altaAt: aIn.value, contratadoAt: cIn.value } : {}) }, adminPass);
        } else {
          await updateEmployee(e.id, { name, surname, rank: rSel.value }, adminPass);
          if (newFull !== full) {
            setEmployeeDiscord(full, "");
            setEmployeeIban(full, "");
            setEmployeeNoPay(full, false);
          }
          setEmployeeDiscord(newFull, discord);
          setEmployeeIban(newFull, ib);
          setEmployeeNoPay(newFull, np.checked);
        }
        editing = false;
        setStatus(`✔ Datos de ${newFull} guardados.`, true);
        await refresh();
        await (onChanged?.());
      } catch (err) {
        save.disabled = false;
        alert(`No se pudo guardar: ${err.message || err}`);
      }
    });
    const acts = mk("div", "emp-acts");
    acts.append(save, cancel);
    f.append(grid, dates, npL, acts);
    return f;
  }

  async function moveRank(e, to, b) {
    const up = rankOrder(to) > rankOrder(e.rank);
    if (!confirm(`¿${up ? "Subir" : "Bajar"} a ${fullName(e)} de ${rankLabel(e.rank)} a ${rankLabel(to)}?`)) return;
    b.disabled = true;
    try {
      if (empCloudOn()) empCloudRequireSession();
      await updateEmployee(e.id, { rank: to }, adminPass);
      setStatus(`✔ ${fullName(e)} ahora es ${rankLabel(to)}.`, true);
      dc.key = "";
      await refresh();
      await (onChanged?.());
      if (hasAccess()) status.append(" ", dcGoBtn());
    } catch (err) {
      b.disabled = false;
      alert(`No se pudo cambiar el rango: ${err.message || err}`);
    }
  }

  async function fireEmp(e) {
    const label = fullName(e);
    if (isAguilaRank(e) || isSelf(e)) return alert("No puedes despedirte a ti mismo ni al Jefe Aguila: perderías el acceso a la página.");
    const n = hasAccess() ? strikesBefore(e.id, label) : 0;
    const reason = await askBaja(`${label}${e.rank ? ` (${rankLabel(e.rank)})` : ""}`, n >= STRIKE_MAX ? "strikes" : (inactOf(e)?.level || 0) >= 3 ? "inactividad" : "");
    if (reason === null) return;
    try {
      if (empCloudOn()) await empCloudFire(e, reason.trim());
      else {
        await deleteEmployee(e.id, adminPass);
        setEmployeeDiscord(label, "");
        setEmployeeIban(label, "");
        setEmployeeNoPay(label, false);
      }
      fichaId = null;
      setStatus(`🚪 ${label} pasa a Despedidos.`, true);
      dc.key = "";
      await refresh();
      await (onChanged?.());
      if (hasAccess() && empCloudOn()) status.append(" ", dcGoBtn());
    } catch (err) {
      alert(`No se pudo despedir: ${empFireError(err)}`);
    }
  }

  // ---------- Pestaña Strikes ----------
  function renderStrikesTab() {
    const root = byId("emp-strikes");
    if (!root) return;
    root.textContent = "";
    if (!hasAccess()) return root.appendChild(mk("p", "muted", "Solo los Jefes ven los strikes."));
    const rows = employees.map((e) => ({ e, n: strikesOf(e), hist: strikeHistoryOf(e.id, fullName(e)) })).filter((x) => x.n > 0);
    const run = async (b, fn) => {
      b.disabled = true;
      try {
        await fn();
        renderAll();
      } catch (err) {
        b.disabled = false;
        alert(`No se pudo guardar: ${err.message || err}`);
      }
    };
    const plus = (e, b, motivo) => {
      const w = strikePlusWeek(e);
      if (!w) return alert("No hay semanas cerradas donde ponerle el strike.");
      const m = motivo ?? prompt(`Poner un strike a ${fullName(e)} (semana del ${dm(w.wk)}).\n\nMotivo:`, "");
      if (m === null) return;
      if (!String(m).trim()) return alert("Escribe el motivo del strike.");
      run(b, () => saveStrikeAdjMany([{ wk: w.wk, value: strikeValueFor(w, true, String(m).trim()) }], e.id, fullName(e)));
    };
    const minus = (e, b) => {
      const w = strikeMinusWeek(e);
      if (!w) return;
      const m = prompt(`Quitar a ${fullName(e)} el strike de la semana del ${dm(w.wk)}.\n\nMotivo (opcional):`, "");
      if (m === null) return;
      run(b, () => saveStrikeAdjMany([{ wk: w.wk, value: strikeValueFor(w, false, m.trim() || "quitado por el jefe") }], e.id, fullName(e)));
    };
    const group = (title, items) => {
      root.appendChild(mk("div", "emp-grp", title));
      for (const { e, n, hist } of items) {
        const r = mk("div", "emp-srow");
        const nm = mk("button", "emp-srow-name");
        nm.type = "button";
        nm.title = "Abrir ficha";
        nm.append(mk("b", "", fullName(e)), mk("small", "", e.rank ? rankLabel(e.rank) : "Sin rango"));
        nm.addEventListener("click", () => {
          fichaId = String(e.id);
          setTab("list");
        });
        const dots = mk("div", "emp-dots");
        for (const h of hist.slice(0, 4)) dots.appendChild(mk("i", h.counted || h.on ? "s" : h.forgiven ? "f" : "", ""));
        dots.title = "Últimas semanas cerradas (rojo = strike, punteado = quitado)";
        const why = mk("span", "muted emp-small emp-why", hist.filter((h) => h.counted).map((h) => `${dm(h.wk)} ${h.motivo || "strike"}`).join(" · "));
        r.append(avatar(e), nm, strikeChip(n), dots, why);
        const acts = mk("div", "emp-acts");
        if (boss()) {
          if (n < STRIKE_MAX) {
            const p = btn("＋1", "ghost", "Poner un strike");
            p.addEventListener("click", () => plus(e, p));
            acts.appendChild(p);
          }
          const m = btn("−1", "ghost", "Quitar el último strike");
          m.addEventListener("click", () => minus(e, m));
          acts.appendChild(m);
          if (n >= STRIKE_MAX && !isAguilaRank(e) && !isSelf(e)) {
            const f = btn("Despedir", "danger");
            f.addEventListener("click", () => fireEmp(e));
            acts.appendChild(f);
          }
        }
        r.appendChild(acts);
        root.appendChild(r);
      }
    };
    const fire = rows.filter((x) => x.n >= STRIKE_MAX).sort((a, b) => byRankThenName(a.e, b.e));
    const rest = rows.filter((x) => x.n < STRIKE_MAX).sort((a, b) => b.n - a.n || byRankThenName(a.e, b.e));
    if (!rows.length) root.appendChild(mk("p", "muted emp-empty", "👏 Nadie tiene strikes ahora mismo."));
    if (fire.length) group("🚫 Para despido", fire);
    if (rest.length) group("⚠️ Con strikes", rest);
    if (boss()) {
      root.appendChild(mk("div", "emp-grp", "➕ Poner strike"));
      const add = mk("div", "emp-sadd");
      const sel = mk("select", "text-input");
      sel.appendChild(new Option("Elige empleado…", ""));
      for (const e of employees) if (!isEmployeeNoPay(fullName(e)) && strikesOf(e) < STRIKE_MAX) sel.appendChild(new Option(`${fullName(e)}${e.rank ? ` (${rankLabel(e.rank)})` : ""}`, String(e.id)));
      const why = mk("input", "text-input");
      why.placeholder = "Motivo (p. ej. mal comportamiento IC)";
      why.maxLength = 120;
      const go = btn("➕ Poner strike", "");
      go.addEventListener("click", () => {
        const e = employees.find((x) => String(x.id) === sel.value);
        if (!e) return alert("Elige a quién ponerle el strike.");
        plus(e, go, why.value);
      });
      add.append(sel, why, go);
      root.appendChild(add);
    }
    root.appendChild(mk("p", "muted emp-note", "Aquí salen los strikes de las semanas ya cerradas. Los de la semana en curso se ven en Pagos, porque dependen de lo que se facture hasta el sábado."));
  }

  // ---------- Pestaña Rangos ----------
  function renderRanksTab() {
    const t = byId("emp-rank-table");
    if (!t) return;
    t.textContent = "";
    t.appendChild(mk("h4", "", "Rangos y plantilla"));
    const R = RANK_RULES;
    for (const r of RANKS.slice().reverse()) {
      const people = employees.filter((e) => normalizeKeySimple(e.rank) === normalizeKeySimple(r.label));
      const row = mk("div", "emp-rk");
      const goal = R.up[r.label] ? `Meta para subir: ${fmtMoney(R.up[r.label])}` : r.label === "Subjefe" ? `Candidato a ${rankLabel("Jefe")}: ${fmtMoney(R.candidate)}` : "";
      row.append(mk("span", `pg-badge ${empRankCls(r.label)}`, rankLabel(r.label)), mk("span", "emp-rk-pct", `${Math.round(r.pct * 100)} %`), mk("span", "muted emp-small", goal), mk("span", "emp-rk-n", people.length ? people.map(fullName).join(", ") : "—"));
      t.appendChild(row);
    }
    t.appendChild(mk("p", "muted emp-note", `Mínimo semanal para no llevar strike: ${fmtMoney(R.min)}. Las metas y el mínimo se cambian en Pagos → ⚙️ Umbrales.`));
    if (!hasAccess()) return;
    // 💤 Aviso de inactividad: días sin facturar para cada color.
    const ib = mk("div", "emp-inact-cfg");
    ib.appendChild(mk("h4", "", "💤 Aviso de inactividad"));
    ib.appendChild(mk("p", "muted emp-small", `Días sin facturar (según el canal de facturas, últimos ${INACT_VENTANA} días) para que salga el aviso en el listado y en la ficha.`));
    const D = INACT.dias;
    const grid = mk("div", "emp-inact-grid");
    const inputs = {};
    for (const [k, lbl, cls] of [["aviso", "Aviso", "l1"], ["alerta", "Alerta", "l2"], ["grave", "Grave", "l3"]]) {
      const l = mk("label", "emp-inact-f");
      l.appendChild(mk("span", `emp-inact ${cls}`, `💤 ${lbl}`));
      const i = document.createElement("input");
      i.type = "number";
      i.min = "1";
      i.max = String(INACT_VENTANA);
      i.value = String(D[k]);
      i.disabled = !AUTH.aguila;
      inputs[k] = i;
      l.append(i, mk("span", "muted emp-small", "días"));
      grid.appendChild(l);
    }
    ib.appendChild(grid);
    if (AUTH.aguila) {
      const save = btn("Guardar días", "");
      save.addEventListener("click", async () => {
        save.disabled = true;
        try {
          await inactSaveDias({ aviso: +inputs.aviso.value, alerta: +inputs.alerta.value, grave: +inputs.grave.value });
          setStatus("✔ Días del aviso de inactividad guardados.", true);
          renderAll();
        } catch (err) {
          alert(err.message || err);
        } finally {
          save.disabled = false;
        }
      });
      ib.appendChild(save);
    } else ib.appendChild(mk("p", "muted emp-small", "Solo el Jefe Aguila puede cambiar los días."));
    t.appendChild(ib);
  }

  function renderAll() {
    byId("emp-tab-new").hidden = readOnly;
    const nd = byId("emp-new-dates");
    if (nd) {
      nd.hidden = !EMP_CLOUD.hasDates;
      for (const id of ["emp-new-alta", "emp-new-contrato"]) {
        const x = byId(id);
        if (x && !x.value) x.value = empToday();
        if (x) x.max = empToday();
      }
    }
    const dt = byId("emp-date-toggle");
    if (dt) dt.hidden = !EMP_CLOUD.hasDates;
    const ds = modal.querySelector('[data-sort="seniority"]');
    if (ds) ds.hidden = !EMP_CLOUD.hasDates;
    if (tab === "new" && readOnly) tab = "list";
    if (tab === "list") renderList();
    else {
      byId("emp-tab-n-list").textContent = String(employees.length);
      const sN = hasAccess() ? employees.filter((e) => strikesOf(e) > 0).length : 0;
      byId("emp-tab-n-strikes").textContent = sN ? String(sN) : "";
    }
    if (tab === "strikes") renderStrikesTab();
    if (tab === "ranks") renderRanksTab();
    const dcTab = byId("emp-tab-discord");
    if (dcTab) dcTab.hidden = !(hasAccess() && empCloudOn());
    if (tab === "discord" && dcTab?.hidden) return setTab("list");
    if (tab === "discord") renderDiscordTab();
    renderFired();
  }

  // 📣 Para Discord (v117-v120): ascensos, descensos y bajas de una semana,
  // separados en pantalla pero en UN solo mensaje (un copiar, un pegar).
  const dc = { sun: null, key: "", items: [], desc: [], bajas: [], eow: [], eowAuto: false, strikes: [], stClosed: false, stCierre: pickOne(STRIKE_CIERRES), off: new Set(), frase: ascFraseAzar(), cierre: pickOne(DESC_CIERRES), cierreB: pickOne(BAJAS_CIERRES), err: "" };
  function dcGoBtn() {
    const go = btn("📣 Mensaje para Discord", "ghost emp-dc-go", "Abrir el mensaje de la semana");
    go.addEventListener("click", () => {
      dc.sun = ascDefaultWeek();
      dc.key = "";
      setTab("discord");
    });
    return go;
  }
  const dcOn = (it, pre) => !dc.off.has(`${pre}:${it.id}`);
  const dcText = () => {
    const up = dc.items.filter((it) => dcOn(it, "u"));
    const desc = dc.desc.filter((it) => dcOn(it, "d"));
    const bajas = dc.bajas.filter((it) => dcOn(it, "b"));
    const eow = dc.eow.filter((it) => dcOn(it, "e"));
    return movDiscordText(up, desc, bajas, dc.sun, up.length || eow.length ? dc.frase : desc.length ? dc.cierre : dc.cierreB, eow);
  };
  function renderDiscordPreview() {
    const t = dcText();
    byId("emp-dc-prev").textContent = t || "No hay nada marcado para esa semana.";
    byId("emp-dc-copy").disabled = !t;
  }
  // Empleado de la Semana: el que se llevó el bono en la semana cerrada en Pagos.
  const isoOfDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const eowItem = (e) => ({ id: String(e.id), name: fullName(e), discord: String(e.discord || e.discordPrev || "").replace(/\D/g, ""), frase: "" });
  function dcLoadEow() {
    const w = STRIKE_HIST.find((x) => String(x.semana) === isoOfDay(dc.sun));
    const people = [...EMP_CLOUD.list, ...EMP_CLOUD.fired];
    const wins = (w?.datos?.rows || []).filter((r) => Number(r.bonus) > 0);
    dc.eowAuto = !!w;
    dc.eowClosed = !!w;
    dc.eow = wins
      .map((r) => people.find((e) => (r.id != null && String(e.id) === String(r.id)) || normalizeKeySimple(fullName(e)) === normalizeKeySimple(r.name)))
      .filter(Boolean)
      .map(eowItem);
  }
  // ⚠️ Strikes de la semana (mensaje aparte): los de la semana cerrada en Pagos,
  // con los puestos o quitados a mano por el Jefe Aguila.
  function dcLoadStrikes() {
    const wk = isoOfDay(dc.sun);
    const next = isoOfDay(ascDay(dc.sun, 7));
    const w = STRIKE_HIST.find((x) => String(x.semana) === wk);
    dc.stClosed = !!w;
    const people = [...EMP_CLOUD.list, ...EMP_CLOUD.fired];
    dc.strikes = (w?.datos?.rows || [])
      .map((r) => {
        if (r.noPay) return null;
        const adj = strikeAdjFor(wk, r.id, r.name);
        const on = adj ? !!adj.s : !!r.strike;
        if (!on) return null;
        const e = people.find((x) => (r.id != null && String(x.id) === String(r.id)) || normalizeKeySimple(fullName(x)) === normalizeKeySimple(r.name));
        return {
          id: String(r.id ?? r.name),
          name: e ? fullName(e) : r.name,
          rank: r.rank || e?.rank || "",
          discord: String(e?.discord || e?.discordPrev || "").replace(/\D/g, ""),
          n: Math.max(1, strikesBefore(r.id, r.name, next)),
          reason: adj?.s ? adj.m || "puesto por la Jefatura" : r.strikeMotivo || strikeReason(Number(r.gross) || 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "es"));
  }
  const dcStText = () => strikesDiscordText(dc.strikes.filter((it) => dcOn(it, "s")), dc.sun, dc.stCierre);
  function renderStrikes() {
    const list = byId("emp-dc-st-list");
    if (!list) return;
    list.innerHTML = "";
    if (dc.err) return;
    if (!dc.stClosed) list.appendChild(mk("p", "muted emp-empty", "Esta semana aún no está cerrada en Pagos: ciérrala para ver sus strikes."));
    else if (!dc.strikes.length) list.appendChild(mk("p", "muted emp-empty", "✅ Nadie se llevó strike esta semana."));
    for (const it of dc.strikes) {
      const row = mk("div", "emp-dc-row");
      row.append(dcCheck("s", it, renderStrikePreview), mk("span", "emp-dc-who", it.name), dcBadge(it.rank), mk("span", `pg-strike emp-st${it.n >= STRIKE_MAX ? " max" : ""}`, `${it.n >= STRIKE_MAX ? "🚫" : "⚠️"} ${it.n}/${STRIKE_MAX}`), mk("span", "muted emp-small emp-dc-mot", it.reason));
      if (!it.discord) row.appendChild(noDiscord());
      list.appendChild(row);
    }
    renderStrikePreview();
  }
  function renderStrikePreview() {
    const t = dcStText();
    byId("emp-dc-st-prev").textContent = t || "No hay strikes que avisar esta semana.";
    byId("emp-dc-st-copy").disabled = !t;
  }
  byId("emp-dc-st-frase")?.addEventListener("click", () => {
    dc.stCierre = pickOne(STRIKE_CIERRES, dc.stCierre);
    renderStrikePreview();
  });
  byId("emp-dc-st-copy")?.addEventListener("click", async () => {
    const t = dcStText();
    if (!t) return;
    const ok = await copyText(t);
    if (!ok) openCopyFallback(t);
    else setStatus("✔ Strikes copiados. Pégalos en el canal de Discord.", true);
  });
  const dcFrasesEow = () => {
    const used = new Set();
    for (const it of dc.eow) {
      const free = EOW_FRASES.filter((f) => !used.has(f) && f !== it.frase);
      it.frase = pickOne(free.length ? free : EOW_FRASES);
      used.add(it.frase);
    }
  };
  const dcFrases = (keepUp = false) => {
    dcFrasesEow();
    if (!keepUp) {
      const mot = ascMotivosAzar(dc.items.length);
      dc.items.forEach((it, i) => (it.motivo = mot[i]));
    }
    for (const it of dc.desc) it.frase = pickOne((DESC_MOTIVOS.find((m) => m.k === it.motivo) || DESC_MOTIVOS[0]).f, it.frase);
    const used = new Set();
    for (const it of dc.bajas) {
      const pool = BAJA_FRASES[it.tipo] || BAJA_FRASES.otro;
      const free = pool.filter((f) => !used.has(f) && f !== it.frase);
      it.frase = pickOne(free.length ? free : pool);
      used.add(it.frase);
    }
  };
  function dcCheck(pre, it, after = renderDiscordPreview) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = dcOn(it, pre);
    cb.addEventListener("change", () => {
      if (cb.checked) dc.off.delete(`${pre}:${it.id}`);
      else dc.off.add(`${pre}:${it.id}`);
      after();
    });
    return cb;
  }
  const dcBadge = (r) => mk("span", `pg-badge ${empRankCls(r)}`, rankLabel(r) || "sin rango");
  function dcPath(from, to) {
    const path = mk("span", "emp-dc-path");
    path.append(dcBadge(from), mk("span", "emp-dc-arrow", "➜"), dcBadge(to));
    return path;
  }
  function dcSelect(opts, val, onChange) {
    const sel = document.createElement("select");
    sel.className = "emp-dc-sel";
    for (const [v, t] of opts) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      sel.append(o);
    }
    sel.value = val;
    sel.addEventListener("change", () => onChange(sel.value));
    return sel;
  }
  const noDiscord = () => mk("span", "muted emp-small", "· sin Discord: saldrá solo el nombre");
  async function renderDiscordTab(force = false) {
    const list = byId("emp-dc-list");
    if (!list) return;
    if (!dc.sun) dc.sun = ascDefaultWeek();
    const max = ascDefaultWeek();
    if (dc.sun > max) dc.sun = max;
    byId("emp-dc-week").textContent = `Semana del ${ascDM(dc.sun)} al ${ascDM(ascDay(dc.sun, 6))}`;
    byId("emp-dc-next").disabled = +dc.sun >= +max;
    const info = byId("emp-dc-info");
    const key = String(+dc.sun);
    if (dc.key !== key || force) {
      dc.key = key;
      dc.err = "";
      list.innerHTML = "";
      list.appendChild(mk("p", "muted emp-empty", "Buscando en el historial…"));
      try {
        const [items, r] = await Promise.all([ascensosSemana(dc.sun, [...EMP_CLOUD.list, ...EMP_CLOUD.fired]), descensosSemana(dc.sun, EMP_CLOUD.list, EMP_CLOUD.fired)]);
        if (dc.key !== key) return;
        dc.items = items;
        dc.desc = r.desc;
        dc.bajas = r.bajas;
        if (!STRIKE_HIST.length) await loadStrikeHist();
        dcLoadEow();
        dcLoadStrikes();
        dcFrases();
      } catch (err) {
        dc.items = [];
        dc.desc = [];
        dc.bajas = [];
        dc.err = err.message || String(err);
      }
      dc.off.clear();
    }
    list.innerHTML = "";
    if (dc.err) {
      info.textContent = "";
      list.appendChild(mk("p", "muted emp-empty", `No se pudo leer el historial: ${dc.err}`));
      renderStrikes();
      return renderDiscordPreview();
    }
    const nu = dc.items.length, nd = dc.desc.length, nb = dc.bajas.length;
    const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    info.textContent = `${pl(nu, "ascenso", "ascensos")}, ${pl(nd, "descenso", "descensos")} y ${pl(nb, "baja", "bajas")} · entre el ${ascDM(ascDay(dc.sun, 6))} y el ${ascDM(ascDay(dc.sun, 13))}`;
    if (!nu && !nd && !nb) list.appendChild(mk("p", "muted emp-empty", "No hay ascensos, descensos ni bajas para esta semana."));

    if (nu) list.appendChild(mk("div", "emp-dc-group", "📈 Ascensos"));
    for (const it of dc.items) {
      const row = mk("label", "emp-dc-row");
      row.append(dcCheck("u", it), mk("span", "emp-dc-who", it.name), dcPath(it.from, it.to), mk("span", "muted emp-small emp-dc-mot", it.motivo));
      if (!it.discord) row.appendChild(noDiscord());
      list.appendChild(row);
    }
    // 🏆 Empleado de la Semana (va después de los ascensos).
    list.appendChild(mk("div", "emp-dc-group", "🏆 Empleado de la Semana"));
    if (!dc.eowClosed) list.appendChild(mk("p", "muted emp-small emp-dc-note", "Esta semana aún no está cerrada en Pagos: elige tú quién es, o ciérrala para que salga solo."));
    for (const it of dc.eow) {
      const row = mk("div", "emp-dc-row");
      const quitar = btn("✕", "ghost emp-dc-x", "Quitar");
      quitar.addEventListener("click", () => {
        dc.eow = dc.eow.filter((x) => x !== it);
        renderDiscordTab();
      });
      row.append(dcCheck("e", it), mk("span", "emp-dc-who", `👑 ${it.name}`), mk("span", "muted emp-small emp-dc-mot", it.frase));
      if (!it.discord) row.appendChild(noDiscord());
      if (!dc.eowClosed || dc.eow.length > 1) row.insertBefore(quitar, row.children[2]);
      list.appendChild(row);
    }
    if (!dc.eow.length || !dc.eowClosed) {
      const add = dcSelect([["", dc.eow.length ? "➕ Añadir otro (empate)…" : "Elegir Empleado de la Semana…"], ...EMP_CLOUD.list.filter((e) => !dc.eow.some((x) => x.id === String(e.id))).sort(byRankThenName).map((e) => [String(e.id), `${fullName(e)} (${rankLabel(e.rank)})`])], "", (v) => {
        const e = EMP_CLOUD.list.find((x) => String(x.id) === v);
        if (!e) return;
        const it = eowItem(e);
        it.frase = pickOne(EOW_FRASES.filter((f) => !dc.eow.some((x) => x.frase === f)));
        dc.eow.push(it);
        renderDiscordTab();
      });
      const wrap = mk("div", "emp-dc-row");
      wrap.append(add);
      list.appendChild(wrap);
    }
    if (nd) list.appendChild(mk("div", "emp-dc-group", "📉 Descensos"));
    for (const it of dc.desc) {
      const row = mk("div", "emp-dc-row");
      const sel = dcSelect(DESC_MOTIVOS.map((m) => [m.k, m.label]), it.motivo, (v) => {
        it.motivo = v;
        it.frase = pickOne(DESC_MOTIVOS.find((m) => m.k === v).f);
        renderDiscordTab();
      });
      row.append(dcCheck("d", it), mk("span", "emp-dc-who", it.name), dcPath(it.from, it.to), sel, mk("span", "muted emp-small emp-dc-mot", it.frase));
      if (!it.discord) row.appendChild(noDiscord());
      list.appendChild(row);
    }
    if (nb) list.appendChild(mk("div", "emp-dc-group", "🚪 Bajas del taller"));
    for (const it of dc.bajas) {
      const row = mk("div", "emp-dc-row");
      const sel = dcSelect(BAJA_TIPOS.map((t) => [t.k, `${t.e} ${t.label}`]), it.tipo, (v) => {
        it.tipo = v;
        it.frase = pickOne(BAJA_FRASES[v] || BAJA_FRASES.otro);
        renderDiscordTab();
      });
      row.append(dcCheck("b", it), mk("span", "emp-dc-who", it.name), dcBadge(it.rank), sel);
      if (it.discord) {
        const ml = mk("span", "emp-dc-ment");
        const m = document.createElement("input");
        m.type = "checkbox";
        m.checked = it.mention !== false;
        m.title = "Si ya no está en el servidor de Discord, quítalo y saldrá su nombre";
        m.addEventListener("change", () => {
          it.mention = m.checked;
          renderDiscordPreview();
        });
        ml.append(m, " Mencionar");
        ml.addEventListener("click", (ev) => { if (ev.target !== m) m.click(); });
        row.append(ml);
      } else row.appendChild(noDiscord());
      row.append(mk("span", "muted emp-small emp-dc-mot", it.frase + (it.nota ? `  · Nota interna: ${it.nota}` : "")));
      list.appendChild(row);
    }
    renderDiscordPreview();
    renderStrikes();
  }
  const dcMove = (n) => {
    dc.sun = ascDay(dc.sun || ascDefaultWeek(), 7 * n);
    renderDiscordTab();
  };
  byId("emp-dc-prev-w")?.addEventListener("click", () => dcMove(-1));
  byId("emp-dc-next")?.addEventListener("click", () => dcMove(1));
  byId("emp-dc-frase")?.addEventListener("click", () => {
    dc.frase = ascFraseAzar(dc.frase);
    dc.cierre = pickOne(DESC_CIERRES, dc.cierre);
    dc.cierreB = pickOne(BAJAS_CIERRES, dc.cierreB);
    dcFrases();
    renderDiscordTab();
  });
  byId("emp-dc-copy")?.addEventListener("click", async () => {
    const t = dcText();
    if (!t) return;
    const ok = await copyText(t);
    if (!ok) openCopyFallback(t);
    else setStatus("✔ Mensaje copiado. Pégalo en el canal de Discord.", true);
  });

  function renderFired() {
    const box = byId("emp-fired");
    const list = byId("emp-fired-list");
    if (!box || !list) return;
    const fired = empCloudOn() || EMP_CLOUD.fired.length ? EMP_CLOUD.fired : [];
    byId("emp-tab-fired").hidden = !hasAccess();
    byId("emp-fired-n").textContent = fired.length ? String(fired.length) : "";
    list.innerHTML = "";
    if (!fired.length) list.appendChild(mk("p", "muted emp-empty", "No hay nadie en el registro de despedidos."));
    for (const f of fired) {
      const row = document.createElement("div");
      row.className = "emp-fired-row";
      const when = f.firedAt ? new Date(f.firedAt).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      const info = document.createElement("div");
      info.className = "emp-fired-info";
      const head = document.createElement("div");
      const b = document.createElement("b");
      b.textContent = fullName(f);
      head.append(b);
      if (f.rank) head.append(` · ${rankLabel(f.rank)}`);
      const meta = document.createElement("div");
      meta.className = "muted";
      meta.textContent = `🚪 ${when}${f.firedBy ? ` · por ${f.firedBy}` : ""}`;
      info.append(head, meta);
      if (f.firedReason) {
        const why = document.createElement("div");
        why.className = "emp-fired-why";
        why.textContent = `Motivo: ${f.firedReason}`;
        info.append(why);
      }
      const acts = document.createElement("div");
      acts.className = "emp-fired-acts";
      const back = document.createElement("button");
      back.type = "button";
      back.className = "ghost";
      back.textContent = "Readmitir";
      if (isTopRank(f.rank) && !AUTH.aguila) {
        back.disabled = true;
        back.title = "Solo el Jefe Aguila puede readmitir ese rango";
      }
      back.addEventListener("click", async () => {
        const ch = await askReadmit(f);
        if (!ch) return;
        if (isTopRank(ch.rank) && !AUTH.aguila) return alert("Solo el Jefe Aguila puede dar ese rango.");
        try {
          await empCloudReadmit(f, ch);
          await refresh();
          await (onChanged?.());
        } catch (err) {
          alert(`No se pudo readmitir: ${empFireError(err)}`);
        }
      });
      acts.append(back);
      if (AUTH.aguila) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "danger";
        del.textContent = "Borrar registro";
        del.title = "Borra a esta persona por completo (solo para errores o duplicados)";
        del.addEventListener("click", async () => {
          if (!confirm(`¿Borrar por completo a ${fullName(f)} del registro? No se puede deshacer.`)) return;
          try {
            await deleteEmployee(f.id, adminPass);
            await refresh();
          } catch (err) {
            alert(String(err?.message || err || "Error"));
          }
        });
        acts.append(del);
      }
      row.append(info, acts);
      list.appendChild(row);
    }
  }

  async function refresh() {
    try {
      if (EMP_CLOUD.tried) await empCloudLoad();
      if (hasAccess()) await loadStrikeHist();
      applyMode();
      employees = await listEmployees();
      employees.sort(byRankThenName);
      renderAll();
    } catch {
      alert("No se pudieron cargar los empleados.");
      return;
    }
    // Inactividad: se lee en segundo plano y se repinta al llegar.
    if (hasAccess() && empCloudOn()) inactLoad().then((ok) => ok && modal.open && renderAll());
  }

  byId("emp-admin-unlock").addEventListener("click", () => {
    const p = String(passInput.value || "");
    if (!p) {
      setStatus("Escribe la contrasena.");
      return;
    }
    if (!unlockAccess(p)) {
      unlocked = false;
      adminPass = "";
      setStatus("Contrasena incorrecta.");
      return;
    }
    unlocked = true;
    adminPass = p;
    setStatus("Desbloqueado", true);
  });

  byId("emp-new-add").addEventListener("click", async () => {
    const name = String(nameInput.value || "").trim();
    const surname = String(surInput.value || "").trim();
    const rank = String(rankInput.value || "").trim();
    const discord = parseDiscordId(discordInput?.value);
    const iban = parseIban(ibanInput?.value);

    if (!name || !surname) {
      alert("Pon Nombre y Apellido.");
      return;
    }
    if (discord === null) {
      alert("El ID de Discord no es valido. Es un numero de 17 a 20 cifras (o dejalo vacio).");
      return;
    }
    if (iban === null) {
      alert("El IBAN no es valido. Es una letra y 6 numeros, como J739745 (o dejalo vacio).");
      return;
    }
    if (!unlocked) {
      alert("Primero desbloquea con la contrasena.");
      return;
    }
    if (isTopRank(rank) && !AUTH.aguila) {
      alert(`Solo el Jefe Aguila puede dar el rango ${rankLabel(rank)}.`);
      return;
    }
    const wasFired = EMP_CLOUD.fired.find((f) => normalizeKeySimple(fullName(f)) === normalizeKeySimple(`${name} ${surname}`));
    if (wasFired) {
      alert(`${fullName(wasFired)} está en el registro de despedidos. Para volver a contratarle, pulsa «Readmitir» en la lista de Despedidos (así conserva su historial).`);
      return;
    }
    try {
      const altaIn = byId("emp-new-alta");
      const contIn = byId("emp-new-contrato");
      const altaAt = (EMP_CLOUD.hasDates && altaIn?.value) || empToday();
      const contratadoAt = (EMP_CLOUD.hasDates && contIn?.value) || altaAt;
      if (contratadoAt < altaAt) return alert("La fecha de contratación no puede ser anterior a la de ingreso al taller.");
      if (empCloudOn()) {
        await addEmployee({ name, surname, rank, discord, iban, altaAt, contratadoAt }, adminPass);
      } else {
        await addEmployee({ name, surname, rank }, adminPass);
        if (discord) setEmployeeDiscord(`${name} ${surname}`, discord);
        if (iban) setEmployeeIban(`${name} ${surname}`, iban);
      }
      if (discordInput) discordInput.value = "";
      if (ibanInput) ibanInput.value = "";
      if (altaIn) altaIn.value = empToday();
      if (contIn) contIn.value = empToday();
      setStatus(`✔ ${name} ${surname} añadido${discord ? " con su Discord" : ""}${iban ? `${discord ? " e" : " con su"} IBAN` : ""}.`, true);
      nameInput.value = "";
      surInput.value = "";
      rankInput.value = "";
      await refresh();
      await (onChanged?.());
    } catch (err) {
      alert(String(err?.message || err || "Error"));
    }
  });

  byId("emp-refresh").addEventListener("click", refresh);

  searchInput.addEventListener("input", renderList);

  modal.addEventListener("close", () => {
  });
  modal.addEventListener("cancel", () => {
  });

  modal.addEventListener("aguila-open", refresh);

  refresh();
}
