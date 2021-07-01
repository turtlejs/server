import * as tstl from "typescript-to-lua"
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { createDiagnosticReporter } from "typescript-to-lua";

export function recursiveReadDirectoryWithContents(directory: string, useFullPath: boolean = false): Record<string, string> {
  return Object.fromEntries(recursiveReadDirectory(directory, useFullPath).map(location => [location, fs.readFileSync(useFullPath ? location : path.join(directory, location), "utf-8")]));
}

export function recursiveReadDirectory(directory: string, useFullPath: boolean = false): string[] {
  const o: string[] = [];

  fs.readdirSync(directory).forEach(fileName => {
    const fileOrFolderDirectory = path.join(directory, fileName);

    if (fs.statSync(fileOrFolderDirectory).isDirectory()) {
      o.push(...recursiveReadDirectory(fileOrFolderDirectory, true));
      return;
    }

    o.push(fileOrFolderDirectory);
  })

  if (useFullPath) {
    return o;
  }

  return o.map(path => path.slice(directory.length + 1));
}

export function compile(project: string, to: string): void {
  const result = tstl.transpileProject(path.join(require.resolve(project), "../tsconfig.json"), {
    outDir: path.resolve(to),
  });

  const report = createDiagnosticReporter(true);

  result.diagnostics.forEach(report);
}
