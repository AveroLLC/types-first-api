import { Subject, race } from 'rxjs';
import {
  Client,
  GRPCService,
  Request,
  Response,
  Context,
  HEADERS,
  DEFAULT_CLIENT_ERROR,
  IError,
  ErrorCodes,
} from '@types-first-api/core';
import { normalizeGrpcError } from '@types-first-api/grpc-common';
import * as pbjs from 'protobufjs';
import * as grpc from 'grpc';
import * as _ from 'lodash';
import { take, tap, finalize, takeUntil, materialize } from 'rxjs/operators';

export class GrpcClient<TService extends GRPCService<TService>> extends Client<TService> {
  private _client: grpc.Client;
  private methods: Record<keyof TService, grpc.MethodDefinition<any, any>>;

  constructor(protoService: pbjs.Service, address: string) {
    super(protoService, address);
    const GrpcClient = grpc.loadObject(protoService) as typeof grpc.Client;
    const serviceDef = (GrpcClient as any).service as grpc.ServiceDefinition<any>;
    this.methods = _.reduce(
      serviceDef,
      (methods, method) => {
        methods[(method as any).originalName] = method;
        return methods;
      },
      {}
    ) as Record<keyof TService, grpc.MethodDefinition<any, any>>;
    this._client = new GrpcClient(address, grpc.credentials.createInsecure());
  }

  _call<K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]['request']>,
    ctx: Context
  ): Response<TService[K]['response']> {
    const { path, requestSerialize, responseDeserialize } = this.methods[methodName];
    const response$ = new Subject();

    const grpcMetadata = new grpc.Metadata();
    _.forEach(ctx.metadata, (v, k) => {
      grpcMetadata.set(k, v);
    });

    // @ts-ignore - typings on call options are wrong
    const grpcOpts: grpc.CallOptions = {
      propagate_flags: grpc.propagate.DEFAULTS,
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
        call.emit('error', err);
      },
      () => {
        call.end();
      }
    );

    const cancelSubscription = ctx.cancel$.pipe(take(1)).subscribe(err => {
      response$.error(err);
      call.cancel();
      reqSubscription.unsubscribe();
    });

    call.on('data', d => {
      response$.next(d);
    });

    // errors are dealt with in the status handler
    call.on('error', _.noop);
    call.on('status', (status: grpc.StatusObject) => {
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
        err = normalizeGrpcError(status, { ...DEFAULT_CLIENT_ERROR, source: 'client' });
      }
      response$.error(err);
    });

    return response$.asObservable();
  }
}
