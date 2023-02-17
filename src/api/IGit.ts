/*
 * Copyright (c) 2023, FinancialForce.com, inc. All rights reserved.
 */

export interface IGit {
  getDefaultBranchName(): Promise<string>;
  getLocalChangedAndCreated(): Promise<Set<string>>;
  diffRange(fromRef: string, toRef: string): Promise<Set<string>>;
}
