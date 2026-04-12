package com.ibtihel.app.services;

import com.ibtihel.app.entities.ProductMovement;
import com.ibtihel.app.entities.ProductMovementDetail;
import com.ibtihel.app.repositories.ProductMovementRepository;
import com.ibtihel.app.repositories.ProductMovementDetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProductMovementService {

    @Autowired
    private ProductMovementRepository productMovementRepository;

    @Autowired
    private ProductMovementDetailRepository productMovementDetailRepository;

    public List<ProductMovement> findAll() {
        return productMovementRepository.findAll();
    }

    public Optional<ProductMovement> findById(Long id) {
        return productMovementRepository.findById(id);
    }

    public ProductMovement save(ProductMovement productMovement) {
        // Ensure bidirectional relationship is properly set before persiting
        if (productMovement.getDetail() != null) {
            productMovement.getDetail().setProductMovement(productMovement);
        }

        // Automatically create a detail object if not present, because they are linked.
        ProductMovement savedMovement = productMovementRepository.save(productMovement);
        
        Optional<ProductMovementDetail> existingDetail = productMovementDetailRepository.findByProductMovementId(savedMovement.getId());
        if (existingDetail.isEmpty()) {
            ProductMovementDetail detail = new ProductMovementDetail();
            detail.setProductMovement(savedMovement);
            detail.setUnitPrice(0.0);
            detail.setTotalPrice(0.0);
            productMovementDetailRepository.save(detail);
        }
        
        return savedMovement;
    }

    public ProductMovement update(Long id, ProductMovement updatedMovement) {
        return productMovementRepository.findById(id).map(movement -> {
            movement.setProduct(updatedMovement.getProduct());
            movement.setQuantity(updatedMovement.getQuantity());
            movement.setType(updatedMovement.getType());
            movement.setDate(updatedMovement.getDate());
            return productMovementRepository.save(movement);
        }).orElseThrow(() -> new RuntimeException("ProductMovement not found"));
    }

    public void deleteById(Long id) {
        productMovementRepository.deleteById(id);
    }
}
