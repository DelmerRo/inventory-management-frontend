// types/category.ts
export interface Subcategory {
    id: number;
    name: string;
    active: boolean;
    categoryId: number;
    categoryName: string;
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: number;
    name: string;
    active: boolean;
    subcategoryCount: number;
    subcategories: Subcategory[];
    createdAt: string;
    updatedAt: string;
}

export interface CategoryRequest {
    name: string;
    active?: boolean;
}

export interface SubcategoryRequest {
    name: string;
    categoryId: number;
    active?: boolean;
}