import { test, expect } from '@playwright/test';

// ================================================================
// Helpers
// ================================================================

/**
 * Fills a radio question by clicking the first option.
 */
async function selectRadio(page, labelText) {
  await page.getByLabel(labelText, { exact: false }).first().click();
}

/**
 * Fills a checkbox question — checks all available checkboxes.
 */
async function checkAllCheckboxes(page) {
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  for (const cb of checkboxes) {
    const isChecked = await cb.isChecked();
    if (!isChecked) await cb.check();
  }
}

/**
 * Fills a text/textarea input.
 */
async function fillText(page, text) {
  const input = page.locator('input[type="text"], textarea');
  await input.fill(text);
}

/**
 * Clicks "Siguiente →" button.
 */
async function nextStep(page) {
  await page.getByRole('button', { name: /Siguiente|Enviar respuestas/ }).click();
}

/**
 * Answers the current visible step based on its type.
 */
async function answerCurrentStep(page) {
  // Wait for the step to render
  await page.waitForSelector('.question-area', { state: 'visible' });

  // Determine step type by looking at the inputs
  const hasRadio = (await page.locator('input[type="radio"]').count()) > 0;
  const hasCheckbox = (await page.locator('input[type="checkbox"]').count()) > 0;
  const hasText = (await page.locator('input[type="text"]').count()) > 0;
  const hasTextarea = (await page.locator('textarea').count()) > 0;

  if (hasRadio) {
    // Click the first radio option
    const firstRadio = page.locator('input[type="radio"]').first();
    await firstRadio.click();
  } else if (hasCheckbox) {
    // Check the first checkbox (skip the privacy consent checkbox which has a different context)
    const questionCheckboxes = page.locator('.options-group input[type="checkbox"]');
    const count = await questionCheckboxes.count();
    if (count > 0) {
      await questionCheckboxes.first().check();
    }
  } else if (hasTextarea) {
    await page.locator('textarea').fill('Respuesta de prueba E2E');
  } else if (hasText) {
    await page.locator('input[type="text"]').fill('Respuesta E2E');
  }
}

/**
 * Goes through all visible steps, answering each one.
 */
async function completeSurveySteps(page) {
  let maxSteps = 50; // safety limit
  while (maxSteps-- > 0) {
    await answerCurrentStep(page);
    const btn = page.getByRole('button', { name: /Siguiente|Enviar respuestas/ });
    const btnText = await btn.textContent();
    await nextStep(page);

    if (btnText?.includes('Enviar respuestas')) {
      // Last step reached, go to summary
      break;
    }

    // Check if we got to the summary (no more question-area)
    const questionArea = page.locator('.question-area');
    if ((await questionArea.count()) === 0) break;
  }
}

// ================================================================
// E2E Tests
// ================================================================

