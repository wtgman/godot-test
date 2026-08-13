/**
 * The spec is the contract between whoever analyses the content (a person, or
 * an LLM following the skill) and the renderers.
 *
 * It is deliberately small and declarative. Everything a visual needs comes
 * from the spec, including the material used to build the text equivalent, so
 * the picture and its description can never drift apart.
 *
 * Validation is strict and the messages are written to be read by whoever
 * authored the spec. A wrong spec should say what to fix, not throw a
 * TypeError three files later.
 */

export const VISUAL_TYPES = [
  'timeline',
  'process',
  'cycle',
  'gantt',
  'comparison',
  'hierarchy',
  'chart',
  'labelled',
  'stat',
  'waffle',
  'sequencer',
  'simulation',
];

/** Types that render to an interactive HTML page rather than a static image. */
export const INTERACTIVE_TYPES = new Set(['sequencer', 'simulation']);

class SpecError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SpecError';
  }
}

const fail = (path, message) => {
  throw new SpecError(`${path}: ${message}`);
};

function str(value, path, { required = true, max = 400 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(path, 'is required and must be a non-empty string');
    return undefined;
  }
  if (typeof value !== 'string') fail(path, `must be a string, got ${typeof value}`);
  if (value.length > max) fail(path, `must be ${max} characters or fewer (got ${value.length})`);
  return value;
}

function num(value, path, { required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) fail(path, 'is required and must be a number');
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, `must be a finite number, got ${JSON.stringify(value)}`);
  }
  return value;
}

