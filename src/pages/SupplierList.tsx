// pages/SupplierList.tsx
import React, { useEffect, useState } from 'react';
import { useSupplierStore } from '../store/supplierStore';
import SupplierCard from '../components/SupplierCard';
import SupplierForm from './SupplierForm';
import type { Supplier } from '../types/supplier';

const SupplierList: React.FC = () => {
    const { 
        suppliers, 
        isLoading, 
        error, 
        fetchSuppliers,
        clearError,
        showInactive,
        setShowInactive
    } = useSupplierStore();
    
    const [showSupplierForm, setShowSupplierForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleEditSupplier = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setShowSupplierForm(true);
    };

    const handleCloseSupplierForm = () => {
        setShowSupplierForm(false);
        setEditingSupplier(null);
        // Recargar la lista después de cerrar el modal
        fetchSuppliers();
    };

    const handleToggleShowInactive = () => {
        setShowInactive(!showInactive);
    };

    // Filtrar proveedores según showInactive
    const displayedSuppliers = showInactive 
        ? suppliers 
        : suppliers.filter(sup => sup.active);

    const totalSuppliers = suppliers.length;
    const activeCount = suppliers.filter(s => s.active).length;
    const inactiveCount = suppliers.filter(s => !s.active).length;

    if (isLoading && suppliers.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Cargando proveedores...</div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">🏭 Proveedores</h1>
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
                        onClick={() => {
                            setEditingSupplier(null);
                            setShowSupplierForm(true);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                    >
                        + Nuevo Proveedor
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-lg shadow p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalSuppliers}</div>
                    <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="bg-white rounded-lg shadow p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    <div className="text-xs text-gray-500">Activos</div>
                </div>
                <div className="bg-white rounded-lg shadow p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
                    <div className="text-xs text-gray-500">Inactivos</div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-700 hover:text-red-900">×</button>
                </div>
            )}

            <div className="mb-4 text-sm text-gray-500 flex justify-between">
                <span>Total: {displayedSuppliers.length} proveedores</span>
                {showInactive && (
                    <span className="text-orange-500">Mostrando también inactivos</span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedSuppliers.map((supplier) => (
                    <SupplierCard
                        key={supplier.id}
                        supplier={supplier}
                        onEdit={handleEditSupplier}
                    />
                ))}
            </div>

            {displayedSuppliers.length === 0 && !isLoading && (
                <div className="text-center text-gray-500 py-8">
                    No hay proveedores registrados. ¡Crea tu primer proveedor!
                </div>
            )}

            {/* Modal de formulario */}
            {showSupplierForm && (
                <SupplierForm
                    supplier={editingSupplier}
                    onClose={handleCloseSupplierForm}
                    onSuccess={handleCloseSupplierForm}
                />
            )}
        </div>
    );
};

export default SupplierList;