// pages/ProductList.tsx
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { useFilterStore } from '../store/filterStore';
import type { ProductSummary } from '../types/product';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';

const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const { products, categories, suppliers, isLoading, error, fetchAllData } = useProductStore();
  const {
    categoryId,
    subcategoryId,
    supplierId,
    minPrice,
    maxPrice,
    stockFilter,
    searchTerm,
    sortField,
    sortOrder
  } = useFilterStore();

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Mapear subcategoría a categoría
  const getProductCategoryId = (product: ProductSummary): number | null => {
    for (const cat of categories) {
      const subcat = cat.subcategories.find(s => s.name === product.subcategoryName);
      if (subcat) return cat.id;
    }
    return null;
  };

  // Obtener ID de subcategoría por nombre
  const getSubcategoryIdByName = (subcategoryName: string): number | null => {
    for (const cat of categories) {
      const subcat = cat.subcategories.find(s => s.name === subcategoryName);
      if (subcat) return subcat.id;
    }
    return null;
  };

  // Aplicar filtros
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Búsqueda por nombre o SKU
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoría
    if (categoryId) {
      filtered = filtered.filter(product => {
        const productCategoryId = getProductCategoryId(product);
        return productCategoryId === categoryId;
      });
    }

    // Filtro por subcategoría
    if (subcategoryId) {
      filtered = filtered.filter(product => {
        const productSubcategoryId = getSubcategoryIdByName(product.subcategoryName);
        return productSubcategoryId === subcategoryId;
      });
    }

    // Filtro por proveedor
    if (supplierId) {
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      if (selectedSupplier) {
        filtered = filtered.filter(product =>
          product.primarySupplierName === selectedSupplier.name
        );
      }
    }

    // Filtro por precio
    if (minPrice !== null && minPrice > 0) {
      filtered = filtered.filter(product => product.salePrice >= minPrice);
    }
    if (maxPrice !== null && maxPrice > 0) {
      filtered = filtered.filter(product => product.salePrice <= maxPrice);
    }

    // Filtro por stock
    if (stockFilter === 'low') {
      filtered = filtered.filter(product => product.currentStock < 10 && product.currentStock > 0);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(product => product.currentStock === 0);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'salePrice':
          comparison = a.salePrice - b.salePrice;
          break;
        case 'currentStock':
          comparison = a.currentStock - b.currentStock;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchTerm, categoryId, subcategoryId, supplierId, minPrice, maxPrice,
    stockFilter, sortField, sortOrder, categories, suppliers]);

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.currentStock < 10 && p.currentStock > 0).length;
  const outOfStockCount = products.filter(p => p.currentStock === 0).length;
  const activeCount = products.filter(p => p.active).length;
  const inactiveCount = products.filter(p => !p.active).length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando productos...</div>
      </div>
    );
  }

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

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
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

      {/* Resultados */}
      <div className="mb-4 text-sm text-gray-500">
        Mostrando {filteredProducts.length} de {totalProducts} productos
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Lista de productos - Una card por fila */}
      <div className="space-y-2">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-8">
          No se encontraron productos con los filtros seleccionados
        </div>
      )}
    </div>
  );
};

export default ProductList;