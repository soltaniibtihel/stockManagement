package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.Category;
import com.ibtihel.app.services.category.CategoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public Category createCategory(@RequestBody Category category) {
        return categoryService.createCategory(category);
    }

    @GetMapping
    public List<Category> getAllCategories() {
        return categoryService.getAllCategories();
    }

    @GetMapping("/{id}")
    public Category getCategory(@PathVariable Long id) {
        return categoryService.getCategoryById(id);
    }

    @PutMapping("/{id}")
    public Category updateCategory(@PathVariable Long id,
                                   @RequestBody Category category) {
        return categoryService.updateCategory(id, category);
    }

    @DeleteMapping("/{id}")
    public void deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
    }
    @GetMapping("/search")
    public List<Category> searchCategories(
            @RequestParam String name,
            @RequestParam String description
    ) {
        return categoryService.searchCategories(name, description);
    }
}

