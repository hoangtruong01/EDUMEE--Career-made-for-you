import {
    Controller,
    Post,
    Get,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AssessmentSessionService } from '../services/assessment-session.service';
import { AssessmentSession } from '../schemas/assessment-sesions.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { getAuthUserId } from '../../../common/auth';
import type { AuthUserLike } from '../../../common/auth';

@ApiTags('Assessment Sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('assessment-sessions')
export class AssessmentSessionController {
    constructor(private readonly sessionService: AssessmentSessionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Start a new assessment session for current user' })
    @ApiResponse({ status: 201, description: 'Session created' })
    async create(@CurrentUser() user: AuthUserLike): Promise<AssessmentSession> {
        return this.sessionService.createSession(getAuthUserId(user));
    }

    @Get()
    @ApiOperation({ summary: 'List sessions for current user' })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Sessions list' })
    async list(
        @CurrentUser() user: AuthUserLike,
        @Query('status') status?: string,
    ) {
        const filter: Record<string, string> = {};
        if (status) filter.status = status;
        return this.sessionService.listByUser(getAuthUserId(user), filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get session by ID' })
    @ApiParam({ name: 'id', description: 'Session ID' })
    @ApiResponse({ status: 200, description: 'Session found' })
    async findOne(@Param('id') id: string) {
        return this.sessionService.getById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update session' })
    @ApiParam({ name: 'id', description: 'Session ID' })
    @ApiResponse({ status: 200, description: 'Session updated' })
    async update(@Param('id') id: string, @Body() patch: Record<string, unknown>) {
        return this.sessionService.updateSession(id, patch as Partial<AssessmentSession>);
    }

    @Post(':id/finish')
    @ApiOperation({ summary: 'Mark session as finished' })
    @ApiParam({ name: 'id', description: 'Session ID' })
    @ApiResponse({ status: 200, description: 'Session finished' })
    async finish(@Param('id') id: string) {
        return this.sessionService.finishSession(id);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel session' })
    @ApiParam({ name: 'id', description: 'Session ID' })
    @ApiResponse({ status: 200, description: 'Session cancelled' })
    async cancel(@Param('id') id: string) {
        return this.sessionService.cancelSession(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete session' })
    @ApiParam({ name: 'id', description: 'Session ID' })
    @ApiResponse({ status: 204, description: 'Session deleted' })
    async remove(@Param('id') id: string) {
        return this.sessionService.removeSession(id);
    }
}
