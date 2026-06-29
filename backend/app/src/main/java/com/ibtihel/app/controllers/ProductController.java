package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.Product;
import com.ibtihel.app.entities.ProductType;
import com.ibtihel.app.repositories.ProductRepository;
import com.ibtihel.app.services.product.ProductService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService    productService;
    private final ProductRepository productRepository;

    public ProductController(ProductService productService, ProductRepository productRepository) {
        this.productService    = productService;
        this.productRepository = productRepository;
    }

    // CREATE
    @PostMapping
    public Product createProduct(@RequestBody Product product) {
        return productService.createProduct(product);
    }

    // READ ALL
    @GetMapping
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    // READ BY ID
    @GetMapping("/{id}")
    public Product getProductById(@PathVariable Long id) {
        return productService.getProductById(id);
    }

    // UPDATE
    @PutMapping("/{id}")
    public Product updateProduct(@PathVariable Long id,
                                 @RequestBody Product product) {
        return productService.updateProduct(id, product);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
    }
    @GetMapping("/search")
    public List<Product> searchProducts(
            @RequestParam String name,
            @RequestParam String code
    ) {
        return productService.searchProducts(name, code);
    }

    @GetMapping("/category/{categoryId}")
    public List<Product> getProductsByCategory(@PathVariable Long categoryId) {
        return productService.getProductsByCategory(categoryId);
    }

    /**
     * GET /api/products/by-type/RAW_MATERIAL
     * Retourne tous les produits d'un type donné.
     */
    @GetMapping("/by-type/{type}")
    public List<Product> getByType(@PathVariable ProductType type) {
        return productRepository.findByProductType(type);
    }
}

