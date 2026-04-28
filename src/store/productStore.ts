// store/productStore.ts
import { create } from 'zustand';
import { productApi } from '../api/products';
import { categoryApi } from '../api/categories';
import type { Category } from '../api/categories';
import { supplierApi } from '../api/suppliers';
import type { SupplierSummary } from '../api/suppliers';
import type { ProductSummary, ProductDetail, ProductRequest } from '../types/product';

interface ProductStore {
  products: ProductSummary[];
  selectedProduct: ProductDetail | null;
  categories: Category[];
  suppliers: SupplierSummary[];
  isLoading: boolean;
  error: string | null;
  
  fetchAllData: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: number) => Promise<void>;
  createProduct: (product: ProductRequest) => Promise<void>;
  updateProduct: (id: number, product: ProductRequest) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  toggleProductStatus: (id: number) => Promise<void>;  // ✅ Agregar este método
  updateStock: (id: number, quantity: number, isAdd: boolean, reason: string, user: string) => Promise<void>;
  clearError: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  selectedProduct: null,
  categories: [],
  suppliers: [],
  isLoading: false,
  error: null,

  fetchAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [products, categories, suppliers] = await Promise.all([
        productApi.getAll(),
        categoryApi.getAll(),
        supplierApi.getAllSummary()
      ]);
      set({ products, categories, suppliers, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Error al cargar datos', isLoading: false });
    }
  },

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await productApi.getAll();
      set({ products, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchProductById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const product = await productApi.getById(id);
      set({ selectedProduct: product, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProduct: async (product: ProductRequest) => {
    set({ isLoading: true, error: null });
    try {
      await productApi.create(product);
      await get().fetchProducts();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateProduct: async (id: number, product: ProductRequest) => {
    set({ isLoading: true, error: null });
    try {
      await productApi.update(id, product);
      await get().fetchProducts();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteProduct: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await productApi.delete(id);
      await get().fetchProducts();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // ✅ Nuevo método: Activar/Desactivar producto
  toggleProductStatus: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await productApi.toggleStatus(id);
      await get().fetchProducts();  // Recargar la lista
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateStock: async (id: number, quantity: number, isAdd: boolean, reason: string, user: string) => {
    set({ isLoading: true, error: null });
    try {
      if (isAdd) {
        await productApi.addStock(id, quantity, reason, user);
      } else {
        await productApi.removeStock(id, quantity, reason, user);
      }
      await get().fetchProducts();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null })
}));