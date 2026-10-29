import { expect, test, type Page } from '@playwright/test';

const forbiddenCalls = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  const statusResponse = await request.get('/api/status');
  expect(statusResponse.ok()).toBe(true);
  const status = await statusResponse.json();
  // Stop immediately if an existing local server has live AI enabled.
  expect(status.aiEnabled, 'Run browser tests with AI_ENABLED=false.').toBe(false);
  const blocked: string[] = [];
  forbiddenCalls.set(page, blocked);
  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'GET') {
      blocked.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Importer mes mots', exact: true })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  // These journeys must never attempt a billable operation or fabricate an AI response.
  expect(forbiddenCalls.get(page)).toEqual([]);
});

async function samplePreview(page: Page) {
  await page.getByRole('button', { name: 'Ou essayer 5 expressions d’exemple' }).click();
  await page.getByRole('button', { name: 'Vérifier le vocabulaire' }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Vérifiez vos expressions.' }),
  ).toBeVisible();
}

async function storedItems(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('language-speaking-library-v1');
    return raw
      ? JSON.parse(raw).collections.flatMap((collection: { items: unknown[] }) => collection.items)
      : [];
  });
}

test('sample vocabulary is editable, confirmed explicitly, persisted and available for recall', async ({
  page,
}) => {
  await samplePreview(page);
  expect(await storedItems(page)).toEqual([]);
  await page.getByRole('textbox', { name: 'Sens 1', exact: true }).fill('emprunter un objet');
  await expect(
    page.getByRole('dialog').getByText('Modifié par vous', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const library = page.getByRole('region', { name: 'Bibliothèque de vocabulaire' });
  await expect(library.getByRole('checkbox')).toHaveCount(5);
  await expect(library.locator('input[type=checkbox]:checked')).toHaveCount(3);
  const saved = await storedItems(page);
  expect(saved).toHaveLength(5);
  expect(saved[0]).toMatchObject({
    expression: '빌리다',
    meaning: 'emprunter un objet',
    provenance: { meaning: 'edited' },
  });
  await page.reload();
  await expect(page.getByText('emprunter un objet', { exact: true })).toBeVisible();
  await expect(library.locator('input[type=checkbox]:checked')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('library.png'), fullPage: true });
  await page.getByRole('button', { name: 'Un petit rappel avant de parler' }).click();
  const recall = page.getByRole('dialog');
  await expect(recall.getByRole('heading', { name: 'emprunter un objet' })).toBeVisible();
  await recall.getByRole('button', { name: 'Révéler l’expression' }).click();
  await expect(recall.getByText('빌리다', { exact: true })).toBeVisible();
  for (let index = 0; index < 2; index++) {
    await recall.getByRole('button', { name: 'Expression suivante' }).click();
    await recall.getByRole('button', { name: 'Révéler l’expression' }).click();
  }
  await recall.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(recall).not.toBeVisible();
  await page.getByRole('button', { name: 'Mes conversations', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre première conversation vous attend.' }),
  ).toBeVisible();
});

test('malformed FlashCardStudy JSON is rejected without creating vocabulary', async ({ page }) => {
  await page.getByRole('button', { name: 'Importer mes mots', exact: true }).click();
  await page.getByLabel('Source du vocabulaire').selectOption('flashcardstudy');
  await page
    .getByRole('textbox', { name: 'Collez votre export' })
    .fill('{"name":"Broken export","cards":[');
  await page.getByRole('button', { name: 'Vérifier le vocabulaire' }).click();
  await expect(page.locator('dialog').getByRole('alert')).toContainText('JSON');
  await expect(page.getByRole('button', { name: /Confirmer/ })).toHaveCount(0);
  expect(await storedItems(page)).toEqual([]);
});

test('FlashCardStudy fields can be mapped from French front to Korean back with the correct example', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Importer mes mots', exact: true }).click();
  const fixture = {
    name: 'Original browser fixture',
    source_lang: 'fr-FR',
    target_lang: 'ko-KR',
    cards: [
      {
        front: 'emprunter',
        back: '빌리다',
        front_sentence: 'Je voudrais emprunter un stylo.',
        back_sentence: '펜을 빌리고 싶어요.',
      },
      { front: 'chargeur', back: '충전기' },
    ],
  };
  await page.getByLabel('Fichier de vocabulaire').setInputFiles({
    name: 'original-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByLabel('Source du vocabulaire')).toHaveValue('flashcardstudy');
  await page.getByRole('button', { name: 'Vérifier le vocabulaire' }).click();
  await expect(page.getByRole('dialog')).toContainText('fr-FR');
  await page.getByLabel('Expression en coréen').selectOption('1');
  await page.getByLabel('Sens en français').selectOption('0');
  await page.getByLabel('Exemple facultatif').selectOption('3');
  await expect(page.getByRole('textbox', { name: 'Expression 1', exact: true })).toHaveValue(
    '빌리다',
  );
  await expect(page.getByRole('textbox', { name: 'Sens 1', exact: true })).toHaveValue('emprunter');
  await expect(page.getByRole('textbox', { name: 'Exemple 1', exact: true })).toHaveValue(
    '펜을 빌리고 싶어요.',
  );
  await page.getByRole('button', { name: 'Confirmer 2 expressions', exact: true }).click();
  await expect(page.getByText('펜을 빌리고 싶어요.', { exact: true })).toBeVisible();
  expect((await storedItems(page))[0]).toMatchObject({
    expression: '빌리다',
    meaning: 'emprunter',
    example: '펜을 빌리고 싶어요.',
  });
});

test('unconfigured live conversation and photo extraction stay disabled while local imports work', async ({
  page,
}) => {
  await samplePreview(page);
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrer dans la conversation' })).toBeDisabled();
  await expect(
    page.getByRole('link', { name: 'Configurez les services et connectez-vous' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Importer du vocabulaire', exact: true }).click();
  await page.getByRole('button', { name: 'Page de livre', exact: true }).click();
  await expect(page.getByLabel('Photo de vocabulaire')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Vérifier le vocabulaire' })).toBeDisabled();
  await page.getByRole('button', { name: 'Fermer l’import' }).click();
  await page.getByRole('link', { name: 'Configurez les services et connectez-vous' }).click();
  await expect(page.getByRole('heading', { name: 'Votre espace, vos données.' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Appels IA activés' })).toContainText(
    'À configurer',
  );
});

test('empty edits cannot be confirmed until corrected', async ({ page }) => {
  await samplePreview(page);
  await page.getByRole('textbox', { name: 'Sens 1', exact: true }).fill('');
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  await expect(page.locator('dialog').getByRole('alert')).toContainText(
    'Les deux champs sont obligatoires',
  );
  expect(await storedItems(page)).toEqual([]);
  await page.getByRole('textbox', { name: 'Sens 1', exact: true }).fill('emprunter');
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  expect(await storedItems(page)).toHaveLength(5);
});

test('the mobile import dialog remains usable without page-level horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
  expect(await overflow()).toBe(false);
  await samplePreview(page);
  const dialog = page.getByRole('dialog');
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(390);
  // Wide preview columns may scroll inside their container, never the entire page.
  await page.getByRole('textbox', { name: 'Sens 5', exact: true }).fill('un petit instant');
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('un petit instant', { exact: true })).toBeVisible();
  expect(await overflow()).toBe(false);
  await page.getByRole('button', { name: 'Un petit rappel avant de parler' }).click();
  await page.getByRole('button', { name: 'Révéler l’expression' }).click();
  await expect(page.getByRole('dialog').getByText('빌리다', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le rappel' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
