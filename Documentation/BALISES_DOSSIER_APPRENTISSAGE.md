# Balises du dossier d’apprentissage

## Règle de saisie dans Word

Une balise est du texte ordinaire écrit exactement sous la forme
`{{NOM_DE_LA_BALISE}}`.

- Conserver les deux accolades ouvrantes et fermantes.
- Utiliser uniquement des majuscules, des chiffres et le caractère `_`.
- Ne mettre ni espace, ni retour à la ligne, ni changement de police ou de
  style à l’intérieur d’une balise.
- Une balise doit tenir sur une seule ligne. Si la colonne est trop étroite,
  utiliser l’alias court prévu ci-dessous.
- Exporter Word en **PDF avec du texte**, jamais en PDF scanné ou en image.
- Après export, charger le PDF dans `Gérer les modèles PDF`. Google Docs n’est
  pas utilisé.

Le modèle de référence a été contrôlé : ses 137 balises restent lisibles dans
le PDF exporté.

## Alias courts obligatoires dans les zones étroites

| Balise à placer dans Word | Signification |
|---|---|
| `{{EL_PROJET}}` | Projet de création ou reprise d’entreprise |
| `{{EL_SHN}}` | Sportif de haut niveau |
| `{{PAA}}` | Avis de l’apprenti |
| `{{PAE}}` | Avis de l’entreprise |
| `{{PAO}}` | Avis de l’organisme |
| `{{PCE}}` | Commentaire de l’entreprise |
| `{{PCO}}` | Commentaire de l’organisme |

Ces alias remplacent les anciens noms trop longs, que Word coupait dans le PDF.

## Liste exacte des balises du modèle

### Élève

`{{ELEVE_ADRESSE}}`, `{{ELEVE_BOE}}`, `{{ELEVE_CODE_POSTAL}}`,
`{{ELEVE_COURRIEL}}`, `{{ELEVE_DATE_NAISSANCE}}`,
`{{ELEVE_EQUIVALENCE_15_20}}`, `{{ELEVE_FORMATION_PREPAREE}}`,
`{{ELEVE_INE}}`, `{{ELEVE_LIEU_NAISSANCE}}`, `{{ELEVE_NATIONALITE}}`,
`{{ELEVE_NIR}}`, `{{ELEVE_NOM}}`, `{{ELEVE_PHOTO}}`, `{{ELEVE_PRENOM}}`,
`{{ELEVE_RQTH}}`, `{{ELEVE_TELEPHONE}}`,
`{{ELEVE_TITRE_EQUIVALENCE}}`, `{{ELEVE_VILLE}}`, `{{EL_PROJET}}`,
`{{EL_SHN}}`.

### Responsables légaux

`{{RESPONSABLES_CONFIGURATION}}`, `{{RESP1_ADRESSE}}`,
`{{RESP1_CIVILITE}}`, `{{RESP1_CODE_POSTAL}}`, `{{RESP1_COURRIEL}}`,
`{{RESP1_NOM}}`, `{{RESP1_PRENOM}}`, `{{RESP1_PROFESSION}}`,
`{{RESP1_TELEPHONE_FIXE}}`, `{{RESP1_TELEPHONE_PORTABLE}}`,
`{{RESP1_VILLE}}`, `{{RESP2_ADRESSE}}`, `{{RESP2_CIVILITE}}`,
`{{RESP2_CODE_POSTAL}}`, `{{RESP2_COURRIEL}}`, `{{RESP2_NOM}}`,
`{{RESP2_PRENOM}}`, `{{RESP2_PROFESSION}}`, `{{RESP2_TELEPHONE_FIXE}}`,
`{{RESP2_TELEPHONE_PORTABLE}}`, `{{RESP2_VILLE}}`.

### Scolarité et candidature

`{{SCOLARITE_ANNEE}}`, `{{SCOLARITE_ANNEE_DIPLOME}}`,
`{{SCOLARITE_AUCUN_DIPLOME}}`, `{{SCOLARITE_DERNIERE_CLASSE}}`,
`{{SCOLARITE_DERNIER_DIPLOME}}`, `{{SCOLARITE_DERNIER_ETABLISSEMENT}}`,
`{{SCOLARITE_ETABLISSEMENT_DIPLOME}}`, `{{SITUATION_AVANT_CFA}}`,
`{{SITUATION_AVANT_CFA_AUTRE}}`, `{{ANCIEN_APPRENTISSAGE_ANNEE}}`,
`{{ANCIEN_APPRENTISSAGE_CLASSE}}`,
`{{ANCIEN_APPRENTISSAGE_ETABLISSEMENT}}`, `{{ORIGINE_CANDIDATURE}}`,
`{{ORIGINE_CANDIDATURE_AUTRE}}`, `{{DEMANDE_INTERNAT}}`.

### Formation

