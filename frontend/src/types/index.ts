// User types
export interface User {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  role: 'student' | 'organizer';
  createdAt?: string;
}

// Event types
export type EventType = 'public' | 'departmental';
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  _id: string;
  id: string;
  title: string;
  description: string;
  organizerId: User | string;
  eventType: EventType;
  department: string;
  seatLimit: number;
  registeredCount: number;
  date: string;
  time: string;
  venue: string;
  status: EventStatus;
  bannerUrl?: string;
  enableCertificates: boolean;
  seatsAvailable: number;
  isRegistrationOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

// Ticket types
export type TicketStatus = 'unused' | 'used' | 'cancelled';

export interface Ticket {
  _id: string;
  ticketId: string;
  eventId: Event | string;
  userId: User | string;
  qrCode: string;
  status: TicketStatus;
  usedAt?: string;
  createdAt: string;
}

// Attendance types
export interface Attendance {
  _id: string;
  eventId: Event | string;
  userId: User | string;
  ticketId: Ticket | string;
  entryTime: string;
  verifiedBy: User | string;
}

// Certificate types
export interface Certificate {
  _id: string;
  certificateId: string;
  eventId: Event | string;
  userId: User | string;
  issuedAt: string;
  issuedBy: User | string;
  pdfUrl?: string;
  filePath?: string;
}

// Certificate stats for organizers
export interface CertificateStats {
  totalCertificates: number;
  totalAttendees: number;
  pendingCertificates: number;
}

// Certificate generation result
export interface CertificateGenerationResult {
  totalAttendees: number;
  generated: number;
  skipped: number;
  errors?: Array<{ userId: string; error: string }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  count: number;
}

// Verification types
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  attendee?: {
    name: string;
    rollNumber?: string;
    department: string;
  };
  entryTime?: string;
  usedAt?: string;
}
