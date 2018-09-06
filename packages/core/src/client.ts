import { GRPCService, Request, Response } from './interfaces';
import { Context } from './context';
import * as pbjs from 'protobufjs';
import * as _ from 'lodash';
import { defer, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { normalizeError, DEFAULT_CLIENT_ERROR } from './errors';

export type RpcCall<TReq, TRes> = (req: Request<TReq>, ctx: Context) => Response<TRes>;

export type RpcCallMap<TService extends GRPCService<TService>> = {
  [K in keyof TService]: RpcCall<TService[K]['request'], TService[K]['response']>
};

export interface ClientMiddleware<TService extends GRPCService<TService>, TContext = {}> {
  (
    request$: Request<TService[keyof TService]['request']>,
    context: Context<TContext>,
    next: (
      request: Request<TService[keyof TService]['request']>,
      context: Context<TContext>
    ) => Response<TService[keyof TService]['response']>,
    methodName: keyof TService
  ): Response<TService[keyof TService]['response']>;
}

export abstract class Client<TService extends GRPCService<TService>, TContext = {}> {
  private _middleware: ClientMiddleware<TService, TContext>[] = [];

  pbjsService: pbjs.Service;
  rpc: RpcCallMap<TService>;

  constructor(protoService: pbjs.Service) {
    this.pbjsService = protoService;
    this.rpc = _.mapValues(protoService.methods, (method, methodName) => {
      return (req, ctx) => {
        return this.invokeCall(methodName, req, ctx);
      };
    }) as RpcCallMap<TService>;
  }

  abstract _call<K extends keyof TService>(
    methodName: K,
    req: Request<TService[K]['request']>,
    ctx: Context<TContext>
  ): Response<TService[K]['response']>;

  addMiddleware = (middleware: ClientMiddleware<TService, TContext>) => {
    this._middleware.push(middleware);
  };

  private invokeCall = <K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]['request']>,
    context: Context<TContext>
  ): Response<TService[K]['response']> => {
    const handlerNext = (
      req: Request<TService[K]['request']>,
      ctx: Context<TContext>
    ) => {
      return this._call(methodName, req, ctx);
    };

    const stack = _.reduceRight(
      this._middleware,
      (next, middleware) => {
        return (req, ctx) => {
          return middleware(req, ctx, next, methodName);
        };
      },
      handlerNext
    );

    const response$ = defer(() => stack(request$, context));

    // Will always throw a structured error
    return response$.pipe(
      catchError(err => throwError(normalizeError(err, DEFAULT_CLIENT_ERROR)))
    );
  };
}
