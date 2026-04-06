import api from './api';

const ProductMovementService = {
  getAll: () => api.get('/product-movements'),
  getById: (id) => api.get(`/product-movements/${id}`),
  create: (data) => api.post('/product-movements', data),
  update: (id, data) => api.put(`/product-movements/${id}`, data),
  delete: (id) => api.delete(`/product-movements/${id}`)
};

export default ProductMovementService;
