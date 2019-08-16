import * as pbjs from 'protobufjs';
import { GRPCServiceMap } from './interfaces';
import { Service } from './service';
import {PackageDefinition} from "@grpc/proto-loader";
import {isServiceDefinition} from "./clientFactory";

export function serviceFactory<TServices extends GRPCServiceMap<TServices>>(
  packageDefinition: PackageDefinition
) {

  function create<
    K extends Extract<keyof TServices, string>,
    TDependencies extends object
  >(serviceName: K, dependencies: TDependencies) {
    const service = packageDefinition[serviceName];
    if (!isServiceDefinition(service)) {
      throw new Error(
          `Unable to create instance of unknown service: ${serviceName}`
      );
    }

    return new Service<TServices[K], TDependencies>(serviceName, service, dependencies);
  }

  return { create };
}
