import { of, Observable } from 'rxjs';
import {
  Service,
  Metadata,
  Context,
  HEADERS,
  createError,
  DEFAULT_SERVER_ERROR,
} from '@types-first-api/core';
import { ERROR_CODES_TO_GRPC_STATUS } from '@types-first-api/grpc-common';
import * as grpc from 'grpc';
import * as _ from 'lodash';

export class GrpcServer {
  private _server = new grpc.Server();

  constructor(...services: Service<any, any>[]) {
    _.forEach(services, service => {
      const { pbjsService } = service;
      const grpcObj = grpc.loadObject(pbjsService);
      const serviceDef = (grpcObj as any).service as grpc.ServiceDefinition<any>;

      this._server.addService(
        serviceDef,
        _.mapValues(serviceDef, method => {
          const methodName = (method as any).originalName;

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
  }

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
    if (error.source == null) {
      error.source = serviceName;
    }
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

    //@ts-ignore types for grpc node suck
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
