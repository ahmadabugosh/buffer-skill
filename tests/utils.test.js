import { describe, it, expect } from 'vitest';
import { parseScheduleTime, parseProfilesList, validatePostText } from '../lib/utils.js';

describe('utils', () => {
  describe('validatePostText', () => {
    it('returns trimmed text when valid', () => {
      expect(validatePostText('  Hello Buffer  ')).toBe('Hello Buffer');
    });

    it('throws when text is missing', () => {
      expect(() => validatePostText('   ')).toThrow(/Post text is required/);
    });

    it('throws when text exceeds max length', () => {
      expect(() => validatePostText('a'.repeat(3001))).toThrow(/must be 3000 characters or less/);
    });
  });

  describe('parseScheduleTime', () => {
    it('returns null when no time provided', () => {
      expect(parseScheduleTime()).toBeNull();
    });

    it('returns normalized ISO string for valid datetime', () => {
      expect(parseScheduleTime('2026-03-03T14:00:00Z')).toBe('2026-03-03T14:00:00.000Z');
    });

    it('throws on invalid datetime input', () => {
      expect(() => parseScheduleTime('tomorrow 2pm')).toThrow(/Invalid schedule time/);
    });
  });

  describe('parseProfilesList', () => {
    it('parses comma-separated profiles and trims values', () => {
      expect(parseProfilesList('twitter, linkedin ,facebook')).toEqual(['twitter', 'linkedin', 'facebook']);
    });

    it('returns empty list when value not provided', () => {
      expect(parseProfilesList()).toEqual([]);
    });

    it('throws when list is provided but empty after trimming', () => {
      expect(() => parseProfilesList(' ,  , ')).toThrow(/No valid profile IDs found/);
    });
  });
});
