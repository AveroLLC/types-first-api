import * as express from 'express';
import { Server as NodeHttpServer } from 'http';
import * as _ from 'lodash';
import {
  Service,
  Request,
  Context,
  createError,
  HEADERS,
  DEFAULT_SERVER_ERROR,
} from '@types-first-api/core';
import { ERROR_CODES_TO_HTTP_STATUS } from '@types-first-api/http-common';
import { isArray, isString } from 'util';

import { parseStreamingJson, writeStreamingJson } from './jsonStreaming';

const HEADER_DEADLINE = 'x-grpc-deadline';

export class HttpServer {
  private _server = express();
  private _httpServer: NodeHttpServer = null;

  constructor(...services: Service<any, any>[]) {
    services.forEach(service => {
      service.getMethodNames().forEach(methodName => {
        this._addEndpoint(service.getName(), methodName as string, service);
      });
    });
  }

  bind = async (opts: { port: number; host?: string }) => {
    let { port, host } = opts;
    return new Promise<number>((resolve, reject) => {
      if (host == null) {
        host = '0.0.0.0';
      }
      this._httpServer = this._server.listen({ port, host });
      this._httpServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(err);
        }
      });
      this._httpServer.on('listening', () => {
        const addr = this._httpServer.address();
        // in the case of a unix socket binding, address would be a string:
        // https://nodejs.org/dist/latest-v8.x/docs/api/net.html#net_server_address
        const port = isString(addr) ? null : addr.port;
        resolve(port);
      });
    });
  };

  shutdown = async () => {
    return new Promise((resolve, reject) => {
      if (this._httpServer == null) {
        return resolve();
      }
      this._httpServer.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
      this._httpServer = null;
    });
  };

  private _addEndpoint = (
    serviceName: string,
    methodName: string,
    service: Service<any, any>
  ) => {
    this._server.post(`/rpc/${serviceName}/${methodName}`, (req, res) => {
      const request$: Request<any> = parseStreamingJson(req);

      const headers = _.mapValues(req.headers, v => (isArray(v) ? v.join(' ') : v));
      const deadline = headers[HEADER_DEADLINE];
      // TODO: respect cancellation, deadline
      const context = Context.create({
        metadata: headers,
        deadline: deadline == null ? null : new Date(deadline),
      });

      req.on('close', context.cancel);

      const response$ = service.call(methodName, request$, context);

      response$.subscribe(
        data => {
          if (!res.headersSent) {
            res.writeHead(200, {
              'content-type': 'application/json; charset=utf-8',
            });
          }

          res.write(JSON.stringify(data));
        },
        err => {
          const error = createError(err, {
            ...DEFAULT_SERVER_ERROR,
          });
          error.forwardedFor.unshift(serviceName);
          const status = ERROR_CODES_TO_HTTP_STATUS[error.code] || 500;

          res.addTrailers({
            [HEADERS.TRAILER_ERROR]: status,
            [HEADERS.TRAILER_ERROR]: JSON.stringify(error),
          });
          if (!res.headersSent) {
            res.status(status);
            res.json(error);
          }
          res.end();
        },
        () => {
          res.end();
        }
      );
    });
  };
}
