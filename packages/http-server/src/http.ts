import { DEFAULT_SERVER_ERROR } from './../../core/src/errors';
import * as express from 'express';
import { Server as NodeHttpServer } from 'http';
import * as _ from 'lodash';
import {
  Service,
  Request,
  Context,
  normalizeError,
  ERROR_CODES_TO_HTTP_STATUS,
  HEADERS,
} from '@types-first-api/core';
import { isArray, isString } from 'util';

import { parseStreamingJson, writeStreamingJson } from './jsonStreaming';

const HEADER_DEADLINE = 'x-grpc-deadline';

export class HttpServer {
  private _server = express();
  private _httpServer: NodeHttpServer = null;

  constructor(...services: Service<any, any, any>[]) {
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
        const port = isString(addr) ? 0 : addr.port;
        resolve(port);
      });
    });
  };

  shutdown(): Promise<{}> {
    return new Promise((resolve, reject) => {
      if (this._httpServer == null) {
        return resolve();
      }
      this._httpServer.close(resolve);
      this._httpServer = null;
    });
  }

  private _addEndpoint = (
    serviceName: string,
    methodName: string,
    service: Service<any, any, any>
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
          const error = normalizeError(err, DEFAULT_SERVER_ERROR);
          const status = ERROR_CODES_TO_HTTP_STATUS[error.code];

          if (res.headersSent) {
            res.addTrailers({
              [HEADERS.TRAILER_ERROR]: status,
              [HEADERS.TRAILER_ERROR]: JSON.stringify(error),
            });
            res.end();
          } else {
            res.status(status);
            res.json(error);
            res.end();
          }
        },
        () => {
          res.end();
        }
      );
    });
  };
}
