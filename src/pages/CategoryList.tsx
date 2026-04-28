// pages/CategoryList.tsx
import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '../store/categoryStore';
import CategoryCard from '../components/CategoryCard';
import SubcategoryCard from '../components/SubcategoryCard';
import CategoryForm from './CategoryForm';
import SubcategoryForm from './SubcategoryForm';
import type { Category, Subcategory } from '../types/category';

const CategoryList: React.FC = () => {
    const { 
        categories, 
        isLoading, 
        error, 
        fetchCategories,
        clearError,
        showInactive,
        setShowInactive
    } = useCategoryStore();
    
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // ✅ Cargar categorías al montar
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setShowCategoryForm(true);
    };

    const handleEditSubcategory = (subcategory: Subcategory) => {
        setEditingSubcategory(subcategory);
        setShowSubcategoryForm(true);
    };

    const handleViewSubcategories = (category: Category) => {
        setSelectedCategory(category);
    };

    const handleCloseCategoryForm = () => {
        setShowCategoryForm(false);
        setEditingCategory(null);
    };

    const handleCloseSubcategoryForm = () => {
        setShowSubcategoryForm(false);
        setEditingSubcategory(null);
    };

    const handleToggleShowInactive = () => {
        setShowInactive(!showInactive);
    };

    // ✅ Abrir formulario de subcategoría con categoría preseleccionada
    const handleAddSubcategory = (category?: Category) => {
        setEditingSubcategory(null);
        setSelectedCategory(category || null);
        setShowSubcategoryForm(true);
    };

    // Filtrar categorías según showInactive
    const displayedCategories = showInactive 
        ? categories 
        : categories.filter(cat => cat.active);

    if (isLoading && categories.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Cargando categorías...</div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">📂 Categorías</h1>
                <div className="flex gap-2">
                    {/* Filtro para mostrar inactivos */}
                    <button
                        onClick={handleToggleShowInactive}
                        className={`px-4 py-2 rounded-md transition flex items-center gap-2 ${
                            showInactive 
                                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                    >
                        {showInactive ? '👁️ Ocultar inactivos' : '👁️ Mostrar inactivos'}
                    </button>
                    <button
                        onClick={() => setShowCategoryForm(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                    >
                        + Nueva Categoría
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-700 hover:text-red-900">×</button>
                </div>
            )}

            {/* Vista de categorías */}
            {!selectedCategory ? (
                <>
                    <div className="mb-4 text-sm text-gray-500 flex justify-between">
                        <span>Total: {displayedCategories.length} categorías</span>
                        {showInactive && (
                            <span className="text-orange-500">Mostrando también inactivos</span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedCategories.map((category) => (
                            <CategoryCard
                                key={category.id}
                                category={category}
                                onEdit={handleEditCategory}
                                onViewSubcategories={handleViewSubcategories}
                                onAddSubcategory={handleAddSubcategory}
                            />
                        ))}
                    </div>
                    {displayedCategories.length === 0 && !isLoading && (
                        <div className="text-center text-gray-500 py-8">
                            No hay categorías registradas. ¡Crea tu primera categoría!
                        </div>
                    )}
                </>
            ) : (
                // Vista de subcategorías de una categoría
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            ← Volver a categorías
                        </button>
                        <button
                            onClick={() => handleAddSubcategory(selectedCategory)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition text-sm"
                        >
                            + Nueva Subcategoría
                        </button>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h2>
                                <p className="text-gray-500 text-sm">
                                    {selectedCategory.subcategoryCount} subcategorías
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingCategory(selectedCategory);
                                    setShowCategoryForm(true);
                                }}
                                className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                            >
                                ✏️ Editar categoría
                            </button>
                        </div>
                    </div>

                    {/* Lista de subcategorías */}
                    <div className="space-y-2">
                        {selectedCategory.subcategories
                            .filter(sub => showInactive ? true : sub.active)
                            .map((subcategory) => (
                                <SubcategoryCard
                                    key={subcategory.id}
                                    subcategory={subcategory}
                                    onEdit={handleEditSubcategory}
                                />
                            ))}
                    </div>

                    {selectedCategory.subcategories.filter(sub => showInactive ? true : sub.active).length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            {showInactive 
                                ? 'No hay subcategorías en esta categoría (activas o inactivas).'
                                : 'No hay subcategorías activas en esta categoría.'}
                        </div>
                    )}
                </div>
            )}

            {/* Modales */}
            {showCategoryForm && (
                <CategoryForm
                    category={editingCategory}
                    onClose={handleCloseCategoryForm}
                    onSuccess={handleCloseCategoryForm}
                />
            )}

            {showSubcategoryForm && (
                <SubcategoryForm
                    subcategory={editingSubcategory}
                    categories={categories}
                    preselectedCategoryId={selectedCategory?.id}
                    onClose={handleCloseSubcategoryForm}
                    onSuccess={() => {
                        handleCloseSubcategoryForm();
                        fetchCategories(); // Recargar para actualizar contadores
                    }}
                />
            )}
        </div>
    );
};

export default CategoryList;