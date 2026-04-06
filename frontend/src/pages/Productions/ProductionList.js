import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import ProductionService from '../../services/productionService';

const ProductionList = () => {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductions();
  }, []);

  const fetchProductions = async () => {
    try {
      const response = await ProductionService.getAll();
      setProductions(response.data);
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this production record?')) {
      try {
        await ProductionService.delete(id);
        setProductions(productions.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting production:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-title">
        Productions
        <Link to="/productions/new" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '1rem' }}>
          <Plus size={18} /> Add Production
        </Link>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Quantity</th>
                <th>Product</th>
                <th>User</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No production records found.</td>
                </tr>
              ) : (
                productions.map(prod => (
                  <tr key={prod.id}>
                    <td>{prod.id}</td>
                    <td>{formatDate(prod.productionDate)}</td>
                    <td>{prod.producedQuantity}</td>
                    <td>{prod.product?.name || '-'}</td>
                    <td>{prod.user ? `${prod.user.firstName} ${prod.user.lastName}` : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/productions/edit/${prod.id}`} className="btn btn-secondary">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(prod.id)} className="btn btn-danger">
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

export default ProductionList;
