import { GRPCService, Request, Response } from './interfaces';
import { Context } from './context';
import * as pbjs from 'protobufjs';
import * as _ from 'lodash';
import { defer, throwError, race } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { createError, DEFAULT_CLIENT_ERROR } from './errors';
import { shortCircuitRace } from './shortCircuitRace';

export type RpcCall<TReq, TRes> = (req: Request<TReq>, ctx?: Context) => Response<TRes>;

export type RpcCallMap<TService extends GRPCService<TService>> = {
  [K in keyof TService]: RpcCall<TService[K]['request'], TService[K]['response']>
};

export interface ClientMiddleware<TService extends GRPCService<TService>> {
  (
    request$: Request<TService[keyof TService]['request']>,
    context: Context,
    next: (
      request: Request<TService[keyof TService]['request']>,
      context: Context
    ) => Response<TService[keyof TService]['response']>,
    methodName: keyof TService
  ): Response<TService[keyof TService]['response']>;
}

export type ClientConstructor<TService extends GRPCService<TService>> = new (
  protoService: pbjs.Service,
  address: ClientAddress
) => Client<TService>;

export interface ClientAddress {
  host: string;
  port: number;
}

export abstract class Client<TService extends GRPCService<TService>> {
  private _middleware: ClientMiddleware<TService>[] = [];

  protected pbjsService: pbjs.Service;
  rpc: RpcCallMap<TService>;

  constructor(protoService: pbjs.Service, address: ClientAddress) {
    this.pbjsService = protoService;
    this.rpc = _.mapValues<Record<string, pbjs.Method>, RpcCall<any, any>>(
      protoService.methods,
      (m, methodName) => {
        return (req, ctx) => {
          if (ctx == null) {
            ctx = Context.create();
          }
          return this.invokeCall(methodName as keyof TService, req, ctx);
        };
      }
    ) as RpcCallMap<TService>;
  }

  abstract _call<K extends keyof TService>(
    methodName: K,
    req$: Request<TService[K]['request']>,
    ctx: Context
  ): Response<TService[K]['response']>;

  addMiddleware = (middleware: ClientMiddleware<TService>) => {
    this._middleware.push(middleware);
  };

  getName = () => {
    return this.pbjsService.fullName.slice(1);
  };

  private invokeCall = <K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]['request']>,
    context: Context
  ): Response<TService[K]['response']> => {
    // TODO:
    // should I do a context.from here? if so, what happens to metadata?
    // do I need to race with context cancel?
    const handlerNext = (req$: Request<TService[K]['request']>, ctx: Context) => {
      return this._call(methodName, req$, ctx);
    };

    const stack = _.reduceRight(
      this._middleware,
      (next, middleware) => {
        return (req$, ctx: Context) => {
          return middleware(req$, ctx, next, methodName);
        };
      },
      handlerNext
    );

    const response$ = shortCircuitRace(
      context.cancel$,
      defer(() => stack(request$, context))
    );

    // Will always throw a structured error
    return response$.pipe(
      catchError(err =>
        throwError(
          createError(err, {
            ...DEFAULT_CLIENT_ERROR,
          })
        )
      )
    );
  };
}
