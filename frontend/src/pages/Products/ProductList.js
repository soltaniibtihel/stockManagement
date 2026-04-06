import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import ProductService from '../../services/productService';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await ProductService.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await ProductService.delete(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-title">
        Products
        <Link to="/products/new" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '1rem' }}>
          <Plus size={18} /> Add Product
        </Link>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Stock Qty</th>
                <th>Safety Stock</th>
                <th>Shelf Life (Days)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No products found.</td>
                </tr>
              ) : (
                products.map(product => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td><span className="badge badge-blue">{product.code}</span></td>
                    <td>{product.name}</td>
                    <td>{product.description || '-'}</td>
                    <td>{product.category?.name || '-'}</td>
                    <td>{product.unit}</td>
                    <td>{product.stockQuantity || 0}</td>
                    <td>{product.safetyStock || 0}</td>
                    <td>{product.shelfLife}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/products/edit/${product.id}`} className="btn btn-secondary">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(product.id)} className="btn btn-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
