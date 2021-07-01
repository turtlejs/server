import { compile, recursiveReadDirectoryWithContents } from "./compileClient";
import { v4 as uuidv4 } from 'uuid';
import * as path from "path";
import * as fs from "fs";
import { Compiler } from "./compiler";

export type ProjectInformation = {
  luaPrimaryFile: string,
  path: string,
  id: string,
}

export type ExtendedProjectInformation = ProjectInformation & {
  // a record of files to their contents
  files: Record<string, string>,
}

export type CompileCacheMetadata = {
  /**
   * A listing of projects.
   */
  projects: ProjectInformation[];
}

export class CompileCache {
  metadata: CompileCacheMetadata;
  compiler: Compiler = new Compiler();

  constructor(protected readonly cacheLocation: string) {
    if (!fs.existsSync(this.cacheLocation)) {
      fs.mkdirSync(this.cacheLocation);
    }

    if (!fs.statSync(this.cacheLocation).isDirectory()) {
      throw new Error("Attempted to construct a CompileCache with a path that is not a directory. This is likely an issue with your config cache location set to that of a file.");
    }

    try {
      this.metadata = JSON.parse(fs.readFileSync(path.join(this.cacheLocation, "meta.json"), "utf-8"));
    } catch(err) {
      this.metadata = {
        projects: [],
      }

      this.storeMetadata();
    }
  }

  protected storeMetadata() {
    fs.writeFileSync(path.join(this.cacheLocation, "meta.json"), JSON.stringify(this.metadata));
  }

  has(project: string): boolean {
    const projectPath = path.join(require.resolve(project), "..");

    return this.metadata.projects.find(project => project.path === projectPath) !== undefined;
  }

  getMeta(project: string): ProjectInformation | undefined {
    const projectPath = path.join(require.resolve(project), "..");

    return this.metadata.projects.find(project => project.path === projectPath);
  }

  getMetaSafe(project: string): ProjectInformation {
    const result = this.getMeta(project);

    if (result === undefined) {
      throw new Error(`Expected project metadata ${project}, but couldn't find it.`);
    }

    return result;
  }

  get(project: string): ExtendedProjectInformation | undefined {
    const projectMetadata = this.getMeta(project);

    if (projectMetadata === undefined) {
      return undefined;
    }

    const projectCacheFiles = recursiveReadDirectoryWithContents(path.join(this.cacheLocation, projectMetadata.id));

    return {
      ...projectMetadata,
      files: projectCacheFiles,
    }
  }

  getSafe(project: string): ExtendedProjectInformation {
    const result = this.get(project);

    if (result === undefined) {
      throw new Error(`Expected project ${project}, but couldn't find it.`);
    }

    return result;
  }

  compile(project: string): ExtendedProjectInformation {
    const projectId = this.has(project) ? this.getMetaSafe(project).id : uuidv4();

    const { luaPrimaryFile, files } = this.compiler.compile(project, path.join(this.cacheLocation, projectId))

    if (!this.has(project)) {
      this.metadata.projects.push({
        path: path.join(require.resolve(project), ".."),
        id: projectId,
        luaPrimaryFile
      });
    }

    this.storeMetadata();

    return {
      path: path.join(require.resolve(project), ".."),
      id: projectId,
      files,
      luaPrimaryFile
    };
  }
}
