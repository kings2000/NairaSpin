// Generates the collectible and emblem artwork as standalone SVG files in
// src/assets/collectibles. Run with `npm run assets` after editing.
//
// Every asset shares one art style: a 128×128 canvas, light from the top-left, a 3px dark
// outline in the material's ink colour, the same ground shadow and the same denomination
// tag. Each collectible has its own silhouette so it reads at small grid sizes.
// All designs are original; none reproduce real currency artwork.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'collectibles');

const MATERIALS = {
  bronze: { hi: '#FFE3C4', light: '#F2B27C', mid: '#C9773C', dark: '#7A3D14', line: '#3A1C08', tag: '#3A1C08', tagText: '#FFD9AE' },
  silver: { hi: '#FFFFFF', light: '#F0F3F8', mid: '#BCC5D2', dark: '#6B7587', line: '#232936', tag: '#232936', tagText: '#EEF2F8' },
  gold: { hi: '#FFFBE3', light: '#FFE38A', mid: '#EFB63B', dark: '#A5640E', line: '#3B2302', tag: '#3B2302', tagText: '#FFE08A' },
  emerald: { hi: '#E8FFF4', light: '#7CEFB6', mid: '#15AE6E', dark: '#055E39', line: '#02291A', tag: '#02291A', tagText: '#B9FFDD' },
  platinum: { hi: '#FFFFFF', light: '#F5F7FF', mid: '#D3DAF2', dark: '#8893C2', line: '#20274A', tag: '#20274A', tagText: '#EEF1FF' },
  wild: { hi: '#FFFFFF', light: '#FFE38A', mid: '#EFB63B', dark: '#A5640E', line: '#2A0E55', tag: '#4B1D96', tagText: '#FFFFFF' },
};

const LINE = 3;
const FONT = "'Arial Black','Segoe UI Black','Helvetica Neue',Arial,sans-serif";

function defs(m) {
  return `<defs>
  <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.light}"/><stop offset=".5" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.dark}"/></linearGradient>
  <linearGradient id="bodyV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.light}"/><stop offset=".55" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.dark}"/></linearGradient>
  <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${m.dark}"/><stop offset=".3" stop-color="${m.light}"/><stop offset=".6" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.dark}"/></linearGradient>
  <radialGradient id="face" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${m.hi}"/><stop offset=".3" stop-color="${m.light}"/><stop offset=".7" stop-color="${m.mid}"/><stop offset="1" stop-color="${m.dark}"/></radialGradient>
</defs>`;
}

const shadow = (rx = 38) => `<ellipse cx="64" cy="117" rx="${rx}" ry="6.5" fill="#000" opacity=".28"/>`;

function tag(text, m) {
  const w = 16 + text.length * 8.2;
  return `<g><rect x="${64 - w / 2}" y="101" width="${w}" height="20" rx="10" fill="${m.tag}" stroke="${m.light}" stroke-width="1.6"/>
  <text x="64" y="115.6" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="12.5" fill="${m.tagText}">${text}</text></g>`;
}

const ol = (m) => `stroke="${m.line}" stroke-width="${LINE}" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (d, w = 3.5, o = 0.75) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;

function star(cx, cy, n, R, r, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = ((rot + (180 / n) * i) * Math.PI) / 180;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

function svg(m, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs(m)}${body}</svg>\n`;
}

// ---- Collectibles -------------------------------------------------------------------

/** Bronze ₦10: a small stack of coins. */
function coinStack() {
  const m = MATERIALS.bronze;
  const coin = (cx, cy, top) => {
    const rx = 36, ry = 11.5, t = 10;
    return `<path d="M${cx - rx},${cy} L${cx - rx},${cy + t} A${rx},${ry} 0 0 0 ${cx + rx},${cy + t} L${cx + rx},${cy} Z" fill="url(#side)" ${ol(m)}/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#face)" ${ol(m)}/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 7}" ry="${ry - 2.6}" fill="none" stroke="${m.dark}" stroke-width="1.6" opacity=".55"/>
    ${top ? `<path d="${star(cx, cy, 8, 10, 5)}" transform="translate(0 ${cy * 0.68}) scale(1 .32)" fill="${m.dark}" opacity=".75"/>
    ${shine(`M${cx - 25},${cy - 3} A27,8 0 0 1 ${cx + 4},${cy - 9}`)}` : ''}`;
  };
  return svg(m, `${shadow(40)}${coin(62, 82, false)}${coin(67, 66, false)}${coin(61, 50, true)}${tag('₦10', m)}`);
}

