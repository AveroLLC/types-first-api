import * as pbjs from 'protobufjs';
import { Endpoint } from './interfaces';

// interfaces and service generated from the test proto

export interface TestService {
  increment: Endpoint<IncrementRequest, IncrementResponse>;
  concat: Endpoint<ConcatRequest, ConcatResponse>;
}
export interface IncrementRequest {
  val: number;
  add?: number;
}
export interface IncrementResponse {
  val: number;
}
export interface ConcatRequest {
  val: string;
  add?: string;
}
export interface ConcatResponse {
  val: string;
}
interface Services {
  TestService: TestService;
}
var jsonDescriptor = JSON.parse(
  '{"nested":{"TestService":{"methods":{"increment":{"requestType":"IncrementRequest","responseType":"IncrementResponse"},"concat":{"requestType":"ConcatRequest","responseType":"ConcatResponse"}}},"IncrementRequest":{"fields":{"val":{"rule":"required","type":"int32","id":1},"add":{"type":"int32","id":2}}},"IncrementResponse":{"fields":{"val":{"rule":"required","type":"int32","id":1}}},"ConcatRequest":{"fields":{"val":{"rule":"required","type":"string","id":1},"add":{"type":"string","id":2}}},"ConcatResponse":{"fields":{"val":{"rule":"required","type":"string","id":1}}}}}'
);
var root = pbjs.Root.fromJSON(jsonDescriptor);
export const pbjsService = root.lookupService('TestService');
