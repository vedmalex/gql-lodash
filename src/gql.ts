import { DocumentNode, Kind, parse, visit, getOperationAST } from 'graphql';

import { argumentsObjectFromField } from 'apollo-utilities';
import { each } from 'lodash';
import { get } from 'lodash';
import { isEqual } from 'lodash';
import { keyBy } from 'lodash';
import { set } from 'lodash';

import { lodashAST } from './lodashSchema';
import { applyTransformations } from './transformations';

export function graphqlLodash(
  query: string | DocumentNode,
  operationName?: string,
) {
  const pathToArgs = {};
  const reshape = {};
  const queryAST = typeof query === 'string' ? parse(query) : query;
  traverseOperationFields(
    queryAST,
    operationName,
    (node, resultPath, alias) => {
      let args = getLodashDirectiveArgs(node, lodashAST());
      if (args === null) {
        return;
      }

      // TODO: error if transformation applied on field that already
      // seen without any transformation
      const argsSetPath = [...resultPath, '@_'];
      const previousArgsValue = get(pathToArgs, argsSetPath, null);
      if (previousArgsValue !== null && !isEqual(previousArgsValue, args)) {
        throw Error(
          `Different "@_" args for the "${resultPath.join('.')}" path`,
        );
      }
      set(pathToArgs, argsSetPath, args);
      set(reshape, [...resultPath, '_@'], alias[resultPath.length - 1]);
    },
  );
  return {
    apply: !!Object.keys(pathToArgs).length,
    query: stripQuery(queryAST),
    transform: data => applyLodashDirective(pathToArgs, data),
    queryShape: pathToArgs,
    reshape,
  };
}

function traverseOperationFields(queryAST, operationName, cb) {
  const fragments = {};
  const operationAST = getOperationAST(queryAST, operationName);
  if (!operationAST) {
    throw new Error(
      'Must provide operation name if query contains multiple operations.',
    );
  }

  queryAST.definitions.forEach(definition => {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    }
  });

  const resultPath = [];
  const alias = [];
  cb(operationAST, resultPath, alias);
  traverse(operationAST);

  function traverse(root) {
    visit(root, {
      enter(node) {
        if (node.kind === Kind.FIELD) {
          resultPath.push((node.alias || node.name).value);
          alias.push({ [(node.alias || node.name).value]: node.name.value });
        }

        if (node.kind === Kind.FRAGMENT_SPREAD) {
          const fragmentName = node.name.value;
          const fragment = fragments[fragmentName];
          if (!fragment) {
            throw Error(`Unknown fragment: ${fragmentName}`);
          }
          traverse(fragment);
        }
      },
      leave(node) {
        if (node.kind !== Kind.FIELD) {
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
  const args = argumentsObjectFromField(lodashNode, lodashDirectiveDef);
  return normalizeLodashArgs(lodashNode.arguments, args);
}

function normalizeLodashArgs(argNodes, args) {
  if (!argNodes) {
    return args;
  }

  //Restore order of arguments
  argNodes = keyBy(argNodes, argNode => argNode.name.value);
  const orderedArgs = {};
  each(argNodes, (node, name) => {
    const argValue = args[name];

    if (node.value.kind === 'ObjectValue') {
      orderedArgs[name] = normalizeLodashArgs(node.value.fields, argValue);
    } else if (node.value.kind === 'ListValue') {
      const nodeValues = node.value.values;
      orderedArgs[name] = [];
      for (let i = 0; i < nodeValues.length; ++i) {
        orderedArgs[name][i] = normalizeLodashArgs(
          nodeValues[i].fields,
          argValue[i],
        );
      }
    } else if (node.value.kind === 'EnumValue' && node.value.value === 'none') {
      orderedArgs[name] = undefined;
    } else {
      orderedArgs[name] = argValue;
    }
  });
  return orderedArgs;
}

function stripQuery(queryAST): DocumentNode {
  return visit(queryAST, {
    [Kind.DIRECTIVE]: node => {
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
    // if (root === null || root === undefined) {
    //   return null;
    // }
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

        let changedValue = traverse(get(root, key), get(pathRoot, key));
        // if (changedValue === null || changedValue === undefined){
        //   continue;
        // }

        const lodashArgs = get(pathRoot, [key, '@_'].join('.'));
        changedValue = applyLodashArgs(currentPath, changedValue, lodashArgs);
        if (typeof changedValue === 'function') {
          changedValue(changedObject, key);
        } else {
          set(changedObject, key, changedValue);
        }
        currentPath.pop();
      }
      return changedObject;
    } else {
      return root;
    }
  }
}

function applyLodashArgs(path, object, args) {
  try {
    return applyTransformations(object, args);
  } catch (e) {
    // FIXME:
    // tslint:disable-next-line:no-console
    console.log(path);
    throw e;
  }
}
