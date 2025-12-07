
import { Timestamp } from 'firebase/firestore';

export interface CheckIn {
  id: string;
  userId: string;
  timestamp: Timestamp;
}

export type CheckInInterval = 'hourly' | 'twice-daily' | 'daily' | 'weekly' | 'custom';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    streak?: number;
    checkInInterval?: CheckInInterval; // Default: 'daily'
    customCheckInHours?: number; // For custom interval, hours between check-ins (min 1, max 168)
    notifyCircleOnCheckIn?: boolean; // Default: true - notify circle when user checks in
}

export interface Circle {
    id: string;
    name: string;
    ownerId: string;
    memberIds: string[];
}

export interface Invitation {
    id: string;
    circleId: string;
    circleName: string;
    inviterId: string;
    inviteeEmail: string;
    status: 'pending';
    createdAt: Timestamp;
}
