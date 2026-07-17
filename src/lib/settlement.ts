import type { Expense, TransferSuggestion } from '../models/types';

/** ponytail: money in integer cents; upgrade path = BigInt if amounts exceed Number.MAX_SAFE_INTEGER/100 */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

/** Apply all expenses → net balance per person in dollars (positive = should receive). */
export function computeBalances(
  personIds: string[],
  expenses: Expense[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const id of personIds) balances[id] = 0;

  for (const expense of expenses) {
    if (expense.type === 'split') {
      const n = expense.participantIds.length;
      const cents = toCents(expense.amount);
      if (n === 0 || cents <= 0) continue;
      const base = Math.floor(cents / n);
      let rem = cents - base * n;
      balances[expense.paidById] = (balances[expense.paidById] ?? 0) + cents;
      for (const pid of expense.participantIds) {
        const share = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem -= 1;
        balances[pid] = (balances[pid] ?? 0) - share;
      }
    } else {
      const cents = toCents(expense.amount);
      if (cents <= 0 || expense.fromId === expense.toId) continue;
      balances[expense.fromId] = (balances[expense.fromId] ?? 0) - cents;
      balances[expense.toId] = (balances[expense.toId] ?? 0) + cents;
    }
  }

  const out: Record<string, number> = {};
  for (const id of Object.keys(balances)) out[id] = fromCents(balances[id]);
  return out;
}

/** Greedy min-cash-flow: pair largest debtor with largest creditor. */
export function settleBalances(balances: Record<string, number>): TransferSuggestion[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, bal] of Object.entries(balances)) {
    const cents = toCents(bal);
    if (cents < 0) debtors.push({ id, amount: -cents });
    else if (cents > 0) creditors.push({ id, amount: cents });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: TransferSuggestion[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amount: fromCents(pay),
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i += 1;
    if (creditors[j].amount === 0) j += 1;
  }

  return transfers;
}

export function settleTrip(
  personIds: string[],
  expenses: Expense[],
): TransferSuggestion[] {
  return settleBalances(computeBalances(personIds, expenses));
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
