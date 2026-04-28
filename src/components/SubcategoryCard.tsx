// components/SubcategoryCard.tsx
import React, { useState } from 'react';
import { useCategoryStore } from '../store/categoryStore';
import type { Subcategory } from '../types/category';
import ConfirmModal from './ConfirmModal';

interface SubcategoryCardProps {
    subcategory: Subcategory;
    onEdit: (subcategory: Subcategory) => void;
}

const SubcategoryCard: React.FC<SubcategoryCardProps> = ({ subcategory, onEdit }) => {
    const { toggleSubcategoryStatus, deleteSubcategory, isLoading } = useCategoryStore();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleToggleStatus = async () => {
        await toggleSubcategoryStatus(subcategory.id);
    };

    const handleDelete = async () => {
        await deleteSubcategory(subcategory.id);
        setShowDeleteModal(false);
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200">
                <div className="p-3">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{subcategory.name}</h4>
                                {subcategory.active ? (
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
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                📦 {subcategory.productCount} productos
                            </p>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => onEdit(subcategory)}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition"
                                title="Editar"
                            >
                                ✏️
                            </button>
                            <button
                                onClick={handleToggleStatus}
                                className={`p-1.5 rounded transition ${
                                    subcategory.active 
                                        ? 'text-orange-600 hover:bg-orange-50' 
                                        : 'text-green-600 hover:bg-green-50'
                                }`}
                                title={subcategory.active ? 'Desactivar' : 'Activar'}
                            >
                                {subcategory.active ? '🔴' : '🟢'}
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Eliminar subcategoría"
                message={`¿Estás seguro de que deseas eliminar la subcategoría "${subcategory.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
                isLoading={isLoading}
            />
        </>
    );
};

export default SubcategoryCard;