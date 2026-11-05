// ============================================================================
// Informes de inspección (v103) · solo el Jefe Aguila
// ----------------------------------------------------------------------------
// Nitro, daños, incautado, modificaciones, grúa y presupuesto. Se rellenan en
// un formulario con vista previa en vivo y se descargan en PNG o PDF (A4, una
// página). Se guardan en Supabase (tabla informes, SQL 12) con un número
// correlativo INSP-AAAA-NNNN y un código de verificación.
// Usa funciones de app.js (cvCloud, AUTH, catVehicles, getAllProducts...).
// ============================================================================

const INF_TIPOS = {
  nitro: { label: "Nitro", icon: "🧪", title: "EXPEDIENTE DE INSPECCIÓN", motivos: ["Verificar presencia de nitro", "Persecución / huida", "Control rutinario", "Vehículo incautado"], tools: ["botella", "inyeccion", "ok"] },
  danos: { label: "Daños", icon: "💥", title: "PERITAJE DE DAÑOS", motivos: ["Accidente / colisión", "Persecución", "Vandalismo", "Reclamación del propietario"], tools: ["grave", "leve", "ok"] },
  incautado: { label: "Incautado", icon: "🚔", title: "INFORME DE VEHÍCULO INCAUTADO", motivos: ["Vehículo incautado", "Vehículo robado", "Vehículo abandonado"], tools: ["indicio", "ok"] },
  modificaciones: { label: "Modificaciones", icon: "🔧", title: "CERTIFICADO DE MODIFICACIONES", motivos: ["Control de modificaciones", "Petición del propietario", "Control rutinario"], tools: ["nitro", "ok"] },
  grua: { label: "Grúa", icon: "🚚", title: "INFORME DE GRÚA Y DEPÓSITO", motivos: ["Retirada por grúa", "Estacionamiento indebido", "Vehículo abandonado", "Accidente", "Incautación"], tools: ["previo", "ok"] },
  presupuesto: { label: "Presupuesto", icon: "🧾", title: "PRESUPUESTO DE REPARACIÓN", motivos: ["Reparación y mejoras", "Reparación tras accidente", "Mejoras de rendimiento"], tools: ["reparar", "mejora"] },
};

const INF_TOOLS = {
  botella: { c: "#d93025", l: "Botella de N₂O", num: true },
  inyeccion: { c: "#f2a900", l: "Inyección / botón", num: true },
  ok: { c: "#1b7f3b", l: "Sin hallazgos", num: false },
  grave: { c: "#d93025", l: "Daño grave", num: true },
  leve: { c: "#f2a900", l: "Daño leve", num: true },
  indicio: { c: "#d93025", l: "Indicio de robo", num: true },
  nitro: { c: "#d93025", l: "Nitro instalado", num: true },
  previo: { c: "#f2a900", l: "Daño previo", num: true },
  reparar: { c: "#f2a900", l: "Reparación", num: true },
  mejora: { c: "#2f6dff", l: "Mejora", num: true },
};

const INF_AG = {
  FBI: { logo: "informes/fbi.png", name: "FBI" },
  LSPD: { logo: "informes/lspd.png", name: "LSPD" },
  LSSD: { logo: "informes/lssd.png", name: "LSSD" },
  Particular: { logo: "aguila_motors_logo.png", name: "Particular" },
};

const INF_COLORS = [
  ["Negro", "#111"], ["Negro mate", "#2a2a2a"], ["Blanco", "#f4f4f4"], ["Gris", "#8a8f96"], ["Gris plata", "#c0c4ca"],
  ["Rojo", "#c62828"], ["Granate", "#7b1e2b"], ["Azul", "#1e5bd8"], ["Azul oscuro", "#13265c"], ["Celeste", "#5bb8ec"],
  ["Verde", "#2e9d48"], ["Verde oscuro", "#1f4d2a"], ["Amarillo", "#f2c200"], ["Naranja", "#f07c00"], ["Morado", "#6a3db8"],
  ["Rosa", "#e86aa6"], ["Marrón", "#6b4a2b"], ["Dorado", "#c9a227"], ["Cromado", "#d9dde2"],
];

