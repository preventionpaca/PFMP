/**
 * Eucalyptus PFMP — v1.0.0-dev.273i
 * Arbitrage EN LOT des divergences de date de naissance.
 *
 * Principe :
 * - l'utilisateur choisit GRIST/PRONOTE localement pour chaque ligne ;
 * - un seul appel serveur applique tous les arbitrages ;
 * - GRIST : le texte Pronote courant est corrigé avec la date Grist ;
 * - PRONOTE : la date Grist est mise à jour en une seule requête PATCH ;
 * - une seule réanalyse est lancée ensuite.
 */
var EUC_DEV273I_TABLE_='EUC_IMPORT_ARBITRAGES_PFMP';

function EUC_DEV273I_txt_(v){ return String(v==null?'':v).trim(); }

function EUC_DEV273I_norm_(v){
  return EUC_DEV273I_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .toUpperCase();
}

function EUC_DEV273I_iso_(v){
  if(v===null||v===undefined||v==='')return '';
  /* Lecteur du moteur : comprend aussi les dates JotForm (« June 5, 2008 »). */
  try{
    if(typeof EUC_SUIVI2_date_==='function'){
      var z=EUC_SUIVI2_date_(v);
      if(z)return z;
    }
  }catch(e0){}

  try{
    if(typeof EUC_IMPORT_dateExistanteISO_==='function'){
      var a=EUC_IMPORT_dateExistanteISO_(v);
      if(a)return a;
    }
  }catch(e){}

  try{
    if(typeof EUC_SUIVI_dateISO_==='function'){
      var b=EUC_SUIVI_dateISO_(v);
      if(b)return b;
    }
  }catch(e2){}

  var s=String(v).trim();

  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;

  var m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);

  return m
    ? m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0')
    : '';
}

function EUC_DEV273I_fr_(iso){
  var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return m
    ? m[3]+'/'+m[2]+'/'+m[1]
    : String(iso||'');
}

function EUC_DEV273I_dateGrist_(iso){
  if(typeof EUC_IMPORT_dateGrist_==='function'){
    return EUC_IMPORT_dateGrist_(iso);
  }

  var ms=Date.parse(String(iso||'')+'T00:00:00Z');

  return isFinite(ms)
    ? ms/1000
    : null;
}

function EUC_DEV273I_parse_(payload){
  payload=payload||{};

  var texte=String(payload.texte||'');

  if(!texte.trim()){
    throw new Error('Données Pronote absentes.');
  }

  var parsed;

  if(typeof EUC_IMPORT_analyserTexteComplet_==='function'){
    parsed=EUC_IMPORT_analyserTexteComplet_(
      texte,
      {annee:payload.annee}
    );
  }else if(typeof EUC_IMPORT_analyserTexte_==='function'){
    parsed=EUC_IMPORT_analyserTexte_(
      texte,
      {annee:payload.annee}
    );
  }else{
    throw new Error('Parseur Pronote introuvable.');
  }

  try{
    if(typeof EUC_IMPORT_extraireProfesseursPrincipaux_==='function'){
      EUC_IMPORT_extraireProfesseursPrincipaux_(
        texte,
        parsed
      );
    }
  }catch(e){}

  return parsed;
}

function EUC_DEV273I_rowsEleves_(){
  try{
    if(typeof EUC_IMPORT_lireRecords_==='function'){
      return EUC_IMPORT_lireRecords_(
        'EUC_ELEVES_PFMP'
      )||[];
    }
  }catch(e){}

  var r=EUC_ENT_grist(
    'get',
    '/tables/EUC_ELEVES_PFMP/records'
  );

  return (r&&r.records||[]).map(function(x){
    var f=Object.assign({},x.fields||{});
    f.id=x.id;
    return f;
  });
}

