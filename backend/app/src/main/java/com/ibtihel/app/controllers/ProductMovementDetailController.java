package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.ProductMovementDetail;
import com.ibtihel.app.services.ProductMovementDetailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-movement-details")
@CrossOrigin(origins = "http://localhost:3000")
public class ProductMovementDetailController {

    @Autowired
    private ProductMovementDetailService productMovementDetailService;

    @GetMapping
    public List<ProductMovementDetail> getAllProductMovementDetails() {
        return productMovementDetailService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductMovementDetail> getProductMovementDetailById(@PathVariable Long id) {
        return productMovementDetailService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/movement/{movementId}")
    public ResponseEntity<ProductMovementDetail> getDetailByMovementId(@PathVariable Long movementId) {
        return productMovementDetailService.findByProductMovementId(movementId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ProductMovementDetail createProductMovementDetail(@RequestBody ProductMovementDetail productMovementDetail) {
        return productMovementDetailService.save(productMovementDetail);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductMovementDetail> updateProductMovementDetail(@PathVariable Long id, @RequestBody ProductMovementDetail productMovementDetail) {
        try {
            return ResponseEntity.ok(productMovementDetailService.update(id, productMovementDetail));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProductMovementDetail(@PathVariable Long id) {
        productMovementDetailService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
