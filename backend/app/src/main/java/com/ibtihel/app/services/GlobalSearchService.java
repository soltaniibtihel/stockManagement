package com.ibtihel.app.services;

import com.ibtihel.app.dto.SearchResultItem;
import com.ibtihel.app.entities.*;
import com.ibtihel.app.repositories.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service de recherche globale multi-critères.
 *
 * Critères supportés :
 *  1. q          — mot-clé (nom, code, description, notes…)
 *  2. type       — ALL | PRODUCT | MOVEMENT | PRODUCTION | WAREHOUSE | SHOWCASE | STOCK
 *  3. status     — REALISEE | PLANIFIEE   (filtre Productions)
 *  4. movType    — PO | WO | SO | VNP | TR | TSS  (filtre Mouvements)
 *  5. category   — HUILE | MARGARINE | SAUCE | MAYONNAISE  (filtre Galerie)
 *  6. lowStock   — true → seuls les stocks sous le seuil de sécurité
 */
@Service
public class GlobalSearchService {

    private static final int MAX_PER_TYPE = 6;

    private final ProductRepository          productRepo;
    private final ProductMovementRepository  movementRepo;
    private final ProductionRepository       productionRepo;
    private final WarehouseRepository        warehouseRepo;
    private final ShowcaseProductRepository  showcaseRepo;
    private final StockRepository            stockRepo;

    public GlobalSearchService(ProductRepository productRepo,
                                ProductMovementRepository movementRepo,
                                ProductionRepository productionRepo,
                                WarehouseRepository warehouseRepo,
                                ShowcaseProductRepository showcaseRepo,
                                StockRepository stockRepo) {
        this.productRepo    = productRepo;
        this.movementRepo   = movementRepo;
        this.productionRepo = productionRepo;
        this.warehouseRepo  = warehouseRepo;
        this.showcaseRepo   = showcaseRepo;
        this.stockRepo      = stockRepo;
    }

    // ────────────────────────────────────────────────────────────────────────
    public List<SearchResultItem> search(String q,
                                          String type,
                                          String status,
                                          String movType,
                                          String category,
                                          boolean lowStock) {

        String kw = (q == null) ? "" : q.trim().toLowerCase();
        String t  = (type == null || type.isBlank()) ? "ALL" : type.toUpperCase();

        List<SearchResultItem> results = new ArrayList<>();

        if (t.equals("ALL") || t.equals("PRODUCT"))    results.addAll(searchProducts(kw));
        if (t.equals("ALL") || t.equals("MOVEMENT"))   results.addAll(searchMovements(kw, movType));
        if (t.equals("ALL") || t.equals("PRODUCTION")) results.addAll(searchProductions(kw, status));
        if (t.equals("ALL") || t.equals("WAREHOUSE"))  results.addAll(searchWarehouses(kw));
        if (t.equals("ALL") || t.equals("SHOWCASE"))   results.addAll(searchShowcase(kw, category));
        if (t.equals("ALL") || t.equals("STOCK"))      results.addAll(searchStocks(kw, lowStock));

        return results;
    }

    // ── Produits ─────────────────────────────────────────────────────────────
    private List<SearchResultItem> searchProducts(String kw) {
        return productRepo.findAll().stream()
            .filter(p -> kw.isEmpty()
                || contains(p.getName(), kw)
                || contains(p.getCode(), kw)
                || contains(p.getDescription(), kw)
                || (p.getCategory() != null && contains(p.getCategory().getName(), kw)))
            .limit(MAX_PER_TYPE)
            .map(p -> {
                String sub = "Code : " + p.getCode()
                    + (p.getCategory() != null ? " · " + p.getCategory().getName() : "")
                    + (p.getUnit() != null ? " · " + p.getUnit() : "");
                return new SearchResultItem("PRODUCT", p.getId(),
                    p.getName(), sub,
                    "/products/edit/" + p.getId(),
                    "Produit", "Package");
            })
            .collect(Collectors.toList());
    }

    // ── Mouvements ───────────────────────────────────────────────────────────
    private List<SearchResultItem> searchMovements(String kw, String movType) {
        return movementRepo.findAll().stream()
            .filter(m -> {
                boolean matchKw = kw.isEmpty()
                    || (m.getProduct() != null && contains(m.getProduct().getName(), kw))
                    || contains(m.getType().name(), kw);
                boolean matchType = movType == null || movType.isBlank()
                    || m.getType().name().equalsIgnoreCase(movType);
                return matchKw && matchType;
            })
            .limit(MAX_PER_TYPE)
            .map(m -> {
                String prod = m.getProduct() != null ? m.getProduct().getName() : "—";
                String sub  = prod + " · " + fmt(m.getQuantity()) + " · " +
                    (m.getDate() != null ? m.getDate().toString() : "");
                return new SearchResultItem("MOVEMENT", m.getId(),
                    "Mouvement " + m.getType().name(), sub,
                    "/product-movements/" + m.getId() + "/detail",
                    m.getType().name(), "ArrowLeftRight");
            })
            .collect(Collectors.toList());
    }

