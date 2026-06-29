package com.ibtihel.app.repositories;

import com.ibtihel.app.entities.ShowcaseCategory;
import com.ibtihel.app.entities.ShowcaseProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShowcaseProductRepository extends JpaRepository<ShowcaseProduct, Long> {
    List<ShowcaseProduct> findByCategory(ShowcaseCategory category);
    boolean existsByName(String name);
}
