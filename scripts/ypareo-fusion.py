#!/usr/bin/env python3
"""Fusion automatique des exports Yparéo (un fichier par groupe).

Surveille un dossier (par défaut ~/Téléchargements). Dès qu'une série de
fichiers « exportGroupe*.csv » est arrivée et que plus rien n'arrive pendant
quelques secondes, le programme :
  1. les ajoute au fichier unique Ypareo/YPAREO_APPRENTIS.csv ; un groupe déjà
     présent est remplacé par sa version la plus récente (colonne NOM_GROUPE) ;
  2. retire les lignes strictement identiques ;
  3. efface les exports fusionnés.
Le fichier unique garde l'encodage et le séparateur de Yparéo : la page
« Importer les apprentis Yparéo » le lit tel quel.

Usage :
  python3 scripts/ypareo-fusion.py            surveille en continu (Ctrl+C pour arrêter)
  python3 scripts/ypareo-fusion.py --une-fois fusionne ce qui est là, puis s'arrête
  python3 scripts/ypareo-fusion.py --vider    repart d'un fichier unique vide
Options : --dossier CHEMIN (dossier surveillé), --calme SECONDES (défaut 6).
"""
import argparse
import csv
import io
import os
import sys
import time
from datetime import datetime
from pathlib import Path

ENCODAGE = "cp1252"
MOTIF = "exportGroupe*.csv"


OBLIGATOIRES = ("NOM_APPRENANT", "PRENOM_APPRENANT", "NOM_GROUPE")
REFUSES = {}  # fichier -> date de modification : refusé une fois, pas répété en boucle


def propre(h):
    return h.replace("\ufeff", "").replace("ï»¿", "").strip().strip('"').strip()


def lire(chemin):
    """(en-têtes, lignes en dictionnaires) — en-têtes nettoyés (BOM, guillemets)."""
    texte = chemin.read_bytes().decode(ENCODAGE, errors="replace")
    lignes = list(csv.reader(io.StringIO(texte), delimiter=";"))
    if not lignes:
        return [], []
    entetes = [propre(h) for h in lignes[0]]
    return entetes, [dict(zip(entetes, l)) for l in lignes[1:] if any(c.strip() for c in l)]


def valide(entetes):
    """Un vrai export de groupe commence par NOM_APPRENANT et contient les colonnes clés."""
    return bool(entetes) and entetes[0] == "NOM_APPRENANT" and all(h in entetes for h in OBLIGATOIRES)


def ecrire(chemin, entetes, lignes):
    tmp = chemin.with_suffix(".tmp")
    with open(tmp, "w", encoding=ENCODAGE, errors="replace", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\r\n")
        w.writerow(entetes)
        w.writerows([[l.get(h, "") for h in entetes] for l in lignes])
    os.replace(tmp, chemin)


def fusionner(dossier, sortie):
    fichiers = [f for f in sorted(dossier.glob(MOTIF), key=lambda p: p.stat().st_mtime)
                if REFUSES.get(f.name) != f.stat().st_mtime]
    if not fichiers:
        return False
    entetes, lignes = (lire(sortie) if sortie.exists() else ([], []))
    if entetes and not valide(entetes):
        print(f"  ! {sortie.name} avait des en-têtes invalides : il est reconstruit.")
        entetes, lignes = [], []
    nouvelles, groupes_recus, acceptes = [], set(), []
    for f in fichiers:
        e, l = lire(f)
        if not valide(e):
            REFUSES[f.name] = f.stat().st_mtime
            print(f"  ! {f.name} : ce n'est pas un export de groupe Yparéo, ignoré (laissé dans le dossier)")
            continue
        acceptes.append(f)
        for h in e:
            if h not in entetes:
                entetes.append(h)
        groupes_recus.update(x.get("NOM_GROUPE", "").strip() for x in l)
        nouvelles.extend(l)
    if not acceptes:
        return False
    # Un groupe reçu remplace entièrement son ancienne version.
    gardees = [l for l in lignes if l.get("NOM_GROUPE", "").strip() not in groupes_recus]
    vus, total = set(), []
    for l in gardees + nouvelles:
        cle = "\x1f".join(str(l.get(h, "")).strip() for h in entetes)
        if cle in vus:
            continue
        vus.add(cle)
        total.append(l)
    sortie.parent.mkdir(parents=True, exist_ok=True)
    ecrire(sortie, entetes, total)
    for f in acceptes:
        f.unlink()
    nb_groupes = len({l.get("NOM_GROUPE", "").strip() for l in total})
    print(f"{datetime.now():%H:%M:%S}  {len(acceptes)} export(s) fusionné(s) et effacé(s) — "
          f"{sortie.name} : {len(total)} apprenant(s), {nb_groupes} groupe(s)")
    return True


def stable(dossier, calme):
    """Vrai quand des exports sont là et qu'aucun n'a bougé depuis « calme » secondes."""
    fichiers = [f for f in dossier.glob(MOTIF) if REFUSES.get(f.name) != f.stat().st_mtime] + list(dossier.glob("*.crdownload"))
    if not any(f.match(MOTIF) for f in fichiers):
        return False
    derniere = max(f.stat().st_mtime for f in fichiers)
    return not any(f.suffix == ".crdownload" for f in fichiers) and time.time() - derniere >= calme


def main():
    p = argparse.ArgumentParser(description="Fusion automatique des exports Yparéo.")
    p.add_argument("--dossier", default=str(Path.home() / "Téléchargements"))
    p.add_argument("--calme", type=float, default=6)
    p.add_argument("--une-fois", action="store_true")
    p.add_argument("--vider", action="store_true")
    a = p.parse_args()
    dossier = Path(a.dossier).expanduser()
    sortie = dossier / "Ypareo" / "YPAREO_APPRENTIS.csv"
    if a.vider:
        if sortie.exists():
            sortie.unlink()
        print("Fichier unique remis à zéro.")
        return
    if a.une_fois:
        if not fusionner(dossier, sortie):
            print("Aucun export « exportGroupe*.csv » à fusionner.")
        return
    print(f"Surveillance de {dossier} — fichier unique : {sortie}\nCtrl+C pour arrêter.")
    try:
        while True:
            if stable(dossier, a.calme):
                fusionner(dossier, sortie)
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nArrêt.")


if __name__ == "__main__":
    sys.exit(main())
