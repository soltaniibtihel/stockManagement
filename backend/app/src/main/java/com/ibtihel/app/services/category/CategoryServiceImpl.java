package com.ibtihel.app.services.category;

import com.ibtihel.app.entities.Category;
import com.ibtihel.app.repositories.CategoryRepository;
import com.ibtihel.app.services.category.CategoryService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Override
    public Category updateCategory(Long id, Category updatedCategory) {

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        category.setName(updatedCategory.getName());
        category.setDescription(updatedCategory.getDescription());

        return categoryRepository.save(category);
    }

    @Override
    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    @Override
    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
    }

    @Override
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }
    @Override
    public List<Category> searchCategories(String name, String description) {
        return categoryRepository
                .findByNameContainingIgnoreCaseAndDescriptionContainingIgnoreCase(name, description);
    }
}
