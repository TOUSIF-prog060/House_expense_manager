export type SplitMethod = 'equal' | 'exact' | 'percentage';
export type SplitInput = { userId: string; value?: string | number };

const toPaise = (amount: string | number): number => {
  const value = String(amount).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter an amount with up to two decimal places.');
  const [rupees, fraction = ''] = value.split('.');
  return Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
};
export const formatRupees = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function calculateShares(amount: string | number, participants: SplitInput[], method: SplitMethod): Record<string, number> {
  const total = toPaise(amount);
  if (total <= 0 || participants.length === 0) throw new Error('An expense needs a positive amount and at least one participant.');
  if (new Set(participants.map((p) => p.userId)).size !== participants.length) throw new Error('Each participant can only be selected once.');
  let portions: number[];
  if (method === 'equal') {
    const quotient = Math.floor(total / participants.length);
    portions = participants.map((_, index) => quotient + (index < total % participants.length ? 1 : 0));
  } else if (method === 'exact') {
    portions = participants.map((person) => toPaise(person.value ?? 0));
    if (portions.some((part) => part < 0) || portions.reduce((sum, part) => sum + part, 0) !== total) throw new Error('Exact shares must add up to the expense amount.');
  } else {
    const percents = participants.map((person) => Number(person.value));
    if (percents.some((p) => !Number.isFinite(p) || p < 0) || Math.round(percents.reduce((sum, p) => sum + p, 0) * 100) !== 10000) throw new Error('Percentages must add up to 100%.');
    const raw = percents.map((p) => (total * p) / 100);
    portions = raw.map(Math.floor);
    const pennies = total - portions.reduce((sum, part) => sum + part, 0);
    raw.map((amountPart, index) => ({ index, remainder: amountPart - Math.floor(amountPart) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index).slice(0, pennies).forEach(({ index }) => { portions[index] += 1; });
  }
  return Object.fromEntries(participants.map(({ userId }, index) => [userId, portions[index]]));
}

export type Balance = { userId: string; name: string; balancePaise: number };
export type Transfer = { fromUserId: string; fromName: string; toUserId: string; toName: string; amountPaise: number };
export function simplifySettlements(balances: Balance[]): Transfer[] {
  const creditors = balances.filter((person) => person.balancePaise > 0).map((p) => ({ ...p })).sort((a, b) => b.balancePaise - a.balancePaise);
  const debtors = balances.filter((person) => person.balancePaise < 0).map((p) => ({ ...p, balancePaise: -p.balancePaise })).sort((a, b) => b.balancePaise - a.balancePaise);
  const net = balances.reduce((sum, person) => sum + person.balancePaise, 0);
  if (net !== 0) throw new Error('Balances must net to zero before settlement.');
  const transfers: Transfer[] = [];
  let debtorIndex = 0; let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amountPaise = Math.min(debtors[debtorIndex].balancePaise, creditors[creditorIndex].balancePaise);
    if (amountPaise > 0) transfers.push({ fromUserId: debtors[debtorIndex].userId, fromName: debtors[debtorIndex].name, toUserId: creditors[creditorIndex].userId, toName: creditors[creditorIndex].name, amountPaise });
    debtors[debtorIndex].balancePaise -= amountPaise; creditors[creditorIndex].balancePaise -= amountPaise;
    if (debtors[debtorIndex].balancePaise === 0) debtorIndex++;
    if (creditors[creditorIndex].balancePaise === 0) creditorIndex++;
  }
  return transfers;
}
