// api/inventory.ts
import apiClient from './client';
import type { ApiResponse } from '../types/product';

// ✅ Exportar como interfaz, no como tipo
export interface InventoryMovement {
  id: number;
  product: {
    id: number;
    sku: string;
    name: string;
  };
  quantity: number;
  movementType: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  reason: string;
  movementDate: string;
  registeredBy: string;
  unitCost: number | null;
  totalValue: number;
  stockAfterMovement: number | null;
  stockBeforeMovement: number | null;
  stockDifference: number | null;
}

export interface StockEntryRequest {
  productId: number;
  quantity: number;
  reason: string;
  unitCost?: number;
}

export interface StockExitRequest {
  productId: number;
  quantity: number;
  reason: string;
}

export const inventoryApi = {
  getProductHistory: async (productId: number): Promise<InventoryMovement[]> => {
    const response = await apiClient.get<ApiResponse<InventoryMovement[]>>(
      `/inventory/product/${productId}/history`
    );
    return response.data.data;
  },

  registerEntry: async (data: StockEntryRequest, user: string): Promise<InventoryMovement> => {
    const response = await apiClient.post<ApiResponse<InventoryMovement>>(
      `/inventory/entry?currentUser=${user}`,
      data
    );
    return response.data.data;
  },

  registerExit: async (data: StockExitRequest, user: string): Promise<InventoryMovement> => {
    const response = await apiClient.post<ApiResponse<InventoryMovement>>(
      `/inventory/exit?currentUser=${user}`,
      data
    );
    return response.data.data;
  },

  getProductStatistics: async (productId: number): Promise<{
    productId: number;
    totalEntries: number;
    totalExits: number;
    movementCount: number;
    netMovement: number;
  }> => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/inventory/product/${productId}/statistics`
    );
    return response.data.data;
  }
};