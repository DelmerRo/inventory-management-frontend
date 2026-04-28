// components/SupplierCard.tsx
import React, { useState } from 'react';
import { useSupplierStore } from '../store/supplierStore';
import type { Supplier } from '../types/supplier';
import ConfirmModal from './ConfirmModal';

interface SupplierCardProps {
    supplier: Supplier;
    onEdit: (supplier: Supplier) => void;
}

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, onEdit }) => {
    const { toggleSupplierStatus, isLoading } = useSupplierStore();
    const [showToggleModal, setShowToggleModal] = useState(false);

    const handleToggleStatus = async () => {
        await toggleSupplierStatus(supplier.id);
        setShowToggleModal(false);
    };

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase();
    };

    const actionText = supplier.active ? 'desactivar' : 'reactivar';
    const actionTitle = supplier.active ? 'Desactivar proveedor' : 'Reactivar proveedor';
    const actionMessage = supplier.active
        ? `¿Estás seguro de que deseas DESACTIVAR el proveedor "${supplier.name}"?`
        : `¿Estás seguro de que deseas REACTIVAR el proveedor "${supplier.name}"?`;

    return (
        <>
            <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all border ${
                supplier.active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
            }`}>
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            supplier.active ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                            {getInitials(supplier.name)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-lg ${
                                supplier.active ? 'text-gray-900' : 'text-gray-500 line-through'
                            }`}>
                                {supplier.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                {supplier.active ? (
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
                                    📦 {supplier.productCount} productos
                                </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-500 space-y-0.5">
                                {supplier.contactPerson && (
                                    <p className="flex items-center gap-1">
                                        <span>👤</span> {supplier.contactPerson}
                                    </p>
                                )}
                                {supplier.phone && (
                                    <p className="flex items-center gap-1">
                                        <span>📞</span> {supplier.phone}
                                    </p>
                                )}
                                {supplier.email && (
                                    <p className="flex items-center gap-1 text-xs truncate">
                                        <span>✉️</span> {supplier.email}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-1 shrink-0">
                            {/* Botón Editar - siempre visible */}
                            <button
                                onClick={() => onEdit(supplier)}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition"
                                title="Editar proveedor"
                            >
                                ✏️
                            </button>
                            
                            {/* Botón Activar/Desactivar - cambia según estado */}
                            {supplier.active ? (
                                <button
                                    onClick={() => setShowToggleModal(true)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                    title="Desactivar proveedor"
                                >
                                    🔴
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowToggleModal(true)}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                    title="Reactivar proveedor"
                                >
                                    🟢
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showToggleModal}
                title={actionTitle}
                message={actionMessage}
                confirmText={actionText}
                onConfirm={handleToggleStatus}
                onCancel={() => setShowToggleModal(false)}
                isLoading={isLoading}
            />
        </>
    );
};

export default SupplierCard;