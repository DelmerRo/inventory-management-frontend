// pages/ProductDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { inventoryApi } from '../api/inventory';
import type { InventoryMovement } from '../api/inventory';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedProduct, fetchProductById, isLoading, error, updateStock } = useProductStore();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'suppliers'>('details');
  
  // Estado para el modal de stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState<'add' | 'remove'>('add');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductById(parseInt(id));
      loadProductHistory(parseInt(id));
      loadProductStatistics(parseInt(id));
    }
  }, [id]);

  const loadProductHistory = async (productId: number) => {
    setLoadingHistory(true);
    try {
      const history = await inventoryApi.getProductHistory(productId);
      setMovements(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadProductStatistics = async (productId: number) => {
    try {
      const stats = await inventoryApi.getProductStatistics(productId);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleStockAction = async () => {
    if (!selectedProduct) return;
    
    if (stockQuantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    
    if (!stockReason.trim()) {
      alert('Debe ingresar un motivo');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateStock(
        selectedProduct.id,
        stockQuantity,
        stockAction === 'add',
        stockReason,
        'admin' // Puedes obtener el usuario del contexto de autenticación
      );
      
      // Recargar datos
      await fetchProductById(selectedProduct.id);
      await loadProductHistory(selectedProduct.id);
      await loadProductStatistics(selectedProduct.id);
      
      // Cerrar modal y resetear
      setShowStockModal(false);
      setStockQuantity(1);
      setStockReason('');
      
      alert(stockAction === 'add' ? 'Stock agregado exitosamente' : 'Stock removido exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al modificar stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStockModal = (action: 'add' | 'remove') => {
    setStockAction(action);
    setStockQuantity(1);
    setStockReason('');
    setShowStockModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'ENTRADA':
        return 'text-green-600 bg-green-100';
      case 'SALIDA':
        return 'text-red-600 bg-red-100';
      case 'AJUSTE':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'ENTRADA':
        return '📥';
      case 'SALIDA':
        return '📤';
      case 'AJUSTE':
        return '⚙️';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando producto...</div>
      </div>
    );
  }

  if (error || !selectedProduct) {
    return (
      <div className="p-4">
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error || 'Producto no encontrado'}
        </div>
        <button
          onClick={() => navigate('/products')}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          ← Volver a productos
        </button>
      </div>
    );
  }

  const product = selectedProduct;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/products')}
            className="text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Volver a productos
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500 font-mono text-sm">SKU: {product.sku}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/products/${product.id}/edit`)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition"
          >
            ✏️ Editar producto
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Detalles del producto
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'suppliers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏭 Proveedores ({product.suppliers?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Historial de inventario ({movements.length})
          </button>
        </nav>
      </div>

      {/* Tab: Detalles del producto */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información general */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Información general</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-sm">Nombre</label>
                  <p className="font-medium">{product.name}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">SKU</label>
                  <p className="font-mono font-medium">{product.sku}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Estado</label>
                  <p>
                    {product.active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-sm">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Inactivo
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Subcategoría</label>
                  <p>{product.subcategory?.name} ({product.subcategory?.categoryName})</p>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-500 text-sm">Descripción</label>
                  <p className="text-gray-700">{product.description || 'Sin descripción'}</p>
                </div>
              </div>
            </div>

            {/* Precios y dimensiones */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Precios y dimensiones</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-gray-500 text-sm">Precio de costo</label>
                  <p className="font-bold text-gray-700">{formatCurrency(product.costPrice || 0)}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Precio de venta</label>
                  <p className="font-bold text-blue-600">{formatCurrency(product.salePrice || 0)}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Margen</label>
                  <p className="font-medium text-green-600">
                    {product.marginPercentage?.toFixed(2)}% ({formatCurrency(product.margin || 0)})
                  </p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Volumen</label>
                  <p>{product.volume?.toFixed(2)} cm³</p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Peso</label>
                  <p>{product.weight || 0} kg</p>
                </div>
                <div>
                  <label className="text-gray-500 text-sm">Dimensiones</label>
                  <p>{product.length} cm x {product.width} cm x {product.height} {product.measureUnit}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock y estadísticas rápidas */}
          <div className="space-y-6">
            {/* Tarjeta de Stock con botones */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {product.currentStock}
                </div>
                <div className="text-gray-500 mb-3">unidades en stock</div>
                
                {product.hasStock ? (
                  <div className="mb-3 text-sm text-green-600">✅ Stock disponible</div>
                ) : (
                  <div className="mb-3 text-sm text-red-600">❌ Sin stock</div>
                )}
                {product.lowStock && product.currentStock > 0 && (
                  <div className="mb-3 text-sm text-yellow-600">⚠️ Stock bajo (menos de 10)</div>
                )}
                
                {/* Botones de gestión de stock */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => openStockModal('add')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition font-medium"
                  >
                    + Agregar stock
                  </button>
                  <button
                    onClick={() => openStockModal('remove')}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition font-medium"
                  >
                    - Remover stock
                  </button>
                </div>
              </div>
            </div>

            {statistics && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-3">Estadísticas de movimientos</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total entradas:</span>
                    <span className="font-medium text-green-600">{statistics.totalEntries || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total salidas:</span>
                    <span className="font-medium text-red-600">{statistics.totalExits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Movimiento neto:</span>
                    <span className="font-medium text-blue-600">{statistics.netMovement || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total movimientos:</span>
                    <span className="font-medium">{statistics.movementCount || 0}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-3">Fechas importantes</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Creado:</span>
                  <span>{formatDate(product.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Última actualización:</span>
                  <span>{formatDate(product.updatedAt)}</span>
                </div>
                {product.lastPurchaseAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Última compra:</span>
                    <span>{formatDate(product.lastPurchaseAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Proveedores */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {product.suppliers?.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {supplier.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {supplier.supplierSku || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {supplier.isPrimary ? (
                        <span className="text-green-600 font-medium">✓ Principal</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {supplier.notes || '—'}
                    </td>
                  </tr>
                ))}
                {(!product.suppliers || product.suppliers.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No hay proveedores asociados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Historial de inventario */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">Cargando historial...</div>
          ) : movements.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No hay movimientos de inventario registrados para este producto
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo unitario</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(movement.movementDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movementType)}`}>
                            {getMovementTypeIcon(movement.movementType)} {movement.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                          <span className={movement.movementType === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}>
                            {movement.movementType === 'ENTRADA' ? '+' : '-'}{movement.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 whitespace-nowrap">
                          {movement.unitCost ? formatCurrency(movement.unitCost) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                          {movement.totalValue ? formatCurrency(movement.totalValue) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {movement.reason || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {movement.registeredBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para gestión de stock */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {stockAction === 'add' ? '➕ Agregar stock' : '➖ Remover stock'}
              </h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Producto
                </label>
                <p className="text-gray-900 font-medium">{product.name}</p>
                <p className="text-gray-500 text-sm">Stock actual: {product.currentStock} unidades</p>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Motivo
                </label>
                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder={stockAction === 'add' ? 'Ej: Compra a proveedor, Ajuste de inventario...' : 'Ej: Venta, Producto dañado, Muestra...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStockAction}
                  disabled={isSubmitting || stockQuantity <= 0 || !stockReason.trim()}
                  className={`flex-1 px-4 py-2 rounded-md text-white transition ${
                    stockAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'Procesando...' : stockAction === 'add' ? 'Agregar' : 'Remover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;