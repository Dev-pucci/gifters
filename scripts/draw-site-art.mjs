// Original, code-drawn vector artwork for the storefront. Run with:
// node scripts/draw-site-art.mjs
// These are intentionally illustrated assets, so they remain sharp at every size
// without external image services, stock-photo dependencies, or generated blobs.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { categories, products } from "../src/data/catalog.ts";

const root = new URL("../public/images/", import.meta.url);
mkdirSync(root, { recursive: true });
const colors = [
  ["#f7eee1", "#dfbda0", "#31584b", "#bf5946"], ["#f3eadf", "#d8c2ad", "#274c41", "#d2a65b"],
  ["#f8eee9", "#e3b8aa", "#526c65", "#c3705f"], ["#eef2ef", "#bfd0c7", "#36584d", "#d4a95d"],
  ["#f6efe3", "#ddc69f", "#4d6357", "#a94e43"], ["#f0eaf1", "#ceb9d4", "#495f78", "#d2a65b"],
];

const productsArt = {
  "family-name-stocking": ["stocking", "AMARA"], "photo-color-mug": ["mug", "BEST DAD"],
  "home-sweet-home-pillow": ["pillow", "THE OKAFORS"], "crystal-photo-block": ["crystal", "FOREVER"],
  "initial-gift-sack": ["sack", "K"], "family-wreath-ornament": ["ornament", "THE OKAFORS · 2026"],
  "stoneware-collection": ["stoneware", "MADE WITH LOVE"], "embroidered-initial-cap": ["cap", "J"],
  "photo-teddy-tee": ["teddy", "LOVE YOU, ZARA"], "hooray-wine-glass": ["wineglass", "HOORAY!"],
  "photo-slate-plaque": ["slate", "HOME IS TOGETHER"], "name-beverage-tub": ["tub", "THE KAMAUS"],
  "snuggle-rag-doll": ["doll", "ZARA"], "name-night-light": ["nightlight", "LIAM"],
  "scripted-baby-blanket": ["babyblanket", "AMARA"], "wine-barrel-tray": ["tray", "AMARA & KOFI"],
  "toasting-flutes": ["flutes", "AMARA  ·  KOFI"], "wedding-photo-blanket": ["weddingblanket", "AMARA & KOFI"],
  "cherished-wood-block": ["woodblock", "OUR FAVORITE DAY"], "slate-coaster-set": ["coasters", "M"],
  "birthstone-necklace": ["necklace", "MAYA"], "custom-golf-balls": ["golf", "JK"],
  "cozy-name-throw": ["throw", "SOFIA"], "plush-robe": ["robe", "A"],
};

const categoriesArt = {
  "for-him": ["cap", "mug", "golf"], "for-her": ["necklace", "robe", "wineglass"],
  baby: ["babyblanket", "nightlight", "teddy"], kids: ["doll", "sack", "teddy"],
  home: ["pillow", "stoneware", "slate"], photo: ["mug", "crystal", "woodblock"],
  drinkware: ["mug", "wineglass", "flutes"], christmas: ["stocking", "ornament", "sack"],
  wedding: ["flutes", "tray", "crystal"], "under-25": ["ornament", "coasters", "mug"],
};

