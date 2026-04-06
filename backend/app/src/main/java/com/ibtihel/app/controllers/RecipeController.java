package com.ibtihel.app.controllers;

import com.ibtihel.app.entities.Recipe;
import com.ibtihel.app.services.recipe.RecipeService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@CrossOrigin(origins = "*")
public class RecipeController {

    private final RecipeService recipeService;

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @PostMapping
    public Recipe createRecipe(@RequestBody Recipe recipe) {
        return recipeService.createRecipe(recipe);
    }

    @GetMapping
    public List<Recipe> getAllRecipes() {
        return recipeService.getAllRecipes();
    }

    @GetMapping("/{id}")
    public Recipe getRecipe(@PathVariable Long id) {
        return recipeService.getRecipeById(id);
    }

    @PutMapping("/{id}")
    public Recipe updateRecipe(@PathVariable Long id,
                               @RequestBody Recipe recipe) {
        return recipeService.updateRecipe(id, recipe);
    }

    @DeleteMapping("/{id}")
    public void deleteRecipe(@PathVariable Long id) {
        recipeService.deleteRecipe(id);
    }
}
