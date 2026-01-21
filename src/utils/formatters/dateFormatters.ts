/**
 * Date Formatters - Single Source of Truth
 *
 * Consolidates 20+ inline date formatting implementations
 * Provides consistent date formatting across the application
 *
 * Replaced implementations from:
 * - Inline toLocaleDateString() calls across 15+ files
 * - Custom formatDate functions in various components
 * - Inconsistent date formatting in screens and components
 */

/**
 * Date Formatter Service
 * Centralized date formatting with consistent locale and options
 */
export const DateFormatters = {
  /**
   * Short date format
   * @example "Jan 21" or "Dec 5"
   */
  short(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  },

  /**
   * Long date format
   * @example "January 21, 2026" or "December 5, 2025"
   */
  long(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  },

  /**
   * Weekday only
   * @example "Monday" or "Friday"
   */
  weekdayOnly(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
    });
  },

  /**
   * Short weekday
   * @example "Mon" or "Fri"
   */
  weekdayShort(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
    });
  },

  /**
   * Month and year
   * @example "Jan 2026" or "Dec 2025"
   */
  monthYear(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  },

  /**
   * Full month and year
   * @example "January 2026" or "December 2025"
   */
  fullMonthYear(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  },

  /**
   * Weekday and date
   * @example "Monday, Jan 21" or "Friday, Dec 5"
   */
  weekdayDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  },

  /**
   * Full format with weekday
   * @example "Monday, January 21, 2026"
   */
  full(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  },

  /**
   * ISO timestamp for API
   * @example "2026-01-21T12:30:00.000Z"
   */
  timestamp(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString();
  },

  /**
   * Date only (no time) for API
   * @example "2026-01-21"
   */
  dateOnly(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
  },

  /**
   * Time only
   * @example "2:30 PM" or "14:30"
   */
  timeOnly(date: Date | string, use24Hour: boolean = false): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: !use24Hour,
    });
  },

  /**
   * Relative time (e.g., "2 days ago", "in 3 hours")
   * @param date - Date to format
   * @param from - Reference date (defaults to now)
   */
  relative(date: Date | string, from?: Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const fromDate = from || new Date();

    const diffMs = d.getTime() - fromDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    const isPast = diffMs < 0;
    const abs = Math.abs;

    if (abs(diffSec) < 60) {
      return "Just now";
    } else if (abs(diffMin) < 60) {
      const minutes = abs(diffMin);
      return isPast
        ? `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
        : `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else if (abs(diffHour) < 24) {
      const hours = abs(diffHour);
      return isPast
        ? `${hours} hour${hours !== 1 ? "s" : ""} ago`
        : `in ${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (abs(diffDay) < 7) {
      const days = abs(diffDay);
      return isPast
        ? `${days} day${days !== 1 ? "s" : ""} ago`
        : `in ${days} day${days !== 1 ? "s" : ""}`;
    } else if (abs(diffWeek) < 4) {
      const weeks = abs(diffWeek);
      return isPast
        ? `${weeks} week${weeks !== 1 ? "s" : ""} ago`
        : `in ${weeks} week${weeks !== 1 ? "s" : ""}`;
    } else if (abs(diffMonth) < 12) {
      const months = abs(diffMonth);
      return isPast
        ? `${months} month${months !== 1 ? "s" : ""} ago`
        : `in ${months} month${months !== 1 ? "s" : ""}`;
    } else {
      const years = abs(diffYear);
      return isPast
        ? `${years} year${years !== 1 ? "s" : ""} ago`
        : `in ${years} year${years !== 1 ? "s" : ""}`;
    }
  },

  /**
   * Format for display in meal/workout cards
   * @example "Mon, Jan 21" or "Fri, Dec 5"
   */
  cardFormat(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  },

  /**
   * Format for calendar headers
   * @example "January 2026"
   */
  calendarHeader(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  },

  /**
   * Format for week range
   * @example "Jan 20 - 26" or "Dec 30 - Jan 5"
   */
  weekRange(startDate: Date | string, endDate: Date | string): string {
    const start =
      typeof startDate === "string" ? new Date(startDate) : startDate;
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;

    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  },

  /**
   * Parse date from API (ISO string) to Date object
   */
  parseFromApi(dateString: string): Date {
    return new Date(dateString);
  },

  /**
   * Format date for API (ISO string)
   */
  formatForApi(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString();
  },

  /**
   * Check if date is today
   */
  isToday(date: Date | string): boolean {
    const d = typeof date === "string" ? new Date(date) : date;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  },

  /**
   * Check if date is this week
   */
  isThisWeek(date: Date | string): boolean {
    const d = typeof date === "string" ? new Date(date) : date;
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(
      today.setDate(today.getDate() - today.getDay() + 6),
    );

    return d >= weekStart && d <= weekEnd;
  },

  /**
   * Get start of day (00:00:00)
   */
  startOfDay(date: Date | string): Date {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /**
   * Get end of day (23:59:59)
   */
  endOfDay(date: Date | string): Date {
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  },
};

/**
 * Default export for convenience
 */
export default DateFormatters;
