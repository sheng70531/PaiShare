import assert from 'node:assert/strict';
import { computeBalances, settleBalances, settleTrip } from './settlement';
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

console.log('settlement.selfcheck: all passed');
