import { expect, test, type Page } from '@playwright/test';
import { completedSessionFixture, fixtureUserId } from '../session-fixtures';
import { amendSessionTranscript, flagSessionFeedback } from '../../src/lib/session-mutations';
import type { SpeakingSession } from '../../src/lib/contracts';

// Isolated HTTP fixtures exercise connected UI states. No request reaches a provider or database.
async function mockAccount(page: Page) {
  let session = completedSessionFixture();
  let collection = {
    id: '66666666-6666-4666-8666-666666666666',
    title: 'Mots du compte',
    items: session.setup.targets,
    revision: 1,
    createdAt: session.createdAt,
    updatedAt: session.createdAt,
  };
  let deleted = false;
  let conflict = true;
  const requests: string[] = [];
  const unexpected: string[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    requests.push(`${key}${url.search}`);
    const json = (value: unknown, status = 200) => route.fulfill({ json: value, status });
    if (key === 'GET /api/status')
      return json({
        storage: true,
        authenticated: true,
        userId: fixtureUserId,
        aiEnabled: true,
        meta: true,
        speech: false,
        localPractice: true,
      });
    if (key === 'GET /api/collections') return json({ collections: deleted ? [] : [collection] });
    if (key === 'GET /api/sessions')
      return json(
        url.searchParams.has('before')
          ? { sessions: [session], nextCursor: null }
          : { sessions: [], nextCursor: 'fixture-cursor' },
      );
    if (key === `GET /api/sessions/${session.id}`) return json(session);
    if (key === `PATCH /api/collections/${collection.id}`) {
      const body = request.postDataJSON();
      expect(body.revision).toBe(collection.revision);
      collection = { ...collection, ...body, revision: collection.revision + 1 };
      return json(collection);
    }
    if (key === `DELETE /api/collections/${collection.id}`) {
      deleted = true;
      return route.fulfill({ status: 204 });
    }
    if (key === `POST /api/sessions/${session.id}/feedback/flags`) {
      if (conflict) {
        conflict = false;
        session = { ...session, revision: 5, feedbackRevision: 5 };
        return json(
          {
            error: {
              code: 'SESSION_CONFLICT',
              message: 'Cette conversation a changé. Rechargez-la.',
              retry: 'none',
            },
          },
          409,
        );
      }
      const body = request.postDataJSON();
      session = flagSessionFeedback(session, body);
      return json(session);
    }
    if (key === `PATCH /api/sessions/${session.id}/turns/learner-1`) {
      const body = request.postDataJSON();
      session = amendSessionTranscript(session, { ...body, turnId: 'learner-1' });
      return json(session);
    }
    if (key === 'GET /api/account')
      return json({ id: fixtureUserId, email: 'learner@example.test', deletionPending: false });
    if (key === 'GET /api/usage')
      return json({
        balanceVerified: false,
        providers: [
          {
            provider: 'meta',
            estimatedUsd: 0.002,
            heldUsd: 1,
            operationCount: 2,
            pendingCount: 0,
            unresolvedCount: 1,
            hasUnknownCharges: true,
          },
        ],
      });
    if (key === 'GET /api/account/export')
      return json({ version: 1, collections: [collection], sessions: [session], operations: [] });
    unexpected.push(key);
    return json({ error: { code: 'UNEXPECTED_TEST_REQUEST', message: key } }, 500);
  });
  return { requests, unexpected, getSession: (): SpeakingSession => session };
}

test('account collections update with revisions and paginated history stays out of device storage', async ({
  page,
}) => {
  const account = await mockAccount(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Mon compte', exact: true }).click();
  await expect(page.getByLabel('Collection de vocabulaire').locator('option:checked')).toHaveText(
    'Mots du compte',
  );
  await page.getByRole('button', { name: 'Modifier cette collection' }).click();
  await page.getByLabel('Nom de la collection').fill('Mots sauvegardés');
  await page.getByRole('button', { name: 'Enregistrer la collection' }).click();
  await expect(page.getByLabel('Collection de vocabulaire').locator('option:checked')).toHaveText(
    'Mots sauvegardés',
  );
  await page.getByRole('button', { name: /Mes conversations/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Demander un chargeur', exact: true }),
  ).toBeVisible();
  expect(account.requests).toContain('GET /api/sessions?before=fixture-cursor');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('language-speaking-library-v1') || '{"history":[]}')
          .history,
    ),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Pratiquer', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Supprimer cette collection' }).click();
  await expect(page.getByLabel('Collection de vocabulaire')).toHaveCount(0);
  expect(account.unexpected).toEqual([]);
});

test('feedback conflicts offer reload, flags survive transcript corrections and the old result disappears', async ({
  page,
}) => {
  const account = await mockAccount(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Mon compte', exact: true }).click();
  await page.getByRole('button', { name: /Mes conversations/ }).click();
  await page.getByRole('button', { name: 'Voir le bilan' }).click();
  await page.getByRole('button', { name: 'Ce retour me semble incorrect' }).first().click();
  await expect(
    page.getByText('Cette conversation a changé. Rechargez-la.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Recharger/ }).click();
  await page.getByRole('button', { name: 'Ce retour me semble incorrect' }).first().click();
  await expect(page.getByRole('button', { name: 'Retour signalé', exact: true })).toBeDisabled();
  await page
    .getByText('Relire la conversation et corriger une transcription', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Corriger cette phrase' }).click();
  await page.getByLabel('Corriger ma phrase').fill('펜을 빌려도 될까요?');
  await page.getByRole('button', { name: 'Enregistrer et invalider le bilan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre bilan doit être recalculé.' }),
  ).toBeVisible();
  expect(account.getSession().feedback).toBeUndefined();
  expect(account.getSession().feedbackFlags).toHaveLength(1);
  expect(account.unexpected).toEqual([]);
});

test('account settings expose unknown charges and export the complete account without claiming a provider balance', async ({
  page,
}) => {
  const account = await mockAccount(page);
  await page.goto('/settings');
  await expect(
    page.getByText('Connecté avec learner@example.test.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('1 opération(s) à vérifier avant toute nouvelle tentative.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Certaines charges restent inconnues', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Le solde réel des comptes fournisseurs n’est pas vérifié ici.', {
      exact: false,
    }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter mon compte' }).click();
  expect((await download).suggestedFilename()).toContain('account');
  await expect(
    page.getByRole('button', { name: 'Supprimer définitivement mon compte' }),
  ).toBeDisabled();
  expect(account.unexpected).toEqual([]);
});
