import { DataSource } from 'typeorm';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'joel123',
  database: process.env.DB_DATABASE || 'postgres',
});

async function main() {
  await ds.initialize();
  const channels = await ds.query('SELECT id, "channelId", title, "customUrl", "googleAccountEmail", "accessToken", "refreshToken" FROM youtube_channels');
  console.log("CHANNELS_DATA:", channels.map((c: any) => ({
    id: c.id,
    channelId: c.channelId,
    title: c.title,
    customUrl: c.customUrl,
    googleAccountEmail: c.googleAccountEmail,
    hasAccessToken: Boolean(c.accessToken && c.accessToken.trim()),
    hasRefreshToken: Boolean(c.refreshToken && c.refreshToken.trim()),
  })));
  const counts = await ds.query('SELECT "channelId", COUNT(*) as cnt, SUM(views) as v, SUM("watchTimeMinutes") as wt, SUM("subscribersGained") as sg FROM youtube_analytics GROUP BY "channelId"');
  console.log("ANALYTICS_COUNTS:", counts);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
