// components/Layout.tsx - Agregar enlace a Categorías
import React from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { authApi } from '../api/auth';
import Toast from './Toast';
import { useToastStore } from '../store/toastStore';
import { useToastStoreSync } from '../hooks/useToastStoreSync';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { visible, message, type, hideToast } = useToastStore();

  useToastStoreSync();

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${isActive
      ? 'bg-gray-900 text-white'
      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-white text-xl font-bold mr-8">Utama Inventory</span>
              <div className="flex space-x-2">
                <NavLink to="/products" className={navLinkClass}>
                  📦 Productos
                </NavLink>
                <NavLink to="/purchase-orders" className={navLinkClass}>
                  📋 Pedidos
                </NavLink>
                {/* ✅ Agregar enlace a Categorías */}
                <NavLink to="/categories" className={navLinkClass}>
                  📂 Categorías
                </NavLink>
                <NavLink to="/suppliers" className={navLinkClass}>
                  🏭 Proveedores
                </NavLink>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {visible && (
        <Toast message={message} type={type} onClose={hideToast} />
      )}
    </div>
  );
};

export default Layout;