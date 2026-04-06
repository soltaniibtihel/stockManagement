import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductionService from '../../services/productionService';
import ProductService from '../../services/productService';
import StockService from '../../services/stockService';
import UserService from '../../services/userService';

const ProductionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [products, setProducts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    productionDate: '',
    producedQuantity: 0,
    product: { id: '' },
    stock: { id: '' },
    user: { id: '' }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, stockRes, userRes] = await Promise.all([
          ProductService.getAll().catch(() => ({ data: [] })),
          StockService.getAll().catch(() => ({ data: [] })),
          UserService.getAll().catch(() => ({ data: [] }))
        ]);
        
        setProducts(pRes.data || []);
        setStocks(stockRes.data || []);
        setUsers(userRes.data || []);
        
        if (isEditMode) {
          const prodRes = await ProductionService.getById(id);
          const data = prodRes.data;
          
          if (data.productionDate) data.productionDate = data.productionDate.split('T')[0];
          
          setFormData({
            ...data,
            product: data.product || { id: '' },
            stock: data.stock || { id: '' },
            user: data.user || { id: '' }
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
    if (name === 'productId') {
      setFormData(prev => ({ ...prev, product: { id: value } }));
    } else if (name === 'stockId') {
      setFormData(prev => ({ ...prev, stock: { id: value } }));
    } else if (name === 'userId') {
      setFormData(prev => ({ ...prev, user: { id: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { ...formData };
    if (!payload.product.id) payload.product = null;
    if (!payload.stock.id) payload.stock = null;
    if (!payload.user.id) payload.user = null;

    try {
      if (isEditMode) {
        await ProductionService.update(id, payload);
      } else {
        await ProductionService.create(payload);
      }
      navigate('/productions');
    } catch (error) {
      console.error('Error saving production:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">{isEditMode ? 'Edit Production' : 'New Production'}</h1>
      
      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Production Date</label>
              <input 
                type="date" 
                name="productionDate" 
                value={formData.productionDate || ''} 
                onChange={handleChange} 
                required
              />
            </div>
            
            <div className="form-group">
              <label>Produced Quantity</label>
              <input 
                type="number" 
                name="producedQuantity" 
                value={formData.producedQuantity || 0} 
                onChange={handleChange} 
                required 
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Product (To Produce)</label>
              <select name="productId" value={formData.product.id || ''} onChange={handleChange} required>
                <option value="">-- Select Product --</option>
                {products.filter(p => p.category?.productType === 'FINISHED_PRODUCT' || p.category?.productType === 'SEMI_FINISHED').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Stock Destination</label>
              <select name="stockId" value={formData.stock.id || ''} onChange={handleChange}>
                <option value="">-- Select Stock --</option>
                {stocks.map(s => (
                  <option key={s.id} value={s.id}>Stock #{s.id}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>User (Operator)</label>
              <select name="userId" value={formData.user.id || ''} onChange={handleChange}>
                <option value="">-- Select User --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Production'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/productions')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionForm;
