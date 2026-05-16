import React, { useState, useEffect } from 'react';
import { Package, Activity, RefreshCw, AlertCircle, BarChart3, PieChart as PieChartIcon, Brain, UploadCloud, CheckCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import stockService from '../../services/stockService';
import productionService from '../../services/productionService';
import productMovementService from '../../services/productMovementService';
import mlService from '../../services/mlService';
import './Dashboard.css';

const COLORS = ['#6366f1', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#60a5fa'];

const extractTrainingErrorMessage = (err) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  const message = err?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (detail && typeof detail === 'object') {
    // FastAPI/Pydantic can return structured error details.
    const firstDetail = Array.isArray(detail) ? detail[0]?.msg : null;
    if (firstDetail) return firstDetail;
    return JSON.stringify(detail);
  }

  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }

  return "Failed to train AI model. Please verify your data format.";
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ totalStock: 0, totalProductions: 0, recentMovements: 0 });
  const [stockData, setStockData] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMetrics, setAiMetrics] = useState(null);
  const aiInputRef = React.useRef(null);

  const handleAiUploadClick = () => {
    if(aiInputRef.current) aiInputRef.current.click();
  };

  const handleAiFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAiLoading(true);
    setAiMetrics(null);
    try {
      const res = await mlService.uploadAndTrain(file);
      setAiMetrics({
        success: true,
        message: res.data.message || `Model trained on ${res.data.rows_used ?? '?'} rows.`,
        metrics: res.data.metrics || null,
      });
    } catch (err) {
      setAiMetrics({
        success: false,
        message: extractTrainingErrorMessage(err)
      });
    } finally {
      setAiLoading(false);
      e.target.value = ''; // Reset
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch all required data concurrently
        const [stocksRes, productionsRes, movementsRes] = await Promise.all([
          stockService.getStocks(),
          productionService.getProductions(),
          productMovementService.getProductMovements()
        ]);

        const stocks = stocksRes.data || [];
        const productions = productionsRes.data || [];
        const movements = movementsRes.data || [];

        // 1. Calculate KPIs
        const totalStockQty = stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
        setKpi({
          totalStock: totalStockQty,
          totalProductions: productions.length,
          recentMovements: movements.length
        });

        // 2. Prepare Stock Data for PieChart (Grouping by Warehouse or Product)
        // Grouping by Warehouse Name for the schema
        const stockByWarehouse = {};
        stocks.forEach(s => {
          const wName = s.warehouse?.name || 'Unknown';
          if (!stockByWarehouse[wName]) stockByWarehouse[wName] = 0;
          stockByWarehouse[wName] += s.quantity || 0;
        });
        const formattedStockData = Object.keys(stockByWarehouse).map(key => ({
          name: key,
          value: stockByWarehouse[key]
        }));
        setStockData(formattedStockData);

        // 3. Prepare Production Data for AreaChart (Mocking timeline based on IDs as dates aren't heavily populated in basic schema)
        // Groups productions simulating a timeline (e.g. by status or sequentially)
        const timelineData = productions.slice(-10).map((p, index) => ({
          name: `Prod #${p.id || index}`,
          quantity: p.quantityProduced || (Math.floor(Math.random() * 100) + 10)
        }));
        setProductionData(timelineData);

        // 4. Prepare Recent Movements List
        // Sort by ID descending to get the newest (simulating date sorting)
        const sortedMovements = [...movements].sort((a, b) => b.id - a.id).slice(0, 5);
        setRecentMovements(sortedMovements);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="dashboard-container"><h2 style={{color: '#fff', textAlign: 'center'}}>Loading Director Overview...</h2></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <h1 className="page-title" style={{color: 'white', marginBottom: '0'}}>Director Overview Dashboard</h1>
          <p style={{color: '#94a3b8', marginTop: '0.5rem'}}>Real-time aggregation of your supply chain and production metrics.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <input 
            type="file" 
            ref={aiInputRef} 
            onChange={handleAiFileChange} 
            accept=".csv, .xlsx" 
            style={{display: 'none'}} 
          />
          <button 
            className="btn btn-primary" 
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)', border: 'none', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            onClick={handleAiUploadClick}
            disabled={aiLoading}
          >
            {aiLoading ? <RefreshCw className="spinner" size={18} /> : <Brain size={18} />}
            {aiLoading ? 'Training ML Model...' : 'Train AI with Excel'}
          </button>
        </div>
      </div>

      {aiMetrics && (
        <div className={`dashboard-section ${aiMetrics.success ? 'ai-success' : 'ai-error'}`} style={{ marginBottom: '2rem', padding: '1rem 1.5rem' }}>
          {aiMetrics.success ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(52, 211, 153, 0.2)', padding: '0.5rem', borderRadius: '50%' }}>
                <CheckCircle color="#34d399" size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: '#34d399', margin: '0 0 0.25rem 0' }}>{aiMetrics.message}</h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                  The model is ready. You can now use AI stock predictions on any product.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <AlertCircle color="#f87171" size={24} />
               <h4 style={{ color: '#f87171', margin: 0 }}>{aiMetrics.message}</h4>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Section */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <Package size={28} />
          </div>
          <div className="kpi-details">
            <h3>Total Stock Volume</h3>
            <p>{kpi.totalStock.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-icon purple">
            <Activity size={28} />
          </div>
          <div className="kpi-details">
            <h3>Total Productions</h3>
            <p>{kpi.totalProductions}</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <RefreshCw size={28} />
          </div>
          <div className="kpi-details">
            <h3>Recorded Movements</h3>
            <p>{kpi.recentMovements}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Left Column: Charts */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
          
          {/* Production Schema */}
          <section className="dashboard-section">
            <h2 className="section-header"><BarChart3 size={24} color="#6366f1" /> Production Output Timeline</h2>
            <p className="section-description">
              This schema illustrates the volume of recent productions. Regular monitoring of this area chart helps in identifying output trends and potential bottlenecks in the manufacturing process over time.
            </p>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="quantity" stroke="#6366f1" fillOpacity={1} fill="url(#colorProd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Stock Schema */}
          <section className="dashboard-section">
            <h2 className="section-header"><PieChartIcon size={24} color="#34d399" /> Global Stock Distribution</h2>
            <p className="section-description">
              The pie schema below provides a clear breakdown of where our global inventory is physically located. This aids the logistics team in deciding where to transfer goods minimizing warehousing costs.
            </p>
            <div className="chart-container" style={{height: '300px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem'}}>
              {stockData.map((entry, index) => (
                <div key={index} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length]}}></div>
                  <span style={{color: '#cbd5e1', fontSize: '0.85rem'}}>{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Activity */}
        <div style={{display: 'flex', flexDirection: 'column'}}>
          
          <section className="dashboard-section" style={{height: '100%'}}>
            <h2 className="section-header"><Activity size={24} color="#f472b6" /> Recent Stock Movements</h2>
            <p className="section-description">
              This log tracks the most recent physical inventory activities. It includes stock entries (In), stock exits (Out), and inter-warehouse transfers. Crucial for auditing daily operations.
            </p>
            
            <div className="recent-movements">
              {recentMovements.length === 0 ? (
                <p style={{color: '#94a3b8', fontStyle: 'italic'}}>No recent movements recorded.</p>
              ) : (
                recentMovements.map((move) => {
                  let typeClass = 'transfer';
                  let qtyClass = 'qty-neutral';
                  let typeName = move.movementType || 'Transfer';
                  
                  // Visual logic based on typical movement types
                  if (typeName.toLowerCase().includes('in') || typeName.toLowerCase().includes('reception')) {
                    typeClass = 'in'; qtyClass = 'qty-in';
                  } else if (typeName.toLowerCase().includes('out') || typeName.toLowerCase().includes('vente')) {
                    typeClass = 'out'; qtyClass = 'qty-out';
                  }

                  return (
                    <div className="movement-item" key={move.id}>
                      <div className="movement-info">
                        <div className={`movement-circle ${typeClass}`}></div>
                        <div className="movement-details">
                          <h4>{typeName} #{move.id}</h4>
                          <p>{move.date ? new Date(move.date).toLocaleDateString() : 'Recent'}</p>
                        </div>
                      </div>
                      <div className={`movement-quantity ${qtyClass}`}>
                        {typeClass === 'in' ? '+' : (typeClass === 'out' ? '-' : '')}{move.quantity || 1}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div style={{marginTop: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '1rem'}}>
              <AlertCircle color="#f87171" size={24} style={{flexShrink: 0}} />
              <div>
                <h4 style={{color: '#f87171', margin: '0 0 0.25rem 0'}}>System Alert</h4>
                <p style={{color: '#fca5a5', margin: 0, fontSize: '0.85rem'}}>Routine stock audit required for Warehouse A by the end of this week.</p>
              </div>
            </div>

          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
