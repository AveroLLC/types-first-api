import * as _ from 'lodash';
import * as pbjs from 'protobufjs';
import * as ts from 'typescript';
import * as path from 'path';
import { createServiceList, parseNode } from './parseNode';

/*
So you're digging around in here and want to make some changes, huh?

You're going to need...
- https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
- https://astexplorer.net/
- The moral support of Kevin Saldaña

Good luck!
*/

export default function generate(protoPath: string, outputPath: string): string {
  const root = pbjs.loadSync(protoPath);
  root.resolveAll();
  const interfaces = parseNode(root);

  const relativeProtoDirectory =
    path.relative(path.dirname(outputPath), path.dirname(protoPath)) || '.';
  const clientServer = initializeClientAndServer(
    root,
    `${relativeProtoDirectory}/${path.basename(protoPath)}`
  );

  return buildSourceFile([...interfaces, ...clientServer]);
}

function initializeClientAndServer(
  root: pbjs.Root,
  relativeProtoPath: string
): ts.Statement[] {
  console.log(relativeProtoPath);
  const serviceNames = createServiceList(root);
  const serviceDefinitionsIdentifier = ts.createIdentifier('Services');
  const jsonDescriptorIdentifier = ts.createIdentifier('jsonDescriptor');
  const rootIdentifier = ts.createIdentifier('root');
  const getPackageDefinitionIdentifier = ts.createIdentifier('getPackageDefinition');

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
          undefined,
          ts.createTypeReferenceNode(serviceName, []),
          undefined
        )
      )
    ),
    ts.createVariableStatement(
      undefined,
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            jsonDescriptorIdentifier,
            undefined,
            ts.createCall(
              ts.createPropertyAccess(ts.createIdentifier('JSON'), 'parse'),
              [],
              [ts.createLiteral(JSON.stringify(root))]
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    ts.createVariableStatement(
      undefined,
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            rootIdentifier,
            undefined,
            ts.createCall(
              ts.createPropertyAccess(
                ts.createPropertyAccess(ts.createIdentifier('pbjs'), 'Root'),
                'fromJSON'
              ),
              [],
              [jsonDescriptorIdentifier]
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    ts.createVariableStatement(
      undefined,
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            getPackageDefinitionIdentifier,
            undefined,
            ts.createArrowFunction(
              undefined,
              undefined,
              [
                ts.createParameter(
                  undefined,
                  undefined,
                  undefined,
                  ts.createIdentifier('options'),
                  undefined,
                  ts.createTypeReferenceNode(ts.createIdentifier('Options'), undefined),
                  undefined
                ),
              ],
              undefined,
              ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              ts.createCall(ts.createIdentifier('loadSync'), undefined, [
                ts.createCall(
                  ts.createPropertyAccess(ts.createIdentifier('path'), 'resolve'),
                  [],
                  [ts.createIdentifier('__dirname'), ts.createLiteral(relativeProtoPath)]
                ),
                ts.createIdentifier('options'),
              ])
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    ts.createVariableStatement(
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            'clients',
            undefined,
            ts.createCall(
              ts.createPropertyAccess(ts.createIdentifier('tfapi'), 'clientFactory'),
              [ts.createTypeReferenceNode(serviceDefinitionsIdentifier, [])],
              [getPackageDefinitionIdentifier]
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    ts.createVariableStatement(
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.createVariableDeclarationList(
        [
          ts.createVariableDeclaration(
            'services',
            undefined,
            ts.createCall(
              ts.createPropertyAccess(ts.createIdentifier('tfapi'), 'serviceFactory'),
              [ts.createTypeReferenceNode(serviceDefinitionsIdentifier, [])],
              [rootIdentifier]
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
  ];
}

function buildSourceFile(statements: ts.Statement[]) {
  const importStatements = [
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        undefined,
        ts.createNamespaceImport(ts.createIdentifier('tfapi'))
      ),
      ts.createLiteral('@types-first-api/core')
    ),
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        undefined,
        ts.createNamespaceImport(ts.createIdentifier('pbjs'))
      ),
      ts.createLiteral('protobufjs')
    ),
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        undefined,
        ts.createNamedImports([
          ts.createImportSpecifier(undefined, ts.createIdentifier('loadSync')),
          ts.createImportSpecifier(undefined, ts.createIdentifier('Options')),
        ])
      ),
      ts.createLiteral('@grpc/proto-loader')
    ),
    ts.createImportDeclaration(
      [],
      [],
      ts.createImportClause(
        undefined,
        ts.createNamespaceImport(ts.createIdentifier('path'))
      ),
      ts.createLiteral('path')
    ),
  ];
  let resultFile = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS
  );
  resultFile = ts.updateSourceFileNode(resultFile, [...importStatements, ...statements]);
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });
  return printer.printFile(resultFile);
}
