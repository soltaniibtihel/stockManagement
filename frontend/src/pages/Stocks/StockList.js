import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import StockService from '../../services/stockService';
import StockDashboards from './StockDashboards';

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await StockService.getAll();
      setStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock entry?')) {
      try {
        await StockService.delete(id);
        setStocks(stocks.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting stock:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-title">
        Stock Management & Analysis
        <Link to="/stocks/new" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '1rem' }}>
          <Plus size={18} /> Add Stock
        </Link>
      </div>

      <StockDashboards stocks={stocks} />

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Safety</th>
                <th>Reorder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stocks found.</td>
                </tr>
              ) : (
                stocks.map(stock => (
                  <tr key={stock.id}>
                    <td>{stock.id}</td>
                    <td>{stock.product?.name || '-'}</td>
                    <td><span className="badge badge-blue">{stock.warehouse?.name || '-'}</span></td>
                    <td>{stock.quantityAvailable}</td>
                    <td>{stock.safetyStock}</td>
                    <td>{stock.reorderPoint}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/stocks/edit/${stock.id}`} className="btn btn-secondary">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(stock.id)} className="btn btn-danger">
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

export default StockList;
