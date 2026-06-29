package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.ShowcaseCategory;
import com.ibtihel.app.entities.ShowcaseProduct;
import com.ibtihel.app.repositories.ShowcaseProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/showcase-products")
@CrossOrigin(origins = "*")
public class ShowcaseProductController {

    private final ShowcaseProductRepository repo;

    public ShowcaseProductController(ShowcaseProductRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ShowcaseProduct> getAll() {
        return repo.findAll();
    }

    @GetMapping("/category/{category}")
    public List<ShowcaseProduct> getByCategory(@PathVariable ShowcaseCategory category) {
        return repo.findByCategory(category);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShowcaseProduct> getById(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ShowcaseProduct create(@RequestBody ShowcaseProduct product) {
        return repo.save(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShowcaseProduct> update(@PathVariable Long id,
                                                   @RequestBody ShowcaseProduct updated) {
        return repo.findById(id).map(p -> {
            p.setName(updated.getName());
            p.setBrand(updated.getBrand());
            p.setCategory(updated.getCategory());
            p.setVolume(updated.getVolume());
            p.setDescription(updated.getDescription());
            if (updated.getImageData() != null) {
                p.setImageData(updated.getImageData());
                p.setImageType(updated.getImageType());
            }
            return ResponseEntity.ok(repo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * POST /api/showcase-products/{id}/image
     * Upload une photo produit (multipart). Convertit en base64 et stocke.
     */
    @PostMapping("/{id}/image")
    public ResponseEntity<?> uploadImage(@PathVariable Long id,
                                          @RequestParam("file") MultipartFile file) {
        return repo.findById(id).map(p -> {
            try {
                if (file.getSize() > 3 * 1024 * 1024) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Image trop grande (max 3 Mo)."));
                }
                String base64 = Base64.getEncoder().encodeToString(file.getBytes());
                p.setImageData(base64);
                p.setImageType(file.getContentType());
                return ResponseEntity.ok((Object) repo.save(p));
            } catch (Exception e) {
                return ResponseEntity.status(500)
                        .body(Map.of("error", "Erreur upload : " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