function object(kind, label = "") {
  const ink = "#52675c", cream = "#fffaf1", gold = "#c89c55", red = "#b84f43", green = "#31584b";
  const safeLabel = String(label).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const text = (y = 76, size = 17, fill = ink) => `<text x="0" y="${y}" text-anchor="middle" fill="${fill}" font-family="Georgia,serif" font-size="${size}" letter-spacing="1.5">${safeLabel}</text>`;
  const line = `<path d="M-80 130h160" stroke="#9a795b" stroke-width="3" stroke-linecap="round" opacity=".4"/>`;
  const drawings = {
    mug: `<path d="M-72-78h126v153q0 22-22 22h-82q-22 0-22-22z" fill="${cream}" stroke="${ink}" stroke-width="6"/><path d="M54-48h20q47 0 47 48t-47 48H54" fill="none" stroke="${ink}" stroke-width="11"/><path d="M-54-53h90v19h-90z" fill="#e7d5bd"/>${text(24, 15)}${line}`,
    stocking: `<path d="M-52-102h104v86l69 57q20 17 2 38-32 39-88 28-46-10-86-43l53-53v-113z" fill="${red}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/><path d="M-60-110h120v45H-60z" rx="8" fill="${cream}" stroke="${ink}" stroke-width="5"/><path d="M-36-97v20m25-20v20m25-20v20" stroke="#d5c5b0" stroke-width="3"/>${text(-82, 12, green)}${line}`,
    pillow: `<rect x="-115" y="-88" width="230" height="180" rx="32" fill="${green}" stroke="${ink}" stroke-width="6"/><rect x="-96" y="-70" width="192" height="144" rx="25" fill="none" stroke="#e6d4b5" stroke-width="3" stroke-dasharray="3 8"/><path d="M-36 11q36-56 72 0" fill="none" stroke="#e6d4b5" stroke-width="4"/>${text(35, 12, cream)}${line}`,
    crystal: `<path d="M-98-75 0-122 98-75 81 89 0 111-81 89z" fill="#e5f0ec" fill-opacity=".75" stroke="#708c86" stroke-width="5"/><path d="M-98-75 0-49 98-75M0-49V111M-81 89 0-49 81 89" fill="none" stroke="#fff" stroke-width="4" opacity=".9"/><circle cx="0" cy="-7" r="36" fill="#c9dbd6" opacity=".65"/>${text(65, 12)}${line}`,
    sack: `<path d="M-76-72q76 34 152 0l-12 179q-64 37-128 0z" fill="#d7bd95" stroke="#886f51" stroke-width="6"/><path d="M-79-76q79 31 158 0l-9-31q-70 24-140 0z" fill="#ac875f"/><path d="M-42-24v70m0-70h84v70h-84" fill="none" stroke="${red}" stroke-width="9" stroke-linecap="round"/>${text(83, 20, green)}${line}`,
    ornament: `<path d="M0-127v33" stroke="${gold}" stroke-width="6"/><path d="M-17-99h34v22h-34z" rx="5" fill="${gold}"/><circle r="91" cy="3" fill="#d7eee1" stroke="${green}" stroke-width="7"/><circle r="69" cy="3" fill="none" stroke="#fff8e8" stroke-width="8" stroke-dasharray="7 10"/><path d="M-49-23q49-52 98 0M-45 32q45 43 90 0" fill="none" stroke="${red}" stroke-width="8" stroke-linecap="round"/>${text(13, 12, green)}${line}`,
    stoneware: `<ellipse cx="-43" cy="26" rx="82" ry="57" fill="#e9dfca" stroke="#8c7961" stroke-width="5"/><path d="M-121 25q78 38 156 0M-115 37q71 35 143 0" fill="none" stroke="#b5a58b" stroke-width="3"/><ellipse cx="54" cy="-34" rx="55" ry="37" fill="#f3ead7" stroke="#8c7961" stroke-width="5"/><path d="M3-34q51 27 102 0" fill="none" stroke="#b5a58b" stroke-width="3"/>${text(111, 12)}${line}`,
    cap: `<path d="M-93 30q5-100 92-100 85 0 94 100z" fill="#304b62" stroke="#263d4e" stroke-width="6"/><path d="M-91 25q75 5 177 12-15 38-95 34-60-3-82-22z" fill="#728b9a" stroke="#263d4e" stroke-width="5"/><text x="0" y="-4" text-anchor="middle" fill="#fff" font-family="Georgia,serif" font-size="48">${safeLabel}</text>${line}`,
    teddy: `<circle cx="-62" cy="-60" r="34" fill="#b9825d" stroke="#795b48" stroke-width="5"/><circle cx="62" cy="-60" r="34" fill="#b9825d" stroke="#795b48" stroke-width="5"/><ellipse cy="7" rx="94" ry="112" fill="#c99570" stroke="#795b48" stroke-width="6"/><ellipse cy="-11" rx="61" ry="54" fill="#efd9bc"/><circle cx="-25" cy="-20" r="6" fill="#3e352f"/><circle cx="25" cy="-20" r="6" fill="#3e352f"/><ellipse cy="4" rx="12" ry="9" fill="#65463c"/><path d="M-48 48h96v45h-96z" fill="#fff" stroke="#cad4cc" stroke-width="4"/>${text(76, 9)}${line}`,
    wineglass: `<path d="M-61-106h122q0 81-61 103-61-22-61-103z" fill="#f1d9d0" fill-opacity=".65" stroke="#73877f" stroke-width="5"/><path d="M-52-30q52 20 104 0M0-2v114m-47 0h94" fill="none" stroke="#73877f" stroke-width="6" stroke-linecap="round"/>${text(-57, 13, red)}${line}`,
    slate: `<path d="M-102-94 69-106 106 64 34 101-99 75z" fill="#56645f" stroke="#34443e" stroke-width="7"/><path d="m-74-69 121-8 25 117-95 25-75-20z" fill="none" stroke="#adb5a7" stroke-width="3"/>${text(8, 11, cream)}<circle cx="62" cy="-63" r="7" fill="#c89d63"/>${line}`,
    tub: `<path d="M-122-63h244l-19 172q-103 41-206 0z" fill="#bdc6bd" stroke="#65736c" stroke-width="6"/><ellipse cy="-63" rx="122" ry="31" fill="#d8ddd6" stroke="#65736c" stroke-width="6"/><ellipse cy="-64" rx="96" ry="17" fill="#9bb6aa"/><path d="M-103-30h206" stroke="#fff" stroke-width="5" opacity=".6"/>${text(18, 12, green)}${line}`,
    doll: `<circle cy="-68" r="52" fill="#e8c4a1" stroke="#876d59" stroke-width="5"/><path d="M-48-94q48-58 96 0v25q-48-23-96 0z" fill="#61483a"/><circle cx="-17" cy="-65" r="4"/><circle cx="17" cy="-65" r="4"/><path d="M-73 10q73-45 146 0l28 95q-101 30-202 0z" fill="${red}" stroke="#876d59" stroke-width="5"/><path d="M-74 26h148m-135 25h122" stroke="#f4e2c9" stroke-width="8" stroke-dasharray="14 8"/>${text(77, 11, cream)}${line}`,
    nightlight: `<path d="M-67 20h134v73h-134z" rx="12" fill="#d9c7a5" stroke="#806d55" stroke-width="5"/><path d="M-85-27q85-94 170 0v47h-170z" fill="#f7e9bf" stroke="#a78f66" stroke-width="5"/><path d="M-57-8q57-53 114 0" fill="none" stroke="#fff" stroke-width="8" opacity=".9"/>${text(67, 12, green)}${line}`,
    babyblanket: `<path d="M-114-92q113-25 228 0v173q-113 25-228 0z" fill="#e9bfc0" stroke="#a87e7d" stroke-width="5"/><path d="M-92-70q92-18 184 0v132q-92 18-184 0z" fill="none" stroke="#fff3e9" stroke-width="4" stroke-dasharray="3 8"/><path d="M-88 93v14m34-14v14m34-14v14m34-14v14m34-14v14" stroke="#e9bfc0" stroke-width="6"/>${text(14, 18, "#fffaf1")}${line}`,
    tray: `<rect x="-137" y="-68" width="274" height="152" rx="39" fill="#98714f" stroke="#604936" stroke-width="9"/><rect x="-107" y="-44" width="214" height="103" rx="25" fill="#c49a6c" stroke="#e4c99d" stroke-width="4"/><circle cx="-114" cy="7" r="12" fill="#dfc29a"/><circle cx="114" cy="7" r="12" fill="#dfc29a"/>${text(18, 12, cream)}${line}`,
    flutes: `<path d="M-89-109h63q0 66-31 84-32-18-32-84zM26-109h63q0 66-32 84-31-18-31-84z" fill="#f2e6d2" fill-opacity=".45" stroke="#74877e" stroke-width="4"/><path d="M-57-25v111m-32 0h64M58-25v111m-32 0h64" fill="none" stroke="#74877e" stroke-width="5" stroke-linecap="round"/><path d="M-80-62q23 8 46 0m75 0q23 8 46 0" stroke="${gold}" stroke-width="4"/>${text(117, 11)}${line}`,
    weddingblanket: `<path d="M-120-96q120-22 240 0v184q-120 22-240 0z" fill="#f1e8dc" stroke="#b8a894" stroke-width="5"/><path d="M-98-74q98-16 196 0v143q-98 18-196 0z" fill="#c9d8d0"/><path d="M-60 25q60-71 120 0" fill="none" stroke="#fff" stroke-width="5"/><circle cx="-24" cy="-6" r="15" fill="#6d584e"/><circle cx="24" cy="-6" r="15" fill="#9d765d"/>${text(61, 10)}${line}`,
    woodblock: `<path d="M-105-91q105-16 210 0v178q-105 16-210 0z" fill="#c99b63" stroke="#805d3d" stroke-width="6"/><path d="M-80-66q80-12 160 0v128q-80 12-160 0z" fill="#e7c38c" stroke="#a87c4f" stroke-width="3"/><path d="M-54 20q54-70 108 0" fill="none" stroke="#789086" stroke-width="5"/>${text(53, 10, "#5f5143")}${line}`,
    coasters: `<rect x="-91" y="-103" width="130" height="130" rx="12" transform="rotate(-12)" fill="#586760" stroke="#34443e" stroke-width="5"/><rect x="-38" y="-58" width="130" height="130" rx="12" transform="rotate(10)" fill="#68786f" stroke="#34443e" stroke-width="5"/><text x="25" y="22" fill="#f7edda" text-anchor="middle" font-family="Georgia,serif" font-size="62">${safeLabel}</text>${line}`,
    necklace: `<path d="M-88-94q88 163 176 0" fill="none" stroke="#b5a06e" stroke-width="7"/><path d="M0 37v34" stroke="#b5a06e" stroke-width="5"/><rect x="-21" y="61" width="42" height="61" rx="8" fill="#d8c597" stroke="#9c8658" stroke-width="4"/><circle cx="-37" cy="-12" r="13" fill="#9bb8a9" stroke="#e7d9b7" stroke-width="4"/><circle cx="0" cy="-2" r="14" fill="#c78983" stroke="#e7d9b7" stroke-width="4"/><circle cx="37" cy="-12" r="13" fill="#8ea5c1" stroke="#e7d9b7" stroke-width="4"/>${text(109, 11)}${line}`,
    golf: `<circle cx="-49" cy="-11" r="67" fill="#fffdf7" stroke="#b8b8ad" stroke-width="5"/><circle cx="55" cy="22" r="67" fill="#f8f6ee" stroke="#b8b8ad" stroke-width="5"/><g fill="#d4d5cc">${[-30,-5,20].map(x=>[-37,-12,13].map(y=>`<circle cx="${x}" cy="${y}" r="3"/>`).join("")).join("")}</g><text x="-49" y="2" fill="${green}" text-anchor="middle" font-family="Georgia,serif" font-size="25">${safeLabel}</text>${line}`,
    throw: `<path d="M-119-90q119-19 238 0v180q-119 19-238 0z" fill="#e7c4c4" stroke="#a27d7d" stroke-width="5"/><path d="M-92-65q92-14 184 0v130q-92 14-184 0z" fill="none" stroke="#faeee5" stroke-width="4" stroke-dasharray="5 7"/>${text(18, 25, cream)}${line}`,
    robe: `<path d="M-62-111 0-75 62-111l64 56-45 49v105h-162V-6l-45-49z" fill="#f0ece0" stroke="#a59d8d" stroke-width="5" stroke-linejoin="round"/><path d="M-62-111 0-36l62-75M0-36v136m-75-54h150" fill="none" stroke="#d2c8b4" stroke-width="5"/><text x="-48" y="-11" fill="${gold}" text-anchor="middle" font-family="Georgia,serif" font-size="39">${label}</text>${line}`,
  };
  return `<g>${drawings[kind] ?? drawings.ornament}</g>`;
}

