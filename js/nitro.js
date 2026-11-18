// ============================================================================
// Aguila Motors · Licencias de nitro (v151, SQL 20).
// Sección «⚡ Licencias de nitro» del Panel del Jefe: asignar, retirar,
// registrar donaciones, historial y normas. Cada cambio avisa al bot (función
// log-empleados con { nitro: true }), que edita los 4 mensajes del canal.
// Solo el Jefe Aguila cambia; la Jefatura lo ve en la ficha de cada empleado.
// ============================================================================

const NITRO = { ok: null, lic: [], don: [], movs: [], normas: null, at: 0, busy: null, timer: 0, last: "" };
const NITRO_NORMAS_DEF = [
  "🔒 La licencia es **personal**: no se presta ni se comparte.",
  "🤫 Las instalaciones se hacen **solo en la trastienda**.",
  "🧾 Toda instalación se **factura** como «Instalación de Nitro» ({precio}).",
  "⛔ Mal uso, filtración o no facturar = **retirada de la licencia**.",
  "🔁 La asigna y la retira el **Jefe Aguila**, solo a personal de confianza. Si el titular deja el taller, la licencia **vuelve a la {jefatura}**.",
];

async function nitroLoad(force = false) {
  if (!hasAccess()) return NITRO;
  if (NITRO.busy) return NITRO.busy;
  if (!force && NITRO.ok && Date.now() - NITRO.at < 60000) return NITRO;
  NITRO.busy = (async () => {
    try {
      const q = (p) => cvCloud.req(`/rest/v1/${p}`, { auth: true });
      const [lic, don, movs, set] = await Promise.all([
        q("nitro_licencias?select=*&order=n.asc"),
        q("nitro_donaciones?select=*&order=fecha.asc,id.asc"),
        q("nitro_movs?select=*&order=fecha.asc,id.asc"),
        q("app_settings?select=value&key=eq.nitro_normas").catch(() => []),
      ]);
      Object.assign(NITRO, { ok: true, lic: lic || [], don: don || [], movs: movs || [], normas: Array.isArray(set?.[0]?.value) ? set[0].value : null, at: Date.now() });
    } catch (err) {
      NITRO.ok = /PGRST205|42P01|does not exist|404/.test(String(err?.message || err)) ? false : NITRO.ok;
      NITRO.err = err?.message || String(err);
    } finally {
      NITRO.busy = null;
      document.dispatchEvent(new CustomEvent("aguila-nitro"));
    }
    return NITRO;
  })();
  return NITRO.busy;
}

const nitroOf = (empId) => NITRO.lic.find((l) => l.employee_id && String(l.employee_id) === String(empId)) || null;
function nitroPrecio() {
  try {
    const p = getAllProducts().find((x) => normalizeKeySimple(x.name).includes("instalacion de nitro"));
    return Number(p?.price) || 0;
  } catch {
    return 0;
  }
}
const nitroNormas = () => (NITRO.normas && NITRO.normas.length ? NITRO.normas : NITRO_NORMAS_DEF);

// Avisa al bot (juntando los cambios de 1,5 s).
function nitroPush(limpiar = false) {
  if (!hasAccess() || NITRO.ok === false) return Promise.resolve(null);
  clearTimeout(NITRO.timer);
  return new Promise((resolve, reject) => {
    NITRO.timer = setTimeout(async () => {
      try {
        const j = await logEmpCall({ nitro: true, limpiar, precioNitro: nitroPrecio(), normas: nitroNormas() });
        NITRO.last = new Date().toISOString();
        document.dispatchEvent(new CustomEvent("aguila-nitro"));
        resolve(j);
      } catch (err) {
        if (!limpiar) toastLogEmp(`⚠ No se pudo actualizar el canal de nitro: ${err.message || err}`);
        reject(err);
      }
    }, limpiar ? 0 : 1500);
  });
}
// Si cambia algo de un titular (rango, nombre, despido), el canal se actualiza.
function nitroTouch(ids) {
  if (NITRO.ok !== true) return;
  if (ids.some((id) => NITRO.lic.some((l) => String(l.employee_id) === String(id)) || NITRO.movs.some((m) => String(m.employee_id) === String(id)))) {
    nitroLoad(true).then(() => nitroPush());
  }
}

