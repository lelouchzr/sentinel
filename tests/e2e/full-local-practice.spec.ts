import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const unexpectedWrites = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page, request }) => {
  expect((await (await request.get('/api/status')).json()).aiEnabled).toBe(false);
  const writes: string[] = [];
  unexpectedWrites.set(page, writes);
  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/');
});
test.afterEach(({ page }) => expect(unexpectedWrites.get(page)).toEqual([]));

async function importSample(page: Page) {
  await page.getByRole('button', { name: 'Ou essayer 5 expressions d’exemple' }).click();
  await page.getByRole('button', { name: 'Vérifier le vocabulaire' }).click();
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
}
async function startLocal(page: Page, scene = 'Demander quelque chose') {
  await importSample(page);
  await page.getByRole('button', { name: 'Entraînement local Guidé' }).click();
  await page.getByRole('button', { name: new RegExp(scene) }).click();
  await page.getByRole('button', { name: 'Commencer l’entraînement local' }).click();
  await expect(page.getByRole('button', { name: 'À vous de parler' })).toBeVisible();
}
async function respond(page: Page, text: string) {
  await page.getByPlaceholder('Votre réponse…').fill(text);
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(page.getByPlaceholder('Votre réponse…')).toHaveValue('');
}
async function noAccessibilityViolations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((n) => n.target) })),
  ).toEqual([]);
}

test('local conversation survives reload, keeps hints, invalidates corrected feedback and never updates oral evidence', async ({
  page,
}) => {
  await startLocal(page);
  await respond(page, '충전기를 잠깐 빌려도 될까요?');
  await page.getByRole('button', { name: 'Un coup de pouce ?' }).click();
  await page.getByRole('button', { name: 'Indice de sens', exact: true }).first().click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('language-speaking-practice-v1')!).entries[0].session
            .hints.length,
      ),
    )
    .toBe(1);
  await page.reload();
  await expect(page.getByText('충전기를 잠깐 빌려도 될까요?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Terminer et voir mon bilan' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Votre parcours, à votre rythme.',
  );
  await expect(page.getByText('Non évalué', { exact: true })).toHaveCount(3);
  await page
    .getByText('Relire la conversation et corriger une transcription', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Corriger cette phrase' }).click();
  await page.getByLabel('Corriger ma phrase').fill('펜을 잠깐 빌려도 될까요?');
  await page.getByRole('button', { name: 'Enregistrer et invalider le bilan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre bilan doit être recalculé.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Actualiser le récapitulatif' }).click();
  await expect(page.getByText('Non évalué', { exact: true })).toHaveCount(3);
  const history = await page.evaluate(
    () => JSON.parse(localStorage.getItem('language-speaking-library-v1')!).history,
  );
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ mode: 'local', status: 'completed' });
  expect(history[0].amendments).toHaveLength(1);
  expect(history[0].hints).toHaveLength(1);
  expect(
    history[0].feedback.observations.every(
      (entry: { evidence: unknown[] }) => entry.evidence.length === 0,
    ),
  ).toBe(true);
  await noAccessibilityViolations(page);
  await page.screenshot({ path: test.info().outputPath('local-feedback.png'), fullPage: true });
});

