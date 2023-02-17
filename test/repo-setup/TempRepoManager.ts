/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';

export class TempRepoManager {
  private isInit = false;
  private rootDir: string;
  private remoteRepoDir: string;
  private testRepoDir: string;
  private static instance: TempRepoManager | undefined = undefined;

  private constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.remoteRepoDir = rootDir + '/remote.git';
    this.testRepoDir = rootDir + '/test-repo';
  }

  public static getInstance(rootDir: string) {
    if (!this.instance) this.instance = new TempRepoManager(rootDir);
    return this.instance;
  }
  private get git(): SimpleGit {
    if (!this.isInit) {
      throw new Error('Cannot perform git operation before calling init()');
    }
    return simpleGit(this.testRepoDir);
  }

  private async initRemoteRepo() {
    if (!fs.existsSync(this.remoteRepoDir)) {
      fs.mkdirSync(this.remoteRepoDir, { recursive: true });
      const git: SimpleGit = simpleGit(this.remoteRepoDir);
      await git.init(true);
    }
  }

  private async cloneRepo() {
    if (fs.existsSync(this.remoteRepoDir) && !fs.existsSync(this.testRepoDir)) {
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
  }

  async setHead() {
    return await this.git.remote(['set-head', '--auto', 'origin']);
  }

  async push() {
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

  async stageAndCommitAll() {
    return this.stageAll().then(() => this.git.commit('commit message'));
  }

  async tearDown() {
    fs.rmSync(this.rootDir, { recursive: true, force: true });
  }

  async createOrUpdateFile(fileName: string, content: string) {
    const fPath = path.join(this.testRepoDir, fileName);
    if (fs.existsSync(fPath)) {
      fs.appendFileSync(fPath, content);
    } else {
      fs.writeFileSync(fPath, content);
    }
  }

  async cleanRepo() {
    fs.readdirSync(this.testRepoDir)
      .filter(x => !x.startsWith('.')) //ignore Dot files and dirs
      .forEach(file => {
        this.rmFile(file);
      });
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
