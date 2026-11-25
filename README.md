# Laro at Aral

An offline learning game for a young child, in Filipino and English. Today it has the town map, the Bahay place and four mini-games, with the real pictures and spoken narration.

Nothing in this folder contains the child's name, photo or birthday. Her name is typed in the Parent Corner and stays on the phone.

## What works today

| Part | Status |
| --- | --- |
| Town map with Bahay, Child Development Center and Bukid | Done |
| Tap and hear, Find it, hide-and-find with Butil, Sing and move (Stage A, age 2) | Done |
| Match pairs, Sort, Count to 5, Puzzle of 2 to 4 pieces (Stage B, age 3) | Done |
| All four Pre-K1 themes (Ako, Pamilya, Komunidad, Mundo), every lesson cited to LRP 1 or LRP 2 | Done |
| Parent gate: hold 3 seconds, then a sum | Done |
| Play-time limit with Butil's goodbye and a Gawin natin card | Done |
| Progress saved on the device, export, import, reset | Done |
| Works with no internet after the first opening | Done, tested automatically |
| Real pictures from /raw-assets | Done |
| Narration in Filipino and English (Butil and Teacher Liza) | 194 clips approved; 112 new lines waiting for your wording check |
| Start screen and app icon with the real Ading and Butil | Done |
| Filipino and Ilokano spreadsheet for the family (`npm run lang:sheet`) | Ready; waiting for the family |
| Gawin natin as a game, the rest of the Parent Corner, Android app | Phase 3, part 2 |

## How to run it on the laptop

Each command goes in the Terminal, inside this folder.

To try the game while it is being worked on:

```bash
npm run dev
```

Then open http://localhost:5173 in Chrome or Edge. Make the window wide, like a phone held sideways.

## How to test it in airplane mode on the laptop

1. Build the real app:

```bash
npm run build
```

2. Start it:

```bash
npm run preview
```

3. Open http://localhost:4173 in Chrome or Edge. Wait about ten seconds.
4. Go back to the Terminal and press Ctrl+C to stop it. You can also switch the laptop's Wi-Fi off.
5. Reload the page in the browser. The game still opens and plays, because it now lives in the browser's own storage.

The Parent Corner also tells you: open it, choose "Progreso at bersyon", and look for "Handa na itong gamitin kahit walang internet."

## How to open it on your phone

There are two ways. Only the second one allows airplane mode.

**Quick look, same Wi-Fi, needs the laptop running.** Good for seeing the size of the buttons on a real phone.

```bash
npm run preview -- --host
```

The Terminal prints a line like `Network: http://192.168.1.23:4173/`. Type that address into Chrome on the phone. If Windows asks whether to allow Node.js on the network, choose "Allow" for private networks. This way cannot work in airplane mode: phones only let a website store itself for offline use when it comes from a secure "https" address.

**Proper install, works in airplane mode.** The web version is published at **https://orientattaban.github.io/laro-at-aral/**

1. Open that address in Chrome on the phone and wait ten seconds.
2. Tap the three dots, then "Add to Home screen" or "Install app".
3. Open the game from its icon, turn on airplane mode, and play.

## How to play-test as a grown-up

- The round button with two people at the top right is for parents. Hold it for three seconds, then answer the sum.
- In the Parent Corner, switch between "Yugto A" (age 2) and "Yugto B" (age 3) to see the different games.
- To see the goodbye screen quickly, set "Haba ng isang laro" to 1 minute.
- The speaker button under Butil repeats his instruction.

## How to build it and see the size

```bash
npm run build
```

The last lines are the size report. The limit is 150 MB.

## How to run the tests

```bash
npm test
```

This checks the lesson files against the project rules, and the logic for difficulty, progress, review, time limits, saving and the four games.

```bash
npm run test:offline
```

This opens the built app in a real browser, switches the server off, and proves the game still opens, plays and saves, and that it never contacts another server. Run `npm run build` first. One of these tests waits a real minute for the play-time limit, so the whole run takes about two minutes.

## How to add a lesson

Lessons are text files in the `content` folder. No code is needed.

1. **Add the word**, if it is new, to `content/items/level1.json`. Copy a line and change it:
   - `id`: a short name of your own, like `pagkain.bayabas`
   - `image`: the picture name
   - `text`: the key for its word
   - `source` and `status`: where it comes from. Use `"verified"` only if you found it in a PDF in the `curriculum` folder. Otherwise write `"needs-review"`.
2. **Add its text** to `content/lang/fil.json` and `content/lang/en.json`. Each word needs two lines: the word itself, and the Find-it question at the same key plus `.find`.
3. **Add it to a game** in `content/activities/level1/`: put the item's `id` in the `items` list of an activity, or copy a whole activity block and change its `id`, `engine`, `items` and `source`.
4. Run these two commands. The first adds the new key to the Ilokano file, left empty. The second checks your work and explains any mistake in plain words.

