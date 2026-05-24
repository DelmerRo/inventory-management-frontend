// components/ProductCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductSummary } from '../types/product';
import { useProductStore } from '../store/productStore';

interface ProductCardProps {
  product: ProductSummary;
  onCopySku?: (sku: string, productId: number, e: React.MouseEvent) => void;
  copiedSkuId?: number | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onCopySku, copiedSkuId }) => {
  const navigate = useNavigate();
  const { toggleProductStatus } = useProductStore();
  const [imageError, setImageError] = useState(false);

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
    if (product.currentStock === 0) return 'bg-red-50';
    if (product.currentStock < 10) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const getStockIcon = () => {
    if (product.currentStock === 0) return '❌';
    if (product.currentStock < 10) return '⚠️';
    return '✅';
  };

  const isCopied = copiedSkuId === product.id;
  const marginPercentage = product.costPrice && product.salePrice > 0 
    ? ((product.salePrice - product.costPrice) / product.salePrice * 100).toFixed(0)
    : 0;

  return (
    <div
      onClick={handleViewDetail}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-300 group overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        {/* Sección de Imagen - 160px */}
        <div className="relative md:w-40 lg:w-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          {product.imageUrl && !imageError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex flex-col items-center justify-center gap-2">
              <span className="text-5xl">📦</span>
              <span className="text-xs text-gray-500">Sin imagen</span>
            </div>
          )}
          
          {/* Badge de estado en la esquina de la imagen */}
          <div className="absolute top-2 left-2">
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} shadow-sm`}>
              {product.active ? 'Activo' : 'Inactivo'}
            </div>
          </div>
        </div>

        {/* Sección de Información Principal */}
        <div className="flex-1 p-4">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition line-clamp-1">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                  <span className="text-xs text-gray-500">SKU:</span>
                  <code className="text-xs font-mono text-gray-700">{product.sku}</code>
                  {onCopySku && (
                    <button
                      onClick={(e) => onCopySku(product.sku, product.id, e)}
                      className={`ml-1 p-0.5 rounded transition ${
                        isCopied ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="Copiar SKU"
                    >
                      {isCopied ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  📁 {product.subcategoryName}
                </span>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex gap-1">
              <button
                onClick={handleEdit}
                className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                title="Editar producto"
              >
                ✏️
              </button>
              <button
                onClick={handleStatusToggle}
                className={`p-2 rounded-lg transition ${
                  product.active 
                    ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' 
                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                }`}
                title={product.active ? 'Desactivar producto' : 'Reactivar producto'}
              >
                {product.active ? '🗑️' : '🔄'}
              </button>
            </div>
          </div>

          {/* Grid de métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {/* Precio Venta */}
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 uppercase">Venta</div>
              <div className="font-bold text-blue-600 text-lg">
                ${product.salePrice?.toLocaleString() || '0'}
              </div>
              {product.costPrice > 0 && (
                <div className="text-xs text-gray-400">
                  Costo: ${product.costPrice.toLocaleString()}
                </div>
              )}
            </div>

            {/* Stock */}
            <div className={`${getStockBgColor()} rounded-lg p-2 text-center`}>
              <div className="text-xs text-gray-500 uppercase">Stock</div>
              <div className={`font-bold text-2xl ${getStockColor()}`}>
                {product.currentStock}
              </div>
              <div className="text-xs text-gray-500">{getStockIcon()} {product.currentStock === 0 ? 'Agotado' : product.currentStock < 10 ? 'Bajo' : 'Disponible'}</div>
            </div>

            {/* Margen */}
            {Number(marginPercentage) > 0 && (
              <div className="bg-purple-50 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500 uppercase">Margen</div>
                <div className="font-bold text-purple-600 text-lg">{marginPercentage}%</div>
                <div className="text-xs text-gray-400">
                  +${(product.salePrice - product.costPrice).toLocaleString()}
                </div>
              </div>
            )}

            {/* Fecha */}
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-500 uppercase">Creado</div>
              <div className="font-medium text-gray-700 text-sm">
                {formatDate(product.createdAt)}
              </div>
            </div>
          </div>

          {/* Footer con proveedor */}
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>🏭</span>
              <span className="truncate">{product.primarySupplierName || 'Sin proveedor'}</span>
              {product.suppliersCount > 1 && (
                <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  +{product.suppliersCount - 1}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 group-hover:text-blue-500 transition flex items-center gap-1">
              Ver detalles →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;