`{{FORMATION_SOUHAITEE}}`, `{{ANNEE_ENTREE_APPRENTISSAGE}}`,
`{{ETABLISSEMENT_ACTUEL}}`, `{{FORMATION_DATE_DEBUT}}`,
`{{FORMATION_DATE_EXAMEN}}`, `{{FORMATION_DATE_FIN}}`,
`{{FORMATION_DUREE_CONTRAT_PROPOSEE}}`, `{{FORMATION_HEURES_CENTRE}}`,
`{{FORMATION_MODALITE_VALIDATION}}`.

### Entreprise et contacts

`{{ENTREPRISE_ADRESSE}}`, `{{ENTREPRISE_CAISSE_RETRAITE}}`,
`{{ENTREPRISE_CODE_POSTAL}}`, `{{ENTREPRISE_CODE_SPECIFIQUE}}`,
`{{ENTREPRISE_CODE_TYPE_EMPLOYEUR}}`,
`{{ENTREPRISE_CONVENTION_COLLECTIVE}}`, `{{ENTREPRISE_COURRIEL}}`,
`{{ENTREPRISE_EFFECTIF}}`, `{{ENTREPRISE_ENSEIGNE}}`,
`{{ENTREPRISE_IDCC}}`, `{{ENTREPRISE_OPCO}}`,
`{{ENTREPRISE_RAISON_SOCIALE}}`, `{{ENTREPRISE_SIRET}}`,
`{{ENTREPRISE_STATUT_JURIDIQUE}}`, `{{ENTREPRISE_TELEPHONE}}`,
`{{ENTREPRISE_TROUVEE}}`, `{{ENTREPRISE_TYPE_EMPLOYEUR}}`,
`{{ENTREPRISE_VILLE}}`, `{{RESP_ENTREPRISE_CIVILITE}}`,
`{{RESP_ENTREPRISE_COURRIEL}}`, `{{RESP_ENTREPRISE_FONCTION}}`,
`{{RESP_ENTREPRISE_NOM}}`, `{{RESP_ENTREPRISE_PRENOM}}`,
`{{RESP_ENTREPRISE_TELEPHONE}}`, `{{CONTACT_RH_COURRIEL}}`,
`{{CONTACT_RH_NOM}}`, `{{CONTACT_RH_PRENOM}}`,
`{{CONTACT_RH_TELEPHONE}}`.

### Maître d’apprentissage et contrat

`{{MAITRE_CIVILITE}}`, `{{MAITRE_COURRIEL}}`,
`{{MAITRE_DATE_NAISSANCE}}`, `{{MAITRE_DIPLOME}}`, `{{MAITRE_NIVEAU}}`,
`{{MAITRE_NOM}}`, `{{MAITRE_POSTE}}`, `{{MAITRE_PRENOM}}`,
`{{MAITRE_TELEPHONE}}`, `{{CONTRAT_AUTORISATION_DEPOT_OPCO}}`,
`{{CONTRAT_DATE_AVENANT}}`, `{{CONTRAT_DATE_DEBUT}}`,
`{{CONTRAT_DATE_FIN}}`, `{{CONTRAT_DUREE_HEBDO_HEURES}}`,
`{{CONTRAT_DUREE_HEBDO_MINUTES}}`, `{{CONTRAT_DUREE_HEBDO_TYPE}}`,
`{{CONTRAT_MAJORATION_HEURES_SUP}}`, `{{CONTRAT_RISQUES_PARTICULIERS}}`,
`{{AVANTAGE_AUTRE}}`, `{{AVANTAGE_LOGEMENT}}`,
`{{AVANTAGE_NOURRITURE}}`, `{{REMUNERATION_BASE}}`,
`{{REMUNERATION_SMC_MONTANT}}`.

### Positionnement

`{{POSITIONNEMENT_ANNEE_DIPLOME}}`, `{{POSITIONNEMENT_AVIS_EQUIPE}}`,
`{{POSITIONNEMENT_COMMENTAIRE_APPRENTI}}`, `{{POSITIONNEMENT_DATE}}`,
`{{POSITIONNEMENT_DATE_SIGNATURE}}`, `{{POSITIONNEMENT_DERNIER_DIPLOME}}`,
`{{POSITIONNEMENT_DIPLOME_OBTENU}}`, `{{POSITIONNEMENT_OBSERVATIONS}}`,
`{{POSITIONNEMENT_REFERENT}}`, `{{POSITIONNEMENT_TOUTES_UNITES}}`,
`{{POSITIONNEMENT_UNITES_GENERALES}}`, `{{POSITIONNEMENT_UNITES_PRO}}`,
`{{PAA}}`, `{{PAE}}`, `{{PAO}}`, `{{PCE}}`, `{{PCO}}`.

### Date d’édition et pagination

`{{DATE_HEURE_IMPRESSION}}`, `{{PAGE_COURANTE}}`, `{{NB_PAGES}}`,
`{{DOSSIER_DATE_RECEPTION}}`.

Dans le modèle fourni, les trois premières balises sont placées dans le pied de
page. Le moteur les remplit sur chacune des huit pages.
