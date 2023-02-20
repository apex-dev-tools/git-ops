/*
 * Copyright (c) 2022, FinancialForce.com, inc. All rights reserved.
 */

import { SimpleGit, simpleGit } from 'simple-git';
import { IGit } from '../api/IGit';

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

export class Git implements IGit {
  private static MIN_GIT_VERSION_MAJOR = 2;
  private static MIN_GIT_VERSION_MINOR = 37;
  private static MIN_GIT_VERSION_PATCH = 0;
  private static gitInstance: undefined | SimpleGit = undefined;

  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  static async versionCheck(git: SimpleGit) {
    const version = await git.version();
    const isSupported =
      version.major >= this.MIN_GIT_VERSION_MAJOR &&
      version.minor >= this.MIN_GIT_VERSION_MINOR &&
      version.patch >= this.MIN_GIT_VERSION_PATCH;
    if (!isSupported)
      throw new Error(
        `Unsupported version of git. Min version must be ${this.MIN_GIT_VERSION_MAJOR}.${this.MIN_GIT_VERSION_MINOR}.${this.MIN_GIT_VERSION_PATCH}`
      );
  }

  private get git(): Promise<SimpleGit> {
    if (Git.gitInstance) return Promise.resolve(Git.gitInstance);
    //eslint-disable-next-line
    const git: SimpleGit = simpleGit(this.dir);
    return Git.versionCheck(git).then(() => {
      Git.gitInstance = git;
      return git;
    });
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

    return this.git
      .then(git => git.status())
      .then(status => {
        const changedFiles = status.files
          .filter(
            f =>
              !excludeStatus.includes(f.index as FileStatus) &&
              !excludeStatus.includes(f.working_dir as FileStatus)
          )
          .map(f => f.path);
        return new Set(...[changedFiles]);
      });
  }
}
