import { auditPortfolioEarnings } from './portfolioEarningsAudit';
// Excel requires explicit cell coordinates. Without r="A1" (etc.) some
// spreadsheet readers silently discard data, especially on large exports.
const esc=v=>String(v??'')
 .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const xlsxColumnName=index=>{
 let n=index+1,out='';
 while(n>0){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26);}
 return out;
};
const cell=(v,address)=>typeof v==='number'&&Number.isFinite(v)
 ? `<c r="${address}"><v>${v}</v></c>`
 : `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
export const worksheetXml=(rows=[])=>{
 const records=Array.isArray(rows)?rows:[];
 const rowCount=Math.max(1,records.length);
 const columnCount=Math.max(1,...records.map(row=>Array.isArray(row)?row.length:0));
 const last=xlsxColumnName(columnCount-1);
 const dimensions=`A1:${last}${rowCount}`;
 const header=records[0]||[];
 const cols=Array.from({length:columnCount},(_,index)=>{
   const title=String(header[index]??'');
   const width=Math.min(43,Math.max(15,title.length+4));
   return `<col min="${index+1}" max="${index+1}" width="${width}" customWidth="1"/>`;
 }).join('');
 const data=records.map((record,index)=>{
   const values=Array.isArray(record)?record:[];
   return `<row r="${index+1}">${values.map((value,col)=>cell(value,`${xlsxColumnName(col)}${index+1}`)).join('')}</row>`;
 }).join('');
 const filter=records.length>1?`<autoFilter ref="${dimensions}"/>`:'';
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimensions}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${data}</sheetData>${filter}</worksheet>`;
};
const sheet=worksheetXml;
const enc=new TextEncoder(), table=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const u16=n=>new Uint8Array([n&255,(n>>>8)&255]),u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
const join=parts=>{const out=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length;});return out;};
const zip=files=>{const ls=[],cs=[];let off=0;Object.entries(files).forEach(([name,text])=>{const n=enc.encode(name),d=enc.encode(text),crc=crc32(d);const l=join([u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(d.length),u32(d.length),u16(n.length),u16(0),n,d]);ls.push(l);cs.push(join([u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(d.length),u32(d.length),u16(n.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off),n]));off+=l.length;});const body=join(ls),central=join(cs);return join([body,central,u32(0x06054b50),u16(0),u16(0),u16(cs.length),u16(cs.length),u32(central.length),u32(body.length),u16(0)]);};
const download=(blob,name)=>{
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;
 a.download=name;
 // Some Android download managers need a real, attached anchor and time to
 // copy Blob bytes before object URL revocation. 1 second was too aggressive.
 a.style.display='none';
 document.body.appendChild(a);
 try { a.click(); } finally {
   a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
};
const date=v=>!v?'':typeof v.toDate==='function'?v.toDate().toISOString():v.seconds?new Date(v.seconds*1000).toISOString():String(v);

export const exportPortfolioXlsx=(positions,snapshots)=>{
 const ph=['Institución','Producto','Categoría','Moneda','Saldo','Tasa anual %','Tipo tasa','Liquidez','Ganado informado','Último cambio','Inicio','Vencimiento','Info oficial','Fuente','Fuente verificada'];
 const pr=[ph,...positions.map(p=>[p.institution,p.name,p.category,p.currency,Number(p.balance||0),Number(p.annualRate||0),p.rateType,p.liquidity,Number(p.realizedEarnings||0),Number(p.lastEarning||0),p.startDate,p.maturityDate,p.infoUrl,p.sourceUrl,p.sourceCheckedAt])];
 const ms=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const fr=[['Institución','Fondo','Ticker',...ms.map(x=>x.toUpperCase()),'YTD publicado','NAV','Fecha NAV'],...positions.filter(p=>p.category==='FCI').map(p=>[p.institution,p.name,p.ticker,...ms.map(m=>Number(p.monthlyReturns?.[m]||0)),Number(p.publishedYtdReturn||0),Number(p.nav||0),p.navDate])];
 const hr=[['Institución','Producto','Moneda','Saldo','Tasa anual %','Fuente registro','Fecha'],...snapshots.map(s=>[s.institution,s.name,s.currency,Number(s.balance||0),Number(s.annualRate||0),s.source,date(s.capturedAt)])];
 const files={'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>','_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Posiciones" sheetId="1" r:id="rId1"/><sheet name="FCI mensual" sheetId="2" r:id="rId2"/><sheet name="Historial" sheetId="3" r:id="rId3"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/></Relationships>','xl/worksheets/sheet1.xml':sheet(pr),'xl/worksheets/sheet2.xml':sheet(fr),'xl/worksheets/sheet3.xml':sheet(hr)};
 download(new Blob([zip(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`portfolio-${new Date().toISOString().slice(0,10)}.xlsx`);
};

// Copy-ready financial context for LITA (no live Internet or investment writes).
// Keep the established headings so LITA's server-side finance scope validator
// recognizes complete reports, even when they exceed 1,500 characters.
export const buildPortfolioLlmMarkdown=(positions=[],snapshots=[])=>{
 const allPositions=Array.isArray(positions)?positions:[];
 const allSnapshots=Array.isArray(snapshots)?snapshots:[];
 const clean=(value)=>String(value??'N/D').replace(/[\r\n|]+/g,' ').trim()||'N/D';
 const totals=allPositions.reduce((acc,p)=>{
   const balance=Number(p.balance);
   if(!Number.isFinite(balance))return acc;
   const currency=clean(p.currency);
   acc[currency]=(acc[currency]||0)+balance;
   return acc;
 },{});
 const l=[
  '# Portfolio LTC — contexto para análisis LLM',
  '',
  `Generado: ${new Date().toISOString()}`,
  'Idioma solicitado: ESPAÑOL (Argentina). Responder siempre en español, aunque el siguiente mensaje sea "Okay", "Dale" o "I approve".',
  '',
  '## Reglas para el análisis',
  '- Actuá como asistente financiero de LTC. Entregá directamente resultados, no describas cómo pensás resolver la consulta ni muestres planes internos.',
  '- Analizá exclusivamente los datos adjuntos: LITA no puede navegar por Internet ni verificar tasas bancarias vigentes en tiempo real.',
  '- No afirmes haber visitado URLs ni inventes tasas, precios, rendimientos, fechas, fuentes verificadas o movimientos faltantes.',
  '- No mezcles monedas sin tipo de cambio explícito y no trates las conversiones USD/ARS como ganancias o gastos.',
  '- Diferenciá movimientos de capital, intereses acreditados, valuación de activos y tasas publicadas.',
  '- Un retiro baja el saldo invertido pero NO la tasa ni las ganancias acumuladas. Nunca lo describas como pérdida.',
  '- Transferir dinero entre cuentas remuneradas no demuestra que haya bajado la tasa.',
  '- Ganado informado proviene de datos cargados por el usuario, NO equivale a rendimientos auditados.',
  '- Las verificaciones sin clasificar NO son ganancias; un movimiento de capital puede coexistir con intereses.',
  '- Una venta de USD es una conversión de activos: NO la vuelvas a contar como gasto de tarjeta si el resumen ya está registrado.',
  '- Los saldos y las tasas son registros del usuario; una URL guardada NO prueba que la tasa sea actual.',
  '- Señalá concentración, liquidez, vencimientos, datos pendientes y posibles desactualizaciones sin alarmismo.',
  '- Las simulaciones no garantizan rendimiento. No ordenes movimientos de fondos ni guardes cambios en LTC.',
  '',
  '## Totales por moneda',
  ...Object.entries(totals).map(([currency,balance])=>`- ${currency}: ${balance}`),
  '',
  '## Posiciones'
 ];
 allPositions.forEach(p=>{
   const audit=auditPortfolioEarnings(p,allSnapshots);
   l.push(
     '',
     `### ${clean(p.institution)} — ${clean(p.name)}`,
     `- Categoría: ${clean(p.category)}`,
     `- Moneda: ${clean(p.currency)}`,
     `- Saldo: ${clean(p.balance)}`,
     `- Tasa cargada: ${p.annualRate??'N/D'}% ${clean(p.rateType||'')}`,
     `- Liquidez: ${clean(p.liquidity)}`,
     `- Ganancias acumuladas cargadas (no auditadas): ${audit.reportedEarnings??'N/D'}`,
     `- Fuente oficial registrada (no consultada): ${clean(p.sourceUrl||p.infoUrl)}`,
     `- Fuente verificada en LTC (no implica validación actual): ${clean(p.sourceCheckedAt)}`,
     `- Verificaciones almacenadas: ${audit.snapshotCount}`,
     `- Clasificación histórica de movimientos: ${JSON.stringify(audit.classifications)}`,
     `- Retiros clasificados (variación de saldo, no ganancia): ${audit.recordedWithdrawals}`,
     `- Aportes clasificados (variación de saldo, no ganancia): ${audit.recordedDeposits}`,
     `- Rendimientos etiquetados por usuario: ${audit.userTaggedEarnings}`,
     `- Estado de revisión: ${audit.needsReview?'Revisar registros':'No auditado externamente'}`,
     `- Interpretación: ${clean(audit.note)}`
   );
   if(p.category==='FCI')l.push(
     `- Rendimientos mensuales informados: ${JSON.stringify(p.monthlyReturns||{})}`,
     `- YTD publicado registrado: ${p.publishedYtdReturn??'N/D'}`
   );
 });
 l.push(
  '',
  '## Historial',
  `Registros de verificación: ${allSnapshots.length}`,
  '',
  '## Pedido de investigación y análisis',
  'Realizá AHORA un análisis financiero útil del portfolio registrado arriba, sin investigación web. Respondé íntegramente en español argentino.',
  '1. Resumen de hasta cinco conclusiones basadas en los datos; aclarar cantidades y moneda.',
  '2. Para CADA activo, comentá brevemente saldo, tasa registrada (NO tasa vigente comprobada), liquidez, ganancias cargadas y observaciones importantes.',
  '3. Señalá riesgos de concentración, vencimientos, tasas no verificadas y registros de ganancias/retiros que requieren revisión.',
  '4. Indicá hasta cinco verificaciones prioritarias que puedo hacer en LTC o con documentación bancaria oficial.',
  '5. No generes bloques LTC Asset Update si no hay valores nuevos comprobados en los datos aportados. No fabriques fechas de verificación ni campos sin evidencia.',
  'Si después te pido continuar o te digo que apruebo el análisis, retomá esta consulta financiera; no pidas que vuelva a pegar el informe.',
  'Formato: Markdown claro con subtítulos y viñetas breves. Nada de pensamiento interno, listas de planificación en inglés ni tablas incompletas.',
  '',
  '## Formato LTC Asset Update',
  'Solo cuando te aporte un dato verificable nuevo, podés proponer un bloque LTC Asset Update usando institution y name más los campos respaldados. Nunca apliques cambios de forma automática.'
 );
 return l.join('\n');
};
export const downloadPortfolioMarkdown=(positions,snapshots)=>download(new Blob([buildPortfolioLlmMarkdown(positions,snapshots)],{type:'text/markdown;charset=utf-8'}),`portfolio-research-prompt-${new Date().toISOString().slice(0,10)}.md`);


// Reuse the existing dependency-free XLSX writer for the Transactions export.
// Strings use inlineStr cells, so descriptions remain literal text, not formulas.
export const buildWorkbookXlsxBytes = (sheets) => {
 const entries = Object.entries(sheets);
 if (!entries.length) throw new Error('No hay datos para exportar');
 const types = entries.map(([, rows], i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
 const sheetsXml = entries.map(([name], i) => `<sheet name="${esc(name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('');
 const rels = entries.map(([, rows], i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('');
 const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${types}</Types>`,
  '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetsXml}</sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
 };
 entries.forEach(([, rows], i) => { files[`xl/worksheets/sheet${i+1}.xml`] = sheet(rows); });
 return zip(files);
};

export const exportWorkbookXlsx = (sheets, filename) => {
 const bytes = buildWorkbookXlsxBytes(sheets);
 download(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
};
