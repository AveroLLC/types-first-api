import { GRPCService, Request, Response } from './interfaces';
import { Context } from './context';
import * as pbjs from 'protobufjs';
import * as _ from 'lodash';

export type RpcCall<TReq, TRes> = (req: Request<TReq>, ctx: Context) => Response<TRes>;

export type RpcCallMap<TService extends GRPCService<TService>> = {
  [K in keyof TService]: RpcCall<TService[K]['request'], TService[K]['response']>
};

export interface ClientMiddleware<
  TService extends GRPCService<TService>,
  TContext extends Context<any> = Context<{}>
> {
  (
    request$: Request<TService[keyof TService]['request']>,
    context: TContext,
    next: (
      request: Request<TService[keyof TService]['request']>,
      context: TContext
    ) => Response<TService[keyof TService]['response']>,
    methodName: keyof TService
  ): Response<TService[keyof TService]['response']>;
}

export abstract class Client<
  TService extends GRPCService<TService>,
  TContext extends Context<any> = Context
> {
  private _middleware: ClientMiddleware<TService, TContext>[] = [];

  pbjsService: pbjs.Service;
  rpc: RpcCallMap<TService>;

  private _call: <K extends keyof TService>(
    methodName: K,
    req: Request<TService[K]['request']>,
    ctx: Context
  ) => Response<TService[K]['request']>;

  constructor(
    protoService: pbjs.Service,
    middleware: ClientMiddleware<TService, TContext>[] = []
  ) {
    this.pbjsService = protoService;
    this.rpc = _.mapValues(protoService.methods, (method, methodName) => {
      return (req, ctx) => {
        return this.invokeCall(methodName, req, ctx);
      };
    }) as RpcCallMap<TService>;

    this._middleware = middleware;
  }

  addMiddleware = (middleware: ClientMiddleware<TService, TContext>) => {
    this._middleware.push(middleware);
  };

  private invokeCall = <K extends keyof TService>(
    methodName: K,
    req: Request<TService[K]['request']>,
    ctx: TContext
  ): Response<TService[K]['request']> => {
    const handlerNext = (req: Request<TService[K]['request']>, ctx: TContext) => {
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

    return stack(req, ctx);
  };
}
