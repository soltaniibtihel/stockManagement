import React from 'react';
import { Bell, Search } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="search-bar">
        <Search className="search-icon" size={20} />
        <input type="text" placeholder="Search..." />
      </div>
      <div className="navbar-actions">
        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
