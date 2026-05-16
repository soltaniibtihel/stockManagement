package com.ibtihel.app.controllers;

import com.ibtihel.app.services.ml.MlService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ml")
@CrossOrigin(origins = "*")
public class MlController {

    private final MlService mlService;

    public MlController(MlService mlService) {
        this.mlService = mlService;
    }

    /**
     * POST /api/ml/predict
     * Body: { historical_quantities: [...], safety_stock: 50, current_quantity: 120 }
     */
    @PostMapping("/predict")
    public ResponseEntity<?> predict(@RequestBody Map<String, Object> body) {
        try {
            @SuppressWarnings("unchecked")
            List<Double> quantities = (List<Double>) body.get("historical_quantities");
            double safetyStock      = body.containsKey("safety_stock")
                    ? ((Number) body.get("safety_stock")).doubleValue() : 0.0;
            double currentQty       = body.containsKey("current_quantity")
                    ? ((Number) body.get("current_quantity")).doubleValue() : 0.0;

            Map<String, Object> result = mlService.predictDemand(quantities, safetyStock, currentQty);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/ml/train  (multipart file upload)
     */
    @PostMapping("/train")
    public ResponseEntity<?> train(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = mlService.uploadAndTrain(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
