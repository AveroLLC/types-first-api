import {
  Client,
  ClientAddress,
  Context,
  createError,
  DEFAULT_CLIENT_ERROR,
  GRPCService,
  HEADERS,
  IError,
  Response,
  StatusCodes
} from "@types-first-api/core";
import {
  getPath,
  HTTP_STATUS_TO_ERROR_CODES
} from "@types-first-api/http-common";
import axios from "axios";

import { EMPTY, Observable, Subject } from "rxjs";
import { catchError, take } from "rxjs/operators";
import { ServiceDefinition } from "@grpc/proto-loader";

export class HttpClient<TService extends GRPCService<TService>> extends Client<
  TService
> {
  private readonly _address: string;

  constructor(
    serviceName: string,
    serviceDefinition: ServiceDefinition,
    address: ClientAddress
  ) {
    super(serviceName, serviceDefinition, address);
    this._address = `http://${address.host}:${address.port}`;
  }

  _call<K extends keyof TService>(
    methodName: K,
    request$: Observable<TService[K]["request"]>,
    ctx: Context
  ): Response<TService[K]["response"]> {
    const method = this.serviceDefinition[methodName as string];
    if (method.requestStream || method.responseStream) {
      const errorDetails = [];
      if (method.requestStream) {
        errorDetails.push("request streaming");
      }
      if (method.responseStream) {
        errorDetails.push("response streaming");
      }
      const error: IError = {
        code: StatusCodes.ClientError,
        message: "Streaming requests are not supported by the HTTP Client.",
        details: `The method ${methodName} requires support for ${errorDetails.join(
          " and "
        )}, which is not provided by the HTTP Client.`,
        forwardedFor: []
      };
      throw error;
    }
    const serviceName = this.getName();
    const path = getPath(serviceName, methodName as string);

    const response$ = new Subject<TService[K]["response"]>();

    const cancelSource = axios.CancelToken.source();

    const url = `${this._address}${path}`;
    const headers = {
      ...ctx.metadata
    };
    if (ctx.deadline != null) {
      headers[HEADERS.DEADLINE] = ctx.deadline.toISOString();
    }
    const requestSubscription = request$.pipe(take(1)).subscribe(val => {
      // TODO
      axios
        .post(url, val, {
          cancelToken: cancelSource.token,
          headers
        })
        .then(res => {
          response$.next(res.data);
          response$.complete();
        })
        .catch(err => {
          let structuredError: IError;
          if (err.response) {
            const { data, status } = err.response;
            const code =
              HTTP_STATUS_TO_ERROR_CODES[status] || StatusCodes.ServerError;
            structuredError = createError(data, {
              ...DEFAULT_CLIENT_ERROR,
              code
            });
          } else {
            // Something happened in setting up the request that triggered an Error
            structuredError = createError(err, {
              code: StatusCodes.Unavailable,
              message: "Something went wrong while processing the request.",
              forwardedFor: []
            });
          }

          response$.error(structuredError);
        })
        .then(() => {
          if (cancelSubscription != null) {
            cancelSubscription.unsubscribe();
          }
        });
    });
    const cancelSubscription = ctx.cancel$
      .pipe(
        catchError(err => {
          cancelSource.cancel(err.message);
          requestSubscription.unsubscribe();
          return EMPTY;
        })
      )
      .subscribe();

    return response$.asObservable();
  }
}
