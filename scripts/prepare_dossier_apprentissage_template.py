#!/usr/bin/env python3
"""Prépare un DOCX balisé comme modèle éditable du dossier d'apprentissage.

Le document fourni par le métier reste la source de mise en page. Le script ne
déplace aucun contenu : il remplace uniquement les balises de pagination du
pied de page par de vrais champs Word PAGE/NUMPAGES et contrôle que toutes les
balises de fusion restent saisies dans un seul run.
"""

from __future__ import annotations

import argparse
import re
from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


TOKEN_RE = re.compile(r"\{\{([A-Z0-9_]+)\}\}")


def iter_paragraphs(document):
    """Parcourt le corps, les tableaux, en-têtes et pieds de page."""

    def tables(items):
        for table in items:
            for row in table.rows:
                for cell in row.cells:
                    yield from cell.paragraphs
                    yield from tables(cell.tables)

    yield from document.paragraphs
    yield from tables(document.tables)
    seen = set()
    for section in document.sections:
        for part in (section.header, section.footer):
            key = str(part.part.partname)
            if key in seen:
                continue
            seen.add(key)
            yield from part.paragraphs
            yield from tables(part.tables)


def field_run(instruction: str, fallback: str):
    """Construit un champ Word mis à jour lors de l'ouverture ou de l'export."""

    run = OxmlElement("w:r")
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instruction_node = OxmlElement("w:instrText")
    instruction_node.set(qn("xml:space"), "preserve")
    instruction_node.text = f" {instruction} "
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = fallback
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run.extend((begin, instruction_node, separate, text, end))
    return run


def replace_page_markers(document) -> int:
    changed = 0
    seen = set()
    for section in document.sections:
        footer = section.footer
        key = str(footer.part.partname)
        if key in seen:
            continue
        seen.add(key)
        for paragraph in footer.paragraphs:
            text = "".join(run.text for run in paragraph.runs)
            if "{{PAGE_COURANTE}}" not in text and "{{NB_PAGES}}" not in text:
                continue
            if "{{DATE_HEURE_IMPRESSION}}" not in text:
                raise RuntimeError("Le pied de page paginé ne contient pas la date d'édition.")
            style = deepcopy(paragraph.runs[0]._r.rPr) if paragraph.runs and paragraph.runs[0]._r.rPr is not None else None
            for child in list(paragraph._p):
                if child.tag != qn("w:pPr"):
                    paragraph._p.remove(child)
            prefix = paragraph.add_run("{{DATE_HEURE_IMPRESSION}}  ·  page ")
            if style is not None:
                prefix._r.insert(0, deepcopy(style))
            page = field_run("PAGE", "1")
            if style is not None:
                page.insert(0, deepcopy(style))
            paragraph._p.append(page)
            slash = paragraph.add_run(" / ")
            if style is not None:
                slash._r.insert(0, deepcopy(style))
            pages = field_run("NUMPAGES", "8")
            if style is not None:
                pages.insert(0, deepcopy(style))
            paragraph._p.append(pages)
            changed += 1
    return changed


def audit(document) -> list[str]:
    tokens = set()
    split = []
    for paragraph in iter_paragraphs(document):
        text = "".join(run.text for run in paragraph.runs)
        tokens.update(TOKEN_RE.findall(text))
        for marker in TOKEN_RE.findall(text):
            literal = "{{" + marker + "}}"
            if not any(literal in run.text for run in paragraph.runs):
                split.append(literal)
    if split:
        raise RuntimeError(
            "Balises coupées en plusieurs styles/runs : " + ", ".join(sorted(set(split)))
        )
    required = {"ELEVE_NOM", "ELEVE_PRENOM", "DATE_HEURE_IMPRESSION"}
    missing = sorted(required - tokens)
    if missing:
        raise RuntimeError("Balises obligatoires absentes : " + ", ".join(missing))
    return sorted(tokens)


def build(source: Path, output: Path) -> list[str]:
    document = Document(source)
    before = audit(document)
    changed = replace_page_markers(document)
    if changed == 0:
        raise RuntimeError("Aucun pied de page avec balises de pagination n'a été trouvé.")
    after = audit(document)
    if set(before) - {"PAGE_COURANTE", "NB_PAGES"} != set(after):
        raise RuntimeError("Les balises métier ont changé pendant la préparation.")
    settings = document.settings._element
    update = settings.find(qn("w:updateFields"))
    if update is None:
        update = OxmlElement("w:updateFields")
        settings.append(update)
    update.set(qn("w:val"), "true")
    output.parent.mkdir(parents=True, exist_ok=True)
    document.save(output)
    return after


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    tokens = build(args.source, args.output)
    print(f"{len(tokens)} balises contrôlées ; modèle écrit dans {args.output}")


if __name__ == "__main__":
    main()
