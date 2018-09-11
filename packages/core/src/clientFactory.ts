import { GRPCServiceMap } from './interfaces';
import { ClientConstructor } from './client';
import * as pbjs from 'protobufjs';

export function clientFactory<TServices extends GRPCServiceMap<TServices>>(
  root: pbjs.Root
) {
  root.resolveAll();

  function create<K extends Extract<keyof TServices, string>>(
    serviceName: K,
    address: string,
    ClientImpl: ClientConstructor<TServices[K]>
  ) {
    const pbjsService = root.lookupService(serviceName);
    if (pbjsService == null) {
      throw new Error(`Unable to create instance of unknown service: ${serviceName}`);
    }

    return new ClientImpl(pbjsService, address);
  }

  return { create };
}
