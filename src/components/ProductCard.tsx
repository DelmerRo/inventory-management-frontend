// components/ProductCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductSummary } from '../types/product';
import { useProductStore } from '../store/productStore';

interface ProductCardProps {
  product: ProductSummary;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { toggleProductStatus } = useProductStore();

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/products/${product.id}/edit`);
  };

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const action = product.active ? 'desactivar' : 'reactivar';
    if (confirm(`¿${action === 'desactivar' ? 'Desactivar' : 'Reactivar'} producto "${product.name}"?`)) {
      await toggleProductStatus(product.id);
    }
  };

  const handleViewDetail = () => {
    navigate(`/products/${product.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStockColor = () => {
    if (product.currentStock === 0) return 'text-red-600';
    if (product.currentStock < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockBgColor = () => {
    if (product.currentStock === 0) return 'bg-red-100';
    if (product.currentStock < 10) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div
      onClick={handleViewDetail}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-blue-400 group"
    >
      <div className="flex items-center justify-between p-3 gap-3">
        {/* Columna 1: Info básica (nombre + SKU + estado) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition text-sm">
              {product.name}
            </h3>
            <span className="text-xs text-gray-400 font-mono shrink-0">
              {product.sku}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {product.active ? (
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
              📁 {product.subcategoryName}
            </span>
          </div>
        </div>

        {/* Columna 2: Precios (venta + costo) */}
        <div className="text-right min-w-[100px]">
          <div className="font-bold text-blue-600 text-sm">
            ${product.salePrice?.toLocaleString() || '0'}
          </div>
          {product.costPrice && product.costPrice > 0 && (
            <div className="text-xs text-gray-400">
              Costo: ${product.costPrice.toLocaleString()}
            </div>
          )}
        </div>

        {/* Columna 3: Stock */}
        <div className={`text-center min-w-[70px] px-2 py-1 rounded-full ${getStockBgColor()}`}>
          <div className={`font-semibold text-sm ${getStockColor()}`}>
            {product.currentStock}
          </div>
          <div className="text-xs text-gray-500">unidades</div>
        </div>

        {/* Columna 4: Proveedor principal */}
        <div className="min-w-[120px]">
          <div className="text-sm text-gray-700 truncate" title={product.primarySupplierName || 'Sin proveedor'}>
            🏭 {product.primarySupplierName || '—'}
          </div>
          {product.suppliersCount > 1 && (
            <div className="text-xs text-blue-500">
              +{product.suppliersCount - 1} más
            </div>
          )}
        </div>

        {/* Columna 5: Fecha de creación */}
        <div className="min-w-[85px] text-right">
          <div className="text-sm text-gray-600">
            📅 {formatDate(product.createdAt)}
          </div>
          <div className="text-xs text-gray-400">creado</div>
        </div>

        {/* Columna 6: Acciones */}
        <div className="flex gap-1 shrink-0">
          {/* Botón Editar - siempre visible */}
          <button
            onClick={handleEdit}
            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition"
            title="Editar producto"
          >
            ✏️
          </button>
          
          {/* Botón de Estado - cambia según active/inactive */}
          {product.active ? (
            <button
              onClick={handleStatusToggle}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
              title="Desactivar producto"
            >
              🗑️
            </button>
          ) : (
            <button
              onClick={handleStatusToggle}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
              title="Reactivar producto"
            >
              🔄
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;