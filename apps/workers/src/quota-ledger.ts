export type ReservationStatus = 'committed' | 'reserved';

export type QuotaReservation = {
  createdAt: number;
  status: ReservationStatus;
};

export type QuotaState = {
  reservations: Record<string, QuotaReservation>;
};

type ReserveCommand = {
  id: string;
  limit: number;
  now: number;
  type: 'reserve';
  windowMs: number;
};

type StatusCommand = {
  limit: number;
  now: number;
  type: 'status';
  windowMs: number;
};

type FinalizeCommand =
  | {
      id: string;
      now: number;
      type: 'commit';
    }
  | {
      id: string;
      now: number;
      type: 'rollback';
    };

export type QuotaCommand = FinalizeCommand | ReserveCommand | StatusCommand;

type QuotaResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function applyQuotaCommand(
  state: QuotaState,
  command: QuotaCommand,
): { result?: QuotaResult; state: QuotaState } {
  if (command.type === 'commit' || command.type === 'rollback') {
    const existing = state.reservations[command.id];
    if (existing === undefined) return { state };

    const reservations = { ...state.reservations };
    if (command.type === 'commit') {
      reservations[command.id] = { ...existing, status: 'committed' };
      return { state: { reservations } };
    }

    if (existing.status === 'reserved') {
      delete reservations[command.id];
      return { state: { reservations } };
    }

    return { state };
  }

  const reservations = Object.fromEntries(
    Object.entries(state.reservations).filter(
      ([, reservation]) => reservation.createdAt + command.windowMs > command.now,
    ),
  );
  const activeReservations = Object.values(reservations);
  const resetAt =
    activeReservations.length === 0
      ? command.now + command.windowMs
      : Math.min(
          ...activeReservations.map((reservation) => reservation.createdAt + command.windowMs),
        );

  if (command.type === 'status') {
    return {
      result: {
        allowed: activeReservations.length < command.limit,
        remaining: Math.max(0, command.limit - activeReservations.length),
        resetAt,
      },
      state: { reservations },
    };
  }
  const existing = reservations[command.id];
  const isAllowed = existing !== undefined || Object.keys(reservations).length < command.limit;

  if (isAllowed && existing === undefined) {
    reservations[command.id] = { createdAt: command.now, status: 'reserved' };
  }
  const remaining = Math.max(0, command.limit - Object.keys(reservations).length);

  return {
    result: { allowed: isAllowed, remaining, resetAt },
    state: { reservations },
  };
}
