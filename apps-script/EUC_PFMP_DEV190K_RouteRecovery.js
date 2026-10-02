/** DEV.190K — routage prioritaire robuste + décomptes différés */

function EUC_DEV190K_resumeFamille(payload) {
  payload = payload || {};

  if (typeof EUC_DEV190G1_resumeFamille === 'function') {
    return EUC_DEV190G1_resumeFamille(payload);
  }

  if (typeof EUC_DEV190E_resumeFamille === 'function') {
    return EUC_DEV190E_resumeFamille(payload);
  }

  if (typeof EUC_DEV189_resumeFamille === 'function') {
    return EUC_DEV189_resumeFamille(payload);
  }

  throw new Error('DEV190K : aucun moteur résumé famille disponible.');
}

function EUC_DEV190K_routePrioritaire_(e) {
  var page =
    e &&
    e.parameter &&
    e.parameter.page
      ? String(e.parameter.page)
      : '';

  if (page === 'snapshot-pfmp-admin') {
    return HtmlService
      .createTemplateFromFile('Snapshot_PFMP_Admin_V190')
      .evaluate()
      .setTitle('Maintenance Snapshot PFMP')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === 'audit-matrice-pfmp') {
    if (typeof EUC_DEV190H2_afficherAuditMatrice === 'function') {
      return EUC_DEV190H2_afficherAuditMatrice(e);
    }
    if (typeof EUC_DEV190H1_afficherAuditMatrice === 'function') {
      return EUC_DEV190H1_afficherAuditMatrice(e);
    }
    if (typeof EUC_DEV190H_afficherAuditMatrice === 'function') {
      return EUC_DEV190H_afficherAuditMatrice(e);
    }
  }

  if (page === 'suivi-pfmp-classe-public') {
    if (typeof EUC_DEV190I_afficherPublicClasse === 'function') {
      return EUC_DEV190I_afficherPublicClasse(e);
    }
    if (typeof EUC_DEV189_afficherClasse === 'function') {
      return EUC_DEV189_afficherClasse(e);
    }
  }

  if (page === 'suivi-conventions-public') {
    if (typeof EUC_DEV189_afficherHome === 'function') {
      return EUC_DEV189_afficherHome(e);
    }
  }

  if (page === 'suivi-conventions-public-famille') {
    if (typeof EUC_DEV189_afficherFamille === 'function') {
      return EUC_DEV189_afficherFamille(e);
    }
  }

  if (page === 'suivi-pfmp-classes') {
    page = 'suivi-conventions';
  }

  if (page === 'suivi-conventions') {
    if (typeof EUC_SUIVI_PUBLIC_afficherFamillesV51 === 'function') {
      return EUC_SUIVI_PUBLIC_afficherFamillesV51(e);
    }
  }

  return null;
}
