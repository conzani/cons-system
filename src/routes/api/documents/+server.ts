import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

function generateChecksum(fileBuffer: Buffer): string {
	return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function createActivityLog(documentId: bigint, userId: bigint, action: string, oldValue?: string, newValue?: string) {
	try {
		await prisma.documentActivityLog.create({
			data: {
				publicId: generatePublicId(),
				documentId,
				userId,
				action,
				oldValue,
				newValue,
				ipAddress: null, // TODO: Get from request
				device: null // TODO: Get from request
			}
		});
	} catch (error) {
		console.error('Error creating activity log:', error);
		// Don't throw error, activity log failure shouldn't break the main operation
	}
}

export async function GET({ url }: RequestEvent) {
	try {
		const folderId = url.searchParams.get('folderId');
		const documentTypeId = url.searchParams.get('documentTypeId');
		
		const where: any = { isDeleted: false };
		if (folderId) where.folderId = BigInt(folderId);
		if (documentTypeId) where.documentTypeId = BigInt(documentTypeId);

		const documents = await prisma.document.findMany({
			where,
			include: {
				documentType: true,
				folder: true,
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		});
		return json(serializeBigInt(documents));
	} catch (error) {
		console.error('Error fetching documents:', error);
		return json({ error: 'Failed to fetch documents' }, { status: 500 });
	}
}

	export async function POST({ request }: RequestEvent) {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const documentTypeId = formData.get('documentTypeId') as string;
		const folderId = formData.get('folderId') as string;
		const ownerId = formData.get('ownerId') as string;
		const status = formData.get('status') as string;
		const projectId = formData.get('projectId') as string;
		const siteId = formData.get('siteId') as string;
		const referenceNumber = formData.get('referenceNumber') as string;
		const revisionNumber = formData.get('revisionNumber') as string;
		const confidentiality = formData.get('confidentiality') as string;
		const expiryDate = formData.get('expiryDate') as string;
		const reviewDate = formData.get('reviewDate') as string;
		const retentionPeriod = formData.get('retentionPeriod') as string;
		const keywords = formData.get('keywords') as string;

		if (!file || !title || !ownerId) {
			return json({ error: 'File, title, and ownerId are required' }, { status: 400 });
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const checksum = generateChecksum(buffer);
		
		// Generate stored filename
		const fileExtension = file.name.split('.').pop();
		const storedName = `${crypto.randomUUID()}.${fileExtension}`;

		const data: any = {
			publicId: generatePublicId(),
			title,
			description: description || null,
			fileName: file.name,
			storedName,
			fileExtension: fileExtension || '',
			mimeType: file.type,
			fileSize: !isNaN(Number(file.size)) ? BigInt(file.size) : BigInt(0),
			checksum,
			version: 1,
			status: status || 'Draft',
			ownerId: !isNaN(Number(ownerId)) ? BigInt(ownerId) : BigInt(1)
		};

		if (documentTypeId && !isNaN(Number(documentTypeId))) data.documentTypeId = BigInt(documentTypeId);
		if (folderId && !isNaN(Number(folderId))) data.folderId = BigInt(folderId);
		if (projectId && !isNaN(Number(projectId))) data.projectId = BigInt(projectId);
		if (siteId && !isNaN(Number(siteId))) data.siteId = BigInt(siteId);
		if (referenceNumber) data.referenceNumber = referenceNumber;
		if (revisionNumber) data.revisionNumber = revisionNumber;
		if (confidentiality) data.confidentiality = confidentiality;
		if (expiryDate) data.expiryDate = new Date(expiryDate);
		if (reviewDate) data.reviewDate = new Date(reviewDate);
		if (retentionPeriod) data.retentionPeriod = retentionPeriod;
		if (keywords) data.keywords = keywords;

		const document = await prisma.document.create({
			data,
			include: {
				documentType: true,
				folder: true,
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				}
			}
		});

		// Create initial version
		await prisma.documentVersion.create({
			data: {
				documentId: document.id,
				versionNumber: 1,
				fileName: storedName,
				checksum,
				uploadedBy: BigInt(ownerId)
			}
		});

		// Save file to disk
		const uploadDir = join(process.cwd(), 'uploads', 'documents');
		await mkdir(uploadDir, { recursive: true });
		const filePath = join(uploadDir, storedName);
		await writeFile(filePath, buffer);

		// Update document with storage path
		await prisma.document.update({
			where: { id: document.id },
			data: { storagePath: `/uploads/documents/${storedName}` }
		});

		// Create activity log
		await createActivityLog(document.id, BigInt(ownerId), 'Document Created', undefined, JSON.stringify({ title, status: status || 'Draft' }));

		return json(serializeBigInt(document), { status: 201 });
	} catch (error) {
		console.error('Error creating document:', error);
		return json({ error: 'Failed to create document' }, { status: 500 });
	}
}
