// components/Layout.tsx
import React from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { authApi } from '../api/auth';
import Toast from './Toast';
import { useToastStore } from '../store/toastStore';
import { useToastStoreSync } from '../hooks/useToastStoreSync';

// Extraemos la función de estilos fuera del componente para evitar recrearla en cada render
const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
    isActive
      ? 'bg-white text-gray-900 shadow-sm'
      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
  }`;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const { visible, message, type, hideToast } = useToastStore();

  useToastStoreSync();

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Barra de Navegación Sticky con Backdrop Blur (Efecto cristal) */}
      <nav className="bg-gray-900/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Contenedor Izquierdo: Logo y Links con scroll horizontal fluido en móvil */}
            <div className="flex items-center overflow-x-auto overflow-y-hidden custom-scrollbar pb-1 sm:pb-0 hide-scroll-indicator">
              <NavLink to="/dashboard" className="flex items-center shrink-0 mr-6 group outline-none">
                <div className="bg-indigo-600 p-1.5 rounded-lg mr-3 group-hover:bg-indigo-500 transition-colors shadow-inner">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <span className="text-white text-lg font-black tracking-tight group-hover:text-gray-200 transition-colors">Utama<span className="text-indigo-400 font-medium">Inv</span></span>
              </NavLink>
              
              <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                <NavLink to="/dashboard" className={getNavLinkClass}>📊 <span className="hidden sm:inline">Dashboard</span></NavLink>
                <NavLink to="/products" className={getNavLinkClass}>📦 <span className="hidden sm:inline">Productos</span></NavLink>
                <NavLink to="/supplies" className={getNavLinkClass}>🏷️ <span className="hidden sm:inline">Insumos</span></NavLink>
                <NavLink to="/purchase-orders" className={getNavLinkClass}>📋 <span className="hidden sm:inline">Pedidos</span></NavLink>
                <NavLink to="/categories" className={getNavLinkClass}>📂 <span className="hidden sm:inline">Categorías</span></NavLink>
                <NavLink to="/suppliers" className={getNavLinkClass}>🏭 <span className="hidden sm:inline">Proveedores</span></NavLink>
              </div>
            </div>

            {/* Contenedor Derecho: Acciones (Logout) */}
            <div className="flex items-center ml-4 shrink-0 border-l border-gray-800 pl-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-red-500/20 px-3 py-2 rounded-xl text-sm font-bold transition-all outline-none focus:ring-2 focus:ring-red-500"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <span className="hidden sm:inline text-xs uppercase tracking-wider">Salir</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:py-8 animate-fade-in-up">
        <Outlet />
      </main>

      {/* Notificaciones Globales */}
      {visible && (
        <Toast message={message} type={type} onClose={hideToast} />
      )}

      {/* CSS inyectado para mejorar las scrollbars nativas en esta capa sin afectar globales si no se desea */}
      <style>{`
        .hide-scroll-indicator::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll-indicator {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Layout;