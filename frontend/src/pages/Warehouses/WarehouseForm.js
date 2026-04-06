import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WarehouseService from '../../services/warehouseService';

const WarehouseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 0
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      const fetchData = async () => {
        try {
          const response = await WarehouseService.getById(id);
          setFormData(response.data);
        } catch (error) {
          console.error('Error fetching warehouse:', error);
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
    
    try {
      if (isEditMode) {
        await WarehouseService.update(id, formData);
      } else {
        await WarehouseService.create(formData);
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
