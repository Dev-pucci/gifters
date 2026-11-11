// Shot list for every image slot on the site, with one shared art direction so the set looks
// like a single photo shoot. Used by scripts/generate-images.mjs.
import { categories, products } from "../src/data/catalog.ts";

const STYLE =
  "Photorealistic e-commerce product photograph for a premium personalized-gifts shop. " +
  "Bright, airy, soft natural window light from the left, gentle shadows, warm cream, linen and light-oak tones " +
  "with sage-green and kraft-paper accents (eucalyptus sprigs, kraft gift wrap, sage ribbon), shallow depth of field, " +
  "crisp focus on the product, styled with a few tasteful props. " +
  "No people, no hands, no faces, no logos, no brand names, no watermarks, no extra text. " +
  "Any personalization text must be spelled exactly as given and look printed, engraved or embroidered on the item.";

/** Per-product scene direction. `text` is the sample personalization rendered on the item. */
const PRODUCT_SCENES = {
  "family-name-stocking": { text: "Amara", scene: "a chunky red cable-knit Christmas stocking with a cream cuff embroidered in gold thread with the name, hanging from a mantel with pine garland and warm fairy lights" },
  "photo-color-mug": { text: "Best Dad", scene: "a glossy white ceramic 11 oz mug with a black handle, printed with a warm family-beach photo and the words below it, on a wooden table with coffee beans and a folded napkin" },
  "home-sweet-home-pillow": { text: "The Okafors", scene: "a square throw pillow in deep green with a cross-stitch style 'Home for the Holidays' motif and the family name, on a cream sofa with a knit blanket" },
  "crystal-photo-block": { text: "Forever", scene: "a beveled optical-glass photo block with a laser-etched couple-on-a-beach photo inside and the word engraved below, catching sunlight with rainbow refractions, on a white shelf" },
  "initial-gift-sack": { text: "K", scene: "an oversized natural-canvas drawstring gift sack with a festive red-and-green plaid initial letter, filled with wrapped presents, under a Christmas tree" },
  "family-wreath-ornament": { text: "The Okafors 2026", scene: "a clear acrylic wreath-shaped Christmas ornament with printed holly, the family name and year, hanging on a red ribbon from a lit Christmas tree branch" },
  "stoneware-collection": { text: "Made with love by Mama", scene: "a hand-glazed cream stoneware serving bowl and platter stamped with the words in a handwritten style, on a rustic kitchen counter with fresh herbs" },
  "embroidered-initial-cap": { text: "J", scene: "a navy washed-cotton baseball cap with a single white embroidered serif initial on the front, on a wooden bench with sunglasses" },
  "photo-teddy-tee": { text: "Love you, Zara", scene: "a soft tan plush teddy bear wearing a small white t-shirt printed with a sunny family-picnic photo and the words, sitting on a nursery shelf" },
  "hooray-wine-glass": { text: "Hooray for Wanjiru", scene: "a stemless wine glass sand-etched with confetti shapes and the words, half filled with rosé, on a marble table with balloons softly blurred behind" },
  "photo-slate-plaque": { text: "Home is wherever we're together", scene: "a natural rough-edged slate tile printed with a family-hike photo and the words, on a small wooden easel on a mantel" },
  "name-beverage-tub": { text: "K  The Kamaus", scene: "a galvanized metal party beverage tub filled with ice and glass bottles, stamped with a monogram initial and the family name, on a sunny patio" },
  "snuggle-rag-doll": { text: "Zara", scene: "a cuddly fabric rag doll in red plaid holiday pajamas with the name stitched on the chest, sitting by a wrapped present" },
  "name-night-light": { text: "Liam", scene: "a soft-glow LED night light with the child's name cut in frosted acrylic on a white wooden base, glowing warm in a dim pastel nursery" },
  "scripted-baby-blanket": { text: "Amara", scene: "a plush pink minky baby blanket folded neatly with the name embroidered in flowing white script, with a knitted bunny toy, on a crib mattress" },
  "wine-barrel-tray": { text: "Amara & Kofi 2026", scene: "a reclaimed-oak wine-barrel serving tray engraved with the names and year, holding two wine glasses and grapes, on a farmhouse table" },
  "toasting-flutes": { text: "Amara / Kofi", scene: "a pair of crystal champagne toasting flutes, one etched with each name, with sparkling wine and soft wedding bokeh lights behind" },
  "wedding-photo-blanket": { text: "Amara & Kofi", scene: "a plush fleece throw blanket printed with a romantic wedding photo of a couple seen from behind under an arch and the names, draped over a cream armchair" },
  "cherished-wood-block": { text: "Our favorite day", scene: "a thick maple wood block printed with a family-at-sunset photo and the words, standing on a bookshelf next to a small plant" },
  "slate-coaster-set": { text: "M", scene: "a set of four square slate coasters engraved with a monogram initial, stacked and fanned on a dark wood bar top with a whiskey glass" },
  "birthstone-necklace": { text: "Maya", scene: "a delicate sterling-silver necklace with three small colored birthstones and a tiny engraved bar with the name, laid on a white jewelry box with silk" },
  "custom-golf-balls": { text: "JK", scene: "a set of white golf balls printed with a monogram, in an open gift box next to a golf tee and glove, on green felt" },
  "cozy-name-throw": { text: "Sofia", scene: "a blush-pink sherpa-backed throw blanket with an oversized embroidered name, folded on the end of a bed with a mug of cocoa" },
  "plush-robe": { text: "A", scene: "a white spa-soft plush robe neatly folded with a gold embroidered monogram initial on the chest, with a candle and eucalyptus" },
};

