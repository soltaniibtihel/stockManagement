import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, X, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import ProductService from '../../services/productService';
import ImportService from '../../services/importService';
import Pagination from '../../components/Pagination/Pagination';

const PAGE_SIZE_DEFAULT = 10;

const TYPE_STYLE = {
  RAW_MATERIAL:     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '🧪 Matière 1ère' },
  FINISHED_PRODUCT: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: '📦 Produit Fini' },
  SEMI_FINISHED:    { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', label: '⚙️ Semi-Fini' },
  PACKAGING:        { bg: 'rgba(167,139,250,0.15)',color: '#a78bfa', label: '🗃️ Emballage' },
  BY_PRODUCT:       { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: '♻️ Sous-Produit' },
};

const ProductList = () => {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(PAGE_SIZE_DEFAULT);

  // ── Import Excel ──────────────────────────────────────────────────────────
  const [importing,     setImporting]     = useState(false);
  const [importResult,  setImportResult]  = useState(null); // { type:'success'|'error', message, errors:[] }
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProducts(); }, []);
  // Réinitialise la page quand la recherche change
  useEffect(() => { setCurrentPage(1); }, [search]);

  const fetchProducts = async () => {
    try {
      const response = await ProductService.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Réinitialise l'input pour pouvoir réimporter le même fichier si besoin
    e.target.value = '';

    setImporting(true);
    setImportResult(null);
    try {
      const res = await ImportService.importProducts(file);
      const { message, errors } = res.data;
      setImportResult({ type: 'success', message, errors: errors || [] });
      // Recharger la liste pour afficher les nouveaux produits
      fetchProducts();
    } catch (err) {
      const detail = err?.response?.data?.error || err.message || 'Erreur inconnue.';
      setImportResult({ type: 'error', message: detail, errors: [] });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce produit ?')) {
      try {
        await ProductService.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState('');

  const q = search.toLowerCase();
  const filtered = products.filter(p => {
    const matchQ = !q
      || p.name?.toLowerCase().includes(q)
      || p.code?.toLowerCase().includes(q)
      || p.description?.toLowerCase().includes(q)
      || p.category?.name?.toLowerCase().includes(q)
      || p.unit?.toLowerCase().includes(q);
    const matchType = !typeFilter || p.productType === typeFilter;
    return matchQ && matchType;
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages  = Math.ceil(filtered.length / pageSize);
  const paginated   = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <div className="page-loading">Chargement…</div>;

  return (
    <div>
      <div className="page-title">
        Products
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
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (!importing) e.currentTarget.style.background = 'rgba(52,211,153,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = importing ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.12)'; }}
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

          {/* Bouton Add Product */}
          <Link to="/products/new" className="btn btn-primary"
                style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Product
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
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
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
        {/* ── Barre de recherche ────────────────────────────────────────── */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                      display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px',
                        background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                        borderRadius:'10px', padding:'7px 12px', flex:1, maxWidth:'400px' }}>
            <Search size={15} style={{ color:'#64748b', flexShrink:0 }} />
            <input
              style={{ background:'none', border:'none', outline:'none', color:'#f1f5f9',
                       fontSize:'0.85rem', width:'100%' }}
              placeholder="Rechercher par nom, code, catégorie…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')}
                      style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer',
                               display:'flex', alignItems:'center' }}>
                <X size={14} />
              </button>
            )}
          </div>
          {/* Filtres par type */}
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            <button onClick={() => setTypeFilter('')}
              style={{ padding:'4px 10px', borderRadius:'14px', fontSize:'0.76rem', cursor:'pointer', border:'1px solid',
                borderColor: !typeFilter ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
                background: !typeFilter ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: !typeFilter ? '#818cf8' : '#94a3b8', fontWeight: !typeFilter ? 600 : 'normal' }}>
              Tous
            </button>
            {Object.entries(TYPE_STYLE).map(([k, v]) => (
              <button key={k} onClick={() => setTypeFilter(typeFilter === k ? '' : k)}
                style={{ padding:'4px 10px', borderRadius:'14px', fontSize:'0.76rem', cursor:'pointer', border:'1px solid',
                  borderColor: typeFilter === k ? v.color + '88' : 'rgba(255,255,255,0.1)',
                  background: typeFilter === k ? v.bg : 'transparent',
                  color: typeFilter === k ? v.color : '#94a3b8', fontWeight: typeFilter === k ? 600 : 'normal' }}>
                {v.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize:'0.8rem', color:'#64748b', marginLeft:'auto' }}>
            {filtered.length} produit{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tableau ────────────────────────────────────────────────────── */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Type</th>
                <th>Name</th>
                <th>Description</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Stock Qty</th>
                <th>Safety Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>
                    {search ? 'Aucun résultat pour « ' + search + ' »' : 'Aucun produit trouvé.'}
                  </td>
                </tr>
              ) : (
                paginated.map(product => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td><span className="badge badge-blue">{product.code}</span></td>
                    <td>
                      {(() => {
                        const ts = TYPE_STYLE[product.productType] || TYPE_STYLE.FINISHED_PRODUCT;
                        return (
                          <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'10px',
                            fontSize:'0.75rem', fontWeight:600, background: ts.bg, color: ts.color, whiteSpace:'nowrap' }}>
                            {ts.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td>{product.name}</td>
                    <td style={{ maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {product.description || '-'}
                    </td>
                    <td>{product.category?.name || '-'}</td>
                    <td>{product.unit}</td>
                    <td>{product.stockQuantity || 0}</td>
                    <td>{product.safetyStock || 0}</td>
                    <td>
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        <Link to={`/products/edit/${product.id}`} className="btn btn-secondary">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(product.id)} className="btn btn-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
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

export default ProductList;
