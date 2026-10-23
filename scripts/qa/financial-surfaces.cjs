// Shared authenticated, READ-ONLY browser audit manifest.
// No Firebase secrets, user data, storage state or production endpoints here.
const surfaces = Object.freeze([
  Object.freeze({
    key: 'transacciones', path: '/transacciones',
    heading: 'Gastos e ingresos', primaryAction: 'Agregar movimiento',
    requiredSections: Object.freeze(['#transactions-scope', '#transactions-summary', '#transactions-list']),
    sequence: Object.freeze(['#transactions-summary', '#transactions-list']),
    activity: '#transactions-list',
  }),
  Object.freeze({
    key: 'bancos', path: '/bancos',
    heading: 'Bancos y tarjetas', primaryAction: 'Agregar banco',
    requiredSections: Object.freeze(['#banks-workspace', '#bank-balances', '#bank-management', '#bank-spending-alerts']),
    sequence: Object.freeze(['#bank-balances', '#bank-management', '#bank-spending-alerts']),
    activity: '#bank-management',
  }),
  Object.freeze({
    key: 'portfolio', path: '/portfolio',
    heading: 'Cuentas e inversiones', primaryAction: 'Agregar posición',
    requiredSections: Object.freeze(['#portfolio-workspace', '#portfolio-summary', '#portfolio-positions', '#portfolio-charts']),
    sequence: Object.freeze(['#portfolio-summary', '#portfolio-positions', '#portfolio-charts']),
    activity: '#portfolio-positions',
  }),
]);
const viewports = Object.freeze([
  Object.freeze({width:390,height:844}),
  Object.freeze({width:1440,height:900}),
  Object.freeze({width:1728,height:960}),
]);
const themes = Object.freeze(['light','dark']);
const screenshotCount = surfaces.length * viewports.length * themes.length;
function inspectOrder(positions) {
  return positions.length > 0 && positions.every((position,index) =>
    position !== null && (index === 0 || position > positions[index-1]));
}
function findSmallTargets(targets, threshold=43.5) {
  return targets.filter(item => item.visible && (item.width < threshold || item.height < threshold));
}
module.exports = { surfaces, viewports, themes, screenshotCount, inspectOrder, findSmallTargets };
