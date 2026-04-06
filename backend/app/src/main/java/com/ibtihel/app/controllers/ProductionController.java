package com.ibtihel.app.controllers;
import com.ibtihel.app.entities.Production;
import com.ibtihel.app.services.production.ProductionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productions")
@CrossOrigin(origins = "*")
public class ProductionController {

    private final ProductionService productionService;

    public ProductionController(ProductionService productionService) {
        this.productionService = productionService;
    }

    @GetMapping("/{id}/total-production")
    public Double getTotalProduction(@PathVariable Long id){
        return productionService.getTotalProduction(id);
    }

    @PostMapping
    public Production createProduction(@RequestBody Production production) {
        return productionService.createProduction(production);
    }

    @GetMapping
    public List<Production> getAllProductions() {
        return productionService.getAllProductions();
    }

    @GetMapping("/{id}")
    public Production getProductionById(@PathVariable Long id) {
        return productionService.getProductionById(id);
    }

    @PutMapping("/{id}")
    public Production updateProduction(@PathVariable Long id, @RequestBody Production production) {
        return productionService.updateProduction(id, production);
    }

    @DeleteMapping("/{id}")
    public void deleteProduction(@PathVariable Long id) {
        productionService.deleteProduction(id);
    }
}
