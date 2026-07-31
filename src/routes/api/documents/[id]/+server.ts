import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import type { RequestEvent } from '@sveltejs/kit';
import crypto from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
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

export async function GET({ params, url }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);
		const download = url.searchParams.get('download') === 'true';

		const document = await prisma.document.findUnique({
			where: { id },
			include: {
				documentType: true,
				folder: true,
				owner: {
					select: {
						id: true,
						firstname: true,
						lastname: true
					}
				},
				versions: {
					include: {
						uploader: {
							select: {
								id: true,
								firstname: true,
								lastname: true
							}
						},
						approver: {
							select: {
								id: true,
								firstname: true,
								lastname: true
							}
						}
					},
					orderBy: { versionNumber: 'desc' }
				}
			}
		});

		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// If download is requested, serve the file
		if (download) {
			if (!document.storagePath) {
				return json({ error: 'File not found' }, { status: 404 });
			}

			const filePath = join(process.cwd(), document.storagePath);
			const fileBuffer = await readFile(filePath);

			// Create activity log for download
			await createActivityLog(id, document.ownerId, 'Document Downloaded', undefined, document.fileName);

			return new Response(fileBuffer, {
				headers: {
					'Content-Type': document.mimeType || 'application/octet-stream',
					'Content-Disposition': `attachment; filename="${document.fileName}"`,
					'Content-Length': fileBuffer.length.toString()
				}
			});
		}

		// Create activity log for view
		await createActivityLog(id, document.ownerId, 'Document Viewed', undefined, document.title);

		return json(serializeBigInt(document));
	} catch (error) {
		console.error('Error fetching document:', error);
		return json({ error: 'Failed to fetch document' }, { status: 500 });
	}
}

export async function PUT({ request, params }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);
		const contentType = request.headers.get('content-type');
		
		let file: File | null = null;
		let title: string | null = null;
		let description: string | null = null;
		let documentTypeId: string | null = null;
		let folderId: string | null = null;
		let status: string | null = null;
		let referenceNumber: string | null = null;
		let revisionNumber: string | null = null;
		let confidentiality: string | null = null;
		let expiryDate: string | null = null;
		let reviewDate: string | null = null;
		let retentionPeriod: string | null = null;
		let keywords: string | null = null;

		// Handle both JSON and FormData
		if (contentType?.includes('application/json')) {
			const body = await request.json();
			file = body.file || null;
			title = body.title || null;
			description = body.description || null;
			documentTypeId = body.documentTypeId || null;
			folderId = body.folderId || null;
			status = body.status || null;
			referenceNumber = body.referenceNumber || null;
			revisionNumber = body.revisionNumber || null;
			confidentiality = body.confidentiality || null;
			expiryDate = body.expiryDate || null;
			reviewDate = body.reviewDate || null;
			retentionPeriod = body.retentionPeriod || null;
			keywords = body.keywords || null;
		} else {
			const formData = await request.formData();
			file = formData.get('file') as File;
			title = formData.get('title') as string;
			description = formData.get('description') as string;
			documentTypeId = formData.get('documentTypeId') as string;
			folderId = formData.get('folderId') as string;
			status = formData.get('status') as string;
			referenceNumber = formData.get('referenceNumber') as string;
			revisionNumber = formData.get('revisionNumber') as string;
			confidentiality = formData.get('confidentiality') as string;
			expiryDate = formData.get('expiryDate') as string;
			reviewDate = formData.get('reviewDate') as string;
			retentionPeriod = formData.get('retentionPeriod') as string;
			keywords = formData.get('keywords') as string;
		}

		const data: any = {};
		if (title) data.title = title;
		if (description !== undefined) data.description = description;
		if (documentTypeId !== undefined) data.documentTypeId = documentTypeId ? BigInt(documentTypeId) : null;
		if (folderId !== undefined) data.folderId = folderId ? BigInt(folderId) : null;
		if (status) data.status = status;
		if (referenceNumber !== undefined) data.referenceNumber = referenceNumber;
		if (revisionNumber !== undefined) data.revisionNumber = revisionNumber;
		if (confidentiality !== undefined) data.confidentiality = confidentiality;
		if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;
		if (reviewDate !== undefined) data.reviewDate = reviewDate ? new Date(reviewDate) : null;
		if (retentionPeriod !== undefined) data.retentionPeriod = retentionPeriod;
		if (keywords !== undefined) data.keywords = keywords;

		// If new file is uploaded, create new version
		if (file) {
			const bytes = await file.arrayBuffer();
			const buffer = Buffer.from(bytes);
			const checksum = generateChecksum(buffer);
			const fileExtension = file.name.split('.').pop();
			const storedName = `${crypto.randomUUID()}.${fileExtension}`;

			const currentDoc = await prisma.document.findUnique({ where: { id } });
			if (!currentDoc) {
				return json({ error: 'Document not found' }, { status: 404 });
			}

			data.fileName = file.name;
			data.storedName = storedName;
			data.fileExtension = fileExtension || '';
			data.mimeType = file.type;
			data.fileSize = BigInt(file.size);
			data.checksum = checksum;
			data.version = currentDoc.version + 1;
			data.storagePath = `/uploads/documents/${storedName}`;

			// Save new file to disk
			const uploadDir = join(process.cwd(), 'uploads', 'documents');
			await mkdir(uploadDir, { recursive: true });
			const filePath = join(uploadDir, storedName);
			await writeFile(filePath, buffer);

			// Create new version
			await prisma.documentVersion.create({
				data: {
					documentId: id,
					versionNumber: currentDoc.version + 1,
					fileName: storedName,
					checksum,
					uploadedBy: currentDoc.ownerId
				}
			});
		}

		const document = await prisma.document.update({
			where: { id },
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

		// Create activity log
		if (status) {
			await createActivityLog(id, document.ownerId, 'Status Changed', undefined, status);
		} else if (file) {
			await createActivityLog(id, document.ownerId, 'File Updated', undefined, `Version ${document.version}`);
		} else {
			await createActivityLog(id, document.ownerId, 'Document Updated', undefined, JSON.stringify(data));
		}

		return json(serializeBigInt(document));
	} catch (error) {
		console.error('Error updating document:', error);
		return json({ error: 'Failed to update document' }, { status: 500 });
	}
}

export async function DELETE({ params }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}
		
		const id = BigInt(params.id);

		const document = await prisma.document.findUnique({ where: { id } });
		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		await prisma.document.update({
			where: { id },
			data: { isDeleted: true, deletedAt: new Date() }
		});

		// Create activity log
		await createActivityLog(id, document.ownerId, 'Document Deleted', undefined, document.title);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting document:', error);
		return json({ error: 'Failed to delete document' }, { status: 500 });
	}
}
