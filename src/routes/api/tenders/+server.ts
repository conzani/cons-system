import { json } from '@sveltejs/kit';
import { Prisma, PrismaClient } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// GET all tenders
export async function GET({ url }: RequestEvent) {
	try {
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || '';
		const client = url.searchParams.get('client') || '';
		const bidManager = url.searchParams.get('bidManager') || '';
		const tenderType = url.searchParams.get('tenderType') || '';

		const where: any = {};

		if (search) {
			where.OR = [
				{ title: { contains: search } },
				{ client: { contains: search } },
				{ tenderNumber: { contains: search } }
			];
		}

		if (status) {
			where.status = status;
		}

		if (client) {
			where.client = { contains: client };
		}

		if (bidManager) {
			where.bidManager = {
				lastname: { contains: bidManager }
			};
		}

		if (tenderType) {
			where.tenderType = tenderType;
		}

		const tenders = await prisma.tender.findMany({
			where,
			include: {
				bidManager: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						email: true
					}
				},
				project: true,
				site: true,
				workflowStages: {
					orderBy: {
						stageOrder: 'asc'
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		// Convert BigInt to String for JSON serialization
		const serializedTenders = JSON.parse(JSON.stringify(tenders, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		));

		return json({ success: true, data: serializedTenders });
	} catch (error) {
		console.error('Error fetching tenders:', error);
		return json({ success: false, error: 'Failed to fetch tenders' }, { status: 500 });
	}
}

// POST create new tender
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const {
			title,
			client,
			tenderNumber,
			tenderType,
			source,
			description,
			location,
			value,
			closingDate,
			submissionDate,
			bidManagerId,
			projectId,
			siteId
		} = body;

		if (!title || !client || !closingDate) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		if (tenderNumber) {
			const existingTender = await prisma.tender.findUnique({ where: { tenderNumber } });
			if (existingTender) {
				return json({ success: false, error: 'Tender number already exists. Enter a unique tender number.' }, { status: 409 });
			}
		}

		// Generate unique tender number if not provided
		let generatedTenderNumber = tenderNumber;
		if (!generatedTenderNumber) {
			let isUnique = false;
			let attempts = 0;
			while (!isUnique && attempts < 10) {
				const randomNum = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
				generatedTenderNumber = `TEN/${new Date().getFullYear()}/${randomNum}`;
				
				// Check if this number already exists
				const existing = await prisma.tender.findUnique({
					where: { tenderNumber: generatedTenderNumber }
				});
				
				if (!existing) {
					isUnique = true;
				}
				attempts++;
			}
			
			if (!isUnique) {
				return json({ success: false, error: 'Failed to generate unique tender number' }, { status: 500 });
			}
		}

		const tender = await prisma.tender.create({
			data: {
				publicId: crypto.randomUUID(),
				tenderNumber: generatedTenderNumber,
				title,
				client,
				tenderType,
				source,
				description,
				location,
				value: value ? BigInt(value) : null,
				closingDate: new Date(closingDate),
				submissionDate: submissionDate ? new Date(submissionDate) : null,
				bidManagerId: bidManagerId ? BigInt(bidManagerId) : null,
				projectId: projectId ? BigInt(projectId) : null,
				siteId: siteId ? BigInt(siteId) : null,
				status: 'New',
				progress: 0,
				workflowStages: {
					create: [
						{ publicId: crypto.randomUUID(), stageName: 'Opportunity', stageOrder: 1, status: 'Pending' },
						{ publicId: crypto.randomUUID(), stageName: 'Qualification', stageOrder: 2, status: 'Pending' },
						{ publicId: crypto.randomUUID(), stageName: 'Bid/No-Bid', stageOrder: 3, status: 'Pending' },
						{ publicId: crypto.randomUUID(), stageName: 'Preparation', stageOrder: 4, status: 'Pending' },
						{ publicId: crypto.randomUUID(), stageName: 'Approval', stageOrder: 5, status: 'Pending' },
						{ publicId: crypto.randomUUID(), stageName: 'Submission', stageOrder: 6, status: 'Pending' }
					]
				}
			},
			include: {
				bidManager: {
					select: {
						id: true,
						firstname: true,
						lastname: true,
						email: true
					}
				}
			}
		});

		// Convert BigInt to String for JSON serialization
		const serializedTender = JSON.parse(JSON.stringify(tender, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		));

		return json({ success: true, data: serializedTender }, { status: 201 });
	} catch (error) {
		console.error('Error creating tender:', error);
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			return json({ success: false, error: 'Tender number already exists. Enter a unique tender number.' }, { status: 409 });
		}
		return json({ success: false, error: 'Failed to create tender' }, { status: 500 });
	}
}
