package com.ibtihel.app.services.production;

import com.ibtihel.app.entities.Production;

import java.util.List;

public interface ProductionService {

    List<Production> getProductionsByProduct(Long productId);
    Double getTotalProduction(Long productId);

    Production createProduction(Production production);
    List<Production> getAllProductions();
    Production getProductionById(Long id);
    Production updateProduction(Long id, Production production);
    void deleteProduction(Long id);
}
