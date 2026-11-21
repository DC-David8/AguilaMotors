// Aguila Motors · Anuncio de precios en Discord (v163).
// La Caja arma el texto y la imagen con los precios vigentes y el bot los
// publica en el canal de precios: primero el texto y al final la imagen.
// Cuando el Jefe Aguila cambia un precio en la Caja, se editan los mismos
// mensajes solos. Fuentes de la imagen: libres (OFL/Apache), en /fonts.

const PREC_CANAL_TXT = "canal de precios";
const PREC_VER = 2; // súbelo si cambia el diseño para que se vuelva a publicar
const PREC = { sig: null, busy: false, timer: 0, pending: false };


const PIMG_ICONS = {
  motos: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-6h5l4 6M9.5 10.5L8 7H5.5M14.5 10.5l1.5-3.5h2.5"/>',
  car: '<path d="M3 15l2-5h14l2 5v3H3z"/><path d="M7 10l2-3h6l2 3"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>',
  sport: '<path d="M2 16l3-4 6-2h5l6 3v3H2z"/><circle cx="7" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/><path d="M11 10l1-2h3"/>',
  vip: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12"/>',
  camiones: '<path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  aereos: '<path d="M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-2v4l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4l8 2z"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0 5-5l-2 2-2-2z"/>',
  grua: '<path d="M4 20h16M6 20V8l10-4v4"/><path d="M16 8v5a2 2 0 1 1-2 2"/>',
  tienda: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  cam: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-2c1-3-2-11-7-11z"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/>',
  neon: '<path d="M4 16c2-4 4-4 6 0s4 4 6 0 4-4 4-4"/><path d="M4 10c2-4 4-4 6 0s4 4 6 0"/>',
  nitro: '<rect x="7" y="5" width="10" height="17" rx="3.8"/><path d="M10.5 5V2.8h3V5M9 2.4h6"/>',
  doc: '<path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4M9 11h7M9 15h7M9 19h4"/>',
  pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
};

