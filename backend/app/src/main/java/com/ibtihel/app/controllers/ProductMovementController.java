package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.ProductMovement;
import com.ibtihel.app.services.ProductMovementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-movements")
@CrossOrigin(origins = "http://localhost:3000") // Matches the existing architecture
public class ProductMovementController {

    @Autowired
    private ProductMovementService productMovementService;

    @GetMapping
    public List<ProductMovement> getAllProductMovements() {
        return productMovementService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductMovement> getProductMovementById(@PathVariable Long id) {
        return productMovementService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ProductMovement createProductMovement(@RequestBody ProductMovement productMovement) {
        return productMovementService.save(productMovement);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductMovement> updateProductMovement(@PathVariable Long id, @RequestBody ProductMovement productMovement) {
        try {
            return ResponseEntity.ok(productMovementService.update(id, productMovement));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProductMovement(@PathVariable Long id) {
        productMovementService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
