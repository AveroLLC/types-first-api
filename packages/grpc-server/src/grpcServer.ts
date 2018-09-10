import { of, Observable } from 'rxjs';
import { Service, Metadata, Context } from '@types-first-api/core';
import * as grpc from 'grpc';
import * as _ from 'lodash';

export class GrpcServer {
  private _server = new grpc.Server();

  constructor(...services: Service<any, any, any>[]) {
    _.forEach(services, service => {
      const { pbjsService } = service;
      const grpcObj = grpc.loadObject(pbjsService);
      const serviceDef = _.get(grpcObj, [
        service.getName(),
        'service',
      ]) as grpc.ServiceDefinition<any>;

      this._server.addService(
        serviceDef,
        _.mapValues(serviceDef, (method, methodName) => {
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

  private _grpcMetadataToMetadata = (md: grpc.Metadata): Metadata => {
    return _.mapValues(md.getMap(), v => v.toString());
  };

  private _makeBidiStreamingHandler = (
    service: Service<any, any, any>,
    methodName: string
  ): grpc.handleBidiStreamingCall<any, any> => {
    return (call: grpc.ServerDuplexStream<any, any>) => {
      //@ts-ignore
      const metadata = this._grpcMetadataToMetadata(call.metadata);
      const request$ = new Observable(observer => {
        call.on('data', d => observer.next(d));
        call.on('end', () => observer.complete());
        call.on('error', e => observer.error(e));
      });

      const ctx = Context.create({
        metadata,
      });
      const response$ = service.call(methodName, request$, ctx);

      response$.subscribe(
        res => {
          call.write(res);
        },
        err => {
          call.destroy(err);
        },
        () => {
          call.end();
        }
      );
    };
  };

  private _makeClientStreamingHandler = (
    service: Service<any, any, any>,
    methodName: string
  ): grpc.handleClientStreamingCall<any, any> => {
    return (call: grpc.ServerReadableStream<any>, cb: grpc.sendUnaryData<any>) => {
      const metadata = this._grpcMetadataToMetadata(call.metadata);
      const request$ = new Observable(observer => {
        call.on('data', d => observer.next(d));
        call.on('end', () => observer.complete());
        call.on('error', e => observer.error(e));
      });
      const ctx = Context.create({
        metadata,
      });
      const response$ = service.call(methodName, request$, ctx);

      response$.subscribe(
        res => {
          cb(null, res);
        },
        err => {
          cb(err, null);
        }
      );
    };
  };

  private _makeServerStreamingHandler = (
    service: Service<any, any, any>,
    methodName: string
  ): grpc.handleServerStreamingCall<any, any> => {
    return (call: grpc.ServerWriteableStream<any>) => {
      const metadata = this._grpcMetadataToMetadata(call.metadata);
      const request$ = of(call.request);
      const ctx = Context.create({
        metadata,
      });
      const response$ = service.call(methodName, request$, ctx);

      response$.subscribe(
        res => {
          call.write(res);
        },
        err => {
          call.destroy(err);
        },
        () => {
          call.end();
        }
      );
    };
  };

  private _makeUnaryHandler = (
    service: Service<any, any, any>,
    methodName: string
  ): grpc.handleUnaryCall<any, any> => {
    return (call: grpc.ServerUnaryCall<any>, cb: grpc.sendUnaryData<any>) => {
      const metadata = this._grpcMetadataToMetadata(call.metadata);
      const request$ = of(call.request);
      const ctx = Context.create({
        metadata,
      });
      const response$ = service.call(methodName, request$, ctx);

      response$.subscribe(
        res => {
          cb(null, res);
        },
        err => {
          console.log('error case');
          cb(err, null);
        }
      );
    };
  };
}
