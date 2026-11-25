// These tests open the BUILT app in a real browser.
// They prove the two promises that matter most:
//   1. it makes no network request to any other server, ever
//   2. it works with no connection at all (airplane mode)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { preview } from 'vite';

const OWN_ORIGIN = 'http://localhost:4173';
/** The airplane-mode test runs its own copy of the server so it can switch it off. */
const AIRPLANE_PORT = 4174;
const AIRPLANE_ORIGIN = `http://localhost:${AIRPLANE_PORT}`;

/** Wait until the app has stored every file for offline use and controls the page. */
async function waitUntilInstalled(page: Page) {
  await page.evaluate(async () => {
    // "ready" resolves once every file has been stored and the offline copy is active.
    await navigator.serviceWorker.ready;
    while (!navigator.serviceWorker.controller) await new Promise((r) => setTimeout(r, 100));
  });
}

function watchRequests(context: BrowserContext, ownOrigin: string = OWN_ORIGIN) {
  const outside: string[] = [];
  const failed: string[] = [];
  const check = (url: string) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== ownOrigin) outside.push(url);
  };
  context.on('request', (request) => check(request.url()));
  context.on('requestfailed', (request) => failed.push(request.url()));
  return { outside, failed };
}

/** The start screen needs one tap (this is also what allows sound on phones). */
async function tapStart(page: Page) {
  // The button gently grows and shrinks, so it never "stands still" for the test robot.
  await page.getByTestId('splash-start').click({ force: true });
}

async function openParentCorner(page: Page) {
  const button = page.locator('.parent-button');
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  const sum = page.getByTestId('gate-sum');
  await expect(sum).toBeVisible();
  const answer = String(Number(await sum.getAttribute('data-a')) + Number(await sum.getAttribute('data-b')));
  for (const digit of answer) await page.locator('.gate-keys button', { hasText: new RegExp(`^${digit}$`) }).click();
  await page.getByTestId('gate-ok').click();
  await expect(page.getByTestId('parent')).toBeVisible();
}

async function playFindIt(page: Page) {
  await page.locator('[data-testid=tile][data-engine=find-it]').first().click();
  await expect(page.getByTestId('activity')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    const row = page.getByTestId('choices');
    await expect(row).toBeVisible();
    const target = await row.getAttribute('data-target');
    const card = page.locator(`[data-testid=choice][data-item="${target}"]`);
    await expect(card).toHaveClass(/card-idle/);
    // Keep tapping gently until the game accepts the answer (it ignores taps while Butil is speaking).
    await expect(async () => {
      await card.click();
      await expect(card).toHaveClass(/card-correct/, { timeout: 400 });
    }).toPass({ timeout: 20_000 });
    if (i < 3) await expect(row).not.toHaveAttribute('data-target', target!, { timeout: 20_000 });
  }
  await expect(page.getByTestId('reward')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('place')).toBeVisible({ timeout: 20_000 });
}

test('makes no network requests to any other server', async ({ context, page }) => {
  test.setTimeout(120_000);
  const seen = watchRequests(context);
  await page.goto('/');
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();
  await waitUntilInstalled(page);

  await page.getByTestId('place-bahay').click();
  await playFindIt(page);
  await page.getByTestId('back').click();
  await openParentCorner(page);
  for (const tab of ['progress', 'sources', 'data', 'settings']) await page.getByTestId(`tab-${tab}`).click();
  await page.waitForTimeout(500);

  expect(seen.outside, 'requests to other servers').toEqual([]);
});

