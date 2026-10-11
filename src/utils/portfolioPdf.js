import { jsPDF } from 'jspdf';

const clean = (value) => String(value ?? '')
  .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
  .replace(/[\x00-\x1F\x7F]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const display = (value) => value === null || value === undefined || value === ''
  ? 'N/D' : clean(value);

const amount = (value) => {
  if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) return 'N/D';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(value));
};

const pdfDate = (value) => {
  if (!value) return 'N/D';
  if (typeof value.toDate === 'function') return pdfDate(value.toDate());
  if (typeof value.seconds === 'number') return pdfDate(new Date(value.seconds * 1000));
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'N/D' : value.toISOString().slice(0, 10);
  return display(value);
};

/**
 * A position-oriented PDF, not a transaction report. No inferred FX rates,
 * audited returns, or financial movements: snapshots are recorded observations.
 */
export const buildPortfolioPdf = (positions = [], snapshots = []) => {
  const assets = Array.isArray(positions) ? positions : [];
  const history = Array.isArray(snapshots) ? snapshots : [];
  if (!assets.length) throw new Error('No hay posiciones para exportar.');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({
    title: 'LTC$ - Portfolio',
    subject: 'Posiciones y verificaciones cargadas por el usuario',
    author: 'LTC$',
    creator: 'LTC$ - Lleva tus cuentas',
  });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const left = 14;
  const right = w - left;
  let y = 34;

  const header = () => {
    pdf.setFillColor(79, 37, 155);
    pdf.rect(0, 0, w, 25, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(17);
    pdf.text('LTC$', left, 13);
    pdf.setFontSize(9);
    pdf.text('Portfolio · posiciones y verificaciones', left, 20);
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(9);
  };
  const next = () => { pdf.addPage(); header(); y = 34; };
  const text = (value, { bold = false, color = [30, 41, 59], indent = 0, after = 1 } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(clean(value) || '-', w - 2 * left - indent);
    for (const line of lines) {
      if (y > h - 23) next();
      pdf.text(line, left + indent, y);
      y += 4.6;
    }
    y += after;
  };
  const heading = (value) => { if (y > h - 33) next(); text(value, { bold: true, after: 2 }); };

  header();
  text('Posiciones: ' + assets.length + ' | Verificaciones: ' + history.length, { bold: true });
  text('Saldos registrados por moneda (sin conversiones automáticas).', { color: [100, 116, 139] });

  const totals = new Map();
  assets.forEach(p => {
    const balance = Number(p.balance);
    if (!Number.isFinite(balance)) return;
    const currency = clean(p.currency || 'ARS');
    totals.set(currency, (totals.get(currency) || 0) + balance);
  });
  for (const [currency, balance] of totals) text(currency + ': ' + amount(balance), { indent: 3 });
  text('Importes y tasas son datos del usuario. Tasas no verificadas como vigentes.', { color: [100, 116, 139] });
  text('Ganado informado no equivale a rendimiento auditado. Los retiros no son pérdidas de inversión.', { color: [100, 116, 139], after: 5 });

  heading('Posiciones');
  assets.forEach((p, index) => {
    heading((index + 1) + '. ' + display(p.institution) + ' - ' + display(p.name));
    text('Categoría: ' + display(p.category) + ' | Moneda: ' + display(p.currency), { indent: 2 });
    text('Saldo registrado: ' + amount(p.balance) + ' ' + display(p.currency), { indent: 2 });
    text('Tasa cargada: ' + amount(p.annualRate) + '% ' + display(p.rateType), { indent: 2 });
    text('Ganado informado: ' + amount(p.realizedEarnings) + ' ' + display(p.currency) + ' (no auditado)', { indent: 2 });
    text('Liquidez: ' + display(p.liquidity) + ' | Vencimiento: ' + pdfDate(p.maturityDate), { indent: 2 });
    if (p.category === 'FCI') {
      text('FCI: ' + display(p.ticker) + ' | Cuotapartes: ' + amount(p.shares) + ' | NAV: ' + amount(p.nav), { indent: 2 });
      text('YTD publicado (registrado): ' + amount(p.publishedYtdReturn) + '% | Fecha NAV: ' + pdfDate(p.navDate), { indent: 2 });
    }
    if (p.sourceUrl || p.sourceCheckedAt) {
      text('Fuente declarada: ' + display(p.sourceUrl) + ' | Verificación registrada: ' + pdfDate(p.sourceCheckedAt), { indent: 2 });
    }
    y += 2;
  });
  heading('Historial de verificaciones (' + history.length + ')');
  text('Cambios de saldo pueden incluir aportes, retiros o intereses: no equivalen automáticamente a ganancias.', { color: [100, 116, 139] });
  history.forEach((s, i) => {
    heading((i + 1) + '. ' + pdfDate(s.capturedAt || s.date || s.createdAt) + ' - ' + display(s.institution) + ' - ' + display(s.name));
    text('Saldo registrado: ' + amount(s.balance) + ' ' + display(s.currency) +
      ' | Tasa registrada: ' + amount(s.annualRate) + '%', { indent: 2 });
    if (s.changeType) text('Clasificación: ' + display(s.changeType) + ' | Fuente: ' + display(s.source), { indent: 2 });
  });

  const pages = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 231, 240);
    pdf.line(left, h - 15, right, h - 15);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.text('LTC$ | Portfolio privado · datos cargados por el usuario', left, h - 10);
    pdf.text('Página ' + page + '/' + pages, right, h - 10, { align: 'right' });
  }
  return pdf.output('blob');
};
