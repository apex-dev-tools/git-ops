/*
 * Copyright (c) 2023 Certinia Inc. All rights reserved.
 */

import { Org, Connection, SfProject } from '@salesforce/core';
import { cwd, chdir } from 'process';
import { StatusOutputRow, SourceTracking } from '@salesforce/source-tracking';
import { ComponentSet, DeployResult } from '@salesforce/source-deploy-retrieve';
import { Logger } from '../logger/Logger';

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
  logger: Logger;
}

export class OrgTracking {
  private options: OrgTrackingOptions;
  private logger: Logger;

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
        return this.deploy(paths)
          .then(res => this.updateSourceTracking(res))
          .catch(e => this.logger.logError(e));
      }
    );
  }

  private async deploy(paths: Array<string>): Promise<DeployResult> {
    const set = ComponentSet.fromSource(paths);

    const deploy = await set.deploy({
      usernameOrConnection: this.options.connection,
    });
    this.logger.logDeployProgress('Starting deploy');
    deploy.onUpdate(response => {
      const {
        status,
        numberComponentsDeployed,
        numberComponentsTotal,
      } = response;
      const progress = `${numberComponentsDeployed}/${numberComponentsTotal}`;
      const message = `Status: ${status} Progress: ${progress}`;
      this.logger.logDeployProgress(message);
    });
    return await deploy.pollStatus().then(res => {
      this.logger.logMessage('Finished deploy');
      return res;
    });
  }

  private async updateSourceTracking(result: DeployResult) {
    const project = SfProject.getInstance(this.options.projectDir);
    const org = await Org.create({ connection: this.options.connection });
    const tracking = await SourceTracking.create({
      org,
      project,
      ignoreLocalCache: true,
    });
    await tracking.updateTrackingFromDeploy(result);
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
