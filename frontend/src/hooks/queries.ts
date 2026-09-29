/**
 * React Query hooks — one place for cache keys and invalidation so every page
 * stays in sync after a mutation (e.g. a new shift also refreshes the dashboard).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLocations, createLocation, updateLocation, deleteLocation, type LocationPayload } from '../api/locations';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee, type EmployeePayload,
  getVacations, createVacation, updateVacationStatus, deleteVacation, type VacationPayload,
  getPreferences, savePreference, deletePreference, type PreferencePayload,
} from '../api/employees';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, type SupplierPayload } from '../api/suppliers';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, type ScheduleFilters, type SchedulePayload } from '../api/schedules';
import { getOrders, createOrder, updateOrderStatus, deleteOrder, type OrderPayload } from '../api/orders';
import { getCashClosings, createCashClosing, updateCashClosing, deleteCashClosing, type CashClosingPayload } from '../api/cashClosings';
import { getCashAnalytics, getOrdersAnalytics, getStaffingAnalytics } from '../api/analytics';
import type { OrderStatus } from '../types';

export const keys = {
  locations: ['locations'] as const,
  employees: ['employees'] as const,
  suppliers: ['suppliers'] as const,
  schedules: (f: ScheduleFilters = {}) => ['schedules', f] as const,
  orders: (f: object = {}) => ['orders', f] as const,
  closings: (f: object = {}) => ['closings', f] as const,
  vacations: (f: object = {}) => ['vacations', f] as const,
  preferences: (employeeId?: string) => ['preferences', employeeId ?? 'all'] as const,
  analytics: (kind: string, arg?: string) => ['analytics', kind, arg ?? 'all'] as const,
};

// ─── Reads ────────────────────────────────────────────────────────────────────

export const useLocations = () => useQuery({ queryKey: keys.locations, queryFn: getLocations, staleTime: 5 * 60_000 });
export const useEmployees = () => useQuery({ queryKey: keys.employees, queryFn: getEmployees, staleTime: 5 * 60_000 });
export const useSuppliers = () => useQuery({ queryKey: keys.suppliers, queryFn: getSuppliers, staleTime: 5 * 60_000 });
export const useSchedules = (f: ScheduleFilters) => useQuery({ queryKey: keys.schedules(f), queryFn: () => getSchedules(f), placeholderData: (prev) => prev });
export const useOrders = (f: { locationId?: string; supplierId?: string; status?: OrderStatus } = {}) => useQuery({ queryKey: keys.orders(f), queryFn: () => getOrders(f), placeholderData: (prev) => prev });
export const useCashClosings = (f: { locationId?: string; from?: string; to?: string } = {}) => useQuery({ queryKey: keys.closings(f), queryFn: () => getCashClosings(f), placeholderData: (prev) => prev });
export const useVacations = (f: { employeeId?: string; status?: string } = {}) => useQuery({ queryKey: keys.vacations(f), queryFn: () => getVacations(f) });
export const usePreferences = (employeeId?: string) => useQuery({ queryKey: keys.preferences(employeeId), queryFn: () => getPreferences(employeeId) });
export const useCashAnalytics = (locationId?: string) => useQuery({ queryKey: keys.analytics('cash', locationId), queryFn: () => getCashAnalytics(locationId) });
export const useOrdersAnalytics = () => useQuery({ queryKey: keys.analytics('orders'), queryFn: getOrdersAnalytics });
export const useStaffingAnalytics = () => useQuery({ queryKey: keys.analytics('staffing'), queryFn: getStaffingAnalytics });

// ─── Writes ───────────────────────────────────────────────────────────────────

function useInvalidate() {
  const qc = useQueryClient();
  return (...roots: string[]) => Promise.all(roots.map((r) => qc.invalidateQueries({ queryKey: [r] })));
}

export function useScheduleMutations() {
  const inv = useInvalidate();
  const after = () => inv('schedules', 'analytics');
  return {
    create: useMutation({ mutationFn: (p: SchedulePayload) => createSchedule(p), onSuccess: after }),
    update: useMutation({ mutationFn: ({ id, p }: { id: string; p: Partial<SchedulePayload> }) => updateSchedule(id, p), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteSchedule(id), onSuccess: after }),
  };
}

export function useOrderMutations() {
  const inv = useInvalidate();
  const after = () => inv('orders', 'analytics');
  return {
    create: useMutation({ mutationFn: (p: OrderPayload) => createOrder(p), onSuccess: after }),
    setStatus: useMutation({ mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteOrder(id), onSuccess: after }),
  };
}

export function useClosingMutations() {
  const inv = useInvalidate();
  const after = () => inv('closings', 'analytics');
  return {
    create: useMutation({ mutationFn: (p: CashClosingPayload) => createCashClosing(p), onSuccess: after }),
    update: useMutation({ mutationFn: ({ id, p }: { id: string; p: CashClosingPayload }) => updateCashClosing(id, p), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteCashClosing(id), onSuccess: after }),
  };
}

export function useVacationMutations() {
  const inv = useInvalidate();
  const after = () => inv('vacations');
  return {
    create: useMutation({ mutationFn: (p: VacationPayload) => createVacation(p), onSuccess: after }),
    setStatus: useMutation({ mutationFn: ({ id, status, note }: { id: string; status: 'APPROVED' | 'REJECTED'; note?: string }) => updateVacationStatus(id, status, note), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteVacation(id), onSuccess: after }),
  };
}

export function usePreferenceMutations() {
  const inv = useInvalidate();
  const after = () => inv('preferences');
  return {
    save: useMutation({ mutationFn: (p: PreferencePayload) => savePreference(p), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deletePreference(id), onSuccess: after }),
  };
}

export function useEmployeeMutations() {
  const inv = useInvalidate();
  const after = () => inv('employees', 'schedules', 'analytics');
  return {
    create: useMutation({ mutationFn: (p: EmployeePayload) => createEmployee(p), onSuccess: after }),
    update: useMutation({ mutationFn: ({ id, p }: { id: string; p: Partial<EmployeePayload> }) => updateEmployee(id, p), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteEmployee(id), onSuccess: after }),
  };
}

export function useLocationMutations() {
  const inv = useInvalidate();
  const after = () => inv('locations', 'employees', 'analytics');
  return {
    create: useMutation({ mutationFn: (p: LocationPayload) => createLocation(p), onSuccess: after }),
    update: useMutation({ mutationFn: ({ id, p }: { id: string; p: Partial<LocationPayload> }) => updateLocation(id, p), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteLocation(id), onSuccess: after }),
  };
}

export function useSupplierMutations() {
  const inv = useInvalidate();
  const after = () => inv('suppliers', 'orders');
  return {
    create: useMutation({ mutationFn: (p: SupplierPayload) => createSupplier(p), onSuccess: after }),
    update: useMutation({ mutationFn: ({ id, p }: { id: string; p: Partial<SupplierPayload> }) => updateSupplier(id, p), onSuccess: after }),
    remove: useMutation({ mutationFn: (id: string) => deleteSupplier(id), onSuccess: after }),
  };
}
