import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductMovementService from '../../services/productMovementService';
import ProductService from '../../services/productService';

const ProductMovementForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    product: { id: '' },
    quantity: '',
    type: 'SO',
    date: new Date().toISOString().split('T')[0],
    detail: {
      unitPrice: '',
      totalPrice: ''
    }
  });

  useEffect(() => {
    fetchProducts();
    if (isEditMode) {
      fetchMovement();
    }
  }, [id]);

  useEffect(() => {
    if (formData.quantity && formData.detail.unitPrice) {
      setFormData(prev => ({
        ...prev,
        detail: {
          ...prev.detail,
          totalPrice: parseFloat(prev.quantity) * parseFloat(prev.detail.unitPrice)
        }
      }));
    }
  }, [formData.quantity, formData.detail.unitPrice]);

  const fetchProducts = async () => {
    try {
      const res = await ProductService.getAll();
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchMovement = async () => {
    try {
      const res = await ProductMovementService.getById(id);
      const data = res.data;
      setFormData({
        product: { id: data.product?.id || '' },
        quantity: data.quantity || '',
        type: data.type || 'SO',
        date: data.date || '',
        detail: {
          unitPrice: data.detail?.unitPrice || '',
          totalPrice: data.detail?.totalPrice || ''
        }
      });
    } catch (error) {
      console.error('Error fetching movement:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'productId') {
      setFormData({ ...formData, product: { id: value } });
    } else if (name === 'unitPrice' || name === 'totalPrice') {
      setFormData({
        ...formData,
        detail: { ...formData.detail, [name]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await ProductMovementService.update(id, formData);
      } else {
        await ProductMovementService.create(formData);
      }
        navigate('/product-movements');
    } catch (error) {
      console.error('Error saving movement:', error);
    }
  };

  return (
    <div>
      <h2 className="page-title">{isEditMode ? 'Edit Movement' : 'Add Product Movement'}</h2>
      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Product *</label>
            <select
              name="productId"
              value={formData.product.id}
              onChange={handleChange}
              required
            >
              <option value="">Select a Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Movement Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} required>
              <option value="SO">Sales Order (SO)</option>
              <option value="PO">Purchase Order (PO)</option>
              <option value="TR">Traffic (TR)</option>
              <option value="TSS">TSS</option>
              <option value="VNP">VNP</option>
              <option value="WO">Work Order (WO)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input 
              type="number" 
              name="quantity" 
              value={formData.quantity} 
              onChange={handleChange} 
              required 
              step="any"
            />
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Unit Price</label>
            <input 
              type="number" 
              name="unitPrice" 
              value={formData.detail.unitPrice} 
              onChange={handleChange} 
              step="any"
            />
          </div>
          <div className="form-group">
            <label>Total Price (Calculated)</label>
            <input 
              type="number" 
              name="totalPrice" 
              value={formData.detail.totalPrice} 
              onChange={handleChange} 
              step="any"
              readOnly
            />
          </div>

          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/product-movements')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditMode ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductMovementForm;
