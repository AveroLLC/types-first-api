import { Context } from './context';
import * as pbjs from 'protobufjs';

import { GRPCServiceMap } from '../interfaces';
import { Service, ServiceMiddleware } from './service';
import * as _ from 'lodash';

export function createServerFactory<
  TServiceDefinitions extends GRPCServiceMap<TServiceDefinitions>
>(pbjsRoot: pbjs.Root) {
  function forService<
    K extends Extract<keyof TServiceDefinitions, string>,
    TContext extends Context<any> = Context<{}>,
    TDependencies extends object = {}
  >(
    serviceName: K,
    dependencies: TDependencies,
    middleware: ServiceMiddleware<TServiceDefinitions[K], TContext, TDependencies>[] = []
  ): Service<TServiceDefinitions[K], TContext, TDependencies> {
    pbjsRoot.resolveAll();
    const service = pbjsRoot.lookup(serviceName) as pbjs.Service;
    if (service == null) {
      throw new Error(`Failed to lookup ${serviceName}`);
    }

    return new Service(service, dependencies);
  }

  return { forService };
}
