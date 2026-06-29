package com.ibtihel.app.config;

import com.ibtihel.app.entities.ShowcaseCategory;
import com.ibtihel.app.entities.ShowcaseProduct;
import com.ibtihel.app.repositories.ShowcaseProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JadidaDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(JadidaDataSeeder.class);
    private final ShowcaseProductRepository repo;

    public JadidaDataSeeder(ShowcaseProductRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repo.count() > 0) {
            log.info("[Seeder] Galerie Jadida déjà initialisée ({} produits).", repo.count());
            return;
        }

        List<ShowcaseProduct> products = List.of(

            // ── HUILES ──────────────────────────────────────────────────────
            make("Huile Végétale Jadida", "5L", ShowcaseCategory.HUILE,
                "Huile végétale de qualité supérieure, idéale pour la friture et l'assaisonnement. " +
                "Légère et dorée, elle sublimera vos plats quotidiens grâce à sa richesse en acides gras essentiels."),

            make("Huile Végétale Jadida", "2L", ShowcaseCategory.HUILE,
                "Format familial pratique de l'huile végétale Jadida. Pour une cuisine saine et savoureuse " +
                "au quotidien, elle offre un équilibre parfait entre légèreté et saveur."),

            make("Huile Végétale Jadida", "1L", ShowcaseCategory.HUILE,
                "Format compact de l'huile végétale Jadida, parfait pour les petits foyers. " +
                "La qualité Jadida dans un emballage pratique et économique."),

            make("Huile de Tournesol Jadida", "5L", ShowcaseCategory.HUILE,
                "Huile de tournesol pure Jadida, riche en vitamine E et en oméga-6. " +
                "Légère et naturelle, elle convient à tous types de cuisson et à la consommation crue."),

            make("Huile de Tournesol Jadida", "2L", ShowcaseCategory.HUILE,
                "L'huile de tournesol Jadida en format familial. Idéale pour friture, cuisson à la poêle " +
                "et vinaigrettes. Goût neutre pour sublimer toutes vos recettes."),

            make("Huile de Maïs Jadida", "1L", ShowcaseCategory.HUILE,
                "Huile de maïs dorée et délicate Jadida, au goût subtil et naturel. " +
                "Parfaite pour une cuisine légère et équilibrée, riche en acides gras polyinsaturés."),

            make("Huile de Soja Jadida", "5L", ShowcaseCategory.HUILE,
                "Huile de soja raffinée Jadida, source naturelle d'oméga-3 et d'oméga-6. " +
                "Polyvalente, elle convient aussi bien à la cuisson qu'à la consommation froide."),

            // ── MARGARINES ──────────────────────────────────────────────────
            make("Margarine de Table Jadida", "500g", ShowcaseCategory.MARGARINE,
                "Margarine de table onctueuse et crémeuse Jadida, facile à tartiner même à la sortie " +
                "du réfrigérateur. Goût doux et savoureux pour sublimer vos petits-déjeuners."),

            make("Margarine de Table Jadida", "250g", ShowcaseCategory.MARGARINE,
                "Format pratique de la margarine de table Jadida. Légère et fondante, elle accompagne " +
                "parfaitement vos tartines, pâtisseries et préparations culinaires."),

            make("Margarine Professionnelle Jadida", "1kg", ShowcaseCategory.MARGARINE,
                "Margarine professionnelle haute performance Jadida, spécialement formulée pour la pâtisserie " +
                "et la boulangerie. Tenue thermique optimale pour des résultats parfaits."),

            make("Margarine Feuilletage Jadida", "2kg", ShowcaseCategory.MARGARINE,
                "Margarine de feuilletage professionnelle Jadida, pour des croissants et viennoiseries " +
                "aux feuilletages croustillants et réguliers. Le choix des artisans boulangers."),

            make("Margarine Végétaline Jadida", "500g", ShowcaseCategory.MARGARINE,
                "Graisse végétale pure Jadida, idéale pour la friture et la pâtisserie. " +
                "Sans cholestérol, riche en acides gras insaturés pour une cuisine plus saine."),

            // ── SAUCES ──────────────────────────────────────────────────────
            make("Sauce Tomate Jadida", "490g", ShowcaseCategory.SAUCE,
                "Sauce tomate Jadida, préparée à partir de tomates fraîches soigneusement sélectionnées. " +
                "Idéale pour les pâtes, pizzas et plats mijotés, elle apporte une saveur authentique."),

            make("Sauce Harissa Jadida", "380g", ShowcaseCategory.SAUCE,
                "Harissa authentique Jadida, préparée selon la recette tunisienne traditionnelle. " +
                "Piquante et parfumée aux épices du Maghreb, elle relèvera tous vos plats avec caractère."),

            make("Sauce Piquante Jadida", "200ml", ShowcaseCategory.SAUCE,
                "Sauce piquante Jadida, au mélange d'épices soigneusement équilibré. " +
                "Apporte une touche de feu et de saveur à vos recettes préférées, ketchup et marinades."),

            // ── MAYONNAISES ─────────────────────────────────────────────────
            make("Mayonnaise Classique Jadida", "490g", ShowcaseCategory.MAYONNAISE,
                "Mayonnaise crémeuse et onctueuse Jadida, préparée selon la recette classique. " +
                "Parfaite pour sandwichs, salades composées et sauces d'accompagnement."),

            make("Mayonnaise Légère Jadida", "490g", ShowcaseCategory.MAYONNAISE,
                "Version allégée de la mayonnaise Jadida, moins calorique mais tout aussi savoureuse. " +
                "Pour une cuisine équilibrée sans compromis sur le goût et la texture."),

            make("Mayonnaise à l'Ail Jadida", "300g", ShowcaseCategory.MAYONNAISE,
                "Mayonnaise Jadida enrichie d'ail naturel pour une saveur unique et intense. " +
                "Idéale pour accompagner viandes grillées, légumes rôtis et plats orientaux.")
        );

        repo.saveAll(products);
        log.info("[Seeder] {} produits Jadida insérés dans la galerie.", products.size());
    }

    private ShowcaseProduct make(String name, String volume,
                                  ShowcaseCategory cat, String description) {
        ShowcaseProduct p = new ShowcaseProduct();
        p.setName(name);
        p.setBrand("Jadida");
        p.setCategory(cat);
        p.setVolume(volume);
        p.setDescription(description);
        return p;
    }
}
