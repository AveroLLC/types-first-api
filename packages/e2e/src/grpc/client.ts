import { mergeMap, delay } from 'rxjs/operators';
import { clients } from '../../generated/Service';
import { from } from 'rxjs';
import { Context } from '@types-first-api/core';
import { GrpcClient } from '@types-first-api/grpc-client';

const client = clients.create('wtf.guys.SchedulingService', 'localhost:5555', GrpcClient);

const response$ = client.rpc.BidiStream(
  from([{ id: '7' }, { id: '8' }, { id: '9' }]).pipe(
    mergeMap((v, i) => from([v]).pipe(delay(1000 * i)))
  ),
  Context.create({})
);

response$.subscribe(console.log, console.log, console.log);
