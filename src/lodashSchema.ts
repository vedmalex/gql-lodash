// tslint:disable:variable-name
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Scalar, Input, Directive, Enum, Schema } from 'gql-schema-builder';
import gql from 'graphql-tag';

import { Kind, StringValueNode } from 'graphql';

const lodashProps = `
map: Path
keyBy: Path
each: LodashOperations
trim: DummyArgument
stringify: DummyArgument
toJSON: DummyArgument

# Creates an array of elements split into groups the length of size.
# If array can't be split evenly, the final chunk will be the remaining elements.
chunk: Int

# Creates a slice of array with n elements dropped from the beginning.
drop: Int

# Creates a slice of array with n elements dropped from the end.
dropRight: Int

# Creates a slice of array with n elements taken from the beginning.
take: Int

# Creates a slice of array with n elements taken from the end.
takeRight: Int

# Recursively flatten array up to depth times.
flattenDepth: Int

# The inverse of \`toPairs\`; this method returns an object composed from key-value
# pairs.
fromPairs: DummyArgument

# Gets the element at index n of array. If n is negative, the nth element from
# the end is returned.
nth: Int

# Reverses array so that the first element becomes the last, the second element
# becomes the second to last, and so on.
reverse: DummyArgument

# Creates a duplicate-free version of an array, in which only the first occurrence
# of each element is kept. The order of result values is determined by the order
# they occur in the array.
uniq: DummyArgument

uniqBy: Path

countBy: Path
filter: JSONType
reject: JSONType
filterIf: Predicate
rejectIf: Predicate
groupBy: Path
sortBy: [Path!]
match: RegExpr
isMatch: RegExpr

minBy: Path
maxBy: Path
meanBy: Path
sumBy: Path

# Converts all elements in array into a string separated by separator.
join: String

get: Path
# push selected item down to the specified path
dive: Path
# get all fields of specified path to current object
assign: [Path!]
mapValues: Path

convert: ConvertTypeArgument

# Creates an array of values corresponding to paths of object.
at: [Path!]
# Creates an array of own enumerable string keyed-value pairs for object.
toPairs: DummyArgument

# Creates an object composed of the inverted keys and values of object.
# If object contains duplicate values, subsequent values overwrite property
# assignments of previous values.
invert: DummyArgument

invertBy: Path
# Creates an array of the own enumerable property names of object.
keys: DummyArgument
# Creates an array of the own enumerable string keyed property values of object.
values: DummyArgument
`;

export const Path = new Scalar({
  schema: gql`
    scalar Path
  `,
  resolver: {
    serialize: String,
    parseValue: String,
    parseLiteral: x => (x as StringValueNode).value,
  },
});

export const RegularExpression = new Input({
  schema: gql`
    input RegExpr {
      match: String!
      flags: String
    }
  `,
});

export const Predicate = new Input({
  schema: gql`
    input Predicate {
      lt: JSONType
      lte: JSONType
      gt: JSONType
      gte: JSONType
      eq: JSONType
      startsWith: String
      endsWith: String
      and: [Predicate!]
      or: [Predicate!]
      ${lodashProps}
    }
  `,
});

export const Directives = new Directive({
  schema: gql`
    directive @_(
      ${lodashProps}
    ) on FIELD | QUERY
  `,
});

export const LodashOperations = new Input({
  schema: gql`
    input LodashOperations {
      ${lodashProps}
    }
  `,
});

export const DummyArgument = new Enum({
  schema: gql`
    enum DummyArgument {
      none
    }
  `,
});

export const ConvertTypeArgument = new Enum({
  schema: gql`
    enum ConvertTypeArgument {
      toNumber
      toString
    }
  `,
});

const JSONType = new Scalar({
  schema: gql`
    scalar JSONType
  `,
  resolver: {
    serialize: identity,
    parseValue: identity,
    parseLiteral: parseLiteral,
  },
});

function identity(value) {
  return value;
}

function parseLiteral(ast) {
  let result;
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      result = ast.value;
      break;
    case Kind.INT:
    case Kind.FLOAT:
      result = parseFloat(ast.value);
      break;
    case Kind.OBJECT:
      const value = Object.create(null);
      ast.fields.forEach(field => {
        value[field.name.value] = parseLiteral(field.value);
      });
      result = value;
      break;
    case Kind.LIST:
      result = ast.values.map(parseLiteral);
      break;
    default:
      result = null;
      break;
  }
  return result;
}

const LodashSchema = new Schema({
  name: 'LodashSchema',
  items: [
    Path,
    RegularExpression,
    Predicate,
    Directives,
    LodashOperations,
    DummyArgument,
    ConvertTypeArgument,
    JSONType,
  ],
});

export default LodashSchema;

let _lodashAST;

export function lodashAST() {
  if (!_lodashAST) {
    let current = LodashSchema;
    LodashSchema.build();
    LodashSchema.fixSchema();
    let schema = makeExecutableSchema({
      typeDefs: current.schema,
      resolvers: current.resolvers,
      resolverValidationOptions: {
        requireResolversForNonScalar: 'ignore',
      },
    });
    _lodashAST = schema.getDirective('_');
  }
  return _lodashAST;
}
