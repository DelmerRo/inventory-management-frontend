// App.tsx - Agregar ruta para CategoryList
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import ProductDetailPage from './pages/ProductDetailPage';
import PurchaseOrderList from './pages/PurchaseOrderList';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import DeliveryReceipt from './pages/DeliveryReceipt';
import CategoryList from './pages/CategoryList';  // ✅ Importar
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import SupplierList from './pages/SupplierList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/products" replace />} />

          {/* ========== PRODUCTOS ========== */}
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="products" element={<ProductList />} />

          {/* ========== PEDIDOS DE COMPRA ========== */}
          <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id/delivery" element={<DeliveryReceipt />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders" element={<PurchaseOrderList />} />

          {/* ========== CATEGORÍAS ========== */}
          <Route path="categories" element={<CategoryList />} />

          {/* ========== PROVEEDORES ========== */}
          <Route path="suppliers" element={<SupplierList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;