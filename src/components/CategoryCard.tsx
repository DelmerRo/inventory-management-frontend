// components/CategoryCard.tsx
import React, { useState } from 'react';
import { useCategoryStore } from '../store/categoryStore';
import type { Category } from '../types/category';
import ConfirmModal from './ConfirmModal';

interface CategoryCardProps {
    category: Category;
    onEdit: (category: Category) => void;
    onViewSubcategories: (category: Category) => void;
    onAddSubcategory: (category: Category) => void; // ✅ Nueva prop
}

const CategoryCard: React.FC<CategoryCardProps> = ({ 
    category, 
    onEdit, 
    onViewSubcategories, 
    onAddSubcategory 
}) => {
    const { toggleCategoryStatus, deleteCategory, isLoading } = useCategoryStore();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleToggleStatus = async () => {
        await toggleCategoryStatus(category.id);
    };

    const handleDelete = async () => {
        await deleteCategory(category.id);
        setShowDeleteModal(false);
    };

    return (
        <>
            <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all border ${
                category.active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
            }`}>
                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <h3 className={`font-semibold text-lg ${
                                category.active ? 'text-gray-900' : 'text-gray-500 line-through'
                            }`}>
                                {category.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                {category.active ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                        Activo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        Inactivo
                                    </span>
                                )}
                                <span className="text-xs text-gray-400">
                                    📁 {category.subcategoryCount} subcategorías
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => onViewSubcategories(category)}
                            className={`flex-1 px-3 py-1.5 rounded-md transition text-sm font-medium ${
                                category.active 
                                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                    : 'bg-gray-400 text-white cursor-not-allowed'
                            }`}
                            disabled={!category.active}
                            title={!category.active ? 'Categoría inactiva' : 'Ver subcategorías'}
                        >
                            Ver subcategorías
                        </button>
                        <button
                            onClick={() => onAddSubcategory(category)}
                            className={`px-3 py-1.5 rounded-md transition text-sm font-medium ${
                                category.active 
                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                    : 'bg-gray-400 text-white cursor-not-allowed'
                            }`}
                            disabled={!category.active}
                            title={!category.active ? 'Categoría inactiva' : 'Agregar subcategoría'}
                        >
                            + Sub
                        </button>
                        <button
                            onClick={() => onEdit(category)}
                            className="px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition"
                            title="Editar"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={handleToggleStatus}
                            className={`px-3 py-1.5 rounded-md transition text-white ${
                                category.active 
                                    ? 'bg-orange-500 hover:bg-orange-600' 
                                    : 'bg-green-500 hover:bg-green-600'
                            }`}
                            title={category.active ? 'Desactivar' : 'Activar'}
                        >
                            {category.active ? '🔴' : '🟢'}
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                            title="Eliminar"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Eliminar categoría"
                message={`¿Estás seguro de que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
                isLoading={isLoading}
            />
        </>
    );
};

export default CategoryCard;