```bash
npm run lang:sync
```

```bash
npm test
```

The engines you can use today are `tap-and-hear`, `find-it`, `match-pairs`, `sort`, `count`, `puzzle`, `hide-and-find` and `sing-and-move`. Look at `content/activities/level1/cdc.json` and `bukid.json` for an example of each.

## How to add a narration clip

Every spoken line is a row in `narration.csv`. The voices are made on this laptop with Google's Gemini speech model (free tier) and saved as small MP3 files inside the game. The game itself never contacts Google.

**Your key** lives in the file `.env` in this folder, on the line `GEMINI_API_KEY=`. That file is never uploaded.

**When you add or change a word** in `content/lang/fil.json` or `en.json`:

1. Update the script. New lines are added as "new"; lines whose text changed go back to "new"; your notes are kept:

```bash
npm run narration:csv
```

2. Make only the new and changed clips (a few seconds each, paced for the free limits):

```bash
npm run narration
```

3. Listen and approve. This opens a page at http://localhost:4300:

```bash
npm run narration:review
```

On that page, press **Play**, then **Approve**, or write what is wrong and press **Redo**. To fix how a word is said, write a respelling such as `say: SA-ging`. Then run `npm run narration` again: only the redo clips are made again.

**To change a character's voice**, choose another one at the top of the review page (to hear new candidates first, run `npm run narration:audition`), then mark all that character's clips to be made again:

```bash
npm run narration -- --redo-speaker "Butil"
```

If Google's free daily limit is reached, the run stops by itself, keeps what it made, and continues where it stopped the next time you run it. The free tier allows 10 requests a day, so up to 10 lines of one character go in one request and are cut apart afterwards; a recording that cannot be cut safely is not used, and those lines are tried again in smaller groups.

**The daily run.** While clips were still missing, a hidden Windows scheduled task ("Laro at Aral narration") ran `npm run narration` each day at 12:30 pm and logged to `narration-log.txt`. It deleted itself on 25 November 2026 once every clip was made. For later changes, run `npm run narration` yourself; if the free limit stops it, run it again the next day.

Ilokano has no voices until an Ilokano speaker has written the words. To see every clip the game is still missing:

```bash
npm run check:assets
```

## How to publish an update

The project lives at https://github.com/orientattaban/laro-at-aral (public). To publish the latest saved version:

```bash
git push
```

GitHub then runs every test. Only if they all pass does it replace the web version, about five minutes later. If a test fails, the old version stays online. To see how it went:

```bash
gh run list --limit 1 --web
```

A phone that already installed the game gets the new version by itself the next time it opens the game with internet; after that it works offline again. The Android app file comes in Phase 3.

## What the app remembers, and where

- Everything is saved on the device, in the browser's own storage. Nothing is sent anywhere.
- "I-save ang progreso sa isang file" in the Parent Corner makes a backup file. "Ibalik ang progreso mula sa file" loads it, for example on a new phone.
- The backup file contains the child's name if you typed one. Keep it private.

## Choices I made that you can change

| Choice | Why | Where to change it |
| --- | --- | --- |
| A place shows at most four games, the ones played least recently | A small child never sees more than four choices | `src/core/scheduler.ts` |
| Step up after three right in a row, down after two misses in a row | From your brief | `src/core/difficulty.ts` |
| Words come back for review after 1, 2, 4, 7 and 14 days | A simple, well-known spacing | `src/core/review.ts` |
| Progress labels are words (Nagsisimula, Umuunlad, Kaya na), not scores | LRP 1 page 16: ratings for young children should be descriptive | `src/core/mastery.ts` |
| After goodbye, only a parent can allow more play that day | So the limit means something | `src/core/session.ts` |
| When time runs out mid-game, the child finishes the current question first | Standards and Guidelines page 28: children are not rushed to stop | `src/screens/ActivityScreen.tsx` |
| Faith content is off until a parent switches it on | From your brief | Parent Corner |

## One honest limit

A website or app cannot block the phone's own Home button. On Android, "app pinning" does that: Settings, Security, App pinning. Instructions for the father's phone come with the Android app in Phase 3.

## Where things are

| Folder or file | What it holds |
| --- | --- |
| `content/` | Lessons, words, sources. The part you can edit |
| `src/` | The program |
| `scripts/` | Small helper programs (size report, missing-asset list, Ilokano sync, icons) |
| `tests/` | The automatic checks |
| `raw-assets/` | Your original pictures. Never changed by any script |
| `curriculum/` | The official PDFs. Kept on this laptop, not uploaded |
| `PLAN.md` | The plan you approved |
| `CONTENT_GAPS.md` | What I could not confirm from an official source |
| `CLAUDE.md` | The project rules, so later sessions follow them |
