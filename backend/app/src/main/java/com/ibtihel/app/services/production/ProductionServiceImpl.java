package com.ibtihel.app.services.production;

import com.ibtihel.app.entities.Production;
import com.ibtihel.app.repositories.ProductionRepository;
import com.ibtihel.app.repositories.ProductRepository;
import com.ibtihel.app.repositories.StockRepository;
import com.ibtihel.app.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductionServiceImpl implements ProductionService {

    private final ProductionRepository productionRepository;
    private final ProductRepository productRepository;
    private final StockRepository stockRepository;
    private final UserRepository userRepository;

    public ProductionServiceImpl(ProductionRepository productionRepository,
                                 ProductRepository productRepository,
                                 StockRepository stockRepository,
                                 UserRepository userRepository) {
        this.productionRepository = productionRepository;
        this.productRepository = productRepository;
        this.stockRepository = stockRepository;
        this.userRepository = userRepository;
    }

    @Override
    public List<Production> getProductionsByProduct(Long productId) {
        return productionRepository.findByProductId(productId);
    }

    @Override
    public Double getTotalProduction(Long productId) {
        Double total = productionRepository.getTotalProducedQuantity(productId);
        return total == null ? 0 : total;
    }

    @Override
    public Production createProduction(Production production) {
        if (production.getProduct() != null && production.getProduct().getId() != null) {
            production.setProduct(productRepository.findById(production.getProduct().getId()).orElse(null));
        }
        if (production.getStock() != null && production.getStock().getId() != null) {
            production.setStock(stockRepository.findById(production.getStock().getId()).orElse(null));
        }
        if (production.getUser() != null && production.getUser().getId() != null) {
            production.setUser(userRepository.findById(production.getUser().getId()).orElse(null));
        }
        return productionRepository.save(production);
    }

    @Override
    public List<Production> getAllProductions() {
        return productionRepository.findAll();
    }

    @Override
    public Production getProductionById(Long id) {
        return productionRepository.findById(id).orElseThrow(() -> new RuntimeException("Production not found"));
    }

    @Override
    public Production updateProduction(Long id, Production updatedProduction) {
        Production existing = getProductionById(id);
        existing.setProducedQuantity(updatedProduction.getProducedQuantity());
        if (updatedProduction.getProductionDate() != null) {
            existing.setProductionDate(updatedProduction.getProductionDate());
        }
        if (updatedProduction.getProduct() != null && updatedProduction.getProduct().getId() != null) {
            existing.setProduct(productRepository.findById(updatedProduction.getProduct().getId()).orElse(null));
        }
        if (updatedProduction.getStock() != null && updatedProduction.getStock().getId() != null) {
            existing.setStock(stockRepository.findById(updatedProduction.getStock().getId()).orElse(null));
        }
        if (updatedProduction.getUser() != null && updatedProduction.getUser().getId() != null) {
            existing.setUser(userRepository.findById(updatedProduction.getUser().getId()).orElse(null));
        }
        return productionRepository.save(existing);
    }

    @Override
    public void deleteProduction(Long id) {
        productionRepository.deleteById(id);
    }
}