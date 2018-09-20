import * as _ from 'lodash';
import * as pbjs from 'protobufjs';
import { defer, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Context } from './context';
import { DEFAULT_SERVER_ERROR, ErrorCodes, IError, normalizeError } from './errors';
import { GRPCService, Request, Response } from './interfaces';

export interface Handler<TReq, TRes, TDependencies extends object = {}> {
  (request$: Request<TReq>, context: Context, dependencies: TDependencies): Response<
    TRes
  >;
}

export interface Middleware<
  TService extends GRPCService<TService>,
  TDependencies extends object = {}
> {
  (
    request$: Request<TService[keyof TService]['request']>,
    context: Context,
    dependencies: TDependencies,
    next: (
      request$: Request<TService[keyof TService]['request']>,
      context: Context
    ) => Response<TService[keyof TService]['response']>,
    methodName: keyof TService
  ): Response<TService[keyof TService]['response']>;
}

export type HandlerMap<
  TService extends GRPCService<TService>,
  TDependencies extends object = {}
> = {
  [K in keyof TService]: Handler<
    TService[K]['request'],
    TService[K]['response'],
    TDependencies
  >
};

export class Service<
  TService extends GRPCService<TService>,
  TDependencies extends object = {}
> {
  private _handlers: HandlerMap<TService, TDependencies> = {} as HandlerMap<
    TService,
    TDependencies
  >;
  private _dependencies: TDependencies;
  private _middleware: Middleware<TService, TDependencies>[] = [];
  pbjsService: pbjs.Service;

  constructor(protoService: pbjs.Service, dependencies: TDependencies) {
    this.pbjsService = protoService;
    this._dependencies = dependencies;
  }

  private _notImplemented = (methodName: keyof TService) => () => {
    const err: IError = {
      code: ErrorCodes.NotImplemented,
      message: `RPC Method '${methodName}' is not implemented.`,
      source: this.getName(),
    };
    return throwError(err);
  };

  addMiddleware = (m: Middleware<TService, TDependencies>) => {
    this._middleware.push(m);
  };

  registerServiceHandler = <K extends keyof TService>(
    rpcName: K,
    handler: Handler<TService[K]['request'], TService[K]['response'], TDependencies>
  ) => {
    this._handlers[rpcName] = handler;
  };

  registerServiceHandlers = (impl: HandlerMap<TService, TDependencies>) => {
    this._handlers = impl;
  };

  call = <K extends keyof TService>(
    method: K,
    request: Request<TService[K]['request']>,
    context: Context
  ): Observable<TService[K]['response']> => {
    const handler = this._handlers[method] || this._notImplemented(method);

    const handlerNext = (req: Request<TService[K]['request']>, ctx: Context) => {
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
    return response$.pipe(
      catchError(err =>
        throwError(
          normalizeError(err, {
            ...DEFAULT_SERVER_ERROR,
            source: this.getName(),
          })
        )
      )
    );
  };

  getName = (): string => {
    return this.pbjsService.fullName.slice(1);
  };

  getMethodNames = (): string[] => {
    return this.pbjsService.methodsArray.map(m => m.name);
  };
}
