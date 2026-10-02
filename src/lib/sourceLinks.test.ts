import { describe, expect, it } from 'vitest';
import { getCoolStuffIncCardUrl } from './sourceLinks';

describe('source links', () => {
	it('links an order snapshot to its CoolStuffInc card page', () => {
		expect(getCoolStuffIncCardUrl('Dark Magician - Duelist Pack Yugi')).toBe(
			'https://www.coolstuffinc.com/p/YuGiOh/Dark%20Magician',
		);
	});

	it('encodes card punctuation safely', () => {
		expect(getCoolStuffIncCardUrl('S:P Little Knight - 25th Anniversary Tin')).toBe(
			'https://www.coolstuffinc.com/p/YuGiOh/S%3AP%20Little%20Knight',
		);
	});
});
