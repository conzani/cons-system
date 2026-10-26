import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { postJournalEntry } from '$lib/server/finance';
import { serializeBigInt } from '$lib/server/projects';

const toBigInt = (value: unknown) => {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
	if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
	return null;
};

export async function GET({ url }: RequestEvent) {
	try {
		const projectId = url.searchParams.get('projectId');
		const sourceType = url.searchParams.get('sourceType');
		const where: any = { status: { not: 'Void' } };
		if (sourceType) where.sourceType = sourceType;
		if (projectId) where.lines = { some: { projectId: BigInt(projectId) } };

		const entries = await prisma.journalEntry.findMany({
			where,
			include: { lines: { include: { account: true } } },
			orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
			take: 200
		});

		return json({ success: true, data: serializeBigInt(entries) });
	} catch (error) {
		console.error('Error fetching journal:', error);
		return json({ success: false, error: 'Failed to fetch journal' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent) {
	try {
		const body = await request.json();
		const description = String(body.description ?? '').trim();
		const rawLines = Array.isArray(body.lines) ? body.lines : [];

		if (!description || rawLines.length < 2) {
			return json(
				{ success: false, error: 'A description and at least two journal lines are required' },
				{ status: 400 }
			);
		}

		const lines = rawLines.map((line: any) => ({
			accountCode: String(line.accountCode ?? ''),
			debit: Number(line.debit ?? 0),
			credit: Number(line.credit ?? 0),
			description: line.description ? String(line.description) : undefined,
			projectId: toBigInt(line.projectId),
			siteId: toBigInt(line.siteId)
		}));

		if (lines.some((line: any) => !line.accountCode)) {
			return json({ success: false, error: 'Each line needs an account' }, { status: 400 });
		}

		const entry = await postJournalEntry({
			entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
			description,
			sourceType: 'Manual',
			createdBy: locals.user?.id,
			lines
		});

		return json({ success: true, data: serializeBigInt(entry) }, { status: 201 });
	} catch (error) {
		console.error('Error posting journal:', error);
		return json(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to post journal' },
			{ status: 400 }
		);
	}
}
