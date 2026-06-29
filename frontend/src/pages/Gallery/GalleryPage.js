import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Download, Edit2, Trash2, Upload, X, Save,
  Search, ChevronDown, Droplets, Layers, Flame, Star
} from 'lucide-react';
import showcaseService from '../../services/showcaseService';
import Pagination from '../../components/Pagination/Pagination';
import './GalleryPage.css';

const GALLERY_PAGE_SIZE_DEFAULT = 12;

// ─── Constantes ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'ALL',       label: 'Tous les produits', icon: <Star size={15}/> },
  { key: 'HUILE',     label: 'Huiles',            icon: <Droplets size={15}/> },
  { key: 'MARGARINE', label: 'Margarines',         icon: <Layers size={15}/> },
  { key: 'SAUCE',     label: 'Sauces',             icon: <Flame size={15}/> },
  { key: 'MAYONNAISE',label: 'Mayonnaises',        icon: <Star size={15}/> },
];

const CAT_GRADIENT = {
  HUILE:      'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
  MARGARINE:  'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
  SAUCE:      'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
  MAYONNAISE: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
};

const CAT_ICON = {
  HUILE:      '🫙',
  MARGARINE:  '🧈',
  SAUCE:      '🌶️',
  MAYONNAISE: '🍶',
};

const EMPTY_FORM = {
  name: '', brand: 'Jadida', category: 'HUILE',
  volume: '', description: '', imageData: null, imageType: null,
};

// ─── Composant principal ─────────────────────────────────────────────────────

