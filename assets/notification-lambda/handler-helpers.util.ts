
import * as sns from '@aws-sdk/client-sns';
import { AWS_REGION, FAILURE_TOPIC_ARN, HistoryAndSettingsPacket } from "./handler";
import { getHistoryFromDynamoRecord, saveDynamoRecord } from './dynamodb-helpers.util';
import { getProductPriceFromAmazon } from './scraping-helper.util';

const USER_ID = 'default';

export const retrieveHistoryAndSettings = async(table: string, region: string): Promise<HistoryAndSettingsPacket> => {
  const result: HistoryAndSettingsPacket = await getHistoryFromDynamoRecord(table, region, USER_ID);
  
  // can we trust that history is sorted?
    return Promise.resolve(result);
  };
  
  export const retrieveCurrentPrice = async(): Promise<number> => {
    // const MOCK_PRICE = 199.00 - (Math.round(Math.random() * 10));
    let price = await getProductPriceFromAmazon();
    if (price.origin !== 'ProductPage') {
      notifyFailure(FAILURE_TOPIC_ARN, AWS_REGION, `ProductPage integration broken`);
    }
    return Promise.resolve(price.price);
  };

  export const notifyPriceDrop = async(topicArn: string, region: string, previousPrice: number, currentPrice: number, priceDifference: number): Promise<void> => {
    const message = `Price drop of ${priceDifference}. Previously ${previousPrice}, currently ${currentPrice}`;
    const snsClient = new sns.SNSClient({ region: region });
    await snsClient.send(new sns.PublishCommand({
      TopicArn: topicArn,
      Message: message,
    }));
  };

  export const notifyFailure = async(topicArn: string, region: string, failureMessage: string): Promise<void> => {
    const snsClient = new sns.SNSClient({ region: region });
    await snsClient.send(new sns.PublishCommand({
      TopicArn: topicArn,
      Message: failureMessage,
    }));
  };
  
  export const saveHistory = async(table: string, region: string, currentPrice: number, existingHistoryAndSettings: HistoryAndSettingsPacket): Promise<void> => {
    const { history } = existingHistoryAndSettings;
    // if the price has been updated add a history record
    if (Math.round(currentPrice) != Math.round(history.at(0)?.price || 0)) {
      // add items to the front of the array, so we can always grab latest from position 0
      history.unshift({
        timestamp: new Date().toISOString(),
        price: currentPrice,
      });
      // save the history to DynamoDB
      await saveDynamoRecord(table, region, { history: history });
    }
  };

  export const logRun = (notificationSent: boolean, priceDifference: number, previousPrice: number, newPrice: number) => {
    const runLogPrefix = 'PRICE REVIEWED';
    const runInfo = {
      notificationSent,
      priceDifference,
      newPrice,
      previousPrice,
    };
    console.info(runLogPrefix, runInfo);
  }

  export const logFailure = (errorObject: any) => {
    const failureLogPrefix = 'FAILED TO RETRIEVE LATEST PRICE';
    console.error(failureLogPrefix, errorObject);
  };
  