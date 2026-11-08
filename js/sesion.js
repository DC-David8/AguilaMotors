// Aguila Motors · Sesión y permisos (Discord / correo).
// (sesion.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ---------------------------------------------------------------------------
// Sesion y permisos. Se entra con Discord (web) o con correo (programa de
// escritorio). Quien es Jefe lo decide la BASE DE DATOS (funcion es_jefe:
// cuenta de encargado, o ID de Discord de un empleado con rango Jefe), no la
// pagina: aunque alguien toque el codigo, sin ser Jefe no recibe datos.
// ---------------------------------------------------------------------------
const AUTH = { role: "none", name: "", provider: "", checked: false, error: "", aguila: false, offline: false, avatar: "", discordId: "", profile: null };

function hasAccess() {
  return AUTH.role === "jefe";
}

// Empleados registrados (Chalan a Subjefe): ven solo el Almacen de Compraventa.
// Compraventa (Almacen y Catalogo): Jefes y empleados desde Experimentado.
// Historial y Procesar log: solo el Jefe Aguila.
const CV_RANKS = ["experimentado", "subjefe"];
function canSeeCv() {
  return hasAccess() || (AUTH.role === "empleado" && CV_RANKS.includes(normalizeKeySimple(AUTH.profile?.rank)));
}

function canSeeStock() {
  return AUTH.role === "jefe" || AUTH.role === "empleado";
}

function cvPersistSession() {
  try {
    localStorage.setItem(CV_SESSION_KEY, JSON.stringify(cvCloud.session));
  } catch {
    // nada
  }
}

