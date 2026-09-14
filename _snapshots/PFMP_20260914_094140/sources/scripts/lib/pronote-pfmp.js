'use strict';

const crypto = require('crypto');

const REQUIRED = ['NUMERO','IDENT','NOM','PRENOM_USAGE','PRENOM','DATE NAISS','CLASSES','GROUPES','DATE ENTREE','DATE SORTIE','MOTIF SORTIE ETABLISSEMENT'];
const FORBIDDEN = [/\bMDP\b/i,/MOT\s*DE\s*PASSE/i,/\bLOGIN\b/i,/COURR?IEL/i,/E[- ]?MAIL/i,/TELEPHONE/i,/ADRESSE/i,/RESPONSABLE/i,/MEDICAL/i,/SANTE/i];

function normalizeHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[’']/g, ' ').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalizeIdentity(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[’'\-\s]+/g, ' ').trim();
}
function parseLine(line, separator) {
  const values=[]; let value='', quoted=false;
  for(let i=0;i<line.length;i++) { const c=line[i]; if(c==='"') { if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted; } else if(c===separator&&!quoted){values.push(value);value='';}else value+=c; }
  if(quoted) throw new Error('Guillemets CSV non fermés.'); values.push(value); return values;
}
function decode(buffer) {
  if(!Buffer.isBuffer(buffer)) throw new Error('Le contenu Pronote doit être binaire.');
  if(buffer[0]===0xff&&buffer[1]===0xfe) return {encoding:'UTF-16LE',text:new TextDecoder('utf-16le',{fatal:true}).decode(buffer)};
  if(buffer[0]===0xfe&&buffer[1]===0xff) return {encoding:'UTF-16BE',text:new TextDecoder('utf-16be',{fatal:true}).decode(buffer)};
  throw new Error('BOM UTF-16 absent ou encodage non autorisé.');
}
function parseDate(value) {
  const s=String(value||'').trim(); if(!s) return '';
  let m=s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/); if(m){const iso=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;const d=new Date(`${iso}T00:00:00Z`);return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===iso?iso:null;}
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const d=new Date(`${s}T00:00:00Z`);return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s?s:null;}
  return null;
}
function parse(buffer) {
  const decoded=decode(buffer), lines=decoded.text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.length);
  if(lines.length<2) throw new Error('Export Pronote vide ou incomplet.');
  const separator=(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';
  if(separator!==';') throw new Error('Séparateur Pronote non autorisé : point-virgule attendu.');
  const rawHeaders=parseLine(lines.shift(),separator), headers=rawHeaders.map(normalizeHeader);
  const forbidden=headers.filter(h=>FORBIDDEN.some(r=>r.test(h))); if(forbidden.length) throw new Error(`Colonne interdite détectée (${forbidden.length}).`);
  const missing=REQUIRED.filter(h=>!headers.includes(normalizeHeader(h))); if(missing.length) throw new Error(`Colonnes obligatoires absentes (${missing.length}).`);
  const rows=lines.map((line,index)=>{const values=parseLine(line,separator);if(values.length!==headers.length)throw new Error(`Largeur invalide à la ligne technique ${index+2}.`);const row={};headers.forEach((h,i)=>row[h]=String(values[i]||'').trim());return row;});
  return {encoding:decoded.encoding,separator,headers,rows,lineCount:rows.length,columnCount:headers.length};
}
function duplicateCount(rows, field) { const counts=new Map(); rows.forEach(r=>{const v=r[field];if(v)counts.set(v,(counts.get(v)||0)+1);}); return [...counts.values()].filter(n=>n>1).length; }
function preview(parsed, offers, options={}) {
  const activeOffers=(offers||[]).filter(o=>o.Actif===true&&o.Afficher_formulaire_PFMP===true&&String(o.Code_classe||'').trim());
  const byCode=new Map(); activeOffers.forEach(o=>{const k=normalizeIdentity(o.Code_classe);if(!byCode.has(k))byCode.set(k,[]);byCode.get(k).push(o);});
  const invalidDates=[],withoutClass=[],unknownClasses=[],ambiguousClasses=[],accepted=[],excluded=[],exited=[];
  const seenIdentity=new Map();
  parsed.rows.forEach((r,index)=>{
    const code=r.CLASSES, birth=parseDate(r['DATE NAISS']),entry=parseDate(r['DATE ENTREE']),exit=parseDate(r['DATE SORTIE']);
    if(birth===null||entry===null||exit===null){invalidDates.push(index+2);excluded.push(index+2);return;}
    if(!code){withoutClass.push(index+2);excluded.push(index+2);return;}
    const candidates=byCode.get(normalizeIdentity(code))||[];
    if(!candidates.length){unknownClasses.push(code);excluded.push(index+2);return;}
    if(candidates.length!==1){ambiguousClasses.push(code);excluded.push(index+2);return;}
    const identity=[normalizeIdentity(r.NOM),normalizeIdentity(r['PRENOM USAGE']||r.PRENOM),birth||'',normalizeIdentity(code)].join('|');
    if(!seenIdentity.has(identity))seenIdentity.set(identity,[]);seenIdentity.get(identity).push(index+2);
    const offer=candidates[0], technicalId=crypto.createHash('sha256').update(`${r.IDENT}|${r.NUMERO}|${identity}`).digest('hex');
    const item={_line:index+2,technicalId,Identifiant_Pronote:r.IDENT,Numero_Pronote:r.NUMERO,Nom:r.NOM,Prenom:r.PRENOM,Prenom_usage:r['PRENOM USAGE'],Date_naissance:birth,Classe:offer.Classe||null,Offre_formation:offer.id,Code_classe_importe:code,Groupes_importes:r.GROUPES,Annee_scolaire:options.schoolYearId||null,Statut_scolarite:exit?'SORTI':'PRESENT',Date_entree:entry,Date_sortie:exit,Motif_sortie:r['MOTIF SORTIE ETABLISSEMENT'],Sortie_confirmee:!!exit,Present_dernier_import:true,Exclure_attente_stage:!!exit,Actif:!exit,Source_import:'PRONOTE_UTF16_CONTROLE',Identifiant_lot_import:options.batchId,Empreinte_import:technicalId};
    accepted.push(item);if(exit)exited.push(item);
  });
  const ambiguousIdentities=[...seenIdentity.values()].filter(x=>x.length>1); const ambiguousLines=new Set(ambiguousIdentities.flat());
  const finalAccepted=accepted.filter(item=>!ambiguousLines.has(item._line));finalAccepted.forEach(item=>delete item._line);
  return {accepted:finalAccepted,excludedCount:excluded.length+ambiguousLines.size,stats:{lines:parsed.lineCount,columns:parsed.columnCount,encoding:parsed.encoding,separator:parsed.separator,accepted:finalAccepted.length,exited:exited.filter(x=>finalAccepted.includes(x)).length,withoutClass:withoutClass.length,unknownClassLines:unknownClasses.length,unknownClasses:[...new Set(unknownClasses)].sort(),ambiguousClassLines:ambiguousClasses.length,invalidDates:invalidDates.length,duplicateIdentValues:duplicateCount(parsed.rows,'IDENT'),duplicateNumeroValues:duplicateCount(parsed.rows,'NUMERO'),ambiguousIdentities:ambiguousIdentities.length}};
}
function publicReport(result) { return JSON.parse(JSON.stringify({stats:result.stats})); }

module.exports={normalizeHeader,normalizeIdentity,parseLine,decode,parseDate,parse,preview,publicReport};
