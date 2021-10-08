"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTransformations = void 0;
const lodash_1 = require("lodash");
function getType(v) {
    return Object.prototype.toString
        .call(v)
        .match(/\[object (.+)\]/)[1]
        .toLowerCase();
}
const transformations = {
    array: {
        each: (array, arg) => {
            return lodash_1.map(array, item => applyTransformations(item, arg));
        },
        map: lodash_1.map,
        keyBy: lodash_1.keyBy,
        chunk: lodash_1.chunk,
        drop: lodash_1.drop,
        dropRight: lodash_1.dropRight,
        take: lodash_1.take,
        takeRight: lodash_1.takeRight,
        flattenDepth: lodash_1.flattenDepth,
        fromPairs: lodash_1.fromPairs,
        nth: lodash_1.nth,
        reverse: lodash_1.reverse,
        uniq: lodash_1.uniq,
        uniqBy: lodash_1.uniqBy,
        countBy: lodash_1.countBy,
        filter: lodash_1.filter,
        reject: lodash_1.reject,
        filterIf: (array, arg) => {
            return lodash_1.filter(array, item => applyTransformations(item, arg));
        },
        rejectIf: (array, arg) => {
            return lodash_1.reject(array, item => applyTransformations(item, arg));
        },
        groupBy: lodash_1.groupBy,
        sortBy: lodash_1.sortBy,
        minBy: lodash_1.minBy,
        maxBy: lodash_1.maxBy,
        meanBy: lodash_1.meanBy,
        sumBy: lodash_1.sumBy,
        join: lodash_1.join,
    },
    object: {
        get: lodash_1.get,
        assign: (src, args) => (Array.isArray(args) ? args : [args]).reduce((obj, path) => {
            const source = lodash_1.get(obj, path);
            if (source && typeof source === 'object') {
                return lodash_1.omit(lodash_1.assign(obj, lodash_1.get(obj, path)), path);
            }
            else {
                return obj;
            }
        }, src),
        mapValues: lodash_1.mapValues,
        at: lodash_1.at,
        toPairs: lodash_1.toPairs,
        invert: lodash_1.invert,
        invertBy: lodash_1.invertBy,
        keys: lodash_1.keys,
        values: lodash_1.values,
    },
    number: {
        lt: lodash_1.lt,
        lte: lodash_1.lte,
        gt: lodash_1.gt,
        gte: lodash_1.gte,
        eq: lodash_1.eq,
    },
    string: {
        startsWith: lodash_1.startsWith,
        endsWith: lodash_1.endsWith,
        match: (src, args) => {
            return src.match(new RegExp(args.match, args.flags));
        },
        isMatch: (src, args) => {
            return new RegExp(args.match, args.flags).test(src);
        },
        toJSON: (str) => {
            return JSON.parse(str);
        },
    },
    '*': {
        stringify: (src) => {
            return JSON.stringify(src);
        },
        trim: (src) => {
            if (typeof src === 'string') {
                return src.trim();
            }
            else {
                if (typeof src === 'function') {
                    return (...args) => {
                        const result = src(...args);
                        if (typeof result === 'string') {
                            return result.trim();
                        }
                        else {
                            return result;
                        }
                    };
                }
                else {
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
            }
            else {
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
            lodash_1.unset(obj, key);
            lodash_1.set(obj, args, src);
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
function applyTransformations(object, args) {
    if (!args || object === null || object === undefined) {
        return object;
    }
    for (const op in args) {
        if (typeof args === 'object' && typeof args[op] !== undefined) {
            const arg = args[op];
            if (op === 'and') {
                object = lodash_1.every(arg, predicateArgs => applyTransformations(object, predicateArgs));
                continue;
            }
            if (op === 'or') {
                object = lodash_1.some(arg, predicateArgs => applyTransformations(object, predicateArgs));
                continue;
            }
            const expectedType = opToExpectedType[op];
            if (!(object === undefined || object === null)) {
                let type = getType(object);
                if (expectedType !== '*' &&
                    expectedType !== type &&
                    type !== undefined) {
                    throw Error(`"${op}" transformation expect "${expectedType}" but got "${type}"`);
                }
            }
            object = transformations[expectedType][op](object, arg);
        }
    }
    return object === undefined ? null : object;
}
exports.applyTransformations = applyTransformations;
//# sourceMappingURL=transformations.js.map