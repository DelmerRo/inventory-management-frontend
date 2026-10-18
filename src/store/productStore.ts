// store/productStore.ts
import { create } from 'zustand';
import apiClient from '../api/client';
import { productApi } from '../api/products';
import { categoryApi } from '../api/categories';
import type { Category } from '../api/categories';
import { supplierApi } from '../api/suppliers';
import type { SupplierSummary } from '../api/suppliers';
import type { ProductSummary, ProductDetail, ProductRequest, ApiResponse } from '../types/product';

interface PagedProductsResponse {
  content: ProductSummary[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  
  // Propiedades exactas del backend
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

interface ProductStore {
  // Estado
  products: ProductSummary[];
  pagedProducts: PagedProductsResponse | null;
  selectedProduct: ProductDetail | null;
  categories: Category[];
  suppliers: SupplierSummary[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  fetchAllData: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchProductsPaged: (params: Record<string, any>) => Promise<void>;
  fetchProductById: (id: number) => Promise<void>;
  searchProductsGeneral: (params: {
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    subcategoryId?: number;
    supplierId?: number;
    active?: boolean;
    page: number;
    size: number;
    sortField: string;
    sortDirection: string;
  }) => Promise<void>;
  refreshProduct: (id: number) => Promise<void>;
  createProduct: (product: ProductRequest) => Promise<ProductDetail>;
  updateProduct: (id: number, product: ProductRequest) => Promise<ProductDetail>;
  hardDeleteProduct: (id: number) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  toggleProductStatus: (id: number) => Promise<void>;
  updateStock: (id: number, quantity: number, isAdd: boolean, reason: string, user: string) => Promise<void>;
  clearError: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  // Estado inicial
  products: [],
  pagedProducts: null,
  selectedProduct: null,
  categories: [],
  suppliers: [],
  isLoading: false,
  error: null,

  // Cargar categorías
  fetchCategories: async () => {
    console.log('🔄 fetchCategories: Iniciando carga...');
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryApi.getAll();
      console.log('✅ Categorías cargadas:', categories.length);
      set({ categories, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error cargando categorías:', error);
      set({ error: error.message || 'Error al cargar categorías', isLoading: false });
    }
  },

  // Cargar proveedores
  fetchSuppliers: async () => {
    console.log('🔄 fetchSuppliers: Iniciando carga...');
    set({ isLoading: true, error: null });
    try {
      const suppliers = await supplierApi.getAllSummary();
      console.log('✅ Proveedores cargados:', suppliers.length);
      set({ suppliers, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error cargando proveedores:', error);
      set({ error: error.message || 'Error al cargar proveedores', isLoading: false });
    }
  },

  // Cargar todos los datos iniciales
  fetchAllData: async () => {
    console.log('🔄 fetchAllData: Iniciando carga inicial...');
    set({ isLoading: true, error: null });
    try {
      const [categories, suppliers] = await Promise.all([
        categoryApi.getAll(),
        supplierApi.getAllSummary()
      ]);
      
      console.log('✅ Datos iniciales cargados:', {
        categorias: categories.length,
        proveedores: suppliers.length
      });
      
      set({ 
        categories, 
        suppliers, 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('❌ Error cargando datos iniciales:', error);
      set({ error: error.message || 'Error al cargar datos', isLoading: false });
    }
  },

  // Búsqueda general de productos
  searchProductsGeneral: async (params) => {
    console.log('🔍 Búsqueda general:', params);
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await apiClient.get<ApiResponse<PagedProductsResponse>>(
        `/products/search-general?${queryParams.toString()}`
      );
      
      set({ pagedProducts: response.data.data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error en búsqueda general:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Cargar todos los productos (sin paginación)
  fetchProducts: async () => {
    console.log('🔄 fetchProducts: Cargando todos los productos...');
    set({ isLoading: true, error: null });
    try {
      const products = await productApi.getAll();
      console.log('✅ Productos cargados:', products.length);
      set({ products, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error cargando productos:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Cargar productos con paginación
  fetchProductsPaged: async (params: Record<string, any>) => {
    console.log('🔄 fetchProductsPaged: Cargando con parámetros:', params);
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (
          value !== undefined && 
          value !== null && 
          value !== '' && 
          String(value).trim() !== '' && 
          String(value).toLowerCase() !== 'null'
        ) {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await apiClient.get<ApiResponse<PagedProductsResponse>>(
        `/products/paged?${queryParams.toString()}`
      );
      
      console.log('✅ Productos paginados cargados:', {
        total: response.data.data.totalElements,
        page: response.data.data.currentPage
      });
      
      set({ pagedProducts: response.data.data, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error cargando productos paginados:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Cargar producto por ID
  fetchProductById: async (id: number) => {
    console.log(`🔄 fetchProductById: Cargando producto ${id}...`);
    set({ isLoading: true, error: null });
    try {
      const product = await productApi.getById(id);
      console.log('✅ Producto cargado:', product.name);
      set({ selectedProduct: product, isLoading: false });
    } catch (error: any) {
      console.error('❌ Error cargando producto:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Recargar producto específico e historial
  refreshProduct: async (id: number) => {
    await get().fetchProductById(id);
    const currentPage = get().pagedProducts?.currentPage || 0;
    const currentPageSize = get().pagedProducts?.pageSize || 15;
    await get().fetchProductsPaged({ page: currentPage, size: currentPageSize });
  },

  // Crear producto y retornar entidad guardada
  createProduct: async (product: ProductRequest): Promise<ProductDetail> => {
    console.log('🔄 createProduct: Creando nuevo producto...');
    set({ isLoading: true, error: null });
    try {
      const response = await productApi.create(product);
      console.log('✅ Producto creado exitosamente', response);
      
      const currentPage = get().pagedProducts?.currentPage || 0;
      const currentPageSize = get().pagedProducts?.pageSize || 15;
      await get().fetchProductsPaged({ 
        page: currentPage, 
        size: currentPageSize 
      });
      
      set({ isLoading: false });
      return response; // 💡 Simplemente devolvemos 'response'
    } catch (error: any) {
      console.error('❌ Error creando producto:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Actualizar producto y retornar entidad actualizada
  updateProduct: async (id: number, product: ProductRequest): Promise<ProductDetail> => {
    console.log(`🔄 updateProduct: Actualizando producto ${id}...`);
    set({ isLoading: true, error: null });
    try {
      const response = await productApi.update(id, product);
      console.log('✅ Producto actualizado exitosamente', response);
      
      const currentPage = get().pagedProducts?.currentPage || 0;
      const currentPageSize = get().pagedProducts?.pageSize || 15;
      await get().fetchProductsPaged({ 
        page: currentPage, 
        size: currentPageSize 
      });
      
      set({ isLoading: false });
      return response; // 💡 Simplemente devolvemos 'response'
    } catch (error: any) {
      console.error('❌ Error actualizando producto:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Eliminar producto (hard delete)
  hardDeleteProduct: async (id: number) => {
    console.log(`🔄 hardDeleteProduct: Eliminando físicamente producto ${id}...`);
    set({ isLoading: true, error: null });
    try {
      await productApi.hardDelete(id);
      console.log('✅ Producto eliminado físicamente de forma exitosa');
      
      const currentPage = get().pagedProducts?.currentPage || 0;
      const currentPageSize = get().pagedProducts?.pageSize || 15;
      await get().fetchProductsPaged({ 
        page: currentPage, 
        size: currentPageSize 
      });
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Error eliminando producto físicamente:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Eliminar producto (soft delete)
  deleteProduct: async (id: number) => {
    console.log(`🔄 deleteProduct: Eliminando producto ${id}...`);
    set({ isLoading: true, error: null });
    try {
      await productApi.delete(id);
      console.log('✅ Producto eliminado exitosamente');
      
      const currentPage = get().pagedProducts?.currentPage || 0;
      const currentPageSize = get().pagedProducts?.pageSize || 15;
      await get().fetchProductsPaged({ 
        page: currentPage, 
        size: currentPageSize 
      });
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Error eliminando producto:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Activar/Desactivar producto
  toggleProductStatus: async (id: number) => {
    console.log(`🔄 toggleProductStatus: Cambiando estado producto ${id}...`);
    set({ isLoading: true, error: null });
    try {
      await productApi.toggleStatus(id);
      console.log('✅ Estado cambiado exitosamente');
      
      const currentPage = get().pagedProducts?.currentPage || 0;
      const currentPageSize = get().pagedProducts?.pageSize || 15;
      await get().fetchProductsPaged({ 
        page: currentPage, 
        size: currentPageSize 
      });
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Error cambiando estado:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Actualizar stock
  updateStock: async (id: number, quantity: number, isAdd: boolean, reason: string, user: string) => {
    console.log(`🔄 updateStock: ${isAdd ? 'Agregando' : 'Removiendo'} ${quantity} unidades...`);
    set({ isLoading: true, error: null });
    try {
      if (isAdd) {
        await productApi.addStock(id, quantity, reason, user);
      } else {
        await productApi.removeStock(id, quantity, reason, user);
      }
      console.log('✅ Stock actualizado exitosamente');
      
      const currentPage = get().pagedProducts?.currentPage || 0;
      const currentPageSize = get().pagedProducts?.pageSize || 15;
      await get().fetchProductsPaged({ 
        page: currentPage, 
        size: currentPageSize 
      });
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Error actualizando stock:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Limpiar error
  clearError: () => set({ error: null })
}));