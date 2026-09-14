#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/PFMP" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$HOME/PFMP/AUDIT_PERF_PFMP_${STAMP}.txt"

echo "============================================================" | tee "$OUT"
echo " AUDIT PERFORMANCE PFMP — LECTURE SEULE" | tee -a "$OUT"
echo "============================================================" | tee -a "$OUT"
echo "Projet : $HOME/PFMP" | tee -a "$OUT"
echo "Date   : $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$OUT"
echo "AUCUNE MODIFICATION — AUCUN PUSH — AUCUN DEPLOIEMENT" | tee -a "$OUT"
echo | tee -a "$OUT"

python3 <<'PY' | tee -a "$OUT"
from pathlib import Path
import re, json, collections

ROOT=Path("apps-script")
files=list(ROOT.glob("*"))
code_files=[p for p in files if p.suffix.lower() in {".gs",".js",".html"}]

print("=== 1) VOLUME DU PROJET ===")
print("Fichiers apps-script :", len(code_files))
print("Taille totale        :", sum(p.stat().st_size for p in code_files), "octets")
for ext in [".gs",".js",".html"]:
    xs=[p for p in code_files if p.suffix.lower()==ext]
    print(f"{ext:5s}: {len(xs):3d} fichier(s), {sum(p.stat().st_size for p in xs):9d} octets")
print()

# ------------------------------------------------------------
# Helpers robustes : extraction des fonctions par accolades.
# ------------------------------------------------------------
def extract_functions(text, file):
    out=[]
    pat=re.compile(r"\bfunction\s+([A-Za-z_$][\w$]*)\s*\(")
    for m in pat.finditer(text):
        name=m.group(1)
        brace=text.find("{",m.end())
        if brace<0: continue
        i=brace; depth=0; quote=None; esc=False; line=False; block=False; end=None
        while i<len(text):
            ch=text[i]; nxt=text[i+1] if i+1<len(text) else ""
            if line:
                if ch=="\n": line=False
                i+=1; continue
            if block:
                if ch=="*" and nxt=="/": block=False; i+=2; continue
                i+=1; continue
            if quote:
                if esc: esc=False
                elif ch=="\\": esc=True
                elif ch==quote: quote=None
                i+=1; continue
            if ch=="/" and nxt=="/": line=True; i+=2; continue
            if ch=="/" and nxt=="*": block=True; i+=2; continue
            if ch in ("'",'"','`'): quote=ch; i+=1; continue
            if ch=="{": depth+=1
            elif ch=="}":
                depth-=1
                if depth==0:
                    end=i+1
                    break
            i+=1
        if end:
            line_no=text.count("\n",0,m.start())+1
            out.append((name,text[m.start():end],file,line_no))
    return out

functions={}
file_text={}
for p in code_files:
    try: s=p.read_text(encoding="utf-8",errors="ignore")
    except: continue
    file_text[p]=s
    for name,body,file,line in extract_functions(s,p):
        functions.setdefault(name,[]).append({"body":body,"file":file,"line":line})

print("Fonctions détectées    :", sum(len(v) for v in functions.values()))
dups={k:v for k,v in functions.items() if len(v)>1}
print("Noms dupliqués         :", len(dups))
if dups:
    for k,v in sorted(dups.items())[:20]:
        print("  DUP",k,"=>",", ".join(f"{x['file'].name}:{x['line']}" for x in v))
print()

# ------------------------------------------------------------
# Routes réelles.
# ------------------------------------------------------------
print("=== 2) ROUTES WEBAPP REELLES ===")
router=ROOT/"EDT.js"
route_rows=[]
if router.exists():
    s=router.read_text(encoding="utf-8",errors="ignore")
    for ln,line in enumerate(s.splitlines(),1):
        m=re.search(r"page\s*===\s*['\"]([^'\"]+)['\"].*?return\s+([A-Za-z_$][\w$]*)\s*\(",line)
        if m:
            route_rows.append((m.group(1),m.group(2),ln))
            print(f"{m.group(1):30s} -> {m.group(2)}  (EDT.js:{ln})")
else:
    print("EDT.js introuvable")
print()

# ------------------------------------------------------------
# Analyse globale des appels coûteux.
# ------------------------------------------------------------
patterns={
    "FULL_RECORD_READ": re.compile(r"EUC_IMPORT_lireRecords_\s*\(\s*['\"]([^'\"]+)['\"]"),
    "GRIST_GET": re.compile(r"EUC_ENT_grist\s*\(\s*['\"]get['\"]"),
    "GRIST_POST": re.compile(r"EUC_ENT_grist\s*\(\s*['\"]post['\"]"),
    "GRIST_PATCH": re.compile(r"EUC_ENT_grist\s*\(\s*['\"]patch['\"]"),
    "URLFETCH": re.compile(r"UrlFetchApp\.fetch"),
    "CACHE_GET": re.compile(r"CacheService\.[A-Za-z]+\(\)|getScriptCache\(\)|getUserCache\(\)"),
    "PROPERTIES": re.compile(r"PropertiesService\."),
}