const GalleryPage = () => {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('ALL');
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null); // null | 'add' | product (edit)
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [imgPreviews, setImgPreviews] = useState({});    // { productId: dataUrl }
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(GALLERY_PAGE_SIZE_DEFAULT);
  const fileRef    = useRef(null);
  const uploadRefs = useRef({});                          // refs for per-card upload

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await showcaseService.getAll();
      setProducts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtrage + pagination ──────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchCat = activeTab === 'ALL' || p.category === activeTab;
    const matchQ   = !search || p.name.toLowerCase().includes(search.toLowerCase())
                              || p.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  // Reset page when filters change
  const prevFilterKey = useRef('');
  const filterKey = activeTab + '|' + search;
  if (filterKey !== prevFilterKey.current) {
    prevFilterKey.current = filterKey;
    if (currentPage !== 1) setCurrentPage(1);
  }

  const paginatedFiltered = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ── Image helpers ──────────────────────────────────────────────────────────
  const imageUrl = (p) => {
    if (imgPreviews[p.id]) return imgPreviews[p.id];
    if (p.imageData) return `data:${p.imageType || 'image/jpeg'};base64,${p.imageData}`;
    return null;
  };

  const handleImagePick = (e, isForm = false, productId = null) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const base64  = dataUrl.split(',')[1];
      if (isForm) {
        setForm(f => ({ ...f, imageData: base64, imageType: file.type }));
        setImgPreviews(prev => ({ ...prev, _form: dataUrl }));
      } else if (productId) {
        handleDirectImageUpload(productId, file, dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDirectImageUpload = async (id, file, dataUrl) => {
    try {
      await showcaseService.uploadImage(id, file);
      setImgPreviews(prev => ({ ...prev, [id]: dataUrl }));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Télécharger image ──────────────────────────────────────────────────────
  const handleDownload = (p) => {
    const url = imageUrl(p);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '_')}_${p.volume || ''}.jpg`;
    a.click();
  };

  // ── Modal ──────────────────────────────────────────────────────────────────
  const openAdd  = () => { setForm(EMPTY_FORM); setImgPreviews(p => ({ ...p, _form: null })); setModal('add'); };
  const openEdit = (p)  => {
    setForm({ name: p.name, brand: p.brand, category: p.category,
              volume: p.volume || '', description: p.description || '',
              imageData: p.imageData, imageType: p.imageType, _id: p.id });
    setImgPreviews(prev => ({ ...prev, _form: p.imageData
      ? `data:${p.imageType||'image/jpeg'};base64,${p.imageData}` : null }));
    setModal(p);
  };
  const closeModal = () => { setModal(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await showcaseService.create(form);
      } else {
        await showcaseService.update(form._id, form);
      }
      await fetchAll();
      closeModal();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit de la galerie ?')) return;
    await showcaseService.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="gallery-root">

      {/* ══ HERO — Med Oil Company ══════════════════════════════════════════ */}
      <section className="gallery-hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge">MED OIL COMPANY</div>
          <h1 className="hero-title">Qui sommes‑nous ?</h1>
          <p className="hero-desc">
            La société <strong>MEDOIL COMPANY</strong> est une filiale de{' '}
            <strong>POULINA GROUP HOLDING</strong>, premier groupe privé tunisien,
            possédant plus d'une centaine de filiales dans le domaine de l'industrie,
            l'industrie agroalimentaire, du commerce et des services.{' '}
            MED OIL COMPANY est spécialisée dans la production des{' '}
            <em>margarines de table et margarines professionnelles</em>, des{' '}
            <em>graisses végétales</em>, des <em>huiles de table</em> (maïs, soja,
            tournesol et végétale), les <em>mayonnaises</em> et les <em>sauces</em>.
          </p>
          <div className="hero-stats">
            {[
              { val: '100+', label: 'Filiales Poulina' },
              { val: '1987', label: 'Fondation Jadida' },
              { val: '4',    label: 'Gammes produits' },
              { val: '18+',  label: 'Références' },
            ].map(s => (
              <div className="hero-stat" key={s.label}>
                <span className="stat-val">{s.val}</span>
                <span className="stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ JADIDA BRAND BANNER ════════════════════════════════════════════ */}
      <section className="jadida-banner">
        <div className="jadida-inner">
          <div className="jadida-left">
            <div className="jadida-logo">
              <span className="jadida-j">J</span>adida<span className="jadidas-apos">'s Gallery</span>
            </div>
            <div className="jadida-since">Depuis <strong>1987</strong></div>
          </div>
          <div className="jadida-sep" />
          <div className="jadida-right">
            <p>
              La marque <strong>Jadida</strong>, fleuron de Med Oil Company, est synonyme
              de qualité, de fraîcheur et de tradition depuis plus de <strong>35 ans</strong>.
              Présente dans chaque foyer tunisien, elle incarne l'excellence des produits
              agroalimentaires du groupe Poulina.
            </p>
          </div>
        </div>
      </section>

      {/* ══ TOOLBAR ════════════════════════════════════════════════════════ */}
      <div className="gallery-toolbar">
        <div className="filter-tabs">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`filter-tab ${activeTab === c.key ? 'active' : ''}`}
              onClick={() => setActiveTab(c.key)}
            >
              {c.icon} {c.label}
              <span className="tab-count">
                {c.key === 'ALL'
                  ? products.length
                  : products.filter(p => p.category === c.key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="Rechercher un produit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-add" onClick={openAdd}>
            <Plus size={16}/> Ajouter un produit
          </button>
        </div>
      </div>

      {/* ══ GRILLE PRODUITS ════════════════════════════════════════════════ */}
      <div className="gallery-grid-wrapper">
        {loading ? (
          <div className="gallery-loading">
            <div className="spinner-ring"/><p>Chargement de la galerie…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="gallery-empty">
            <span style={{ fontSize:'3rem' }}>🫙</span>
            <p>Aucun produit trouvé</p>
          </div>
        ) : (
          <>
            <div className="gallery-grid">
              {paginatedFiltered.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  imageUrl={imageUrl(p)}
                  uploadRef={el => uploadRefs.current[p.id] = el}
                  onImagePick={e => handleImagePick(e, false, p.id)}
                  onDownload={() => handleDownload(p)}
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
            </div>
            <div className="gallery-pagination-wrap">
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
                pageSizeOptions={[6, 12, 24, 48]}
              />
            </div>
          </>
        )}
      </div>

      {/* ══ MODAL AJOUT / ÉDITION ══════════════════════════════════════════ */}
      {modal && (
        <div className="gallery-modal-backdrop" onClick={closeModal}>
          <div className="gallery-modal glass" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h3>{modal === 'add' ? 'Ajouter un produit' : 'Modifier le produit'}</h3>
              <button className="modal-close" onClick={closeModal}><X size={18}/></button>
            </div>

            {/* Image preview */}
            <div
              className="modal-img-zone"
              style={{ background: CAT_GRADIENT[form.category] || CAT_GRADIENT.HUILE }}
              onClick={() => fileRef.current?.click()}
            >
              {imgPreviews._form
                ? <img src={imgPreviews._form} alt="preview" className="modal-img-preview"/>
                : <div className="modal-img-placeholder">
                    <Upload size={28}/><span>Cliquer pour ajouter une photo</span>
                  </div>
              }
              <input ref={fileRef} type="file" accept="image/*"
                     style={{ display:'none' }}
                     onChange={e => handleImagePick(e, true)} />
            </div>

            {/* Form fields */}
            <div className="modal-fields">
              <div className="mf-row">
                <div className="mf-group">
                  <label>Nom du produit *</label>
                  <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                         placeholder="Ex: Huile Végétale Jadida"/>
                </div>
                <div className="mf-group" style={{ maxWidth:'120px' }}>
                  <label>Volume / Poids</label>
                  <input value={form.volume} onChange={e => setForm(f=>({...f,volume:e.target.value}))}
                         placeholder="5L, 500g…"/>
                </div>
              </div>
              <div className="mf-row">
                <div className="mf-group">
                  <label>Marque</label>
                  <input value={form.brand} onChange={e => setForm(f=>({...f,brand:e.target.value}))}/>
                </div>
                <div className="mf-group">
                  <label>Catégorie *</label>
                  <div className="select-wrap">
                    <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                      <option value="HUILE">🫙 Huile</option>
                      <option value="MARGARINE">🧈 Margarine</option>
                      <option value="SAUCE">🌶️ Sauce</option>
                      <option value="MAYONNAISE">🍶 Mayonnaise</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow"/>
                  </div>
                </div>
              </div>
              <div className="mf-group">
                <label>Description</label>
                <textarea rows={4} value={form.description}
                          onChange={e => setForm(f=>({...f,description:e.target.value}))}
                          placeholder="Description du produit…"/>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={closeModal}>Annuler</button>
              <button className="btn-save" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? <span className="spin-sm"/> : <Save size={15}/>}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Carte produit ───────────────────────────────────────────────────────────

const ProductCard = ({ product: p, imageUrl, uploadRef, onImagePick, onDownload, onEdit, onDelete }) => {
  const gradient = CAT_GRADIENT[p.category] || CAT_GRADIENT.HUILE;
  const icon     = CAT_ICON[p.category]     || '🫙';

  return (
    <div className="product-card">
      {/* Image zone */}
      <div className="card-image-zone" style={{ background: gradient }}>
        {imageUrl
          ? <img src={imageUrl} alt={p.name} className="card-img"/>
          : <div className="card-img-placeholder">
              <span className="cat-emoji">{icon}</span>
            </div>
        }
        <div className="card-img-overlay">
          <button className="card-overlay-btn" onClick={onDownload} title="Télécharger la photo">
            <Download size={16}/>
          </button>
          <button className="card-overlay-btn"
                  onClick={() => uploadRef?.click()}
                  title="Changer la photo">
            <Upload size={16}/>
          </button>
          <input ref={uploadRef} type="file" accept="image/*"
                 style={{ display:'none' }} onChange={onImagePick}/>
        </div>
        {p.volume && <div className="volume-badge">{p.volume}</div>}
      </div>

      {/* Content */}
      <div className="card-content">
        <div className="card-brand">{p.brand}</div>
        <h3 className="card-name">{p.name}</h3>
        <p className="card-desc">{p.description}</p>
      </div>

      {/* Footer */}
      <div className="card-footer">
        <span className={`cat-chip cat-${p.category.toLowerCase()}`}>
          {icon} {p.category.charAt(0) + p.category.slice(1).toLowerCase()}
        </span>
        <div className="card-actions">
          <button className="card-btn-edit" onClick={onEdit} title="Modifier">
            <Edit2 size={14}/>
          </button>
          <button className="card-btn-delete" onClick={onDelete} title="Supprimer">
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;
