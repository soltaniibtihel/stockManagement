package com.ibtihel.app.config;

import com.ibtihel.app.entities.*;
import com.ibtihel.app.repositories.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
@Order(0)
public class AppDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AppDataSeeder.class);

    private final UserRepository      userRepo;
    private final CategoryRepository  categoryRepo;
    private final ProductRepository   productRepo;
    private final WarehouseRepository warehouseRepo;

    public AppDataSeeder(UserRepository userRepo,
                         CategoryRepository categoryRepo,
                         ProductRepository productRepo,
                         WarehouseRepository warehouseRepo) {
        this.userRepo      = userRepo;
        this.categoryRepo  = categoryRepo;
        this.productRepo   = productRepo;
        this.warehouseRepo = warehouseRepo;
    }

    @Override
    public void run(ApplicationArguments args) {

        // ── Users ────────────────────────────────────────────────────────────
        seedUser("Admin",  "User",    "admin@medoil.com",   "admin123",   UserRole.ADMIN);
        seedUser("Stock",  "Manager", "manager@medoil.com", "manager123", UserRole.STOCK_MANAGER);

        // ── Categories ───────────────────────────────────────────────────────
        Category oil    = seedCategory("Oil",    "Vegetable oils",      ProductType.FINISHED_PRODUCT);
        Category bottle = seedCategory("Bottle", "Packaging bottles",   ProductType.PACKAGING);

        // ── Products ─────────────────────────────────────────────────────────
        seedProduct("OIL-001", "Olive Oil",       "Extra virgin olive oil", "L",    oil);
        seedProduct("OIL-002", "Sunflower Oil",   "Refined sunflower oil",  "L",    oil);
        seedProduct("BTL-001", "Bottle 1L",       "PET bottle 1 litre",     "unit", bottle);

        // ── Warehouses ───────────────────────────────────────────────────────
        seedWarehouse("Oil Warehouse A",    "Zone A", 10000.0, oil);
        seedWarehouse("Oil Warehouse B",    "Zone B",  8000.0, oil);
        seedWarehouse("Bottle Warehouse A", "Zone C", 50000.0, bottle);
        seedWarehouse("Bottle Warehouse B", "Zone D", 40000.0, bottle);

        log.info("[AppDataSeeder] Seed complete.");
    }

    private void seedUser(String firstName, String lastName, String email, String password, UserRole role) {
        if (userRepo.findByEmail(email).isPresent()) return;
        User u = new User();
        u.setFirstName(firstName);
        u.setLastName(lastName);
        u.setEmail(email);
        u.setPassword(password);
        u.setRole(role);
        userRepo.save(u);
        log.info("[AppDataSeeder] Created user: {}", email);
    }

    private Category seedCategory(String name, String description, ProductType type) {
        return categoryRepo.findAll().stream()
                .filter(c -> c.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    Category c = new Category();
                    c.setName(name);
                    c.setDescription(description);
                    c.setProductType(type);
                    c.setCreationDate(new Date());
                    Category saved = categoryRepo.save(c);
                    log.info("[AppDataSeeder] Created category: {}", name);
                    return saved;
                });
    }

    private void seedProduct(String code, String name, String description, String unit, Category category) {
        if (productRepo.existsByCode(code)) return;
        Product p = new Product();
        p.setCode(code);
        p.setName(name);
        p.setDescription(description);
        p.setUnit(unit);
        p.setShelfLife(0);
        p.setCategory(category);
        productRepo.save(p);
        log.info("[AppDataSeeder] Created product: {}", code);
    }

    private void seedWarehouse(String name, String location, Double capacity, Category category) {
        if (warehouseRepo.findByName(name).isPresent()) return;
        Warehouse w = new Warehouse();
        w.setName(name);
        w.setLocation(location);
        w.setCapacity(capacity);
        w.setCategory(category);
        warehouseRepo.save(w);
        log.info("[AppDataSeeder] Created warehouse: {}", name);
    }
}
