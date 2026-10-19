import { parseAmount, validDate } from './bankingModel';

// Markdown prepared by ChatGPT from user-provided home-banking screenshots.
// Never save a screenshot or parse bank credentials here. Users explicitly
// associate every record with an existing bank/card before the import.
const aliases={
 type:'type',tipo:'type',bank:'bank',banco:'bank',card:'card',tarjeta:'card',
 asOf:'asOf',fechaConsulta:'asOf',consulta:'asOf',closingDate:'closingDate',
 cierre:'closingDate',dueDate:'dueDate',vencimiento:'dueDate',
 currentConsumptionARS:'currentConsumptionARS',consumosARS:'currentConsumptionARS',
 currentConsumptionUSD:'currentConsumptionUSD',consumosUSD:'currentConsumptionUSD',
 merchant:'merchant',comercio:'merchant',purchaseDate:'purchaseDate',
 fechaCompra:'purchaseDate',fecha:'purchaseDate',amount:'amount',importe:'amount',
 currency:'currency',moneda:'currency',installments:'installments',cuotas:'installments',
 reference:'reference',referencia:'reference',note:'note',nota:'note',
};
const clean=(raw)=>String(raw??'').trim().replace(/^["']|["']$/g,'');
export const exampleCardConsumptionMarkdown=`# LTC$ · Captura de consumos del home banking
# Escribí importes de UNA tarjeta por registro; no incluyas claves ni PAN.
- type: snapshot
  banco: Banco Ciudad
  tarjeta: Visa
  fechaConsulta: 2026-10-18
  consumosARS: 345000,50
  consumosUSD: 20.00
  cierre: 2026-10-25
  vencimiento: 2026-11-10

# Opcional: detalle de compras, si la captura muestra movimientos individuales.
- type: charge
  banco: Banco Ciudad
  tarjeta: Visa
  comercio: Supermercado
  fechaCompra: 2026-10-17
  importe: 12000,00
  moneda: ARS
  cuotas: 1
  referencia: 
`;
const parseMoney=(raw)=>{
  let value=clean(raw).replace(/(?:ARS|USD|US\$|U\$S|\$)/gi,'').replace(/\s/g,'');
  if(/^\d{1,3}(?:\.\d{3})+,(?:\d{1,2})?$/.test(value))value=value.replace(/\./g,'').replace(',','.');
  else if(/^\d+,(?:\d{1,2})$/.test(value))value=value.replace(',','.');
  else if(/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(value))value=value.replace(/,/g,'');
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(value)||/^\d{1,3}(?:,\d{3})+$/.test(value))
    throw new Error('Separadores de miles ambiguos: agregá dos decimales.');
  return parseAmount(value);
};
export function parseCardConsumptionMarkdown(source) {
  const errors=[],parsed=[];
  let current=null;
  const lines=String(source||'').split(/\r?\n/);
  if(lines.length>260||String(source||'').length>16000)
    return {records:[],errors:['Markdown demasiado largo: importá hasta 10 registros por vez.'],valid:false};
  lines.forEach((original,index)=>{
    const line=original.trim();
    if(!line||line.startsWith('#')||line==='\`\`\`'||line==='\`\`\`markdown')return;
    const match=line.match(/^-?\s*([a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]+)\s*:\s*(.*)$/);
    if(!match){errors.push('Línea '+(index+1)+': formato inválido.');return;}
    const key=aliases[match[1]];
    if(!key){errors.push('Línea '+(index+1)+': campo desconocido '+match[1]+'.');return;}
    if(key==='type'){
      if(current)parsed.push(current);
      current={type:clean(match[2]).toLowerCase(),line:index+1};
    } else if(!current)errors.push('Línea '+(index+1)+': empezá con - type: snapshot o - type: charge.');
    else if(key in current)errors.push('Línea '+(index+1)+': campo repetido '+match[1]+'.');
    else current[key]=clean(match[2]);
  });
  if(current)parsed.push(current);
  if(!parsed.length)errors.push('No se encontraron registros para importar.');
  if(parsed.length>10)errors.push('Importá hasta 10 registros por vez para poder revisar cada tarjeta.');
  const records=parsed.map((p,index)=>{
    const label='Registro '+(index+1)+': ';
    const fail=(message)=>errors.push(label+message);
    if(!['snapshot','charge'].includes(p.type)){fail('Usá type: snapshot o type: charge.');return null;}
    if(p.bank?.length>70||p.card?.length>70){fail('Nombre de banco o tarjeta demasiado largo.');return null;}
    const common={type:p.type,bankHint:p.bank||'',cardHint:p.card||'',line:p.line};
    try {
      if(p.type==='snapshot'){
        if(!validDate(p.asOf))throw new Error('fechaConsulta obligatoria en formato AAAA-MM-DD.');
        const hasARS=p.currentConsumptionARS!==undefined&&p.currentConsumptionARS!=='';
        const hasUSD=p.currentConsumptionUSD!==undefined&&p.currentConsumptionUSD!=='';
        if(!hasARS&&!hasUSD)throw new Error('Indicá consumosARS o consumosUSD; no inventes valores ausentes.');
        if(p.closingDate&&!validDate(p.closingDate))throw new Error('Fecha de cierre inválida.');
        if(p.dueDate&&!validDate(p.dueDate))throw new Error('Fecha de vencimiento inválida.');
        const snapshot={asOf:p.asOf};
        if(hasARS)snapshot.currentConsumptionARS=parseMoney(p.currentConsumptionARS);
        if(hasUSD)snapshot.currentConsumptionUSD=parseMoney(p.currentConsumptionUSD);
        if(p.closingDate)snapshot.closingDate=p.closingDate;
        if(p.dueDate)snapshot.dueDate=p.dueDate;
        return {...common,snapshot};
      }
      if(!p.merchant||p.merchant.length<2||p.merchant.length>100)throw new Error('Comercio obligatorio de 2 a 100 caracteres.');
      if(!validDate(p.purchaseDate))throw new Error('Fecha de compra inválida.');
      if(!['ARS','USD'].includes(p.currency))throw new Error('Moneda válida: ARS o USD.');
      if(!/^\d+$/.test(p.installments||'1')||Number(p.installments||'1')<1||Number(p.installments||'1')>60)
        throw new Error('Cuotas entre 1 y 60.');
      if(p.note?.length>300||p.reference?.length>60)throw new Error('Referencia o nota demasiado larga.');
      return {...common,charge:{merchant:p.merchant,purchaseDate:p.purchaseDate,
        currency:p.currency,amount:parseMoney(p.amount),installments:Number(p.installments||'1'),
        note:p.note||'',reference:p.reference||''}};
    }catch(e){fail(e?.message||'Datos inválidos.');return null;}
  }).filter(Boolean);
  return {records,errors,valid:errors.length===0};
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
export const duplicateChargeFingerprint=({bankId,cardId,merchant,purchaseDate,currency,amount,installments,reference=''})=>
  [bankId,cardId,norm(merchant),purchaseDate,currency,Number(amount).toFixed(2),Number(installments),norm(reference)].join('|');
export function suggestCardMatch(record,banks=[],cards=[]) {
  const bankNames=banks.filter(bank=>norm(bank.name)===norm(record.bankHint));
  if(bankNames.length!==1)return '';
  const bankId=bankNames[0].code||bankNames[0].id;
  const eligible=cards.filter(card=>card.bankId===bankId &&
    (norm(card.nickname)===norm(record.cardHint) || (record.cardHint.length===4&&card.lastFour===record.cardHint)));
  return eligible.length===1?eligible[0].id:'';
}
