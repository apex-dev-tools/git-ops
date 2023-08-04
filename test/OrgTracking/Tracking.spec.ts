import { expect, jest } from '@jest/globals';
import { OrgTracking } from '../../src';
import { Org, SfProject } from '@salesforce/core';
import { chdir, cwd } from 'process';

// import { cwd, chdir } from 'process';

// const mockCore = {
//   SfProject: { getInstance: jest.fn() },
//   Org: { create: jest.fn() },
// };
const mockData = [
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
  getStatus: jest.fn().mockImplementation(() => Promise.resolve(mockData)),
  getConflicts: jest.fn(),
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
  const PROJET_DIR = 'path/to/dir';
  let cwdSpy: any, chdirSpy: any;

  const sfCoreSpy = {
    SfProject: { getInstance: jest.spyOn(SfProject, 'getInstance') },
    Org: { create: jest.spyOn(Org, 'create') },
  };

  beforeAll(() => {
    jest.mock('process');
    cwdSpy = jest
      .spyOn(process, 'cwd')
      .mockImplementation(() => 'mocked/current/working/dir');
    chdirSpy = jest.spyOn(process, 'chdir').mockImplementation(() => {
      return;
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('getLocalStatus', () => {
    it('returns the correct status', async () => {
      const tracking = new OrgTracking({
        connection: mockConnection,
        projectDir: PROJET_DIR,
      });

      const res = await tracking.getLocalStatus();

      expect(cwdSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(chdirSpy.mock.calls).toEqual([
        [PROJET_DIR],
        ['mocked/current/working/dir'],
      ]);
      expect(sfCoreSpy.Org.create).toHaveBeenCalledWith({
        connection: mockConnection,
      });
      expect(sfCoreSpy.SfProject.getInstance).toHaveBeenCalledWith(PROJET_DIR);
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
        ],
        remote: [],
      });
    });
  });
});
