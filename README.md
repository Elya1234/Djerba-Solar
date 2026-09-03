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
- [x] Phase 5 — Pages éditoriales : La Maison, Savoir-faire, Sur-mesure,
      Fiançailles, Diamants, Pierres précieuses, Services, Boutique,
      Rendez-vous, Contact
- [x] Phase 6 — Catalogue approfondi : sous-catégories, blocs éditoriaux
      filtrés par type, "explorer d'autres univers", carte produit avec
      aperçu rapide (Quick View) et prévisualisation métal, favoris
      cohérents partout, priorité de chargement des images
- [x] Phase 7 — Panier : cart drawer premium, page panier, moteur AJAX
      unique (GMCart) partagé par fiche produit/Quick View, gravure via
      line item properties, gestion des refus Shopify
- [x] Phase 8 — Compte client, authentification, Favoris : connexion/
      inscription/mot de passe oublié natifs Shopify, page Mon compte
      (informations, commandes réelles), détail de commande, page Favoris
      dédiée branchée sur le moteur panier partagé, état du compte dans le
      header (desktop et mobile)
- [x] Phase 9 — Finitions luxe, animations, responsive, performance, SEO,
      accessibilité : fil d'Ariane + données structurées (Organization,
      WebSite, Product, BreadcrumbList), Open Graph/Twitter Card, page 404
      avec navigation utile, micro-interactions (badges panier/favoris),
      cibles tactiles élargies sur mobile, QA horizontale sans débordement
      de 390px à 1920px
- [x] Phase 10 — Audit final intégral : inventaire complet, validation
      statique de toutes les références Liquid (render/section/asset,
      blocks/settings des templates JSON) et de toutes les clés de
      traduction utilisées, recherche de contenu résiduel de l'ancien
      projet (aucun trouvé), 3 bugs réels trouvés et corrigés (voir
      section dédiée ci-dessous)

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

## Pages éditoriales (Phase 5)

Chaque page utilise un gabarit JSON dédié (`templates/page.<handle>.json`),
entièrement composé de sections réutilisables — pas de gros bloc de texte.
Pour que les liens internes déjà en place fonctionnent, les pages Shopify
doivent être créées avec ces handles exacts et leur thème associé :

| Page Shopify (handle) | Gabarit |
|---|---|
| `la-maison` | Histoire, philosophie, expertise, atelier, matières, galerie |
| `savoir-faire` | Timeline 9 étapes, vidéo, galerie |
| `sur-mesure` | Points de départ, parcours visuel 8 étapes, galerie, CTA (4 boutons) |
| `fiancailles` | Hero, formes, métaux, créations, configurateur, guide |
| `diamants` | Éducation 4C, naturel/laboratoire, certification |
| `pierres-precieuses` | Grille de pierres, exigence qualité |
| `services` | 10 services avec image + description + CTA |
| `boutique` | Coordonnées, carte (iframe optionnelle), galerie |
| `rendez-vous` | Motifs (cartes), formulaire Shopify natif |
| `contact` | Formulaire + coordonnées |

Nouveaux composants réutilisables : `editorial-split` (image/texte, généralisé
depuis le bloc Maison de la homepage), `process-steps` (parcours visuel avec
image par étape), `video-feature` (vidéo plein écran), `cta-banner` (bannière
multi-boutons — chaque bouton ne s'affiche que si libellé + lien sont
renseignés), `diamond-education` (les 4C), `store-info` (coordonnées
boutique), et le formulaire de contact natif Shopify (`snippets/contact-form-fields.liquid`,
réutilisé par Contact et Rendez-vous).

Le formulaire de rendez-vous n'invente aucune confirmation : après envoi, le
message précise explicitement que ce n'est pas une réservation confirmée et
que l'équipe recontactera le client.

## Catalogue et découverte (Phase 6)

- `main-collection.liquid` : bannière désactivable (`show_banner`), rangée de
  sous-catégories (`subcategory` blocks), grille produits avec bloc éditorial
  périodique, filtres natifs Shopify (desktop + drawer mobile), tri, état
  "aucun résultat" avec retour vers toutes les créations/collections, et une
  section "Explorer d'autres univers" en bas de page (`universe` blocks).
- `product-card.liquid` : gère désormais l'indisponibilité (« Épuisé »), le
  sur-devis, un bouton Aperçu rapide, et un aperçu au survol/clic du métal
  qui change l'image principale (basé sur `variant.featured_image` — aucune
  image inventée). Les 4 premières cartes de chaque grille chargent en
  priorité (`priority: true`) pour la performance above-the-fold.
