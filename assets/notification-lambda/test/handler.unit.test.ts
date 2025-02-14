import * as HandlerExports from '../handler';
import * as HelperExports from '../handler-helpers.util';
import * as DynamoHelperExports from '../dynamodb-helpers.util';

describe('handler', () => {

  beforeAll(() => {
    jest.spyOn(DynamoHelperExports, 'saveDynamoRecord').mockResolvedValue();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  })

  it('returns 200 on success', async () => {
    const getHistorySpy = jest.spyOn(HelperExports, 'retrieveHistoryAndSettings');
    getHistorySpy.mockResolvedValueOnce({
      history: [],
    });
    const getPriceSpy = jest.spyOn(HelperExports, 'retrieveCurrentPrice');
    getPriceSpy.mockResolvedValueOnce(0);
    const result = await HandlerExports.handler({});
    expect(result?.statusCode).toBe(200);
    getHistorySpy.mockRestore();
  });

  it('notifies when new price > old price', async () => {
    const getHistorySpy = jest.spyOn(HelperExports, 'retrieveHistoryAndSettings');
    getHistorySpy.mockResolvedValueOnce({
      history: [{
        timestamp: new Date().toISOString(),
        price: 100,
      }],
    });
    const getPriceSpy = jest.spyOn(HelperExports, 'retrieveCurrentPrice');
    getPriceSpy.mockResolvedValueOnce(150);
    const notifySpy = jest.spyOn(HelperExports, 'notifyPriceDrop');
    notifySpy.mockResolvedValueOnce();
    const result = await HandlerExports.handler({});
    expect(result?.statusCode).toBe(200);
    expect(notifySpy).not.toHaveBeenCalled();
    getHistorySpy.mockRestore();
    notifySpy.mockRestore();
    getPriceSpy.mockRestore();
  });

  it('does not notify when new price <= old price', async () => {
    const getHistorySpy = jest.spyOn(HelperExports, 'retrieveHistoryAndSettings');
    getHistorySpy.mockResolvedValueOnce({
      history: [{
        timestamp: new Date().toISOString(),
        price: 200,
      }],
    });
    const getPriceSpy = jest.spyOn(HelperExports, 'retrieveCurrentPrice');
    getPriceSpy.mockResolvedValueOnce(150);
    const notifySpy = jest.spyOn(HelperExports, 'notifyPriceDrop');
    notifySpy.mockResolvedValueOnce();
    const result = await HandlerExports.handler({});
    expect(result?.statusCode).toBe(200);
    expect(notifySpy).toHaveBeenCalled();
    getHistorySpy.mockRestore();
    notifySpy.mockRestore();
    getPriceSpy.mockRestore();
  });

});
