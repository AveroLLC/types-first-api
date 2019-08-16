import {
  Client,
  ClientAddress,
  Context,
  GRPCService,
  IError,
  StatusCodes
} from "@types-first-api/core";
import * as _ from "lodash";
import * as pbjs from "protobufjs";
import { Observable } from "rxjs";
import { GrpcClient, GrpcClientOptions } from "./grpcClient";
import { catchError } from "rxjs/operators";

interface PoolEntry<TService extends GRPCService<TService>> {
  initTime: number;
  client: GrpcClient<TService>;
  index: number;
}

export type PooledGrpcClientOptions = GrpcClientOptions & {
  pool?: {
    maxClientLifeMs?: number;
    connectionPoolSize?: number;
  };
};

/*
  Creates a pool of GrpcClients that allow for connection expiration and rotation between a set of clients.

  By default, the GrpcClient will create a single channel (HTTP/2 connection), which means that any HTTP/1.1 or TCP
  load balancers will not be able to distribute requests from this client to multiple backing service instances.

 */
export class PooledGrpcClient<
  TService extends GRPCService<TService>
> extends Client<TService> {
  // The maximum time for a GrpcClient to be used by the application
  private readonly MAX_CLIENT_LIFE_MS;

  private readonly CONNECTION_POOL_SIZE;

  private readonly _clientPool: PoolEntry<TService>[] = [];

  private _nextPoolIndex = 0;

  private readonly grpcOptions: PooledGrpcClientOptions;

  constructor(
    private protoService: pbjs.Service,
    private address: ClientAddress,
    options: PooledGrpcClientOptions = {}
  ) {
    super(protoService, address, options.client || {});
    this.grpcOptions = options;
    this.CONNECTION_POOL_SIZE = options.pool && options.pool.connectionPoolSize || 12;
    this.MAX_CLIENT_LIFE_MS = options.pool && options.pool.maxClientLifeMs || 30e3;
    this._clientPool = _.range(this.CONNECTION_POOL_SIZE).map((_, index) =>
      this.createPoolEntry(index)
    );
  }

  _call<K extends keyof TService>(
    methodName: K,
    req$: Observable<TService[K]["request"]>,
    ctx: Context
  ): Observable<TService[K]["response"]> {
    const nextPoolEntry = this.getNextClient();
    return nextPoolEntry.client._call(methodName, req$, ctx).pipe(
      catchError((err: IError) => {
        // grpc status UNAVAILABLE is returned from a bad channel connection
        if (err.code === StatusCodes.Unavailable) {
          return this.replaceClient(nextPoolEntry.index).client._call(
            methodName,
            req$,
            ctx
          );
        }
        throw err;
      })
    );
  }

  private replaceClient = (index: number): PoolEntry<TService> => {
    const entry = this._clientPool[index];
    const replacement = this.createPoolEntry(index);
    this._clientPool[index] = replacement;
    entry.client.getClient().close();

    return replacement;
  };

  private getNextClient = (): PoolEntry<TService> => {
    const index = this._nextPoolIndex;
    const nextEntry: PoolEntry<TService> = this._clientPool[index];

    this._nextPoolIndex = ++this._nextPoolIndex % this.CONNECTION_POOL_SIZE;

    // check if we need to refresh the channel
    if (nextEntry.initTime + this.MAX_CLIENT_LIFE_MS < Date.now()) {
      return this.replaceClient(index);
    }

    return nextEntry;
  };

  private createPoolEntry = (index: number): PoolEntry<TService> => {
    return {
      client: new GrpcClient<TService>(
        this.protoService,
        this.address,
        this.grpcOptions
      ),
      initTime: Date.now(),
      index
    };
  };
}
