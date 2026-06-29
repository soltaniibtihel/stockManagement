package com.ibtihel.app.services.production;

import com.ibtihel.app.entities.*;
import com.ibtihel.app.repositories.*;
import com.ibtihel.app.services.ProductMovementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Service Production avec génération automatique de mouvements WO.
 *
 * Règles :
 *  • Création  (RÉALISÉE)           → génère 1 mouvement WO   → stock += quantité
 *  • Création  (PLANIFIÉE)          → aucun mouvement
 *  • Update PLANIFIÉE → RÉALISÉE    → génère le mouvement WO
 *  • Update RÉALISÉE → quantité/date → ajuste le mouvement existant
 *  • Update RÉALISÉE → PLANIFIÉE    → annule le mouvement (suppression)
 *  • Suppression d'une RÉALISÉE     → annule le mouvement WO
 */
@Service
@Transactional
public class ProductionServiceImpl implements ProductionService {

    private static final Logger log = LoggerFactory.getLogger(ProductionServiceImpl.class);

    private final ProductionRepository    productionRepository;
    private final ProductRepository       productRepository;
    private final StockRepository         stockRepository;
    private final UserRepository          userRepository;
    private final ProductMovementService  movementService;
    private final ProductMovementRepository movementRepository;

    public ProductionServiceImpl(ProductionRepository productionRepository,
                                 ProductRepository productRepository,
                                 StockRepository stockRepository,
                                 UserRepository userRepository,
                                 ProductMovementService movementService,
                                 ProductMovementRepository movementRepository) {
        this.productionRepository = productionRepository;
        this.productRepository    = productRepository;
        this.stockRepository      = stockRepository;
        this.userRepository       = userRepository;
        this.movementService      = movementService;
        this.movementRepository   = movementRepository;
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    @Override
    public List<Production> getAllProductions() {
        return productionRepository.findAll();
    }

    @Override
    public Production getProductionById(Long id) {
        return productionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production not found: " + id));
    }

    @Override
    public List<Production> getProductionsByProduct(Long productId) {
        return productionRepository.findByProductId(productId);
    }

    @Override
    public Double getTotalProduction(Long productId) {
        Double total = productionRepository.getTotalProducedQuantity(productId);
        return total == null ? 0.0 : total;
    }

    // ── Création ──────────────────────────────────────────────────────────────

    @Override
    public Production createProduction(Production production) {
        resolveRelations(production);

        // Défaut statut
        if (production.getStatus() == null) {
            production.setStatus(ProductionStatus.PLANIFIEE);
        }

        Production saved = productionRepository.save(production);

        // Générer le mouvement si déjà réalisée
        if (saved.getStatus() == ProductionStatus.REALISEE) {
            generateWO(saved);
        }

        return saved;
    }

    // ── Mise à jour ───────────────────────────────────────────────────────────

    @Override
    public Production updateProduction(Long id, Production updated) {
        Production existing = getProductionById(id);

        ProductionStatus oldStatus  = existing.getStatus() != null
                                        ? existing.getStatus() : ProductionStatus.PLANIFIEE;
        Double           oldQty     = existing.getProducedQuantity();
        Long             oldMovId   = existing.getGeneratedMovementId();

        // Appliquer les nouvelles valeurs
        existing.setProducedQuantity(updated.getProducedQuantity());
        if (updated.getProductionDate() != null) existing.setProductionDate(updated.getProductionDate());
        if (updated.getNotes()          != null) existing.setNotes(updated.getNotes());
        if (updated.getStatus()         != null) existing.setStatus(updated.getStatus());

        if (updated.getProduct() != null && updated.getProduct().getId() != null)
            existing.setProduct(productRepository.findById(updated.getProduct().getId()).orElse(existing.getProduct()));
        if (updated.getStock()   != null && updated.getStock().getId()   != null)
            existing.setStock(stockRepository.findById(updated.getStock().getId()).orElse(existing.getStock()));
        if (updated.getUser()    != null && updated.getUser().getId()    != null)
            existing.setUser(userRepository.findById(updated.getUser().getId()).orElse(existing.getUser()));

        ProductionStatus newStatus = existing.getStatus();

        // ── Gestion de la transition de statut ───────────────────────────────
        if (oldStatus == ProductionStatus.PLANIFIEE && newStatus == ProductionStatus.REALISEE) {
            // Nouvelle réalisation → créer le mouvement
            Production saved = productionRepository.save(existing);
            generateWO(saved);
            return saved;

        } else if (oldStatus == ProductionStatus.REALISEE && newStatus == ProductionStatus.PLANIFIEE) {
            // Annulation de réalisation → supprimer le mouvement
            if (oldMovId != null) {
                deleteMovement(oldMovId);
                existing.setGeneratedMovementId(null);
            }
            return productionRepository.save(existing);

        } else if (oldStatus == ProductionStatus.REALISEE && newStatus == ProductionStatus.REALISEE) {
            // Modification d'une production déjà réalisée
            if (oldMovId != null) {
                // Mettre à jour le mouvement existant
                movementRepository.findById(oldMovId).ifPresent(mov -> {
                    mov.setQuantity(existing.getProducedQuantity());
                    if (existing.getProductionDate() != null) {
                        mov.setDate(existing.getProductionDate().toLocalDate());
                    }
                    movementService.update(oldMovId, mov);
                });
            } else {
                // Mouvement manquant (import legacy) → le créer
                Production saved = productionRepository.save(existing);
                generateWO(saved);
                return saved;
            }
        }

        return productionRepository.save(existing);
    }

    // ── Suppression ───────────────────────────────────────────────────────────

    @Override
    public void deleteProduction(Long id) {
        productionRepository.findById(id).ifPresent(production -> {
            // Annuler le mouvement généré si la production était réalisée
            if (production.getStatus() == ProductionStatus.REALISEE
                    && production.getGeneratedMovementId() != null) {
                deleteMovement(production.getGeneratedMovementId());
            }
            productionRepository.deleteById(id);
        });
    }

    // ── Helpers privés ────────────────────────────────────────────────────────

    /** Résout les relations JPA (product, stock, user) depuis leurs IDs. */
    private void resolveRelations(Production p) {
        if (p.getProduct() != null && p.getProduct().getId() != null)
            p.setProduct(productRepository.findById(p.getProduct().getId()).orElse(null));
        if (p.getStock() != null && p.getStock().getId() != null)
            p.setStock(stockRepository.findById(p.getStock().getId()).orElse(null));
        if (p.getUser() != null && p.getUser().getId() != null)
            p.setUser(userRepository.findById(p.getUser().getId()).orElse(null));
    }

    /**
     * Génère un mouvement WO (Work Order) pour une production réalisée.
     * Le mouvement WO déclenche automatiquement +stock via StockSyncService.
     */
    private void generateWO(Production production) {
        if (production.getProduct() == null || production.getProducedQuantity() == null) return;

        ProductMovement mov = new ProductMovement();
        mov.setProduct(production.getProduct());
        mov.setType(ProductMovementType.WO);
        mov.setQuantity(production.getProducedQuantity());
        mov.setDate(production.getProductionDate() != null
                ? production.getProductionDate().toLocalDate()
                : LocalDate.now());

        ProductMovement saved = movementService.save(mov);

        // Mémoriser l'ID du mouvement dans la production
        production.setGeneratedMovementId(saved.getId());
        productionRepository.save(production);

        log.info("[Production→WO] Production #{} → Mouvement WO #{} | produit={} | qté={}",
                production.getId(), saved.getId(),
                production.getProduct().getName(),
                production.getProducedQuantity());
    }

    /** Supprime un mouvement de façon sécurisée (ignore si déjà absent). */
    private void deleteMovement(Long movId) {
        try {
            movementService.deleteById(movId);
            log.info("[Production→WO] Mouvement WO #{} supprimé (annulation production)", movId);
        } catch (Exception e) {
            log.warn("[Production→WO] Impossible de supprimer le mouvement #{} : {}", movId, e.getMessage());
        }
    }
}
