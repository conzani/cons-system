import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { postPayrollToFinance } from '$lib/server/finance';

/**
 * Posts all approved or paid payroll records that have not reached the ledger yet.
 * Safe to run repeatedly; already-posted records are skipped.
 */
export async function POST({ locals }: RequestEvent) {
	try {
		const records = await prisma.payroll.findMany({
			where: { deletedAt: null, status: { in: ['Approved', 'Paid'] } },
			select: { id: true }
		});

		let posted = 0;
		const failures: string[] = [];

		for (const record of records) {
			try {
				const entry = await postPayrollToFinance(record.id, locals.user?.id);
				if (entry) posted += 1;
			} catch (error) {
				failures.push(`Payroll ${record.id}: ${(error as Error).message}`);
			}
		}

		return json({ success: true, posted, checked: records.length, failures });
	} catch (error) {
		console.error('Error posting payroll batch:', error);
		return json({ success: false, error: 'Failed to post payroll' }, { status: 500 });
	}
}
