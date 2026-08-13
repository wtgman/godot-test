/**
 * Validation primitives, shared by the spec validator and the proposal
 * validator.
 *
 * Every message here is written for whoever authored the JSON, usually a
 * language model following the skill. A message that says what to fix produces
 * a correct second attempt. One that says "invalid input" produces a guess.
 */

export class SpecError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SpecError';
  }
}

export const fail = (path, message) => {
  throw new SpecError(`${path}: ${message}`);
};

export function str(value, path, { required = true, max = 400 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(path, 'is required and must be a non-empty string');
    return undefined;
  }
  if (typeof value !== 'string') fail(path, `must be a string, got ${typeof value}`);
  if (value.length > max) fail(path, `must be ${max} characters or fewer (got ${value.length})`);
  return value;
}

export function num(value, path, { required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) fail(path, 'is required and must be a number');
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, `must be a finite number, got ${JSON.stringify(value)}`);
  }
  return value;
}

export function arr(value, path, { min = 1, max = 40, overMessage } = {}) {
  if (!Array.isArray(value)) fail(path, `must be an array, got ${typeof value}`);
  if (value.length < min) fail(path, `needs at least ${min} item${min === 1 ? '' : 's'}`);
  if (value.length > max) {
    fail(path, overMessage
      ? overMessage(value.length)
      : `has ${value.length} items, which is more than ${max}. A visual carrying more than ${max} items stops teaching and starts listing. Split it into two.`);
  }
  return value;
}

/** Value must be one of `allowed`, and the message names them all. */
export function oneOf(value, path, allowed, { what = 'value' } = {}) {
  if (!allowed.includes(value)) {
    fail(path, `is ${JSON.stringify(value)}, which is not a valid ${what}. Choose one of: ${allowed.join(', ')}`);
  }
  return value;
}

export function bool(value, path, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) fail(path, 'is required and must be true or false');
    return undefined;
  }
  if (typeof value !== 'boolean') fail(path, 'must be true or false');
  return value;
}
