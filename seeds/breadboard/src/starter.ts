/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeHandlers, coreHandlers } from "@google-labs/graph-runner";
import type {
  BreadboardNode,
  Kit,
  KitConstructor,
  NodeFactory,
  OptionalIdConfiguration,
} from "./types.js";

type NodeFactoryParams = Parameters<NodeFactory>;

class KitSugar {
  createNode(..._args: NodeFactoryParams): BreadboardNode {
    throw new Error(
      "Use this class only as a `sugarMixin` argument for `AssembleKit`"
    );
  }
}

export interface KitSugarConstructor<T extends KitSugar> {
  new (nodeFactory: NodeFactory): T;
}

class NoSugar extends KitSugar {
  constructor(public nodeFactory: NodeFactory) {
    super();
    this.nodeFactory = nodeFactory;
  }

  createNode(...args: NodeFactoryParams): BreadboardNode {
    return this.nodeFactory(...args);
  }
}

const AssembleKit = <T extends KitSugar = KitSugar>(
  kit: Kit,
  sugarMixin?: new () => T
): KitSugarConstructor<T> => {
  if (!sugarMixin) return NoSugar as unknown as KitSugarConstructor<T>;

  let mixinFactory: NodeFactory;
  const ctor = (sugarMixin.prototype.constructor = function (
    nodeFactory: NodeFactory
  ) {
    mixinFactory = nodeFactory;
    this.handlers = kit.handlers;
  });
  sugarMixin.prototype.createNode = function (...args: NodeFactoryParams) {
    mixinFactory(...args);
  };
  return ctor as unknown as KitSugarConstructor<T>;
};

/**
 * Syntactic sugar around the `coreHandlers` library.
 */
export const Starter = AssembleKit(
  { handlers: coreHandlers },
  class extends KitSugar {
    textTemplate(
      template: string,
      config: OptionalIdConfiguration = {}
    ): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("prompt-template", { template, ...rest }, $id);
    }

    urlTemplate(
      template: string,
      config: OptionalIdConfiguration = {}
    ): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("url_template", { template, ...rest }, $id);
    }

    fetch(raw?: boolean, config: OptionalIdConfiguration = {}): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("fetch", { raw, ...rest }, $id);
    }

    jsonata(
      expression: string,
      config: OptionalIdConfiguration = {}
    ): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("jsonata", { expression, ...rest }, $id);
    }

    xmlToJson(config: OptionalIdConfiguration = {}): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("xml_to_json", { ...rest }, $id);
    }

    textCompletion(config: OptionalIdConfiguration = {}): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("text-completion", { ...rest }, $id);
    }

    secrets(
      keys: string[],
      config: OptionalIdConfiguration = {}
    ): BreadboardNode {
      const { $id, ...rest } = config;
      return this.createNode("secrets", { keys, ...rest }, $id);
    }
  }
);
