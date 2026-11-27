import assert from 'node:assert/strict';
import { keyboardLift } from './keyboard-lift';

assert.equal(keyboardLift(800, null), 0);
assert.equal(keyboardLift(800, 500), 300);
assert.equal(keyboardLift(500, 500), 0);
assert.equal(keyboardLift(480, 520), 0);

console.log('keyboard-lift ok');
