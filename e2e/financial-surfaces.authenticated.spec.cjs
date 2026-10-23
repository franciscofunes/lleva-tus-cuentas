// Authenticated, isolated-user VISUAL QA. All operations are read-only:
// navigation, visual privacy toggle, theme toggle, non-destructive disclosure
// and open/close Lita. Never import/modify financial records here.
const { test, expect } = require('@playwright/test');
const { writeFileSync } = require('node:fs');
const { surfaces, viewports, themes, inspectOrder, findSmallTargets } =
  require('../scripts/qa/financial-surfaces.cjs');

const layoutOrder = surfaces.map(({ key, path }) => ({ key, path }));

async function ready(page, surface) {
  await page.goto(surface.path, { waitUntil:'domcontentloaded' });
  const hero = page.getByRole('heading', { name:surface.heading, exact:true });
  await expect(hero).toBeVisible({timeout:30_000});
  for (const selector of surface.requiredSections) {
    await expect(page.locator(selector)).toBeVisible({timeout:30_000});
  }
  return hero.locator('xpath=ancestor::section[1]');
}

async function themeTo(page, desired) {
  const dark = desired === 'dark';
  const isDark = await page.locator('html').evaluate(node => node.classList.contains('dark'));
  if (dark !== isDark) {
    await page.getByRole('button', { name:dark ? 'Usar tema oscuro' : 'Usar tema claro' }).click();
  }
  await expect.poll(() => page.locator('html').evaluate(node => node.classList.contains('dark'))).toBe(dark);
}

async function showMasked(page) {
  const visible = page.getByRole('button', {name:'Ocultar importes de la pantalla'});
  if (await visible.count()) await visible.click();
  await expect(page.getByRole('button', { name:'Mostrar importes de la pantalla' })).toBeVisible();
}

async function collect(page, surface) {
  return page.evaluate(({ selectors, activitySelector }) => {
    const rect = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
    };
    const sectionRects = Object.fromEntries(selectors.map(selector =>
      [selector,rect(document.querySelector(selector))]));
    const title = document.querySelector('h1');
    const hero = title?.closest('section');
    const action = [...(hero?.querySelectorAll('button') || [])].find(button =>
      /Agregar (movimiento|banco|posición)/.test(button.textContent || ''));
    const privacy = [...(hero?.querySelectorAll('button') || [])].find(button =>
      /importes de la pantalla/.test(button.getAttribute('aria-label') || ''));
    const css = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      return {backgroundColor:style.backgroundColor, borderRadius:style.borderRadius,
        borderColor:style.borderColor, color:style.color, fontSize:style.fontSize};
    };
    const touchNodes = [action,privacy,hero?.querySelector('summary'),
      document.querySelector(activitySelector + ' button[aria-expanded]')].filter(Boolean);
    const touchTargets = touchNodes.map(node => {
      const r = node.getBoundingClientRect();
      return { name: node.getAttribute('aria-label') || node.textContent?.trim().slice(0,48) || '',
        width:r.width, height:r.height, visible:r.width>0 && r.height>0};
    });
    return {
      viewportWidth:window.innerWidth, scrollWidth:document.documentElement.scrollWidth,
      bodyScrollWidth:document.body.scrollWidth,
      sections:sectionRects, hero:rect(hero),
      tokenSamples:{hero:css(hero),action:css(action),privacy:css(privacy)},
      touchTargets,
    };
  }, {selectors:surface.requiredSections, activitySelector:surface.activity});
}

for (const surface of surfaces) {
  for (const viewport of viewports) {
    for (const theme of themes) {
      test(surface.key + ' ' + viewport.width + 'px ' + theme + ': masked visual + geometry', async ({page}, info) => {
        await page.setViewportSize(viewport);
        const hero=await ready(page,surface);
        await themeTo(page,theme);
        await showMasked(page);
        const primary=hero.getByRole('button',{name:surface.primaryAction});
        await expect(primary).toBeVisible();
        expect(await primary.boundingBox()).not.toBeNull();
        const current=await collect(page,surface);
        const out={
          route:surface.path,theme,width:viewport.width,height:viewport.height,
          capturedAt:new Date().toISOString(),
          ...current,
        };
        writeFileSync(info.outputPath('geometry.json'),JSON.stringify(out,null,2));
        expect(current.scrollWidth,'no document horizontal overflow').toBeLessThanOrEqual(viewport.width+1);
        expect(current.bodyScrollWidth,'no body horizontal overflow').toBeLessThanOrEqual(viewport.width+1);
        expect(findSmallTargets(current.touchTargets),'shared controls must be >=44px').toEqual([]);
        for (const rect of Object.values(current.sections)) expect(rect).not.toBeNull();
        // The screenshot is local/ignored. The app's own privacy mask is enabled.
        await page.screenshot({path:info.outputPath(surface.key+'-'+viewport.width+'-'+theme+'.png'),
          fullPage:true,animations:'disabled'});
      });
    }
  }
}

for (const surface of surfaces) {
  test(surface.key+': scan order matches Transactions summary -> activity -> secondary tools',async ({page})=>{
    const hero=await ready(page,surface);
    await showMasked(page);
    await expect(hero.getByRole('button',{name:surface.primaryAction})).toBeVisible();
    const positions=await page.evaluate(selectors=>selectors.map(selector=>{
      const node=document.querySelector(selector);
      if (!node) return null;
      // DOM scan order is the source for screen readers and 390px layout.
      const all=document.querySelectorAll('*');
      return Array.prototype.indexOf.call(all,node);
    }),surface.sequence);
    expect(inspectOrder(positions),'mobile DOM/read order').toBe(true);
  });
}

test('shared hero + action tokens are EXACTLY equal across all financial pages',async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const design=[];
  for(const surface of surfaces) {
    await ready(page,surface);
    await themeTo(page,'dark');
    await showMasked(page);
    const read=await collect(page,surface);
    design.push({route:surface.path,tokenSamples:read.tokenSamples});
  }
  const baseline=design[0].tokenSamples;
  for(const other of design.slice(1)) {
    expect(other.tokenSamples.hero,'same shared hero surface '+other.route).toEqual(baseline.hero);
    expect(other.tokenSamples.action,'same primary action '+other.route).toEqual(baseline.action);
    expect(other.tokenSamples.privacy,'same privacy control '+other.route).toEqual(baseline.privacy);
  }
});

for (const surface of surfaces) {
  test(surface.key+': Lita can open/expand/close without creating financial data',async ({page},info)=>{
    await page.setViewportSize({width:390,height:844});
    await ready(page,surface);
    await themeTo(page,'dark');
    await showMasked(page);
    await page.getByRole('button',{name:'Abrir acciones rápidas'}).click();
    await page.getByRole('button',{name:'Preguntar a LITA'}).click();
    const dialog=page.getByRole('dialog',{name:'Chat de LTC$'});
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal','true');
    await expect(dialog.getByRole('button',{name:'Cerrar LITA'})).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Expandir LITA a pantalla completa'})).toBeVisible();
    const iframe=dialog.locator('iframe[title="Lita Assistant"]');
    await expect(iframe).toHaveCount(1);
    await dialog.getByRole('button',{name:'Expandir LITA a pantalla completa'}).click();
    await expect(dialog.getByRole('button',{name:'Restaurar tamaño de LITA'})).toBeVisible();
    await expect(iframe).toHaveCount(1);
    await page.screenshot({path:info.outputPath('lita-'+surface.key+'-390-dark.png'),
      animations:'disabled',fullPage:false});
    await dialog.getByRole('button',{name:'Cerrar LITA'}).click();
    await expect(dialog).toHaveCount(0);
  });
}
