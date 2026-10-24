// Chromium browser QA for an isolated signed-in LTC account, READ ONLY.
// A local synthetic fixture is mandatory; missing data fails rather than skips.
const {test,expect}=require('@playwright/test');
const {readBanksFixture}=require('../scripts/qa/banks-fixture.cjs');
const fixture=readBanksFixture();
const viewports=[{width:390,height:844},{width:1440,height:900},{width:1728,height:960}];

async function onBanks(page) {
  await page.goto('/bancos',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Mis bancos'})).toBeVisible({timeout:30000});
}
async function showValues(page,visible) {
  const button=page.getByRole('button',{name:visible?'Mostrar importes de la pantalla':'Ocultar importes de la pantalla'});
  if(await button.count()) await button.click();
  await expect(page.getByRole('button',{name:visible?'Ocultar importes de la pantalla':'Mostrar importes de la pantalla'})).toBeVisible();
}
async function cardSection(page) {
  await onBanks(page);
  const bank=page.locator('#bank-management').getByRole('button',{name:new RegExp(fixture.bankName)}).first();
  await expect(bank,'Create the synthetic QA bank: '+fixture.bankName).toBeVisible();
  if(await bank.getAttribute('aria-expanded')==='false') await bank.click();
  const card=page.locator('#bank-management').getByRole('button',{name:new RegExp(fixture.cardName)}).first();
  await expect(card,'Create the synthetic QA card: '+fixture.cardName).toBeVisible();
  if(await card.getAttribute('aria-expanded')==='false') await card.click();
}
async function linked(page) {
  await cardSection(page);
  const item=page.getByRole('article',{name:'Resumen vinculado '+fixture.linkedPeriod+' Visa'}).first();
  await expect(item,'Seed a linked synthetic Visa statement '+fixture.linkedPeriod).toBeVisible();
  return item;
}
async function setDark(page,dark) {
  const current=await page.locator('html').evaluate(node=>node.classList.contains('dark'));
  if(current!==dark) await page.getByRole('button',{name:dark?'Usar tema oscuro':'Usar tema claro'}).click();
  await expect.poll(()=>page.locator('html').evaluate(n=>n.classList.contains('dark'))).toBe(dark);
}

for(const viewport of viewports) {
  for(const theme of ['light','dark']) {
    test('Banks PDF '+viewport.width+'px '+theme+': masked keyboard review and overflow',async({page},info)=>{
      await page.setViewportSize(viewport);
      const article=await linked(page);
      await setDark(page,theme==='dark');
      await showValues(page,false);
      await expect(article.getByLabel('Totales del resumen vinculado por moneda')).toHaveText('ARS •••• · USD ••••');
      const review=article.getByRole('button',{name:'Revisar resumen'});
      await review.focus();
      await page.keyboard.press('Enter');
      const open=article.getByRole('button',{name:'Ocultar opciones'});
      await expect(open).toHaveAttribute('aria-expanded','true');
      await expect(article.getByRole('button',{name:'Ver consumos del resumen'})).toHaveCount(0);
      await page.screenshot({path:info.outputPath('banks-linked-'+viewport.width+'-'+theme+'-masked.png'),
        fullPage:true,animations:'disabled'});
      const width=await page.evaluate(()=>document.documentElement.scrollWidth);
      expect(width,'no horizontal overflow').toBeLessThanOrEqual(viewport.width+1);
      const rect=await open.boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(43.5);
      expect(rect.width).toBeGreaterThanOrEqual(43.5);
    });
  }
}

test('Banks PDF: ARS/USD filter, merchant search and immediate privacy masking, no writes',async({page})=>{
  const article=await linked(page);
  await showValues(page,true);
  await article.getByRole('button',{name:'Revisar resumen'}).click();
  await article.getByRole('button',{name:'Ver consumos del resumen'}).click();
  const merchant=article.getByText(fixture.linkedMerchant,{exact:true});
  await expect(merchant,'Seed a PDF consumption '+fixture.linkedMerchant).toBeVisible();
  await article.getByRole('group',{name:'Filtrar consumos por moneda'})
    .getByRole('button',{name:'Filtrar consumos: '+fixture.linkedCurrency}).click();
  await expect(merchant).toBeVisible();
  const search=article.getByRole('searchbox',{name:'Buscar consumos del resumen'});
  await search.fill('LTC QA unmatched-text-8c1f4df2');
  await expect(merchant).toHaveCount(0);
  await search.fill(fixture.linkedMerchant);
  await expect(merchant).toBeVisible();
  await showValues(page,false);
  await expect(article.getByLabel('Totales del resumen vinculado por moneda')).toHaveText('ARS •••• · USD ••••');
  await expect(article.getByRole('searchbox',{name:'Buscar consumos del resumen'})).toHaveCount(0);
  await expect(article.getByText(fixture.linkedMerchant,{exact:true})).toHaveCount(0);
});

test('Banks PDF: pending statement can be reviewed and cancelled without any write',async({page})=>{
  await onBanks(page);
  const pending=page.getByRole('article',{name:'Resumen pendiente '+fixture.pendingPeriod});
  await expect(pending,'Seed a pending synthetic Visa PDF '+fixture.pendingPeriod).toBeVisible();
  await pending.getByRole('button',{name:'Revisar vínculo'}).click();
  await pending.getByLabel('Banco para '+fixture.pendingPeriod).selectOption({label:fixture.bankName});
  const card=pending.getByLabel('Tarjeta para '+fixture.pendingPeriod);
  const cardValue=await card.locator('option').filter({hasText:fixture.cardName}).first().getAttribute('value');
  expect(cardValue).toBeTruthy();
  await card.selectOption(cardValue);
  await pending.getByRole('button',{name:'Revisar asociación'}).click();
  const modal=page.getByRole('dialog',{name:'Confirmar vínculo del resumen '+fixture.pendingPeriod});
  await expect(modal).toContainText(fixture.bankName);
  await expect(modal).toContainText(fixture.cardName);
  await modal.getByRole('button',{name:'Cancelar'}).click();
  await expect(modal).toHaveCount(0);
  await expect(pending).toBeVisible();
  await expect(card).toHaveValue(cardValue);
});

test('Banks PDF: link correction and unlink confirmation are cancelled, never committed',async({page})=>{
  const article=await linked(page);
  await article.getByRole('button',{name:'Revisar resumen'}).click();
  await article.getByRole('button',{name:'Corregir vínculo del resumen '+fixture.linkedPeriod}).click();
  const modal=page.getByRole('dialog',{name:'Corregir vínculo del resumen '+fixture.linkedPeriod});
  await expect(modal).toBeVisible();
  await modal.getByRole('button',{name:'Desvincular resumen'}).click();
  await expect(modal.getByRole('button',{name:'Sí, desvincular'})).toBeVisible();
  await modal.getByRole('button',{name:'Mantener asociación'}).click();
  await expect(modal.getByRole('button',{name:'Sí, desvincular'})).toHaveCount(0);
  await modal.getByRole('button',{name:'Cancelar'}).click();
  await expect(modal).toHaveCount(0);
});

test('Banks PDF: import UI can be opened and closed without uploading or writing',async({page})=>{
  await cardSection(page);
  await page.getByRole('button',{name:'Importar resumen PDF de esta tarjeta'}).click();
  const title=page.getByRole('heading',{name:'Analizar resumen PDF'});
  await expect(title).toBeVisible();
  await expect(page.getByLabel('Elegir resumen bancario en PDF')).toHaveAttribute('accept',/pdf/);
  await expect(page.getByRole('button',{name:'Guardar resumen revisado y vincular'})).toHaveCount(0);
  await title.locator('xpath=ancestor::section[1]').getByRole('button',{name:'Cerrar'}).click();
  await expect(title).toHaveCount(0);
});
