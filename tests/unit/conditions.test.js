import { describe, it, expect } from 'vitest';
import { evaluateCondition, applyDynamicDefinition, parseQuestions } from '../../lib/conditions.js';

// ================================================================
// evaluateCondition()
// ================================================================

describe('evaluateCondition', () => {
  describe('always', () => {
    it('returns true for { always: true }', () => {
      expect(evaluateCondition({ always: true }, {})).toBe(true);
    });

    it('returns true even when answers is empty', () => {
      expect(evaluateCondition({ always: true }, { p1: 'x' })).toBe(true);
    });
  });

  describe('equals', () => {
    it('returns true when value matches', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'equals', value: 'Sí' },
        { p9: 'Sí' }
      )).toBe(true);
    });

    it('returns false when value does not match', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'equals', value: 'Sí' },
        { p9: 'No' }
      )).toBe(false);
    });

    it('returns false when field is missing', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'equals', value: 'Sí' },
        {}
      )).toBe(false);
    });
  });

  describe('notEquals', () => {
    it('returns true when value differs', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'notEquals', value: 'Sí' },
        { p9: 'No' }
      )).toBe(true);
    });

    it('returns false when value matches', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'notEquals', value: 'Sí' },
        { p9: 'Sí' }
      )).toBe(false);
    });
  });

  describe('oneOf', () => {
    it('returns true when value is in the array', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'oneOf', value: ['Sí', 'No'] },
        { p9: 'Sí' }
      )).toBe(true);
    });

    it('returns false when value is not in the array', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'oneOf', value: ['Sí', 'No'] },
        { p9: 'Tal vez' }
      )).toBe(false);
    });

    it('returns false when value is missing', () => {
      expect(evaluateCondition(
        { field: 'p9', operator: 'oneOf', value: ['Sí', 'No'] },
        {}
      )).toBe(false);
    });
  });

  describe('includes', () => {
    it('returns true when array includes value', () => {
      expect(evaluateCondition(
        { field: 'p13', operator: 'includes', value: 'Facebook' },
        { p13: ['Facebook', 'Google'] }
      )).toBe(true);
    });

    it('returns false when array does not include value', () => {
      expect(evaluateCondition(
        { field: 'p13', operator: 'includes', value: 'Facebook' },
        { p13: ['Google', 'WhatsApp'] }
      )).toBe(false);
    });

    it('returns false when answer is not an array', () => {
      expect(evaluateCondition(
        { field: 'p13', operator: 'includes', value: 'Facebook' },
        { p13: 'Facebook' }
      )).toBe(false);
    });
  });

  describe('notIncludes', () => {
    it('returns true when array does not include value', () => {
      expect(evaluateCondition(
        { field: 'p13', operator: 'notIncludes', value: 'No he tenido...' },
        { p13: ['Facebook', 'Google'] }
      )).toBe(true);
    });

    it('returns false when array includes value', () => {
      expect(evaluateCondition(
        { field: 'p13', operator: 'notIncludes', value: 'No he tenido...' },
        { p13: ['No he tenido...', 'Facebook'] }
      )).toBe(false);
    });

    it('returns false when answer is not an array', () => {
      expect(evaluateCondition(
        { field: 'p13', operator: 'notIncludes', value: 'test' },
        { p13: 'test' }
      )).toBe(false);
    });
  });

  describe('logic: and', () => {
    it('returns true when all conditions are true', () => {
      expect(evaluateCondition(
        {
          logic: 'and',
          conditions: [
            { field: 'p21', operator: 'equals', value: 'Perú' },
            { field: 'p23', operator: 'oneOf', value: ['En el mismo país', 'Mi actividad se desarrolla'] }
          ]
        },
        { p21: 'Perú', p23: 'En el mismo país' }
      )).toBe(true);
    });

    it('returns false when one condition is false', () => {
      expect(evaluateCondition(
        {
          logic: 'and',
          conditions: [
            { field: 'p21', operator: 'equals', value: 'Perú' },
            { field: 'p23', operator: 'equals', value: 'En el mismo país' }
          ]
        },
        { p21: 'Chile', p23: 'En el mismo país' }
      )).toBe(false);
    });

    it('returns false when all conditions are false', () => {
      expect(evaluateCondition(
        {
          logic: 'and',
          conditions: [
            { field: 'p21', operator: 'equals', value: 'Perú' },
            { field: 'p23', operator: 'equals', value: 'En el mismo país' }
          ]
        },
        { p21: 'Chile', p23: 'Otro' }
      )).toBe(false);
    });
  });

  describe('logic: or', () => {
    it('returns true when at least one condition is true', () => {
      expect(evaluateCondition(
        {
          logic: 'or',
          conditions: [
            { field: 'p16', operator: 'equals', value: 'Sí' },
            { field: 'p16', operator: 'equals', value: 'Tal vez' }
          ]
        },
        { p16: 'Tal vez' }
      )).toBe(true);
    });

    it('returns false when all conditions are false', () => {
      expect(evaluateCondition(
        {
          logic: 'or',
          conditions: [
            { field: 'p16', operator: 'equals', value: 'Sí' },
            { field: 'p16', operator: 'equals', value: 'Tal vez' }
          ]
        },
        { p16: 'No' }
      )).toBe(false);
    });
  });

  describe('nested logic', () => {
    it('handles nested AND inside OR', () => {
      expect(evaluateCondition(
        {
          logic: 'or',
          conditions: [
            {
              logic: 'and',
              conditions: [
                { field: 'p21', operator: 'equals', value: 'Perú' },
                { field: 'p23', operator: 'equals', value: 'En el mismo país' }
              ]
            },
            { field: 'p21', operator: 'equals', value: 'Chile' }
          ]
        },
        { p21: 'Chile', p23: 'Otro' }
      )).toBe(true);
    });
  });

  describe('unknown operator', () => {
    it('returns true for unknown operator', () => {
      expect(evaluateCondition(
        { field: 'p1', operator: 'unknownOp', value: 'x' },
        { p1: 'x' }
      )).toBe(true);
    });
  });
});

