import { CosmosClient } from '@azure/cosmos';

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  feedbackText: string;
  createdAt: string;
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

let cosmosClient: CosmosClient | null = null;

export function getCosmosClient(): CosmosClient {
  if (!cosmosClient) {
    const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;

    if (!endpoint || !key) {
      if (!connectionString) {
        throw new Error('Cosmos DB configuration is missing. Please set either COSMOS_DB_ENDPOINT and COSMOS_DB_KEY, or COSMOS_DB_CONNECTION_STRING');
      }
      cosmosClient = new CosmosClient(connectionString);
    } else {
      cosmosClient = new CosmosClient({ endpoint, key });
    }
  }

  return cosmosClient;
}

export async function getFeedbackItems(limit: number = 50): Promise<FeedbackItem[]> {
  const client = getCosmosClient();
  const database = client.database(process.env.COSMOS_DB_DATABASE_NAME || 'teams-bot-db');
  const container = database.container(process.env.COSMOS_DB_CONTAINER_NAME || 'teams-bot-feedback');

  const query = 'SELECT * FROM c ORDER BY c._ts DESC';
  const { resources } = await container.items.query(query).fetchNext();

  return resources.slice(0, limit);
}

export async function getLatestFeedbackItems(sinceTimestamp?: number): Promise<FeedbackItem[]> {
  const client = getCosmosClient();
  const database = client.database(process.env.COSMOS_DB_DATABASE_NAME || 'teams-bot-db');
  const container = database.container(process.env.COSMOS_DB_CONTAINER_NAME || 'teams-bot-feedback');

  let query = 'SELECT * FROM c ORDER BY c._ts DESC';
  if (sinceTimestamp) {
    query = `SELECT * FROM c WHERE c._ts > ${sinceTimestamp} ORDER BY c._ts DESC`;
  }

  const { resources } = await container.items.query(query).fetchNext();
  return resources;
}
