import React, { useState, useEffect } from 'react';
import { Brain, X, TrendingUp, Target, PackagePlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ProductMovementService from '../../services/productMovementService';
import mlService from '../../services/mlService';

const StockAiAssistant = ({ stock, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        // 1. Fetch real history for this product
        const historyRes = await ProductMovementService.getByProduct(stock.product.id);
        const history = historyRes.data || [];
        
        // Extract quantities (taking the last ones)
        const quantities = history.map(m => m.quantity).slice(-10);

        if (quantities.length < 3) {
          throw new Error("Pas assez de données historiques pour ce produit (minimum 3 mouvements requis).");
        }

        // 2. Call ML API
        const predRes = await mlService.predictDemand(quantities);
        setPrediction(predRes.data);
      } catch (err) {
        console.error("AI Insight Error:", err);
        setError(err.message || "Impossible de générer l'analyse IA.");
      } finally {
        setLoading(false);
      }
    };

    if (stock) fetchPrediction();
  }, [stock]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="kpi-icon purple" style={{ width: '40px', height: '40px' }}>
              <Brain size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>AI Stock Intelligence</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>{stock.product.name}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p>Analyse de l'historique en cours...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger" style={{ display: 'flex', gap: '0.75rem' }}>
              <AlertTriangle size={20} />
              {error}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Prediction Card */}
              <div className="dashboard-section" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#a78bfa' }}>
                     <TrendingUp size={18} />
                     <span style={{ fontWeight: 600 }}>Prédiction Demande</span>
                   </div>
                   <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{prediction.predicted_demand} units</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Basé sur une moyenne mobile de {prediction.calculated_moving_avg} et une tendance de {prediction.calculated_consumption}.
                </p>
              </div>

              {/* Optimization Card */}
              <div className="dashboard-section" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                   <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#34d399' }}>
                     <Target size={18} />
                     <span style={{ fontWeight: 600 }}>Stock Optimisé</span>
                   </div>
                   <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{prediction.optimized_stock} units</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  (Prédiction + Stock de Sécurité : {stock.safetyStock})
                </div>
              </div>

              {/* Action Card */}
              <div className={`dashboard-section ${prediction.suggested_replenishment > 0 ? 'ai-error' : 'ai-success'}`} 
                   style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {prediction.suggested_replenishment > 0 ? (
                  <>
                    <PackagePlus size={32} color="#f87171" />
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#f87171' }}>Réapprovisionnement Recommandé</h4>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Commander {prediction.suggested_replenishment} unités</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={32} color="#34d399" />
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#34d399' }}>Stock Optimal Atteint</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>Aucune action requise pour le moment.</p>
                    </div>
                  </>
                )}
              </div>

              {prediction.is_reorder_highly_recommended && (
                <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                  <AlertTriangle size={16} />
                  <span><strong>Priorité Haute :</strong> Le stock actuel est significativement bas par rapport à la demande prévue.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', padding: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>Fermer l'Analyse</button>
        </div>
      </div>
    </div>
  );
};

export default StockAiAssistant;
