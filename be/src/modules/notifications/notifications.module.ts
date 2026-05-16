import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './controllers';
import { Notification, NotificationSchema } from './schemas';
import { NotificationService } from './services';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
