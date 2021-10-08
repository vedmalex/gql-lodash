"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphqlLodash = void 0;
const graphql_1 = require("graphql");
const apollo_utilities_1 = require("apollo-utilities");
const lodash_1 = require("lodash");
const lodash_2 = require("lodash");
const lodash_3 = require("lodash");
const lodash_4 = require("lodash");
const lodash_5 = require("lodash");
const lodashSchema_1 = require("./lodashSchema");
const transformations_1 = require("./transformations");
function graphqlLodash(query, operationName) {
    const pathToArgs = {};
    const reshape = {};
    const queryAST = typeof query === 'string' ? graphql_1.parse(query) : query;
    traverseOperationFields(queryAST, operationName, (node, resultPath, alias) => {
        let args = getLodashDirectiveArgs(node, lodashSchema_1.lodashAST());
        if (args === null) {
            return;
        }
        const argsSetPath = [...resultPath, '@_'];
        const previousArgsValue = lodash_2.get(pathToArgs, argsSetPath, null);
        if (previousArgsValue !== null && !lodash_3.isEqual(previousArgsValue, args)) {
            throw Error(`Different "@_" args for the "${resultPath.join('.')}" path`);
        }
        lodash_5.set(pathToArgs, argsSetPath, args);
        lodash_5.set(reshape, [...resultPath, '_@'], alias[resultPath.length - 1]);
    });
    return {
        apply: !!Object.keys(pathToArgs).length,
        query: stripQuery(queryAST),
        transform: data => applyLodashDirective(pathToArgs, data),
        queryShape: pathToArgs,
        reshape,
    };
}
exports.graphqlLodash = graphqlLodash;
function traverseOperationFields(queryAST, operationName, cb) {
    const fragments = {};
    const operationAST = graphql_1.getOperationAST(queryAST, operationName);
    if (!operationAST) {
        throw new Error('Must provide operation name if query contains multiple operations.');
    }
    queryAST.definitions.forEach(definition => {
        if (definition.kind === graphql_1.Kind.FRAGMENT_DEFINITION) {
            fragments[definition.name.value] = definition;
        }
    });
    const resultPath = [];
    const alias = [];
    cb(operationAST, resultPath, alias);
    traverse(operationAST);
    function traverse(root) {
        graphql_1.visit(root, {
            enter(node) {
                if (node.kind === graphql_1.Kind.FIELD) {
                    resultPath.push((node.alias || node.name).value);
                    alias.push({ [(node.alias || node.name).value]: node.name.value });
                }
                if (node.kind === graphql_1.Kind.FRAGMENT_SPREAD) {
                    const fragmentName = node.name.value;
                    const fragment = fragments[fragmentName];
                    if (!fragment) {
                        throw Error(`Unknown fragment: ${fragmentName}`);
                    }
                    traverse(fragment);
                }
            },
            leave(node) {
                if (node.kind !== graphql_1.Kind.FIELD) {
                    return;
                }
                cb(node, resultPath, alias);
                resultPath.pop();
                alias.pop();
            },
        });
    }
}
function getLodashDirectiveArgs(node, lodashDirectiveDef) {
    let lodashNode = null;
    for (let directive of node.directives) {
        if (directive.name.value !== lodashDirectiveDef.name) {
            continue;
        }
        if (lodashNode) {
            throw Error(`Duplicating "@_" on the "${node.name.value}"`);
        }
        lodashNode = directive;
    }
    if (lodashNode === null) {
        return null;
    }
    const args = apollo_utilities_1.argumentsObjectFromField(lodashNode, lodashDirectiveDef);
    return normalizeLodashArgs(lodashNode.arguments, args);
}
function normalizeLodashArgs(argNodes, args) {
    if (!argNodes) {
        return args;
    }
    argNodes = lodash_4.keyBy(argNodes, argNode => argNode.name.value);
    const orderedArgs = {};
    lodash_1.each(argNodes, (node, name) => {
        const argValue = args[name];
        if (node.value.kind === 'ObjectValue') {
            orderedArgs[name] = normalizeLodashArgs(node.value.fields, argValue);
        }
        else if (node.value.kind === 'ListValue') {
            const nodeValues = node.value.values;
            orderedArgs[name] = [];
            for (let i = 0; i < nodeValues.length; ++i) {
                orderedArgs[name][i] = normalizeLodashArgs(nodeValues[i].fields, argValue[i]);
            }
        }
        else if (node.value.kind === 'EnumValue' && node.value.value === 'none') {
            orderedArgs[name] = undefined;
        }
        else {
            orderedArgs[name] = argValue;
        }
    });
    return orderedArgs;
}
function stripQuery(queryAST) {
    return graphql_1.visit(queryAST, {
        [graphql_1.Kind.DIRECTIVE]: node => {
            if (node.name.value === '_') {
                return null;
            }
        },
    });
}
function applyLodashDirective(pathToArgs, data) {
    if (data === null) {
        return null;
    }
    const changedData = applyOnPath(data, pathToArgs);
    return applyLodashArgs([], changedData, pathToArgs['@_']);
}
function applyOnPath(result, pathToArgs) {
    const currentPath = [];
    return traverse(result, pathToArgs);
    function traverse(root, pathRoot) {
        if (Array.isArray(root)) {
            return root.map(item => traverse(item, pathRoot));
        }
        if (typeof root === 'object') {
            const changedObject = root ? Object.assign({}, root) : root;
            for (const key in pathRoot) {
                if (key === '@_') {
                    continue;
                }
                currentPath.push(key);
                let changedValue = traverse(lodash_2.get(root, key), lodash_2.get(pathRoot, key));
                const lodashArgs = lodash_2.get(pathRoot, [key, '@_'].join('.'));
                changedValue = applyLodashArgs(currentPath, changedValue, lodashArgs);
                if (typeof changedValue === 'function') {
                    changedValue(changedObject, key);
                }
                else {
                    lodash_5.set(changedObject, key, changedValue);
                }
                currentPath.pop();
            }
            return changedObject;
        }
        else {
            return root;
        }
    }
}
function applyLodashArgs(path, object, args) {
    try {
        return transformations_1.applyTransformations(object, args);
    }
    catch (e) {
        console.log(path);
        throw e;
    }
}
//# sourceMappingURL=gql.js.map