import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
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

export async function GET() {
	try {
		const company = await prisma.company.findFirst();
		return json(serializeBigInt(company));
	} catch (error) {
		console.error('Error fetching company:', error);
		return json({ error: 'Failed to fetch company' }, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const { name, registrationNumber, taxId, address, phone, email, website, logo } = await request.json();

		if (!name) {
			return json({ error: 'Company name is required' }, { status: 400 });
		}

		const company = await prisma.company.create({
			data: {
				publicId: generatePublicId(),
				name,
				registrationNumber: registrationNumber || null,
				taxId: taxId || null,
				address: address || null,
				phone: phone || null,
				email: email || null,
				website: website || null,
				logo: logo || null,
				status: 'active'
			}
		});

		return json(serializeBigInt(company), { status: 201 });
	} catch (error) {
		console.error('Error creating company:', error);
		return json({ error: 'Failed to create company' }, { status: 500 });
	}
}
