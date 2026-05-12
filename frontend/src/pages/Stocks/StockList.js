import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Upload, AlertCircle, CheckCircle, Brain } from 'lucide-react';
import StockService from '../../services/stockService';
import ImportService from '../../services/importService';
import StockDashboards from './StockDashboards';
import StockAiAssistant from './StockAiAssistant';

const StockList = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importStatus, setImportStatus] = useState(null);
  const [selectedStockForAi, setSelectedStockForAi] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await StockService.getAll();
      setStocks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setImportStatus(null);
    try {
      const response = await ImportService.importStocks(file);
      setImportStatus({
        type: 'success',
        message: response.data.message
      });
      fetchStocks(); // Refresh list after import
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to import Excel file.'
      });
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset input
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

  if (loading && stocks.length === 0) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-title">
        Stock Management & Analysis
        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
          />
          <button 
            onClick={handleImportClick} 
            className="btn btn-secondary" 
            style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            disabled={loading}
          >
            <Upload size={18} /> Import Excel
          </button>
          <Link to="/stocks/new" className="btn btn-primary" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Add Stock
          </Link>
        </div>
      </div>

      {importStatus && (
        <div className={`alert ${importStatus.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {importStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {importStatus.message}
        </div>
      )}

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
                        <button 
                          onClick={() => setSelectedStockForAi(stock)} 
                          className="btn btn-primary" 
                          style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)', border: 'none' }}
                          title="AI Insight & Replenishment"
                        >
                          <Brain size={16} />
                        </button>
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

      {selectedStockForAi && (
        <StockAiAssistant 
          stock={selectedStockForAi} 
          onClose={() => setSelectedStockForAi(null)} 
        />
      )}
    </div>
  );
};

export default StockList;
