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


def lire(chemin):
    texte = chemin.read_bytes().decode(ENCODAGE, errors="replace")
    lignes = list(csv.reader(io.StringIO(texte), delimiter=";"))
    if not lignes:
        return [], []
    entetes = [h.strip() for h in lignes[0]]
    return entetes, [l for l in lignes[1:] if any(c.strip() for c in l)]


def ecrire(chemin, entetes, lignes):
    tmp = chemin.with_suffix(".tmp")
    with open(tmp, "w", encoding=ENCODAGE, errors="replace", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\r\n")
        w.writerow(entetes)
        w.writerows(lignes)
    os.replace(tmp, chemin)


def fusionner(dossier, sortie):
    fichiers = sorted(dossier.glob(MOTIF), key=lambda p: p.stat().st_mtime)
    if not fichiers:
        return False
    entetes, lignes = (lire(sortie) if sortie.exists() else ([], []))
    nouvelles, groupes_recus, acceptes = [], set(), []
    for f in fichiers:
        e, l = lire(f)
        if not e:
            acceptes.append(f)
            continue
        if entetes and e != entetes:
            print(f"  ! {f.name} : colonnes différentes, ignoré (laissé dans le dossier)")
            continue
        acceptes.append(f)
        entetes = entetes or e
        ig = entetes.index("NOM_GROUPE") if "NOM_GROUPE" in entetes else -1
        for ligne in l:
            if ig >= 0 and ig < len(ligne):
                groupes_recus.add(ligne[ig].strip())
        nouvelles.extend(l)
    ig = entetes.index("NOM_GROUPE") if "NOM_GROUPE" in entetes else -1
    # Un groupe reçu remplace entièrement son ancienne version.
    gardees = [l for l in lignes if ig < 0 or ig >= len(l) or l[ig].strip() not in groupes_recus]
    vus, total = set(), []
    for l in gardees + nouvelles:
        cle = "\x1f".join(c.strip() for c in l)
        if cle in vus:
            continue
        vus.add(cle)
        total.append(l)
    sortie.parent.mkdir(parents=True, exist_ok=True)
    ecrire(sortie, entetes, total)
    fichiers = acceptes
    for f in fichiers:
        f.unlink()
    nb_groupes = len({l[ig].strip() for l in total if 0 <= ig < len(l)}) if ig >= 0 else 0
    print(f"{datetime.now():%H:%M:%S}  {len(fichiers)} export(s) fusionné(s) et effacé(s) — "
          f"{sortie.name} : {len(total)} apprenant(s), {nb_groupes} groupe(s)")
    return True


def stable(dossier, calme):
    """Vrai quand des exports sont là et qu'aucun n'a bougé depuis « calme » secondes."""
    fichiers = list(dossier.glob(MOTIF)) + list(dossier.glob("*.crdownload"))
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
