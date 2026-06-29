package com.ibtihel.app.repositories;

import com.ibtihel.app.entities.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    List<Stock> findByProductId(Long productId);

    Optional<Stock> findFirstByProductId(Long productId);

    @Query("SELECT COALESCE(SUM(s.quantityAvailable), 0) FROM Stock s WHERE s.product.id = :productId")
    Double sumQuantityByProductId(Long productId);

    @Query("SELECT COALESCE(SUM(s.quantityAvailable), 0) FROM Stock s WHERE s.warehouse.id = :warehouseId")
    Double sumQuantityByWarehouseId(Long warehouseId);

    @Query("SELECT COALESCE(SUM(s.quantityAvailable), 0) FROM Stock s WHERE s.warehouse.id = :warehouseId AND s.id <> :excludeId")
    Double sumQuantityByWarehouseIdExcluding(Long warehouseId, Long excludeId);

    List<Stock> findByWarehouseId(Long warehouseId);
}
