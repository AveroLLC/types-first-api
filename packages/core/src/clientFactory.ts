import * as pbjs from 'protobufjs';
import { ClientAddress, ClientConstructor } from './client';
import { GRPCServiceMap } from './interfaces';

export function clientFactory<TServices extends GRPCServiceMap<TServices>>(
  root: pbjs.Root
) {
  root.resolveAll();

  function create<K extends Extract<keyof TServices, string>>(
    serviceName: K,
    address: ClientAddress,
    ClientImpl: ClientConstructor<TServices[K]>,
    options?: Record<string, any>
  ) {
    const pbjsService = root.lookupService(serviceName);
    if (pbjsService == null) {
      throw new Error(`Unable to create instance of unknown service: ${serviceName}`);
    }

    return new ClientImpl(pbjsService, address, options);
  }

  return { create };
}
