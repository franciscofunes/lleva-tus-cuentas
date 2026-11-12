import { validDate } from './bankingModel';
import { getTransactionCurrency } from './customCategories';
import { finiteTransactionNumber, transactionText } from './transactionScalar';

// Historical spending is sourced ONLY from unique, explicitly linked, reviewed PDF
// statements. Manual charges and statement expenses are never added to these totals.
const monthOf = (s) => /^20\d{2}-(0[1-9]|1[0-2])$/.test(s?.period || '') ? s.period
  : validDate(s?.closingDate) ? s.closingDate.slice(0,7) : null;
const finiteMoney = value => {
  if (value === null || value === undefined ||
      (typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'string' && !value.trim())) return null;
  const n=Number(value);
  return Number.isFinite(n) && n>=0 && n<1e12?n:null;
};
export function statementMonthlyHistory(statements=[],links=[],cards=[]) {
  const ownedCards=new Map(cards.map(c=>[c.id,c]));
  const linksByExpense=new Map(links.filter(l=>ownedCards.has(l.cardId)&&l.expenseId)
    .map(l=>[l.expenseId,l]));
  const seenPdf=new Set();
  const groups=new Map();
  statements.forEach(s=>{
    const link=linksByExpense.get(s.expenseId);
    if(!link||!s.approvedByUser)return;
    const month=monthOf(s);
    if(!month)return;
    // A PDF can accidentally be linked via multiple expense records. Count the
    // same reviewed PDF only once, even if its expense/link ID is different.
    const sha=String(s.fileSha256||s.id||'');
    const pdfKey=/^[a-f0-9]{64}$/i.test(sha)?'pdf:'+sha.toLowerCase():'expense:'+s.expenseId;
    if(seenPdf.has(pdfKey))return;
    seenPdf.add(pdfKey);
    for(const currency of ['ARS','USD']){
      // The amount payable is NOT spending: it can include old balances, fees,
      // taxes, FX adjustments and credits. Never use totals as a fallback.
      // Legacy PDFs without a verified purchase subtotal are not comparable.
      const purchase=finiteMoney(s.purchases?.[currency]);
      if(purchase===null)continue;
      const key=month+'-'+currency;
      const group=groups.get(key)||{month,currency,total:0,statementCount:0,entries:[]};
      group.total=Math.round((group.total+purchase)*100)/100;
      group.statementCount++;
      const card=ownedCards.get(link.cardId);
      group.entries.push({
        expenseId:s.expenseId,
        institution:String(s.institution||'Banco no identificado'),
        card:String(card?.nickname||s.cardBrand||'Tarjeta'),
        closingDate:validDate(s.closingDate)?s.closingDate:null,
        purchases:purchase,
        statementTotal:finiteMoney(s.totals?.[currency]),
      });
      groups.set(key,group);
    }
  });
  return [...groups.values()].sort((a,b)=>a.month.localeCompare(b.month)||a.currency.localeCompare(b.currency));
}
/**
 * Historical CARD STATEMENT EXPENSES, using exactly the same dated, signed-off
 * transaction records that feed the Transactions > Gastos bar chart.
 *
 * PDF 'period' describes a billing cycle (often one month BEFORE the payment
 * due date), and is never an additional expense. Group the actual transaction
 * by selectedDate, like the Dashboard's monthly filter.
 *
 * The expense amount can include taxes/adjustments; show PDF purchases only as
 * an optional reconciliation hint, NEVER sum it with the expense amount.
 */
export function cardStatementExpenseHistory(expenses=[],statements=[],links=[]) {
  const byExpensePdf=new Map();
  const linkedIds=new Set(links.map(link=>link.expenseId).filter(Boolean));
  statements.forEach(pdf=>{
    if(pdf?.expenseId&&pdf.approvedByUser&&linkedIds.has(pdf.expenseId))
      byExpensePdf.set(pdf.expenseId,pdf);
  });
  const groups=new Map();
  const seenExpenseIds=new Set();
  (Array.isArray(expenses)?expenses:[]).forEach(expense=>{
    const category=transactionText(expense?.category);
    if(!category.startsWith('Resumen tarjeta'))return;
    const date=expense?.selectedDate;
    if(!validDate(date))return;
    const currency=getTransactionCurrency(expense);
    const amount=finiteTransactionNumber(expense?.amount);
    if(amount===null||amount<=0||amount>=1e12)return;
    const id=transactionText(expense?.id);
    if(id&&seenExpenseIds.has(id))return;
    if(id)seenExpenseIds.add(id);
    const month=date.slice(0,7);
    const key=month+'-'+currency;
    const group=groups.get(key)||{month,currency,total:0,statementCount:0,entries:[],source:'transactions'};
    const pdf=byExpensePdf.get(id);
    group.total=Math.round((group.total+amount)*100)/100;
    group.statementCount++;
    group.entries.push({
      expenseId:id,
      institution:transactionText(expense.expenseName)||'Resumen tarjeta',
      transactionDate:date,
      amount,
      pdfPeriod:pdf?.period||null,
      pdfClosingDate:validDate(pdf?.closingDate)?pdf.closingDate:null,
      pdfPurchases:finiteMoney(pdf?.purchases?.[currency]),
      pdfTotal:finiteMoney(pdf?.totals?.[currency]),
      linkedPdf:Boolean(pdf),
    });
    groups.set(key,group);
  });
  return [...groups.values()].sort((a,b)=>a.month.localeCompare(b.month)||a.currency.localeCompare(b.currency));
}

