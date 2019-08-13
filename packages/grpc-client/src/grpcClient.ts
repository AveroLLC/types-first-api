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
  StatusCodes
} from "@types-first-api/core";
import { normalizeGrpcError } from "@types-first-api/grpc-common";
import * as grpc from "grpc";
import * as _ from "lodash";
import * as pbjs from "protobufjs";
import { EMPTY, Observable, Subject, throwError } from "rxjs";
import { catchError, retryWhen, mergeMap, map } from "rxjs/operators";

export class GrpcClient<TService extends GRPCService<TService>> extends Client<
  TService
> {
  private _client: grpc.Client;
  private readonly regenerateClient: () => void;
  private readonly methods: Record<
    keyof TService,
    grpc.MethodDefinition<any, any>
  >;

  constructor(
    protoService: pbjs.Service,
    address: ClientAddress,
    options: Record<string, any> = {}
  ) {
    super(protoService, address, options);
    const GrpcClientConstructor = grpc.loadObject(protoService, {
      enumsAsStrings: false
    }) as typeof grpc.Client;

    const serviceDef = (GrpcClientConstructor as any)
      .service as grpc.ServiceDefinition<any>;
    this.methods = _.reduce(
      serviceDef,
      (methods, method) => {
        methods[(method as any).originalName] = method;
        return methods;
      },
      {}
    ) as Record<keyof TService, grpc.MethodDefinition<any, any>>;

    this.regenerateClient = () => {
      this._client = new GrpcClientConstructor(
        `${address.host}:${address.port}`,
        grpc.credentials.createInsecure(),
        options
      );
    };
    this.regenerateClient();
  }

  public getClient(): grpc.Client {
    return this._client;
  }

  _call<K extends keyof TService>(
      methodName: K,
      request$: Request<TService[K]["request"]>,
      ctx: Context
  ): Response<TService[K]["response"]> {
    return this.callAndRetryOnUnavailable(methodName,request$, ctx, 0);
  }

  private callAndRetryOnUnavailable = <K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]["request"]>,
    ctx: Context,
    retries:number
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
    call.on("status", (status: grpc.StatusObject) => {
      cancelSubscription.unsubscribe();
      if (status.code === grpc.status.OK) {
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
    metadata: grpc.Metadata;
    callOptions: grpc.CallOptions;
  } => {
    const metadata = new grpc.Metadata();
    _.forEach(ctx.metadata, (v, k) => {
      metadata.set(k, v);
    });

    // @ts-ignore - typings on call callOptions are wrong
    const callOptions: grpc.CallOptions = {
      propagate_flags: grpc.propagate.DEFAULTS
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
