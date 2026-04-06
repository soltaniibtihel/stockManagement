package com.ibtihel.app.services.category;

import com.ibtihel.app.entities.Category;

import java.util.List;

public interface CategoryService {

    Category createCategory(Category category);

    Category updateCategory(Long id, Category category);

    void deleteCategory(Long id);

    Category getCategoryById(Long id);

    List<Category> getAllCategories();

    List<Category> searchCategories(String name, String description);

}

