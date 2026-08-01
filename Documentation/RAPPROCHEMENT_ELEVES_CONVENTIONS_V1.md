# Rapprochement élèves et conventions PFMP V1

## Ordre de décision

1. identifiant source identique lorsqu’il existe des deux côtés ;
2. classe + nom + prénom + date de naissance strictement normalisés ;
3. sinon proposition `CORRESPONDANCE_A_VALIDER`, jamais fusion automatique.

La comparaison ignore casse, accents, espaces multiples, apostrophes et tirets. La date reste discriminante pour les homonymes. Plusieurs soumissions exactes donnent `PLUSIEURS_SOUMISSIONS`.

États proposés : `CONVENTION_RECUE`, `CONVENTION_INCOMPLETE`, `SANS_CONVENTION`, `PLUSIEURS_SOUMISSIONS`, `CORRESPONDANCE_A_VALIDER`, `ELEVE_HORS_LISTE`, `ELEVE_INACTIF`, `CONVENTION_ANNULEE`.

Une soumission reçue n’est pas assimilée automatiquement à une convention validée. L’acceptation, la correction, le doublon, le changement d’entreprise et l’annulation restent des décisions administratives historisées.

Le moteur local couvre élèves sans soumission, soumissions hors liste, doublons, homonymes et annulations. Il n’écrit rien dans Pronote ou Grist.

Une sortie confirmée ne détache aucune convention. Si elle intervient avant ou pendant la période, l’élève n’est plus à placer mais une convention existante produit une alerte administrative sans annulation automatique. Une sortie postérieure à la fin de la période ne modifie pas rétroactivement le rapprochement historique. Une sortie non confirmée reste à contrôler et continue d’être traitée comme une situation active jusqu’à décision humaine.
