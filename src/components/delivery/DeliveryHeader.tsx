import React from 'react';
import type { PurchaseOrderResponse } from '../../types/purchaseOrder';

interface DeliveryHeaderProps {
    selectedOrder: PurchaseOrderResponse;
    completionPercentage: number;
    totalValue: number;
}

export const DeliveryHeader: React.FC<DeliveryHeaderProps> = ({
    selectedOrder,
    completionPercentage,
    totalValue
}) => {
    return (
        <div className="bg-gray-900 text-white p-5 rounded-3xl mb-6 flex flex-col sm:flex-row justify-between sm:items-center shadow-lg gap-4">
            <div className="grid grid-cols-2 gap-4 flex-1">
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">N° Pedido</p>
                    <p className="font-mono text-sm md:text-base font-bold">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Proveedor</p>
                    <p className="font-bold text-sm md:text-base line-clamp-1" title={selectedOrder.supplierName}>
                        {selectedOrder.supplierName}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Fecha Emisión</p>
                    <p className="font-bold text-sm md:text-base">
                        {new Date(selectedOrder.orderDate).toLocaleDateString()}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Pedido</p>
                    <p className="font-black text-emerald-400 text-sm md:text-base">
                        ${totalValue.toLocaleString('es-AR')}
                    </p>
                </div>
            </div>
            <div className="text-right border-t sm:border-t-0 sm:border-l border-gray-700 pt-4 sm:pt-0 sm:pl-6">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Progreso</p>
                <p className="text-3xl font-black text-emerald-400">{completionPercentage}%</p>
            </div>
        </div>
    );
};