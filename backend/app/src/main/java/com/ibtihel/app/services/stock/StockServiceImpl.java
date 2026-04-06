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
        
        return stockRepository.save(existingStock);
    }

    @Override
    public void deleteStock(Long id) {
        stockRepository.deleteById(id);
    }
}
