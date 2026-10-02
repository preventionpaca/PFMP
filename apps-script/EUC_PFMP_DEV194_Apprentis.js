/**
 * DEV.194
 * - mapping très tolérant de la réponse EUC_ENT_rechercherSiret
 * - rattachement à la base Entreprises globale via DEV192
 * - conserve backend/historique DEV192
 */

function EUC_DEV194_txt_(v){
  return String(v==null?'':v).trim();
}

function EUC_DEV194_norm_(v){
  return EUC_DEV194_txt_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

function EUC_DEV194_siret_(v){
  return EUC_DEV194_txt_(v).replace(/\D/g,'').slice(0,14);
}

function EUC_DEV194_flat_(obj, path, out, depth){
  if(obj==null || depth>10)return;

  if(typeof obj!=='object'){
    out.push({
      path:path.join('.'),
      key:path.length ? path[path.length-1] : '',
      value:String(obj)
    });
    return;
  }

  if(Array.isArray(obj)){
    for(var i=0;i<obj.length;i++){
      EUC_DEV194_flat_(obj[i],path.concat(String(i)),out,depth+1);
    }
    return;
  }

  Object.keys(obj).forEach(function(k){
    EUC_DEV194_flat_(obj[k],path.concat(k),out,depth+1);
  });
}

function EUC_DEV194_scorePick_(flat, tests){
  var best='';
  var bestScore=-999;

  for(var i=0;i<flat.length;i++){
    var item=flat[i];
    var key=EUC_DEV194_norm_(item.key);
    var path=EUC_DEV194_norm_(item.path);
    var value=EUC_DEV194_txt_(item.value);

    if(!value)continue;

    var score=0;

    for(var t=0;t<tests.length;t++){
      var test=tests[t];
      var where=test.where==='path' ? path : key;

      if(test.eq && where===EUC_DEV194_norm_(test.eq)){
        score+=test.score||20;
      }

      if(test.has && where.indexOf(EUC_DEV194_norm_(test.has))>=0){
        score+=test.score||10;
      }

      if(test.not && where.indexOf(EUC_DEV194_norm_(test.not))>=0){
        score-=Math.abs(test.score||20);
      }
    }

    if(score>bestScore){
      bestScore=score;
      best=value;
    }
  }

  return bestScore>0 ? best : '';
}

function EUC_DEV194_lookupSiret(siret){
  siret=EUC_DEV194_siret_(siret);

  if(siret.length!==14){
    return {
      ok:false,
      found:false,
      error:'Le SIRET doit comporter 14 chiffres.'
    };
  }

  if(typeof EUC_ENT_rechercherSiret!=='function'){
    return {
      ok:false,
      found:false,
      error:'EUC_ENT_rechercherSiret indisponible.'
    };
  }

  var raw=EUC_ENT_rechercherSiret(siret);

  if(typeof raw==='string'){
    try{
      raw=JSON.parse(raw);
    }catch(e){}
  }

  var flat=[];
  EUC_DEV194_flat_(raw,[],flat,0);

  var nomEntreprise=EUC_DEV194_scorePick_(flat,[
    {has:'RAISONSOCIALE',score:60},
    {has:'DENOMINATIONUNITELEGALE',score:60},
    {has:'DENOMINATION',score:50},
    {has:'NOMRAISONSOCIALE',score:60},
    {has:'NOMENTREPRISE',score:55},
    {has:'NOMCOMPLET',score:40},
    {eq:'NOM',score:20},
    {has:'COMMUNE',not:true,score:50},
    {has:'TUTEUR',not:true,score:50},
    {has:'ENSEIGNE',not:true,score:20}
  ]);

  var nomCommercial=EUC_DEV194_scorePick_(flat,[
    {has:'NOMCOMMERCIAL',score:70},
    {has:'ENSEIGNE',score:60},
    {has:'APPELLATION',score:45},
    {has:'ENTREPRISE',score:20},
    {has:'ADRESSE',not:true,score:30}
  ]);

  var adresse=EUC_DEV194_scorePick_(flat,[
    {has:'ADRESSECOMPLETE',score:80},
    {has:'ADRESSEETABLISSEMENT',score:70},
    {eq:'ADRESSE',score:60},
    {has:'ADRESSE',score:40},
    {has:'COURRIEL',not:true,score:80},
    {has:'EMAIL',not:true,score:80}
  ]);

  var cp=EUC_DEV194_scorePick_(flat,[
    {has:'CODEPOSTAL',score:80},
    {eq:'CP',score:70},
    {has:'POSTAL',score:40}
  ]);

  var ville=EUC_DEV194_scorePick_(flat,[
    {has:'LIBELLECOMMUNE',score:80},
    {eq:'VILLE',score:80},
    {eq:'COMMUNE',score:70},
    {has:'COMMUNE',score:50}
  ]);

  if(!adresse){
    var numero=EUC_DEV194_scorePick_(flat,[
      {has:'NUMEROVOIE',score:70}
    ]);

    var typeVoie=EUC_DEV194_scorePick_(flat,[
      {has:'TYPEVOIE',score:70}
    ]);

    var libelleVoie=EUC_DEV194_scorePick_(flat,[
      {has:'LIBELLEVOIE',score:70},
      {has:'NOMVOIE',score:60}
    ]);

    adresse=[numero,typeVoie,libelleVoie].filter(Boolean).join(' ');
  }

  var telephoneEntreprise=EUC_DEV194_scorePick_(flat,[
    {has:'TELEPHONEENTREPRISE',score:80},
    {eq:'TELEPHONE',score:50},
    {eq:'TEL',score:40},
    {has:'TUTEUR',not:true,score:80}
  ]);

  var courrielEntreprise=EUC_DEV194_scorePick_(flat,[
    {has:'COURRIELENTREPRISE',score:80},
    {has:'EMAILENTREPRISE',score:80},
    {eq:'COURRIEL',score:50},
    {eq:'EMAIL',score:50},
    {eq:'MAIL',score:40},
    {has:'TUTEUR',not:true,score:80}
  ]);

  var tuteur=EUC_DEV194_scorePick_(flat,[
    {has:'TUTEURNOM',score:80},
    {has:'NOMTUTEUR',score:80},
    {eq:'TUTEUR',score:60}
  ]);

  var telephoneTuteur=EUC_DEV194_scorePick_(flat,[
    {has:'TUTEURTELEPHONE',score:90},
    {has:'TELEPHONETUTEUR',score:90}
  ]);

  var courrielTuteur=EUC_DEV194_scorePick_(flat,[
    {has:'TUTEURCOURRIEL',score:90},
    {has:'COURRIELTUTEUR',score:90},
    {has:'EMAILTUTEUR',score:90}
  ]);

  var found=!!(
    nomEntreprise ||
    nomCommercial ||
    adresse ||
    cp ||
    ville
  );

  var result={
    ok:true,
    found:found,
    source:'EUC_ENT_rechercherSiret',
    siret:siret,

    nomEntreprise:nomEntreprise,
    nomCommercial:nomCommercial,

    adresse:adresse,
    codePostal:cp,
    ville:ville,

    telephoneEntreprise:telephoneEntreprise,
    courrielEntreprise:courrielEntreprise,

    tuteur:tuteur,
    telephoneTuteur:telephoneTuteur,
    courrielTuteur:courrielTuteur
  };

  if(found && typeof EUC_DEV192_upsertGlobalEntreprise_==='function'){
    try{
      result.globalEntreprise=
        EUC_DEV192_upsertGlobalEntreprise_(result);
    }catch(e2){
      result.globalEntreprise={
        ok:false,
        linked:false,
        warning:String(e2&&e2.message||e2)
      };
    }
  }

  return result;
}