/** Bronze ₦20: a cowrie shell, the historic currency of the region. */
function cowrie() {
  const m = MATERIALS.bronze;
  const teeth = [40, 50, 60, 70, 80, 90]
    .map((y) => `<path d="M${57 + Math.abs(y - 65) * 0.08},${y} h-6 M${71 - Math.abs(y - 65) * 0.08},${y} h6" stroke="${m.line}" stroke-width="2.4" stroke-linecap="round"/>`)
    .join('');
  return svg(
    m,
    `${shadow(36)}
  <path d="M64,10 C98,10 110,44 108,68 C106,98 88,112 64,112 C40,112 22,98 20,68 C18,44 30,10 64,10Z" fill="url(#face)" ${ol(m)}/>
  <path d="M64,22 C90,24 100,50 98,70" fill="none" stroke="${m.dark}" stroke-width="2" opacity=".4"/>
  <path d="M64,26 C55,46 55,88 64,102 C73,88 73,46 64,26Z" fill="${m.line}" opacity=".9"/>
  ${teeth}
  ${shine('M34,46 C38,30 48,22 58,20', 4.5, 0.7)}
  ${tag('₦20', m)}`,
  );
}

/** Bronze ₦50: a crest shield with an adire-style geometric engraving. */
function shield() {
  const m = MATERIALS.bronze;
  const outer = 'M64,8 L106,20 L106,58 C106,86 88,104 64,116 C40,104 22,86 22,58 L22,20 Z';
  const inner = 'M64,18 L96,27 L96,58 C96,80 82,94 64,104 C46,94 32,80 32,58 L32,27 Z';
  return svg(
    m,
    `${shadow(34)}
  <path d="${outer}" fill="url(#body)" ${ol(m)}/>
  <path d="${inner}" fill="url(#face)" stroke="${m.dark}" stroke-width="2"/>
  <path d="M64,34 L82,58 L64,82 L46,58 Z" fill="${m.dark}" opacity=".55"/>
  <path d="M64,44 L74,58 L64,72 L54,58 Z" fill="${m.light}" stroke="${m.line}" stroke-width="2"/>
  <g fill="${m.dark}" opacity=".6"><circle cx="48" cy="38" r="2.6"/><circle cx="80" cy="38" r="2.6"/><circle cx="44" cy="76" r="2.6"/><circle cx="84" cy="76" r="2.6"/></g>
  <path d="M38,30 L46,30 M82,30 L90,30" stroke="${m.dark}" stroke-width="2" opacity=".5"/>
  ${shine('M30,24 L56,16', 4, 0.7)}
  ${tag('₦50', m)}`,
  );
}

/** Silver ₦100: a scalloped rosette medallion with an Arewa-knot style emblem. */
function rosette() {
  const m = MATERIALS.silver;
  const lobes = 16;
  let d = '';
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2;
    const a1 = ((i + 1) / lobes) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p = (a, r) => `${(64 + r * Math.cos(a)).toFixed(1)},${(58 + r * Math.sin(a)).toFixed(1)}`;
    d += `${i === 0 ? 'M' + p(a0, 44) : ''} Q${p(am, 54)} ${p(a1, 44)}`;
  }
  const knot = [
    [-8, 0],
    [8, 0],
    [0, -8],
    [0, 8],
  ]
    .map(([dx, dy]) => `<circle cx="${64 + dx}" cy="${58 + dy}" r="9" fill="none" stroke="${m.line}" stroke-width="3"/>`)
    .join('');
  return svg(
    m,
    `${shadow(38)}
  <path d="${d}Z" fill="url(#body)" ${ol(m)}/>
  <circle cx="64" cy="58" r="34" fill="url(#face)" stroke="${m.dark}" stroke-width="2"/>
  <circle cx="64" cy="58" r="29" fill="none" stroke="${m.dark}" stroke-width="1.5" stroke-dasharray="2 3" opacity=".7"/>
  ${knot}
  <circle cx="64" cy="58" r="4" fill="${m.line}"/>
  ${shine('M40,40 A30,30 0 0 1 62,28', 4, 0.85)}
  ${tag('₦100', m)}`,
  );
}

