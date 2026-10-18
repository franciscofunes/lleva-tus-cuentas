import { validDate } from './bankingModel';

// Historical spending is sourced ONLY from unique, explicitly linked, reviewed PDF
// statements. Manual charges and statement expenses are never added to these totals.
const monthOf = (s) => /^20\d{2}-(0[1-9]|1[0-2])$/.test(s?.period || '') ? s.period
  : validDate(s?.closingDate) ? s.closingDate.slice(0,7) : null;
const finiteMoney = value => {
  if (value === '' || value === null || value === undefined) return null;
  const n=Number(value);
  return Number.isFinite(n) && n>=0 && n<1e12?n:null;
};
export function statementMonthlyHistory(statements=[],links=[],cards=[]) {
  const ownerCardIds=new Set(cards.map(c=>c.id));
  const byExpense=new Map();
  const linksByExpense=new Map(links.filter(l=>ownerCardIds.has(l.cardId)).map(l=>[l.expenseId,l]));
  statements.forEach(s=>{
    const link=linksByExpense.get(s.expenseId);
    if(!link || byExpense.has(s.expenseId) || !s.approvedByUser) return;
    const month=monthOf(s);
    if(!month)return;
    byExpense.set(s.expenseId,{...s,month});
  });
  const groups=new Map();
  byExpense.forEach(s=>{
    for(const currency of ['ARS','USD']){
      const purchase=finiteMoney(s.purchases?.[currency]);
      const total=finiteMoney(s.totals?.[currency]);
      const amount=purchase===null?total:purchase;
      if(amount===null)continue;
      const key=s.month+'-'+currency;
      const group=groups.get(key)||{month:s.month,currency,total:0,statementCount:0,estimatedFromTotal:false};
      group.total=Math.round((group.total+amount)*100)/100;
      group.statementCount++;
      if(purchase===null)group.estimatedFromTotal=true;
      groups.set(key,group);
    }
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
export function cardMonthManualSpending(charges=[],statements=[],links=[],cards=[],now=new Date()) {
  const month=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0')].join('-');
  const activeCards=new Map(cards.map(c=>[c.id,c]));
  const latestClose=new Map();
  const linksByExpense=new Map(links.map(l=>[l.expenseId,l]));
  statements.forEach(s=>{
    const link=linksByExpense.get(s.expenseId);
    if(!link||!activeCards.has(link.cardId)||!validDate(s.closingDate))return;
    const previous=latestClose.get(link.cardId);
    if(!previous||s.closingDate>previous)latestClose.set(link.cardId,s.closingDate);
  });
  const summary={ARS:0,USD:0,count:0,manualOnly:true,month};
  charges.forEach(c=>{
    if(!activeCards.has(c.cardId)||activeCards.get(c.cardId).bankId!==c.bankId ||
       c.source!=='manual'||!['ARS','USD'].includes(c.currency)||!validDate(c.purchaseDate) ||
       !c.purchaseDate.startsWith(month)||c.purchaseDate<=String(latestClose.get(c.cardId)||'') )return;
    const n=finiteMoney(c.amount);
    if(n===null)return;
    summary[c.currency]=Math.round((summary[c.currency]+n)*100)/100;
    summary.count++;
  });
  return summary;
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
