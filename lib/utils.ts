
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCheckInTime(date: Date | undefined): { text: string; needsAttention: boolean; status: 'ok' | 'away' | 'inactive' } {
  if (!date) {
    return {
      text: 'No check-ins yet',
      needsAttention: true,
      status: 'inactive',
    };
  }

  const now = new Date();
  if (isToday(date)) {
    return {
      text: `Checked in ${formatDistanceToNow(date, { addSuffix: true })}`,
      needsAttention: false,
      status: 'ok',
    };
  }
  
  const days = differenceInDays(now, date);
  if (days === 1) {
    return {
      text: 'Last seen yesterday',
      needsAttention: true,
      status: 'away',
    };
  }
  
  return {
    text: `Last seen ${days} days ago`,
    needsAttention: true,
    status: 'inactive',
  };
}
