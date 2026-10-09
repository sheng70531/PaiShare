import assert from 'node:assert/strict';
import { pokerSheet, summarizePoker } from './poker-record';
import { mergeRoster } from './roster';
import type { Expense, Trip } from '../models/types';

function trip(id: string, people: Trip['people'], expenses: Expense[]): Trip {
  return {
    id,
    title: id,
    createdAt: '',
    updatedAt: '',
    people,
    expenses,
    settlementMarks: [],
  };
}

{
  const poker = (expenseId: string, lines: Extract<Expense, { type: 'ledger' }>['lines']): Expense => ({
    id: expenseId,
    type: 'ledger',
    title: '牌',
    createdAt: '',
    lines,
  });

  const trips: Trip[] = [
    trip(
      't1',
      [
        { id: 'a', name: '小明' },
        { id: 'b', name: '小華' },
      ],
      [
        poker('1', [
          { personId: 'a', buyIn: 100, cashOut: 200 },
          { personId: 'b', buyIn: 200, cashOut: 100 },
        ]),
        {
          id: 'split',
          type: 'split',
          title: '餐',
          amount: 90,
          paidById: 'a',
          participantIds: ['a', 'b'],
          createdAt: '',
        },
        {
          id: 'xfer',
          type: 'transfer',
          title: '代買',
          amount: 10,
          fromId: 'b',
          toId: 'a',
          createdAt: '',
        },
      ],
    ),
    trip(
      't2',
      [
        { id: 'a', name: '舊名' },
        { id: 'c', name: '小明' },
      ],
      [
        poker('2', [
          { personId: 'a', buyIn: 50, cashOut: 100 },
          { personId: 'c', buyIn: 100, cashOut: 50 },
        ]),
        poker('3', [
          { personId: 'a', buyIn: 80, cashOut: 80 },
        ]),
      ],
    ),
  ];

  const rows = summarizePoker(trips, [{ id: 'a', name: '小明' }]);
  const a = rows.find((r) => r.personId === 'a');
  const b = rows.find((r) => r.personId === 'b');
  const c = rows.find((r) => r.personId === 'c');
  assert.ok(a && b && c);
  assert.equal(a.name, '小明');
  assert.equal(a.sessions, 3);
  assert.equal(a.wins, 2);
  assert.equal(a.losses, 0);
  assert.equal(a.pushes, 1);
  assert.equal(a.net, 150);
  assert.equal(a.best, 100);
  assert.equal(a.worst, 0);
  assert.equal(b.net, -100);
  assert.equal(b.sessions, 1);
  assert.equal(b.losses, 1);
  assert.equal(b.best, 0);
  assert.equal(b.worst, -100);
  assert.equal(c.name, '小明');
  assert.equal(c.net, -50);
  assert.notEqual(a.personId, c.personId);
  assert.deepEqual(
    rows.map((r) => r.personId),
    ['a', 'c', 'b'],
  );

  const sheet = pokerSheet(trips, [{ id: 'a', name: '小明' }]);
  assert.deepEqual(
    sheet.people.map((p) => p.personId),
    ['a', 'c', 'b'],
  );
  assert.deepEqual(
    sheet.sessions.map((s) => s.label),
    ['t1 · 牌', 't2 · 牌', 't2 · 牌'],
  );
  assert.equal(sheet.sessions[0].nets.a, 100);
  assert.equal(sheet.sessions[0].nets.b, -100);
  assert.equal('c' in sheet.sessions[0].nets, false);
  assert.equal(sheet.sessions[1].nets.c, -50);
  assert.equal(sheet.sessions[2].nets.a, 0);
  assert.equal(sheet.people[0].net, 150);
}

{
  const onlyWin = summarizePoker(
    [
      trip(
        't',
        [{ id: 'a', name: 'A' }],
        [
          {
            id: '1',
            type: 'ledger',
            title: '牌',
            createdAt: '',
            lines: [{ personId: 'a', buyIn: 0, cashOut: 600 }],
          },
        ],
      ),
    ],
    [],
  );
  assert.equal(onlyWin[0].best, 600);
  assert.equal(onlyWin[0].worst, 0);
}

{
  const merged = mergeRoster(
    [{ id: 'a', name: 'Ann' }],
    [
      trip(
        't',
        [
          { id: 'a', name: 'Old' },
          { id: 'b', name: 'B' },
        ],
        [],
      ),
    ],
  );
  assert.deepEqual(merged, [
    { id: 'a', name: 'Ann' },
    { id: 'b', name: 'B' },
  ]);
}

console.log('poker-record.selfcheck: all passed');