/** Silver ₦200: a stamped silver ingot. */
function ingot() {
  const m = MATERIALS.silver;
  return svg(
    m,
    `${shadow(46)}
  <path d="M14,96 L26,60 L102,60 L114,96 Z" fill="url(#bodyV)" ${ol(m)}/>
  <path d="M26,60 L38,36 L90,36 L102,60 Z" fill="url(#face)" ${ol(m)}/>
  <path d="M48,42 L80,42 L86,54 L42,54 Z" fill="none" stroke="${m.dark}" stroke-width="2" opacity=".7"/>
  <path d="${star(64, 48, 4, 6, 2.4)}" fill="${m.dark}" opacity=".8"/>
  <path d="M32,72 L96,72 M28,84 L100,84" stroke="${m.dark}" stroke-width="2" opacity=".35"/>
  ${shine('M34,40 L52,40', 4, 0.9)}${shine('M22,90 L30,66', 3, 0.6)}
  ${tag('₦200', m)}`,
  );
}

/** Gold ₦500: a royal crown with gemstones. */
function crown() {
  const m = MATERIALS.gold;
  const body = 'M18,90 L22,42 L42,62 L52,24 L64,52 L76,24 L86,62 L106,42 L110,90 Z';
  return svg(
    m,
    `${shadow(44)}
  <path d="${body}" fill="url(#body)" ${ol(m)}/>
  <rect x="16" y="80" width="96" height="18" rx="6" fill="url(#bodyV)" ${ol(m)}/>
  <g fill="${m.line}">${[22, 52, 76, 106].map((x, i) => `<circle cx="${x}" cy="${i === 0 || i === 3 ? 40 : 22}" r="6"/>`).join('')}</g>
  <g fill="${m.hi}">${[22, 52, 76, 106].map((x, i) => `<circle cx="${x}" cy="${i === 0 || i === 3 ? 40 : 22}" r="3.6"/>`).join('')}</g>
  <circle cx="64" cy="89" r="6" fill="#E5484D" stroke="${m.line}" stroke-width="2"/>
  <circle cx="40" cy="89" r="4.5" fill="#22B573" stroke="${m.line}" stroke-width="2"/>
  <circle cx="88" cy="89" r="4.5" fill="#22B573" stroke="${m.line}" stroke-width="2"/>
  <path d="M30,74 L98,74" stroke="${m.dark}" stroke-width="2" opacity=".45"/>
  ${shine('M28,52 L30,78', 3.5, 0.75)}${shine('M24,84 L46,84', 3, 0.8)}
  ${tag('₦500', m)}`,
  );
}

/** Gold ₦1,000: a treasure chest. */
function chest() {
  const m = MATERIALS.gold;
  return svg(
    m,
    `${shadow(48)}
  <path d="M18,58 L110,58 L110,100 Q110,104 106,104 L22,104 Q18,104 18,100 Z" fill="url(#bodyV)" ${ol(m)}/>
  <path d="M18,58 C18,30 40,22 64,22 C88,22 110,30 110,58 Z" fill="url(#face)" ${ol(m)}/>
  <path d="M34,26 L34,104 M94,26 L94,104" stroke="${m.dark}" stroke-width="7" opacity=".55"/>
  <path d="M18,58 L110,58" stroke="${m.line}" stroke-width="${LINE}"/>
  <rect x="54" y="50" width="20" height="24" rx="4" fill="${m.line}"/>
  <rect x="57" y="53" width="14" height="18" rx="3" fill="url(#body)"/>
  <circle cx="64" cy="60" r="2.4" fill="${m.line}"/><path d="M64,61 L64,67" stroke="${m.line}" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="64" cy="38" r="5" fill="#E5484D" stroke="${m.line}" stroke-width="2"/>
  ${shine('M28,48 C30,36 40,30 52,28', 4, 0.8)}
  ${tag('₦1,000', m)}`,
  );
}

/** Wild: a rainbow star. */
function wildStar() {
  const m = MATERIALS.wild;
  return svg(
    m,
    `<defs><linearGradient id="rain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5C7A"/><stop offset=".3" stop-color="#FFB020"/><stop offset=".55" stop-color="#2FD27A"/><stop offset=".8" stop-color="#3B8BFF"/><stop offset="1" stop-color="#A55CFF"/></linearGradient></defs>
  ${shadow(36)}
  <path d="${star(64, 56, 5, 50, 22)}" fill="url(#rain)" ${ol(m)}/>
  <path d="${star(64, 58, 5, 26, 11)}" fill="#fff" opacity=".9"/>
  ${shine('M44,30 L54,22', 4, 0.9)}
  <path d="${star(100, 20, 4, 9, 2.5, 0)}" fill="#fff"/><path d="${star(22, 86, 4, 6, 2, 0)}" fill="#fff" opacity=".9"/>
  ${tag('WILD', m)}`,
  );
}

