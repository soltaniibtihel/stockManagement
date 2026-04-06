package com.ibtihel.app.services;

import com.ibtihel.app.entities.ProductMovementDetail;
import com.ibtihel.app.repositories.ProductMovementDetailRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProductMovementDetailService {

    @Autowired
    private ProductMovementDetailRepository productMovementDetailRepository;

    public List<ProductMovementDetail> findAll() {
        return productMovementDetailRepository.findAll();
    }

    public Optional<ProductMovementDetail> findById(Long id) {
        return productMovementDetailRepository.findById(id);
    }
    
    public Optional<ProductMovementDetail> findByProductMovementId(Long movementId) {
        return productMovementDetailRepository.findByProductMovementId(movementId);
    }

    public ProductMovementDetail save(ProductMovementDetail detail) {
        detail.setTotalPrice(detail.getUnitPrice() * detail.getProductMovement().getQuantity());
        return productMovementDetailRepository.save(detail);
    }

    public ProductMovementDetail update(Long id, ProductMovementDetail updatedDetail) {
        return productMovementDetailRepository.findById(id).map(detail -> {
            detail.setUnitPrice(updatedDetail.getUnitPrice());
            // Recalculate total price
            double totalPrice = updatedDetail.getUnitPrice() * detail.getProductMovement().getQuantity();
            detail.setTotalPrice(totalPrice);
            return productMovementDetailRepository.save(detail);
        }).orElseThrow(() -> new RuntimeException("ProductMovementDetail not found"));
    }

    public void deleteById(Long id) {
        productMovementDetailRepository.deleteById(id);
    }
}
