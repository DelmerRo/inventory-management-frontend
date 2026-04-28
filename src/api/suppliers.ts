// api/suppliers.ts
import apiClient from './client';
export interface SupplierSummary {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  active: boolean;
  productCount: number;
}

export interface ApiResponse<T> {
  error: boolean;
  code: number;
  status: string;
  message: string;
  data: T;
}

// ✅ Definir las interfaces adicionales que necesitamos localmente
export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  registeredAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

export interface SupplierRequest {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export const supplierApi = {
  // ✅ Mantener el método existente
  getAllSummary: async (): Promise<SupplierSummary[]> => {
    const response = await apiClient.get<ApiResponse<SupplierSummary[]>>('/suppliers/summary');
    return response.data.data;
  },

  // ========== NUEVOS MÉTODOS ==========
  
  getAll: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<ApiResponse<Supplier[]>>('/suppliers');
    return response.data.data;
  },

  getById: async (id: number): Promise<Supplier> => {
    const response = await apiClient.get<ApiResponse<Supplier>>(`/suppliers/${id}`);
    return response.data.data;
  },

  create: async (data: SupplierRequest): Promise<Supplier> => {
    const response = await apiClient.post<ApiResponse<Supplier>>('/suppliers', data);
    return response.data.data;
  },

  update: async (id: number, data: SupplierRequest): Promise<Supplier> => {
    const response = await apiClient.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },

  toggleStatus: async (id: number): Promise<Supplier> => {
    const response = await apiClient.patch<ApiResponse<Supplier>>(`/suppliers/${id}/toggle-status`);
    return response.data.data;
  },

  search: async (params: {
    name?: string;
    contactPerson?: string;
    email?: string;
  }): Promise<Supplier[]> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    const response = await apiClient.get<ApiResponse<Supplier[]>>(`/suppliers/search?${queryParams.toString()}`);
    return response.data.data;
  },

  getWithActiveProducts: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<ApiResponse<Supplier[]>>('/suppliers/with-products');
    return response.data.data;
  },

  getTopSuppliers: async (limit: number = 10): Promise<SupplierSummary[]> => {
    const response = await apiClient.get<ApiResponse<SupplierSummary[]>>(`/suppliers/top-suppliers?limit=${limit}`);
    return response.data.data;
  },

  getStatistics: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<ApiResponse<number>>('/suppliers/statistics/count');
    return { count: response.data.data };
  }
};