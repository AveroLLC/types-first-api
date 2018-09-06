import { GRPCService, Metadata, Request, Response } from './interfaces';
import { Observable, throwError, of, defer } from 'rxjs';
import * as grpc from 'grpc';
import * as pbjs from 'protobufjs';
import * as _ from 'lodash';
import { isError } from 'util';
import { catchError, map } from 'rxjs/operators';
import { Context } from './context';
import { IError, ErrorCodes, normalizeError } from './errors';

export interface Handler<
  TReq,
  TRes,
  TContext extends Context<any> = Context<{}>,
  TDependencies extends object = {}
> {
  (request$: Request<TReq>, context: TContext, dependencies: TDependencies): Response<
    TRes
  >;
}

export interface Middleware<
  TService extends GRPCService<TService>,
  TContext extends Context<any> = Context<{}>,
  TDependencies extends object = {}
> {
  (
    request$: Request<TService[keyof TService]['request']>,
    context: TContext,
    dependencies: TDependencies,
    next: (
      request$: Request<TService[keyof TService]['request']>,
      context: TContext
    ) => Response<TService[keyof TService]['response']>,
    methodName: keyof TService
  ): Response<TService[keyof TService]['response']>;
}

export type HandlerMap<
  TService extends GRPCService<TService>,
  TContext extends Context<any> = Context<{}>,
  TDependencies extends object = {}
> = {
  [K in keyof TService]: Handler<
    TService[K]['request'],
    TService[K]['response'],
    TContext,
    TDependencies
  >
};

export class Service<
  TService extends GRPCService<TService>,
  TContext extends Context<any> = Context<{}>,
  TDependencies extends object = {}
> {
  private _handlers: HandlerMap<TService, TContext, TDependencies> = {} as HandlerMap<
    TService,
    TContext,
    TDependencies
  >;
  private _dependencies: TDependencies;
  private _middleware: Middleware<TService, TContext, TDependencies>[] = [];
  pbjsService: pbjs.Service;

  constructor(protoService: pbjs.Service, dependencies: TDependencies) {
    this.pbjsService = protoService;
    this._dependencies = dependencies;
  }

  private _notImplemented = (methodName: keyof TService) => () => {
    const err: IError = {
      code: ErrorCodes.NotImplemented,
      message: `RPC Method ${methodName} is not implemented`,
    };
    return throwError(err);
  };

  addMiddleware = (m: Middleware<TService, TContext, TDependencies>) => {
    this._middleware.push(m);
  };

  registerServiceHandler = <K extends keyof TService>(
    rpcName: K,
    handler: Handler<
      TService[K]['request'],
      TService[K]['response'],
      TContext,
      TDependencies
    >
  ) => {
    this._handlers[rpcName] = handler;
  };

  registerServiceHandlers = (impl: HandlerMap<TService, TContext, TDependencies>) => {
    this._handlers = impl;
  };

  call = <K extends keyof TService>(
    method: K,
    request: Request<TService[K]['request']>,
    context: TContext
  ): Observable<TService[K]['response']> => {
    const handler = this._handlers[method] || this._notImplemented(method);

    const handlerNext = (req: Request<TService[K]['request']>, ctx: TContext) => {
      return handler(req, ctx, this._dependencies);
    };

    const stack = _.reduceRight(
      this._middleware,
      (next, middleware) => {
        return (req, ctx) => {
          return middleware(req, ctx, this._dependencies, next, method);
        };
      },
      handlerNext
    );

    const response$ = defer(() => stack(request, context));

    // Will always throw a structured error
    return response$.pipe(catchError(err => throwError(normalizeError(err))));
  };

  getName = (): string => {
    return this.pbjsService.fullName.slice(1);
  };

  getMethodNames = (): string[] => {
    return this.pbjsService.methodsArray.map(m => m.name);
  };
}
