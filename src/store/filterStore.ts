// store/filterStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortField = 'name' | 'salePrice' | 'currentStock' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type StockFilter = 'all' | 'low' | 'out';
export type ActiveFilter = 'all' | 'active' | 'inactive';

interface FilterState {
  // Filtros
  categoryId: number | null;
  subcategoryId: number | null;
  supplierId: number | null;
  supplierSku: string;
  minPrice: number | null;
  maxPrice: number | null;
  stockFilter: StockFilter;
  activeFilter: ActiveFilter;
  searchTerm: string;
  
  // Paginación
  page: number;
  pageSize: number;
  
  // Ordenamiento
  sortField: SortField;
  sortOrder: SortOrder;
  
  // Acciones
  setCategoryId: (id: number | null) => void;
  setSubcategoryId: (id: number | null) => void;
  setSupplierId: (id: number | null) => void;
  setSupplierSku: (sku: string) => void;
  setMinPrice: (price: number | null) => void;
  setMaxPrice: (price: number | null) => void;
  setStockFilter: (filter: StockFilter) => void;
  setActiveFilter: (filter: ActiveFilter) => void;
  setSearchTerm: (term: string) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  resetFilters: () => void;
  nextPage: () => void;
  previousPage: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      categoryId: null,
      subcategoryId: null,
      supplierId: null,
      supplierSku: '',
      minPrice: null,
      maxPrice: null,
      stockFilter: 'all',
      activeFilter: 'all',
      searchTerm: '',
      page: 0,
      pageSize: 15,
      sortField: 'createdAt',
      sortOrder: 'desc',
      
      // Setters (resetean la página a 0 cuando cambia un filtro)
      setCategoryId: (id) => {
        console.log('🔍 Filtro cambiado: categoryId =', id);
        set({ categoryId: id, subcategoryId: null, page: 0 });
      },
      setSubcategoryId: (id) => {
        console.log('🔍 Filtro cambiado: subcategoryId =', id);
        set({ subcategoryId: id, page: 0 });
      },
      setSupplierId: (id) => {
        console.log('🔍 Filtro cambiado: supplierId =', id);
        set({ supplierId: id, page: 0 });
      },
      setSupplierSku: (sku) => {
        console.log('🔍 Filtro cambiado: supplierSku =', sku);
        set({ supplierSku: sku, page: 0 });
      },
      setMinPrice: (price) => {
        console.log('🔍 Filtro cambiado: minPrice =', price);
        set({ minPrice: price, page: 0 });
      },
      setMaxPrice: (price) => {
        console.log('🔍 Filtro cambiado: maxPrice =', price);
        set({ maxPrice: price, page: 0 });
      },
      setStockFilter: (filter) => {
        console.log('🔍 Filtro cambiado: stockFilter =', filter);
        set({ stockFilter: filter, page: 0 });
      },
      setActiveFilter: (filter) => {
        console.log('🔍 Filtro cambiado: activeFilter =', filter);
        set({ activeFilter: filter, page: 0 });
      },
      setSearchTerm: (term) => {
        console.log('🔍 Búsqueda cambiada: searchTerm =', term);
        set({ searchTerm: term, page: 0 });
      },
      setPage: (page) => set({ page }),
      setPageSize: (size) => {
        console.log('📄 Tamaño de página cambiado:', size);
        set({ pageSize: size, page: 0 });
      },
      setSortField: (field) => {
        console.log('📊 Orden cambiado: sortField =', field);
        set({ sortField: field });
      },
      setSortOrder: (order) => {
        console.log('📊 Orden cambiado: sortOrder =', order);
        set({ sortOrder: order });
      },
      
      resetFilters: () => {
        console.log('🔄 Resetear todos los filtros');
        set({
          categoryId: null,
          subcategoryId: null,
          supplierId: null,
          supplierSku: '',
          minPrice: null,
          maxPrice: null,
          stockFilter: 'all',
          activeFilter: 'all',
          searchTerm: '',
          page: 0,
          pageSize: 15,
          sortField: 'createdAt',
          sortOrder: 'desc'
        });
      },
      
      nextPage: () => {
        console.log('📄 Siguiente página');
        set((state) => ({ page: state.page + 1 }));
      },
      previousPage: () => {
        console.log('📄 Página anterior');
        set((state) => ({ page: Math.max(0, state.page - 1) }));
      }
    }),
    {
      name: 'product-filters', // nombre para localStorage
      partialize: (state) => ({
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder
      })
    }
  )
);