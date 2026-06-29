import api from './api';

const ImportService = {
  importProducts: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importStocks: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/stocks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  importProductMovements: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/product-movements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importProductions: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/productions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
};

export default ImportService;
