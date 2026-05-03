import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUserLike } from '../../../common/auth';
import { getAuthUserId, isAdmin } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCommunityCommentDto, CreateCommunityPostDto } from '../dto/community-post.dto';
import { CommunityPostService } from '../services/community-post.service';

@ApiTags('community-posts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('community-posts')
export class CommunityPostController {
  constructor(private readonly communityPostService: CommunityPostService) {}

  @Post()
  @ApiOperation({ summary: 'Create a community post' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Post created successfully' })
  create(@Body() body: CreateCommunityPostDto, @CurrentUser() user: AuthUserLike) {
    return this.communityPostService.create(getAuthUserId(user), body);
  }

  @Get('trending-hashtags')
  @ApiOperation({ summary: 'Get trending hashtags' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trending hashtags retrieved successfully' })
  getTrendingHashtags(@Query('limit') limit?: number) {
    return this.communityPostService.getTrendingHashtags(limit);
  }

  @Get()
  @ApiOperation({ summary: 'Get community posts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Posts retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('q') search?: string,
    @Query('hashtag') hashtag?: string,
  ) {
    return this.communityPostService.findAll(page, limit, { category, search, hashtag });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a community post by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.communityPostService.findOne(id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments retrieved successfully' })
  listComments(@Param('id') id: string) {
    return this.communityPostService.listComments(id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment created successfully' })
  addComment(
    @Param('id') id: string,
    @Body() body: CreateCommunityCommentDto,
    @CurrentUser() user: AuthUserLike,
  ) {
    return this.communityPostService.addComment(id, getAuthUserId(user), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a community post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.communityPostService.remove(id, getAuthUserId(user), isAdmin(user));
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Toggle like on a community post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Like toggled successfully' })
  toggleLike(@Param('id') id: string, @CurrentUser() user: AuthUserLike) {
    return this.communityPostService.toggleLike(id, getAuthUserId(user));
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment from a post' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment deleted successfully' })
  removeComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUserLike,
  ) {
    return this.communityPostService.removeComment(id, commentId, getAuthUserId(user), isAdmin(user));
  }

}
