// pages/SubcategoryForm.tsx
import React, { useState, useEffect } from 'react';
import { useCategoryStore } from '../store/categoryStore';
import type { Category, Subcategory } from '../types/category';

interface SubcategoryFormProps {
    subcategory?: Subcategory | null;
    categories: Category[];
    preselectedCategoryId?: number | null; // ✅ Nueva prop
    onClose: () => void;
    onSuccess: () => void;
}

const SubcategoryForm: React.FC<SubcategoryFormProps> = ({ 
    subcategory, 
    categories, 
    preselectedCategoryId,
    onClose, 
    onSuccess 
}) => {
    const { createSubcategory, updateSubcategory, isLoading } = useCategoryStore();
    const isEditMode = !!subcategory;

    // ✅ Determinar categoría inicial
    const getInitialCategoryId = () => {
        if (isEditMode && subcategory) {
            return subcategory.categoryId;
        }
        if (preselectedCategoryId) {
            return preselectedCategoryId;
        }
        return categories[0]?.id || 1;
    };

    const [formData, setFormData] = useState({
        name: '',
        categoryId: getInitialCategoryId(),
        active: true
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (subcategory) {
            setFormData({
                name: subcategory.name,
                categoryId: subcategory.categoryId,
                active: subcategory.active
            });
        }
    }, [subcategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        if (!formData.categoryId) {
            setError('Debe seleccionar una categoría');
            return;
        }

        try {
            if (isEditMode && subcategory) {
                await updateSubcategory(subcategory.id, formData);
            } else {
                await createSubcategory(formData);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Error al guardar la subcategoría');
        }
    };

    // ✅ Obtener nombre de la categoría seleccionada para mostrar
    const selectedCategoryName = categories.find(c => c.id === formData.categoryId)?.name;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {isEditMode ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Categoría *
                        </label>
                        {preselectedCategoryId && !isEditMode ? (
                            // ✅ Si hay categoría preseleccionada, mostrar como texto deshabilitado
                            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                                {selectedCategoryName}
                                <input type="hidden" value={formData.categoryId} />
                            </div>
                        ) : (
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                required
                                disabled={isEditMode}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        )}
                        {isEditMode && (
                            <p className="text-xs text-gray-400 mt-1">
                                La categoría no se puede modificar en edición
                            </p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="mb-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.active}
                                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-gray-700 text-sm">Activo</span>
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubcategoryForm;