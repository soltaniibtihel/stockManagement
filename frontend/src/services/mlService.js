import api from './api';

class MlService {
  /**
   * Upload an Excel file to train the default model (LightGBM / RandomForest).
   * Routes: React → Java /api/ml/train → Python /train
   */
  uploadAndTrain(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ml/train', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  /**
   * Train Random Forest AND XGBoost on the same Excel file and compare
   * their metrics side by side.
   *
   * Routes: React → Java /api/ml/compare-models → Python /compare-rf-xgb
   *
   * Response shape:
   *   { random_forest: {r2, rmse, mae}, xgboost: {r2, rmse, mae}, winner, ... }
   */
  compareModels(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ml/compare-models', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  /**
   * Predict total demand for the next 12 months.
   * Routes: React → Java /api/ml/predict-year → Python /predict-year
   * @param {string|null} productCode  Optional product code to scope the forecast
   */
  predictYear(productCode = null) {
    const params = productCode ? { product_code: productCode } : {};
    return api.get('/ml/predict-year', { params });
  }
}

export default new MlService();
