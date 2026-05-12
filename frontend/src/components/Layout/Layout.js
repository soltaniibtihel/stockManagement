import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Chatbot from '../Chatbot/Chatbot';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-content">
          {children}
        </main>
      </div>
      <Chatbot />
    </div>
  );
};

export default Layout;
