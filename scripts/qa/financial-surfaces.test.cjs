const test=require('node:test');
const assert=require('node:assert/strict');
const {surfaces,viewports,themes,screenshotCount,inspectOrder,findSmallTargets}=require('./financial-surfaces.cjs');
test('matrix covers all three financial pages at 390, 1440 and 1728 in light and dark',()=>{
  assert.equal(screenshotCount,18);
  assert.deepEqual(surfaces.map(x=>x.path),['/transacciones','/bancos','/portfolio']);
  assert.deepEqual(viewports.map(x=>x.width),[390,1440,1728]);
  assert.deepEqual(themes,['light','dark']);
  for(const cfg of surfaces) {
    assert.equal(cfg.requiredSections.includes(cfg.activity),true);
    assert.equal(new Set(cfg.sequence).size,cfg.sequence.length);
    assert.equal(cfg.sequence.every(id=>cfg.requiredSections.includes(id)),true);
  }
});
test('order and target checks report real regressions rather than skipping missing blocks',()=>{
  assert.equal(inspectOrder([11,16,120]),true);
  assert.equal(inspectOrder([11,null,120]),false);
  assert.equal(inspectOrder([11,4,120]),false);
  assert.deepEqual(findSmallTargets([{visible:true,width:44,height:44},{visible:true,width:39,height:44},{visible:false,width:0,height:0}]).map(x=>x.width),[39]);
});
