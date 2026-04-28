import client from './client';
import type { ApiResponse, Employee, VacationRequest, ShiftPreference } from '../types';

// ─── Empleats ─────────────────────────────────────────────────────────────────

export const getEmployees = async (): Promise<Employee[]> => {
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
  const { data } = await client.get<ApiResponse<VacationRequest[]>>('/vacations', { params: filters });
  return data.data;
};

export const createVacation = async (payload: VacationPayload): Promise<VacationRequest> => {
  const { data } = await client.post<ApiResponse<VacationRequest>>('/vacations', payload);
  return data.data;
};

export const updateVacationStatus = async (
  id: string,
  status: 'APPROVED' | 'REJECTED',
  managerNote?: string
): Promise<VacationRequest> => {
  const { data } = await client.patch<ApiResponse<VacationRequest>>(`/vacations/${id}/status`, { status, managerNote });
  return data.data;
};

export const deleteVacation = async (id: string): Promise<void> => {
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
  const { data } = await client.get<ApiResponse<ShiftPreference[]>>('/preferences', {
    params: employeeId ? { employeeId } : {},
  });
  return data.data;
};

export const savePreference = async (payload: PreferencePayload): Promise<ShiftPreference> => {
  const { data } = await client.post<ApiResponse<ShiftPreference>>('/preferences', payload);
  return data.data;
};

export const deletePreference = async (id: string): Promise<void> => {
  await client.delete(`/preferences/${id}`);
};
