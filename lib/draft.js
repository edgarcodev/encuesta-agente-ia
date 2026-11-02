// ================================================================
// DRAFT — localStorage persistence for survey drafts
// ================================================================

const DRAFT_KEY_PREFIX = 'megaremates_encuesta_borrador_';

/**
 * Generates the localStorage key for a survey type's draft.
 * @param {string} tipo - Survey type (e.g. 'compradores', 'vendedores')
 * @returns {string} localStorage key
 */
export function getDraftKey(tipo) {
  return DRAFT_KEY_PREFIX + tipo;
}

/**
 * Saves the current survey state to localStorage.
 * @param {object} params
 * @param {object} params.answers - Map of question IDs to values
 * @param {number} params.currentStepIndex - Current visible step index
 * @param {object} params.tiemposPorPregunta - Time spent per question
 * @param {Date|string} params.inicioEncuesta - Survey start time
 * @param {string} params.tipo - Survey type
 * @param {Storage} [params.storage=localStorage] - Storage instance (for testing)
 */
export function saveDraft({
  answers,
  currentStepIndex,
  tiemposPorPregunta,
  inicioEncuesta,
  tipo,
  storage = localStorage,
}) {
  try {
    const draft = {
      answers: JSON.parse(JSON.stringify(answers)), // deep copy
      currentStepIndex,
      tiemposPorPregunta: { ...tiemposPorPregunta },
      inicioEncuesta:
        inicioEncuesta instanceof Date ? inicioEncuesta.toISOString() : inicioEncuesta,
      savedAt: new Date().toISOString(),
    };
    storage.setItem(getDraftKey(tipo), JSON.stringify(draft));
  } catch (e) {
    // localStorage might be full or disabled
    console.warn('⚠️ No se pudo guardar el borrador:', e.message);
  }
}

/**
 * Loads a saved draft from localStorage.
 * @param {string} tipo - Survey type
 * @param {Storage} [storage=localStorage] - Storage instance (for testing)
 * @returns {object|null} Draft object or null if not found/corrupt
 */
export function loadDraft(tipo, storage = localStorage) {
  try {
    const key = getDraftKey(tipo);
    const raw = storage.getItem(key);
    if (!raw) return null;

    const draft = JSON.parse(raw);

    // Validate basic structure
    if (!draft || typeof draft !== 'object') return null;
    if (!draft.answers || typeof draft.answers !== 'object') return null;

    // Restore Date objects
    if (draft.inicioEncuesta) {
      draft.inicioEncuesta = new Date(draft.inicioEncuesta);
    }
    if (draft.savedAt) {
      draft.savedAt = new Date(draft.savedAt);
    }

    return draft;
  } catch (e) {
    // Corrupt JSON — clean up
    console.warn('⚠️ Borrador corrupto, limpiando:', e.message);
    try {
      storage.removeItem(getDraftKey(tipo));
    } catch (_e) {
      /* ignore */
    }
    return null;
  }
}

/**
 * Clears the saved draft from localStorage.
 * @param {string} tipo - Survey type
 * @param {Storage} [storage=localStorage] - Storage instance (for testing)
 */
export function clearDraft(tipo, storage = localStorage) {
  try {
    storage.removeItem(getDraftKey(tipo));
  } catch (e) {
    console.warn('⚠️ No se pudo limpiar el borrador:', e.message);
  }
}
