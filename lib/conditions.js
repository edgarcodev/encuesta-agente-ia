// ================================================================
// CONDITION ENGINE — evaluador declarativo sin eval()
// ================================================================

/**
 * Evaluates a condition object against a set of answers.
 * @param {object} cond - Condition object
 * @param {object} answers - Map of question IDs to values
 * @returns {boolean}
 */
export function evaluateCondition(cond, answers) {
    if (cond.always) return true;

    // AND logic
    if (cond.logic === 'and' && Array.isArray(cond.conditions)) {
        return cond.conditions.every(c => evaluateCondition(c, answers));
    }
    // OR logic
    if (cond.logic === 'or' && Array.isArray(cond.conditions)) {
        return cond.conditions.some(c => evaluateCondition(c, answers));
    }

    const val = answers[cond.field];

    switch (cond.operator) {
        case 'equals':
            return val === cond.value;
        case 'notEquals':
            return val !== cond.value;
        case 'oneOf':
            return Array.isArray(cond.value) && cond.value.includes(val);
        case 'includes':
            return Array.isArray(val) && val.includes(cond.value);
        case 'notIncludes':
            return Array.isArray(val) && !val.includes(cond.value);
        default:
            return true;
    }
}

// ================================================================
// DYNAMIC DEFINITION ENGINE
// ================================================================

/**
 * Applies a dynamic definition to a step based on current answers.
 * @param {object} rawStep - The original question step from JSON
 * @param {object} answers - Map of question IDs to values
 * @returns {object} - The step with applied variant (then/else)
 */
export function applyDynamicDefinition(rawStep, answers) {
    if (!rawStep.dynamicDefinition) return rawStep;

    const dd = rawStep.dynamicDefinition;
    let match = false;

    if (dd.logic === 'and' && Array.isArray(dd.conditions)) {
        match = dd.conditions.every(c => evaluateCondition(c, answers));
    } else if (dd.when) {
        const fieldVal = answers[dd.field];
        if (dd.when.operator === 'equals') {
            match = fieldVal === dd.when.value;
        } else if (dd.when.operator === 'oneOf') {
            match = dd.when.value.includes(fieldVal);
        }
    }

    const variant = match ? dd.then : dd.else;
    return Object.assign({}, rawStep, variant);
}

// ================================================================
// PARSE QUESTIONS — JSON → steps con condition() y getDefinition()
// ================================================================

/**
 * Converts raw question JSON objects into step objects with callable
 * condition() and getDefinition() closures bound to the given answers.
 * @param {Array<object>} rawQuestions - Raw question objects from JSON
 * @param {object} answers - Map of question IDs to values
 * @returns {Array<object>} Parsed step objects
 */
export function parseQuestions(rawQuestions, answers) {
    return rawQuestions.map(raw => {
        const step = Object.assign({}, raw);
        delete step.condition;
        delete step.dynamicDefinition;

        // Wrap condition
        step.condition = function() {
            return evaluateCondition(raw.condition, answers);
        };

        // Wrap dynamicDefinition
        if (raw.dynamicDefinition) {
            step.getDefinition = function() {
                return applyDynamicDefinition(raw, answers);
            };
        }

        // Normalize options: convert string arrays to {label, value} objects
        if (Array.isArray(raw.options) && raw.options.length > 0 && typeof raw.options[0] === 'string') {
            step.options = raw.options.map(label => ({ label, value: label }));
        }

        return step;
    });
}
