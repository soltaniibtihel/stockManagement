import api from './api';

/**
 * Recherche globale multi-critères
 *
 * @param {Object} params
 *   q         — mot-clé
 *   type      — ALL | PRODUCT | MOVEMENT | PRODUCTION | WAREHOUSE | SHOWCASE | STOCK
 *   status    — REALISEE | PLANIFIEE
 *   movType   — PO | WO | SO | VNP | TR | TSS
 *   category  — HUILE | MARGARINE | SAUCE | MAYONNAISE
 *   lowStock  — true | false
 */
const searchService = {
  search: (params = {}) => api.get('/search', { params }),
};

export default searchService;
