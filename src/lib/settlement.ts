import type { Expense, LedgerLine, TransferSuggestion } from '../models/types';

/** ponytail: money in integer cents; upgrade path = BigInt if amounts exceed Number.MAX_SAFE_INTEGER/100 */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

/** Net of one ledger line in cents. Positive means that person should receive. */
export function ledgerLineNetCents(line: { buyIn: number; cashOut: number }): number {
  return Math.round(line.cashOut * 100) - Math.round(line.buyIn * 100);
}

/** Store a signed net in the existing buy-in / cash-out pair. */
export function netCentsToLedgerLine(personId: string, netCents: number): LedgerLine {
  const amount = Math.abs(netCents) / 100;
  if (netCents > 0) return { personId, buyIn: 0, cashOut: amount };
  if (netCents < 0) return { personId, buyIn: amount, cashOut: 0 };
  return { personId, buyIn: 0, cashOut: 0 };
}

export function formatNetDraft(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return `${sign}${whole}`;
  if (frac % 10 === 0) return `${sign}${whole}.${frac / 10}`;
  return `${sign}${whole}.${String(frac).padStart(2, '0')}`;
}

export type NetDraft =
  | { kind: 'empty' }
  | { kind: 'partial' }
  | { kind: 'invalid' }
  | { kind: 'value'; cents: number };

/** Empty means not entered. A lone minus or trailing dot is still being typed. */
export function parseNetDraft(text: string): NetDraft {
  const t = text
    .trim()
    .replace(/,/g, '')
    .replace(/＋/g, '+')
    .replace(/[－−]/g, '-');
  if (t === '') return { kind: 'empty' };
  if (/^[+-]?\d+\.$/.test(t) || !/\d/.test(t)) {
    return /^[+-]?\d*\.?$/.test(t) ? { kind: 'partial' } : { kind: 'invalid' };
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return { kind: 'invalid' };
  const cents = Math.round(Number(t) * 100);
  if (!Number.isFinite(cents)) return { kind: 'invalid' };
  return { kind: 'value', cents };
}

/**
 * When exactly one person is blank and the others don't already sum to 0,
 * that person is the remainder. A 0 remainder stays blank so a sit-out is not recorded as a push.
 */
export function balancingNetCents(
  entries: { id: string; cents: number | null }[],
): { id: string; cents: number } | null {
  const blanks = entries.filter((e) => e.cents === null);
  const filled = entries.filter((e) => e.cents !== null);
  if (blanks.length !== 1 || filled.length < 1) return null;
  const sum = filled.reduce((s, e) => s + (e.cents ?? 0), 0);
  if (sum === 0) return null;
  return { id: blanks[0].id, cents: -sum };
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
    } else if (expense.type === 'transfer') {
      const cents = toCents(expense.amount);
      if (cents <= 0 || expense.fromId === expense.toId) continue;
      balances[expense.fromId] = (balances[expense.fromId] ?? 0) - cents;
      balances[expense.toId] = (balances[expense.toId] ?? 0) + cents;
    } else {
      for (const line of expense.lines) {
        const cents = ledgerLineNetCents(line);
        balances[line.personId] = (balances[line.personId] ?? 0) + cents;
      }
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

export function formatSignedMoney(amount: number): string {
  const body = formatMoney(Math.abs(amount));
  if (amount > 0) return `+${body}`;
  if (amount < 0) return `−${body}`;
  return body;
}

/** One line for a group chat. Empty transfers copy as already settled. */
export function formatSettlementText(
  title: string,
  transfers: TransferSuggestion[],
  nameOf: (id: string) => string,
): string {
  const body =
    transfers.length === 0
      ? '帳已平'
      : transfers
          .map((t) => `${nameOf(t.fromId)}給${nameOf(t.toId)} ${formatMoney(t.amount)}`)
          .join('、');
  return title ? `${title}\n${body}` : body;
}
