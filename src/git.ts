/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { FileStatusResult, SimpleGit, simpleGit } from 'simple-git';

export enum FileStatus {
  Unmodified = ' ',
  Modified = 'M',
  TypeChanged = 'T',
  Added = 'A',
  Deleted = 'D',
  Renamed = 'R',
  Copied = 'C',
  Updated = 'U',
  Untracked = '?',
  Ignore = '!',
}

export class Git {
  private static MIN_GIT_VERSION_MAJOR = 2;
  private static MIN_GIT_VERSION_MINOR = 20;
  private gitInstance: undefined | SimpleGit = undefined;

  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  static async versionCheck(git: SimpleGit) {
    const version = await git.version();
    const isSupported =
      version.major >= this.MIN_GIT_VERSION_MAJOR &&
      version.minor >= this.MIN_GIT_VERSION_MINOR;

    if (!version.installed) {
      throw new Error('"git" is not installed or available on the PATH');
    }
    if (!isSupported)
      throw new Error(
        `Unsupported version of git. Min version must be ${this.MIN_GIT_VERSION_MAJOR}.${this.MIN_GIT_VERSION_MINOR}`
      );
  }

  private get git(): Promise<SimpleGit> {
    if (this.gitInstance) return Promise.resolve(this.gitInstance);
    //eslint-disable-next-line
    const git: SimpleGit = simpleGit(this.dir);
    return Git.versionCheck(git).then(() => {
      this.gitInstance = git;
      return git;
    });
  }

  public async gitRoot(): Promise<string> {
    return (await this.git).revparse('--show-toplevel');
  }

  public async getDefaultBranchName(): Promise<string> {
    return this.git
      .then(git =>
        git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'])
      )
      .catch(error => {
        if (error instanceof Error)
          throw Error(
            `Failed to find symbolic ref no remote HEAD with message: '${error.message.trim()}'`
          );
        else throw new Error('Failed to find symbolic ref no remote HEAD');
      })
      .then(branch => {
        if (branch.startsWith('origin/')) return branch.trim();
        else
          throw new Error(
            `Expected default branch '${branch}' to start with 'origin/'`
          );
      });
  }

  public async diffRange(fromRef: string, toRef: string): Promise<Set<string>> {
    return this.git
      .then(git => git.diff([`${fromRef}...${toRef}`, '--name-only', '-z']))
      .then(diff => {
        const files = diff
          .split('\u0000')
          .map(s => s.trim())
          .filter(s => s); //Removes any falsy values
        return new Set([...files]);
      });
  }

  public async getLocalChangedAndCreated(): Promise<Set<string>> {
    const excludeStatus = [FileStatus.Deleted, FileStatus.Ignore];

    return this.getFilteredStatus(
      f =>
        !excludeStatus.includes(f.index as FileStatus) &&
        !excludeStatus.includes(f.working_dir as FileStatus)
    );
  }

  public async getFilteredStatus(
    filterFn: (result: FileStatusResult) => boolean,
    gitDir?: string | undefined
  ): Promise<Set<string>> {
    return this.git
      .then(git => {
        return gitDir ? git.env('GIT_DIR', gitDir).status() : git.status();
      })
      .then(status => {
        return new Set(...[status.files.filter(filterFn).map(f => f.path)]);
      });
  }
}
