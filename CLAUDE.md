# CLAUDE.md: project rules for Laro at Aral

Read this first in every session. The full plan is in PLAN.md. Open questions about content are in CONTENT_GAPS.md.

## Who this is for

- An offline learning game for one child in Isabela, Philippines, from age 2 to about age 8 (Grade 3).
- The owner is not a developer. **Explain choices in plain language and ask before anything that cannot be undone** (publishing, the app ID, signing keys, deleting files, rewriting Git history).
- The child's father installs the Android app and uses the Parent Corner.
- Free accounts only. Flag anything that costs money or needs a large download.

## Hard requirements

1. Fully offline after installation. No network requests at runtime. No analytics, ads, accounts, external fonts or CDNs. Every asset is bundled.
2. One codebase, two outputs: a PWA on GitHub Pages and an Android APK built with Capacitor from the same web build.
3. Progress is saved on the device only (IndexedDB), with export to and import from a file.
4. Installed size under 150 MB. Report the size after every build (`npm run build` prints it).
5. Landscape. Must run smoothly on a low-end Android phone with a small screen.
6. Use current stable versions and check official documentation instead of assuming how an API works.
7. **Never put the child's real name, photo or birthday in the code or the repository.** Her name is typed in the Parent Corner and stays on the phone. Use "Pangalang Pagsubok" or "Test" in tests.

## Content rules (the most important part)

- Lessons follow official curricula only: the ECCD Council National Early Learning Curriculum for ages 3 and 4, and DepEd MATATAG for Kindergarten to Grade 3. The PDFs are in `/curriculum`. Read them before writing any lesson.
- Every item, activity, competency and card in `/content` has a `source` (document, printed page, subtheme or competency) and a `status`. Use `"verified"` only when it was found in a PDF in `/curriculum`. Otherwise `"needs-review"`.
- Allowed sources: Philippine government publications (DepEd, ECCD Council, DSWD, NCCA, NHCP, Official Gazette, PSA, DENR, PAGASA, PHIVOLCS, Province of Isabela), UN agencies (WHO, UNICEF, UNESCO), major research universities and institutes. Never blogs, vlogs, news, wikis or unsourced pages.
- If there is no official source, do not invent it. Leave it out and list it in CONTENT_GAPS.md.
- "Pambansa" only for officially declared symbols: flag, anthem, coat of arms, sampaguita, narra, Philippine eagle, Philippine pearl, arnis. Not the carabao, mango, bangus or nipa hut.
- Draw the Philippine flag in code to Republic Act 8491 proportions. Coins and bills are simple labelled play money.
- Prayer and faith items are optional, behind the parent's faith switch (`"faith": true`), off by default.
- **No scarecrows anywhere.** Never process or show `Gemini generated images/not-used-pista-with-scarecrows.jpg`.

## Languages

- Filipino is the default, English second, Ilokano an optional third.
- Every word and sentence lives in `content/lang/*.json`, never in code.
- Write Filipino and English by hand. **Never machine-translate Ilokano**: `ilo.json` stays empty for the family to fill (`npm run lang:sync` adds new empty keys).
- A missing narration clip shows the picture cue silently and is listed by `npm run check:assets`.

## Rules for a very young player (built into the engines)

- Touch targets at least 72 px with wide gaps. At Levels 1 and 2, never more than four choices on screen.
- No countdown timers, lives, lost points or failure screens.
- Wrong answer: gentle wobble and a spoken "try again". After two tries, softly highlight the right answer.
- Every screen speaks its instruction and has a replay button. No reading needed at Levels 1 to 3.
- Rewards are calm, two seconds or less, no flashing. Colour is never the only clue.
- No links out of the app. The Parent Corner and exit are behind the gate: hold three seconds, then a simple sum.

## Scope right now

