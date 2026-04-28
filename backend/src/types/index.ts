import { Request } from 'express';

// ─── Enums (com a string literals per compatibilitat SQLite) ──────────────────

export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type Plan = 'SOLO' | 'MULTI' | 'MULTI_PLUS';
export type OrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED';
export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  groupId: string;
  role: Role;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export interface CreateScheduleDto {
  employeeId: string;
  locationId: string;
  date: string; // ISO date string
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes?: string;
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {}

// ─── Order Item ───────────────────────────────────────────────────────────────

export interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}
