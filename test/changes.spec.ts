/*
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

import {
  getDefaultBranchDiffByRef,
  getDefaultBranchDiff,
  getDiffRange,
  getLocalChanges,
  getDeployableClasses,
} from '../src';

const mockGitImpl = {
  getDefaultBranchName: jest.fn(),
  getLocalChangedAndCreated: jest.fn(),
  diffRange: jest.fn(),
  gitRoot: jest.fn(),
  getFilteredStatus: jest.fn(),
};

jest.mock('../src/git', () => {
  const { FileStatus } = jest.requireActual('../src/git');
  return {
    Git: jest.fn().mockImplementation(() => mockGitImpl),
    FileStatus,
  };
});

describe('Branch changes', () => {
  const mockRootDir = '/reporoot';

  beforeEach(() => {
    mockGitImpl.gitRoot.mockResolvedValue(mockRootDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockGitImpl.getDefaultBranchName.mockReset();
    mockGitImpl.getLocalChangedAndCreated.mockReset();
    mockGitImpl.diffRange.mockReset();
    mockGitImpl.gitRoot.mockReset();
    mockGitImpl.getFilteredStatus.mockReset();
  });

  describe('getDefaultBranchDiffByRef', () => {
    it('returns the correct set of files when git ops resolve', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getDefaultBranchDiffByRef(
        './some/path/to/dir',
        'abc12fcd'
      );

      //Then
      expect(mockGitImpl.getDefaultBranchName).toBeCalledTimes(1);
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(mockGitImpl.diffRange).toHaveBeenCalledWith(
        'default/branch/name',
        'abc12fcd'
      );
      expect(res).toEqual(
        new Set([
          `${mockRootDir}/File.txt`,
          `${mockRootDir}/AnotherClass.txt`,
          `${mockRootDir}/SomeFile.txt`,
        ])
      );
    });

    it('rejects and throws error when "getDefaultBranchName" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockRejectedValue(
        Error('no head ref error')
      );

      //When/Then
      await expect(
        getDefaultBranchDiffByRef('./some/path/to/dir', 'abc12fcd')
      ).rejects.toEqual(
        Error("Local branch operation failed. Cause: 'no head ref error'")
      );
    });

    it('rejects and throws error when "getLocalChangedAndCreated" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(
        getDefaultBranchDiffByRef('./some/path/to/dir', 'abc12fcd')
      ).rejects.toEqual(
        Error(
          "Local branch operation failed. Cause: 'Getting diff operation failed. Cause: 'op failed''"
        )
      );
    });
  });

  describe('getDefaultBranchDiff', () => {
    it('returns the correct set of files', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getDefaultBranchDiff('./some/path/to/dir');

      //Then
      expect(mockGitImpl.getDefaultBranchName).toBeCalledTimes(1);
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(mockGitImpl.diffRange).toHaveBeenCalledWith(
        'default/branch/name',
        'HEAD'
      );
      expect(res).toEqual(
        new Set([
          `${mockRootDir}/File.txt`,
          `${mockRootDir}/AnotherClass.txt`,
          `${mockRootDir}/SomeFile.txt`,
        ])
      );
    });

    it('rejects and throws error when "getLocalChangedAndCreated" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(getDefaultBranchDiff('./some/path/to/dir')).rejects.toEqual(
        Error(
          "Local branch operation failed. Cause: 'Getting diff operation failed. Cause: 'op failed''"
        )
      );
    });
  });

  describe('getDiffRange', () => {
    it('returns the correct set of files', async () => {
      //Given
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getDiffRange('./some/path/to/dir', 'ref1', 'ref2');

      //Then
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(mockGitImpl.diffRange).toHaveBeenCalledWith('ref1', 'ref2');
      expect(res).toEqual(
        new Set([
          `${mockRootDir}/File.txt`,
          `${mockRootDir}/AnotherClass.txt`,
          `${mockRootDir}/SomeFile.txt`,
        ])
      );
    });

    it('rejects and throws error when "getLocalChangedAndCreated" fails', async () => {
      //Given
      mockGitImpl.getDefaultBranchName.mockResolvedValue('default/branch/name');
      mockGitImpl.diffRange.mockResolvedValue(
        new Set(['File.txt', 'AnotherClass.txt'])
      );
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(
        getDiffRange('./some/path/to/dir', 'ref1', 'ref2')
      ).rejects.toEqual(
        Error("Getting diff operation failed. Cause: 'op failed'")
      );
    });
  });

  describe('getLocalChanges', () => {
    it('returns the correct set of files', async () => {
      //Given
      mockGitImpl.getLocalChangedAndCreated.mockResolvedValue(
        new Set(['SomeFile.txt'])
      );

      //When
      const res = await getLocalChanges('./some/path/to/dir');

      //Then
      expect(mockGitImpl.getLocalChangedAndCreated).toBeCalledTimes(1);
      expect(res).toEqual(new Set([`${mockRootDir}/SomeFile.txt`]));
    });

    it('rejects and throws error when op fails', async () => {
      //Given
      mockGitImpl.getLocalChangedAndCreated.mockRejectedValue(
        Error('op failed')
      );

      //When/Then
      await expect(getLocalChanges('./some/path/to/dir')).rejects.toEqual(
        Error("Getting local changes operation failed. Cause: 'op failed'")
      );
    });
  });

  describe('getDeployableClasses', () => {
    it('returns the correct set of files', async () => {
      //Given
      const pdir = `${mockRootDir}/project/dir`;
      mockGitImpl.getFilteredStatus.mockImplementation(fn => {
        const files = [
          {
            path: `${pdir}/SomeFile.cls`,
            working_dir: 'M',
          },
        ];
        return Promise.resolve(
          new Set(files.filter(fn as () => boolean).map(p => p.path))
        );
      });

      //When
      const res = await getDeployableClasses(pdir, 'orgId');

      //Then
      expect(mockGitImpl.getFilteredStatus).toBeCalledTimes(1);
      expect(mockGitImpl.getFilteredStatus).toHaveBeenCalledWith(
        expect.anything(),
        `${pdir}/.sf/orgs/orgId/localSourceTracking`
      );
      expect(res).toEqual(new Set([`${pdir}/SomeFile.cls`]));
    });

    it('filters non classes and deleted', async () => {
      //Given
      const pdir = `${mockRootDir}/project/dir`;
      mockGitImpl.getFilteredStatus.mockImplementation(fn => {
        const files = [
          {
            path: `${pdir}/SomeFile.txt`,
            working_dir: 'M',
          },
          {
            path: `${pdir}/SomeFile2.cls`,
            working_dir: 'D',
          },
        ];
        return Promise.resolve(
          new Set(files.filter(fn as () => boolean).map(p => p.path))
        );
      });

      //When
      const res = await getDeployableClasses(pdir, 'orgId');

      //Then
      expect(mockGitImpl.getFilteredStatus).toBeCalledTimes(1);
      expect(mockGitImpl.getFilteredStatus).toHaveBeenCalledWith(
        expect.anything(),
        `${pdir}/.sf/orgs/orgId/localSourceTracking`
      );
      expect(res).toEqual(new Set());
    });

    it('rejects and throws error when op fails', async () => {
      //Given
      mockGitImpl.getFilteredStatus.mockRejectedValue(Error('op failed'));

      //When/Then
      await expect(
        getDeployableClasses('/project/dir', 'orgId')
      ).rejects.toEqual(
        Error("Getting local changes operation failed. Cause: 'op failed'")
      );
    });
  });
});
