// api/purchaseOrders.ts
import apiClient from './client';
import type { 
  PurchaseOrderRequest, 
  PurchaseOrderResponse,
  PurchaseOrderItemRequest, 
  DeliveryReceiptRequest,
  OrderReconciliation,
  ApiResponse
} from '../types/purchaseOrder';

export const purchaseOrderApi = {
  // CRUD básico
  create: async (data: PurchaseOrderRequest): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrderResponse>>('/purchase-orders', data);
    return response.data.data;
  },

// api/purchaseOrders.ts
getAll: async (): Promise<PurchaseOrderResponse[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderResponse[]>>('/purchase-orders');
    console.log('API Response:', response.data); // Para depuración
    return response.data.data;
},

  getById: async (id: number): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${id}`);
    return response.data.data;
  },

  update: async (id: number, data: PurchaseOrderRequest): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.put<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/purchase-orders/${id}`);
  },

  cancel: async (id: number): Promise<void> => {
    await apiClient.patch(`/purchase-orders/${id}/cancel`);
  },

  // Gestión de items
  addItem: async (orderId: number, item: PurchaseOrderItemRequest): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${orderId}/items`, item);
    return response.data.data;
  },

  removeItem: async (orderId: number, itemId: number): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.delete<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${orderId}/items/${itemId}`);
    return response.data.data;
  },

  updateItemQuantity: async (orderId: number, itemId: number, newQuantity: number): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.put<ApiResponse<PurchaseOrderResponse>>(
      `/purchase-orders/${orderId}/items/${itemId}?newQuantity=${newQuantity}`
    );
    return response.data.data;
  },

  // Recepción y contraste
  processDelivery: async (receipt: DeliveryReceiptRequest): Promise<OrderReconciliation> => {
    const response = await apiClient.post<ApiResponse<OrderReconciliation>>('/purchase-orders/delivery/receive', receipt);
    return response.data.data;
  },

  reconcile: async (orderId: number): Promise<OrderReconciliation> => {
    const response = await apiClient.get<ApiResponse<OrderReconciliation>>(`/purchase-orders/${orderId}/reconcile`);
    return response.data.data;
  },

  confirmCompletion: async (orderId: number): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.patch<ApiResponse<PurchaseOrderResponse>>(`/purchase-orders/${orderId}/complete`);
    return response.data.data;
  },

  // Consultas específicas
  getBySupplier: async (supplierId: number): Promise<PurchaseOrderResponse[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderResponse[]>>(`/purchase-orders/supplier/${supplierId}`);
    return response.data.data;
  },

  getByStatus: async (status: string): Promise<PurchaseOrderResponse[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderResponse[]>>(`/purchase-orders/status/${status}`);
    return response.data.data;
  },

  // ✅ Cambiado: ya no usa paginación
  getPending: async (): Promise<PurchaseOrderResponse[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderResponse[]>>('/purchase-orders/pending');
    return response.data.data;
  }
};