/*
 * Copyright (c) 2023 Certinia Inc. All rights reserved.
 */

export interface Logger {
  deployProgress(status: string): void;
  error(error: any): void;
}
