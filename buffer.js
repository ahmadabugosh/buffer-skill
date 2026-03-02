#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from './lib/config.js';
import { validateApiKey } from './lib/auth.js';
import { BufferApi } from './lib/buffer-api.js';
import {
  parseProfilesList,
  parseScheduleTime,
  validatePostText,
  validateImagePath,
  validatePostOptions,
  parseLimit,
} from './lib/utils.js';

export function formatProfiles(profiles) {
  if (!profiles.length) {
    return 'No connected profiles found.';
  }

  const lines = profiles.map((profile) => {
    const service = profile.service || 'unknown';
    const username = profile.username ? `@${profile.username}` : 'n/a';
    return `${chalk.green('✓')} ${service} (${username}) - ID: ${profile.id}`;
  });

  return ['Connected Profiles:', ...lines].join('\n');
}

export function formatPostSuccess(post) {
  const services = (post.profiles || []).map((profile) => profile.service).filter(Boolean).join(', ') || 'unknown';
  const lines = [
    `${chalk.green('✅')} Post created successfully`,
    `ID: ${post.id || 'n/a'}`,
    `Profiles: ${services}`,
  ];

  if (post.scheduledAt) {
    lines.push(`Scheduled: ${new Date(post.scheduledAt).toISOString()}`);
  } else {
    lines.push('Scheduled: immediate/queue');
  }

  return lines.join('\n');
}

export function formatQueuePosts(posts) {
  if (!posts.length) {
    return 'No upcoming posts in queue.';
  }

  const lines = [`Upcoming Posts (${posts.length}):`, ''];

  posts.forEach((post, index) => {
    const text = (post.text || '').trim();
    const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
    const services = (post.profiles || []).map((profile) => profile.service).filter(Boolean).join(', ') || 'unknown';
    const scheduled = post.scheduledAt ? new Date(post.scheduledAt).toISOString() : 'n/a';

    lines.push(`${index + 1}. "${preview}" → ${services}`);
    lines.push(`   Scheduled: ${scheduled}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

export function formatIdeaSuccess(idea) {
  return [
    `${chalk.green('✅')} Idea saved successfully`,
    `ID: ${idea.id || 'n/a'}`,
    `Text: ${(idea.text || '').trim() || 'n/a'}`,
  ].join('\n');
}

export function formatIdeas(ideas) {
  if (!ideas.length) {
    return 'No saved ideas found.';
  }

  const lines = [`Saved Ideas (${ideas.length}):`, ''];

  ideas.forEach((idea, index) => {
    const text = (idea.text || '').trim();
    const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text;
    const createdAt = idea.createdAt ? new Date(idea.createdAt).toISOString() : 'n/a';

    lines.push(`${index + 1}. "${preview}"`);
    lines.push(`   Created: ${createdAt}`);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

function resolveProfileIds(options, profiles = []) {
  if (options.profile) {
    return [options.profile];
  }

  const list = parseProfilesList(options.profiles);
  if (list.length) {
    return list;
  }

  if (options.all) {
    return profiles.map((profile) => profile.id).filter(Boolean);
  }

  throw new Error('No target profile provided. Use --profile, --profiles, or --all.');
}

export function createCli({ api } = {}) {
  const program = new Command();

  program
    .name('buffer')
    .description('Buffer CLI for posting and profile management')
    .version('1.0.0');

  program
    .command('profiles')
    .description('List connected social media profiles')
    .action(async () => {
      const spinner = ora('Fetching connected profiles...').start();
      try {
        const activeApi = api || new BufferApi({ ...getConfig(), apiKey: validateApiKey(getConfig().apiKey) });
        const profiles = await activeApi.getProfiles();
        spinner.stop();
        console.log(formatProfiles(profiles));
      } catch (error) {
        spinner.fail('Failed to fetch profiles');
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('post <text>')
    .description('Create a post with text content')
    .option('--profile <id>', 'Post to a single profile ID')
    .option('--profiles <ids>', 'Comma-separated profile IDs')
    .option('--all', 'Post to all connected profiles')
    .option('--time <datetime>', 'Schedule post for an ISO datetime')
    .option('--queue', 'Add to queue')
    .option('--image <path>', 'Attach an image from local file path')
    .option('--draft', 'Create as idea/draft instead of post')
    .action(async (text, options) => {
      const spinner = ora(options.draft ? 'Saving idea...' : 'Creating post...').start();
      try {
        const activeApi = api || new BufferApi({ ...getConfig(), apiKey: validateApiKey(getConfig().apiKey) });
        validatePostOptions(options);
        const normalizedText = validatePostText(text);

        const profiles = options.all ? await activeApi.getProfiles() : [];
        const profileIds = resolveProfileIds(options, profiles);

        if (options.draft) {
          const createdIdea = await activeApi.createIdea({ text: normalizedText, profileIds });
          spinner.stop();
          console.log(formatIdeaSuccess(createdIdea));
          return;
        }

        const scheduledAt = parseScheduleTime(options.time);
        const imagePath = validateImagePath(options.image);
        const input = {
          text: normalizedText,
          profileIds,
          queue: Boolean(options.queue),
          ...(scheduledAt ? { scheduledAt } : {}),
          ...(imagePath
            ? {
                // BLOCKED: Buffer GraphQL local upload flow is undocumented in public beta docs.
                // TODO: revisit and switch to official upload mechanism once confirmed.
                media: [{ filePath: imagePath }],
              }
            : {}),
        };

        const createdPost = await activeApi.createPost(input);
        spinner.stop();
        console.log(formatPostSuccess(createdPost));
      } catch (error) {
        spinner.fail(options.draft ? 'Failed to save idea' : 'Failed to create post');
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('queue')
    .description('View pending/scheduled posts')
    .option('--profile <id>', 'Filter by profile ID')
    .option('--limit <n>', 'Limit number of posts shown', '10')
    .action(async (options) => {
      const spinner = ora('Fetching scheduled posts...').start();
      try {
        const activeApi = api || new BufferApi({ ...getConfig(), apiKey: validateApiKey(getConfig().apiKey) });
        const posts = await activeApi.getScheduledPosts(options.profile);
        const limit = parseLimit(options.limit);

        const limited = posts.slice(0, limit);
        spinner.stop();
        console.log(formatQueuePosts(limited));
      } catch (error) {
        spinner.fail('Failed to fetch queue');
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exitCode = 1;
      }
    });

  program
    .command('ideas')
    .description('List saved ideas/drafts')
    .option('--limit <n>', 'Limit number of ideas shown', '10')
    .action(async (options) => {
      const spinner = ora('Fetching saved ideas...').start();
      try {
        const activeApi = api || new BufferApi({ ...getConfig(), apiKey: validateApiKey(getConfig().apiKey) });
        const ideas = await activeApi.getIdeas();
        const limit = parseLimit(options.limit);

        const limited = ideas.slice(0, limit);
        spinner.stop();
        console.log(formatIdeas(limited));
      } catch (error) {
        spinner.fail('Failed to fetch ideas');
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exitCode = 1;
      }
    });

  return program;
}

export async function run(argv = process.argv) {
  const program = createCli();
  await program.parseAsync(argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