for (const scene of ['Prévoir un rendez-vous', 'Expliquer un problème']) {
  test(`the ${scene} scene reaches the eight-turn limit without a provider`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startLocal(page, scene);
    for (let index = 0; index < 8; index++) {
      await page.getByPlaceholder('Votre réponse…').fill(`네, 감사합니다. ${index + 1}`);
      await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
      if (index < 7) await expect(page.getByPlaceholder('Votre réponse…')).toHaveValue('');
    }
    await expect(
      page.getByRole('heading', { name: 'Une bonne pause pour faire le point.' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Envoyer', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
    await page.getByRole('button', { name: 'Terminer et voir mon bilan' }).click();
    await expect(page.getByText('Non évalué', { exact: true })).toHaveCount(3);
  });
}

test('collections can be created, edited, searched, exported, deleted and restored without losing their content', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Créer une collection' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Nom de la collection').fill('Mon quotidien');
  await editor.getByLabel('Expression 1', { exact: true }).fill('안녕하세요');
  await editor.getByLabel('Sens 1', { exact: true }).fill('bonjour');
  await editor.getByRole('button', { name: 'Enregistrer la collection' }).click();
  await expect(editor).not.toBeVisible();
  await page.getByRole('button', { name: 'Modifier cette collection' }).click();
  await editor.getByLabel('Nom de la collection').fill('Mes salutations');
  await editor.getByRole('button', { name: 'Ajouter une expression' }).click();
  await editor.getByLabel('Expression 2', { exact: true }).fill('감사합니다');
  await editor.getByLabel('Sens 2', { exact: true }).fill('merci');
  await editor.getByRole('button', { name: 'Enregistrer la collection' }).click();
  await page.getByLabel('Rechercher une expression').fill('merci');
  await expect(
    page.getByRole('region', { name: 'Bibliothèque de vocabulaire' }).getByRole('checkbox'),
  ).toHaveCount(1);
  await page.getByLabel('Rechercher une expression').fill('');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger une archive des données locales' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  expect(path).not.toBeNull();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Supprimer cette collection' }).click();
  await expect(page.getByLabel('Collection de vocabulaire')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restaurer une archive' }).click();
  await page.getByLabel('Archive Language Speaking').setInputFiles(path!);
  await page.getByRole('button', { name: 'Confirmer la restauration' }).click();
  await expect(page.getByLabel('Collection de vocabulaire').locator('option:checked')).toHaveText(
    'Mes salutations',
  );
  await expect(
    page.getByRole('region', { name: 'Bibliothèque de vocabulaire' }).getByRole('checkbox'),
  ).toHaveCount(2);
  await page.reload();
  await expect(page.getByText('감사합니다', { exact: true })).toBeVisible();
});

test('keyboard navigation and contrast remain accessible in the library, import, conversation and settings', async ({
  page,
}) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  await noAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Ou essayer 5 expressions d’exemple' }).click();
  await noAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Vérifier le vocabulaire' }).click();
  await noAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Confirmer 5 expressions', exact: true }).click();
  await page.getByRole('button', { name: 'Entraînement local Guidé' }).click();
  await page.getByRole('button', { name: 'Commencer l’entraînement local' }).click();
  await noAccessibilityViolations(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Votre espace, vos données.' })).toBeVisible();
  await noAccessibilityViolations(page);
});

test('denied microphone permission leaves the written path usable and records no oral success', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('Denied for test', 'NotAllowedError')),
    });
  });
  await page.reload();
  await startLocal(page);
  await page.getByRole('button', { name: 'À vous de parler' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'microphone' })).toBeVisible();
  await respond(page, '안녕하세요.');
  await page.getByRole('button', { name: 'Terminer et voir mon bilan' }).click();
  await expect(page.getByText('Non évalué', { exact: true })).toHaveCount(3);
});

test.describe('synthetic microphone', () => {
  test('records a short local clip, offers playback, and keeps the audio out of the backup', async ({
    page,
  }) => {
    // A real Web Audio stream exercises MediaRecorder without accessing any physical device.
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: async () => {
          const context = new AudioContext();
          const destination = context.createMediaStreamDestination();
          const oscillator = context.createOscillator();
          oscillator.connect(destination);
          oscillator.start();
          await context.resume();
          for (const track of destination.stream.getTracks()) {
            const stop = track.stop.bind(track);
            track.stop = () => {
              stop();
              oscillator.stop();
              void context.close();
            };
          }
          return destination.stream;
        },
      });
    });
    await page.reload();
    await startLocal(page);
    await page.getByRole('button', { name: 'À vous de parler' }).click();
    await expect(page.getByRole('button', { name: /Terminer · [1-9]s/ })).toBeVisible();
    await page.getByRole('button', { name: /Terminer ·/ }).click();
    const audio = page.getByLabel('Écouter mon enregistrement local');
    await expect(audio).toBeVisible();
    await expect(audio).toHaveAttribute('src', /^blob:/);
    await respond(page, '네, 감사합니다.');
    await page.getByRole('button', { name: 'Terminer et voir mon bilan' }).click();
    await expect(page.getByText('Non évalué', { exact: true })).toHaveCount(3);
    const backup = await page.evaluate(() => localStorage.getItem('language-speaking-library-v1'));
    expect(backup).not.toContain('blob:');
    expect(backup).not.toContain('base64');
  });
});
