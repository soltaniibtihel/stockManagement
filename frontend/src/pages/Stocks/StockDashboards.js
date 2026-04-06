import React, { useEffect, useMemo } from 'react';
import { AlertTriangle, ShieldCheck, Info, Volume2 } from 'lucide-react';

const StockDashboards = ({ stocks = [] }) => {
  // Aggregate stock by product
  const productStocks = useMemo(() => {
    const map = {};
    stocks.forEach(stock => {
      const productId = stock.product?.id;
      if (!productId) return;
      
      if (!map[productId]) {
        map[productId] = {
          name: stock.product.name,
          quantity: 0,
          safetyStock: stock.safetyStock || 0,
          reorderPoint: stock.reorderPoint || 0,
          unit: stock.product.unit || ''
        };
      }
      map[productId].quantity += stock.quantityAvailable;
    });
    return Object.values(map);
  }, [stocks]);

  const hasCriticalStock = useMemo(() => {
    return productStocks.some(p => p.quantity <= p.safetyStock && p.quantity > 0);
  }, [productStocks]);

  // Audio alert logic
  useEffect(() => {
    if (hasCriticalStock) {
      const playAlert = () => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      };

      // We can only play after user interaction, so we add a one-time listener if needed
      // or just try directly (some browsers allow if interaction happened before)
      const handleFirstInteraction = () => {
        playAlert();
        window.removeEventListener('click', handleFirstInteraction);
      };
      window.addEventListener('click', handleFirstInteraction);
      
      return () => window.removeEventListener('click', handleFirstInteraction);
    }
  }, [hasCriticalStock]);

  if (stocks.length === 0) {
    return (
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3><AlertTriangle size={20} className="text-warning"/> Stock Quantities</h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No stock data available to display levels.
          </p>
          <div className="dashboard-guide">
            <Info size={16} style={{ marginBottom: '0.25rem' }}/>
            <strong>Guide :</strong> Ce graphique affichera la quantité totale disponible par produit. Une barre 
            <span className="text-danger"> rouge</span> indiquera un risque de rupture immédiate.
          </div>
        </div>
        <div className="dashboard-card">
          <h3><ShieldCheck size={20} className="text-success"/> Safety Stock Status</h3>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No stock data available to display safety margins.
          </p>
          <div className="dashboard-guide">
            <Info size={16} style={{ marginBottom: '0.25rem' }}/>
            <strong>Guide :</strong> Ce tableau de bord permet de surveiller si votre stock dépasse le "Stock de Sécurité". 
            Il garantit que vous avez toujours une réserve pour les imprévus.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      {/* Dashboard 1: Quantities & Alerts */}
      <div className={`dashboard-card ${hasCriticalStock ? 'alert-pulse' : ''}`}>
        <h3>
          <AlertTriangle size={20} className={hasCriticalStock ? 'text-danger' : 'text-primary'}/>
          Niveaux de Stock par Produit
          {hasCriticalStock && <Volume2 size={18} className="text-danger" style={{marginLeft: 'auto'}}/>}
        </h3>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {productStocks.map(p => {
            const isDanger = p.quantity <= p.safetyStock;
            const isWarning = p.quantity <= p.reorderPoint && !isDanger;
            const statusClass = isDanger ? 'bg-danger' : (isWarning ? 'bg-warning' : 'bg-success');
            const percentage = Math.min((p.quantity / (p.reorderPoint * 2 || 100)) * 100, 100);

            return (
              <div key={p.name} className="stock-item">
                <div className="stock-info">
                  <span>{p.name}</span>
                  <span className={isDanger ? 'text-danger' : ''}>
                    {p.quantity} {p.unit} {isDanger && '(CRITIQUE)'}
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar ${statusClass}`} 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dashboard-guide">
          <Info size={16} style={{ marginBottom: '0.25rem' }}/>
          <strong>Guide d'utilisation :</strong> Les barres indiquent la quantité totale en magasin. 
          En <span className="text-danger">rouge</span> : le stock est en dessous du minimum de sécurité. 
          En <span className="text-warning">jaune</span> : il est temps de recommander. 
          Une alerte sonore est déclenchée lors du chargement si un produit est critique.
        </div>
      </div>

      {/* Dashboard 2: Safety Stock Monitoring */}
      <div className="dashboard-card">
        <h3><ShieldCheck size={20} className="text-success"/> État du Stock de Sécurité</h3>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {productStocks.map(p => {
            const safetyRatio = p.safetyStock > 0 ? (p.quantity / p.safetyStock) : 1;
            const percentage = Math.min(safetyRatio * 100, 100);
            const statusClass = percentage < 100 ? 'bg-danger' : 'bg-success';

            return (
              <div key={p.name} className="stock-item">
                <div className="stock-info">
                  <span>{p.name}</span>
                  <span>Target: {p.safetyStock} {p.unit}</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar ${statusClass}`} 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div style={{ fontSize: '0.7rem', marginTop: '2px', textAlign: 'right', color: 'var(--text-muted)' }}>
                  Marge de sécurité: {Math.round(percentage)}%
                </div>
              </div>
            );
          })}
        </div>

        <div className="dashboard-guide">
          <Info size={16} style={{ marginBottom: '0.25rem' }}/>
          <strong>Guide de sécurité :</strong> Ce graphique montre si vous maintenez votre "buffer" de sécurité. 
          Si la barre est <span className="text-danger">rouge</span> (moins de 100%), vous puisez dans vos réserves d'urgence. 
          L'objectif est de garder toutes les barres à 100% (Vert).
        </div>
      </div>
    </div>
  );
};

export default StockDashboards;
