// Real Chromium checks against an authenticated, isolated test account.
// This suite is READ-ONLY; never perform create/edit/delete on production data.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function ready(page) {
  await page.goto('/transacciones');
  await expect(page.locator('#transactions-scope')).toBeVisible();
  await expect(page.getByRole('searchbox', { name:'Buscar movimientos' })).toBeEnabled({ timeout:30000 });
  const list = page.locator('#transactions-list');
  const listDisclosure = list.locator('button[aria-expanded]').first();
  if (await listDisclosure.getAttribute('aria-expanded') === 'false') await listDisclosure.click();
}

async function showTheme(page, dark) {
  const isDark = await page.locator('html').evaluate(el => el.classList.contains('dark'));
  if (dark !== isDark) {
    await page.getByRole('button', { name: dark ? 'Usar tema oscuro' : 'Usar tema claro' }).click();
  }
  await expect.poll(() => page.locator('html').evaluate(el => el.classList.contains('dark'))).toBe(dark);
}

async function maskMoney(page) {
  const hide = page.getByRole('button', { name:'Ocultar importes de la pantalla' });
  if (await hide.count()) await hide.click();
  await expect(page.getByRole('button', { name:'Mostrar importes de la pantalla' })).toBeVisible();
}

const viewports = [
  { width:390, height:844 },
  { width:1440, height:900 },
  { width:1728, height:960 },
];

for (const viewport of viewports) {
  for (const theme of ['light', 'dark']) {
    test(`Transactions screenshot ${viewport.width}px ${theme}, private amounts masked`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      await ready(page);
      await showTheme(page, theme === 'dark');
      await maskMoney(page);

      const geometry = await page.evaluate(() => {
        const selectors = ['#transactions-scope','#transactions-summary','#transactions-list','#transactions-charts','#transactions-overview'];
        const blocks = Object.fromEntries(selectors.map(selector => {
          const node = document.querySelector(selector), rect = node?.getBoundingClientRect();
          return [selector, rect && { x:rect.x, y:rect.y, width:rect.width, height:rect.height }];
        }));
        const scopeButtons = [...document.querySelectorAll('#transactions-scope button')].map(button => {
          const rect = button.getBoundingClientRect();
          return { name:button.getAttribute('aria-label') || button.textContent.trim().slice(0,60),
            width:rect.width,height:rect.height };
        });
        return {viewportWidth:window.innerWidth, scrollWidth:document.documentElement.scrollWidth, blocks,
          smallScopeTargets:scopeButtons.filter(b => b.width > 0 && b.height > 0 && (b.width < 43.5 || b.height < 43.5))};
      });
      fs.writeFileSync(info.outputPath(`layout-${viewport.width}-${theme}.json`), JSON.stringify(geometry,null,2));
      expect(geometry.scrollWidth, 'no horizontal overflow').toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.smallScopeTargets, '44px controls in period and search toolbar').toEqual([]);
      await page.screenshot({ path:info.outputPath(`transacciones-${viewport.width}-${theme}.png`),
        fullPage:true, animations:'disabled' });
    });
  }
}

test('authenticated search, filter chips, keyboard and explicit all-history action', async ({ page }) => {
  await ready(page);
  const search=page.getByRole('searchbox', { name:'Buscar movimientos' });
  if (!(await page.locator('#transactions-list [role="article"]').count())) {
    throw new Error('Seed an isolated QA user with at least one synthetic transaction in the selected month to verify filtering.');
  }
  await search.fill('LTCSyntheticUnmatchedQueryForQA');
  await expect(page.getByRole('button', { name:'Quitar filtro de búsqueda' })).toBeVisible();
  await expect(page.getByText('No encontramos movimientos')).toBeVisible();
  await page.getByRole('button', { name:'Quitar filtro de búsqueda' }).click();
  await expect(search).toHaveValue('');
  // Narrowing and restoring search cannot silently expand the Firestore period to all history.
  await expect(page.getByRole('button', { name:'Mes' })).toHaveAttribute('aria-pressed','true');
  const toggle=page.getByRole('button', { name:'Expandir filtros avanzados y orden' });
  if (await toggle.count()) await toggle.click();
  await expect(page.getByLabel('Tipo de movimiento')).toBeVisible();
  await page.getByLabel('Tipo de movimiento').selectOption('expense');
  await expect(page.getByRole('button', { name:'Quitar filtro de tipo' })).toBeVisible();
  await page.getByRole('button', { name:'Quitar filtro de tipo' }).click();
  await expect(page.getByLabel('Tipo de movimiento')).toHaveValue('all');
});

test('navigation and per-card disclosure are keyboard accessible, without financial writes', async ({page}, info) => {
  await ready(page);
  const list=page.locator('#transactions-list');
  const expandList=list.getByRole('button', { name:/Transacciones/ }).first();
  if (await expandList.getAttribute('aria-expanded') === 'false') await expandList.click();
  const detail=list.getByRole('button', { name:/Ver detalles de / }).first();
  if (await detail.count()) {
    await detail.focus();
    await page.keyboard.press('Enter');
    await expect(list.getByRole('button', { name:/Ocultar detalles de / }).first()).toHaveAttribute('aria-expanded','true');
  } else {
    info.annotations.push({ type:'coverage-gap', description:'No synthetic transaction with extra details; seed a dedicated QA account.' });
  }
  await page.goto('/bancos');
  await expect(page.getByRole('heading', { name:'Mis bancos' })).toBeVisible();
  await page.goto('/portfolio');
  await expect(page.locator('main').first()).toBeVisible();
});

test('edit and delete dialogs can be opened and safely cancelled, with no writes', async ({page}, info) => {
  await ready(page);
  const card = page.locator('#transactions-list [role="article"]').first();
  if (!(await card.count())) {
    info.annotations.push({ type:'coverage-gap', description:'No test movement present; cannot verify edit/delete cancellation.' });
    return;
  }
  await card.getByRole('button', {name:/^Editar /}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.getByRole('button', {name:/^Eliminar /}).click();
  const confirmation = page.getByRole('dialog', {name:'Eliminar movimiento'});
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', {name:'Cancelar'}).click();
  await expect(confirmation).toHaveCount(0);
  await expect(card).toBeVisible();
});
