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