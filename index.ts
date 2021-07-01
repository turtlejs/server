import { CompileCache } from "./compileCache";
import * as pkgjson from "./package.json";
import * as config from "./config.json";
import { Compiler } from "./compiler";
import { v4 as uuidv4 } from "uuid";
import * as express from "express";
import { FileDB } from "./filedb";
import * as rimraf from "rimraf";
import * as chalk from "chalk";
import * as path from "path";
import * as fs from "fs";
const app = express();

let compileCache: CompileCache;
let compiler = new Compiler();

if (config.compile?.cache?.enabled) {
  if (config.compile.cache.destroyOnStart) {
    rimraf.sync(config.compile.cache.location);
  }

  if (config.compile.cache.location === undefined) {
    throw new Error("No compile cache defined in config. Please define one as `compile.cache.location: string`");
  }

  compileCache = new CompileCache(config.compile.cache.location);
}

if (config.compile.time === "onLaunch") {
  if (!config.compile?.cache?.enabled) {
    throw new Error("You want to compile once on launch, but have disabled or not defined caching. Caching is required for onLaunch compile time");
  }

  compileCache.compile("turtlejs-client");

  Object.entries(pkgjson.dependencies).forEach(([packageName]) => {
    try {
      if (JSON.parse(fs.readFileSync(path.join(require.resolve(packageName), "../package.json"), "utf-8")).dependencies["turtlejs-client"] !== undefined) {
        try {
          compileCache.compile(packageName);
        } catch (err) {
          if (!config.ignoreCompilationErrors) {
            console.error(`Failed to compile ${packageName}.`)
            console.error(err);
          }
        }
      }
    } catch(err) {
      if (!config.ignoreCompilationDiscoveryErrors) {
        console.error(`Failed to check ${packageName}.`)
        console.error(err);
      }
    }
  })
}

app.get("/turtlejs.lua", (req, res) => {
  res.send(fs.readFileSync("init.lua", "utf-8"))
})

app.get("/:program", (req, res) => {
  const filedb = new FileDB();
  let files: Record<string, string>, primaryFile: string;

  if (config.compile?.cache?.enabled && compileCache.has(req.params.program)) {
    const result = compileCache.getSafe(req.params.program);
    files = result.files;
    primaryFile = result.luaPrimaryFile;
  } else {
    // either cache is disabled, or a cache miss
    if (config.compile.time !== "onRequest") {
      // cache must be enabled. thus, a cache miss. Since we cache all modules on launch
      // the module must not exist

      res.status(404);
      res.send("The specified program does not exist.");
      return
    }

    // compile time is onRequest, so we can compile

    if (config.compile.temp === undefined) {
      throw new Error("No temp directory. Please define one in the config under `compile.temp.location: string`")
    }

    let result: {
      luaPrimaryFile: string;
      files: Record<string, string>;
    };

    if (config.compile?.cache?.enabled) {
      result = compileCache.compile(req.params.program);
    } else {
      const compileDir = path.join(config.compile.temp.location, uuidv4());
      result = compiler.compile(req.params.program, compileDir);
      rimraf.sync(compileDir);
      if (fs.readdirSync(config.compile.temp.location).length === 0) {
        fs.rmdirSync(config.compile.temp.location);
      }
    }

    files = result.files;
    primaryFile = result.luaPrimaryFile;
  }

  filedb.setPrimaryFile(primaryFile);

  Object.entries(files).forEach(([name, contents]) => {
    filedb.add({ name, contents });
  })

  res.send(filedb.serialize());
})

app.listen(config.server.port, () => {
  console.log(`${chalk.grey("[")}${chalk.green("Server")}${chalk.grey("]")} listening on port: ${chalk.yellow(config.server.port)}`)
})
