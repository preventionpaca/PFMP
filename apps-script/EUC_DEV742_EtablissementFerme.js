/** Eucalyptus PFMP — DEV742 : établissement fermé administrativement (INSEE) : saisie de l'élève bloquée.
 * L'élève (déclaration en ligne et QR code) ne peut pas enregistrer une entreprise dont l'établissement est fermé :
 * il est renvoyé vers l'entreprise (erreur de SIRET ?) et vers le bureau G205. Le bureau voit la même mention
 * « fermé administrativement » et décide (« Vérifier le SIRET », « Valider sous réserve », interrompre la convention). */
var EUC_DEV742_MESSAGE_ = 'Votre saisie est impossible car l’établissement est fermé administrativement. Veuillez contacter l’entreprise pour savoir s’il ne s’agit pas d’une erreur de numéro SIRET de leur part. Dans tous les cas, passez au bureau des formations et des entreprises (bureau G205).';
/* Calcul pur : e = entreprise de l'annuaire ou de la base (etat « Fermé » / « Actif »). */
function EUC_DEV742_ferme_(e) { return !!e && /^ferm/i.test(String(e.etat == null ? '' : e.etat).trim()); }
