import axios from 'axios';

const ML_API_URL = 'http://127.0.0.1:8000'; // FastAPI local model

class MlService {
  /**
   * Upload an Excel/CSV history file to train the AI
   */
  uploadAndTrain(file) {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(`${ML_API_URL}/upload-and-train`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Use the trained AI to get a prediction based on recent historical facts
   * @param {number[]} historicalQuantities Array of values (oldest to newest)
   */
  predictDemand(historicalQuantities) {
    return axios.post(`${ML_API_URL}/predict`, {
      historical_quantities: historicalQuantities
    });
  }
}

export default new MlService();
