import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuantityAutosave } from './quantityAutosave';

afterEach(() => vi.useRealTimers());

describe('quantity autosave', () => {
	it('saves three seconds after the last tap', async () => {
		vi.useFakeTimers();
		const save = vi.fn(async (_id: number, quantity: number) => quantity);
		const autosave = new QuantityAutosave([[5, 1]], save, () => {});
		autosave.change(5, 2);
		await vi.advanceTimersByTimeAsync(2_000);
		autosave.change(5, 3);
		await vi.advanceTimersByTimeAsync(2_999);
		expect(save).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith(5, 3);
		expect(autosave.hasUnsaved()).toBe(false);
	});

	it('does not lose a newer quantity while an older request is in flight', async () => {
		vi.useFakeTimers();
		let finishFirst!: (quantity: number) => void;
		const save = vi.fn()
			.mockImplementationOnce(() => new Promise<number>((resolve) => { finishFirst = resolve; }))
			.mockImplementationOnce(async (_id: number, quantity: number) => quantity);
		const autosave = new QuantityAutosave([[5, 1]], save, () => {});
		autosave.change(5, 2);
		await vi.advanceTimersByTimeAsync(3_000);
		autosave.change(5, 3);
		await vi.advanceTimersByTimeAsync(3_000);
		expect(save).toHaveBeenCalledOnce();
		finishFirst(2);
		await vi.advanceTimersByTimeAsync(0);
		expect(save).toHaveBeenCalledTimes(2);
		expect(save).toHaveBeenLastCalledWith(5, 3);
		expect(autosave.hasUnsaved()).toBe(false);
	});

	it('keeps a failed change until retry succeeds', async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2);
		const states: string[] = [];
		const autosave = new QuantityAutosave([[5, 1]], save, (_id, state) => states.push(state));
		autosave.change(5, 2);
		await vi.advanceTimersByTimeAsync(3_000);
		expect(states.at(-1)).toBe('error');
		expect(autosave.hasUnsaved()).toBe(true);
		autosave.retry(5);
		await vi.advanceTimersByTimeAsync(0);
		expect(states.at(-1)).toBe('idle');
		expect(autosave.hasUnsaved()).toBe(false);
	});
});
