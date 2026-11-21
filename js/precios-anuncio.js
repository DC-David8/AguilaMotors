// Aguila Motors · Anuncio de precios en Discord (v163).
// La Caja arma el texto y la imagen con los precios vigentes y el bot los
// publica en el canal de precios: primero el texto y al final la imagen.
// Cuando el Jefe Aguila cambia un precio en la Caja, se editan los mismos
// mensajes solos. Fuentes de la imagen: libres (OFL/Apache), en /fonts.

const PREC_CANAL_TXT = "canal de precios";
const PREC_VER = 4; // súbelo si cambia el diseño para que se vuelva a publicar
const PREC = { sig: null, busy: false, timer: 0, pending: false };


const PIMG_ICONS = {
  moto: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-6h5l4 6M9.5 10.5L8 7H5.5M14.5 10.5l1.5-3.5h2.5"/>',
  suv: '<path d="M2.5 16.5v-4l2.5-5.5h9.5l4 5.5h3v4z"/><path d="M5 12h15M10.5 7v5"/><circle cx="7" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/>',
  car: '<path d="M3 15l2-5h14l2 5v3H3z"/><path d="M7 10l2-3h6l2 3"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>',
  sport: '<path d="M1.5 16.5l1-3.5 6-2.5 3.5-3h4l3 3.5 3 .5.5 5z"/><path d="M8.5 10.5h11"/><circle cx="6.5" cy="17" r="2"/><circle cx="17.5" cy="17" r="2"/>',
  vip: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12"/>',
  truck: '<path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  heli: '<path d="M3 4h16M11 4v3"/><path d="M4.5 12.5a5.5 5.5 0 0 1 5.5-5.5h3.5v9H8a3.5 3.5 0 0 1-3.5-3.5z"/><path d="M13.5 9.5h4.5l3 2.5M21 9v6M8 20h9M9.5 16.5V20M15 16.5V20"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0 5-5l-2 2-2-2z"/>',
  tools: '<path d="M15.5 4.5a3.5 3.5 0 0 0 4 4.5L9 19.5a1.8 1.8 0 0 1-2.5-2.5L17 6.5a3.5 3.5 0 0 0 4.5-4l-1.8 1.8-1.7-.3-.3-1.7z"/><path d="M3 5.5L5.5 3l3.5 3.5-2.5 2.5zM7.8 7.8l10 10a1.6 1.6 0 0 1-2.3 2.3l-10-10"/>',
  sponge: '<rect x="3" y="10" width="14" height="10" rx="2.5"/><circle cx="7" cy="14" r=".6"/><circle cx="11" cy="16.5" r=".6"/><circle cx="13" cy="13" r=".6"/><circle cx="18.5" cy="6.5" r="2"/><circle cx="14.5" cy="4" r="1.3"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M2.5 21h13M6.5 8h5"/><path d="M14 11h1.5a2 2 0 0 1 2 2v3.5a1.5 1.5 0 0 0 3 0V8.5L18 6"/>',
  box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.2l9 4.5"/>',
  shine: '<path d="M12 4l2.2 4.6 5 .7-3.6 3.5.9 5L12 15.4l-4.5 2.4.9-5-3.6-3.5 5-.7z"/><path d="M12 .8v1.4M21 7.5l1.2-.7M3 7.5l-1.2-.7M19 19.5l.9 1M5 19.5l-.9 1"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  roll: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 21v-5h-5"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  pad: '<path d="M7 8h10a4 4 0 0 1 4 4l.5 4a2.5 2.5 0 0 1-4.5 1.5L15.5 16h-7L7 17.5A2.5 2.5 0 0 1 2.5 16L3 12a4 4 0 0 1 4-4z"/><path d="M7 10.5v3.5M5.25 12.25h3.5"/><circle cx="16" cy="11" r=".7"/><circle cx="18" cy="13.2" r=".7"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-2c1-3-2-11-7-11z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  sparkles: '<path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.8 18.3A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.7L14 9.5V3"/><path d="M7.2 15h9.6"/>',
  buoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
  cart: '<path d="M2 3h3l2.5 12h11l2.5-8H6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  front: '<path d="M5.5 11l1.5-5h10l1.5 5"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M5.5 17v2.5M18.5 17v2.5"/><circle cx="7.5" cy="14" r="1"/><circle cx="16.5" cy="14" r="1"/>',
  gear: '<path d="M10.3 2h3.4l.5 2.6 2.2 1 2.2-1.5 2.4 2.4-1.5 2.2 1 2.2 2.5.4v3.4l-2.6.5-1 2.2 1.5 2.2-2.4 2.4-2.2-1.5-2.2 1-.4 2.5h-3.4l-.5-2.6-2.2-1-2.2 1.5-2.4-2.4 1.5-2.2-1-2.2L2 13.7v-3.4l2.6-.5 1-2.2-1.5-2.2 2.4-2.4 2.2 1.5 2.2-1z"/><circle cx="12" cy="12" r="3"/>',
  lizard: '<ellipse cx="12" cy="4.4" rx="2.1" ry="2.3"/><ellipse cx="12" cy="11.2" rx="2.3" ry="4.4"/><path d="M12 15.6c0 3 1.3 5.4 3.8 5.4 1.8 0 2.4-1.8 1.2-2.7"/><path d="M10.2 9L7 7.6l-.8-1.8M13.8 9L17 7.6l.8-1.8M10.2 13.6L7 15.2l-.8 1.8M13.8 13.6l3.2 1.4.6 1.6"/>',
  shake: '<path d="M2 8l4-2 4 2 3-2 4 1 5 3"/><path d="M2 8v6l3 2M22 10v5l-3 2"/><path d="M8 14l3 3a1.5 1.5 0 0 0 2.2-2l-3-3"/><path d="M11 17l1.5 1.5a1.5 1.5 0 0 0 2.2-2L13 15M14.5 16.5a1.5 1.5 0 0 0 2.2-2L13 11l-2 1.5a1.8 1.8 0 0 1-2.5-2.5L10 8"/>',
  pin: '<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  flag: '<path d="M5 21.5V3.5"/><path d="M5 4h14v9H5"/><path d="M5 4h3.5v3H5zM12 4h3.5v3H12zM8.5 7H12v3H8.5zM15.5 7H19v3h-3.5zM5 10h3.5v3H5zM12 10h3.5v3H12z" fill="currentColor" stroke="none"/>',
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
  .pimg h2 .ic{color:var(--c,var(--or));width:40px;height:40px;stroke-width:2}
  .pimg h2 .emo{font:400 34px/1 "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif}
  .pimg h2 em{font-style:normal;color:var(--or)}
  .pimg h2 small{font:600 20px Barlow;color:#bfb2a6;text-transform:none;margin-left:auto;letter-spacing:0}
  .pimg .pcard::after{content:none}
  .tt th,.tt td{background:none;border-left:0;border-right:0;border-top:0;text-transform:none}
  .tt th{text-transform:uppercase;position:static;text-align:center}
  table.tt{width:100%;margin:0;background:none;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:24px}
  .tt th{font:400 19px Russo,sans-serif;color:#efe6dc;text-transform:uppercase;padding:6px 4px 12px;vertical-align:bottom;border-bottom:2px solid var(--or)}
  .tt th .ic{display:block;margin:0 auto 6px;width:40px;height:40px;color:var(--c,var(--or2));stroke-width:1.6}
  .tt th.first{text-align:left;color:var(--or);font-size:22px;padding-left:12px}
  .tt th small{display:block;font:700 13px Barlow;color:var(--or);letter-spacing:.15em}
  .tt td{padding:7px 4px;text-align:center;font:700 25px Chakra,sans-serif;color:#fff;border-bottom:1px solid rgba(255,255,255,.06)}
  .tt td.n{text-align:left;font:600 25px Barlow;color:#f4ece4;padding-left:12px;white-space:nowrap}
  .tt .vip{background:rgba(255,180,60,.07)}
  .tt th.vip{background:linear-gradient(180deg,transparent,rgba(255,180,60,.12));border-radius:12px 12px 0 0}
  .tt tr.g td{padding:14px 12px 5px;border:0;text-align:left;font:400 16px Russo,sans-serif;letter-spacing:.3em;color:var(--or)}
  .tt tr.g td span{display:inline-flex;align-items:center;gap:10px}
  .tt tr.g td .ic{width:20px;height:20px;color:var(--c);stroke-width:2}
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
  .pimg li .ic{color:var(--c,var(--or));width:27px;height:27px;flex:none;stroke-width:1.9}
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
    .map((c, i) => `<th class="${i === vipIdx ? "vip" : ""}" style="--c:${c.color}">${pimgIc(c.icon)}${pimgEsc(c.label)}${c.sub ? `<small>${pimgEsc(c.sub)}</small>` : ""}</th>`)
    .join("")}</tr></thead><tbody>${d.groups
    .map((g) => `<tr class="g"><td colspan="${d.cols.length + 1}"><span style="--c:${g.color}">${pimgIc(g.icon)}${pimgEsc(g.label)}</span></td></tr>` + g.rows.map((r) => `<tr><td class="n">${pimgEsc(r.name)}</td>${r.prices.map(td).join("")}</tr>`).join(""))
    .join("")}<tr><td colspan="${d.cols.length + 1}" style="border:0;padding:6px"></td></tr><tr class="ftr"><td class="n">${pimgIc("star")}Full Tuning</td>${d.full.map((v) => `<td>${pimgMoney(v)}</td>`).join("")}</tr></tbody></table>`;
  return `<style>${css}</style><div class="pimg">
  <div class="flag"></div>
  <div class="hd"><img src="${b}aguila_motors_logo.png" alt="">
    <div class="brand"><h1>Aguila <span>Motors</span></h1><div class="tag">TALLER <b>·</b> MODIFICACIONES <b>·</b> SERVICIOS</div></div>
    <div class="slogan">Tu vehículo,<br>nuestra <span>pasión</span></div><div class="speed"></div></div>
  <div class="wrap">
    <section class="pcard" style="--c:#ffd966"><h2>${pimgIc("wrench")}Modificaciones <em>de vehículos</em><small>Precio por pieza, según la gama</small></h2>${table}
      <div class="note"><b>💎 Gama VIP:</b> ${pimgEsc(d.vipNote)}</div></section>
    <div class="row2">
      <div class="col">
        <section class="pcard" style="--c:#8ff0c8"><h2>${pimgIc("tools")}Servicios <em>en el taller</em></h2>${list(d.taller, "wrench")}</section>
        <section class="pcard" style="--c:#ffc0db"><h2>${pimgIc("cart")}Tienda</h2>${list(d.tienda, "cart")}</section>
      </div>
      <section class="pcard" style="--c:#d3dce8"><h2>${pimgIc("truck")}Fuera del taller <em>(grúa)</em></h2>${list(d.grua, "wrench")}
        <div class="warn">⚠ El desplazamiento se cobra aparte, en cualquier zona del mapa.</div>
        <h3>DESPLAZAMIENTO Y RESCATE</h3>${list(d.gruaExtra, "truck")}</section>
    </div>
    <div class="row3">
      <section class="pcard" style="--c:#ffb3d9"><h2>${pimgIc("lizard")}Pintura <em>camaleónica</em></h2>${list(d.cam, "palette")}</section>
      <section class="pcard" style="--c:#f0b3ff"><h2>${pimgIc("bulb")}Neones <em>RGB</em></h2>${list(d.neon, "sparkles")}</section>
      <section class="pcard" style="--c:#ffaaa3"><h2>${pimgIc("shake")}Mediación <em>de venta</em></h2>${list(d.cv, "car")}</section>
    </div>
    <section class="pcard" style="--c:#8ff7ff"><h2>${pimgIc("bolt")}<em>Nitro</em><small>Pregunta por él en el taller</small></h2><div class="nitro">${list(d.nitro.slice(0, 1), "wrench")}${list(d.nitro.slice(1), "flask")}</div></section>
  </div>
  <div class="loc"><div>${pimgIc("flag")}Parcela 7231</div><div>${pimgIc("wrench")}¿No puedes venir? Pide un mecánico: vamos donde estés</div></div>
  <div class="ft"><div class="ln"></div><div class="c"><b>Aguila <span>Motors</span></b><div>Precios actualizados al ${pimgEsc(d.fecha)}</div></div><div class="ln r"></div></div>
  <div class="flag b" style="margin-top:22px"></div>
</div>`;
}

// Datos desde el catálogo de la Caja (PRODUCTS, ya con los precios de la nube).
function precImgData(priceOf, fecha, extra = {}) {
  const plus = (cat, icon) => (extra[cat] || []).map((x) => ({ name: x.name, price: x.price, icon }));
  const cols = [
    { key: "motos", label: "Motos", icon: "moto", color: "#7ff0dd" },
    { key: "gama_baja", label: "Gama Baja", icon: "suv", color: "#a7ec8c" },
    { key: "gama_media", label: "Gama Media", icon: "car", color: "#ffe27a" },
    { key: "gama_alta", label: "Gama Alta", icon: "sport", color: "#ffb15c" },
    { key: "gama_vip", label: "Gama VIP", icon: "vip", sub: "DONACIÓN", color: "#dcb0ff" },
    { key: "camiones", label: "Camiones", icon: "truck", color: "#a9c3ff" },
    { key: "aereos", label: "Aéreos", icon: "heli", color: "#9fe0ff" },
  ];
  const gl = Object.fromEntries(GAMAS.map((g) => [g.key, g.label]));
  const row = (piece) => ({ name: piece, prices: cols.map((c) => priceOf(`${piece} (${gl[c.key]})`)) });
  const s = (name, label, extra = {}) => ({ name: label || name, price: priceOf(name), ...extra });
  return {
    cols,
    groups: [
      { label: "ESTÉTICA", icon: "palette", color: "#ffb3d9", rows: ["Pintura", "Neones", "Cambio de Luces", "Ruedas", "Humo de Ruedas", "Claxon", "Tintado de Lunas"].map(row) },
      { label: "CARROCERÍA", icon: "front", color: "#a9c3ff", rows: ["Carrocería"].map(row) },
      { label: "RENDIMIENTO", icon: "gear", color: "#8ff7ff", rows: ["Turbo", "Motor", "Transmisión", "Blindaje", "Suspensión", "Frenos"].map(row) },
    ],
    full: cols.map((c) => priceOf(`Full Tuning (${gl[c.key]})`)),
    vipNote: "todos los vehículos por donación al servidor (Prime, Deluxe, VIP, únicos, de coleccionista y personalizados) se cobran con estos precios, sea moto, coche, avión o camión. También su Full Tuning.",
    taller: [
      s("Reparación (Taller)", "Reparación", { icon: "wrench" }),
      s("Limpieza (Taller)", "Limpieza", { icon: "sponge" }),
      s("Repostaje (Taller)", "Repostaje", { icon: "fuel" }),
      s("Repostaje + Limpieza (Taller)", "Repostaje + Limpieza", { pack: "PACK", icon: "box" }),
      s("Reparación + Repostaje (Taller)", "Reparación + Repostaje", { pack: "PACK", icon: "box" }),
      s("Reparación + Limpieza (Taller)", "Reparación + Limpieza", { pack: "PACK", icon: "box" }),
      s("Reparación + Limpieza + Repostaje (Taller)", "Reparación + Limpieza + Repostaje", { pack: "COMPLETO", big: true, icon: "shine" }),
      ...plus("servicios_taller"),
    ],
    grua: [
      s("Reparación (Grúa)", "Reparación", { icon: "wrench" }),
      s("Bayetas o Limpieza (Grúa)", "Bayetas o Limpieza", { icon: "sponge" }),
      s("Repostaje (Grúa)", "Repostaje", { icon: "fuel" }),
      s("Repostaje + Limpieza (Grúa)", "Repostaje + Limpieza", { pack: "PACK", icon: "box" }),
      s("Reparación + Repostaje (Grúa)", "Reparación + Repostaje", { pack: "PACK", icon: "box" }),
      s("Reparación + Limpieza (Grúa)", "Reparación + Limpieza", { pack: "PACK", icon: "box" }),
      s("Reparación + Limpieza + Repostaje (Grúa)", "Reparación + Limpieza + Repostaje", { pack: "COMPLETO", big: true, icon: "shine" }),
    ],
    gruaExtra: [
      s("Grúa Terrestre", "", { sub: "Desplazamiento", icon: "truck" }),
      s("Grúa Aérea", "", { sub: "Desplazamiento en helicóptero", icon: "heli" }),
      s("Rescate Aéreo Completo", "", { sub: "Grúa aérea + reparación + limpieza + repostaje", icon: "buoy", big: true }),
      ...plus("servicios_grua", "grua"),
    ],
    tienda: [s("Kit de Desvuelco", "", { icon: "roll" }), s("Rueda", "", { icon: "tire" }), s("Mando de Neones RGB", "", { icon: "pad" }), s("Bayetas", "", { icon: "sponge" }), ...plus("tienda")],
    cam: [
      s("Pintura Camaleónica (primera vez)", "Primera vez", { big: true, icon: "palette" }),
      s("Cambio de Color Camaleónico", "Cambio de color", { icon: "repeat" }),
      s("Cambio de Color Camaleónico (Aéreos)", "Cambio de color (aéreos)", { icon: "heli" }),
      ...plus("camaleonica"),
    ],
    neon: [s("Instalación de Neones RGB", "Instalación de neones RGB", { big: true }), s("Mando de Neones RGB", "Mando de neones RGB", { sub: "Se compra en la tienda", icon: "pad" }), ...plus("neones")],
    nitro: [s("Instalación de Nitro ⚠", "Instalación de nitro", { big: true }), s("Botella de Nitro", "Botella de nitro"), ...plus("nitro")],
    cv: [
      s("Mediación de Venta (Gama Baja)", "Gama Baja", { icon: "suv" }),
      s("Mediación de Venta (Gama Media)", "Gama Media", { icon: "car" }),
      s("Mediación de Venta (Gama Alta)", "Gama Alta", { icon: "sport" }),
      s("Mediación de Venta (Gama Camiones)", "Camiones", { icon: "truck" }),
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
    `# <:aguilamotors:1553837572307030126> TABLA DE PRECIOS · AGUILA MOTORS\n-# Tu vehículo, nuestra pasión. <:aguila:1573757688024797350> · Precios actualizados al ${fecha}`,
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
    `<:aguilamotors:1553837572307030126> **AGUILA MOTORS** · *Tu vehículo, nuestra pasión.* 🔥<:aguila:1573757688024797350>`,
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
