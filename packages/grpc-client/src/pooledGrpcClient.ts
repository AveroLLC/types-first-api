import {Client, ClientAddress, Context, GRPCService,} from '@types-first-api/core';
import * as grpc from 'grpc';
import * as _ from 'lodash';
import * as pbjs from 'protobufjs';
import {Observable} from 'rxjs';
import {GrpcClient} from "./grpcClient";

interface PoolEntry<TService extends GRPCService<TService>> {
  initTime: number,
  client: GrpcClient<TService>
}

/*
  Creates a pool of GrpcClients that allow for connection expiration and rotation between a set of clients.

  By default, the GrpcClient will create a single channel (HTTP/2 connection), which means that any HTTP/1.1 or TCP
  load balancers will not be able to distribute requests from this client to multiple backing service instances.
 
 */
export class PooledGrpcClient<TService extends GRPCService<TService>> extends Client<TService> {

  // The maximum time for a GrpcClient to be used by the application
  private readonly MAX_CLIENT_LIFE_MS = 1000;
  // Wait for up to 90 seconds for a connection to change states to idle before shutting down
  private readonly MAX_SHUTDOWN_WAIT = 1000 * 90;

  private readonly CONNECTION_POOL_SIZE = 12;

  private readonly _clientPool: PoolEntry<TService>[] = [];

  private _nextPoolIndex = 0;

  constructor(private protoService: pbjs.Service, private address: ClientAddress, options: Record<string, any> = {}) {
    super(protoService, address, options);
    this._clientPool = _.range(this.CONNECTION_POOL_SIZE).map(() => this.createPoolEntry());
  }

  _call<K extends keyof TService>(methodName: K, req$: Observable<TService[K]["request"]>, ctx: Context): Observable<TService[K]["response"]> {
    return this.getNextClient()._call(methodName, req$, ctx);
  }

  private getNextClient = (): GrpcClient<TService> => {
    const index = this._nextPoolIndex;
    const nextEntry: PoolEntry<TService> = this._clientPool[index];

    this._nextPoolIndex = (++this._nextPoolIndex) % this.CONNECTION_POOL_SIZE;

    if (nextEntry.initTime + this.MAX_CLIENT_LIFE_MS >= Date.now()) {
      const replacement = this.createPoolEntry();
      this._clientPool[index] = replacement;
      this.shutdownOnIdle(nextEntry);

      return replacement.client;
    }

    return nextEntry.client;
  };

  private createPoolEntry = () => {
    return {
      client: new GrpcClient<TService>(this.protoService, this.address, this.options),
      initTime: Date.now()
    };
  };

  private shutdownOnIdle = (entry: PoolEntry<TService>) => {
    const channel = entry.client.getClient().getChannel();
    channel.watchConnectivityState(channel.getConnectivityState(false), this.MAX_SHUTDOWN_WAIT, (err) => {
      if (err) {
        console.log("Channel failed to transition to a different state in allotted time frame");
      }
      // Only shutdown a client if it is IDLE.
      if (channel.getConnectivityState(false) === grpc.connectivityState.IDLE) {
        entry.client.getClient().close();
        return;
      }
      // If we didn't get the transition we want, try again
      this.shutdownOnIdle(entry);
    });
  };

}
