# Cahier des charges — Book entreprises et pilotage de l'apprentissage

## 1. Objectif

Créer deux outils complémentaires sans modifier les parcours PFMP actuellement
fonctionnels :

1. un book des entreprises, avec liste, galerie de devantures et cartographie
   historique ;
2. un tableau de pilotage de l'apprentissage, avec quotas et suivi du circuit
   des dossiers.

Le point de retour fonctionnel est la version Apps Script immuable `927`, liée
au tag Git `pfmp-online-927-stable`. Les nouvelles vues lisent les sources
existantes et ne doivent pas dupliquer les conventions, les élèves ou les
affectations.

## 2. Trois contrats d'affichage

### 2.1 Public parents

La page sera accessible directement depuis un sous-domaine restant à fournir.
Elle n'affiche jamais :

- le nom ou le prénom d'un élève ;
- le nom d'un professeur visiteur ;
- un courriel ou téléphone personnel ;
- un commentaire interne, une rupture ou un motif administratif.

Elle peut afficher l'identité publique de l'entreprise, son adresse, sa
commune, son activité, sa photo de devanture, les diplômes ou métiers déjà
accueillis et des nombres agrégés d'accueils. Un avertissement précisera qu'un
accueil historique ne constitue ni une offre de stage ni une place disponible.

### 2.2 Consultation personnels

Cette vue s'intègre au site de consultation actuellement destiné aux
personnels. Dès qu'un écran affiche des noms d'élèves ou de professeurs, son
accès doit être effectivement réservé aux personnels autorisés ; une simple
URL publique ne suffit pas.

Elle affiche l'historique utile aux visites : année scolaire, élève, classe,
diplôme, période ou dates, professeur visiteur et coordonnées opérationnelles
autorisées de l'entreprise.

### 2.3 Administration

La vue administrative donne accès à toutes les informations autorisées, aux
filtres nominatifs, à l'ajout ou au remplacement des photos de devanture et aux
exports complets. Les modifications d'une fiche entreprise sont historisées.

## 3. Book entreprises

### 3.1 Fiche entreprise

Une entreprise est identifiée par une clé stable : SIRET pour la France, NIS
pour Monaco, ou identifiant interne contrôlé pour l'étranger. Les variations
historiques de nom ou d'adresse ne doivent pas créer plusieurs entreprises.

La fiche réunit :

- raison sociale, nom commercial et activité ou métier ;
- SIRET, NIS ou identifiant interne selon le pays ;
- adresse, complément, code postal, ville, pays et coordonnées géographiques ;
- coordonnées professionnelles autorisées du responsable et du tuteur ;
- diplômes, familles de métiers, niveaux et classes déjà accueillis ;
- nombre d'élèves distincts accueillis dans le périmètre filtré ;
- première et dernière année d'accueil ;
- historique des stages et visites ;
- photo de devanture et consigne d'accès facultative.

Les photos restent dans Drive. Grist ne conserve que l'identifiant du fichier,
une légende, un texte alternatif, la date de prise ou de réception, l'auteur ou
la provenance déclarée, l'état actif et l'ordre d'affichage. Une photo publique
ne doit montrer ni personne reconnaissable ni plaque d'immatriculation lisible.

### 3.2 Filtres combinables

- année scolaire ou toutes les années ;
- famille, filière ou métier ;
- diplôme ;
- année de formation : seconde, première, terminale, BTS 1, BTS 2, etc. ;
- classe ;
- période ou stage ;
- entreprise, commune, pays ou rayon géographique ;
- élève, uniquement pour les personnels et l'administration ;
- professeur visiteur, uniquement pour les personnels et l'administration ;
- scolaire, apprenti ou les deux ;
- entreprise avec ou sans photo ;
- état du géocodage ;
- nombre minimal d'accueils et date du dernier accueil.

Tous les filtres se combinent et le résumé, la liste, la galerie, la carte et
les exports portent exactement sur le même résultat.

### 3.3 Présentations et exports

- vue liste ou tableau ;
- vue galerie, type trombinoscope des devantures ;
- vue cartographique ;
- export Excel du résultat filtré ;
- export PDF en version liste ou galerie avec photos.

Les exports du mode parents appliquent la même anonymisation que l'écran. Aucun
export ne peut révéler une donnée masquée par son niveau d'accès.

### 3.4 Cartographie et infobulles

Pour une période, une année ou toutes les années, chaque point indique le nombre
d'élèves distincts accueillis dans le périmètre courant.

En consultation personnels et en administration, le détail historique contient
pour chaque accueil : année, nom et prénom de l'élève, classe, diplôme,
période ou dates et professeur visiteur. Le panneau est limité en hauteur et
défilable. Le survol affiche un résumé ; un clic ou une action clavier ouvre le
détail persistant et défilable. Sur téléphone, le clic remplace le survol.

