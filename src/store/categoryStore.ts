// store/categoryStore.ts
import { create } from 'zustand';
import { categoryApi } from '../api/categories';
import type { Category, Subcategory, CategoryRequest, SubcategoryRequest } from '../types/category';

interface CategoryStore {
    categories: Category[];
    subcategories: Subcategory[];
    selectedCategory: Category | null;
    selectedSubcategory: Subcategory | null;
    isLoading: boolean;
    error: string | null;
    showInactive: boolean;
    
    // Acciones
    fetchCategories: () => Promise<void>;
    fetchSubcategories: () => Promise<void>;
    fetchSubcategoriesByCategory: (categoryId: number) => Promise<Subcategory[]>;
    createCategory: (data: CategoryRequest) => Promise<void>;
    updateCategory: (id: number, data: CategoryRequest) => Promise<void>;
    deleteCategory: (id: number) => Promise<void>;
    toggleCategoryStatus: (id: number) => Promise<void>;
    createSubcategory: (data: SubcategoryRequest) => Promise<void>;
    updateSubcategory: (id: number, data: SubcategoryRequest) => Promise<void>;
    deleteSubcategory: (id: number) => Promise<void>;
    toggleSubcategoryStatus: (id: number) => Promise<void>;
    setShowInactive: (show: boolean) => void;
    clearError: () => void;
    clearSelected: () => void;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
    categories: [],
    subcategories: [],
    selectedCategory: null,
    selectedSubcategory: null,
    isLoading: false,
    error: null,
    showInactive: false,

    // ✅ Único método - Siempre trae TODAS las categorías (activas + inactivas)
    fetchCategories: async () => {
        set({ isLoading: true, error: null });
        try {
            const categories = await categoryApi.getAll();
            set({ categories, isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cargar categorías', isLoading: false });
        }
    },

    fetchSubcategories: async () => {
        set({ isLoading: true, error: null });
        try {
            const subcategories = await categoryApi.getAllSubcategories();
            set({ subcategories, isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cargar subcategorías', isLoading: false });
        }
    },

    fetchSubcategoriesByCategory: async (categoryId: number) => {
        set({ isLoading: true, error: null });
        try {
            const subcategories = await categoryApi.getSubcategoriesByCategory(categoryId);
            set({ isLoading: false });
            return subcategories;
        } catch (error: any) {
            set({ error: error.message || 'Error al cargar subcategorías', isLoading: false });
            return [];
        }
    },

    createCategory: async (data: CategoryRequest) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.create(data);
            await get().fetchCategories();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al crear categoría', isLoading: false });
            throw error;
        }
    },

    updateCategory: async (id: number, data: CategoryRequest) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.update(id, data);
            await get().fetchCategories();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al actualizar categoría', isLoading: false });
            throw error;
        }
    },

    deleteCategory: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.delete(id);
            await get().fetchCategories();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al eliminar categoría', isLoading: false });
            throw error;
        }
    },

    toggleCategoryStatus: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.toggleStatus(id);
            await get().fetchCategories();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cambiar estado', isLoading: false });
            throw error;
        }
    },

    createSubcategory: async (data: SubcategoryRequest) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.createSubcategory(data);
            await Promise.all([get().fetchCategories(), get().fetchSubcategories()]);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al crear subcategoría', isLoading: false });
            throw error;
        }
    },

    updateSubcategory: async (id: number, data: SubcategoryRequest) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.updateSubcategory(id, data);
            await Promise.all([get().fetchCategories(), get().fetchSubcategories()]);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al actualizar subcategoría', isLoading: false });
            throw error;
        }
    },

    deleteSubcategory: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.deleteSubcategory(id);
            await Promise.all([get().fetchCategories(), get().fetchSubcategories()]);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al eliminar subcategoría', isLoading: false });
            throw error;
        }
    },

    toggleSubcategoryStatus: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await categoryApi.toggleSubcategoryStatus(id);
            await Promise.all([get().fetchCategories(), get().fetchSubcategories()]);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Error al cambiar estado', isLoading: false });
            throw error;
        }
    },

    setShowInactive: (show: boolean) => {
        set({ showInactive: show });
    },

    clearError: () => set({ error: null }),
    clearSelected: () => set({ selectedCategory: null, selectedSubcategory: null })
}));