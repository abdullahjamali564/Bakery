import test from 'node:test';
import assert from 'node:assert/strict';
import { isBranchOpen } from '../src/utils/hours.js';

test('uses branch timezone when determining open hours', () => {
  const utcMorning = new Date('2026-09-04T12:00:00.000Z');
  assert.equal(isBranchOpen({ open: '08:00', close: '20:00' }, 'America/New_York', utcMorning), true);
});

test('supports overnight operating hours', () => {
  const lateNight = new Date('2026-09-04T23:30:00.000Z');
  assert.equal(isBranchOpen({ open: '18:00', close: '02:00' }, 'UTC', lateNight), true);
});
