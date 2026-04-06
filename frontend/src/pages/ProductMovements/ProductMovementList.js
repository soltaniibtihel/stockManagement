import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import ProductMovementService from '../../services/productMovementService';

const ProductMovementList = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const response = await ProductMovementService.getAll();
      setMovements(response.data);
    } catch (error) {
      console.error('Error fetching product movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this movement?')) {
      try {
        await ProductMovementService.delete(id);
        setMovements(movements.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting product movement:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-title">
        Product Movements
        <Link to="/product-movements/new" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '1rem' }}>
          <Plus size={18} /> Add Movement
        </Link>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No movements found.</td>
                </tr>
              ) : (
                movements.map(movement => (
                  <tr key={movement.id}>
                    <td>{movement.id}</td>
                    <td><span className="badge badge-blue">{movement.product?.code}</span></td>
                    <td>{movement.product?.name}</td>
                    <td>{movement.type}</td>
                    <td>{movement.quantity}</td>
                    <td>{movement.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/product-movements/${movement.id}/detail`} className="btn btn-primary">
                          <Eye size={16} /> Details
                        </Link>
                        <Link to={`/product-movements/edit/${movement.id}`} className="btn btn-secondary">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(movement.id)} className="btn btn-danger">
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

export default ProductMovementList;