function arr(value, path, { min = 1, max = 40 } = {}) {
  if (!Array.isArray(value)) fail(path, `must be an array, got ${typeof value}`);
  if (value.length < min) fail(path, `needs at least ${min} item${min === 1 ? '' : 's'}`);
  if (value.length > max) {
    fail(path, `has ${value.length} items, which is more than ${max}. A visual carrying more than ${max} items stops teaching and starts listing. Split it into two.`);
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* Per-type validation                                                 */
/* ------------------------------------------------------------------ */

const validators = {
  /** Dated events along an axis. Instagram's rise, the history of a policy. */
  timeline(s) {
    arr(s.events, 'events', { min: 2, max: 14 }).forEach((e, i) => {
      str(e.date, `events[${i}].date`, { max: 40 });
      str(e.label, `events[${i}].label`, { max: 90 });
      str(e.detail, `events[${i}].detail`, { required: false, max: 300 });
      if (e.emphasis !== undefined && typeof e.emphasis !== 'boolean') {
        fail(`events[${i}].emphasis`, 'must be true or false');
      }
    });
  },

  /** Ordered steps with a start and an end. A procedure, a method. */
  process(s) {
    arr(s.steps, 'steps', { min: 2, max: 10 }).forEach((st, i) => {
      str(st.label, `steps[${i}].label`, { max: 80 });
      str(st.detail, `steps[${i}].detail`, { required: false, max: 300 });
    });
  },

  /** A loop with no start or end. PDCA, the water cycle, a feedback loop. */
  cycle(s) {
    arr(s.stages, 'stages', { min: 3, max: 8 }).forEach((st, i) => {
      str(st.label, `stages[${i}].label`, { max: 60 });
      str(st.detail, `stages[${i}].detail`, { required: false, max: 240 });
    });
  },

  /**
   * Tasks placed on a shared time axis, possibly overlapping.
   * This is the one that answers "what goes in the pot when" and
   * "what runs in parallel on this project".
   */
  gantt(s) {
    str(s.timeUnit, 'timeUnit', { max: 30 });
    arr(s.tasks, 'tasks', { min: 2, max: 20 }).forEach((t, i) => {
      str(t.label, `tasks[${i}].label`, { max: 70 });
      num(t.start, `tasks[${i}].start`);
      num(t.duration, `tasks[${i}].duration`);
      if (t.duration <= 0) fail(`tasks[${i}].duration`, 'must be greater than zero');
      if (t.start < 0) fail(`tasks[${i}].start`, 'must be zero or greater');
      str(t.track, `tasks[${i}].track`, { required: false, max: 60 });
      str(t.note, `tasks[${i}].note`, { required: false, max: 200 });
    });
    if (s.milestones !== undefined) {
      arr(s.milestones, 'milestones', { min: 0, max: 10 }).forEach((m, i) => {
        num(m.at, `milestones[${i}].at`);
        str(m.label, `milestones[${i}].label`, { max: 60 });
      });
    }
  },

  /** Items scored against shared criteria. */
  comparison(s) {
    const criteria = arr(s.criteria, 'criteria', { min: 2, max: 8 });
    criteria.forEach((c, i) => str(c, `criteria[${i}]`, { max: 60 }));
    arr(s.items, 'items', { min: 2, max: 6 }).forEach((it, i) => {
      str(it.label, `items[${i}].label`, { max: 60 });
      const values = arr(it.values, `items[${i}].values`, { min: 1, max: 8 });
      if (values.length !== criteria.length) {
        fail(`items[${i}].values`, `has ${values.length} values but there are ${criteria.length} criteria. Every item needs one value per criterion, in the same order.`);
      }
      values.forEach((v, j) => str(String(v), `items[${i}].values[${j}]`, { max: 90 }));
    });
  },

  /** A tree. Org structure, taxonomy, breakdown of a whole into parts. */
  hierarchy(s) {
    let count = 0;
    const walk = (node, path, depth) => {
      if (depth > 4) fail(path, 'is more than four levels deep. Flatten it or split the diagram.');
      str(node.label, `${path}.label`, { max: 70 });
      count += 1;
      if (count > 30) fail('root', 'has more than 30 nodes in total. Split it.');
      if (node.children !== undefined) {
        arr(node.children, `${path}.children`, { min: 1, max: 8 })
          .forEach((c, i) => walk(c, `${path}.children[${i}]`, depth + 1));
      }
    };
    if (!s.root || typeof s.root !== 'object') fail('root', 'is required and must be an object with a label');
    walk(s.root, 'root', 1);
  },

  /** Quantities. Bar or line. */
  chart(s) {
    const mode = str(s.mode, 'mode', { max: 10 });
    if (!['bar', 'line'].includes(mode)) fail('mode', "must be 'bar' or 'line'");
    str(s.xLabel, 'xLabel', { required: false, max: 60 });
    str(s.yLabel, 'yLabel', { required: false, max: 60 });
    const categories = arr(s.categories, 'categories', { min: 2, max: 24 });
    categories.forEach((c, i) => str(String(c), `categories[${i}]`, { max: 40 }));
    arr(s.series, 'series', { min: 1, max: 5 }).forEach((se, i) => {
      str(se.label, `series[${i}].label`, { max: 60 });
      const values = arr(se.values, `series[${i}].values`, { min: 1, max: 24 });
      if (values.length !== categories.length) {
        fail(`series[${i}].values`, `has ${values.length} values but there are ${categories.length} categories.`);
      }
      values.forEach((v, j) => num(v, `series[${i}].values[${j}]`));
    });
  },

  /** A picture of a thing with its parts named. Anatomy, equipment, an interface. */
  labelled(s) {
    str(s.subject, 'subject', { max: 90 });
    arr(s.parts, 'parts', { min: 2, max: 12 }).forEach((p, i) => {
      str(p.label, `parts[${i}].label`, { max: 60 });
      str(p.detail, `parts[${i}].detail`, { required: false, max: 240 });
      num(p.x, `parts[${i}].x`);
      num(p.y, `parts[${i}].y`);
      if (p.x < 0 || p.x > 100) fail(`parts[${i}].x`, 'must be between 0 and 100 (percent of the image width)');
      if (p.y < 0 || p.y > 100) fail(`parts[${i}].y`, 'must be between 0 and 100 (percent of the image height)');
    });
    str(s.image, 'image', { required: false, max: 500 });
  },

  /**
   * A panel of big-number callouts. The infographic register.
   *
   * `value` is a string, not a number, so "1 billion", "68%", "1 in 4" and
   * "under 30 seconds" all work. The toolkit never computes these: whoever
   * writes the spec supplies the figure and is accountable for it.
   */
  stat(s) {
    arr(s.stats, 'stats', { min: 2, max: 6 }).forEach((st, i) => {
      str(st.value, `stats[${i}].value`, { max: 20 });
      str(st.label, `stats[${i}].label`, { max: 90 });
      str(st.detail, `stats[${i}].detail`, { required: false, max: 220 });
    });
  },

  /**
   * Part to whole, drawn as a grid of countable squares.
   *
   * A pictogram rather than a pie, because a learner can count squares and
   * cannot reliably compare the angles of a pie. It also degrades to a text
   * equivalent honestly: "50 of 100 squares" means something, "a wedge of
   * about half" does not.
   */
  waffle(s) {
    str(s.unitLabel, 'unitLabel', { max: 40 });
    const total = num(s.total, 'total');
    if (total <= 0) fail('total', 'must be greater than zero');
    if (!Number.isInteger(total)) fail('total', 'must be a whole number, because each square is one unit');
    if (total > 400) fail('total', 'is more than 400, which is more squares than anyone will count. Scale the figures down, for example to a percentage.');

    let sum = 0;
    arr(s.categories, 'categories', { min: 2, max: 6 }).forEach((c, i) => {
      str(c.label, `categories[${i}].label`, { max: 70 });
      const v = num(c.value, `categories[${i}].value`);
      if (v <= 0) fail(`categories[${i}].value`, 'must be greater than zero');
      if (!Number.isInteger(v)) fail(`categories[${i}].value`, 'must be a whole number, because each square is one unit');
      str(c.detail, `categories[${i}].detail`, { required: false, max: 200 });
      sum += v;
    });

    if (sum > total) {
      fail('categories', `add up to ${sum}, which is more than the total of ${total}. A part cannot be bigger than the whole.`);
    }
  },

  /**
   * Interactive staging exercise. The learner places items on a timeline and
   * checks their answer against the model order.
   * This is the recipe-into-the-pot and the project-schedule tool.
   */
  sequencer(s) {
    str(s.timeUnit, 'timeUnit', { max: 30 });
    str(s.prompt, 'prompt', { max: 300 });
    arr(s.items, 'items', { min: 3, max: 14 }).forEach((it, i) => {
      str(it.label, `items[${i}].label`, { max: 70 });
      num(it.at, `items[${i}].at`);
      str(it.because, `items[${i}].because`, { max: 300 });
      num(it.tolerance, `items[${i}].tolerance`, { required: false });
    });
  },

  /**
   * Interactive model with tunable parameters. Orbital mechanics, compound
   * interest, queueing, staffing levels.
   */
  simulation(s) {
    const model = str(s.model, 'model', { max: 40 });
    if (!['orbit', 'growth'].includes(model)) {
      fail('model', "must be 'orbit' or 'growth'. These are the two simulation engines the toolkit ships.");
    }
    arr(s.parameters, 'parameters', { min: 1, max: 6 }).forEach((p, i) => {
      str(p.key, `parameters[${i}].key`, { max: 40 });
      str(p.label, `parameters[${i}].label`, { max: 60 });
      num(p.min, `parameters[${i}].min`);
      num(p.max, `parameters[${i}].max`);
      num(p.value, `parameters[${i}].value`);
      if (p.min >= p.max) fail(`parameters[${i}]`, 'min must be less than max');
      if (p.value < p.min || p.value > p.max) {
        fail(`parameters[${i}].value`, `must sit between min (${p.min}) and max (${p.max})`);
      }
      str(p.unit, `parameters[${i}].unit`, { required: false, max: 20 });
    });
    if (s.bodies !== undefined) {
      arr(s.bodies, 'bodies', { min: 1, max: 6 }).forEach((b, i) => {
        str(b.label, `bodies[${i}].label`, { max: 40 });
        num(b.distance, `bodies[${i}].distance`);
        num(b.radius, `bodies[${i}].radius`);
      });
    }
  },
};

/**
 * Validate and normalise a spec. Returns a frozen copy.
 * Throws SpecError with an actionable message on anything wrong.
 */
export function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('spec', 'must be a JSON object');
  }

  const type = str(raw.type, 'type', { max: 30 });
  if (!VISUAL_TYPES.includes(type)) {
    fail('type', `is "${type}", which is not a visual type. Choose one of: ${VISUAL_TYPES.join(', ')}`);
  }

  str(raw.title, 'title', { max: 120 });

  // `intent` is what makes this a learning object rather than a picture. It is
  // required, and the renderers print it, so a spec cannot quietly skip the
  // question of what the learner is meant to get out of the visual.
  str(raw.intent, 'intent', { max: 300 });

  str(raw.subtitle, 'subtitle', { required: false, max: 200 });
  str(raw.source, 'source', { required: false, max: 300 });
  str(raw.caption, 'caption', { required: false, max: 400 });

  validators[type](raw);

  return Object.freeze(structuredClone(raw));
}

export { SpecError };
