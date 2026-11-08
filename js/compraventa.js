// Aguila Motors · Compraventa: log de transacciones, almacén y catálogo con márgenes.
// (compraventa.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Modulo de Compraventa
// ----------------------------------------------------------------------------
// Lee el log "Transaccion de vehiculo" (Mediador, Dueno, Comprador, Precio,
// Vehiculo + matricula, Empresa). La empresa aparece como "society_..."
// (society_aguilamotor = Aguila Motors). Si la empresa compra, el dinero sale
// de la caja de la sociedad; si vende, entra. El almacen son los vehiculos cuyo
// ultimo movimiento es una compra de la empresa. El encargado procesa el log y
// lo publica en datos.js para que todos lo vean; las fotos se guardan
// comprimidas y solo se publican las de los vehiculos en existencia.
// ============================================================================
const CV_STORAGE_KEY = "aguila_compraventa_v1";
const CV_SOCIETY_NAMES = { society_aguilamotor: "Aguila Motors" };

function cvIsSociety(name) {
  return /^society_/i.test(String(name || "").trim());
}

function cvDisplayName(name) {
  const n = String(name || "").trim();
  if (!n) return "-";
  return CV_SOCIETY_NAMES[n.toLowerCase()] || n;
}

function cvLoadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(CV_STORAGE_KEY) || "null");
    if (raw && Array.isArray(raw.tx)) return { tx: raw.tx, photos: raw.photos && typeof raw.photos === "object" ? raw.photos : {} };
  } catch {
    // sin almacenamiento
  }
  return { tx: [], photos: {} };
}

function cvSaveLocal(data) {
  try {
    localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Lo que se ve: lo publicado (solo lectura) o lo de esta PC (encargado o sin publicar).
function cvSource() {
  if (isSharedReadOnly()) return SHARED_DATA.compraventa || { tx: [], photos: {} };
  return cvLoadLocal();
}

function cvNormalizeShared(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tx)) return { tx: [], photos: {} };
  return { tx: raw.tx, photos: raw.photos && typeof raw.photos === "object" ? raw.photos : {} };
}

// Fecha "dd/mm/aaaa hh:mm" -> clave ordenable "aaaammddhhmm".
function cvSortKey(ts) {
  const m = String(ts || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${m[3]}${p(m[2])}${p(m[1])}${p(m[4])}${m[5]}`;
}

function cvParseLog(text) {
  const out = [];
  let cur = null;
  let ts = "";
  const pad = (n) => String(n).padStart(2, "0");
  const clean = (v) =>
    String(v || "")
      .replace(/\*\*/g, "")
      .replace(/^[^\p{L}\p{N}_]+/u, "")
      .replace(/\bchar\d+:\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  // Cada dato del log va separado por 2+ espacios (texto pegado) o entre
  // comillas invertidas (`...`). Asi una matricula con espacio ("3Y5A 0F1")
  // queda entera. Se descartan el emoji y el "char1:..." del personaje.
  const pieces = (v) =>
    String(v || "")
      .replace(/\*\*/g, "")
      .split(/`|\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s && /[\p{L}\p{N}]/u.test(s) && !/^char\d+:/i.test(s));
  const push = () => {
    if (cur && cur.plate) out.push(cur);
    cur = null;
  };
  // Etiqueta sola en su linea ("Mediador:" y el valor debajo, como sale a veces
  // al copiar recuadros de Discord): se juntan en una linea.
  const RE_CV_LABEL = /^\s*(Mediador|Due[ñn]o|Comprador|Precio|Veh[ií]culo|Empresa)\s*:?\s*$/i;
  const rawLines = String(text || "").split(/\r?\n/);
  const joined = [];
  for (let i = 0; i < rawLines.length; i++) {
    const lab = rawLines[i].replace(/\*\*/g, "").match(RE_CV_LABEL);
    const next = rawLines[i + 1];
    if (lab && next != null && next.trim() && !RE_CV_LABEL.test(next.replace(/\*\*/g, ""))) {
      joined.push(`${lab[1]}: ${next.trim()}`);
      i++;
    } else joined.push(rawLines[i]);
  }
  for (const rawLine of joined) {
    const line = rawLine.replace(/\*\*/g, "").trim();
    if (!line) continue;
    // Cabecera del mensaje de Discord con la fecha.
    let d = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})/);
    if (d && !/:\s*\S/.test(line.replace(/\d{1,2}:\d{2}/, ""))) {
      ts = `${pad(d[1])}/${pad(d[2])}/${d[3]} ${pad(d[4])}:${d[5]}`;
      continue;
    }
    // "Hoy a las 08:36", "Ayer a las 08:36" o solo "— 08:36" (mensajes de hoy).
    d = line.match(/(hoy|ayer) a las (\d{1,2}):(\d{2})/i) || line.match(/(?:^|—)\s*()(\d{1,2}):(\d{2})\s*$/);
    if (d && !/^(Mediador|Due|Comprador|Precio|Veh|Empresa)/i.test(line)) {
      const day = new Date();
      if (/ayer/i.test(d[1] || "")) day.setDate(day.getDate() - 1);
      ts = `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()} ${pad(d[2])}:${d[3]}`;
      continue;
    }
    if (/^[^\p{L}]*transacci[oó]n de veh[ií]culo/iu.test(line)) {
      push();
      cur = { ts, mediator: "", owner: "", buyer: "", price: 0, model: "", plate: "", company: "" };
      continue;
    }
    if (!cur) continue;
    const m = line.match(/^(Mediador|Due[ñn]o|Comprador|Precio|Veh[ií]culo|Empresa)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = normalizeKeySimple(m[1]);
    const parts = pieces(m[2]);
    const val = clean(parts.length ? parts.join(" ") : m[2]);
    if (key.startsWith("mediador")) cur.mediator = val;
    else if (key.startsWith("due")) cur.owner = val;
    else if (key.startsWith("comprador")) cur.buyer = val;
    else if (key.startsWith("precio")) cur.price = Number(val.replace(/[^\d]/g, "")) || 0;
    else if (key.startsWith("empresa")) cur.company = val;
    else if (parts.length > 1) {
      // Modelo y matricula vienen como datos separados: el ultimo es la matricula.
      cur.plate = clean(parts[parts.length - 1]).toUpperCase();
      cur.model = clean(parts.slice(0, -1).join(" "));
    } else {
      // Todo junto (sin separacion clara): la ultima palabra es la matricula.
      const words = val.split(" ");
      const last = words[words.length - 1] || "";
      if (words.length > 1 && /^[A-Z0-9]{3,8}$/i.test(last)) {
        cur.plate = last.toUpperCase();
        cur.model = words.slice(0, -1).join(" ");
      } else {
        cur.plate = val.toUpperCase();
        cur.model = val;
      }
    }
  }
  push();
  // Los mensajes sin fecha al inicio del pegado van antes de la primera fecha.
  const firstKey = out.map((t) => cvSortKey(t.ts)).find(Boolean) || "";
  for (const t of out) t.sort = cvSortKey(t.ts) || firstKey;
  return out;
}

// Modelo y matricula van juntos en la firma: si antes se partieron mal
// ("PANTO 3Y5A" + "0F1"), al volver a pegar el log se reconoce y se corrige.
const cvSig = (t) => [t.mediator, t.owner, t.buyer, t.price, `${t.model} ${t.plate}`].map((x) => normalizeKeySimple(String(x))).join("|");

