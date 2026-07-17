import assert from 'node:assert/strict';
import {
  expensesAfterRemovingPerson,
  impactOfRemovingPerson,
  tripAfterRemovingPerson,
} from './remove-person';
import type { Expense, Trip } from '../models/types';

const baseTrip = (): Trip => ({
  id: 't1',
  title: '測',
  createdAt: '',
  updatedAt: '',
  people: [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ],
  expenses: [],
  settlementMarks: [{ fromId: 'a', toId: 'b', amount: 1, paid: true }],
});

{
  const expenses: Expense[] = [
    {
      id: '1',
      type: 'split',
      title: '餐',
      amount: 100,
      paidById: 'a',
      participantIds: ['a', 'b', 'c'],
      createdAt: '',
    },
    {
      id: '2',
      type: 'split',
      title: '飲料',
      amount: 50,
      paidById: 'b',
      participantIds: ['b', 'c'],
      createdAt: '',
    },
    {
      id: '3',
      type: 'transfer',
      title: '打牌',
      amount: 20,
      fromId: 'c',
      toId: 'a',
      createdAt: '',
    },
  ];

  // remove c: trim #1, trim #2 (c dropped from participants), delete #3
  const next = expensesAfterRemovingPerson(expenses, 'c');
  assert.equal(next.length, 2);
  assert.deepEqual(
    (next[0] as Extract<Expense, { type: 'split' }>).participantIds,
    ['a', 'b'],
  );
  assert.deepEqual(
    (next[1] as Extract<Expense, { type: 'split' }>).participantIds,
    ['b'],
  );

  const impact = impactOfRemovingPerson(expenses, 'c');
  assert.deepEqual(impact, { deleted: 1, trimmed: 2 });

  // remove payer a → delete split #1 and transfer #3
  const dropPayer = expensesAfterRemovingPerson(expenses, 'a');
  assert.deepEqual(
    dropPayer.map((e) => e.id),
    ['2'],
  );
  assert.deepEqual(impactOfRemovingPerson(expenses, 'a'), {
    deleted: 2,
    trimmed: 0,
  });
}

{
  const trip = baseTrip();
  assert.equal(tripAfterRemovingPerson(trip, 'a')!.people.length, 2);
  assert.deepEqual(tripAfterRemovingPerson(trip, 'a')!.settlementMarks, []);

  const two: Trip = {
    ...trip,
    people: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
  };
  assert.equal(tripAfterRemovingPerson(two, 'a'), null);
}

console.log('remove-person.selfcheck: all passed');
