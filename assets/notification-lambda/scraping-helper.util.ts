import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import * as cheerio from 'cheerio';
import { logFailure } from './handler-helpers.util';

const FIRE_TABLET_PRODUCT_PAGE = 'https://www.amazon.com/b?node=6669703011';
const PRODUCT_TITLE = 'Amazon Fire Max 11 tablet (newest model)';

const productGridTitleClassDiv = 'acsProductBlockV1__product-title';
const productGridPriceOuterClassSpan = 'acsProductBlockV1__price--buying';
const productGridPriceClassSpan = 'a-offscreen';

export const getProductPriceFromAmazon = async (): Promise<{price: number, origin: 'ProductPage' | 'Backup'}> => {
  // identify whether we are running locally or in AWS
  const isLocal = process.env.AWS_EXECUTION_ENV === undefined;

  // puppeteer launch pattern from https://gist.github.com/konarskis/7217d16f943d0c2405629fdef268f806
  const browser = isLocal
      ? await require('puppeteer').launch()
      // if we are running in Lambda, download and use a compatible version of chromium at runtime
      : await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(
              'https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar',
          ),
          headless: chromium.headless,
      });
  const page = await browser.newPage();
  await page.goto(FIRE_TABLET_PRODUCT_PAGE, {waitUntil: 'load', timeout: 0});
  console.info(`Loaded ${ await page.title() }`);

  let htmlContent = await page.content();
  let $ = cheerio.load(htmlContent);

  const productDivs = $(`div.${productGridTitleClassDiv}`);

  let productDiv;
  productDivs.each((idx: any, d: any) => {
    if ($(d).text().includes(`${PRODUCT_TITLE}`)) {
      productDiv = $(d);
    }
  });

  let priceDiv;
  $(productDiv).parent().siblings(`div`).each((idx: any, d: any) => {
    $(d).children().each((idx: any, en: any) => {
      if ($(en).hasClass(`${productGridPriceOuterClassSpan}`)) {
        priceDiv = $(en).find(`.${productGridPriceClassSpan}`);
      }
    });
  });

  let price: number | undefined;
  try {
    price = parseFloat($(priceDiv).text().replace('$', ''));
    await page.close();
    return {
      price,
      origin: 'ProductPage',
    };
  } catch (err) {
    logFailure(err);
  }

  if (!price) {

    await page.type('#twotabsearchtextbox', PRODUCT_TITLE);
    await page.click('#nav-search-submit-button');
    await page.waitForSelector('#search');
    await page.select('#s-result-sort-select', 'price-asc-rank');
    await page.waitForSelector('#search');
  
    let backupPrice;
    await page.$eval('span.a-price-whole', (el: any) => backupPrice = el.textContent);
    await page.close();

    try {
      price = parseFloat(backupPrice!); // this span is just the number part without formatting
      return {
        price,
        origin: 'Backup',
      };
    } catch (err) { }
  }

  throw new Error(`Couldn't retrieve price`);
}
