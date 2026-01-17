
import { Timestamp } from 'firebase/firestore';

export interface CheckIn {
  id: string;
  userId: string;
  timestamp: Timestamp;
}

export type CheckInInterval = 'hourly' | 'twice-daily' | 'daily' | 'weekly' | 'custom';

export interface EmergencyContact {
    name: string;
    email?: string;
    phoneNumber?: string;
    relationship?: string; // e.g., "Spouse", "Parent", "Friend"
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email?: string; // Optional - can use phone instead
    phoneNumber?: string; // Optional - for phone authentication
    streak?: number;
    checkInInterval?: CheckInInterval; // Default: 'daily'
    customCheckInHours?: number; // For custom interval, hours between check-ins (min 1, max 168)
    notifyCircleOnCheckIn?: boolean; // Default: true - notify circle when user checks in
    emergencyContact?: EmergencyContact; // Emergency contact for 2+ day alerts
    emergencyAlertEnabled?: boolean; // Default: false - enable emergency alerts
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
    inviteeEmail?: string; // Optional - for email-based invitations
    inviteePhone?: string; // Optional - for phone-based invitations
    invitationToken?: string; // For shareable link-based invitations
    status: 'pending';
    createdAt: Timestamp;
}
