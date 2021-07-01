import * as chalk from "chalk";
import * as path from "path";
import * as fs from "fs";
import { compile, recursiveReadDirectoryWithContents } from "./compileClient";

export class Compiler {
  compile(project: string, to: string): { luaPrimaryFile: string, files: Record<string, string> } {
    const primaryFile = JSON.parse(fs.readFileSync(path.join(require.resolve(project), "../package.json"), "utf-8")).main;

    let split = primaryFile.split(".");
    split.pop();
    split = split.join(".").split("/");
    const luaPrimaryFile = split.join(".");

    console.log(`${chalk.grey("[")}${chalk.green("Compiler")}${chalk.grey("]")} compiling ${chalk.cyan(project)} ${chalk.grey("[")}${chalk.blue(primaryFile)}${chalk.grey("]")} ${chalk.grey("(")}${chalk.blue(path.join(require.resolve(project), ".."))}${chalk.grey(")")}`)

    compile(project, to);

    fs.writeFileSync(path.join(to, "package.json"), fs.readFileSync(path.join(require.resolve(project), "..", "package.json")));

    return { luaPrimaryFile, files: recursiveReadDirectoryWithContents(to) };
  }
}
