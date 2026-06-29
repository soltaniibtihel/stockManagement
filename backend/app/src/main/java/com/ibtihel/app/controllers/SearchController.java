package com.ibtihel.app.controllers;

import com.ibtihel.app.dto.SearchResultItem;
import com.ibtihel.app.services.GlobalSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GET /api/search
 *
 * Paramètres de requête (tous optionnels) :
 *   q         — mot-clé texte libre
 *   type      — ALL | PRODUCT | MOVEMENT | PRODUCTION | WAREHOUSE | SHOWCASE | STOCK
 *   status    — REALISEE | PLANIFIEE
 *   movType   — PO | WO | SO | VNP | TR | TSS
 *   category  — HUILE | MARGARINE | SAUCE | MAYONNAISE
 *   lowStock  — true | false
 */
@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*")
public class SearchController {

    private final GlobalSearchService searchService;

    public SearchController(GlobalSearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false, defaultValue = "")  String status,
            @RequestParam(required = false, defaultValue = "")  String movType,
            @RequestParam(required = false, defaultValue = "")  String category,
            @RequestParam(required = false, defaultValue = "false") boolean lowStock) {

        if (q.length() < 2 && type.equals("ALL") && status.isEmpty()
                && movType.isEmpty() && category.isEmpty() && !lowStock) {
            return ResponseEntity.ok(Map.of("results", List.of(), "total", 0));
        }

        List<SearchResultItem> results =
            searchService.search(q, type, status, movType, category, lowStock);

        return ResponseEntity.ok(Map.of("results", results, "total", results.size()));
    }
}
