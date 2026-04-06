package com.ibtihel.app.services.product;

import com.ibtihel.app.entities.Product;
import com.ibtihel.app.repositories.ProductRepository;
import com.ibtihel.app.repositories.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductServiceImpl(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    public Product createProduct(Product product) {
        if (product.getCategory() != null && product.getCategory().getId() != null) {
            product.setCategory(categoryRepository.findById(product.getCategory().getId()).orElse(null));
        }
        return productRepository.save(product);
    }

    @Override
    public Product updateProduct(Long id, Product updatedProduct) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        existingProduct.setCode(updatedProduct.getCode());
        existingProduct.setName(updatedProduct.getName());
        existingProduct.setUnit(updatedProduct.getUnit());
        existingProduct.setShelfLife(updatedProduct.getShelfLife());

        if (updatedProduct.getCategory() != null && updatedProduct.getCategory().getId() != null) {
            existingProduct.setCategory(categoryRepository.findById(updatedProduct.getCategory().getId()).orElse(null));
        }

        return productRepository.save(existingProduct);
    }

    @Override
    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    @Override
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Override
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    @Override
    public List<Product> searchProducts(String name, String code) {
        return productRepository.findByNameContainingIgnoreCaseAndCodeContainingIgnoreCase(name, code);
    }

    @Override
    public List<Product> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }
}

