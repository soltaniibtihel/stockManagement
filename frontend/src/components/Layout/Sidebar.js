import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  Settings,
  LayoutDashboard,
  Activity,
  Home,
  LogOut,
  Store,
  GitCompare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const menuItems = [
    { path: '/', name: "Jadida's Gallery", icon: <Store size={20} /> },
    { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/users', name: 'Users', icon: <Users size={20} />, roles: ['ADMIN', 'DIRECTOR'] },
    { path: '/categories', name: 'Categories', icon: <Settings size={20} /> },
    { path: '/products', name: 'Products', icon: <Package size={20} /> },
    { path: '/stocks', name: 'Stocks', icon: <Package size={20} /> },
    { path: '/productions', name: 'Productions', icon: <Activity size={20} /> },
    { path: '/warehouses', name: 'Warehouses', icon: <Home size={20} /> },
    { path: '/product-movements', name: 'Product Movements', icon: <Activity size={20} /> },
    { path: '/ml/compare', name: 'ML Comparison', icon: <GitCompare size={20} /> },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-box">
          <span className="logo-text">MED</span> OIL
        </div>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {visibleMenuItems.map((item) => (
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
          <div className="avatar">{user ? getInitials(user.firstName, user.lastName) : 'U'}</div>
          <div className="user-info">
            <p className="user-name">{user ? `${user.firstName} ${user.lastName}` : 'Guest User'}</p>
            <p className="user-role">{user ? user.role : 'GUEST'}</p>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Logout" style={{background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', marginLeft: 'auto', padding: '0.5rem'}}>
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
