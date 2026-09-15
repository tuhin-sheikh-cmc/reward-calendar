import { Person } from '../entities/person.js';
import { ForbiddenError } from '../errors/domain-error.js';

export class GrantPointsPolicy {
  public static assertCanGrant(provider: Person, receiver: Person): void {
    if (provider.id === receiver.id) {
      throw new ForbiddenError('A person cannot grant points to themselves');
    }
    if (provider.role !== 'provider') {
      throw new ForbiddenError('Only providers can grant points');
    }
    if (!provider.isActive) {
      throw new ForbiddenError('The granting provider must be an active person');
    }
    if (!receiver.isActive) {
      throw new ForbiddenError('Cannot grant points to an inactive person');
    }
  }
}