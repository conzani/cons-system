import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { approvalPermission, decideApproval, requestApproval } from '$lib/server/approvals';
import { serializeBigInt } from '$lib/server/projects';

const toBigInt = (value: unknown) => {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
	if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
	return null;
};

export async function GET({ url }: RequestEvent) {
	try {
		const status = url.searchParams.get('status') ?? 'Pending';
		const approvals = await prisma.approval.findMany({
			where: { status },
			orderBy: { requestedAt: 'desc' },
			take: 200
		});
		return json({ success: true, data: serializeBigInt(approvals) });
	} catch (error) {
		console.error('Error loading approvals:', error);
		return json({ success: false, error: 'Failed to load approvals' }, { status: 500 });
	}
}

export async function POST({ request, locals }: RequestEvent) {
	const user = locals.user;
	if (!user) return json({ success: false, error: 'Authentication required' }, { status: 401 });

	try {
		const body = await request.json();
		const entityType = String(body.entityType ?? '');
		const entityId = toBigInt(body.entityId);
		const action = body.action === 'reject' ? 'reject' : body.action === 'approve' ? 'approve' : null;

		if (!entityType || !entityId) {
			return json({ success: false, error: 'Entity type and id are required' }, { status: 400 });
		}

		if (action) {
			const permission = approvalPermission(entityType);
			if (!user.permissions.includes(permission)) {
				return json(
					{ success: false, error: `Missing permission: ${permission}` },
					{ status: 403 }
				);
			}
			const approval = await decideApproval({
				entityType,
				entityId,
				action,
				decidedBy: user.id,
				notes: body.notes ? String(body.notes) : null
			});
			return json({ success: true, data: serializeBigInt(approval) });
		}

		const approval = await requestApproval(entityType, entityId, user.id);
		return json({ success: true, data: serializeBigInt(approval) }, { status: 201 });
	} catch (error) {
		console.error('Error processing approval:', error);
		return json(
			{ success: false, error: error instanceof Error ? error.message : 'Approval failed' },
			{ status: 400 }
		);
	}
}
