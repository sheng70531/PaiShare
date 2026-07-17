import assert from 'node:assert/strict';
import { computeBalances, settleBalances, settleTrip } from './settlement';
import type { Expense } from '../models/types';

function ids(...names: string[]) {
  return names;
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
// A paid 300 for A,B,C (B,C each -100 to A). Transfer: A owes B 100 → nets to C→A 100 only for B/A cancel
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
  assert.equal(bal.a, 100); // 200 - 100
  assert.equal(bal.b, 0); // -100 + 100
  assert.equal(bal.c, -100);
  const t = settleTrip(ids('a', 'b', 'c'), expenses);
  assert.deepEqual(t, [{ fromId: 'c', toId: 'a', amount: 100 }]);
}

console.log('settlement.selfcheck: all passed');
