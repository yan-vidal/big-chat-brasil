import { AppService } from './app.service.js';

describe('AppService', () => {
  it('returns the API health payload', () => {
    const service = new AppService();

    expect(service.getHealth()).toEqual({
      service: '@bcb/api',
      status: 'ok',
    });
  });
});