async function nitroMov(row) {
  await cvCloud.req("/rest/v1/nitro_movs", { method: "POST", auth: true, headers: { Prefer: "return=minimal" }, body: [{ fecha: empToday(), ...row }] });
}
async function nitroSetLic(n, employee_id) {
  await cvCloud.req(`/rest/v1/nitro_licencias?n=eq.${Number(n)}`, {
    method: "PATCH",
    auth: true,
    headers: { Prefer: "return=minimal" },
    body: { employee_id: employee_id ? String(employee_id) : null, asignada_at: employee_id ? empToday() : null },
  });
}
const nitroEmp = (id) => EMP_CLOUD.list.find((e) => String(e.id) === String(id)) || EMP_CLOUD.fired.find((e) => String(e.id) === String(id)) || null;
const nitroName = (id, fallback = "—") => {
  const e = nitroEmp(id);
  return e ? fullName(e) : fallback;
};
const nitroDate = (iso) => (iso ? empDate(String(iso).slice(0, 10)) : "—");
const nitroEur = (v) => `${Number(v || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;

function nitroMovText(m) {
  const who = nitroName(m.employee_id, m.nombre || "—");
  if (m.tipo === "compra") return `➕ Adquirida 1 licencia${m.texto ? ` ${m.texto}` : ""}`;
  if (m.tipo === "donacion") return `➕ Compradas ${m.texto || "licencias nuevas"}`;
  if (m.tipo === "asigna") return `✅ Licencia ${m.n} asignada a ${who}`;
  if (m.tipo === "retira") return `✖️ Licencia ${m.n} retirada a ${who}${m.texto ? ` · ${m.texto}` : ""}`;
  if (m.tipo === "devuelta") return `🔁 Licencia ${m.n} devuelta · ${who}${m.texto ? ` (${m.texto})` : ""}`;
  return m.texto || "";
}

// ------------------------------------------------------------- Panel ---
function setupNitro() {
  const root = document.getElementById("jp-nitro");
  if (!root) return;
  const mk = (tag, cls = "", text = "") => {
    const x = document.createElement(tag);
    if (cls) x.className = cls;
    if (text) x.textContent = text;
    return x;
  };
  const btn = (text, cls = "ghost") => {
    const b = mk("button", cls, text);
    b.type = "button";
    return b;
  };
  let showDon = false;
  let editNormas = false;
  let msg = "";

  const guard = async (fn, ok) => {
    try {
      empCloudRequireSession();
      if (!AUTH.aguila) throw new Error("Solo el Jefe Aguila puede cambiar las licencias de nitro.");
      await fn();
      await nitroLoad(true);
      msg = ok || "";
      render();
      nitroPush().catch(() => {});
    } catch (err) {
      alert(`No se pudo guardar: ${err.message || err}`);
      render();
    }
  };

  function empSelect(exclude) {
    const sel = mk("select", "text-input nitro-sel");
    sel.appendChild(new Option("Elegir empleado…", ""));
    const taken = new Set(NITRO.lic.filter((l) => l.employee_id).map((l) => String(l.employee_id)));
    const list = EMP_CLOUD.list.slice().sort((a, b) => rankOrder(b.rank) - rankOrder(a.rank) || fullName(a).localeCompare(fullName(b), "es"));
    for (const e of list) {
      if (taken.has(String(e.id)) && String(e.id) !== String(exclude || "")) continue;
      sel.appendChild(new Option(`${fullName(e)} · ${rankLabel(e.rank) || "sin rango"}`, String(e.id)));
    }
    return sel;
  }

  function render() {
    root.textContent = "";
    const head = mk("div", "nitro-head");
    head.appendChild(mk("h3", "", "⚡ Licencias de nitro"));
    const st = mk("span", "muted nitro-st");
    head.appendChild(st);
    if (NITRO.ok === false) {
      root.appendChild(head);
      root.appendChild(mk("p", "muted jp-small", "Para usar esta sección, ejecuta en Supabase el SQL 20_nitro.sql y vuelve a desplegar la función log-empleados (paso 18)."));
      return;
    }
    if (!NITRO.ok) {
      root.appendChild(head);
      root.appendChild(mk("p", "muted jp-small", NITRO.err ? `No se pudieron cargar las licencias: ${NITRO.err}` : "Cargando…"));
      return;
    }
    const can = !!AUTH.aguila;
    const sync = btn("📋 Sincronizar canal");
    sync.title = "Borra los mensajes de nitro escritos a mano y publica los 4 del bot, en orden";
    sync.addEventListener("click", async () => {
      if (!confirm("¿Poner al día el canal de licencias de nitro?\n\n• Borra los mensajes escritos a mano (inversiones, asignación, normas e historial) y los anteriores del bot.\n• Publica los 4 mensajes del bot en orden.\n• No menciona a nadie.")) return;
      sync.disabled = true;
      st.textContent = "Publicando en Discord…";
      try {
        const j = await nitroPush(true);
        msg = `✔ Canal al día: ${j.publicados} publicados${j.borrados ? ` · ${j.borrados} mensajes viejos borrados` : ""}${j.sinPermiso ? ` · ⚠ ${j.sinPermiso} no se pudieron borrar (falta «Gestionar mensajes»)` : ""}${j.errores?.length ? ` · ⚠ ${j.errores[0]}` : ""}`;
      } catch (err) {
        msg = `⚠ ${err.message || err}`;
      }
      render();
    });
    if (can) head.appendChild(sync);
    st.textContent = msg || (NITRO.last ? `● Canal actualizado ${new Date(NITRO.last).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : "");
    st.classList.toggle("ok", /^(✔|●)/.test(st.textContent));
    root.appendChild(head);

    const total = NITRO.don.reduce((a, d) => a + Number(d.importe || 0), 0);
    const asig = NITRO.lic.filter((l) => l.employee_id).length;
    const kp = mk("div", "nitro-kpis");
    for (const [v, t, c] of [[NITRO.lic.length, "licencias del taller", ""], [asig, asig === 1 ? "asignada" : "asignadas", "ok"], [NITRO.lic.length - asig, NITRO.lic.length - asig === 1 ? "libre" : "libres", "free"], [nitroEur(total), `invertidos · ${NITRO.don.length} ${NITRO.don.length === 1 ? "donación" : "donaciones"}`, ""]]) {
      const k = mk("div", "nitro-k " + c);
      k.append(mk("b", "", String(v)), mk("span", "", t));
      kp.appendChild(k);
    }
    root.appendChild(kp);

    const grid = mk("div", "nitro-grid");
    const left = mk("div");
    const right = mk("div");
    grid.append(left, right);
    root.appendChild(grid);

    // Asignación
    left.appendChild(mk("h4", "", "Asignación actual"));
    for (const l of NITRO.lic) {
      const row = mk("div", "nitro-lic" + (l.principal ? " pr" : "") + (l.employee_id ? "" : " free"));
      row.appendChild(mk("span", "n", l.principal ? "👑" : l.employee_id ? "⚡" : "⏳"));
      const w = mk("div", "w");
      w.appendChild(mk("b", "", `Licencia ${l.n}${l.principal ? " · Principal" : ""}`));
      const sm = mk("small");
      if (l.employee_id) {
        const e = nitroEmp(l.employee_id);
        sm.append(nitroName(l.employee_id, "Empleado borrado"));
        if (e?.rank) sm.appendChild(mk("span", `pg-badge ${empRankCls(e.rank)} nitro-b`, rankLabel(e.rank)));
        sm.append(` · desde ${nitroDate(l.asignada_at)}${l.principal ? " · fija" : ""}`);
      } else sm.textContent = "Por asignar";
      w.appendChild(sm);
      row.appendChild(w);
      if (can && !l.principal) {
        if (l.employee_id) {
          const ch = btn("🔁 Cambiar");
          const rt = btn("✖ Retirar", "ghost nitro-red");
          ch.addEventListener("click", () => {
            const sel = empSelect(l.employee_id);
            const ok = btn("Guardar", "primary");
            const no = btn("Cancelar");
            ch.replaceWith(sel);
            rt.replaceWith(ok);
            row.appendChild(no);
            no.addEventListener("click", render);
            ok.addEventListener("click", () => {
              if (!sel.value || sel.value === String(l.employee_id)) return render();
              const prev = l.employee_id;
              guard(async () => {
                await nitroSetLic(l.n, sel.value);
                await nitroMov({ tipo: "retira", n: l.n, employee_id: prev, nombre: nitroName(prev), texto: "cambio de titular" });
                await nitroMov({ tipo: "asigna", n: l.n, employee_id: sel.value, nombre: nitroName(sel.value) });
              }, `✔ Licencia ${l.n} pasa a ${nitroName(sel.value)}`);
            });
          });
          rt.addEventListener("click", () => {
            const motivo = prompt(`¿Retirar la licencia ${l.n} a ${nitroName(l.employee_id)}?\n\nMotivo (opcional, sale en el historial):`, "");
            if (motivo === null) return;
            const prev = l.employee_id;
            guard(async () => {
              await nitroSetLic(l.n, null);
              await nitroMov({ tipo: "retira", n: l.n, employee_id: prev, nombre: nitroName(prev), texto: motivo.trim().slice(0, 120) || null });
            }, `✔ Licencia ${l.n} retirada`);
          });
          row.append(ch, rt);
        } else {
          const sel = empSelect();
          const ok = btn("Asignar", "primary");
          ok.addEventListener("click", () => {
            if (!sel.value) return alert("Elige a quién se la das.");
            guard(async () => {
              await nitroSetLic(l.n, sel.value);
              await nitroMov({ tipo: "asigna", n: l.n, employee_id: sel.value, nombre: nitroName(sel.value) });
            }, `✔ Licencia ${l.n} asignada a ${nitroName(sel.value)}`);
          });
          row.append(sel, ok);
        }
      }
      left.appendChild(row);
    }
    left.appendChild(mk("p", "muted jp-small", "🔁 Si despides al titular, su licencia vuelve sola a «Por asignar» y queda en el historial. El rango no cambia nada: las asignas y retiras tú."));

    // Donaciones
    const dh = mk("h4", "nitro-h4b", "Donaciones");
    if (can) {
      const add = btn(showDon ? "Cancelar" : "➕ Registrar donación");
      add.addEventListener("click", () => {
        showDon = !showDon;
        render();
      });
      dh.appendChild(add);
    }
    left.appendChild(dh);
    NITRO.don.forEach((d, i) => {
      const r = mk("div", "nitro-don");
      r.append(mk("b", "", `nº${i + 1}`), mk("span", "", `${nitroDate(d.fecha)} · ${d.licencias} ${Number(d.licencias) === 1 ? "licencia" : "licencias"}${d.por_id ? ` · por ${nitroName(d.por_id)}` : ""}`), mk("strong", "", nitroEur(d.importe)));
      left.appendChild(r);
    });
    if (!NITRO.don.length) left.appendChild(mk("p", "muted jp-small", "Todavía no hay donaciones."));
    if (can && showDon) {
      const f = mk("div", "nitro-form");
      const field = (label, input) => {
        const l = mk("label");
        l.append(mk("span", "", label), input);
        return l;
      };
      const fd = mk("input", "text-input");
      fd.type = "date";
      fd.value = empToday();
      const fi = mk("input", "text-input");
      fi.type = "number";
      fi.min = "0";
      fi.step = "0.01";
      fi.placeholder = "50";
      const fl = mk("input", "text-input");
      fl.type = "number";
      fl.min = "1";
      fl.step = "1";
      fl.value = "1";
      const fp = empSelect();
      fp.querySelector("option").textContent = "Quién la hace…";
      const me = EMP_CLOUD.list.find((e) => normalizeKeySimple(e.rank) === normalizeKeySimple("Jefe Aguila"));
      if (me) {
        if (![...fp.options].some((o) => o.value === String(me.id))) fp.appendChild(new Option(`${fullName(me)} · ${rankLabel(me.rank)}`, String(me.id)));
        fp.value = String(me.id);
      }
      const save = btn("Guardar", "primary");
      f.append(field("Fecha", fd), field("Importe (€)", fi), field("Licencias compradas", fl), field("Realizada por", fp), save);
      left.appendChild(f);
      const nNext = NITRO.lic.reduce((a, l) => Math.max(a, Number(l.n) || 0), 0) + 1;
      const hint = mk("p", "muted jp-small", "");
      const upd = () => {
        const k = Math.max(1, Math.round(Number(fl.value) || 1));
        hint.textContent = `Al guardar: se ${k === 1 ? "crea la «Licencia" : "crean las «Licencias"} ${k === 1 ? nNext : `${nNext} a ${nNext + k - 1}`} · Por asignar», sube el total y se apunta en el historial.`;
      };
      fl.addEventListener("input", upd);
      upd();
      left.appendChild(hint);
      save.addEventListener("click", () => {
        const imp = Number(fi.value);
        const k = Math.round(Number(fl.value));
        if (!fd.value) return alert("Pon la fecha.");
        if (!(imp > 0)) return alert("Pon el importe en euros.");
        if (!(k >= 1 && k <= 20)) return alert("Las licencias compradas tienen que ser entre 1 y 20.");
        guard(async () => {
          await cvCloud.req("/rest/v1/nitro_donaciones", { method: "POST", auth: true, headers: { Prefer: "return=minimal" }, body: [{ fecha: fd.value, importe: imp, licencias: k, por_id: fp.value || null }] });
          await cvCloud.req("/rest/v1/nitro_licencias", { method: "POST", auth: true, headers: { Prefer: "return=minimal" }, body: Array.from({ length: k }, (_, i) => ({ n: nNext + i, employee_id: null, asignada_at: null, principal: false })) });
          await nitroMov({ fecha: fd.value, tipo: "donacion", texto: `${k} ${k === 1 ? "licencia nueva" : "licencias nuevas"} (${nitroEur(imp)})` });
          showDon = false;
        }, `✔ Donación registrada · ${k === 1 ? "1 licencia nueva" : `${k} licencias nuevas`}`);
      });
    }

    // Historial
    right.appendChild(mk("h4", "", "Historial de movimientos"));
    const hist = mk("div", "nitro-hist");
    for (const m of NITRO.movs.slice().reverse()) {
      const r = mk("div");
      r.append(mk("code", "", nitroDate(m.fecha)), nitroMovText(m));
      hist.appendChild(r);
    }
    if (!NITRO.movs.length) hist.appendChild(mk("p", "muted jp-small", "Sin movimientos."));
    right.appendChild(hist);
    if (NITRO.movs.length > 25) right.appendChild(mk("p", "muted jp-small", "En Discord salen los últimos 25; aquí, todos."));

    // Normas
    const nh = mk("h4", "nitro-h4b", "Normas");
    if (can) {
      const ed = btn(editNormas ? "Cancelar" : "✏️ Editar");
      ed.addEventListener("click", () => {
        editNormas = !editNormas;
        render();
      });
      nh.appendChild(ed);
    }
    right.appendChild(nh);
    const precio = nitroPrecio();
    const fill = (t) => t.replace(/\{precio\}/g, precio ? `$${precio.toLocaleString("es-ES")}` : "$35.000").replace(/\{jefatura\}/g, "@Jefatura");
    if (editNormas && can) {
      const ta = mk("textarea", "text-input nitro-ta");
      ta.value = nitroNormas().join("\n");
      ta.rows = 7;
      right.appendChild(ta);
      right.appendChild(mk("p", "muted jp-small", "Una norma por línea. {precio} pone el precio de «Instalación de Nitro» de la lista de precios; {jefatura} etiqueta al rol de Jefatura. **texto** sale en negrita."));
      const acts = mk("div", "nitro-acts");
      const sv = btn("Guardar normas", "primary");
      const rs = btn("Restaurar las de siempre");
      sv.addEventListener("click", () => {
        const lines = ta.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12);
        if (!lines.length) return alert("Escribe al menos una norma.");
        guard(async () => {
          await cvCloud.upsert("app_settings", [{ key: "nitro_normas", value: lines }], "key");
          editNormas = false;
        }, "✔ Normas guardadas");
      });
      rs.addEventListener("click", () => (ta.value = NITRO_NORMAS_DEF.join("\n")));
      acts.append(sv, rs);
      right.appendChild(acts);
    } else {
      const ul = mk("div", "nitro-rules");
      for (const t of nitroNormas()) {
        const r = mk("div");
        // **negrita** → <b> sin usar innerHTML con texto ajeno.
        fill(t).split(/(\*\*[^*]+\*\*)/).forEach((part) => {
          if (/^\*\*[^*]+\*\*$/.test(part)) r.appendChild(mk("b", "", part.slice(2, -2)));
          else if (part) r.append(part);
        });
        ul.appendChild(r);
      }
      right.appendChild(ul);
      right.appendChild(mk("p", "muted jp-small", `El precio sale de la lista de precios${precio ? ` (ahora $${precio.toLocaleString("es-ES")})` : ""}: si lo cambias, el canal se actualiza solo.`));
    }
  }

  document.addEventListener("aguila-nitro", () => {
    if (root.isConnected) render();
  });
  const sec = document.getElementById("tab-jefe");
  let was = false;
  new MutationObserver(() => {
    const on = sec.classList.contains("is-active");
    if (on && !was) nitroLoad(true);
    was = on;
  }).observe(sec, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("aguila-auth", () => {
    if (hasAccess()) nitroLoad(true);
  });
  render();
}
