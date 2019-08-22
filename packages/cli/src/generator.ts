import * as _ from "lodash";
import * as pbjs from "protobufjs";
import * as ts from "typescript";
import * as path from "path";

/*
So you're digging around in here and want to make some changes, huh?

You're going to need...
- https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
- https://astexplorer.net/
- The moral support of Kevin Saldaña

Good luck!
*/

export default function generate(protoPath: string): string {
  const root = pbjs.loadSync(protoPath);
  root.resolveAll();
  const interfaces = parseNode(root);
  const clientServer = initializeClientAndServer(
    root,
    path.basename(protoPath)
  );

  return buildSourceFile([...interfaces, ...clientServer]);
}

function initializeClientAndServer(
  root: pbjs.Root,
  protoFilename: string
): ts.Statement[] {
  const serviceNames = createServiceList(root);
  const serviceDefinitionsIdentifier = ts.createIdentifier("Services");
  const jsonDescriptorIdentifier = ts.createIdentifier("jsonDescriptor");
  const rootIdentifier = ts.createIdentifier("root");
  const packageDefinitionIdentifier = ts.createIdentifier("packageDefinition");

  return [
    ts.createInterfaceDeclaration(
      [],
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      serviceDefinitionsIdentifier,
      [],
      [],
      serviceNames.map(serviceName =>
        ts.createPropertySignature(
          [],
          ts.createLiteral(serviceName),
          null,
          ts.createTypeReferenceNode(serviceName, []),
          null
        )
      )
    ),
    ts.createVariableStatement(
      [],
      [
        ts.createVariableDeclaration(
          jsonDescriptorIdentifier,
          null,
          ts.createCall(
            ts.createPropertyAccess(ts.createIdentifier("JSON"), "parse"),
            [],
            [ts.createLiteral(JSON.stringify(root))]
          )
        )
      ]
    ),
    ts.createVariableStatement(
      [],
      [
        ts.createVariableDeclaration(
          rootIdentifier,
          null,
          ts.createCall(
            ts.createPropertyAccess(
              ts.createPropertyAccess(ts.createIdentifier("pbjs"), "Root"),
              "fromJSON"
            ),
            [],
            [jsonDescriptorIdentifier]
          )
        )
      ]
    ),
    ts.createVariableStatement(
      [],
      [
        ts.createVariableDeclaration(
          packageDefinitionIdentifier,
          null,
          ts.createCall(
            ts.createIdentifier("loadSync"),
            [],
            [ts.createLiteral(`../protos/${protoFilename}`)]
          )
        )
      ]
    ),
    ts.createVariableStatement(
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      [
        ts.createVariableDeclaration(
          "clients",
          null,
          ts.createCall(
            ts.createPropertyAccess(
              ts.createIdentifier("tfapi"),
              "clientFactory"
            ),
            [ts.createTypeReferenceNode(serviceDefinitionsIdentifier, [])],
            [packageDefinitionIdentifier]
          )
        )
      ]
    ),
    ts.createVariableStatement(
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      [
        ts.createVariableDeclaration(
          "services",
          null,
          ts.createCall(
            ts.createPropertyAccess(
              ts.createIdentifier("tfapi"),
              "serviceFactory"
            ),
            [ts.createTypeReferenceNode(serviceDefinitionsIdentifier, [])],
            [rootIdentifier]
          )
        )
      ]
    )
  ];
}

function createServiceList(node: any): string[] {
  const services = [];
  if (isService(node)) {
    services.push(node.fullName.slice(1));
  }
  if (isNamespace(node)) {
    const nestedServices = _.flatMap(node.nested, createServiceList);
    services.push(...nestedServices);
  }
  return services;
}

function isNamespace(obj: any): obj is pbjs.Namespace {
  return obj.nested != null;
}

function isMessage(obj: any): obj is pbjs.Type {
  return obj.fields != null;
}

function isEnum(obj: any): obj is pbjs.Enum {
  return obj.values != null;
}

function isMapField(obj: any): obj is pbjs.MapField {
  return obj.keyType != null;
}

function isService(obj: any): obj is pbjs.Service {
  return obj.methods != null;
}

function parseNode(jsonNode: any, name = ""): ts.Statement[] {
  const statements = [];
  if (isNamespace(jsonNode)) {
    statements.push(...buildNamespace(jsonNode, name));
  }
  if (isMessage(jsonNode)) {
    statements.push(buildMessage(jsonNode, name));
  }
  if (isEnum(jsonNode)) {
    statements.push(buildEnum(jsonNode, name));
  }
  if (isService(jsonNode)) {
    statements.push(buildService(jsonNode, name));
  }
  return statements;
}

