# Gold Mines — By Orpaz

Thème Shopify Online Store 2.0 sur-mesure pour une maison de joaillerie de
luxe. Projet neuf, indépendant de tout thème ou boutique Shopify existants —
rien n'est connecté à une boutique tant que ce n'est pas explicitement
demandé.

## Architecture

```
config/            réglages du thème (Theme Editor) — polices, couleurs, layout, motion
layout/theme.liquid  document HTML racine, meta, chargement des assets
sections/           blocs réordonnables dans le Theme Editor
snippets/           partiels réutilisables (icônes, cartes, etc.)
templates/          gabarits JSON par type de page
assets/             CSS/JS du design system
locales/            fr.default.json (textes) + fr.default.schema.json (admin)
```

## Design system

Tous les tokens (couleurs, typographies, espacements, rayons, ombres,
durées d'animation) vivent dans `assets/theme.css` sous forme de variables
CSS `--gm-*`. Les couleurs et polices principales restent pilotables depuis
le Theme Editor (`config/settings_schema.json`) sans toucher au code.

Palette : blanc/ivoire, tons pierre, onyx, et un bleu profond signature
(`--gm-navy-900`) avec un accent or (`--gm-gold-500`) utilisé avec parcimonie.

## Avancement par phases

- [x] Phase 1 — Architecture, design system, header + mega-menu + nav mobile, footer
- [x] Phase 2 — Homepage éditoriale complète (hero, univers, créations, fiançailles,
      pierres précieuses, sur-mesure, savoir-faire, atelier, services, Maison, boutique/RDV)
- [x] Phase 3 — Collections (bannière, filtres natifs Search & Discovery, tri,
      blocs éditoriaux), recherche prédictive + page de résultats, carte produit
      premium (swatches métal, badges, wishlist)
- [x] Phase 4 — Fiche produit avancée + configurateur bague (galerie, options
      dynamiques, slider carat, gravure, CTA sticky mobile, réassurance,
      recommandations natives Shopify)
- [ ] Phase 5 — Fiançailles, diamants, pierres précieuses
- [ ] Phase 6 — Sur-mesure, services, Maison, boutique, RDV
- [ ] Phase 7 — Compte, wishlist, panier, contact
- [ ] Phase 8 — Animations + responsive mobile/tablette/desktop
- [ ] Phase 9 — SEO, performance, accessibilité
- [ ] Phase 10 — Audit final

## Données Shopify attendues par la fiche produit (Phase 4)

- **Variantes natives** : Métal, Forme, Carat, Couleur, Pureté, Taille de
  doigt, Largeur, Sertissage, Certificat — le configurateur détecte ces noms
  d'option automatiquement (insensible à la casse) et choisit l'interface
  adaptée (pastilles métal, slider carat, cartes forme, sélecteur taille…).
  Un nom d'option différent retombe sur des pastilles génériques.
- `product.metafields.custom.engraving_available` (booléen) — révèle le champ
  de gravure sur les produits qui le proposent réellement.
- `product.metafields.custom.gem_details` (rich text) — détails gemmologiques
  affichés dans l'accordéon « Bague & détails de la pierre ».
- Tag produit `sur-devis` — remplace le bouton « Ajouter au panier » par
  « Demander un devis ».
- Tag produit `exclusivite` — affiche le badge « Exclusivité » sur la carte
  produit.
- Recommandations « Vous pourriez aussi aimer » et « À associer avec »
  utilisent l'API native Shopify Product Recommendations (`intent=related` /
  `intent=complementary`) — aucune donnée inventée.

## Notes

- Aucune donnée gemmologique, avis client ou certificat n'est inventé :
  ces contenus sont prévus comme metafields/metaobjects à renseigner
  depuis l'admin Shopify une fois les vraies données disponibles.
- Les animations respectent `prefers-reduced-motion`.
- Ce thème n'est connecté à aucune boutique Shopify pour le moment.
- Les pages liées depuis la homepage (Fiançailles, Sur-mesure, La Maison, Boutique,
  Rendez-vous, Diamants, Pierres précieuses, Services, mentions légales, CGV,
  confidentialité, cookies) seront créées comme pages Shopify avec leur propre
  gabarit dans les phases 5 et 6 — elles n'existent pas encore, ce qui est normal
  à ce stade du build.
- La prévisualisation « bague portée » avec choix de teint de peau (Phase 4)
  a son architecture JS prête (`data-gm-worn-toggle` / `data-gm-worn-slide`)
  mais n'est pas encore rendue : elle nécessite un metaobject listant les
  médias par teint, à définir une fois les vraies photos disponibles.
- Le panier reste une requête AJAX simple vers `/cart/add.js` pour l'instant ;
  le drawer panier visuel complet arrive en Phase 7.
