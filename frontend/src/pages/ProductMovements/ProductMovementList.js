import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Search, X, Filter, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import ProductMovementService from '../../services/productMovementService';
import ImportService from '../../services/importService';
import Pagination from '../../components/Pagination/Pagination';

const PAGE_SIZE_DEFAULT = 10;

const MOV_TYPES = ['PO', 'WO', 'SO', 'VNP', 'TR', 'TSS'];

const TYPE_COLOR = {
  PO:  { bg:'rgba(16,185,129,0.12)',  color:'#10b981' },
  WO:  { bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
  SO:  { bg:'rgba(239,68,68,0.12)',   color:'#ef4444' },
  VNP: { bg:'rgba(249,115,22,0.12)', color:'#f97316' },
  TR:  { bg:'rgba(14,165,233,0.12)', color:'#0ea5e9' },
  TSS: { bg:'rgba(139,92,246,0.12)', color:'#8b5cf6' },
};

const ProductMovementList = () => {
  const [movements,    setMovements]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(PAGE_SIZE_DEFAULT);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchMovements(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, typeFilter]);

  const fetchMovements = async () => {
    try {
      const response = await ProductMovementService.getAll();
      setMovements(response.data);
    } catch (error) {
      console.error('Error fetching product movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const res = await ImportService.importProductMovements(file);
      setImportResult({ type: 'success', message: res.data.message, errors: res.data.errors || [] });
      fetchMovements();
    } catch (err) {
      const detail = err?.response?.data?.error || err.message || 'Erreur inconnue.';
      setImportResult({ type: 'error', message: detail, errors: [] });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce mouvement ?')) {
      try {
        await ProductMovementService.delete(id);
        setMovements(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting product movement:', error);
      }
    }
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = movements.filter(m => {
    const matchQ = !q
      || m.product?.name?.toLowerCase().includes(q)
      || m.product?.code?.toLowerCase().includes(q)
      || m.type?.toLowerCase().includes(q)
      || String(m.id).includes(q);
    const matchType = !typeFilter || m.type === typeFilter;
    return matchQ && matchType;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <div className="page-loading">Chargement…</div>;

  return (
    <div>
      <div className="page-title">
        Product Movements
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Bouton Import from Excel */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem',
              fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer',
              background: importing ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.35)',
              color: '#34d399', opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? (
              <>
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(52,211,153,0.3)',
                  borderTopColor: '#34d399', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Importing…
              </>
            ) : (
              <><FileUp size={16} /> Import from Excel</>
            )}
          </button>
          <input
            type="file" accept=".xlsx,.xls"
            ref={fileInputRef} onChange={handleImportExcel}
            style={{ display: 'none' }}
          />

          {/* Bouton Add Movement */}
          <Link to="/product-movements/new" className="btn btn-primary"
                style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Movement
          </Link>
        </div>
      </div>

      {/* ── Feedback import ─────────────────────────────────────────────── */}
      {importResult && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
          padding: '0.85rem 1.1rem', borderRadius: 10, marginBottom: '0.75rem',
          background: importResult.type === 'success'
            ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${importResult.type === 'success'
            ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
        }}>
          {importResult.type === 'success'
            ? <CheckCircle2 size={17} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
            : <AlertTriangle size={17} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />}
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: '0.87rem', fontWeight: 600,
              color: importResult.type === 'success' ? '#34d399' : '#f87171',
            }}>
              {importResult.message}
            </span>
            {importResult.errors?.length > 0 && (
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem',
                           fontSize: '0.78rem', color: '#94a3b8' }}>
                {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
          <button onClick={() => setImportResult(null)}
            style={{ background: 'none', border: 'none', color: '#64748b',
                     cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="card">
        {/* ── Barre recherche + filtres type ─────────────────────────────── */}
        <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)',
                      display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px',
                        background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                        borderRadius:'10px', padding:'7px 12px', flex:1, maxWidth:'340px' }}>
            <Search size={15} style={{ color:'#64748b', flexShrink:0 }} />
            <input
              style={{ background:'none', border:'none', outline:'none', color:'#f1f5f9', fontSize:'0.85rem', width:'100%' }}
              placeholder="Produit, code, ID…"
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

          {/* Pills type mouvement */}
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', alignItems:'center' }}>
            <Filter size={13} style={{ color:'#64748b' }} />
            <button
              onClick={() => setTypeFilter('')}
              style={{ padding:'4px 12px', borderRadius:'16px', fontSize:'0.78rem', cursor:'pointer',
                       border:'1px solid', transition:'all 0.15s',
                       borderColor: !typeFilter ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
                       background: !typeFilter ? 'rgba(99,102,241,0.15)' : 'transparent',
                       color: !typeFilter ? '#818cf8' : '#94a3b8', fontWeight: !typeFilter ? 600 : 'normal' }}>
              Tous
            </button>
            {MOV_TYPES.map(t => (
              <button key={t}
                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                style={{ padding:'4px 12px', borderRadius:'16px', fontSize:'0.78rem', cursor:'pointer',
                         border:'1px solid', transition:'all 0.15s',
                         borderColor: typeFilter === t ? (TYPE_COLOR[t]?.color + '88') : 'rgba(255,255,255,0.1)',
                         background: typeFilter === t ? TYPE_COLOR[t]?.bg : 'transparent',
                         color: typeFilter === t ? TYPE_COLOR[t]?.color : '#94a3b8',
                         fontWeight: typeFilter === t ? 600 : 'normal' }}>
                {t}
              </button>
            ))}
          </div>

          <span style={{ fontSize:'0.8rem', color:'#64748b', marginLeft:'auto' }}>
            {filtered.length} mouvement{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tableau ────────────────────────────────────────────────────── */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                    {search || typeFilter ? 'Aucun résultat.' : 'Aucun mouvement trouvé.'}
                  </td>
                </tr>
              ) : (
                paginated.map(movement => {
                  const tc = TYPE_COLOR[movement.type] || { bg:'rgba(99,102,241,0.12)', color:'#818cf8' };
                  return (
                    <tr key={movement.id}>
                      <td>{movement.id}</td>
                      <td><span className="badge badge-blue">{movement.product?.code}</span></td>
                      <td>{movement.product?.name}</td>
                      <td>
                        <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:'10px',
                                       fontSize:'0.78rem', fontWeight:700,
                                       background: tc.bg, color: tc.color }}>
                          {movement.type}
                        </span>
                      </td>
                      <td>{movement.quantity}</td>
                      <td>{movement.date}</td>
                      <td>
                        <div style={{ display:'flex', gap:'0.5rem' }}>
                          <Link to={`/product-movements/${movement.id}/detail`} className="btn btn-primary">
                            <Eye size={16}/> Details
                          </Link>
                          <Link to={`/product-movements/edit/${movement.id}`} className="btn btn-secondary">
                            <Edit size={16}/>
                          </Link>
                          <button onClick={() => handleDelete(movement.id)} className="btn btn-danger">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
};

export default ProductMovementList;
