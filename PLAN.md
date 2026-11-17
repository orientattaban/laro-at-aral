# PLAN: Laro at Aral, Level 1 (Binhi)

Written 17 November 2026. Approved the same day.

**Status: Phase 1 is built and tested.** Phases 2 and 3 are not started. See README.md for how to run it.

## 1. The plan in plain words

- I build one small website that is also a game. The same website is wrapped into an Android app for the father's phone. One set of files, two ways to open it.
- After it is installed, it never uses the internet. Pictures, voices, fonts and sounds all travel inside the app.
- The game itself is a set of "engines" (Tap and hear, Find it, and so on). Lessons are plain text files that tell an engine what to show and say. Adding a lesson later means adding lines to a text file, not writing code.
- Every lesson line says where it comes from in the official curriculum, and whether I really found it in your PDFs ("verified") or not ("needs-review").
- The work is in three phases, the same three as in your follow-up prompts. After each phase you test it on a phone before I continue.

## 2. What I found when I looked through the folder

### Curriculum: an important gap

| File in /curriculum | What it actually contains | Useful for |
| --- | --- | --- |
| LRP-1 (28 pages) | The four Pre-K1 themes and their subthemes (LRP 1 pages 11 to 13), the six learning domains (pages 5 to 6), the daily schedule, teaching tips | Deciding **which topics** belong to age 3 |
| Standards and Guidelines (60 pages) | Rules for running a Child Development Center. Area V (pages 26 to 29) says the curriculum is play-based, covers literacy, numeracy, science and arts, uses the mother tongue, and lists puzzle play as a quiet activity | Supporting the **style** of the game |

Neither PDF lists the actual competencies (for example "counts up to 5" or "sorts by size"). Those are in **Learning Resource Package 2: Standards, Competencies, Indicators and Domains**, which is not in the folder. LRP 3 (toddlers under 3), LRP 5 (Pre-K1 activities) and LRP 7 (songs and rhymes) are also missing.

What this means, honestly:

- Topic items can be marked **verified**. Example: the card "nanay" falls under the subtheme "Father, Mother, Brother, Sister", LRP 1 page 12.
- Skill items will be marked **needs-review** and listed in CONTENT_GAPS.md until LRP 2 is added: counting to 5, sorting big and small, sorting one colour, matching pairs, puzzles.
- Stage A (age 2) uses the Pre-K1 topics with simpler play. The PDFs here do not cover children under 3, so Stage A is marked needs-review as a whole.
- Chants for Sing and move: I have no official song source (LRP 7 is missing), so I will write short original spoken chants about verified topics and mark the chant wording as my own, not from a government source. No traditional songs unless you give me an official source.

### Level 1 topics I can verify today (LRP 1, pages 11 to 13)

| Game theme | Official Pre-K1 theme | Subthemes with pictures ready |
| --- | --- | --- |
| Ako | Tell About Yourself | I Have Feelings (feelings sheet); This Is What I Wear; Things I Use for Sleeping and Playing (banig at unan); I Have a Name (typed by parent, stays on phone) |
| Pamilya | My Family and Me | Father, Mother, Brother, Sister; Grandmother, Grandfather (family sheet); What do I Eat (food sheet); Things I Use in Eating; Things I Use When I Clean Myself (things sheet) |
| Komunidad | My Community | Wonderful Animals Around Us (animals sheet); Products in Our Community (mais, saging, niyog and others) |
| Mundo | God Created a Beautiful World for Us | Eyes, Ears, Nose, Tongue, Skin (body sheet); Weather: sunny, cloudy, rainy, stormy (weather sheet) |

The fourth theme's official title mentions God. In the game it is called "Mundo". Anything that is a prayer or faith statement sits behind the parent's faith switch.

### Pictures

- 44 files, 60 MB. Object sheets are 2752 x 1536 with nine pictures in loose rows, not a strict grid. I will cut them by finding the white gaps, then check that I got exactly nine before naming them.
- Backgrounds are 1376 x 768. Good for a phone, slightly soft on a tablet.
- `Gemini generated images/not-used-pista-with-scarecrows.jpg` will never be processed or uploaded.

### Your laptop

| Tool | Status | Needed for |
| --- | --- | --- |
| Node.js 26 and Git | Installed | Everything in Phases 1 and 2 |
| ffmpeg (sound converter) | Not installed | I will use a copy that installs inside the project. Nothing to do |
| Android Studio | Not installed | Phase 3 only, to build the APK. A free download of several GB. I will guide you when we get there |

## 3. Tools and versions (checked today on the official registries and documentation)

