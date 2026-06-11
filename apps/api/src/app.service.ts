import { Injectable } from '@nestjs/common';

export type HealthResponse = {
  service: '@bcb/api';
  status: 'ok';
};

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      service: '@bcb/api',
      status: 'ok',
    };
  }
}
