import { describe, expect, it } from 'vitest';
import { parseIso8601DurationToMinutes, parseIso8601DurationToSeconds } from '../iso8601';

describe('parseIso8601DurationToMinutes', () => {
  it('parses minutes only', () => {
    expect(parseIso8601DurationToMinutes('PT35M')).toBe(35);
  });

  it('parses hours + minutes (PT1H30M = 90)', () => {
    expect(parseIso8601DurationToMinutes('PT1H30M')).toBe(90);
  });

  it('parses hours only', () => {
    expect(parseIso8601DurationToMinutes('PT2H')).toBe(120);
  });

  it('parses seconds and rounds to minutes', () => {
    expect(parseIso8601DurationToMinutes('PT90S')).toBe(2);
    expect(parseIso8601DurationToMinutes('PT29S')).toBe(0);
  });

  it('parses days', () => {
    expect(parseIso8601DurationToMinutes('P1DT2H')).toBe(26 * 60);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(parseIso8601DurationToMinutes(' pt45m ')).toBe(45);
  });

  it('supports decimal values', () => {
    expect(parseIso8601DurationToMinutes('PT1.5H')).toBe(90);
    expect(parseIso8601DurationToMinutes('PT0,5H')).toBe(30);
  });

  it('returns null for invalid or empty input', () => {
    expect(parseIso8601DurationToMinutes('')).toBeNull();
    expect(parseIso8601DurationToMinutes('35 minutes')).toBeNull();
    expect(parseIso8601DurationToMinutes('P')).toBeNull();
    expect(parseIso8601DurationToMinutes('PT')).toBeNull();
    expect(parseIso8601DurationToMinutes(null)).toBeNull();
    expect(parseIso8601DurationToMinutes(undefined)).toBeNull();
    expect(parseIso8601DurationToMinutes(42)).toBeNull();
  });
});

describe('parseIso8601DurationToSeconds', () => {
  it('parses per-step durations', () => {
    expect(parseIso8601DurationToSeconds('PT5M')).toBe(300);
    expect(parseIso8601DurationToSeconds('PT1H5M30S')).toBe(3930);
  });

  it('returns null for garbage', () => {
    expect(parseIso8601DurationToSeconds('soon')).toBeNull();
  });
});
