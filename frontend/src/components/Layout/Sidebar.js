import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  Package, 
  Settings, 
  LayoutDashboard, 
  Activity, 
  BookOpen, 
  Home
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/users', name: 'Users', icon: <Users size={20} /> },
    { path: '/categories', name: 'Categories', icon: <Settings size={20} /> },
    { path: '/products', name: 'Products', icon: <Package size={20} /> },
    { path: '/stocks', name: 'Stocks', icon: <Package size={20} /> },
    { path: '/productions', name: 'Productions', icon: <Activity size={20} /> },
    { path: '/recipes', name: 'Recipes', icon: <BookOpen size={20} /> },
    { path: '/warehouses', name: 'Warehouses', icon: <Home size={20} /> },
    { path: '/product-movements', name: 'Product Movements', icon: <Activity size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box">
          <span className="logo-text">MED</span> OIL
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">AD</div>
          <div className="user-info">
            <p className="user-name">Admin User</p>
            <p className="user-role">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
