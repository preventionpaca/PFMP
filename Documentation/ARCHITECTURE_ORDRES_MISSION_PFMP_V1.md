# Architecture des ordres de mission PFMP V1

Une visite conserve un snapshot complet de destination et les horaires, départ, transport, véhicule, distance indicative, objet et commentaire. Une modification ultérieure de convention ou d’entreprise ne modifie jamais ce snapshot.

`EUC_ORDRES_MISSION_PFMP` référence visite, soumission et professeur, conserve les snapshots élève/classe/entreprise/adresse, le statut, la version, l’auteur/validateur et les identifiants du document. Une régénération crée une version, jamais un remplacement silencieux.

La génération future reçoit données figées et modèle configurable dans deux couches distinctes. Nom du lycée, signataire, logo, adresse, exercice et textes réglementaires ne sont pas codés en dur.

Décisions manquantes : modèle officiel, circuit de validation, numérotation, signature, conservation, lieu de départ, véhicule personnel, propriétaire du dossier Drive et droits. Aucun document n’est créé dans ce lot.
