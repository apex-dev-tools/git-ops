/*
 * Copyright (c) 2022, FinancialForce.com, inc. All rights reserved.
 */

import { Git } from '../Git/Git';

export async function getDefaultBranchDiff(dir: string): Promise<Set<string>> {
  const git = new Git(dir);
  return git.getDefaultBranchName().then(async branchName => {
    const res = await Promise.all([
      git.diffRange(branchName, 'HEAD'),
      git.getLocalChangedAndCreated(),
    ]);
    return new Set(res.map(s => [...s]).flat());
  });
}
