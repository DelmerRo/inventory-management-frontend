// components/QuickProductModal.tsx
import React, { useState, useEffect } from 'react';
import { productApi } from '../api/products';
import { categoryApi } from '../api/categories';
import type { Category, Subcategory } from '../api/categories';
import type { QuickProductRequest } from '../types/product';
interface QuickProductModalProps {
    isOpen: boolean;
    supplierSku: string;
    onClose: () => void;
    onProductCreated: (product: { supplierSku: string; name: string; productId: number }) => void;
}

const QuickProductModal: React.FC<QuickProductModalProps> = ({ 
    isOpen, 
    supplierSku, 
    onClose, 
    onProductCreated 
}) => {
    const [formData, setFormData] = useState<QuickProductRequest>({
        name: '',
        supplierSku: supplierSku,
        subcategoryId: 0
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
    const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCategories();
            setFormData((prev: QuickProductRequest) => ({ ...prev, supplierSku }));  // ✅ Tipar prev
        }
    }, [isOpen, supplierSku]);

    const loadCategories = async () => {
        try {
            const cats = await categoryApi.getAll();
            setCategories(cats);
            if (cats.length > 0) {
                setSelectedCategoryId(cats[0].id);
                setAvailableSubcategories(cats[0].subcategories);
                if (cats[0].subcategories.length > 0) {
                    setFormData((prev: QuickProductRequest) => ({ ...prev, subcategoryId: cats[0].subcategories[0].id }));
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const handleCategoryChange = (categoryId: number) => {
        setSelectedCategoryId(categoryId);
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
            setAvailableSubcategories(category.subcategories);
            if (category.subcategories.length > 0) {
                setFormData((prev: QuickProductRequest) => ({ ...prev, subcategoryId: category.subcategories[0].id }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            setError('El nombre del producto es obligatorio');
            return;
        }
        
        if (!formData.subcategoryId || formData.subcategoryId === 0) {
            setError('Debe seleccionar una subcategoría');
            return;
        }
        
        setIsLoading(true);
        setError('');

        try {
            const newProduct = await productApi.createQuick({
                name: formData.name,
                supplierSku: formData.supplierSku,
                subcategoryId: formData.subcategoryId
            });
            
            onProductCreated({
                supplierSku: formData.supplierSku,
                name: newProduct.name,
                productId: newProduct.id
            });
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al crear el producto');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            🆕 Producto no encontrado
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                        El SKU <strong className="font-mono text-blue-600">{supplierSku}</strong> no está registrado en el sistema.
                        Complete los datos para crearlo rápidamente:
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Nombre del producto *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: Alfombra Moderna Gris"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                SKU del proveedor *
                            </label>
                            <input
                                type="text"
                                value={formData.supplierSku}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                                disabled
                            />
                            <p className="text-xs text-gray-400 mt-1">El SKU del proveedor no puede modificarse</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Categoría *
                            </label>
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => handleCategoryChange(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Subcategoría *
                            </label>
                            <select
                                value={formData.subcategoryId}
                                onChange={(e) => setFormData({ ...formData, subcategoryId: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {availableSubcategories.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isLoading ? 'Creando...' : '✅ Crear Producto'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default QuickProductModal;