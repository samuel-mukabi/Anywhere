import { ApiCheck, AssertionBuilder, Frequency, Region } from 'checkly/constructs';

new ApiCheck('staging-full-search-flow', {
  name: 'Staging full search flow',
  activated: true,
  frequency: Frequency.EVERY_10M,
  locations: [Region.UsEast1],
  request: {
    method: 'POST',
    url: `${process.env.STAGING_SEARCH_BASE_URL ?? 'https://staging.anywhere.app'}/search`,
    headers: [{ key: 'content-type', value: 'application/json' }],
    body: JSON.stringify({
      budget: 2000,
      departureRegion: 'NYC',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-14',
      vibes: ['beach', 'culture'],
    }),
  },
  assertions: [
    AssertionBuilder.statusCode().equals(202),
    AssertionBuilder.jsonBody('$.status').equals('processing'),
    AssertionBuilder.jsonBody('$.jobId').exists(),
  ],
  runParallel: false,
  tags: ['staging', 'search-flow', 'synthetic'],
  alertChannels: [
    process.env.CHECKLY_SLACK_CHANNEL_ID ?? 'slack-alerts-channel-id'
  ],
});
