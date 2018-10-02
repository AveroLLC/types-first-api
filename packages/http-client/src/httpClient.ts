import fetch from 'cross-fetch';

export class HttpClient<TService extends GRPCService<TService>> extends Client<
  TService
> {}
