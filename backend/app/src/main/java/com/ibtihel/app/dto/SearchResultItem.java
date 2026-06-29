package com.ibtihel.app.dto;

/**
 * DTO unifié pour les résultats de recherche globale.
 * Chaque résultat contient tout ce qu'il faut pour l'affichage
 * et la navigation côté front.
 */
public class SearchResultItem {

    /** Type d'entité : PRODUCT, MOVEMENT, PRODUCTION, WAREHOUSE, SHOWCASE, STOCK */
    private String type;

    /** Identifiant de la ressource en base */
    private Long id;

    /** Titre principal affiché (nom, référence…) */
    private String title;

    /** Sous-titre / contexte (code, statut, entrepôt…) */
    private String subtitle;

    /** URL React à ouvrir au clic */
    private String url;

    /** Étiquette courte colorée (ex: "Produit", "WO", "RÉALISÉE"…) */
    private String badge;

    /** Icône Lucide suggérée (string, le front la résout) */
    private String icon;

    /** Mise en évidence du terme recherché dans le titre (HTML sûr, optionnel) */
    private String highlight;

    // ── Constructeur complet ────────────────────────────────────────────────
    public SearchResultItem(String type, Long id, String title, String subtitle,
                             String url, String badge, String icon) {
        this.type     = type;
        this.id       = id;
        this.title    = title;
        this.subtitle = subtitle;
        this.url      = url;
        this.badge    = badge;
        this.icon     = icon;
    }

    // ── Getters / Setters ────────────────────────────────────────────────────
    public String getType()      { return type; }
    public void   setType(String t) { this.type = t; }

    public Long   getId()        { return id; }
    public void   setId(Long i)  { this.id = i; }

    public String getTitle()     { return title; }
    public void   setTitle(String t) { this.title = t; }

    public String getSubtitle()  { return subtitle; }
    public void   setSubtitle(String s) { this.subtitle = s; }

    public String getUrl()       { return url; }
    public void   setUrl(String u) { this.url = u; }

    public String getBadge()     { return badge; }
    public void   setBadge(String b) { this.badge = b; }

    public String getIcon()      { return icon; }
    public void   setIcon(String i) { this.icon = i; }

    public String getHighlight() { return highlight; }
    public void   setHighlight(String h) { this.highlight = h; }
}
