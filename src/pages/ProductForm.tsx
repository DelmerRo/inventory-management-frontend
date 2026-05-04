// pages/ProductForm.tsx - Validaciones alineadas con backend
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { categoryApi } from '../api/categories';
import { supplierApi } from '../api/suppliers';
import type { Category, Subcategory } from '../api/categories';
import type { SupplierSummary } from '../api/suppliers';
import type { ProductRequest, SupplierAssociationDTO } from '../types/product';
import MarkdownEditor from '../components/MarkdownEditor';
import { useNumberFormat } from '../hooks/useNumberFormat';

// Constantes de validación (alineadas con backend)
const VALIDATION_RULES = {
  name: { min: 2, max: 200 },
  costPrice: { min: 0, digits: { integer: 10, fraction: 2 } },
  salePrice: { min: 0, digits: { integer: 10, fraction: 2 } },
  weight: { min: 0.001, digits: { integer: 5, fraction: 3 } },
  dimensions: { min: 0.01, digits: { integer: 5, fraction: 2 } },
  supplierSku: { max: 50 },
  measureUnit: { max: 20 }
};

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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Estados para validación
  const [errors, setErrors] = useState<{
    name?: string;
    costPrice?: string;
    salePrice?: string;
    subcategoryId?: string;
    suppliers?: string;
    weight?: string;
    length?: string;
    width?: string;
    height?: string;
    measureUnit?: string;
  }>({});

  const [touched, setTouched] = useState<{
    name?: boolean;
    costPrice?: boolean;
    salePrice?: boolean;
    subcategoryId?: boolean;
  }>({});

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

  // Calcular si las dimensiones están completas
  const hasDimensions = formData.weight > 0 && formData.length > 0 && formData.width > 0 && formData.height > 0;
  const [dimensionsEmpty, setDimensionsEmpty] = useState(false);

  useEffect(() => {
    const hasValues = formData.weight > 0 || formData.length > 0 || formData.width > 0 || formData.height > 0;
    setDimensionsEmpty(showAdvanced && !hasValues);
  }, [formData.weight, formData.length, formData.width, formData.height, showAdvanced]);

  // ========== VALIDACIONES ALINEADAS CON BACKEND ==========

  const validateName = useCallback((name: string): string | undefined => {
    if (!name?.trim()) return 'El nombre es obligatorio';
    if (name.length < VALIDATION_RULES.name.min) return `El nombre debe tener al menos ${VALIDATION_RULES.name.min} caracteres`;
    if (name.length > VALIDATION_RULES.name.max) return `El nombre no puede exceder ${VALIDATION_RULES.name.max} caracteres`;
    return undefined;
  }, []);

  const validateCostPrice = useCallback((price: number): string | undefined => {
    if (price === undefined || price === null) return undefined;
    if (price < VALIDATION_RULES.costPrice.min) return 'El precio de costo no puede ser negativo';
    // Validar decimales (2 decimales máximo)
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > VALIDATION_RULES.costPrice.digits.fraction) return 'El precio de costo debe tener máximo 2 decimales';
    return undefined;
  }, []);

  const validateSalePrice = useCallback((price: number, costPrice: number): string | undefined => {
    if (price === undefined || price === null) return undefined;
    if (price < VALIDATION_RULES.salePrice.min) return 'El precio de venta no puede ser negativo';
    if (costPrice > 0 && price < costPrice) return 'El precio de venta debe ser mayor o igual al precio de costo';
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > VALIDATION_RULES.salePrice.digits.fraction) return 'El precio de venta debe tener máximo 2 decimales';
    return undefined;
  }, []);

  const validateWeight = useCallback((weight: number): string | undefined => {
    if (weight === 0) return undefined; // Opcional
    if (weight < 0) return 'El peso no puede ser negativo';
    if (weight > 0 && weight < VALIDATION_RULES.weight.min) return `El peso debe ser mayor a ${VALIDATION_RULES.weight.min} kg`;
    const decimalPlaces = (weight.toString().split('.')[1] || '').length;
    if (decimalPlaces > VALIDATION_RULES.weight.digits.fraction) return 'El peso debe tener máximo 3 decimales';
    return undefined;
  }, []);

  const validateDimension = useCallback((value: number, fieldName: string): string | undefined => {
    if (value === 0) return undefined; // Opcional
    if (value < 0) return `${fieldName} no puede ser negativo`;
    if (value > 0 && value < VALIDATION_RULES.dimensions.min) return `${fieldName} debe ser mayor a ${VALIDATION_RULES.dimensions.min} cm`;
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > VALIDATION_RULES.dimensions.digits.fraction) return `${fieldName} debe tener máximo 2 decimales`;
    return undefined;
  }, []);

  const validateMeasureUnit = useCallback((unit: string): string | undefined => {
    if (unit && unit.length > VALIDATION_RULES.measureUnit.max) return `Unidad no puede exceder ${VALIDATION_RULES.measureUnit.max} caracteres`;
    return undefined;
  }, []);

  const validateSuppliers = useCallback((): string | undefined => {
    if (formData.suppliers.length === 0) return 'Debe agregar al menos un proveedor';
    if (!formData.suppliers.some(s => s.isPrimary)) return 'Debe seleccionar un proveedor como principal';
    return undefined;
  }, [formData.suppliers]);

  // Validar todo el formulario
  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    newErrors.name = validateName(formData.name);
    newErrors.costPrice = validateCostPrice(formData.costPrice);
    newErrors.salePrice = validateSalePrice(formData.salePrice, formData.costPrice);
    
    if (!formData.subcategoryId || formData.subcategoryId === 0) {
      newErrors.subcategoryId = 'Debe seleccionar una subcategoría';
    }

    newErrors.suppliers = validateSuppliers();
    newErrors.measureUnit = validateMeasureUnit(formData.measureUnit);

    if (formData.weight > 0) {
      newErrors.weight = validateWeight(formData.weight);
    }
    if (formData.length > 0) {
      newErrors.length = validateDimension(formData.length, 'Largo');
    }
    if (formData.width > 0) {
      newErrors.width = validateDimension(formData.width, 'Ancho');
    }
    if (formData.height > 0) {
      newErrors.height = validateDimension(formData.height, 'Alto');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).filter(k => newErrors[k as keyof typeof errors]).length === 0;
  }, [formData, validateName, validateCostPrice, validateSalePrice, validateSuppliers, validateMeasureUnit, validateWeight, validateDimension]);

  // Handlers con validación en tiempo real
  const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    setTouched(prev => ({ ...prev, name: true }));
    setErrors(prev => ({ ...prev, name: validateName(value) }));
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }));
    setErrors(prev => ({ ...prev, name: validateName(formData.name) }));
  };

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

  // Cargar datos del producto seleccionado
  useEffect(() => {
    if (isEditMode && selectedProduct) {
      setFormData({
        name: selectedProduct.name,
        description: selectedProduct.description || '',
        costPrice: selectedProduct.costPrice,
        salePrice: selectedProduct.salePrice,
        currentStock: selectedProduct.currentStock,
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

      if (selectedProduct.subcategory && selectedProduct.subcategory.id) {
        const category = categories.find(cat =>
          cat.subcategories.some(sub => sub.id === selectedProduct.subcategory.id)
        );
        if (category) {
          setSelectedCategoryId(category.id);
          setAvailableSubcategories(category.subcategories);
        }
      } else {
        if (categories.length > 0 && categories[0].subcategories.length > 0) {
          setSelectedCategoryId(categories[0].id);
          setAvailableSubcategories(categories[0].subcategories);
          setFormData(prev => ({ ...prev, subcategoryId: categories[0].subcategories[0].id }));
        }
      }
    }
  }, [selectedProduct, isEditMode, categories, costPriceFormat, salePriceFormat, weightFormat, lengthFormat, widthFormat, heightFormat]);

  // Sincronizar formData con formatos numéricos
  useEffect(() => {
    setFormData(prev => ({ ...prev, costPrice: costPriceFormat.value }));
    if (touched.costPrice || formData.costPrice > 0) {
      setErrors(prev => ({ ...prev, costPrice: validateCostPrice(costPriceFormat.value) }));
      if (formData.salePrice > 0) {
        setErrors(prev => ({ ...prev, salePrice: validateSalePrice(formData.salePrice, costPriceFormat.value) }));
      }
    }
  }, [costPriceFormat.value, touched.costPrice, formData.costPrice, formData.salePrice, validateCostPrice, validateSalePrice]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, salePrice: salePriceFormat.value }));
    if (touched.salePrice || formData.salePrice > 0) {
      setErrors(prev => ({ ...prev, salePrice: validateSalePrice(salePriceFormat.value, formData.costPrice) }));
    }
  }, [salePriceFormat.value, touched.salePrice, formData.salePrice, formData.costPrice, validateSalePrice]);

  useEffect(() => {
    if (!isEditMode) {
      setFormData(prev => ({ ...prev, currentStock: currentStockFormat.value }));
    }
  }, [currentStockFormat.value, isEditMode]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, weight: weightFormat.value }));
    if (weightFormat.value > 0) {
      setErrors(prev => ({ ...prev, weight: validateWeight(weightFormat.value) }));
    } else {
      setErrors(prev => ({ ...prev, weight: undefined }));
    }
  }, [weightFormat.value, validateWeight]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, length: lengthFormat.value }));
    if (lengthFormat.value > 0) {
      setErrors(prev => ({ ...prev, length: validateDimension(lengthFormat.value, 'Largo') }));
    } else {
      setErrors(prev => ({ ...prev, length: undefined }));
    }
  }, [lengthFormat.value, validateDimension]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, width: widthFormat.value }));
    if (widthFormat.value > 0) {
      setErrors(prev => ({ ...prev, width: validateDimension(widthFormat.value, 'Ancho') }));
    } else {
      setErrors(prev => ({ ...prev, width: undefined }));
    }
  }, [widthFormat.value, validateDimension]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, height: heightFormat.value }));
    if (heightFormat.value > 0) {
      setErrors(prev => ({ ...prev, height: validateDimension(heightFormat.value, 'Alto') }));
    } else {
      setErrors(prev => ({ ...prev, height: undefined }));
    }
  }, [heightFormat.value, validateDimension]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, measureUnit: prev.measureUnit || 'cm' }));
    setErrors(prev => ({ ...prev, measureUnit: validateMeasureUnit(formData.measureUnit) }));
  }, [formData.measureUnit, validateMeasureUnit]);

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
    setSubmitAttempted(true);

    if (!validateForm()) {
      // Scroll al primer error
      const firstError = document.querySelector('.border-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    let payload = { ...formData };
    if (isEditMode) {
      const { currentStock, ...rest } = payload;
      payload = rest;
    }

    try {
      if (isEditMode && id) {
        await updateProduct(parseInt(id), payload);
      } else {
        await createProduct(payload);
      }
      navigate('/products');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Error al guardar el producto';
      alert(message);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'subcategoryId') {
      const newId = parseInt(value) || 1;
      setFormData(prev => ({ ...prev, subcategoryId: newId }));
      setErrors(prev => ({ ...prev, subcategoryId: undefined }));
    } else if (name === 'measureUnit') {
      setFormData(prev => ({ ...prev, measureUnit: value }));
      setErrors(prev => ({ ...prev, measureUnit: validateMeasureUnit(value) }));
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
    setErrors(prev => ({ ...prev, suppliers: validateSuppliers() }));

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

    setErrors(prev => ({ ...prev, suppliers: validateSuppliers() }));
  };

  const setPrimarySupplier = (supplierId: number) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => ({
        ...s,
        isPrimary: s.supplierId === supplierId
      }))
    }));
    setErrors(prev => ({ ...prev, suppliers: validateSuppliers() }));
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

  const hasFormErrors = Object.keys(errors).filter(k => errors[k as keyof typeof errors]).length > 0;

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
                onChange={handleNameInputChange}
                onBlur={handleNameBlur}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  touched.name && errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {touched.name && errors.name && (
                <p className="text-red-500 text-xs mt-1 animate-pulse">{errors.name}</p>
              )}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  errors.subcategoryId ? 'border-red-500' : 'border-gray-300'
                }`}
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
              {errors.subcategoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.subcategoryId}</p>
              )}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-right ${
                  errors.costPrice ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.costPrice && (
                <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>
              )}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-right ${
                  errors.salePrice ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.salePrice && (
                <p className="text-red-500 text-xs mt-1">{errors.salePrice}</p>
              )}
            </div>
          </div>

          {formData.costPrice > 0 && formData.salePrice > 0 && !errors.costPrice && !errors.salePrice && (
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
              {errors.suppliers && submitAttempted && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {errors.suppliers}
                </div>
              )}

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
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} {showAdvanced ? 'Ocultar' : 'Mostrar'} dimensiones y peso
            </button>
            {!showAdvanced && !hasDimensions && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                💡 Dimensiones no especificadas (opcional)
              </span>
            )}
            {!showAdvanced && hasDimensions && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                ✅ Dimensiones completas
              </span>
            )}
          </div>

          {showAdvanced && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">
                  Estas dimensiones se usan para calcular volumen y costos de envío (opcional)
                </p>
                {dimensionsEmpty && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                    ⚠️ Campos opcionales
                  </span>
                )}
                {!dimensionsEmpty && hasDimensions && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    ✅ Dimensiones completas
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Peso (kg) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={weightFormat.displayValue}
                    onChange={weightFormat.handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-right ${
                      errors.weight ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Profundidad (cm) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={lengthFormat.displayValue}
                    onChange={lengthFormat.handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-right ${
                      errors.length ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.length && <p className="text-red-500 text-xs mt-1">{errors.length}</p>}
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Ancho (cm) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={widthFormat.displayValue}
                    onChange={widthFormat.handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-right ${
                      errors.width ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.width && <p className="text-red-500 text-xs mt-1">{errors.width}</p>}
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Alto (cm) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={heightFormat.displayValue}
                    onChange={heightFormat.handleChange}
                    className={`w-full px-3 py-2 border rounded-md text-right ${
                      errors.height ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
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
              {dimensionsEmpty && !hasDimensions && (
                <p className="text-xs text-gray-400 mt-2">
                  💡 Puede dejar estos campos vacíos. Solo son necesarios para cálculos de envío.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botón de submit con feedback visual */}
        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2 rounded-md transition font-medium ${
              isLoading
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : hasFormErrors && submitAttempted
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar Producto' : 'Crear Producto')}
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        </div>

        {/* Resumen de errores */}
        {hasFormErrors && submitAttempted && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-700 text-sm font-medium">Por favor, corrige los siguientes errores:</p>
            <ul className="list-disc list-inside text-red-600 text-sm mt-1">
              {errors.name && <li>{errors.name}</li>}
              {errors.costPrice && <li>{errors.costPrice}</li>}
              {errors.salePrice && <li>{errors.salePrice}</li>}
              {errors.subcategoryId && <li>{errors.subcategoryId}</li>}
              {errors.suppliers && <li>{errors.suppliers}</li>}
              {errors.weight && <li>{errors.weight}</li>}
              {errors.length && <li>{errors.length}</li>}
              {errors.width && <li>{errors.width}</li>}
              {errors.height && <li>{errors.height}</li>}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProductForm;