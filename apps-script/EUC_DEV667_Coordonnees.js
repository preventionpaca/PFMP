/**
 * DEV667 — Coordonnées plausibles. Une latitude ou une longitude vide lue comme 0 (Grist, Number('')) plaçait
 * l'entreprise au point 0,0, dans le golfe de Guinée au large du Bénin (cas Renault Retail Group, Nice-Riquier).
 * Seuls les points de France métropolitaine (Corse comprise) et de Monaco sont acceptés ; tout autre point est
 * traité comme non géolocalisé et l'entreprise repasse « à regéocoder » dans la page Géocodage. Calcul pur.
 */
function EUC_DEV667_coordOk_(lat, lon) {
  if (lat === null || lon === null || lat === undefined || lon === undefined || String(lat).trim() === '' || String(lon).trim() === '') return false;
  lat = Number(lat); lon = Number(lon);
  return isFinite(lat) && isFinite(lon) && lat >= 41 && lat <= 51.6 && lon >= -5.6 && lon <= 10;
}
