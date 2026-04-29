import client from './client';
import type { ApiResponse, Employee, VacationRequest, ShiftPreference } from '../types';
import {
  mockGetEmployees, mockGetVacations, mockCreateVacation, mockUpdateVacationStatus, mockDeleteVacation,
  mockGetPreferences, mockSavePreference, mockDeletePreference,
} from './mock/handlers';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// ─── Empleats ─────────────────────────────────────────────────────────────────

export const getEmployees = async (): Promise<Employee[]> => {
  if (DEMO) return mockGetEmployees();
  const { data } = await client.get<ApiResponse<Employee[]>>('/employees');
  return data.data;
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
