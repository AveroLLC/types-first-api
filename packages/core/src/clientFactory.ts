import { Client, ClientAddress, ClientConstructor } from './client';
import { GRPCServiceMap } from './interfaces';
import {
  AnyDefinition,
  PackageDefinition,
  ServiceDefinition,
  Options,
} from '@grpc/proto-loader';

export function isServiceDefinition(
  def: AnyDefinition | undefined
): def is ServiceDefinition {
  return (
    def !== undefined &&
    def.format !== 'Protocol Buffer 3 DescriptorProto' &&
    def.format !== 'Protocol Buffer 3 EnumDescriptorProto'
  );
}

type GetPackageDefinition = (opts: Options) => PackageDefinition;
export function clientFactory<TServices extends GRPCServiceMap<TServices>>(
  getPackageDefinition: GetPackageDefinition
) {
  function create<K extends Extract<keyof TServices, string>>({
    serviceName,
    address,
    clientImplementation,
    clientOptions = {},
    protoOptions = {},
  }: {
    serviceName: K;
    address: ClientAddress;
    clientImplementation: ClientConstructor<TServices[K]>;
    clientOptions?: ConstructorParameters<ClientConstructor<TServices[K]>>[3];
    protoOptions?: Options;
  }): Client<TServices[K]> {
    const packageDefinition = getPackageDefinition(protoOptions);
    const service = packageDefinition[serviceName];
    if (!isServiceDefinition(service)) {
      throw new Error(`Unable to create instance of unknown service: ${serviceName}`);
    }

    return new clientImplementation(serviceName, service, address, clientOptions);
  }

  return { create };
}
