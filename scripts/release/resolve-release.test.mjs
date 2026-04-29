import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseReleaseVersion,
  resolveCompletionState,
  resolveReleaseIntent
} from './resolve-release.mjs'

test('parseReleaseVersion reads the version from a release commit subject', () => {
  assert.equal(parseReleaseVersion('chore: release v0.1.1'), '0.1.1')
  assert.equal(parseReleaseVersion('fix: adjust workflow'), undefined)
})

test('resolveReleaseIntent skips ordinary push commits', () => {
  assert.deepEqual(resolveReleaseIntent({
    commitSubject: 'fix: adjust workflow',
    eventName: 'push',
    ref: 'refs/heads/main',
    version: '0.1.1'
  }), {
    releaseSource: 'none',
    shouldRelease: false,
    tag: 'v0.1.1',
    version: '0.1.1'
  })
})

test('resolveReleaseIntent accepts a matching release commit on push', () => {
  assert.deepEqual(resolveReleaseIntent({
    commitSubject: 'chore: release v0.1.1',
    eventName: 'push',
    ref: 'refs/heads/main',
    version: '0.1.1'
  }), {
    releaseSource: 'push',
    shouldRelease: true,
    tag: 'v0.1.1',
    version: '0.1.1'
  })
})

test('resolveReleaseIntent rejects a mismatched release commit on push', () => {
  assert.throws(() => resolveReleaseIntent({
    commitSubject: 'chore: release v0.1.0',
    eventName: 'push',
    ref: 'refs/heads/main',
    version: '0.1.1'
  }), /does not match package\.json version 0\.1\.1/)
})

test('resolveReleaseIntent only allows manual recovery on main', () => {
  assert.deepEqual(resolveReleaseIntent({
    commitSubject: 'fix: adjust workflow',
    eventName: 'workflow_dispatch',
    ref: 'refs/heads/main',
    version: '0.1.1'
  }), {
    releaseSource: 'workflow_dispatch',
    shouldRelease: true,
    tag: 'v0.1.1',
    version: '0.1.1'
  })

  assert.throws(() => resolveReleaseIntent({
    commitSubject: 'fix: adjust workflow',
    eventName: 'workflow_dispatch',
    ref: 'refs/heads/feat/release-fix',
    version: '0.1.1'
  }), /workflow_dispatch releases must run from refs\/heads\/main/)
})

test('resolveCompletionState requests every missing side effect', async () => {
  assert.deepEqual(await resolveCompletionState({
    githubReleaseExists: async () => false,
    githubToken: 'token',
    npmPublished: async () => false,
    packageName: 'mdian',
    ref: 'refs/heads/main',
    repo: 'ngtrio/mdian',
    sha: 'abc123',
    tag: 'v0.1.1',
    tagDetails: async () => ({
      exists: false,
      matchesTarget: false,
      target: undefined
    }),
    version: '0.1.1'
  }), {
    githubReleaseExists: false,
    npmPublished: false,
    shouldCreateGithubRelease: true,
    shouldCreateTag: true,
    shouldPublishNpm: true,
    tagExists: false,
    tagMatchesTarget: false,
    tagTarget: undefined
  })
})

test('resolveCompletionState only requests unfinished GitHub work when npm is already published', async () => {
  assert.deepEqual(await resolveCompletionState({
    githubReleaseExists: async () => false,
    githubToken: 'token',
    npmPublished: async () => true,
    packageName: 'mdian',
    ref: 'refs/heads/main',
    repo: 'ngtrio/mdian',
    sha: 'abc123',
    tag: 'v0.1.1',
    tagDetails: async () => ({
      exists: true,
      matchesTarget: true,
      target: 'abc123'
    }),
    version: '0.1.1'
  }), {
    githubReleaseExists: false,
    npmPublished: true,
    shouldCreateGithubRelease: true,
    shouldCreateTag: false,
    shouldPublishNpm: false,
    tagExists: true,
    tagMatchesTarget: true,
    tagTarget: 'abc123'
  })
})

test('resolveCompletionState fully no-ops when npm, tag, and GitHub release are already complete', async () => {
  assert.deepEqual(await resolveCompletionState({
    githubReleaseExists: async () => true,
    githubToken: 'token',
    npmPublished: async () => true,
    packageName: 'mdian',
    ref: 'refs/heads/main',
    repo: 'ngtrio/mdian',
    sha: 'abc123',
    tag: 'v0.1.1',
    tagDetails: async () => ({
      exists: true,
      matchesTarget: true,
      target: 'abc123'
    }),
    version: '0.1.1'
  }), {
    githubReleaseExists: true,
    npmPublished: true,
    shouldCreateGithubRelease: false,
    shouldCreateTag: false,
    shouldPublishNpm: false,
    tagExists: true,
    tagMatchesTarget: true,
    tagTarget: 'abc123'
  })
})



test('resolveCompletionState treats a missing git tag as absent instead of throwing', async () => {
  const state = await resolveCompletionState({
    githubReleaseExists: async () => false,
    githubToken: '',
    npmPublished: async () => false,
    packageName: 'mdian',
    repo: '',
    sha: 'abc123',
    tag: 'v999.999.999',
    version: '999.999.999'
  })

  assert.equal(state.tagExists, false)
  assert.equal(state.shouldCreateTag, true)
})
