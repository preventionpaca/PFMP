# Décisions métier permanentes

- La version Apps Script immuable active est la source technique de récupération lorsqu'elle est plus récente que Git. La récupération doit conserver une preuve d'identité avant toute correction.
- ADMIN et PUBLIC restent deux déploiements du même projet Apps Script ; toute évolution doit vérifier leur version commune et ne mettre à jour que les déploiements existants.

- Pronote reste le progiciel officiel. Eucalyptus PFMP est l’outil opérationnel de suivi et de relation entreprise ; les informations utiles pourront être reportées dans Pronote.
- Aucune signature électronique : les conventions sont imprimées et signées sur papier. L’élève saisit sa convention après signature par l’entreprise.
- Les données 2025-2026 sont un jeu historique de test. Aucun effectif Pronote réel 2026-2027 n’est importé.
- Un élève sorti reste visible mais n’est plus compté sans convention après sa sortie.
- Homonymes et rapprochements ambigus ne sont jamais fusionnés automatiquement.
- Les classes viennent de Grist. Exactement 38 classes PFMP sont autorisées ; `1CAPP` et `TMELEC G` sont exclues.
- En 2026-2027, `1MP3D`, `2BTS CPI`, `2BTS CPRP`, `2BTS ELEC` et `2BTS CIEL` n’ont volontairement aucune période officielle. Cette absence n’est pas une anomalie.
- `1BTS ELEC` et `1BTS CIEL` ont des périodes propres, aux mêmes dates : du 24/05/2027 au 02/07/2027.
- Les blocs `ENT.` et l’alternance ne deviennent jamais automatiquement des PFMP scolaires.
- Toute modification administrative est historisée. Une annulation est logique, jamais une suppression physique.
- Suivi téléphonique et visite en entreprise sont deux affectations distinctes. Aucun enseignant n’est codé en dur.
- Les ordres de mission utilisent un modèle Google Docs fusionnable choisi par famille. Le PDF fourni sert de référence visuelle ; les futurs modèles doivent rester éditables pour garantir le remplacement fiable des champs et de la liste d'élèves.
- Une situation administrative PFMP est liée à une année, une classe, une période et un élève. Elle ne remplace ni Pronote ni une convention et ne peut être appliquée qu’à un élève actuellement sans convention, non apprenti et sans incident de convention.
- Le référentiel de situations est administrable. La désactivation empêche les nouvelles affectations mais conserve l’historique ; le retrait d’une affectation est logique, jamais une suppression physique.
- Un motif peut être configuré pour retirer ou non l’élève du compteur `Sans convention`. Les trois motifs initiaux (`Dossier géré par la vie scolaire`, `Démissionnaire`, `Absentéiste`) retirent l’élève de ce compteur.
- L'ancien motif erroné `Dossier géré par avis scolaire` constitue une exception explicitement autorisée à la conservation logique : ses affectations sont migrées vers `Dossier géré par la vie scolaire`, puis ce seul référentiel inutilisé est supprimé physiquement.
- Un accès futur des professeurs principaux aux affectations doit être limité à leur classe et à l'année active, aux seules actions `TELEPHONE` et `VISITE`, avec jeton temporaire haché et révocable. Aucun secret en clair, annuaire complet ou droit administrateur ne doit être exposé sur la page publique.