- **Level 1 (Binhi) only.** Design for Levels 2 to 6 but write no content or code for them.
- Stage A (age 2): tapping only, two pictures, 5-minute sessions. Stage B (age 3): adds Match pairs, Sort, Count to 5, puzzles; 10-minute sessions. Daily cap 30 minutes. A parent switches stages.
- Characters: Ading (player), Butil (corn-kernel mascot, always with his leaf), Kiko, Ila, Lola Auring, Teacher Liza.
- Phase 1 (done): skeleton, offline PWA, parent gate, session timer, engines 1 to 4, Bahay, themes Ako and Pamilya, placeholders.
- Phase 2 (in progress): DONE asset pipeline (`npm run assets`), ASSETS.md, narration.csv (wording approved by the owner), voices chosen (Butil: Achird, Teacher Liza: Erinome, Lola Auring: Vindemiatrix), generator (`npm run narration`), review page (`npm run narration:review`). Gemini free tier = 10 requests/day, so lines are grouped (up to 10 per request, cut apart by `scripts/lib/split.mjs`; refused recordings kept in `narration-audition/_refused/`). All 194 clips were made by 25 Nov 2026; the Windows task "Laro at Aral narration" (owner-approved, run hidden via `conhost --headless`) then deleted itself. To make redo rows later, run `npm run narration` by hand. All 194 clips approved by the owner on 25 Nov 2026. Splash and icons DONE (`npm run icons`, run after `npm run assets`; start screen with a tap-to-start button that also unlocks sound on phones; `resources/app-icon-1024.png` kept for the Android app, `splash-2732.png` regenerated on demand). NOT DONE: Filipino and Ilokano spreadsheet, the Bulaklak badge cut badly (Level 4, fix later).
- Phase 3: CDC and Bukid, engines Count, Puzzle, Sing and move, Gawin natin, hide-and-find, themes Komunidad and Mundo, full Parent Corner, Android APK.

## Narration (Phase 2)

- Generated on the laptop at build time, never at runtime. Default: Gemini `gemini-3.8-flash-tts` on the free tier. Check the official pricing, rate-limit and terms pages again before generating. Fallback: Azure AI Speech Filipino voices.
- API key from a local `.env` (git-ignored). Never print or commit it.
- `narration.csv` columns: file name, language, speaker, exact text, pronunciation note, status (new, generated, approved, redo).
- **Show narration.csv to the owner and wait for wording corrections before generating anything.**
- Three voices: Butil (warm, cheerful), Teacher Liza (clear), Lola Auring (older, gentle). Slow and clear. Generate only new or changed rows.
- Speech services say letter names, not sounds, and cannot sing. No Ilokano clips until a speaker has written the text.

## How the code is organised

- `content/`: lessons, words and settings as JSON. Engines are driven entirely by these files.
- `src/engines/`: one file per mini-game engine, registered in `registry.ts`.
- `src/core/`: sound, saving, progress, difficulty, review, session timer, languages.
- `src/screens/`, `src/components/`, `src/draw/` (pictures drawn in code).
- `scripts/`: checks and build helpers. `tests/unit` (Vitest), `tests/e2e` (Playwright, built app).
- Behaviour decisions: difficulty steps up after three first-try answers in a row and down after two misses in a row; mastery is per competency with descriptive labels; items return for review after 1, 2, 4, 7 and 14 days.

## Commands

- `npm run dev`: run on the laptop while developing.
- `npm test`: unit tests and content rules.
- `npm run build`: type-check, build, and print the app size.
- `npm run test:offline`: offline and no-network tests against the built app (run `npm run build` first).
- `npm run check:assets`: list missing pictures and narration clips.
- `npm run lang:sync`: add new empty keys to `ilo.json`.

## Working agreements

- A phase is done only when it builds without errors, tests pass, it works in airplane mode, the no-network test passes and the size is reported.
- Commit after each working step with a clear message. Never commit signing keys, passwords or `.env`.
- Not uploaded without the owner's decision: `raw-assets` pictures, `prompts/`, `START-HERE.md`, curriculum PDFs (all git-ignored for now). Free GitHub Pages needs a public repository; she has not yet approved that.
- Local Git identity is a placeholder (`noreply@laro-at-aral.invalid`). Set her GitHub noreply address before the first upload.
- Hard-to-undo decisions still pending: public repository, app ID (proposed `ph.laroataral.app`), signing key.
