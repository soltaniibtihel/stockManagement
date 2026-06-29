import api from './api';

const ProductService = {
  getAll:         ()       => api.get('/products'),
  getById:        (id)     => api.get(`/products/${id}`),
  create:         (data)   => api.post('/products', data),
  update:         (id, data) => api.put(`/products/${id}`, data),
  delete:         (id)     => api.delete(`/products/${id}`),
  getByType:      (type)   => api.get(`/products/by-type/${type}`),
  getRawMaterials: ()      => api.get('/products/by-type/RAW_MATERIAL'),
};

export default ProductService;
