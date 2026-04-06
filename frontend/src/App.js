import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import './App.css';

import CategoryList from './pages/Categories/CategoryList';
import CategoryForm from './pages/Categories/CategoryForm';
import ProductList from './pages/Products/ProductList';
import ProductForm from './pages/Products/ProductForm';
import ProductionList from './pages/Productions/ProductionList';
import ProductionForm from './pages/Productions/ProductionForm';
import RecipeList from './pages/Recipes/RecipeList';
import RecipeForm from './pages/Recipes/RecipeForm';
import WarehouseList from './pages/Warehouses/WarehouseList';
import WarehouseForm from './pages/Warehouses/WarehouseForm';
import UserList from './pages/Users/UserList';
import UserForm from './pages/Users/UserForm';
import StockList from './pages/Stocks/StockList';
import StockForm from './pages/Stocks/StockForm';

import ProductMovementList from './pages/ProductMovements/ProductMovementList';
import ProductMovementForm from './pages/ProductMovements/ProductMovementForm';
import ProductMovementDetailView from './pages/ProductMovements/ProductMovementDetailView';

// Placeholder Pages (we will create these next)
const Dashboard = () => <div><h1 className="page-title">Dashboard</h1><div className="card">Welcome to Med Oil Project Admin Dashboard</div></div>;

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/users" element={<UserList />} />
          <Route path="/users/new" element={<UserForm />} />
          <Route path="/users/edit/:id" element={<UserForm />} />
          
          <Route path="/stocks" element={<StockList />} />
          <Route path="/stocks/new" element={<StockForm />} />
          <Route path="/stocks/edit/:id" element={<StockForm />} />
          
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/categories/new" element={<CategoryForm />} />
          <Route path="/categories/edit/:id" element={<CategoryForm />} />
          
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/edit/:id" element={<ProductForm />} />
          
          <Route path="/productions" element={<ProductionList />} />
          <Route path="/productions/new" element={<ProductionForm />} />
          <Route path="/productions/edit/:id" element={<ProductionForm />} />
          
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/new" element={<RecipeForm />} />
          <Route path="/recipes/edit/:id" element={<RecipeForm />} />
          
          <Route path="/warehouses" element={<WarehouseList />} />
          <Route path="/warehouses/new" element={<WarehouseForm />} />
          <Route path="/warehouses/edit/:id" element={<WarehouseForm />} />
          
          <Route path="/product-movements" element={<ProductMovementList />} />
          <Route path="/product-movements/new" element={<ProductMovementForm />} />
          <Route path="/product-movements/edit/:id" element={<ProductMovementForm />} />
          <Route path="/product-movements/:id/detail" element={<ProductMovementDetailView />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
