import * as DynamoDB from "@aws-sdk/client-dynamodb";
import { HistoryAndSettingsPacket } from "./handler";

/**
 * DTO for DynamoDB interactions
 * - Do not use default constructor, use `static` `from` methods for instantiation
 */
export class HistoryAndSettingsDynamoTable {
  USER_ID!: DynamoDB.AttributeValue;
  HISTORY!: DynamoDB.AttributeValue;

  toHistoryAndSettingsPacket(): HistoryAndSettingsPacket {
    return {
      history: this.HISTORY.L?.map(hi => {
        if (hi.M?.PRICE.N && hi.M?.TIMESTAMP.S) {
          return ({
            price: parseFloat(hi.M?.PRICE.N),
            timestamp: hi.M?.TIMESTAMP.S,
          });
        }
      }).filter(i => !!i) || [],
    }
  };
  static fromHistoryAndSettingsPacket(packet: HistoryAndSettingsPacket): HistoryAndSettingsDynamoTable {
    const result = new HistoryAndSettingsDynamoTable();
    result.USER_ID = {
      S: '',
    }
    result.HISTORY = {
      L: [],
    };
    result.HISTORY.L.push(...packet.history.map(h => ({
      M: {
        TIMESTAMP: {
          S: h.timestamp,
        },
        PRICE: {
          N: `${ h.price }`,
        },
      },
    })));
    result.USER_ID.S = getUser();

    return result;
  };
}

export const saveDynamoRecord = async (table: string, region: string, record: HistoryAndSettingsPacket) => {
  const dynamoRecord = HistoryAndSettingsDynamoTable.fromHistoryAndSettingsPacket(record);
  
  const client = new DynamoDB.DynamoDBClient({ region: region });

  await client.send(new DynamoDB.UpdateItemCommand({
    TableName: table,
    Key: {
      USER_ID: dynamoRecord.USER_ID,
    },
    AttributeUpdates: {
      HISTORY: {
        Value: dynamoRecord.HISTORY,
        Action: 'PUT',
      },
    }
  }));
};

export const createDynamoRecord = async (table: string, region: string, record: HistoryAndSettingsPacket) => {
  const dynamoRecord = HistoryAndSettingsDynamoTable.fromHistoryAndSettingsPacket(record);
  
  const client = new DynamoDB.DynamoDBClient({ region: region });

  await client.send(new DynamoDB.PutItemCommand({
    TableName: table,
    Item: {
      USER_ID: dynamoRecord.USER_ID,
      HISTORY: dynamoRecord.HISTORY,
    }
  }));
};

/**
 * Will create new empty history record for the user if one doesn't exist
 */
export const getHistoryFromDynamoRecord = async (table: string, region: string, user: string) => {
  const client = new DynamoDB.DynamoDBClient({ region: region });
  const dynamoResponse = await client.send(new DynamoDB.GetItemCommand({
    TableName: table,
    Key: {
      USER_ID: {
        S: user,
      }
    },
  }));
  if (dynamoResponse.Item) {
    const dynamoHistoryItem = Object.assign(new HistoryAndSettingsDynamoTable(), dynamoResponse.Item);
    return dynamoHistoryItem.toHistoryAndSettingsPacket();
  } else {
    // try to create new record
    try {
      await createDynamoRecord(table, region, { history: [] });
      return { history: [] };
    } catch (err) {
      throw new Error(`Couldn't get history from Dynamo for user ${user}`);
    }
  }
};

const getUser = () => { return 'default'; };
