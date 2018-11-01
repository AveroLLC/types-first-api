# Server

## install

`npm install --save @types-first-api/cli`
`npm install --save @types-first-api/server`

## Make a proto file

_say something about how this lib is condusive to API first design_

`todo.proto`

```protobuf
syntax = "proto3";
package todo;

//- - - - - - services - - - - - -
service TodoService {
    rpc listTodos (listTodosRequest) returns (listTodosResponse);
    rpc createTodo (createTodoRequest) returns (createTodoResponse);
}

//- - - - - - req/res - - - - - -
message listTodosRequest {
}
message listTodosResponse {
    repeated Todo todos = 1;
}

message createTodoRequest {
    required string description = 1;
}
message createTodoResponse {
    required Todo todo = 1;
}


//- - - - - - objects - - - - - -
message Todo {
    required string id = 1;
    required string description = 2;
}
```

_SCREENSHOT: directory structure_

## generate code from proto file

run the following commend to generate interfaces/code based on the proto file we just made

`npx tfapi -o generated ./protos/todo.proto`

_SCREENSHOT: directory structure_

_mention something about keeping generated code sperate from application code_
