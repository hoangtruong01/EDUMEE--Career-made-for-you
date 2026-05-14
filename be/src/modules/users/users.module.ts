import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { MailModule } from '../../common/mail/mail.module';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';
import { User, UserSchema } from './schemas/user.schema';
import { CommunityPost, CommunityPostSchema } from '../community/schemas/community-post.schema';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    //Khai báo Schema để UsersService có thể gọi this.userModel
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
      { name: CommunityPost.name, schema: CommunityPostSchema },
    ]),

    // JwtModule để UsersService dùng được this.jwtService.signAsync
    JwtModule.register({}),

    // 3. ConfigModule để dùng được this.configService lấy biến môi trường từ file .env
    ConfigModule,
    MailModule,
    MediaModule,
  ],
  controllers: [UsersController, UserProfileController],
  providers: [UsersService, UserProfileService],
  // export UsersService thig AuthService mới có thể gọi nó
  exports: [UsersService, UserProfileService],
})
export class UsersModule {}
