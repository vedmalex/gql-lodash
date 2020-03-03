import graphql from 'graphql-anywhere';

import { graphqlLodash } from './gql';

export function filter(doc, data) {
  const resolver = (
    fieldName: string,
    root: any,
    args: any,
    context: any,
    info: any,
  ) => {
    if (root.hasOwnProperty(fieldName)) {
      return root[fieldName];
    } else {
      return root[info.resultKey];
    }
  };

  return graphql(resolver, doc, data);
}

export default function reshape(doc, data) {
  const { transform, apply } = graphqlLodash(doc);
  const result = filter(doc, data);
  if (apply) {
    return transform(result);
  }
  return result;
}
