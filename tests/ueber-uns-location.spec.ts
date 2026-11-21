import { expect, test } from '@playwright/test';
import sharp from 'sharp';

test('the spotlight stays with the mouse across map pins and returns after hovering addresses', async ({ page }, testInfo) => {
  test.skip(!['desktop', 'webkit'].includes(testInfo.project.name), 'Mouse scenario');
  await page.goto('/ueber-uns/');
  const map = page.locator('#standort .loc-stage');
  const light = map.locator('.loc-lit');
  await map.scrollIntoViewIfNeeded();
  await map.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  const bounds = (await map.boundingBox())!;
  const point = { x: bounds.x + bounds.width * 0.7, y: bounds.y + bounds.height * 0.55 };
  const clip = { x: point.x - 24, y: point.y - 24, width: 48, height: 48 };
  const warmPixels = async () => {
    const rgb = await sharp(await page.screenshot({ clip, scale: 'css' })).removeAlpha().raw().toBuffer();
    let count = 0;
    for (let i = 0; i < rgb.length; i += 3) {
      if (rgb[i] > 125 && rgb[i] - rgb[i + 2] > 75) count++;
    }
    return count;
  };
  await page.mouse.move(1, 1);
  const unlit = await warmPixels();

  for (const pin of await map.locator('.loc-pin').all()) {
    const i = await pin.getAttribute('data-pin');
    const place = page.locator(`#standort .loc-place[data-pin="${i}"]`);
    await page.mouse.move(point.x, point.y);
    await expect.poll(warmPixels).toBeGreaterThan(unlit + 15);

    const pinBox = (await pin.boundingBox())!;
    await page.mouse.move(pinBox.x + pinBox.width / 2, pinBox.y + pinBox.height / 2);
    await expect(pin).toHaveClass(/is-hot/);
    await expect(place).toHaveClass(/is-hot/);
    await expect(light).toHaveCSS('opacity', '0.85');
    await expect.poll(async () => {
      const glow = (await light.locator('.loc-glow').boundingBox())!;
      return Math.hypot(glow.x + glow.width / 2 - pinBox.x - pinBox.width / 2,
        glow.y + glow.height / 2 - pinBox.y - pinBox.height / 2);
    }).toBeLessThan(3);

    await page.mouse.move(point.x, point.y);
    await expect(pin).not.toHaveClass(/is-hot/);
    await expect.poll(warmPixels).toBeGreaterThan(unlit + 15);

    const placeBox = (await place.boundingBox())!;
    await page.mouse.move(placeBox.x + placeBox.width / 2, placeBox.y + placeBox.height / 2);
    await expect(place).toHaveClass(/is-hot/);
    await expect(light).toHaveCSS('opacity', '0');
    await page.mouse.move(point.x, point.y);
    await expect(place).not.toHaveClass(/is-hot/);
    await expect.poll(warmPixels).toBeGreaterThan(unlit + 15);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(light).toHaveCSS('display', 'none');
});

test('a trusted touch previews a map pin and release clears both highlights', async ({ page }, testInfo) => {
  test.skip(!['mobile', 'mobile-webkit'].includes(testInfo.project.name), 'Touch scenario');
  await page.goto('/ueber-uns/');
  const map = page.locator('#standort .loc-stage');
  const pin = map.locator('.loc-pin').first();
  await pin.scrollIntoViewIfNeeded();
  await map.evaluate((stage) => {
    // Read after the component handles each event. A browser tap can finish before the test runner regains control.
    const log = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      const label = [event.type, event.pointerType, event.isTrusted,
        stage.classList.contains('is-lit'), target.classList.contains('is-hot')].join('/');
      stage.setAttribute('data-test-input', [stage.getAttribute('data-test-input'), label].filter(Boolean).join(' '));
    };
    document.addEventListener('pointerdown', log, { once: true });
    document.addEventListener('pointerup', log, { once: true });
  });
  const box = (await pin.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(map).toHaveAttribute('data-test-input', 'pointerdown/touch/true/true/true pointerup/touch/true/true/false');
  await expect(map.locator('.loc-lit')).toHaveCSS('opacity', '0');
  await expect(page.locator('#standort .is-hot')).toHaveCount(0);
});

test('a vertical touch gesture scrolls the page and cancels the map preview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch drag requires Chromium CDP');
  await page.goto('/ueber-uns/');
  const map = page.locator('#standort .loc-stage');
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  const start = { x: Math.round(box.x + box.width * 0.7), y: Math.round(box.y + box.height * 0.8) };
  const before = await page.evaluate(() => window.scrollY);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await expect(map.locator('.loc-lit')).toHaveCSS('opacity', '0.85');
  for (const delta of [24, 56, 100, 150, 200]) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: start.x, y: start.y - delta }],
    });
  }
  // Check before releasing the finger. The browser should have taken over the gesture.
  await expect(map).not.toHaveClass(/is-lit/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 30);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
});
