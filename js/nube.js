// Aguila Motors · Base de datos en línea (Supabase) y empleados en línea.
// (nube.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ---------------------------------------------------------------------------
// Base de datos en linea (Supabase). La clave "publishable" es publica: solo
// deja leer. Para escribir hace falta iniciar sesion como encargado, y las
// reglas de la base (RLS) lo exigen en el servidor. Si la base no responde,
// la pestana sigue funcionando con los datos de esta PC / datos.js.
// ---------------------------------------------------------------------------
const CV_CLOUD_URL = window.AGUILA_CLOUD_URL || "https://tguizsunuekxqfgiclfq.supabase.co";
const CV_CLOUD_KEY = window.AGUILA_CLOUD_KEY || "sb_publishable_ur32LOkr30IpJlc8ek9Rfg_UDYo_D7X";
const CV_SESSION_KEY = "aguila_cv_session_v1";
const CV_PHOTO_BUCKET = "cv-fotos";
const CV_FIELDS = ["uid", "ts", "sort", "mediator", "owner", "buyer", "price", "model", "plate", "company"];
let CV_CLOUD_CACHE = null; // { tx, photoPaths } de la ultima lectura correcta

const cvCloud = {
  session: (() => {
    try {
      return JSON.parse(localStorage.getItem(CV_SESSION_KEY) || "null");
    } catch {
      return null;
    }
  })(),

  setSession(j) {
    this.session = {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000,
      email: j.user?.email || this.session?.email || "",
    };
    try {
      localStorage.setItem(CV_SESSION_KEY, JSON.stringify(this.session));
    } catch {
      // sin almacenamiento: la sesion dura hasta cerrar la pagina
    }
  },

  clearSession() {
    this.session = null;
    try {
      localStorage.removeItem(CV_SESSION_KEY);
    } catch {
      // nada
    }
  },

  async req(path, { method = "GET", body, headers = {}, auth = false } = {}) {
    const h = { apikey: CV_CLOUD_KEY, ...headers };
    if (auth) {
      const tok = await this.token();
      if (!tok) throw new Error("Tu sesión caducó: vuelve a iniciar sesión (🔑 Entrar).");
      h.Authorization = `Bearer ${tok}`;
    } else if (this.session && !path.startsWith("/auth/")) {
      // Lecturas: con sesion, el servidor decide que puede ver (solo Jefes).
      const tok = await this.token();
      if (tok) h.Authorization = `Bearer ${tok}`;
    }
    let payload = body;
    if (body !== undefined && !(body instanceof Blob)) {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    let r;
    try {
      r = await fetch(CV_CLOUD_URL + path, { method, headers: h, body: payload, signal: ctl.signal });
    } catch {
      throw new Error("No hay conexión con la base de datos en línea.");
    } finally {
      clearTimeout(timer);
    }
    const text = await r.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!r.ok) {
      const e = new Error((data && (data.error_description || data.msg || data.message || data.error)) || `Error ${r.status}`);
      e.status = r.status;
      e.code = data?.code || data?.error_code || "";
      throw e;
    }
    return data;
  },

  async login(email, password) {
    const j = await this.req("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
    this.setSession(j);
  },

  async token() {
    if (!this.session) return null;
    if (Date.now() > this.session.expires_at - 60000) {
      try {
        const j = await this.req("/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: { refresh_token: this.session.refresh_token },
        });
        this.setSession(j);
      } catch {
        this.clearSession();
        return null;
      }
    }
    return this.session.access_token;
  },

  async logout() {
    try {
      if (this.session) await this.req("/auth/v1/logout", { method: "POST", auth: true });
    } catch {
      // aunque falle, se cierra en esta PC
    }
    this.clearSession();
  },

  // Lee toda la tabla en paginas de 1000 (el limite por defecto de Supabase).
  async selectAll(table, order) {
    const out = [];
    for (let off = 0; ; off += 1000) {
      const page = await this.req(`/rest/v1/${table}?select=*&order=${order}&limit=1000&offset=${off}`);
      out.push(...(page || []));
      if (!page || page.length < 1000) return out;
    }
  },

  async upsert(table, rows, onConflict) {
    for (let i = 0; i < rows.length; i += 500) {
      await this.req(`/rest/v1/${table}?on_conflict=${onConflict}`, {
        method: "POST",
        body: rows.slice(i, i + 500),
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        auth: true,
      });
    }
  },

  del(table, filter) {
    return this.req(`/rest/v1/${table}?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" }, auth: true });
  },

  uploadPhoto(path, blob) {
    return this.req(`/storage/v1/object/${CV_PHOTO_BUCKET}/${path}`, {
      method: "POST",
      body: blob,
      headers: { "Content-Type": blob.type || "image/jpeg", "x-upsert": "true", "cache-control": "31536000" },
      auth: true,
    });
  },

  removePhotos(paths) {
    if (!paths.length) return Promise.resolve();
    return this.req(`/storage/v1/object/${CV_PHOTO_BUCKET}`, { method: "DELETE", body: { prefixes: paths }, auth: true });
  },

  publicUrl(path) {
    return `${CV_CLOUD_URL}/storage/v1/object/public/${CV_PHOTO_BUCKET}/${path}`;
  },
};

// ---------------------------------------------------------------------------
// Empleados en linea (tabla "employees" de Supabase). Si la tabla existe y
// tiene empleados, manda sobre datos.js y sobre lo guardado en la PC. Leer
// es libre; cambiar exige la sesion de encargado (la misma de Compraventa).
// ---------------------------------------------------------------------------
const EMP_CLOUD = { ok: false, tried: false, error: "", list: [], fired: [] };

function empCloudOn() {
  return EMP_CLOUD.ok && EMP_CLOUD.list.length > 0;
}

async function empCloudLoad() {
  try {
    const rows = await cvCloud.selectAll("employees", "surname.asc,name.asc");
    const all = rows
      .map((r) => ({
        id: String(r.id),
        name: String(r.name || "").trim(),
        surname: String(r.surname || "").trim(),
        rank: String(r.rank || "").trim(),
        discord: String(r.discord || ""),
        iban: String(r.iban || ""),
        noPay: r.no_pay === true,
        firedAt: r.despedido_at || "",
        firedBy: String(r.despedido_por || ""),
        firedReason: String(r.despedido_motivo || ""),
        discordPrev: String(r.discord_previo || ""),
        altaAt: String(r.alta_at || "").slice(0, 10),
        contratadoAt: String(r.contratado_at || "").slice(0, 10),
      }))
      .filter((e) => e.name && e.surname);
    // Con el SQL 11 la tabla tiene la fecha de contratacion: se pueden guardar las dos fechas.
    EMP_CLOUD.hasDates = rows.some((r) => "contratado_at" in r);
    // Los despedidos quedan en la tabla como registro, pero fuera de la plantilla.
    EMP_CLOUD.fired = all.filter((e) => e.firedAt).sort((x, y) => String(y.firedAt).localeCompare(String(x.firedAt)));
    EMP_CLOUD.list = all.filter((e) => !e.firedAt);
    EMP_CLOUD.ok = true;
    EMP_CLOUD.error = "";
  } catch (e) {
    EMP_CLOUD.ok = false;
    EMP_CLOUD.error =
      e.code === "PGRST205" || e.code === "42P01" || e.status === 404
        ? "La tabla de empleados aún no existe en Supabase (falta pegar el SQL)."
        : e.message;
  }
  EMP_CLOUD.tried = true;
}

function empCloudFind(fullNameStr) {
  const k = normalizeKeySimple(fullNameStr);
  return EMP_CLOUD.list.find((e) => normalizeKeySimple(fullName(e)) === k);
}

function empCloudRequireSession() {
  if (!cvCloud.session || !hasAccess()) throw new Error("Solo los Jefes pueden cambiar los empleados (inicia sesión con 🔑 Entrar).");
}

// Un mismo Discord puede tener varios personajes (char1, char2...). Para el
// acceso y la tarjeta de sesion manda el de rango mas alto.
function empMainOf(discord) {
  if (!discord) return null;
  const mine = EMP_CLOUD.list.filter((x) => x.discord === discord);
  return mine.sort((x, y) => rankOrder(y.rank) - rankOrder(x.rank))[0] || null;
}
function empAltsOf(e) {
  if (!e?.discord) return [];
  return EMP_CLOUD.list.filter((x) => x.discord === e.discord && String(x.id) !== String(e.id));
}
