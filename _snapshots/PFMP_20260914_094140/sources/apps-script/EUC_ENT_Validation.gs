/** Eucalyptus Entreprises SIRET — v1.0.0-dev.8 */
function EUC_ENT_normaliserSiret(valeur) { return String(valeur == null ? '' : valeur).replace(/[^0-9]/g, ''); }
function EUC_ENT_validerSiret(valeur) {
  var brut=String(valeur==null?'':valeur).trim(), s=EUC_ENT_normaliserSiret(brut);
  if (!brut) return {valide:false,siret:'',code:'VIDE',message:'Le SIRET est obligatoire.'};
  if (/[A-Za-z]/.test(brut)) return {valide:false,siret:s,code:'CARACTERES',message:'Le SIRET ne doit contenir que des chiffres et séparateurs.'};
  if (s.length!==14) return {valide:false,siret:s,code:'LONGUEUR',message:'Le SIRET doit contenir exactement 14 chiffres.'};
  var somme=0; for(var i=0;i<14;i++){var n=Number(s[i])*(i%2===0?2:1); somme+=n>9?n-9:n;}
  if(somme%10!==0) return {valide:false,siret:s,code:'LUHN',message:'Le SIRET est mathématiquement incorrect.'};
  return {valide:true,siret:s,code:'OK',message:''};
}
function EUC_ENT_nettoyerTexte(v,max){ return String(v==null?'':v).trim().slice(0,max||5000); }
