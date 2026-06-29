import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductService from '../../services/productService';
import CategoryService from '../../services/categoryService';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const PRODUCT_TYPES = [
    { value: 'RAW_MATERIAL',    label: '🧪 Matière Première (Raw Material)' },
    { value: 'FINISHED_PRODUCT',label: '📦 Produit Fini (Finished Product)' },
    { value: 'SEMI_FINISHED',   label: '⚙️ Semi-Fini (Semi-Finished)' },
    { value: 'PACKAGING',       label: '🗃️ Emballage (Packaging)' },
    { value: 'BY_PRODUCT',      label: '♻️ Sous-Produit (By-Product)' },
  ];

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: '',
    shelfLife: 0,
    stockQuantity: 0,
    safetyStock: 0,
    productType: 'FINISHED_PRODUCT',
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
          const prodRes = await ProductService.getById(id);
          setFormData({
            ...prodRes.data,
            category: prodRes.data.category || { id: '' }
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
      setFormData(prev => ({ ...prev, category: { id: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Prepare payload (if no category selected, category is null)
    const payload = { ...formData };
    if (!payload.category.id) {
      payload.category = null;
    }

    try {
      if (isEditMode) {
        await ProductService.update(id, payload);
      } else {
        await ProductService.create(payload);
      }
      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">{isEditMode ? 'Edit Product' : 'New Product'}</h1>
      
      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Product Code</label>
              <input 
                type="text" 
                name="code" 
                value={formData.code || ''} 
                onChange={handleChange} 
                required 
                placeholder="e.g. PRD-001"
              />
            </div>
            
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name || ''} 
                onChange={handleChange} 
                required 
                placeholder="Product Name"
              />
            </div>

            <div className="form-group">
              <label>Unit</label>
              <input 
                type="text" 
                name="unit" 
                value={formData.unit || ''} 
                onChange={handleChange} 
                placeholder="e.g. kg, liters, pcs"
              />
            </div>

            <div className="form-group">
              <label>Shelf Life (Days)</label>
              <input 
                type="number" 
                name="shelfLife" 
                value={formData.shelfLife || 0} 
                onChange={handleChange} 
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Stock Quantity</label>
              <input 
                type="number" 
                name="stockQuantity" 
                value={formData.stockQuantity || 0} 
                onChange={handleChange} 
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
              <label>Type de produit</label>
              <select
                name="productType"
                value={formData.productType || 'FINISHED_PRODUCT'}
                onChange={handleChange}
                style={{ fontWeight: formData.productType === 'RAW_MATERIAL' ? 600 : 'normal',
                         borderColor: formData.productType === 'RAW_MATERIAL' ? 'rgba(245,158,11,0.5)' : '' }}
              >
                {PRODUCT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
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
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Description</label>
            <textarea 
              name="description" 
              value={formData.description || ''} 
              onChange={handleChange} 
              rows="3"
              placeholder="Detailed product description..."
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
