package com.ibtihel.app.services.ml;

import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface MlService {

    /**
     * Predict total demand for the next 12 months.
     * @param productCode optional — scope the forecast to a specific product
     */
    Map<String, Object> predictYear(String productCode);

    /**
     * Upload an Excel file and train the default model (LightGBM / RandomForest).
     */
    Map<String, Object> uploadAndTrain(MultipartFile file);

    /**
     * Train Random Forest and XGBoost on the same Excel file, compare their
     * metrics side by side, and save the best model as the active one.
     *
     * Routes: Java → Python POST /compare-rf-xgb
     *
     * @param file Excel file with historical stock data
     * @return comparison result: metrics for both models + winner
     */
    Map<String, Object> compareRfXgb(MultipartFile file);

    /**
     * Send a natural language message to the AI assistant.
     * @param message the user's question in French
     */
    Map<String, Object> chat(String message);
}
