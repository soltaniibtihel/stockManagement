import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, AlertCircle, CheckCircle, Brain, Search, X, AlertTriangle } from 'lucide-react';
import StockService from '../../services/stockService';
import ImportService from '../../services/importService';
import StockDashboards from './StockDashboards';
import StockAiAssistant from './StockAiAssistant';
import Pagination from '../../components/Pagination/Pagination';

const PAGE_SIZE_DEFAULT = 10;

const StockList = () => {
  const [stocks,      setStocks]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [importStatus, setImportStatus] = useState(null);
  const [selectedStockForAi, setSelectedStockForAi] = useState(null);
  const [search,      setSearch]      = useState('');
  const [onlyAlert,   setOnlyAlert]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(PAGE_SIZE_DEFAULT);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchStocks(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, onlyAlert]);

  const fetchStocks = async () => {
    try {
      const response = await StockService.getAll();
      setStocks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setImportStatus(null);
    try {
      const response = await ImportService.importStocks(file);
      setImportStatus({ type: 'success', message: response.data.message });
      fetchStocks();
    } catch (error) {
      setImportStatus({ type: 'error', message: error.response?.data?.error || 'Échec import.' });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer cette entrée stock ?')) {
      try {
        await StockService.delete(id);
        setStocks(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting stock:', error);
      }
    }
  };

  const isLow = s =>
    s.safetyStock != null && s.quantityAvailable != null
    && s.quantityAvailable < s.safetyStock;

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = stocks.filter(s => {
    const matchQ = !q
      || s.product?.name?.toLowerCase().includes(q)
      || s.warehouse?.name?.toLowerCase().includes(q);
    const matchAlert = !onlyAlert || isLow(s);
    return matchQ && matchAlert;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const alertCount = stocks.filter(isLow).length;

  if (loading && stocks.length === 0) return <div className="page-loading">Chargement…</div>;

  return (
    <div>
      <div className="page-title">
        Stock Management &amp; Analysis
        <div style={{ display:'flex', gap:'1rem', marginLeft:'auto' }}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange}
                 style={{ display:'none' }} accept=".xlsx,.xls" />
          <button onClick={() => fileInputRef.current.click()} className="btn btn-secondary"
                  style={{ fontSize:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}
                  disabled={loading}>
            <Upload size={18} /> Import Excel
          </button>
          <Link to="/stocks/new" className="btn btn-primary"
                style={{ fontSize:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Plus size={18} /> Add Stock
          </Link>
        </div>
      </div>

      {importStatus && (
        <div className={`alert ${importStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`}
             style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          {importStatus.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
          {importStatus.message}
        </div>
      )}

      <StockDashboards stocks={stocks} />

      <div className="card">
        {/* ── Barre recherche + filtre alerte ────────────────────────────── */}
        <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)',
                      display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px',
                        background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                        borderRadius:'10px', padding:'7px 12px', flex:1, maxWidth:'360px' }}>
            <Search size={15} style={{ color:'#64748b', flexShrink:0 }} />
            <input
              style={{ background:'none', border:'none', outline:'none', color:'#f1f5f9', fontSize:'0.85rem', width:'100%' }}
              placeholder="Produit, entrepôt…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')}
                      style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <X size={14}/>
              </button>
            )}
          </div>

          {/* Toggle stock sous seuil */}
          <button
            onClick={() => setOnlyAlert(v => !v)}
            style={{
              display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px',
              borderRadius:'10px', border:'1px solid',
              borderColor: onlyAlert ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
              background: onlyAlert ? 'rgba(239,68,68,0.12)' : 'transparent',
              color: onlyAlert ? '#f87171' : '#94a3b8',
              fontSize:'0.82rem', cursor:'pointer', transition:'all 0.2s'
            }}
          >
            <AlertTriangle size={14}/>
            Sous seuil
            {alertCount > 0 && (
              <span style={{ background:'rgba(239,68,68,0.2)', borderRadius:'8px',
                             padding:'1px 7px', fontSize:'0.72rem', color:'#f87171' }}>
                {alertCount}
              </span>
            )}
          </button>

          <span style={{ fontSize:'0.8rem', color:'#64748b', marginLeft:'auto' }}>
            {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tableau ────────────────────────────────────────────────────── */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Safety</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                    {search || onlyAlert ? 'Aucun résultat.' : 'Aucun stock trouvé.'}
                  </td>
                </tr>
              ) : (
                paginated.map(stock => (
                  <tr key={stock.id} style={isLow(stock) ? { background:'rgba(239,68,68,0.04)' } : {}}>
                    <td>{stock.id}</td>
                    <td>{stock.product?.name || '-'}</td>
                    <td><span className="badge badge-blue">{stock.warehouse?.name || '-'}</span></td>
                    <td style={{ color: isLow(stock) ? '#f87171' : 'inherit', fontWeight: isLow(stock) ? 600 : 'normal' }}>
                      {stock.quantityAvailable}
                    </td>
                    <td>{stock.safetyStock}</td>
                    <td>{stock.reorderPoint}</td>
                    <td>
                      {isLow(stock)
                        ? <span style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'0.78rem',
                                         color:'#f87171', background:'rgba(239,68,68,0.12)',
                                         padding:'2px 8px', borderRadius:'8px', width:'fit-content' }}>
                            <AlertTriangle size={12}/> Alerte
                          </span>
                        : <span style={{ fontSize:'0.78rem', color:'#10b981' }}>OK</span>
                      }
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        <Link to={`/stocks/edit/${stock.id}`} className="btn btn-secondary">
                          <Edit size={16}/>
                        </Link>
                        <button onClick={() => setSelectedStockForAi(stock)} className="btn btn-primary"
                                style={{ background:'linear-gradient(135deg,#a78bfa 0%,#6366f1 100%)', border:'none' }}
                                title="AI Insight">
                          <Brain size={16}/>
                        </button>
                        <button onClick={() => handleDelete(stock.id)} className="btn btn-danger">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      {selectedStockForAi && (
        <StockAiAssistant stock={selectedStockForAi} onClose={() => setSelectedStockForAi(null)} />
      )}
    </div>
  );
};

export default StockList;
