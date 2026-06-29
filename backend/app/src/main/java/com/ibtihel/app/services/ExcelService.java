package com.ibtihel.app.services;

import com.ibtihel.app.entities.Category;
import com.ibtihel.app.entities.Product;
import com.ibtihel.app.entities.ProductMovement;
import com.ibtihel.app.entities.ProductMovementDetail;
import com.ibtihel.app.entities.ProductMovementType;
import com.ibtihel.app.entities.Production;
import com.ibtihel.app.entities.ProductionStatus;
import com.ibtihel.app.entities.ProductType;
import com.ibtihel.app.entities.Stock;
import com.ibtihel.app.entities.User;
import com.ibtihel.app.entities.Warehouse;
import com.ibtihel.app.repositories.CategoryRepository;
import com.ibtihel.app.repositories.ProductMovementRepository;
import com.ibtihel.app.repositories.ProductRepository;
import com.ibtihel.app.repositories.ProductionRepository;
import com.ibtihel.app.repositories.StockRepository;
import com.ibtihel.app.repositories.UserRepository;
import com.ibtihel.app.repositories.WarehouseRepository;
import com.ibtihel.app.services.ProductMovementService;
import com.ibtihel.app.services.production.ProductionService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.usermodel.DateUtil;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Service
public class ExcelService {

    private final ProductRepository         productRepository;
    private final CategoryRepository        categoryRepository;
    private final StockRepository           stockRepository;
    private final WarehouseRepository       warehouseRepository;
    private final ProductMovementRepository productMovementRepository;
    private final ProductionRepository      productionRepository;
    private final UserRepository            userRepository;
    // Services avec logique métier (sync stock automatique)
    private final ProductMovementService    productMovementService;
    private final ProductionService         productionService;

    public ExcelService(ProductRepository productRepository,
                        CategoryRepository categoryRepository,
                        StockRepository stockRepository,
                        WarehouseRepository warehouseRepository,
                        ProductMovementRepository productMovementRepository,
                        ProductionRepository productionRepository,
                        UserRepository userRepository,
                        ProductMovementService productMovementService,
                        ProductionService productionService) {
        this.productRepository         = productRepository;
        this.categoryRepository        = categoryRepository;
        this.stockRepository           = stockRepository;
        this.warehouseRepository       = warehouseRepository;
        this.productMovementRepository = productMovementRepository;
        this.productionRepository      = productionRepository;
        this.userRepository            = userRepository;
        this.productMovementService    = productMovementService;
        this.productionService         = productionService;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType();
        if (type == CellType.STRING) {
            return cell.getStringCellValue().trim();
        } else if (type == CellType.NUMERIC) {
            return String.valueOf((long) cell.getNumericCellValue());
        } else {
            return "";
        }
    }

