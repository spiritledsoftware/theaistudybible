import { describe, expect, it } from 'vitest';
import { applyQuotaCommand, type QuotaState } from './quota-ledger';

const DAY = 86_400_000;
const START = Date.parse('2026-07-20T00:00:00.000Z');

function emptyState(): QuotaState {
  return { reservations: {} };
}

describe('quota ledger', () => {
  it('rolls back a failed billable operation without consuming quota', () => {
    const reserved = applyQuotaCommand(emptyState(), {
      id: 'request-1',
      limit: 2,
      now: START,
      type: 'reserve',
      windowMs: DAY,
    });

    expect(reserved.result).toEqual({
      allowed: true,
      remaining: 1,
      resetAt: START + DAY,
    });

    const rolledBack = applyQuotaCommand(reserved.state, {
      id: 'request-1',
      now: START + 1_000,
      type: 'rollback',
    });

    expect(rolledBack.state.reservations).toEqual({});
  });

  it('charges a successful operation exactly once', () => {
    const reserved = applyQuotaCommand(emptyState(), {
      id: 'request-1',
      limit: 1,
      now: START,
      type: 'reserve',
      windowMs: DAY,
    });
    const committed = applyQuotaCommand(reserved.state, {
      id: 'request-1',
      now: START + 1_000,
      type: 'commit',
    });
    const replayed = applyQuotaCommand(committed.state, {
      id: 'request-1',
      now: START + 2_000,
      type: 'commit',
    });

    expect(replayed.state.reservations['request-1']).toEqual({
      createdAt: START,
      status: 'committed',
    });
  });

  it('reports remaining quota without consuming a reservation', () => {
    const reserved = applyQuotaCommand(emptyState(), {
      id: 'request-1',
      limit: 2,
      now: START,
      type: 'reserve',
      windowMs: DAY,
    });
    const status = applyQuotaCommand(reserved.state, {
      limit: 2,
      now: START + 1,
      type: 'status',
      windowMs: DAY,
    });

    expect(status.result).toEqual({
      allowed: true,
      remaining: 1,
      resetAt: START + DAY,
    });
    expect(status.state).toEqual(reserved.state);
  });

  it('serializes reservations at the exact limit', () => {
    const first = applyQuotaCommand(emptyState(), {
      id: 'request-1',
      limit: 1,
      now: START,
      type: 'reserve',
      windowMs: DAY,
    });
    const second = applyQuotaCommand(first.state, {
      id: 'request-2',
      limit: 1,
      now: START + 1,
      type: 'reserve',
      windowMs: DAY,
    });

    expect(second.result).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: START + DAY,
    });
  });

  it('expires charges using a sliding window', () => {
    const exhausted = applyQuotaCommand(emptyState(), {
      id: 'previous',
      limit: 1,
      now: START,
      type: 'reserve',
      windowMs: DAY,
    });

    const nextWindow = applyQuotaCommand(exhausted.state, {
      id: 'request-2',
      limit: 1,
      now: START + DAY,
      type: 'reserve',
      windowMs: DAY,
    });

    expect(nextWindow.result).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: START + DAY * 2,
    });
    expect(Object.keys(nextWindow.state.reservations)).toEqual(['request-2']);
  });
});
