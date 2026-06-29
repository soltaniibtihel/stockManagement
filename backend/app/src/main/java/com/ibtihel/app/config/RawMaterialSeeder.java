package com.ibtihel.app.config;

import com.ibtihel.app.entities.Product;
import com.ibtihel.app.entities.ProductType;
import com.ibtihel.app.repositories.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Pré-charge les matières premières utilisées dans la production
 * d'huiles, margarines, sauces et mayonnaises Jadida.
 * S'exécute uniquement si le code n'existe pas encore en base.
 */
@Component
@Order(2)   // après JadidaDataSeeder (@Order(1) implicite)
public class RawMaterialSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RawMaterialSeeder.class);
    private final ProductRepository repo;

    public RawMaterialSeeder(ProductRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(ApplicationArguments args) {
        int created = 0;

        // ── Emballages (Preforms PET) ────────────────────────────────────────
        created += seed("PF-5L",  "Preform PET 5L",
            "Préforme PET pour bouteilles d'huile 5 litres. " +
            "Résine alimentaire certifiée, poids 65 g.", "unité");

        created += seed("PF-2L",  "Preform PET 2L",
            "Préforme PET pour bouteilles d'huile 2 litres. " +
            "Résine alimentaire certifiée, poids 30 g.", "unité");

        created += seed("PF-1L",  "Preform PET 1L",
            "Préforme PET pour bouteilles d'huile 1 litre. " +
            "Résine alimentaire certifiée, poids 18 g.", "unité");

        created += seed("CAP-28", "Bouchons Vissants 28mm",
            "Capsules PEHD 28 mm pour bouteilles PET. " +
            "Inviolabilité garantie, compatible ligne automatique.", "unité");

        // ── Huiles brutes ────────────────────────────────────────────────────
        created += seed("OB-SOJ", "Huile de Soja Brute",
            "Huile de soja brute, non raffinée, destinée au raffinage industriel. " +
            "Taux d'acidité ≤ 0,5 %. Origine : Uruguay / Argentine.", "tonne");

        created += seed("OB-PAL", "Huile de Palme Brute",
            "Huile de palme brute (CPO) pour production de margarines et graisses végétales. " +
            "Indice d'iode 50–55. Origine : Malaisie / Indonésie.", "tonne");

        created += seed("OB-TRN", "Huile de Tournesol Brute",
            "Huile de tournesol brute pour raffinage et conditionnement. " +
            "Haute teneur en oméga-6, teneur en acide oléique ≥ 25 %. Origine : Ukraine.", "tonne");

        created += seed("OB-MAS", "Huile de Maïs Brute",
            "Huile de maïs brute issue du germe de maïs. " +
            "Riche en vitamine E naturelle. Origine : USA / Argentine.", "tonne");

        // ── Additifs & auxiliaires technologiques ────────────────────────────
        created += seed("ADD-LEC", "Lécithine de Soja",
            "Émulsifiant E322, lécithine de soja déshuilée (poudre). " +
            "Utilisé dans margarines et mayonnaises. Pureté ≥ 97 %.", "kg");

        created += seed("ADD-CAC", "Acide Citrique",
            "Acide citrique anhydre E330, agent d'acidification et conservateur. " +
            "Utilisé dans mayonnaises et sauces. Pureté ≥ 99,5 %.", "kg");

        created += seed("ADD-SEL", "Sel Raffiné Alimentaire",
            "Chlorure de sodium NaCl grade alimentaire. " +
            "Granulométrie fine (0,1–0,3 mm). Utilisé dans margarines, sauces et mayonnaises.", "kg");

        created += seed("ADD-MOU", "Moutarde en Poudre",
            "Moutarde déshydratée en poudre, émulsifiant naturel. " +
            "Indispensable à la texture de la mayonnaise. Origine : Canada.", "kg");

        created += seed("ADD-OEU", "Poudre d'Œuf Entier",
            "Œuf entier pasteurisé et atomisé. " +
            "Utilisé dans mayonnaises pour émulsification. Humidité ≤ 5 %.", "kg");

        // ── Emballages secondaires ───────────────────────────────────────────
        created += seed("EMB-ETI", "Étiquettes Adhésives",
            "Étiquettes auto-adhésives OPP pour bouteilles PET. " +
            "Impression flexo 6 couleurs, résistance UV.", "millier");

        created += seed("EMB-CTN", "Cartons d'Emballage",
            "Cartons ondulés double cannelure pour regroupement final. " +
            "Formats : 6×5L / 12×2L / 12×1L. Résistance à la compression ≥ 800 N.", "unité");

        if (created > 0) {
            log.info("[RawMaterialSeeder] {} matière(s) première(s) insérée(s).", created);
        } else {
            log.info("[RawMaterialSeeder] Matières premières déjà présentes, aucune insertion.");
        }
    }

    /**
     * Insère le produit seulement s'il n'existe pas encore (idempotent).
     * @return 1 si inséré, 0 sinon.
     */
    private int seed(String code, String name, String description, String unit) {
        if (repo.existsByCode(code)) return 0;

        Product p = new Product();
        p.setCode(code);
        p.setName(name);
        p.setDescription(description);
        p.setUnit(unit);
        p.setProductType(ProductType.RAW_MATERIAL);
        p.setSafetyStock(0.0);
        p.setStockQuantity(0.0);
        p.setShelfLife(0);   // obligatoire en DB
        repo.save(p);
        return 1;
    }
}