global_counts=collections.Counter()
table_reads=collections.Counter()
locations=collections.defaultdict(list)

for p,s in file_text.items():
    for key,pat in patterns.items():
        n=len(pat.findall(s))
        if n:
            global_counts[key]+=n
            locations[key].append((p.name,n))
    for t in patterns["FULL_RECORD_READ"].findall(s):
        table_reads[t]+=1

print("=== 3) APPELS POTENTIELLEMENT COUTEUX — GLOBAL ===")
for k,v in global_counts.most_common():
    print(f"{k:18s}: {v}")
print()
print("Lectures complètes de tables (EUC_IMPORT_lireRecords_) :")
for table,n in table_reads.most_common():
    print(f"  {n:3d} x {table}")
print()

# ------------------------------------------------------------
# Call graph approximatif.
# ------------------------------------------------------------
call_pat=re.compile(r"\b([A-Za-z_$][\w$]*)\s*\(")
builtins=set("""
if for while switch catch function return typeof Number String Boolean Array Object Math Date JSON
parseInt parseFloat encodeURIComponent decodeURIComponent console setTimeout setInterval
""".split())

def body_for(name):
    xs=functions.get(name,[])
    return xs[0]["body"] if xs else ""

def callees(name):
    b=body_for(name)
    out=[]
    for x in call_pat.findall(b):
        if x==name or x in builtins: continue
        if x in functions and x not in out:
            out.append(x)
    return out

def reachable(seed, max_depth=8):
    seen=set()
    q=[(seed,0)]
    while q:
        name,d=q.pop(0)
        if name in seen or d>max_depth: continue
        seen.add(name)
        for c in callees(name):
            if c not in seen:
                q.append((c,d+1))
    return seen

def metrics(names):
    c=collections.Counter()
    tabs=collections.Counter()
    funcs=[]
    for name in names:
        xs=functions.get(name,[])
        if not xs: continue
        x=xs[0]; b=x["body"]
        funcs.append((name,x["file"].name,x["line"]))
        for key,pat in patterns.items():
            c[key]+=len(pat.findall(b))
        for t in patterns["FULL_RECORD_READ"].findall(b):
            tabs[t]+=1
    return c,tabs,funcs

# Routes ciblées automatiquement
targets=[]
for page,fn,ln in route_rows:
    lp=page.lower()
    if any(k in lp for k in ["admin","suivi-pfmp-classes","suivi-pfmp-classe","convention","generat","pfmp"]):
        targets.append((page,fn))

# Dédupe
seen=set(); targets2=[]
for x in targets:
    if x not in seen:
        seen.add(x); targets2.append(x)

print("=== 4) PROFILS STRUCTURELS PAR ROUTE ===")
for page,fn in targets2:
    r=reachable(fn,8)
    c,tabs,funcs=metrics(r)
    # ne montrer que les routes intéressantes / avec coût
    score=c["FULL_RECORD_READ"]+c["GRIST_GET"]+c["URLFETCH"]+c["GRIST_POST"]+c["GRIST_PATCH"]
    print(f"\n[{page}] -> {fn}")
    print(f"  fonctions atteignables approx. : {len(r)}")
    print(f"  score I/O statique              : {score}")
    print(f"  lectures complètes              : {c['FULL_RECORD_READ']}")
    print(f"  GET Grist                       : {c['GRIST_GET']}")
    print(f"  POST Grist                      : {c['GRIST_POST']}")
    print(f"  PATCH Grist                     : {c['GRIST_PATCH']}")
    print(f"  UrlFetch                        : {c['URLFETCH']}")
    if tabs:
        print("  tables lues intégralement :")
        for t,n in tabs.most_common():
            print(f"    {n:2d} x {t}")
print()

# ------------------------------------------------------------
# Détection de points chauds précis.
# ------------------------------------------------------------
print("=== 5) POINTS CHAUDS PRECIS DETECTES ===")
hot=[]

