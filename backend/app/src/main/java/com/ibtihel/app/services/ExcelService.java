package com.ibtihel.app.services;

import com.ibtihel.app.entities.Product;
import com.ibtihel.app.entities.ProductMovement;
import com.ibtihel.app.entities.ProductMovementDetail;
import com.ibtihel.app.entities.ProductMovementType;
import com.ibtihel.app.entities.Stock;
import com.ibtihel.app.entities.Warehouse;
import com.ibtihel.app.repositories.ProductMovementRepository;
import com.ibtihel.app.repositories.ProductRepository;
import com.ibtihel.app.repositories.StockRepository;
import com.ibtihel.app.repositories.WarehouseRepository;
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

    private final ProductRepository productRepository;
    private final StockRepository stockRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductMovementRepository productMovementRepository;

    public ExcelService(ProductRepository productRepository,
                        StockRepository stockRepository,
                        WarehouseRepository warehouseRepository,
                        ProductMovementRepository productMovementRepository) {
        this.productRepository = productRepository;
        this.stockRepository = stockRepository;
        this.warehouseRepository = warehouseRepository;
        this.productMovementRepository = productMovementRepository;
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

                productMovementRepository.save(movement);
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
}
