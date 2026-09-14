#!/usr/bin/env bash
set -u

PROJECT="$HOME/PFMP"
DOWNLOADS="$HOME/Téléchargements"
ARCHIVE="$PROJECT/_scripts_recus"

# Charger l'environnement utilisateur / NVM / clasp
[ -f "$HOME/.profile" ] && . "$HOME/.profile"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

mkdir -p "$ARCHIVE"

# Choix du script :
# 1) uniquement les .sh encore présents dans Téléchargements
# 2) le plus récemment MODIFIÉ
# 3) après exécution, le script source est déplacé hors de Téléchargements,
#    donc il ne peut pas être repris au lancement suivant.
SOURCE="$(find "$DOWNLOADS" -maxdepth 1 -type f -name '*.sh' -printf '%T@|%p\n' 2>/dev/null \
  | sort -t'|' -k1,1nr \
  | head -n 1 \
  | cut -d'|' -f2-)"

if [ -z "${SOURCE:-}" ] || [ ! -f "$SOURCE" ]; then
  echo "============================================================"
  echo " PFMP — AUCUN SCRIPT .sh DANS TELECHARGEMENTS"
  echo "============================================================"
  echo
  echo "Télécharge d'abord le script à exécuter."
  echo
  read -r -p "Appuyez sur Entrée pour fermer..."
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BASENAME="$(basename "$SOURCE")"
COPY="$ARCHIVE/${STAMP}_${BASENAME}"

cp "$SOURCE" "$COPY"
chmod +x "$COPY"

cd "$PROJECT" || exit 1

CLASP_PATH="$(command -v clasp 2>/dev/null || true)"

echo "============================================================"
echo " PFMP — EXÉCUTION DU DERNIER SCRIPT TÉLÉCHARGÉ"
echo "============================================================"
echo "Source : $SOURCE"
echo "Copie  : $COPY"
echo "Projet : $PROJECT"
echo "clasp  : ${CLASP_PATH:-INTROUVABLE}"
echo "============================================================"
echo

if [ -z "$CLASP_PATH" ]; then
  echo "ERREUR : clasp est introuvable."
  STATUS=127
else
  bash "$COPY"
  STATUS=$?
fi

# Retirer TOUJOURS le script traité de Téléchargements.
# Il reste archivé dans _scripts_recus avec horodatage.
if [ -f "$SOURCE" ]; then
  rm -f "$SOURCE"
fi

echo
if [ "$STATUS" -eq 0 ]; then
  echo "============================================================"
  echo " SCRIPT TERMINÉ AVEC SUCCÈS"
  echo " Le script traité a été retiré de Téléchargements."
  echo " Copie conservée dans : $COPY"
  echo "============================================================"
else
  echo "============================================================"
  echo " SCRIPT TERMINÉ AVEC ERREUR — code $STATUS"
  echo " Le script traité a été retiré de Téléchargements pour"
  echo " éviter qu'il soit relancé automatiquement."
  echo " Copie conservée dans : $COPY"
  echo "============================================================"
fi

echo
read -r -p "Appuyez sur Entrée pour fermer..."
exit "$STATUS"
