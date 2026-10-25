/**
 * DEV630 — Référentiels des diplômes (blocs de compétences RNCP) pour le livret de suivi des apprentis.
 *
 * Relevé le 24 octobre 2026 sur les fiches publiques de France Compétences
 * (https://www.francecompetences.fr/recherche/rncp/<numéro>/). Seuls les blocs professionnels portent leurs
 * compétences ; les blocs d'enseignement général sont listés par leur intitulé. Données publiques, sans donnée
 * personnelle. Correspondance ligne de planning → fiche pour l'année 2026-2027 (session d'examen de chaque promotion).
 */
var EUC_DEV630_RELEVE_ = '2026-10-24';
var EUC_DEV630_REFERENTIELS_ = {
 "RNCP37601": {
  "titre": "CAP - Carrossier automobile",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37601BC01",
    "intitule": "Intervention et réparation sur élément",
    "option": "",
    "competences": [
     "Collecter les informations nécessaires à l’intervention",
     "Appliquer la méthodologie de réparation",
     "Remettre en conformité",
     "Contrôler la qualité de son intervention"
    ]
   },
   {
    "code": "RNCP37601BC02",
    "intitule": "Préparation des fonds et des surfaces",
    "option": "",
    "competences": [
     "Réaliser la préparation des fonds",
     "Réaliser la préparation des surfaces"
    ]
   },
   {
    "code": "RNCP37601BC03",
    "intitule": "Intervention sur les inamovibles et les vitrages",
    "option": "",
    "competences": [
     "Remplacer un élément de structure",
     "Mettre en conformité un vitrage"
    ]
   }
  ],
  "generaux": [
   "Français et histoire-géographie-enseignement moral et civique",
   "Mathématiques et physique-chimie",
   "Education physique et sportive",
   "Prévention - santé - environnement",
   "Langue vivante (facultatif)",
   "Arts appliqués et cultures artistiques (facultatif)",
   "Mobilité (facultatif)"
  ]
 },
 "RNCP37540": {
  "titre": "CAP - Peintre automobile",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37540BC01",
    "intitule": "Intervention et réparation sur un élément",
    "option": "",
    "competences": [
     "Collecter les informations nécessaires à l’intervention",
     "Appliquer la méthodologie de réparation",
     "Remettre en conformité",
     "Contrôler la qualité de son intervention"
    ]
   },
   {
    "code": "RNCP37540BC02",
    "intitule": "Préparation et application des peintures",
    "option": "",
    "competences": [
     "Réaliser la préparation des fonds et des surfaces",
     "Appliquer les différents types de peinture",
     "Contrôler la conformité d’une application"
    ]
   }
  ],
  "generaux": [
   "Français et histoire-géographie-enseignement moral et civique",
   "Mathématiques et physique-chimie",
   "Education physique et sportive",
   "Prévention-santé-environnement",
   "Langue vivante (facultatif)",
   "Arts appliqués et cultures artistiques (facultatif)",
   "Mobilité (facultatif)"
  ]
 },
 "RNCP37913": {
  "titre": "BAC PRO - Carrossier peintre automobile",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37913BC01",
    "intitule": "Diagnostic et communication technique",
    "option": "",
    "competences": [
     "Analyser une estimation des travaux",
     "Communiquer à l’interne et à l’externe",
     "Interpréter des valeurs à la suite d’un contrôle de la structure et des trains roulants"
    ]
   },
   {
    "code": "RNCP37913BC02",
    "intitule": "Intervention et réparation sur un élément",
    "option": "",
    "competences": [
     "Collecter les informations nécessaires à l’intervention",
     "Appliquer la méthodologie de réparation",
     "Remettre en conformité",
     "Contrôler la qualité de son intervention"
    ]
   },
   {
    "code": "RNCP37913BC03",
    "intitule": "Préparation et application des peintures",
    "option": "",
    "competences": [
     "Réaliser la préparation des fonds et des surfaces",
     "Appliquer les différents types de peinture",
     "Contrôler la conformité d’une application"
    ]
   },
   {
    "code": "RNCP37913BC04",
    "intitule": "Intervention sur les inamovibles et les vitrages",
    "option": "",
    "competences": [
     "Remplacer un élément de structure",
     "Mettre en conformité un vitrage"
    ]
   }
  ],
  "generaux": [
   "Mathématiques",
   "Physique-chimie",
   "Economie – gestion",
   "Prévention-santé-environnement",
   "Langue vivante",
   "Français",
   "Histoire-géographie-enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Education physique et sportive",
   "Langue vivante étrangère ou régionale (facultatif)",
   "Mobilité (facultatif)"
  ]
 },
 "RNCP40009": {
  "titre": "BAC PRO - Maintenance des véhicules option A voitures particulières option B véhicules de transport routier option C motocycles",
  "actif": false,
  "blocs": [
   {
    "code": "RNCP40009BC01",
    "intitule": "Analyser et préparer une intervention",
    "option": "",
    "competences": [
     "Collecter les données nécessaires à son intervention",
     "Préparer son intervention"
    ]
   },
   {
    "code": "RNCP40009BC02",
    "intitule": "Réaliser des interventions sur véhicule",
    "option": "",
    "competences": [
     "Remettre en conformité les systèmes, les sous-ensembles, les éléments",
     "Régler, paramétrer un système",
     "Préparer le véhicule",
     "Gérer le poste de travail"
    ]
   },
   {
    "code": "RNCP40009BC03",
    "intitule": "Faire un diagnostic sur système mécanique",
    "option": "",
    "competences": [
     "Communiquer en interne et avec les tiers",
     "Diagnostiquer un dysfonctionnement mécanique",
     "Effectuer les contrôles, les essais"
    ]
   },
   {
    "code": "RNCP40009BC04",
    "intitule": "Faire le diagnostic d'un système piloté",
    "option": "",
    "competences": [
     "Effectuer le diagnostic d’un système piloté",
     "Effectuer les mesures sur véhicule"
    ]
   }
  ],
  "generaux": [
   "Mathématiques",
   "Physique-chimie",
   "Economie – gestion",
   "Prévention - Santé - Environnement",
   "Langue vivante",
   "Français",
   "Histoire-géographie-enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Education physique et sportive",
   "Langue vivante étrangère ou régionale (facultatif)",
   "Mobilité (facultatif)"
  ]
 },
 "RNCP40996": {
  "titre": "BAC PRO - Maintenance des véhicules : Option : véhicules légers Option : véhicules de transport routier Option : motocycles",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP40996BC01",
    "intitule": "Réaliser l'entretien périodique des véhicules",
    "option": "",
    "competences": [
     "Organiser un entretien périodique",
     "Identifier les anomalies dans le cadre d’un entretien périodique",
     "Réaliser les opérations de remplacement, d’ajustement dans le cadre de l’entretien périodique",
     "Apporter des conseils techniques à la clientèle sur l’entretien du véhicule"
    ]
   },
   {
    "code": "RNCP40996BC02",
    "intitule": "Réaliser la maintenance corrective des véhicules",
    "option": "",
    "competences": [
     "Préparer une intervention corrective",
     "Réaliser le remplacement ou la réparation des composants",
     "Réaliser le réglage ou le paramétrage des systèmes",
     "Réaliser le contrôle qualité d’une intervention corrective"
    ]
   },
   {
    "code": "RNCP40996BC03",
    "intitule": "Réaliser les diagnostic des systèmes des véhicules",
    "option": "",
    "competences": [
     "Constater un dysfonctionnement",
     "Hiérarchiser les hypothèses",
     "Mettre en œuvre un protocole d’intervention existant ou à définir",
     "Identifier les solutions correctives"
    ]
   }
  ],
  "generaux": [
   "Mathématiques",
   "Physique-chimie",
   "Economie - gestion",
   "Prévention - Santé - Environnement",
   "Langue vivante A",
   "Français",
   "Histoire - géographie - Enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Education physique et sportive"
  ]
 },
 "RNCP37489": {
  "titre": "BAC PRO - Cybersécurité, Informatique et réseaux, Electronique",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37489BC01",
    "intitule": "Réalisation et maintenance de produits électroniques",
    "option": "",
    "competences": [
     "Participer à un projet",
     "Réaliser des maquettes et prototypes",
     "Maintenir un système électronique ou réseau informatique"
    ]
   },
   {
    "code": "RNCP37489BC02",
    "intitule": "Mise en œuvre de réseaux informatiques",
    "option": "",
    "competences": [
     "Valider la conformité d’une installation",
     "Installer les éléments d’un système électronique ou informatique",
     "Exploiter un réseau informatique"
    ]
   },
   {
    "code": "RNCP37489BC03",
    "intitule": "Valorisation de la donnée et cybersécurité",
    "option": "",
    "competences": [
     "Communiquer en situation professionnelle (français/anglais)",
     "Analyser une structure matérielle et logicielle",
     "Coder"
    ]
   }
  ],
  "generaux": [
   "Économie - gestion",
   "Prévention santé environnement",
   "Mathématiques",
   "Physique-chimie",
   "Langue vivante",
   "Français",
   "Histoire-géographie et enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Éducation physique et sportive",
   "Langue vivante étrangère ou régionale (facultatif)",
   "Mobilité (facultatif)",
   "Secteur sportif (facultatif)"
  ]
 },
 "RNCP38878": {
  "titre": "BAC PRO - Métiers de l'électricité et de ses environnements connectés",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP38878BC01",
    "intitule": "Préparation des opérations à réaliser",
    "option": "",
    "competences": [
     "Analyser les conditions de l’opération et son contexte",
     "Définir une installation à l’aide de solutions préétablies",
     "Exploiter les outils numériques dans le contexte professionnel",
     "Compléter les documents liés aux opérations"
    ]
   },
   {
    "code": "RNCP38878BC02",
    "intitule": "Réalisation et mise en service d’une installation",
    "option": "",
    "competences": [
     "Organiser l’opération dans son contexte",
     "Réaliser une installation de manière éco-responsable",
     "Contrôler les grandeurs caractéristiques de l’installation",
     "Régler, paramétrer les matériels de l’installation",
     "Valider le fonctionnement de l’installation",
     "Communiquer entre professionnels sur l’opération",
     "Communiquer avec le client/usager sur l’opération"
    ]
   },
   {
    "code": "RNCP38878BC03",
    "intitule": "Maintenance d’une installation",
    "option": "",
    "competences": [
     "Diagnostiquer un dysfonctionnement",
     "Remplacer un matériel électrique"
    ]
   }
  ],
  "generaux": [
   "Économie - gestion",
   "Prévention santé environnement",
   "Mathématiques",
   "Physique-chimie",
   "Langue vivante",
   "Français",
   "Histoire-géographie et enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Éducation physique et sportive",
   "Langue vivante étrangère ou régionale (facultatif)",
   "Mobilité (facultatif)",
   "Secteur sportif (facultatif)"
  ]
 },
 "RNCP36191": {
  "titre": "BAC PRO - Modélisation et prototypage 3D",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP36191BC01",
    "intitule": "Proposition d'une solution technique",
    "option": "",
    "competences": [
     "Participer à un processus créatif et collectif de conception d'un produit",
     "Prendre en compte les critères de compétitivité d’un produit d’un point de vue technique, économique et sociétal",
     "Représenter des solutions technologiques par des croquis et/ ou des schémas"
    ]
   },
   {
    "code": "RNCP36191BC02",
    "intitule": "Implication au sein d'un bureau d'études",
    "option": "",
    "competences": [
     "Rechercher une information dans une documentation technique, en local ou à distance",
     "Formuler et transmettre des informations, communiquer sous forme écrite et orale",
     "S’impliquer dans un environnement professionnel"
    ]
   },
   {
    "code": "RNCP36191BC03",
    "intitule": "Modélisation et optimisation d'une solution technique",
    "option": "",
    "competences": [
     "Modéliser les solutions techniques à l'aide d'outils numériques",
     "Optimiser le choix d'une solution en tenant compte de la relation produit- procédé-matériaux et des résultats de simulation"
    ]
   },
   {
    "code": "RNCP36191BC04",
    "intitule": "Élaboration de documents techniques et prototypage",
    "option": "",
    "competences": [
     "Élaborer le dossier de définition d'un produit",
     "Réaliser un prototype pour validation fonctionnelle et/ou visuelle",
     "Produire les visuels permettant une exploitation des données par les parties prenantes du projet"
    ]
   }
  ],
  "generaux": [
   "Économie - gestion",
   "Prévention santé environnement",
   "Mathématiques",
   "Physique-chimie",
   "Langue vivante",
   "Français",
   "Histoire-géographie et enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Éducation physique et sportive",
   "Langue vivante étrangère ou régionale (facultatif)",
   "Mobilité (facultatif)"
  ]
 },
 "RNCP41015": {
  "titre": "BAC PRO - Technicien en réalisation de produits mécaniques, option réalisation et suivi de productions, option réalisation et maintenance des outillages",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP41015BC01",
    "intitule": "Etude et préparation de la réalisation",
    "option": "",
    "competences": [
     "Rechercher une information dans une documentation technique, en local ou à distance",
     "Interpréter et vérifier les données de définition de tout ou partie d’un ensemble ou d’un produit mécanique ou d’un outillage",
     "Préparer la réalisation de tout ou partie d’un ensemble ou produit mécanique ou d’un outillage"
    ]
   },
   {
    "code": "RNCP41015BC02",
    "intitule": "Projet de réalisation de produits ou d’un outillage",
    "option": "RSP",
    "competences": [
     "Configurer et régler les postes de travail",
     "Organiser et installer les postes de travail",
     "Installer l’environnement de production et introduire les paramètres nécessaires au bon fonctionnement",
     "Régler les moyens de production",
     "Vérifier et valider les réglages",
     "Mettre en œuvre un moyen de réalisation",
     "Conduire la fabrication dans des environnements de production numérique",
     "Réaliser les opérations de fabrication",
     "Vérifier la conformité aux spécifications de fabrication",
     "Exploiter un planning de réalisation ou de maintenance",
     "Identifier sur un planning l’intervention et les opérations de réalisation",
     "Situer sur le planning la chronologie et la durée des tâches",
     "Identifier les priorités de réalisation",
     "Identifier les ressources matérielles, humaines nécessaires pour exécuter les tâches et activités de réalisation",
     "Déterminer la disponibilité des approvisionnements nécessaires",
     "Assembler les éléments de tout ou partie d’un ensemble mécanique",
     "Préparer les activités d’assemblage",
     "Assembler les éléments",
     "Choisir les moyens de manutention et effectuer la manutention"
    ]
   },
   {
    "code": "RNCP41015BC03",
    "intitule": "Projet de réalisation de produits ou d’un outillage",
    "option": "RMO",
    "competences": [
     "Configurer et régler les postes de travail",
     "Organiser et installer les postes de travail",
     "Installer l’environnement de production et introduire les paramètres nécessaires au bon fonctionnement",
     "Régler les moyens de production",
     "Vérifier et valider les réglages",
     "Mettre en œuvre un moyen de réalisation",
     "Conduire la fabrication dans des environnements de production numérique",
     "Réaliser les opérations de fabrication",
     "Effectuer les retouches nécessaires, vérifier le résultat produit",
     "Exploiter un planning de réalisation ou de maintenance",
     "Identifier sur un planning l’intervention et les opérations de réalisation",
     "Situer sur le planning la chronologie et la durée des tâches",
     "Identifier les priorités de réalisation",
     "Identifier les ressources matérielles, humaines nécessaires pour exécuter les tâches et activités de réalisation",
     "Déterminer la disponibilité des approvisionnements nécessaires",
     "Assembler les éléments de tout ou partie d’un ensemble mécanique",
     "Préparer les activités d’assemblage",
     "Assembler les éléments",
     "Choisir les moyens de manutention et effectuer la manutention",
     "Effectuer les corrections."
    ]
   },
   {
    "code": "RNCP41015BC04",
    "intitule": "Suivi de production et maintenance",
    "option": "RSP",
    "competences": [
     "Formuler et transmettre des informations, communiquer sous forme écrite et orale",
     "Identifier les informations utiles à transmettre",
     "Choisir et utiliser les outils de communication en présentiel ou à distance",
     "Structurer les informations à restituer",
     "Adapter la communication à son interlocuteur",
     "Rédiger un rapport, une note, un compte rendu",
     "Présenter oralement un rapport, une note, un compte rendu",
     "S’impliquer dans un environnement professionnel",
     "Identifier son rôle au sein d’une entreprise, d’un groupe au regard du problème technique à résoudre",
     "Mettre en œuvre des consignes et/ou des protocoles transmis oralement ou par écrit (mode d’organisation, réglages, sécurité…)",
     "Consigner les événements",
     "Travailler en équipe",
     "Accompagner l’activité d’un opérateur ou des membres d’une équipe de production",
     "Contrôler et suivre une production ou un outillage",
     "Choisir les moyens de contrôle",
     "Configurer les moyens de contrôle",
     "Appliquer une procédure de mesurage ou de contrôle",
     "Vérifier la conformité du produit réalisé",
     "Exploiter les résultats du contrôle et décider des actions à entreprendre",
     "Consigner les décisions relatives au suivi de la production ou de la maintenance de l’outillage",
     "Effectuer la maintenance des moyens de production ou de l’outillage",
     "Tenir à jour le dossier de maintenance du moyen de fabrication mis en œuvre",
     "Vérifier l’état de fonctionnement et la conformité des matériels, des équipements et des outillages",
     "Localiser et identifier les défaillances et les anomalies",
     "Effectuer la maintenance des moyens de réalisation en appliquant les procédures",
     "Signaler les dysfonctionnements constatés (moyens de production, système de production, outillages).",
     "Appliquer les procédures relatives à la qualité, la sécurité et au respect de l’environnement",
     "Participer à la mise en œuvre et à l’amélioration continue du plan qualité de l’entreprise en collaboration avec l‘équipe de production",
     "Aménager son poste de travail selon une démarche ergonomique",
     "Appliquer les consignes de sécurité",
     "Gérer les déchets au regard des exigences de la politique environnementale de l’entreprise."
    ]
   },
   {
    "code": "RNCP41015BC05",
    "intitule": "Suivi de production et maintenance",
    "option": "RMO",
    "competences": [
     "Formuler et transmettre des informations, communiquer sous forme écrite et orale",
     "Identifier les informations utiles à transmettre",
     "Choisir et utiliser les outils de communication en présentiel ou à distance",
     "Structurer les informations à restituer",
     "Adapter la communication à son interlocuteur",
     "Rédiger un rapport, une note, un compte rendu",
     "Présenter oralement un rapport, une note, un compte rendu",
     "S’impliquer dans un environnement professionnel",
     "Identifier son rôle au sein d’une entreprise, d’un groupe au regard du problème technique à résoudre",
     "Mettre en œuvre des consignes et/ou des protocoles transmis oralement ou par écrit (mode d’organisation, réglages, sécurité…)",
     "Consigner les événements",
     "Travailler en équipe",
     "Accompagner l’activité d’un opérateur ou des membres d’une équipe de production",
     "Contrôler et suivre une production ou un outillage",
     "Choisir les moyens de contrôle",
     "Configurer les moyens de contrôle",
     "Appliquer une procédure de mesurage ou de contrôle",
     "Vérifier la conformité de l'outillage assemblé",
     "Exploiter les résultats du contrôle et décider des actions à entreprendre",
     "Consigner les décisions relatives au suivi de la production ou de la maintenance de l’outillage",
     "Effectuer la maintenance des moyens de production ou de l’outillage",
     "Tenir à jour le dossier de maintenance du moyen de fabrication mis en œuvre",
     "Vérifier l’état de fonctionnement et la conformité des matériels, des équipements et des outillages",
     "Localiser et identifier les défaillances et les anomalies",
     "Effectuer la maintenance des outillages en appliquant les procédures",
     "Signaler les dysfonctionnements constatés (moyens de production, système de production, outillages)",
     "Appliquer les procédures relatives à la qualité, la sécurité et au respect de l’environnement",
     "Participer à la mise en œuvre et à l’amélioration continue du plan qualité de l’entreprise en collaboration avec l‘équipe de production",
     "Aménager son poste de travail selon une démarche ergonomique",
     "Appliquer les consignes de sécurité",
     "Gérer les déchets au regard des exigences de la politique environnementale de l’entreprise."
    ]
   }
  ],
  "generaux": [
   "Mathématiques",
   "Physique-chimie",
   "Économie - gestion",
   "Prévention - Santé - Environnement",
   "Langue vivante",
   "Français",
   "Histoire-géographie - Enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Éducation physique et sportive"
  ]
 },
 "RNCP38423": {
  "titre": "BAC PRO - Microtechniques",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP38423BC01",
    "intitule": "Assemblage et montage de produits microtechniques",
    "option": "",
    "competences": [
     "Recenser et appliquer les consignes et procédures d’hygiène et de sécurité,",
     "Préparer les moyens de mise en œuvre,",
     "Monter, assembler un produit microtechnique,",
     "Contrôler un produit microtechnique,",
     "Animer et coordonner des activités de groupe."
    ]
   },
   {
    "code": "RNCP38423BC02",
    "intitule": "Maintenance de produits microtechniques",
    "option": "",
    "competences": [
     "Tester et régler un produit microtechnique,",
     "Élaborer un diagnostic",
     "Remettre ou maintenir en état de marche un produit microtechnique."
    ]
   },
   {
    "code": "RNCP38423BC03",
    "intitule": "Fabrications micromécaniques",
    "option": "",
    "competences": [
     "Fabriquer des pièces micromécaniques à l’unité",
     "Communiquer oralement"
    ]
   },
   {
    "code": "RNCP38423BC04",
    "intitule": "Préparation d'une intervention microtechnique",
    "option": "",
    "competences": [
     "Analyser des données,",
     "Préparer une intervention microtechnique",
     "Renseigner des documents et rendre compte par écrit."
    ]
   }
  ],
  "generaux": [
   "Mathématiques",
   "Physique - chimie",
   "Economie - gestion",
   "Langue vivante",
   "Français",
   "Histoire - géographie - enseignement moral et civique",
   "Arts appliqués et cultures artistiques",
   "Education physique et sportive",
   "Prévention - santé - environnement",
   "Langue vivante étrangère ou régionale (facultatif)",
   "Mobilité (facultatif)"
  ]
 },
 "RNCP37391": {
  "titre": "BTS - Cybersécurité, Informatique et réseaux, Électronique - Option A : « Informatique et réseaux », Option B : « Électronique et réseaux »",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37391BC01",
    "intitule": "Etude et conception de réseaux informatiques",
    "option": "A",
    "competences": [
     "Analyser un système informatique",
     "Concevoir un système informatique"
    ]
   },
   {
    "code": "RNCP37391BC02",
    "intitule": "Exploitation et maintenance de réseaux informatiques",
    "option": "A",
    "competences": [
     "Organiser une intervention",
     "Valider un système informatique",
     "Installer un réseau informatique",
     "Maintenir un réseau informatique"
    ]
   },
   {
    "code": "RNCP37391BC03",
    "intitule": "Valorisation de la donnée et cybersécurité",
    "option": "A",
    "competences": [
     "Communiquer en situation professionnelle (français/anglais)",
     "Gérer un projet",
     "Coder",
     "Exploiter un réseau informatique"
    ]
   },
   {
    "code": "RNCP37391BC04",
    "intitule": "Étude et conception de produits électroniques",
    "option": "B",
    "competences": [
     "Analyser une structure matérielle et logicielle",
     "Concevoir une structure matérielle et logicielle"
    ]
   },
   {
    "code": "RNCP37391BC05",
    "intitule": "Mise en œuvre de réseaux informatiques",
    "option": "B",
    "competences": [
     "Organiser une intervention",
     "Valider une structure matérielle et logicielle",
     "Installer un système électronique ou informatique",
     "Exploiter un réseau informatique"
    ]
   },
   {
    "code": "RNCP37391BC06",
    "intitule": "Réalisation et maintenance de produits électroniques",
    "option": "B",
    "competences": [
     "Communiquer en situation professionnelle (français/anglais)",
     "Gérer un projet",
     "Réaliser des maquettes et prototypes",
     "Maintenir un système électronique"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP41007": {
  "titre": "BTS - Electrotechnique",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP41007BC01",
    "intitule": "Concevoir une étude préliminaire",
    "option": "",
    "competences": [
     "Interpréter un besoin client/utilisateur, un CCTP, un cahier des charges",
     "Modéliser le comportement de tout ou partie d’un ouvrage, d’une installation, d’un équipement électrique",
     "Dimensionner les constituants d’un ouvrage, d’une installation, d’un équipement électrique",
     "Proposer l’architecture d’un ouvrage, d’une installation, d’un équipement électrique"
    ]
   },
   {
    "code": "RNCP41007BC02",
    "intitule": "Concevoir une étude détaillée du projet",
    "option": "",
    "competences": [
     "Simuler le comportement de tout ou partie d’un ouvrage, d’une installation, d’un équipement électrique",
     "Choisir les constituants d’un ouvrage, d’une installation, d’un équipement électrique",
     "Réaliser les documents du projet/chantier (plans, schémas, maquette virtuelle, etc.)"
    ]
   },
   {
    "code": "RNCP41007BC03",
    "intitule": "Conduire un projet / un chantier",
    "option": "",
    "competences": [
     "Recenser et prendre en compte les normes, les réglementations applicables au projet/chantier",
     "Gérer les risques et les aléas liés à la réalisation des tâches",
     "Gérer et conduire (y compris avec les documents de : organisation, planification, suivi, pilotage, réception, etc.) le projet/chantier"
    ]
   },
   {
    "code": "RNCP41007BC04",
    "intitule": "Réaliser, mettre en service un projet",
    "option": "",
    "competences": [
     "Communiquer de manière adaptée à l'oral, à l'écrit, y compris en langue anglaise",
     "Réaliser un ouvrage, une installation, un équipement électrique",
     "Configurer et programmer les matériels dans le cadre du projet/chantier",
     "Appliquer un protocole pour mettre en service un ouvrage, une installation, un équipement électrique"
    ]
   },
   {
    "code": "RNCP41007BC05",
    "intitule": "Analyser, diagnostiquer, assurer la maintenance",
    "option": "",
    "competences": [
     "Extraire les informations nécessaires à la réalisation des tâches",
     "Mesurer les grandeurs caractéristiques d’un ouvrage, d’une installation, d’un équipement électrique",
     "Réaliser un diagnostic de performance y compris énergétique, de sécurité, d’un ouvrage, d’une installation, d’un équipement électrique",
     "Réaliser des opérations de maintenance sur un ouvrage, une installation, un équipement électrique"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP37374": {
  "titre": "BTS - Conception des produits industriels",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37374BC01",
    "intitule": "Expression du besoin de conception industrielle et cahier des charges fonctionnel",
    "option": "",
    "competences": [
     "Rechercher une information dans une documentation technique, dans un réseau local ou à distance",
     "Élaborer ou participer à l’élaboration d’un cahier des charges fonctionnel"
    ]
   },
   {
    "code": "RNCP37374BC02",
    "intitule": "Conception industrielle préliminaire",
    "option": "",
    "competences": [
     "Recenser et spécifier des technologies et des moyens de réalisation",
     "Imaginer et proposer des solutions techniques en réponse à un cahier des charges",
     "Dimensionner tout ou partie d’une chaine d’énergie en autonomie et/ou en collaboration avec un spécialiste",
     "Optimiser le choix d’une solution technique en tenant compte des contraintes technico économiques"
    ]
   },
   {
    "code": "RNCP37374BC03",
    "intitule": "Conception industrielle détaillée",
    "option": "",
    "competences": [
     "Concevoir et définir, à l'aide d'un logiciel de CAO et des outils de simulation associés, tout ou partie d'un ensemble",
     "Intégrer l’éco-conception dans la conception d’un produit",
     "Élaborer le dossier de définition d’un produit mécanique (pièces cotées et tolérancées)"
    ]
   },
   {
    "code": "RNCP37374BC04",
    "intitule": "Prototypage dans la conception et la réalisation industrielle",
    "option": "",
    "competences": [
     "Intégrer le prototypage dans la conception du produit",
     "Intégrer le prototypage dans la réalisation d’un produit"
    ]
   },
   {
    "code": "RNCP37374BC05",
    "intitule": "Conduite de projet collaboratif d’optimisation",
    "option": "",
    "competences": [
     "S’impliquer dans un groupe projet et argumenter des choix techniques",
     "Participer à un processus collaboratif de conception et de réalisation de produit"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP37464": {
  "titre": "BTS - Conception des processus de réalisation de produits, option A : production unitaire, option B : production sérielle",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37464BC01",
    "intitule": "Conception préliminaire",
    "option": "",
    "competences": [
     "Interpréter un dossier de conception préliminaire.",
     "Recenser et spécifier des technologies et des moyens de production."
    ]
   },
   {
    "code": "RNCP37464BC02",
    "intitule": "Projet industriel de conception et d’initialisation de processus",
    "option": "",
    "competences": [
     "Rechercher une information dans une documentation technique, en local ou à distance.",
     "Élaborer et/ou participer à l’élaboration d’un cahier des charges fonctionnel.",
     "Concevoir et définir, en collaboration ou en autonomie, tout ou partie d'un ensemble unitaire.",
     "Définir des processus de réalisation.",
     "Définir et mettre en œuvre des essais réels et/ou simulés.",
     "Proposer des améliorations technico-économiques et environnementales du processus de réalisation.",
     "Planifier une réalisation."
    ]
   },
   {
    "code": "RNCP37464BC03",
    "intitule": "Projet collaboratif d’optimisation d’un produit et d’un processus",
    "option": "",
    "competences": [
     "S’impliquer dans un groupe projet et argumenter des choix techniques.",
     "Participer à un processus collaboratif d’optimisation de la conception et de la réalisation d’un produit."
    ]
   },
   {
    "code": "RNCP37464BC04",
    "intitule": "Gestion et suivi de la réalisation d'une production en entreprise",
    "option": "",
    "competences": [
     "S'intégrer dans un environnement professionnel, assurer une veille technologique et capitaliser l’expérience.",
     "Formuler et transmettre des informations, communiquer sous forme écrite et orale y compris en anglais.",
     "Définir et organiser les environnements de travail.",
     "Lancer et suivre une réalisation.",
     "Appliquer un plan qualité, un plan sécurité.",
     "Réaliser, mettre au point et qualifier tout ou partie d'un ensemble unitaire."
    ]
   }
  ],
  "generaux": []
 },
 "RNCP38367": {
  "titre": "BTS - Maintenance des véhicules (Option A : Voitures particulières, Option B : Véhicules de transport routier, Option C : Motocycles)",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP38367BC01",
    "intitule": "Analyse des systèmes et contrôle des performances",
    "option": "",
    "competences": [
     "Décrire le fonctionnement d'un système",
     "Identifier les grandeurs d'entrée/ sortie d'un système",
     "Caractériser les performances d'un système"
    ]
   },
   {
    "code": "RNCP38367BC02",
    "intitule": "Gestion d'une intervention - Relation client",
    "option": "",
    "competences": [
     "Proposer des solutions économiquement adaptées",
     "Appliquer les mesures de prévention adaptées",
     "Accompagner techniquement les collaborateurs",
     "Appliquer la relation service client (y compris en anglais)"
    ]
   },
   {
    "code": "RNCP38367BC03",
    "intitule": "Intervention sur véhicule",
    "option": "",
    "competences": [
     "Valider le dysfonctionnement",
     "Emettre les hypothèses liées aux symptômes",
     "Déterminer les éléments défaillants",
     "Organiser l'intervention",
     "Remettre en conformité, régler, paramétrer",
     "Valider la qualité de l'intervention"
    ]
   },
   {
    "code": "RNCP38367BC04",
    "intitule": "Connaissances de l’entreprise",
    "option": "",
    "competences": [
     "Gérer les équipements nécessaires aux interventions",
     "Planifier et gérer les interventions",
     "Échanger avec des professionnels en interne et en externe"
    ]
   },
   {
    "code": "RNCP38367BC05",
    "intitule": "Mesures et analyse",
    "option": "",
    "competences": [
     "Effectuer des mesures, des essais",
     "Collecter les données techniques"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP41864": {
  "titre": "BTS - Maintenance des véhicules – options : véhicules légers, véhicules de transport routier et motocycles",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP41864BC01",
    "intitule": "Réaliser le diagnostic des systèmes des véhicules",
    "option": "",
    "competences": [
     "Constater le dysfonctionnement",
     "Hiérarchiser les hypothèses",
     "Appliquer un protocole d'essais et mesures",
     "Proposer des solutions correctives adaptées aux contraintes économiques, environnementales et réglementaires"
    ]
   },
   {
    "code": "RNCP41864BC02",
    "intitule": "Assurer la relation clientèle et la commercialisation des produits et services de l'après-vente des véhicules",
    "option": "",
    "competences": [
     "Appliquer les principes de la relation client en après-vente",
     "Commercialiser des produits et des services de l’après-vente"
    ]
   },
   {
    "code": "RNCP41864BC03",
    "intitule": "Organiser les activités de maintenance des véhicules",
    "option": "",
    "competences": [
     "Assurer la planification et le suivi de l’intervention",
     "Suivre les indicateurs de performance de l’après-vente",
     "Contribuer au développement professionnel de l’équipe"
    ]
   },
   {
    "code": "RNCP41864BC04",
    "intitule": "Réaliser la maintenance corrective des véhicules",
    "option": "",
    "competences": [
     "Préparer une intervention corrective",
     "Remettre en conformité les systèmes"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP37263": {
  "titre": "Technicien services de l'électroménager connecté",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37263BC01",
    "intitule": "Assurer la relation clientèle dans le cadre d'une intervention de service après-vente sur un produit électroménager afin de satisfaire les attentes du client",
    "option": "",
    "competences": [
     "BC 1.1 Prendre en charge un client dans le cadre d'une intervention de service après-vente, afin de l'orienter vers la solution adaptée et en tenant compte des spécificités de l’intervention en présentiel ou à distance",
     "BC 1.2 Réaliser un devis et une facture dans le cadre d'un service après-vente, en appliquant les mentions légales afin de présenter le coût de l'intervention au client"
    ]
   },
   {
    "code": "RNCP37263BC02",
    "intitule": "Installer, configurer et mettre en service un produit électroménager",
    "option": "",
    "competences": [
     "BC 2.1 Mettre en service un produit électroménager, en procédant à son installation et à sa configuration pour en garantir le fonctionnement optimal",
     "BC 2.2 Conseiller le client, en présentiel ou à distance, en l'accompagnant dans l’utilisation d’un produit électroménager afin d’en assurer le meilleur usage"
    ]
   },
   {
    "code": "RNCP37263BC03",
    "intitule": "Assurer la maintenance et/ou le reconditionnement d’un produit électroménager",
    "option": "",
    "competences": [
     "BC 3.1 Etablir un pré-diagnostic d'un produit électroménager en utilisant les méthodes d’investigation adaptées afin de déterminer l’origine du dysfonctionnement",
     "BC 3.2 Diagnostiquer et effectuer la réparation d'un produit électroménager afin d’en rétablir le fonctionnement optimal en respectant les normes définies par le constructeur",
     "BC 3.3 Reconditionner un produit Electroménager destiné au marché du réemploi en respectant les normes définies par le constructeur et la règlementation en vigueur"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP39617": {
  "titre": "Technicien spécialisé en intégration des procédés",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP39617BC01",
    "intitule": "Recherche de solutions d’amélioration des moyens de production",
    "option": "",
    "competences": [
     "Analyser un procédé de production et identifier des pistes d’amélioration,",
     "Définir les spécifications détaillées d’un avant-projet d’élaboration ou d’optimisation d’un processus de fabrication,",
     "Contribuer à la veille technologique et réglementaire nécessaire à l’activité,",
     "Présenter des solutions techniques adaptées et pertinentes."
    ]
   },
   {
    "code": "RNCP39617BC02",
    "intitule": "Pilotage de la mise en œuvre de la solution technique d’intégration des procédés",
    "option": "",
    "competences": [
     "Piloter le déploiement de la solution technique retenue,",
     "Mesurer l’efficacité de la solution technique retenue,",
     "Communiquer avec les différents interlocuteurs."
    ]
   }
  ],
  "generaux": []
 },
 "RNCP37442": {
  "titre": "TP - Electricien d'équipement du bâtiment",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP37442BC01",
    "intitule": "Installer les réseaux d'énergie et les équipements en courants forts dans les bâtiments",
    "option": "",
    "competences": [
     "Installer des réseaux d'énergie et des équipements électriques en courants forts dans les parties privatives des bâtiments d'habitation",
     "Procéder aux autocontrôles et à la mise en service de l'installation électrique dans les parties privatives des bâtiments d'habitation",
     "Installer des réseaux d'énergie et des équipements électriques en courants forts dans les parties communes des bâtiments d'habitation",
     "Procéder à la mise en sécurité de l'installation électrique des bâtiments d'habitation existants",
     "Installer des réseaux d'énergie et des équipements électriques en courants forts dans les bâtiments à usage autre que d'habitation"
    ]
   },
   {
    "code": "RNCP37442BC02",
    "intitule": "Installer les réseaux de communication, les équipements en courants faibles et solutions d'efficacité énergétique dans les bâtiments",
    "option": "",
    "competences": [
     "Installer des réseaux de communication dans un bâtiment à usage d'habitation et autres",
     "Installer des équipements de sûreté et de sécurité dans un bâtiment à usage d'habitation et autres",
     "Installer des équipements d'automatisme et de confort dans un bâtiment à usage d'habitation et autres",
     "Installer des équipements et solutions d'efficacité énergétique dans un bâtiment à usage d'habitation et autres"
    ]
   }
  ],
  "generaux": []
 },
 "RNCP38101": {
  "titre": "TP - Mécanicien de maintenance automobile",
  "actif": true,
  "blocs": [
   {
    "code": "RNCP38101BC01",
    "intitule": "Effectuer l'entretien périodique, remplacer les pneus et les éléments du système de freinage des véhicules automobiles",
    "option": "",
    "competences": [
     "Effectuer l'entretien périodique des véhicules automobiles.",
     "Remplacer les pneus et les éléments du système de freinage des véhicules automobiles.",
     "Intervenir sur un circuit de climatisation automobile fonctionnant au R134a, R1234yf ou R744."
    ]
   },
   {
    "code": "RNCP38101BC02",
    "intitule": "Remplacer les éléments de liaison au sol, de direction, de transmission, de signalisation et de visibilité des véhicules automobiles et poser des accessoires connectables",
    "option": "",
    "competences": [
     "Remplacer et régler les éléments de direction et de liaison au sol des véhicules automobiles.",
     "Remettre en état les assemblages mécaniques endommagés des véhicules automobiles.",
     "Remplacer les organes de transmission des véhicules automobiles.",
     "Remplacer les éléments de signalisation et de visibilité, poser des accessoires connectables des véhicules automobiles."
    ]
   },
   {
    "code": "RNCP38101BC03",
    "intitule": "Remplacer la distribution et la motorisation thermique des véhicules automobiles",
    "option": "",
    "competences": [
     "Intervenir sur un circuit de climatisation automobile fonctionnant au R134a, R1234yf ou R744.",
     "Remplacer le moteur thermique et les équipements périphériques des véhicules automobiles.",
     "Remplacer la distribution du moteur thermique des véhicules automobiles."
    ]
   }
  ],
  "generaux": []
 }
};
/* [ligne de planning, fiche RNCP, option, remarque] */
var EUC_DEV630_LIGNES_ = [["1CAP", "RNCP37601", "", ""], ["TCAP", "RNCP37601", "", ""], ["CAP_PEINTRE", "RNCP37540", "", ""], ["2BP_CPA", "RNCP37913", "", ""], ["1BP_CPA", "RNCP37913", "", ""], ["TBP_CPA", "RNCP37913", "", ""], ["2BP_MVA", "RNCP40996", "", "Nouveau bac pro (première session 2028)"], ["1BP_MVA", "RNCP40996", "", "Nouveau bac pro (première session 2028)"], ["TBP_MVA", "RNCP40009", "", "Ancien bac pro : dernière session 2027"], ["1BP_CIEL", "RNCP37489", "", ""], ["TBP_CIEL", "RNCP37489", "", ""], ["1BP_MELEC", "RNCP38878", "", ""], ["TBP_MELEC", "RNCP38878", "", ""], ["1MELEC_G", "RNCP38878", "", ""], ["TMELEC_G", "RNCP38878", "", ""], ["2BP_MP3D", "RNCP36191", "", ""], ["1BP_MP3D", "RNCP36191", "", ""], ["TBP_MP3D", "RNCP36191", "", ""], ["1BP_RMO", "RNCP41015", "RMO", ""], ["TBP_RMO", "RNCP41015", "RMO", ""], ["1BP_RSP", "RNCP41015", "RSP", ""], ["TBP_RSP", "RNCP41015", "RSP", ""], ["1BP_MT", "RNCP38423", "", "À confirmer : MT = Microtechniques ?"], ["TBP_MT", "RNCP38423", "", "À confirmer : MT = Microtechniques ?"], ["1BTS_CIEL", "RNCP37391", "", "Option A ou B selon la section"], ["1BTS_ELEC", "RNCP41007", "", ""], ["1BTS_ELEC_ALT", "RNCP41007", "", ""], ["2BTS_ELEC_ALT", "RNCP41007", "", ""], ["1BTS_CPI", "RNCP37374", "", ""], ["MIX_1BTS_CPI", "RNCP37374", "", ""], ["MIX_2BTS_CPI", "RNCP37374", "", ""], ["1BTS_CPRP", "RNCP37464", "", ""], ["MIX_1BTS_CPRP", "RNCP37464", "", ""], ["MIX_2BTS_CPRP", "RNCP37464", "", ""], ["1BTS_MV", "RNCP41864", "", "Nouveau BTS (première session 2028)"], ["MIX_1BTS_MV", "RNCP41864", "", "Nouveau BTS (première session 2028)"], ["2BTS_MV", "RNCP38367", "", "Ancien BTS"], ["MIX_2BTS_MV", "RNCP38367", "", "Ancien BTS"], ["TSEC", "RNCP37263", "", ""], ["BACHELOR_IP", "RNCP39617", "", ""], ["TPMMA", "RNCP38101", "", "À confirmer : TPMMA = TP Mécanicien de maintenance automobile ?"], ["TPEEB_19", "RNCP37442", "", ""], ["TPEEB_20", "RNCP37442", "", ""]];

