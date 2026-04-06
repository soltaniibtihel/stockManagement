import api from './api';

const ProductionService = {
  getAll: () => api.get('/productions'),
  getById: (id) => api.get(`/productions/${id}`),
  create: (data) => api.post('/productions', data),
  update: (id, data) => api.put(`/productions/${id}`, data),
  delete: (id) => api.delete(`/productions/${id}`)
};

export default ProductionService;
