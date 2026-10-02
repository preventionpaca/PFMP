/**
 * Eucalyptus PFMP — v1.0.0-dev.296
 * Robustesse import CSV JotForm.
 */
function EUC_DEV296_normHeader_(v){
  return String(v==null?'':v)
    .replace(/^\uFEFF/,'')
    .replace(/\u00A0/g,' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[’']/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function EUC_DEV296_get_(row,aliases){
  row=row||{};
  aliases=aliases||[];
  var wanted={};

  aliases.forEach(function(a){
    wanted[EUC_DEV296_normHeader_(a)]=true;
  });

  var keys=Object.keys(row);

  for(var i=0;i<keys.length;i++){
    var k=keys[i];
    if(wanted[EUC_DEV296_normHeader_(k)]){
      return row[k];
    }
  }

  return '';
}

function EUC_DEV296_year_(v){
  var s=String(v==null?'':v)
    .replace(/\u00A0/g,' ')
    .replace(/[–—−]/g,'-')
    .trim()
    .replace(/\s+/g,'');

  var m=s.match(/^(20\d{2})[-\/](20\d{2})$/);

  if(m){
    return m[1]+'-'+m[2];
  }

  return s;
}

function EUC_DEV296_csvRows_(csvText){
  var txt=String(csvText==null?'':csvText)
    .replace(/^\uFEFF/,'');

  if(!txt.trim()){
    throw new Error('CSV vide.');
  }

  var candidates=[',',';','\t'];
  var best=null;

  candidates.forEach(function(delim){
    try{
      var matrix=Utilities.parseCsv(txt,delim);

      if(!matrix||matrix.length<2||!matrix[0]){
        return;
      }

      var score=matrix[0].length;

      if(!best||score>best.score){
        best={
          matrix:matrix,
          delim:delim,
          score:score
        };
      }
    }catch(e){}
  });

  if(!best||best.score<2){
    throw new Error(
      'CSV illisible : séparateur non reconnu.'
    );
  }

  var headers=best.matrix[0].map(function(h){
    return String(h==null?'':h)
      .replace(/^\uFEFF/,'')
      .replace(/\u00A0/g,' ')
      .trim();
  });

  return best.matrix
    .slice(1)
    .filter(function(r){
      return r.some(function(v){
        return String(v==null?'':v).trim()!=='';
      });
    })
    .map(function(r){
      var o={};

      headers.forEach(function(h,i){
        o[h]=r[i]==null?'':r[i];
      });

      return o;
    });
}

function EUC_DEV296_mapCsv_(r){
  function g(){
    return EUC_DEV296_get_(
      r,
      Array.prototype.slice.call(arguments)
    );
  }

  var classe=EUC_V160_txt_(
    g('Classe BAC PRO') ||
    g('Classe CAP') ||
    g('Classe BTS')
  );

  return {
    Submission_ID:EUC_V160_txt_(
      g('Submission ID')
    ),
    Annee_scolaire:EUC_DEV296_year_(
      g(
        'Année scolaire',
        'Annee scolaire',
        'Annee_scolaire'
      )
    ),
    Numero_convention_JotForm:EUC_V160_txt_(
      g(
        'n° de convention',
        'N de convention',
        'Numero de convention'
      )
    ),
    Periode_numero:EUC_V160_txt_(
      g(
        'Période n°',
        'Periode n',
        'Periode numero'
      )
    ),
    Date_debut_brut:EUC_V160_txt_(
      g('Date de début','Date de debut')
    ),
    Date_fin_brut:EUC_V160_txt_(
      g('Date de fin')
    ),
    Classe_saisie:classe,
    Diplome:EUC_V160_txt_(
      g('Diplôme','Diplome')
    ),
    Nom_eleve:EUC_V160_txt_(
      g('Nom')
    ),
    Prenom_eleve:EUC_V160_txt_(
      g('Prénom','Prenom')
    ),
    Date_naissance:EUC_V160_txt_(
      g('Date de naissance')
    ),
    Email_eleve:EUC_V160_txt_(
      g('Email')
    ),
    Entreprise_saisie:EUC_V160_txt_(
      g('Nom entreprise')
    ),
    SIRET_brut:EUC_V160_txt_(
      g('N° SIRET','N SIRET','SIRET')
    ),
    SIRET_normalise:EUC_V160_digits_(
      g('N° SIRET','N SIRET','SIRET')
    ),
    Adresse_entreprise:EUC_V160_txt_(
      g('Adresse entreprise')
    ),
    Complement_adresse_entreprise:EUC_V160_txt_(
      g(
        'Complément adresse entreprise',
        'Complement adresse entreprise'
      )
    ),
    CP_entreprise:EUC_V160_txt_(
      g('Code postal entreprise')
    ),
    Ville_entreprise:EUC_V160_txt_(
      g('Ville entreprise')
    ),
    Email_entreprise:EUC_V160_txt_(
      g(
        "Adresse e-mail de l'entreprise",
        "Adresse email de l'entreprise"
      )
    ),
    Telephone_entreprise:EUC_V160_txt_(
      g('Téléphone entreprise','Telephone entreprise')
    ),
    Nom_tuteur:EUC_V160_txt_(
      g('Nom du tuteur')
    ),
    Fonction_tuteur:EUC_V160_txt_(
      g('Fonction du tuteur')
    ),
    Email_tuteur:EUC_V160_txt_(
      g(
        'Adresse e-mail du tuteur',
        'Adresse email du tuteur'
      )
    ),
    Telephone_tuteur:EUC_V160_txt_(
      g('Téléphone du tuteur','Telephone du tuteur')
    ),
    Raw_JSON:JSON.stringify(r)
  };
}
