
import { Timestamp } from 'firebase/firestore';

export interface CheckIn {
  id: string;
  userId: string;
  timestamp: Timestamp;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    streak?: number;
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