const pimgIc = (k, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24">${PIMG_ICONS[k] || ""}</svg>`;
const pimgMoney = (v) => (v > 0 ? "$" + Math.round(v).toLocaleString("es-ES", { useGrouping: "always" }).replace(/,/g, ".") : "—");
const pimgEsc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// data = { cols:[{key,label,icon,sub}], groups:[{label, rows:[{name, prices:[]}]}], full:[],
//          vipNote, taller:[{name,sub,price}], grua:[…], gruaExtra:[…], tienda, cam, neon, nitro, cv, fecha, base }
function precImgHTML(d) {
  const b = d.base || "";
  const css = `
  @font-face{font-family:Dirt;src:url(${b}fonts/rubik-dirt-latin-400-normal.woff2)}
  @font-face{font-family:Marker;src:url(${b}fonts/permanent-marker-latin-400-normal.woff2)}
  @font-face{font-family:Anton;src:url(${b}fonts/anton-latin-400-normal.woff2)}
  @font-face{font-family:Russo;src:url(${b}fonts/russo-one-latin-400-normal.woff2)}
  @font-face{font-family:Chakra;font-weight:600;src:url(${b}fonts/chakra-petch-latin-600-normal.woff2)}
  @font-face{font-family:Chakra;font-weight:700;src:url(${b}fonts/chakra-petch-latin-700-normal.woff2)}
  @font-face{font-family:Barlow;font-weight:500;src:url(${b}fonts/barlow-semi-condensed-latin-500-normal.woff2)}
  @font-face{font-family:Barlow;font-weight:600;src:url(${b}fonts/barlow-semi-condensed-latin-600-normal.woff2)}
  @font-face{font-family:Barlow;font-weight:700;src:url(${b}fonts/barlow-semi-condensed-latin-700-normal.woff2)}
  .pimg{--or:#ff7a12;--or2:#ffb03a;--line:rgba(255,140,40,.22);width:1500px;box-sizing:border-box;padding:0 0 26px;color:#f4ece4;font-family:Barlow,sans-serif;font-weight:500;
    background:
      radial-gradient(900px 420px at 18% -4%,rgba(255,110,20,.28),transparent 70%),
      radial-gradient(700px 500px at 100% 40%,rgba(255,90,10,.10),transparent 70%),
      repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 2px,transparent 2px 6px),
      repeating-linear-gradient(-45deg,rgba(0,0,0,.25) 0 2px,transparent 2px 6px),
      #0c0907;position:relative;overflow:hidden}
  .pimg *{box-sizing:border-box}
  .pimg .ic{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;vertical-align:-.12em}
  .pimg .flag{height:14px;background:conic-gradient(#f4ece4 25%,#15100c 0 50%,#f4ece4 0 75%,#15100c 0) 0 0/14px 14px;opacity:.9}
  .pimg .flag.b{opacity:.55}
  .pimg .hd{display:flex;align-items:center;gap:26px;padding:26px 44px 22px;position:relative}
  .pimg .hd img{width:172px;height:172px;object-fit:contain;filter:drop-shadow(0 0 24px rgba(255,120,20,.45))}
  .pimg .brand{flex:1;min-width:0}
  .pimg .brand h1{margin:0;font:400 90px/1 Dirt,sans-serif;white-space:nowrap;letter-spacing:1px;text-transform:uppercase;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.5)}
  .pimg .brand h1 span{background:linear-gradient(180deg,#ffc04a,#ff6a00 70%,#d24a00);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 4px 0 rgba(0,0,0,.5))}
  .pimg .brand .tag{margin-top:12px;font:400 19px Russo,sans-serif;letter-spacing:.55em;color:#d9cfc4}
  .pimg .brand .tag b{color:var(--or);font-weight:400}
  .pimg .slogan{transform:rotate(-6deg);text-align:right;font:400 38px/1.05 Marker,sans-serif;text-transform:uppercase;color:#fff;margin-right:6px}
  .pimg .slogan span{color:var(--or)}
  .pimg .speed{position:absolute;left:230px;right:40px;bottom:10px;height:3px;background:linear-gradient(90deg,transparent,var(--or) 30%,var(--or2) 60%,transparent)}
  .pimg .wrap{padding:0 34px;display:grid;grid-template-columns:minmax(0,1fr);gap:22px}
  .pimg .pcard{background:linear-gradient(180deg,rgba(28,20,14,.92),rgba(16,12,9,.92));border:2px solid rgba(255,122,18,.55);border-radius:18px;padding:20px 22px 18px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 28px rgba(255,100,10,.14),inset 0 1px 0 rgba(255,255,255,.05);position:relative}
  .pimg .pcard::before{content:"";position:absolute;left:24px;top:-2px;width:120px;height:4px;border-radius:0 0 4px 4px;background:linear-gradient(90deg,var(--or2),var(--or))}
  .pimg .row3 h2{font-size:36px;gap:10px}.pimg .row3 h2 .ic{width:32px;height:32px}.pimg .row3 li{font-size:22px}.pimg .row3 li .p{font-size:23px}
  .pimg h2{margin:0 0 12px;font:400 44px/1 Anton,sans-serif;text-transform:uppercase;color:#fff;display:flex;align-items:center;gap:14px;letter-spacing:.5px}
  .pimg h2 .ic{color:var(--or);width:40px;height:40px;stroke-width:2}
  .pimg h2 .emo{font:400 34px/1 "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif}
  .pimg h2 em{font-style:normal;color:var(--or)}
  .pimg h2 small{font:600 20px Barlow;color:#bfb2a6;text-transform:none;margin-left:auto;letter-spacing:0}
  .pimg .pcard::after{content:none}
  .tt th,.tt td{background:none;border-left:0;border-right:0;border-top:0;text-transform:none}
  .tt th{text-transform:uppercase;position:static;text-align:center}
  table.tt{width:100%;margin:0;background:none;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:24px}
  .tt th{font:400 19px Russo,sans-serif;color:#efe6dc;text-transform:uppercase;padding:6px 4px 12px;vertical-align:bottom;border-bottom:2px solid var(--or)}
  .tt th .ic{display:block;margin:0 auto 6px;width:40px;height:40px;color:var(--or2);stroke-width:1.6}
  .tt th.first{text-align:left;color:var(--or);font-size:22px;padding-left:12px}
  .tt th small{display:block;font:700 13px Barlow;color:var(--or);letter-spacing:.15em}
  .tt td{padding:7px 4px;text-align:center;font:700 25px Chakra,sans-serif;color:#fff;border-bottom:1px solid rgba(255,255,255,.06)}
  .tt td.n{text-align:left;font:600 25px Barlow;color:#f4ece4;padding-left:12px;white-space:nowrap}
  .tt .vip{background:rgba(255,180,60,.07)}
  .tt th.vip{background:linear-gradient(180deg,transparent,rgba(255,180,60,.12));border-radius:12px 12px 0 0}
  .tt tr.g td{padding:14px 12px 5px;border:0;text-align:left;font:400 16px Russo,sans-serif;letter-spacing:.3em;color:var(--or)}
  .tt tr.g td span{display:inline-flex;align-items:center;gap:10px}
  .tt tr.g td span::after{content:"";width:1100px;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
  .tt tr.ftr td{background:linear-gradient(90deg,#ff8a1c,#ff5e00);color:#fff;font-size:29px;border:0;text-shadow:0 2px 0 rgba(0,0,0,.25);padding:12px 4px}
  .tt tr.ftr td.n{font:400 30px Anton,sans-serif;letter-spacing:.5px;border-radius:12px 0 0 12px;padding-left:14px}
  .tt tr.ftr td:last-child{border-radius:0 12px 12px 0}
  .tt tr.ftr td .ic{margin-right:8px}
  .pimg .note{margin-top:14px;padding:11px 16px;border:1px solid rgba(255,180,60,.35);background:rgba(255,160,40,.07);border-radius:12px;font:500 19px/1.35 Barlow;color:#e9ddd0}
  .pimg .note b{color:var(--or2)}
  .pimg .row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px}
  .pimg .row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
  .pimg .col{display:grid;gap:22px;align-content:start}
  .pimg ul{list-style:none;margin:0;padding:0}
  .pimg li{display:flex;align-items:center;gap:12px;padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.07);font:600 24px Barlow}
  .pimg li:last-child{border-bottom:0}
  .pimg li .ic{color:var(--or);width:22px;height:22px;flex:none}
  .pimg li .t{flex:1;min-width:0;line-height:1.1}
  .pimg li .t small{display:block;font:600 15px Barlow;color:var(--or2);letter-spacing:.03em;margin-top:2px}
  .pimg li .p{font:700 25px Chakra,sans-serif;color:#fff;white-space:nowrap}
  .pimg li.big .p{color:var(--or2)}
  .pimg .pack{font:700 12px Russo,sans-serif;letter-spacing:.12em;color:#1a0f06;background:var(--or2);border-radius:5px;padding:2px 6px;margin-left:8px;vertical-align:3px}
  .pimg h3{margin:14px 0 4px;font:400 19px Russo,sans-serif;letter-spacing:.2em;color:var(--or)}
  .pimg .warn{margin:10px 0 2px;padding:8px 12px;border-radius:10px;background:rgba(255,90,30,.10);border:1px solid rgba(255,110,40,.35);font:600 18px Barlow;color:#ffd2b8}
  .pimg .nitro{display:grid;grid-template-columns:1fr 1fr;gap:0 30px}
  .pimg .ft{margin-top:26px;display:flex;align-items:center;justify-content:center;gap:24px;padding:0 34px}
  .pimg .ft .ln{flex:1;height:3px;background:linear-gradient(90deg,transparent,var(--or))}
  .pimg .ft .ln.r{background:linear-gradient(270deg,transparent,var(--or))}
  .pimg .ft .c{text-align:center}
  .pimg .ft .c b{display:block;font:400 44px Dirt,sans-serif;letter-spacing:1px;color:#fff;text-transform:uppercase}
  .pimg .ft .c b span{color:var(--or)}
  .pimg .ft .c div{font:600 19px Barlow;color:#bfb2a6;margin-top:2px}
  .pimg .loc{display:flex;gap:16px;justify-content:center;margin:16px 34px 0}
  .pimg .loc div{display:flex;align-items:center;gap:10px;padding:10px 20px;border-radius:999px;border:1px solid rgba(255,122,18,.5);background:rgba(255,122,18,.08);font:600 21px Barlow}
  .pimg .loc .ic{color:var(--or);width:24px;height:24px}
  `;
  const list = (items, icon) =>
    `<ul>${items
      .filter((x) => x.price > 0)
      .map((x) => `<li class="${x.big ? "big" : ""}">${pimgIc(x.icon || icon)}<span class="t">${pimgEsc(x.name)}${x.pack ? `<span class="pack">${x.pack}</span>` : ""}${x.sub ? `<small>${pimgEsc(x.sub)}</small>` : ""}</span><span class="p">${pimgMoney(x.price)}</span></li>`)
      .join("")}</ul>`;
  const vipIdx = d.cols.findIndex((c) => c.key === "gama_vip");
  const td = (v, i) => `<td class="${i === vipIdx ? "vip" : ""}">${pimgMoney(v)}</td>`;
  const table = `<table class="tt"><colgroup><col style="width:250px">${d.cols.map((c)=>`<col${c.key==="camiones"||c.key==="gama_media"?' style="width:150px"':""}>`).join("")}</colgroup><thead><tr><th class="first">Modificación</th>${d.cols
    .map((c, i) => `<th class="${i === vipIdx ? "vip" : ""}">${pimgIc(c.icon)}${pimgEsc(c.label)}${c.sub ? `<small>${pimgEsc(c.sub)}</small>` : ""}</th>`)
    .join("")}</tr></thead><tbody>${d.groups
    .map((g) => `<tr class="g"><td colspan="${d.cols.length + 1}"><span>${pimgEsc(g.label)}</span></td></tr>` + g.rows.map((r) => `<tr><td class="n">${pimgEsc(r.name)}</td>${r.prices.map(td).join("")}</tr>`).join(""))
    .join("")}<tr><td colspan="${d.cols.length + 1}" style="border:0;padding:6px"></td></tr><tr class="ftr"><td class="n">${pimgIc("star")}Full Tuning</td>${d.full.map((v) => `<td>${pimgMoney(v)}</td>`).join("")}</tr></tbody></table>`;
  return `<style>${css}</style><div class="pimg">
  <div class="flag"></div>
  <div class="hd"><img src="${b}aguila_motors_logo.png" alt="">
    <div class="brand"><h1>Aguila <span>Motors</span></h1><div class="tag">TALLER <b>·</b> MODIFICACIONES <b>·</b> SERVICIOS</div></div>
    <div class="slogan">Tu vehículo,<br>nuestra <span>pasión</span></div><div class="speed"></div></div>
  <div class="wrap">
    <section class="pcard"><h2>${pimgIc("wrench")}Modificaciones <em>de vehículos</em><small>Precio por pieza, según la gama</small></h2>${table}
      <div class="note"><b>💎 Gama VIP:</b> ${pimgEsc(d.vipNote)}</div></section>
    <div class="row2">
      <div class="col">
        <section class="pcard"><h2>${pimgIc("wrench")}Servicios <em>en el taller</em></h2>${list(d.taller, "wrench")}</section>
        <section class="pcard"><h2>${pimgIc("tienda")}Tienda</h2>${list(d.tienda, "tienda")}</section>
      </div>
      <section class="pcard"><h2>${pimgIc("grua")}Fuera del taller <em>(grúa)</em></h2>${list(d.grua, "wrench")}
        <div class="warn">⚠ El desplazamiento se cobra aparte, en cualquier zona del mapa.</div>
        <h3>DESPLAZAMIENTO Y RESCATE</h3>${list(d.gruaExtra, "grua")}</section>
    </div>
    <div class="row3">
      <section class="pcard"><h2><span class="emo">🦎</span>Pintura <em>camaleónica</em></h2>${list(d.cam, "cam")}</section>
      <section class="pcard"><h2>${pimgIc("neon")}Neones <em>RGB</em></h2>${list(d.neon, "neon")}</section>
      <section class="pcard"><h2><span class="emo">🤝</span>Mediación <em>de venta</em></h2>${list(d.cv, "doc")}</section>
    </div>
    <section class="pcard"><h2>${pimgIc("bolt")}<em>Nitro</em><small>Pregunta por él en el taller</small></h2><div class="nitro">${list(d.nitro.slice(0, 1), "nitro")}${list(d.nitro.slice(1), "nitro")}</div></section>
  </div>
  <div class="loc"><div>${pimgIc("pin")}Parcela 7231</div><div>${pimgIc("grua")}¿No puedes venir? Pide un mecánico: vamos donde estés</div></div>
  <div class="ft"><div class="ln"></div><div class="c"><b>Aguila <span>Motors</span></b><div>Precios actualizados al ${pimgEsc(d.fecha)}</div></div><div class="ln r"></div></div>
  <div class="flag b" style="margin-top:22px"></div>
</div>`;
}

// Datos desde el catálogo de la Caja (PRODUCTS, ya con los precios de la nube).
function precImgData(priceOf, fecha, extra = {}) {
  const plus = (cat, icon) => (extra[cat] || []).map((x) => ({ name: x.name, price: x.price, icon }));
  const cols = [
    { key: "motos", label: "Motos", icon: "motos" },
    { key: "gama_baja", label: "Gama Baja", icon: "car" },
    { key: "gama_media", label: "Gama Media", icon: "car" },
    { key: "gama_alta", label: "Gama Alta", icon: "sport" },
    { key: "gama_vip", label: "Gama VIP", icon: "vip", sub: "DONACIÓN" },
    { key: "camiones", label: "Camiones", icon: "camiones" },
    { key: "aereos", label: "Aéreos", icon: "aereos" },
  ];
  const gl = Object.fromEntries(GAMAS.map((g) => [g.key, g.label]));
  const row = (piece) => ({ name: piece, prices: cols.map((c) => priceOf(`${piece} (${gl[c.key]})`)) });
  const s = (name, label, extra = {}) => ({ name: label || name, price: priceOf(name), ...extra });
  return {
    cols,
    groups: [
      { label: "ESTÉTICA", rows: ["Pintura", "Neones", "Cambio de Luces", "Ruedas", "Humo de Ruedas", "Claxon", "Tintado de Lunas"].map(row) },
      { label: "CARROCERÍA", rows: ["Carrocería"].map(row) },
      { label: "RENDIMIENTO", rows: ["Turbo", "Motor", "Transmisión", "Blindaje", "Suspensión", "Frenos"].map(row) },
    ],
    full: cols.map((c) => priceOf(`Full Tuning (${gl[c.key]})`)),
    vipNote: "todos los vehículos por donación al servidor (Prime, Deluxe, VIP, únicos, de coleccionista y personalizados) se cobran con estos precios, sea moto, coche, avión o camión. También su Full Tuning.",
    taller: [
      s("Reparación (Taller)", "Reparación"),
      s("Limpieza (Taller)", "Limpieza"),
      s("Repostaje (Taller)", "Repostaje"),
      s("Repostaje + Limpieza (Taller)", "Repostaje + Limpieza", { pack: "PACK" }),
      s("Reparación + Repostaje (Taller)", "Reparación + Repostaje", { pack: "PACK" }),
      s("Reparación + Limpieza (Taller)", "Reparación + Limpieza", { pack: "PACK" }),
      s("Reparación + Limpieza + Repostaje (Taller)", "Reparación + Limpieza + Repostaje", { pack: "COMPLETO", big: true }),
      ...plus("servicios_taller"),
    ],
    grua: [
      s("Reparación (Grúa)", "Reparación"),
      s("Bayetas o Limpieza (Grúa)", "Bayetas o Limpieza"),
      s("Repostaje (Grúa)", "Repostaje"),
      s("Repostaje + Limpieza (Grúa)", "Repostaje + Limpieza", { pack: "PACK" }),
      s("Reparación + Repostaje (Grúa)", "Reparación + Repostaje", { pack: "PACK" }),
      s("Reparación + Limpieza (Grúa)", "Reparación + Limpieza", { pack: "PACK" }),
      s("Reparación + Limpieza + Repostaje (Grúa)", "Reparación + Limpieza + Repostaje", { pack: "COMPLETO", big: true }),
    ],
    gruaExtra: [
      s("Grúa Terrestre", "", { sub: "Desplazamiento", icon: "grua" }),
      s("Grúa Aérea", "", { sub: "Desplazamiento en helicóptero", icon: "aereos" }),
      s("Rescate Aéreo Completo", "", { sub: "Grúa aérea + reparación + limpieza + repostaje", icon: "aereos", big: true }),
      ...plus("servicios_grua", "grua"),
    ],
    tienda: [s("Kit de Desvuelco"), s("Rueda"), s("Mando de Neones RGB"), s("Bayetas"), ...plus("tienda")],
    cam: [
      s("Pintura Camaleónica (primera vez)", "Primera vez", { big: true }),
      s("Cambio de Color Camaleónico", "Cambio de color"),
      s("Cambio de Color Camaleónico (Aéreos)", "Cambio de color (aéreos)"),
      ...plus("camaleonica"),
    ],
    neon: [s("Instalación de Neones RGB", "Instalación de neones RGB", { big: true }), s("Mando de Neones RGB", "Mando de neones RGB", { sub: "Se compra en la tienda" }), ...plus("neones")],
    nitro: [s("Instalación de Nitro ⚠", "Instalación de nitro", { big: true }), s("Botella de Nitro", "Botella de nitro"), ...plus("nitro")],
    cv: [
      s("Mediación de Venta (Gama Baja)", "Gama Baja"),
      s("Mediación de Venta (Gama Media)", "Gama Media"),
      s("Mediación de Venta (Gama Alta)", "Gama Alta"),
      s("Mediación de Venta (Gama Camiones)", "Camiones"),
      ...plus("compraventa"),
    ],
    fecha,
  };
}

// --------------------------------------------------------------- DATOS ---
// Precios vigentes de la Caja (con los cambios de la nube) y productos agregados.
function precSource() {
  const all = typeof getAllProducts === "function" ? getAllProducts() : PRODUCTS;
  const map = new Map(all.map((p) => [p.name, Number(p.price) || 0]));
  const fixed = new Set(PRODUCTS.map((p) => p.name));
  const extra = {};
  for (const p of all) {
    if (fixed.has(p.name) || !(Number(p.price) > 0)) continue;
    (extra[p.category || "otros"] ||= []).push({ name: p.name, price: Number(p.price) });
  }
  return { priceOf: (n) => map.get(n) || 0, extra };
}
const precHoy = () => new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" });

// ---------------------------------------------------------------- TEXTO ---
const precM = (v) => pimgMoney(v);
function precRange(vals) {
  const v = vals.filter((x) => x > 0);
  if (!v.length) return "—";
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return lo === hi ? `\`${precM(lo)}\`` : `\`${precM(lo)}–${precM(hi).slice(1)}\``;
}
function precText(src, fecha) {
  const { priceOf, extra } = src;
  const D = precImgData(priceOf, fecha, extra);
  const EM = { motos: "🏍️", gama_baja: "🚙", gama_media: "🚗", gama_alta: "🏎️", gama_vip: "💎", camiones: "🚛", aereos: "🚁" };
  const UP = { motos: "MOTOS", gama_baja: "GAMA BAJA", gama_media: "GAMA MEDIA", gama_alta: "GAMA ALTA", gama_vip: "GAMA VIP", camiones: "GAMA CAMIONES", aereos: "GAMA AÉREOS" };
  // Por gama: rango de cada bloque (estética, carrocería, rendimiento) y Full Tuning.
  let rango = false;
  const lines = D.cols.map((c, i) => {
    const g = D.groups.map((gr) => gr.rows.map((r) => r.prices[i]));
    const parts = g.map(precRange);
    if (parts.some((x) => x.includes("–"))) rango = true;
    return { key: c.key, line: `🎨 ${parts[0]} · 🚘 ${parts[1]} · ⚙️ ${parts[2]} · ⭐ **\`${precM(D.full[i])}\`**` };
  });
  // Gamas con los mismos precios van juntas (menos la VIP, que lleva su aviso).
  const blocks = [];
  for (const l of lines) {
    const same = l.key !== "gama_vip" && blocks.find((b) => b.line === l.line && !b.keys.includes("gama_vip"));
    if (same) same.keys.push(l.key);
    else blocks.push({ keys: [l.key], line: l.line });
  }
  const gamaTxt = blocks
    .map((b) => {
      const head = b.keys.map((k) => `${EM[k]} **${UP[k]}**`).join(" · ");
      if (b.keys[0] === "gama_vip")
        return `${head} *(vehículos por donación al server)*\n${b.line}\n-# Prime, Deluxe, VIP, únicos, de coleccionista y personalizados: da igual si es moto, coche, avión o camión, todos van con estos precios.`;
      return `${head}\n${b.line}`;
    })
    .join("\n\n");
  const q = (items, iconOf) =>
    items
      .filter((x) => x.price > 0)
      .map((x) => `> ${iconOf(x)} ${x.name} → ${x.big ? `**\`${precM(x.price)}\`**` : `\`${precM(x.price)}\``}${x.sub && x.textSub ? ` *(${x.textSub})*` : ""}`)
      .join("\n");
  const svcIcon = (x) => (x.pack === "COMPLETO" ? "🌟" : x.pack ? "📦" : /^Repar/.test(x.name) ? "🔧" : /^Repost/.test(x.name) ? "⛽" : /Limp|Bayet/.test(x.name) ? "🧽" : "🔹");
  const gruaExtra = D.gruaExtra.map((x) => ({ ...x, textSub: /Rescate/.test(x.name) ? "grúa aérea + reparación + limpieza + repostaje" : "" }));
  const tiendaIc = { "Kit de Desvuelco": "🔄", Rueda: "🛞", "Mando de Neones RGB": "🎮", Bayetas: "🧽" };
  const camIc = ["🎨", "🔁", "🚁"];
  const cvIc = { "Gama Baja": "🚙", "Gama Media": "🚗", "Gama Alta": "🏎️", Camiones: "🚛" };
  const sec = (title, body, foot = "") => (body ? `## ${title}\n${body}${foot ? `\n${foot}` : ""}` : "");
  return [
    `# <:aguilamotors:1553837572307030126> TABLA DE PRECIOS · AGUILA MOTORS\n-# Tu vehículo, nuestra pasión. <:aguila:1573757761911660656> · Precios actualizados al ${fecha}`,
    `━━━━━━━━━━━━━━━━━━━━\n## 🔧 MODIFICACIONES DE VEHÍCULOS\n-# Precio **por pieza**, según la gama del vehículo:\n> 🎨 **Estética** → Pintura · Neones · Luces · Ruedas · Humo de ruedas · Claxon · Tintado\n> 🚘 **Carrocería**\n> ⚙️ **Rendimiento** → Turbo · Motor · Transmisión · Blindaje · Suspensión · Frenos\n> ⭐ **Full Tuning** → todo de una vez`,
    gamaTxt + (rango ? "\n-# Donde ves dos precios, depende de la pieza: el de cada una está en la imagen de abajo 👇" : ""),
    sec("🛠️ SERVICIOS EN EL TALLER", q(D.taller, svcIcon)),
    sec("🚛 FUERA DEL TALLER (GRÚA)", q(D.grua, svcIcon), `-# ⚠️ El desplazamiento se cobra aparte, en cualquier zona del mapa:\n${q(gruaExtra, (x) => (/Terrestre/.test(x.name) ? "🚛" : /Rescate/.test(x.name) ? "🆘" : "🚁"))}`),
    sec("🛒 TIENDA", q(D.tienda, (x) => tiendaIc[x.name] || "🔹")),
    sec("🦎 PINTURA CAMALEÓNICA", q(D.cam, (x) => camIc[D.cam.indexOf(x)] || "🎨")),
    sec("💡 NEONES RGB", q(D.neon.filter((x) => !/^Mando/.test(x.name)), () => "✨"), "-# El mando se compra en la 🛒 Tienda."),
    sec("⚡ NITRO", q(D.nitro, (x) => (/Instal/.test(x.name) ? "🔧" : /Botella/.test(x.name) ? "🧪" : "🔹")), "-# 🤫 Pregunta por él en el taller."),
    sec("🤝 MEDIACIÓN DE VENTA", q(D.cv, (x) => cvIc[x.name] || "📄")),
    `━━━━━━━━━━━━━━━━━━━━\n### 📍 ¿Dónde estamos?\n> 🏁 **Parcela 7231** · o pide un mecánico: ¡te atendemos donde estés! 🔧\n-# 👷 Mecánicos: el cobro exacto y el concepto para el datáfono, en la **[página del taller](<https://dc-david8.github.io/AguilaMotors/>)**.`,
    `<:aguilamotors:1553837572307030126> **AGUILA MOTORS** · *Tu vehículo, nuestra pasión.* 🔥<:aguila:1573757761911660656>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// --------------------------------------------------------------- IMAGEN ---
let precLibP = null;
function precLib() {
  if (window.htmlToImage) return Promise.resolve(window.htmlToImage);
  precLibP ||= new Promise((ok, ko) => {
    const sc = document.createElement("script");
    sc.src = "js/vendor/html-to-image.js?v=1";
    sc.onload = () => (window.htmlToImage ? ok(window.htmlToImage) : ko(new Error("No cargó el generador de imágenes.")));
    sc.onerror = () => {
      precLibP = null;
      ko(new Error("No cargó el generador de imágenes."));
    };
    document.head.appendChild(sc);
  });
  return precLibP;
}
// Devuelve un Blob PNG de la imagen de precios.
async function precRenderImg(src, fecha) {
  const lib = await precLib();
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:1500px;pointer-events:none;z-index:-1";
  host.innerHTML = precImgHTML({ ...precImgData(src.priceOf, fecha, src.extra), base: "" });
  document.body.appendChild(host);
  try {
    const fams = ["Dirt", "Marker", "Anton", "Russo", "Chakra", "Barlow"];
    await Promise.all(
      fams.flatMap((f) => ["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 20px ${f}`).catch(() => null)))
    );
    await document.fonts.ready;
    const img = host.querySelector("img");
    if (img && !img.complete) await new Promise((r) => ((img.onload = r), (img.onerror = r)));
    const node = host.querySelector(".pimg");
    // Dos pasadas: la primera a veces sale sin fuentes en Safari/Chrome.
    await lib.toCanvas(node, { pixelRatio: 1 }).catch(() => null);
    const canvas = await lib.toCanvas(node, { pixelRatio: 1 });
    const out = (type, q) => new Promise((ok) => canvas.toBlob(ok, type, q));
    let blob = await out("image/png");
    if (!blob) throw new Error("No se pudo dibujar la imagen.");
    // PNG nítido; si pesa mucho (por el fondo texturizado), JPEG de alta calidad.
    if (blob.size > 3.5 * 1024 * 1024) blob = (await out("image/jpeg", 0.93)) || blob;
    return blob;
  } finally {
    host.remove();
  }
}
const precB64 = (blob) =>
  new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => ko(r.error);
    r.readAsDataURL(blob);
  });

