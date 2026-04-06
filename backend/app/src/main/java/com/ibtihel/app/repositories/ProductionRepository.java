package com.ibtihel.app.repositories;

import com.ibtihel.app.entities.Production;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductionRepository extends JpaRepository<Production, Long> {

    List<Production> findByProductId(Long productId);

    @Query("SELECT SUM(p.producedQuantity) FROM Production p WHERE p.product.id = :id")
    Double getTotalProducedQuantity(Long id);

}