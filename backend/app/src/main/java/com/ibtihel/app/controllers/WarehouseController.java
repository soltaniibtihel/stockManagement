package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.Warehouse;
import com.ibtihel.app.services.warehouse.WarehouseService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
@CrossOrigin(origins = "*")
public class WarehouseController {

    private final WarehouseService warehouseService;

    public WarehouseController(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    @PostMapping
    public Warehouse createWarehouse(@RequestBody Warehouse warehouse) {
        return warehouseService.createWarehouse(warehouse);
    }

    @GetMapping
    public List<Warehouse> getAllWarehouses() {
        return warehouseService.getAllWarehouses();
    }

    @GetMapping("/{id}")
    public Warehouse getWarehouse(@PathVariable Long id) {
        return warehouseService.getWarehouseById(id);
    }

    @PutMapping("/{id}")
    public Warehouse updateWarehouse(@PathVariable Long id,
                                     @RequestBody Warehouse warehouse) {
        return warehouseService.updateWarehouse(id, warehouse);
    }

    @DeleteMapping("/{id}")
    public void deleteWarehouse(@PathVariable Long id) {
        warehouseService.deleteWarehouse(id);
    }
}
