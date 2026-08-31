import { DataSource } from 'typeorm';
import { Account } from './src/account.entity';
import { Organization } from './src/organization.entity';
import { Analytics } from './src/analytics.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'post123',
  database: 'postgres',
  entities: [Account, Organization, Analytics],
});

async function run() {
  await AppDataSource.initialize();
  const accounts = await AppDataSource.getRepository(Account).find();
  console.log("ACCOUNTS:", accounts);
  process.exit(0);
}

run().catch(console.error);
