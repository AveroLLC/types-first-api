import * as _ from "lodash";
import { defer, throwError, from, isObservable } from "rxjs";
import { catchError } from "rxjs/operators";
import { Context } from "./context";
import {
  createError,
  DEFAULT_SERVER_ERROR,
  IError,
  StatusCodes
} from "./errors";
import { GRPCService, Request, Response } from "./interfaces";
import { createMessageValidator } from "./middleware/messageValidation";
import { shortCircuitRace } from "./shortCircuitRace";
import { MethodDefinition, ServiceDefinition } from "@grpc/proto-loader";

export interface Handler<TReq, TRes, TDependencies extends object = {}> {
  (request$: Request<TReq>, context: Context, dependencies: TDependencies):
    | Response<TRes>
    | Promise<TRes>;
}

type RequestDetails<TReq, TRes> = {
  method: MethodDefinition<TReq, TRes> & { name: string };
};

export interface Middleware<
  TService extends GRPCService<TService>,
  TDependencies extends object = {}
> {
  (
    request$: Request<TService[keyof TService]["request"]>,
    context: Context,
    dependencies: TDependencies,
    next: (
      request$: Request<TService[keyof TService]["request"]>,
      context: Context,
      dependencies?: TDependencies
    ) => Response<TService[keyof TService]["response"]>,
    requestDetails: RequestDetails<
      TService[keyof TService]["request"],
      TService[keyof TService]["response"]
    >
  ): Response<TService[keyof TService]["response"]>;
}

export type HandlerMap<
  TService extends GRPCService<TService>,
  TDependencies extends object = {}
> = {
  [K in keyof TService]: Handler<
    TService[K]["request"],
    TService[K]["response"],
    TDependencies
  >;
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
  serviceDefinition: ServiceDefinition;
  serviceName: string;

  constructor(
    serviceName: string,
    serviceDefinition: ServiceDefinition,
    dependencies: TDependencies
  ) {
    this.serviceDefinition = serviceDefinition;
    this._dependencies = dependencies;
    this.addMiddleware(createMessageValidator());
    this.serviceName = serviceName;
  }

  private _notImplemented = (methodName: keyof TService) => () => {
    const err: IError = {
      code: StatusCodes.NotImplemented,
      message: `RPC Method '${methodName}' is not implemented.`,
      forwardedFor: []
    };
    return throwError(err);
  };

  addMiddleware = (m: Middleware<TService, TDependencies>) => {
    this._middleware.push(m);
  };

  registerServiceHandler = <K extends keyof TService>(
    rpcName: K,
    handler: Handler<
      TService[K]["request"],
      TService[K]["response"],
      TDependencies
    >
  ) => {
    this._handlers[rpcName] = handler;
  };

  registerServiceHandlers = (impl: HandlerMap<TService, TDependencies>) => {
    this._handlers = impl;
  };

  call = <K extends keyof TService>(
    method: K,
    request: Request<TService[K]["request"]>,
    context: Context
  ): Response<TService[K]["response"]> => {
    const handler = this._handlers[method] || this._notImplemented(method);
    const methodDefinition = this.serviceDefinition[method as string];
    const requestDetails = {
      method: {
        name: methodDefinition.originalName,
        ...methodDefinition
      }
    };

    const handlerNext = (
      req: Request<TService[K]["request"]>,
      ctx: Context,
      dependencies: TDependencies = this._dependencies
    ) => {
      const handlerResult = handler(req, ctx, dependencies);
      return isObservable(handlerResult) ? handlerResult : from(handlerResult);
    };

    const stack = _.reduceRight(
      this._middleware,
      (next, middleware) => {
        return (req, ctx, dependencies = this._dependencies) => {
          return middleware(req, ctx, dependencies, next, requestDetails);
        };
      },
      handlerNext
    );

    const response$ = shortCircuitRace(
      context.cancel$,
      defer(() => stack(request, context))
    );

    // Will always throw a structured error
    return response$.pipe(
      catchError(err => throwError(createError(err, DEFAULT_SERVER_ERROR)))
    );
  };

  getName = (): string => {
    return this.serviceName;
  };

  getMethodNames = (): Array<keyof TService> => {
    return Object.keys(this.serviceDefinition) as Array<keyof TService>;
  };
}
