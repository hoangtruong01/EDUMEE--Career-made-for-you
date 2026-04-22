import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@common/enums';

export interface AuthUserLike {
  userId?: string;
  id?: string;
  sub?: string;
  role?: string;
}

export function getAuthUserId(user: AuthUserLike | undefined | null): string {
  if (!user) return '';
  return user.userId || user.id || user.sub || '';
}

export function isAdmin(user: AuthUserLike | undefined | null): boolean {
  if (!user) return false;
  return user.role === UserRole.ADMIN || user.role === 'admin';
}

export function assertOwnerOrAdmin(ownerId: string, user: AuthUserLike): void {
  const uid = getAuthUserId(user);
  if (!uid) {
    throw new ForbiddenException('Missing user context');
  }
  if (uid !== ownerId && !isAdmin(user)) {
    throw new ForbiddenException('Forbidden');
  }
}

