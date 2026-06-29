package com.ibtihel.app.services.warehouse;

import com.ibtihel.app.entities.Warehouse;
import com.ibtihel.app.repositories.CategoryRepository;
import com.ibtihel.app.repositories.WarehouseRepository;
import com.ibtihel.app.services.warehouse.WarehouseService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final CategoryRepository categoryRepository;

    public WarehouseServiceImpl(WarehouseRepository warehouseRepository, CategoryRepository categoryRepository) {
        this.warehouseRepository = warehouseRepository;
        this.categoryRepository = categoryRepository;
    }

    private void resolveCategory(Warehouse warehouse) {
        if (warehouse.getCategory() != null && warehouse.getCategory().getId() != null) {
            warehouse.setCategory(categoryRepository.findById(warehouse.getCategory().getId()).orElse(null));
        }
    }

    @Override
    public Warehouse createWarehouse(Warehouse warehouse) {
        resolveCategory(warehouse);
        return warehouseRepository.save(warehouse);
    }

    @Override
    public Warehouse updateWarehouse(Long id, Warehouse updatedWarehouse) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        warehouse.setName(updatedWarehouse.getName());
        warehouse.setLocation(updatedWarehouse.getLocation());
        warehouse.setCapacity(updatedWarehouse.getCapacity());

        if (updatedWarehouse.getCategory() != null && updatedWarehouse.getCategory().getId() != null) {
            warehouse.setCategory(categoryRepository.findById(updatedWarehouse.getCategory().getId()).orElse(null));
        } else {
            warehouse.setCategory(null);
        }

        return warehouseRepository.save(warehouse);
    }

    @Override
    public void deleteWarehouse(Long id) {
        warehouseRepository.deleteById(id);
    }

    @Override
    public Warehouse getWarehouseById(Long id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));
    }

    @Override
    public List<Warehouse> getAllWarehouses() {
        return warehouseRepository.findAll();
    }
}
