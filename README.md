# 📦 Inventory Management System - Frontend

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Zustand](https://img.shields.io/badge/State%20Management-Zustand-orange)](https://zustand-demo.pmnd.rs/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-teal)](https://tailwindcss.com/)

## 🎯 Descripción

Frontend moderno y responsive para el Sistema de Gestión de Inventario. Diseñado para optimizar el control de stock, gestión de productos, pedidos de compra, categorías y proveedores.

## ✨ Características Principales

- 📦 **Gestión de Productos** - CRUD completo con control de stock y precios
- 📋 **Pedidos de Compra** - Creación, seguimiento y recepción de pedidos
- 🏭 **Proveedores** - Administración de proveedores y relaciones
- 📂 **Categorías** - Organización jerárquica de productos
- 📊 **Historial de Inventario** - Trazabilidad completa de movimientos
- 🔐 **Autenticación JWT** - Seguridad en todas las rutas
- 📱 **Diseño Responsive** - Adaptado a todos los dispositivos

## 🛠️ Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Zustand** - Manejo de estado global
- **React Router v6** - Navegación
- **TailwindCSS** - Estilos
- **Axios** - Cliente HTTP
- **Vite** - Build tool
- **React Hook Form** - Manejo de formularios

## 🔗 Backend

Este frontend consume la API del backend desplegada en Render:

- **API Base URL:** `https://inventory-management-api-xbpp.onrender.com/api`
- **Repositorio Backend:** [inventory-management-api](https://github.com/tu-usuario/inventory-management-api)

## 🚀 Demo

[🔗 Ver Demo en Vercel](https://tu-frontend.vercel.app)

## 📸 Capturas de Pantalla

| Módulo | Vista |
|--------|-------|
| Productos | Listado con filtros avanzados |
| Pedidos | Seguimiento de compras |
| Categorías | Organización jerárquica |
| Proveedores | Gestión completa |

## 🏗️ Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/inventory-management-frontend.git

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar servidor de desarrollo
npm run dev
