/*
 * Copyright (c) 2023 Certinia Inc. All rights reserved.
 */

export interface Logger {
  //General
  logError(error: any): void;
  logMessage(message: any): void;

  //Deploy specific
  logDeployProgress(status: string): void;
}
