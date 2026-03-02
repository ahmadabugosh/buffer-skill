# Buffer Skill (CLI + OpenClaw)

A production-focused Node.js CLI for Buffer's GraphQL API.

## Features

- List connected profiles (`buffer profiles`)
- Create immediate, queued, and scheduled posts (`buffer post`)
- Post to one, many, or all profiles
- Save and list ideas/drafts (`buffer post --draft`, `buffer ideas`)
- View upcoming queue (`buffer queue`)
- Actionable error messages for auth, rate limits, and network issues

## Installation

```bash
cd skills/buffer
npm install
cp .env.example .env
# add BUFFER_API_KEY in .env
```

## Quick Start

```bash
# List profiles
node ./buffer.js profiles

# Immediate post
node ./buffer.js post "Hello from Buffer CLI" --profile <profile_id>

# Scheduled post
node ./buffer.js post "Scheduled update" --profile <profile_id> --time "2026-03-03T14:00:00Z"

# Queue post
node ./buffer.js post "Queue this" --profile <profile_id> --queue

# Save draft/idea
node ./buffer.js post "Draft idea" --profile <profile_id> --draft

# List queue and ideas
node ./buffer.js queue --limit 10
node ./buffer.js ideas --limit 10
```

## Image Upload Note

`--image` currently validates local file existence and forwards a placeholder `media` payload.
Buffer's public GraphQL beta docs do not yet document a finalized local file upload flow, so full upload is intentionally marked as a documented limitation.

## Testing

```bash
npm test
npm run coverage
npm run format:check
```

Coverage is enforced with thresholds in `vitest.config.js`.
Code style is standardized with Prettier (`npm run format`).

## API Docs

- Buffer Developers: https://developers.buffer.com/
- API keys: https://publish.buffer.com/settings/api

## Contributing

1. Create a branch
2. Add/adjust tests first
3. Run `npm test` and `npm run coverage`
4. Open a PR with a clear summary
