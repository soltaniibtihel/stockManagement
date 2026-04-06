package com.ibtihel.app.services.recipe;


import com.ibtihel.app.entities.Recipe;
import java.util.List;

public interface RecipeService {

    Recipe createRecipe(Recipe recipe);

    Recipe updateRecipe(Long id, Recipe recipe);

    void deleteRecipe(Long id);

    Recipe getRecipeById(Long id);

    List<Recipe> getAllRecipes();
}

