/*
 * Copyright (c) 2022, FinancialForce.com, inc. All rights reserved.
 */

export interface IGit {
  getDefaultBranchName(): Promise<string>;
  getLocalChanges(): Promise<Set<string>>;
  diffRange(fromRef: string, toRef: string): Promise<Set<string>>;
}