/* Année d’une fiche : Annee_scolaire est une référence (id) vers Annees_Scolaires. */
function EUC_DEV273I_deLAnnee_(rows,annee){
  annee=String(annee||"");
  var codes={};
  try{
    (EUC_IMPORT_lireRecords_('Annees_Scolaires')||[]).forEach(function(a){
      codes[String(a.id)]=String(a.Code||a.Libelle||a.Nom||'').trim();
    });
  }catch(e){}
  return (rows||[]).filter(function(e){
    var ref=e.Annee_scolaire,y='';
    if(typeof ref==='number'||/^\d+$/.test(String(ref||'')))y=codes[String(ref)]||'';
    if(!y)y=String(e.Annee_code||ref||'').trim();
    return !annee||y===annee||(!y&&!ref);
  });
}
var EUC_DEV273I_LECTURE_={};
function EUC_DEV273I_elevesAnnee_(annee){
  EUC_DEV273I_LECTURE_={mode:'SQL'};
  try{
    if(typeof EUC_SUIVI_sqlLecture_==='function'&&typeof EUC_SUIVI_fields_==='function'){
      var rows=EUC_SUIVI_fields_(EUC_SUIVI_sqlLecture_('SELECT e.*,a.Code AS Annee_code FROM EUC_ELEVES_PFMP e JOIN Annees_Scolaires a ON a.id=e.Annee_scolaire WHERE a.Code=?',[annee]))||[];
      if(rows.length){EUC_DEV273I_LECTURE_.n=rows.length;return rows;}
      EUC_DEV273I_LECTURE_.erreur='SQL : aucune fiche';
    }
  }catch(e){EUC_DEV273I_LECTURE_.erreur='SQL : '+String(e&&e.message||e).slice(0,160);}
  EUC_DEV273I_LECTURE_.mode='TABLE';
  var out=EUC_DEV273I_deLAnnee_(EUC_DEV273I_rowsEleves_(),annee);
  EUC_DEV273I_LECTURE_.n=out.length;
  return out;
}
function EUC_DEV273I_find_(r,rows){
  var t=EUC_DEV273I_txt_,out=[];
  function par(cle,champs){
    if(!cle)return [];
    return (rows||[]).filter(function(e){
      return champs.some(function(c){return t(e[c])&&t(e[c])===t(cle);});
    });
  }
  out=par(r.numeroNational,['Numero_national','Numero_National','Identifiant_national']);
  if(!out.length)out=par(r.ident,['Identifiant_Pronote','Identifiant_source','Identifiant_import']);
  if(!out.length)out=par(r.numero,['Numero_Pronote']);
  if(!out.length){
    var n=EUC_DEV273I_norm_(r.nom);
    var p=EUC_DEV273I_norm_(r.prenom);
    out=(rows||[]).filter(function(e){
      return EUC_DEV273I_norm_(e.Nom)===n&&EUC_DEV273I_norm_(e.Prenom_usage||e.Prenom)===p;
    });
  }
  return out.length===1?out[0]:null;
}

function EUC_DEV273I_source_(payload,parsed){
  var s=EUC_DEV273I_txt_(
    payload&&payload.sourcePronote||
    parsed&&parsed.sourcePronote||
    'AUTO'
  ).toUpperCase();

  if(s&&s!=='AUTO'){
    return s;
  }

  try{
    if(
      typeof EUC_IMPORT_detecterSource_==='function' &&
      typeof EUC_IMPORT_chargerClassesCamin_==='function'
    ){
      var d=EUC_IMPORT_detecterSource_(
        parsed,
        parsed.annee||payload.annee,
        EUC_IMPORT_chargerClassesCamin_()
      );

      if(d&&d.source){
        return String(d.source);
      }
    }
  }catch(e){}

  return 'AUTO';
}

function EUC_DEV273I_stable_(r){
  if(r.numeroNational){
    return 'NN|'+EUC_DEV273I_txt_(r.numeroNational);
  }

  if(r.ident){
    return 'I|'+EUC_DEV273I_txt_(r.ident);
  }

  if(r.numero){
    return 'N|'+EUC_DEV273I_txt_(r.numero);
  }

  return 'NP|'+
    EUC_DEV273I_norm_(r.nom)+
    '|'+
    EUC_DEV273I_norm_(r.prenom);
}

function EUC_DEV273I_key_(payload,parsed,r){
  return [
    EUC_DEV273I_source_(payload,parsed),
    String(parsed.annee||payload.annee||''),
    EUC_DEV273I_stable_(r),
    'DATE_NAISSANCE'
  ].join('|');
}

