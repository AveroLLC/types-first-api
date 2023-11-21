import { map, flatMap } from 'rxjs/operators';
import { from } from 'rxjs';
import {
  Context,
  createError,
  DEFAULT_SERVER_ERROR,
  HEADERS,
  Metadata,
  Service,
  GRPCService,
  RpcCallMap,
  RpcCall,
} from '@types-first-api/core';
import { ERROR_CODES_TO_GRPC_STATUS } from '@types-first-api/grpc-common';
import * as grpc from '@grpc/grpc-js';
import * as _ from 'lodash';
import { Observable, of, isObservable } from 'rxjs';

export class GrpcServer<TServices extends GRPCService<TServices>> {
  private _server = new grpc.Server();
  _rpc: RpcCallMap<TServices>;

  constructor(...services: Service<TServices, any>[]) {
    this._rpc = this.addServicesToServer(services);
  }

  static createWithOptions = <GServices extends GRPCService<GServices>>(
    options: Record<string, any>,
    ...services: Service<GServices, any>[]
  ): GrpcServer<GServices> => {
    const server = new grpc.Server(options);
    const instance = new GrpcServer();
    instance._server = server;
    instance._rpc = instance.addServicesToServer(services);
    return instance as GrpcServer<GServices>;
  };

  protected addServicesToServer = (
    services: Service<any, any>[]
  ): RpcCallMap<TServices> => {
    const rpcCallMap: RpcCallMap<any> = {};
    _.forEach(services, (service: Service<any, any>) => {
      const { pbjsService } = service;
      const grpcObj = grpc.loadObject(pbjsService, {
        enumsAsStrings: false,
      });
      const serviceDef = (grpcObj as any).service as grpc.ServiceDefinition<any>;

      this._server.addService(
        serviceDef,
        _.mapValues(serviceDef, (method: grpc.MethodDefinition<any, any>) => {
          const methodName = (method as any).originalName;
          rpcCallMap[methodName] = (req, ctx) => {
            const req$ = isObservable(req) ? req : of(req);
            return req$.pipe(
              flatMap(request => {
                const processedReq = method.requestDeserialize(
                  method.requestSerialize(request)
                );

                return service.call(
                  methodName,
                  of(processedReq),
                  ctx || Context.create()
                );
              })
            );
          };
          if (method.requestStream && method.responseStream) {
            return this._makeBidiStreamingHandler(service, methodName);
          } else if (method.requestStream) {
            return this._makeClientStreamingHandler(service, methodName);
          } else if (method.responseStream) {
            return this._makeServerStreamingHandler(service, methodName);
          } else {
            return this._makeUnaryHandler(service, methodName);
          }
        })
      );
    });

    return rpcCallMap;
  };

  bind = async (opts: { port: number; host?: string }) => {
    let { host, port } = opts;
    if (host == null) {
      host = '0.0.0.0';
    }
    const address = `${host}:${port}`;
    const listeningPort = this._server.bind(
      address,
      grpc.ServerCredentials.createInsecure()
    );
    if (listeningPort == 0) {
      throw new Error(`Failed to bind to address ${address}`);
    }
    this._server.start();
    return listeningPort;
  };

  shutdown = async () => {
    return new Promise(resolve => {
      this._server.tryShutdown(resolve);
    });
  };

  private _makeUnaryHandler = (
    service: Service<any, any>,
    methodName: string
  ): grpc.handleUnaryCall<any, any> => {
    return (call: grpc.ServerUnaryCall<any>, cb: grpc.sendUnaryData<any>) => {
      const { request$, context } = this._handleUnaryRequest(call);
      const response$ = service.call(methodName, request$, context);
      this._handleUnaryResponse(response$, cb, service.getName());
    };
  };

  private _makeServerStreamingHandler = (
    service: Service<any, any>,
    methodName: string
  ): grpc.handleServerStreamingCall<any, any> => {
    return (call: grpc.ServerWriteableStream<any>) => {
      const { request$, context } = this._handleUnaryRequest(call);
      const response$ = service.call(methodName, request$, context);
      this._handleStreamingResponse(response$, call, service.getName());
    };
  };

  private _makeClientStreamingHandler = (
    service: Service<any, any>,
    methodName: string
  ): grpc.handleClientStreamingCall<any, any> => {
    return (call: grpc.ServerReadableStream<any>, cb: grpc.sendUnaryData<any>) => {
      const { request$, context } = this._handleStreamingRequest(call);
      const response$ = service.call(methodName, request$, context);
      this._handleUnaryResponse(response$, cb, service.getName());
    };
  };

  private _makeBidiStreamingHandler = (
    service: Service<any, any>,
    methodName: string
  ): grpc.handleBidiStreamingCall<any, any> => {
    return (call: grpc.ServerDuplexStream<any, any>) => {
      const { request$, context } = this._handleStreamingRequest(call);
      const response$ = service.call(methodName, request$, context);
      this._handleStreamingResponse(response$, call, service.getName());
    };
  };

  private _grpcMetadataToMetadata = (md: grpc.Metadata): Metadata => {
    return _.mapValues(md.getMap(), v => v.toString());
  };

  private _normalizeError = (err: any, serviceName: string): grpc.ServiceError => {
    const error = createError(err, { ...DEFAULT_SERVER_ERROR });
    error.forwardedFor.unshift(serviceName);
    const resMetadata = new grpc.Metadata();
    resMetadata.set(HEADERS.TRAILER_ERROR, JSON.stringify(error));

    return {
      name: error.code,
      code: ERROR_CODES_TO_GRPC_STATUS[error.code],
      message: error.message,
      metadata: resMetadata,
    };
  };

  private _handleUnaryRequest = (
    call: grpc.ServerUnaryCall<any> | grpc.ServerWriteableStream<any>
  ) => {
    const metadata = this._grpcMetadataToMetadata(call.metadata);
    const serializedDeadline = metadata[HEADERS.DEADLINE];
    let deadline = null;
    if (serializedDeadline != null) {
      delete metadata[HEADERS.DEADLINE];
      try {
        deadline = new Date(serializedDeadline);
      } catch (e) {}
    }
    const request$ = of(call.request);
    const context = Context.create({
      metadata,
      deadline,
    });

    call.on('cancelled', () => {
      context.cancel();
    });

    return {
      request$,
      context,
    };
  };

  private _handleStreamingRequest = (
    call: grpc.ServerReadableStream<any> | grpc.ServerDuplexStream<any, any>
  ) => {
    const metadata = this._grpcMetadataToMetadata(call.metadata);
    const context = Context.create({
      metadata,
    });
    call.on('cancelled', () => {
      context.cancel();
    });
    const request$ = new Observable(observer => {
      call.on('data', d => observer.next(d));
      call.on('end', () => observer.complete());
      call.on('error', e => observer.error(e));
    });

    return { request$, context };
  };

  private _handleUnaryResponse = (
    response$: Observable<any>,
    cb: grpc.sendUnaryData<any>,
    serviceName: string
  ) => {
    response$.subscribe(
      res => {
        cb(null, res);
      },
      err => {
        const serviceError = this._normalizeError(err, serviceName);
        cb(serviceError, null);
      }
    );
  };

  private _handleStreamingResponse = (
    response$: Observable<any>,
    call: grpc.ServerWriteableStream<any> | grpc.ServerDuplexStream<any, any>,
    serviceName: string
  ) => {
    response$.subscribe(
      res => {
        call.write(res);
      },
      err => {
        const serviceError = this._normalizeError(err, serviceName);
        call.emit('error', serviceError);
      },
      () => {
        call.end();
      }
    );
  };
}
