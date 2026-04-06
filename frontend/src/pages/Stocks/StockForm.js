import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StockService from '../../services/stockService';
import ProductService from '../../services/productService';
import WarehouseService from '../../services/warehouseService';

const StockForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    quantityAvailable: 0,
    safetyStock: 0,
    reorderPoint: 0,
    product: { id: '' },
    warehouse: { id: '' }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, wRes] = await Promise.all([
          ProductService.getAll().catch(() => ({ data: [] })),
          WarehouseService.getAll().catch(() => ({ data: [] }))
        ]);
        
        setProducts(pRes.data || []);
        setWarehouses(wRes.data || []);
        
        if (isEditMode) {
          const stockRes = await StockService.getById(id);
          const data = stockRes.data;
          
          setFormData({
            ...data,
            product: data.product || { id: '' },
            warehouse: data.warehouse || { id: '' }
          });
        }
      } catch (error) {
        console.error('Error fetching dat:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'productId') {
      setFormData(prev => ({ ...prev, product: { id: value } }));
    } else if (name === 'warehouseId') {
      setFormData(prev => ({ ...prev, warehouse: { id: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { ...formData };
    if (!payload.product.id) payload.product = null;
    if (!payload.warehouse.id) payload.warehouse = null;

    try {
      if (isEditMode) {
        await StockService.update(id, payload);
      } else {
        await StockService.create(payload);
      }
      navigate('/stocks');
    } catch (error) {
      console.error('Error saving stock:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">{isEditMode ? 'Edit Stock' : 'New Stock'}</h1>
      
      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Product</label>
              <select name="productId" value={formData.product.id || ''} onChange={handleChange} required>
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Warehouse</label>
              <select name="warehouseId" value={formData.warehouse.id || ''} onChange={handleChange} required>
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Quantity Available</label>
              <input 
                type="number" 
                name="quantityAvailable" 
                value={formData.quantityAvailable || 0} 
                onChange={handleChange} 
                required 
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Safety Stock</label>
              <input 
                type="number" 
                name="safetyStock" 
                value={formData.safetyStock || 0} 
                onChange={handleChange} 
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Reorder Point</label>
              <input 
                type="number" 
                name="reorderPoint" 
                value={formData.reorderPoint || 0} 
                onChange={handleChange} 
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Stock'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/stocks')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockForm;
