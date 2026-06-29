import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WarehouseService from '../../services/warehouseService';
import CategoryService from '../../services/categoryService';

const WarehouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 0,
    category: { id: '' }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await CategoryService.getAll();
        setCategories(catRes.data);

        if (isEditMode) {
          const response = await WarehouseService.getById(id);
          setFormData({
            ...response.data,
            category: response.data.category || { id: '' }
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'categoryId') {
      setFormData(prev => ({ ...prev, category: { id: value ? Number(value) : null } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = { ...formData };
    if (!payload.category?.id || payload.category.id === '') payload.category = null;

    try {
      if (isEditMode) {
        await WarehouseService.update(id, payload);
      } else {
        await WarehouseService.create(payload);
      }
      navigate('/warehouses');
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">{isEditMode ? 'Edit Warehouse' : 'New Warehouse'}</h1>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name || ''} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Main Warehouse"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location || ''} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Building A"
            />
          </div>
          
          <div className="form-group">
            <label>Capacity</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity || 0}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              name="categoryId"
              value={formData.category?.id || ''}
              onChange={handleChange}
            >
              <option value="">-- Select Category --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Warehouse'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/warehouses')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarehouseForm;