// Mezcla sin duplicar: pegar el mismo log dos veces no repite nada.
function cvMerge(data, incoming) {
  const used = new Set();
  let added = 0;
  let fixed = 0;
  let seq = data.tx.reduce((m, t) => Math.max(m, t.seq || 0), 0);
  for (const t of incoming) {
    const sig = cvSig(t);
    let match = data.tx.find((e, i) => !used.has(i) && cvSig(e) === sig && (e.ts || "") === (t.ts || ""));
    if (!match && t.ts) {
      match = data.tx.find((e, i) => !used.has(i) && cvSig(e) === sig && !e.ts);
      if (match) {
        match.ts = t.ts;
        match.sort = t.sort;
      }
    }
    if (match) {
      if (match.plate !== t.plate || match.model !== t.model) {
        // Corrige la matricula de un registro antiguo (y su foto, si la tenia).
        if (data.photos[match.plate] && !data.photos[t.plate]) {
          data.photos[t.plate] = data.photos[match.plate];
          delete data.photos[match.plate];
        }
        match.plate = t.plate;
        match.model = t.model;
        fixed++;
      }
      used.add(data.tx.indexOf(match));
      continue;
    }
    data.tx.push({ ...t, seq: ++seq });
    used.add(data.tx.length - 1);
    added++;
  }
  data.tx.sort((a, b) => (a.sort || "").localeCompare(b.sort || "") || a.seq - b.seq);
  data.lastFixed = fixed;
  return added;
}

function cvKind(t) {
  const b = cvIsSociety(t.buyer);
  const o = cvIsSociety(t.owner);
  if (b && !o) return "compra";
  if (o && !b) return "venta";
  return "traspaso";
}

// Ultimo movimiento de cada matricula: si fue una compra de la empresa, esta en el almacen.
function cvStock(tx) {
  const last = new Map();
  for (const t of tx) last.set(t.plate, t);
  return [...last.values()].filter((t) => cvKind(t) === "compra").reverse();
}

// Reduce la foto (max. 800 px, JPEG) para que quepa en el navegador y en datos.js.
function cvCompressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const max = 800;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Lo que se publica en datos.js: todo el historial y solo las fotos de lo que hay en el almacen.
function cvForExport() {
  if (CV_CLOUD_CACHE) return { tx: [], photos: {} }; // esta en linea: no se publica en GitHub
  const data = cvLoadLocal();
  const plates = new Set(cvStock(data.tx).map((t) => t.plate));
  const photos = {};
  for (const [p, src] of Object.entries(data.photos)) if (plates.has(p)) photos[p] = src;
  return { tx: data.tx, photos };
}


