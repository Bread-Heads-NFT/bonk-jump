// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import getRandomValues from "get-random-values";
import { Reader, Writer } from "bin-serde";
import {
  HathoraClient as _HathoraClient,
  HathoraConnection as _HathoraConnection,
} from "@hathora/client-sdk";

import {
  decodeStateSnapshot,
  decodeStateUpdate,
  PlayerState as UserState,
  IInitializeRequest,
  IJoinGameRequest,
  ISetInputsRequest,
  IFreezeRequest,
  IStartGameRequest,
  HathoraEvents,
} from "../../api/types";
import { UserData, Response, Method } from "../../api/base";

import { computePatch } from "./patch";
import { ConnectionFailure, transformCoordinatorFailure } from "./failures";

export class HathoraClient extends _HathoraClient {
  constructor() {
    let connectionInfo;
    const {
      VITE_HATHORA_SERVER_HOST,
      VITE_HATHORA_SERVER_PORT,
      VITE_HATHORA_TRANSPORT_TYPE,
    } = process.env;
    if (
      VITE_HATHORA_SERVER_HOST ||
      VITE_HATHORA_SERVER_PORT ||
      VITE_HATHORA_TRANSPORT_TYPE
    ) {
      connectionInfo = {
        host: VITE_HATHORA_SERVER_HOST ?? "localhost",
        port: VITE_HATHORA_SERVER_PORT
          ? parseInt(VITE_HATHORA_SERVER_PORT, 10)
          : 4000,
        transportType: VITE_HATHORA_TRANSPORT_TYPE ?? ("tcp" as const),
      };
    } else if (process.env.MODE !== "production") {
      connectionInfo = {
        host: "localhost",
        port: 4000,
        transportType: "tcp" as const,
      };
    }
    // @ts-ignore
    super("app-8e105eac-700d-431e-99fc-4175bc9a929d", connectionInfo);
  }

  public async connect(
    token: string,
    stateId: RoomId,
    onUpdate?: UpdateCallback,
    onError?: ErrorCallback
  ): Promise<HathoraConnection> {
    const connection = new HathoraConnection(this, stateId, onUpdate, onError);
    await connection.connect(token);
    return connection;
  }

  /**
   * @deprecated
   */
  public create(token: string): Promise<string> {
    console.warn('`client.create` is deprecated. Please use `client.createPrivateLobby`.')
    return this.createPrivateLobby(token)
  }
}


export type RoomId = string;
export type UpdateArgs = {
  stateId: RoomId;
  state: UserState;
  updatedAt: number;
  events: HathoraEvents[];
};
export type UpdateCallback = (updateArgs: UpdateArgs) => void;
export type ErrorCallback = (error: ConnectionFailure) => void;


export class HathoraConnection {
  private callbacks: Record<string, (response: Response) => void> = {};
  private changedAt = 0;
  private updateListeners: UpdateCallback[] = [];
  private errorListeners: ErrorCallback[] = [];
  private transport!: _HathoraConnection | undefined;
  private internalState!: UserState;

  constructor(
    private _client: _HathoraClient,
    private stateId: RoomId,
    onUpdate?: UpdateCallback,
    onError?: ErrorCallback
  ) {
    this.stateId = stateId;

    if (onUpdate !== undefined) {
      this.onUpdate(onUpdate);
    }
    if (onError !== undefined) {
      this.onError(onError);
    }
  }

  public async connect(token: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.transport = await this._client.newConnection(this.stateId)
      this.transport.onClose((e) => {
        reject(e.reason);
        this.handleClose(e);
      })
      this.transport.onMessage((data) => {
        resolve();
        this.handleData(data);
      })
      this.transport.connect(token);
    });
  }

  public get state(): UserState {
    return this.internalState;
  }

  public onUpdate(listener: UpdateCallback) {
    this.updateListeners.push(listener);
  }

  public onError(listener: ErrorCallback) {
    this.errorListeners.push(listener);
  }

  public removeAllListeners() {
    this.updateListeners = [];
    this.errorListeners = [];
  }

  public joinGame(request: IJoinGameRequest): Promise<Response> {
    return this.callMethod(Method.JOIN_GAME, IJoinGameRequest.encode(request).toBuffer());
  }

  public setInputs(request: ISetInputsRequest): Promise<Response> {
    return this.callMethod(Method.SET_INPUTS, ISetInputsRequest.encode(request).toBuffer());
  }

  public freeze(request: IFreezeRequest): Promise<Response> {
    return this.callMethod(Method.FREEZE, IFreezeRequest.encode(request).toBuffer());
  }

  public startGame(request: IStartGameRequest): Promise<Response> {
    return this.callMethod(Method.START_GAME, IStartGameRequest.encode(request).toBuffer());
  }

  public disconnect(code?: number): void {
    this.transport?.disconnect(code);
  }

  private async callMethod(
    method: Method,
    request: Uint8Array
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (this.transport == null) {
        return reject(Error("Transport as not been set"));
      }
      const msgId: Uint8Array = getRandomValues(new Uint8Array(4));
      this.transport.write(
        // @ts-ignore
        new Uint8Array([...new Uint8Array([method]), ...msgId, ...request])
      );
      this.callbacks[new DataView(msgId.buffer).getUint32(0)] = resolve;
    });
  }

  private handleData = (data: ArrayBuffer) => {
    const reader = new Reader(new Uint8Array(data));
    const type = reader.readUInt8();
    if (type === 0) {
      this.internalState = decodeStateSnapshot(reader);
      this.changedAt = 0;
      this.updateListeners.forEach((listener) =>
        listener({
          stateId: this.stateId,
          state: JSON.parse(JSON.stringify(this.internalState)),
          updatedAt: 0,
          events: [],
        })
      );
    } else if (type === 1) {
      const { stateDiff, changedAtDiff, responses, events } = decodeStateUpdate(reader);
      if (stateDiff !== undefined) {
        this.internalState = computePatch(this.internalState!, stateDiff);
      }
      this.changedAt += changedAtDiff;
      this.updateListeners.forEach((listener) =>
        listener({
          stateId: this.stateId,
          state: JSON.parse(JSON.stringify(this.internalState)),
          updatedAt: this.changedAt,
          events,
        })
      );
      responses.forEach(({ msgId, response }) => {
        if (msgId in this.callbacks) {
          this.callbacks[msgId](response);
          delete this.callbacks[msgId];
        }
      });
    } else if (type === 2) {
      this.transport!.disconnect(4004);
    } else if (type === 3) {
      // @ts-ignore
      this.transport!.pong();
    } else {
      console.error("Unknown message type", type);
    }
  };

  private handleClose = (e: { code: number; reason: string }) => {
    console.error("Connection closed", e);
    this.errorListeners.forEach((listener) => listener(transformCoordinatorFailure(e)));
  };
}