function EUC_DEV273I_assurerTable_(){
  var tabs=EUC_ENT_grist(
    'get',
    '/tables'
  ).tables||[];

  var exists=tabs.some(function(t){
    return t.id===EUC_DEV273I_TABLE_;
  });

  function c(id,label,type){
    return {
      id:id,
      fields:{
        label:label,
        type:type||'Text'
      }
    };
  }

  var cols=[
    c('Cle','Clé'),
    c('Annee','Année'),
    c('Source_Pronote','Source Pronote'),
    c('Nom','Nom'),
    c('Prenom','Prénom'),
    c('Champ','Champ'),
    c('Decision','Décision'),
    c('Valeur_Grist','Valeur Grist'),
    c('Valeur_Pronote','Valeur Pronote'),
    c('Actif','Actif','Bool'),
    c('Date_modification','Date modification','DateTime'),
    c('Auteur','Auteur')
  ];

  if(!exists){
    EUC_ENT_grist(
      'post',
      '/tables',
      {
        tables:[{
          id:EUC_DEV273I_TABLE_,
          columns:cols
        }]
      }
    );

    return;
  }

  var have={};

  (
    EUC_ENT_grist(
      'get',
      '/tables/'+
      EUC_DEV273I_TABLE_+
      '/columns'
    ).columns||[]
  ).forEach(function(x){
    have[x.id]=true;
  });

  var missing=cols.filter(function(x){
    return !have[x.id];
  });

  if(missing.length){
    EUC_ENT_grist(
      'post',
      '/tables/'+
      EUC_DEV273I_TABLE_+
      '/columns',
      {columns:missing}
    );
  }
}

function EUC_DEV273I_remplacerDateLigne_(
  lines,
  ligne,
  sourceIso,
  cibleIso
){
  var idx=Number(ligne)-1;

  if(idx<0||idx>=lines.length){
    throw new Error(
      'Ligne Pronote '+
      ligne+
      ' introuvable.'
    );
  }

  var changed=false;

  lines[idx]=lines[idx].replace(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})\b/g,
    function(token){
      if(changed){
        return token;
      }

      if(
        EUC_DEV273I_iso_(token)!==
        sourceIso
      ){
        return token;
      }

      changed=true;

      if(
        /^\d{4}-\d{2}-\d{2}$/.test(token)
      ){
        return cibleIso;
      }

      var sep=
        token.indexOf('/')>=0
          ? '/'
          : token.indexOf('.')>=0
            ? '.'
            : '-';

      var m=cibleIso.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

      return m
        ? m[3]+sep+m[2]+sep+m[1]
        : cibleIso;
    }
  );

  if(!changed){
    throw new Error(
      'Date Pronote non retrouvée sur la ligne '+
      ligne+
      '.'
    );
  }
}

function EUC_DEV273I_listerAmbiguities(payload){
  EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var parsed=EUC_DEV273I_parse_(payload);
  var students=EUC_DEV273I_elevesAnnee_(parsed.annee);
  var out=[],introuvables={};

  (parsed.rows||[]).forEach(function(r){
    var e=EUC_DEV273I_find_(
      r,
      students
    );

    if(!e){
      /* Diagnostic affiché sur la ligne si l’analyse la signale divergente. */
      introuvables[String(r.ligne)]={lecture:EUC_DEV273I_LECTURE_.mode+" "+(EUC_DEV273I_LECTURE_.n||0)+(EUC_DEV273I_LECTURE_.erreur?" — "+EUC_DEV273I_LECTURE_.erreur:""),nnPronote:!!r.numeroNational,identPronote:!!r.ident,memeNom:students.filter(function(x){return EUC_DEV273I_norm_(x.Nom)===EUC_DEV273I_norm_(r.nom);}).length};
      return;
    }

    var dg=EUC_DEV273I_iso_(
      e.Date_naissance
    );

    var dp=EUC_DEV273I_iso_(
      r.naissance
    );

    /* Date Grist illisible : proposée quand même (seul le choix Pronote pourra la corriger). */
    var brut=e.Date_naissance==null?'':String(e.Date_naissance).trim();
    if(
      !dp||
      (!dg&&!brut)||
      dg===dp
    ){
      return;
    }

    out.push({
      ligne:Number(r.ligne)||0,
      nom:r.nom||'',
      prenom:r.prenom||'',
      dateGrist:dg,
      dateGristFr:dg?EUC_DEV273I_fr_(dg):brut+' (illisible)',
      datePronote:dp,
      datePronoteFr:EUC_DEV273I_fr_(dp)
    });
  });

  return {
    ok:true,
    ambiguities:out,
    introuvables:introuvables
  };
}

