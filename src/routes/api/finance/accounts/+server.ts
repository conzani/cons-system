import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import { accountBalanceMap, postJournalEntry } from '$lib/server/finance';
import { serializeBigInt } from '$lib/server/projects';

export async function GET() {
	try {
		const [accounts, balances] = await Promise.all([
			prisma.account.findMany({ orderBy: { code: 'asc' } }),
			accountBalanceMap()
		]);

		const data = accounts.map((account) => ({
			...account,
			balance: balances.get(account.code) ?? 0
		}));

		return json({ success: true, data: serializeBigInt(data) });
	} catch (error) {
		console.error('Error fetching accounts:', error);
		return json({ success: false, error: 'Failed to fetch accounts' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const code = String(body.code ?? '').trim();
		const name = String(body.name ?? '').trim();
		const type = String(body.type ?? '').trim();

		if (!code || !name || !['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].includes(type)) {
			return json(
				{ success: false, error: 'Code, name and a valid account type are required' },
				{ status: 400 }
			);
		}

		const existing = await prisma.account.findUnique({ where: { code } });
		if (existing) {
			return json({ success: false, error: 'An account with this code already exists' }, { status: 409 });
		}

		const account = await prisma.account.create({
			data: {
				publicId: generatePublicId(),
				code,
				name,
				type,
				description: body.description ? String(body.description) : null
			}
		});

		return json({ success: true, data: serializeBigInt(account) }, { status: 201 });
	} catch (error) {
		console.error('Error creating account:', error);
		return json({ success: false, error: 'Failed to create account' }, { status: 500 });
	}
}