async function authInit() {
  // Vuelta desde Discord: la sesion llega en la direccion (#access_token=...).
  const h = new URLSearchParams(location.hash.replace(/^#/, ""));
  const q = new URLSearchParams(location.search);
  const err = h.get("error_description") || q.get("error_description");
  if (h.get("access_token")) {
    cvCloud.setSession({
      access_token: h.get("access_token"),
      refresh_token: h.get("refresh_token"),
      expires_in: h.get("expires_in"),
      user: null,
    });
  }
  if (h.get("access_token") || err) {
    try {
      history.replaceState(null, "", location.pathname);
    } catch {
      // nada
    }
  }
  if (err) AUTH.error = err.replace(/\+/g, " ");
  await authRefresh();
}

async function authRefresh() {
  AUTH.role = "none";
  AUTH.name = "";
  AUTH.provider = "";
  if (!cvCloud.session) {
    AUTH.checked = true;
    return;
  }
  try {
    const u = await cvCloud.req("/auth/v1/user", { auth: true });
    const md = u?.user_metadata || {};
    AUTH.provider = u?.app_metadata?.provider || "";
    AUTH.name = md.custom_claims?.global_name || md.full_name || md.name || u?.email || "";
    AUTH.avatar = md.avatar_url || md.picture || "";
    const ident = (u?.identities || []).find((i) => i.provider === "discord");
    AUTH.discordId = String(md.provider_id || ident?.identity_data?.sub || ident?.id || "");
    if (cvCloud.session) {
      cvCloud.session.email = AUTH.name;
      cvPersistSession();
    }
  } catch (e) {
    if (!cvCloud.session || e.status === 401 || e.status === 403) {
      cvCloud.clearSession();
      AUTH.checked = true;
      return;
    }
    if (!e.status) {
      // Sin conexion con la base: con sesion guardada se deja usar la Caja.
      AUTH.offline = true;
      AUTH.role = "offline";
      AUTH.name = cvCloud.session?.email || "";
      AUTH.checked = true;
      return;
    }
  }
  try {
    const jefe = await cvCloud.req("/rest/v1/rpc/es_jefe", { method: "POST", body: {}, auth: true });
    if (jefe === true) {
      AUTH.role = "jefe";
      try {
        AUTH.aguila = (await cvCloud.req("/rest/v1/rpc/es_jefe_aguila", { method: "POST", body: {}, auth: true })) === true;
      } catch (e) {
        // Funcion aun sin crear: la cuenta de correo del encargado es la del Jefe Aguila.
        AUTH.aguila = (e.status === 404 || e.code === "PGRST202") && AUTH.provider === "email";
      }
      await loadMyProfile();
    }
    else {
      let emp = false;
      try {
        emp = (await cvCloud.req("/rest/v1/rpc/es_empleado", { method: "POST", body: {}, auth: true })) === true;
      } catch {
        // funcion aun sin crear: solo la Caja
      }
      AUTH.role = emp ? "empleado" : "invitado";
      if (emp) await loadMyProfile();
    }
  } catch (e) {
    // Sin la funcion es_jefe todavia (falta el SQL): la cuenta de correo del
    // encargado sigue funcionando como antes; con Discord, solo la Caja.
    const missing = e.status === 404 || e.code === "PGRST202" || e.code === "42883";
    AUTH.role = missing && AUTH.provider === "email" ? "jefe" : cvCloud.session ? "invitado" : "none";
    if (AUTH.role === "jefe") AUTH.aguila = true;
  }
  AUTH.checked = true;
}

// Nombres visibles de los rangos (tabla app_settings, clave "rank_names").
async function loadRankNames() {
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.rank_names");
    const v = rows?.[0]?.value;
    RANK_NAMES = v && typeof v === "object" ? v : {};
  } catch {
    RANK_NAMES = {};
  }
}

async function saveRankNames(map) {
  await cvCloud.upsert("app_settings", [{ key: "rank_names", value: map }], "key");
  RANK_NAMES = map;
}

// Nombre y rango del que entra, sacados de la lista de empleados (funcion
// mi_perfil: cada uno recibe solo SUS datos).
async function loadMyProfile() {
  try {
    const rows = await cvCloud.req("/rest/v1/rpc/mi_perfil", { method: "POST", body: {}, auth: true });
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (r && r.name) AUTH.profile = { name: String(r.name), surname: String(r.surname || ""), rank: String(r.rank || "") };
  } catch {
    // funcion aun sin crear: se intenta luego con la lista de empleados (Jefes)
  }
}

function rankBadgeClass(rank) {
  const map = { "jefe aguila": "r-aguila", jefe: "r-jefe", "mano derecha": "r-jefe", subjefe: "r-subjefe", mecanico: "r-mecanico", chalan: "r-chalan", experimentado: "r-exp" };
  return map[normalizeKeySimple(rank)] || "";
}

// Tarjeta de sesion de arriba: foto de Discord, nombre de la plantilla y rango.
function renderAuthCard() {
  const box = byId("auth-user");
  if (!box) return;
  if (!AUTH.profile && AUTH.discordId && EMP_CLOUD.list.length) {
    const e = empMainOf(AUTH.discordId);
    if (e) AUTH.profile = { name: e.name, surname: e.surname, rank: e.rank };
  }
  const p = AUTH.profile;
  const name = p ? `${p.name} ${p.surname}`.trim() : AUTH.name || "Sesión iniciada";
  const rank = p?.rank
    ? rankLabel(p.rank)
    : AUTH.aguila
      ? rankLabel("Jefe Aguila")
      : { jefe: "Jefatura", empleado: "Empleado", invitado: "Sin registrar", offline: "Sin conexión" }[AUTH.role] || "";
  const rankKey = p?.rank || (AUTH.aguila ? "Jefe Aguila" : "");

  box.textContent = "";
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const av = document.createElement("span");
  av.className = "auth-avatar";
  if (rankKey) av.appendChild(rankAvatar(rankKey, initials, "auth-rk"));
  else av.textContent = initials;
  if (AUTH.avatar) {
    const img = document.createElement("img");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = AUTH.avatar;
    img.onerror = () => img.remove(); // si no carga, quedan las iniciales
    av.appendChild(img);
  }
  const txt = document.createElement("span");
  txt.className = "auth-txt";
  const n = document.createElement("b");
  n.className = "auth-name";
  n.textContent = name;
  const r = document.createElement("span");
  r.className = `pg-badge auth-rank ${rankBadgeClass(rankKey)}`;
  r.textContent = rank;
  txt.append(n, r);
  box.append(av, txt);
  box.title = `${name} · ${rank}` + (AUTH.name && p ? ` (Discord: ${AUTH.name})` : "");
}

const LIVE_SITE_URL = "https://dc-david8.github.io/AguilaMotors/";

function authDiscordLogin() {
  // En el programa de escritorio (archivo local) Discord devuelve a la web publicada.
  const back = location.protocol === "file:" ? LIVE_SITE_URL : location.origin + location.pathname;
  location.href = `${CV_CLOUD_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(back)}`;
}

function openLoginDialog() {
  const dlg = byId("cv-login-dlg");
  if (!dlg) return;
  byId("cv-login-err").textContent = "";
  dlg.showModal();
}

// Barra de sesion (arriba), secciones segun el rango y ventana de inicio de sesion.
function setupAuthUI() {
  const dlg = byId("cv-login-dlg");
  const isFile = location.protocol === "file:";
  byId("cv-login-discord")?.addEventListener("click", authDiscordLogin);
  if (isFile && byId("cv-login-discord-note")) {
    byId("cv-login-discord-note").textContent = "Con Discord, el programa abre la versión web ya con tu sesión.";
  }

  byId("cv-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = byId("cv-login-email").value.trim();
    const pass = byId("cv-login-pass").value;
    if (!email || !pass) {
      byId("cv-login-err").textContent = "Escribe el correo y la contraseña.";
      return;
    }
    byId("cv-login-ok").disabled = true;
    try {
      await cvCloud.login(email, pass);
      location.reload();
    } catch (err) {
      byId("cv-login-err").textContent = /invalid/i.test(err.message) ? "Correo o contraseña incorrectos." : err.message;
      byId("cv-login-ok").disabled = false;
    }
  });
  byId("cv-login-cancel")?.addEventListener("click", () => dlg?.close());

  byId("auth-login")?.addEventListener("click", openLoginDialog);
  byId("m-logout")?.addEventListener("click", () => byId("auth-logout")?.click());
  byId("auth-logout")?.addEventListener("click", async () => {
    if (!window.confirm("¿Cerrar sesión en este navegador?")) return;
    await cvCloud.logout();
    location.reload();
  });

  // ---------- pantalla de inicio de sesion ----------
  const gate = byId("login-gate");
  const showGate = AUTH.role === "none" || AUTH.role === "invitado";
  if (gate) {
    gate.hidden = !showGate;
    byId("gate-discord").onclick = authDiscordLogin;
    byId("gate-email").onclick = openLoginDialog;
    byId("gate-logout").onclick = async () => {
      await cvCloud.logout();
      location.reload();
    };
    const guest = AUTH.role === "invitado";
    byId("gate-discord").hidden = guest;
    byId("gate-email").hidden = guest;
    byId("gate-logout").hidden = !guest;
    byId("gate-msg").textContent = guest
      ? `${AUTH.name ? AUTH.name + ": tu" : "Tu"} Discord no está registrado en Aguila Motors. Pide a un Jefe que te añada en Gestión de empleados con tu ID de Discord y vuelve a entrar.`
      : "Inicia sesión para entrar al sistema del taller.";
  }
  document.documentElement.classList.remove("auth-pending");
  document.body.classList.toggle("is-gated", showGate);

  const logged = AUTH.role !== "none";
  byId("auth-login").hidden = logged;
  byId("auth-logout").hidden = !logged;
  if (byId("m-logout")) byId("m-logout").hidden = !logged;
  const userEl = byId("auth-user");
  userEl.hidden = !logged;
  if (logged) renderAuthCard();
  if (false) {
    const roleTxt = AUTH.aguila
      ? rankLabel("Jefe Aguila")
      : { jefe: "Jefatura", empleado: "Empleado", invitado: "Sin registrar", offline: "Sin conexión" }[AUTH.role] || "";
    userEl.textContent = `👤 ${AUTH.name || "Sesión iniciada"} · ${roleTxt}`;
    userEl.title = hasAccess()
      ? "Acceso a todos los módulos"
      : AUTH.role === "empleado"
        ? "Caja y Almacén de Compraventa"
        : "Tu Discord no está en la lista de empleados: solo la Caja";
  }

  // Secciones solo para Jefes: ni se muestran.
  const tabs = document.querySelectorAll("nav.tabs .tab");
  tabs.forEach((t) => {
    const target = t.dataset.tabTarget;
    t.hidden = target === "tab-inf" || target === "tab-jefe" ? !AUTH.aguila : PROTECTED_TABS.includes(target) && !(target === "tab-cv" ? canSeeCv() : hasAccess());
  });
  const active = document.querySelector("nav.tabs .tab.is-active");
  if (active?.hidden) document.querySelector('nav.tabs .tab[data-tab-target="tab-caja"]')?.click();
  const prodBtn = byId("btn-add-product");
  if (prodBtn) prodBtn.hidden = PROD_CLOUD.ok ? !AUTH.aguila : !hasAccess();

  if (AUTH.error) {
    setTimeout(() => alert(`No se pudo entrar con Discord: ${AUTH.error}`), 300);
  }
}

