import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RecipeService from '../../services/recipeService';
import ProductService from '../../services/productService';

const RecipeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    ingredientQuantity: 0,
    unit: '',
    comment: '',
    targetProduct: { id: '' },
    product: { id: '' }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pRes = await ProductService.getAll().catch(() => ({ data: [] }));
        setProducts(pRes.data || []);
        
        if (isEditMode) {
          const recipeRes = await RecipeService.getById(id);
          const data = recipeRes.data;
          
          setFormData({
            ...data,
            targetProduct: data.targetProduct || { id: '' },
            product: data.product || { id: '' }
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
    if (name === 'targetProductId') {
      setFormData(prev => ({ ...prev, targetProduct: { id: value } }));
    } else if (name === 'productId') {
      setFormData(prev => ({ ...prev, product: { id: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { ...formData };
    if (!payload.targetProduct.id) payload.targetProduct = null;
    if (!payload.product.id) payload.product = null;

    try {
      if (isEditMode) {
        await RecipeService.update(id, payload);
      } else {
        await RecipeService.create(payload);
      }
      navigate('/recipes');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">{isEditMode ? 'Edit Recipe Component' : 'New Recipe Component'}</h1>
      
      <div className="card" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Target Product (To Produce)</label>
              <select name="targetProductId" value={formData.targetProduct.id || ''} onChange={handleChange} required>
                <option value="">-- Select Target Product --</option>
                {products.filter(p => p.category?.productType === 'FINISHED_PRODUCT' || p.category?.productType === 'SEMI_FINISHED').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Raw Material (Ingredient)</label>
              <select name="productId" value={formData.product.id || ''} onChange={handleChange} required>
                <option value="">-- Select Raw Material --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Ingredient Quantity</label>
              <input 
                type="number" 
                name="ingredientQuantity" 
                value={formData.ingredientQuantity || 0} 
                onChange={handleChange} 
                required 
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Unit</label>
              <input 
                type="text" 
                name="unit" 
                value={formData.unit || ''} 
                onChange={handleChange} 
                placeholder="e.g. kg, liters, g"
                required
              />
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Comments</label>
            <textarea 
              name="comment" 
              value={formData.comment || ''} 
              onChange={handleChange} 
              rows="3"
              placeholder="Any additional notes"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Component'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/recipes')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeForm;
