package com.ibtihel.app.repositories;

import com.ibtihel.app.entities.ProductMovementDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductMovementDetailRepository extends JpaRepository<ProductMovementDetail, Long> {
    Optional<ProductMovementDetail> findByProductMovementId(Long productMovementId);
}
