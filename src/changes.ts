/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import path from 'path';
import { FileStatus, Git } from './git';

/**
 * Works out a set of changed files by performing getDefaultBranchDiffByRef(repoRootDir, 'HEAD')
 * @param dir: string of the directory thr operation should be performed on
 * @returns set of absolute paths of changed files
 */
export async function getDefaultBranchDiff(dir: string): Promise<Set<string>> {
  return getDefaultBranchDiffByRef(dir, 'HEAD');
}

/**
 * Works out changed files using the default branch in that repo given a ref.
 * This find the default branch in the repo using `git symbolic-ref 'refs/remotes/origin/HEAD'`
 * so the `HEAD` must be set. The output of the command is same as running `git diff branchName...ref`
 * combined with `git status`.
 * Files with the status of deleted (`D`) and ignored (`!`) will not be included in the change set.
 * @param dir: string of the directory thr operation should be performed on
 * @param refTo: string git ref. i.e HEAD, or commit hash
 * @returns set of absolute paths of changed files
 */
export async function getDefaultBranchDiffByRef(
  dir: string,
  refTo: string
): Promise<Set<string>> {
  const git: Git = new Git(dir);
  return git
    .getDefaultBranchName()
    .then(branch => getDiffRange(dir, branch, refTo))
    .catch(er => {
      throw new NoLocalBranchException(er);
    });
}
/**
 * Works out the diff between a given range. Equivalent to `git diff ref1...ref2`
 * @param dir string of the directory thr operation should be performed on
 * @param fromRef string git ref. i.e HEAD, or commit hash
 * @param toRef string git ref. i.e HEAD, or commit hash
 * @returns set of absolute paths of changed files
 */
export async function getDiffRange(
  dir: string,
  fromRef: string,
  toRef: string
): Promise<Set<string>> {
  const git: Git = new Git(dir);
  const root = await git.gitRoot();
  return getDiffChanges(git, fromRef, toRef)
    .then(changes => resolvePaths(changes, root))
    .catch(er => {
      throw new DiffFailedException(er);
    });
}
/**
 * Get the local changes that not have been committed. Equivalent to `git status`
 * Files with the status of deleted (`D`) and ignored (`!`) will not be included in the change set.
 * @param dir tring of the directory thr operation should be performed on
 * @returns set of absolute paths of un committed files
 */
export async function getLocalChanges(dir: string): Promise<Set<string>> {
  const git: Git = new Git(dir);
  const root = await git.gitRoot();
  return git
    .getLocalChangedAndCreated()
    .then(changes => resolvePaths(changes, root))
    .catch(er => {
      throw new LocalChangeException(er);
    });
}

/**
 * Get the locally changed class files, based on source tracking repo. Note that it does
 * not respect the `.forceignore` yet.
 *
 * @param projectDir SF project dir path
 * @param orgId SF org ID, used to select tracking repo
 * @returns paths of class files that may need deploying
 */
export async function getDeployableClasses(
  projectDir: string,
  orgId: string
): Promise<Set<string>> {
  const git: Git = new Git(projectDir);
  const trackingDir = getTrackingGitDir(projectDir, orgId);
  const stats: string[] = [
    FileStatus.Modified,
    FileStatus.Added,
    FileStatus.Renamed,
    FileStatus.Copied,
  ];

  return git
    .getFilteredStatus(
      f => f.path.endsWith('.cls') && stats.includes(f.working_dir),
      [`--git-dir=${trackingDir}`]
    )
    .then(changes => resolvePaths(changes, projectDir))
    .catch(er => {
      throw new LocalChangeException(er);
    });
}

function resolvePaths(paths: Set<string>, root: string) {
  const fullPaths = [...paths].map(p => path.resolve(root, p));
  return new Set(fullPaths);
}

async function getDiffChanges(
  git: Git,
  ref1: string,
  ref2: string
): Promise<Set<string>> {
  const changes = await Promise.all([
    git.diffRange(ref1, ref2),
    git.getLocalChangedAndCreated(),
  ]);
  const allChanges = new Set<string>();
  changes.forEach(set => set.forEach(file => allChanges.add(file)));
  return allChanges;
}

function getTrackingGitDir(projectDir: string, orgId: string): string {
  return path.resolve(projectDir, '.sf', 'orgs', orgId, 'localSourceTracking');
}

class GitException extends Error {
  constructor(msg: string, err: any) {
    if (err instanceof Error) {
      super(`${msg}. Cause: '${err.message}'`);
    } else {
      super(msg);
    }
  }
}

class NoLocalBranchException extends GitException {
  constructor(err: any) {
    super('Local branch operation failed', err);
  }
}

class LocalChangeException extends GitException {
  constructor(err: any) {
    super('Getting local changes operation failed', err);
  }
}

class DiffFailedException extends GitException {
  constructor(err: any) {
    super('Getting diff operation failed', err);
  }
}
