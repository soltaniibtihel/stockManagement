package com.ibtihel.app.services.product;
import com.ibtihel.app.entities.Product;
import java.util.List;

public interface ProductService {

    Product createProduct(Product product);

    Product updateProduct(Long id, Product product);

    Product getProductById(Long id);

    List<Product> getAllProducts();

    void deleteProduct(Long id);

    List<Product> searchProducts(String name, String code);

    List<Product> getProductsByCategory(Long categoryId);

}