// ---------- Esquemas (vista superior, viewBox 440x150) ----------
const INF_ST = 'fill="none" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"';
const INF_DS = 'fill="none" stroke="#1a1a1a" stroke-width="1.6" stroke-dasharray="4 3"';
const infT = (x, y, t, s = 10) => `<text x="${x}" y="${y}" font-size="${s}" fill="#666" text-anchor="middle" font-family="Courier New, monospace">${t}</text>`;
const infW = (xs, y1 = 10, y2 = 126, w = 46) => xs.map((x) => `<rect x="${x}" y="${y1}" width="${w}" height="14" rx="4" ${INF_ST}/><rect x="${x}" y="${y2}" width="${w}" height="14" rx="4" ${INF_ST}/>`).join("");
const INF_CAR_ZONES = [{ n: "Maletero", x1: 165 }, { n: "Habitáculo", x1: 290 }, { n: "Vano motor", x1: 440 }];
const INF_BODIES = {
  sedan: { l: "Sedán", z: INF_CAR_ZONES, svg: `<path d="M50 40 Q50 22 80 22 L360 22 Q392 22 396 50 L396 100 Q392 128 360 128 L80 128 Q50 128 50 110 Z" ${INF_ST}/><path d="M165 30 Q185 75 165 120" ${INF_ST}/><path d="M290 32 Q272 75 290 118" ${INF_ST}/><rect x="190" y="42" width="80" height="66" rx="10" ${INF_DS}/><line x1="230" y1="42" x2="230" y2="108" ${INF_DS}/>${infW([72, 318])}${infT(105, 70, "MALETERO")}${infT(345, 70, "MOTOR")}` },
  coupe: { l: "Coupé / deportivo", z: [{ n: "Maletero", x1: 185 }, { n: "Habitáculo", x1: 290 }, { n: "Vano motor", x1: 440 }], svg: `<path d="M55 50 Q55 24 95 24 L350 24 Q396 26 400 75 Q396 124 350 126 L95 126 Q55 126 55 100 Z" ${INF_ST}/><path d="M185 32 Q205 75 185 118" ${INF_ST}/><path d="M290 34 Q272 75 290 116" ${INF_ST}/><rect x="205" y="44" width="62" height="62" rx="10" ${INF_DS}/>${infW([78, 318])}${infT(115, 70, "MALETERO")}${infT(345, 70, "MOTOR")}` },
  super: { l: "Superdeportivo", z: [{ n: "Vano motor", x1: 170 }, { n: "Habitáculo", x1: 285 }, { n: "Maletero", x1: 440 }], svg: `<path d="M40 75 C40 35 80 22 140 22 L320 22 C380 22 402 45 402 75 C402 105 380 128 320 128 L140 128 C80 128 40 115 40 75 Z" ${INF_ST}/><path d="M170 34 Q190 75 170 116" ${INF_ST}/><path d="M285 36 Q268 75 285 114" ${INF_ST}/><rect x="190" y="44" width="78" height="62" rx="12" ${INF_DS}/><line x1="229" y1="44" x2="229" y2="106" ${INF_DS}/>${infW([72, 318])}${infT(100, 70, "MOTOR")}${infT(345, 70, "MALETERO")}` },
  suv: { l: "SUV / 4x4", z: [{ n: "Maletero", x1: 120 }, { n: "Habitáculo", x1: 300 }, { n: "Vano motor", x1: 440 }], svg: `<rect x="48" y="18" width="350" height="114" rx="16" ${INF_ST}/><path d="M300 22 Q285 75 300 128" ${INF_ST}/><rect x="120" y="30" width="170" height="90" rx="8" ${INF_DS}/><line x1="175" y1="30" x2="175" y2="120" ${INF_DS}/><line x1="232" y1="30" x2="232" y2="120" ${INF_DS}/>${infW([70, 318], 6, 130, 50)}${infT(84, 70, "MALETERO", 9)}${infT(350, 70, "MOTOR")}` },
  pickup: { l: "Pickup", z: [{ n: "Caja", x1: 210 }, { n: "Habitáculo", x1: 300 }, { n: "Vano motor", x1: 440 }], svg: `<rect x="48" y="20" width="350" height="110" rx="12" ${INF_ST}/><rect x="58" y="30" width="150" height="90" rx="4" ${INF_ST}/><path d="M300 24 Q286 75 300 126" ${INF_ST}/><rect x="215" y="34" width="78" height="82" rx="8" ${INF_DS}/>${infW([72, 320])}${infT(133, 70, "CAJA")}${infT(350, 70, "MOTOR")}` },
  van: { l: "Furgoneta", z: [{ n: "Zona de carga", x1: 300 }, { n: "Cabina", x1: 370 }, { n: "Vano motor", x1: 440 }], svg: `<rect x="40" y="18" width="330" height="114" rx="8" ${INF_ST}/><path d="M370 30 Q400 32 402 75 Q400 118 370 120" ${INF_ST}/><line x1="300" y1="22" x2="300" y2="128" stroke="#1a1a1a" stroke-width="2"/><rect x="305" y="34" width="56" height="82" rx="6" ${INF_DS}/><rect x="55" y="32" width="235" height="86" rx="4" ${INF_DS}/>${infW([70, 316])}${infT(172, 70, "ZONA DE CARGA")}${infT(388, 70, "M", 9)}` },
  camion: { l: "Camión", z: [{ n: "Carga / contenedor", x1: 315 }, { n: "Cabina", x1: 440 }], svg: `<rect x="20" y="16" width="290" height="118" rx="4" ${INF_ST}/><rect x="322" y="26" width="92" height="98" rx="10" ${INF_ST}/><rect x="334" y="38" width="60" height="74" rx="6" ${INF_DS}/><line x1="310" y1="60" x2="322" y2="60" stroke="#1a1a1a" stroke-width="2"/><line x1="310" y1="90" x2="322" y2="90" stroke="#1a1a1a" stroke-width="2"/>${infW([36, 92, 340], 4, 132, 40)}${infT(165, 70, "CARGA / CONTENEDOR")}${infT(364, 70, "CABINA", 9)}` },
  moto: { l: "Moto", z: [{ n: "Trasera", x1: 160 }, { n: "Asiento / depósito", x1: 300 }, { n: "Delantera", x1: 440 }], svg: `<path d="M70 75 Q70 60 110 58 L300 58 Q350 60 360 75 Q350 90 300 92 L110 92 Q70 90 70 75 Z" ${INF_ST}/><rect x="40" y="66" width="44" height="18" rx="8" ${INF_ST}/><rect x="356" y="66" width="44" height="18" rx="8" ${INF_ST}/><line x1="330" y1="40" x2="330" y2="110" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/><rect x="160" y="64" width="90" height="22" rx="8" ${INF_DS}/>${infT(205, 52, "ASIENTO", 9)}${infT(270, 110, "MOTOR / DEPÓSITO", 9)}` },
  heli: { l: "Helicóptero", z: [{ n: "Cola", x1: 220 }, { n: "Fuselaje", x1: 290 }, { n: "Cabina", x1: 440 }], svg: `<ellipse cx="300" cy="75" rx="80" ry="40" ${INF_ST}/><path d="M220 70 L50 72 L50 78 L220 80" ${INF_ST}/><rect x="36" y="58" width="16" height="34" rx="3" ${INF_ST}/><circle cx="300" cy="75" r="68" fill="none" stroke="#1a1a1a" stroke-width="1" stroke-dasharray="2 4"/><rect x="290" y="52" width="60" height="46" rx="10" ${INF_DS}/>${infT(320, 79, "CABINA", 9)}${infT(140, 64, "COLA", 9)}` },
  avion: { l: "Avión", z: [{ n: "Cola", x1: 120 }, { n: "Fuselaje / alas", x1: 320 }, { n: "Cabina", x1: 440 }], svg: `<path d="M30 75 Q30 66 60 64 L380 64 Q412 66 414 75 Q412 84 380 86 L60 86 Q30 84 30 75 Z" ${INF_ST}/><path d="M250 64 L190 10 L170 10 L200 64 M250 86 L190 140 L170 140 L200 86" ${INF_ST}/><path d="M70 64 L50 36 L40 36 L48 64 M70 86 L50 114 L40 114 L48 86" ${INF_ST}/><rect x="330" y="68" width="60" height="14" rx="6" ${INF_DS}/>${infT(360, 60, "CABINA", 9)}${infT(150, 80, "FUSELAJE", 9)}` },
  barco: { l: "Barco", z: [{ n: "Popa / motor", x1: 170 }, { n: "Cabina", x1: 290 }, { n: "Proa", x1: 440 }], svg: `<path d="M40 40 L300 30 Q390 40 420 75 Q390 110 300 120 L40 110 Z" ${INF_ST}/><rect x="180" y="52" width="100" height="46" rx="8" ${INF_DS}/><line x1="60" y1="55" x2="60" y2="95" stroke="#1a1a1a" stroke-width="2"/>${infT(230, 79, "CABINA", 9)}${infT(110, 79, "POPA / MOTOR", 9)}${infT(360, 79, "PROA", 9)}` },
  hatch: { l: "Compacto / hatchback", z: [{ n: "Maletero", x1: 130 }, { n: "Habitáculo", x1: 290 }, { n: "Vano motor", x1: 440 }], svg: "<path d=\"M80 34 Q80 22 104 22 L360 22 Q392 22 396 50 L396 100 Q392 128 360 128 L104 128 Q80 128 80 116 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M130 28 Q146 75 130 122\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M290 32 Q272 75 290 118\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"152\" y=\"42\" width=\"120\" height=\"66\" rx=\"10\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><line x1=\"212\" y1=\"42\" x2=\"212\" y2=\"108\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"96\" y=\"10\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"96\" y=\"126\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"318\" y=\"10\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"318\" y=\"126\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"105\" y=\"70\" font-size=\"9\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MAL.</text><text x=\"345\" y=\"70\" font-size=\"10\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR</text>" },
  muscle: { l: "Muscle / clásico", z: [{ n: "Maletero", x1: 140 }, { n: "Habitáculo", x1: 250 }, { n: "Vano motor", x1: 440 }], svg: "<path d=\"M40 32 Q40 24 60 24 L380 24 Q408 24 410 40 L410 110 Q408 126 380 126 L60 126 Q40 126 40 118 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M140 30 Q156 75 140 120\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M250 32 Q236 75 250 118\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"160\" y=\"44\" width=\"80\" height=\"62\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"300\" y=\"60\" width=\"70\" height=\"30\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"62\" y=\"10\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"62\" y=\"126\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"330\" y=\"10\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"330\" y=\"126\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"90\" y=\"70\" font-size=\"9\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MALETERO</text><text x=\"335\" y=\"52\" font-size=\"9\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR V8</text><text x=\"335\" y=\"106\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">TOMA AIRE</text>" },
  cabrio: { l: "Descapotable", z: [{ n: "Maletero", x1: 160 }, { n: "Habitáculo", x1: 290 }, { n: "Vano motor", x1: 440 }], svg: "<path d=\"M50 40 Q50 22 80 22 L360 22 Q392 22 396 50 L396 100 Q392 128 360 128 L80 128 Q50 128 50 110 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M290 32 Q272 75 290 118\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M150 30 L150 120\" stroke=\"#1a1a1a\" stroke-width=\"5\" stroke-linecap=\"round\"/><rect x=\"175\" y=\"40\" width=\"40\" height=\"30\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"175\" y=\"80\" width=\"40\" height=\"30\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"228\" y=\"40\" width=\"40\" height=\"30\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"228\" y=\"80\" width=\"40\" height=\"30\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"72\" y=\"10\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"72\" y=\"126\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"318\" y=\"10\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"318\" y=\"126\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"100\" y=\"70\" font-size=\"9\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MALETERO</text><text x=\"150\" y=\"140\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">CAPOTA</text><text x=\"345\" y=\"70\" font-size=\"10\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR</text>" },
  limo: { l: "Limusina", z: [{ n: "Maletero", x1: 92 }, { n: "Salón", x1: 265 }, { n: "Habitáculo", x1: 330 }, { n: "Vano motor", x1: 440 }], svg: "<path d=\"M20 40 Q20 24 44 24 L390 24 Q418 24 420 50 L420 100 Q418 126 390 126 L44 126 Q20 126 20 110 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M90 30 Q104 75 90 120\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M330 32 Q316 75 330 118\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"110\" y=\"40\" width=\"150\" height=\"70\" rx=\"10\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"270\" y=\"42\" width=\"50\" height=\"66\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"36\" y=\"10\" width=\"44\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"36\" y=\"126\" width=\"44\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"350\" y=\"10\" width=\"44\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"350\" y=\"126\" width=\"44\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"55\" y=\"70\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MAL.</text><text x=\"185\" y=\"79\" font-size=\"9\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">SALÓN</text><text x=\"375\" y=\"70\" font-size=\"9\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR</text>" },
  bus: { l: "Autobús", z: [{ n: "Motor", x1: 52 }, { n: "Pasaje", x1: 366 }, { n: "Puesto de conducción", x1: 440 }], svg: "<rect x=\"16\" y=\"20\" width=\"408\" height=\"110\" rx=\"10\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><line x1=\"16\" y1=\"50\" x2=\"424\" y2=\"50\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><line x1=\"16\" y1=\"100\" x2=\"424\" y2=\"100\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"60\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"104\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"148\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"192\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"236\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"280\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"324\" y=\"56\" width=\"30\" height=\"38\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"372\" y=\"56\" width=\"40\" height=\"38\" rx=\"6\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"6\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"130\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"330\" y=\"6\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"330\" y=\"130\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"40\" y=\"80\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR</text><text x=\"392\" y=\"80\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">COND.</text>" },
  quad: { l: "Quad / ATV", z: [{ n: "Trasera", x1: 185 }, { n: "Asiento / motor", x1: 265 }, { n: "Delantera", x1: 440 }], svg: "<path d=\"M140 46 Q140 36 160 36 L290 36 Q310 36 310 46 L310 104 Q310 114 290 114 L160 114 Q140 114 140 104 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"190\" y=\"56\" width=\"70\" height=\"38\" rx=\"12\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><line x1=\"300\" y1=\"30\" x2=\"300\" y2=\"120\" stroke=\"#1a1a1a\" stroke-width=\"3\" stroke-linecap=\"round\"/><rect x=\"100\" y=\"14\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"100\" y=\"116\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"320\" y=\"14\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"320\" y=\"116\" width=\"46\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"225\" y=\"79\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">ASIENTO</text><text x=\"150\" y=\"140\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR BAJO ASIENTO</text>" },
  f1: { l: "Monoplaza / kart", z: [{ n: "Alerón trasero", x1: 72 }, { n: "Motor", x1: 165 }, { n: "Cockpit", x1: 245 }, { n: "Morro", x1: 440 }], svg: "<path d=\"M60 70 L340 64 Q400 66 410 75 Q400 84 340 86 L60 80 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"40\" width=\"20\" height=\"70\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"400\" y=\"30\" width=\"16\" height=\"90\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><ellipse cx=\"200\" cy=\"75\" rx=\"40\" ry=\"14\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"90\" y=\"22\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"90\" y=\"114\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"320\" y=\"22\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"320\" y=\"114\" width=\"50\" height=\"14\" rx=\"4\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><text x=\"200\" y=\"58\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">PILOTO</text><text x=\"120\" y=\"100\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR</text>" },
};
// Vistas alternativas (v106): sustituyen a la planta en el esquema; la carroceria se mantiene.
const INF_VIEWS = {
  lateral: { l: "Vista lateral", z: [{ n: "Bajos / escape", x1: 440, y0: 120 }, { n: "Maletero", x1: 150 }, { n: "Habitáculo", x1: 330 }, { n: "Vano motor", x1: 440 }], svg: "<path d=\"M30 100 L30 80 Q34 66 70 62 L130 58 L170 30 Q180 24 200 24 L290 24 Q310 24 322 36 L350 58 L400 62 Q414 66 414 82 L414 100 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M178 34 L200 34 L200 58 L150 58 Z M210 34 L290 34 L316 58 L210 58 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><circle cx=\"105\" cy=\"104\" r=\"22\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><circle cx=\"340\" cy=\"104\" r=\"22\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><circle cx=\"105\" cy=\"104\" r=\"9\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><circle cx=\"340\" cy=\"104\" r=\"9\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><line x1=\"200\" y1=\"62\" x2=\"200\" y2=\"100\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><text x=\"70\" y=\"90\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MALETERO</text><text x=\"375\" y=\"90\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">MOTOR</text><text x=\"225\" y=\"140\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">BAJOS / ESCAPE</text>" },
  multi: { l: "Multivista (planta + lados)", z: [{ n: "Planta · maletero", x1: 88, y1: 80 }, { n: "Planta · habitáculo", x1: 150, y1: 80 }, { n: "Planta · vano motor", x1: 225, y1: 80 }, { n: "Lateral", x1: 440, y1: 80 }, { n: "Frontal", x1: 225 }, { n: "Trasera", x1: 440 }], svg: "<g transform=\"translate(5,5) scale(.5)\"><path d=\"M50 40 Q50 22 80 22 L360 22 Q392 22 396 50 L396 100 Q392 128 360 128 L80 128 Q50 128 50 110 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M165 30 Q185 75 165 120\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M290 32 Q272 75 290 118\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/></g><g transform=\"translate(225,5) scale(.5)\"><path d=\"M30 100 L30 80 Q34 66 70 62 L130 58 L170 30 Q180 24 200 24 L290 24 Q310 24 322 36 L350 58 L400 62 Q414 66 414 82 L414 100 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><circle cx=\"105\" cy=\"104\" r=\"22\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><circle cx=\"340\" cy=\"104\" r=\"22\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/></g><g transform=\"translate(60,82)\"><path d=\"M10 50 L10 26 Q14 14 30 12 L50 2 L100 2 L120 12 Q136 14 140 26 L140 50 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"20\" y=\"38\" width=\"14\" height=\"22\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"116\" y=\"38\" width=\"14\" height=\"22\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"52\" y=\"22\" width=\"46\" height=\"12\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/></g><g transform=\"translate(250,82)\"><path d=\"M10 50 L10 26 Q14 14 30 12 L50 2 L100 2 L120 12 Q136 14 140 26 L140 50 Z\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"20\" y=\"38\" width=\"14\" height=\"22\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"116\" y=\"38\" width=\"14\" height=\"22\" rx=\"3\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"48\" y=\"36\" width=\"54\" height=\"8\" rx=\"2\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/></g><text x=\"110\" y=\"80\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">PLANTA</text><text x=\"330\" y=\"80\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">LATERAL</text><text x=\"135\" y=\"148\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">FRONTAL</text><text x=\"325\" y=\"148\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">TRASERA</text>" },
  motor: { l: "Despiece vano motor", z: [{ n: "Admisión", x1: 130, y1: 75 }, { n: "Batería", x1: 130 }, { n: "Bloque / inyectores", x1: 300 }, { n: "Turbo", x1: 440, y1: 80 }, { n: "Radiador", x1: 440 }], svg: "<rect x=\"20\" y=\"14\" width=\"400\" height=\"122\" rx=\"12\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"150\" y=\"40\" width=\"140\" height=\"70\" rx=\"8\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><circle cx=\"175\" cy=\"75\" r=\"9\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><circle cx=\"205\" cy=\"75\" r=\"9\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><circle cx=\"235\" cy=\"75\" r=\"9\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><circle cx=\"265\" cy=\"75\" r=\"9\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><rect x=\"40\" y=\"30\" width=\"80\" height=\"34\" rx=\"6\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"86\" width=\"60\" height=\"34\" rx=\"6\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><circle cx=\"350\" cy=\"50\" r=\"22\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><rect x=\"320\" y=\"92\" width=\"80\" height=\"28\" rx=\"6\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M290 75 L328 58\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><path d=\"M120 47 L150 60\" fill=\"none\" stroke=\"#1a1a1a\" stroke-width=\"1.6\" stroke-dasharray=\"4 3\"/><text x=\"220\" y=\"34\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">BLOQUE / INYECTORES</text><text x=\"80\" y=\"51\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">ADMISIÓN</text><text x=\"70\" y=\"107\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">BATERÍA</text><text x=\"350\" y=\"54\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">TURBO</text><text x=\"360\" y=\"110\" font-size=\"8\" fill=\"#666\" text-anchor=\"middle\" font-family=\"Courier New, monospace\">RADIADOR</text>" },
};
const infScheme = (st) => INF_VIEWS[st.view] || INF_BODIES[st.body] || INF_BODIES.sedan;
const infZone = (def, x, y = 0) => def.z.find((z) => x < z.x1 && (z.y0 == null || y >= z.y0) && (z.y1 == null || y < z.y1))?.n || "Vehículo";

// Tipo de carroceria por modelo del catalogo (los coches que no son una forma
// por categoria). El resto de coches cuenta como coupe / deportivo.
const INF_BODY_LIST = {
  sedan: "cheburek tmprem gbvivant gbsultanrsx gstarg1 gbargento7f gbschwartzers sultan2r kurumata gbkomodagt komodafr komoda superd3 vorschlaghammer rhinehart tailgater2 schafter3rs niobe gbharmann gstrhi1 gstsh51 jugulare gstraid1 raiden radiantvff stanier gbstanierle drafterwag sentinel5 ctsv16 bme6tun buffalowb lurcher glendale2 sultan3 gstsulbe1 sultan2 gxwrxjq urban",
  suv: "baller8pt gstter2 freecrawler dubsta3 cavalcade3 mayobronco mayobronco2 borneo imperialpas gresley winky toros peacemaker2 belials_anfibyox",
  pickup: "rebelc2 nriata caracaran gstsfubis1 kamacho yosemite guardian everon2 monster slamvan gbmojave taco23jq",
  van: "nspeedo gstsurf1 odyssey",
  super: "turismo3 champion zentorno turismor autarch t20 osiris reaper pfister811 tezeract tyrus entity2 krieger nero2 emerus cheetah torero2 italirsx nsczinger21c defz_italigton rimacjq iejq belials_camarembo",
  hatch: "gbissimetro pico panto brioso2 blista kanjo kanjosj drafterhatch gbclubxr gstclb1",
  muscle: "gstasp3 tampa tampa2 hermes hustler clique ellie gstban1 dominator3 dominator7 dominator8 dominator10 vigero3 vigerozxwbc ruiner4 ruiner4_fox firebolt dodgert70jq vamoswb buccaneer2 chino2 gauntlet4",
  f1: "proff caddy caddy2 driftmaster duness veto veto2",
  quad: "blazer5",
};
const INF_BODY_BY_ID = {};
for (const [b, ids] of Object.entries(INF_BODY_LIST)) for (const id of ids.split(/\s+/)) INF_BODY_BY_ID[id] = b;
const INF_BODY_BY_CAT = { motos: "moto", bicicletas: "moto", camiones: "camion", aviones: "avion", barcos: "barco", helicopteros: "heli" };
const INF_BODY_WORDS = [
  ["bus", /\b(bus|pbus|tourbus|airbus|coach|autobus|autobús|rentalbus)\b/],
  ["limo", /\b(stretch|limo|limusina|patriot2|patriot3)\b/],
  ["f1", /\b(pr4|br8|r88|openwheel|formula|formula2|veto|veto2|kart)\b/],
  ["quad", /\b(blazer|blazer2|blazer3|blazer4|outlaw|verus|quad|atv)\b/],
  ["cabrio", /\b(cabrio|convertible|roadster|spyder|descapotable|carbonizzare|stinger|ztype|cheetah2|feltzer3|windsor2|f620)\b/],
  ["muscle", /\b(dominator|gauntlet|sabre|sabregt|dukes|vigero|buccaneer|stallion|phoenix|ruiner|blade|chino|virgo|tampa|hotknife|ellie|hermes|hustler|deviant|impaler|clique|nightshade|faction|picador|moonbeam2|yosemite2|tulip|vamos|greenwood|eudora|broadway|weevil2|coquette3|mustang|camaro|charger|challenger|muscle)\b/],
  ["hatch", /\b(blista|blista2|issi|issi2|issi3|panto|brioso|brioso2|asbo|club|kanjo|weevil|dilettante|prairie|rhapsody|futo|futo2|hatch|hatchback|compacto)\b/],
  ["moto", /\b(bati|akuma|hakuchou|sanchez|pcj|bike|moto|bf400|vader|shotaro|nemesis|faggio|daemon|bagger|esskey|manchez|enduro|ruffian|double|carbon|lectro|diablous|avarus|chimera|sovereign|zombie|nightblade|wolfsbane|cliffhanger|gargoyle|hexer|innovation|thrust|vindicator|defiler|stryder|fcr|vortex|reever|shinobi|powersurge)\b/],
  ["heli", /\b(heli|helic|buzzard|maverick|frogger|swift|volatus|supervolito|havok|sparrow|cargobob|annihilator|conada)\b/],
  ["avion", /\b(jet|plane|avion|avión|luxor|shamal|vestra|cuban|duster|mammatus|dodo|titan|nimbus|velum|miljet|besra|lazer|howard|stunt|mallard|seabreeze|alphaz1|alpha z1)\b/],
  ["barco", /\b(boat|barco|lancha|jetmax|squalo|tropic|speeder|dinghy|seashark|toro|marquis|suntrap|longfin|yate|yacht)\b/],
  ["camion", /\b(truck|camion|camión|hauler|phantom|mule|benson|pounder|packer|flatbed|biff|mixer|tipper|rubble|stockade)\b/],
  ["van", /\b(van|speedo|burrito|rumpo|youga|pony|moonbeam|minivan|surfer|gburrito|bison van|boxville)\b/],
  ["pickup", /\b(pickup|pick-up|bison|sadler|rebel|riata|kamacho|caracara|everon|yosemite|bobcat|ranchera|guardian|sandking)\b/],
  ["suv", /\b(suv|4x4|baller|dubsta|granger|cavalcade|landstalker|huntley|xls|rocoto|patriot|mesa|contender|novak|toros|seminole|gresley|habanero|fq2|serrano|bronco|winky|astron|jubilee|rebla|squaddie|vivanite|aleutian|baller)\b/],
  ["super", /\b(zentorno|t20|osiris|reaper|tezeract|krieger|emerus|entity|nero|turismo|autarch|tyrus|xa21|vagner|deveste|thrax|zorrusso|ignus|furia|torero|infernus|vacca|adder|bullet|fmj|prototipo|visione|cyclone|sc1|tempesta|penetrator|lm87|virtue|tigon|zeno|pipistrello)\b/],
  ["sedan", /\b(sedan|sedán|sultan|kuruma|schafter|stanier|premier|tailgater|washington|asea|emperor|fugitive|primo|stratum|intruder|glendale|cognoscenti|super diamond|warrener|ingot|regina|asterope|cinquemila|deity|rhinehart|komoda)\b/],
];

// Memoria: tipo elegido a mano para cada vehiculo (app_settings "inf_body").
let INF_BODY_MEM = {};
async function infLoadBodyMem() {
  try {
    const rows = await cvCloud.req("/rest/v1/app_settings?select=value&key=eq.inf_body");
    const v = rows?.[0]?.value;
    if (v && typeof v === "object") INF_BODY_MEM = v;
  } catch {
    // sin memoria
  }
}
async function infSaveBodyMem(name, body) {
  const k = normalizeKeySimple(name);
  if (!k) return;
  const next = { ...INF_BODY_MEM, [k]: body };
  try {
    await cvCloud.upsert("app_settings", [{ key: "inf_body", value: next }], "key");
    INF_BODY_MEM = next;
  } catch {
    // se queda sin guardar; no es grave
  }
}

function infCatalogFind(name) {
  const k = normalizeKeySimple(name);
  if (!k) return null;
  return catVehicles().find((v) => normalizeKeySimple(v.nombre) === k || (v.modelo && normalizeKeySimple(v.modelo) === k)) || null;
}

// Devuelve { body, src } con el origen para la etiqueta del formulario.
function infDetectBody(name) {
  const k = normalizeKeySimple(name);
  if (!k) return { body: "sedan", src: "" };
  if (INF_BODY_MEM[k]) return { body: INF_BODY_MEM[k], src: "recordado de un informe anterior" };
  const v = infCatalogFind(name);
  if (v) {
    const cat = normalizeKeySimple(v.categoria).replace(/[^a-z]/g, "");
    if (INF_BODY_BY_CAT[cat]) return { body: INF_BODY_BY_CAT[cat], src: `por la categoría ${v.categoria}` };
    if (INF_BODY_BY_ID[v.id]) return { body: INF_BODY_BY_ID[v.id], src: "por el modelo" };
    return { body: "coupe", src: "por el catálogo" };
  }
  for (const [b, re] of INF_BODY_WORDS) if (re.test(k)) return { body: b, src: "por el nombre" };
  return { body: "sedan", src: "por defecto" };
}

// ---------- Utilidades ----------
const infEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const infMoney = (n) => fmtMoney(Math.round(Number(n) || 0));
function infNowParts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return { date: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`, time: `${p(d.getHours())}:${p(d.getMinutes())}` };
}
function infCode() {
  const a = new Uint8Array(4);
  (window.crypto || window.msCrypto).getRandomValues(a);
  const h = [...a].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `AM-${h.slice(0, 4)}-${h.slice(4, 8)}`;
}
function infInspector() {
  const p = AUTH.profile;
  if (p?.name) return `${p.name} ${p.surname || ""}`.trim();
  const e = AUTH.discordId && typeof empMainOf === "function" ? empMainOf(AUTH.discordId) : null;
  return e ? fullName(e) : AUTH.name || "Jefe Aguila";
}
function infGamaFor(st) {
  const v = infCatalogFind(st.vehiculo);
  const g = v ? catGamaKey(v) : "";
  return g || (st.vehiculo ? "gama_vip" : "gama_media");
}
function infProductPrice(name) {
  const p = getAllProducts().find((x) => normalizeKeySimple(x.name) === normalizeKeySimple(name));
  return p ? Number(p.price) || 0 : 0;
}

function infNewState(tipo = "nitro") {
  const now = infNowParts();
  return {
    id: (window.crypto?.randomUUID?.() || `inf-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    v: 1,
    tipo,
    estado: "borrador",
    numero: "",
    codigo: infCode(),
    fecha: now.date,
    hora: now.time,
    agencia: "FBI",
    placa: "",
    agente: "",
    motivo: INF_TIPOS[tipo].motivos[0],
    captura: "",
    vehiculo: "",
    matricula: "",
    color: "",
    propietario: "",
    body: "sedan",
    bodySrc: "",
    points: [],
    res: "si", // nitro: si | no | rastros
    sistema: "operativo",
    circulable: "si",
    gama: "",
    checks: { contacto: "ok", cerradura: "ok", matriculas: "ok", bastidor: "ok", alarma: "ok" },
    mods: { Motor: "No instalado", Turbo: "No instalado", "Transmisión": "No instalado", Frenos: "No instalado", "Suspensión": "No instalado", Blindaje: "No instalado", Tintado: "No instalado", Neones: "No instalado", Nitro: "No instalado" },
    grua: { lugar: "", hora: now.time, gruista: "", motivoR: "Estacionamiento indebido", servicio: "Grúa Terrestre", llaves: "No", plaza: "1" },
    items: [],
    concl: "",
    conclEdited: false,
    inspector: infInspector(),
  };
}

const INF_CHECKS = [
  ["contacto", "Contacto / arranque", "Forzado", "Correcto"],
  ["cerradura", "Cerraduras", "Forzada", "Correctas"],
  ["matriculas", "Matrículas", "Manipuladas", "Correctas"],
  ["bastidor", "Nº de bastidor", "Raspado / ilegible", "Legible"],
  ["alarma", "Alarma / localizador", "Desconectada", "Correcta"],
];
const INF_MOD_OPTS = {
  Motor: ["No instalado", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4"],
  Turbo: ["No instalado", "Instalado"],
  "Transmisión": ["No instalado", "Nivel 1", "Nivel 2", "Nivel 3"],
  Frenos: ["No instalado", "Nivel 1", "Nivel 2", "Nivel 3"],
  "Suspensión": ["No instalado", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4"],
  Blindaje: ["No instalado", "20 %", "40 %", "60 %", "80 %", "100 %"],
  Tintado: ["No instalado", "Claro", "Medio", "Oscuro", "Limo"],
  Neones: ["No instalado", "Instalados"],
  Nitro: ["No instalado", "Instalado"],
};
const INF_GRUA_MOTIVOS = ["Estacionamiento indebido", "Vehículo abandonado", "Accidente", "Incautación", "Avería", "Petición del propietario"];

// ---------- Resultado y textos automaticos ----------
function infNumbered(st) {
  let n = 0;
  return st.points.map((p) => ({ ...p, n: INF_TOOLS[p.t]?.num ? ++n : 0, zone: infZone(infScheme(st), p.x, p.y), cell: infCell(p.x, p.y) }));
}

function infVerdict(st) {
  const pts = st.points;
  const has = (t) => pts.some((p) => p.t === t);
  switch (st.tipo) {
    case "nitro": {
      if (st.res === "no") return { t: "NITRO NO DETECTADO", s: "Ningún sistema de N₂O", c: "green" };
      if (st.res === "rastros") return { t: "RASTROS DE NITRO", s: "Sistema retirado · quedan restos de la instalación", c: "amber" };
      const b = pts.filter((p) => p.t === "botella").length;
      return { t: "NITRO DETECTADO", s: `${b ? `${b} ${b === 1 ? "botella" : "botellas"} de N₂O · ` : ""}sistema ${st.sistema}`, c: "red" };
    }
    case "danos": {
      const g = pts.filter((p) => p.t === "grave").length;
      const l = pts.filter((p) => p.t === "leve").length;
      const circ = st.circulable === "si" ? "circulable" : "no circulable";
      if (!g && !l) return { t: "SIN DAÑOS", s: "No se aprecian daños", c: "green" };
      if (g >= 2) return { t: "DAÑOS GRAVES", s: `${g + l} zonas dañadas · ${circ}`, c: "red" };
      if (g) return { t: "DAÑOS MODERADOS", s: `${g + l} zonas dañadas · ${circ}`, c: "amber" };
      return { t: "DAÑOS LEVES", s: `${l} ${l === 1 ? "zona dañada" : "zonas dañadas"} · ${circ}`, c: "amber" };
    }
    case "incautado": {
      const bad = INF_CHECKS.filter(([k]) => st.checks[k] === "bad").length + pts.filter((p) => p.t === "indicio").length;
      return bad ? { t: "SIGNOS DE ROBO", s: `${bad} ${bad === 1 ? "indicio" : "indicios"} de manipulación`, c: "red" } : { t: "SIN SIGNOS DE ROBO", s: "Contacto, cerraduras y matrículas correctos", c: "green" };
    }
    case "modificaciones": {
      const n = Object.values(st.mods).filter((v) => v !== "No instalado").length;
      return st.mods.Nitro === "Instalado" || has("nitro") ? { t: "NO APTO", s: "Lleva nitro (N₂O) instalado", c: "red" } : { t: "APTO", s: `${n} ${n === 1 ? "modificación" : "modificaciones"} · todas legales`, c: "green" };
    }
    case "grua":
      return { t: "EN DEPÓSITO", s: `Aguila Motors · plaza ${st.grua.plaza || "—"}`, c: "blue" };
    case "presupuesto": {
      const tot = st.items.reduce((a, i) => a + i.price * i.qty, 0);
      return { t: `TOTAL ${infMoney(tot)}`, s: `${st.items.length} ${st.items.length === 1 ? "concepto" : "conceptos"} · válido 7 días`, c: "blue" };
    }
  }
  return { t: "", s: "", c: "blue" };
}

function infValuation(st) {
  if (!st.points.length) return [];
  const g = categoryLabel(st.gama || infGamaFor(st));
  const out = [];
  const carr = `Carrocería (${g})`;
  if (infProductPrice(carr)) out.push({ name: carr, price: infProductPrice(carr), qty: 1 });
  out.push({ name: "Reparación (Taller)", price: infProductPrice("Reparación (Taller)") || 800, qty: 1 });
  return out;
}

function infAutoConclusion(st) {
  const ag = st.agencia === "Particular" ? "del propietario" : `del ${st.agencia}`;
  const veh = `<b>${infEsc(st.vehiculo || "vehículo")}</b>${st.matricula ? ` con matrícula <b>${infEsc(st.matricula)}</b>` : ""}`;
  const v = infVerdict(st);
  const pts = infNumbered(st);
  switch (st.tipo) {
    case "nitro": {
      if (st.res === "no") return `Tras la inspección realizada a petición ${ag}, el ${veh} no presenta ningún sistema de óxido nitroso (N₂O) en el momento de la inspección. Este certificado no garantiza el estado del vehículo con posterioridad a la fecha indicada.`;
      if (st.res === "rastros") return `Tras la inspección realizada a petición ${ag}, el ${veh} no lleva un sistema de nitro operativo, pero presenta <b>restos de una instalación anterior</b> (conductos, soportes o conexiones). El informe describe el estado del vehículo en el momento de la inspección.`;
      const b = pts.filter((p) => p.t === "botella");
      const where = [...new Set(b.map((p) => p.zone.toLowerCase()))].join(" y ");
      return `Tras la inspección realizada a petición ${ag}, se constata que el ${veh} lleva instalado un <b>sistema de óxido nitroso ${st.sistema}${b.length ? ` (${b.length} ${b.length === 1 ? "botella" : "botellas"})` : ""}</b>${where ? ` en ${where}` : ""}. El informe describe el estado del vehículo en el momento de la inspección.`;
    }
    case "danos": {
      const tot = infValuation(st).reduce((a, i) => a + i.price * i.qty, 0);
      if (!st.points.length) return `Tras la inspección realizada a petición ${ag}, el ${veh} no presenta daños apreciables.`;
      const zones = [...new Set(pts.filter((p) => p.n).map((p) => p.zone.toLowerCase()))].join(", ");
      return `Tras la inspección realizada a petición ${ag}, el ${veh} presenta <b>${v.t.toLowerCase()}</b> en: ${zones}. El vehículo es ${st.circulable === "si" ? "circulable" : "<b>no circulable</b>"}. La reparación se valora en <b>${infMoney(tot)}</b> según la tarifa del taller.`;
    }
    case "incautado": {
      const bad = INF_CHECKS.filter(([k]) => st.checks[k] === "bad").map(([, l, b]) => `${l.toLowerCase()} (${b.toLowerCase()})`);
      return bad.length || pts.some((p) => p.t === "indicio")
        ? `El ${veh} presenta <b>signos de manipulación compatibles con un robo</b>${bad.length ? `: ${bad.join(", ")}` : ""}. ${st.checks.matriculas === "ok" && st.checks.bastidor === "ok" ? "Matrícula y bastidor coinciden con el vehículo." : ""}`
        : `El ${veh} no presenta signos de robo ni de manipulación: contacto, cerraduras, matrículas y bastidor correctos.`;
    }
    case "modificaciones": {
      const inst = Object.entries(st.mods).filter(([k, val]) => val !== "No instalado" && k !== "Nitro").map(([k, val]) => `${k.toLowerCase()} (${val.toLowerCase()})`);
      return st.mods.Nitro === "Instalado" || st.points.some((p) => p.t === "nitro")
        ? `El ${veh} lleva instalado un <b>sistema de nitro (N₂O)</b>, modificación prohibida en la ciudad, por lo que <b>no es apto</b> para circular hasta su retirada.${inst.length ? ` El resto de modificaciones (${inst.join(", ")}) son legales.` : ""}`
        : `${inst.length ? `Todas las modificaciones instaladas en el ${veh} son legales: ${inst.join(", ")}.` : `El ${veh} no lleva modificaciones.`} <b>No lleva sistema de nitro (N₂O)</b>, única modificación prohibida en la ciudad. El vehículo es <b>apto</b> para circular.`;
    }
    case "grua": {
      const prev = pts.filter((p) => p.n);
      return `El ${veh} fue retirado de la vía pública${st.grua.lugar ? ` (${infEsc(st.grua.lugar)})` : ""} a petición ${ag} y queda en el depósito de Aguila Motors, plaza ${infEsc(st.grua.plaza || "—")}. ${prev.length ? `Al llegar presentaba ${prev.map((p) => `(${p.n}) ${p.zone.toLowerCase()}`).join(", ")} con daños previos a la retirada.` : "Al llegar no presentaba daños."} Se entregará con la autorización correspondiente.`;
    }
    case "presupuesto":
      return `Presupuesto calculado con la tarifa vigente de Aguila Motors${st.gama ? ` para ${categoryLabel(st.gama)}` : ""}. Los importes pueden variar si al desmontar aparecen daños no visibles. Para aceptarlo, preséntese en el taller con este número de presupuesto.`;
  }
  return "";
}

// ---------- Informe (HTML de una pagina A4: 794 x 1123 px) ----------
function infPointsSvg(st) {
  return infNumbered(st)
    .map((p) => {
      const t = INF_TOOLS[p.t] || INF_TOOLS.ok;
      return `<g><circle cx="${p.x}" cy="${p.y}" r="10" fill="${t.c}"/><text x="${p.x}" y="${p.y + 4}" font-size="10" fill="#fff" text-anchor="middle" font-weight="900" font-family="Segoe UI, Arial">${p.n || "✓"}</text></g>`;
    })
    .join("");
}

// Estilo v107: zonas coloreadas + cuadricula de referencia (A-H x 1-3).
const INF_ZONE_COLORS = ["#ffe3c2", "#dbe9ff", "#ffd6d6", "#dff3e1", "#efe0ff", "#fff3b8"];
const INF_ZONE_INK = ["#a35a00", "#2357a8", "#b02020", "#1b7f3b", "#6b3fb0", "#8a6d00"];
const INF_COLS = "ABCDEFGH";
const infCell = (x, y) => `${INF_COLS[Math.min(7, Math.max(0, Math.floor(x / 55)))]}${Math.min(3, Math.max(1, Math.floor(y / 50) + 1))}`;
let infSvgSeq = 0;
function infSchemeSvg(st, attrs = 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"') {
  const def = infScheme(st);
  const id = `infclip${++infSvgSeq}`;
  const shapes = def.svg.replace(/<text[\s\S]*?<\/text>/g, "").replace(/fill="[^"]*"/g, 'fill="#fff"').replace(/stroke="[^"]*"/g, 'stroke="#fff"');
  let prev = 0;
  const rects = def.z.map((z, i) => {
    const r = { x: z.y0 != null || z.y1 != null ? 0 : prev, x2: z.x1, y: z.y0 ?? 0, y2: z.y1 ?? 150, c: INF_ZONE_COLORS[i % INF_ZONE_COLORS.length] };
    if (z.y0 == null && z.y1 == null) prev = z.x1;
    return r;
  });
  // zonas con limite de y (multivista, despiece): el x de inicio es el x1 de la anterior con el mismo limite
  def.z.forEach((z, i) => {
    if (z.y0 == null && z.y1 == null) return;
    const before = def.z.slice(0, i).filter((q) => q.y0 === z.y0 && q.y1 === z.y1).pop();
    rects[i].x = before ? before.x1 : 0;
  });
  def.z.forEach((z, i) => {
    if (z.y0 != null || z.y1 != null) return;
    const before = def.z.slice(0, i).filter((q) => q.y0 == null && q.y1 == null).pop();
    rects[i].x = before ? before.x1 : 0;
  });
  const zones = rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${Math.max(0, r.x2 - r.x)}" height="${r.y2 - r.y}" fill="${r.c}"/>`).reverse().join("");
  let grid = "";
  for (let i = 0; i <= 8; i++) grid += `<line x1="${i * 55}" y1="0" x2="${i * 55}" y2="150" stroke="#8a8a8a" stroke-width=".6" stroke-dasharray="2 3"/>`;
  for (let j = 0; j <= 3; j++) grid += `<line x1="0" y1="${j * 50}" x2="440" y2="${j * 50}" stroke="#8a8a8a" stroke-width=".6" stroke-dasharray="2 3"/>`;
  for (let i = 0; i < 8; i++) grid += `<text x="${i * 55 + 27.5}" y="-3" font-size="8" fill="#777" text-anchor="middle" font-family="Courier New, monospace" font-weight="700">${INF_COLS[i]}</text>`;
  for (let j = 0; j < 3; j++) grid += `<text x="-8" y="${j * 50 + 28}" font-size="8" fill="#777" text-anchor="middle" font-family="Courier New, monospace" font-weight="700">${j + 1}</text>`;
  const cells = infNumbered(st).filter((p) => p.n).map((p) => `<text x="${p.x + 11}" y="${p.y - 7}" font-size="7.5" fill="#1a1a1a" font-family="Courier New, monospace" font-weight="700">${p.cell}</text>`).join("");
  return `<svg viewBox="-16 -12 462 168" ${attrs}><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-16" y="-12" width="462" height="168">${shapes}</mask></defs><g mask="url(#${id})">${zones}</g>${grid}${def.svg}${infPointsSvg(st)}${cells}</svg>`;
}

function infSectionsHtml(st, raw = false) {
  const pts = infNumbered(st);
  const zones = infScheme(st).z.map((z) => z.n);
  const hit = (z) => pts.filter((p) => p.zone === z && p.n);
  const out = [];
  if (st.tipo === "nitro") {
    if (st.res === "no") {
      out.push(["ZONAS REVISADAS", `<ol>${zones.map((z) => `<li>${z}: <span class="g">sin hallazgos.</span></li>`).join("")}<li>Bajos / chasis: <span class="g">sin hallazgos.</span></li></ol>`]);
      out.push(["CERTIFICACIÓN", `<p class="cert"><b class="h">CERTIFICADO DE AUSENCIA DE NITRO</b>Aguila Motors <b>certifica</b> que, en la inspección del vehículo <b>${infEsc(st.vehiculo || "—")}</b>${st.matricula ? ` con matrícula <b>${infEsc(st.matricula)}</b>` : ""}, realizada el <b>${infEsc(st.fecha)} a las ${infEsc(st.hora)}</b>, <b>no se detectó ningún sistema de óxido nitroso (N₂O)</b> ni restos de su instalación en ninguna de las zonas revisadas.</p>`]);
    } else {
      const items = pts.filter((p) => p.n).map((p) => `<li>${INF_TOOLS[p.t].l} · ${p.zone.toLowerCase()} <span class="cell">${p.cell}</span></li>`);
      const clean = zones.filter((z) => !hit(z).length);
      if (clean.length) items.push(`<li>${clean.join(", ")} y bajos: <span class="g">sin hallazgos.</span></li>`);
      out.push([st.res === "rastros" ? "RESTOS ENCONTRADOS" : "HALLAZGOS", `<ol>${items.join("") || "<li>Sin puntos marcados.</li>"}</ol>`]);
    }
  } else if (st.tipo === "danos") {
    const rows = pts.filter((p) => p.n).map((p) => `<tr><td>(${p.n}) ${p.zone} <span class="cell">${p.cell}</span></td><td>${p.t === "grave" ? '<span class="lvl"><i style="width:80%;background:#d93025"></i></span><span class="r">Grave</span>' : '<span class="lvl"><i style="width:35%;background:#f2a900"></i></span><span class="a">Leve</span>'}</td></tr>`);
    const clean = zones.filter((z) => !hit(z).length).map((z) => `<tr><td>${z}</td><td><span class="lvl"><i style="width:8%;background:#1b7f3b"></i></span><span class="g">Sin daños</span></td></tr>`);
    out.push(["DAÑOS REGISTRADOS", `<table><tr><th>ZONA</th><th>NIVEL</th></tr>${rows.join("")}${clean.join("")}</table>`]);
    const val = infValuation(st);
    if (val.length) out.push(["VALORACIÓN DE LA REPARACIÓN", `<table><tr><th>CONCEPTO</th><th class="n">IMPORTE</th></tr>${val.map((i) => `<tr><td>${infEsc(i.name)}</td><td class="n">${infMoney(i.price * i.qty)}</td></tr>`).join("")}<tr class="tot"><td>TOTAL</td><td class="n">${infMoney(val.reduce((a, i) => a + i.price * i.qty, 0))}</td></tr></table>`]);
  } else if (st.tipo === "incautado") {
    out.push(["COMPROBACIONES", `<table><tr><th>ELEMENTO</th><th>ESTADO</th></tr>${INF_CHECKS.map(([k, l, b, g]) => `<tr><td>${l}</td><td class="${st.checks[k] === "bad" ? "r" : "g"}">${st.checks[k] === "bad" ? b : g}</td></tr>`).join("")}${pts.filter((p) => p.n).map((p) => `<tr><td>(${p.n}) ${p.zone} <span class="cell">${p.cell}</span></td><td class="r">${INF_TOOLS[p.t].l}</td></tr>`).join("")}</table>`]);
  } else if (st.tipo === "modificaciones") {
    out.push(["MODIFICACIONES INSTALADAS", `<table><tr><th>ELEMENTO</th><th>ESTADO</th><th>LEGALIDAD</th></tr>${Object.entries(st.mods).map(([k, val]) => {
      const bad = k === "Nitro" && val === "Instalado";
      return `<tr><td>${k === "Nitro" ? "Nitro (N₂O)" : k === "Tintado" ? "Tintado de lunas" : k === "Neones" ? "Neones RGB" : k}</td><td>${val}</td><td class="${bad ? "r" : "g"}">${bad ? "Ilegal" : k === "Nitro" ? "Correcto" : val === "No instalado" ? "—" : "Legal"}</td></tr>`;
    }).join("")}</table>`]);
  } else if (st.tipo === "grua") {
    const g = st.grua;
    out.push(["DATOS DE LA RETIRADA", `<div class="kv"><div><span>LUGAR</span><b>${infEsc(g.lugar || "—")}</b></div><div><span>HORA</span><b>${infEsc(g.hora || "—")}</b></div><div><span>GRUISTA</span><b>${infEsc(g.gruista || "—")}</b></div><div><span>MOTIVO</span><b>${infEsc(g.motivoR)}</b></div><div><span>SERVICIO</span><b>${infEsc(g.servicio)} · ${infMoney(infProductPrice(g.servicio))}</b></div><div><span>LLAVES</span><b>${g.llaves === "Sí" ? "Entregadas" : "No entregadas"}</b></div></div>`]);
  } else if (st.tipo === "presupuesto") {
    const tot = st.items.reduce((a, i) => a + i.price * i.qty, 0);
    out.push(["DETALLE DEL PRESUPUESTO", `<table><tr><th>CONCEPTO</th><th class="n">CANT.</th><th class="n">PRECIO</th><th class="n">IMPORTE</th></tr>${st.items.map((i) => `<tr><td>${infEsc(i.name)}</td><td class="n">${i.qty}</td><td class="n">${infMoney(i.price)}</td><td class="n">${infMoney(i.price * i.qty)}</td></tr>`).join("") || '<tr><td colspan="4">Añade conceptos desde el formulario.</td></tr>'}<tr class="tot"><td>TOTAL</td><td></td><td></td><td class="n">${infMoney(tot)}</td></tr></table>`]);
  }
  if (raw) return out;
  return out.map(([t, b]) => `<h3>${t}</h3>${b}`).join("");
}

// Esquema a la izquierda y la primera seccion (zonas / hallazgos / danos) a la derecha.
const INF_SIDE = { nitro: 1, danos: 1, incautado: 1, modificaciones: 1 };
function infSchemeBlock(st) {
  const h = st.tipo === "danos" ? "MAPA DE DAÑOS" : st.tipo === "grua" ? "ESTADO AL LLEGAR AL TALLER" : st.tipo === "presupuesto" ? "ZONAS A REPARAR" : "ESQUEMA DE HALLAZGOS";
  const secs = infSectionsHtml(st, true);
  const sch = `<h3>${h}</h3><div class="rp-sch">${infSchemeSvg(st)}</div>`;
  if (!INF_SIDE[st.tipo] || !secs.length) return sch + secs.map(([t, b]) => `<h3>${t}</h3>${b}`).join("");
  const [first, ...rest] = secs;
  const legend = `<div class="rp-legend">${infScheme(st).z.map((z, i) => `<span><i style="background:${INF_ZONE_COLORS[i % INF_ZONE_COLORS.length]}"></i>${z.n}</span>`).join("")}<em>Cuadrícula A–H · 1–3: posición exacta de cada hallazgo.</em></div>`;
  return `<div class="rp-side"><div class="rp-side-l">${sch}</div><div class="rp-side-r"><h3>${first[0]}</h3>${first[1]}${legend}</div></div>${rest.map(([t, b]) => `<h3>${t}</h3>${b}`).join("")}`;
}

function infReportHtml(st) {
  const tipo = INF_TIPOS[st.tipo];
  const ag = INF_AG[st.agencia] || INF_AG.FBI;
  const v = infVerdict(st);
  const col = { red: "#b3261e", green: "#1b7f3b", amber: "#b26a00", blue: "#0b1f44" }[v.c];
  const pres = st.tipo === "presupuesto";
  const solicit = st.agencia === "Particular" ? `${infEsc(st.propietario || "Cliente particular")}` : `${ag.name}${st.placa ? ` · Agente placa ${infEsc(st.placa)}` : ""}${st.agente ? ` · ${infEsc(st.agente)}` : ""}`;
  const num = st.numero || "BORRADOR";
  const veh = [["Vehículo", `${infEsc(st.vehiculo || "—")}${st.vehiculo && !infCatalogFind(st.vehiculo) ? " (custom)" : ""}`], ["Matrícula", infEsc(st.matricula || "—")], ["Carrocería", (INF_BODIES[st.body] || INF_BODIES.sedan).l], ["Color", infEsc(st.color || "—")], ["Propietario", infEsc(st.propietario || "—")]];
  const concl = st.conclEdited && st.concl ? infEsc(st.concl).replace(/\n/g, "<br>") : infAutoConclusion(st);
  const short = st.agencia === "Particular" ? "Cliente" : ag.name;
  const bottom = pres
    ? `<h3>ACEPTACIÓN DEL CLIENTE</h3><div class="cust"><div><span>CLIENTE</span><b>${infEsc(st.propietario || "—")}</b><i>Firma del cliente</i></div><div><span>FECHA DE ACEPTACIÓN</span><b>__ / __ / ____</b><i>Fecha</i></div><div><span>ANTICIPO</span><b>$ ________</b><i>Recibido por el taller</i></div></div>`
    : `<h3>CADENA DE CUSTODIA</h3><div class="cust"><div><span>SOLICITADO / ENTREGADO POR</span><b>${st.agencia === "Particular" ? infEsc(st.propietario || "Cliente") : `${ag.name}${st.placa ? ` · placa ${infEsc(st.placa)}` : ""}`}</b><i>Firma</i></div><div><span>INSPECCIONADO POR</span><b>Aguila Motors · ${infEsc(st.inspector)}</b><i>Firma del inspector</i></div><div><span>DEVUELTO A</span><b>${short}</b><i>Firma de recepción · fecha y hora</i></div></div>`;
  return `<div class="rp${pres ? " rp-pres" : ""}">
<div class="rp-bar">${st.agencia === "Particular" ? "" : `<img class="s" src="${ag.logo}" alt="">`}<div><h1>${tipo.title}</h1><p>Solicitado por ${solicit}</p></div><img class="am" src="aguila_motors_logo.png" alt=""></div>
<div class="rp-cls">${pres ? "PRESUPUESTO · AGUILA MOTORS" : "CONFIDENCIAL · USO POLICIAL"}</div>
<div class="rp-body">
<div class="rp-row"><div><span>Nº DE INSPECCIÓN</span><b>${infEsc(num)}</b></div><div><span>FECHA</span><b>${infEsc(st.fecha)} ${infEsc(st.hora)}</b></div><div><span>MOTIVO</span><b>${infEsc(st.motivo)}</b></div><div><span>INSPECTOR</span><b>Ing. ${infEsc(st.inspector)}</b></div></div>
<div class="rp-two"><div class="rp-photo">${st.captura ? `<img src="${st.captura}" alt="">` : '<div class="rp-nophoto">Sin captura</div>'}<small>EVIDENCIA FOTOGRÁFICA Nº 1</small></div>
<div class="rp-veh"><h3>VEHÍCULO</h3><dl>${veh.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>
<div class="rp-verdict" style="border-color:${col};color:${col};background:${col}12">${v.t}<small>${v.s}</small></div></div></div>
${infSchemeBlock(st)}
<h3>CONCLUSIÓN</h3><p class="rp-concl">${concl}</p>
${bottom}
<div class="rp-foot"><div><div class="rp-cal">${infEsc(st.inspector)}</div><div class="rp-sig">ING. ${infEsc(st.inspector).toUpperCase()} · JEFE AGUILA<span class="rp-tit">Ingeniero en Mecánica Automotriz · Aguila Motors</span></div></div><img class="rp-stamp" src="informes/sello.png" alt=""><div class="rp-code">VERIFICACIÓN<br><b>${infEsc(st.codigo)}</b></div></div>
</div></div>`;
}

// Mete el informe en "host" y lo ajusta para que quepa en una pagina.
function infMountReport(host, st) {
  host.innerHTML = infReportHtml(st);
  const page = host.querySelector(".rp");
  // Con el esquema al lado, el hueco que sobra se lo lleva la foto (hasta 300 px).
  const foot = page?.querySelector(".rp-foot");
  const img = page?.querySelector(".rp-photo img, .rp-nophoto");
  if (foot && img && page.querySelector(".rp-side")) {
    const prev = foot.previousElementSibling;
    const free = foot.offsetTop - (prev.offsetTop + prev.offsetHeight) - 14;
    if (free > 10) {
      const grow = Math.min(free, Math.max(0, 250 - img.offsetHeight));
      img.style.height = `${img.offsetHeight + grow}px`;
      // El resto se reparte como aire entre las secciones (sin huecos grandes).
      const body = page.querySelector(".rp-body");
      const rest = free - grow;
      const n = body.children.length - 1;
      if (rest > 10 && n > 0) body.style.gap = `${8 + Math.min(18, Math.floor(rest / n))}px`;
    }
  }
  if (page && page.scrollHeight > page.clientHeight + 1) page.classList.add("tight");
  if (page && page.scrollHeight > page.clientHeight + 1) page.classList.add("tighter");
  return page;
}

// ---------- Exportar ----------
let INF_LIBS = null;
function infLoadScript(urls) {
  return new Promise((resolve, reject) => {
    const tryAt = (i) => {
      if (i >= urls.length) return reject(new Error("no se pudo cargar (¿sin internet?)"));
      const s = document.createElement("script");
      s.src = urls[i];
      s.onload = () => resolve();
      s.onerror = () => {
        s.remove();
        tryAt(i + 1);
      };
      document.head.appendChild(s);
    };
    tryAt(0);
  });
}
function infLoadLibs() {
  if (INF_LIBS) return INF_LIBS;
  INF_LIBS = Promise.all([
    window.html2canvas ? null : infLoadScript(["https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js", "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"]),
    window.jspdf ? null : infLoadScript(["https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"]),
  ]).catch((e) => {
    INF_LIBS = null;
    throw e;
  });
  return INF_LIBS;
}

async function infRenderCanvas(st) {
  await infLoadLibs();
  const host = document.createElement("div");
  host.className = "rp-host-off";
  document.body.appendChild(host);
  try {
    const page = infMountReport(host, st);
    await (document.fonts?.ready || Promise.resolve());
    await Promise.all([...host.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
    return await window.html2canvas(page, { scale: 2, backgroundColor: "#f3efe4", useCORS: true, logging: false, width: 794, height: 1123, windowWidth: 1200 });
  } finally {
    host.remove();
  }
}
function infFileName(st, ext) {
  const base = st.numero || `BORRADOR-${st.codigo}`;
  return `${base}_${(st.matricula || st.vehiculo || "vehiculo").replace(/[^\w-]+/g, "_")}.${ext}`;
}
function infDownload(blobOrUrl, name) {
  const a = document.createElement("a");
  a.href = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (typeof blobOrUrl !== "string") URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
}
async function infExportPng(st) {
  const c = await infRenderCanvas(st);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  infDownload(blob, infFileName(st, "png"));
}
async function infExportPdf(st) {
  const c = await infRenderCanvas(st);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
  pdf.setProperties({ title: `${INF_TIPOS[st.tipo].title} ${st.numero || ""}`.trim(), author: "Aguila Motors" });
  infDownload(pdf.output("blob"), infFileName(st, "pdf"));
}

// Reduce la captura pegada a JPEG (max 1100 px de ancho).
function infCompressImage(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = Math.min(1100, img.naturalWidth);
        const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("no es una imagen"));
      img.src = fr.result;
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

// ---------- Nube: tabla informes ----------
const INF_CLOUD = { ok: null, list: [] };
async function infCloudList() {
  try {
    INF_CLOUD.list = (await cvCloud.req("/rest/v1/informes?select=id,numero,estado,tipo,agencia,placa,vehiculo,matricula,resultado,codigo,created_at,emitido_at&order=created_at.desc&limit=300", { auth: true })) || [];
    INF_CLOUD.ok = true;
  } catch (e) {
    INF_CLOUD.ok = !(e.status === 404 || e.code === "PGRST205" || e.code === "42P01");
    INF_CLOUD.list = [];
    if (INF_CLOUD.ok) throw e;
  }
  return INF_CLOUD.list;
}
async function infCloudGet(id) {
  const rows = await cvCloud.req(`/rest/v1/informes?select=*&id=eq.${encodeURIComponent(id)}`, { auth: true });
  return rows?.[0] || null;
}
async function infNextNumber() {
  const y = new Date().getFullYear();
  const rows = await cvCloud.req(`/rest/v1/informes?select=correlativo&anio=eq.${y}&correlativo=not.is.null&order=correlativo.desc&limit=1`, { auth: true });
  const n = (rows?.[0]?.correlativo || 0) + 1;
  return { anio: y, correlativo: n, numero: `INSP-${y}-${String(n).padStart(4, "0")}` };
}
async function infCloudSave(st) {
  const v = infVerdict(st);
  const row = {
    id: st.id,
    numero: st.numero || null,
    anio: st.anio || null,
    correlativo: st.correlativo || null,
    estado: st.estado,
    tipo: st.tipo,
    agencia: st.agencia,
    placa: st.placa || null,
    vehiculo: st.vehiculo || null,
    matricula: st.matricula || null,
    resultado: v.t,
    codigo: st.codigo,
    datos: st,
    creado_por: AUTH.name || "",
    emitido_at: st.emitidoAt || null,
    updated_at: new Date().toISOString(),
  };
  await cvCloud.upsert("informes", [row], "id");
}

// ============================================================================
// Pantalla: formulario + vista previa + registro
// ============================================================================
const INF_DRAFT_KEY = "aguila_inf_draft_v1";

function setupInformes() {
  const root = byId("tab-inf");
  if (!root) return;
  const $ = (id) => byId(id);
  const mk = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  let st = null;
  try {
    const raw = JSON.parse(localStorage.getItem(INF_DRAFT_KEY) || "null");
    if (raw && raw.v === 1 && INF_TIPOS[raw.tipo]) st = { ...infNewState(raw.tipo), ...raw };
  } catch {
    st = null;
  }
  if (!st) st = infNewState("nitro");
  let tool = INF_TIPOS[st.tipo].tools[0];
  let loaded = false;

  const status = (t, ok = true) => {
    const s = $("inf-status");
    s.textContent = t;
    s.className = "inf-status" + (ok ? " ok" : " bad");
  };
  let saveT = null;
  const saveLocal = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        localStorage.setItem(INF_DRAFT_KEY, JSON.stringify(st));
      } catch {
        // sin espacio: no pasa nada
      }
    }, 300);
  };

  // ---------- Vista previa ----------
  let prevT = null;
  function renderPreview() {
    cancelAnimationFrame(prevT);
    prevT = requestAnimationFrame(() => {
      const box = $("inf-preview");
      const inner = box.querySelector(".rp-scale") || box.appendChild(mk("div", "rp-scale"));
      infMountReport(inner, st);
      const scale = box.clientWidth / 794;
      inner.style.transform = `scale(${scale})`;
      box.style.height = `${Math.ceil(1123 * scale)}px`;
      $("inf-prev-num").textContent = st.numero ? `${st.numero} · ${st.estado === "emitido" ? "emitido" : "borrador"}` : "Borrador sin número";
    });
  }
  window.addEventListener("resize", () => root.classList.contains("is-active") && renderPreview());

  function sync({ form = false } = {}) {
    if (form) renderForm();
    else {
      renderScheme();
      renderPointsTable();
      renderConcl();
    }
    renderPreview();
    saveLocal();
  }

  // ---------- Paso 1: tipo ----------
  function renderTypes() {
    const box = $("inf-types");
    box.textContent = "";
    for (const [k, t] of Object.entries(INF_TIPOS)) {
      const b = mk("button", "inf-type" + (st.tipo === k ? " is-on" : ""));
      b.type = "button";
      b.append(mk("span", "", t.icon), mk("b", "", t.label));
      b.addEventListener("click", () => {
        if (st.tipo === k) return;
        if (st.numero) {
          // Un informe emitido no cambia de tipo: se empieza otro con el mismo solicitante y vehiculo.
          if (!confirm(`${st.numero} ya está emitido. ¿Empezar un informe nuevo de ${t.label} con el mismo solicitante y vehículo?`)) return;
          const keep = { agencia: st.agencia, placa: st.placa, agente: st.agente, vehiculo: st.vehiculo, matricula: st.matricula, color: st.color, propietario: st.propietario, body: st.body, bodySrc: st.bodySrc, view: st.view || "", captura: st.captura };
          st = Object.assign(infNewState(k), keep);
        }
        st.tipo = k;
        st.motivo = t.motivos[0];
        st.points = st.points.filter((p) => t.tools.includes(p.t));
        tool = t.tools[0];
        if (k === "presupuesto" && st.agencia !== "Particular") st.agencia = "Particular";
        if ((k === "danos" || k === "presupuesto") && !st.gama) st.gama = infGamaFor(st);
        sync({ form: true });
      });
      box.appendChild(b);
    }
  }

  // ---------- Paso 2: solicitante ----------
  function renderAgs() {
    const box = $("inf-ags");
    box.textContent = "";
    for (const [k, a] of Object.entries(INF_AG)) {
      const b = mk("button", "inf-ag" + (st.agencia === k ? " is-on" : ""));
      b.type = "button";
      const img = mk("img");
      img.src = a.logo;
      img.alt = "";
      b.append(img, mk("b", "", a.name));
      b.addEventListener("click", () => {
        st.agencia = k;
        sync({ form: true });
      });
      box.appendChild(b);
    }
    const police = st.agencia !== "Particular";
    $("inf-placa-wrap").hidden = !police;
    $("inf-agente-wrap").hidden = !police || (!st.agente && !$("inf-agente-wrap").dataset.open);
    $("inf-agente-add").hidden = !police || !$("inf-agente-wrap").hidden;
    const sel = $("inf-motivo");
    sel.textContent = "";
    const opts = [...INF_TIPOS[st.tipo].motivos];
    if (st.motivo && !opts.includes(st.motivo)) opts.push(st.motivo);
    for (const m of opts) sel.appendChild(new Option(m, m));
    sel.value = st.motivo;
  }

  // ---------- Paso 3: vehiculo ----------
  function renderVehicle() {
    $("inf-vehiculo").value = st.vehiculo;
    $("inf-matricula").value = st.matricula;
    $("inf-propietario").value = st.propietario;
    const cs = $("inf-color");
    const known = INF_COLORS.some(([n]) => n === st.color);
    cs.value = !st.color ? "" : known ? st.color : "__otro";
    $("inf-color-otro").hidden = cs.value !== "__otro";
    $("inf-color-otro").value = known ? "" : st.color;
    const sw = INF_COLORS.find(([n]) => n === st.color);
    $("inf-color-sw").style.background = sw ? sw[1] : "transparent";
    const pz = $("inf-paste");
    pz.classList.toggle("has", !!st.captura);
    const img = pz.querySelector("img");
    img.hidden = !st.captura;
    if (st.captura) img.src = st.captura;
    const custom = st.vehiculo && !infCatalogFind(st.vehiculo);
    $("inf-badges").innerHTML = (st.vehiculo ? `<span class="inf-badge">✔ Tipo: ${(INF_BODIES[st.body] || INF_BODIES.sedan).l}${st.bodySrc ? ` · ${infEsc(st.bodySrc)}` : ""}</span>` : "") + (custom ? '<span class="inf-badge vip">Custom · no está en el catálogo</span>' : "");
    const bb = $("inf-bodies");
    bb.textContent = "";
    for (const [k, b] of Object.entries(INF_BODIES)) {
      const btn = mk("button", "inf-body" + (st.body === k ? " is-on" : ""));
      btn.type = "button";
      btn.title = b.l;
      btn.innerHTML = `<svg viewBox="0 0 440 150" width="100%" height="30">${b.svg}</svg><span>${b.l}</span>`;
      btn.addEventListener("click", () => {
        st.body = k;
        st.view = "";
        st.bodySrc = "elegido a mano";
        if (st.vehiculo) infSaveBodyMem(st.vehiculo, k);
        sync({ form: true });
      });
      bb.appendChild(btn);
    }
    const vb = $("inf-views");
    if (vb) {
      vb.textContent = "";
      for (const [k, b] of [["", { l: "Planta (carrocería)", svg: (INF_BODIES[st.body] || INF_BODIES.sedan).svg }], ...Object.entries(INF_VIEWS)]) {
        const btn = mk("button", "inf-body" + ((st.view || "") === k ? " is-on" : ""));
        btn.type = "button";
        btn.title = b.l;
        btn.innerHTML = `<svg viewBox="0 0 440 150" width="100%" height="30">${b.svg}</svg><span>${b.l}</span>`;
        btn.addEventListener("click", () => {
          if ((st.view || "") === k) return;
          if (st.points.length && !confirm("Los puntos marcados están colocados sobre el esquema actual. ¿Cambiar de vista y quitarlos?")) return;
          st.points = [];
          st.view = k;
          sync({ form: true });
        });
        vb.appendChild(btn);
      }
    }
  }

  // ---------- Paso 4: esquema, herramientas y extras ----------
  function renderTools() {
    const box = $("inf-tools");
    box.textContent = "";
    for (const k of INF_TIPOS[st.tipo].tools) {
      const t = INF_TOOLS[k];
      const b = mk("button", "inf-tool" + (tool === k ? " is-on" : ""));
      b.type = "button";
      const i = mk("i");
      i.style.background = t.c;
      b.append(i, t.l);
      b.addEventListener("click", () => {
        tool = k;
        renderTools();
      });
      box.appendChild(b);
    }
    const u = mk("button", "inf-tool", "↩ Deshacer");
    u.type = "button";
    u.addEventListener("click", () => {
      st.points.pop();
      sync();
    });
    const c = mk("button", "inf-tool", "Borrar todo");
    c.type = "button";
    c.addEventListener("click", () => {
      if (st.points.length && confirm("¿Quitar todos los puntos del esquema?")) {
        st.points = [];
        sync();
      }
    });
    box.append(u, c);
  }
  function renderScheme() {
    const box = $("inf-scheme");
    box.innerHTML = infSchemeSvg(st, 'width="100%" height="100%"');
    const svg = box.querySelector("svg");
    svg.addEventListener("click", (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const m = svg.getScreenCTM();
      if (!m) return;
      const p = pt.matrixTransform(m.inverse());
      const x = Math.round(Math.max(10, Math.min(430, p.x)));
      const y = Math.round(Math.max(10, Math.min(140, p.y)));
      const near = st.points.findIndex((q) => Math.hypot(q.x - x, q.y - y) < 13);
      if (near >= 0) st.points.splice(near, 1);
      else st.points.push({ x, y, t: tool });
      sync();
    });
  }
  function renderPointsTable() {
    const box = $("inf-points");
    box.textContent = "";
    const pts = infNumbered(st);
    if (!pts.length) {
      box.appendChild(mk("p", "muted inf-small", "Toca el esquema para marcar. Tocar un punto lo quita."));
      return;
    }
    for (const p of pts) {
      const r = mk("div", "inf-pt");
      const i = mk("i", "", p.n || "✓");
      i.style.background = INF_TOOLS[p.t].c;
      r.append(i, mk("span", "", p.n ? `${p.zone} · ${p.cell}` : p.zone), mk("b", "", INF_TOOLS[p.t].l));
      box.appendChild(r);
    }
  }

  const seg = (opts, val, onPick) => {
    const w = mk("div", "inf-seg");
    for (const [v, l, cls] of opts) {
      const b = mk("button", (val === v ? "is-on " : "") + (cls || ""), l);
      b.type = "button";
      b.addEventListener("click", () => onPick(v));
      w.appendChild(b);
    }
    return w;
  };
  const field = (label, el) => {
    const l = mk("label", "inf-field");
    l.append(mk("span", "", label), el);
    return l;
  };
  const select = (opts, val, onCh, groups = null) => {
    const s = mk("select", "text-input");
    if (groups) {
      for (const [g, items] of groups) {
        const og = document.createElement("optgroup");
        og.label = g;
        for (const it of items) og.appendChild(new Option(it[1], it[0]));
        s.appendChild(og);
      }
    } else for (const o of opts) s.appendChild(new Option(Array.isArray(o) ? o[1] : o, Array.isArray(o) ? o[0] : o));
    s.value = val;
    s.addEventListener("change", () => onCh(s.value));
    return s;
  };
  const gamaSelect = () =>
    field("Gama (tarifa)", select(GAMAS.map((g) => [g.key, g.label]), st.gama || infGamaFor(st), (v) => {
      st.gama = v;
      if (st.tipo === "presupuesto") st.items = st.items.map((i) => i);
      sync({ form: true });
    }));

  function renderExtra() {
    const box = $("inf-extra");
    box.textContent = "";
    const t = st.tipo;
    if (t === "nitro") {
      box.appendChild(mk("p", "inf-lbl", "Resultado"));
      box.appendChild(seg([["si", "NITRO DETECTADO", "r"], ["no", "NO DETECTADO", "g"], ["rastros", "RASTROS", "a"]], st.res, (v) => {
        st.res = v;
        sync({ form: true });
      }));
      if (st.res === "si") box.appendChild(field("Sistema", select(["operativo", "desconectado"], st.sistema, (v) => {
        st.sistema = v;
        sync();
      })));
      const b = st.points.filter((p) => p.t === "botella").length;
      if (st.res === "si") box.appendChild(mk("p", "inf-small muted", `Botellas contadas del esquema: ${b}`));
    } else if (t === "danos") {
      box.appendChild(gamaSelect());
      box.appendChild(mk("p", "inf-lbl", "¿Circulable?"));
      box.appendChild(seg([["si", "Sí"], ["no", "No"]], st.circulable, (v) => {
        st.circulable = v;
        sync({ form: true });
      }));
      const val = infValuation(st);
      box.appendChild(mk("p", "inf-small muted", val.length ? `Valoración automática: ${infMoney(val.reduce((a, i) => a + i.price * i.qty, 0))}` : "Marca los daños en el esquema para calcular la valoración."));
    } else if (t === "incautado") {
      box.appendChild(mk("p", "inf-lbl", "Comprobaciones (toca para cambiar)"));
      for (const [k, l, bad, ok] of INF_CHECKS) {
        const r = mk("button", "inf-check" + (st.checks[k] === "bad" ? " bad" : ""));
        r.type = "button";
        r.append(mk("span", "", l), mk("b", "", st.checks[k] === "bad" ? `✖ ${bad}` : `✔ ${ok}`));
        r.addEventListener("click", () => {
          st.checks[k] = st.checks[k] === "bad" ? "ok" : "bad";
          sync({ form: true });
        });
        box.appendChild(r);
      }
    } else if (t === "modificaciones") {
      box.appendChild(mk("p", "inf-lbl", "Modificaciones instaladas"));
      const g = mk("div", "inf-mods");
      for (const [k, opts] of Object.entries(INF_MOD_OPTS)) {
        const s = select(opts, st.mods[k], (v) => {
          st.mods[k] = v;
          sync({ form: k === "Nitro" });
        });
        if (k === "Nitro") s.classList.add("inf-nitro");
        g.appendChild(field(k === "Nitro" ? "Nitro (ilegal)" : k, s));
      }
      box.appendChild(g);
    } else if (t === "grua") {
      const gr = st.grua;
      const inp = (key, ph, type = "text") => {
        const i = mk("input", "text-input");
        i.type = type;
        i.placeholder = ph;
        i.value = gr[key] || "";
        i.addEventListener("input", () => {
          gr[key] = i.value;
          sync();
        });
        return i;
      };
      const emps = typeof EMP_CLOUD !== "undefined" ? EMP_CLOUD.list.map(fullName).sort((a, b) => a.localeCompare(b, "es")) : [];
      const gruistas = ["", ...emps];
      if (gr.gruista && !gruistas.includes(gr.gruista)) gruistas.push(gr.gruista);
      const grua = getAllProducts().filter((p) => p.category === "servicios_grua").map((p) => p.name);
      const g = mk("div", "inf-mods");
      g.append(
        field("Lugar de recogida", inp("lugar", "p. ej. Vinewood Blvd")),
        field("Hora", inp("hora", "", "time")),
        field("Gruista", select(gruistas.map((n) => [n, n || "—"]), gr.gruista, (v) => { gr.gruista = v; sync(); })),
        field("Motivo de la retirada", select(INF_GRUA_MOTIVOS, gr.motivoR, (v) => { gr.motivoR = v; sync(); })),
        field("Servicio cobrado", select(grua.length ? grua : [gr.servicio], gr.servicio, (v) => { gr.servicio = v; sync(); })),
        field("Plaza del depósito", inp("plaza", "1", "number")),
      );
      box.appendChild(g);
      box.appendChild(mk("p", "inf-lbl", "Llaves"));
      box.appendChild(seg([["No", "No entregadas"], ["Sí", "Entregadas"]], gr.llaves, (v) => { gr.llaves = v; sync({ form: true }); }));
    } else if (t === "presupuesto") {
      box.appendChild(gamaSelect());
      const all = getAllProducts();
      const gk = st.gama || infGamaFor(st);
      const gl = categoryLabel(gk);
      const groups = [];
      const byCat = {};
      for (const p of all) {
        const cat = p.category || "otros";
        if (cat.startsWith("gama_") || ["motos", "camiones", "aereos"].includes(cat)) {
          if (cat !== gk) continue;
        }
        (byCat[cat] ||= []).push([p.name, `${p.name} · ${infMoney(p.price)}`]);
      }
      for (const [cat, items] of Object.entries(byCat)) groups.push([categoryLabel(cat), items]);
      const row = mk("div", "inf-add");
      const ps = select([], "", () => {}, groups);
      const qty = mk("input", "text-input");
      qty.type = "number";
      qty.min = "1";
      qty.value = "1";
      const add = mk("button", "", "➕ Añadir");
      add.type = "button";
      add.addEventListener("click", () => {
        const p = all.find((x) => x.name === ps.value);
        if (!p) return;
        const q = Math.max(1, Math.round(Number(qty.value) || 1));
        const ex = st.items.find((i) => i.name === p.name);
        if (ex) ex.qty += q;
        else st.items.push({ name: p.name, price: Number(p.price) || 0, qty: q });
        sync({ form: true });
      });
      row.append(ps, qty, add);
      box.appendChild(mk("p", "inf-lbl", `Conceptos (tarifa ${gl})`));
      box.appendChild(row);
      const list = mk("div", "inf-items");
      st.items.forEach((it, idx) => {
        const r = mk("div", "inf-item");
        const minus = mk("button", "", "−");
        minus.type = "button";
        minus.addEventListener("click", () => {
          it.qty -= 1;
          if (it.qty <= 0) st.items.splice(idx, 1);
          sync({ form: true });
        });
        const plus = mk("button", "", "+");
        plus.type = "button";
        plus.addEventListener("click", () => {
          it.qty += 1;
          sync({ form: true });
        });
        r.append(mk("span", "", it.name), minus, mk("b", "", `×${it.qty}`), plus, mk("em", "", infMoney(it.price * it.qty)));
        list.appendChild(r);
      });
      box.appendChild(list);
      if (st.items.length) box.appendChild(mk("p", "inf-total", `Total: ${infMoney(st.items.reduce((a, i) => a + i.price * i.qty, 0))}`));
    }
  }

  function renderConcl() {
    const ta = $("inf-concl");
    if (document.activeElement !== ta) {
      const tmp = mk("div");
      tmp.innerHTML = infAutoConclusion(st);
      ta.value = st.conclEdited ? st.concl : tmp.textContent;
    }
    $("inf-concl-auto").hidden = !st.conclEdited;
    $("inf-concl-hint").textContent = st.conclEdited ? "✏️ Conclusión editada a mano" : "✨ Conclusión redactada sola · escribe para cambiarla";
  }

  function renderForm() {
    renderTypes();
    renderAgs();
    $("inf-placa").value = st.placa;
    $("inf-agente").value = st.agente;
    renderVehicle();
    renderTools();
    renderScheme();
    renderPointsTable();
    renderExtra();
    renderConcl();
    $("inf-emit").textContent = st.estado === "emitido" ? "✔ Guardar cambios del informe emitido" : "✔ Emitir y guardar en el registro";
  }

  // ---------- Eventos de los campos fijos ----------
  const bind = (id, key, after) =>
    $(id).addEventListener("input", () => {
      st[key] = $(id).value;
      after?.();
      sync();
    });
  bind("inf-placa", "placa");
  bind("inf-agente", "agente");
  bind("inf-matricula", "matricula", () => ($("inf-matricula").value = st.matricula = st.matricula.toUpperCase()));
  bind("inf-propietario", "propietario");
  $("inf-motivo").addEventListener("change", () => {
    st.motivo = $("inf-motivo").value;
    sync();
  });
  $("inf-agente-add").addEventListener("click", () => {
    $("inf-agente-wrap").dataset.open = "1";
    renderAgs();
    $("inf-agente").focus();
  });
  const onVeh = () => {
    st.vehiculo = $("inf-vehiculo").value.trim();
    const d = infDetectBody(st.vehiculo);
    if (st.bodySrc !== "elegido a mano" || !st.vehiculo) {
      st.body = d.body;
      st.bodySrc = d.src;
    }
    if (st.tipo === "danos" || st.tipo === "presupuesto") st.gama = infGamaFor(st);
    sync({ form: true });
  };
  $("inf-vehiculo").addEventListener("change", onVeh);
  $("inf-vehiculo").addEventListener("input", () => {
    st.vehiculo = $("inf-vehiculo").value;
    renderPreview();
    saveLocal();
  });
  $("inf-vehiculo").addEventListener("focus", () => {
    if (st.bodySrc === "elegido a mano") st.bodySrc = "";
  });
  const colorSel = $("inf-color");
  colorSel.appendChild(new Option("—", ""));
  for (const [n] of INF_COLORS) colorSel.appendChild(new Option(n, n));
  colorSel.appendChild(new Option("Otro…", "__otro"));
  colorSel.addEventListener("change", () => {
    st.color = colorSel.value === "__otro" ? $("inf-color-otro").value : colorSel.value;
    renderVehicle();
    if (colorSel.value === "__otro") $("inf-color-otro").focus();
    sync();
  });
  $("inf-color-otro").addEventListener("input", () => {
    st.color = $("inf-color-otro").value;
    sync();
  });
  $("inf-concl").addEventListener("input", () => {
    st.concl = $("inf-concl").value;
    st.conclEdited = true;
    $("inf-concl-auto").hidden = false;
    renderPreview();
    saveLocal();
  });
  $("inf-concl-auto").addEventListener("click", () => {
    st.conclEdited = false;
    st.concl = "";
    sync();
  });

  // Catalogo para el autocompletado
  const dl = $("inf-vehs");
  for (const v of catVehicles()) dl.appendChild(new Option(v.nombre, v.nombre));

  // ---------- Captura: pegar, soltar o elegir ----------
  const setCapture = async (file) => {
    try {
      st.captura = await infCompressImage(file);
      renderVehicle();
      renderPreview();
      saveLocal();
      status("✔ Captura añadida.");
    } catch (e) {
      status(`No se pudo usar la imagen: ${e.message}`, false);
    }
  };
  document.addEventListener("paste", (ev) => {
    if (!root.classList.contains("is-active")) return;
    const item = [...(ev.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (!item) return;
    ev.preventDefault();
    setCapture(item.getAsFile());
  });
  const pz = $("inf-paste");
  pz.addEventListener("click", (ev) => {
    if (ev.target.closest("#inf-photo-del")) return;
    $("inf-file").click();
  });
  $("inf-file").addEventListener("change", () => {
    const f = $("inf-file").files?.[0];
    if (f) setCapture(f);
    $("inf-file").value = "";
  });
  pz.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    pz.classList.add("drag");
  });
  pz.addEventListener("dragleave", () => pz.classList.remove("drag"));
  pz.addEventListener("drop", (ev) => {
    ev.preventDefault();
    pz.classList.remove("drag");
    const f = [...(ev.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) setCapture(f);
  });
  $("inf-photo-del").addEventListener("click", () => {
    st.captura = "";
    renderVehicle();
    sync();
  });

  // ---------- Botones ----------
  const busy = async (btn, label, fn) => {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    try {
      await fn();
    } catch (e) {
      status(`No se pudo: ${e.message || e}`, false);
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };
  const needData = () => {
    if (!st.vehiculo.trim()) return "Escribe el vehículo.";
    if (st.agencia !== "Particular" && !st.placa.trim()) return "Pon la placa del agente que lo solicita.";
    return "";
  };
  $("inf-png").addEventListener("click", () => busy($("inf-png"), "Generando…", async () => {
    await infExportPng(st);
    status("✔ PNG descargado.");
  }));
  $("inf-pdf").addEventListener("click", () => busy($("inf-pdf"), "Generando…", async () => {
    await infExportPdf(st);
    status("✔ PDF descargado.");
  }));
  $("inf-draft").addEventListener("click", () => busy($("inf-draft"), "Guardando…", async () => {
    if (INF_CLOUD.ok === false) throw new Error("falta pegar en Supabase el SQL 12_informes.sql");
    if (st.estado !== "emitido") st.estado = "borrador";
    await infCloudSave(st);
    await refreshRegistry();
    status("✔ Borrador guardado en el registro.");
  }));
  $("inf-emit").addEventListener("click", () => busy($("inf-emit"), "Emitiendo…", async () => {
    if (INF_CLOUD.ok === false) throw new Error("falta pegar en Supabase el SQL 12_informes.sql");
    const miss = needData();
    if (miss) throw new Error(miss);
    if (!st.numero) {
      if (!confirm("¿Emitir el informe? Se le asigna su número de inspección definitivo.")) return;
      Object.assign(st, await infNextNumber());
      st.emitidoAt = new Date().toISOString();
    }
    st.estado = "emitido";
    await infCloudSave(st);
    saveLocal();
    await refreshRegistry();
    renderForm();
    renderPreview();
    status(`✔ Informe ${st.numero} emitido y guardado. Ya puedes descargarlo.`);
  }));
  $("inf-new").addEventListener("click", () => {
    if (!confirm("¿Empezar un informe nuevo en blanco? Lo que no hayas guardado se pierde.")) return;
    const ag = st.agencia;
    st = infNewState(st.tipo);
    st.agencia = ag;
    tool = INF_TIPOS[st.tipo].tools[0];
    $("inf-agente-wrap").dataset.open = "";
    sync({ form: true });
    status("Informe nuevo.");
  });

  // ---------- Registro ----------
  const views = root.querySelectorAll("[data-inf-view]");
  const setView = (v) => {
    views.forEach((b) => b.classList.toggle("is-on", b.dataset.infView === v));
    root.querySelectorAll("[data-inf-pane]").forEach((p) => (p.hidden = p.dataset.infPane !== v));
    if (v === "new") renderPreview();
    if (v === "reg") renderRegistry();
  };
  views.forEach((b) => b.addEventListener("click", () => setView(b.dataset.infView)));

  async function refreshRegistry() {
    try {
      await infCloudList();
    } catch (e) {
      $("inf-warn").hidden = false;
      $("inf-warn").textContent = `No se pudo leer el registro: ${e.message || e}`;
      return;
    }
    $("inf-warn").hidden = INF_CLOUD.ok !== false;
    $("inf-warn").textContent = "Falta pegar en Supabase el SQL 12_informes.sql para guardar los informes en el registro. Mientras tanto puedes generarlos y descargarlos igual.";
    $("inf-reg-n").textContent = INF_CLOUD.list.length ? `(${INF_CLOUD.list.length})` : "";
    const pl = $("inf-placas");
    pl.textContent = "";
    const seen = new Set();
    for (const r of INF_CLOUD.list) {
      if (r.placa && !seen.has(r.placa)) {
        seen.add(r.placa);
        pl.appendChild(new Option(r.placa, `${r.agencia || ""}`));
      }
    }
    renderRegistry();
  }

  async function openFromCloud(id, mode = "edit") {
    const row = await infCloudGet(id);
    if (!row?.datos) throw new Error("no se encontró el informe");
    const d = { ...infNewState(row.datos.tipo || "nitro"), ...row.datos };
    if (mode === "dup") {
      const fresh = infNewState(d.tipo);
      Object.assign(d, { id: fresh.id, codigo: fresh.codigo, numero: "", anio: null, correlativo: null, estado: "borrador", emitidoAt: null, fecha: fresh.fecha, hora: fresh.hora, points: [], captura: "", concl: "", conclEdited: false, inspector: fresh.inspector });
    }
    return d;
  }

  function renderRegistry() {
    const body = $("inf-reg");
    if (!body) return;
    body.textContent = "";
    const q = normalizeKeySimple($("inf-reg-q").value);
    const fa = $("inf-reg-ag").value;
    const ft = $("inf-reg-tipo").value;
    const rows = INF_CLOUD.list.filter((r) => (!fa || r.agencia === fa) && (!ft || r.tipo === ft) && (!q || normalizeKeySimple(`${r.numero} ${r.vehiculo} ${r.matricula} ${r.placa} ${r.codigo} ${r.propietario || ""}`).includes(q)));
    $("inf-reg-empty").hidden = rows.length > 0;
    $("inf-reg-empty").textContent = INF_CLOUD.ok === false ? "Falta pegar el SQL 12_informes.sql en Supabase." : INF_CLOUD.list.length ? "Ningún informe con ese filtro." : "Todavía no hay informes guardados.";
    for (const r of rows) {
      const tr = document.createElement("tr");
      const d = new Date(r.emitido_at || r.created_at);
      const when = isNaN(d) ? "" : d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
      const res = String(r.resultado || "");
      const cls = /NO DETECTADO|SIN |APTO$|^APTO/.test(res) && !/NO APTO/.test(res) ? "pg" : /DETECTADO|ROBO|GRAVES|NO APTO/.test(res) ? "pr" : /MODERADOS|LEVES|RASTROS/.test(res) ? "pa" : "pb";
      const ag = INF_AG[r.agencia] || INF_AG.FBI;
      tr.innerHTML = `<td><b>${infEsc(r.numero || "Borrador")}</b>${r.estado !== "emitido" ? ' <em class="inf-draft">borrador</em>' : ""}</td><td>${infEsc(when)}</td><td>${INF_TIPOS[r.tipo]?.icon || ""} ${infEsc(INF_TIPOS[r.tipo]?.label || r.tipo)}</td><td><span class="inf-agl"><img src="${ag.logo}" alt="">${infEsc(r.agencia || "")}${r.placa ? ` · ${infEsc(r.placa)}` : ""}</span></td><td>${infEsc(r.vehiculo || "")}</td><td class="mono">${infEsc(r.matricula || "")}</td><td><span class="inf-pill ${cls}">${infEsc(res)}</span></td><td class="inf-acts"></td>`;
      const acts = tr.querySelector(".inf-acts");
      const act = (label, fn, title = "") => {
        const b = mk("button", "ghost small", label);
        b.type = "button";
        if (title) b.title = title;
        b.addEventListener("click", () => busy(b, "…", fn));
        acts.appendChild(b);
      };
      act("👁 Abrir", async () => {
        st = await openFromCloud(r.id);
        tool = INF_TIPOS[st.tipo].tools[0];
        setView("new");
        sync({ form: true });
        status(`Abierto ${st.numero || "borrador"}.`);
      });
      act("⬇ PDF", async () => infExportPdf(await openFromCloud(r.id)));
      act("⧉ Duplicar", async () => {
        st = await openFromCloud(r.id, "dup");
        tool = INF_TIPOS[st.tipo].tools[0];
        setView("new");
        sync({ form: true });
        status("Duplicado: mismo solicitante y vehículo, sin puntos ni captura.");
      }, "Nuevo informe con el mismo solicitante y vehículo");
      if (r.estado !== "emitido")
        act("🗑", async () => {
          if (!confirm("¿Borrar este borrador del registro?")) return;
          await cvCloud.req(`/rest/v1/informes?id=eq.${encodeURIComponent(r.id)}`, { method: "DELETE", auth: true });
          await refreshRegistry();
        }, "Borrar borrador");
      body.appendChild(tr);
    }
  }
  for (const id of ["inf-reg-q", "inf-reg-ag", "inf-reg-tipo"]) $(id).addEventListener(id === "inf-reg-q" ? "input" : "change", renderRegistry);
  for (const [k, t] of Object.entries(INF_TIPOS)) $("inf-reg-tipo").appendChild(new Option(t.label, k));
  $("inf-verify").addEventListener("click", async () => {
    const code = prompt("Código de verificación que aparece en el informe (AM-XXXX-XXXX):", "");
    if (!code) return;
    const c = code.trim().toUpperCase();
    try {
      const rows = await cvCloud.req(`/rest/v1/informes?select=numero,estado,tipo,agencia,placa,vehiculo,matricula,resultado,emitido_at&codigo=eq.${encodeURIComponent(c)}`, { auth: true });
      const r = rows?.[0];
      alert(r ? `✔ AUTÉNTICO\n\n${r.numero || "Borrador"} · ${INF_TIPOS[r.tipo]?.label || r.tipo}\n${r.vehiculo || ""} ${r.matricula ? `(${r.matricula})` : ""}\nSolicitado por ${r.agencia || ""}${r.placa ? ` · placa ${r.placa}` : ""}\nResultado: ${r.resultado || ""}${r.estado !== "emitido" ? "\n\n⚠ Está como borrador (no emitido)." : ""}` : `✖ No hay ningún informe con el código ${c}.\nPuede ser falso o estar mal escrito.`);
    } catch (e) {
      alert(`No se pudo comprobar: ${e.message || e}`);
    }
  });

  // ---------- Al abrir la seccion ----------
  const onOpen = async () => {
    if (!st.inspector || st.inspector === "Jefe Aguila") st.inspector = infInspector();
    renderForm();
    renderPreview();
    if (loaded) return;
    loaded = true;
    await Promise.all([infLoadBodyMem(), refreshRegistry()]);
  };
  new MutationObserver(() => root.classList.contains("is-active") && onOpen()).observe(root, { attributes: true, attributeFilter: ["class"] });
  if (root.classList.contains("is-active")) onOpen();
}