function background(index) {
  const [a, b, c] = colors[index % colors.length];
  return `<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><linearGradient id="shelf" x2="0" y2="1"><stop stop-color="#e9d7bd"/><stop offset="1" stop-color="#c9a985"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/><path d="M115 556V393q0-244 397-244t397 244v163z" fill="${c}" opacity=".10"/><circle cx="150" cy="198" r="16" fill="#fff" opacity=".48"/><circle cx="846" cy="294" r="10" fill="#fff" opacity=".6"/><path d="M0 802q512-32 1024 0v222H0z" fill="url(#shelf)"/><path d="M0 805q512-32 1024 0" fill="none" stroke="#b99975" stroke-width="7" opacity=".45"/>`;
}

function productSvg(slug, index) {
  const [kind, label] = productsArt[slug];
  const decoration = `<circle cx="169" cy="646" r="7" fill="#fff" opacity=".55"/><circle cx="857" cy="574" r="11" fill="#fff" opacity=".55"/><path d="M197 355l8 19 19 8-19 8-8 19-8-19-19-8 19-8zM828 434l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#fff" opacity=".68"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">${background(index)}${decoration}<ellipse cx="512" cy="790" rx="233" ry="26" fill="#705d4d" opacity=".16"/><g transform="translate(512 557) scale(1.55)">${object(kind, label)}</g></svg>`;
}

