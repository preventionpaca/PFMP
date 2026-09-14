#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

DEPLOYMENT_ID="AKfycby6ykCxTxhUjq8FeKoBzgEMj6xzdrjXnBFgOt-1pAw1GfkaAigWMH7jj0EIg_BWpEkmxg"
LABEL="PFMP v1.0.0-dev.147-fix2"
PAGE="apps-script/Admin_Conventions_PFMP.html"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="backup_DEV147_avant_FIX2_${STAMP}"
mkdir -p "$BACKUP"
cp "$PAGE" "$BACKUP/"

echo "CmZyb20gcGF0aGxpYiBpbXBvcnQgUGF0aAoKcD1QYXRoKCJhcHBzLXNjcmlwdC9BZG1pbl9Db252ZW50aW9uc19QRk1QLmh0bWwiKQpzPXAucmVhZF90ZXh0KGVuY29kaW5nPSJ1dGYtOCIpCgpvbGQgPSAiIiIgIG9wZW5CdG4ub25jbGljaz1mdW5jdGlvbigpewogICAgaWYoIXNlbGVjdGVkKXJldHVybjsKICAgIG9wZW5CdG4uZGlzYWJsZWQ9dHJ1ZTsKCiAgICBnb29nbGUuc2NyaXB0LnJ1bgogICAgICAud2l0aFN1Y2Nlc3NIYW5kbGVyKGZ1bmN0aW9uKHYpe29wZW5CdG4uZGlzYWJsZWQ9ZmFsc2U7cmVuZGVyKHYpfSkKICAgICAgLndpdGhGYWlsdXJlSGFuZGxlcihmdW5jdGlvbihlKXtvcGVuQnRuLmRpc2FibGVkPWZhbHNlO2FsZXJ0KCdFcnJldXIgOiAnKyhlJiZlLm1lc3NhZ2V8fGUpKX0pCiAgICAgIC5FVUNfQURNSU5fV09SS0ZMT1dfdnVlVjE0NihzZWxlY3RlZC5pZCk7CiAgfTsiIiIKCm5ldyA9ICIiIiAgb3BlbkJ0bi5vbmNsaWNrPWZ1bmN0aW9uKCl7CiAgICBpZighc2VsZWN0ZWQpcmV0dXJuOwoKICAgIGNvbnN0IG9sZFRleHQ9b3BlbkJ0bi5pbm5lckhUTUw7CiAgICBvcGVuQnRuLmRpc2FibGVkPXRydWU7CiAgICBvcGVuQnRuLmNsYXNzTGlzdC5hZGQoJ2J1c3knKTsKICAgIG9wZW5CdG4uaW5uZXJIVE1MPSc8c3BhbiBjbGFzcz0ic3Bpbm5lciI+PC9zcGFuPk91dmVydHVyZSBlbiBjb3Vycyc7CgogICAgZ29vZ2xlLnNjcmlwdC5ydW4KICAgICAgLndpdGhTdWNjZXNzSGFuZGxlcihmdW5jdGlvbih2KXsKICAgICAgICBvcGVuQnRuLmRpc2FibGVkPWZhbHNlOwogICAgICAgIG9wZW5CdG4uY2xhc3NMaXN0LnJlbW92ZSgnYnVzeScpOwogICAgICAgIG9wZW5CdG4uaW5uZXJIVE1MPW9sZFRleHQ7CiAgICAgICAgcmVuZGVyKHYpOwogICAgICB9KQogICAgICAud2l0aEZhaWx1cmVIYW5kbGVyKGZ1bmN0aW9uKGUpewogICAgICAgIG9wZW5CdG4uZGlzYWJsZWQ9ZmFsc2U7CiAgICAgICAgb3BlbkJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdidXN5Jyk7CiAgICAgICAgb3BlbkJ0bi5pbm5lckhUTUw9b2xkVGV4dDsKICAgICAgICBhbGVydCgnRXJyZXVyIDogJysoZSYmZS5tZXNzYWdlfHxlKSk7CiAgICAgIH0pCiAgICAgIC5FVUNfQURNSU5fV09SS0ZMT1dfdnVlVjE0NihzZWxlY3RlZC5pZCk7CiAgfTsiIiIKCmlmIG9sZCBub3QgaW4gczoKICAgIHJhaXNlIFN5c3RlbUV4aXQoIkVSUkVVUiA6IGJsb2MgYm91dG9uIE91dnJpciBsZSBkb3NzaWVyIGludHJvdXZhYmxlLiIpCgpzPXMucmVwbGFjZShvbGQsbmV3LDEpCnAud3JpdGVfdGV4dChzLGVuY29kaW5nPSJ1dGYtOCIpCnByaW50KCJPSyA6IHNwaW5uZXIgZCdvdXZlcnR1cmUgZHUgZG9zc2llciBham91dMOpLiIpCg==" | base64 -d > /tmp/dev147_fix2_patch.py
python3 /tmp/dev147_fix2_patch.py

echo "=== CONTROLES DEV.147 FIX2 ==="
grep -q "Ouverture en cours" "$PAGE"
grep -q "spinner" "$PAGE"

python3 - <<'PY'
from pathlib import Path
import re
s=Path("apps-script/Admin_Conventions_PFMP.html").read_text(encoding="utf-8")
scripts=re.findall(r"<script>(.*?)</script>",s,re.S)
js="\n".join(scripts)
js=re.sub(r"<\?!=.*?\?>","{}",js)
Path("/tmp/Admin_Conventions_PFMP_DEV147_FIX2.js").write_text(js,encoding="utf-8")
PY

node --check /tmp/Admin_Conventions_PFMP_DEV147_FIX2.js

echo "OK : JavaScript client valide."
echo "OK : spinner d'ouverture présent."

echo "=== PUSH ==="
clasp push -f

echo "=== VERSION ==="
clasp version "$LABEL"

echo "=== DEPLOIEMENT PRINCIPAL ==="
clasp deploy -i "$DEPLOYMENT_ID" -d "$LABEL"

echo "============================================================"
echo " DEV.147 FIX2 DEPLOYEE AVEC SUCCES"
echo "============================================================"
echo "✓ bouton Ouvrir le dossier avec spinner"
echo "✓ libellé Ouverture en cours"
echo "✓ bouton bloqué pendant le chargement"
echo "✓ restauration du bouton après succès ou erreur"
echo "✓ push + version + déploiement principal"
echo "============================================================"
