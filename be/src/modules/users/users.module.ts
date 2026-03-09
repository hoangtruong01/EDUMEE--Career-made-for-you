import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { MailModule } from '../../common/mail/mail.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    //Khai báo Schema để UsersService có thể gọi this.userModel
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    //Khai báo JwtModule để UsersService dùng được this.jwtService.signAsync
    JwtModule.register({}),

    // 3. Khai báo ConfigModule để dùng được this.configService lấy biến môi trường từ file .env
    ConfigModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],

  // export UsersService thig AuthService mới có thể gọi nó
  exports: [UsersService],
})
export class UsersModule {}
