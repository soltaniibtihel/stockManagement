import React from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  return (
    <header className="navbar">
      <div className="search-bar">
        <Search className="search-icon" size={20} />
        <input type="text" placeholder="Rechercher..." />
      </div>
      <div className="navbar-actions">
        <button className="icon-btn" title="Notifications">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
        
        <div className="navbar-divider"></div>

        <div className="nav-user-profile">
          <div className="nav-avatar">
            {user ? getInitials(user.firstName, user.lastName) : 'U'}
          </div>
          <div className="nav-user-info">
            <span className="nav-user-name">{user ? `${user.firstName}` : 'Admin'}</span>
          </div>
        </div>

        <button className="icon-btn logout-nav-btn" onClick={handleLogout} title="Déconnexion">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
