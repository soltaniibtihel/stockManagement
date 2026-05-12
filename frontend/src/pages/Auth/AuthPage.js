import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User as UserIcon, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STOCK_MANAGER'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role
      });
    }

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">MedOil</div>
          <p className="auth-subtitle">Stock & Production Management System</p>
        </div>

        <div className="auth-tabs">
          <div 
            className={`auth-tab ${isLogin ? 'active' : ''}`} 
            onClick={() => toggleMode()}
          >
            Sign In
          </div>
          <div 
            className={`auth-tab ${!isLogin ? 'active' : ''}`} 
            onClick={() => toggleMode()}
          >
            Sign Up
          </div>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="input-group">
                <UserIcon size={20} className="input-icon" />
                <input 
                  type="text" 
                  name="firstName" 
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="input-group">
                <UserIcon size={20} className="input-icon" />
                <input 
                  type="text" 
                  name="lastName" 
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="input-group">
                <Shield size={20} className="input-icon" />
                <select 
                  name="role" 
                  value={formData.role} 
                  onChange={handleChange} 
                  required
                >
                  <option value="STOCK_MANAGER">Stock Manager</option>
                  <option value="PRODUCTION_MANAGER">Production Manager</option>
                  <option value="LOGISTICS_MANAGER">Logistics Manager</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </>
          )}

          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input 
              type="email" 
              name="email" 
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input 
              type="password" 
              name="password" 
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