/** Emerald: a faceted emerald-cut gem in a gold setting. */
function emerald() {
  const m = MATERIALS.emerald;
  const g = MATERIALS.gold;
  const outer = '40,16 88,16 108,36 108,84 88,104 40,104 20,84 20,36';
  const inner = '48,32 80,32 92,44 92,76 80,88 48,88 36,76 36,44';
  return svg(
    m,
    `<defs><radialGradient id="glow"><stop offset=".4" stop-color="#3DFFA6" stop-opacity=".5"/><stop offset="1" stop-color="#3DFFA6" stop-opacity="0"/></radialGradient></defs>
  <circle cx="64" cy="60" r="62" fill="url(#glow)"/>
  ${shadow(40)}
  <g fill="${g.mid}" stroke="${g.line}" stroke-width="2"><rect x="30" y="12" width="12" height="10" rx="3"/><rect x="86" y="12" width="12" height="10" rx="3"/><rect x="30" y="98" width="12" height="10" rx="3"/><rect x="86" y="98" width="12" height="10" rx="3"/></g>
  <polygon points="${outer}" fill="url(#body)" ${ol(m)}/>
  <polygon points="${inner}" fill="url(#face)" stroke="${m.dark}" stroke-width="2"/>
  <path d="M40,16 L48,32 M88,16 L80,32 M108,36 L92,44 M108,84 L92,76 M88,104 L80,88 M40,104 L48,88 M20,84 L36,76 M20,36 L36,44" stroke="${m.dark}" stroke-width="2" opacity=".7"/>
  <polygon points="48,32 64,32 52,52 36,44" fill="#fff" opacity=".35"/>
  ${shine('M46,22 L70,22', 4, 0.8)}
  ${tag('₦2,000', m)}`,
  );
}

/** Platinum: a prismatic crystal cluster. */
function crystal() {
  const m = MATERIALS.platinum;
  return svg(
    m,
    `<defs><linearGradient id="prism" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#E6DBFF"/><stop offset=".65" stop-color="#C9F1FF"/><stop offset="1" stop-color="#9AA6D6"/></linearGradient></defs>
  ${shadow(40)}
  <path d="M30,104 L20,66 L32,48 L44,66 L42,104 Z" fill="url(#body)" ${ol(m)}/>
  <path d="M86,104 L84,62 L98,44 L110,64 L100,104 Z" fill="url(#body)" ${ol(m)}/>
  <path d="M64,6 L90,36 L82,106 L46,106 L38,36 Z" fill="url(#prism)" ${ol(m)}/>
  <path d="M64,6 L64,106 M38,36 L64,52 L90,36 M46,106 L64,52 L82,106" fill="none" stroke="${m.dark}" stroke-width="1.8" opacity=".55"/>
  <path d="M64,6 L38,36 L64,52 Z" fill="#fff" opacity=".6"/>
  <path d="${star(104, 22, 4, 10, 2.5, 0)}" fill="#fff"/><path d="${star(22, 36, 4, 7, 2, 0)}" fill="#E6DBFF"/>
  ${tag('₦5,000', m)}`,
  );
}

// ---- Emblems for cards, charms and upgrades -----------------------------------------

const neutral = MATERIALS.gold;

function magnet() {
  const s = MATERIALS.silver;
  return svg(
    neutral,
    `${shadow(34)}
  <path d="M30,24 L30,66 A34,34 0 0 0 98,66 L98,24 L78,24 L78,66 A14,14 0 0 1 50,66 L50,24 Z" fill="#E5484D" stroke="#3A0B0D" stroke-width="${LINE}" stroke-linejoin="round"/>
  <rect x="30" y="14" width="20" height="16" rx="3" fill="${s.light}" stroke="${s.line}" stroke-width="${LINE}"/>
  <rect x="78" y="14" width="20" height="16" rx="3" fill="${s.light}" stroke="${s.line}" stroke-width="${LINE}"/>
  ${shine('M36,40 L36,66', 4, 0.6)}
  <path d="M14,18 L22,22 M10,32 L20,32 M108,18 L116,14 M108,32 L118,32" stroke="${neutral.mid}" stroke-width="3" stroke-linecap="round"/>`,
  );
}