test('works in airplane mode: opens, plays and saves with no connection', async ({ browser }) => {
  test.setTimeout(120_000);
  // Start a private copy of the server, install the app from it, then switch the server OFF.
  // After that there is nothing to connect to, exactly like a phone in airplane mode.
  const server = await preview({ preview: { port: AIRPLANE_PORT, strictPort: true }, logLevel: 'silent' });
  const context = await browser.newContext({ viewport: { width: 740, height: 360 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const seen = watchRequests(context, AIRPLANE_ORIGIN);
  try {
    await page.goto(AIRPLANE_ORIGIN + '/');
    await tapStart(page);
    await expect(page.getByTestId('map')).toBeVisible();
    await waitUntilInstalled(page);
  } finally {
    await new Promise<void>((resolve) => {
      (server.httpServer as { closeAllConnections?: () => void }).closeAllConnections?.();
      server.httpServer.close(() => resolve());
    });
  }

  // Prove the server really is gone.
  const serverGone = await fetch(AIRPLANE_ORIGIN + '/').then(() => false, () => true);
  expect(serverGone, 'the test server should be switched off').toBe(true);

  // Open the app again with no server and no connection.
  await page.reload();
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();

  // The font must come from the phone, not the network.
  const fontReady = await page.evaluate(async () => {
    await document.fonts.load('700 20px Andika');
    return document.fonts.check('700 20px Andika');
  });
  expect(fontReady).toBe(true);

  await page.getByTestId('place-bahay').click();
  await playFindIt(page);

  // Parent Corner: the name is saved on the device.
  await page.getByTestId('back').click();
  await openParentCorner(page);
  await page.getByTestId('child-name').fill('Pangalang Pagsubok');
  await page.getByTestId('stage-B').check();
  await page.getByTestId('parent-back').click();
  await expect(page.getByTestId('map')).toBeVisible();

  // Close and open again, still with no connection: everything is still there.
  await page.reload();
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();
  await expect(page.locator('.map-hello')).toContainText('Pangalang Pagsubok');
  await page.getByTestId('place-bahay').click();
  await expect(page.locator('[data-testid=tile][data-engine=sort]')).toBeVisible();
  await expect(page.locator('[data-testid=tile]')).toHaveCount(4);

  expect(seen.outside, 'requests to other servers').toEqual([]);
  // Every file the page asked for was answered from the phone's own storage.
  const pageFailures = seen.failed.filter((url) => !url.endsWith('/sw.js'));
  expect(pageFailures, 'files that could not be loaded without a connection').toEqual([]);
  await context.close();
});

test('Stage B games work: Match pairs and Sort (dragging)', async ({ page }) => {
  await page.goto('/');
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();
  await openParentCorner(page);
  await page.getByTestId('stage-B').check();
  await page.getByTestId('parent-back').click();
  await page.getByTestId('place-bahay').click();

  // Match pairs
  await page.locator('[data-testid=tile][data-engine=match-pairs]').click();
  for (let round = 0; round < 2; round++) {
    await expect(page.locator('[data-testid=match-card].card-done')).toHaveCount(0, { timeout: 20_000 });
    const cards = page.getByTestId('match-card');
    await expect(cards).toHaveCount(4);
    const items = await cards.evaluateAll((list) => list.map((c) => (c as HTMLElement).dataset.item));
    for (const item of [...new Set(items)]) {
      const pair = page.locator(`[data-testid=match-card][data-item="${item}"]`);
      await expect(async () => {
        await pair.nth(0).click();
        await pair.nth(1).click();
        await expect(pair.nth(0)).toHaveClass(/card-done/, { timeout: 500 });
      }).toPass({ timeout: 20_000 });
    }
  }
  await expect(page.getByTestId('place')).toBeVisible({ timeout: 10_000 });

  // Sort, by dragging the thing into the right basket
  await page.locator('[data-testid=tile][data-engine=sort]').first().click();
  await expect(page.getByTestId('sort')).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (!(await page.getByTestId('sort').isVisible().catch(() => false))) break;
    const answer = await page.getByTestId('sort').getAttribute('data-answer');
    const item = (await page.getByTestId('sort-item').boundingBox())!;
    const basket = (await page.locator(`[data-testid=basket][data-basket="${answer}"]`).boundingBox())!;
    await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
    await page.mouse.down();
    await page.mouse.move(basket.x + basket.width / 2, basket.y + basket.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(1300);
  }
  await expect(page.getByTestId('place')).toBeVisible({ timeout: 10_000 });
});

test('when play time is up, Butil says goodbye and only a parent can continue', async ({ page }) => {
  // This test really waits one minute of play, so it is allowed more time.
  test.setTimeout(150_000);
  await page.goto('/');
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();
  await openParentCorner(page);
  await page.getByTestId('session-minutes').fill('1');
  await page.getByTestId('parent-back').click();
  await expect(page.getByTestId('map')).toBeVisible();

  // One minute of play, then goodbye with a Gawin natin card. No countdown is ever shown.
  await expect(page.getByTestId('bye')).toBeVisible({ timeout: 75_000 });
  await expect(page.getByTestId('gawin-natin')).toBeVisible();

  // Reopening the app does not get around it.
  await page.reload();
  await tapStart(page);
  await expect(page.getByTestId('bye')).toBeVisible();

  // A parent allows one more session.
  await openParentCorner(page);
  await page.getByTestId('allow-more').click();
  await page.getByTestId('parent-back').click();
  await expect(page.getByTestId('map')).toBeVisible();
});

test('the start screen shows the real Ading and Butil picture and a big start button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('splash')).toBeVisible();
  const loaded = await page.locator('.splash-art').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  expect(loaded).toBe(true);
  const box = (await page.getByTestId('splash-start').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(72);
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();
});

test('touch targets are at least 72 pixels on a small phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('/');
  await tapStart(page);
  await expect(page.getByTestId('map')).toBeVisible();
  const tooSmall = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => !b.closest('.parent') && !b.closest('.gate'))
        .map((b) => ({ label: b.getAttribute('aria-label'), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }))
        .filter((b) => b.w < 72 || b.h < 72));
  expect(await tooSmall()).toEqual([]);
  await page.getByTestId('place-bahay').click();
  await expect(page.getByTestId('place')).toBeVisible();
  expect(await tooSmall()).toEqual([]);
  await page.locator('[data-testid=tile][data-engine=find-it]').first().click();
  await expect(page.getByTestId('choices')).toBeVisible();
  expect(await tooSmall()).toEqual([]);
  // The new places and Stage A games too.
  await page.getByTestId('back').click();
  await page.getByTestId('back').click();
  await page.getByTestId('place-bukid').click();
  expect(await tooSmall()).toEqual([]);
  await page.locator('[data-testid=tile][data-engine=hide-and-find]').click();
  await expect(page.getByTestId('hide')).toHaveAttribute('data-phase', 'seek', { timeout: 20_000 });
  expect(await tooSmall()).toEqual([]);
});

