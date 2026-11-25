# CONTENT_GAPS: things I could not confirm from an official source

Updated 25 November 2026, Phase 3 part 1. Nothing here was invented to fill a gap. Each item is either left out of the game or clearly marked "needs-review" in the content files and on the "Saan galing ito?" page.

## 1. What LRP 2 settled

You added **ECCD Council, Learning Resource Package 2: Standards and Competencies/Indicators and Domains for 0-4 Years Old Filipino Children** to `/curriculum`. It has indicators for ages 1 and 2 (printed pages 2 to 12) and competencies for ages 3 and 4 (pages 13 to 35). Every lesson that was "needs-review" was checked against it. **All of them are now "verified".**

| Was needs-review | Now cited to (LRP 2, printed page) |
| --- | --- |
| Stage A as a whole (age 2) | The 2-year-old indicators, pp.2-12 |
| Matching two pictures that are the same | p.23, 3 years old, Cognitive 4.4: "know that certain things are the same" |
| Sorting big and small | p.23, Cognitive 4.5: "state opposite relationships" |
| Sorting by colour; the colour names | p.8, 2 years old, indicators 8 and 9: arrange objects by colour; recognize and tell the colour |
| Sorting by use (eating, washing) | p.22, Cognitive 2.2: group picture objects by category; p.8, 2 years old, indicator 8: by function |
| "baby" as a family member | p.7, 2 years old, indicator 3: names of people usually around him/her |
| The learning area of each competency | Now the LRP 2 domain each indicator is listed under, instead of my own reading |
| The Gawin natin card about big and small slippers | p.23, Cognitive 4.5; p.13, Health 2: wearing slippers |

The new games are verified too: hide-and-find (p.8, indicator 8, "hide and seek... object permanence"), Count to 5 (p.22, 2.5 and p.24, 8.5), Puzzle (p.15, Fine Motor 2 and 3), Sing and move (p.10, 2-year-old Music 3 and 4; p.26, Language 5: clapping, stomping, patting).

## 2. Still not confirmed

| What | Why | Where it is used |
| --- | --- | --- |
| The WHO screen-time advice (no more than one hour a day for ages 2 to 4) | WHO is an allowed source, but its guideline is not in `/curriculum`, so I could not check the wording myself | Parent Corner, time limits (the 30-minute default) |
| The words of the Sing and move chant | Written by me about verified actions (clap, stomp, pat, turn). LRP 7 (Action Songs, Poems, Rhymes) would give official rhymes; it is not in the folder | Sing and move |

## 3. My readings of LRP 2 that you may want to check

These are verified, but each rests on how I read a line. Please tell me if you read it differently.

| Lesson | The LRP 2 line | My reading |
| --- | --- | --- |
| Match pairs | p.23, 4.4: "know that certain things are the same and can be substituted for each other" | Finding two pictures that are the same |
| Sorting big and small | p.23, 4.5: "state opposite relationships" | Big and small are opposites |
| Hide-and-find at Stage A | p.8, indicator 8, printed in the 1-year-old column | A skill begun at 1, still enjoyed at 2 |
| Puzzle | p.15, Fine Motor 2 and 3: eye-hand coordination; manipulative tools | A jigsaw is a manipulative that trains eye-hand coordination. The ECCD Standards (p.28) also list puzzle play |
| Counting stops at 5 | p.22, 2.5 and p.24, 8.5 say 1 to 10 for age 3 | Your brief asked for "Count to 5" at Level 1; 6 to 10 can come later |

## 4. Documents that would still help

| Document | Why |
| --- | --- |
| Learning Resource Package 5: Suggested Activities for Pre-K1 | Detailed activity plans for each subtheme |
| Learning Resource Package 7: Action Songs, Poems, Rhymes | Official rhymes for Sing and move, instead of my own |
| WHO, Guidelines on physical activity, sedentary behaviour and sleep for children under 5 years of age (2019) | To verify the screen-time advice in the Parent Corner |

## 5. Pictures I have but did not use, because I am unsure of the word

| Picture | Question for the family |
| --- | --- |
| feelings: "proud" | What Filipino word would a 3-year-old hear for this? |
| feelings: "kalmado" | Is "kalmado" the word your family uses, or another? |

## 6. Filipino wording I would like a native speaker to check

The family spreadsheet (`npm run lang:sheet`) lists every text. These are the ones I am least sure of.

| Key | Text | My doubt |
| --- | --- | --- |
| `item.pamilya.baby` | baby | "baby" or "sanggol"? |
| `item.damdamin.takot.find` | Sino ang takot? | or "Sino ang natatakot?" |
| `item.gamit.plato` | plato, kutsara at tinidor | long for one card |
| `instr.sort.gamit` | Alin ang gamit sa pagkain? Alin ang gamit sa paglilinis ng katawan? | long for a 3-year-old |
| `sort.iba` | ibang kulay | or "hindi pula"? |
| `bye.session` | ...Maglaro naman tayo nang walang gadyet. | "gadyet" or "cellphone"? |
| `item.mundo.tainga` | tainga | "tainga" or "tenga" at home? |
| `chant.tapik` | Tapik, tapik sa tuhod, isa, dalawa, tatlo! | natural for a rhyme? |
| `chant.ikot` | Ikot, ikot, umikot, isa, dalawa, tatlo! | natural for a rhyme? |
| `sing.freeze` | Tigil! Huwag gagalaw! | the usual words for a freeze game? |

## 7. Left for later, by design

- Ilokano: every string is empty until an Ilokano speaker writes it. Nothing is machine-translated.
- Narration for the new lines: waiting for your wording check (narration.csv rows with status "new"). Until then the new games show the words and stay silent.
- Gawin natin as a game of its own (engine 15), and the Android app: next part of Phase 3.
