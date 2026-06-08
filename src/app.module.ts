import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
