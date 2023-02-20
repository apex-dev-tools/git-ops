/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';

export class RepoManager {
  private isInit = false;
  private rootDir: string;
  private remoteRepoDir: string;
  private testRepoDir: string;
  private static instances: Map<string, RepoManager> = new Map();

  private constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.remoteRepoDir = rootDir + '/remote.git';
    this.testRepoDir = rootDir + '/test-repo';
  }

  public static getInstance(rootDir: string): RepoManager {
    if (!this.instances.has(rootDir)) {
      this.instances.set(rootDir, new RepoManager(rootDir));
    }
    return this.instances.get(rootDir)!;
  }
  private get git(): SimpleGit {
    if (!this.isInit) {
      throw new Error('Cannot perform git operation before calling init()');
    }
    // eslint-disable-next-line
    return simpleGit(this.testRepoDir) as SimpleGit;
  }

  private async initRemoteRepo() {
    if (!fs.existsSync(this.remoteRepoDir)) {
      fs.mkdirSync(this.remoteRepoDir, { recursive: true });
      // eslint-disable-next-line
      const git: SimpleGit = simpleGit(this.remoteRepoDir);
      await git.init(true);
    }
  }

  private async cloneRepo() {
    if (fs.existsSync(this.remoteRepoDir) && !fs.existsSync(this.testRepoDir)) {
      // eslint-disable-next-line
      await simpleGit().clone(this.remoteRepoDir, this.testRepoDir);
    }
  }

  get repoDir() {
    return this.testRepoDir;
  }

  async init() {
    await this.initRemoteRepo();
    await this.cloneRepo();
    this.isInit = true;
    await this.git
      .raw(['checkout', '-b', 'main'])
      .then(() => this.git.getRemotes())
      .then(remotes => {
        const [remote] = remotes;
        if (!remote) return this.git.addRemote('origin', this.remoteRepoDir);
      });
  }

  async setHead() {
    return await this.git.remote(['set-head', '--auto', 'origin']);
  }

  async push() {
    const debug = this.git.getRemotes();
    console.log(debug);
    return this.git.push('origin', 'main', ['-u']);
  }

  async checkout(branchName: string, from: string) {
    return this.git.checkoutBranch(branchName, from);
  }

  async stageAll(files: string[] = ['.']) {
    return this.git.add(files);
  }

  async getGitLog() {
    const log = await this.git.log();
    return log.all;
  }

  async stageAndCommitAll(files?: string[]) {
    return this.stageAll(files).then(() => this.git.commit('commit message'));
  }

  async tearDown() {
    await fs.promises.rm(this.rootDir, { recursive: true, force: true });
  }

  async createOrUpdateFile(fileName: string, content: string) {
    const fPath = path.join(this.testRepoDir, fileName);
    if (fs.existsSync(fPath)) {
      await fs.promises.appendFile(fPath, content);
    } else {
      await fs.promises.writeFile(fPath, content);
    }
  }

  rmFile(file: string) {
    fs.unlinkSync(path.join(this.testRepoDir, file));
  }

  renameFileInRepo(from: string, to: string) {
    const fromPath = path.join(this.testRepoDir, from);
    const toPath = path.join(this.testRepoDir, to);
    fs.renameSync(fromPath, toPath);
  }
}
