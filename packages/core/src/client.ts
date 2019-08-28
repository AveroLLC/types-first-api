import * as _ from "lodash";
import { defer, isObservable, of, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { Context } from "./context";
import { createError, DEFAULT_CLIENT_ERROR } from "./errors";
import { GRPCService, Request, Response } from "./interfaces";
import { shortCircuitRace } from "./shortCircuitRace";
import { MethodDefinition, ServiceDefinition } from "@grpc/proto-loader";

export type RpcCall<TReq, TRes> = (
  req: Request<TReq> | TReq,
  ctx?: Context
) => Response<TRes>;

export type RpcCallMap<TService extends GRPCService<TService>> = {
  [K in keyof TService]: RpcCall<
    TService[K]["request"],
    TService[K]["response"]
  >;
};

export type NextFunction<TService extends GRPCService<TService>> = (
  request: Request<TService[keyof TService]["request"]>,
  context: Context
) => Response<TService[keyof TService]["response"]>;

export interface ClientMiddleware<TService extends GRPCService<TService>> {
  (
    request$: Request<TService[keyof TService]["request"]>,
    context: Context,
    next: NextFunction<TService>,
    methodName: keyof TService
  ): Response<TService[keyof TService]["response"]>;
}

export type ClientConstructor<TService extends GRPCService<TService>> = new (
    serviceName: string,
    protoService: ServiceDefinition,
    address: ClientAddress,
    options: Record<string, any>
) => Client<TService>;

export interface ClientAddress {
  host: string;
  port: number;
}

export interface ClientOptions {
  serializeErrors?: boolean;
}
export abstract class Client<TService extends GRPCService<TService>> {
  private _middleware: ClientMiddleware<TService>[] = [];

  protected serviceDefinition: ServiceDefinition;
  protected options: ClientOptions;
  rpc: RpcCallMap<TService>;
  serviceName: string;

  constructor(
    serviceName: string,
    protoService: ServiceDefinition,
    address: ClientAddress,
    options: ClientOptions = {}
  ) {
    this.serviceDefinition = protoService;
    this.options = options;
    this.serviceName = serviceName;
    this.rpc = _.mapValues<
      Record<string, MethodDefinition<any, any>>,
      RpcCall<any, any>
    >(protoService, (m, methodName) => {
      return (req, ctx) => {
        if (ctx == null) {
          ctx = Context.create();
        }
        return this.invokeCall(methodName as keyof TService, req, ctx);
      };
    }) as RpcCallMap<TService>;
  }

  abstract _call<K extends keyof TService>(
    methodName: K,
    req$: Request<TService[K]["request"]>,
    ctx: Context
  ): Response<TService[K]["response"]>;

  addMiddleware = (middleware: ClientMiddleware<TService>) => {
    this._middleware.push(middleware);
  };

  getName = () => {
    return this.serviceName;
  };

  private invokeCall = <K extends keyof TService>(
    methodName: K,
    request$: Request<TService[K]["request"]> | TService[K]["request"],
    context: Context
  ): Response<TService[K]["response"]> => {
    // TODO:
    // should I do a context.from here? if so, what happens to metadata?
    // do I need to race with context cancel?
    const handlerNext: NextFunction<TService> = (
      req$: Request<TService[K]["request"]>,
      ctx: Context
    ): Response<TService[K]["response"]> => {
      return this._call(methodName, req$, ctx);
    };

    const stack = this._middleware
      .reverse()
      .reduce((next: NextFunction<TService>, middleware): NextFunction<
        TService
      > => {
        return (req$, ctx: Context) => {
          return middleware(req$, ctx, next, methodName);
        };
      }, handlerNext);

    const response$ = shortCircuitRace(
      context.cancel$,
      defer(() =>
        stack(isObservable(request$) ? request$ : of(request$), context)
      )
    );

    // Will always throw a structured error
    return response$.pipe(
      catchError(err => {
        const structuredError = createError(err, {
          ...DEFAULT_CLIENT_ERROR
        });
        return throwError(
          this.options.serializeErrors
            ? JSON.stringify(structuredError)
            : structuredError
        );
      })
    );
  };
}
