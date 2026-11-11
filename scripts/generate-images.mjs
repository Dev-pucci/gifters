#!/usr/bin/env node
// Generates the site's images with an AI image API and records them in src/data/images.json,
// which the site reads (missing images fall back to the built-in illustrations).
//
//   npm run images -- --dry-run                 list every shot and its prompt, no API calls
//   npm run images -- --provider openai         generate everything that's missing
//   npm run images -- --only products/mug --force   (re)generate matching shots
//
// Providers and the key each reads (from the environment or .env):
//   openai     OPENAI_API_KEY        model OPENAI_IMAGE_MODEL (default gpt-image-1), IMAGE_QUALITY low|medium|high
//   gemini     GEMINI_API_KEY        model GEMINI_IMAGE_MODEL (default gemini-2.5-flash-image)
//   replicate  REPLICATE_API_TOKEN   model REPLICATE_MODEL (default black-forest-labs/flux-1.1-pro)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shotList } from "./image-prompts.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "images");
const MANIFEST = join(ROOT, "src", "data", "images.json");

for (const f of [".env"]) {
  const file = join(ROOT, f);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => {
    if (!a.startsWith("--")) return [];
    const [k, v] = a.slice(2).split("=");
    const next = all[i + 1];
    return [k, v ?? (next && !next.startsWith("--") ? next : true)];
  }).filter((x) => x.length),
);
const provider = args.provider || process.env.IMAGE_PROVIDER || "openai";
const only = args.only ? new RegExp(String(args.only)) : null;
const force = !!args.force;
const dryRun = !!args["dry-run"];
const concurrency = Math.max(1, Number(args.concurrency || 3));

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const saveManifest = () => writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + "\n");

const shots = shotList().filter((s) => !only || only.test(s.key));
const todo = shots.filter((s) => force || !manifest[s.key] || !existsSync(join(ROOT, "public", manifest[s.key])));

if (dryRun) {
  for (const s of shots) console.log(`\n[${todo.includes(s) ? "TODO" : "done"}] ${s.key} (${s.aspect})\n${s.prompt}`);
  console.log(`\n${shots.length} shots, ${todo.length} to generate with provider "${provider}".`);
  process.exit(0);
}

// ---------------------------------------------------------------- providers

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Add it to .env (see .env.example) or run with --provider <openai|gemini|replicate>.`);
    process.exit(1);
  }
  return v;
};

async function jsonOrThrow(res, label) {
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  if (!res.ok) throw new Error(`${label} ${res.status}: ${body.error?.message ?? body.detail ?? body.raw ?? text.slice(0, 300)}`);
  return body;
}

const providers = {
  async openai(shot) {
    const key = need("OPENAI_API_KEY");
    const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt: shot.prompt,
        size: shot.aspect === "wide" ? "1536x1024" : "1024x1024",
        quality: process.env.IMAGE_QUALITY || "medium",
        output_format: "webp",
        n: 1,
      }),
    });
    const body = await jsonOrThrow(res, "OpenAI");
    return { bytes: Buffer.from(body.data[0].b64_json, "base64"), ext: "webp" };
  },

  async gemini(shot) {
    const key = need("GEMINI_API_KEY");
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: shot.prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: shot.aspect === "wide" ? "16:9" : "1:1" } },
      }),
    });
    const body = await jsonOrThrow(res, "Gemini");
    const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part) throw new Error("Gemini returned no image (it may have declined the prompt).");
    const mime = part.inlineData.mimeType || "image/png";
    return { bytes: Buffer.from(part.inlineData.data, "base64"), ext: mime.split("/")[1].replace("jpeg", "jpg") };
  },

  async replicate(shot) {
    const token = need("REPLICATE_API_TOKEN");
    const model = process.env.REPLICATE_MODEL || "black-forest-labs/flux-1.1-pro";
    let res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "wait=60" },
      body: JSON.stringify({ input: { prompt: shot.prompt, aspect_ratio: shot.aspect === "wide" ? "16:9" : "1:1", output_format: "webp", output_quality: 90 } }),
    });
    let body = await jsonOrThrow(res, "Replicate");
    for (let i = 0; i < 60 && !["succeeded", "failed", "canceled"].includes(body.status); i++) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await fetch(body.urls.get, { headers: { Authorization: `Bearer ${token}` } });
      body = await jsonOrThrow(res, "Replicate");
    }
    if (body.status !== "succeeded") throw new Error(`Replicate prediction ${body.status}: ${body.error ?? "timed out"}`);
    const url = Array.isArray(body.output) ? body.output[0] : body.output;
    const img = await fetch(url);
    if (!img.ok) throw new Error(`Couldn't download Replicate output (${img.status})`);
    return { bytes: Buffer.from(await img.arrayBuffer()), ext: "webp" };
  },
};

const generate = providers[provider];
if (!generate) {
  console.error(`Unknown provider "${provider}". Use openai, gemini or replicate.`);
  process.exit(1);
}

// ---------------------------------------------------------------- run

console.log(`Generating ${todo.length} of ${shots.length} images with ${provider}…`);
let done = 0;
const failed = [];
const queue = [...todo];

async function worker() {
  for (let shot = queue.shift(); shot; shot = queue.shift()) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { bytes, ext } = await generate(shot);
        const rel = `images/${shot.file}.${ext}`;
        mkdirSync(dirname(join(ROOT, "public", rel)), { recursive: true });
        writeFileSync(join(ROOT, "public", rel), bytes);
        manifest[shot.key] = `/${rel}`;
        saveManifest();
        console.log(`  ✓ ${shot.key}  (${Math.round(bytes.length / 1024)} KB)  [${++done}/${todo.length}]`);
        break;
      } catch (e) {
        const msg = String(e.message || e);
        const fatal = /\b(401|403)\b|invalid api key|incorrect api key|billing|quota/i.test(msg);
        if (fatal || attempt === 3) {
          console.error(`  ✗ ${shot.key}: ${msg}`);
          failed.push(shot.key);
          if (fatal) {
            queue.length = 0;
            console.error("Stopping: this looks like a key or billing problem.");
          }
          break;
        }
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
console.log(failed.length ? `\nDone with ${failed.length} failures: ${failed.join(", ")}\nRe-run the same command to retry just those.` : "\nAll images generated. Rebuild the site to include them.");
process.exit(failed.length ? 1 : 0);
