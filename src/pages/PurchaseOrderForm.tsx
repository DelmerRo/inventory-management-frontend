// pages/PurchaseOrderForm.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { supplierApi } from '../api/suppliers';
import { productApi } from '../api/products';
import { categoryApi } from '../api/categories';
import QuickProductModal from '../components/QuickProductModal';
import type { SupplierSummary } from '../api/suppliers';
import type { PurchaseOrderRequest, PurchaseOrderItemRequest } from '../types/purchaseOrder';
import type { Category } from '../api/categories';

const PurchaseOrderForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id && id !== 'new';
    const { selectedOrder, fetchOrderById, createOrder, updateOrder, isLoading } = usePurchaseOrderStore();
    
    const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
    const [_categories, _setCategories] = useState<Category[]>([]);
    const [isValidatingSku, setIsValidatingSku] = useState(false);
    const [showQuickProductModal, setShowQuickProductModal] = useState(false);
    const [pendingSupplierSku, setPendingSupplierSku] = useState('');
    const [pendingNewItem, setPendingNewItem] = useState<PurchaseOrderItemRequest | null>(null);
    
    const [formData, setFormData] = useState<PurchaseOrderRequest>({
        supplierId: 1,
        orderDate: new Date().toISOString().slice(0, 16),
        expectedDeliveryDate: '',
        notes: '',
        items: []
    });

    const [newItem, setNewItem] = useState<PurchaseOrderItemRequest>({
        supplierSku: '',
        productName: '',
        quantity: 1,
        unitPrice: 0
    });

    useEffect(() => {
        loadSuppliers();
        loadCategories();
        if (isEditMode && id) {
            fetchOrderById(parseInt(id));
        }
    }, [isEditMode, id]);

    useEffect(() => {
        if (isEditMode && selectedOrder) {
            setFormData({
                supplierId: selectedOrder.supplierId,
                orderDate: selectedOrder.orderDate.slice(0, 16),
                expectedDeliveryDate: selectedOrder.expectedDeliveryDate?.slice(0, 16) || '',
                notes: selectedOrder.notes || '',
                items: selectedOrder.items.map(item => ({
                    supplierSku: item.sku,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }))
            });
        }
    }, [selectedOrder, isEditMode]);

    const loadSuppliers = async () => {
        try {
            const sups = await supplierApi.getAllSummary();
            setSuppliers(sups || []);
            if (sups.length > 0 && !isEditMode) {
                setFormData(prev => ({ ...prev, supplierId: sups[0].id }));
            }
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    };

    const loadCategories = async () => {
        try {
            const cats = await categoryApi.getAll();
            _setCategories(cats || []);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    // Validar SKU del proveedor al perder el foco
    const handleSupplierSkuBlur = async () => {
        if (!newItem.supplierSku || newItem.supplierSku.trim() === '') return;
        
        // ✅ Verificar si el SKU ya existe en los items actuales
        const existingItem = formData.items.find(item => item.supplierSku === newItem.supplierSku);
        if (existingItem) {
            // Si ya existe, solo permitir modificar cantidad - mostrar mensaje
            alert(`⚠️ El producto "${existingItem.productName}" ya está en el pedido. Solo se sumará la cantidad.`);
            // Auto-completar datos del item existente
            setNewItem(prev => ({
                ...prev,
                productName: existingItem.productName,
                unitPrice: existingItem.unitPrice
            }));
            setIsValidatingSku(false);
            return;
        }
        
        setIsValidatingSku(true);
        try {
            const existingProduct = await productApi.getBySupplierSku(newItem.supplierSku);
            if (existingProduct && existingProduct.name) {
                setNewItem(prev => ({
                    ...prev,
                    productName: existingProduct.name
                }));
                console.log(`✅ Producto encontrado: ${existingProduct.name}`);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                setPendingSupplierSku(newItem.supplierSku);
                setPendingNewItem({ ...newItem });
                setShowQuickProductModal(true);
            } else {
                alert('Error al verificar el producto');
            }
        } finally {
            setIsValidatingSku(false);
        }
    };

    const handleProductCreated = (product: { supplierSku: string; name: string; productId: number }) => {
        if (pendingNewItem) {
            setNewItem({
                ...pendingNewItem,
                productName: product.name
            });
            setPendingNewItem(null);
        }
        console.log(`✅ Producto "${product.name}" creado exitosamente`);
    };

    // Agregar o actualizar item (sumar si existe)
    const addOrUpdateItem = () => {
        if (!newItem.supplierSku) {
            alert('El SKU del proveedor es obligatorio');
            return;
        }
        if (newItem.quantity <= 0) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }
        if (newItem.unitPrice <= 0) {
            alert('El precio unitario debe ser mayor a 0');
            return;
        }
        
        setFormData(prev => {
            const existingItemIndex = prev.items.findIndex(
                item => item.supplierSku === newItem.supplierSku
            );
            
            if (existingItemIndex !== -1) {
                // ✅ Si existe, solo sumar la cantidad (no modificar nombre ni precio)
                const updatedItems = [...prev.items];
                const existingItem = updatedItems[existingItemIndex];
                const newQuantity = existingItem.quantity + newItem.quantity;
                
                updatedItems[existingItemIndex] = {
                    ...existingItem,
                    quantity: newQuantity
                    // ❌ No modificar productName ni unitPrice
                };
                
                alert(`✅ Cantidad actualizada. Producto: ${existingItem.productName}, Nueva cantidad: ${newQuantity}`);
                return { ...prev, items: updatedItems };
            } else {
                // ✅ Si no existe, agregar nuevo
                alert(`✅ Producto agregado: ${newItem.supplierSku} - ${newItem.productName}`);
                return {
                    ...prev,
                    items: [...prev.items, { ...newItem }]
                };
            }
        });
        
        // Resetear formulario
        setNewItem({
            supplierSku: '',
            productName: '',
            quantity: 1,
            unitPrice: 0
        });
    };

    // ✅ Solo permitir modificar cantidad (no nombre ni precio de items existentes)
    const updateItemQuantity = (index: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => 
                i === index ? { ...item, quantity: newQuantity } : item
            )
        }));
    };

    const removeItem = (index: number) => {
        const item = formData.items[index];
        if (confirm(`¿Eliminar "${item.productName}" del pedido?`)) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.items.length === 0) {
            alert('Debe agregar al menos un producto al pedido');
            return;
        }
        
        let success = false;
        try {
            if (isEditMode && id) {
                success = await updateOrder(parseInt(id), formData);
            } else {
                success = await createOrder(formData);
            }
            
            if (success) {
                navigate('/purchase-orders');
            }
        } catch (error) {
            console.error('Error saving order:', error);
        }
    };

    const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    if (isLoading && isEditMode) {
        return <div className="text-center py-8 text-gray-500">Cargando pedido...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">
                {isEditMode ? 'Editar Pedido de Compra' : 'Nuevo Pedido de Compra'}
            </h1>
            
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
                {/* Información básica */}
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-lg font-semibold mb-4">Información del Pedido</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Proveedor *
                            </label>
                            <select
                                value={formData.supplierId}
                                onChange={(e) => setFormData({ ...formData, supplierId: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {suppliers.map(sup => (
                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Fecha del Pedido *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.orderDate}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Fecha Esperada de Entrega
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.expectedDeliveryDate}
                                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Notas
                            </label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Items del pedido */}
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-lg font-semibold mb-4">Productos</h2>
                    
                    {/* Lista de items - solo se puede editar la cantidad */}
                    {formData.items.length > 0 && (
                        <div className="mb-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU Proveedor</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {formData.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-sm font-mono">
                                                {item.supplierSku}
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                {item.productName}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-center">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                                    min="1"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-sm text-right">
                                                ${item.unitPrice.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-right font-medium">
                                                ${(item.quantity * item.unitPrice).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-500 hover:text-red-700 transition"
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50">
                                        <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-700">Total:</td>
                                        <td className="px-3 py-2 text-right font-bold text-blue-600">${totalAmount.toFixed(2)}</td>
                                        <td className="px-3 py-2"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Agregar nuevo item */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-3 text-gray-700">Agregar Producto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="SKU Proveedor *"
                                    value={newItem.supplierSku}
                                    onChange={(e) => setNewItem({ ...newItem, supplierSku: e.target.value.toUpperCase() })}
                                    onBlur={handleSupplierSkuBlur}
                                    className={`px-3 py-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500 ${isValidatingSku ? 'bg-gray-100' : 'border-gray-300'}`}
                                    disabled={isValidatingSku}
                                />
                                {isValidatingSku && (
                                    <p className="text-xs text-gray-400 mt-1">Verificando SKU...</p>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Nombre del producto"
                                value={newItem.productName}
                                onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                readOnly={formData.items.some(item => item.supplierSku === newItem.supplierSku)}
                                disabled={formData.items.some(item => item.supplierSku === newItem.supplierSku)}
                            />
                            <input
                                type="number"
                                placeholder="Cantidad"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                min="1"
                            />
                            <input
                                type="number"
                                placeholder="Precio unitario"
                                value={newItem.unitPrice || ''}
                                onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                                min="0.01"
                                readOnly={formData.items.some(item => item.supplierSku === newItem.supplierSku)}
                                disabled={formData.items.some(item => item.supplierSku === newItem.supplierSku)}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addOrUpdateItem}
                            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                        >
                            + Agregar / Actualizar Producto
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                            💡 Si el SKU ya existe en el pedido, solo se sumará la cantidad. No se modificarán el nombre ni el precio.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
                    >
                        {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Pedido' : 'Crear Pedido')}
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => navigate('/purchase-orders')}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition"
                    >
                        Cancelar
                    </button>
                </div>
            </form>

            {/* Modal para crear producto rápido */}
            <QuickProductModal
                isOpen={showQuickProductModal}
                supplierSku={pendingSupplierSku}
                onClose={() => {
                    setShowQuickProductModal(false);
                    setPendingNewItem(null);
                }}
                onProductCreated={handleProductCreated}
            />
        </div>
    );
};

export default PurchaseOrderForm;