import {
  every,
  some,
  startsWith,
  endsWith,
  lt,
  lte,
  gt,
  gte,
  eq,
  map,
  keyBy,
  chunk,
  drop,
  dropRight,
  take,
  takeRight,
  flattenDepth,
  fromPairs,
  nth,
  reverse,
  uniq,
  uniqBy,
  countBy,
  filter,
  reject,
  groupBy,
  sortBy,
  minBy,
  maxBy,
  meanBy,
  sumBy,
  join,
  get,
  set,
  unset,
  assign,
  mapValues,
  at,
  toPairs,
  invert,
  invertBy,
  keys,
  values,
  omit,
} from 'lodash';

function getType(v): String {
  return Object.prototype.toString
    .call(v)
    .match(/\[object (.+)\]/)[1]
    .toLowerCase();
}

const transformations = {
  array: {
    each: (array, arg) => {
      return map(array, item => applyTransformations(item, arg));
    },
    map,
    keyBy,
    chunk,
    drop,
    dropRight,
    take,
    takeRight,
    flattenDepth,
    fromPairs,
    nth,
    reverse,
    uniq,
    uniqBy,
    countBy,
    filter,
    reject,
    filterIf: (array, arg) => {
      return filter(array, item => applyTransformations(item, arg));
    },
    rejectIf: (array, arg) => {
      return reject(array, item => applyTransformations(item, arg));
    },
    groupBy,
    sortBy,
    minBy,
    maxBy,
    meanBy,
    sumBy,
    join,
  },
  object: {
    get,
    assign: (src, args) =>
      (Array.isArray(args) ? args : [args]).reduce((obj, path) => {
        const source = get(obj, path);
        if (source && typeof source === 'object') {
          return omit(assign(obj, get(obj, path)), path);
        } else {
          return obj;
        }
      }, src),
    mapValues,
    at,
    toPairs,
    invert,
    invertBy,
    keys,
    values,
  },
  number: {
    lt,
    lte,
    gt,
    gte,
    eq,
  },
  string: {
    startsWith,
    endsWith,
    match: (src: string, args) => {
      return src.match(new RegExp(args.match, args.flags));
    },
    isMatch: (src: string, args) => {
      return new RegExp(args.match, args.flags).test(src);
    },
    toJSON: (str: string) => {
      return JSON.parse(str);
    },
  },
  '*': {
    stringify: (src: any) => {
      return JSON.stringify(src);
    },
    trim: (src: string | any) => {
      if (typeof src === 'string') {
        return src.trim();
      } else {
        if (typeof src === 'function') {
          return (...args) => {
            const result = src(...args);
            if (typeof result === 'string') {
              return result.trim();
            } else {
              return result;
            }
          };
        } else {
          return src;
        }
      }
    },
    convert: (obj, type) => {
      if (obj !== null || obj !== undefined) {
        switch (type) {
          case 'toNumber':
            return parseFloat(obj);
          case 'toString':
            return obj.toString();
          default:
        }
      } else {
        switch (type) {
          case 'toNumber':
            return NaN;
          case 'toString':
            return '';
          default:
        }
      }
    },
    dive: (src, args) => (obj, key) => {
      unset(obj, key);
      set(obj, args, src);
    },
  },
};

const opToExpectedType = (trans => {
  let result = {};
  for (const type in trans) {
    if (typeof trans === 'object' && typeof trans[type] !== undefined) {
      const names = trans[type];
      for (const name in names) {
        if (typeof names === 'object' && typeof names[name] !== undefined) {
          result[name] = type;
        }
      }
    }
  }
  return result;
})(transformations);

export function applyTransformations(object, args) {
  if (!args || object === null || object === undefined) {
    return object;
  }

  for (const op in args) {
    if (typeof args === 'object' && typeof args[op] !== undefined) {
      // if (object === null)
      //   break;

      const arg = args[op];

      if (op === 'and') {
        object = every(arg, predicateArgs =>
          applyTransformations(object, predicateArgs),
        );
        continue;
      }
      if (op === 'or') {
        object = some(arg, predicateArgs =>
          applyTransformations(object, predicateArgs),
        );
        continue;
      }

      const expectedType = opToExpectedType[op];

      if (!(object === undefined || object === null)) {
        let type = getType(object);
        if (
          expectedType !== '*' &&
          expectedType !== type &&
          type !== undefined
        ) {
          throw Error(
            `"${op}" transformation expect "${expectedType}" but got "${type}"`,
          );
        }
      }

      object = transformations[expectedType][op](object, arg);
      // if (object === null || object === undefined) return object;
    }
  }
  return object === undefined ? null : object;
}
