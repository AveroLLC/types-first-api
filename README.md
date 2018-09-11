# Types-First API

Tools and libraries to build & maintain api services with an emphasis on types and type-safety. Built with protobuffers, typescript, rxjs. Generates typesafe interfaces from protobuffer service definitions, and includes functioning client and server implementations for GRPC and HTTP transports.

Packages include

- Core - Should not be required directly, but will be included with the packages below. Includes the shared interfaces and constructs.
- CLI - generates interfaces from protobuffer files.
- HTTP Server
- HTTP Client
- GRPC Server
- GRPC Client

## TODO:

- Cancellation
- Deadlines
- Error propagation
