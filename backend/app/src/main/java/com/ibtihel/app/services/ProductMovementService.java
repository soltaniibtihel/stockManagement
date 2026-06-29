package com.ibtihel.app.services;

import com.ibtihel.app.entities.ProductMovement;
import com.ibtihel.app.entities.ProductMovementDetail;
import com.ibtihel.app.entities.ProductMovementType;
import com.ibtihel.app.repositories.ProductMovementDetailRepository;
import com.ibtihel.app.repositories.ProductMovementRepository;
import com.ibtihel.app.services.stock.StockSyncService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProductMovementService {

    private final ProductMovementRepository       productMovementRepository;
    private final ProductMovementDetailRepository productMovementDetailRepository;
    private final StockSyncService                stockSyncService;

    public ProductMovementService(ProductMovementRepository productMovementRepository,
                                  ProductMovementDetailRepository productMovementDetailRepository,
                                  StockSyncService stockSyncService) {
        this.productMovementRepository       = productMovementRepository;
        this.productMovementDetailRepository = productMovementDetailRepository;
        this.stockSyncService                = stockSyncService;
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    public List<ProductMovement> findAll() {
        return productMovementRepository.findAll();
    }

    public Optional<ProductMovement> findById(Long id) {
        return productMovementRepository.findById(id);
    }

    public List<ProductMovement> getMovementsByProductId(Long productId) {
        return productMovementRepository.findByProductIdOrderByDateAsc(productId);
    }

    // ── Création ──────────────────────────────────────────────────────────────

    /**
     * Crée un mouvement ET met à jour le stock correspondant.
     */
    public ProductMovement save(ProductMovement movement) {
        // Garantir la liaison bidirectionnelle détail ↔ mouvement
        if (movement.getDetail() != null) {
            movement.getDetail().setProductMovement(movement);
        }

        ProductMovement saved = productMovementRepository.save(movement);

        // Auto-créer le détail si absent
        if (productMovementDetailRepository.findByProductMovementId(saved.getId()).isEmpty()) {
            ProductMovementDetail detail = new ProductMovementDetail();
            detail.setProductMovement(saved);
            detail.setUnitPrice(0.0);
            detail.setTotalPrice(0.0);
            productMovementDetailRepository.save(detail);
        }

        // ── Synchronisation stock ──────────────────────────────────────────
        stockSyncService.applyMovement(saved);

        return saved;
    }

    // ── Mise à jour ───────────────────────────────────────────────────────────

    /**
     * Met à jour un mouvement ET recalcule l'impact sur le stock
     * (annulation de l'ancien effet + application du nouveau).
     */
    public ProductMovement update(Long id, ProductMovement updated) {
        return productMovementRepository.findById(id).map(existing -> {

            // Sauvegarder l'état AVANT modification pour reversal
            ProductMovementType oldType = existing.getType();
            double              oldQty  = existing.getQuantity() != null ? existing.getQuantity() : 0.0;

            // Appliquer les nouvelles valeurs
            existing.setProduct(updated.getProduct());
            existing.setQuantity(updated.getQuantity());
            existing.setType(updated.getType());
            existing.setDate(updated.getDate());

            ProductMovement saved = productMovementRepository.save(existing);

            // ── Synchronisation stock (net = reverse old + apply new) ──────
            stockSyncService.updateMovement(oldType, oldQty, saved);

            return saved;

        }).orElseThrow(() -> new RuntimeException("ProductMovement not found with id " + id));
    }

    // ── Suppression ───────────────────────────────────────────────────────────

    /**
     * Supprime un mouvement ET annule son effet sur le stock.
     */
    public void deleteById(Long id) {
        productMovementRepository.findById(id).ifPresent(movement -> {
            // Annuler l'effet sur le stock avant suppression
            stockSyncService.reverseMovement(movement);
            productMovementRepository.deleteById(id);
        });
    }
}