- **Quick View** : décision — implémenté, mais volontairement limité. Pour un
  produit à une seule option (ex. taille de chaîne), il permet un ajout au
  panier direct. Pour un produit multi-options (la plupart des bagues avec
  métal + carat + taille), reproduire le configurateur complet dans une
  modale duperait la logique ou omettrait des contraintes réelles ; le Quick
  View affiche donc l'essentiel (image, prix, disponibilité) et renvoie vers
  la fiche complète pour configurer. Données réelles uniquement, via le
  endpoint `.json` natif du produit.
- **Favoris** : même mécanisme partout (carte produit, fiche produit, Quick
  View) via `data-gm-wishlist-add`. Stockage `localStorage` uniquement — non
  synchronisé entre appareils, ce qui n'est jamais présenté comme le cas.

## Panier (Phase 7)

- **Un seul moteur panier** (`assets/cart.js`, `window.GMCart`) : fiche
  produit, Quick View, cart drawer et page panier appellent tous
  `GMCart.addItem` / `changeLine` / `updateNote` — un seul point d'appel
  réseau, un seul rendu, jamais de logique dupliquée.
- **Cart drawer** (`sections/cart-drawer.liquid`, section statique rendue
  globalement) : ouverture automatique à l'ajout, image/variantes/gravure
  (line item properties)/quantité/suppression/sous-total, focus trap,
  Escape, retour du focus, `aria-live` pour les lecteurs d'écran.
  Réassurance et liens de l'état vide sont des réglages/blocs — jamais
  affichés sans configuration réelle.
- **Page panier** (`sections/main-cart.liquid` + `templates/cart.json`) :
  même moteur, mêmes composants, plus une note de commande optionnelle
  réellement envoyée à Shopify (`/cart/update.js`).
- **Sur-devis** : jamais de formulaire panier ; CTA « Demander un devis »
  sur la fiche produit et dans le Quick View.
- **Bouton Commander** : lien direct vers `{{ routes.cart_url }}/checkout`,
  le checkout Shopify officiel — aucune page de paiement recréée.
- Un ajout refusé par Shopify (rupture, quantité invalide, erreur réseau)
  affiche le vrai message renvoyé par l'API et ne modifie jamais le
  compteur ni l'état visuel comme si l'ajout avait réussi.

## Compte client, authentification & Favoris (Phase 8)

- **Authentification 100% native Shopify** : `sections/main-login.liquid`
  (`{% form 'customer_login' %}` + `{% form 'recover_customer_password' %}`
  dans la même section, basculées côté client sans recharger la page —
  Shopify redirige de lui-même vers `#recover` en cas d'erreur/succès du
  formulaire de récupération), `sections/main-register.liquid`
  (`{% form 'create_customer' %}`, uniquement prénom/nom/e-mail/mot de
  passe), `sections/main-reset-password.liquid`
  (`{% form 'reset_customer_password' %}`, lien reçu par e-mail). Aucun mot
  de passe stocké localement, aucun jeton inventé, aucune connexion simulée
  en production — tout passe par les endpoints `{% form %}` de Shopify.
  Templates : `templates/customers/{login,register,reset_password}.json`.
- **Mon compte** (`sections/main-account.liquid`,
  `templates/customers/account.json`) : identité, informations
  personnelles, `customer.orders` paginé (état vide honnête si aucune
  commande), lien vers Favoris, déconnexion (`routes.account_logout_url`).
- **Détail de commande** (`sections/main-order.liquid`,
  `templates/customers/order.json`) : uniquement les champs réels de
  l'objet `order` (numéro, statut, lignes, adresse de livraison) — aucune
  donnée de commande fabriquée.
- **Favoris** (`sections/main-wishlist.liquid` +
  `assets/wishlist-page.js`, page Shopify `templates/page.wishlist.json`) :
  lit `window.GMWishlist`, récupère chaque création via son propre
  endpoint `.json` (jamais de cache figé), puis applique la même logique
  que la carte produit / la fiche produit / le Quick View : un seul
  variant disponible → ajout direct via `GMCart.addItem` ; plusieurs
  variants → renvoi vers la fiche pour configurer (une entrée de favoris
  ne mémorise pas de variant précis, deviner serait malhonnête) ; tag
  `sur-devis` → « Demander un devis » ; indisponible → bouton désactivé,
  jamais un faux bouton actif.
- **Persistance des favoris** (`assets/wishlist.js`) : `localStorage`
  uniquement, par appareil et par navigateur — jamais présenté comme
  synchronisé avec le compte. Stocke des paires `{id, url}` (et non de
  simples identifiants) pour que la page Favoris puisse aller chercher les
  données réelles du produit sans jamais en inventer. Toute la surface du
  thème (carte produit, fiche produit, Quick View, page Favoris) passe par
  l'API `window.GMWishlist` plutôt que de toucher `localStorage`
  directement ; migrer vers une persistance liée au compte plus tard ne
  demandera de changer que `read`/`write` dans ce seul fichier.
