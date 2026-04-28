// store/purchaseOrderStore.ts
import { create } from 'zustand';
import { purchaseOrderApi } from '../api/purchaseOrders';
import type { 
  PurchaseOrderResponse, 
  PurchaseOrderRequest,
  OrderReconciliation,
  DeliveryReceiptRequest
} from '../types/purchaseOrder';

interface PurchaseOrderState {
  orders: PurchaseOrderResponse[];
  selectedOrder: PurchaseOrderResponse | null;
  reconciliation: OrderReconciliation | null;
  isLoading: boolean;
  error: string | null;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: number) => Promise<void>;
  createOrder: (data: PurchaseOrderRequest) => Promise<boolean>;
  updateOrder: (id: number, data: PurchaseOrderRequest) => Promise<boolean>;
  deleteOrder: (id: number) => Promise<boolean>;
  cancelOrder: (id: number) => Promise<boolean>;
  processDelivery: (receipt: DeliveryReceiptRequest) => Promise<OrderReconciliation | null>;
  reconcileOrder: (orderId: number) => Promise<void>;
  confirmCompletion: (orderId: number) => Promise<boolean>;
  clearError: () => void;
  clearSelected: () => void;
  setToastHandler: (handler: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void) => void;
}

export const usePurchaseOrderStore = create<PurchaseOrderState>((set, get) => ({
  orders: [],
  selectedOrder: null,
  reconciliation: null,
  isLoading: false,
  error: null,
  onToast: undefined,

  setToastHandler: (handler) => set({ onToast: handler }),

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      // ✅ El backend devuelve un array directamente
      const orders = await purchaseOrderApi.getAll();
      console.log('Pedidos recibidos:', orders); // Para depuración
      set({ orders: orders || [], isLoading: false });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cargar pedidos';
      console.error('Error fetchOrders:', errorMsg);
      set({ error: errorMsg, isLoading: false, orders: [] });
      get().onToast?.(errorMsg, 'error');
    }
  },

  fetchOrderById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const order = await purchaseOrderApi.getById(id);
      set({ selectedOrder: order, isLoading: false });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cargar pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
    }
  },

  createOrder: async (data: PurchaseOrderRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newOrder = await purchaseOrderApi.create(data);
      await get().fetchOrders();
      set({ isLoading: false });
      get().onToast?.(`Pedido ${newOrder.orderNumber} creado exitosamente`, 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al crear pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
      return false;
    }
  },

  updateOrder: async (id: number, data: PurchaseOrderRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedOrder = await purchaseOrderApi.update(id, data);
      await get().fetchOrders();
      set({ isLoading: false });
      get().onToast?.(`Pedido ${updatedOrder.orderNumber} actualizado exitosamente`, 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al actualizar pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
      return false;
    }
  },

  deleteOrder: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await purchaseOrderApi.delete(id);
      await get().fetchOrders();
      set({ isLoading: false });
      get().onToast?.('Pedido eliminado exitosamente', 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
      return false;
    }
  },

  cancelOrder: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await purchaseOrderApi.cancel(id);
      await get().fetchOrders();
      set({ isLoading: false });
      get().onToast?.('Pedido cancelado exitosamente', 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al cancelar pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
      return false;
    }
  },

  processDelivery: async (receipt: DeliveryReceiptRequest) => {
    set({ isLoading: true, error: null });
    try {
      const reconciliation = await purchaseOrderApi.processDelivery(receipt);
      set({ reconciliation, isLoading: false });
      await get().fetchOrders();
      
      if (reconciliation.summary.hasDiscrepancies) {
        get().onToast?.('⚠️ Se detectaron discrepancias en la recepción. Revisa el detalle.', 'warning');
      } else {
        get().onToast?.('✅ Recepción procesada exitosamente. Todo coincide.', 'success');
      }
      return reconciliation;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al procesar remito';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
      return null;
    }
  },

  reconcileOrder: async (orderId: number) => {
    set({ isLoading: true, error: null });
    try {
      const reconciliation = await purchaseOrderApi.reconcile(orderId);
      set({ reconciliation, isLoading: false });
      get().onToast?.('Reconciliación completada', 'info');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al reconciliar pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
    }
  },

  confirmCompletion: async (orderId: number) => {
    set({ isLoading: true, error: null });
    try {
      await purchaseOrderApi.confirmCompletion(orderId);
      await get().fetchOrders();
      set({ isLoading: false });
      get().onToast?.('Pedido marcado como completado', 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al completar pedido';
      set({ error: errorMsg, isLoading: false });
      get().onToast?.(errorMsg, 'error');
      return false;
    }
  },

  clearError: () => set({ error: null }),
  clearSelected: () => set({ selectedOrder: null, reconciliation: null })
}));