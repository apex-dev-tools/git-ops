import { expect, jest } from '@jest/globals';
import { OrgTracking } from '../../src';
import { Org, SfProject } from '@salesforce/core';

const mockGetStatusData = [
  {
    fullName: 'SomeComponent',
    filePath: 'path/to/file',
    type: 'class',
    origin: 'local',
    ignored: false,
    conflict: false,
    state: 'add',
  },
  {
    fullName: 'SomeComponent1',
    filePath: 'path/to/file/1',
    type: 'class',
    origin: 'local',
    ignored: false,
    conflict: true,
    state: 'delete',
  },
  {
    fullName: 'SomeComponent2',
    filePath: 'path/to/file/2',
    type: 'class',
    origin: 'local',
    ignored: true,
    conflict: false,
    state: 'modify',
  },
  {
    fullName: 'SomeComponent3',
    filePath: 'path/to/file/3',
    type: 'class',
    origin: 'local',
    ignored: true,
    conflict: true,
    state: 'nondelete',
  },
  {
    fullName: 'NoPathComponent',
    filePath: undefined,
    type: 'metadata',
    origin: 'local',
    ignored: false,
    conflict: false,
    state: 'add',
  },
];

const mockConflictsData = [
  {
    filenames: [
      'path/to/file',
      'path/to/file/3',
      { nonString: 'object' },
      'path/to/file/non/existent',
    ],
  },
];

jest.mock('@salesforce/core', () => {
  return {
    SfProject: { getInstance: jest.fn() },
    Org: { create: jest.fn() },
  };
});

const mockConnection = jest.fn() as any;
const mockSourceTracking = {
  ensureRemoteTracking: jest.fn(),
  getStatus: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockGetStatusData)),
  getConflicts: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockConflictsData)),
};

jest.mock('@salesforce/source-tracking', () => {
  return {
    SourceTracking: {
      create: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...mockSourceTracking })),
    },
  };
});

describe('OrgTracking', () => {
  const PROJECT_DIR = 'path/to/dir';
  let cwdSpy: any, chdirSpy: any;

  const sfCoreSpy = {
    SfProject: { getInstance: jest.spyOn(SfProject, 'getInstance') },
    Org: { create: jest.spyOn(Org, 'create') },
  };

  beforeEach(() => {
    jest.mock('process');
    cwdSpy = jest
      .spyOn(process, 'cwd')
      .mockImplementation(() => 'mocked/current/working/dir');
    chdirSpy = jest.spyOn(process, 'chdir').mockImplementation(() => {
      return;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalStatus', () => {
    it('returns the correct status', async () => {
      const tracking = new OrgTracking({
        connection: mockConnection,
        projectDir: PROJECT_DIR,
      });

      const res = await tracking.getLocalStatus();

      expect(cwdSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(chdirSpy.mock.calls).toEqual([
        [PROJECT_DIR],
        ['mocked/current/working/dir'],
      ]);
      expect(sfCoreSpy.Org.create).toHaveBeenCalledWith({
        connection: mockConnection,
      });
      expect(sfCoreSpy.SfProject.getInstance).toHaveBeenCalledWith(PROJECT_DIR);
      expect(mockSourceTracking.ensureRemoteTracking).toHaveBeenCalledWith(
        true
      );
      expect(mockSourceTracking.getStatus).toHaveBeenCalledWith({
        local: true,
        remote: false,
      });
      expect(mockSourceTracking.getConflicts).not.toBeCalled();
      expect(res).toEqual({
        local: [
          {
            fullName: 'SomeComponent',
            origin: 'local',
            path: 'path/to/file',
            state: ['add'],
            type: 'class',
          },
          {
            fullName: 'SomeComponent1',
            origin: 'local',
            path: 'path/to/file/1',
            state: ['conflict', 'delete'],
            type: 'class',
          },
          {
            fullName: 'SomeComponent2',
            origin: 'local',
            path: 'path/to/file/2',
            state: ['ignore', 'modify'],
            type: 'class',
          },
          {
            fullName: 'SomeComponent3',
            origin: 'local',
            path: 'path/to/file/3',
            state: ['ignore', 'conflict', 'nondelete'],
            type: 'class',
          },
          {
            fullName: 'NoPathComponent',
            path: undefined,
            type: 'metadata',
            origin: 'local',
            state: ['add'],
          },
        ],
        remote: [],
      });
    });

    it('returns the correct status with conflicts', async () => {
      //Given
      const tracking = new OrgTracking({
        connection: mockConnection,
        projectDir: PROJECT_DIR,
      });

      //When
      const res = await tracking.getLocalStatus(true);

      //Then
      expect(cwdSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(chdirSpy.mock.calls).toEqual([
        [PROJECT_DIR],
        ['mocked/current/working/dir'],
      ]);
      expect(sfCoreSpy.Org.create).toHaveBeenCalledWith({
        connection: mockConnection,
      });
      expect(sfCoreSpy.SfProject.getInstance).toHaveBeenCalledWith(PROJECT_DIR);
      expect(mockSourceTracking.ensureRemoteTracking).toHaveBeenCalledWith(
        true
      );
      expect(mockSourceTracking.getStatus).toHaveBeenCalledWith({
        local: true,
        remote: false,
      });
      expect(mockSourceTracking.getConflicts).toBeCalled();
      expect(res).toEqual({
        local: [
          {
            fullName: 'SomeComponent',
            origin: 'local',
            path: 'path/to/file',
            state: ['conflict', 'add'],
            type: 'class',
          },
          {
            fullName: 'SomeComponent1',
            origin: 'local',
            path: 'path/to/file/1',
            state: ['delete'],
            type: 'class',
          },
          {
            fullName: 'SomeComponent2',
            origin: 'local',
            path: 'path/to/file/2',
            state: ['ignore', 'modify'],
            type: 'class',
          },
          {
            fullName: 'SomeComponent3',
            origin: 'local',
            path: 'path/to/file/3',
            state: ['ignore', 'conflict', 'nondelete'],
            type: 'class',
          },
          {
            fullName: 'NoPathComponent',
            origin: 'local',
            path: undefined,
            state: ['add'],
            type: 'metadata',
          },
        ],
        remote: [],
      });
    });
  });
});
