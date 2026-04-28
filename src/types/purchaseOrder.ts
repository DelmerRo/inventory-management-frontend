// types/purchaseOrder.ts

export interface PurchaseOrderItemRequest {
  supplierSku: string;  // ✅ Cambiado de 'sku' a 'supplierSku' para claridad
  productName?: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: PurchaseOrderItemRequest[];
}

export interface PurchaseOrderItemResponse {
  id: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  quantityReceived: number;
  subtotal: number;
  pendingQuantity: number;
  fullyReceived: boolean;
}

export interface PurchaseOrderResponse {
  id: number;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'CANCELADO';
  notes: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemResponse[];
}

// ✅ Para items pendientes en el formulario de recepción
export interface PendingReceivedItem {
  supplierSku: string;
  productName: string;
  additionalQuantity: number;
  unitPrice: number;
  orderedQuantity: number;
  alreadyReceived: number;
  pendingQuantity: number;
}

// ✅ Para items recibidos en el remito
export interface ReceivedItem {
  supplierSku: string;
  productName?: string;
  additionalQuantity: number;
  unitPrice?: number;
}

// ✅ Request de recepción de mercadería
export interface DeliveryReceiptRequest {
  purchaseOrderId: number;
  deliveryDate: string;
  notes?: string;
  receivedItems: ReceivedItem[];
}

// ✅ Respuesta de reconciliación
export interface ReconciliationSummary {
  totalOrderedItems: number;
  totalReceivedItems: number;
  totalMatchedQuantity: number;
  totalPartialQuantity: number;
  totalMissingQuantity: number;
  totalExtraQuantity: number;
  totalOrderValue: number;
  totalReceivedValue: number;
  hasDiscrepancies: boolean;
  recommendation: string;
}

export interface MatchedItem {
  sku: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PartialItem {
  sku: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unitPrice: number;
  observation: string;
}

export interface MissingItem {
  sku: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  missingQuantity: number;
  observation: string;
  unitPrice?: number;
  missingAmount?: number;
}

export interface ExtraItem {
  sku: string;
  productName: string;
  receivedQuantity: number;
  observation: string;
  unitPrice?: number;
}

export interface OrderReconciliation {
  purchaseOrderId: number;
  orderNumber: string;
  supplierName: string;
  matchedItems: MatchedItem[];
  partialItems: PartialItem[];
  missingItems: MissingItem[];
  extraItems: ExtraItem[];
  summary: ReconciliationSummary;
}

// ✅ Tipos genéricos
export interface ApiResponse<T> {
  error: boolean;
  code: number;
  status: string;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}