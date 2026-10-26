/** Generates a readable, collision-checked document number such as RFI/2026/104233. */
export async function uniqueDocumentNumber(
	prefix: string,
	exists: (candidate: string) => Promise<boolean>
): Promise<string> {
	const year = new Date().getFullYear();
	for (let attempt = 0; attempt < 20; attempt += 1) {
		const serial = String(Math.floor(Math.random() * 900000) + 100000);
		const candidate = `${prefix}/${year}/${serial}`;
		if (!(await exists(candidate))) return candidate;
	}
	throw new Error(`Unable to allocate a unique ${prefix} number`);
}
