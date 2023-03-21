/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import path from 'path';
import { IGit } from '../api/IGit';
import { Git } from '../Git/Git';

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
  const git: IGit = new Git(dir);
  return git
    .getDefaultBranchName()
    .then(branch => getDiffRange(dir, branch, refTo))
    .catch(er => {
      throw new NoLocalBranchException(er);
    });
}
/**
 * Works out the diff between a given range
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
  const git: IGit = new Git(dir);
  const root = await git.gitRoot();
  return getDiffChanges(git, fromRef, toRef)
    .then(changes => resolvePaths(changes, root))
    .catch(er => {
      throw new DiffFailedException(er);
    });
}
/**
 * get the local changes that not have been committed
 * @param dir tring of the directory thr operation should be performed on
 * @returns et of absolute paths of un committed files
 */
export async function getLocalChanges(dir: string) {
  const git: IGit = new Git(dir);
  const root = await git.gitRoot();
  return git
    .getLocalChangedAndCreated()
    .then(changes => resolvePaths(changes, root))
    .catch(er => {
      throw new LocalChangeException(er);
    });
}

function resolvePaths(paths: Set<string>, root: string) {
  const fullPaths = [...paths].map(p => path.resolve(path.join(root, p)));
  return new Set(fullPaths);
}

async function getDiffChanges(
  git: IGit,
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
