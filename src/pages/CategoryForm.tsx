// pages/CategoryForm.tsx
import React, { useState, useEffect } from 'react';
import { useCategoryStore } from '../store/categoryStore';
import type { Category } from '../types/category';

interface CategoryFormProps {
    category?: Category | null;
    onClose: () => void;
    onSuccess: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onClose, onSuccess }) => {
    const { createCategory, updateCategory, isLoading } = useCategoryStore();
    const isEditMode = !!category;

    const [formData, setFormData] = useState({
        name: '',
        active: true
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                active: category.active
            });
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        try {
            if (isEditMode && category) {
                await updateCategory(category.id, formData);
            } else {
                await createCategory(formData);
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Error al guardar la categoría');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {isEditMode ? 'Editar Categoría' : 'Nueva Categoría'}
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

export default CategoryForm;