function EUC_DEV273I_appliquerLot(payload){
  var ctx=EUC_IMPORT_exigerAdminTexte_();

  payload=payload||{};

  var decisions=payload.decisions||[];

  if(!decisions.length){
    throw new Error(
      'Aucun arbitrage transmis.'
    );
  }

  var parsed=EUC_DEV273I_parse_(payload);
  var students=EUC_DEV273I_elevesAnnee_(parsed.annee);
  var byLine={};

  (parsed.rows||[]).forEach(function(r){
    byLine[String(r.ligne)]=r;
  });

  var lines=String(
    payload.texte||''
  ).split(/\r?\n/);

  var patches=[];
  var audits=[];
  var seenRecord={};

  decisions.forEach(function(d){
    var line=Number(d.ligne)||0;
    var decision=String(
      d.decision||''
    ).toUpperCase();

    if(
      ['GRIST','PRONOTE']
        .indexOf(decision)<0
    ){
      throw new Error(
        'Décision invalide ligne '+
        line+
        '.'
      );
    }

    var r=byLine[String(line)];

    if(!r){
      throw new Error(
        'Ligne source '+
        line+
        ' introuvable.'
      );
    }

    var e=EUC_DEV273I_find_(
      r,
      students
    );

    if(!e){
      throw new Error(
        'Élève Grist unique introuvable : '+
        (r.nom||'')+
        ' '+
        (r.prenom||'')
      );
    }

    var dg=EUC_DEV273I_iso_(
      e.Date_naissance
    );

    var dp=EUC_DEV273I_iso_(
      r.naissance
    );

    if(!dg&&dp&&decision==='GRIST'){
      throw new Error(
        'Date Grist illisible pour '+(r.nom||'')+' '+(r.prenom||'')+' : choisissez Pronote.'
      );
    }
    if(!dp){
      throw new Error(
        'Date de naissance incomplète ligne '+
        line+
        '.'
      );
    }

    if(decision==='GRIST'){
      EUC_DEV273I_remplacerDateLigne_(
        lines,
        line,
        dp,
        dg
      );
    }else{
      var rid=Number(e.id)||0;

      if(!rid){
        throw new Error(
          'ID Grist manquant ligne '+
          line+
          '.'
        );
      }

      if(!seenRecord[rid]){
        patches.push({
          id:rid,
          fields:{
            Date_naissance:
              EUC_DEV273I_dateGrist_(dp)
          }
        });

        seenRecord[rid]=true;
      }
    }

    audits.push({
      fields:{
        Cle:EUC_DEV273I_key_(
          payload,
          parsed,
          r
        ),
        Annee:String(
          parsed.annee||
          payload.annee||
          ''
        ),
        Source_Pronote:
          EUC_DEV273I_source_(
            payload,
            parsed
          ),
        Nom:r.nom||'',
        Prenom:r.prenom||'',
        Champ:'DATE_NAISSANCE',
        Decision:decision,
        Valeur_Grist:dg,
        Valeur_Pronote:dp,
        Actif:true,
        Date_modification:
          new Date().toISOString(),
        Auteur:String(
          ctx&&ctx.email||''
        )
      }
    });
  });

  if(patches.length){
    EUC_ENT_grist(
      'patch',
      '/tables/EUC_ELEVES_PFMP/records',
      {records:patches}
    );
  }

  EUC_DEV273I_assurerTable_();

  if(audits.length){
    EUC_ENT_grist(
      'post',
      '/tables/'+
      EUC_DEV273I_TABLE_+
      '/records',
      {records:audits}
    );
  }

  return {
    ok:true,
    traites:decisions.length,
    prisPronote:patches.length,
    texteCorrige:lines.join('\n')
  };
}
