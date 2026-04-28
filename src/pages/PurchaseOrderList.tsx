// pages/PurchaseOrderList.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseOrderStore } from '../store/purchaseOrderStore';
import { supplierApi } from '../api/suppliers';
import type { SupplierSummary } from '../api/suppliers';

const statusColors: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  PARCIAL: 'bg-blue-100 text-blue-800',
  COMPLETADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800'
};

const statusSpanish: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado'
};

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { orders, isLoading, error, fetchOrders, deleteOrder, cancelOrder } = usePurchaseOrderStore();
  const [_suppliers, _setSuppliers] = useState<SupplierSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchOrders();
    loadSuppliers();
  }, [fetchOrders]);

  const loadSuppliers = async () => {
    try {
      const sups = await supplierApi.getAllSummary();
      _setSuppliers(sups || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      _setSuppliers([]);
    }
  };

  const handleDelete = async (id: number, orderNumber: string) => {
    if (confirm(`¿Eliminar pedido ${orderNumber}?`)) {
      const success = await deleteOrder(id);
      if (success) fetchOrders();
    }
  };

  const handleCancel = async (id: number, orderNumber: string) => {
    if (confirm(`¿Cancelar pedido ${orderNumber}?`)) {
      const success = await cancelOrder(id);
      if (success) fetchOrders();
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = statusFilter ? safeOrders.filter(o => o.status === statusFilter) : safeOrders;

  if (isLoading && safeOrders.length === 0) {
    return <div className="text-center py-8 text-gray-500">Cargando pedidos...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (safeOrders.length === 0 && !isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📦 Pedidos de Compra</h1>
          <button onClick={() => navigate('/purchase-orders/new')} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-1">+ Nuevo Pedido</button>
        </div>
        <div className="text-center text-gray-500 py-8">No hay pedidos registrados</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📦 Pedidos de Compra</h1>
        <button onClick={() => navigate('/purchase-orders/new')} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-1">+ Nuevo Pedido</button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="PARCIAL">Parciales</option>
            <option value="COMPLETADO">Completados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Pedido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{order.orderNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.supplierName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.totalAmount?.toLocaleString() || '0'}</td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>{statusSpanish[order.status] || order.status}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 flex-wrap">
                    {order.status === 'PENDIENTE' && (<button onClick={() => navigate(`/purchase-orders/${order.id}/delivery`)} className="text-blue-600 hover:text-blue-800 text-sm" title="Recibir mercadería">📦 Recibir</button>)}
                    {order.status === 'PARCIAL' && (<button onClick={() => navigate(`/purchase-orders/${order.id}/delivery?continue=true`)} className="text-blue-600 hover:text-blue-800 text-sm" title="Continuar recepción">📦 Continuar Recepción</button>)}
                    {(order.status === 'PENDIENTE' || order.status === 'PARCIAL') && (<button onClick={() => navigate(`/purchase-orders/${order.id}/edit`)} className="text-yellow-600 hover:text-yellow-800 text-sm">Editar</button>)}
                    {order.status === 'PENDIENTE' && (<button onClick={() => handleCancel(order.id, order.orderNumber)} className="text-orange-600 hover:text-orange-800 text-sm">Cancelar</button>)}
                    {order.status === 'PENDIENTE' && (<button onClick={() => handleDelete(order.id, order.orderNumber)} className="text-red-600 hover:text-red-800 text-sm">Eliminar</button>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-8">No hay pedidos que coincidan con el filtro</div>
      )}
    </div>
  );
};

export default PurchaseOrderList;