    // ── Productions ──────────────────────────────────────────────────────────
    private List<SearchResultItem> searchProductions(String kw, String status) {
        return productionRepo.findAll().stream()
            .filter(p -> {
                boolean matchKw = kw.isEmpty()
                    || (p.getProduct() != null && contains(p.getProduct().getName(), kw))
                    || contains(p.getNotes(), kw);
                boolean matchSt = status == null || status.isBlank()
                    || p.getStatus().name().equalsIgnoreCase(status);
                return matchKw && matchSt;
            })
            .limit(MAX_PER_TYPE)
            .map(p -> {
                String prod = p.getProduct() != null ? p.getProduct().getName() : "—";
                String sub  = fmt(p.getProducedQuantity()) + " unités · " + p.getStatus().name()
                    + (p.getProductionDate() != null
                       ? " · " + p.getProductionDate().toLocalDate() : "");
                return new SearchResultItem("PRODUCTION", p.getId(),
                    prod, sub,
                    "/productions/edit/" + p.getId(),
                    p.getStatus().name(), "Factory");
            })
            .collect(Collectors.toList());
    }

    // ── Entrepôts ────────────────────────────────────────────────────────────
    private List<SearchResultItem> searchWarehouses(String kw) {
        return warehouseRepo.findAll().stream()
            .filter(w -> kw.isEmpty()
                || contains(w.getName(), kw)
                || contains(w.getLocation(), kw))
            .limit(MAX_PER_TYPE)
            .map(w -> {
                String sub = (w.getLocation() != null ? w.getLocation() : "")
                    + (w.getCapacity() != null ? " · Cap. " + fmt(w.getCapacity()) : "");
                return new SearchResultItem("WAREHOUSE", w.getId(),
                    w.getName(), sub,
                    "/warehouses/edit/" + w.getId(),
                    "Entrepôt", "Warehouse");
            })
            .collect(Collectors.toList());
    }

    // ── Galerie Jadida ───────────────────────────────────────────────────────
    private List<SearchResultItem> searchShowcase(String kw, String category) {
        return showcaseRepo.findAll().stream()
            .filter(s -> {
                boolean matchKw = kw.isEmpty()
                    || contains(s.getName(), kw)
                    || contains(s.getDescription(), kw)
                    || contains(s.getBrand(), kw)
                    || contains(s.getVolume(), kw);
                boolean matchCat = category == null || category.isBlank()
                    || s.getCategory().name().equalsIgnoreCase(category);
                return matchKw && matchCat;
            })
            .limit(MAX_PER_TYPE)
            .map(s -> {
                String sub = s.getBrand() + " · " + s.getCategory().name()
                    + (s.getVolume() != null ? " · " + s.getVolume() : "");
                return new SearchResultItem("SHOWCASE", s.getId(),
                    s.getName(), sub,
                    "/",
                    s.getCategory().name(), "Store");
            })
            .collect(Collectors.toList());
    }

    // ── Stocks ───────────────────────────────────────────────────────────────
    private List<SearchResultItem> searchStocks(String kw, boolean lowStock) {
        return stockRepo.findAll().stream()
            .filter(s -> {
                boolean matchKw = kw.isEmpty()
                    || (s.getProduct() != null && contains(s.getProduct().getName(), kw))
                    || (s.getWarehouse() != null && contains(s.getWarehouse().getName(), kw));
                boolean matchLow = !lowStock
                    || (s.getSafetyStock() != null && s.getQuantityAvailable() != null
                        && s.getQuantityAvailable() < s.getSafetyStock());
                return matchKw && matchLow;
            })
            .limit(MAX_PER_TYPE)
            .map(s -> {
                String prod  = s.getProduct()   != null ? s.getProduct().getName()   : "—";
                String wh    = s.getWarehouse() != null ? s.getWarehouse().getName() : "—";
                boolean alert = s.getSafetyStock() != null && s.getQuantityAvailable() != null
                    && s.getQuantityAvailable() < s.getSafetyStock();
                String sub   = "Dispo : " + fmt(s.getQuantityAvailable())
                    + " · Entrepôt : " + wh
                    + (alert ? " ⚠ Sous seuil" : "");
                return new SearchResultItem("STOCK", s.getId(),
                    prod, sub,
                    "/stocks/edit/" + s.getId(),
                    alert ? "⚠ Alerte" : "Stock", "BarChart2");
            })
            .collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private boolean contains(String field, String kw) {
        return field != null && field.toLowerCase().contains(kw);
    }

    private String fmt(Double v) {
        if (v == null) return "0";
        return v == Math.floor(v) ? String.valueOf(v.longValue()) : String.valueOf(v);
    }
}
