// pages/ProductList.tsx - Versión corregida
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

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // ✅ Debounce para evitar muchas peticiones mientras el usuario escribe
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms es más responsive
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Convertir filtros a parámetros para el backend
  const getActiveParam = (): boolean | null => {
    if (activeFilter === 'active') return true;
    if (activeFilter === 'inactive') return false;
    return null;
  };

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    console.log('📦 ProductList montado - Cargando datos iniciales...');
    fetchAllData();
  }, []);

  // Cargar productos cuando cambian los filtros o la paginación
  useEffect(() => {
  const loadProducts = async () => {
    const searchValue = debouncedSearchTerm && debouncedSearchTerm.trim().length > 0
      ? debouncedSearchTerm.trim()
      : null;

    // 💡 Traducimos el filtro semántico del Front a los parámetros numéricos del Back
    let minStockParam: number | null = null;
    let maxStockParam: number | null = null;

    if (stockFilter === 'low') {
      minStockParam = 10; // Tu service de Java mapea el 10 como "entre 1 y 9 unidades"
    } else if (stockFilter === 'out') {
      minStockParam = 0;  // Tu service de Java mapea el 0 como "máximo 0 unidades"
    }

    await fetchProductsPaged({
      name: searchValue,
      sku: null,
      supplierSku: supplierSku?.trim() || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      supplierId: supplierId || null,
      active: getActiveParam(),
      
      // ✅ Pasamos los parámetros correctos calculados que tu Java está esperando
      minStock: minStockParam,
      maxStock: maxStockParam,
      
      page,
      size: pageSize,
      sortField,
      sortDirection: sortOrder
    });
  };

  loadProducts();
}, [
  debouncedSearchTerm,
  supplierSku,
  categoryId,
  subcategoryId,
  supplierId,
  minPrice,
  maxPrice,
  stockFilter, // Mantenemos la escucha reactiva al cambio de stock
  activeFilter,
  page,
  pageSize,
  sortField,
  sortOrder
]);

  // Debug: Mostrar estado actual
  useEffect(() => {
    if (pagedProducts) {
      console.log('📊 Resultados:', {
        total: pagedProducts.totalElements,
        busqueda: debouncedSearchTerm,
        productos: pagedProducts.content?.length
      });
    }
  }, [pagedProducts, debouncedSearchTerm]);

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
    <div className="p-4">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">📦 Productos</h1>
        <button
          onClick={() => navigate('/products/new')}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-1"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Debug: Mostrar si hay categorías */}
      {categories.length === 0 && !isLoading && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
          ⚠️ No se cargaron categorías. Verifica que el backend esté respondiendo en /api/categories
        </div>
      )}

      {/* Debug: Mostrar si hay proveedores */}
      {suppliers.length === 0 && !isLoading && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
          ⚠️ No se cargaron proveedores. Verifica que el backend esté respondiendo en /api/suppliers/summary
        </div>
      )}
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          {/* Cambiado de pagedProducts?.activeProducts a activeCount */}
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-xs text-gray-500">Activos</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          {/* Cambiado de pagedProducts?.inactiveProducts a inactiveCount */}
          <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          <div className="text-xs text-gray-500">Inactivos</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
          <div className="text-xs text-gray-500">Stock Bajo</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          <div className="text-xs text-gray-500">Sin Stock</div>
        </div>
      </div>

      {/* Filtros */}
      <ProductFilters />

      {/* Resultados con paginación */}
      <div className="mb-4 text-sm text-gray-500 flex justify-between items-center flex-wrap gap-2">
        <span>Mostrando {pagedProducts?.content?.length || 0} de {pagedProducts?.totalElements || 0} productos</span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 border rounded-md text-sm"
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
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          ❌ {error}
        </div>
      )}

      <div className="space-y-2">
        {pagedProducts?.content?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {(!pagedProducts?.content || pagedProducts.content.length === 0) && !isLoading && (
        <div className="text-center text-gray-500 py-8">
          No se encontraron productos con los filtros seleccionados
        </div>
      )}

      {/* Paginación inferior */}
      {pagedProducts && pagedProducts.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-1">
          <button
            onClick={previousPage}
            disabled={!pagedProducts.hasPrevious}
            className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 transition"
          >
            Anterior
          </button>
          <span className="px-4 py-1 text-sm">
            Página {pagedProducts.currentPage + 1} de {pagedProducts.totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={!pagedProducts.hasNext}
            className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-100 transition"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;