// ------------------------------------------------------------- PUBLICAR ---
function precSigOf(src) {
  const data = precImgData(src.priceOf, "", src.extra);
  const s = JSON.stringify([PREC_VER, data]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${PREC_VER}:${(h >>> 0).toString(36)}`;
}
async function precSigLoad() {
  if (PREC.sig !== null) return PREC.sig;
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.precios_sig", { auth: true });
    PREC.sig = rows?.[0]?.value || "";
  } catch {
    PREC.sig = "";
  }
  return PREC.sig;
}
async function precPublish() {
  const src = precSource();
  const fecha = precHoy();
  const content = precText(src, fecha);
  const blob = await precRenderImg(src, fecha);
  if (blob.size > 9.5 * 1024 * 1024) throw new Error("La imagen pesa demasiado para Discord.");
  const img = await precB64(blob);
  const r = await logEmpCall({ precios: { content, img, tipo: blob.type === "image/jpeg" ? "jpg" : "png", por: AUTH.name || "" } });
  // Función vieja (sin la acción «precios»): responde ok pero no publica nada.
  if (!(Number(r?.mensajes) > 0)) throw new Error("La función del bot no está actualizada: vuelve a desplegar log-empleados en Supabase con el archivo del paso 18 (v163).");
  const sig = precSigOf(src);
  PREC.sig = sig;
  cvCloud.upsert("app_settings", [{ key: "precios_sig", value: sig }], "key").catch(() => {});
  return r;
}
// Tras un cambio de precio o de producto en la Caja (solo el Jefe Aguila).
// Junta los cambios seguidos y solo publica si algo del anuncio cambió.
function precAuto() {
  if (!AUTH?.aguila || !(typeof PROD_CLOUD !== "undefined" && PROD_CLOUD.ok)) return;
  clearTimeout(PREC.timer);
  PREC.timer = setTimeout(precAutoRun, 6000);
}
async function precAutoRun() {
  if (PREC.busy) return void (PREC.pending = true);
  PREC.busy = true;
  try {
    const last = await precSigLoad();
    if (!last) return; // aún no se ha publicado nunca: lo hace el botón la primera vez
    if (precSigOf(precSource()) === last) return;
    toastLogEmp("📣 Actualizando el anuncio de precios en Discord…", true);
    const r = await precPublish();
    toastLogEmp(r.editado ? "📣 Anuncio de precios actualizado en Discord." : "📣 Anuncio de precios publicado de nuevo en Discord.", true);
  } catch (e) {
    toastLogEmp(`⚠ Anuncio de precios: ${e?.message || e}`);
  } finally {
    PREC.busy = false;
    if (PREC.pending) {
      PREC.pending = false;
      precAuto();
    }
  }
}

// Botón «📣 Anuncio» de la Caja: vista previa, publicar y descargar.
function setupPreciosAnuncio() {
  const btn = byId("btn-prod-anuncio");
  if (!btn) return;
  let dlg = null;
  let url = "";
  btn.addEventListener("click", async () => {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "prec-dlg";
      dlg.innerHTML = `<div class="prec-head"><b>📣 Anuncio de precios</b><button type="button" class="prec-x" aria-label="Cerrar">✕</button></div>
        <p class="prec-info">Se publica en el ${PREC_CANAL_TXT} de Discord: primero el texto y al final la imagen. Cuando cambias un precio en la Caja, el bot edita los mismos mensajes solo.</p>
        <div class="prec-body"><div class="prec-img"><span>Generando la imagen…</span></div><pre class="prec-txt"></pre></div>
        <div class="prec-foot"><span class="prec-st"></span><a class="prec-dl btn-ghost" download="precios-aguila-motors.png" hidden>⬇ Descargar imagen</a><button type="button" class="prec-pub">📣 Publicar en Discord</button></div>`;
      document.body.appendChild(dlg);
      dlg.querySelector(".prec-x").onclick = () => dlg.close();
      dlg.addEventListener("close", () => {
        if (url) URL.revokeObjectURL(url);
        url = "";
      });
      dlg.querySelector(".prec-pub").onclick = async (ev) => {
        const b = ev.currentTarget;
        const st = dlg.querySelector(".prec-st");
        b.disabled = true;
        st.textContent = "Publicando…";
        try {
          const r = await precPublish();
          st.textContent = r.editado ? "✔ Anuncio actualizado (mismos mensajes)." : "✔ Publicado en Discord.";
          st.className = "prec-st ok";
        } catch (e) {
          st.textContent = `⚠ ${e?.message || e}`;
          st.className = "prec-st";
        } finally {
          b.disabled = false;
        }
      };
    }
    const src = precSource();
    const fecha = precHoy();
    dlg.querySelector(".prec-txt").textContent = precText(src, fecha);
    const box = dlg.querySelector(".prec-img");
    box.innerHTML = "<span>Generando la imagen…</span>";
    const dl = dlg.querySelector(".prec-dl");
    dl.hidden = true;
    const st = dlg.querySelector(".prec-st");
    st.textContent = "";
    st.className = "prec-st";
    precSigLoad().then((s) => {
      if (!st.textContent) st.textContent = s ? (s === precSigOf(src) ? "✔ Discord ya tiene estos precios." : "Hay cambios sin publicar.") : "Aún no está publicado.";
    });
    if (!dlg.open) dlg.showModal();
    try {
      const blob = await precRenderImg(src, fecha);
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      box.innerHTML = "";
      const im = document.createElement("img");
      im.src = url;
      im.alt = "Imagen de precios";
      box.appendChild(im);
      dl.href = url;
      dl.download = `precios-aguila-motors.${blob.type === "image/jpeg" ? "jpg" : "png"}`;
      dl.hidden = false;
    } catch (e) {
      box.innerHTML = "";
      box.textContent = `No se pudo generar la imagen: ${e?.message || e}`;
    }
  });
}
