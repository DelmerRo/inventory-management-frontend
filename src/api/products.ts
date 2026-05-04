// api/products.ts
import apiClient from './client';
import type {
    ProductSummary,
    ProductDetail,
    ProductRequest,
    ApiResponse,
    SupplierAssociation,
    QuickProductRequest
} from '../types/product';

export const productApi = {
    // ========== CRUD BÁSICO ==========

    // Obtener todos los productos (resumen)
    getAll: async (): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>('/products');
        return response.data.data;
    },

    // Obtener producto por ID (detalle completo)
    getById: async (id: number): Promise<ProductDetail> => {
        const response = await apiClient.get<ApiResponse<ProductDetail>>(`/products/${id}`);
        return response.data.data;
    },

    // Obtener producto por SKU interno
    getBySku: async (sku: string): Promise<ProductDetail> => {
        const response = await apiClient.get<ApiResponse<ProductDetail>>(`/products/sku/${sku}`);
        return response.data.data;
    },

    // ✅ Obtener producto por SKU del proveedor
    getBySupplierSku: async (supplierSku: string): Promise<ProductDetail> => {
        const response = await apiClient.get<ApiResponse<ProductDetail>>(`/products/by-supplier-sku/${encodeURIComponent(supplierSku)}`);
        return response.data.data;
    },

    // Crear nuevo producto (normal)
    create: async (product: ProductRequest): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products', product);
        return response.data.data;
    },

    // ✅ Crear producto rápido (desde pedido de compra)
    createQuick: async (product: QuickProductRequest): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products/quick', product);
        return response.data.data;
    },

    // Actualizar producto
    update: async (id: number, product: ProductRequest): Promise<ProductDetail> => {
        const response = await apiClient.put<ApiResponse<ProductDetail>>(`/products/${id}`, product);
        return response.data.data;
    },

    // Eliminar producto (soft delete)
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/products/${id}`);
    },

    // Activar/Desactivar producto
    toggleStatus: async (id: number): Promise<ProductDetail> => {
        const response = await apiClient.patch<ApiResponse<ProductDetail>>(`/products/${id}/toggle-status`);
        return response.data.data;
    },

    // ========== GESTIÓN DE STOCK ==========

    // Agregar stock
    addStock: async (productId: number, quantity: number, reason: string, user: string): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products/add-stock', {
            productId,
            quantity,
            reason,
            user
        });
        return response.data.data;
    },

    // Remover stock
    removeStock: async (productId: number, quantity: number, reason: string, user: string): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>('/products/remove-stock', {
            productId,
            quantity,
            reason,
            user
        });
        return response.data.data;
    },

    // ========== GESTIÓN DE PROVEEDORES ==========

    // Obtener proveedores de un producto
    getProductSuppliers: async (productId: number): Promise<SupplierAssociation[]> => {
        const response = await apiClient.get<ApiResponse<SupplierAssociation[]>>(`/products/${productId}/suppliers`);
        return response.data.data;
    },

    // Agregar proveedor a producto
    addSupplierToProduct: async (productId: number, supplierDTO: SupplierAssociationDTO): Promise<ProductDetail> => {
        const response = await apiClient.post<ApiResponse<ProductDetail>>(`/products/${productId}/suppliers`, supplierDTO);
        return response.data.data;
    },

    // Eliminar proveedor de producto
    removeSupplierFromProduct: async (productId: number, supplierId: number): Promise<void> => {
        await apiClient.delete(`/products/${productId}/suppliers/${supplierId}`);
    },

    // Actualizar SKU de proveedor
    updateSupplierSku: async (productId: number, supplierId: number, supplierSku: string): Promise<ProductDetail> => {
        const response = await apiClient.patch<ApiResponse<ProductDetail>>(
            `/products/${productId}/suppliers/${supplierId}/sku?supplierSku=${encodeURIComponent(supplierSku)}`
        );
        return response.data.data;
    },

    // ========== CONSULTAS ==========

    // Buscar productos con filtros
    search: async (params: {
        name?: string;
        sku?: string;
        minPrice?: number;
        maxPrice?: number;
        subcategoryId?: number;
        supplierId?: number;
    }): Promise<ProductSummary[]> => {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value.toString());
            }
        });
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/search?${queryParams.toString()}`);
        return response.data.data;
    },

    // Obtener productos por proveedor
    getBySupplier: async (supplierId: number): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/supplier/${supplierId}`);
        return response.data.data;
    },

    // Obtener productos con stock bajo
    getLowStock: async (threshold: number = 10): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/low-stock?threshold=${threshold}`);
        return response.data.data;
    },

    // api/products.ts - Agregar método
    searchBySupplierSku: async (supplierSku: string): Promise<ProductSummary[]> => {
        const response = await apiClient.get<ApiResponse<ProductSummary[]>>(`/products/by-supplier-sku/${encodeURIComponent(supplierSku)}`);
        return response.data.data;
    },

    // ========== ESTADÍSTICAS ==========

    // Obtener estadísticas
    getStatistics: async (): Promise<{
        totalProducts: number;
        totalStock: number;
        totalInventoryValue: number;
    }> => {
        const response = await apiClient.get<ApiResponse<{
            totalProducts: number;
            totalStock: number;
            totalInventoryValue: number;
        }>>('/products/statistics');
        return response.data.data;
    }
};

export interface SupplierAssociationDTO {
    supplierId: number;
    supplierSku?: string;
    isPrimary?: boolean;
    notes?: string;
}

