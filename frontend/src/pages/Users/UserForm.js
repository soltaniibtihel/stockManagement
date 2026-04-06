import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserService from '../../services/userService';

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'PRODUCTION_MANAGER'
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const fetchData = async () => {
        try {
          const response = await UserService.getById(id);
          // Don't fetch password for editing to keep it secure
          setFormData({ ...response.data, password: '' });
        } catch (error) {
          console.error('Error fetching user:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Create copy, remove password if edit mode and empty
    const payload = { ...formData };
    if (isEditMode && !payload.password) {
      delete payload.password;
    }

    try {
      if (isEditMode) {
        await UserService.update(id, payload);
      } else {
        await UserService.create(payload);
      }
      navigate('/users');
    } catch (error) {
      console.error('Error saving user:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">{isEditMode ? 'Edit User' : 'New User'}</h1>
      
      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name</label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName || ''} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName || ''} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email || ''} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Password {isEditMode && '(Leave blank to keep unchanged)'}</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password || ''} 
                onChange={handleChange} 
                required={!isEditMode}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select name="role" value={formData.role || ''} onChange={handleChange} required>
                <option value="ADMIN">Admin</option>
                <option value="DIRECTOR">Director</option>
                <option value="STOCK_MANAGER">Stock Manager</option>
                <option value="LOGISTICS_MANAGER">Logistics Manager</option>
                <option value="PRODUCTION_MANAGER">Production Manager</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save User'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/users')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
