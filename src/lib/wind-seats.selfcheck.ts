import assert from 'node:assert/strict';
import { WINDS, type WindDraw } from '../models/types';
import {
  chairWind,
  normalizeWindDraw,
  sameSeatOrder,
  shuffleWinds,
  startSeatIndex,
  windCycle,
} from './wind-seats';

{
  const stuck = shuffleWinds(() => 0);
  assert.deepEqual(stuck, ['南', '西', '北', '東']);

  const still = shuffleWinds(() => 0.99);
  assert.deepEqual(still, ['東', '南', '西', '北']);

  const shuffled = shuffleWinds(() => 0.5);
  assert.equal(shuffled.length, 4);
  assert.deepEqual([...shuffled].sort(), [...WINDS].sort());
}

{
  assert.equal(startSeatIndex(5), 0);
  assert.equal(startSeatIndex(14), 1);
  assert.equal(startSeatIndex(11), 2);
  assert.equal(startSeatIndex(8), 3);
  assert.equal(startSeatIndex(2), null);
  assert.equal(startSeatIndex(19), null);
}

{
  const members = ['a', 'b', 'c', 'd'];
  const draw: WindDraw = {
    order: ['a', 'b', 'c', 'd'],
    dice: [1, 2, 2],
    seats: [
      { personId: 'a', wind: '東' },
      { personId: 'b', wind: '南' },
      { personId: 'c', wind: '西' },
      { personId: 'd', wind: '北' },
    ],
  };
  assert.deepEqual(normalizeWindDraw(draw, members)?.dice, [1, 2, 2]);
  assert.equal(normalizeWindDraw({ ...draw, dice: [0, 2, 2] }, members), null);
  assert.equal(normalizeWindDraw({ ...draw, dice: [7, 1, 1] }, members), null);
  assert.equal(
    normalizeWindDraw(
      {
        ...draw,
        seats: [
          { personId: 'a', wind: '東' },
          { personId: 'b', wind: '東' },
          { personId: 'c', wind: '西' },
          { personId: 'd', wind: '北' },
        ],
      },
      members,
    ),
    null,
  );
  assert.equal(normalizeWindDraw(draw, ['a', 'b', 'c']), null);
}

{
  assert.equal(sameSeatOrder(['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a']), true);
  assert.equal(sameSeatOrder(['a', 'b', 'c', 'd'], ['a', 'd', 'c', 'b']), false);
  assert.equal(sameSeatOrder(['a', 'b', 'c', 'd'], ['a', 'b', 'd', 'c']), false);
  assert.equal(chairWind(1, 1), '東');
  assert.equal(chairWind(1, 2), '南');
  assert.equal(chairWind(1, 0), '北');
  assert.equal(chairWind(1, 4), null);
  assert.deepEqual(
    windCycle([
      { personId: 'a', wind: '南' },
      { personId: 'b', wind: '東' },
      { personId: 'c', wind: '西' },
      { personId: 'd', wind: '北' },
    ]),
    ['b', 'a', 'c', 'd'],
  );
}

console.log('wind-seats.selfcheck: all passed');
