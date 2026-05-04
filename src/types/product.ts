// types/product.ts
export interface SupplierAssociation {
  id: number;
  supplierId: number;
  supplierName: string;
  supplierSku: string;
  isPrimary: boolean;
  notes: string | null;
}

// types/product.ts
export interface ProductSummary {
  id: number;
  sku: string;
  name: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;
  subcategoryName: string;
  primarySupplierName: string | null;
  primarySupplierSku: string | null;  // ✅ Este es el campo correcto (viene de ProductSupplier)
  suppliersCount: number;
  hasStock: boolean;
  active: boolean;
  createdAt: string;
}

export interface ProductDetail {
  id: number;
  sku: string;
  name: string;
  description: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  margin: number;
  marginPercentage: number;
  volume: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  measureUnit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastPurchaseAt: string | null; // ✅ Agregar este campo
  hasStock: boolean;
  lowStock: boolean;
  primarySupplierName: string | null;
  primarySupplierSku: string | null;
  subcategory: {
    id: number;
    name: string;
    active: boolean;
    categoryId: number;
    categoryName: string;
  };
  suppliers: SupplierAssociation[];
}

export interface SupplierAssociationDTO {
  supplierId: number;
  supplierSku?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface ProductRequest {
  name: string;
  description: string;
  costPrice: number;
  salePrice: number;
  currentStock?: number;
  subcategoryId: number;
  suppliers: SupplierAssociationDTO[];
  weight: number;
  length: number;
  width: number;
  height: number;
  measureUnit: string;
}

export interface QuickProductRequest {
  name: string;
  supplierSku: string;
  subcategoryId: number;
}

export interface ApiResponse<T> {
  error: boolean;
  code: number;
  status: string;
  message: string;
  data: T;
}