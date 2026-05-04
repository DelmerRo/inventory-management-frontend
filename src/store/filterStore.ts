// store/filterStore.ts
import { create } from 'zustand';

export type SortField = 'name' | 'salePrice' | 'currentStock' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type StockFilter = 'all' | 'low' | 'out';

interface FilterState {
  // Filtros
  categoryId: number | null;
  subcategoryId: number | null;
  supplierId: number | null;
  supplierSku: string;  // ✅ Agregar supplierSku
  minPrice: number | null;
  maxPrice: number | null;
  stockFilter: StockFilter;
  searchTerm: string;
  
  // Ordenamiento
  sortField: SortField;
  sortOrder: SortOrder;
  
  // Acciones
  setCategoryId: (id: number | null) => void;
  setSubcategoryId: (id: number | null) => void;
  setSupplierId: (id: number | null) => void;
  setSupplierSku: (sku: string) => void;  // ✅ Agregar setter
  setMinPrice: (price: number | null) => void;
  setMaxPrice: (price: number | null) => void;
  setStockFilter: (filter: StockFilter) => void;
  setSearchTerm: (term: string) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  categoryId: null,
  subcategoryId: null,
  supplierId: null,
  supplierSku: '',  // ✅ Inicializar supplierSku
  minPrice: null,
  maxPrice: null,
  stockFilter: 'all',
  searchTerm: '',
  sortField: 'name',
  sortOrder: 'asc',
  
  setCategoryId: (id) => set({ categoryId: id, subcategoryId: null }),
  setSubcategoryId: (id) => set({ subcategoryId: id }),
  setSupplierId: (id) => set({ supplierId: id }),
  setSupplierSku: (sku) => set({ supplierSku: sku }),  // ✅ Implementar setter
  setMinPrice: (price) => set({ minPrice: price }),
  setMaxPrice: (price) => set({ maxPrice: price }),
  setStockFilter: (filter) => set({ stockFilter: filter }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  resetFilters: () => set({
    categoryId: null,
    subcategoryId: null,
    supplierId: null,
    supplierSku: '',  // ✅ Resetear supplierSku
    minPrice: null,
    maxPrice: null,
    stockFilter: 'all',
    searchTerm: '',
    sortField: 'name',
    sortOrder: 'asc'
  })
}));