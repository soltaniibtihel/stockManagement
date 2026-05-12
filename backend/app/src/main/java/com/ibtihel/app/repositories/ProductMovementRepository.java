package com.ibtihel.app.repositories;

import com.ibtihel.app.entities.ProductMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductMovementRepository extends JpaRepository<ProductMovement, Long> {
    List<ProductMovement> findByProductIdOrderByDateAsc(Long productId);
}
