export interface SnapshotSafetyEvaluation {
  isSafetyTriggered: boolean;
  dropPercentage: number;
  isBlocked: boolean;
  message: string;
}

export class SnapshotSafetyGuard {
  /**
   * Evaluates whether an incoming catalog snapshot is suspiciously reduced.
   * If previous was 1530 and new is 400, drop is (1530 - 400) / 1530 = 73.8% > 15%.
   * In that case, automatic absence-based deactivation MUST be blocked.
   */
  public static evaluate(params: {
    isFullSnapshot: boolean;
    previousTotalCount: number;
    incomingValidCount: number;
    maxAllowedDropPercentage: number;
  }): SnapshotSafetyEvaluation {
    const { isFullSnapshot, previousTotalCount, incomingValidCount, maxAllowedDropPercentage } = params;

    // Partial updates never trigger mass deactivation
    if (!isFullSnapshot) {
      return {
        isSafetyTriggered: false,
        dropPercentage: 0,
        isBlocked: false,
        message: 'Mise à jour partielle : aucune désactivation automatique par absence.',
      };
    }

    // First import or previous empty catalog
    if (previousTotalCount === 0) {
      return {
        isSafetyTriggered: false,
        dropPercentage: 0,
        isBlocked: false,
        message: 'Premier import de catalogue ou catalogue précédent vide.',
      };
    }

    if (incomingValidCount >= previousTotalCount) {
      return {
        isSafetyTriggered: false,
        dropPercentage: 0,
        isBlocked: false,
        message: `Volume stable ou en croissance (+${incomingValidCount - previousTotalCount} articles).`,
      };
    }

    const drop = ((previousTotalCount - incomingValidCount) / previousTotalCount) * 100;
    const roundedDrop = Math.round(drop * 100) / 100;

    if (drop > maxAllowedDropPercentage) {
      return {
        isSafetyTriggered: true,
        dropPercentage: roundedDrop,
        isBlocked: true,
        message: `ALERTE SÉCURITÉ : Le volume d'articles reçus a chuté de ${roundedDrop}% (seuil autorisé: ${maxAllowedDropPercentage}%). Les désactivations d'articles absents sont bloquées d'office.`,
      };
    }

    return {
      isSafetyTriggered: false,
      dropPercentage: roundedDrop,
      isBlocked: false,
      message: `Baisse modérée constatée (-${roundedDrop}%), sous le seuil critique de ${maxAllowedDropPercentage}%.`,
    };
  }
}
