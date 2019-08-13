import {
  Client as BaseClient,
  ClientAddress,
  Context,
  DEFAULT_CLIENT_ERROR,
  GRPCService,
  HEADERS,
  IError,
  Request,
  Response,
  StatusCodes
} from "@types-first-api/core";
import { normalizeGrpcError } from "@types-first-api/grpc-common";
import {
  CallOptions,
  Client,
  credentials,
  loadObject,
  makeClientConstructor,
  Metadata,
  StatusObject
} from "@grpc/grpc-js";
import {
  loadSync,
  MethodDefinition,
  ServiceDefinition
} from "@grpc/proto-loader";
import * as _ from "lodash";
import { EMPTY, Subject } from "rxjs";
import { catchError } from "rxjs/operators";
import {ChannelOptions} from "@grpc/grpc-js/build/src/channel-options";
import {propagate} from "grpc";
import {Status} from "@grpc/grpc-js/build/src/constants";

type GenericServiceDefinition<TService extends GRPCService<TService>> = {
  [K in keyof TService]: MethodDefinition<
    TService[keyof TService]["request"],
    TService[keyof TService]["request"]
  >;
};

export class GrpcClient<
  TService extends GRPCService<TService>
> extends BaseClient<TService> {
  private _client: Client;
  private readonly regenerateClient: () => void;
  private readonly methods: GenericServiceDefinition<TService>;

  constructor(
    protoService: GenericServiceDefinition<TService>,
    serviceName: string,
    address: ClientAddress,
    options: Partial<ChannelOptions>
  ) {
    super(protoService, address, options);
    const serviceClientConstructor = makeClientConstructor(
      protoService,
      serviceName
    );

    this.methods = protoService;

    this.regenerateClient = () => {
      this._client = new serviceClientConstructor(
        `${address.host}:${address.port}`,
        credentials.createInsecure(),
        options
      );
    };
    this.regenerateClient();
  }

  public getClient(): Client {
    return this._client;
  }

  _call<K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]["request"]>,
    ctx: Context
  ): Response<TService[K]["response"]> {
    return this.callAndRetryOnUnavailable(methodName, request$, ctx, 0);
  }

  private callAndRetryOnUnavailable = <K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]["request"]>,
    ctx: Context,
    retries: number
  ): Response<TService[K]["response"]> => {
    const { path, requestSerialize, responseDeserialize } = this.methods[
      methodName
    ];
    const response$ = new Subject();

    const { metadata, callOptions } = this.createGrpcOptionsAndMetadata(ctx);

    const call = this._client.makeBidiStreamRequest(
      path,
      requestSerialize,
      responseDeserialize,
      metadata,
      callOptions
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
    call.on("error", _.noop);
    call.on("status", (status: StatusObject) => {
      cancelSubscription.unsubscribe();
      if (status.code === Status.OK) {
        return response$.complete();
      }
      const serializedError = status.metadata.get(HEADERS.TRAILER_ERROR);
      let err: IError;
      if (serializedError != null && serializedError.length > 0) {
        try {
          err = JSON.parse(serializedError[0].toString());
        } catch (e) {}
      } else {
        // TODO: what is the source for client errors?
        err = normalizeGrpcError(status, { ...DEFAULT_CLIENT_ERROR });
      }
      response$.error(err);
    });

    return response$.asObservable();
  };

  private createGrpcOptionsAndMetadata = (
    ctx: Context
  ): {
    metadata: Metadata;
    callOptions: CallOptions;
  } => {
    const metadata = new Metadata();
    _.forEach(ctx.metadata, (v, k) => {
      metadata.set(k, v);
    });

    const callOptions: CallOptions = {
      propagate_flags: propagate.DEFAULTS
    };
    if (ctx.deadline != null) {
      callOptions.deadline = ctx.deadline;
      metadata.add(HEADERS.DEADLINE, ctx.deadline.toISOString());
    }

    return {
      metadata,
      callOptions
    };
  };
}