function categorySvg(slug, index) {
  const kinds = categoriesArt[slug];
  const positions = [[332, 526, .92], [682, 495, 1.05], [512, 690, .78]];
  const objects = kinds.map((kind, i) => `<ellipse cx="${positions[i][0]}" cy="${positions[i][1]+119}" rx="140" ry="20" fill="#705d4d" opacity=".13"/><g transform="translate(${positions[i][0]} ${positions[i][1]}) scale(${positions[i][2]})">${object(kind, "")}</g>`).join("");
  const title = categories.find((c) => c.slug === slug)?.name ?? "Thoughtful Gifts";
  const safeTitle = title.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">${background(index)}<rect x="106" y="102" width="812" height="668" rx="400" fill="#fff" opacity=".08"/>${objects}<text x="512" y="923" text-anchor="middle" fill="#43584d" font-family="Georgia,serif" font-size="27" letter-spacing="2">${safeTitle.toUpperCase()}</text></svg>`;
}

function heroSvg() {
  const greens = ["#173b2c", "#204b35", "#2c5d3e", "#376c46", "#527b4d"];
  const boughs = Array.from({ length: 7 }, (_, i) => {
    const y = 18 + i * 102;
    const x = 650 - (i % 2) * 70;
    const rise = i % 2 ? -24 : 26;
    return `<path d="M${x} ${y+50} Q1080 ${y+rise} 1600 ${y-32} L1600 ${y+65} Q1110 ${y+73} ${x+72} ${y+104} Q1000 ${y+82} 1600 ${y+112} L1600 ${y+144} Q1110 ${y+129} ${x} ${y+50}Z" fill="${greens[i%greens.length]}"/>`;
  }).join("");
  const needles = Array.from({length:58},(_,i)=>{
    const x=660+(i*157)%900, y=(i*83+24)%700, side=i%2?1:-1;
    return `<path d="M${x} ${y}l${side*(28+(i%4)*7)} ${side*-21}m${-7*side} ${-5*side}l${-14*side} ${-15*side}m${-1*side} ${16*side}l${-19*side} ${-8*side}" fill="none" stroke="${greens[i%greens.length]}" stroke-width="7" stroke-linecap="round" opacity=".88"/>`;
  }).join("");
  const ornaments = [
    [842,185,57,"#c45f4b","THE KAMAUS"],[1088,326,66,"#d4b16d","OKAFORS"],
    [785,472,49,"#d8e8d8","AMARA"],[1265,138,47,"#d8e8d8","2026"],
    [1370,493,63,"#b95042","THE GARCIAS"],[1005,591,42,"#d0a45d","LOVE"],
  ];
  const baubles = ornaments.map(([x,y,r,c,t])=>`<path d="M${x} ${y-r-70}v${70}" stroke="#d5b478" stroke-width="5"/><rect x="${x-10}" y="${y-r-8}" width="20" height="17" rx="4" fill="#d5b478"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#f4e8cc" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r-10}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="${c==="#d8e8d8"?"#315247":"#fff8e8"}" font-family="Georgia,serif" font-size="${r>55?11:10}" letter-spacing=".5">${t}</text>`).join("");
  const lights = Array.from({length:54},(_,i)=>{const x=665+(i*137)%900,y=(i*91+35)%660,r=i%5===0?7:4;return `<circle cx="${x}" cy="${y}" r="${r*3}" fill="#ffe3a2" opacity=".12"/><circle cx="${x}" cy="${y}" r="${r}" fill="#ffe8aa"/>`;}).join("");
  const bokeh = Array.from({length:18},(_,i)=>{const x=25+(i*97)%610,y=42+(i*131)%600,r=12+(i*7)%28;return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff2d1" opacity=".68"/>`;}).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 700" role="img"><defs><linearGradient id="winter" x2="1"><stop stop-color="#f3e7d5"/><stop offset=".39" stop-color="#eee0cb"/><stop offset=".56" stop-color="#9d9f68"/><stop offset=".69" stop-color="#45633b"/><stop offset="1" stop-color="#19392b"/></linearGradient><radialGradient id="warm"><stop stop-color="#fff0c7" stop-opacity=".45"/><stop offset="1" stop-color="#fff0c7" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="700" fill="url(#winter)"/><ellipse cx="340" cy="330" rx="510" ry="450" fill="url(#warm)"/>${bokeh}<path d="M690 0Q1030 50 1600 0v700H660Q915 470 640 352Q925 232 690 0z" fill="#21452e" opacity=".84"/>${boughs}${needles}<path d="M700 0Q1080 80 1600 8M660 238Q1050 300 1600 212M660 445Q1080 510 1600 407M680 635Q1100 700 1600 600" fill="none" stroke="#729052" stroke-width="21" opacity=".56"/>${lights}${baubles}<path d="M0 666q360-34 680 9v25H0z" fill="#fff4df" opacity=".24"/></svg>`;
}

const manifest = {};
mkdirSync(new URL("hero/", root), { recursive: true });
if (existsSync(new URL("hero/holiday-gifts-hd.webp", root))) {
  manifest["hero/christmas"] = "/images/hero/holiday-gifts-hd.webp";
} else if (existsSync(new URL("hero/holiday-gifts.webp", root))) {
  manifest["hero/christmas"] = "/images/hero/holiday-gifts.webp";
} else {
  writeFileSync(new URL("hero/christmas.svg", root), heroSvg());
  manifest["hero/christmas"] = "/images/hero/christmas.svg";
}
for (let i = 0; i < products.length; i++) {
  const p = products[i];
  if (!productsArt[p.slug]) throw new Error(`Missing illustration for ${p.slug}`);
  const path = `products/${p.slug}.svg`;
  mkdirSync(new URL("products/", root), { recursive: true });
  writeFileSync(new URL(path, root), productSvg(p.slug, i));
  manifest[`products/${p.slug}`] = `/images/${path}`;
}
for (let i = 0; i < categories.length; i++) {
  const c = categories[i];
  if (!categoriesArt[c.slug]) throw new Error(`Missing illustration for category ${c.slug}`);
  const path = `categories/${c.slug}.svg`;
  mkdirSync(new URL("categories/", root), { recursive: true });
  writeFileSync(new URL(path, root), categorySvg(c.slug, i + products.length));
  manifest[`categories/${c.slug}`] = `/images/${path}`;
}
writeFileSync(new URL("../../src/data/images.json", root), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Drew ${Object.keys(manifest).length} original SVG illustrations.`);
