import { DurableObject } from 'cloudflare:workers';
import { applyQuotaCommand, type QuotaState } from './quota-ledger';

const STATE_KEY = 'quota-state';

export type QuotaReservationRequest = {
  id: string;
  limit: number;
  windowMs: number;
};

export class QuotaLimiter extends DurableObject<unknown> {
  private quotaState: QuotaState = { reservations: {} };

  constructor(state: DurableObjectState, env: unknown) {
    super(state, env);
    state.blockConcurrencyWhile(async () => {
      this.quotaState = (await state.storage.get<QuotaState>(STATE_KEY)) ?? { reservations: {} };
    });
  }

  async reserve(request: QuotaReservationRequest) {
    if (request.id.length === 0 || request.id.length > 128) {
      throw new TypeError('Quota reservation id must contain 1 to 128 characters');
    }
    if (!Number.isSafeInteger(request.limit) || request.limit <= 0) {
      throw new TypeError('Quota limit must be a positive integer');
    }
    if (!Number.isSafeInteger(request.windowMs) || request.windowMs <= 0) {
      throw new TypeError('Quota window must be a positive integer');
    }

    const transition = applyQuotaCommand(this.quotaState, {
      ...request,
      now: Date.now(),
      type: 'reserve',
    });
    this.quotaState = transition.state;
    await this.ctx.storage.put(STATE_KEY, this.quotaState);
    return transition.result;
  }

  async status(request: Omit<QuotaReservationRequest, 'id'>) {
    if (!Number.isSafeInteger(request.limit) || request.limit <= 0) {
      throw new TypeError('Quota limit must be a positive integer');
    }
    if (!Number.isSafeInteger(request.windowMs) || request.windowMs <= 0) {
      throw new TypeError('Quota window must be a positive integer');
    }

    const transition = applyQuotaCommand(this.quotaState, {
      ...request,
      now: Date.now(),
      type: 'status',
    });
    this.quotaState = transition.state;
    await this.ctx.storage.put(STATE_KEY, this.quotaState);
    return transition.result;
  }

  async commit(id: string) {
    const transition = applyQuotaCommand(this.quotaState, {
      id,
      now: Date.now(),
      type: 'commit',
    });
    this.quotaState = transition.state;
    await this.ctx.storage.put(STATE_KEY, this.quotaState);
  }

  async rollback(id: string) {
    const transition = applyQuotaCommand(this.quotaState, {
      id,
      now: Date.now(),
      type: 'rollback',
    });
    this.quotaState = transition.state;
    await this.ctx.storage.put(STATE_KEY, this.quotaState);
  }
}
