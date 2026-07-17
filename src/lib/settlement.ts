import type { Expense, TransferSuggestion } from '../models/types';

const EPS = 0.005;

/** Apply all expenses → net balance per person (positive = should receive). */
export function computeBalances(
  personIds: string[],
  expenses: Expense[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const id of personIds) balances[id] = 0;

  for (const expense of expenses) {
    if (expense.type === 'split') {
      const n = expense.participantIds.length;
      if (n === 0 || expense.amount <= 0) continue;
      const share = expense.amount / n;
      balances[expense.paidById] = (balances[expense.paidById] ?? 0) + expense.amount;
      for (const pid of expense.participantIds) {
        balances[pid] = (balances[pid] ?? 0) - share;
      }
    } else {
      if (expense.amount <= 0 || expense.fromId === expense.toId) continue;
      balances[expense.fromId] = (balances[expense.fromId] ?? 0) - expense.amount;
      balances[expense.toId] = (balances[expense.toId] ?? 0) + expense.amount;
    }
  }

  for (const id of Object.keys(balances)) {
    if (Math.abs(balances[id]) < EPS) balances[id] = 0;
    else balances[id] = Math.round(balances[id] * 100) / 100;
  }
  return balances;
}

/** Greedy min-cash-flow: pair largest debtor with largest creditor. */
export function settleBalances(balances: Record<string, number>): TransferSuggestion[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, bal] of Object.entries(balances)) {
    if (bal < -EPS) debtors.push({ id, amount: -bal });
    else if (bal > EPS) creditors.push({ id, amount: bal });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: TransferSuggestion[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const amount = Math.round(pay * 100) / 100;
    if (amount >= EPS) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amount,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < EPS) i += 1;
    if (creditors[j].amount < EPS) j += 1;
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
