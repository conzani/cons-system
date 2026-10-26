import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import crypto from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { extensionOf, validateUpload } from '$lib/server/uploads';
import { createActivityLog, requestMeta } from '$lib/server/document-audit';

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

function optionalBigInt(value: FormDataEntryValue | null): bigint | null {
	if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
	return BigInt(value);
}

function optionalText(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function optionalDate(value: FormDataEntryValue | null): Date | null {
	const text = optionalText(value);
	if (!text) return null;
	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET({ url }: RequestEvent) {
	try {
		const folderId = url.searchParams.get('folderId');
		const documentTypeId = url.searchParams.get('documentTypeId');
		const employeeId = url.searchParams.get('employeeId');
		const tenderId = url.searchParams.get('tenderId');
		const siteId = url.searchParams.get('siteId');
		const projectId = url.searchParams.get('projectId');
		const isTemplate = url.searchParams.get('isTemplate');

		const where: any = { isDeleted: false };
		if (folderId) where.folderId = BigInt(folderId);
		if (documentTypeId) where.documentTypeId = BigInt(documentTypeId);
		if (employeeId) where.employeeId = BigInt(employeeId);
		if (tenderId) where.tenderId = BigInt(tenderId);
		if (siteId) where.siteId = BigInt(siteId);
		if (projectId) where.projectId = BigInt(projectId);
		if (isTemplate === 'true') where.isTemplate = true;

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

export async function POST({ request, locals }: RequestEvent) {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		const formData = await request.formData();

		const file = formData.get('file');
		if (!(file instanceof File)) {
			return json({ error: 'A file is required' }, { status: 400 });
		}

		const uploadError = validateUpload(file);
		if (uploadError) {
			return json({ error: uploadError }, { status: 400 });
		}

		const title = optionalText(formData.get('title'));
		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		// The uploader always comes from the verified session, never from the browser.
		const ownerId = user.id;

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

		const fileExtension = extensionOf(file.name);
		const storedName = `${crypto.randomUUID()}.${fileExtension}`;

		const data: any = {
			publicId: generatePublicId(),
			title,
			description: optionalText(formData.get('description')),
			fileName: file.name.slice(0, 255),
			storedName,
			fileExtension,
			mimeType: file.type || 'application/octet-stream',
			fileSize: BigInt(file.size),
			checksum,
			version: 1,
			status: optionalText(formData.get('status')) ?? 'Draft',
			ownerId,
			isTemplate: formData.get('isTemplate') === 'true'
		};

		const documentTypeId = optionalBigInt(formData.get('documentTypeId'));
		const folderId = optionalBigInt(formData.get('folderId'));
		const projectId = optionalBigInt(formData.get('projectId'));
		const siteId = optionalBigInt(formData.get('siteId'));
		const tenderId = optionalBigInt(formData.get('tenderId'));
		const employeeId = optionalBigInt(formData.get('employeeId'));

		if (documentTypeId) data.documentTypeId = documentTypeId;
		if (folderId) data.folderId = folderId;
		if (projectId) data.projectId = projectId;
		if (siteId) data.siteId = siteId;
		if (tenderId) data.tenderId = tenderId;
		if (employeeId) data.employeeId = employeeId;

		const referenceNumber = optionalText(formData.get('referenceNumber'));
		const revisionNumber = optionalText(formData.get('revisionNumber'));
		const confidentiality = optionalText(formData.get('confidentiality'));
		const retentionPeriod = optionalText(formData.get('retentionPeriod'));
		const keywords = optionalText(formData.get('keywords'));

		if (referenceNumber) data.referenceNumber = referenceNumber;
		if (revisionNumber) data.revisionNumber = revisionNumber;
		if (confidentiality) data.confidentiality = confidentiality;
		if (retentionPeriod) data.retentionPeriod = retentionPeriod;
		if (keywords) data.keywords = keywords;

		const expiryDate = optionalDate(formData.get('expiryDate'));
		const reviewDate = optionalDate(formData.get('reviewDate'));
		if (expiryDate) data.expiryDate = expiryDate;
		if (reviewDate) data.reviewDate = reviewDate;

		const document = await prisma.document.create({
			data,
			include: {
				documentType: true,
				folder: true,
				owner: { select: { id: true, firstname: true, lastname: true } }
			}
		});

		await prisma.documentVersion.create({
			data: {
				documentId: document.id,
				versionNumber: 1,
				fileName: storedName,
				checksum,
				uploadedBy: ownerId
			}
		});

		const uploadDir = join(process.cwd(), 'uploads', 'documents');
		await mkdir(uploadDir, { recursive: true });
		await writeFile(join(uploadDir, storedName), buffer);

		await prisma.document.update({
			where: { id: document.id },
			data: { storagePath: `/uploads/documents/${storedName}` }
		});

		await createActivityLog(
			document.id,
			ownerId,
			'Document Created',
			requestMeta(request),
			undefined,
			JSON.stringify({ title, status: data.status })
		);

		return json(serializeBigInt(document), { status: 201 });
	} catch (error) {
		console.error('Error creating document:', error);
		return json({ error: 'Failed to create document' }, { status: 500 });
	}
}
