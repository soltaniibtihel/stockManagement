package com.ibtihel.app.services.warehouse;

import com.ibtihel.app.entities.Warehouse;
import java.util.List;

public interface WarehouseService {

    Warehouse createWarehouse(Warehouse warehouse);

    Warehouse updateWarehouse(Long id, Warehouse warehouse);

    void deleteWarehouse(Long id);

    Warehouse getWarehouseById(Long id);

    List<Warehouse> getAllWarehouses();
}

