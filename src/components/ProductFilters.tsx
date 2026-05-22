// components/ProductFilters.tsx
import React, { useEffect, useState } from 'react';
import { useFilterStore } from '../store/filterStore';
import { useProductStore } from '../store/productStore';

const ProductFilters: React.FC = () => {
  const {
    categoryId,
    subcategoryId,
    supplierId,
    supplierSku,
    minPrice,
    maxPrice,
    stockFilter,
    activeFilter,
    sortField,
    sortOrder,
    searchTerm,
    setCategoryId,
    setSubcategoryId,
    setSupplierId,
    setSupplierSku,
    setMinPrice,
    setMaxPrice,
    setStockFilter,
    setActiveFilter,
    setSortField,
    setSortOrder,
    setSearchTerm,
    resetFilters
  } = useFilterStore();

  const { categories, suppliers } = useProductStore();
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Actualizar subcategorías disponibles cuando cambia la categoría
  useEffect(() => {
    if (categoryId) {
      const category = categories.find(cat => cat.id === categoryId);
      if (category && category.subcategories) {
        console.log(`📂 Subcategorías para categoría ${categoryId}:`, category.subcategories.length);
        setAvailableSubcategories(category.subcategories);
        
        // ✅ NO auto-seleccionar subcategoría - permitir ver TODOS los productos de la categoría
        // Solo resetear subcategoría si la categoría cambió
        if (subcategoryId) {
          // Verificar si la subcategoría actual pertenece a la nueva categoría
          const subcategoryExists = category.subcategories.some(sub => sub.id === subcategoryId);
          if (!subcategoryExists) {
            setSubcategoryId(null);
          }
        }
      } else {
        setAvailableSubcategories([]);
        setSubcategoryId(null);
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [categoryId, categories]);

  // Manejar cambio de categoría
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = e.target.value ? parseInt(e.target.value) : null;
    setCategoryId(newCategoryId);
    
    // ✅ Resetear subcategoría cuando cambia la categoría
    setSubcategoryId(null);
  };

  const activeFiltersCount = [
    searchTerm ? 1 : 0,
    categoryId ? 1 : 0,
    subcategoryId ? 1 : 0,
    supplierId ? 1 : 0,
    supplierSku ? 1 : 0,
    minPrice !== null ? 1 : 0,
    maxPrice !== null ? 1 : 0,
    stockFilter !== 'all' ? 1 : 0,
    activeFilter !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      {/* Barra de búsqueda siempre visible */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">🔎 Buscar producto</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o SKU (ej: Laptop, Teclado, LIV-DOR-00001)..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <p className="text-xs text-gray-400 mt-1">
          🔍 Búsqueda inteligente: no distingue mayúsculas/minúsculas. Busca por nombre o SKU.
        </p>
      </div>

      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full flex justify-between items-center text-left pt-2 border-t border-gray-200"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-800">⚙️ Filtros avanzados</span>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <span className="text-gray-500">{showFilters ? '▲' : '▼'}</span>
      </button>

      {showFilters && (
        <div className="mt-4 space-y-4">
          {/* Ordenamiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Ordenar por</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="name">Nombre</option>
                <option value="salePrice">Precio</option>
                <option value="currentStock">Stock</option>
                <option value="createdAt">Fecha de creación</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Dirección</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="asc">Ascendente (A-Z, menor a mayor, más antiguo)</option>
                <option value="desc">Descendente (Z-A, mayor a menor, más reciente)</option>
              </select>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Categoría */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Categoría</label>
              <select
                value={categoryId || ''}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-red-500 mt-1">⚠️ No hay categorías disponibles</p>
              )}
              {categoryId && (
                <p className="text-xs text-green-500 mt-1">
                  ✅ Mostrando todos los productos de esta categoría
                </p>
              )}
            </div>

            {/* Subcategoría - Opcional */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Subcategoría (Opcional)
              </label>
              <select
                value={subcategoryId || ''}
                onChange={(e) => setSubcategoryId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!categoryId || availableSubcategories.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {categoryId && availableSubcategories.length > 0 
                    ? "Todas las subcategorías" 
                    : categoryId 
                      ? "No hay subcategorías disponibles" 
                      : "Primero selecciona una categoría"}
                </option>
                {availableSubcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              {categoryId && availableSubcategories.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  💡 Deja en "Todas las subcategorías" para ver toda la categoría
                </p>
              )}
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Proveedor</label>
              <select
                value={supplierId || ''}
                onChange={(e) => setSupplierId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Todos los proveedores</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-xs text-red-500 mt-1">⚠️ No hay proveedores disponibles</p>
              )}
            </div>

            {/* SKU del Proveedor */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                SKU del Proveedor
              </label>
              <input
                type="text"
                value={supplierSku}
                onChange={(e) => setSupplierSku(e.target.value)}
                placeholder="Buscar por SKU del proveedor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                Busca productos por el SKU que usa el proveedor
              </p>
            </div>

            {/* Precio mínimo */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Precio mínimo ($)</label>
              <input
                type="number"
                value={minPrice === null ? '' : minPrice}
                onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                step="0.01"
                min="0"
              />
            </div>

            {/* Precio máximo */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Precio máximo ($)</label>
              <input
                type="number"
                value={maxPrice === null ? '' : maxPrice}
                onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Sin límite"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                step="0.01"
                min="0"
              />
            </div>

            {/* Estado del producto */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Estado</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">Todos</option>
                <option value="active">✅ Solo activos</option>
                <option value="inactive">⛔ Solo inactivos</option>
              </select>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Estado de stock</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">Todos</option>
                <option value="low">📦 Stock bajo (&lt; 10 unidades)</option>
                <option value="out">❌ Sin stock</option>
              </select>
            </div>
          </div>

          {/* Reset */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <div className="text-sm text-gray-400">
              {activeFiltersCount} filtro(s) activo(s)
            </div>
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              🔄 Limpiar todos los filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;