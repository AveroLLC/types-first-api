import { Subject } from 'rxjs';
import {
  Client,
  GRPCService,
  Request,
  Response,
  Context,
  HEADERS,
} from '@types-first-api/core';
import * as pbjs from 'protobufjs';
import * as grpc from 'grpc';
import * as _ from 'lodash';
import { take } from 'rxjs/operators';

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

    // TODO: deal with deadlines
    // @ts-ignore - typings on call options are wrong
    const grpcOpts: grpc.CallOptions = {
      propagate_flags: grpc.propagate.DEFAULTS,
    };
    // if (ctx.deadline != null) {
    //   grpcOpts.deadline = options.deadline.valueOf();
    // }

    const call = this._client.makeBidiStreamRequest(
      path,
      requestSerialize,
      responseDeserialize,
      grpcMetadata,
      grpcOpts
    );

    // TODO: clean up when res is done
    ctx.cancel$.pipe(take(1)).subscribe(() => {
      call.cancel();
    });

    request$.subscribe(
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

    call.on('data', d => {
      response$.next(d);
    });
    call.on('error', err => {
      // console.log('call error', err);
      // response$.error(err);
    });
    call.on('status', (status: grpc.StatusObject) => {
      if (status.code === 0) {
        return response$.complete();
      }
      const serializedError = status.metadata.get(HEADERS.TRAILER_ERROR);
      if (serializedError != null) {
        let err;
        try {
          err = JSON.parse(serializedError.toString());
        } finally {
          err = status;
        }

        response$.error(err);
      }
    });

    return response$.asObservable();
  }
}
