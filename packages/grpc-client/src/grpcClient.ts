import {
  Client,
  ClientAddress,
  Context,
  DEFAULT_CLIENT_ERROR,
  GRPCService,
  HEADERS,
  IError,
  Request,
  Response,
  ClientOptions
} from "@types-first-api/core";
import { normalizeGrpcError } from "@types-first-api/grpc-common";

import { EMPTY, Subject } from "rxjs";
import { catchError } from "rxjs/operators";
import { ServiceDefinition, MethodDefinition } from "@grpc/proto-loader";
import * as grpc from "@grpc/grpc-js";

export interface GrpcClientOptions {
  grpcClient?: Record<string, string | number>;
  client?: ClientOptions;
  protos?: {
    enumsAsStrings?: boolean;
  };
}

export class GrpcClient<TService extends GRPCService<TService>> extends Client<
  TService
> {
  private readonly _client: grpc.Client;

  private readonly methods: Record<
    keyof TService,
    MethodDefinition<
      TService[keyof TService]["request"],
      TService[keyof TService]["response"]
    >
  >;

  constructor(
    serviceName: string,
    serviceDefinition: ServiceDefinition,
    address: ClientAddress,
    options: GrpcClientOptions = {}
  ) {
    super(serviceName, serviceDefinition, address, options.client || {});

    const GrpcClient = grpc.makeClientConstructor(
      serviceDefinition,
      serviceName
    );

    this.methods = serviceDefinition as Record<
      keyof TService,
      MethodDefinition<
        TService[keyof TService]["request"],
        TService[keyof TService]["response"]
      >
    >;
    const addressString = `${address.host}:${address.port}`;
    this._client = new GrpcClient(
      addressString,
      grpc.ChannelCredentials.createInsecure(),
      options.grpcClient
    );
  }

  public getClient(): grpc.Client {
    return this._client;
  }

  _call<K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]["request"]>,
    ctx: Context
  ): Response<TService[K]["response"]> {
    const { path, requestSerialize, responseDeserialize } = this.methods[
      methodName
    ];
    const response$ = new Subject();

    const grpcMetadata = new grpc.Metadata();

    Object.keys(ctx.metadata).forEach(key => {
      grpcMetadata.set(key, ctx.metadata[key]);
    });

    const grpcOpts: grpc.CallOptions = {
      propagate_flags: 4 // should be DEFAULT
    };
    if (ctx.deadline != null) {
      grpcOpts.deadline = ctx.deadline;
      grpcMetadata.add(HEADERS.DEADLINE, ctx.deadline.toISOString());
    }

    const call = this._client.makeBidiStreamRequest(
      path,
      requestSerialize,
      responseDeserialize,
      grpcMetadata,
      grpcOpts
    );

    const reqSubscription = request$.subscribe(
      val => {
        call.write(val);
      },
      err => {
        call.emit("error", err);
      },
      () => {
        call.end();
      }
    );

    const cancelSubscription = ctx.cancel$
      .pipe(
        catchError(() => {
          call.cancel();
          reqSubscription.unsubscribe();
          return EMPTY;
        })
      )
      .subscribe();

    call.on("data", d => {
      response$.next(d);
    });

    // errors are dealt with in the status handler
    call.on("error", () => {});
    call.on("status", (status: grpc.StatusObject) => {
      cancelSubscription.unsubscribe();
      if (status.code === grpc.status.OK) {
        return response$.complete();
      }
      const serializedError = status.metadata.get(HEADERS.TRAILER_ERROR);
      let err: IError;
      if (serializedError != null && serializedError.length > 0) {
        try {
          // https://github.com/grpc/grpc-node/issues/769
          err = JSON.parse(serializedError.join(",").toString());
        } catch (e) {
          err = normalizeGrpcError(status, { ...DEFAULT_CLIENT_ERROR });
        }
      } else {
        // TODO: what is the source for client errors?
        err = normalizeGrpcError(status, { ...DEFAULT_CLIENT_ERROR });
      }
      response$.error(err);
    });

    return response$.asObservable();
  }
}
