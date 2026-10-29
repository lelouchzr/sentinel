import { expect, test, type Page } from '@playwright/test';

async function prepareLocalSession(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ou essayer 5 expressions d’exemple' }).click();
  await page.getByRole('button', { name: 'Vérifier le vocabulaire' }).click();
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  await page.getByRole('button', { name: 'Entraînement local Guidé' }).click();
  await page.getByRole('button', { name: 'Commencer l’entraînement local' }).click();
}

for (const lateGrant of [false, true]) {
  test(`pending microphone permission can be cancelled${lateGrant ? ' and a late grant releases its tracks' : ' without blocking written conversation'}`, async ({
    page,
    request,
  }) => {
    expect((await (await request.get('/api/status')).json()).aiEnabled).toBe(false);
    const writes: string[] = [];
    await page.route('**/api/**', async (route) => {
      if (route.request().method() !== 'GET') {
        writes.push(route.request().url());
        await route.abort();
      } else await route.continue();
    });
    await page.addInitScript(() => {
      type RecoveryWindow = Window & {
        grantIgnoredPermission?: () => void;
        releasedTracks?: number;
      };
      const testWindow = window as RecoveryWindow;
      testWindow.releasedTracks = 0;
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: () =>
          new Promise<MediaStream>((resolve) => {
            // No physical microphone or media device is accessed by this test.
            testWindow.grantIgnoredPermission = () =>
              resolve({
                getTracks: () => [
                  {
                    stop: () => {
                      testWindow.releasedTracks!++;
                    },
                  },
                ],
              } as unknown as MediaStream);
          }),
      });
    });
    await prepareLocalSession(page);
    await page.getByRole('button', { name: 'À vous de parler' }).click();
    await expect(page.getByRole('button', { name: 'Accès au micro…' })).toBeDisabled();
    await expect(page.getByPlaceholder('Votre réponse…')).toBeDisabled();
    await page.getByRole('button', { name: 'Continuer à l’écrit' }).click();
    await expect(page.getByPlaceholder('Votre réponse…')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Continuer à l’écrit' })).toHaveCount(0);
    if (lateGrant) {
      await page.evaluate(() =>
        (window as Window & { grantIgnoredPermission?: () => void }).grantIgnoredPermission?.(),
      );
      await expect
        .poll(() =>
          page.evaluate(() => (window as Window & { releasedTracks?: number }).releasedTracks),
        )
        .toBe(1);
      await expect(page.getByRole('button', { name: 'À vous de parler' })).toBeEnabled();
      await expect(page.locator('.conversation-controls .error-message')).toHaveCount(0);
    }
    await page.getByPlaceholder('Votre réponse…').fill('안녕하세요.');
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(page.getByPlaceholder('Votre réponse…')).toHaveValue('');
    await expect(page.getByText('안녕하세요.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Terminer et voir mon bilan' }).click();
    await expect(page.getByText('Non évalué', { exact: true })).toHaveCount(3);
    expect(writes).toEqual([]);
  });
}
