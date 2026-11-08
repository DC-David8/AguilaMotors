// Aguila Motors · Datos de empleados (Discord, IBAN, no cobra) guardados en el PC.
// (empleados-datos.js: parte de lo que antes era app.js; todos los archivos de js/ comparten
// las mismas variables y funciones, se cargan en orden desde index.html.)

// ============================================================================
// Empleados
// ============================================================================

// Pestanas que piden la contrasena de acceso (Pagos y Sorteo; tambien la piden
// Gestion de Productos y la gestion de empleados). En el codigo solo esta su
// huella SHA-256, no la contrasena. Para cambiarla, ver el README.
const PROTECTED_TABS = ["tab-conta", "tab-sorteo", "tab-cv"];


// Contrasena escrita al desbloquear, para las acciones internas que la piden.
let unlockedAccessPassword = "";

function isAccessPassword() {
  return hasAccess();
}

function unlockAccess(pass) {
  if (!hasAccess()) return false;
  unlockedAccessPassword = String(pass);
  return true;
}

function accessPassword() {
  return unlockedAccessPassword;
}

// El programa de escritorio (.exe) recibe su propia clave al guardar empleados.
// Se mantiene la antigua para que siga funcionando; la nueva se valida aqui.
const BACKEND_LEGACY_PASSWORD = "0000";


// Rol de Discord "Empleado de la semana". Al pegarlo en Discord, <@&ID> se ve
// como la etiqueta del rol. Para cambiar de rol, cambia solo el numero.
const EMPLOYEE_OF_WEEK_ROLE_ID = "1263156546519433333";
const EMPLOYEE_OF_WEEK_TAG = `<@&${EMPLOYEE_OF_WEEK_ROLE_ID}>`;

// ID de Discord de cada empleado, para etiquetarlo (<@ID>) al copiar los totales.
// Se guarda aparte, por nombre completo, porque el programa de escritorio solo
// guarda nombre, apellido y rango (y al editar un empleado le cambia el id).
const EMPLOYEE_DISCORD_STORAGE_KEY = "aguila_employee_discord_v1";

function loadEmployeeDiscordMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMPLOYEE_DISCORD_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEmployeeDiscordMap(map) {
  try {
    localStorage.setItem(EMPLOYEE_DISCORD_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // sin almacenamiento
  }
}

// Acepta el numero solo o pegado como <@123...> / <@!123...>. "" = borrar; null = no valido.
function parseDiscordId(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = s.match(/^<?@?!?(\d{17,20})>?$/);
  return m ? m[1] : null;
}

function getEmployeeDiscord(fullNameStr) {
  if (empCloudOn()) return empCloudFind(fullNameStr)?.discord || "";
  const map = isSharedReadOnly() ? SHARED_DATA.discord : loadEmployeeDiscordMap();
  return map[normalizeKeySimple(fullNameStr)] || "";
}

function setEmployeeDiscord(fullNameStr, id) {
  if (empCloudOn()) return empCloudSet(fullNameStr, { discord: id || "" });
  const map = loadEmployeeDiscordMap();
  const key = normalizeKeySimple(fullNameStr);
  if (id) map[key] = id;
  else delete map[key];
  saveEmployeeDiscordMap(map);
}

// IBAN del personaje (banco del servidor, p. ej. J739745) para depositar la nomina.
// Se guarda igual que el Discord: por nombre completo, en el navegador.
const EMPLOYEE_IBAN_STORAGE_KEY = "aguila_employee_iban_v1";
const IBAN_PENDING_TEXT = "**IBAN pendiente**"; // en negrita en Discord

function loadEmployeeIbanMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMPLOYEE_IBAN_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEmployeeIbanMap(map) {
  try {
    localStorage.setItem(EMPLOYEE_IBAN_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // sin almacenamiento
  }
}

// Una letra y 6 numeros (J739745); se aceptan minusculas y espacios. "" = borrar; null = no valido.
function parseIban(raw) {
  const s = String(raw ?? "").replace(/\s+/g, "").toUpperCase();
  if (!s) return "";
  return /^[A-Z]\d{6}$/.test(s) ? s : null;
}

function getEmployeeIban(fullNameStr) {
  if (empCloudOn()) return empCloudFind(fullNameStr)?.iban || "";
  const map = isSharedReadOnly() ? SHARED_DATA.iban : loadEmployeeIbanMap();
  return map[normalizeKeySimple(fullNameStr)] || "";
}

function setEmployeeIban(fullNameStr, iban) {
  if (empCloudOn()) return empCloudSet(fullNameStr, { iban: iban || "" });
  const map = loadEmployeeIbanMap();
  const key = normalizeKeySimple(fullNameStr);
  if (iban) map[key] = iban;
  else delete map[key];
  saveEmployeeIbanMap(map);
}

// Empleados que no cobran la nomina: no se les pide IBAN y no suman al Total a Pagar.
const EMPLOYEE_NOPAY_STORAGE_KEY = "aguila_employee_nopay_v1";
const NO_PAY_TEXT = "No cobra";

function loadEmployeeNoPayMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMPLOYEE_NOPAY_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveEmployeeNoPayMap(map) {
  try {
    localStorage.setItem(EMPLOYEE_NOPAY_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // sin almacenamiento
  }
}

function isEmployeeNoPay(fullNameStr) {
  if (empCloudOn()) return !!empCloudFind(fullNameStr)?.noPay;
  const map = isSharedReadOnly() ? SHARED_DATA.noPay : loadEmployeeNoPayMap();
  return !!map[normalizeKeySimple(fullNameStr)];
}

function setEmployeeNoPay(fullNameStr, noPay) {
  if (empCloudOn()) return empCloudSet(fullNameStr, { noPay: !!noPay });
  const map = loadEmployeeNoPayMap();
  const key = normalizeKeySimple(fullNameStr);
  if (noPay) map[key] = true;
  else delete map[key];
  saveEmployeeNoPayMap(map);
}