function EUC_DEV630_t_(v) { return v == null ? '' : String(v).trim(); }
/* Référentiel d'une ligne de planning (calcul pur) : fiche RNCP, option, blocs professionnels de l'option (les blocs
 * communs aux options sont toujours gardés), intitulés des blocs généraux. null si la ligne n'a pas de référentiel. */
function EUC_DEV630_referentielLigne_(code) {
  var x = EUC_DEV630_LIGNES_.filter(function(l) { return l[0] === EUC_DEV630_t_(code); })[0]; if (!x) return null;
  var f = EUC_DEV630_REFERENTIELS_[x[1]]; if (!f) return null;
  return { ligne: x[0], rncp: x[1], option: x[2], remarque: x[3], titre: f.titre, actif: f.actif, generaux: f.generaux.slice(),
    blocs: f.blocs.filter(function(b) { return !x[2] || !b.option || b.option === x[2]; }).map(function(b) { return { code: b.code, intitule: b.intitule, option: b.option, competences: b.competences.slice() }; }) };
}
/* Référentiel d'une ligne réelle (calcul pur) : par son code ; sinon par sa classe PFMP (ligne créée à la main, même
 * classe qu'une ligne connue) ; pour une mixité, d'après les filières couvertes (couverture des mixités du planning),
 * à condition qu'elles mènent toutes au même diplôme. Rend null, avec la raison dans « pourquoi » si on la donne. */
