package com.ibtihel.app.repositories;

import com.ibtihel.app.entities.Product;
import com.ibtihel.app.entities.ProductType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByCode(String code);

    List<Product> findByNameContainingIgnoreCaseAndCodeContainingIgnoreCase(String name, String code);

    List<Product> findByCategoryId(Long categoryId);

    Optional<Product> findByName(String name);

    /** Tous les produits d'un type donné (RAW_MATERIAL, FINISHED_PRODUCT…) */
    List<Product> findByProductType(ProductType productType);

    boolean existsByCode(String code);
}
