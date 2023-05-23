import { SourceTracking, StatusOutputRow } from '@salesforce/source-tracking';
import { Org, SfProject, Connection } from '@salesforce/core';
import { cwd, chdir } from 'process';

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
}

export interface SyncStatus {
  local: SyncStatusRow[];
  remote: SyncStatusRow[];
}

export interface OrgTrackingOptions {
  connection: Connection;
  projectDir: string;
}

export class OrgTracking {
  private options: OrgTrackingOptions;

  constructor(options: OrgTrackingOptions) {
    this.options = options;
  }

  public async getStatusFromSourceTracking(
    getLocalStatus = true
  ): Promise<SyncStatus> {
    const project = SfProject.getInstance(this.options.projectDir);
    const org = await Org.create({ connection: this.options.connection });

    return await this.withWorkingDir<SyncStatus>(
      this.options.projectDir,
      async () => {
        const tracking = await SourceTracking.create({
          org,
          project,
        });
        const initValue: SyncStatus = { local: [], remote: [] };
        return (
          await tracking.getStatus({ local: getLocalStatus, remote: true })
        ).reduce((acc, row) => {
          acc[row.origin].push(this.toSyncStatusRow(row));
          return acc;
        }, initValue);
      }
    );
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
