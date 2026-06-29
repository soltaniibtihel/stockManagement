package com.ibtihel.app.services.stock;

import com.ibtihel.app.entities.Product;
import com.ibtihel.app.entities.ProductMovement;
import com.ibtihel.app.entities.ProductMovementType;
import com.ibtihel.app.entities.Stock;
import com.ibtihel.app.repositories.StockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service de synchronisation automatique Stock ↔ ProductMovement.
 *
 * Règles de direction :
 *   IN  (+stock) : PO (Purchase Order), WO (Work Order = sortie de production)
 *   OUT (-stock) : SO (Sales Order), VNP (Vente), TR (Transfer-out), TSS
 *
 * Logique Update : on mémorise l'ancienne quantité/type avant l'update,
 * on annule l'ancien effet, puis on applique le nouveau.
 */
@Service
public class StockSyncService {

    private static final Logger log = LoggerFactory.getLogger(StockSyncService.class);

    private final StockRepository stockRepository;

    public StockSyncService(StockRepository stockRepository) {
        this.stockRepository = stockRepository;
    }

    // ── Direction d'un type de mouvement ─────────────────────────────────────

    /**
     * Retourne le delta à appliquer au stock pour une quantité donnée.
     *  +qty → ajout au stock
     *  -qty → retrait du stock
     *   0   → aucun effet (mouvement neutre)
     */
    public double delta(ProductMovementType type, double qty) {
        return switch (type) {
            case PO -> +qty;   // Réception achat  → entre en stock
            case WO -> +qty;   // Sortie production → produit fini entre en stock
            case SO -> -qty;   // Vente (Sales Order)
            case VNP -> -qty;  // Vente non planifiée
            case TR  -> -qty;  // Transfert sortant (simplifié)
            case TSS -> -qty;  // Transfert stock sortant
        };
    }

    // ── Application / annulation ──────────────────────────────────────────────

    /**
     * Applique un nouveau mouvement sur le stock du produit concerné.
     * Si aucun stock n'existe pour ce produit, en crée un automatiquement.
     */
    @Transactional
    public void applyMovement(ProductMovement movement) {
        if (movement.getProduct() == null || movement.getQuantity() == null) return;
        double d = delta(movement.getType(), movement.getQuantity());
        adjustStock(movement.getProduct(), d, "applyMovement id=" + movement.getId());
    }

    /**
     * Annule l'effet d'un mouvement (avant suppression ou avant update).
     * On applique l'inverse du delta original.
     */
    @Transactional
    public void reverseMovement(ProductMovement movement) {
        if (movement.getProduct() == null || movement.getQuantity() == null) return;
        double d = -delta(movement.getType(), movement.getQuantity());
        adjustStock(movement.getProduct(), d, "reverseMovement id=" + movement.getId());
    }

    /**
     * Gestion d'un update : annule l'ancien effet, applique le nouveau.
     *
     * @param oldType     type avant modification
     * @param oldQuantity quantité avant modification
     * @param updated     mouvement après modification
     */
    @Transactional
    public void updateMovement(ProductMovementType oldType, double oldQuantity,
                               ProductMovement updated) {
        if (updated.getProduct() == null || updated.getQuantity() == null) return;

        double reverse = -delta(oldType, oldQuantity);
        double apply   =  delta(updated.getType(), updated.getQuantity());
        double net     = reverse + apply;

        adjustStock(updated.getProduct(), net, "updateMovement id=" + updated.getId());
    }

    // ── Noyau d'ajustement ───────────────────────────────────────────────────

    private void adjustStock(Product product, double delta, String context) {
        if (delta == 0) return;

        Optional<Stock> opt = stockRepository.findFirstByProductId(product.getId());

        if (opt.isPresent()) {
            Stock stock = opt.get();
            double before = stock.getQuantityAvailable() != null ? stock.getQuantityAvailable() : 0.0;
            double after  = Math.max(0.0, before + delta);          // jamais négatif
            stock.setQuantityAvailable(after);
            stock.setLastUpdated(LocalDateTime.now());
            stockRepository.save(stock);
            log.info("[StockSync] {} | produit={} | {} → {} (Δ{})",
                    context, product.getId(), before, after, delta);
        } else {
            // Aucun stock existant → on en crée un si le delta est positif
            if (delta > 0) {
                Stock newStock = new Stock();
                newStock.setProduct(product);
                newStock.setQuantityAvailable(delta);
                newStock.setSafetyStock(0.0);
                newStock.setReorderPoint(0.0);
                newStock.setLastUpdated(LocalDateTime.now());
                stockRepository.save(newStock);
                log.info("[StockSync] {} | produit={} | stock créé avec qté={}",
                        context, product.getId(), delta);
            } else {
                log.warn("[StockSync] {} | produit={} | aucun stock trouvé pour appliquer Δ{}",
                        context, product.getId(), delta);
            }
        }
    }
}
