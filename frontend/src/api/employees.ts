import client, { DEMO } from './client';
import type { ApiResponse, Employee, VacationRequest, ShiftPreference } from '../types';
import {
  mockGetEmployees, mockCreateEmployee, mockUpdateEmployee, mockDeleteEmployee,
  mockGetVacations, mockCreateVacation, mockUpdateVacationStatus, mockDeleteVacation,
  mockGetPreferences, mockSavePreference, mockDeletePreference,
} from './mock/handlers';

// ─── Empleats ─────────────────────────────────────────────────────────────────

export interface EmployeePayload { name: string; email?: string | null; phone?: string | null; locationIds?: string[] }

export const getEmployees = async (): Promise<Employee[]> => {
  if (DEMO) return mockGetEmployees();
  const { data } = await client.get<ApiResponse<Employee[]>>('/employees');
  return data.data;
};

export const createEmployee = async (payload: EmployeePayload): Promise<Employee> => {
  if (DEMO) return mockCreateEmployee(payload);
  const { data } = await client.post<ApiResponse<Employee>>('/employees', { ...payload, email: payload.email || null, phone: payload.phone || null });
  return data.data;
};

export const updateEmployee = async (id: string, payload: Partial<EmployeePayload>): Promise<Employee> => {
  if (DEMO) return mockUpdateEmployee(id, payload);
  const { data } = await client.patch<ApiResponse<Employee>>(`/employees/${id}`, { ...payload, email: payload.email || null, phone: payload.phone || null });
  return data.data;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteEmployee(id);
  await client.delete(`/employees/${id}`);
};

// ─── Vacances ─────────────────────────────────────────────────────────────────

export interface VacationPayload {
  employeeId: string;
  fromDate: string;
  toDate: string;
  reason?: string | null;
}

export const getVacations = async (filters: { employeeId?: string; status?: string } = {}): Promise<VacationRequest[]> => {
  if (DEMO) return mockGetVacations(filters);
  const { data } = await client.get<ApiResponse<VacationRequest[]>>('/vacations', { params: filters });
  return data.data;
};

export const createVacation = async (payload: VacationPayload): Promise<VacationRequest> => {
  if (DEMO) return mockCreateVacation(payload);
  const { data } = await client.post<ApiResponse<VacationRequest>>('/vacations', payload);
  return data.data;
};

export const updateVacationStatus = async (
  id: string, status: 'APPROVED' | 'REJECTED', managerNote?: string
): Promise<VacationRequest> => {
  if (DEMO) return mockUpdateVacationStatus(id, status, managerNote);
  const { data } = await client.patch<ApiResponse<VacationRequest>>(`/vacations/${id}/status`, { status, managerNote });
  return data.data;
};

export const deleteVacation = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteVacation(id);
  await client.delete(`/vacations/${id}`);
};

// ─── Preferències ─────────────────────────────────────────────────────────────

export interface PreferencePayload {
  employeeId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  locationId?: string | null;
  notes?: string | null;
}

export const getPreferences = async (employeeId?: string): Promise<ShiftPreference[]> => {
  if (DEMO) return mockGetPreferences(employeeId);
  const { data } = await client.get<ApiResponse<ShiftPreference[]>>('/preferences', {
    params: employeeId ? { employeeId } : {},
  });
  return data.data;
};

export const savePreference = async (payload: PreferencePayload): Promise<ShiftPreference> => {
  if (DEMO) return mockSavePreference(payload);
  const { data } = await client.post<ApiResponse<ShiftPreference>>('/preferences', payload);
  return data.data;
};

export const deletePreference = async (id: string): Promise<void> => {
  if (DEMO) return mockDeletePreference(id);
  await client.delete(`/preferences/${id}`);
};
