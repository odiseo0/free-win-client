export type QuantitySaveState = 'idle' | 'pending' | 'saving' | 'error';

export class QuantityAutosave {
	private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
	private readonly inFlight = new Set<number>();
	private readonly desired = new Map<number, number>();
	private readonly saved = new Map<number, number>();
	private readonly changedAt = new Map<number, number>();
	private stopped = false;

	constructor(
		initial: Iterable<[number, number]>,
		private readonly save: (itemId: number, quantity: number) => Promise<number>,
		private readonly onState: (itemId: number, state: QuantitySaveState, error?: unknown) => void,
		private readonly delayMs = 3_000,
	) {
		for (const [id, quantity] of initial) {
			this.desired.set(id, quantity);
			this.saved.set(id, quantity);
		}
	}

	change(itemId: number, quantity: number) {
		if (this.stopped || !this.desired.has(itemId)) return;
		this.desired.set(itemId, quantity);
		this.changedAt.set(itemId, Date.now());
		this.clearTimer(itemId);
		this.onState(itemId, 'pending');
		this.schedule(itemId);
	}

	register(itemId: number, quantity: number) {
		if (this.stopped || this.desired.has(itemId)) return;
		this.desired.set(itemId, quantity);
		this.saved.set(itemId, quantity);
	}

	retry(itemId: number) {
		if (this.stopped || !this.desired.has(itemId)) return;
		this.clearTimer(itemId);
		void this.flush(itemId);
	}

	hasUnsaved(): boolean {
		if (this.stopped) return false;
		return this.inFlight.size > 0 || [...this.desired].some(([id, quantity]) => quantity !== this.saved.get(id));
	}

	stop() {
		this.stopped = true;
		for (const id of this.timers.keys()) this.clearTimer(id);
	}

	private clearTimer(itemId: number) {
		const timer = this.timers.get(itemId);
		if (timer !== undefined) clearTimeout(timer);
		this.timers.delete(itemId);
	}

	private schedule(itemId: number) {
		if (this.desired.get(itemId) === this.saved.get(itemId)) {
			if (!this.inFlight.has(itemId)) this.onState(itemId, 'idle');
			return;
		}
		const elapsed = Date.now() - (this.changedAt.get(itemId) ?? Date.now());
		const wait = Math.max(0, this.delayMs - elapsed);
		this.timers.set(itemId, setTimeout(() => {
			this.timers.delete(itemId);
			void this.flush(itemId);
		}, wait));
	}

	private async flush(itemId: number) {
		if (this.stopped || this.inFlight.has(itemId)) return;
		const quantity = this.desired.get(itemId);
		if (quantity === undefined || quantity === this.saved.get(itemId)) return;
		this.inFlight.add(itemId);
		this.onState(itemId, 'saving');
		try {
			const savedQuantity = await this.save(itemId, quantity);
			if (this.stopped) return;
			this.saved.set(itemId, savedQuantity);
			this.onState(itemId, this.desired.get(itemId) === savedQuantity ? 'idle' : 'pending');
		} catch (error) {
			if (!this.stopped) {
				if (this.desired.get(itemId) !== quantity) {
					this.onState(itemId, 'pending');
				} else {
					this.onState(itemId, 'error', error);
					return;
				}
			}
		} finally {
			this.inFlight.delete(itemId);
		}
		if (!this.stopped && this.desired.get(itemId) !== this.saved.get(itemId) && !this.timers.has(itemId)) {
			this.schedule(itemId);
		}
	}
}