- **État du compte dans le header** : `{% if customer %}` bascule entre un
  lien de connexion simple et un menu déroulant discret (Mon compte / Mes
  commandes / Mes favoris / Déconnexion), avec le même état reflété dans
  le pied de la navigation mobile plein écran.
- **Hors périmètre, assumé** : `templates/customers/addresses.json`
  (gestion des adresses) et `templates/customers/activate_account.json`
  (activation de compte invité) ne sont pas construits dans cette phase.

## Finitions luxe, SEO, performance & accessibilité (Phase 9)

- **Données structurées** (`snippets/structured-data.liquid`, inclus une
  fois dans `layout/theme.liquid`) : `Organization` + `WebSite` sur
  toutes les pages, `Product` et `BreadcrumbList` sur les fiches produit
  et collections — construites uniquement à partir des objets Shopify
  réels (`shop`, `product`, `collection`), jamais de faux avis ou de
  fausses données. N'entre pas en conflit avec les données structurées
  natives de Shopify (aucune duplication du même type).
- **Fil d'Ariane visible** (`snippets/breadcrumbs.liquid`) sur fiche
  produit et collection — même trajet que le `BreadcrumbList` ci-dessus,
  couleur héritée du contexte (s'adapte automatiquement à une bannière
  sombre ou à un fond clair).
- **Partage social** : Open Graph (`og:image` sur l'image produit réelle
  ou le favicon), Twitter Card `summary_large_image`.
- **Page 404** enrichie avec quatre destinations utiles (Accueil,
  Collections, Recherche, Prendre rendez-vous) plutôt qu'un simple retour
  à l'accueil.
- **Micro-interactions** : un léger « bump » (respecte
  `prefers-reduced-motion`) sur le compteur panier à chaque ajout et sur
  le cœur/compteur favoris à chaque changement — jamais gadget, toujours
  bref et discret.
- **Cibles tactiles** : icônes du header, cœur de carte produit et
  boutons +/- du panier agrandis sur mobile/tactile (`pointer: coarse`)
  pour se rapprocher des ~44px recommandés, sans alourdir la densité
  visuelle du desktop.
- **QA responsive élargie** : recherche systématique de débordement
  horizontal sur neuf largeurs (390, 430, 768, 834, 1024, 1280, 1440,
  1728, 1920px) — aucun débordement constaté après correctifs ; parcours
  complets (recherche, Quick View, configurateur, panier, favoris, menu
  mobile, mega-menu) revérifiés aux trois largeurs de référence
  (390×844, 834×1194, 1440×900).

## Audit final (Phase 10)

Validation statique automatisée sur l'ensemble du dépôt : toutes les
références `{% render %}`/`{% section %}`/`| asset_url` pointent vers un
fichier existant, tous les `type` de section/bloc utilisés dans les
templates JSON existent dans le schema de la section correspondante,
toutes les clés `| t` utilisées en Liquid existent dans
`fr.default.json` — zéro anomalie restante. Aucune trace de l'ancien
projet (recherche de « Djerba », « Solar », « Tunisie ») ni de contenu
de développement oublié (TODO, FIXME, `console.log`, Lorem ipsum).

Trois bugs réels trouvés et corrigés pendant cet audit :
1. **`locales/fr.default.json`** : la clé `general.page` (titre des
   pages paginées, ex. « Page 2 ») était utilisée dans `layout/theme.liquid`
   mais absente du fichier — la balise `<title>` aurait affiché
   littéralement « general.page ». Ajoutée.
2. **Cascade CSS** (`assets/theme.css` → `header.css`/`collection.css`/
   `cart.css`) : l'agrandissement des cibles tactiles ajouté en Phase 9
   ne s'appliquait jamais — `theme.css` se charge avant ces fichiers, et
   à spécificité égale la règle chargée en dernier gagne toujours,
   quelle que soit sa media query. Déplacé dans chaque fichier concerné,
   après la règle de base qu'il doit surcharger.
3. **`assets/account.css`** : `.gm-account__layout` (grille) et
   `.gm-account__info-row`/`.gm-order-card` (flex) n'avaient pas de
   `min-width: 0` sur leurs pistes/enfants — une adresse e-mail ou un
   numéro de commande un peu long forçait un débordement horizontal
   réel sur mobile (`min-width: auto` est la valeur par défaut d'une
   piste de grille ou d'un enfant flex, qui ignore sinon la largeur
   disponible). Corrigé : pistes en `minmax(0, …)`, valeurs longues
   avec retour à la ligne.

Les réglages de réseaux sociaux (`social_instagram`, `social_facebook`)
avaient une valeur par défaut générique (`https://instagram.com`,
`https://facebook.com`) qui aurait affiché des icônes de réseaux
sociaux d'apparence fonctionnelle avant toute configuration réelle —
remis à vide, cohérent avec les autres réglages de contact.

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
