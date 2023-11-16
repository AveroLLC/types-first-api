import { Observable } from 'rxjs';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};
export interface Metadata {
  [key: string]: string;
}

export interface Endpoint<TReq, TRes> {
  request: TReq;
  response: TRes;
}

export type GRPCService<TService> = { [K in keyof TService]: Endpoint<any, any> };

export type GRPCServiceMap<TServices> = {
  [K in keyof TServices]: GRPCService<TServices[K]>;
};

export type ClientRequest<TReq> = Observable<DeepPartial<TReq>> | DeepPartial<TReq>;
export type ClientResponse<TRes> = Observable<TRes>;

export type ServerRequest<TReq> = Observable<TReq>;
export type ServerResponse<TRes> =
  | Observable<DeepPartial<TRes>>
  | Promise<DeepPartial<TRes>>;

// DEPRECATED
export type Request<TReq> = Observable<TReq>;
export type Response<TRes> = Observable<TRes>;