// Fotos privadas: enlaces firmados (validos 1 h), guardados para no
// volver a descargarlas en cada actualizacion.
const CV_SIGNED = {};
async function cvSignedUrls(paths) {
  const now = Date.now();
  const need = paths.filter((p) => !CV_SIGNED[p] || CV_SIGNED[p].exp - now < 5 * 60000);
  if (need.length && cvCloud.session) {
    try {
      const arr = await cvCloud.req(`/storage/v1/object/sign/${CV_PHOTO_BUCKET}`, {
        method: "POST",
        body: { expiresIn: 3600, paths: need },
        auth: true,
      });
      for (const it of arr || []) {
        const url = it?.signedURL || it?.signedUrl;
        if (url && !it.error) CV_SIGNED[it.path] = { url: `${CV_CLOUD_URL}/storage/v1${url}`, exp: now + 3600 * 1000 };
      }
    } catch {
      // carpeta aun publica o sin permiso: se usa el enlace publico
    }
  }
  const out = {};
  for (const p of paths) out[p] = CV_SIGNED[p]?.url || cvCloud.publicUrl(p);
  return out;
}

function cvDataUrlToBlob(dataUrl) {
  const [head, b64] = String(dataUrl).split(",");
  const type = (head.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64 || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Identificador ordenable: mantiene el orden de llegada dentro del mismo minuto.
function cvNewUid(i) {
  return `${Date.now().toString(36).padStart(9, "0")}-${String(i).padStart(5, "0")}-${Math.random().toString(36).slice(2, 6)}`;
}

const cvPhotoPath = (plate) => `${String(plate).replace(/[^A-Z0-9]/gi, "_")}-${Date.now().toString(36)}.jpg`;
