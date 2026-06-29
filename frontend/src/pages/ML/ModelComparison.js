import React, { useState, useRef } from 'react';
import {
  GitCompare, Upload, Trophy, TrendingUp,
  AlertTriangle, CheckCircle2, Info, Table2,
} from 'lucide-react';
import mlService from '../../services/mlService';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de couleur des deux modèles
// ─────────────────────────────────────────────────────────────────────────────
const RF_COLOR  = '#60a5fa';   // bleu  — Random Forest
const XGB_COLOR = '#f59e0b';   // ambre — XGBoost


// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : barre de métrique
// ─────────────────────────────────────────────────────────────────────────────
const MetricBar = ({ value, maxValue, inverse, color }) => {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 7, overflow: 'hidden' }}>
      <div
        style={{
          width: `${inverse ? 100 - pct : pct}%`,
          height: '100%',
          background: color,
          borderRadius: 6,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : carte de métriques d'un modèle
// ─────────────────────────────────────────────────────────────────────────────
const ModelMetricCard = ({ title, metrics, isWinner, color, rfMetrics, xgbMetrics }) => {
  const maxRmse = Math.max(rfMetrics?.rmse ?? 0, xgbMetrics?.rmse ?? 0);
  const maxMae  = Math.max(rfMetrics?.mae  ?? 0, xgbMetrics?.mae  ?? 0);

  return (
    <div style={{
      flex: 1, minWidth: 240,
      background: isWinner
        ? 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.02))'
        : 'rgba(255,255,255,0.03)',
      border: isWinner ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '1.5rem', position: 'relative',
    }}>
      {isWinner && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg,#34d399,#10b981)', color: '#fff',
          fontSize: '0.7rem', fontWeight: 700, padding: '3px 14px', borderRadius: 20,
          letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Trophy size={11} /> MEILLEUR MODÈLE
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: `${color}20`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
          fontWeight: 800, fontSize: '0.85rem',
        }}>
          {title === 'Random Forest' ? 'RF' : 'XGB'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{metrics?.model_type}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          { label: 'R²',   val: metrics?.r2,   hint: 'plus proche de 1 = meilleur', inverse: false, max: 1 },
          { label: 'RMSE', val: metrics?.rmse,  hint: 'plus bas = meilleur',         inverse: true,  max: maxRmse },
          { label: 'MAE',  val: metrics?.mae,   hint: 'plus bas = meilleur',         inverse: true,  max: maxMae  },
        ].map(({ label, val, hint, inverse, max }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                {label} <span style={{ fontSize: '0.7rem', color: '#475569' }}>({hint})</span>
              </span>
              <span style={{ fontWeight: 700, color: isWinner ? '#34d399' : color }}>
                {val?.toFixed(4)}
              </span>
            </div>
            <MetricBar value={val ?? 0} maxValue={max} inverse={inverse} color={color} />
          </div>
        ))}

        <div style={{
          marginTop: 4, padding: '0.55rem 0.75rem',
          background: 'rgba(255,255,255,0.04)', borderRadius: 8,
          fontSize: '0.78rem', color: '#64748b', textAlign: 'center',
        }}>
          {metrics?.rows_trained ?? '—'} points mensuels d'entraînement
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : barres visuelles doubles pour un mois donné
// ─────────────────────────────────────────────────────────────────────────────
const DualBar = ({ rfVal, xgbVal, maxVal }) => {
  const rfPct  = maxVal > 0 ? (rfVal  / maxVal) * 100 : 0;
  const xgbPct = maxVal > 0 ? (xgbVal / maxVal) * 100 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 28, fontSize: '0.68rem', color: RF_COLOR, fontWeight: 600, flexShrink: 0 }}>RF</span>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 9, overflow: 'hidden' }}>
          <div style={{ width: `${rfPct}%`, height: '100%', background: RF_COLOR, borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 28, fontSize: '0.68rem', color: XGB_COLOR, fontWeight: 600, flexShrink: 0 }}>XGB</span>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 9, overflow: 'hidden' }}>
          <div style={{ width: `${xgbPct}%`, height: '100%', background: XGB_COLOR, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : table comparaison des prévisions mois par mois
// ─────────────────────────────────────────────────────────────────────────────
const PredictionsTable = ({ rfPredictions, xgbPredictions }) => {
  if (!rfPredictions?.length || !xgbPredictions?.length) return null;

  // Valeur max pour calibrer les barres
  const allVals = [
    ...rfPredictions.map(p => p.predicted_demand),
    ...xgbPredictions.map(p => p.predicted_demand),
  ];
  const maxVal = Math.max(...allVals);

  // Totaux annuels
  const totalRf  = rfPredictions.reduce((s, p) => s + p.predicted_demand, 0);
  const totalXgb = xgbPredictions.reduce((s, p) => s + p.predicted_demand, 0);
  const diffTotal = totalXgb - totalRf;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden',
      marginTop: '1.75rem',
    }}>
      {/* En-tête section */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <Table2 size={17} color="#a78bfa" />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          Prévisions mensuelles — Random Forest vs XGBoost
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b' }}>
          12 mois à venir
        </span>
      </div>

      {/* Légende */}
      <div style={{
        display: 'flex', gap: '1.5rem', padding: '0.65rem 1.25rem',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.8rem',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: RF_COLOR, display: 'inline-block' }} />
          <span style={{ color: RF_COLOR, fontWeight: 600 }}>Random Forest</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: XGB_COLOR, display: 'inline-block' }} />
          <span style={{ color: XGB_COLOR, fontWeight: 600 }}>XGBoost</span>
        </span>
        <span style={{ color: '#475569', marginLeft: 'auto' }}>Diff. = XGBoost − Random Forest</span>
      </div>

      {/* En-têtes colonnes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 1fr 80px 1fr',
        gap: '0.5rem',
        padding: '0.6rem 1.25rem',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        fontSize: '0.75rem', color: '#64748b', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        <span>Mois</span>
        <span style={{ textAlign: 'right', color: RF_COLOR }}>Random Forest</span>
        <span style={{ textAlign: 'right', color: XGB_COLOR }}>XGBoost</span>
        <span style={{ textAlign: 'right' }}>Différence</span>
        <span style={{ paddingLeft: 34 }}>Comparaison visuelle</span>
      </div>

      {/* Lignes données */}
      {rfPredictions.map((rfRow, i) => {
        const xgbRow = xgbPredictions[i];
        const rf     = rfRow.predicted_demand;
        const xgb    = xgbRow?.predicted_demand ?? 0;
        const diff   = xgb - rf;
        const isPos  = diff > 0;

        return (
          <div
            key={rfRow.month}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 1fr 80px 1fr',
              gap: '0.5rem',
              padding: '0.7rem 1.25rem',
              borderBottom: i < rfPredictions.length - 1
                ? '1px solid rgba(255,255,255,0.04)'
                : 'none',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Mois */}
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
              {rfRow.month}
            </span>

            {/* Valeur RF */}
            <span style={{ textAlign: 'right', fontWeight: 700, color: RF_COLOR, fontSize: '0.9rem' }}>
              {rf.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </span>

            {/* Valeur XGBoost */}
            <span style={{ textAlign: 'right', fontWeight: 700, color: XGB_COLOR, fontSize: '0.9rem' }}>
              {xgb.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </span>

            {/* Différence */}
            <span style={{
              textAlign: 'right', fontSize: '0.82rem', fontWeight: 600,
              color: diff === 0 ? '#64748b' : isPos ? '#34d399' : '#f87171',
            }}>
              {diff >= 0 ? '+' : ''}{diff.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            </span>

            {/* Barres visuelles */}
            <DualBar rfVal={rf} xgbVal={xgb} maxVal={maxVal} />
          </div>
        );
      })}

      {/* Ligne totaux */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 1fr 80px 1fr',
        gap: '0.5rem',
        padding: '0.85rem 1.25rem',
        background: 'rgba(255,255,255,0.04)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL</span>
        <span style={{ textAlign: 'right', fontWeight: 800, color: RF_COLOR, fontSize: '0.95rem' }}>
          {totalRf.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
        </span>
        <span style={{ textAlign: 'right', fontWeight: 800, color: XGB_COLOR, fontSize: '0.95rem' }}>
          {totalXgb.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
        </span>
        <span style={{
          textAlign: 'right', fontSize: '0.85rem', fontWeight: 700,
          color: diffTotal === 0 ? '#64748b' : diffTotal > 0 ? '#34d399' : '#f87171',
        }}>
          {diffTotal >= 0 ? '+' : ''}{diffTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
        </span>
        <span />
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────
const ModelComparison = () => {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const fileInputRef          = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) { setFile(selected); setResult(null); setError(null); }
  };

  const handleCompare = async () => {
    if (!file) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await mlService.compareModels(file);
      setResult(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err.message ||
        'Une erreur est survenue.'
      );
    } finally {
      setLoading(false);
    }
  };

  const winnerLabel = result?.winner === 'xgboost' ? 'XGBoost' : 'Random Forest';

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa',
        }}>
          <GitCompare size={22} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Comparaison des modèles ML
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Random Forest (Bagging) vs XGBoost (Boosting) — même données, même partition
          </p>
        </div>
      </div>

      {/* ── Note pédagogique ── */}
      <div style={{
        background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
        borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem',
        display: 'flex', gap: '0.75rem',
      }}>
        <Info size={17} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.83rem', color: '#94a3b8', lineHeight: 1.65 }}>
          Les deux modèles sont entraînés sur <strong>exactement les mêmes données</strong> avec
          la même partition 80 % / 20 %. Les prévisions sont ensuite générées
          <strong> séparément</strong> par chaque modèle pour permettre une comparaison visuelle.
          Le meilleur modèle est sauvegardé automatiquement.
        </div>
      </div>

      {/* ── Zone d'import ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.13)',
        borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center',
      }}>
        <Upload size={26} color="#64748b" style={{ marginBottom: '0.6rem' }} />
        <p style={{ color: '#94a3b8', margin: '0 0 1rem', fontSize: '0.88rem' }}>
          Importez un fichier Excel d'historique de stock
          <br />
          <span style={{ fontSize: '0.76rem', color: '#475569' }}>
            Colonnes : date | quantite | article (optionnel)
          </span>
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
              color: '#a78bfa', padding: '0.5rem 1.1rem', borderRadius: 8,
              cursor: 'pointer', fontSize: '0.87rem', fontWeight: 600,
            }}
          >
            {file ? `Fichier : ${file.name}` : 'Choisir un fichier Excel'}
          </button>

          {file && (
            <button
              onClick={handleCompare}
              disabled={loading}
              style={{
                background: loading ? 'rgba(167,139,250,0.1)' : 'linear-gradient(135deg,#a78bfa,#7c3aed)',
                border: 'none', color: '#fff', padding: '0.5rem 1.3rem', borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.87rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Comparaison en cours…
                </>
              ) : (
                <><GitCompare size={15} /> Lancer la comparaison</>
              )}
            </button>
          )}
        </div>

        <input type="file" accept=".xlsx,.xls" ref={fileInputRef}
          onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: 10, padding: '0.9rem 1.1rem', marginBottom: '1.5rem',
          display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={17} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ color: '#f87171', fontSize: '0.87rem' }}>{error}</span>
        </div>
      )}

      {/* ── Résultats ── */}
      {result && (
        <>
          {/* Bandeau gagnant */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12,
            padding: '0.9rem 1.4rem', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <Trophy size={21} color="#34d399" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#34d399' }}>
                {winnerLabel} gagne sur ces données
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: 2 }}>
                {result.file} · {result.rows_raw} lignes brutes →{' '}
                {result.rows_monthly} points mensuels ·{' '}
                {result.date_range?.from} → {result.date_range?.to}
              </div>
            </div>
            <CheckCircle2 size={26} color="#34d399" style={{ marginLeft: 'auto' }} />
          </div>

          {/* Note modèle sauvegardé */}
          <div style={{
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 9, padding: '0.6rem 1rem', marginBottom: '1.5rem',
            fontSize: '0.79rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <TrendingUp size={13} />
            <strong>{winnerLabel}</strong> a été sauvegardé comme modèle actif et sera utilisé
            pour les prochaines prédictions de stock.
          </div>

          {/* ── Section 1 : Métriques côte à côte ── */}
          <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Métriques d'évaluation (jeu de test 20 %)
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <ModelMetricCard
              title="Random Forest"
              metrics={result.random_forest}
              isWinner={result.winner === 'random_forest'}
              color={RF_COLOR}
              rfMetrics={result.random_forest}
              xgbMetrics={result.xgboost}
            />
            <ModelMetricCard
              title="XGBoost"
              metrics={result.xgboost}
              isWinner={result.winner === 'xgboost'}
              color={XGB_COLOR}
              rfMetrics={result.random_forest}
              xgbMetrics={result.xgboost}
            />
          </div>

          {/* ── Section 2 : Prévisions séparées mois par mois ── */}
          <PredictionsTable
            rfPredictions={result.random_forest?.predictions}
            xgbPredictions={result.xgboost?.predictions}
          />

          {/* ── Interprétation ── */}
          <div style={{
            marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
            padding: '1.1rem 1.25rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.7,
          }}>
            <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
              Comment lire ces métriques ?
            </strong>
            <p style={{ margin: '0 0 0.2rem' }}>
              <strong style={{ color: '#a78bfa' }}>R²</strong> — Coefficient de détermination :
              proportion de variance de la demande expliquée par le modèle (1.0 = parfait, 0 = inutile).
            </p>
            <p style={{ margin: '0 0 0.2rem' }}>
              <strong style={{ color: '#a78bfa' }}>RMSE</strong> — Erreur quadratique moyenne :
              pénalise fortement les grandes erreurs. En unités par mois.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#a78bfa' }}>MAE</strong> — Erreur absolue moyenne :
              plus robuste aux valeurs aberrantes que le RMSE. En unités par mois.
            </p>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ModelComparison;
