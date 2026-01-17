import { startOfWeek, startOfMonth, isSameDay, differenceInDays, startOfDay } from 'date-fns';
import type { CheckIn } from './data';

export interface CheckInStats {
  totalCheckIns: number;
  thisWeek: number;
  thisMonth: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculate check-in statistics from a list of check-ins
 */
export function calculateCheckInStats(
  checkIns: CheckIn[],
  currentStreak: number = 0
): CheckInStats {
  if (!checkIns || checkIns.length === 0) {
    return {
      totalCheckIns: 0,
      thisWeek: 0,
      thisMonth: 0,
      currentStreak: currentStreak || 0,
      longestStreak: 0,
    };
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const monthStart = startOfMonth(now);

  // Convert Firestore timestamps to dates
  const checkInDates = checkIns
    .map(ci => ci.timestamp?.toDate?.() || (ci.timestamp as any))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime()); // Sort descending (newest first)

  // Count this week and this month
  const thisWeekCount = checkInDates.filter(date => date >= weekStart).length;
  const thisMonthCount = checkInDates.filter(date => date >= monthStart).length;

  // Calculate longest streak
  let longestStreak = 0;
  let currentRun = 1;

  for (let i = 0; i < checkInDates.length - 1; i++) {
    const current = startOfDay(checkInDates[i]);
    const next = startOfDay(checkInDates[i + 1]);
    const daysDiff = differenceInDays(current, next);

    if (daysDiff === 1) {
      // Consecutive days
      currentRun++;
    } else {
      // Streak broken
      longestStreak = Math.max(longestStreak, currentRun);
      currentRun = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentRun);

  return {
    totalCheckIns: checkIns.length,
    thisWeek: thisWeekCount,
    thisMonth: thisMonthCount,
    currentStreak: currentStreak || 0,
    longestStreak,
  };
}