function buildNamespace(
  jsonNode: pbjs.Namespace,
  name: string
): ts.Statement[] {
  const children = _.flatMap(jsonNode.nested, parseNode);

  if (name === "") {
    return children;
  }

  return [
    ts.createModuleDeclaration(
      [],
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.createIdentifier(name),
      ts.createModuleBlock(children),
      ts.NodeFlags.Namespace
    )
  ];
}

function buildMessage(jsonNode: pbjs.Type, name: string): ts.Statement {
  const fields = _.map(jsonNode.fields, buildField);
  const oneofs = _.map(jsonNode.oneofs, buildOneOf);
  return ts.createInterfaceDeclaration(
    [],
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    name,
    [],
    [],
    [...oneofs, ...fields]
  );
}

function buildField(jsonNode: pbjs.Field, name: string): ts.TypeElement {
  const isOptional = jsonNode.rule !== "required";
  return ts.createPropertySignature(
    [],
    name,
    isOptional ? ts.createToken(ts.SyntaxKind.QuestionToken) : null,
    mapTypes(jsonNode),
    null
  );
}

function buildOneOf(jsonNode: pbjs.OneOf, name: string): ts.TypeElement {
  const fieldNames = jsonNode.fieldsArray.map(field => field.name);
  const fieldNameLiterals = fieldNames.map(fieldName => {
    return ts.createLiteralTypeNode(ts.createStringLiteral(fieldName));
  });
  return ts.createPropertySignature(
    [],
    name,
    ts.createToken(ts.SyntaxKind.QuestionToken),
    ts.createUnionTypeNode(fieldNameLiterals),
    null
  );
}

function buildEnum(jsonNode: pbjs.Enum, name: string): ts.Statement {
  const members = _.map(jsonNode.values, (n, k) => {
    return ts.createEnumMember(k, ts.createNumericLiteral(`${n}`));
  });
  return ts.createEnumDeclaration(
    [],
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    name,
    members
  );
}

function mapTypes(field: pbjs.Field): ts.TypeNode {
  let returnType: ts.TypeNode;
  switch (field.type) {
    case "double":
    case "float":
    case "int32":
    case "int64":
    case "uint32":
    case "uint64":
    case "sint32":
    case "sint64":
    case "fixed32":
    case "fixed64":
    case "sfixed32":
    case "sfixed64":
      returnType = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
      break;
    case "bool":
      returnType = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
      break;
    case "string":
      returnType = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      break;
    case "bytes":
      returnType = ts.createTypeReferenceNode("Uint8Array", []);
      break;
    default:
      // TODO: custom parsers go here
      returnType = ts.createTypeReferenceNode(
        field.resolvedType.fullName.slice(1),
        []
      );
      break;
  }

  if (isMapField(field)) {
    returnType = ts.createTypeLiteralNode([
      ts.createIndexSignature(
        [],
        [],
        [
          ts.createParameter(
            [],
            [],
            null,
            "key",
            null,
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
          )
        ],
        returnType
      )
    ]);
  } else if (field.rule === "repeated") {
    returnType = ts.createArrayTypeNode(returnType);
  }

  return returnType;
}

function buildService(jsonNode: pbjs.Service, name: string): ts.Statement {
  const rpcs = _.map(jsonNode.methods, buildMethods);
  return ts.createInterfaceDeclaration(
    [],
    [ts.createToken(ts.SyntaxKind.ExportKeyword)],
    name,
    [],
    [],
    rpcs
  );
}

function buildMethods(method: pbjs.Method, name: string): ts.TypeElement {
  return ts.createPropertySignature(
    [],
    name,
    null,
    ts.createTypeReferenceNode("tfapi.Endpoint", [
      ts.createTypeReferenceNode(method.requestType, []),
      ts.createTypeReferenceNode(method.responseType, [])
    ]),
    null
  );
}

function buildSourceFile(statements: ts.Statement[]) {
  const importStatements = [
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        null,
        ts.createNamespaceImport(ts.createIdentifier("tfapi"))
      ),
      ts.createLiteral("@types-first-api/core")
    ),
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        null,
        ts.createNamespaceImport(ts.createIdentifier("pbjs"))
      ),
      ts.createLiteral("protobufjs")
    ),
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        null,
        ts.createNamedImports([
          ts.createImportSpecifier(undefined, ts.createIdentifier("loadSync"))
        ])
      ),
      ts.createLiteral("@grpc/proto-loader")
    )
  ];
  let resultFile = ts.createSourceFile(
    "someFileName.ts",
    "",
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS
  );
  resultFile = ts.updateSourceFileNode(resultFile, [
    ...importStatements,
    ...statements
  ]);
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed
  });
  return printer.printFile(resultFile);
}