export function statementMonthExtremes(history=[],currency='ARS'){
  const months=history.filter(row=>row.currency===currency&&row.statementCount>0&&row.total>=0)
    .sort((a,b)=>a.month.localeCompare(b.month));
  if(!months.length)return {months:[],high:null,low:null,average:null,suggestedLimit:null};
  const high=months.reduce((a,b)=>b.total>a.total?b:a);
  const low=months.reduce((a,b)=>b.total<a.total?b:a);
  const recent=months.slice(-Math.min(6,months.length));
  const average=recent.reduce((sum,m)=>sum+m.total,0)/recent.length;
  // Heuristic, not LLM instruction: 90% of recent average is a conservative
  // draft budget; user explicitly chooses the actual limit.
  return {months,high,low,average:Math.round(average*100)/100,
    suggestedLimit:Math.round(average*0.9*100)/100};
}
const iso=(year,month,day)=>{
  const maximum=new Date(year,month,0).getDate();
  return [year,String(month).padStart(2,'0'),String(Math.min(day,maximum)).padStart(2,'0')].join('-');
};
export function cardCycleDates(card,now=new Date()){
  const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const snapshot=card?.statementSnapshot||{};
  const cDay=Number(card?.closingDay);
  const dDay=Number(card?.dueDay);
  if(!Number.isInteger(cDay)||cDay<1||cDay>31||!Number.isInteger(dDay)||dDay<1||dDay>31)return {closingDate:null,dueDate:null,estimated:true};
  const y=now.getFullYear(),m=now.getMonth()+1;
  const current=iso(y,m,cDay);
  const close=current>=today?current:iso(m===12?y+1:y,m===12?1:m+1,cDay);
  const [cy,cm]=close.split('-').map(Number);
  // Due date is after close; both dates are estimates until imported bank statement supplies actual dates.
  const dueSame=iso(cy,cm,dDay);
  const due=dueSame>close?dueSame:iso(cm===12?cy+1:cy,cm===12?1:cm+1,dDay);
  // Manually entered home-banking dates only override if they concern a future cycle.
  const actualClose=validDate(snapshot.closingDate)&&snapshot.closingDate>=today?snapshot.closingDate:null;
  const actualDue=validDate(snapshot.dueDate)&&snapshot.dueDate>=today?snapshot.dueDate:null;
  return {closingDate:actualClose||close,dueDate:actualDue||due,estimated:!(actualClose&&actualDue)};
}
// Each card can have a different closing day. Track user-entered purchases in
// its CURRENT OPEN BILLING CYCLE, not only purchases dated in the calendar month.
// This remains a partial register; no guess is made for unrecorded purchases.
const scheduledPreviousClose=(card,now)=>{
  const today=iso(now.getFullYear(),now.getMonth()+1,now.getDate());
  const current=iso(now.getFullYear(),now.getMonth()+1,Number(card.closingDay));
  const previous=current<today?current:
    iso(now.getMonth()===0?now.getFullYear()-1:now.getFullYear(),
      now.getMonth()===0?12:now.getMonth(),Number(card.closingDay));
  return previous;
};
export function cardMonthManualSpending(charges=[],statements=[],links=[],cards=[],now=new Date()) {
  const month=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0')].join('-');
  const today=iso(now.getFullYear(),now.getMonth()+1,now.getDate());
  const activeCards=new Map(cards.map(c=>[c.id,c]));
  const latestClose=new Map();
  const linksByExpense=new Map(links.map(l=>[l.expenseId,l]));
  statements.forEach(statement=>{
    const link=linksByExpense.get(statement.expenseId);
    if(!link||!activeCards.has(link.cardId)||!statement.approvedByUser||
       !validDate(statement.closingDate)||statement.closingDate>today)return;
    const previous=latestClose.get(link.cardId);
    if(!previous||statement.closingDate>previous)latestClose.set(link.cardId,statement.closingDate);
  });
  const summary={ARS:0,USD:0,count:0,snapshotCardCount:0,
    manualOnly:true,month,scope:'open-card-cycles',approximate:true};
  const baselines=new Map();
  activeCards.forEach((card,cardId)=>{
    if(!Number.isInteger(Number(card.closingDay))||Number(card.closingDay)<1||Number(card.closingDay)>31)return;
    const prior=scheduledPreviousClose(card,now),latest=latestClose.get(cardId);
    const from=latest&&latest>prior?latest:prior;
    const snapshot=card.statementSnapshot;
    if(!snapshot||!validDate(snapshot.asOf)||snapshot.asOf<=from||snapshot.asOf>today)return;
    for(const currency of ['ARS','USD']){
      const amount=finiteMoney(snapshot['currentConsumption'+currency]);
      if(amount===null)continue;
      baselines.set(cardId+':'+currency,snapshot.asOf);
      summary[currency]=Math.round((summary[currency]+amount)*100)/100;
      summary.snapshotCardCount++;
      summary.manualOnly=false;
    }
  });
  charges.forEach(c=>{
    const card=activeCards.get(c.cardId);
    if(!card||card.bankId!==c.bankId||c.source!=='manual'||
       !['ARS','USD'].includes(c.currency)||!validDate(c.purchaseDate)||
       c.purchaseDate>today)return;
    // If dates are invalid or a card isn't configured, do not invent a cycle.
    if(!Number.isInteger(Number(card.closingDay))||card.closingDay<1||card.closingDay>31)return;
    const priorScheduled=scheduledPreviousClose(card,now);
    const mostRecentClose=latestClose.get(c.cardId);
    const from=mostRecentClose&&mostRecentClose>priorScheduled?mostRecentClose:priorScheduled;
    if(c.purchaseDate<=from)return;
    // A full bank screenshot is a replacement baseline, not an extra charge.
    // Never add purchases dated on/before its asOf date twice.
    const baselineDate=baselines.get(c.cardId+':'+c.currency);
    if(baselineDate&&c.purchaseDate<=baselineDate)return;
    const n=finiteMoney(c.amount);
    if(n===null)return;
    summary[c.currency]=Math.round((summary[c.currency]+n)*100)/100;
    summary.count++;
  });
  return summary;
}

