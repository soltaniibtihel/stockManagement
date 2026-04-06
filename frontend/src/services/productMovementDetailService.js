import api from './api';

const ProductMovementDetailService = {
  getAll: () => api.get('/product-movement-details'),
  getById: (id) => api.get(`/product-movement-details/${id}`),
  getByMovementId: (movementId) => api.get(`/product-movement-details/movement/${movementId}`),
  create: (data) => api.post('/product-movement-details', data),
  update: (id, data) => api.put(`/product-movement-details/${id}`, data),
  delete: (id) => api.delete(`/product-movement-details/${id}`)
};

export default ProductMovementDetailService;
