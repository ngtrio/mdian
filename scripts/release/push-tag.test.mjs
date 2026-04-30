import assert from 'node:assert/strict'
import test from 'node:test'

import {buildReleaseTag, validateReleaseState} from './push-tag.mjs'

test('buildReleaseTag formats semver versions as git tags', () => {
  assert.equal(buildReleaseTag('0.1.2'), 'v0.1.2')
  assert.throws(() => buildReleaseTag('0.1'), /package\.json version must be semver/)
})

test('validateReleaseState rejects a dirty working tree', () => {
  assert.throws(() => validateReleaseState({
    branch: 'main',
    head: 'abc123',
    localTagExists: false,
    remoteTagExists: false,
    statusOutput: ' M README.md',
    upstreamHead: 'abc123',
    version: '0.1.2'
  }), /clean working tree/)
})

test('validateReleaseState rejects non-main branches', () => {
  assert.throws(() => validateReleaseState({
    branch: 'feat/release',
    head: 'abc123',
    localTagExists: false,
    remoteTagExists: false,
    statusOutput: '',
    upstreamHead: 'abc123',
    version: '0.1.2'
  }), /must run from main/)
})

test('validateReleaseState rejects a local branch that is not synced with origin/main', () => {
  assert.throws(() => validateReleaseState({
    branch: 'main',
    head: 'abc123',
    localTagExists: false,
    remoteTagExists: false,
    statusOutput: '',
    upstreamHead: 'def456',
    version: '0.1.2'
  }), /local HEAD to match origin\/main/)
})

test('validateReleaseState rejects an existing local tag', () => {
  assert.throws(() => validateReleaseState({
    branch: 'main',
    head: 'abc123',
    localTagExists: true,
    remoteTagExists: false,
    statusOutput: '',
    upstreamHead: 'abc123',
    version: '0.1.2'
  }), /already exists locally/)
})

test('validateReleaseState rejects an existing remote tag', () => {
  assert.throws(() => validateReleaseState({
    branch: 'main',
    head: 'abc123',
    localTagExists: false,
    remoteTagExists: true,
    statusOutput: '',
    upstreamHead: 'abc123',
    version: '0.1.2'
  }), /already exists on origin/)
})

test('validateReleaseState returns the expected tag for a valid release state', () => {
  assert.equal(validateReleaseState({
    branch: 'main',
    head: 'abc123',
    localTagExists: false,
    remoteTagExists: false,
    statusOutput: '',
    upstreamHead: 'abc123',
    version: '0.1.2'
  }), 'v0.1.2')
})
