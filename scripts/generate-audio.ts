/**
 * Pre-generates ElevenLabs TTS audio for every phrase the app speaks.
 * Outputs MP3s to public/audio/ and writes src/data/audioManifest.json.
 * Skips files that already exist locally (CI uses GitHub Actions cache).
 *
 * Usage:
 *   VITE_ELEVENLABS_API_KEY=sk_... npx tsx scripts/generate-audio.ts
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { LEVELS } from '../src/data/levels.ts';
import { LEVEL_TUTORIALS } from '../src/data/levelTutorials.ts';
import { TIPS, HOME_ROW_KEYS } from '../src/data/tips.ts';
import { sanitizeForSpeech } from '../src/utils/speechUtils.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const OUT_DIR   = resolve(ROOT, 'public/audio');
const MANIFEST  = resolve(ROOT, 'src/data/audioManifest.json');

const API_KEY  = process.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = process.env.VITE_ELEVENLABS_VOICE_ID ?? 'IKne3meq5aSn9XLyUdCD';
const MODEL    = 'eleven_flash_v2_5';
const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true };

if (!API_KEY) {
  console.error('Missing VITE_ELEVENLABS_API_KEY');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// ── Collect all phrases ──────────────────────────────────────────────────────

const phrases = new Set<string>();

// Level tutorial modal: auto-play (with "Level N." prefix) + listen-again
for (const level of LEVELS) {
  const t = LEVEL_TUTORIALS[level.id];
  if (!t) continue;
  phrases.add(`Level ${level.number}. ${t.headline}. ${t.body}`);
  phrases.add(`${t.headline}. ${t.body}`);
}

// Tips page tip cards
for (const tip of TIPS) {
  phrases.add(`${tip.title}. ${tip.body}`);
}

// Home row demo — one phrase per key
for (const { key, finger } of HOME_ROW_KEYS) {
  phrases.add(`${finger} finger presses ${key === ';' ? 'semicolon' : key.toUpperCase()}`);
}

// ── Generate ─────────────────────────────────────────────────────────────────

function hashPhrase(text: string): string {
  return createHash('sha256').update(text + VOICE_ID).digest('hex').slice(0, 16);
}

const manifest: Record<string, string> = {};
let generated = 0;
let skipped   = 0;

for (const raw of phrases) {
  const text     = sanitizeForSpeech(raw);
  const hash     = hashPhrase(text);
  const filename = `${hash}.mp3`;
  const filepath = resolve(OUT_DIR, filename);
  const url      = `/audio/${filename}`;

  manifest[text] = url;

  if (existsSync(filepath)) {
    console.log(`  ✓ ${filename}  (cached)`);
    skipped++;
    continue;
  }

  process.stdout.write(`  → ${filename}  "${text.slice(0, 60).replace(/\n/g, ' ')}…"`);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method:  'POST',
    headers: { 'xi-api-key': API_KEY!, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
  });

  if (!res.ok) {
    console.error(`\n  ✗ ElevenLabs ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const buffer = await res.arrayBuffer();
  writeFileSync(filepath, Buffer.from(buffer));
  console.log('  ✓');
  generated++;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\nDone — ${generated} generated, ${skipped} cached. Manifest: ${phrases.size} entries.`);
