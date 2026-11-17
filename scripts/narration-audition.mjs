// Makes one short sample per candidate voice, so the voices can be chosen by ear
// before all the clips are made. About 10 requests in total.
// The samples go to narration-audition/ (not part of the game, not uploaded).
// Listen and choose with: npm run narration:review
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuotaError, makeClient, readApiKey, speakPatiently, wavToMp3 } from './lib/tts.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(root, 'narration-audition');
const config = JSON.parse(readFileSync(join(root, 'narration-voices.json'), 'utf8'));
const fil = JSON.parse(readFileSync(join(root, 'content', 'lang', 'fil.json'), 'utf8'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One typical line per character, in Filipino.
const SAMPLE = {
  Butil: `${fil['item.pagkain.saging.find']} ${fil['fb.praise.2']}`,
  'Teacher Liza': `${fil['item.pamilya.nanay']}. ${fil['item.pagkain.saging']}. ${fil['item.damdamin.masaya']}.`,
  'Lola Auring': 'Noong unang panahon, may isang batang mahilig magtanim ng mais sa bukid.',
};

mkdirSync(OUT, { recursive: true });
const client = makeClient(readApiKey(root));
const listPath = join(OUT, 'audition.json');
const list = existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : [];

for (const [speaker, voices] of Object.entries(config.audition)) {
  for (const voice of voices) {
    const file = `${speaker.replace(/\s+/g, '-').toLowerCase()}-${voice.toLowerCase()}.mp3`;
    if (list.some((s) => s.file === file) && existsSync(join(OUT, file))) continue;
    const started = Date.now();
    try {
      const wav = await speakPatiently(client, {
        model: config.model,
        voice,
        language: config.languageCodes.Filipino,
        style: `${config.speakers[speaker].style}. In Filipino (Tagalog), with natural Filipino pronunciation`,
        text: SAMPLE[speaker],
      }, console.log);
      wavToMp3(wav, join(OUT, file));
      list.push({ speaker, voice, file, text: SAMPLE[speaker] });
      writeFileSync(listPath, JSON.stringify(list, null, 2));
      console.log(`ok  ${speaker}: ${voice}`);
    } catch (error) {
      if (error instanceof QuotaError) {
        console.log('The free limit was reached. Run the same command later to finish the audition.');
        process.exit(1);
      }
      console.error(`FAILED ${speaker} ${voice}: ${String(error.message ?? error).slice(0, 300)}`);
      process.exit(1);
    }
    const elapsed = Date.now() - started;
    if (elapsed < config.pacing.secondsBetweenRequests * 1000) await wait(config.pacing.secondsBetweenRequests * 1000 - elapsed);
  }
}
console.log('\nAudition ready. Listen and choose with: npm run narration:review');
