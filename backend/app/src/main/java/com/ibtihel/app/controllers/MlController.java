package com.ibtihel.app.controllers;

import com.ibtihel.app.services.ml.MlService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ml")
@CrossOrigin(origins = "*")
public class MlController {

    private final MlService mlService;

    public MlController(MlService mlService) {
        this.mlService = mlService;
    }

    /**
     * GET /api/ml/predict-year?product_code=XXX
     * Returns predicted demand and recommended stock for the next 12 months.
     */
    @GetMapping("/predict-year")
    public ResponseEntity<?> predictYear(
            @RequestParam(value = "product_code", required = false) String productCode) {
        try {
            Map<String, Object> result = mlService.predictYear(productCode);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/ml/chat
     * Envoie un message en langage naturel à l'assistant IA.
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> body) {
        try {
            String message = body.getOrDefault("message", "");
            if (message.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message vide."));
            }
            Map<String, Object> result = mlService.chat(message);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Si le service Python est indisponible, renvoyer un message clair
            String detail = e.getMessage();
            boolean serviceDown = detail != null && (detail.contains("Connection refused") || detail.contains("ConnectException"));
            String userMsg = serviceDown
                ? "⚠️ Le service d'intelligence artificielle est actuellement indisponible. Veuillez démarrer le serveur Python ML (port 8001)."
                : "⚠️ Erreur de l'assistant IA : " + detail;
            return ResponseEntity.status(503).body(Map.of("response", userMsg));
        }
    }

    /**
     * POST /api/ml/train  (multipart Excel upload)
     *
     * Entraîne le modèle par défaut (LightGBM ou RandomForest en fallback)
     * sur les données historiques du fichier Excel.
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

    /**
     * POST /api/ml/compare-models  (multipart Excel upload)
     *
     * Entraîne Random Forest et XGBoost sur le même fichier Excel,
     * compare leurs métriques (R², RMSE, MAE) et sauvegarde le meilleur
     * modèle comme modèle actif pour les prédictions futures.
     *
     * Routes : React → Java /api/ml/compare-models → Python /compare-rf-xgb
     */
    @PostMapping("/compare-models")
    public ResponseEntity<?> compareModels(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = mlService.compareRfXgb(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
