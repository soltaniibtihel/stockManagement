import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, Brain, Save, ArrowLeft, RefreshCw } from 'lucide-react';
import ProductionService from '../../services/productionService';
import ProductService    from '../../services/productService';
import StockService      from '../../services/stockService';
import UserService       from '../../services/userService';

const STATUS_OPTIONS = [
  { value: 'REALISEE',  label: 'Réalisée ✅', desc: 'Production déjà effectuée', color: '#34d399' },
  { value: 'PLANIFIEE', label: 'Planifiée 🕐', desc: 'Production à venir / prévue', color: '#a78bfa' },
];

const ProductionForm = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const isEdit     = !!id;

  const prefill = location.state?.prefill || {};   // données injectées depuis la liste IA

  const [products, setProducts] = useState([]);
  const [stocks,   setStocks]   = useState([]);
  const [users,    setUsers]    = useState([]);

  const [formData, setFormData] = useState({
    productionDate:   prefill.productionDate   || new Date().toISOString().split('T')[0],
    producedQuantity: prefill.producedQuantity || 0,
    product:  { id: '' },
    stock:    { id: '' },
    user:     { id: '' },
    status:   prefill.status   || 'PLANIFIEE',
    notes:    prefill.notes    || '',
  });

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  // ── Load référentials ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, sRes, uRes] = await Promise.all([
          ProductService.getAll().catch(() => ({ data: [] })),
          StockService.getAll().catch(() => ({ data: [] })),
          UserService.getAll().catch(() => ({ data: [] })),
        ]);
        const prods  = pRes.data || [];
        const stocks = sRes.data || [];
        const users  = uRes.data || [];

        setProducts(prods);
        setStocks(stocks);
        setUsers(users);

        if (isEdit) {
          const res  = await ProductionService.getById(id);
          const data = res.data;
          if (data.productionDate) data.productionDate = data.productionDate.split('T')[0];
          setFormData({
            productionDate:   data.productionDate   || '',
            producedQuantity: data.producedQuantity || 0,
            product:  data.product  || { id: '' },
            stock:    data.stock    || { id: '' },
            user:     data.user     || { id: '' },
            status:   data.status   || 'PLANIFIEE',
            notes:    data.notes    || '',
          });
        } else if (prefill.productCode) {
          // Pré-sélectionner le produit depuis le code IA
          const matched = prods.find(p =>
            p.code === prefill.productCode || p.name === prefill.productCode
          );
          if (matched) setFormData(prev => ({ ...prev, product: { id: matched.id } }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]); // eslint-disable-line

  // ── Handlers ──────────────────────────────────────────────────────────
  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...formData,
      product: formData.product.id ? { id: formData.product.id } : null,
      stock:   formData.stock.id   ? { id: formData.stock.id   } : null,
      user:    formData.user.id    ? { id: formData.user.id    } : null,
    };

    try {
      if (isEdit) {
        await ProductionService.update(id, payload);
      } else {
        await ProductionService.create(payload);
      }
      navigate('/productions');
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>Chargement…</div>
  );

  const isPrefilled = Object.keys(prefill).length > 0;

  return (
    <div className="dashboard-container" style={{ padding:'1.5rem' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/productions')} style={{ padding:'6px 12px' }}>
          <ArrowLeft size={16}/>
        </button>
        <div>
          <h1 className="page-title" style={{ color:'white', margin:0 }}>
            {isEdit ? 'Modifier la production' : 'Nouvelle production'}
          </h1>
          {isPrefilled && !isEdit && (
            <p style={{ margin:'0.25rem 0 0', fontSize:'0.85rem', color:'#a78bfa', display:'flex', alignItems:'center', gap:'6px' }}>
              <Brain size={14}/> Pré-rempli depuis une recommandation IA
            </p>
          )}
        </div>
      </div>

      <div className="dashboard-section" style={{ maxWidth:'720px', padding:'2rem' }}>
        <form onSubmit={handleSubmit}>

          {/* ── Statut ── */}
          <div className="form-group" style={{ marginBottom:'1.5rem' }}>
            <label style={{ color:'#94a3b8', fontSize:'0.85rem', marginBottom:'0.5rem', display:'block' }}>
              Statut de la production *
            </label>
            <div style={{ display:'flex', gap:'1rem' }}>
              {STATUS_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    flex:1, padding:'0.85rem', borderRadius:'12px', cursor:'pointer',
                    border:`2px solid ${formData.status === opt.value ? opt.color : 'rgba(255,255,255,0.1)'}`,
                    background: formData.status === opt.value ? `${opt.color}18` : 'rgba(255,255,255,0.03)',
                    transition:'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={formData.status === opt.value}
                    onChange={() => set('status', opt.value)}
                    style={{ display:'none' }}
                  />
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.25rem' }}>
                    {opt.value === 'REALISEE'
                      ? <CheckCircle2 size={16} color={opt.color}/>
                      : <Clock size={16} color={opt.color}/>}
                    <span style={{ fontWeight:600, color: formData.status === opt.value ? opt.color : '#cbd5e1' }}>
                      {opt.label}
                    </span>
                  </div>
                  <p style={{ margin:0, fontSize:'0.75rem', color:'#64748b' }}>{opt.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* ── Grid champs ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>

            {/* Produit */}
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label>Produit *</label>
              <select
                value={formData.product.id || ''}
                onChange={e => set('product', { id: e.target.value })}
                required
              >
                <option value="">— Sélectionner un produit —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.code ? ` (${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="form-group">
              <label>Date de production *</label>
              <input
                type="date"
                value={formData.productionDate}
                onChange={e => set('productionDate', e.target.value)}
                required
              />
            </div>

            {/* Quantité */}
            <div className="form-group">
              <label>Quantité produite *</label>
              <input
                type="number"
                value={formData.producedQuantity}
                onChange={e => set('producedQuantity', parseFloat(e.target.value) || 0)}
                required min="0" step="0.01"
                style={{ fontWeight: prefill.producedQuantity ? 700 : 400 }}
              />
              {prefill.producedQuantity && (
                <small style={{ color:'#a78bfa', fontSize:'0.75rem' }}>
                  <Brain size={11}/> Quantité recommandée par l'IA
                </small>
              )}
            </div>

            {/* Stock destination */}
            <div className="form-group">
              <label>Stock destination</label>
              <select
                value={formData.stock.id || ''}
                onChange={e => set('stock', { id: e.target.value })}
              >
                <option value="">— Optionnel —</option>
                {stocks.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.warehouse?.name || `Stock #${s.id}`} — {(s.quantityAvailable||0).toLocaleString()} unités
                  </option>
                ))}
              </select>
            </div>

            {/* Opérateur */}
            <div className="form-group">
              <label>Opérateur</label>
              <select
                value={formData.user.id || ''}
                onChange={e => set('user', { id: e.target.value })}
              >
                <option value="">— Optionnel —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Commentaire libre (source, contexte, recommandation IA…)"
                style={{ resize:'vertical' }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding:'0.75rem', background:'rgba(248,113,113,0.1)', border:'1px solid #f8717140', borderRadius:'8px', color:'#f87171', marginBottom:'1rem', fontSize:'0.875rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              {saving ? <RefreshCw size={16} className="spinner"/> : <Save size={16}/>}
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer la production'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/productions')}>
              <ArrowLeft size={16}/> Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionForm;
