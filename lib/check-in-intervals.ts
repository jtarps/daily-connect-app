import type { CheckInInterval } from './data';
import { differenceInHours, differenceInDays, isSameDay, startOfDay } from 'date-fns';

export interface CheckInIntervalConfig {
  label: string;
  description: string;
  hours: number; // Minimum hours between check-ins
}

export const CHECK_IN_INTERVALS: Record<CheckInInterval, CheckInIntervalConfig> = {
  'hourly': {
    label: 'Hourly',
    description: 'Check in once per hour',
    hours: 1,
  },
  'twice-daily': {
    label: 'Twice Daily',
    description: 'Check in twice per day (morning & evening)',
    hours: 12,
  },
  'daily': {
    label: 'Daily',
    description: 'Check in once per day',
    hours: 24,
  },
  'weekly': {
    label: 'Weekly',
    description: 'Check in once per week',
    hours: 168, // 7 days * 24 hours
  },
  'custom': {
    label: 'Custom',
    description: 'Set your own interval (1-168 hours)',
    hours: 24, // Default, but will be overridden by customHours
  },
};

export function getDefaultInterval(): CheckInInterval {
  return 'daily';
}

/**
 * Check if a user can check in based on their interval and last check-in time
 */
export function canCheckIn(
  lastCheckInDate: Date | undefined,
  interval: CheckInInterval = 'daily',
  customHours?: number
): { canCheckIn: boolean; reason?: string } {
  if (!lastCheckInDate) {
    return { canCheckIn: true };
  }

  const now = new Date();
  const hoursRequired = interval === 'custom' && customHours 
    ? Math.max(1, Math.min(168, customHours)) // Clamp between 1 and 168 hours
    : CHECK_IN_INTERVALS[interval]?.hours || 24;
  const hoursSinceLastCheckIn = differenceInHours(now, lastCheckInDate);

  if (hoursSinceLastCheckIn < hoursRequired) {
    const hoursRemaining = Math.ceil(hoursRequired - hoursSinceLastCheckIn);
    const minutesRemaining = Math.ceil((hoursRequired - hoursSinceLastCheckIn) * 60);
    
    if (interval === 'hourly' || (interval === 'custom' && hoursRequired <= 1)) {
      return {
        canCheckIn: false,
        reason: `Please wait ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''} before checking in again.`,
      };
    } else if (interval === 'twice-daily') {
      if (hoursRemaining > 1) {
        return {
          canCheckIn: false,
          reason: `Please wait ${hoursRemaining} more hour${hoursRemaining !== 1 ? 's' : ''} before checking in again.`,
        };
      } else {
        return {
          canCheckIn: false,
          reason: `Please wait ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''} before checking in again.`,
        };
      }
    } else {
      return {
        canCheckIn: false,
        reason: `You've already checked in. Next check-in available in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
      };
    }
  }

  return { canCheckIn: true };
}

/**
 * Check if a check-in is within the current interval period
 */
export function isWithinInterval(
  checkInDate: Date,
  interval: CheckInInterval = 'daily',
  referenceDate: Date = new Date(),
  customHours?: number
): boolean {
  const hoursRequired = interval === 'custom' && customHours 
    ? Math.max(1, Math.min(168, customHours))
    : CHECK_IN_INTERVALS[interval]?.hours || 24;
  const hoursDifference = differenceInHours(referenceDate, checkInDate);
  
  if (interval === 'daily' || interval === 'weekly') {
    // For daily/weekly, check if it's the same period
    if (interval === 'daily') {
      return isSameDay(checkInDate, referenceDate);
    } else {
      // Weekly: check if within the same week
      const startOfWeek = startOfDay(referenceDate);
      const checkInStartOfWeek = startOfDay(checkInDate);
      return differenceInDays(startOfWeek, checkInStartOfWeek) < 7;
    }
  }
  
  // For hourly/twice-daily/custom, check if within the hour window
  return hoursDifference < hoursRequired;
}

