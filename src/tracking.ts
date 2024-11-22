/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import { Org, Connection, SfProject } from '@salesforce/core';
import { cwd, chdir } from 'process';
import { StatusOutputRow, SourceTracking } from '@salesforce/source-tracking';
import {
  ComponentSet,
  ComponentStatus,
  DeployResult,
  MetadataApiDeployStatus,
} from '@salesforce/source-deploy-retrieve';

export enum FileState {
  Added = 'add',
  Modified = 'modify',
  Deleted = 'delete',
  NonDelete = 'nondelete',
  Ignored = 'ignore',
  Conflicted = 'conflict',
}

export interface SyncStatusRow {
  fullName: string;
  path?: string;
  state: FileState[];
  type: string;
  origin: string;
}

export interface SyncStatus {
  local: SyncStatusRow[];
  remote: SyncStatusRow[];
}

export interface OrgTrackingOptions {
  connection: Connection;
  projectDir: string;
  logger: OrgTrackingLogger;
}

export interface OrgTrackingLogger {
  //General
  logError(error: any): void;
  logMessage(message: any): void;

  //Deploy specific
  logDeployProgress(status: string): void;
}

export class OrgTracking {
  private options: OrgTrackingOptions;
  private logger: OrgTrackingLogger;

  constructor(options: OrgTrackingOptions) {
    this.options = options;
    this.logger = options.logger;
  }

  public async getLocalStatus(withConflicts = false): Promise<SyncStatus> {
    const project = SfProject.getInstance(this.options.projectDir);
    const org = await Org.create({ connection: this.options.connection });

    return await this.withWorkingDir<SyncStatus>(
      this.options.projectDir,
      async () => {
        const tracking = await SourceTracking.create({
          org,
          project,
          ignoreLocalCache: true,
        });

        await tracking.ensureRemoteTracking(true);
        const initValue: SyncStatus = { local: [], remote: [] };
        const status: StatusOutputRow[] = await tracking
          .getStatus({ local: true, remote: false })
          .then(async res => {
            if (withConflicts) {
              //Taken from sourceTracking.ts from the @salesforce/source-tracking lib
              const conflictFiles = (await tracking.getConflicts())
                .flatMap(conflict => conflict.filenames)
                .filter((value: any) => typeof value === 'string');
              res = res.map(row => ({
                ...row,
                conflict:
                  !!row.filePath && conflictFiles.includes(row.filePath),
              }));
            }
            return res;
          })
          .catch(e => {
            this.logger.logError(e);
            return [] as StatusOutputRow[];
          });

        return status.reduce((acc, row) => {
          acc[row.origin].push(this.toSyncStatusRow(row));
          return acc;
        }, initValue);
      }
    );
  }

  public async deployAndUpdateSourceTracking(
    paths: Array<string>
  ): Promise<void> {
    return await this.withWorkingDir<void>(
      this.options.projectDir,
      async () => {
        try {
          this.logger.logDeployProgress('Starting deploy');
          const result = await this.deploy(paths);

          if (result.response.success) {
            await this.updateSourceTracking(result);
          } else {
            this.reportDeployErrors(result);
          }
          this.logger.logDeployProgress('Finished deploy');
        } catch (e) {
          this.logger.logError(e);
        }
      }
    );
  }

  private async deploy(paths: Array<string>): Promise<DeployResult> {
    const deploy = await ComponentSet.fromSource(paths).deploy({
      usernameOrConnection: this.options.connection,
    });

    deploy.onUpdate(response => this.reportDeployStatus(response));

    const result = await deploy.pollStatus();

    this.reportDeployStatus(result.response);

    return result;
  }

  private reportDeployStatus(response: MetadataApiDeployStatus) {
    const {
      status,
      numberComponentsDeployed,
      numberComponentsTotal,
      numberComponentErrors,
    } = response;
    const progress = `${numberComponentsDeployed}/${numberComponentsTotal}`;
    const message = `Status: ${status} | Progress: ${progress} | Errors: ${numberComponentErrors}`;
    this.logger.logDeployProgress(message);
  }

  private reportDeployErrors(result: DeployResult) {
    const errors = result.getFileResponses().reduce((a, c) => {
      if (c.state === ComponentStatus.Failed) {
        a.push(new Error(`${c.fullName}: ${c.error}`));
      }
      return a;
    }, [] as Error[]);

    if (errors.length) {
      this.logger.logDeployProgress('Deploy errors:');
      errors.forEach(err => this.logger.logError(err));
    }
  }

  private async updateSourceTracking(result: DeployResult): Promise<void> {
    this.logger.logDeployProgress('Starting source tracking update');

    const project = SfProject.getInstance(this.options.projectDir);
    const org = await Org.create({ connection: this.options.connection });
    const tracking = await SourceTracking.create({
      org,
      project,
      ignoreLocalCache: true,
    });
    await tracking.updateTrackingFromDeploy(result);

    this.logger.logDeployProgress('Finished source tracking update');
  }

  private toSyncStatusRow(from: StatusOutputRow) {
    const state: FileState[] = [];
    if (from.ignored) {
      state.push(FileState.Ignored);
    }
    if (from.conflict) {
      state.push(FileState.Conflicted);
    }
    state.push(from.state as FileState);

    return {
      fullName: from.fullName,
      path: from.filePath,
      state: state,
      type: from.type,
      origin: from.origin,
    };
  }

  private async withWorkingDir<T>(
    path: string,
    op: () => Promise<T>
  ): Promise<T> {
    const startDir = cwd();
    chdir(path);
    try {
      return await op();
    } finally {
      chdir(startDir);
    }
  }
}
