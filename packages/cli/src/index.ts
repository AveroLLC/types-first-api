#!/usr/bin/env node
import * as program from 'commander';
import * as fs from 'fs';
import { mkdirp } from 'mkdirp';
import * as path from 'path';
import generate from './generator';

program
  .usage('[options] <protofiles ...>')
  .option('-o, --output [outputDir]', 'output directory')
  .parse(process.argv);

if (program.args.length === 0) {
  program.outputHelp();
  process.exit(1);
}

const files = program.args;
const outputDir = path.resolve(process.cwd(), program.output || 'generated');
mkdirp(outputDir);

files.forEach(fileName => {
  const inputFilePath = path.resolve(process.cwd(), fileName);
  const basename = path.basename(fileName, '.proto');
  const outputFilePath = path.resolve(process.cwd(), outputDir, `${basename}.ts`);

  const generated = generate(inputFilePath);
  fs.writeFileSync(outputFilePath, generated);
});