    private Double getCellDouble(Cell cell) {
        if (cell == null || cell.getCellType() == CellType.BLANK) return 0.0;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try { 
                return Double.parseDouble(cell.getStringCellValue().trim()); 
            } catch (Exception e) { 
                return 0.0; 
            }
        }
        return 0.0;
    }

    public Map<String, Object> importStocks(MultipartFile file) throws Exception {
        InputStream is = file.getInputStream();
        Workbook workbook = WorkbookFactory.create(is);
        Sheet sheet = workbook.getSheetAt(0);
        Iterator<Row> rows = sheet.iterator();

        if (rows.hasNext()) rows.next(); // Skip header

        int successCount = 0;
        List<String> errors = new ArrayList<>();

        while (rows.hasNext()) {
            Row row = rows.next();
            try {
                String productName = getCellString(row.getCell(0));
                if (productName.isEmpty()) continue;

                Product product = productRepository.findByName(productName)
                        .orElseThrow(() -> new RuntimeException("Produit introuvable : " + productName));

                Warehouse warehouse = null;
                String warehouseName = getCellString(row.getCell(1));
                if (!warehouseName.isEmpty()) {
                    warehouse = warehouseRepository.findByName(warehouseName).orElse(null);
                }

                Stock stock = new Stock();
                stock.setProduct(product);
                stock.setWarehouse(warehouse);
                stock.setQuantityAvailable(getCellDouble(row.getCell(2)));
                stock.setSafetyStock(getCellDouble(row.getCell(3)));
                stock.setReorderPoint(getCellDouble(row.getCell(4)));
                stock.setLastUpdated(LocalDateTime.now());

                stockRepository.save(stock);
                successCount++;
            } catch (Exception e) {
                errors.add("Ligne " + (row.getRowNum() + 1) + " : " + e.getMessage());
            }
        }
        workbook.close();

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("errors", errors);
        return result;
    }

    public Map<String, Object> importProductMovements(MultipartFile file) throws Exception {
        InputStream is = file.getInputStream();
        Workbook workbook = WorkbookFactory.create(is);
        Sheet sheet = workbook.getSheetAt(0);
        Iterator<Row> rows = sheet.iterator();

        if (rows.hasNext()) rows.next();

        int successCount = 0;
        List<String> errors = new ArrayList<>();

        while (rows.hasNext()) {
            Row row = rows.next();
            try {
                String productName = getCellString(row.getCell(0));
                if (productName.isEmpty()) continue;

                Product product = productRepository.findByName(productName)
                        .orElseThrow(() -> new RuntimeException("Produit introuvable : " + productName));

                String typeStr = getCellString(row.getCell(1)).toUpperCase();
                ProductMovementType type = ProductMovementType.valueOf(typeStr);

                Double quantity = getCellDouble(row.getCell(2));

                LocalDate date = LocalDate.now();
                Cell dateCell = row.getCell(3);
                if (dateCell != null && DateUtil.isCellDateFormatted(dateCell)) {
                    date = dateCell.getLocalDateTimeCellValue().toLocalDate();
                }

                ProductMovement movement = new ProductMovement();
                movement.setProduct(product);
                movement.setType(type);
                movement.setQuantity(quantity);
                movement.setDate(date);

                Double unitPrice = getCellDouble(row.getCell(4));
                if (unitPrice > 0) {
                    ProductMovementDetail detail = new ProductMovementDetail();
                    detail.setUnitPrice(unitPrice);
                    detail.setTotalPrice(unitPrice * quantity);
                    movement.setDetail(detail);
                }

                // Passe par le service → déclenche la sync stock automatique
                productMovementService.save(movement);
                successCount++;
            } catch (Exception e) {
                errors.add("Ligne " + (row.getRowNum() + 1) + " : " + e.getMessage());
            }
        }
        workbook.close();

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("errors", errors);
        return result;
    }

    /**
     * Importe des productions réalisées depuis un fichier Excel.
     *
     * Colonnes attendues (header obligatoire) :
     *   A: nom_produit   (String  — nom exact du produit)
     *   B: date          (Date    — date de production)
     *   C: quantite      (Number  — quantité produite)
     *   D: stock_dest    (String  — nom du stock/entrepôt destination, optionnel)
     *   E: operateur     (String  — prénom ou email de l'opérateur, optionnel)
     *   F: notes         (String  — commentaire libre, optionnel)
     */
    public Map<String, Object> importProductions(MultipartFile file) throws Exception {
        InputStream is = file.getInputStream();
        Workbook workbook = WorkbookFactory.create(is);
        Sheet sheet = workbook.getSheetAt(0);
        Iterator<Row> rows = sheet.iterator();

        if (rows.hasNext()) rows.next(); // Skip header

        int successCount = 0;
        List<String> errors = new ArrayList<>();

        while (rows.hasNext()) {
            Row row = rows.next();
            try {
                String productName = getCellString(row.getCell(0));
                if (productName.isEmpty()) continue;

                Product product = productRepository.findByName(productName)
                        .orElseThrow(() -> new RuntimeException("Produit introuvable : " + productName));

                // Date de production
                LocalDateTime productionDate = LocalDateTime.now();
                Cell dateCell = row.getCell(1);
                if (dateCell != null && dateCell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(dateCell)) {
                    productionDate = dateCell.getLocalDateTimeCellValue();
                } else if (dateCell != null && dateCell.getCellType() == CellType.STRING) {
                    try {
                        productionDate = java.time.LocalDate.parse(
                                dateCell.getStringCellValue().trim()).atStartOfDay();
                    } catch (Exception ignored) {}
                }

                Double quantity = getCellDouble(row.getCell(2));

                // Stock destination (optionnel)
                Stock stock = null;
                String stockName = getCellString(row.getCell(3));
                if (!stockName.isEmpty()) {
                    stock = stockRepository.findAll().stream()
                            .filter(s -> stockName.equalsIgnoreCase(
                                    s.getWarehouse() != null ? s.getWarehouse().getName() : ""))
                            .findFirst().orElse(null);
                }

                // Opérateur (optionnel)
                User user = null;
                String operateur = getCellString(row.getCell(4));
                if (!operateur.isEmpty()) {
                    user = userRepository.findAll().stream()
                            .filter(u -> operateur.equalsIgnoreCase(u.getFirstName())
                                    || operateur.equalsIgnoreCase(u.getEmail()))
                            .findFirst().orElse(null);
                }

                String notes = getCellString(row.getCell(5));

                Production production = new Production();
                production.setProduct(product);
                production.setProductionDate(productionDate);
                production.setProducedQuantity(quantity);
                production.setStock(stock);
                production.setUser(user);
                production.setStatus(ProductionStatus.REALISEE);
                production.setNotes(notes.isEmpty() ? "Importé via fichier Excel" : notes);

                // Passe par le service → génère WO + sync stock si RÉALISÉE
                productionService.createProduction(production);
                successCount++;
            } catch (Exception e) {
                errors.add("Ligne " + (row.getRowNum() + 1) + " : " + e.getMessage());
            }
        }
        workbook.close();

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("errors", errors);
        return result;
    }

    /**
     * Importe des produits depuis un fichier Excel.
     *
     * Si un produit avec le même code existe déjà, il est mis à jour.
     * Sinon, un nouveau produit est créé.
     *
     * Colonnes attendues (header obligatoire, ordre fixe) :
     *   A : code          (String  — obligatoire, doit être unique)
     *   B : name          (String  — obligatoire)
     *   C : unit          (String  — ex. "kg", "L", "pcs")
     *   D : description   (String  — optionnel)
     *   E : shelfLife     (Number  — durée de vie en jours, optionnel)
     *   F : stockQuantity (Number  — quantité en stock initiale, optionnel)
     *   G : safetyStock   (Number  — stock de sécurité, optionnel)
     *   H : productType   (String  — RAW_MATERIAL | FINISHED_PRODUCT | SEMI_FINISHED |
     *                                PACKAGING | BY_PRODUCT   défaut : FINISHED_PRODUCT)
     *   I : category      (String  — nom exact de la catégorie, optionnel)
     */
    public Map<String, Object> importProducts(MultipartFile file) throws Exception {
        InputStream is = file.getInputStream();
        Workbook workbook = WorkbookFactory.create(is);
        Sheet sheet = workbook.getSheetAt(0);
        Iterator<Row> rows = sheet.iterator();

        if (rows.hasNext()) rows.next(); // Skip header row

        int successCount = 0;
        int updatedCount = 0;
        List<String> errors = new ArrayList<>();

        // Pré-charger toutes les catégories pour éviter N requêtes
        List<Category> allCategories = categoryRepository.findAll();

        while (rows.hasNext()) {
            Row row = rows.next();
            try {
                String code = getCellString(row.getCell(0));
                if (code.isEmpty()) continue; // Ligne vide ignorée

                String name = getCellString(row.getCell(1));
                if (name.isEmpty()) {
                    errors.add("Ligne " + (row.getRowNum() + 1) + " : le nom (colonne B) est obligatoire.");
                    continue;
                }

                // Chercher le produit existant par code → update, sinon → create
                boolean isUpdate = productRepository.existsByCode(code);
                Product product = productRepository.findByCode(code)
                        .orElse(new Product());

                product.setCode(code);
                product.setName(name);
                product.setUnit(getCellString(row.getCell(2)));
                product.setDescription(getCellString(row.getCell(3)));

                // shelfLife (colonne E) — entier en jours
                Double shelfLifeVal = getCellDouble(row.getCell(4));
                if (shelfLifeVal > 0) product.setShelfLife(shelfLifeVal.intValue());

                product.setStockQuantity(getCellDouble(row.getCell(5)));
                product.setSafetyStock(getCellDouble(row.getCell(6)));

                // productType (colonne H) — valeur enum ou défaut FINISHED_PRODUCT
                String typeStr = getCellString(row.getCell(7)).toUpperCase().trim();
                try {
                    product.setProductType(typeStr.isEmpty()
                            ? ProductType.FINISHED_PRODUCT
                            : ProductType.valueOf(typeStr));
                } catch (IllegalArgumentException e) {
                    product.setProductType(ProductType.FINISHED_PRODUCT);
                }

                // Catégorie (colonne I) — recherche par nom insensible à la casse
                String categoryName = getCellString(row.getCell(8));
                if (!categoryName.isEmpty()) {
                    allCategories.stream()
                            .filter(c -> c.getName().equalsIgnoreCase(categoryName))
                            .findFirst()
                            .ifPresent(product::setCategory);
                }

                productRepository.save(product);
                if (isUpdate) updatedCount++; else successCount++;

            } catch (Exception e) {
                errors.add("Ligne " + (row.getRowNum() + 1) + " : " + e.getMessage());
            }
        }
        workbook.close();

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("updatedCount", updatedCount);
        result.put("errors", errors);
        return result;
    }
}
