import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type TutoringSessionDocument = TutoringSession & Document;

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Schema({
    timestamps: true,
    collection: 'tutoring_sessions',
    toJSON: {
        virtuals: true,
        transform: (doc: any, ret: any) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
})
export class TutoringSession {
    _id!: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: 'BookingSession' })
    bookingSessionId!: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    menteeId!: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    mentorId!: Types.ObjectId;

    @Prop({ type: String, enum: SessionStatus, default: SessionStatus.SCHEDULED })
    status!: SessionStatus;

    // Session execution details
    @Prop({ required: true })
    sessionDetails!: {
        scheduledStartTime: Date;
        scheduledEndTime: Date;
    
        actualStartTime?: Date;
        actualEndTime?: Date;
        actualDuration?: number; // minutes
    
        sessionFormat: 'video' | 'voice' | 'chat' | 'screen_sharing' | 'in_person';
        recordingEnabled?: boolean;
        recordingUrl?: string;
    };

    // Session agenda and structure
    @Prop({ type: MongooseSchema.Types.Mixed })
    sessionAgenda?: {
        plannedAgenda?: {
            item: string;
            estimatedTime: number; // minutes
            type: 'discussion' | 'review' | 'exercise' | 'q_and_a' | 'planning';
        }[];
    
        actualAgenda?: {
            item: string;
            actualTime: number;
            completed: boolean;
            notes?: string;
        }[];
    
        agendaDeviations?: {
            originalItem: string;
            actualItem: string;
            reason: string;
        }[];
    };

    // Content and materials shared during session
    @Prop({ type: MongooseSchema.Types.Mixed })
    sessionContent?: {
        // Resources shared by mentor
        mentorSharedResources?: {
            title: string;
            type: 'document' | 'link' | 'video' | 'book_recommendation' | 'tool' | 'course';
            url?: string;
            description: string;
            sharedAt: Date;
        }[];
    
        // Materials reviewed together
        reviewedMaterials?: {
            materialType: 'resume' | 'portfolio' | 'code' | 'interview_answers' | 'career_plan';
            title: string;
            feedback: string;
            rating?: number; // 1-5 scale
            improvementPoints: string[];
        }[];
    
        // Notes and action items
        sessionNotes?: string;
        keyTakeaways?: string[];
    
        actionItems?: {
            actionId: string;
            description: string;
            assignedTo: 'mentee' | 'mentor' | 'both';
            priority: 'high' | 'medium' | 'low';
            dueDate?: Date;
            status: 'pending' | 'in_progress' | 'completed';
            completedDate?: Date;
        }[];
    };

  // Mentee progress assessment during session
  @Prop({ type: MongooseSchema.Types.Mixed })
  progressAssessment?: any;

  // Mentor observations and insights
  @Prop({ type: MongooseSchema.Types.Mixed })
  mentorObservations?: any;

  // Follow-up planning
  @Prop({ type: MongooseSchema.Types.Mixed })
  followUpPlanning?: any;

  // Session quality and technical details
  @Prop({ type: MongooseSchema.Types.Mixed })
  sessionQuality?: any;

  // Integration with learning roadmap
  @Prop({ type: MongooseSchema.Types.Mixed })
  roadmapIntegration?: any;

  // Post-session requirements
  @Prop({ type: MongooseSchema.Types.Mixed })
  postSessionRequirements?: any;

  createdAt!: Date;
  updatedAt!: Date;
}

export const TutoringSessionSchema = SchemaFactory.createForClass(TutoringSession);

// Indexes
TutoringSessionSchema.index({ bookingSessionId: 1 });
TutoringSessionSchema.index({ menteeId: 1, status: 1 });
TutoringSessionSchema.index({ mentorId: 1, status: 1 });
TutoringSessionSchema.index({ status: 1, 'sessionDetails.scheduledStartTime': 1 });
TutoringSessionSchema.index({ createdAt: -1 });