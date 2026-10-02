const COOLSTUFFINC_YUGIOH_PRODUCT_BASE = 'https://www.coolstuffinc.com/p/YuGiOh/';

export function getCoolStuffIncCardUrl(snapshotName: string): string {
	const [cardName] = snapshotName.split(' - ', 1);
	return `${COOLSTUFFINC_YUGIOH_PRODUCT_BASE}${encodeURIComponent(cardName.trim())}`;
}