// ================================================================
// applyDynamicDefinition()
// ================================================================

describe('applyDynamicDefinition', () => {
  it('returns the same step when no dynamicDefinition', () => {
    const step = { id: 'p1', question: 'Test', type: 'text' };
    const result = applyDynamicDefinition(step, {});
    expect(result).toEqual(step);
  });

  it('applies "then" variant when conditions match (and logic)', () => {
    const step = {
      id: 'p24',
      question: '¿Cómo envías?',
      type: 'text',
      placeholder: 'Escribe aquí...',
      dynamicDefinition: {
        logic: 'and',
        conditions: [
          { field: 'p21', operator: 'equals', value: 'Perú' },
          { field: 'p23', operator: 'equals', value: 'En el mismo país' }
        ],
        then: { type: 'radio', options: [{ label: 'Courier', value: 'Courier' }, { label: 'Otro', value: 'Otro' }], allowOther: true },
        else: { type: 'text', placeholder: 'Escribe aquí...' }
      }
    };

    const result = applyDynamicDefinition(step, { p21: 'Perú', p23: 'En el mismo país' });
    expect(result.type).toBe('radio');
    expect(result.options).toHaveLength(2);
    expect(result.allowOther).toBe(true);
    // Object.assign merges — placeholder from original step persists when not overridden
    expect(result.placeholder).toBe('Escribe aquí...');
  });

  it('applies "else" variant when conditions do not match', () => {
    const step = {
      id: 'p24',
      question: '¿Cómo envías?',
      type: 'text',
      placeholder: 'Escribe aquí...',
      dynamicDefinition: {
        logic: 'and',
        conditions: [
          { field: 'p21', operator: 'equals', value: 'Perú' },
          { field: 'p23', operator: 'equals', value: 'En el mismo país' }
        ],
        then: { type: 'radio', options: [{ label: 'Courier', value: 'Courier' }] },
        else: { type: 'text', placeholder: 'Escribe aquí...' }
      }
    };

    const result = applyDynamicDefinition(step, { p21: 'Chile', p23: 'En el mismo país' });
    expect(result.type).toBe('text');
    expect(result.placeholder).toBe('Escribe aquí...');
    expect(result.options).toBeUndefined();
  });

  it('applies "then" variant with dd.when (equals)', () => {
    const step = {
      id: 'p5',
      question: 'Dynamic radio',
      type: 'text',
      dynamicDefinition: {
        field: 'p4',
        when: { operator: 'equals', value: 'Otro' },
        then: { type: 'radio', options: [{ label: 'A', value: 'A' }] },
        else: { type: 'text' }
      }
    };

    const result = applyDynamicDefinition(step, { p4: 'Otro' });
    expect(result.type).toBe('radio');
  });

  it('applies "else" variant with dd.when (equals)', () => {
    const step = {
      id: 'p5',
      question: 'Dynamic radio',
      type: 'text',
      dynamicDefinition: {
        field: 'p4',
        when: { operator: 'equals', value: 'Otro' },
        then: { type: 'radio', options: [{ label: 'A', value: 'A' }] },
        else: { type: 'textarea' }
      }
    };

    const result = applyDynamicDefinition(step, { p4: 'Sí' });
    expect(result.type).toBe('textarea');
  });

  it('applies "then" variant with dd.when (oneOf)', () => {
    const step = {
      id: 'p5',
      question: 'Dynamic',
      type: 'text',
      dynamicDefinition: {
        field: 'p4',
        when: { operator: 'oneOf', value: ['Sí', 'No'] },
        then: { type: 'radio', options: [{ label: 'Option', value: 'Option' }] },
        else: { type: 'text' }
      }
    };

    const result = applyDynamicDefinition(step, { p4: 'No' });
    expect(result.type).toBe('radio');
  });

  it('preserves original properties not overridden by variant', () => {
    const step = {
      id: 'p24',
      question: '¿Cómo envías?',
      hint: 'Esta pregunta cambia según tu ubicación',
      type: 'text',
      placeholder: 'Escribe aquí...',
      dynamicDefinition: {
        logic: 'and',
        conditions: [
          { field: 'p21', operator: 'equals', value: 'Perú' }
        ],
        then: { type: 'radio', options: [{ label: 'A', value: 'A' }] },
        else: { type: 'text', placeholder: 'Escribe aquí...' }
      }
    };

    const result = applyDynamicDefinition(step, { p21: 'Perú' });
    expect(result.id).toBe('p24');
    expect(result.question).toBe('¿Cómo envías?');
    expect(result.hint).toBe('Esta pregunta cambia según tu ubicación');
    expect(result.type).toBe('radio');
  });
});