En mode parents, la même bulle reste agrégée et non nominative.

## 4. Tableau de bord de l'apprentissage

### 4.1 Indicateurs globaux et par formation

La page d'accueil affiche sous forme de vignettes :

- quota de places ouvertes ;
- contrats signés et actuellement actifs ;
- contrats signés avec une date de début future ;
- dossiers remis au jeune et non encore retournés au bureau ;
- dossiers retournés au bureau et en attente de transmission ;
- dossiers transmis au CFA ;
- places engagées et places restant disponibles ;
- alerte visible en cas de dépassement du quota.

Les mêmes indicateurs sont affichés au niveau établissement, puis par diplôme et
par année de formation. Une vignette ouvre ensuite le détail de la classe.

Les catégories du circuit sont mutuellement exclusives pour les totaux du
tableau de bord : un jeune est compté dans l'étape la plus avancée de son
dossier. Les totaux de flux peuvent être affichés séparément si l'on souhaite
mesurer tous les passages historiques.

### 4.2 Consultation personnels

La consultation montre les indicateurs et les apprentis actuels de la classe.
Les futurs apprentis et états de dossier sont affichés selon le niveau
d'autorisation retenu pour les personnels, mais aucune commande d'édition n'est
présente.

### 4.3 Administration

L'administration montre tout l'effectif de la classe et permet de renseigner ou
valider :

- dossier remis au jeune et date ;
- dossier retourné au bureau et date ;
- transmission au CFA et date ;
- contrat signé, date officielle, début et fin ;
- rupture, date et motif ;
- remarque administrative ;
- quota applicable à l'année, au diplôme et au niveau de formation.

Une date de début future avec contrat signé produit le statut « futur
apprenti ». Le statut « apprenti » ne commence qu'à la date réelle de début du
contrat. Les ruptures ne libèrent une place qu'à partir de leur date effective.

## 5. Emplacement des liens

- Administration : nouvelle carte « Book entreprises » dans « Pilotage PFMP »,
  à côté de « Entreprises et cartographie ».
- Consultation personnels : nouvelle carte « Book des entreprises » sur
  l'accueil de consultation des PFMP.
- Parents : accès direct par le sous-domaine dédié, sans passer par les écrans
  internes.
- Gestion des apprentis : la page actuelle devient l'entrée vers les vignettes
  établissement, diplôme, niveau puis classe ; le formulaire existant reste la
  vue détaillée administrative.

## 6. Performance et non-régression

- Aucun chargement de page ne parcourt toutes les conventions et toutes les
  entreprises directement dans Grist.
- Le book utilise un index léger par entreprise et charge l'historique détaillé
  seulement à l'ouverture de la fiche ou de l'infobulle.
- Les caches sont remplacés en place et ne créent pas d'historique JSON
  illimité.
- Une modification de convention, d'affectation, d'apprentissage ou de photo
  invalide seulement les fiches concernées.
- Les invariants du suivi de classe, des coordonnées entreprise, des statuts,
  des ruptures, des affectations et des 25 routes restent couverts par leurs
  tests existants.
- Chaque lot est publié dans une nouvelle version Apps Script immuable et doit
  pouvoir revenir immédiatement à `927`.

## 7. Découpage de réalisation

1. contrat de données, droits d'accès et index entreprise en lecture seule ;
2. book administratif et consultation personnels, liste et fiche ;
3. vue parents anonymisée et sous-domaine ;
4. cartographie historique détaillée et panneau défilable ;
5. photos Drive, galerie et consignes d'accès ;
6. exports PDF et Excel filtrés ;
7. quotas et tableaux de bord apprentissage ;
8. contrôle complet anti-régression et publication.

## 8. Point PDF de convention constaté le 10 octobre 2026

Le modèle PDF actif du site est encore
`Convention_PFMP_MODELE_DEV95_ok_vierge_7.pdf`. Cette ancienne version ne
contient pas l'intégralité lisible des articles jusqu'à l'article 21. Le fichier
local `Convention_PFMP_DEV101_texte_integral_stabilise.pdf` comporte deux pages
et contient visuellement les articles 6 à 21 ainsi que les signatures.

Avant remplacement du modèle actif, il faut :

1. rendre impossible l'installation d'un modèle de deux pages qui ne contient
   pas les articles 1 à 21 ;
2. vérifier visuellement le recto, le verso, les signatures et les zones de
   fusion sur le nouveau fond ;
3. générer une convention de test autorisée et contrôler le PDF final ;
4. conserver l'identifiant du modèle précédent pour un retour arrière avant de
   remplacer le fond actif.

