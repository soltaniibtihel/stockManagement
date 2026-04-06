package com.ibtihel.app.services.recipe;

import com.ibtihel.app.entities.Recipe;
import com.ibtihel.app.repositories.RecipeRepository;
import com.ibtihel.app.repositories.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecipeServiceImpl implements RecipeService {

    private final RecipeRepository recipeRepository;
    private final ProductRepository productRepository;

    public RecipeServiceImpl(RecipeRepository recipeRepository, 
                             ProductRepository productRepository) {
        this.recipeRepository = recipeRepository;
        this.productRepository = productRepository;
    }

    @Override
    public Recipe createRecipe(Recipe recipe) {
        if (recipe.getProduct() != null && recipe.getProduct().getId() != null) {
            recipe.setProduct(productRepository.findById(recipe.getProduct().getId()).orElse(null));
        }
        if (recipe.getTargetProduct() != null && recipe.getTargetProduct().getId() != null) {
            recipe.setTargetProduct(productRepository.findById(recipe.getTargetProduct().getId()).orElse(null));
        }
        return recipeRepository.save(recipe);
    }

    @Override
    public Recipe updateRecipe(Long id, Recipe updatedRecipe) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));

        recipe.setIngredientQuantity(updatedRecipe.getIngredientQuantity());
        recipe.setUnit(updatedRecipe.getUnit());
        recipe.setComment(updatedRecipe.getComment());

        if (updatedRecipe.getProduct() != null && updatedRecipe.getProduct().getId() != null) {
            recipe.setProduct(productRepository.findById(updatedRecipe.getProduct().getId()).orElse(null));
        }
        if (updatedRecipe.getTargetProduct() != null && updatedRecipe.getTargetProduct().getId() != null) {
            recipe.setTargetProduct(productRepository.findById(updatedRecipe.getTargetProduct().getId()).orElse(null));
        }

        return recipeRepository.save(recipe);
    }

    @Override
    public void deleteRecipe(Long id) {
        recipeRepository.deleteById(id);
    }

    @Override
    public Recipe getRecipeById(Long id) {
        return recipeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));
    }

    @Override
    public List<Recipe> getAllRecipes() {
        return recipeRepository.findAll();
    }
}
