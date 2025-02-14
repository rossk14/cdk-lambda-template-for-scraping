import { logFailure, logRun, notifyFailure, notifyPriceDrop, retrieveCurrentPrice, retrieveHistoryAndSettings, saveHistory } from "./handler-helpers.util";

export const { 
  NOTIFICATION_TOPIC_ARN = '', 
  TABLE_ARN = '', 
  AWS_REGION = '', 
  FAILURE_TOPIC_ARN = '' } = process.env;

const MINIMUM_PRICE_DROP = parseInt(process.env.MINIMUM_PRICE_DROP || '1') || 1;

export type Response = {
  statusCode: number,
  body: string,
};

export type LambdaEvent = { };

export type HistoryAndSettingsPacket = {
  history: HistoryPacket[],
};
type HistoryPacket = {
  timestamp: string, // ISO datetime
  price: number, // float with 2 decimals
};

export const handler = async (event: LambdaEvent) => {
  const { history } = await retrieveHistoryAndSettings(TABLE_ARN, AWS_REGION);
  let currentPrice = 0;
  try {
    currentPrice = await retrieveCurrentPrice();
  } catch (err) {
    logFailure(err);
    notifyFailure(FAILURE_TOPIC_ARN, AWS_REGION, 'Failed to pull current price');
  }

  if (currentPrice > 0) {
    const previousPrice = history.at(0)?.price || 0;
    const priceDifference = previousPrice - currentPrice;

    let notificationSent = false;

    if (priceDifference > MINIMUM_PRICE_DROP) {
      await notifyPriceDrop(NOTIFICATION_TOPIC_ARN, AWS_REGION, previousPrice, currentPrice, priceDifference);
      notificationSent = true;
    }

    logRun(notificationSent, priceDifference, previousPrice, currentPrice);

    await saveHistory(TABLE_ARN, AWS_REGION, currentPrice, { history });
  }
  
  return {
    statusCode: 200,
    body: 'OK',
  };
};

