# Audit performance et budget API — DEV445

Date : 5 octobre 2026. Périmètre : déploiements public et administrateur existants, copie Grist autorisée `j1jDArBkzi7P` uniquement.

## Conclusion

La régression provenait de deux chemins qui contournaient les snapshots :

1. le géocodage reconstruisait ses candidats classe par classe et période par période, avec des lectures de détail répétées, puis relisait et contrôlait la table de géocodage à chaque écriture ;
2. les pages de suivi pouvaient relancer les jointures métier lorsque la fraîcheur d'un snapshot venait d'être invalidée. Le bouton global « Afficher les décomptes » reconstruisait encore le résumé depuis les tables vivantes.

DEV445 remplace ces chemins par des lectures de snapshots durables et des traitements en mémoire. Les snapshots complets restent lisibles pendant leur reconstruction. Les infobulles n'ont plus à relancer une reconstruction et affichent un état de recalcul si nécessaire.

## Budget Grist après correction

### Géocodage

- Construction de la liste : une lecture annuelle des snapshots de détail et une lecture de la table géographique.
- Déduplication : SIRET prioritaire, sinon identité normalisée entreprise + adresse.
- Géocodage automatique : seulement les adresses nouvelles ou réellement modifiées, maximum 40 adresses par lot.
- Écriture d'un lot : au plus un `PATCH` pour les lignes existantes et un `POST` pour les nouvelles lignes, indépendamment du nombre de classes ou de périodes.
- Aucun contrôle de schéma, aucune relecture intégrale et aucune reconstruction de candidats après chaque ligne écrite.

Le coût n'est donc plus proportionnel au nombre de couples classe/période. Une entreprise déjà géocodée et dont l'adresse n'a pas changé ne déclenche plus de nouvel appel BAN ni de réécriture Grist.

### Consultation et administration

- Famille et détail : lecture du dernier snapshot enrichi, y compris pendant la fenêtre de reconstruction.
- Résumé global : agrégation des trois snapshots familiaux en mémoire, puis publication d'un résumé compact avec la reconstruction planifiée.
- Le résumé compact est fragmenté dans les propriétés Apps Script et conservé six heures dans le cache ; il est injecté dans la page pour éviter l'aller-retour `google.script.run` au clic.
- Si le résumé compact n'existe pas encore, un repli ciblé reste prévu. Avec le quota Grist actuellement épuisé, ce premier amorçage ne peut pas être validé avant le renouvellement du quota.

## Chronométrages réels

Mesures faites par navigation réelle avec le navigateur intégré. Elles incluent l'enveloppe Google Apps Script et le rendu de l'iframe.

| Parcours | Temps mesuré |
|---|---:|
| `pfmp.loucodi.fr` — entrée publique | 3,3 à 4,8 s |
| Public — liste BAC PRO | 3,3 à 5,1 s |
| Public — liste d'élèves TMP3D / PFMP n°1 | 4,9 à 5,5 s tant que le snapshot est disponible |
| Public — changement TMT vers TCAR | 4,0 s |
| Public — retour aux classes | 4,6 s |
| Public — BTS | 5,0 s |
| Public — CAP | 4,1 s |
| Public — apprentis, route directe | 4,7 s |
| `alternance.loucodi.fr` — entrée administrateur | 4,7 s |
| Admin — entrée du suivi | 3,3 à 4,5 s |
| Admin — liste BAC PRO après correctif snapshot | 5,8 s côté navigateur ; 1,6 s côté serveur |
| Admin — liste d'élèves TMT / PFMP n°1 | 4,4 s |
| Admin — apprentis | 5,5 s |
| Admin — générateur de conventions | 3,9 s |
| Admin — parcours différencié | 4,6 s |
| Admin — conventions | 6,6 s |
| Admin — élèves sans convention | 3,8 s |
| Admin — ordres de mission | 3,8 s |
| Admin — accès PP | 3,6 s |
| Admin — géocodage | 2,7 s |
| Admin — cartographie | 3,3 s |
| Admin — import Pronote (page seule, aucune importation) | 4,1 s |
| Admin — synchronisation professeurs/classes (page seule) | 3,7 s |
| Admin — diplômes/classes | 4,1 s |
| Admin — paramètres convention | 3,8 s |
| Admin — maintenance snapshots | 3,2 s |
| Admin — destinataires/envois | 9,7 s |

Le principal reliquat applicatif est la page Destinataires/envois, qui embarque encore ses données côté serveur. Elle doit devenir une coquille légère avec chargement ciblé, dans un lot séparé.

## Blocages externes observés

- Grist répond actuellement `429 Exceeded daily limit for document`. Les pages qui doivent amorcer une donnée absente ne peuvent donc pas être mesurées à froid de façon concluante. Relancer en boucle aggraverait la situation ; aucun nouveau lot de géocodage n'a été lancé pendant l'audit.
- `apprenti.loucodi.fr` répond `ERR_NAME_NOT_RESOLVED` : le nom DNS n'a pas d'adresse résolue. Le point d'entrée apprentis de la Web App fonctionne en accès direct, mais ce sous-domaine doit être corrigé chez le fournisseur DNS.
- `alternance.loucodi.fr` redirige correctement vers le déploiement administrateur existant.

## Validation

- 16 tests ciblés DEV445 passent.
- Le déploiement Apps Script actif est la version immuable 794 sur les deux Web Apps existantes.
- La suite globale conserve sept échecs antérieurs et indépendants de DEV445 : attentes de versions dev.8/dev.27 devenues obsolètes, garde d'une ancienne configuration Grist, routeur historique absent du socle Git et fichier d'audit dev.9 manquant. Aucun test n'a été affaibli.
