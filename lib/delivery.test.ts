import { describe, expect, it } from 'vitest';
import { clockOffset, elapsedMinutes, minutesRemaining, riderProgress, stageFor } from './delivery';

describe('stageFor', () => {
  it('advances at 20%, 50% and 100% of the ETA', () => {
    expect(stageFor(0, 10)).toBe('placed');
    expect(stageFor(1.9, 10)).toBe('placed');
    expect(stageFor(2, 10)).toBe('packed');
    expect(stageFor(4.9, 10)).toBe('packed');
    expect(stageFor(5, 10)).toBe('on_the_way');
    expect(stageFor(9.9, 10)).toBe('on_the_way');
    expect(stageFor(10, 10)).toBe('delivered');
  });

  it('handles a zero ETA as delivered', () => {
    expect(stageFor(0, 0)).toBe('delivered');
  });
});

describe('riderProgress', () => {
  it('moves from 0 to 1 only while the rider is on the way', () => {
    expect(riderProgress(4, 10)).toBe(0);
    expect(riderProgress(5, 10)).toBe(0);
    expect(riderProgress(7.5, 10)).toBeCloseTo(0.5);
    expect(riderProgress(10, 10)).toBe(1);
    expect(riderProgress(20, 10)).toBe(1);
  });
});

describe('time helpers', () => {
  it('never shows negative minutes remaining', () => {
    expect(minutesRemaining(4, 10)).toBe(6);
    expect(minutesRemaining(12, 10)).toBe(0);
  });

  it('corrects a skewed device clock with the server offset', () => {
    const server = '2026-10-22T10:00:00.000Z';
    const device = new Date('2026-10-22T09:00:00.000Z').getTime();
    const offset = clockOffset(server, device);
    expect(elapsedMinutes('2026-10-22T09:50:00.000Z', device, offset)).toBe(10);
  });
});
