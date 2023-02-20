/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

import { IGit } from '../api/IGit';
import { Git } from '../Git/Git';

export async function getDefaultBranchDiff(dir: string): Promise<Set<string>> {
  return getDefaultBranchDiffByRef(dir, 'HEAD');
}

export async function getDefaultBranchDiffByRef(
  dir: string,
  ref: string
): Promise<Set<string>> {
  const git = new Git(dir);
  return git
    .getDefaultBranchName()
    .then(async branchName => {
      return await getChanges(git, branchName, ref);
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
