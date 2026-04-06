package com.ibtihel.app.services.warehouse;

import com.ibtihel.app.entities.Warehouse;
import com.ibtihel.app.repositories.WarehouseRepository;
import com.ibtihel.app.services.warehouse.WarehouseService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;

    public WarehouseServiceImpl(WarehouseRepository warehouseRepository) {
        this.warehouseRepository = warehouseRepository;
    }

    @Override
    public Warehouse createWarehouse(Warehouse warehouse) {
        return warehouseRepository.save(warehouse);
    }

    @Override
    public Warehouse updateWarehouse(Long id, Warehouse updatedWarehouse) {

        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        warehouse.setName(updatedWarehouse.getName());
        warehouse.setLocation(updatedWarehouse.getLocation());

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
