import {execFileSync} from 'node:child_process'
import {appendFile, readFile} from 'node:fs/promises'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

export function parseReleaseVersion(commitSubject) {
  return /^chore: release v(\d+\.\d+\.\d+)$/.exec(commitSubject)?.[1]
}

export function resolveReleaseIntent({commitSubject, eventName, ref, version}) {
  const releaseVersion = parseReleaseVersion(commitSubject)

  if (eventName === 'push' && releaseVersion && releaseVersion !== version) {
    throw new Error(`Release commit version ${releaseVersion} does not match package.json version ${version}`)
  }

  if (eventName === 'push' && releaseVersion === version) {
    return {
      releaseSource: 'push',
      shouldRelease: true,
      tag: `v${version}`,
      version
    }
  }

  if (eventName === 'workflow_dispatch') {
    if (ref !== 'refs/heads/main') {
      throw new Error(`workflow_dispatch releases must run from refs/heads/main, got ${ref}`)
    }

    return {
      releaseSource: 'workflow_dispatch',
      shouldRelease: true,
      tag: `v${version}`,
      version
    }
  }

  return {
    releaseSource: 'none',
    shouldRelease: false,
    tag: `v${version}`,
    version
  }
}

async function defaultNpmPublished({packageName, version}) {
  try {
    const publishedVersion = execFileSync('npm', ['view', `${packageName}@${version}`, 'version'], {
      encoding: 'utf8'
    }).trim()

    return publishedVersion === version
  } catch {
    return false
  }
}

async function defaultTagDetails({tag}) {
  execFileSync('git', ['fetch', '--tags', 'origin'], {stdio: 'ignore'})

  const exists = execFileSync('git', ['tag', '-l', tag], {
    encoding: 'utf8'
  }).trim() === tag

  if (!exists) {
    return {
      exists: false,
      matchesTarget: false,
      target: undefined
    }
  }

  const target = execFileSync('git', ['rev-list', '-n', '1', tag], {
    encoding: 'utf8'
  }).trim()

  return {
    exists: true,
    matchesTarget: false,
    target: target || undefined
  }
}

async function defaultGithubReleaseExists({githubToken, repo, tag}) {
  if (!githubToken || !repo) {
    return false
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'User-Agent': 'mdian-release-resolution'
    }
  })

  if (response.status === 404) {
    return false
  }

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with ${response.status}`)
  }

  return true
}

export async function resolveCompletionState({
  githubReleaseExists = defaultGithubReleaseExists,
  githubToken,
  npmPublished = defaultNpmPublished,
  packageName,
  repo,
  sha,
  tag,
  tagDetails = defaultTagDetails,
  version
}) {
  const [published, details, hasGithubRelease] = await Promise.all([
    npmPublished({packageName, version}),
    tagDetails({tag}),
    githubReleaseExists({githubToken, repo, tag})
  ])

  if (details.exists && details.target !== sha) {
    throw new Error(`Tag ${tag} already exists at ${details.target} instead of ${sha}`)
  }

  return {
    githubReleaseExists: hasGithubRelease,
    npmPublished: published,
    shouldCreateGithubRelease: !hasGithubRelease,
    shouldCreateTag: !details.exists,
    shouldPublishNpm: !published,
    tagExists: details.exists,
    tagMatchesTarget: details.exists && details.target === sha,
    tagTarget: details.target
  }
}

function toOutputLines(intent, state) {
  return [
    `should_release=${intent.shouldRelease ? 'true' : 'false'}`,
    `version=${intent.version}`,
    `tag=${intent.tag}`,
    `release_source=${intent.releaseSource}`,
    `npm_published=${state.npmPublished ? 'true' : 'false'}`,
    `tag_exists=${state.tagExists ? 'true' : 'false'}`,
    `tag_matches_target=${state.tagMatchesTarget ? 'true' : 'false'}`,
    `tag_target=${state.tagTarget ?? ''}`,
    `github_release_exists=${state.githubReleaseExists ? 'true' : 'false'}`,
    `should_publish_npm=${state.shouldPublishNpm ? 'true' : 'false'}`,
    `should_create_tag=${state.shouldCreateTag ? 'true' : 'false'}`,
    `should_create_github_release=${state.shouldCreateGithubRelease ? 'true' : 'false'}`
  ]
}

export async function main() {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
  const version = packageJson.version
  const packageName = packageJson.name
  const commitSubject = execFileSync('git', ['log', '-1', '--pretty=%s'], {
    encoding: 'utf8'
  }).trim()
  const eventName = process.env.GITHUB_EVENT_NAME ?? 'local'
  const ref = process.env.GITHUB_REF ?? 'local'
  const sha = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim()
  const intent = resolveReleaseIntent({
    commitSubject,
    eventName,
    ref,
    version
  })

  const state = intent.shouldRelease
    ? await resolveCompletionState({
        githubToken: process.env.GITHUB_TOKEN,
        packageName,
        repo: process.env.GITHUB_REPOSITORY,
        sha,
        tag: intent.tag,
        version
      })
    : {
        githubReleaseExists: false,
        npmPublished: false,
        shouldCreateGithubRelease: false,
        shouldCreateTag: false,
        shouldPublishNpm: false,
        tagExists: false,
        tagMatchesTarget: false,
        tagTarget: undefined
      }

  const lines = toOutputLines(intent, state)

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`)
  }

  for (const line of lines) {
    console.log(line)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main()
}
