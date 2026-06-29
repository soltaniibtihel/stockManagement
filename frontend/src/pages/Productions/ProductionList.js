import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Edit, Trash2, Upload, Download, RefreshCw,
  CheckCircle2, Clock, Brain, AlertTriangle, FileSpreadsheet,
  ChevronDown, ChevronUp, Package
} from 'lucide-react';
import ProductionService from '../../services/productionService';
import ImportService    from '../../services/importService';
import mlService        from '../../services/mlService';
import axios            from 'axios';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtQty = (n) => (n ?? 0).toLocaleString('fr-FR');

const STATUS_META = {
  REALISEE: { label: 'Réalisée', color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: <CheckCircle2 size={13}/> },
  PLANIFIEE: { label: 'Planifiée', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: <Clock size={13}/> },
};

const Badge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.PLANIFIEE;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'4px',
      padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600,
      color: m.color, background: m.bg, border:`1px solid ${m.color}40`
    }}>
      {m.icon} {m.label}
    </span>
  );
};

// ─── template Excel téléchargeable ──────────────────────────────────────────
const downloadTemplate = () => {
  const header = 'nom_produit\tdate\tquantite\tstock_destination\toperateur\tnotes\n';
  const example = 'bottle\t2026-01-15\t500\toil\tAdmin\tProduction janvier\n';
  const blob = new Blob([header + example], { type: 'text/tab-separated-values' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href=url; a.download='template_productions.tsv'; a.click();
  URL.revokeObjectURL(url);
};

// ────────────────────────────────────────────────────────────────────────────

const ProductionList = () => {
  const navigate = useNavigate();

  const [productions,    setProductions]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('all');      // all | realisee | planifiee

  // Import
  const [importing,      setImporting]      = useState(false);
  const [importResult,   setImportResult]   = useState(null);
  const importRef = useRef(null);

  // AI panel
  const [aiOpen,         setAiOpen]         = useState(false);
  const [aiPlan,         setAiPlan]         = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);
  const [aiError,        setAiError]        = useState(null);

  // ── fetch productions ──────────────────────────────────────────────────
  const fetchProductions = async () => {
    setLoading(true);
    try {
      const res = await ProductionService.getAll();
      setProductions(res.data || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProductions(); }, []);

  // ── delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette production ?')) return;
    try {
      await ProductionService.delete(id);
      setProductions(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error(e); }
  };

  // ── import Excel ───────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await ImportService.importProductions(file);
      setImportResult({ success: true, ...res.data });
      await fetchProductions();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Erreur inconnue';
      setImportResult({ success: false, message: msg });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // ── AI plan ────────────────────────────────────────────────────────────
  const loadAiPlan = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await axios.get('http://127.0.0.1:8001/inventory-plan', {
        params: { horizon_months: 6 }
      });
      setAiPlan(res.data);
    } catch (e) {
      // fallback: try via Java
      try {
        const res2 = await mlService.predictYear();
        setAiPlan({ _fallback: true, prediction: res2.data });
      } catch {
        setAiError("Service ML indisponible. Démarrez le serveur Python (port 8001).");
      }
    } finally { setAiLoading(false); }
  };

  const handleToggleAi = () => {
    const next = !aiOpen;
    setAiOpen(next);
    if (next && !aiPlan && !aiLoading) loadAiPlan();
  };

  // Pré-remplir le formulaire avec une recommandation IA
  const handlePlanify = (productCode, qty, notes) => {
    navigate('/productions/new', {
      state: { prefill: { productCode, producedQuantity: Math.ceil(qty), notes, status: 'PLANIFIEE' } }
    });
  };

  // ── filtered list ──────────────────────────────────────────────────────
  const filtered = productions.filter(p => {
    if (activeTab === 'all') return true;
    return (p.status || 'PLANIFIEE') === activeTab.toUpperCase();
  });

  const countRealisee  = productions.filter(p => (p.status||'PLANIFIEE') === 'REALISEE').length;
  const countPlanifiee = productions.filter(p => (p.status||'PLANIFIEE') === 'PLANIFIEE').length;

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container" style={{ padding: '1.5rem' }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 className="page-title" style={{ color:'white', margin:0 }}>Productions</h1>
          <p style={{ color:'#94a3b8', marginTop:'0.3rem', fontSize:'0.9rem' }}>
            Gérez les productions réalisées et planifiées.
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>

          {/* Télécharger template */}
          <button className="btn btn-secondary" onClick={downloadTemplate} title="Télécharger le modèle Excel">
            <Download size={16}/> Modèle Excel
          </button>

          {/* Import Excel */}
          <input ref={importRef} type="file" accept=".xlsx,.xls,.tsv,.csv" style={{ display:'none' }} onChange={handleImportFile}/>
          <button
            className="btn btn-secondary"
            onClick={() => importRef.current?.click()}
            disabled={importing}
            title="Importer productions réalisées depuis Excel"
          >
            {importing ? <RefreshCw size={16} className="spinner"/> : <Upload size={16}/>}
            {importing ? 'Import…' : 'Importer Excel'}
          </button>

          {/* Recommandations IA */}
          <button
            className="btn btn-secondary"
            onClick={handleToggleAi}
            style={{ border:'1px solid rgba(167,139,250,0.4)', color:'#a78bfa' }}
          >
            <Brain size={16}/> Recommandations IA {aiOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>

          {/* Nouvelle production manuelle */}
          <Link to="/productions/new" className="btn btn-primary">
            <Plus size={16}/> Nouvelle production
          </Link>
        </div>
      </div>

      {/* ── Import result banner ── */}
      {importResult && (
        <div
          className="dashboard-section"
          style={{ marginBottom:'1rem', padding:'1rem 1.25rem', background: importResult.success ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${importResult.success ? '#34d39940' : '#f8717140'}` }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            {importResult.success
              ? <CheckCircle2 size={20} color="#34d399"/>
              : <AlertTriangle size={20} color="#f87171"/>}
            <div>
              <p style={{ margin:0, fontWeight:600, color: importResult.success ? '#34d399' : '#f87171' }}>
                {importResult.message || (importResult.success ? 'Import réussi' : 'Import échoué')}
              </p>
              {importResult.errors?.length > 0 && (
                <ul style={{ margin:'0.5rem 0 0 1rem', color:'#f87171', fontSize:'0.8rem' }}>
                  {importResult.errors.slice(0,5).map((e,i) => <li key={i}>{e}</li>)}
                  {importResult.errors.length > 5 && <li>…et {importResult.errors.length-5} autre(s) erreur(s)</li>}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Recommendations panel ── */}
      {aiOpen && (
        <div className="dashboard-section" style={{ marginBottom:'1.5rem', padding:'1.25rem', border:'1px solid rgba(167,139,250,0.3)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
            <Brain size={20} color="#a78bfa"/>
            <h3 style={{ margin:0, color:'#a78bfa' }}>Recommandations IA — Plan de production</h3>
            <button onClick={loadAiPlan} disabled={aiLoading} style={{ marginLeft:'auto', background:'none', border:'1px solid rgba(167,139,250,0.3)', borderRadius:'8px', padding:'4px 12px', color:'#a78bfa', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
              <RefreshCw size={14} className={aiLoading ? 'spinner' : ''}/> Actualiser
            </button>
          </div>

          {aiLoading && <p style={{ color:'#94a3b8' }}>Calcul des recommandations…</p>}
          {aiError   && <p style={{ color:'#f87171' }}><AlertTriangle size={14}/> {aiError}</p>}

          {aiPlan && !aiPlan._fallback && (
            <>
              {/* Summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:'0.75rem', marginBottom:'1.25rem' }}>
                {[
                  { label:'Produits analysés', val: aiPlan.summary?.total_products, color:'#60a5fa' },
                  { label:'Critiques 🔴', val: aiPlan.summary?.CRITIQUE, color:'#f87171' },
                  { label:'À commander 🟡', val: aiPlan.summary?.COMMANDER_MAINTENANT, color:'#fbbf24' },
                  { label:'À planifier 🟠', val: aiPlan.summary?.PLANIFIER, color:'#fb923c' },
                  { label:'OK ✅', val: aiPlan.summary?.OK, color:'#34d399' },
                ].map(k => (
                  <div key={k.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'0.75rem', textAlign:'center' }}>
                    <p style={{ margin:0, fontSize:'1.4rem', fontWeight:700, color:k.color }}>{k.val ?? 0}</p>
                    <p style={{ margin:0, fontSize:'0.72rem', color:'#94a3b8' }}>{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Products needing action */}
              {aiPlan.products?.filter(p => p.status !== 'OK').length === 0
                ? <p style={{ color:'#34d399' }}>✅ Tous les niveaux sont satisfaisants.</p>
                : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    {aiPlan.products.filter(p => p.status !== 'OK').map((p, i) => {
                      const urgent = p.status === 'CRITIQUE' || p.status === 'COMMANDER_MAINTENANT';
                      const color  = p.status === 'CRITIQUE' ? '#f87171' : p.status === 'COMMANDER_MAINTENANT' ? '#fbbf24' : '#fb923c';
                      const qty    = p.mouvement_achat?.quantity_to_order ?? 0;
                      const delivery = p.mouvement_achat?.estimated_delivery ?? '?';
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'1rem', background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'0.85rem 1rem', border:`1px solid ${color}30` }}>
                          <Package size={18} color={color}/>
                          <div style={{ flex:1 }}>
                            <p style={{ margin:0, fontWeight:600, color:'#f1f5f9' }}>{p.product_code}</p>
                            <p style={{ margin:0, fontSize:'0.78rem', color:'#94a3b8' }}>
                              Statut : <span style={{ color }}>{p.status}</span>
                              {qty > 0 && ` · À produire : ${Math.ceil(qty).toLocaleString('fr-FR')} unités`}
                              {delivery !== '?' && ` · Avant : ${delivery}`}
                            </p>
                          </div>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize:'0.78rem', padding:'5px 12px', background: urgent ? 'linear-gradient(135deg,#f87171,#fb923c)' : undefined }}
                            onClick={() => handlePlanify(p.product_code, qty, `Recommandation IA — statut ${p.status}`)}
                          >
                            <Plus size={13}/> Planifier
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </>
          )}

          {/* Fallback: simple predict-year */}
          {aiPlan?._fallback && aiPlan.prediction && (
            <div>
              <p style={{ color:'#94a3b8', marginBottom:'0.75rem' }}>
                ℹ️ Plan d'inventaire détaillé indisponible. Prévision annuelle globale :
              </p>
              <p style={{ color:'#a78bfa', fontWeight:700, fontSize:'1.1rem' }}>
                {aiPlan.prediction.predicted_demand_next_year?.toLocaleString('fr-FR')} unités — {aiPlan.prediction.forecast_year}
              </p>
              <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>
                Stock recommandé : {aiPlan.prediction.recommended_stock_next_year?.toLocaleString('fr-FR')} unités
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop:'0.75rem' }}
                onClick={() => handlePlanify('', aiPlan.prediction.recommended_stock_next_year, 'Recommandation IA — prévision annuelle')}
              >
                <Plus size={14}/> Créer une production planifiée
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── KPI ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total', val: productions.length, color:'#60a5fa', bg:'rgba(96,165,250,0.1)' },
          { label:'Réalisées ✅', val: countRealisee,  color:'#34d399', bg:'rgba(52,211,153,0.1)' },
          { label:'Planifiées 🕐', val: countPlanifiee, color:'#a78bfa', bg:'rgba(167,139,250,0.1)' },
        ].map(k => (
          <div key={k.label} className="dashboard-section" style={{ padding:'1rem', background:k.bg, textAlign:'center' }}>
            <p style={{ margin:0, fontSize:'1.8rem', fontWeight:700, color:k.color }}>{k.val}</p>
            <p style={{ margin:0, fontSize:'0.8rem', color:'#94a3b8' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
        {[
          { key:'all',      label:`Toutes (${productions.length})` },
          { key:'realisee', label:`Réalisées (${countRealisee})` },
          { key:'planifiee',label:`Planifiées (${countPlanifiee})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding:'6px 16px', borderRadius:'20px', border:'1px solid',
              borderColor: activeTab===t.key ? '#a78bfa' : 'rgba(255,255,255,0.1)',
              background: activeTab===t.key ? 'rgba(167,139,250,0.15)' : 'transparent',
              color: activeTab===t.key ? '#a78bfa' : '#94a3b8',
              cursor:'pointer', fontSize:'0.85rem', fontWeight: activeTab===t.key ? 600 : 400,
              transition:'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="dashboard-section" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>
            <RefreshCw size={24} className="spinner" style={{ margin:'0 auto 0.5rem', display:'block' }}/>
            Chargement…
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Opérateur</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign:'center', color:'#94a3b8', padding:'2rem' }}>
                      Aucune production trouvée.
                    </td>
                  </tr>
                ) : filtered.map(prod => (
                  <tr key={prod.id}>
                    <td style={{ color:'#64748b', fontSize:'0.8rem' }}>{prod.id}</td>
                    <td><Badge status={prod.status || 'PLANIFIEE'}/></td>
                    <td>{fmt(prod.productionDate)}</td>
                    <td style={{ fontWeight:500 }}>{prod.product?.name || '—'}</td>
                    <td style={{ fontWeight:700, color:'#60a5fa' }}>{fmtQty(prod.producedQuantity)}</td>
                    <td>{prod.user ? `${prod.user.firstName} ${prod.user.lastName}` : '—'}</td>
                    <td style={{ color:'#94a3b8', fontSize:'0.82rem', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {prod.notes || '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'0.4rem' }}>
                        <Link to={`/productions/edit/${prod.id}`} className="btn btn-secondary" style={{ padding:'5px 10px' }}>
                          <Edit size={14}/>
                        </Link>
                        <button onClick={() => handleDelete(prod.id)} className="btn btn-danger" style={{ padding:'5px 10px' }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Format Excel hint ── */}
      <div style={{ marginTop:'1rem', padding:'0.85rem 1.25rem', background:'rgba(255,255,255,0.03)', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ margin:0, fontSize:'0.8rem', color:'#64748b' }}>
          <FileSpreadsheet size={13} style={{ verticalAlign:'middle', marginRight:'6px' }}/>
          <strong style={{ color:'#94a3b8' }}>Format d'import Excel :</strong>{' '}
          Colonnes : <code style={{ color:'#a78bfa' }}>nom_produit | date | quantite | stock_destination | operateur | notes</code>
          {' '}— Téléchargez le modèle pour commencer.
        </p>
      </div>

    </div>
  );
};

export default ProductionList;