const CATEGORY_SCENES = {
  "for-him": "a curated flat lay of personalized gifts for him: monogrammed leather wallet, engraved whiskey glass, embroidered cap, golf balls, on dark wood",
  "for-her": "a curated flat lay of personalized gifts for her: name necklace, monogrammed robe, etched wine glass, fresh peonies, on cream linen",
  baby: "personalized baby gifts: embroidered name blanket, wooden name puzzle, plush bunny, tiny knit booties, in a soft pastel nursery",
  kids: "personalized kids gifts: name backpack, plush teddy, wooden name blocks, colorful storybook, on a bright playroom rug",
  home: "personalized home décor: family-name pillow, engraved cutting board, slate photo plaque, candle, in a warm living room corner",
  photo: "personalized photo gifts: photo mug, glass photo block, printed wood block, photo blanket, arranged on a sunny table",
  drinkware: "a lineup of personalized drinkware: name mugs, etched wine glass, engraved tumbler, on a wooden kitchen shelf",
  christmas: "personalized Christmas gifts: name stockings on a mantel, family ornaments on a tree, wrapped presents, warm fairy lights",
  wedding: "personalized wedding gifts: engraved champagne flutes, wooden keepsake box, monogrammed tray, white flowers, soft romantic light",
  "under-25": "a cheerful pile of small personalized gifts: name keychain, mug, ornament, coasters, wrapped with ribbon, on a light table",
};

export function shotList() {
  const shots = [];
  shots.push({
    key: "hero/christmas",
    file: "hero/christmas",
    aspect: "wide",
    prompt:
      `${STYLE} Wide website hero banner. A kraft-paper wrapped gift box tied with a wide sage-green satin ribbon and bow, with a cream gift tag ` +
      'hand-lettered "Specially for you", next to a white ceramic mug printed "You are loved" in black script, a lit candle in a glass jar and a ' +
      "white vase of eucalyptus, on a linen-covered table with warm bokeh lights. Everything is grouped in the RIGHT two-thirds of the frame; " +
      "the LEFT third is soft, light cream, out-of-focus background with no objects, leaving clean space for headline text.",
  });
  shots.push({
    key: "banners/personal-touch",
    file: "banners/personal-touch",
    aspect: "wide",
    prompt: `${STYLE} Wide banner photo: a rectangular walnut cutting board laser-engraved with "THE OKAFOR FAMILY" and "EST. 2022" in classic serif capitals, angled on light wood, with eucalyptus and a kraft gift box with a cream ribbon at the edge.`,
  });
  shots.push({
    key: "banners/newsletter",
    file: "banners/newsletter",
    aspect: "wide",
    prompt: `${STYLE} Wide banner photo: a kraft-paper wrapped gift box with a sage-green ribbon bow, seen from slightly above on a cream surface, with eucalyptus sprigs around it. Calm, minimal composition with soft shadows.`,
  });
  for (const p of products) {
    const s = PRODUCT_SCENES[p.slug];
    if (!s) throw new Error(`No scene for ${p.slug}`);
    shots.push({
      key: `products/${p.slug}`,
      file: `products/${p.slug}`,
      aspect: "square",
      prompt: `${STYLE} Square product photo, product centered and filling about 70% of the frame: ${s.scene}. The personalization reads exactly: "${s.text}".`,
    });
  }
  for (const c of categories) {
    const s = CATEGORY_SCENES[c.slug];
    if (!s) throw new Error(`No scene for category ${c.slug}`);
    shots.push({ key: `categories/${c.slug}`, file: `categories/${c.slug}`, aspect: "square", prompt: `${STYLE} Square lifestyle photo, centered composition that still works when cropped to a circle: ${s}.` });
  }
  return shots;
}