function setupCompraventa() {
  const root = byId("tab-cv");
  if (!root) return;
  const $ = (id) => byId(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  let photoPlate = null;
  let busy = false;
  // La ventana de inicio de sesion tambien se abre desde Gestion de empleados
  // (en Pagos): fuera de la pestana para que se vea aunque esta este oculta.
  document.body.appendChild($("cv-login-dlg"));
  // Estado de la base en linea.
  const cloud = { ok: false, tried: false, error: "", tx: [], photoPaths: {}, photoUrls: {}, loadedAt: null };

  const online = () => cloud.ok;
  const canEdit = () => (online() ? hasAccess() : hasAccess() && !isSharedReadOnly());

  // Lo que se ve: la base en linea si responde; si no, esta PC o datos.js.
  function source() {
    if (online()) {
      const photos = {};
      for (const [plate, path] of Object.entries(cloud.photoPaths)) photos[plate] = cloud.photoUrls[path] || cvCloud.publicUrl(path);
      return { tx: cloud.tx, photos };
    }
    return cvSource();
  }

  function showPane(id) {
    root.querySelectorAll(".sx-subtab").forEach((b) => b.classList.toggle("is-active", b.dataset.cv === id));
    root.querySelectorAll(".sx-pane").forEach((p) => p.classList.toggle("is-active", p.id === id));
  }
  root.querySelectorAll(".sx-subtab").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.cv)));

  // ---------- Catalogo con precios de referencia ----------
  let catReady = false;
  let catShown = [];
  function fillCatFilters() {
    const list = catVehicles();
    const opts = (sel, vals, all) => {
      sel.innerHTML = "";
      sel.appendChild(new Option(all, ""));
      for (const v of vals) sel.appendChild(new Option(v, v));
    };
    opts($("cvc-cat"), [...new Set(list.map((v) => v.categoria).filter(Boolean))].sort((x, y) => x.localeCompare(y, "es")), "Todas las categorías");
    // Concesionarios: casillas para elegir uno, varios o todos.
    const box = $("cvc-dealer-list");
    box.innerHTML = "";
    const dealers = [...new Set(list.map((v) => v.concesionario).filter(Boolean))].sort((x, y) => x.localeCompare(y, "es"));
    for (const d of dealers) {
      const n = list.filter((v) => v.concesionario === d).length;
      const lab = el("label", "cvc-multi-opt");
      const cb = el("input");
      cb.type = "checkbox";
      cb.value = d;
      cb.addEventListener("change", () => {
        updateDealerLabel();
        renderCatalog();
      });
      lab.append(cb, el("span", "", d), el("small", "", String(n)));
      box.appendChild(lab);
    }
  }
  function selectedDealers() {
    return [...($("cvc-dealer-list")?.querySelectorAll("input:checked") || [])].map((c) => c.value);
  }
  function updateDealerLabel() {
    const s = selectedDealers();
    $("cvc-dealer-label").textContent = !s.length ? "Todos los concesionarios" : s.length <= 2 ? s.join(", ") : `${s.length} concesionarios`;
    $("cvc-dealer-btn").classList.toggle("is-on", s.length > 0);
  }
  function renderMargins() {
    const m = CV_MARGINS;
    $("cvc-margins-txt").innerHTML = `Comprar al <b>${pctTxt(m.buyMin)}–${pctTxt(m.buyMax)} %</b> · Vender al <b>${pctTxt(m.sellMin)}–${pctTxt(m.sellMax)} %</b> <span class="muted">del precio de concesionario</span>`;
    $("cvc-margins-edit").hidden = !AUTH.aguila;
  }
  // ---------- Editar el catalogo (solo Jefe Aguila) ----------
  const catEditable = () => AUTH.aguila && CATALOG.source === "cloud";
  function renderCatAdmin() {
    const bar = $("cvc-admin");
    if (!bar) return;
    bar.hidden = !AUTH.aguila;
    if (!AUTH.aguila) return;
    const txt = $("cvc-admin-txt");
    $("cvc-upload").hidden = CATALOG.source === "cloud";
    $("cvc-add").hidden = CATALOG.source !== "cloud";
    txt.textContent = CATALOG.missing
      ? "Para editar el catálogo falta ejecutar en Supabase el SQL 8_catalogo.sql."
      : CATALOG.source === "cloud"
        ? "✏️ Catálogo en línea: pulsa Editar en cualquier vehículo o añade uno nuevo. Los cambios los ve todo el equipo al momento."
        : "El catálogo aún es la copia fija de la página. Súbelo a la nube para poder editarlo desde aquí.";
    $("cvc-upload").disabled = CATALOG.missing;
  }

  async function reloadCatalog() {
    await loadCatalogCloud();
    catReady = false;
    renderCatalog();
  }

  $("cvc-upload")?.addEventListener("click", async () => {
    if (!confirm(`¿Subir los ${catVehicles().length} vehículos del catálogo a la nube? Después podrás editarlos desde aquí.`)) return;
    const btn = $("cvc-upload");
    btn.disabled = true;
    btn.textContent = "Subiendo…";
    try {
      const now = new Date().toISOString();
      await cvCloud.upsert("catalogo", catVehicles().map((v) => ({ ...catRowFromDb(v), actualizado_at: now, actualizado_por: AUTH.name || "" })), "id");
      await reloadCatalog();
    } catch (e) {
      alert(`No se pudo subir el catálogo: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "☁️ Subir catálogo a la nube";
    }
  });

  const ed = { dlg: $("cat-edit-dlg"), v: null, photo: null };
  if (ed.dlg) document.body.appendChild(ed.dlg);
  function fillDatalist(id, vals) {
    const dl = $(id);
    dl.innerHTML = "";
    for (const v of vals) dl.appendChild(new Option(v, v));
  }
  function openCatEditor(v) {
    ed.v = v;
    ed.photo = null;
    $("ce-title").textContent = v ? `✏️ Editar ${v.nombre}` : "➕ Nuevo vehículo";
    $("ce-nombre").value = v?.nombre || "";
    $("ce-modelo").value = v?.modelo || "";
    $("ce-precio").value = v && typeof v.precio === "number" ? String(v.precio) : "";
    $("ce-categoria").value = v?.categoria || "";
    $("ce-conce").value = v?.concesionario || "";
    $("ce-seccion").value = v?.seccion || "";
    const uniq = (k) => [...new Set(catVehicles().map((x) => x[k]).filter(Boolean))].sort((x, y) => x.localeCompare(y, "es"));
    fillDatalist("ce-cats", uniq("categoria"));
    fillDatalist("ce-conces", uniq("concesionario"));
    fillDatalist("ce-secs", uniq("seccion"));
    setEdPhoto(v?.foto || "");
    $("ce-err").textContent = "";
    $("ce-delete").hidden = !v;
    ed.dlg.showModal();
    $("ce-nombre").focus();
  }
  function setEdPhoto(src) {
    const box = $("ce-photo");
    box.innerHTML = "";
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      box.appendChild(img);
    } else box.appendChild(el("span", "muted", "Sin foto · pega un recorte (Ctrl + V) o elige un archivo"));
  }
  async function takeEdPhoto(blob) {
    if (!blob || !String(blob.type || "").startsWith("image/")) {
      $("ce-err").textContent = "Eso no es una imagen.";
      return;
    }
    try {
      ed.photo = await cvCompressImage(blob);
      setEdPhoto(ed.photo);
      $("ce-err").textContent = "";
    } catch (e) {
      $("ce-err").textContent = String(e?.message || e);
    }
  }
  const bucketPath = (url) => {
    const m = String(url || "").match(new RegExp(`/storage/v1/object/public/${CAT_BUCKET}/(.+)$`));
    return m ? decodeURIComponent(m[1]) : "";
  };
  if (ed.dlg) {
    $("cvc-add").addEventListener("click", () => openCatEditor(null));
    $("ce-cancel").addEventListener("click", () => ed.dlg.close());
    $("ce-file-btn").addEventListener("click", () => {
      $("ce-file").value = "";
      $("ce-file").click();
    });
    $("ce-file").addEventListener("change", () => takeEdPhoto($("ce-file").files?.[0]));
    $("ce-paste").addEventListener("click", async () => {
      try {
        for (const it of await navigator.clipboard.read()) {
          const type = it.types.find((ty) => ty.startsWith("image/"));
          if (type) return takeEdPhoto(await it.getType(type));
        }
        $("ce-err").textContent = "No hay ninguna imagen copiada. Haz el recorte con Windows + Shift + S.";
      } catch {
        $("ce-err").textContent = "El navegador no deja leer el portapapeles con el botón: pulsa Ctrl + V.";
      }
    });
    ed.dlg.addEventListener("paste", (e) => {
      const it = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith("image/"));
      if (!it) return;
      e.preventDefault();
      takeEdPhoto(it.getAsFile());
    });
    const drop = $("ce-photo");
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("is-over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("is-over");
      const f = e.dataTransfer?.files?.[0];
      if (f) takeEdPhoto(f);
    });

    $("ce-save").addEventListener("click", async () => {
      const nombre = $("ce-nombre").value.trim().replace(/\s+/g, " ");
      const modelo = $("ce-modelo").value.trim();
      const precioTxt = $("ce-precio").value.trim().replace(/[.\s$€]/g, "").replace(",", ".");
      const precio = precioTxt === "" ? null : Number(precioTxt);
      if (!nombre) return ($("ce-err").textContent = "Pon el nombre del vehículo.");
      if (precio !== null && !(Number.isFinite(precio) && precio >= 0)) return ($("ce-err").textContent = "El precio no es válido (solo números, o vacío si aún no se sabe).");
      const id = ed.v?.id || (() => {
        let base = catSlug(modelo || nombre);
        let k = base;
        for (let i = 2; catVehicles().some((x) => x.id === k); i++) k = `${base}_${i}`;
        return k;
      })();
      const twin = modelo && catVehicles().find((x) => x.id !== id && normalizeKeySimple(x.modelo) === normalizeKeySimple(modelo));
      if (twin && !confirm(`El modelo «${modelo}» ya lo tiene ${twin.nombre}. ¿Guardar igualmente?`)) return;
      const btn = $("ce-save");
      btn.disabled = true;
      $("ce-err").textContent = "Guardando…";
      try {
        let foto = ed.v?.foto || "";
        if (ed.photo) {
          const path = `${id}-${Date.now()}.jpg`;
          await cvCloud.req(`/storage/v1/object/${CAT_BUCKET}/${encodeURIComponent(path)}`, {
            method: "POST",
            body: cvDataUrlToBlob(ed.photo),
            headers: { "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "31536000" },
            auth: true,
          });
          const old = bucketPath(foto);
          foto = `${CV_CLOUD_URL}/storage/v1/object/public/${CAT_BUCKET}/${encodeURIComponent(path)}`;
          if (old) cvCloud.req(`/storage/v1/object/${CAT_BUCKET}`, { method: "DELETE", body: { prefixes: [old] }, auth: true }).catch(() => {});
        }
        await cvCloud.upsert("catalogo", [{
          id, nombre, modelo: modelo || null, precio,
          categoria: $("ce-categoria").value.trim() || null,
          concesionario: $("ce-conce").value.trim() || null,
          seccion: $("ce-seccion").value.trim() || null,
          foto: foto || null,
          actualizado_at: new Date().toISOString(),
          actualizado_por: AUTH.name || "",
        }], "id");
        ed.dlg.close();
        await reloadCatalog();
      } catch (e) {
        $("ce-err").textContent = `No se pudo guardar: ${e.message}`;
      } finally {
        btn.disabled = false;
      }
    });

    $("ce-delete").addEventListener("click", async () => {
      const v = ed.v;
      if (!v || !confirm(`¿Quitar ${v.nombre} del catálogo? Ya no saldrá en la Caja ni en Compraventa.`)) return;
      try {
        await cvCloud.del("catalogo", `id=eq.${encodeURIComponent(v.id)}`);
        const old = bucketPath(v.foto);
        if (old) cvCloud.req(`/storage/v1/object/${CAT_BUCKET}`, { method: "DELETE", body: { prefixes: [old] }, auth: true }).catch(() => {});
        ed.dlg.close();
        await reloadCatalog();
      } catch (e) {
        $("ce-err").textContent = `No se pudo quitar: ${e.message}`;
      }
    });
  }

  function renderCatalog() {
    renderCatAdmin();
    if (!catReady) {
      fillCatFilters();
      catReady = true;
    }
    renderMargins();
    const q = normalizeKeySimple($("cvc-q").value);
    const fc = $("cvc-cat").value;
    const fd = selectedDealers();
    const sort = $("cvc-sort").value;
    let list = catVehicles().filter(
      (v) =>
        (!fc || v.categoria === fc) &&
        (!fd.length || fd.includes(v.concesionario)) &&
        (!q || normalizeKeySimple(`${v.nombre} ${v.modelo || ""} ${v.categoria} ${v.concesionario}`).includes(q))
    );
    const price = (v) => (typeof v.precio === "number" ? v.precio : -1);
    if (sort === "asc") list = list.slice().sort((x, y) => (price(x) < 0) - (price(y) < 0) || price(x) - price(y));
    else if (sort === "desc") list = list.slice().sort((x, y) => price(y) - price(x));
    else list = list.slice().sort((x, y) => String(x.nombre).localeCompare(String(y.nombre), "es"));
    const grid = $("cvc-grid");
    grid.innerHTML = "";
    catShown = list;
    $("cvc-count").textContent = `${list.length} de ${catVehicles().length} vehículos`;
    $("cvc-export-txt").textContent = list.length === catVehicles().length ? "Exportar a Excel" : `Exportar ${list.length} a Excel`;
    for (const v of list) {
      const c = el("article", "cv-car cvc-car");
      const pic = el("div", "cv-pic");
      if (catPhoto(v)) {
        const img = el("img");
        img.src = catPhoto(v);
        img.alt = v.nombre;
        img.loading = "lazy";
        img.addEventListener("click", () => {
          $("cv-view-img").src = catPhoto(v);
          $("cv-view-cap").textContent = `${v.nombre}${v.modelo ? ` · ${v.modelo}` : ""}`;
          $("cv-view").showModal();
        });
        pic.appendChild(img);
      }
      if (v.modelo) pic.appendChild(el("span", "cv-plate", v.modelo));
      c.appendChild(pic);
      const body = el("div", "cv-body");
      body.appendChild(el("h4", "", v.nombre));
      const gk = catGamaKey(v);
      const gl = gk ? categoryLabel(gk) : "";
      const meta = el("div", "cvc-meta");
      if (gl) meta.appendChild(el("span", "cv-gama-chip", gl));
      meta.append(` ${[gl === v.categoria ? "" : v.categoria, v.concesionario, v.seccion].filter(Boolean).join(" · ")}`);
      body.appendChild(meta);
      const dl = el("dl");
      const row = (k, val, cls = "") => {
        dl.appendChild(el("dt", "", k));
        dl.appendChild(el("dd", cls, val));
      };
      const ref = cvRef(v.precio);
      if (!ref) {
        row("Concesionario", catPriceText(v), catIsDonation(v) ? "cvc-new" : "cvc-pend");
      } else {
        row("Concesionario", fmtMoney(v.precio), "cvc-new");
        row("Comprar", moneyRange(ref.buy), "cvc-buy");
        row("Vender", moneyRange(ref.sell), "cvc-sell");
        row("Margen", moneyRange(ref.margin), "cvc-margin");
      }
      body.appendChild(dl);
      if (catEditable()) {
        const eb = el("button", "ghost cvc-edit", "✏️ Editar");
        eb.type = "button";
        eb.addEventListener("click", () => openCatEditor(v));
        body.appendChild(eb);
      }
      c.appendChild(body);
      grid.appendChild(c);
    }
    $("cvc-empty").hidden = list.length > 0;
  }
  // ---------- Exportar el catalogo a Excel (v102) ----------
  // Lo que se ve ahora (con sus filtros), con foto incrustada y todos los datos.
  $("cvc-export")?.addEventListener("click", async () => {
    const btn = $("cvc-export");
    const txt = $("cvc-export-txt");
    const label = txt.textContent;
    const list = catShown.length ? catShown : catVehicles();
    if (!list.length) return alert("No hay vehículos que exportar.");
    btn.disabled = true;
    try {
      txt.textContent = "Preparando…";
      const ExcelJS = await loadExcelJS();
      const filters = [
        $("cvc-q").value.trim() ? `Búsqueda: «${$("cvc-q").value.trim()}»` : "",
        $("cvc-cat").value ? `Categoría: ${$("cvc-cat").value}` : "",
        selectedDealers().length ? `Concesionarios: ${selectedDealers().join(", ")}` : "",
      ].filter(Boolean);
      const blob = await buildCatalogXlsx(ExcelJS, list, {
        filters,
        onProgress: (n, total) => (txt.textContent = `Fotos ${n}/${total}…`),
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Catalogo_AguilaMotors_${empToday()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 2000);
      txt.textContent = `✔ Descargado (${list.length})`;
      await new Promise((r) => setTimeout(r, 2500));
    } catch (err) {
      alert(`No se pudo crear el Excel: ${err.message || err}`);
    } finally {
      btn.disabled = false;
      txt.textContent = label;
    }
  });

  if ($("cv-p-cat")) {
    if (!catVehicles().length) root.querySelector('[data-cv="cv-p-cat"]')?.setAttribute("hidden", "");
    for (const id of ["cvc-q", "cvc-cat", "cvc-sort"]) $(id).addEventListener(id === "cvc-q" ? "input" : "change", renderCatalog);
    const pop = $("cvc-dealer-pop");
    const btnD = $("cvc-dealer-btn");
    const setOpen = (open) => {
      pop.hidden = !open;
      btnD.setAttribute("aria-expanded", String(open));
    };
    btnD.addEventListener("click", () => setOpen(pop.hidden));
    $("cvc-dealer-ok").addEventListener("click", () => setOpen(false));
    $("cvc-dealer-all").addEventListener("click", () => {
      $("cvc-dealer-list").querySelectorAll("input").forEach((c) => (c.checked = false));
      updateDealerLabel();
      renderCatalog();
    });
    document.addEventListener("click", (ev) => {
      if (!pop.hidden && !$("cvc-dealer-box").contains(ev.target)) setOpen(false);
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !pop.hidden) setOpen(false);
    });
    root.querySelector('[data-cv="cv-p-cat"]')?.addEventListener("click", renderCatalog);
    $("cvc-margins-edit").addEventListener("click", () => {
      const box = $("cvc-margins-form");
      box.hidden = !box.hidden;
      const m = CV_MARGINS;
      $("cvc-bmin").value = pctTxt(m.buyMin);
      $("cvc-bmax").value = pctTxt(m.buyMax);
      $("cvc-smin").value = pctTxt(m.sellMin);
      $("cvc-smax").value = pctTxt(m.sellMax);
    });
    $("cvc-margins-save").addEventListener("click", async () => {
      const n = (id) => Number($(id).value) / 100;
      const m = { buyMin: n("cvc-bmin"), buyMax: n("cvc-bmax"), sellMin: n("cvc-smin"), sellMax: n("cvc-smax") };
      if (Object.values(m).some((x) => !Number.isFinite(x) || x <= 0 || x > 2)) return alert("Pon porcentajes entre 1 y 200.");
      if (m.buyMin > m.buyMax || m.sellMin > m.sellMax) return alert("El mínimo no puede ser mayor que el máximo.");
      if (m.buyMax >= m.sellMin) return alert("La compra máxima debe ser menor que la venta mínima (si no, no hay margen).");
      try {
        await cvCloud.upsert("app_settings", [{ key: "cv_margins", value: m }], "key");
        CV_MARGINS = m;
        $("cvc-margins-form").hidden = true;
        renderCatalog();
        render();
      } catch (e) {
        alert(`No se pudo guardar: ${e.message}`);
      }
    });
  }

  function setStatus(msg) {
    $("cv-status").textContent = msg;
  }

  function renderBar() {
    const logged = hasAccess();
    // Historial, Procesar log y las cifras de compras/ventas: solo el Jefe Aguila.
    const full = AUTH.aguila;
    root.querySelectorAll(".cv-kpis .pg-kpi:not(.hl)").forEach((k) => k.toggleAttribute("hidden", !full));
    root.querySelector('[data-cv="cv-p-hist"]')?.toggleAttribute("hidden", !full);
    root.querySelector('[data-cv="cv-p-log"]')?.toggleAttribute("hidden", !full);
    const activePane = root.querySelector(".sx-pane.is-active")?.id;
    if (!full && (activePane === "cv-p-hist" || activePane === "cv-p-log")) showPane("cv-p-stock");
    const dot = $("cv-cloud-dot");
    const txt = $("cv-cloud-text");
    if (online()) {
      dot.className = "cv-dot is-on";
      const hh = cloud.loadedAt ? cloud.loadedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
      txt.textContent = `En línea · actualizado ${hh}` + (logged ? ` · Jefe: ${AUTH.name}` : "");
    } else if (!cloud.tried) {
      dot.className = "cv-dot";
      txt.textContent = "Conectando con la base en línea…";
    } else {
      dot.className = "cv-dot is-off";
      txt.textContent = cloud.error || "Sin conexión con la base en línea";
    }
    $("cv-login").hidden = true; // la sesion se inicia arriba (🔑 Entrar)
    $("cv-logout").hidden = true;
    $("cv-refresh").hidden = !cloud.tried;
    const local = cvLoadLocal();
    $("cv-migrate").hidden = !(online() && logged && (local.tx.length || Object.keys(local.photos).length));

    const when = SHARED_DATA?.publishedAt ? ` el ${SHARED_DATA.publishedAt}` : "";
    $("cv-mode").textContent = !AUTH.aguila && canSeeCv()
      ? "Vehículos disponibles en el almacén de la compraventa."
      : online()
      ? logged
        ? "Lo que proceses y las fotos que subas se guardan en línea: los Jefes lo ven al momento."
        : "Datos en línea. Solo los Jefes pueden verlos y cambiarlos."
      : canEdit()
        ? SHARED_DATA
          ? "Sin base en línea: lo que proceses queda en esta PC. Exporta datos.js (Pagos → Datos compartidos) para que lo vean los demás."
          : "Sin base en línea: estos datos se guardan en esta PC."
        : `Publicado por el encargado${when}. Aquí solo se puede ver.`;
    $("cv-tab-log").hidden = !(canEdit() && AUTH.aguila);
    if (!canEdit() && $("cv-p-log").classList.contains("is-active")) showPane("cv-p-stock");
  }

  // ---------- Asociar un modelo del log con el catalogo (Jefe Aguila) ----------
  async function linkModel(model, v) {
    try {
      await saveCvAlias(model, v ? v.id : "");
      render();
    } catch (e) {
      alert(`No se pudo guardar la asociación: ${e.message}`);
    }
  }
  function openLinker(box, model, linked) {
    if (box.querySelector(".cv-linker")) return;
    const wrap = el("div", "cv-linker");
    const inp = el("input", "text-input");
    inp.type = "search";
    inp.placeholder = "Nombre o modelo del vehículo";
    const res = el("div", "cv-linker-res");
    const draw = () => {
      res.innerHTML = "";
      for (const v of catSearch(inp.value, 6)) {
        const b = el("button", "cv-guess");
        b.type = "button";
        b.innerHTML = `<img alt=""><span></span>`;
        if (catPhoto(v)) b.querySelector("img").src = catPhoto(v);
        else b.querySelector("img").remove();
        b.querySelector("span").textContent = `${v.nombre}${v.modelo ? ` · ${v.modelo}` : ""}`;
        b.addEventListener("click", () => linkModel(model, v));
        res.appendChild(b);
      }
    };
    inp.addEventListener("input", draw);
    wrap.append(inp, res);
    if (linked && CV_ALIAS[normalizeKeySimple(model)]) {
      const un = el("button", "cv-link-btn", "Quitar asociación");
      un.type = "button";
      un.addEventListener("click", () => linkModel(model, null));
      wrap.appendChild(un);
    }
    box.appendChild(wrap);
    inp.value = String(model || "").slice(0, 6);
    draw();
    inp.focus();
    inp.select();
  }

  function card(t, photos) {
    const c = el("article", "cv-car");
    const pic = el("div", "cv-pic");
    if (photos[t.plate]) {
      const img = el("img");
      img.src = photos[t.plate];
      img.alt = `${t.model} ${t.plate}`;
      img.loading = "lazy";
      img.addEventListener("click", () => {
        $("cv-view-img").src = photos[t.plate];
        $("cv-view-cap").textContent = `${(canSeeCv() && catFind(t.model)?.nombre) || t.model.toUpperCase()} · ${t.plate}`;
        $("cv-view").showModal();
      });
      pic.appendChild(img);
    } else if (canSeeCv() && catPhoto(catFind(t.model))) {
      // Sin foto propia: la del catalogo como referencia.
      const img = el("img");
      const src = catPhoto(catFind(t.model));
      img.src = src;
      img.alt = t.model;
      img.loading = "lazy";
      img.addEventListener("click", () => {
        $("cv-view-img").src = src;
        $("cv-view-cap").textContent = `${catFind(t.model)?.nombre || t.model.toUpperCase()} · ${t.plate} (foto de catálogo)`;
        $("cv-view").showModal();
      });
      pic.appendChild(img);
      pic.appendChild(el("span", "cv-pic-tag", "Foto de catálogo"));
    } else {
      pic.innerHTML =
        '<svg viewBox="0 0 64 32" aria-hidden="true"><path d="M6 22h52M10 22l4-8c1-2 3-3 5-3h18c2 0 4 1 6 3l7 6 6 1c2 0 3 1 3 3v2H4v-2c0-1 1-2 2-2"/><circle cx="18" cy="24" r="4"/><circle cx="48" cy="24" r="4"/></svg>';
      pic.appendChild(el("span", "", "Sin foto"));
    }
    // Matricula y, a su lado, el modelo que trae el log.
    const tags = el("div", "cv-tags");
    tags.appendChild(el("span", "cv-plate", t.plate));
    if (t.model) tags.appendChild(el("span", "cv-model-tag", t.model.toLowerCase()));
    pic.appendChild(tags);
    c.appendChild(pic);
    const body = el("div", "cv-body");
    // Titulo: el nombre del catalogo si se conoce (p. ej. "Ghost Rider"); si no, el modelo.
    const named = canSeeCv() ? catFind(t.model) : null;
    body.appendChild(el("h4", "", named ? named.nombre : t.model.toUpperCase()));
    // Gama / categoria del catalogo (y concesionario) bajo el titulo.
    if (named && (named.categoria || named.concesionario)) {
      const meta = el("div", "cv-gama");
      const gk = catGamaKey(named);
      const gl = gk ? categoryLabel(gk) : "";
      if (gl) meta.appendChild(el("span", "cv-gama-chip", gl));
      const rest = [named.categoria && named.categoria !== gl ? named.categoria : "", named.concesionario].filter(Boolean).join(" · ");
      if (!gl && named.categoria) meta.appendChild(el("span", "cv-gama-chip", named.categoria));
      if (rest) meta.appendChild(el("span", "cv-gama-dealer", gl ? rest : named.concesionario || ""));
      body.appendChild(meta);
    }
    const dl = el("dl");
    const row = (k, v) => {
      dl.appendChild(el("dt", "", k));
      dl.appendChild(el("dd", "", v));
    };
    row("Comprado a", cvDisplayName(t.owner));
    row("Pagado", fmtMoney(t.price));
    row("Mediador", cvDisplayName(t.mediator));
    row("Fecha", t.ts || "Sin fecha");
    // A cuanto se puede revender (todos los que ven el almacen).
    const sellRef = named ? cvRef(named.precio) : null;
    body.appendChild(dl);
    if (sellRef) {
      const rs = el("div", "cv-resale");
      rs.appendChild(el("span", "", "💰 Revender a"));
      rs.appendChild(el("b", "", moneyRange(sellRef.sell)));
      body.appendChild(rs);
    }
    // Ficha del catalogo (precio nuevo, a cuanto revenderlo, ganancia y asociar): solo el Jefe Aguila.
    const cv = AUTH.aguila ? catFind(t.model) : null;
    const ref = cv ? cvRef(cv.precio) : null;
    if (ref) {
      const box = el("div", "cv-ref");
      box.appendChild(el("div", "cv-ref-name", `📖 ${cv.nombre}`));
      box.appendChild(el("div", "", `Concesionario ${fmtMoney(cv.precio)}`));
      box.appendChild(el("div", "cv-ref-sell", `Vender a ${moneyRange(ref.sell)}`));
      const gain = [ref.sell[0] - t.price, ref.sell[1] - t.price];
      box.appendChild(el("div", gain[1] >= 0 ? "cv-ref-ok" : "cv-ref-bad", `Ganancia ${gain[0] < 0 ? "- " + fmtMoney(-gain[0]) : fmtMoney(gain[0])} – ${gain[1] < 0 ? "- " + fmtMoney(-gain[1]) : fmtMoney(gain[1])}`));
      if (AUTH.aguila) {
        const ch = el("button", "cv-link-btn", "🔗 Cambiar");
        ch.type = "button";
        ch.title = "Asociar este modelo a otro vehículo del catálogo";
        ch.addEventListener("click", () => openLinker(box, t.model, true));
        box.appendChild(ch);
      }
      body.appendChild(box);
    } else if (cv && AUTH.aguila) {
      // Asociado pero sin precio (pendiente): se puede cambiar igual.
      const box = el("div", "cv-ref");
      box.appendChild(el("div", "cv-ref-name", `📖 ${cv.nombre}`));
      box.appendChild(el("div", "cvc-pend", "Precio pendiente"));
      body.appendChild(box);
    } else if (!cv && AUTH.aguila && catVehicles().length) {
      const box = el("div", "cv-ref cv-ref-miss");
      box.appendChild(el("div", "cv-ref-name", `🔗 «${t.model}» no está en el catálogo`));
      const guesses = catGuess(t.model);
      if (guesses.length) box.appendChild(el("div", "muted", "¿Es alguno de estos?"));
      for (const g of guesses) {
        const b = el("button", "cv-guess");
        b.type = "button";
        b.innerHTML = `<img alt=""><span></span>`;
        if (catPhoto(g)) b.querySelector("img").src = catPhoto(g);
        else b.querySelector("img").remove();
        b.querySelector("span").textContent = `${g.nombre}${g.modelo ? ` · ${g.modelo}` : ""}`;
        b.addEventListener("click", () => linkModel(t.model, g));
        box.appendChild(b);
      }
      const other = el("button", "cv-link-btn", "🔎 Buscar en el catálogo");
      other.type = "button";
      other.addEventListener("click", () => openLinker(box, t.model, false));
      box.appendChild(other);
      body.appendChild(box);
    }
    if (canEdit()) {
      const acts = el("div", "cv-acts");
      const up = el("button", "ghost", photos[t.plate] ? "📷 Cambiar foto" : "📷 Subir foto");
      up.type = "button";
      up.addEventListener("click", () => openPhotoDialog(t.plate));
      acts.appendChild(up);
      if (photos[t.plate]) {
        const del = el("button", "ghost", "Quitar foto");
        del.type = "button";
        del.addEventListener("click", () => removePhoto(t.plate));
        acts.appendChild(del);
      }
      body.appendChild(acts);
    }
    c.appendChild(body);
    return c;
  }

  function render() {
    renderBar();
    const { tx, photos } = source();
    const stock = cvStock(tx);
    const buys = tx.filter((t) => cvKind(t) === "compra");
    const sells = tx.filter((t) => cvKind(t) === "venta");
    const sum = (a) => a.reduce((s, t) => s + (Number(t.price) || 0), 0);
    $("cv-kpi-stock").textContent = String(stock.length);
    $("cv-kpi-stock-sub").textContent = `${fmtMoney(sum(stock))} invertidos`;
    $("cv-kpi-buy").textContent = fmtMoney(sum(buys));
    $("cv-kpi-buy-sub").textContent = `${buys.length} compras · sale de la sociedad`;
    $("cv-kpi-sell").textContent = fmtMoney(sum(sells));
    $("cv-kpi-sell-sub").textContent = `${sells.length} ventas · entra a la sociedad`;
    const bal = sum(sells) - sum(buys);
    $("cv-kpi-bal").textContent = (bal < 0 ? "- " : "") + fmtMoney(Math.abs(bal));
    $("cv-kpi-bal-sub").textContent = `${tx.length} movimientos registrados`;

    // Almacen
    const grid = $("cv-stock");
    grid.innerHTML = "";
    const q = normalizeKeySimple($("cv-stock-q").value);
    const shown = stock.filter((t) => !q || normalizeKeySimple(`${t.model} ${catFind(t.model)?.nombre || ""} ${t.plate} ${t.owner} ${t.mediator}`).includes(q));
    shown.forEach((t) => grid.appendChild(card(t, photos)));
    // Cuantos hay (para cuadrarlo con el almacen del juego).
    const cnt = $("cv-stock-count");
    if (cnt) {
      const n = stock.length;
      cnt.textContent = q && shown.length !== n ? `${shown.length} de ${n}` : `${n} ${n === 1 ? "vehículo" : "vehículos"}`;
    }
    $("cv-stock-empty").hidden = shown.length > 0;
    $("cv-stock-empty").textContent = stock.length
      ? "Ningún vehículo coincide con la búsqueda."
      : "No hay vehículos en el almacén. Aparecen aquí los que compra la empresa y todavía no se han vendido.";

    // Historial (lo mas reciente arriba)
    const hq = normalizeKeySimple($("cv-hist-q").value);
    const kindF = $("cv-hist-kind").value;
    const body = $("cv-hist");
    body.innerHTML = "";
    const rows = tx
      .slice()
      .reverse()
      .filter((t) => (!kindF || cvKind(t) === kindF) && (!hq || normalizeKeySimple(`${t.model} ${t.plate} ${t.owner} ${t.buyer} ${t.mediator}`).includes(hq)));
    const labels = { compra: "Compra", venta: "Venta", traspaso: "Traspaso" };
    for (const t of rows) {
      const tr = el("tr");
      const k = cvKind(t);
      tr.appendChild(el("td", "cv-date", t.ts || "-"));
      const tdK = el("td");
      tdK.appendChild(el("span", `cv-badge cv-${k}`, labels[k]));
      tr.appendChild(tdK);
      const tdV = el("td");
      tdV.appendChild(el("b", "", t.model.toUpperCase()));
      tdV.appendChild(el("span", "cv-plate-sm", t.plate));
      tr.appendChild(tdV);
      tr.appendChild(el("td", cvIsSociety(t.owner) ? "cv-soc" : "", cvDisplayName(t.owner)));
      tr.appendChild(el("td", cvIsSociety(t.buyer) ? "cv-soc" : "", cvDisplayName(t.buyer)));
      tr.appendChild(el("td", "", cvDisplayName(t.mediator)));
      tr.appendChild(el("td", `num cv-money-${k}`, (k === "compra" ? "− " : k === "venta" ? "+ " : "") + fmtMoney(t.price)));
      body.appendChild(tr);
    }
    $("cv-hist-empty").hidden = rows.length > 0;
  }

  // ---------- lectura de la base en linea ----------
  async function loadCloud() {
    if (!AUTH.aguila) return loadStockOnly();
    try {
      const [rows, photos] = await Promise.all([
        cvCloud.selectAll("cv_tx", "sort.asc,uid.asc"),
        cvCloud.selectAll("cv_photos", "plate.asc"),
      ]);
      cloud.tx = rows.map((r, i) => ({
        uid: r.uid,
        ts: r.ts || "",
        sort: r.sort || "",
        mediator: r.mediator || "",
        owner: r.owner || "",
        buyer: r.buyer || "",
        price: Number(r.price) || 0,
        model: r.model || "",
        plate: r.plate || "",
        company: r.company || "",
        seq: i + 1,
      }));
      cloud.photoPaths = {};
      for (const ph of photos) cloud.photoPaths[ph.plate] = ph.path;
      cloud.photoUrls = await cvSignedUrls(Object.values(cloud.photoPaths));
      cloud.ok = true;
      cloud.reachable = true;
      cloud.error = "";
      cloud.loadedAt = new Date();
      CV_CLOUD_CACHE = { tx: cloud.tx, photoPaths: cloud.photoPaths };
    } catch (e) {
      cloud.ok = false;
      cloud.reachable = !!e.status;
      cloud.error =
        e.code === "PGRST205" || e.code === "42P01" || e.status === 404
          ? "La base en línea aún no tiene las tablas (falta pegar el SQL en Supabase). Se usan los datos de esta PC."
          : `${e.message} Se usan los datos de esta PC.`;
    }
    cloud.tried = true;
    render();
  }

  // Empleados (no Jefes): la base solo les da lo que hay en el almacen.
  async function loadStockOnly() {
    try {
      // almacen_v2: solo Jefes y desde Experimentado (si aun no existe, la de antes).
      let rows;
      try {
        rows = (await cvCloud.req("/rest/v1/rpc/almacen_v2", { method: "POST", body: {} })) || [];
      } catch (e) {
        if (!(e.status === 404 || e.code === "PGRST202")) throw e;
        rows = (await cvCloud.req("/rest/v1/rpc/almacen", { method: "POST", body: {} })) || [];
      }
      cloud.tx = rows.map((r, i) => ({
        uid: r.uid,
        ts: r.ts || "",
        sort: r.sort || "",
        mediator: r.mediator || "",
        owner: r.owner || "",
        buyer: r.buyer || "",
        price: Number(r.price) || 0,
        model: r.model || "",
        plate: r.plate || "",
        company: r.company || "",
        seq: i + 1,
      }));
      cloud.photoPaths = {};
      for (const r of rows) if (r.photo) cloud.photoPaths[r.plate] = r.photo;
      cloud.photoUrls = await cvSignedUrls(Object.values(cloud.photoPaths));
      cloud.ok = true;
      cloud.reachable = true;
      cloud.error = "";
      cloud.loadedAt = new Date();
    } catch (e) {
      cloud.ok = false;
      cloud.reachable = !!e.status;
      cloud.error =
        e.status === 404 || e.code === "PGRST202"
          ? "El almacén aún no está disponible para empleados (falta el SQL en Supabase)."
          : e.message;
    }
    cloud.tried = true;
    render();
  }

  // Aplica a la base en linea lo que cambio entre "antes" y "despues".
  async function pushChanges(before, data) {
    const old = new Map(before.tx.map((t) => [t.uid, JSON.stringify(CV_FIELDS.map((f) => t[f]))]));
    let n = 0;
    const rows = [];
    for (const t of data.tx) {
      if (!t.uid) t.uid = cvNewUid(n++);
      const cur = JSON.stringify(CV_FIELDS.map((f) => t[f]));
      if (old.get(t.uid) !== cur) rows.push(Object.fromEntries(CV_FIELDS.map((f) => [f, f === "price" ? Number(t[f]) || 0 : t[f] ?? ""])));
    }
    if (rows.length) await cvCloud.upsert("cv_tx", rows, "uid");
    // Fotos que cambiaron de matricula al corregir un registro.
    const moved = Object.entries(data.photos).filter(([plate, path]) => before.photos[plate] !== path);
    if (moved.length) await cvCloud.upsert("cv_photos", moved.map(([plate, path]) => ({ plate, path })), "plate");
    for (const plate of Object.keys(before.photos)) {
      if (!(plate in data.photos)) await cvCloud.del("cv_photos", `plate=eq.${encodeURIComponent(plate)}`);
    }
    return rows.length;
  }

  async function guarded(fn) {
    if (busy) return;
    busy = true;
    root.classList.add("is-busy");
    try {
      await fn();
    } catch (e) {
      setStatus(`⚠️ ${e.message || e}`);
      alert(`No se pudo guardar en línea: ${e.message || e}`);
    } finally {
      busy = false;
      root.classList.remove("is-busy");
    }
  }

  $("cv-stock-q").addEventListener("input", render);
  $("cv-hist-q").addEventListener("input", render);
  $("cv-hist-kind").addEventListener("change", render);

  $("cv-refresh").addEventListener("click", () => loadCloud());

  // Pasa a la nube el historial y las fotos guardados en esta PC.
  $("cv-migrate").addEventListener("click", () =>
    guarded(async () => {
      const local = cvLoadLocal();
      if (!window.confirm(`¿Subir a la base en línea las ${local.tx.length} transacciones y ${Object.keys(local.photos).length} fotos de esta PC? Lo repetido no se duplica.`)) return;
      setStatus("Subiendo el historial de esta PC…");
      await loadCloud();
      if (!online()) throw new Error(cloud.error);
      const before = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
      const data = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
      const incoming = local.tx.map(({ seq, uid, ...t }) => ({ ...t, sort: t.sort || cvSortKey(t.ts) }));
      const added = cvMerge(data, incoming);
      delete data.lastFixed;
      await pushChanges(before, data);
      let ph = 0;
      for (const [plate, src] of Object.entries(local.photos)) {
        if (data.photos[plate]) continue;
        const path = cvPhotoPath(plate);
        await cvCloud.uploadPhoto(path, cvDataUrlToBlob(src));
        await cvCloud.upsert("cv_photos", [{ plate, path }], "plate");
        ph++;
      }
      await loadCloud();
      setStatus(`☁️ Subidas ${added} transacciones nuevas y ${ph} fotos. Ya están en línea para todos.`);
      if (window.confirm("Listo. ¿Borrar la copia de esta PC? (ya está todo en línea)")) {
        cvSaveLocal({ tx: [], photos: {} });
        render();
      }
    })
  );

  // ---------- fotos: recorte con Ctrl+V, archivo o arrastrar ----------
  const photoDlg = $("cv-photo-dlg");
  const photoErr = $("cv-photo-err");

  function openPhotoDialog(plate) {
    photoPlate = plate;
    $("cv-photo-plate").textContent = plate;
    photoErr.textContent = "";
    photoDlg.showModal();
    $("cv-drop").focus();
  }

  async function savePhoto(blob) {
    if (!blob || !photoPlate) return;
    if (!String(blob.type || "").startsWith("image/")) {
      photoErr.textContent = "Eso no es una imagen. Haz el recorte y vuelve a pegar.";
      return;
    }
    let src;
    try {
      src = await cvCompressImage(blob);
    } catch (e) {
      photoErr.textContent = String(e?.message || e);
      return;
    }
    const plate = photoPlate;
    if (online()) {
      photoErr.textContent = "Subiendo la foto…";
      await guarded(async () => {
        const path = cvPhotoPath(plate);
        const old = cloud.photoPaths[plate];
        await cvCloud.uploadPhoto(path, cvDataUrlToBlob(src));
        await cvCloud.upsert("cv_photos", [{ plate, path }], "plate");
        if (old) await cvCloud.removePhotos([old]).catch(() => {});
        photoDlg.close();
        await loadCloud();
      });
      if (photoDlg.open) photoErr.textContent = "No se pudo subir la foto. Prueba otra vez.";
      return;
    }
    const data = cvLoadLocal();
    data.photos[plate] = src;
    if (!cvSaveLocal(data)) {
      photoErr.textContent = "No hay espacio para más fotos en este navegador. Quita fotos de vehículos que ya no estén.";
      return;
    }
    photoDlg.close();
    render();
  }

  function removePhoto(plate) {
    if (!window.confirm(`¿Quitar la foto de ${plate}?`)) return;
    if (online()) {
      guarded(async () => {
        const path = cloud.photoPaths[plate];
        await cvCloud.del("cv_photos", `plate=eq.${encodeURIComponent(plate)}`);
        if (path) await cvCloud.removePhotos([path]).catch(() => {});
        await loadCloud();
      });
      return;
    }
    const data = cvLoadLocal();
    delete data.photos[plate];
    cvSaveLocal(data);
    render();
  }

  const imageFrom = (items) => {
    for (const it of items || []) {
      if (it.kind === "file" && it.type.startsWith("image/")) return it.getAsFile();
    }
    return null;
  };

  document.addEventListener("paste", (e) => {
    if (!photoDlg.open) return;
    e.preventDefault();
    const img = imageFrom(e.clipboardData?.items);
    if (img) savePhoto(img);
    else photoErr.textContent = "No hay ninguna imagen copiada. Haz el recorte con Windows + Shift + S y vuelve a pulsar Ctrl + V.";
  });

  $("cv-photo-paste").addEventListener("click", async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((ty) => ty.startsWith("image/"));
        if (type) return savePhoto(await it.getType(type));
      }
      photoErr.textContent = "No hay ninguna imagen copiada. Haz el recorte con Windows + Shift + S.";
    } catch {
      photoErr.textContent = "El navegador no deja leer el portapapeles con el botón: pulsa Ctrl + V.";
    }
  });

  const drop = $("cv-drop");
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("is-over");
    const f = e.dataTransfer?.files?.[0];
    if (f) savePhoto(f);
  });

  $("cv-photo-file").addEventListener("click", () => {
    $("cv-file").value = "";
    $("cv-file").click();
  });
  $("cv-photo-cancel").addEventListener("click", () => photoDlg.close());
  $("cv-file").addEventListener("change", () => savePhoto($("cv-file").files?.[0]));

  // ---------- procesar el log ----------
  function summary(found, added, fixed) {
    return (
      `Leídas ${found} transacciones: ${added} nuevas, ${found - added} ya estaban.` +
      (fixed ? ` Se corrigió la matrícula de ${fixed}.` : "")
    );
  }

  async function process() {
    const found = cvParseLog($("cv-input").value);
    if (!found.length) {
      setStatus("No se encontró ninguna «Transacción de vehículo» en el texto.");
      return;
    }
    if (online()) {
      await guarded(async () => {
        setStatus("Guardando en línea…");
        await loadCloud(); // por si otro encargado cambio algo
        if (!online()) throw new Error(cloud.error);
        const before = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
        const data = { tx: cloud.tx.map((t) => ({ ...t })), photos: { ...cloud.photoPaths } };
        const added = cvMerge(data, found);
        const fixed = data.lastFixed || 0;
        delete data.lastFixed;
        await pushChanges(before, data);
        $("cv-input").value = "";
        await loadCloud();
        setStatus(`☁️ ${summary(found.length, added, fixed)} Ya está en línea para todos.`);
      });
      return;
    }
    const data = cvLoadLocal();
    const added = cvMerge(data, found);
    const fixed = data.lastFixed || 0;
    delete data.lastFixed;
    cvSaveLocal(data);
    setStatus(summary(found.length, added, fixed));
    $("cv-input").value = "";
    render();
  }
  $("cv-process").addEventListener("click", process);
  $("cv-paste").addEventListener("click", async () => {
    try {
      $("cv-input").value = await navigator.clipboard.readText();
    } catch {
      setStatus("No se pudo leer el portapapeles: pega el texto con Ctrl+V y pulsa Procesar.");
      return;
    }
    process();
  });
  $("cv-reset").addEventListener("click", () => {
    if (online()) {
      if (!window.confirm("¿Borrar TODO el historial y las fotos de la base EN LÍNEA? Lo dejarán de ver todos.")) return;
      if (window.prompt('Para confirmar escribe BORRAR') !== "BORRAR") return;
      guarded(async () => {
        const paths = Object.values(cloud.photoPaths);
        await cvCloud.del("cv_tx", "uid=not.is.null");
        await cvCloud.del("cv_photos", "plate=not.is.null");
        await cvCloud.removePhotos(paths).catch(() => {});
        await loadCloud();
        setStatus("Historial en línea borrado.");
      });
      return;
    }
    if (!window.confirm("¿Borrar todo el historial de compraventa y las fotos de esta PC?")) return;
    cvSaveLocal({ tx: [], photos: {} });
    setStatus("Historial borrado.");
    render();
  });

  // Se ve al momento con lo de esta PC; luego se conecta y se mantiene al dia
  // (cada 45 s mientras la pestana esta abierta y al volver a la ventana).
  render();
  if (canSeeCv()) loadCloud();
  else {
    cloud.tried = true;
    cloud.error = "Solo para Jefes.";
    render();
  }
  const tabActive = () => root.classList.contains("is-active") && document.visibilityState === "visible";
  setInterval(() => {
    if (!busy && canSeeCv() && tabActive()) loadCloud();
  }, 45000);
  document.addEventListener("visibilitychange", () => {
    if (!busy && canSeeCv() && tabActive()) loadCloud();
  });
  document.querySelector('.tab[data-tab-target="tab-cv"]')?.addEventListener("click", () => {
    if (!busy && canSeeCv() && cloud.tried) setTimeout(() => tabActive() && loadCloud(), 50);
  });
}
