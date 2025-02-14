import { getProductPriceFromAmazon } from "../scraping-helper.util";

const TWO_MINUTES = 2 * 60 * 1000; // give Puppeteer a little time

describe('scraping-helper.util', () => {
  it('gets robots.txt', async () => {
    console.info(await getProductPriceFromAmazon());
  }, TWO_MINUTES);
});