test('Stage A: Butil hides in the Bukid and is found; Sing and move starts with its beat', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await tapStart(page);
  await page.getByTestId('place-bukid').click();
  await page.locator('[data-testid=tile][data-engine=hide-and-find]').click();
  for (let round = 0; round < 4; round++) {
    const hide = page.getByTestId('hide');
    await expect(hide).toHaveAttribute('data-phase', 'seek', { timeout: 20_000 });
    await expect(page.getByTestId('hide-spot')).toHaveCount(2);
    const where = await hide.getAttribute('data-hidden');
    await page.locator(`[data-testid=hide-spot][data-spot="${where}"]`).click();
    if (round < 3) await expect(hide).toHaveAttribute('data-phase', 'found');
  }
  await expect(page.getByTestId('place')).toBeVisible({ timeout: 20_000 });

  await page.getByTestId('back').click();
  await page.getByTestId('place-cdc').click();
  await page.locator('[data-testid=tile][data-engine=sing-and-move]').click();
  await expect(page.getByTestId('sing')).toHaveAttribute('data-verse', '0', { timeout: 30_000 });
  await expect(page.getByTestId('sing')).toHaveAttribute('data-frozen', 'true', { timeout: 40_000 });
});

test('Stage B: Count to 5 and a puzzle, played to the end', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/');
  await tapStart(page);
  await openParentCorner(page);
  await page.getByTestId('stage-B').check();
  await page.getByTestId('parent-back').click();
  await page.getByTestId('place-cdc').click();

  // Count: tap each thing, then the right number.
  await page.locator('[data-testid=tile][data-engine=count]').click();
  for (let round = 0; round < 4; round++) {
    const count = page.getByTestId('count');
    await expect(count).toHaveAttribute('data-round', String(round), { timeout: 20_000 });
    const amount = await count.getAttribute('data-amount');
    const objects = page.getByTestId('count-object');
    for (let i = 0; i < Number(amount); i++) await objects.nth(i).click({ force: true });
    const right = page.locator(`[data-testid=count-choice][data-value="${amount}"]`);
    await expect(right).toBeEnabled({ timeout: 20_000 });
    await right.click();
  }
  await expect(page.getByTestId('place')).toBeVisible({ timeout: 20_000 });

  // Puzzle: drag each piece to its place.
  await page.locator('[data-testid=tile][data-engine=puzzle]').click();
  for (let picture = 0; picture < 2; picture++) {
    await expect(page.getByTestId('puzzle')).toHaveAttribute('data-round', String(picture), { timeout: 20_000 });
    await expect(page.getByTestId('puzzle-piece')).toHaveCount(2);
    while ((await page.getByTestId('puzzle-piece').count()) > 0) {
      const piece = page.getByTestId('puzzle-piece').first();
      const id = await piece.getAttribute('data-piece');
      const from = (await piece.boundingBox())!;
      const to = (await page.locator(`[data-testid=puzzle-slot][data-slot="${id}"]`).boundingBox())!;
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
  }
  await expect(page.getByTestId('place')).toBeVisible({ timeout: 20_000 });
});

test('the built files contain no addresses of other servers', () => {
  // These appear inside library code as names or help links. They are never opened by the app.
  const allowed = [
    'http://www.w3.org/', // names of the SVG and XML formats
    'https://react.dev/errors/', // link printed in a React error message
    'https://bit.ly/wb-precache', // link printed in a Workbox error message
  ];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(js|css|html|json|webmanifest|svg)$/.test(name)) {
        const text = readFileSync(path, 'utf8');
        for (const match of text.matchAll(/https?:\/\/[A-Za-z0-9./_?=#%:-]+/g)) {
          if (!allowed.some((a) => match[0].startsWith(a))) found.push(`${name}: ${match[0]}`);
        }
      }
    }
  };
  walk('dist');
  expect(found).toEqual([]);
});
