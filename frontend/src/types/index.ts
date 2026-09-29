// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type Plan = 'SOLO' | 'MULTI' | 'MULTI_PLUS';
export type OrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED';

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  plan: Plan;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  groupId: string;
  group?: Group;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string | null;
  timezone: string;
  groupId: string;
  createdAt: string;
  _count?: { employees: number; schedules: number };
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  groupId: string;
  locations?: { locationId: string; location: Pick<Location, 'id' | 'name'> }[];
  createdAt: string;
}

export interface Schedule {
  id: string;
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  employee: Pick<Employee, 'id' | 'name'>;
  location: Pick<Location, 'id' | 'name'>;
  createdAt: string;
}

export interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  groupId: string;
  _count?: { orders: number };
}

export interface Order {
  id: string;
  supplierId: string;
  locationId: string;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string | null;
  deliveryAt?: string | null;
  createdAt: string;
  supplier: Pick<Supplier, 'id' | 'name'>;
  location: Pick<Location, 'id' | 'name'>;
}

export interface CashClosing {
  id: string;
  locationId: string;
  date: string;
  openingAmount: number;
  closingAmount: number;
  sales: number;
  cardSales: number;
  cashSales: number;
  expenses: number;
  notes?: string | null;
  createdAt: string;
  location: Pick<Location, 'id' | 'name'>;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

// ─── Vacances ────────────────────────────────────────────────────────────────

export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface VacationRequest {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  reason?: string | null;
  status: VacationStatus;
  managerNote?: string | null;
  createdAt: string;
  employee: Pick<Employee, 'id' | 'name'>;
}

export interface ShiftPreference {
  id: string;
  employeeId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  locationId?: string | null;
  notes?: string | null;
  createdAt: string;
  employee: Pick<Employee, 'id' | 'name'>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  userId: string;
  groupId: string;
  role: Role;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}
