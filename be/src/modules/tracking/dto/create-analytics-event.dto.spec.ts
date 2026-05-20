import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH,
  ANALYTICS_EVENT_PATH_MAX_LENGTH,
  ANALYTICS_EVENT_TYPE_MAX_LENGTH,
} from '../tracking.constants';
import { CreateAnalyticsEventDto } from './create-analytics-event.dto';

describe('CreateAnalyticsEventDto', () => {
  it('truncates analytics strings before max length validation', async () => {
    const dto = plainToInstance(CreateAnalyticsEventDto, {
      eventType: 'e'.repeat(ANALYTICS_EVENT_TYPE_MAX_LENGTH + 10),
      path: `/${'path'.repeat(ANALYTICS_EVENT_PATH_MAX_LENGTH)}`,
      anonymousId: 'a'.repeat(ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH + 10),
      metadata: {},
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.eventType).toHaveLength(ANALYTICS_EVENT_TYPE_MAX_LENGTH);
    expect(dto.path).toHaveLength(ANALYTICS_EVENT_PATH_MAX_LENGTH);
    expect(dto.anonymousId).toHaveLength(ANALYTICS_EVENT_ANONYMOUS_ID_MAX_LENGTH);
  });
});
