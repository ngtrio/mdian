import {execFileSync} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

export function buildReleaseTag(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`package.json version must be semver, got ${version}`)
  }

  return `v${version}`
}

export function validateReleaseState({
  branch,
  head,
  localTagExists,
  remoteTagExists,
  statusOutput,
  upstreamHead,
  version
}) {
  if (statusOutput.trim() !== '') {
    throw new Error('Release requires a clean working tree')
  }

  if (branch !== 'main') {
    throw new Error(`Release must run from main, got ${branch}`)
  }

  if (head !== upstreamHead) {
    throw new Error('Release requires local HEAD to match origin/main')
  }

  const tag = buildReleaseTag(version)

  if (localTagExists) {
    throw new Error(`Release tag ${tag} already exists locally`)
  }

  if (remoteTagExists) {
    throw new Error(`Release tag ${tag} already exists on origin`)
  }

  return tag
}

function readGit(args) {
  return execFileSync('git', args, {encoding: 'utf8'}).trim()
}

function hasRemoteTag(tag) {
  return readGit(['ls-remote', '--tags', 'origin', tag]) !== ''
}

export async function main() {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
  const version = packageJson.version
  const statusOutput = readGit(['status', '--short'])
  const branch = readGit(['branch', '--show-current'])
  const head = readGit(['rev-parse', 'HEAD'])
  const upstreamHead = readGit(['rev-parse', 'origin/main'])
  const tag = buildReleaseTag(version)
  const localTagExists = readGit(['tag', '-l', tag]) === tag
  const remoteTagExists = hasRemoteTag(tag)

  validateReleaseState({
    branch,
    head,
    localTagExists,
    remoteTagExists,
    statusOutput,
    upstreamHead,
    version
  })

  execFileSync('git', ['tag', tag], {stdio: 'inherit'})
  execFileSync('git', ['push', 'origin', tag], {stdio: 'inherit'})

  console.log(`Created and pushed ${tag}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main()
}
