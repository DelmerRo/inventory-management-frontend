// pages/ProductList.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { useFilterStore } from '../store/filterStore';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const {
    pagedProducts,
    isLoading,
    error,
    categories,
    suppliers,
    fetchAllData,
    fetchProductsPaged
  } = useProductStore();

  const {
    categoryId,
    subcategoryId,
    supplierId,
    supplierSku,
    minPrice,
    maxPrice,
    stockFilter,
    activeFilter,
    searchTerm,
    sortField,
    sortOrder,
    page,
    pageSize,
    setPageSize,
    nextPage,
    previousPage
  } = useFilterStore();

  const [copiedSku, setCopiedSku] = useState<number | null>(null);

  const getActiveParam = (): boolean | null => {
    if (activeFilter === 'active') return true;
    if (activeFilter === 'inactive') return false;
    return null;
  };

  const copySkuToClipboard = async (sku: string, productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(productId);
      setTimeout(() => setCopiedSku(null), 2000);
    } catch (err) {
      console.error('Error al copiar SKU:', err);
    }
  };

  // 1. Cargar datos de apoyo una sola vez al montar
  useEffect(() => {
    console.log('📦 ProductList montado - Cargando datos iniciales...');
    fetchAllData();
  }, [fetchAllData]);

  // 2. Efecto que reacciona a los filtros
  useEffect(() => {
    const loadProducts = async () => {
      const isValidSearch = searchTerm && 
                            typeof searchTerm === 'string' && 
                            searchTerm.trim().length > 0 && 
                            searchTerm.trim().toLowerCase() !== 'null';

      const searchValue = isValidSearch ? searchTerm.trim() : null;

      let minStockParam: number | null = null;
      let maxStockParam: number | null = null;

      if (stockFilter === 'low') {
        minStockParam = 10;
      } else if (stockFilter === 'out') {
        minStockParam = 0;
      }

      const params: Record<string, any> = {
        page,
        size: pageSize,
        sortField,
        sortDirection: sortOrder,
        sku: null,
        supplierSku: supplierSku?.trim() || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        supplierId: supplierId || null,
        active: getActiveParam(),
        minStock: minStockParam,
        maxStock: maxStockParam
      };

      if (searchValue) {
        params.name = searchValue;
      }

      await fetchProductsPaged(params);
    };

    const timer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    searchTerm,
    supplierSku,
    categoryId,
    subcategoryId,
    supplierId,
    minPrice,
    maxPrice,
    stockFilter,
    activeFilter,
    page,
    pageSize,
    sortField,
    sortOrder,
    fetchProductsPaged
  ]);

  if (isLoading && !pagedProducts) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando productos...</div>
      </div>
    );
  }

  const totalProducts = pagedProducts?.totalElements || 0;
  const activeCount = pagedProducts?.activeProducts || 0;
  const inactiveCount = pagedProducts?.inactiveProducts || 0;
  const lowStockCount = pagedProducts?.lowStockProducts || 0;
  const outOfStockCount = pagedProducts?.outOfStockProducts || 0;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Accesos Directos */}
      <div className="flex justify-between items-center flex-wrap gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Gestión de Productos</h1>
          <p className="text-xs text-gray-500">Control maestro de catálogo e inventarios</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/products/reconciliation')}
            className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-2 text-sm shadow-sm"
          >
            🔄 Conciliación Omnicanal (CSV)
          </button>
          
          <button
            onClick={() => navigate('/products/new')}
            className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-1 text-sm shadow-sm"
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Alertas de carga inicial */}
      {categories.length === 0 && !isLoading && (
        <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
          ⚠️ No se cargaron categorías. Verifica que el backend esté respondiendo en /api/categories
        </div>
      )}

      {suppliers.length === 0 && !isLoading && (
        <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
          ⚠️ No se cargaron proveedores. Verifica que el backend esté respondiendo en /api/suppliers/summary
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
          <div className="text-xs text-gray-500 font-medium">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-xs text-gray-500 font-medium">Activos</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          <div className="text-xs text-gray-500 font-medium">Inactivos</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
          <div className="text-xs text-gray-500 font-medium">Stock Bajo</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          <div className="text-xs text-gray-500 font-medium">Sin Stock</div>
        </div>
      </div>

      {/* Filtros */}
      <ProductFilters />

      {/* Paginación Superior */}
      <div className="text-sm text-gray-500 flex justify-between items-center flex-wrap gap-2">
        <span>Mostrando {pagedProducts?.content?.length || 0} de {pagedProducts?.totalElements || 0} productos</span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 border rounded-md text-sm bg-white"
          >
            <option value="10">10 por página</option>
            <option value="15">15 por página</option>
            <option value="20">20 por página</option>
            <option value="50">50 por página</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={previousPage}
              disabled={!pagedProducts?.hasPrevious}
              className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 transition"
            >
              ◀
            </button>
            <span className="px-3 py-1 text-sm">
              Página {(pagedProducts?.currentPage || 0) + 1} de {pagedProducts?.totalPages || 1}
            </span>
            <button
              onClick={nextPage}
              disabled={!pagedProducts?.hasNext}
              className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 transition"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          ❌ {error}
        </div>
      )}

      {/* Listado de Productos */}
      <div className="space-y-2">
        {pagedProducts?.content?.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product}
            onCopySku={copySkuToClipboard}
            copiedSkuId={copiedSku}
          />
        ))}
      </div>

      {(!pagedProducts?.content || pagedProducts.content.length === 0) && !isLoading && (
        <div className="text-center text-gray-500 py-12 bg-white rounded-lg border border-dashed border-gray-300">
          No se encontraron productos con los filtros seleccionados
        </div>
      )}

      {/* Paginación Inferior */}
      {pagedProducts && pagedProducts.totalPages > 1 && (
        <div className="pt-4 flex justify-center gap-1">
          <button
            onClick={previousPage}
            disabled={!pagedProducts.hasPrevious}
            className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 transition text-sm"
          >
            Anterior
          </button>
          <span className="px-4 py-1 text-sm">
            Página {pagedProducts.currentPage + 1} de {pagedProducts.totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={!pagedProducts.hasNext}
            className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 transition text-sm"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;