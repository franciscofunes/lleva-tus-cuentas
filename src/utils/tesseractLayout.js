/**
 * Tesseract's plain text output often lists the left column of a banking
 * screenshot first, and THEN all the corresponding values on the right.
 * Rebuild visual reading order from TSV word coordinates before the existing
 * conservative, label-based financial parsers review the text.
 */
export function tesseractTextInVisualRows(tsv, fallbackText = '') {
  const words = String(tsv || '').split(/\r?\n/).slice(1).map((line) => {
    const fields = line.split('\t');
    if (fields.length < 12 || fields[0] !== '5') return null;
    const left = Number(fields[6]);
    const top = Number(fields[7]);
    const width = Number(fields[8]);
    const height = Number(fields[9]);
    const confidence = Number(fields[10]);
    const text = fields.slice(11).join('\t').trim();
    if (!text || ![left, top, width, height, confidence].every(Number.isFinite)
      || height <= 0 || width <= 0 || confidence < 0) return null;
    return {text, left, y: top + height / 2, height};
  }).filter(Boolean);

  if (!words.length) return String(fallbackText || '');
  const ordered = words.sort((a, b) => a.y - b.y || a.left - b.left);
  const heights = ordered.map(word => word.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)];
  // The two columns can be separate TSV blocks, despite sharing the same row.
  const tolerance = Math.max(6, Math.min(16, medianHeight * 0.55));
  const rows = [];
  ordered.forEach(word => {
    let row = rows.find(candidate => Math.abs(candidate.y - word.y) <= tolerance);
    if (!row) {
      row = {y: word.y, words: []};
      rows.push(row);
    }
    row.words.push(word);
    row.y = row.words.reduce((sum, item) => sum + item.y, 0) / row.words.length;
  });
  return rows.sort((a, b) => a.y - b.y)
    .map(row => row.words.sort((a, b) => a.left - b.left).map(word => word.text).join(' '))
    .join('\n');
}
