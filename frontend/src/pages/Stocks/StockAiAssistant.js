import React, { useState, useEffect } from 'react';
import { Brain, X, TrendingUp, Target, PackagePlus, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import mlService from '../../services/mlService';

const StockAiAssistant = ({ stock, onClose }) => {
  const [loading, setLoading]     = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true);
        const productCode = stock?.product?.code ?? stock?.product?.reference ?? null;
        const res = await mlService.predictYear(productCode);
        setPrediction(res.data);
      } catch (err) {
        console.error('AI Insight Error:', err);
        setError(err?.response?.data?.error || err.message || "Impossible de générer l'analyse IA.");
      } finally {
        setLoading(false);
      }
    };

    if (stock) fetchPrediction();
  }, [stock]);

  const needsReplenishment =
    prediction &&
    stock.quantityAvailable < prediction.recommended_stock_next_year;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content glass"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px', border: '1px solid rgba(167, 139, 250, 0.3)' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="kpi-icon purple" style={{ width: 40, height: 40 }}>
              <Brain size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>AI Stock Intelligence</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                {stock.product.name} — prévision {prediction?.forecast_year ?? '…'}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Calcul de la prévision annuelle en cours…</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger" style={{ display: 'flex', gap: '0.75rem' }}>
              <AlertTriangle size={20} />
              {error}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Yearly demand */}
              <div className="dashboard-section" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#a78bfa' }}>
                    <TrendingUp size={18} />
                    <span style={{ fontWeight: 600 }}>Demande prévue — année {prediction.forecast_year}</span>
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {prediction.predicted_demand_next_year.toLocaleString()} unités
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Basé sur l'historique complet et les tendances saisonnières.
                </p>
              </div>

              {/* Recommended stock */}
              <div className="dashboard-section" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#34d399' }}>
                    <Target size={18} />
                    <span style={{ fontWeight: 600 }}>Stock recommandé</span>
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {prediction.recommended_stock_next_year.toLocaleString()} unités
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Stock actuel : {(stock.quantityAvailable ?? 0).toLocaleString()} unités
                </p>
              </div>

              {/* Monthly breakdown — top 6 months */}
              {prediction.monthly_breakdown?.length > 0 && (
                <div className="dashboard-section" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#60a5fa', marginBottom: '0.75rem' }}>
                    <Calendar size={18} />
                    <span style={{ fontWeight: 600 }}>Répartition mensuelle</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {prediction.monthly_breakdown.map(m => (
                      <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        <span>{m.month}</span>
                        <span style={{ fontWeight: 600 }}>{m.predicted_demand.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              <div
                className={`dashboard-section ${needsReplenishment ? 'ai-error' : 'ai-success'}`}
                style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}
              >
                {needsReplenishment ? (
                  <>
                    <PackagePlus size={32} color="#f87171" />
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#f87171' }}>Réapprovisionnement recommandé</h4>
                      <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                        Commander {Math.ceil(prediction.recommended_stock_next_year - (stock.quantityAvailable ?? 0)).toLocaleString()} unités
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={32} color="#34d399" />
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: '#34d399' }}>Stock suffisant</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                        Le stock actuel couvre la demande prévue pour {prediction.forecast_year}.
                      </p>
                    </div>
                  </>
                )}
              </div>

            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', padding: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Fermer l'analyse
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockAiAssistant;
