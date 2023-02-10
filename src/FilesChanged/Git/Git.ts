/*
 * Copyright (c) 2022, FinancialForce.com, inc. All rights reserved.
 */

import { SimpleGit, simpleGit } from 'simple-git';
import { IGit } from '../../api/IGit';

export class Git implements IGit {
  private git: SimpleGit;
  private MIN_GIT_VERSION_MAJOR = 2;
  private MIN_GIT_VERSION_MINOR = 37;
  private MIN_GIT_VERSION_PATCH = 0;

  constructor(dir: string) {
    this.git = simpleGit(dir);
  }
  private async versionCheck() {
    const version = await this.git.version();
    const isSupported =
      version.major >= this.MIN_GIT_VERSION_MAJOR &&
      version.minor >= this.MIN_GIT_VERSION_MINOR &&
      version.patch >= this.MIN_GIT_VERSION_PATCH;
    if (!isSupported)
      throw new Error(
        `Unsupported version of git. Min version must be ${this.MIN_GIT_VERSION_MAJOR}.${this.MIN_GIT_VERSION_MINOR}.${this.MIN_GIT_VERSION_PATCH}`
      );
  }
  public async getDefaultBranchName(): Promise<string> {
    this.versionCheck();
    const branch = await this.git.raw([
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      '--short',
    ]);
    if (branch.startsWith('origin/')) return branch.trim();
    else
      throw new Error(
        `Expected default branch '${branch}' to start with 'origin/'`
      );
  }

  public async diffRange(fromRef: string, toRef: string): Promise<Set<string>> {
    this.versionCheck();
    const diff = await this.git.diff([
      `${fromRef}...${toRef}`,
      '--name-only',
      '-z',
    ]);
    return new Set([
      ...diff
        .split('\u0000')
        .map(s => s.trim())
        .filter(s => s), //Removes any falsy values
    ]);
  }

  public async getLocalChanges(): Promise<Set<string>> {
    const status = await this.git.status();
    return new Set([...status.modified, ...status.renamed.map(r => r.to)]);
  }
}
