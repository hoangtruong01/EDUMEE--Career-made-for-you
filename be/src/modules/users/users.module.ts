import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserProfile, UserProfileSchema } from './schemas/user-profile.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  controllers: [
    UsersController,
    UserProfileController,
  ],
  providers: [
    UsersService, 
    UserProfileService,
  ],
  exports: [
    UsersService,
    UserProfileService,
  ],
})
export class UsersModule {}
