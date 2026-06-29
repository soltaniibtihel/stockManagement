import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Activity, RefreshCw, AlertCircle, BarChart3,
  PieChart as PieChartIcon, Brain, CheckCircle, TrendingUp,
  Target, FlaskConical, ShoppingCart, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import stockService          from '../../services/stockService';
import productionService     from '../../services/productionService';
import productMovementService from '../../services/productMovementService';
import mlService             from '../../services/mlService';
import ProductService        from '../../services/productService';
import './Dashboard.css';

const COLORS = ['#6366f1', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa'];

const MOVEMENT_LABELS = {
  SO:  { label: 'Sales Order',    dir: 'out'     },
  PO:  { label: 'Purchase Order', dir: 'in'      },
  TR:  { label: 'Transfer',       dir: 'neutral' },
  TSS: { label: 'Stock Transfer', dir: 'neutral' },
  VNP: { label: 'Sale',           dir: 'out'     },
  WO:  { label: 'Work Order',     dir: 'out'     },
};

// Code couleur par catégorie de matière première (pour le badge)
const RM_CATEGORY_COLOR = {
  'PF-':  { bg: 'rgba(14,165,233,0.15)',  color: '#38bdf8', label: 'Emballage' },
  'OB-':  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Huile brute' },
  'ADD-': { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: 'Additif' },
  'EMB-': { bg: 'rgba(167,139,250,0.15)',color: '#a78bfa', label: 'Emballage 2°' },
};

const getRmStyle = (code = '') => {
  const prefix = Object.keys(RM_CATEGORY_COLOR).find(p => code.startsWith(p));
  return prefix
    ? RM_CATEGORY_COLOR[prefix]
    : { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', label: 'Matière' };
};

const extractTrainingError = (err) => {
  const d = err?.response?.data;
  if (typeof d?.detail  === 'string') return d.detail;
  if (typeof d?.message === 'string') return d.message;
  return err?.message || "Échec de l'entraînement IA.";
};

// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [loading, setLoading]           = useState(true);
  const [kpi, setKpi]                   = useState({ totalStock: 0, totalProductions: 0, totalMovements: 0 });
  const [stockData, setStockData]       = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);

  // AI forecast
  const [aiPrediction, setAiPrediction]   = useState(null);
  const [aiPredLoading, setAiPredLoading] = useState(true);

  // AI training
  const [aiTraining, setAiTraining]     = useState(false);
  const [aiTrainResult, setAiTrainResult] = useState(null);

  // Raw Materials
  const [rawMaterials, setRawMaterials] = useState([]);
  const [rmLoading, setRmLoading]       = useState(true);
  const [rmExpanded, setRmExpanded]     = useState(true);
  // Stocke les prévisions/recommandations saisies manuellement (vides par défaut)
  const [rmData, setRmData]             = useState({}); // { [id]: { predicted, recommended, notes } }

  const aiInputRef = useRef(null);

  // ── Données dashboard ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [stocksRes, productionsRes, movementsRes] = await Promise.all([
          stockService.getAll(),
          productionService.getAll(),
          productMovementService.getAll(),
        ]);
        const stocks      = stocksRes.data      || [];
        const productions = productionsRes.data  || [];
        const movements   = movementsRes.data    || [];

        const totalStock = stocks.reduce((s, x) => s + (x.quantityAvailable || 0), 0);
        setKpi({ totalStock: Math.round(totalStock), totalProductions: productions.length, totalMovements: movements.length });

        const byWarehouse = {};
        stocks.forEach(s => {
          const n = s.warehouse?.name || 'Inconnu';
          byWarehouse[n] = (byWarehouse[n] || 0) + (s.quantityAvailable || 0);
        });
        setStockData(Object.entries(byWarehouse).map(([name, value]) => ({ name, value: Math.round(value) })));

        const byMonth = {};
        productions.forEach(p => {
          const d   = p.productionDate ? new Date(p.productionDate) : null;
          const key = d ? d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : 'N/A';
          byMonth[key] = (byMonth[key] || 0) + (p.producedQuantity || 0);
        });
        setProductionData(Object.entries(byMonth).slice(-12).map(([name, quantity]) => ({ name, quantity: Math.round(quantity) })));

        const sorted = [...movements].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
        setRecentMovements(sorted);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Prévision IA globale ───────────────────────────────────────────────────
  useEffect(() => {
    const loadForecast = async () => {
      try {
        setAiPredLoading(true);
        const res = await mlService.predictYear();
        setAiPrediction(res.data);
      } catch { setAiPrediction(null); }
      finally  { setAiPredLoading(false); }
    };
    loadForecast();
  }, []);

  // ── Matières premières ────────────────────────────────────────────────────
  useEffect(() => {
    const loadRM = async () => {
      try {
        setRmLoading(true);
        const res = await ProductService.getRawMaterials();
        const list = res.data || [];
        setRawMaterials(list);
        // Initialise l'état des champs vides pour chaque MP
        const init = {};
        list.forEach(p => {
          init[p.id] = { predicted: '', recommended: '', notes: '' };
        });
        setRmData(init);
      } catch (err) {
        console.error('Raw materials error:', err);
      } finally {
        setRmLoading(false);
      }
    };
    loadRM();
  }, []);

  // ── Entraînement ──────────────────────────────────────────────────────────
  const handleTrainClick = () => aiInputRef.current?.click();
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiTraining(true);
    setAiTrainResult(null);
    try {
      const res = await mlService.uploadAndTrain(file);
      const d   = res.data;
      setAiTrainResult({
        success: true,
        message: d.message || `Modèle entraîné sur ${d.rows_monthly ?? '?'} points mensuels.`,
        detail:  d.date_range ? `${d.date_range.from} → ${d.date_range.to} · ${d.model_type}` : null,
      });
      const pred = await mlService.predictYear();
      setAiPrediction(pred.data);
    } catch (err) {
      setAiTrainResult({ success: false, message: extractTrainingError(err) });
    } finally {
      setAiTraining(false);
      e.target.value = '';
    }
  };

  // ── Mise à jour champ MP ──────────────────────────────────────────────────
  const updateRmField = (id, field, value) => {
    setRmData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="dashboard-container">
      <h2 style={{ color: '#fff', textAlign: 'center' }}>Chargement du tableau de bord…</h2>
    </div>
  );

  return (
    <div className="dashboard-container">

      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ color: 'white', marginBottom: 0 }}>Tableau de Bord Directeur</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Vue en temps réel — chaîne d'approvisionnement et production.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <input type="file" ref={aiInputRef} onChange={handleFileChange} accept=".xlsx" style={{ display: 'none' }} />
          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)', border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            onClick={handleTrainClick}
            disabled={aiTraining}
          >
            {aiTraining ? <RefreshCw size={18} className="spinner" /> : <Brain size={18} />}
            {aiTraining ? 'Entraînement…' : 'Entraîner le modèle IA'}
          </button>
        </div>
      </div>

      {/* ── Bannière entraînement ── */}
      {aiTrainResult && (
        <div className={`dashboard-section ${aiTrainResult.success ? 'ai-success' : 'ai-error'}`}
             style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {aiTrainResult.success ? <CheckCircle color="#34d399" size={24} /> : <AlertCircle color="#f87171" size={24} />}
            <div>
              <h4 style={{ margin: '0 0 0.2rem', color: aiTrainResult.success ? '#34d399' : '#f87171' }}>{aiTrainResult.message}</h4>
              {aiTrainResult.detail && <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>{aiTrainResult.detail}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI ── */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card">
          <div className="kpi-icon blue"><Package size={28} /></div>
          <div className="kpi-details"><h3>Stock Total</h3><p>{kpi.totalStock.toLocaleString()}</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple"><Activity size={28} /></div>
          <div className="kpi-details"><h3>Productions</h3><p>{kpi.totalProductions}</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><RefreshCw size={28} /></div>
          <div className="kpi-details"><h3>Mouvements</h3><p>{kpi.totalMovements}</p></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange"><FlaskConical size={28} /></div>
          <div className="kpi-details"><h3>Matières 1ères</h3><p>{rawMaterials.length}</p></div>
        </div>
      </div>

      {/* ── Prévision IA globale ── */}
      <section className="dashboard-section" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h2 className="section-header"><Brain size={22} color="#a78bfa" /> Prévision IA — Demande Annuelle (Produits Finis)</h2>
        {aiPredLoading ? (
          <p style={{ color: '#94a3b8' }}>Chargement de la prévision…</p>
        ) : !aiPrediction ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
            <AlertCircle size={18} />
            <span>Aucun modèle entraîné. Importez un fichier Excel historique pour générer une prévision.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ background: 'rgba(167,139,250,0.15)', borderRadius: '50%', padding: '0.6rem' }}>
                  <TrendingUp size={22} color="#a78bfa" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Demande prévue {aiPrediction.forecast_year}</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>
                    {aiPrediction.predicted_demand_next_year?.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>unités</span>
                  </p>
                </div>
              </div>
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ background: 'rgba(52,211,153,0.15)', borderRadius: '50%', padding: '0.6rem' }}>
                  <Target size={22} color="#34d399" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Stock recommandé {aiPrediction.forecast_year}</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>
                    {aiPrediction.recommended_stock_next_year?.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>unités</span>
                  </p>
                </div>
              </div>
            </div>
            {aiPrediction.monthly_breakdown?.length > 0 && (
              <div>
                <p style={{ margin: '0 0 0.75rem', color: '#94a3b8', fontSize: '0.85rem' }}>Répartition mensuelle de la demande prévue</p>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aiPrediction.monthly_breakdown} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        formatter={(v) => [`${v.toLocaleString()} unités`, 'Demande']} />
                      <Bar dataKey="predicted_demand" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION MATIÈRES PREMIÈRES — Prévisions & Recommandations de commande
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dashboard-section rm-section" style={{ marginBottom: '2rem' }}>

        {/* En-tête collapsable */}
        <div className="rm-header" onClick={() => setRmExpanded(v => !v)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(245,158,11,0.15)', borderRadius: '10px', padding: '0.5rem' }}>
              <FlaskConical size={22} color="#f59e0b" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Matières Premières — Prévisions &amp; Recommandations de Commande
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                {rawMaterials.length} matière{rawMaterials.length !== 1 ? 's' : ''} première{rawMaterials.length !== 1 ? 's' : ''} enregistrée{rawMaterials.length !== 1 ? 's' : ''} · Les données réelles seront saisies après prédiction
              </p>
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            {rmExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {rmExpanded && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>

            {/* Légende catégories */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {Object.values(RM_CATEGORY_COLOR).map(c => (
                <span key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '5px',
                  background: c.bg, color: c.color, padding: '3px 10px',
                  borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  {c.label}
                </span>
              ))}
            </div>

            {rmLoading ? (
              <p style={{ color: '#94a3b8' }}>Chargement des matières premières…</p>
            ) : rawMaterials.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', padding: '1.5rem 0' }}>
                <AlertCircle size={18} />
                <span>Aucune matière première enregistrée. Ajoutez des produits de type <strong>RAW_MATERIAL</strong> dans la page Produits.</span>
              </div>
            ) : (
              <div className="rm-grid">
                {rawMaterials.map(rm => {
                  const style = getRmStyle(rm.code);
                  const d = rmData[rm.id] || { predicted: '', recommended: '', notes: '' };
                  const hasPrediction = d.predicted !== '' || d.recommended !== '';

                  return (
                    <div key={rm.id} className="rm-card">

                      {/* En-tête carte */}
                      <div className="rm-card-top">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                          <div style={{ background: style.bg, borderRadius: '10px', padding: '0.5rem', flexShrink: 0 }}>
                            <FlaskConical size={18} color={style.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <h4 className="rm-name">{rm.name}</h4>
                              <span style={{ background: style.bg, color: style.color, borderRadius: '8px',
                                padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                {style.label}
                              </span>
                            </div>
                            <p className="rm-code">{rm.code} · {rm.unit}</p>
                          </div>
                        </div>
                        {/* Indicateur statut */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0,
                          background: hasPrediction ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.12)',
                          color: hasPrediction ? '#34d399' : '#64748b',
                          border: `1px solid ${hasPrediction ? 'rgba(52,211,153,0.25)' : 'rgba(100,116,139,0.2)'}` }}>
                          {hasPrediction ? <CheckCircle size={12}/> : <Clock size={12}/>}
                          {hasPrediction ? 'Données saisies' : 'En attente'}
                        </div>
                      </div>

                      {/* Champs prévision & recommandation */}
                      <div className="rm-fields">
                        <div className="rm-field-group">
                          <label className="rm-field-label">
                            <TrendingUp size={12} style={{ marginRight: 4 }} />
                            Demande prévue
                          </label>
                          <div className="rm-input-wrap">
                            <input
                              type="number"
                              min="0"
                              className="rm-input"
                              placeholder="— valeur réelle à venir —"
                              value={d.predicted}
                              onChange={e => updateRmField(rm.id, 'predicted', e.target.value)}
                            />
                            <span className="rm-unit">{rm.unit}</span>
                          </div>
                        </div>

                        <div className="rm-field-group">
                          <label className="rm-field-label">
                            <ShoppingCart size={12} style={{ marginRight: 4 }} />
                            Qté recommandée à commander
                          </label>
                          <div className="rm-input-wrap">
                            <input
                              type="number"
                              min="0"
                              className="rm-input"
                              placeholder="— valeur réelle à venir —"
                              value={d.recommended}
                              onChange={e => updateRmField(rm.id, 'recommended', e.target.value)}
                            />
                            <span className="rm-unit">{rm.unit}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div style={{ padding: '0 1rem 0.75rem' }}>
                        <textarea
                          className="rm-notes"
                          placeholder="Notes sur cette matière première (fournisseur, délai, conditions…)"
                          rows={2}
                          value={d.notes}
                          onChange={e => updateRmField(rm.id, 'notes', e.target.value)}
                        />
                      </div>

                      {/* Résumé visuel si données saisies */}
                      {hasPrediction && (
                        <div className="rm-summary">
                          {d.predicted !== '' && (
                            <div className="rm-summary-chip" style={{ background: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}>
                              <TrendingUp size={13}/> {Number(d.predicted).toLocaleString()} {rm.unit} prévus
                            </div>
                          )}
                          {d.recommended !== '' && (
                            <div className="rm-summary-chip" style={{ background: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)', color: '#34d399' }}>
                              <ShoppingCart size={13}/> {Number(d.recommended).toLocaleString()} {rm.unit} à commander
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer info */}
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem',
              background: 'rgba(245,158,11,0.05)', borderRadius: '10px',
              border: '1px solid rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Brain size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#f59e0b' }}>Prévisions à venir :</strong> Ces champs accueilleront les prédictions réelles générées par le modèle IA
                entraîné sur l'historique de consommation par matière première.
                Pour l'instant, les valeurs peuvent être saisies manuellement après analyse.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Grille principale ── */}
      <div className="dashboard-grid">

        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section className="dashboard-section">
            <h2 className="section-header"><BarChart3 size={24} color="#6366f1" /> Production par Mois</h2>
            <p className="section-description">Volume de production enregistré par mois.</p>
            {productionData.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucune production enregistrée.</p>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                    <Area type="monotone" dataKey="quantity" stroke="#6366f1" fillOpacity={1} fill="url(#colorProd)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="dashboard-section">
            <h2 className="section-header"><PieChartIcon size={24} color="#34d399" /> Répartition du Stock par Entrepôt</h2>
            <p className="section-description">Distribution des quantités disponibles par entrepôt.</p>
            {stockData.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun stock enregistré.</p>
            ) : (
              <>
                <div className="chart-container" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stockData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                        {stockData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  {stockData.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }} />
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{e.name} ({e.value.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <section className="dashboard-section" style={{ height: '100%' }}>
            <h2 className="section-header"><Activity size={24} color="#f472b6" /> Mouvements Récents</h2>
            <p className="section-description">Les 5 derniers mouvements de stock enregistrés.</p>
            <div className="recent-movements">
              {recentMovements.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun mouvement enregistré.</p>
              ) : (
                recentMovements.map((move) => {
                  const meta     = MOVEMENT_LABELS[move.type] || { label: move.type || 'Mouvement', dir: 'neutral' };
                  const qtyClass = meta.dir === 'in' ? 'qty-in' : meta.dir === 'out' ? 'qty-out' : 'qty-neutral';
                  return (
                    <div className="movement-item" key={move.id}>
                      <div className="movement-info">
                        <div className={`movement-circle ${meta.dir}`} />
                        <div className="movement-details">
                          <h4>{meta.label} — {move.product?.name || `#${move.id}`}</h4>
                          <p>{move.date ? new Date(move.date).toLocaleDateString('fr-FR') : 'Récent'}</p>
                        </div>
                      </div>
                      <div className={`movement-quantity ${qtyClass}`}>
                        {meta.dir === 'in' ? '+' : meta.dir === 'out' ? '−' : ''}
                        {(move.quantity ?? 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