function EUC_DEV630_referentielPour_(l, lignes, pourquoi) {
  if (!l) return null;
  var r = EUC_DEV630_referentielLigne_(l.code); if (r) return r;
  var n = function(v) { return EUC_DEV630_t_(v).toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  var defaut = typeof EUC_DEV610_LIGNES_DEFAUT_ !== 'undefined' ? EUC_DEV610_LIGNES_DEFAUT_ : [];
  var cp = n(l.classePfmp), pareil = cp ? defaut.filter(function(d) { return n(d[5]) === cp && EUC_DEV630_referentielLigne_(d[0]); })[0] : null;
  if (pareil) { r = EUC_DEV630_referentielLigne_(pareil[0]); r.ligne = l.code; r.remarque = 'd’après la classe PFMP ' + l.classePfmp; return r; }
  if (l.calendrier === 'MIXITE' && typeof EUC_DEV610_couvertureMixites_ === 'function') {
    var cov = (EUC_DEV610_couvertureMixites_(lignes || []).parLigne || {})[l.code], refs = {};
    ((cov && cov.sections) || []).forEach(function(c) { var x = EUC_DEV630_referentielPour_((lignes || []).filter(function(y) { return y.code === c; })[0] || { code: c }, [], null); if (x) refs[x.rncp + '|' + x.option] = x; });
    var k = Object.keys(refs);
    if (k.length === 1) { r = refs[k[0]]; r.ligne = l.code; r.remarque = 'd’après les filières couvertes (' + cov.sections.join(', ') + ')'; return r; }
    if (pourquoi) pourquoi.raison = k.length ? 'mixité couvrant plusieurs diplômes (' + cov.sections.join(', ') + ') : créez une mixité par filière ou cochez une seule filière' : 'mixité sans filière rattachée à un référentiel';
  }
  return null;
}
/* Diplômes d'une mixité qui couvre plusieurs filières (calcul pur) : même alternance pour toutes, objectifs propres à
 * chaque diplôme. Une entrée par fiche RNCP (et option), avec les filières (lignes scolaires) qui y mènent. */
function EUC_DEV630_diplomesMixite_(l, lignes) {
  if (!l || l.calendrier !== 'MIXITE' || typeof EUC_DEV610_couvertureMixites_ !== 'function') return [];
  var cov = (EUC_DEV610_couvertureMixites_(lignes || []).parLigne || {})[l.code], par = {}, ordre = [];
  ((cov && cov.sections) || []).forEach(function(c) {
    var x = EUC_DEV630_referentielPour_((lignes || []).filter(function(y) { return y.code === c; })[0] || { code: c }, [], null); if (!x) return;
    var k = x.rncp + '|' + x.option; if (!par[k]) { par[k] = { rncp: x.rncp, option: x.option, titre: x.titre, sections: [], blocs: x.blocs.map(function(b) { return { code: b.code, intitule: b.intitule }; }) }; ordre.push(k); }
    par[k].sections.push(c);
  });
  return ordre.map(function(k) { return par[k]; });
}
/* Blocs de chaque ligne du planning (code, titre, blocs ; plusieurs diplômes pour une mixité multi-filières ; raison si
 * aucun référentiel). */
function EUC_DEV630_referentielsLignes_(lignes) {
  var out = {};
  (lignes || []).forEach(function(l) { var pq = {}, r = EUC_DEV630_referentielPour_(l, lignes, pq), multi = r ? [] : EUC_DEV630_diplomesMixite_(l, lignes);
    out[l.code] = r ? { titre: r.titre, rncp: r.rncp, remarque: r.remarque || '', blocs: r.blocs.map(function(b) { return { code: b.code, intitule: b.intitule }; }) }
      : multi.length > 1 ? { titre: 'Plusieurs diplômes', multi: multi, blocs: [].concat.apply([], multi.map(function(m) { return m.blocs; })) } : { raison: pq.raison || '' }; });
  return out;
}
/* Page de consultation : fiches relevées, blocs et compétences, lignes de planning rattachées. */
function EUC_DEV630_afficher(e) {
  EUC_SUIVI2_exigerAdmin_();
  var t = HtmlService.createTemplateFromFile('Referentiels_DEV630');
  t.adminBase = typeof EUC_RELEASE_serviceBase_ === 'function' ? EUC_RELEASE_serviceBase_() : '';
  t.donnees = JSON.stringify({ releve: EUC_DEV630_RELEVE_, referentiels: EUC_DEV630_REFERENTIELS_, lignes: EUC_DEV630_LIGNES_ }).replace(/</g, '\\u003c');
  return t.evaluate().setTitle('Référentiels des diplômes').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
