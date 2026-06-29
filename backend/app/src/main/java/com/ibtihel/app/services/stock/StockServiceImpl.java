package com.ibtihel.app.services.stock;

import com.ibtihel.app.entities.Stock;
import com.ibtihel.app.repositories.StockRepository;
import com.ibtihel.app.repositories.ProductRepository;
import com.ibtihel.app.repositories.WarehouseRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StockServiceImpl implements StockService {

    private final StockRepository stockRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

    public StockServiceImpl(StockRepository stockRepository,
                            ProductRepository productRepository,
                            WarehouseRepository warehouseRepository) {
        this.stockRepository = stockRepository;
        this.productRepository = productRepository;
        this.warehouseRepository = warehouseRepository;
    }

    @Override
    public Stock createStock(Stock stock) {
        if (stock.getProduct() != null && stock.getProduct().getId() != null) {
            stock.setProduct(productRepository.findById(stock.getProduct().getId()).orElse(null));
        }
        if (stock.getWarehouse() != null && stock.getWarehouse().getId() != null) {
            stock.setWarehouse(warehouseRepository.findById(stock.getWarehouse().getId()).orElse(null));
        }
        checkCategoryMatch(stock.getProduct(), stock.getWarehouse());
        checkCapacity(stock.getWarehouse(), stock.getQuantityAvailable(), null);
        return stockRepository.save(stock);
    }

    @Override
    public List<Stock> getAllStocks() {
        return stockRepository.findAll();
    }

    @Override
    public Stock getStockById(Long id) {
        return stockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock not found with id " + id));
    }

    @Override
    public Stock updateStock(Long id, Stock updatedStock) {
        Stock existingStock = getStockById(id);
        
        existingStock.setQuantityAvailable(updatedStock.getQuantityAvailable());
        existingStock.setSafetyStock(updatedStock.getSafetyStock());
        existingStock.setReorderPoint(updatedStock.getReorderPoint());
        
        if (updatedStock.getProduct() != null && updatedStock.getProduct().getId() != null) {
            existingStock.setProduct(productRepository.findById(updatedStock.getProduct().getId()).orElse(null));
        }
        if (updatedStock.getWarehouse() != null && updatedStock.getWarehouse().getId() != null) {
            existingStock.setWarehouse(warehouseRepository.findById(updatedStock.getWarehouse().getId()).orElse(null));
        }
        checkCategoryMatch(existingStock.getProduct(), existingStock.getWarehouse());
        checkCapacity(existingStock.getWarehouse(), existingStock.getQuantityAvailable(), id);
        return stockRepository.save(existingStock);
    }

    private void checkCategoryMatch(com.ibtihel.app.entities.Product product, com.ibtihel.app.entities.Warehouse warehouse) {
        if (product == null || warehouse == null) return;
        com.ibtihel.app.entities.Category pCat = product.getCategory();
        com.ibtihel.app.entities.Category wCat = warehouse.getCategory();
        if (pCat == null || wCat == null) return;
        if (!pCat.getId().equals(wCat.getId())) {
            throw new IllegalArgumentException(
                String.format("Category mismatch: product belongs to '%s' but warehouse belongs to '%s'.",
                    pCat.getName(), wCat.getName()));
        }
    }

    private void checkCapacity(com.ibtihel.app.entities.Warehouse warehouse, Double newQty, Long excludeStockId) {
        if (warehouse == null || warehouse.getCapacity() == null || warehouse.getCapacity() <= 0) return;
        double used = excludeStockId == null
                ? stockRepository.sumQuantityByWarehouseId(warehouse.getId())
                : stockRepository.sumQuantityByWarehouseIdExcluding(warehouse.getId(), excludeStockId);
        double qty = newQty == null ? 0 : newQty;
        if (used + qty > warehouse.getCapacity()) {
            throw new IllegalArgumentException(
                String.format("Capacity exceeded: warehouse '%s' has capacity %.2f, already used %.2f, requested %.2f.",
                    warehouse.getName(), warehouse.getCapacity(), used, qty));
        }
    }

    @Override
    public void deleteStock(Long id) {
        stockRepository.deleteById(id);
    }
}
