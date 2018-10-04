export * from './errors';

export function getPath(serviceName: string, methodName: string) {
  return `/rpc/${serviceName}/${methodName}`;
}
