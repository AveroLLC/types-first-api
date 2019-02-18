import { Observable } from 'rxjs'

export interface Metadata {
  [key: string]: string;
}

export interface Endpoint<TReq, TRes> {
  request: TReq;
  response: TRes;
}

export type GRPCService<TService> = { [K in keyof TService]: Endpoint<any, any> };

export type GRPCServiceMap<TServices> = {
  [K in keyof TServices]: GRPCService<TServices[K]>
};

export type Request<TReq> = Observable<TReq>;

export type Response<TRes> = Observable<TRes> | Promise<TRes>;