function flame() {
  return svg(
    neutral,
    `<defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E5341A"/><stop offset=".6" stop-color="#FF8A1F"/><stop offset="1" stop-color="#FFD23F"/></linearGradient></defs>
  ${shadow(30)}
  <path d="M64,8 C72,30 98,40 98,74 C98,98 82,112 64,112 C46,112 30,98 30,76 C30,58 42,48 46,34 C52,46 54,54 60,58 C62,40 58,24 64,8Z" fill="url(#fl)" stroke="#4A0D02" stroke-width="${LINE}" stroke-linejoin="round"/>
  <path d="M64,58 C70,72 82,78 80,92 C78,102 72,106 64,106 C56,106 48,100 48,90 C48,80 56,74 64,58Z" fill="#FFE27A"/>
  ${shine('M44,64 C42,72 42,80 46,88', 3.5, 0.5)}`,
  );
}

function clover() {
  const leaf = (rot) =>
    `<path d="M64,58 C50,52 36,40 44,28 C50,20 60,24 64,34 C68,24 78,20 84,28 C92,40 78,52 64,58Z" transform="rotate(${rot} 64 58)" fill="#2DBE6C" stroke="#073B1E" stroke-width="${LINE}" stroke-linejoin="round"/>`;
  return svg(
    neutral,
    `${shadow(30)}
  <path d="M64,58 C66,80 74,96 86,108" fill="none" stroke="#3B2302" stroke-width="7" stroke-linecap="round"/>
  <path d="M64,58 C66,80 74,96 86,108" fill="none" stroke="${neutral.mid}" stroke-width="3.5" stroke-linecap="round"/>
  ${leaf(0)}${leaf(90)}${leaf(180)}${leaf(270)}
  <circle cx="64" cy="58" r="5" fill="${neutral.light}" stroke="#3B2302" stroke-width="2"/>
  ${shine('M46,32 L52,28', 3, 0.7)}`,
  );
}

function lens() {
  const m = neutral;
  return svg(
    m,
    `${shadow(34)}
  <path d="M78,78 L108,108" stroke="${m.line}" stroke-width="16" stroke-linecap="round"/>
  <path d="M78,78 L108,108" stroke="url(#body)" stroke-width="10" stroke-linecap="round"/>
  <circle cx="54" cy="54" r="38" fill="url(#body)" ${ol(m)}/>
  <circle cx="54" cy="54" r="28" fill="#CDEBFF" stroke="${m.dark}" stroke-width="2"/>
  <g fill="${m.line}" opacity=".55"><rect x="40" y="40" width="8" height="8" rx="2"/><rect x="50" y="50" width="8" height="8" rx="2"/><rect x="60" y="60" width="8" height="8" rx="2"/></g>
  ${shine('M36,40 A22,22 0 0 1 50,30', 4, 0.9)}`,
  );
}

function bolt() {
  const m = neutral;
  return svg(
    m,
    `${shadow(30)}
  <path d="M74,6 L30,70 L58,70 L48,118 L98,48 L68,48 Z" fill="url(#body)" ${ol(m)}/>
  ${shine('M66,16 L42,58', 4, 0.8)}`,
  );
}

function vault() {
  const m = MATERIALS.silver;
  return svg(
    m,
    `${shadow(44)}
  <rect x="16" y="18" width="96" height="88" rx="12" fill="url(#bodyV)" ${ol(m)}/>
  <rect x="26" y="28" width="76" height="68" rx="8" fill="url(#face)" stroke="${m.dark}" stroke-width="2"/>
  <circle cx="64" cy="62" r="20" fill="${MATERIALS.gold.mid}" stroke="${m.line}" stroke-width="${LINE}"/>
  <circle cx="64" cy="62" r="7" fill="${m.line}"/>
  <path d="M64,42 L64,50 M64,74 L64,82 M44,62 L52,62 M76,62 L84,62" stroke="${m.line}" stroke-width="3" stroke-linecap="round"/>
  <rect x="20" y="40" width="8" height="14" rx="2" fill="${m.dark}"/><rect x="20" y="70" width="8" height="14" rx="2" fill="${m.dark}"/>
  ${shine('M30,32 L58,32', 4, 0.8)}`,
  );
}

const ASSETS = {
  b10: coinStack,
  b20: cowrie,
  b50: shield,
  s100: rosette,
  s200: ingot,
  g500: crown,
  g1000: chest,
  wild: wildStar,
  emerald,
  platinum: crystal,
  'emblem-magnet': magnet,
  'emblem-flame': flame,
  'emblem-clover': clover,
  'emblem-lens': lens,
  'emblem-bolt': bolt,
  'emblem-vault': vault,
};

mkdirSync(OUT, { recursive: true });
for (const [name, draw] of Object.entries(ASSETS)) {
  const file = join(OUT, `${name}.svg`);
  writeFileSync(file, draw().replace(/\n\s*/g, '\n'));
  console.log('wrote', file);
}
