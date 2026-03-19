import {
  getCurrentWeekStart,
  getLocalDateString,
  getLocalDayName,
  isInCurrentLocalWeek,
  isSameDay,
  getCurrentDayName,
} from '../../utils/weekUtils';

describe('weekUtils', () => {
  describe('getCurrentWeekStart', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const result = getCurrentWeekStart();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns the Monday of the current week', () => {
      const result = getCurrentWeekStart();
      const monday = new Date(result + 'T00:00:00');
      expect(monday.getDay()).toBe(1); // 1 = Monday
    });

    it('result is a Monday even when today is Sunday', () => {
      // Mock Sunday
      const realDate = Date;
      const mockSunday = new Date('2026-03-15T12:00:00'); // Sunday
      jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
        if (arg === undefined) return mockSunday as any;
        return new realDate(arg) as any;
      });
      (global.Date as any).now = realDate.now;

      const result = getCurrentWeekStart();
      const monday = new Date(result + 'T00:00:00');
      expect(monday.getDay()).toBe(1);
      expect(result).toBe('2026-03-09'); // Previous Monday

      jest.restoreAllMocks();
    });
  });

  describe('isSameDay', () => {
    it('returns true for timestamps on the same local calendar day', () => {
      expect(isSameDay('2026-03-16T08:00:00.000Z', '2026-03-16T18:00:00.000Z')).toBe(true);
    });

    it('returns false for different day timestamps', () => {
      expect(isSameDay('2026-03-16T08:00:00.000Z', '2026-03-17T08:00:00.000Z')).toBe(false);
    });
  });

  describe('getLocalDateString', () => {
    it('returns a YYYY-MM-DD local date string', () => {
      expect(getLocalDateString('2026-03-16T08:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getLocalDayName', () => {
    it('returns a valid lowercase local day name', () => {
      const valid = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      expect(valid).toContain(getLocalDayName('2026-03-16T08:00:00.000Z'));
    });
  });

  describe('isInCurrentLocalWeek', () => {
    it('returns true for a date in the current mocked week', () => {
      const realDate = Date;
      const mockWednesday = new Date('2026-03-18T12:00:00');
      jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
        if (arg === undefined) return mockWednesday as any;
        return new realDate(arg) as any;
      });
      (global.Date as any).now = realDate.now;

      expect(isInCurrentLocalWeek('2026-03-16T08:00:00.000Z')).toBe(true);
      expect(isInCurrentLocalWeek('2026-03-23T08:00:00.000Z')).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('getCurrentDayName', () => {
    it('returns a valid lowercase day name', () => {
      const valid = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      expect(valid).toContain(getCurrentDayName());
    });
  });
});
