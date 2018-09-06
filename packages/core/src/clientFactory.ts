import { GRPCServiceMap, Client } from '../interfaces';
import * as pbjs from 'protobufjs';
import * as grpcClient from '../grpc/grpcClient';
import * as httpClient from '../http/httpClient';

export function createClientFactory<
  TServiceDefinitions extends GRPCServiceMap<TServiceDefinitions>
>(pbjsRoot: pbjs.Root) {
  function forService<K extends Extract<keyof TServiceDefinitions, string>>(
    serviceName: K
  ): Client<TServiceDefinitions[K]> {
    // TODO: switch on client type
    // switch (protocol) {
    //   case SupportedProtocols.GRPC:
    //     return grpcClient.createClient<TServiceDefinitions[K]>(
    //       pbjsRoot,
    //       serviceName,
    //       address
    //     );
    //   case SupportedProtocols.HTTP:
    //     return httpClient.createClient(pbjsRoot, serviceName, address);
    // }
    return null;
  }

  return { forService };
}
