import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

/**
 * Composant Pagination réutilisable.
 *
 * Props :
 *   currentPage      — page actuelle (1-indexed)
 *   totalItems       — nombre total d'éléments
 *   pageSize         — éléments par page
 *   onPageChange     — (page: number) => void
 *   onPageSizeChange — (size: number) => void   (optionnel)
 *   pageSizeOptions  — [10, 20, 50]             (optionnel)
 *   showInfo         — afficher "X – Y sur Z"   (défaut true)
 */
const Pagination = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showInfo = true,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  // ── Génère la liste de pages avec ellipsis ──────────────────────────────
  const getPages = () => {
    if (totalPages <= 7) return range(1, totalPages);
    if (currentPage <= 4) return [...range(1, 5), '…', totalPages];
    if (currentPage >= totalPages - 3) return [1, '…', ...range(totalPages - 4, totalPages)];
    return [1, '…', ...range(currentPage - 1, currentPage + 1), '…', totalPages];
  };

  return (
    <div className="pagination-bar">
      {/* Infos + sélecteur taille */}
      <div className="pagination-info">
        {showInfo && (
          <span className="pg-count">
            {from}–{to} <span>sur</span> {totalItems}
          </span>
        )}
        {onPageSizeChange && (
          <div className="pg-size-wrap">
            <span>Lignes</span>
            <select
              className="pg-size-select"
              value={pageSize}
              onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            >
              {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Contrôles navigation */}
      <div className="pagination-controls">
        <button className="pg-btn" onClick={() => onPageChange(1)}
                disabled={currentPage === 1} title="Première page">
          <ChevronsLeft size={15} />
        </button>
        <button className="pg-btn" onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1} title="Page précédente">
          <ChevronLeft size={15} />
        </button>

        {getPages().map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
            : <button
                key={p}
                className={`pg-btn pg-num ${currentPage === p ? 'pg-num--active' : ''}`}
                onClick={() => onPageChange(p)}
              >{p}</button>
        )}

        <button className="pg-btn" onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages} title="Page suivante">
          <ChevronRight size={15} />
        </button>
        <button className="pg-btn" onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages} title="Dernière page">
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};

const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

export default Pagination;
