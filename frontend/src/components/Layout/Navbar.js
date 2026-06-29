import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Search, LogOut, X, Package, ArrowLeftRight,
  Factory, Warehouse, Store, BarChart2, ChevronDown,
  Filter, AlertTriangle, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import searchService from '../../services/searchService';
import './Navbar.css';

// ── Icônes par type d'entité ────────────────────────────────────────────────
const TYPE_ICON = {
  PRODUCT:    <Package    size={15} />,
  MOVEMENT:   <ArrowLeftRight size={15} />,
  PRODUCTION: <Factory    size={15} />,
  WAREHOUSE:  <Warehouse  size={15} />,
  SHOWCASE:   <Store      size={15} />,
  STOCK:      <BarChart2  size={15} />,
};

const TYPE_LABEL = {
  ALL:        'Tout',
  PRODUCT:    'Produits',
  MOVEMENT:   'Mouvements',
  PRODUCTION: 'Productions',
  WAREHOUSE:  'Entrepôts',
  SHOWCASE:   'Galerie',
  STOCK:      'Stocks',
};

const TYPE_COLOR = {
  PRODUCT:    '#6366f1',
  MOVEMENT:   '#0ea5e9',
  PRODUCTION: '#f59e0b',
  WAREHOUSE:  '#10b981',
  SHOWCASE:   '#f59e0b',
  STOCK:      '#8b5cf6',
};

