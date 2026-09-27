import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { CoachService } from './coach.service.js';

/**
 * Lets a request through only when the signed-in user coaches the client in
 * `:clientId`. Anything else is a 404 so client ids are not revealed. Must
 * run after AccessTokenGuard.
 */
@Injectable()
export class LinkedClientGuard implements CanActivate {
  constructor(private readonly coachService: CoachService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const clientId = request.params.clientId;

    if (
      typeof clientId !== 'string' ||
      !isUUID(clientId) ||
      !(await this.coachService.isLinkedCoach(request.user.sub, clientId))
    ) {
      throw new NotFoundException('Client was not found.');
    }
    return true;
  }
}
