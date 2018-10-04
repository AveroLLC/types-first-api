import { take } from 'rxjs/operators';
import { Subject, Observable, Subscription } from 'rxjs';
import fetch, { Request } from 'cross-fetch';
import {
  Client,
  ClientAddress,
  Context,
  DEFAULT_CLIENT_ERROR,
  GRPCService,
  HEADERS,
  IError,
  Response,
  createError,
  isIError,
  StatusCodes,
} from '@types-first-api/core';
import { getPath, HTTP_STATUS_TO_ERROR_CODES } from '@types-first-api/http-common';
import * as pbjs from 'protobufjs';

export class HttpClient<TService extends GRPCService<TService>> extends Client<TService> {
  private _address: string;

  constructor(protoService: pbjs.Service, address: ClientAddress) {
    super(protoService, address);
    this._address = `http://${address.host}:${address.port}`;
  }

  _call<K extends keyof TService>(
    methodName: K,
    request$: Observable<TService[K]['request']>,
    ctx: Context
  ): Response<TService[K]['response']> {
    const method = this.pbjsService.get(methodName as string) as pbjs.Method;
    if (method.requestStream || method.responseStream) {
      const errorDetails = [];
      if (method.requestStream) {
        errorDetails.push('request streaming');
      }
      if (method.responseStream) {
        errorDetails.push('response streaming');
      }
      const error: IError = {
        code: StatusCodes.ClientError,
        message: 'Streaming requests are not supported by the HTTP Client.',
        details: `The method ${methodName} requires support for ${errorDetails.join(
          ' and '
        )}, which is not provided by the HTTP Client.`,
      };
      throw error;
    }
    const serviceName = this.getName();
    const path = getPath(serviceName, methodName as string);

    const response$ = new Subject<TService[K]['response']>();

    const url = `${this._address}${path}`;
    const requestSubscription = request$.pipe(take(1)).subscribe(val => {
      fetch(url, {
        method: 'POST',
        headers: {
          ...ctx.metadata,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(val),
      })
        .catch(err => {
          const error: IError = {
            code: StatusCodes.NetworkError,
            message: err.message,
          };
          throw error;
        })
        .then(res => {
          if (res.ok) {
            return res.json();
          }

          return res.json().then(err => {
            if (isIError(err)) {
              throw err;
            }

            const code = HTTP_STATUS_TO_ERROR_CODES[res.status] || 0;
            throw {
              code,
              ...DEFAULT_CLIENT_ERROR,
            };
          });
        })
        .then(r => {
          response$.next(r);
          response$.complete();
        })
        .catch(err => {
          const error = createError(err, {
            ...DEFAULT_CLIENT_ERROR,
          });
          response$.error(error);
        })
        .then(() => {
          if (cancelSubscription != null) {
            cancelSubscription.unsubscribe();
          }
        });
    });

    const cancelSubscription = ctx.cancel$.pipe(take(1)).subscribe(err => {
      response$.error(err);
      requestSubscription.unsubscribe();
    });

    return response$.asObservable();
  }
}
