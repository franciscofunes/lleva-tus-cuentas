import { parseAmount, validateBankAccount, validateBankCard, validateBankName } from './bankingModel';

// Same LTC$ Markdown field:value and "- type:" record convention as the
// transaction importer, with a separate banking schema. No writes here.
const ALIASES = {
  type:'type', tipo:'type', name:'name', nombre:'name', bank:'bank', banco:'bank',
  accountName:'name', accountNumber:'accountNumber', numeroCuenta:'accountNumber',
  accountType:'typeAccount', typeAccount:'typeAccount', currency:'currency', moneda:'currency',
  balance:'balance', saldo:'balance', alias:'alias', cbu:'cbu', cvu:'cbu',
  holder:'holder', titular:'holder', holderTaxId:'holderTaxId', cuit:'holderTaxId', cuil:'holderTaxId',
  branch:'branch', sucursal:'branch', nickname:'nickname', tarjeta:'nickname',
  brand:'brand', marca:'brand', lastFour:'lastFour', ultimosCuatro:'lastFour',
  closingDay:'closingDay', dueDay:'dueDay', closingDate:'closingDate', dueDate:'dueDate',
  cierre:'closingDate', vencimiento:'dueDate', asOf:'asOf',
  lastStatementARS:'lastStatementARS', lastStatementUSD:'lastStatementUSD',
  minimumPaymentARS:'minimumPaymentARS', currentConsumptionARS:'currentConsumptionARS',
  currentConsumptionUSD:'currentConsumptionUSD', availableLimitARS:'availableLimitARS',
};
const cleanse = (raw) => String(raw ?? '').trim().replace(/^["']|["']$/g, '');
const decimal = (value) => {
  let s = cleanse(value).replace(/(?:ARS|USD|US\$|U\$S|\$)/gi,'').replace(/\s/g,'');
  if (!s) return '';
  if (/^-?[0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.');
  else if (/^-?[0-9]+,[0-9]{1,2}$/.test(s)) s=s.replace(',','.');
  else if (/^-?[0-9]{1,3}(?:,[0-9]{3})+\.[0-9]{1,2}$/.test(s)) s=s.replace(/,/g,'');
  // Reject ambiguous thousands delimiters instead of silently corrupting money.
  return String(parseAmount(s, {canBeNegative:true}));
};
export const exampleBankMarkdown = `# LTC$ Bancos
- type: bank
  name: Mi banco
- type: account
  name: Caja de ahorro
  typeAccount: caja_ahorro
  currency: ARS
  balance: 0.00
  alias:
  cbu:
- type: card
  nickname: Visa crédito
  brand: Visa
  lastFour:
  closingDay: 29
  dueDay: 11`;

export function parseBankMarkdown(source) {
  const records = []; let current=null;
  const errors=[];
  String(source||'').split(/\r?\n/).forEach((raw, i) => {
    const line=raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('<!--')) return;
    const match=line.match(/^-?\s*([a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]+)\s*:\s*(.*?)\s*$/);
    if (!match) { errors.push('Línea '+(i+1)+': formato inválido.'); return; }
    const key=ALIASES[match[1]];
    if (!key) { errors.push('Línea '+(i+1)+': campo desconocido '+match[1]); return; }
    if (key==='type') {
      if(current) records.push(current);
      current={type:cleanse(match[2]).toLowerCase()};
    } else if(!current) errors.push('Línea '+(i+1)+': empezá con - type: bank');
    else if(key==='bank') {
      // One bank per preview; a second institution cannot be silently merged.
      current.bank=cleanse(match[2]);
    } else current[key]=cleanse(match[2]);
  });
  if (current) records.push(current);
  if (!records.length) errors.push('No se encontraron registros.');
  if (records.length>21) errors.push('Máximo 1 banco y 20 cuentas/tarjetas por importación.');
  if (records[0]?.type!=='bank') errors.push('La primera entrada debe ser - type: bank.');
  if (records.filter(v=>v.type==='bank').length!==1) errors.push('Importá un banco por vez.');
  if (records.some(v=>!['bank','account','card'].includes(v.type))) errors.push('Tipos admitidos: bank, account y card.');
  let name='';
  try { name=validateBankName(records.find(r=>r.type==='bank')?.name); }
  catch(e) { errors.push(e.message); }
  const accounts=[],cards=[];
  records.slice(1).forEach((record,i) => {
    if (record.bank && record.bank.toLocaleLowerCase()!==name.toLocaleLowerCase()) {
      errors.push('Registro '+(i+2)+': banco diferente al encabezado.');return;
    }
    if (!['account','card'].includes(record.type))return;
    try{
      if(record.type==='account'){
        accounts.push({
          bankId:'preview-bank',name:record.name || '',type:record.typeAccount || '',
          currency:record.currency || '',balance:decimal(record.balance),
          alias:record.alias || '',cbu:record.cbu || '',
          accountNumber:record.accountNumber || '',holder:record.holder || '',
          holderTaxId:record.holderTaxId || '',branch:record.branch || '',
        });
        validateBankAccount(accounts[accounts.length-1]);
      }else{
        const entry={
          bankId:'preview-bank',nickname:record.nickname || record.name || '',brand:record.brand || '',
          lastFour:record.lastFour || '',closingDay:record.closingDay || '',
          dueDay:record.dueDay || '',closingDate:record.closingDate || '',
          dueDate:record.dueDate || '',asOf:record.asOf || '',
        };
        for(const k of ['lastStatementARS','lastStatementUSD','minimumPaymentARS',
          'currentConsumptionARS','currentConsumptionUSD','availableLimitARS'])
          entry[k] = decimal(record[k]);
        cards.push(entry);validateBankCard(entry);
      }
    }catch(e){errors.push('Registro '+(i+2)+': '+e.message);}
  });
  return {name,accounts,cards,errors,valid:errors.length===0};
}