for name,xs in functions.items():
    x=xs[0]; b=x["body"]
    full=len(patterns["FULL_RECORD_READ"].findall(b))
    gg=len(patterns["GRIST_GET"].findall(b))
    uf=len(patterns["URLFETCH"].findall(b))
    ensure=len(re.findall(r"\bassurer[A-Za-z0-9_$]*\s*\(",b,re.I))
    score=full*4+gg*3+uf*5+ensure*2
    if score>=6:
        hot.append((score,name,x["file"].name,x["line"],full,gg,uf,ensure))

for score,name,file,line,full,gg,uf,ensure in sorted(hot,reverse=True)[:40]:
    print(f"{score:3d} | {name:45s} | {file}:{line} | full={full} get={gg} fetch={uf} assurer={ensure}")
print()

# ------------------------------------------------------------
# Cas connus à surveiller.
# ------------------------------------------------------------
print("=== 6) ANTI-PATTERNS RECHERCHES ===")
checks=[
    ("Schéma vérifié pendant une lecture", r"function\s+EUC_V156_affectations_.*?EUC_V156_assurerTable_\(\)", re.S),
    ("Lecture complète affectations", r"EUC_IMPORT_lireRecords_\(['\"]EUC_AFFECTATIONS_SUIVI_PFMP['\"]\)"),
    ("Lecture complète élèves", r"EUC_IMPORT_lireRecords_\(['\"]EUC_ELEVES_PFMP['\"]\)"),
    ("Lecture complète périodes", r"EUC_IMPORT_lireRecords_\(['\"]Planning_Periodes['\"]\)"),
    ("Lecture complète professeurs", r"EUC_IMPORT_lireRecords_\(['\"]EUC_PROFESSEURS_PFMP['\"]\)"),
]
alltxt="\n".join(file_text.values())
for label,pat,*flags in checks:
    fl=flags[0] if flags else 0
    print(("OUI " if re.search(pat,alltxt,fl) else "NON "),"-",label)
print()

# ------------------------------------------------------------
# Recommandations ordonnées automatiquement.
# ------------------------------------------------------------
print("=== 7) RECOMMANDATIONS PRIORITAIRES ===")
recs=[
("P0","Retirer TOUT `assurerTable_/assurerColonnes_` des chemins de lecture. Ces fonctions doivent être réservées à l'installation/migration."),
("P0","Remplacer les `EUC_IMPORT_lireRecords_(TABLE)` des pages courantes par des lectures ciblées Grist (filter) ou SQL SELECT avec WHERE sur année/classe/période/id."),
("P0","Mettre en cache 5 à 10 min les référentiels quasi-statiques : années, classes, périodes, professeurs, diplômes, paramètres."),
("P0","Pour la liste des classes, servir une synthèse pré-calculée/cachée par année au lieu de recalculer élèves + périodes + conventions à chaque ouverture."),
("P1","Pour le détail d'une classe, ne lire que les 20–30 élèves de la classe, la période active et les affectations de cette classe/période."),
("P1","Passer les gros écrans en rendu 'shell immédiat + google.script.run asynchrone' : HTML en <300 ms, données chargées ensuite sans rechargement complet."),
("P1","Éviter les navigations complètes Apps Script entre liste -> classe -> période ; mettre à jour le contenu en AJAX/google.script.run quand possible."),
("P1","Convention : lire directement l'élève, la classe et la période par ID ; mettre en cache le patron PDF/DOCX et les paramètres établissement."),
("P2","Batcher les écritures Grist : un POST/PATCH avec plusieurs records plutôt qu'une requête par élève quand l'API le permet."),
("P2","Ajouter un chronométrage serveur standard autour de chaque appel Grist et de chaque route, avec `console.log(JSON.stringify({op,dureeMs}))`."),
]
for prio,txt in recs:
    print(f"{prio} - {txt}")

print()
print("=== 8) OBJECTIFS DE PERFORMANCE A VISEE ===")
print("Navigation / shell HTML             : 0,2 à 0,8 s")
print("Liste classes déjà cachée           : < 1,0 s")
print("Détail classe (20-30 élèves)         : 0,5 à 1,5 s")
print("Affecter / retirer professeur        : < 1,0 s")
print("Préparation convention simple        : 1 à 2 s")
print("Génération PDF                       : 2 à 5 s selon moteur")
print()
print("NOTE : ce premier audit mesure précisément la STRUCTURE des I/O et les scans complets.")
print("Pour obtenir les millisecondes réelles par appel Grist, il faut instrumenter temporairement les fonctions serveur puis rejouer 3 parcours.")
PY

echo
echo "============================================================" | tee -a "$OUT"
echo " RAPPORT ENREGISTRE" | tee -a "$OUT"
echo " $OUT" | tee -a "$OUT"
echo "============================================================" | tee -a "$OUT"
