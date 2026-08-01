# Tests

Commande locale : `node tests/run-tests.js`.

État initial `dev.6` : 29 tests réussis. Après ajout du contournement navigateur pour le `502` de l'API publique : **31 tests réussis, aucun échec**, avec Node.js 18.

État local `dev.7` : **46 tests réussis, aucun échec**. Les 15 nouveaux tests PFMP couvrent le catalogue dynamique, les exclusions, les BTS sans classe historique, les relations certaines, les scénarios de dates, l'apprentissage, les coordonnées, les 61 colonnes, la concurrence, Turnstile, les courriels simulés et l'indépendance de la route. Aucun test n'effectue d'appel réseau réel.

État de recette `dev.11` : **106 tests réussis, aucun échec**. Les 88 contrôles antérieurs restent couverts et 18 contrôles vérifient le cas API Monaco, les suffixes successifs, la conservation des noms de voie et la règle téléphonique « pays ou France ». Aucun test n’effectue d’écriture ou d’appel réseau réel.

La suite couvre normalisation, vide, espaces, lettres, longueur, Luhn, mapping actif/fermé, diffusion partielle, réponse incomplète, introuvable, indisponibilité API/Grist, configuration absente et garde d'autorisation de l'installation par tests statiques/simulés. Le double clic est empêché côté client par désactivation immédiate. Le HTML et ses champs essentiels sont contrôlés, ainsi que le breakpoint mobile. Les appels externes et écritures Grist ne sont pas exécutés.

Contrôles complémentaires : syntaxe JavaScript extraite des `.gs`, JSON du manifeste et `.clasp.json`, recherche de motifs de secrets, état Git et absence de chemin Prévention PACA.
