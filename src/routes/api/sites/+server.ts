import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import { generatePublicId } from '$lib/utils';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export async function GET({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const publicId = url.searchParams.get('publicId');

		if (id) {
			const site = await prisma.site.findUnique({
				where: { id: BigInt(id) },
				include: {
					tenders: { orderBy: { createdAt: 'desc' } },
					documents: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } }
				}
			});
			if (!site) return json({ error: 'Site not found' }, { status: 404 });
			return json(serializeBigInt(site));
		}

		if (publicId) {
			const site = await prisma.site.findUnique({
				where: { publicId },
				include: {
					tenders: { orderBy: { createdAt: 'desc' } },
					documents: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } }
				}
			});
			if (!site) return json({ error: 'Site not found' }, { status: 404 });
			return json(serializeBigInt(site));
		}

		const sites = await prisma.site.findMany({
			where: { deletedAt: null },
			include: {
				tenders: { orderBy: { createdAt: 'desc' } },
				documents: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } }
			},
			orderBy: { createdAt: 'desc' }
		});
		return json(serializeBigInt(sites));
	} catch (error) {
		console.error('Error fetching sites:', error);
		return json({ error: 'Failed to fetch sites' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			name,
			location,
			client,
			status,
			startDate,
			endDate,
			progress,
			siteManagerId,
			value,
			projectType,
			description,
			tenderId
		} = body;

		if (!name || !location || !client) {
			return json({ error: 'Site name, location and client are required' }, { status: 400 });
		}

		const siteNumber = body.siteNumber || `SITE/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 90000) + 10000)}`;

		const site = await prisma.site.create({
			data: {
				publicId: generatePublicId(),
				siteNumber,
				name,
				location,
				client,
				status: status || 'Active',
				startDate: startDate ? new Date(startDate) : null,
				endDate: endDate ? new Date(endDate) : null,
				progress: Number(progress) || 0,
				siteManagerId: siteManagerId ? BigInt(siteManagerId) : null,
				value: value ? BigInt(value) : null,
				projectType: projectType || null,
				description: description || null
			}
		});

		if (tenderId) {
			await prisma.tender.update({
				where: { id: BigInt(tenderId) },
				data: {
					siteId: site.id,
					projectId: body.projectId ? BigInt(body.projectId) : undefined
				}
			});
		}

		const createdSite = await prisma.site.findUnique({
			where: { id: site.id },
			include: { tenders: true, documents: true }
		});

		return json({ success: true, data: serializeBigInt(createdSite) }, { status: 201 });
	} catch (error) {
		console.error('Error creating site:', error);
		return json({ error: 'Failed to create site' }, { status: 500 });
	}
}