| Job | Tool | Version today |
| --- | --- | --- |
| Build the website | Vite | 8.3 |
| Screens and buttons | React | 19.3 |
| Catching my own mistakes | TypeScript | 7.0 |
| Offline website (PWA) | vite-plugin-pwa with Workbox | 2.0 / 7.4 |
| Android wrapper | Capacitor | 8.6 (needs Android 7 or newer on the phone) |
| Saving progress | IndexedDB through the small `idb` helper | 8.0 |
| Tests | Vitest, plus Playwright for the offline and no-network tests | 5.1 / 1.65 |
| Picture processing | sharp | 0.35 |
| Sound processing | ffmpeg-static | 5.3 |
| Narration | Google `@google/genai`, used only on your laptop | 3.3 |
| Font | Andika by SIL, open licence, made for early readers, bundled | 5.3 |

I agree with your suggested stack and am not changing it. I will keep everything else out: no router, no design library, no state library. Fewer parts means a smaller app and fewer things to break on a low-end phone.

Two technical choices worth knowing:

- **Sound format: MP3, mono.** It plays in Android WebView and iPhone Safari. I will play clips through the Web Audio system instead of the ordinary audio tag, because that avoids a known offline problem on iPhones.
- **Two builds from one codebase.** The web build is the PWA for GitHub Pages. The Android build is the same files copied inside the APK, where no internet is needed at all.

## 4. Narration: what the official Google pages say

| Point | Finding |
| --- | --- |
| Model | `gemini-3.8-flash-tts`. Filipino and English are both listed as supported |
| Free tier | Listed as free of charge. I read this from a summary of the pricing page, so I will confirm it on the live page before generating |
| Rate limits | Not published as numbers. Google says they are shown inside your own AI Studio account. I will ask you to read me three numbers from that page, and pace well below them |
| Output | WAV, 24 kHz. I trim silence, even out loudness and convert to MP3 |
| Pace and tone | Controlled by a style instruction, for example "slow, warm, for a three-year-old" |
| Voices | 30 to choose from. I will make a short audition so you choose by ear: one warm voice for Butil, one clear voice for Teacher Liza, one mature, gentle voice for Lola Auring |

Things in Google's terms you should know before deciding (see question 3):

- You must be 18 or older to use the service. You are.
- On the free tier, Google may use the text we send to improve its products. We only send lesson words such as "aso" and "Hanapin ang pusa". The child's name is never sent.
- The terms do not allow an app aimed at under-18s to **connect to** the service. Our app never connects: the clips are made once on your laptop and bundled. I read that as acceptable, but I am not a lawyer and the terms do not address bundled audio directly.

Fallback if Filipino pronunciation is poor: Azure AI Speech Filipino voices, as you suggested.

## 5. Architecture

```
/content        lessons, words and settings as text files (you can edit these)
/src/engines    one folder per mini-game engine
/src/core       sound, saving, progress, session timer, parent gate, languages
/src/screens    town map, place screen, Parent Corner
/scripts        asset cutter, narration generator, checks, spreadsheet export
/raw-assets     your original pictures (never changed)
/public/assets  processed pictures and sound, made by the scripts
/tests          automatic checks
/android        the Android wrapper (Phase 3)
```

- **Engines.** Each engine receives one activity from a content file and nothing else. Phase 1 builds four. The other eleven slots are registered by name so later levels plug in without restructuring.
- **Progress.** Saved on the phone only. Mastery is tracked per competency. Step up after three correct in a row, step down after two misses. Earlier items come back for review on later days.
- **Export and import.** One file the parent can save and load again.
- **Session timer.** Stage A 5 minutes, Stage B 10 minutes, daily cap 30, all adjustable. When time is up, Butil waves and a Gawin natin card appears.
- **Parent gate.** Hold for three seconds, then a simple sum.
- **Young-child rules built into the engines, not left to each lesson:** 72-pixel minimum targets, at most four choices, no timers or failure screens, wobble and "try again", highlight after two tries, spoken instruction with replay, shape or picture cues alongside colour.
- **Missing narration.** The picture cue shows silently and the clip is added to a missing list.

One honest limit: an app cannot block the phone's own Home button. The README will show the father how to turn on Android's "app pinning", which does.

## 6. Content file format

Three kinds of files, all plain text (JSON), plus the narration sheet.

**A word or picture** (`content/items/level1.json`):

