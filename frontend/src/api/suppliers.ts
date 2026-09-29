import client, { DEMO } from './client';
import type { ApiResponse, Supplier } from '../types';
import { mockGetSuppliers, mockCreateSupplier, mockUpdateSupplier, mockDeleteSupplier } from './mock/handlers';

export interface SupplierPayload { name: string; contact?: string | null; email?: string | null; phone?: string | null }

export const getSuppliers = async (): Promise<Supplier[]> => {
  if (DEMO) return mockGetSuppliers();
  const { data } = await client.get<ApiResponse<Supplier[]>>('/suppliers');
  return data.data;
};

export const createSupplier = async (payload: SupplierPayload): Promise<Supplier> => {
  if (DEMO) return mockCreateSupplier(payload);
  const { data } = await client.post<ApiResponse<Supplier>>('/suppliers', payload);
  return data.data;
};

export const updateSupplier = async (id: string, payload: Partial<SupplierPayload>): Promise<Supplier> => {
  if (DEMO) return mockUpdateSupplier(id, payload);
  const { data } = await client.patch<ApiResponse<Supplier>>(`/suppliers/${id}`, payload);
  return data.data;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  if (DEMO) return mockDeleteSupplier(id);
  await client.delete(`/suppliers/${id}`);
};
