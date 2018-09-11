import { Service } from './service';
import { GRPCServiceMap } from './interfaces';
import * as pbjs from 'protobufjs';

export function serviceFactory<TServices extends GRPCServiceMap<TServices>>(
  root: pbjs.Root
) {
  root.resolveAll();

  function create<
    K extends Extract<keyof TServices, string>,
    TDependencies extends object
  >(serviceName: K, dependencies: TDependencies) {
    const pbjsService = root.lookupService(serviceName);
    if (pbjsService == null) {
      throw new Error(`Unable to create instance of unknown service: ${serviceName}`);
    }

    return new Service<TServices[K], TDependencies>(pbjsService, dependencies);
  }

  return { create };
}
