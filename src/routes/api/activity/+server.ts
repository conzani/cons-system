import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getTimeline } from '$lib/server/activity';
import { serializeBigInt } from '$lib/server/projects';

const READ_PERMISSIONS: Record<string, string> = {
	PurchaseOrder: 'view_procurement',
	Invoice: 'view_finance',
	Bill: 'view_finance',
	Payment: 'view_finance',
	SiteRequest: 'view_sites',
	Document: 'view_documents'
};

export async function GET({ url, locals }: RequestEvent) {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const entityType = url.searchParams.get('entityType') ?? '';
	const entityIdRaw = url.searchParams.get('entityId') ?? '';
	if (!entityType || !/^\d+$/.test(entityIdRaw)) {
		return json({ error: 'entityType and numeric entityId are required' }, { status: 400 });
	}

	const permission = READ_PERMISSIONS[entityType];
	if (permission && !user.permissions.includes(permission)) {
		return json({ error: `Missing permission: ${permission}` }, { status: 403 });
	}

	const timeline = await getTimeline(entityType, BigInt(entityIdRaw));
	return json({ success: true, data: serializeBigInt(timeline) });
}
