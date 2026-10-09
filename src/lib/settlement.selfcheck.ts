import assert from 'node:assert/strict';
import {
  balancingNetCents,
  computeBalances,
  formatNetDraft,
  formatSettlementText,
  ledgerLineNetCents,
  netCentsToLedgerLine,
  parseNetDraft,
  settleBalances,
  settleTrip,
} from './settlement';
import type { Expense } from '../models/types';

function ids(...names: string[]) {
  return names;
}

function sumBalances(bal: Record<string, number>): number {
  return Object.values(bal).reduce((a, b) => a + b, 0);
}

// Equal split: A paid 300 for A,B,C → each owes 100; A net +200
{
  const expenses: Expense[] = [
    {
      id: '1',
      type: 'split',
      title: '午餐',
      amount: 300,
      paidById: 'a',
      participantIds: ['a', 'b', 'c'],
      createdAt: '',
    },
  ];
  const bal = computeBalances(ids('a', 'b', 'c'), expenses);
  assert.equal(bal.a, 200);
  assert.equal(bal.b, -100);
  assert.equal(bal.c, -100);
  assert.equal(sumBalances(bal), 0);
  const t = settleBalances(bal);
  assert.equal(t.length, 2);
  assert.ok(t.every((x) => x.toId === 'a' && x.amount === 100));
}

// Partial participants: A paid 100 for only B → B owes A 100
{
  const expenses: Expense[] = [
    {
      id: '2',
      type: 'split',
      title: '飲料',
      amount: 100,
      paidById: 'a',
      participantIds: ['b'],
      createdAt: '',
    },
  ];
  const bal = computeBalances(ids('a', 'b'), expenses);
  assert.equal(bal.a, 100);
  assert.equal(bal.b, -100);
  assert.equal(sumBalances(bal), 0);
}

// Pure transfer: B owes A 500 (card game)
{
  const expenses: Expense[] = [
    {
      id: '3',
      type: 'transfer',
      title: '打牌',
      amount: 500,
      fromId: 'b',
      toId: 'a',
      createdAt: '',
    },
  ];
  const t = settleTrip(ids('a', 'b'), expenses);
  assert.deepEqual(t, [{ fromId: 'b', toId: 'a', amount: 500 }]);
}

// Mixed: split + transfer net out
{
  const expenses: Expense[] = [
    {
      id: '4',
      type: 'split',
      title: '晚餐',
      amount: 300,
      paidById: 'a',
      participantIds: ['a', 'b', 'c'],
      createdAt: '',
    },
    {
      id: '5',
      type: 'transfer',
      title: '代付',
      amount: 100,
      fromId: 'a',
      toId: 'b',
      createdAt: '',
    },
  ];
  const bal = computeBalances(ids('a', 'b', 'c'), expenses);
  assert.equal(bal.a, 100);
  assert.equal(bal.b, 0);
  assert.equal(bal.c, -100);
  assert.equal(sumBalances(bal), 0);
  const t = settleTrip(ids('a', 'b', 'c'), expenses);
  assert.deepEqual(t, [{ fromId: 'c', toId: 'a', amount: 100 }]);
}

// Non-divisible: 100 / 3 — remainder cents to first participants; sum must be 0
{
  const expenses: Expense[] = [
    {
      id: '6',
      type: 'split',
      title: '咖啡',
      amount: 100,
      paidById: 'a',
      participantIds: ['a', 'b', 'c'],
      createdAt: '',
    },
  ];
  const bal = computeBalances(ids('a', 'b', 'c'), expenses);
  // 10000¢ / 3 → 3334, 3333, 3333; A: +10000-3334 = 6666¢
  assert.equal(bal.a, 66.66);
  assert.equal(bal.b, -33.33);
  assert.equal(bal.c, -33.33);
  assert.equal(sumBalances(bal), 0);
  const t = settleBalances(bal);
  assert.equal(t.length, 2);
  const total = t.reduce((s, x) => s + x.amount, 0);
  assert.equal(total, 66.66);
  assert.ok(t.every((x) => x.toId === 'a'));
}