test.describe('Survey E2E', () => {
  test('completes full buyers survey flow', async ({ page }) => {
    // Intercept API call
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=compradores');

    // Splash screen should be visible
    await expect(page.locator('#splashScreen')).toBeVisible();

    // Click "Comenzar encuesta"
    await page.locator('#startSurveyBtn').click();

    // App should be visible, splash hidden
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#splashScreen')).toBeHidden();

    // Complete all survey steps
    await completeSurveySteps(page);

    // Should reach the summary page
    await expect(page.locator('.summary')).toBeVisible();
    await expect(page.locator('#consentCheckbox')).toBeChecked();

    // Click "Confirmar y enviar"
    await page.getByRole('button', { name: /Confirmar y enviar/ }).click();

    // Should show success message
    await expect(page.getByText('¡Encuesta enviada correctamente!')).toBeVisible({
      timeout: 10000,
    });
  });

  test('completes full sellers survey flow', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=vendedores');

    // Splash screen should be visible
    await expect(page.locator('#splashScreen')).toBeVisible();

    // Click "Comenzar encuesta"
    await page.locator('#startSurveyBtn').click();

    // Complete all survey steps
    await completeSurveySteps(page);

    // Should reach the summary page
    await expect(page.locator('.summary')).toBeVisible();

    // Click "Confirmar y enviar"
    await page.getByRole('button', { name: /Confirmar y enviar/ }).click();

    // Should show success message
    await expect(page.getByText('¡Encuesta enviada correctamente!')).toBeVisible({
      timeout: 10000,
    });
  });

  test('conditional steps appear/disappear based on answers', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // Navigate to p9 by answering previous steps
    // p1-p8 are "always: true", so just go through them
    for (let i = 0; i < 8; i++) {
      await answerCurrentStep(page);
      await nextStep(page);
    }

    // Now at p9 (radio). Answer "Sí, frecuentemente" to trigger p9_motivo
    await page.getByLabel('Sí, frecuentemente').click();

    // The change event triggers re-render; p9_motivo should now be the NEXT step
    await page.waitForTimeout(300);

    // Click Siguiente to go to p9_motivo
    await nextStep(page);

    // Wait for re-render and verify we're on p9_motivo
    await page.waitForSelector('.question-area', { state: 'visible' });
    const questionText = await page.locator('.question-text').textContent();
    expect(questionText).toContain('motivó');

    // Go back to p9
    await page.getByRole('button', { name: '← Anterior' }).click();
    await page.waitForTimeout(300);

    // Verify we're back at p9
    const questionText2 = await page.locator('.question-text').textContent();
    expect(questionText2).toContain('liquidación');

    // Answer "No" — this should skip p9_motivo
    await page.getByLabel('No').first().click();
    await page.waitForTimeout(300);

    // Click Siguiente — should skip p9_motivo and go to p10
    await nextStep(page);
    await page.waitForSelector('.question-area', { state: 'visible' });
    const questionText3 = await page.locator('.question-text').textContent();
    expect(questionText3).not.toContain('motivó');
    // p10 is about who/what the purchases are for
    expect(questionText3).toContain('compras');
  });

  test('prevents advancing without answering required fields', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // p2 is a radio question — try to advance without selecting
    // First go past p1 (checkbox)
    await answerCurrentStep(page); // check first checkbox of p1
    await nextStep(page);

    // Now at p2 (radio). Don't select anything, try to advance
    await nextStep(page);

    // Wait for alert to fire
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('Selecciona');
  });

  test('privacy unchecked does not send geo or metadata in payload', async ({ page }) => {
    let requestBody = null;

    await page.route('**/api/encuesta', async (route) => {
      requestBody = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();

    // Complete survey quickly
    await completeSurveySteps(page);

    // Uncheck privacy consent
    await page.locator('#consentCheckbox').uncheck();

    // Confirm and send
    await page.getByRole('button', { name: /Confirmar y enviar/ }).click();

    // Wait for the request to be intercepted
    await page.waitForResponse('**/api/encuesta');

    // Verify payload
    expect(requestBody).not.toBeNull();
    expect(requestBody.datos._metadata.tiempo_total_segundos).toBeDefined();
    // Should NOT have full metadata
    expect(requestBody.datos._metadata.fuente).toBeUndefined();
    expect(requestBody.datos._metadata.dispositivo).toBeUndefined();
    expect(requestBody.datos._metadata.navegador).toBeUndefined();
    expect(requestBody.datos._geo).toBeUndefined();
  });

  test('shows error for invalid survey type', async ({ page }) => {
    await page.goto('/?tipo=noexiste');

    await expect(page.getByText('Encuesta no disponible')).toBeVisible();
    await expect(page.getByText('noexiste')).toBeVisible();
    // Should have links to valid surveys
    await expect(page.getByRole('link', { name: 'Encuesta de compradores' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Encuesta de vendedores' })).toBeVisible();
  });

  test('shows "already completed" on second visit', async ({ page }) => {
    await page.route('**/api/encuesta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // First visit — complete the survey
    await page.goto('/?tipo=compradores');
    await page.locator('#startSurveyBtn').click();
    await completeSurveySteps(page);
    await page.getByRole('button', { name: /Confirmar y enviar/ }).click();
    await expect(page.getByText('¡Encuesta enviada correctamente!')).toBeVisible({
      timeout: 10000,
    });

    // Verify localStorage was set
    const stored = await page.evaluate(() => localStorage.getItem('megaremates_encuesta_enviada'));
    expect(stored).toBe('true');

    // Reload the page (keeps ?tipo=compradores in URL)
    await page.reload({ waitUntil: 'networkidle' });

    // Should show splash first, then "already completed" after clicking
    await expect(page.locator('#splashScreen')).toBeVisible({ timeout: 5000 });
    await page.locator('#startSurveyBtn').click();

    // Should show "already completed" message
    await expect(page.getByText('Ya has completado esta encuesta')).toBeVisible({ timeout: 10000 });
  });

  test('shows "proveedores coming soon" message', async ({ page }) => {
    await page.goto('/?tipo=proveedores');

    await expect(page.getByText('Encuesta en preparación')).toBeVisible();
    await expect(page.getByText('proveedores')).toBeVisible();
    // Should have links to other surveys
    await expect(page.getByRole('link', { name: 'Encuesta de compradores' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Encuesta de vendedores' })).toBeVisible();
  });
});
