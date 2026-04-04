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

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  rollNumber?: string;
  department: string;
  role: 'student' | 'organizer';
}

export interface LoginInput {
  email: string;
  password: string;
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
  waitlistCount?: number;
  date: string;
  time: string;
  venue: string;
  status: EventStatus;
  bannerUrl?: string;
  enableCertificates: boolean;
  waitlistEnabled?: boolean;
  seatsAvailable: number;
  isRegistrationOpen: boolean;
  isWaitlistOpen?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventFormInput {
  title: string;
  description: string;
  eventType: EventType;
  department: string;
  seatLimit: number;
  date: string;
  time: string;
  venue: string;
  enableCertificates: boolean;
  waitlistEnabled?: boolean;
}

// Ticket types
export type TicketStatus = 'unused' | 'used' | 'cancelled' | 'waitlisted';

export interface Ticket {
  _id: string;
  ticketId: string;
  eventId: Event | string;
  userId: User | string;
  qrCode: string;
  status: TicketStatus;
  usedAt?: string;
  waitlistedAt?: string;
  promotedAt?: string;
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

export interface AttendanceStats {
  totalRegistered: number;
  totalAttended: number;
  attendanceRate: string;
  seatsAvailable: number;
  noShowCount: number;
  certificateIssuedCount: number;
  certificatePendingCount: number;
  certificateCoverageRate: string;
  performanceSummary: string;
}

export interface OrganizerEventSummary {
  eventId: string;
  title: string;
  status: EventStatus;
  date: string;
  department: string;
  eventType: EventType;
  registeredCount: number;
  attendedCount: number;
  noShowCount: number;
  attendanceRate: string;
  certificateIssuedCount: number;
  enableCertificates: boolean;
}

export interface OrganizerAnalyticsSummary {
  totalEvents: number;
  totalRegistrations: number;
  totalAttendance: number;
  totalNoShows: number;
  overallAttendanceRate: string;
  certificatesIssued: number;
  certificateCoverageRate: string;
  performanceSummary: string;
  eventSummaries: OrganizerEventSummary[];
  topPerformer: OrganizerEventSummary | null;
  needsAttention: OrganizerEventSummary | null;
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
  total?: number;
  page?: number;
  totalPages?: number;
  limit?: number;
}

export interface ApiErrorResponse {
  success: false;
  message?: string;
  errors?: string[];
}

export interface AuthPayload {
  user: User;
  token: string;
}

export interface UserPayload {
  user: User;
}

export interface EventsPayload {
  events: Event[];
}

export interface TicketsPayload {
  tickets: Ticket[];
}

export interface RegisterTicketPayload {
  ticket: Ticket;
  registrationType: 'confirmed' | 'waitlist';
  waitlistPosition?: number | null;
}

export interface CertificatesPayload {
  certificates: Certificate[];
}

export interface RegistrationsPayload {
  registrations: Ticket[];
}

export interface EventCertificatesPayload {
  certificates: Certificate[];
  stats: CertificateStats;
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