```json
{
  "id": "pamilya.nanay",
  "image": "obj-family-nanay",
  "text": "item.pamilya.nanay",
  "tags": ["tao", "pamilya"],
  "source": { "doc": "ECCD Council LRP 1", "page": 12, "ref": "Pre-K1, My Family and Me: Father, Mother, Brother, Sister" },
  "status": "verified"
}
```

**A competency** (`content/competencies/level1.json`): an id, the learning domain, the theme, a source and a status. Mastery is recorded against these.

**An activity** (`content/activities/level1/bahay-pamilya-tap.json`):

```json
{
  "id": "l1.bahay.pamilya.tap",
  "engine": "tap-and-hear",
  "level": 1, "stage": "A", "place": "bahay", "theme": "pamilya",
  "competency": "l1.pamilya.name-family-members",
  "instruction": "instr.tap-and-hear.pamilya",
  "items": ["pamilya.nanay", "pamilya.tatay", "pamilya.lola", "pamilya.lolo"],
  "faith": false,
  "source": { "doc": "ECCD Council LRP 1", "page": 12, "ref": "Pre-K1, My Family and Me" },
  "status": "verified"
}
```

**Words and sentences** live only in `content/lang/fil.json`, `en.json` and `ilo.json`. Ilokano stays empty until your family fills it in. A script exports an Excel sheet of every Filipino and Ilokano string and reads the corrections back in.

**narration.csv** has your six columns: file name, language, speaker, exact text, pronunciation note, status.

Automatic checks will fail the build if a lesson has no source or status, a string is missing in Filipino or English, a Level 1 activity shows more than four choices, "pambansa" is used for something not on your official list, or the word scarecrow appears anywhere.

## 7. Build phases

### Phase 1: skeleton and first games
- Project setup, CLAUDE.md with your rules, README, first commits.
- Offline PWA, landscape, town map with Bahay open.
- Parent gate, session timer, saving, export and import.
- Engines: Tap and hear, Find it, Match pairs, Sort.
- Content for Ako and Pamilya, with labelled placeholder pictures and silent picture cues (no narration yet).
- Tests, including one that proves the app makes no network requests.
- I tell you exactly how to open it on your phone and test in airplane mode, and report the size.

### Phase 2: real pictures and narration
- ASSETS.md, the asset cutter, a contact sheet for you to spot bad crops, vector drawings for anything missing.
- New splash and icon built from Ading and Butil.
- narration.csv for Level 1. **I stop here for your wording corrections before generating anything.**
- Voice audition, generation paced inside the free limits, the review page with approve and redo.
- The Filipino and Ilokano spreadsheet.

### Phase 3: finish Level 1
- Child Development Center and Bukid.
- Engines: Count, Puzzle, Sing and move, Gawin natin, and the hide-and-find game.
- Komunidad and Mundo content.
- Full Parent Corner: Stage A to B switch, progress, off-screen practice, "Saan galing ito?".
- Android APK, with instructions for sending and installing.

Size estimate for Level 1: 15 to 25 MB, far under the 150 MB limit. I will report the real figure after every build.

A phase is done only when it builds, tests pass, it works in airplane mode, the no-network test passes and the size is reported.

## 8. Things that are hard to undo: I will ask before each one

| Decision | Why it matters | When |
| --- | --- | --- |
| Uploading to GitHub | Free GitHub Pages needs a **public** repository. Everything uploaded, including the pictures, is visible to anyone and stays in the history even if deleted later | End of Phase 1 |
| The email shown on your commits | In a public repository your email would be visible. I will set GitHub's private "noreply" address first | Before the first upload |
| The app's permanent ID (proposed: `ph.laroataral.app`) | If it changes later, the phone treats it as a different app and progress does not carry over | Phase 3 |
| The signing key for the APK | If the key or its password is lost, updates will not install over the old app. You keep it and its password; it is never committed | Phase 3 |

I will keep the curriculum PDFs and the unused scarecrow picture on your laptop only, not uploaded. Starting a local Git history in this folder can be undone and touches none of your files, so I will do that in Phase 1 without asking again.

## 9. What I need from you, and when

| When | What |
| --- | --- |
| Now | Answers to the questions in my message, and approval of this plan |
| End of Phase 1 | A free GitHub account |
| Phase 2 | A Gemini API key placed in a `.env` file (I will show you where), three rate-limit numbers from AI Studio, and your corrections to narration.csv |
| Phase 3 | Android Studio installed on this laptop |

## 10. Assumptions I made until you answer

1. LRP 2 is not available yet, so skill items are marked needs-review.
2. Narration uses Gemini `gemini-3.8-flash-tts` on the free tier.
3. The GitHub repository will be public.
4. The father's phone runs Android 7 or newer.
