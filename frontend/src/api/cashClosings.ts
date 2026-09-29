import client, { DEMO } from './client';
import type { ApiResponse, CashClosing } from '../types';
import { mockGetCashClosings, mockCreateCashClosing, mockUpdateCashClosing, mockDeleteCashClosing } from './mock/handlers';

export interface CashClosingPayload {
  locationId: string;
  date: string;
  openingAmount: number;
  closingAmount: number;
  sales: number;
  cardSales: number;
  cashSales: number;
  expenses: number;
  notes?: string | null;
}

export const getCashClosings = async (filters: { locationId?: string; from?: string; to?: string } = {}): Promise<CashClosing[]> => {
  if (DEMO) return mockGetCashClosings(filters);
  const { data } = await client.get<ApiResponse<CashClosing[]>>('/cash-closings', { params: filters });
  return data.data;
};

export const createCashClosing = async (payload: CashClosingPayload): Promise<CashClosing> => {
  if (DEMO) return mockCreateCashClosing(payload);
  const { data } = await client.post<ApiResponse<CashClosing>>('/cash-closings', payload);
  return data.data;
};

export const updateCashClosing = async (id: string, payload: CashClosingPayload): Promise<CashClosing> => {
  if (DEMO) return mockUpdateCashClosing(id, payload);
  const { data } = await client.put<ApiResponse<CashClosing>>(`/cash-closings/${id}`, payload);
  return data.data;
};

export const deleteCashClosing = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteCashClosing(id);
  await client.delete(`/cash-closings/${id}`);
};
