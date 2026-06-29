import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StockService from '../../services/stockService';
import ProductService from '../../services/productService';
import WarehouseService from '../../services/warehouseService';

const StockForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [products,   setProducts]   = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allStocks,  setAllStocks]  = useState([]);
  const [error,      setError]      = useState('');

  const [formData, setFormData] = useState({
    quantityAvailable: 0,
    safetyStock: 0,
    reorderPoint: 0,
    product:   { id: '' },
    warehouse: { id: '' }
  });

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, wRes, sRes] = await Promise.all([
          ProductService.getAll().catch(() => ({ data: [] })),
          WarehouseService.getAll().catch(() => ({ data: [] })),
          StockService.getAll().catch(() => ({ data: [] }))
        ]);

        setProducts(pRes.data || []);
        setWarehouses(wRes.data || []);
        setAllStocks(sRes.data || []);

        if (isEditMode) {
          const stockRes = await StockService.getById(id);
          const data = stockRes.data;
          setFormData({
            ...data,
            product:   data.product   || { id: '' },
            warehouse: data.warehouse || { id: '' }
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode]);

  // Warehouses filtered to the selected product's category
  const filteredWarehouses = useMemo(() => {
    const pId = Number(formData.product?.id);
    if (!pId) return [];
    const product = products.find(p => p.id === pId);
    const catId = product?.category?.id;
    if (!catId) return warehouses;
    return warehouses.filter(w => w.category?.id === catId);
  }, [formData.product, products, warehouses]);

  // Capacity info for the selected warehouse
  const capacityInfo = useMemo(() => {
    const wId = Number(formData.warehouse?.id);
    if (!wId) return null;
    const warehouse = warehouses.find(w => w.id === wId);
    if (!warehouse || !warehouse.capacity) return null;

    const usedByOthers = allStocks
      .filter(s => s.warehouse?.id === wId && (!isEditMode || s.id !== Number(id)))
      .reduce((sum, s) => sum + (s.quantityAvailable || 0), 0);

    const remaining = warehouse.capacity - usedByOthers;
    return { capacity: warehouse.capacity, used: usedByOthers, remaining };
  }, [formData.warehouse, warehouses, allStocks, id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');
    if (name === 'productId') {
      const newProductId = Number(value) || '';
      const newProduct = products.find(p => p.id === newProductId);
      const newCatId = newProduct?.category?.id;
      setFormData(prev => {
        const curWarehouse = warehouses.find(w => w.id === Number(prev.warehouse?.id));
        const warehouseStillValid = curWarehouse?.category?.id === newCatId;
        return {
          ...prev,
          product: { id: newProductId },
          warehouse: warehouseStillValid ? prev.warehouse : { id: '' }
        };
      });
    } else if (name === 'warehouseId') {
      setFormData(prev => ({ ...prev, warehouse: { id: Number(value) || '' } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side capacity check
    if (capacityInfo) {
      const qty = parseFloat(formData.quantityAvailable) || 0;
      if (qty > capacityInfo.remaining) {
        setError(`Exceeds warehouse capacity. Available: ${capacityInfo.remaining.toFixed(2)}, requested: ${qty.toFixed(2)}.`);
        return;
      }
    }

    setSaving(true);
    const payload = { ...formData };
    if (!payload.product.id)   payload.product   = null;
    if (!payload.warehouse.id) payload.warehouse = null;

    try {
      if (isEditMode) {
        await StockService.update(id, payload);
      } else {
        await StockService.create(payload);
      }
      navigate('/stocks');
    } catch (err) {
      const msg = err?.response?.data || 'An error occurred while saving.';
      setError(typeof msg === 'string' ? msg : 'An error occurred while saving.');
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
              <select name="warehouseId" value={formData.warehouse.id || ''} onChange={handleChange} required
                disabled={!formData.product?.id}>
                <option value="">
                  {formData.product?.id ? '-- Select Warehouse --' : '-- Select a product first --'}
                </option>
                {filteredWarehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} (capacity: {w.capacity})</option>
                ))}
              </select>
              {formData.product?.id && filteredWarehouses.length === 0 && (
                <span style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.25rem', display: 'block' }}>
                  No warehouses available for this product's category.
                </span>
              )}
              {capacityInfo && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: '#64748b' }}>Max: <strong style={{ color: '#f1f5f9' }}>{capacityInfo.capacity}</strong></span>
                  <span style={{ color: '#64748b' }}>Used: <strong style={{ color: '#f59e0b' }}>{capacityInfo.used.toFixed(2)}</strong></span>
                  <span style={{ color: '#64748b' }}>Remaining: <strong style={{ color: capacityInfo.remaining <= 0 ? '#f87171' : '#34d399' }}>{capacityInfo.remaining.toFixed(2)}</strong></span>
                </div>
              )}
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
                max={capacityInfo ? capacityInfo.remaining : undefined}
                step="0.01"
                style={capacityInfo && parseFloat(formData.quantityAvailable) > capacityInfo.remaining
                  ? { borderColor: 'rgba(248,113,113,0.6)' } : {}}
              />
              {capacityInfo && parseFloat(formData.quantityAvailable) > capacityInfo.remaining && (
                <span style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>
                  Exceeds remaining capacity ({capacityInfo.remaining.toFixed(2)})
                </span>
              )}
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

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
              color: '#f87171', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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
