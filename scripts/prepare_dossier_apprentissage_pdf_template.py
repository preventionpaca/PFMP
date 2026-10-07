#!/usr/bin/env python3
"""Prépare le DOCX maître dont les balises restent lisibles après export PDF."""

from __future__ import annotations

import argparse
import re
import shutil
import tempfile
import zipfile
from pathlib import Path


ALIASES = {
    "ELEVE_PROJET_ENTREPRISE": "EL_PROJET",
    "ELEVE_SPORTIF_HAUT_NIVEAU": "EL_SHN",
    "POSITIONNEMENT_AVIS_APPRENTI": "PAA",
    "POSITIONNEMENT_AVIS_ENTREPRISE": "PAE",
    "POSITIONNEMENT_AVIS_ORGANISME": "PAO",
    "POSITIONNEMENT_COMMENTAIRE_ENTREPRISE": "PCE",
    "POSITIONNEMENT_COMMENTAIRE_ORGANISME": "PCO",
}


def prepare(source: Path, destination: Path) -> None:
    if not source.is_file():
        raise SystemExit(f"Fichier source introuvable : {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pfmp-docx-template-") as tmp:
        root = Path(tmp)
        with zipfile.ZipFile(source) as archive:
            archive.extractall(root)

        replacements = {f"{{{{{old}}}}}": f"{{{{{new}}}}}" for old, new in ALIASES.items()}
        total = {old: 0 for old in replacements}
        for xml_path in sorted((root / "word").glob("*.xml")):
            text = xml_path.read_text(encoding="utf-8")
            changed = text
            for old, new in replacements.items():
                count = changed.count(old)
                if count:
                    total[old] += count
                    changed = changed.replace(old, new)
            if changed != text:
                xml_path.write_text(changed, encoding="utf-8")

        missing = [name for name, count in total.items() if count == 0]
        if missing:
            raise SystemExit("Balises longues absentes du DOCX : " + ", ".join(missing))

        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(root.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(root))

    with zipfile.ZipFile(destination) as archive:
        xml = "\n".join(
            archive.read(name).decode("utf-8", errors="ignore")
            for name in archive.namelist()
            if name.startswith("word/") and name.endswith(".xml")
        )
    for old, alias in ALIASES.items():
        if f"{{{{{old}}}}}" in xml or f"{{{{{alias}}}}}" not in xml:
            raise SystemExit(f"Remplacement non vérifié : {old} -> {alias}")
    tokens = sorted(set(re.findall(r"\{\{([A-Z0-9_]+)\}\}", xml)))
    print(f"DOCX préparé : {destination}")
    print(f"Balises distinctes : {len(tokens)}")
    print("Alias PDF : " + ", ".join(f"{old}->{new}" for old, new in ALIASES.items()))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    prepare(args.source, args.destination)


if __name__ == "__main__":
    main()