// Multi creditor/debtor greedy pairing
{
  const expenses: Expense[] = [
    {
      id: '7',
      type: 'split',
      title: 'A墊',
      amount: 90,
      paidById: 'a',
      participantIds: ['a', 'b', 'c'],
      createdAt: '',
    },
    {
      id: '8',
      type: 'split',
      title: 'D墊',
      amount: 60,
      paidById: 'd',
      participantIds: ['b', 'c', 'd'],
      createdAt: '',
    },
  ];
  const bal = computeBalances(ids('a', 'b', 'c', 'd'), expenses);
  assert.equal(sumBalances(bal), 0);
  const t = settleTrip(ids('a', 'b', 'c', 'd'), expenses);
  const paid = t.reduce((s, x) => s + x.amount, 0);
  const owed = Object.values(bal)
    .filter((v) => v > 0)
    .reduce((s, v) => s + v, 0);
  assert.equal(paid, owed);
  assert.ok(t.length >= 1);
}

// Ledger buy-in / cash-out, then the same table plus an even dinner split
{
  const ledger: Expense = {
    id: '9',
    type: 'ledger',
    title: '牌',
    createdAt: '',
    lines: [
      { personId: 'a', buyIn: 2000, cashOut: 3000 },
      { personId: 'b', buyIn: 1000, cashOut: 1250 },
      { personId: 'c', buyIn: 1500, cashOut: 770 },
      { personId: 'd', buyIn: 1000, cashOut: 480 },
    ],
  };
  const bal = computeBalances(ids('a', 'b', 'c', 'd'), [ledger]);
  assert.equal(bal.a, 1000);
  assert.equal(bal.b, 250);
  assert.equal(bal.c, -730);
  assert.equal(bal.d, -520);
  assert.equal(sumBalances(bal), 0);
  assert.deepEqual(settleBalances(bal), [
    { fromId: 'c', toId: 'a', amount: 730 },
    { fromId: 'd', toId: 'a', amount: 270 },
    { fromId: 'd', toId: 'b', amount: 250 },
  ]);

  const mixed: Expense[] = [
    ledger,
    {
      id: '10',
      type: 'split',
      title: '晚餐',
      amount: 800,
      paidById: 'a',
      participantIds: ['a', 'b', 'c', 'd'],
      createdAt: '',
    },
  ];
  assert.deepEqual(settleTrip(ids('a', 'b', 'c', 'd'), mixed), [
    { fromId: 'c', toId: 'a', amount: 930 },
    { fromId: 'd', toId: 'a', amount: 670 },
    { fromId: 'd', toId: 'b', amount: 50 },
  ]);
}

// Net-only ledger entry: last blank person balances the table
{
  const entries = [
    { id: 'a', cents: 40000 },
    { id: 'b', cents: -20000 },
    { id: 'c', cents: -10000 },
    { id: 'd', cents: null },
  ];
  assert.deepEqual(balancingNetCents(entries), { id: 'd', cents: -10000 });
  assert.equal(balancingNetCents([...entries, { id: 'e', cents: null }]), null);
  assert.equal(
    balancingNetCents([
      { id: 'a', cents: 100 },
      { id: 'b', cents: -100 },
      { id: 'c', cents: null },
    ]),
    null,
  );

  const line = netCentsToLedgerLine('d', -10000);
  assert.deepEqual(line, { personId: 'd', buyIn: 100, cashOut: 0 });
  assert.equal(ledgerLineNetCents(line), -10000);
  assert.equal(formatNetDraft(-10050), '-100.5');
  assert.deepEqual(parseNetDraft('-100.5'), { kind: 'value', cents: -10050 });
  assert.deepEqual(parseNetDraft(''), { kind: 'empty' });
  assert.deepEqual(parseNetDraft('-'), { kind: 'partial' });
  assert.deepEqual(parseNetDraft('1.'), { kind: 'partial' });
  assert.deepEqual(parseNetDraft('abc'), { kind: 'invalid' });

  const lines = [
    netCentsToLedgerLine('a', 40000),
    netCentsToLedgerLine('b', -20000),
    netCentsToLedgerLine('c', -10000),
    line,
  ];
  const bal = computeBalances(ids('a', 'b', 'c', 'd'), [
    { id: '11', type: 'ledger', title: '淨額', createdAt: '', lines },
  ]);
  assert.equal(bal.a, 400);
  assert.equal(bal.d, -100);
  assert.equal(sumBalances(bal), 0);
}

{
  const nameOf = (id: string) => ({ a: '甲', b: '乙', c: '丙' })[id] ?? '?';
  assert.equal(
    formatSettlementText(
      '今晚',
      [
        { fromId: 'b', toId: 'a', amount: 200 },
        { fromId: 'c', toId: 'a', amount: 100 },
      ],
      nameOf,
    ),
    '今晚\n乙給甲 $200、丙給甲 $100',
  );
  assert.equal(formatSettlementText('今晚', [], nameOf), '今晚\n帳已平');
}

console.log('settlement.selfcheck: all passed');
