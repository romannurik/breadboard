/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Board } from "../board.js";
import { callHandler } from "../handler.js";
import {
  InputValues,
  NodeDescriptor,
  NodeHandlers,
  OutputValues,
} from "../types.js";
import {
  AnyProxyRequestMessage,
  AnyProxyResponseMessage,
  ClientTransport,
  ServerTransport,
} from "./protocol.js";

type ProxyServerTransport = ServerTransport<
  AnyProxyRequestMessage,
  AnyProxyResponseMessage
>;

export class ProxyServer {
  #transport: ProxyServerTransport;

  constructor(transport: ProxyServerTransport) {
    this.#transport = transport;
  }

  async serve(board: Board) {
    const stream = this.#transport.createServerStream();
    const reader = stream.readableRequests.getReader();
    const request = await reader.read();
    if (request.done) return;

    const writer = stream.writableResponses.getWriter();

    const [type] = request.value;

    if (type !== "proxy") {
      writer.write(["error", { error: "Expected proxy request." }]);
      writer.close();
      return;
    }

    const [, { node, inputs }] = request.value;

    const handlers: NodeHandlers = await Board.handlersFromBoard(board);
    const handler = handlers[node.type];
    if (!handler) {
      writer.write(["error", { error: "Unknown node type." }]);
      writer.close();
      return;
    }

    try {
      const result = await callHandler(handler, inputs, {
        outerGraph: board,
        board: board,
        descriptor: node,
        slots: {},
      });

      if (!result) {
        writer.write(["error", { error: "Handler returned nothing." }]);
        writer.close();
        return;
      }

      writer.write(["proxy", { outputs: result }]);
      writer.close();
    } catch (e) {
      writer.write(["error", { error: (e as Error).message }]);
      writer.close();
    }
  }
}

type ProxyClientTransport = ClientTransport<
  AnyProxyRequestMessage,
  AnyProxyResponseMessage
>;

export class ProxyClient {
  #transport: ProxyClientTransport;

  constructor(transport: ProxyClientTransport) {
    this.#transport = transport;
  }

  async proxy(
    node: NodeDescriptor,
    inputs: InputValues
  ): Promise<OutputValues> {
    const stream = this.#transport.createClientStream();
    const writer = stream.writableRequests.getWriter();
    const reader = stream.readableResponses.getReader();

    writer.write(["proxy", { node, inputs }]);
    writer.close();

    const result = await reader.read();
    if (result.done)
      throw new Error("Unexpected proxy failure: empty response.");

    const [type] = result.value;
    if (type === "proxy") {
      const [, { outputs }] = result.value;
      return outputs;
    } else if (type === "error") {
      const [, { error }] = result.value;
      throw new Error(error);
    } else {
      throw new Error(
        `Unexpected proxy failure: unknown response type "${type}".`
      );
    }
  }
}