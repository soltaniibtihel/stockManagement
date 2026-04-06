package com.ibtihel.app.services.stock;

import com.ibtihel.app.entities.Stock;
import java.util.List;

public interface StockService {
    Stock createStock(Stock stock);
    List<Stock> getAllStocks();
    Stock getStockById(Long id);
    Stock updateStock(Long id, Stock stock);
    void deleteStock(Long id);
}
