// Optional user-selected location only. Text-only places never imply coordinates.
export function normalizeTransactionLocation(value) {
  if(value === undefined || value === null) return null;
  if(typeof value !== 'object' || Array.isArray(value)) throw new Error('Ubicación inválida');
  const label=String(value.label ?? '').replace(/\s+/g,' ').trim();
  if(label.length>100 || /[<>\r\n\x00-\x1f]/.test(label)) throw new Error('Nombre de lugar inválido');
  const lat=value.latitude, lng=value.longitude;
  if(lat === undefined && lng === undefined) return label ? {label,source:'manual'} : null;
  if(lat === undefined || lng === undefined || value.source !== 'device' ||
    typeof lat !== 'number' || typeof lng !== 'number' ||
    !Number.isFinite(lat)||!Number.isFinite(lng) ||
    Math.abs(lat)>90||Math.abs(lng)>180) throw new Error('Coordenadas inválidas');
  return {label,source:'device',latitude:Number(lat.toFixed(3)),longitude:Number(lng.toFixed(3))};
}
export function hasTransactionCoordinates(loc) {
  return !!loc && loc.source === 'device' && typeof loc.latitude === 'number' &&
    typeof loc.longitude === 'number' && Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude) && Math.abs(loc.latitude)<=90 && Math.abs(loc.longitude)<=180;
}