// ================================================================
// parseQuestions()
// ================================================================

describe('parseQuestions', () => {
  it('converts string options to {label, value} objects', () => {
    const raw = [
      {
        id: 'p1',
        question: 'Test?',
        type: 'radio',
        options: ['Opción A', 'Opción B'],
        condition: { always: true }
      }
    ];

    const result = parseQuestions(raw, {});
    expect(result[0].options).toEqual([
      { label: 'Opción A', value: 'Opción A' },
      { label: 'Opción B', value: 'Opción B' }
    ]);
  });

  it('preserves object options as-is', () => {
    const raw = [
      {
        id: 'p1',
        question: 'Test?',
        type: 'radio',
        options: [{ label: 'Custom', value: 'custom_val' }],
        condition: { always: true }
      }
    ];

    const result = parseQuestions(raw, {});
    expect(result[0].options).toEqual([
      { label: 'Custom', value: 'custom_val' }
    ]);
  });

  it('handles empty options array', () => {
    const raw = [
      {
        id: 'p1',
        question: 'Text question?',
        type: 'text',
        options: [],
        condition: { always: true }
      }
    ];

    const result = parseQuestions(raw, {});
    expect(result[0].options).toEqual([]);
  });

  it('wraps condition() that evaluates against provided answers', () => {
    const raw = [
      {
        id: 'p2',
        question: 'Conditional?',
        type: 'text',
        condition: { field: 'p1', operator: 'equals', value: 'show' }
      }
    ];

    const result = parseQuestions(raw, {});
    expect(result[0].condition()).toBe(false);

    const result2 = parseQuestions(raw, { p1: 'show' });
    expect(result2[0].condition()).toBe(true);
  });

  it('wraps getDefinition() for dynamic questions', () => {
    const answers = {};
    const raw = [
      {
        id: 'p3',
        question: 'Dynamic?',
        type: 'text',
        condition: { always: true },
        dynamicDefinition: {
          field: 'p2',
          when: { operator: 'equals', value: 'Yes' },
          then: { type: 'radio', options: [{ label: 'A', value: 'A' }] },
          else: { type: 'text' }
        }
      }
    ];

    // Test with matching answers — parse with answers that match "then"
    answers.p2 = 'Yes';
    const resultMatch = parseQuestions(raw, answers);
    const defMatch = resultMatch[0].getDefinition();
    expect(defMatch.type).toBe('radio');

    // Test with non-matching answers — parse with answers that match "else"
    const answers2 = { p2: 'No' };
    const resultNoMatch = parseQuestions(raw, answers2);
    const defNoMatch = resultNoMatch[0].getDefinition();
    expect(defNoMatch.type).toBe('text');
  });

  it('does not add getDefinition for non-dynamic questions', () => {
    const raw = [
      {
        id: 'p1',
        question: 'Static?',
        type: 'text',
        condition: { always: true }
      }
    ];

    const result = parseQuestions(raw, {});
    expect(result[0].getDefinition).toBeUndefined();
  });

  it('removes condition and dynamicDefinition from parsed step', () => {
    const raw = [
      {
        id: 'p1',
        question: 'Test?',
        type: 'text',
        condition: { always: true },
        dynamicDefinition: {
          field: 'p2',
          when: { operator: 'equals', value: 'X' },
          then: { type: 'radio' },
          else: { type: 'text' }
        }
      }
    ];

    const result = parseQuestions(raw, {});
    expect(result[0].condition).toBeDefined();
    expect(result[0].dynamicDefinition).toBeUndefined();
  });

  it('parses compradores.json without error', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const compradoresPath = path.join(process.cwd(), 'config/preguntas/compradores.json');
    const rawQuestions = JSON.parse(fs.readFileSync(compradoresPath, 'utf-8'));
    const result = parseQuestions(rawQuestions, {});
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('p1');
  });

  it('parses vendedores.json without error', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const vendedoresPath = path.join(process.cwd(), 'config/preguntas/vendedores.json');
    const rawQuestions = JSON.parse(fs.readFileSync(vendedoresPath, 'utf-8'));
    const result = parseQuestions(rawQuestions, {});
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('p1');
  });
});