const BADGE_COLOR = {
  PO: '#10b981', WO: '#f59e0b', SO: '#ef4444',
  VNP: '#f97316', TR: '#0ea5e9', TSS: '#8b5cf6',
  REALISEE: '#10b981', PLANIFIEE: '#64748b',
  'Produit': '#6366f1', 'Entrepôt': '#10b981',
  'Stock': '#8b5cf6', '⚠ Alerte': '#ef4444',
};

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Composant principal ──────────────────────────────────────────────────────
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── État recherche ─────────────────────────────────────────────────────────
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState([]);
  const [total,    setTotal]    = useState(0);

  // ── Filtres avancés (panneau optionnel) ────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter,  setTypeFilter]  = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [movTypeFilter, setMovTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStock,    setLowStock]    = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const containerRef   = useRef(null);
  const inputRef       = useRef(null);

  // ── Fermer au clic extérieur ou Escape ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setShowFilters(false);
      }
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') { setOpen(false); setShowFilters(false); }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  // ── Déclencher la recherche ───────────────────────────────────────────────
  const hasFilters = typeFilter !== 'ALL' || statusFilter || movTypeFilter
                  || categoryFilter || lowStock;

  const doSearch = useCallback(async () => {
    const needSearch = debouncedQuery.length >= 2 || hasFilters;
    if (!needSearch) { setResults([]); setTotal(0); return; }

    setLoading(true);
    try {
      const res = await searchService.search({
        q:        debouncedQuery,
        type:     typeFilter,
        status:   statusFilter,
        movType:  movTypeFilter,
        category: categoryFilter,
        lowStock: lowStock,
      });
      setResults(res.data.results || []);
      setTotal(res.data.total || 0);
      setOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, typeFilter, statusFilter, movTypeFilter, categoryFilter, lowStock, hasFilters]);

  useEffect(() => { doSearch(); }, [doSearch]);

  // ── Navigation sur clic résultat ──────────────────────────────────────────
  const handleSelect = (item) => {
    navigate(item.url);
    setOpen(false);
    setQuery('');
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setOpen(false);
    setTypeFilter('ALL');
    setStatusFilter('');
    setMovTypeFilter('');
    setCategoryFilter('');
    setLowStock(false);
    inputRef.current?.focus();
  };

  // ── Grouper les résultats par type ────────────────────────────────────────
  const grouped = results.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});

  const getInitials = (fn, ln) =>
    `${fn?.charAt(0) || ''}${ln?.charAt(0) || ''}`.toUpperCase() || 'U';

  const handleLogout = () => { logout(); navigate('/auth'); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <header className="navbar">

      {/* ── Barre de recherche ────────────────────────────────────────────── */}
      <div className="gs-wrapper" ref={containerRef}>
        <div className={`gs-bar ${open ? 'gs-bar--open' : ''}`}>
          <Search className="gs-icon" size={17} />

          <input
            ref={inputRef}
            className="gs-input"
            type="text"
            placeholder="Rechercher…"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
          />

          {/* Bouton filtres avancés */}
          <button
            className={`gs-filter-btn ${showFilters ? 'gs-filter-btn--active' : ''} ${hasFilters ? 'gs-filter-btn--has' : ''}`}
            title="Filtres avancés"
            onClick={() => setShowFilters(s => !s)}
          >
            <Filter size={15} />
            {hasFilters && <span className="gs-filter-dot" />}
          </button>

          {/* Clear */}
          {(query || hasFilters) && (
            <button className="gs-clear-btn" onClick={clearSearch} title="Effacer">
              <X size={15} />
            </button>
          )}

          {/* Loader */}
          {loading && <Loader size={15} className="gs-spinner" />}
        </div>

        {/* ── Panneau filtres avancés ────────────────────────────────────── */}
        {showFilters && (
          <div className="gs-filters-panel">
            <div className="gsf-row">
              <span className="gsf-label">Type</span>
              <div className="gsf-pills">
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <button
                    key={k}
                    className={`gsf-pill ${typeFilter === k ? 'gsf-pill--active' : ''}`}
                    onClick={() => setTypeFilter(k)}
                  >
                    {k !== 'ALL' && TYPE_ICON[k]} {v}
                  </button>
                ))}
              </div>
            </div>

            {(typeFilter === 'ALL' || typeFilter === 'PRODUCTION') && (
              <div className="gsf-row">
                <span className="gsf-label">Statut production</span>
                <div className="gsf-pills">
                  {['', 'REALISEE', 'PLANIFIEE'].map(s => (
                    <button key={s} className={`gsf-pill ${statusFilter === s ? 'gsf-pill--active' : ''}`}
                      onClick={() => setStatusFilter(s)}>
                      {s === '' ? 'Tous' : s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(typeFilter === 'ALL' || typeFilter === 'MOVEMENT') && (
              <div className="gsf-row">
                <span className="gsf-label">Type mouvement</span>
                <div className="gsf-pills">
                  {['', 'PO', 'WO', 'SO', 'VNP', 'TR', 'TSS'].map(m => (
                    <button key={m} className={`gsf-pill ${movTypeFilter === m ? 'gsf-pill--active' : ''}`}
                      onClick={() => setMovTypeFilter(m)}
                      style={m && BADGE_COLOR[m] ? { borderColor: BADGE_COLOR[m] + '55' } : {}}>
                      {m === '' ? 'Tous' : m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(typeFilter === 'ALL' || typeFilter === 'SHOWCASE') && (
              <div className="gsf-row">
                <span className="gsf-label">Catégorie galerie</span>
                <div className="gsf-pills">
                  {['', 'HUILE', 'MARGARINE', 'SAUCE', 'MAYONNAISE'].map(c => (
                    <button key={c} className={`gsf-pill ${categoryFilter === c ? 'gsf-pill--active' : ''}`}
                      onClick={() => setCategoryFilter(c)}>
                      {c === '' ? 'Toutes' : c.charAt(0) + c.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(typeFilter === 'ALL' || typeFilter === 'STOCK') && (
              <div className="gsf-row">
                <span className="gsf-label">Stocks</span>
                <button
                  className={`gsf-pill gsf-pill--alert ${lowStock ? 'gsf-pill--active' : ''}`}
                  onClick={() => setLowStock(s => !s)}
                >
                  <AlertTriangle size={13} /> Sous seuil uniquement
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Dropdown résultats ─────────────────────────────────────────── */}
        {open && !loading && (
          <div className="gs-dropdown">
            {results.length === 0 ? (
              <div className="gs-empty">
                <Search size={28} />
                <p>Aucun résultat trouvé</p>
                <span>Essayez un autre mot-clé ou ajustez les filtres</span>
              </div>
            ) : (
              <>
                <div className="gs-dropdown-header">
                  <span>{total} résultat{total > 1 ? 's' : ''}</span>
                  <button className="gs-close-dd" onClick={() => setOpen(false)}><X size={14}/></button>
                </div>

                {Object.entries(grouped).map(([groupType, items]) => (
                  <div key={groupType} className="gs-group">
                    <div className="gs-group-title"
                         style={{ color: TYPE_COLOR[groupType] || '#94a3b8' }}>
                      {TYPE_ICON[groupType]}
                      <span>{TYPE_LABEL[groupType] || groupType}</span>
                      <span className="gs-group-count">{items.length}</span>
                    </div>
                    {items.map(item => (
                      <button key={item.id} className="gs-result-item"
                              onClick={() => handleSelect(item)}>
                        <div className="gs-result-icon"
                             style={{ background: (TYPE_COLOR[item.type] || '#6366f1') + '22',
                                      color: TYPE_COLOR[item.type] || '#6366f1' }}>
                          {TYPE_ICON[item.type]}
                        </div>
                        <div className="gs-result-body">
                          <span className="gs-result-title"
                                dangerouslySetInnerHTML={{
                                  __html: highlight(item.title, query)
                                }} />
                          <span className="gs-result-sub">{item.subtitle}</span>
                        </div>
                        <span className="gs-result-badge"
                              style={{ background: (BADGE_COLOR[item.badge] || '#475569') + '22',
                                       color: BADGE_COLOR[item.badge] || '#94a3b8',
                                       borderColor: (BADGE_COLOR[item.badge] || '#475569') + '44' }}>
                          {item.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Actions droite ───────────────────────────────────────────────── */}
      <div className="navbar-actions">
        <button className="icon-btn" title="Notifications">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        <div className="navbar-divider"></div>

        <div className="nav-user-profile">
          <div className="nav-avatar">
            {user ? getInitials(user.firstName, user.lastName) : 'U'}
          </div>
          <div className="nav-user-info">
            <span className="nav-user-name">{user ? user.firstName : 'Admin'}</span>
          </div>
        </div>

        <button className="icon-btn logout-nav-btn" onClick={handleLogout} title="Déconnexion">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

// ── Surlignage du terme dans le titre ────────────────────────────────────────
function highlight(text, query) {
  if (!text || !query || query.length < 2) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'),
    '<mark class="gs-mark">$1</mark>');
}

export default Navbar;
