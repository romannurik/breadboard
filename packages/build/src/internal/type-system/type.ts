/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JSONSchema4 } from "json-schema";

/**
 * A `BreadboardType` is an object that can be serialized to JSON Schema for
 * runtime, and also carries a matching TypeScript type for compile time.
 */
export type BreadboardType =
  | BasicBreadboardType
  | AdvancedBreadboardType<JsonSerializable>;

/**
 * The basic Breadboard types that can be written directly.
 */
export type BasicBreadboardType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "unknown";

/**
 * All Breadboard values must be JSON serializable, and this is the set of
 * JSON serializable types.
 */
export type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | Array<JsonSerializable>
  | { [K: string]: JsonSerializable };

/**
 * A type that's more complicated than a {@link BasicBreadboardType}. Directly
 * owns a TypeScript type for compile time, and a JSON schema for run time.
 */
export interface AdvancedBreadboardType<
  // We only need to hold onto this type parameter so that we can infer it
  // later.
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends JsonSerializable,
> {
  readonly jsonSchema: JSONSchema4;
}

/**
 * Convert from {@link BreadboardType} to TypeScript type.
 */
export type ConvertBreadboardType<BT extends BreadboardType> =
  BT extends "string"
    ? string
    : BT extends "number"
      ? number
      : BT extends "boolean"
        ? boolean
        : BT extends "null"
          ? null
          : BT extends "unknown"
            ? JsonSerializable
            : BT extends AdvancedBreadboardType<infer TT>
              ? TT
              : never;

/**
 * Convert a {@link BreadboardType} to JSON Schema.
 */
export function toJSONSchema(type: BreadboardType): JSONSchema4 {
  if (typeof type === "object" && "jsonSchema" in type) {
    // Make a copy because it's not uncommon for callers to mutate this object,
    // (e.g. adding a description to a port schema), and 2 ports might share an
    // advanced breadboard type instance (e.g. dynamic ports).
    return structuredClone(type.jsonSchema);
  }
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "null": {
      return { type };
    }
    case "unknown": {
      // All possible JSON schema data types.
      //
      // We could return {} here, but returning all possible types is a bit more
      // explicit. Also, there is some other Breadboard code which assumes when
      // there is no type, that the type is string (this is a bug, since no type
      // actually means anything).
      return {
        type: ["array", "boolean", "null", "number", "object", "string"],
      };
    }
    default: {
      throw new Error(
        `Unknown BreadboardType: <${typeof type}> ${type satisfies never}`
      );
    }
  }
}
