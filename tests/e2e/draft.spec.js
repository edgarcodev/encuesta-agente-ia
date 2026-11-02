import { test, expect } from '@playwright/test';

// ================================================================
// Helpers
// ================================================================

async function answerCurrentStep(page) {
  await page.waitForSelector('.question-area', { state: 'visible' });

  const hasRadio = (await page.locator('input[type="radio"]').count()) > 0;
  const hasCheckbox = (await page.locator('.options-group input[type="checkbox"]').count()) > 0;
  const hasTextarea = (await page.locator('textarea').count()) > 0;
  const hasText = (await page.locator('input[type="text"]').count()) > 0;

  if (hasRadio) {
    await page.locator('input[type="radio"]').first().check();
  } else if (hasCheckbox) {
    await page.locator('.options-group input[type="checkbox"]').first().check();
  } else if (hasTextarea) {
    await page.locator('textarea').fill('Respuesta de prueba E2E');
  } else if (hasText) {
    await page.locator('input[type="text"]').fill('Respuesta E2E');
  }
}

async function nextStep(page) {
  await page.getByRole('button', { name: /Siguiente|Enviar respuestas/ }).click();
}

// ================================================================
// E2E Tests — Draft save/restore flow
// ================================================================

test.describe('Draft E2E', () => {
  test('restores draft after page reload', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // Answer first 3 questions
    for (let i = 0; i < 3; i++) {
      await answerCurrentStep(page);
      await nextStep(page);
      await page.waitForTimeout(200);
    }

    // Verify draft was saved
    const draftInfo = await page.evaluate(() => {
      const raw = localStorage.getItem('megaremates_encuesta_borrador_compradores');
      if (!raw) return null;
      try {
        const d = JSON.parse(raw);
        return {
          answersCount: d.answers ? Object.keys(d.answers).length : 0,
          currentStepIndex: d.currentStepIndex,
        };
      } catch {
        return null;
      }
    });
    expect(draftInfo).not.toBeNull();
    expect(draftInfo.answersCount).toBeGreaterThan(0);

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });

    // Should show splash, click to start
    await expect(page.locator('#splashScreen')).toBeVisible();

    // Set up dialog handler BEFORE clicking (confirm is triggered by startSurvey)
    let dialogAccepted = false;
    page.on('dialog', async (dialog) => {
      console.log('Dialog triggered:', dialog.type(), dialog.message().substring(0, 50));
      if (dialog.type() === 'confirm') {
        await dialog.accept();
        dialogAccepted = true;
      }
    });
    await page.locator('#startSurveyBtn').click();

    // Wait for survey to render
    await page.waitForTimeout(1000);

    // Verify dialog was actually accepted
    expect(dialogAccepted).toBe(true);

    // Verify we're on the correct step (currentStepIndex=3 means p4)
    const questionText = await page.locator('.question-text').first().textContent();
    expect(questionText).toContain('4.'); // Should be on p4, not p1

    // Verify the draft was loaded by going back and checking answers are restored
    await page.getByRole('button', { name: '← Anterior' }).click();
    await page.waitForTimeout(500);

    // Now we should be on p3, and the checkbox should be checked
    const checkboxChecked =
      (await page.locator('.options-group input[type="checkbox"]:checked').count()) > 0;
    expect(checkboxChecked).toBe(true);
  });

  test('discards draft when user rejects resume', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // Answer first question
    await answerCurrentStep(page);
    await nextStep(page);
    await page.waitForTimeout(200);

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#splashScreen')).toBeVisible();
    await page.locator('#startSurveyBtn').click();

    // Reject resume dialog
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.waitForTimeout(500);

    // Should start at step 1
    const stepText = await page.locator('#stepCounter').textContent();
    expect(stepText).toContain('Paso 1');
  });

  test('does not show resume prompt after successful submission', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // Complete survey steps
    for (let i = 0; i < 60; i++) {
      await answerCurrentStep(page);
      await nextStep(page);
      await page.waitForTimeout(100);

      const hasSummary = (await page.locator('.summary').count()) > 0;
      if (hasSummary) break;
    }

    // Confirm and send
    if ((await page.locator('#consentCheckbox').count()) > 0) {
      await page.getByRole('button', { name: /Confirmar y enviar/ }).click();
    }

    await expect(page.getByText('¡Encuesta enviada correctamente!')).toBeVisible({
      timeout: 10000,
    });

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#splashScreen')).toBeVisible();
    await page.locator('#startSurveyBtn').click();

    // Should show "already completed", not resume prompt
    await expect(page.getByText('Ya has completado esta encuesta')).toBeVisible({ timeout: 5000 });
  });

  test('draft is isolated by survey type', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Start compradores survey and answer questions
    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // Answer first question
    await answerCurrentStep(page);
    await nextStep(page);
    await page.waitForTimeout(200);

    // Navigate to vendedores survey
    await page.goto('/?tipo=vendedores');
    await page.locator('#startSurveyBtn').click();

    // Should not show resume prompt for compradores draft
    // Vendedores should start fresh at step 1
    const stepText = await page.locator('#stepCounter').textContent();
    expect(stepText).toContain('Paso 1');
  });
});
