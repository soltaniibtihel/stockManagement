package com.ibtihel.app.controllers;

import com.ibtihel.app.services.ExcelService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@CrossOrigin("*")
public class ImportController {

    private final ExcelService excelService;

    public ImportController(ExcelService excelService) {
        this.excelService = excelService;
    }

    /**
     * POST /api/import/products
     *
     * Colonnes Excel (header obligatoire) :
     *   A: code | B: name | C: unit | D: description | E: shelfLife
     *   F: stockQuantity | G: safetyStock | H: productType | I: category
     *
     * Si le code existe déjà → mise à jour du produit.
     * Sinon → création d'un nouveau produit.
     */
    @PostMapping("/products")
    public ResponseEntity<Map<String, Object>> importProducts(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        if (file.isEmpty()) {
            response.put("error", "Le fichier est vide.");
            return ResponseEntity.badRequest().body(response);
        }
        try {
            Map<String, Object> result = excelService.importProducts(file);
            int created = (int) result.get("successCount");
            int updated = (int) result.get("updatedCount");
            response.put("message", created + " produit(s) créé(s), " + updated + " mis à jour.");
            response.put("successCount", created);
            response.put("updatedCount", updated);
            response.put("errors", result.get("errors"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Erreur d'import : " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/stocks")
    public ResponseEntity<Map<String, Object>> importStocks(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        if (file.isEmpty()) {
            response.put("error", "Le fichier est vide.");
            return ResponseEntity.badRequest().body(response);
        }
        try {
            Map<String, Object> result = excelService.importStocks(file);
            response.put("message", result.get("successCount") + " entrée(s) de stock importée(s) avec succès.");
            response.put("successCount", result.get("successCount"));
            response.put("errors", result.get("errors"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Erreur d'import : " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/productions")
    public ResponseEntity<Map<String, Object>> importProductions(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        if (file.isEmpty()) {
            response.put("error", "Le fichier est vide.");
            return ResponseEntity.badRequest().body(response);
        }
        try {
            Map<String, Object> result = excelService.importProductions(file);
            response.put("message", result.get("successCount") + " production(s) importée(s) avec succès.");
            response.put("successCount", result.get("successCount"));
            response.put("errors", result.get("errors"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Erreur d'import : " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/product-movements")
    public ResponseEntity<Map<String, Object>> importProductMovements(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        if (file.isEmpty()) {
            response.put("error", "Le fichier est vide.");
            return ResponseEntity.badRequest().body(response);
        }
        try {
            Map<String, Object> result = excelService.importProductMovements(file);
            response.put("message", result.get("successCount") + " mouvement(s) de produit importé(s) avec succès.");
            response.put("successCount", result.get("successCount"));
            response.put("errors", result.get("errors"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Erreur d'import : " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}