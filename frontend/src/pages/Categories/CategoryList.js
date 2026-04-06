import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import CategoryService from '../../services/categoryService';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await CategoryService.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await CategoryService.delete(id);
        setCategories(categories.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const getProductTypeBadge = (type) => {
    const badges = {
      'RAW_MATERIAL': 'badge-blue',
      'FINISHED_PRODUCT': 'badge-green',
      'SEMI_FINISHED': 'badge-warning',
      'PACKAGING': 'badge-purple',
      'BY_PRODUCT': 'badge-info'
    };
    return <span className={`badge ${badges[type] || 'badge-blue'}`}>{type}</span>;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-title">
        Categories
        <Link to="/categories/new" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '1rem' }}>
          <Plus size={18} /> Add Category
        </Link>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Product Type</th>
                <th>Creation Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No categories found.</td>
                </tr>
              ) : (
                categories.map(category => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>{category.name}</td>
                    <td>{category.description}</td>
                    <td>{getProductTypeBadge(category.productType)}</td>
                    <td>{category.creationDate ? new Date(category.creationDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/categories/edit/${category.id}`} className="btn btn-secondary">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(category.id)} className="btn btn-danger">
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

export default CategoryList;
