import api from './api';

const showcaseService = {
  getAll:       ()           => api.get('/showcase-products'),
  getById:      (id)         => api.get(`/showcase-products/${id}`),
  getByCategory:(cat)        => api.get(`/showcase-products/category/${cat}`),
  create:       (data)       => api.post('/showcase-products', data),
  update:       (id, data)   => api.put(`/showcase-products/${id}`, data),
  delete:       (id)         => api.delete(`/showcase-products/${id}`),

  uploadImage: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/showcase-products/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default showcaseService;
