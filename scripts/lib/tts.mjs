// Making one narration clip with the Gemini speech model, on this laptop only.
// The game itself never contacts any speech service: it only plays the finished files.
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import ffmpegPath from 'ffmpeg-static';
import { GoogleGenAI } from '@google/genai';

/** Reads the key from .env. Never prints it. */
export function readApiKey(root) {
  const path = join(root, '.env');
  if (!existsSync(path)) throw new Error('There is no .env file. See README: "How to add a narration clip".');
  const line = readFileSync(path, 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith('GEMINI_API_KEY='));
  const key = line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
  if (!key || key === 'paste-your-key-here') {
    throw new Error('The Gemini key is not in .env yet. Open .env and replace paste-your-key-here with your key.');
  }
  if (/\s/.test(key)) throw new Error('The key in .env contains a space. Please paste it again with no spaces.');
  return key;
}

export function makeClient(apiKey) {
  return new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class QuotaError extends Error {
  constructor(message, { daily, retryMs }) {
    super(message);
    this.daily = daily;
    this.retryMs = retryMs;
  }
}

function describe(error) {
  const status = error?.status ?? error?.statusCode ?? error?.code;
  const text = String(error?.message ?? error);
  return { status: Number(status) || 0, text };
}

/**
 * Ask Gemini to speak one line. Returns WAV bytes.
 * `style` describes HOW to speak (pace, mood). It is not read aloud.
 */
export async function speak(client, { model, voice, language, style, text }) {
  const request = (withLanguage) => client.interactions.create({
    model,
    input: [{
      type: 'user_input',
      content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }],
    }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [withLanguage && language ? { voice, language } : { voice }] },
    // Do not keep a copy of the request on Google's side.
    store: false,
  });

  let interaction;
  try {
    interaction = await request(true);
  } catch (error) {
    const { status, text: message } = describe(error);
    if (status === 400 && /language/i.test(message)) {
      interaction = await request(false); // the language hint was not accepted; let the model detect it
    } else if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
      const daily = /per.?day|PerDay|daily/i.test(message);
      const seconds = Number((message.match(/retry in ([\d.]+)s/i) ?? message.match(/"retryDelay":\s*"([\d.]+)s"/) ?? [])[1]);
      throw new QuotaError(message, { daily, retryMs: Number.isFinite(seconds) ? seconds * 1000 : 60_000 });
    } else {
      throw error;
    }
  }
  const data = interaction?.output_audio?.data;
  if (!data) throw new Error('Gemini answered without audio.');
  return Buffer.from(data, 'base64');
}

/** speak() with patient retries when the free limit per minute is reached. */
export async function speakPatiently(client, line, log) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await speak(client, line);
    } catch (error) {
      if (error instanceof QuotaError && !error.daily && attempt <= 4) {
        const ms = Math.max(error.retryMs, 20_000 * attempt);
        log(`   the free per-minute limit was reached; waiting ${Math.round(ms / 1000)} s`);
        await wait(ms);
        continue;
      }
      throw error;
    }
  }
}

/**
 * Trim silence at both ends, even out loudness, and save as MP3
 * (plays offline in Android WebView and iPhone Safari).
 */
export function wavToMp3(wav, outPath) {
  const work = join(tmpdir(), `laro-tts-${process.pid}-${Date.now()}.wav`);
  writeFileSync(work, wav);
  mkdirSync(dirname(outPath), { recursive: true });
  const filters = [
    'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12',
    'areverse',
    'loudnorm=I=-18:TP=-2:LRA=11',
  ].join(',');
  const result = spawnSync(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', work,
    '-af', filters, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k', outPath,
  ], { encoding: 'utf8' });
  rmSync(work, { force: true });
  if (result.status !== 0) throw new Error(`Sound conversion failed: ${result.stderr || result.error}`);
}

/** Length of an audio file in seconds. */
export function durationSeconds(path) {
  const result = spawnSync(ffmpegPath, ['-hide_banner', '-i', path], { encoding: 'utf8' });
  const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(result.stderr ?? '');
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
}
