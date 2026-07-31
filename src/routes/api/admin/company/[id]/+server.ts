import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

function serializeBigInt(obj: any): any {
	if (typeof obj === 'bigint') {
		return obj.toString();
	}
	if (Array.isArray(obj)) {
		return obj.map(serializeBigInt);
	}
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(
			Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
		);
	}
	return obj;
}

export async function PUT({ request, params }: RequestEvent) {
	try {
		const { name, registrationNumber, taxId, address, phone, email, website, logo } = await request.json();
		
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);

		if (!name) {
			return json({ error: 'Company name is required' }, { status: 400 });
		}

		const company = await prisma.company.update({
			where: { id },
			data: {
				name,
				registrationNumber: registrationNumber || null,
				taxId: taxId || null,
				address: address || null,
				phone: phone || null,
				email: email || null,
				website: website || null,
				logo: logo || null
			}
		});

		return json(serializeBigInt(company));
	} catch (error) {
		console.error('Error updating company:', error);
		return json({ error: 'Failed to update company' }, { status: 500 });
	}
}