// Automatic reference against the highest linked, reviewed statement month.
// This is an independent, opt-in app notification. The user-defined ceiling
// remains the preferred early-warning target; a historical record alone is NOT
// evidence of affordability or available credit.
export function historicalPeakStatus(current,history=[],currency='ARS') {
  const stats=statementMonthExtremes(history,currency);
  const peak=stats.high;
  if(!peak||!Number.isFinite(peak.total)||peak.total<=0)return null;
  const spent=finiteMoney(current?.[currency])??0;
  const ratio=spent/peak.total;
  const level=ratio>=1?'exceeded':ratio>=0.95?'critical':ratio>=0.8?'warning':'ok';
  return {currency,month:current?.month||'',spent,peak:peak.total,peakMonth:peak.month,
    low:stats.low?.total??null,lowMonth:stats.low?.month||null,
    average:stats.average,monthsAnalyzed:stats.months.length,level,ratio,
    percentage:Math.round(ratio*100),
    remaining:Math.round(Math.max(0,peak.total-spent)*100)/100,
    // Missing months, missing issuers, manual charges and differing closing
    // periods make comparisons approximate, even when sample is bigger.
    partial:true};
}
export function budgetStatus(current,config,currency,month) {
  if(!config?.enabled||config.currency!==currency)return null;
  const limit=finiteMoney(config.limit);
  if(!limit||limit<=0)return null;
  const spent=Number(current?.[currency]||0);
  const ratio=spent/limit,percentage=Math.round(ratio*100);
  const warnPercent=Number(config.warnPercent)||80;
  const level=ratio>=1?'exceeded':ratio >= warnPercent/100?'warning':'ok';
  return {month,currency,spent,limit,ratio,percentage,warnPercent,level,
    remaining:Math.round(Math.max(0,limit-spent)*100)/100};
}
