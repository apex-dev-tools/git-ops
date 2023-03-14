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
 * @param red: string git ref. i.e HEAD, or commit hash
 * @returns set of absolute paths of changed files
 */
export async function getDefaultBranchDiffByRef(
  dir: string,
  ref: string
): Promise<Set<string>> {
  const git: IGit = new Git(dir);
  const root = await git.gitRoot();
  return git
    .getDefaultBranchName()
    .then(async branchName => {
      return await getChanges(git, branchName, ref);
    })
    .then(changes => {
      const fullPaths = [...changes].map(p => path.resolve(path.join(root, p)));
      return new Set(fullPaths);
    })
    .catch(er => {
      if (er instanceof Error)
        throw Error(`Failed getting diff: ${er.message}`);
      else throw Error('Failed getting diff');
    });
}

async function getChanges(
  git: IGit,
  branchName: string,
  ref: string
): Promise<Set<string>> {
  const changes = await Promise.all([
    git.diffRange(branchName, ref),
    git.getLocalChangedAndCreated(),
  ]);
  const allChanges = new Set<string>();
  changes.forEach(set => set.forEach(file => allChanges.add(file)));
  return allChanges;
}
