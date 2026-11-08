// Aguila Motors · Copia de seguridad de Supabase (la lanza .github/workflows/copia-seguridad.yml).
// Lee todas las tablas con la clave secreta (se salta las reglas de acceso, solo lectura),
// las junta en un JSON, lo comprime y lo CIFRA con la contraseña BACKUP_PASSWORD
// (AES-256-GCM, clave derivada con scrypt). El repositorio es público: sin la
// contraseña el archivo no se puede leer.
//
//   Copia:      node copia.mjs backup  <archivo.enc>
//   Descifrar:  node copia.mjs abrir   <archivo.enc> <salida.json>
import { gzipSync, gunzipSync } from "node:zlib";
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const TABLAS = [
  "employees", "emp_historial", "pagos_semanas", "app_settings", "productos", "productos_historial",
  "informes", "cv_tx", "cv_photos", "catalogo", "discord_log",
];
const URL = process.env.SUPABASE_URL || "https://tguizsunuekxqfgiclfq.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_KEY;
const PASS = process.env.BACKUP_PASSWORD;
const [, , modo, archivo, salida] = process.argv;

function clave(pass, salt) {
  return scryptSync(pass, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

async function leerTabla(t) {
  const out = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL}/rest/v1/${t}?select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${desde}-${desde + 999}`, "Range-Unit": "items" },
    });
    if (r.status === 404) return null; // la tabla no existe (SQL sin ejecutar)
    if (!r.ok && r.status !== 206) throw new Error(`${t}: HTTP ${r.status} ${await r.text()}`);
    const filas = await r.json();
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}

if (modo === "backup") {
  if (!KEY || !PASS) throw new Error("Faltan los secretos SUPABASE_SERVICE_KEY y BACKUP_PASSWORD.");
  const datos = { creada: new Date().toISOString(), tablas: {} };
  for (const t of TABLAS) {
    const filas = await leerTabla(t);
    if (filas === null) {
      console.log(`· ${t}: no existe, se salta`);
      continue;
    }
    datos.tablas[t] = filas;
    console.log(`· ${t}: ${filas.length} filas`);
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave(PASS, salt), iv);
  const cuerpo = Buffer.concat([c.update(gzipSync(JSON.stringify(datos))), c.final()]);
  writeFileSync(archivo, Buffer.concat([Buffer.from("AGUILA1"), salt, iv, c.getAuthTag(), cuerpo]));
  console.log(`Copia cifrada: ${archivo} (${cuerpo.length} bytes)`);
} else if (modo === "abrir") {
  if (!PASS) throw new Error("Pon la contraseña en BACKUP_PASSWORD.");
  const b = readFileSync(archivo);
  if (b.subarray(0, 7).toString() !== "AGUILA1") throw new Error("No es una copia de Aguila Motors.");
  const salt = b.subarray(7, 23), iv = b.subarray(23, 35), tag = b.subarray(35, 51);
  const d = createDecipheriv("aes-256-gcm", clave(PASS, salt), iv);
  d.setAuthTag(tag);
  const json = gunzipSync(Buffer.concat([d.update(b.subarray(51)), d.final()]));
  writeFileSync(salida, json);
  const datos = JSON.parse(json);
  console.log(`Copia del ${datos.creada}:`);
  for (const [t, f] of Object.entries(datos.tablas)) console.log(`· ${t}: ${f.length} filas`);
} else {
  console.log("Uso: node copia.mjs backup <archivo.enc>  |  node copia.mjs abrir <archivo.enc> <salida.json>");
  process.exit(1);
}
