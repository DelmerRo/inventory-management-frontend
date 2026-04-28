// pages/ProductForm.tsx - CORREGIDO
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { categoryApi } from '../api/categories';
import { supplierApi } from '../api/suppliers';
import type { Category, Subcategory } from '../api/categories';
import type { SupplierSummary } from '../api/suppliers';
import type { ProductRequest, SupplierAssociationDTO } from '../types/product';
import MarkdownEditor from '../components/MarkdownEditor';
import { useNumberFormat } from '../hooks/useNumberFormat';

const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedProduct, fetchProductById, createProduct, updateProduct, isLoading } = useProductStore();
  const isEditMode = !!id && id !== 'new';

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(1);
  const [availableSubcategories, setAvailableSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);

  const costPriceFormat = useNumberFormat(0);
  const salePriceFormat = useNumberFormat(0);
  const currentStockFormat = useNumberFormat(0);
  const weightFormat = useNumberFormat(0);
  const lengthFormat = useNumberFormat(0);
  const widthFormat = useNumberFormat(0);
  const heightFormat = useNumberFormat(0);

  const [formData, setFormData] = useState<ProductRequest>({
    name: '',
    description: '',
    costPrice: 0,
    salePrice: 0,
    currentStock: 0,
    subcategoryId: 1,
    suppliers: [],
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    measureUnit: 'cm'
  });

  const [newSupplier, setNewSupplier] = useState<SupplierAssociationDTO>({
    supplierId: 1,
    supplierSku: '',
    isPrimary: false,
    notes: ''
  });

  // Cargar categorías y proveedores al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, sups] = await Promise.all([
          categoryApi.getAll(),
          supplierApi.getAllSummary()
        ]);
        setCategories(cats);
        setSuppliers(sups);
        if (cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
          setAvailableSubcategories(cats[0].subcategories);
          setFormData(prev => ({ ...prev, subcategoryId: cats[0].subcategories[0]?.id || 1 }));
        }
        if (sups.length > 0) {
          setNewSupplier(prev => ({ ...prev, supplierId: sups[0].id }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Cargar producto si es edición
  useEffect(() => {
    if (isEditMode && id) {
      fetchProductById(parseInt(id));
    }
  }, [isEditMode, id]);

  // ✅ Cargar datos del producto seleccionado - CORREGIDO CON GUARDAS
  useEffect(() => {
    if (isEditMode && selectedProduct) {
      console.log('=== Producto cargado para edición ===', selectedProduct);
      
      setFormData({
        name: selectedProduct.name,
        description: selectedProduct.description || '',
        costPrice: selectedProduct.costPrice,
        salePrice: selectedProduct.salePrice,
        currentStock: selectedProduct.currentStock,
        // ✅ Guarda: si no tiene subcategoría, usar 1
        subcategoryId: selectedProduct.subcategory?.id || 1,
        suppliers: selectedProduct.suppliers?.map(s => ({
          supplierId: s.supplierId,
          supplierSku: s.supplierSku || '',
          isPrimary: s.isPrimary || false,
          notes: s.notes || undefined
        })) || [],
        weight: selectedProduct.weight,
        length: selectedProduct.length,
        width: selectedProduct.width,
        height: selectedProduct.height,
        measureUnit: selectedProduct.measureUnit || 'cm'
      });

      costPriceFormat.setFormattedValue(selectedProduct.costPrice);
      salePriceFormat.setFormattedValue(selectedProduct.salePrice);
      weightFormat.setFormattedValue(selectedProduct.weight || 0);
      lengthFormat.setFormattedValue(selectedProduct.length || 0);
      widthFormat.setFormattedValue(selectedProduct.width || 0);
      heightFormat.setFormattedValue(selectedProduct.height || 0);

      // ✅ Guarda: verificar que subcategory existe antes de buscar la categoría
      if (selectedProduct.subcategory && selectedProduct.subcategory.id) {
        const category = categories.find(cat =>
          cat.subcategories.some(sub => sub.id === selectedProduct.subcategory.id)
        );
        if (category) {
          setSelectedCategoryId(category.id);
          setAvailableSubcategories(category.subcategories);
        }
      } else {
        // Si no tiene subcategoría, usar la primera disponible
        if (categories.length > 0 && categories[0].subcategories.length > 0) {
          setSelectedCategoryId(categories[0].id);
          setAvailableSubcategories(categories[0].subcategories);
          setFormData(prev => ({ ...prev, subcategoryId: categories[0].subcategories[0].id }));
        }
      }
    }
  }, [selectedProduct, isEditMode, categories]);

  // Sincronizar formData
  useEffect(() => {
    setFormData(prev => ({ ...prev, costPrice: costPriceFormat.value }));
  }, [costPriceFormat.value]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, salePrice: salePriceFormat.value }));
  }, [salePriceFormat.value]);

  useEffect(() => {
    if (!isEditMode) {
      setFormData(prev => ({ ...prev, currentStock: currentStockFormat.value }));
    }
  }, [currentStockFormat.value, isEditMode]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, weight: weightFormat.value }));
  }, [weightFormat.value]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, length: lengthFormat.value }));
  }, [lengthFormat.value]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, width: widthFormat.value }));
  }, [widthFormat.value]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, height: heightFormat.value }));
  }, [heightFormat.value]);

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      setAvailableSubcategories(category.subcategories);
      if (category.subcategories.length > 0) {
        setFormData(prev => ({ ...prev, subcategoryId: category.subcategories[0].id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.suppliers.length === 0) {
      alert('Debe agregar al menos un proveedor');
      return;
    }
    if (!formData.suppliers.some(s => s.isPrimary)) {
      alert('Debe seleccionar un proveedor como principal');
      return;
    }

    let payload = { ...formData };
    if (isEditMode) {
      const { currentStock, ...rest } = payload;
      payload = rest;
    }

    if (isEditMode && id) {
      await updateProduct(parseInt(id), payload);
    } else {
      await createProduct(payload);
    }
    navigate('/products');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'subcategoryId') {
      setFormData(prev => ({ ...prev, subcategoryId: parseInt(value) || 1 }));
    } else if (name === 'name') {
      setFormData(prev => ({ ...prev, name: value }));
    } else if (name === 'measureUnit') {
      setFormData(prev => ({ ...prev, measureUnit: value }));
    }
  };

  const handleMarkdownChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
  };

  const addSupplier = () => {
    if (!newSupplier.supplierId) return;

    const supplierExists = formData.suppliers.some(s => s.supplierId === newSupplier.supplierId);
    if (supplierExists) {
      alert('Este proveedor ya está asociado al producto');
      return;
    }

    setFormData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, { ...newSupplier }]
    }));

    setNewSupplier({
      supplierId: suppliers[0]?.id || 1,
      supplierSku: '',
      isPrimary: false,
      notes: ''
    });
  };

  const removeSupplier = (supplierId: number) => {
    const supplierToRemove = formData.suppliers.find(s => s.supplierId === supplierId);
    if (supplierToRemove?.isPrimary && formData.suppliers.length === 1) {
      alert('No se puede eliminar el único proveedor del producto');
      return;
    }

    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.supplierId !== supplierId)
    }));
  };

  const setPrimarySupplier = (supplierId: number) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => ({
        ...s,
        isPrimary: s.supplierId === supplierId
      }))
    }));
  };

  const updateSupplierSku = (supplierId: number, supplierSku: string) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s =>
        s.supplierId === supplierId ? { ...s, supplierSku } : s
      )
    }));
  };

  const estimatedProfit = formData.salePrice - formData.costPrice;
  const estimatedMargin = formData.salePrice > 0
    ? (estimatedProfit / formData.salePrice * 100).toFixed(1)
    : 0;

  if ((isLoading || isLoadingData) && isEditMode) {
    return <div className="text-center py-8 text-gray-500">Cargando producto...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        {/* Información Básica */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Nombre *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleTextChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            {!isEditMode && (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Stock Inicial *
                </label>
                <input
                  type="text"
                  value={currentStockFormat.displayValue}
                  onChange={currentStockFormat.handleChange}
                  onBlur={currentStockFormat.handleBlur}
                  onFocus={currentStockFormat.handleFocus}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Stock inicial al crear el producto
                </p>
              </div>
            )}

            {isEditMode && selectedProduct && (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Stock Actual
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-600">
                  {selectedProduct.currentStock} unidades
                </div>
                <p className="text-xs text-blue-500 mt-1">
                  💡 Para modificar el stock, ve a la pantalla de detalle del producto
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Categoría */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Categoría</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Categoría
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Subcategoría *
              </label>
              <select
                name="subcategoryId"
                value={formData.subcategoryId}
                onChange={handleTextChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              >
                {availableSubcategories.length > 0 ? (
                  availableSubcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))
                ) : (
                  <option value={formData.subcategoryId}>Cargando subcategorías...</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Precios */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💰 Precios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Precio Costo
              </label>
              <input
                type="text"
                value={costPriceFormat.displayValue}
                onChange={costPriceFormat.handleChange}
                onBlur={costPriceFormat.handleBlur}
                onFocus={costPriceFormat.handleFocus}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Precio Venta *
              </label>
              <input
                type="text"
                value={salePriceFormat.displayValue}
                onChange={salePriceFormat.handleChange}
                onBlur={salePriceFormat.handleBlur}
                onFocus={salePriceFormat.handleFocus}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-right"
                required
              />
            </div>
          </div>

          {formData.costPrice > 0 && formData.salePrice > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ganancia por unidad:</span>
                <span className="font-bold text-green-600">
                  ${(formData.salePrice - formData.costPrice).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Margen de ganancia:</span>
                <span className="font-bold text-blue-600">{estimatedMargin}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Proveedores */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <button
            type="button"
            onClick={() => setShowSuppliers(!showSuppliers)}
            className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 w-full text-left"
          >
            {showSuppliers ? '▼' : '▶'} 🏭 Proveedores ({formData.suppliers.length})
          </button>

          {showSuppliers && (
            <div>
              {formData.suppliers.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="font-medium text-gray-700">Proveedores asociados:</h3>
                  {formData.suppliers.map(supplier => {
                    const supplierInfo = suppliers.find(s => s.id === supplier.supplierId);
                    return (
                      <div key={supplier.supplierId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <input
                          type="radio"
                          name="primarySupplier"
                          checked={supplier.isPrimary === true}
                          onChange={() => setPrimarySupplier(supplier.supplierId)}
                          className="mr-2"
                        />
                        <span className="flex-1 font-medium">{supplierInfo?.name || supplier.supplierId}</span>
                        <input
                          type="text"
                          value={supplier.supplierSku || ''}
                          onChange={(e) => updateSupplierSku(supplier.supplierId, e.target.value)}
                          placeholder="SKU del proveedor"
                          className="px-2 py-1 border rounded text-sm w-32"
                        />
                        <button
                          type="button"
                          onClick={() => removeSupplier(supplier.supplierId)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          disabled={supplier.isPrimary && formData.suppliers.length === 1}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Agregar proveedor:</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={newSupplier.supplierId}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, supplierId: parseInt(e.target.value) }))}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSupplier.supplierSku || ''}
                    onChange={(e) => setNewSupplier(prev => ({ ...prev, supplierSku: e.target.value }))}
                    placeholder="SKU del proveedor"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newSupplier.isPrimary}
                      onChange={(e) => setNewSupplier(prev => ({ ...prev, isPrimary: e.target.checked }))}
                    />
                    Principal
                  </label>
                  <button
                    type="button"
                    onClick={addSupplier}
                    className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600"
                  >
                    + Agregar
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  * Debe haber al menos un proveedor y uno debe ser principal
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📝 Descripción</h2>
          <MarkdownEditor
            value={formData.description}
            onChange={handleMarkdownChange}
            placeholder="Describe tu producto..."
          />
        </div>

        {/* Dimensiones y peso */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {showAdvanced ? '▼' : '▶'} {showAdvanced ? 'Ocultar' : 'Mostrar'} dimensiones y peso
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Peso (kg)</label>
                <input
                  type="text"
                  value={weightFormat.displayValue}
                  onChange={weightFormat.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Profundidad (cm)</label>
                <input
                  type="text"
                  value={lengthFormat.displayValue}
                  onChange={lengthFormat.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Ancho (cm)</label>
                <input
                  type="text"
                  value={widthFormat.displayValue}
                  onChange={widthFormat.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Alto (cm)</label>
                <input
                  type="text"
                  value={heightFormat.displayValue}
                  onChange={heightFormat.handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Unidad</label>
                <select
                  name="measureUnit"
                  value={formData.measureUnit}
                  onChange={handleTextChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Producto' : 'Crear Producto')}
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;