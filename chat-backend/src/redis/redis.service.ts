import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private publisher?: RedisClientType;
  private subscriber?: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.publisher = createClient({ url });
    this.subscriber = this.publisher.duplicate();

    this.publisher.on('error', (error: Error) =>
      this.logger.warn(error.message),
    );
    this.subscriber.on('error', (error: Error) =>
      this.logger.warn(error.message),
    );

    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      this.logger.log('Redis Pub/Sub connected');
    } catch (error) {
      this.logger.warn(
        `Redis unavailable; continuing without Pub/Sub: ${(error as Error).message}`,
      );
    }
  }

  publish<T>(channel: string, payload: T) {
    if (!this.publisher?.isOpen) {
      return;
    }
    void this.publisher.publish(channel, JSON.stringify(payload));
  }

  async subscribe<T>(channel: string, handler: (payload: T) => void) {
    if (!this.subscriber?.isOpen) {
      return;
    }
    await this.subscriber.subscribe(channel, (message) => {
      handler(JSON.parse(message) as T);
    });
  }

  async onModuleDestroy() {
    await Promise.all([
      this.publisher?.isOpen ? this.publisher.quit() : undefined,
      this.subscriber?.isOpen ? this.subscriber.quit() : undefined,
    ]);
  }
}
