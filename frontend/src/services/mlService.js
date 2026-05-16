import api from './api';

class MlService {
  /**
   * Upload an Excel file to train the model.
   * Routes through Java backend → ML service.
   */
  uploadAndTrain(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ml/train', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  /**
   * Get a demand prediction for a product.
   * @param {number[]} historicalQuantities  Recent movement quantities (oldest → newest)
   * @param {number}   safetyStock           Stock safety threshold
   * @param {number}   currentQuantity       Current available quantity
   */
  predictDemand(historicalQuantities, safetyStock = 0, currentQuantity = 0) {
    return api.post('/ml/predict', {
      historical_quantities: historicalQuantities,
      safety_stock: safetyStock,
      current_quantity: currentQuantity,
    });
  }
}

export default new MlService();
