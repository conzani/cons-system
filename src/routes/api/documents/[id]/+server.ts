import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import {
	contentDisposition,
	extensionOf,
	isInlineSafe,
	validateUpload
} from '$lib/server/uploads';
import { createActivityLog, requestMeta } from '$lib/server/document-audit';
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

const documentInclude = {
	documentType: true,
	folder: true,
	owner: { select: { id: true, firstname: true, lastname: true } },
	versions: {
		include: {
			uploader: { select: { id: true, firstname: true, lastname: true } },
			approver: { select: { id: true, firstname: true, lastname: true } }
		},
		orderBy: { versionNumber: 'desc' }
	}
} satisfies Prisma.DocumentInclude;

function whereFor(idParam: string) {
	return /^\d+$/.test(idParam) ? { id: BigInt(idParam) } : { publicId: idParam };
}

function resolveStoredFile(storedName: string): string | null {
	const uploadRoot = resolve(process.cwd(), 'uploads', 'documents');
	const filePath = resolve(uploadRoot, storedName);
	if (filePath !== uploadRoot && !filePath.startsWith(uploadRoot + sep)) return null;
	return filePath;
}

export async function GET({ params, url, locals, request }: RequestEvent) {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}

		const document = await prisma.document.findUnique({
			where: whereFor(params.id),
			include: documentInclude
		});

		if (!document || document.isDeleted) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		const download = url.searchParams.get('download') === 'true';
		const view = url.searchParams.get('view') === 'true';
		const meta = requestMeta(request);

		if (download || view) {
			const filePath = resolveStoredFile(document.storedName);
			if (!filePath) {
				return json({ error: 'Invalid storage path' }, { status: 400 });
			}

			let fileBuffer: Buffer;
			try {
				fileBuffer = await readFile(filePath);
			} catch {
				return json({ error: 'Stored file is missing' }, { status: 404 });
			}

			await createActivityLog(
				document.id,
				user.id,
				download ? 'Document Downloaded' : 'Document Viewed',
				meta,
				undefined,
				document.fileName
			);

			const inline = view && isInlineSafe(document.mimeType);

			return new Response(new Uint8Array(fileBuffer), {
				headers: {
					'Content-Type': document.mimeType || 'application/octet-stream',
					'Content-Disposition': contentDisposition(
						inline ? 'inline' : 'attachment',
						document.fileName
					),
					'Content-Length': String(fileBuffer.length),
					'Cache-Control': 'private, no-store'
				}
			});
		}

		return json(serializeBigInt(document));
	} catch (error) {
		console.error('Error fetching document:', error);
		return json({ error: 'Failed to fetch document' }, { status: 500 });
	}
}

async function readUpdatePayload(request: Request) {
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('application/json')) {
		const body = await request.json();
		return {
			file: null as File | null,
			fields: body as Record<string, unknown>
		};
	}

	const formData = await request.formData();
	const file = formData.get('file');
	const fields: Record<string, unknown> = {};
	for (const key of [
		'title',
		'description',
		'status',
		'referenceNumber',
		'revisionNumber',
		'confidentiality',
		'expiryDate',
		'reviewDate',
		'retentionPeriod',
		'keywords',
		'documentTypeId',
		'folderId'
	]) {
		const value = formData.get(key);
		if (value !== null) fields[key] = value;
	}
	return { file: file instanceof File && file.size > 0 ? file : null, fields };
}

export async function PUT({ request, params, locals }: RequestEvent) {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}

		const existing = await prisma.document.findUnique({ where: whereFor(params.id) });
		if (!existing || existing.isDeleted) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		const { file, fields } = await readUpdatePayload(request);

		if (file) {
			const uploadError = validateUpload(file);
			if (uploadError) return json({ error: uploadError }, { status: 400 });
		}

		const data: any = {};
		const textFields = [
			'title',
			'description',
			'status',
			'referenceNumber',
			'revisionNumber',
			'confidentiality',
			'retentionPeriod',
			'keywords'
		];
		for (const key of textFields) {
			if (fields[key] !== undefined) {
				const value = typeof fields[key] === 'string' ? (fields[key] as string).trim() : null;
				if (key === 'title' && !value) {
					return json({ error: 'Title cannot be empty' }, { status: 400 });
				}
				data[key] = value && value.length > 0 ? value : null;
			}
		}

		for (const [key, column] of [
			['documentTypeId', 'documentTypeId'],
			['folderId', 'folderId']
		] as const) {
			if (fields[key] !== undefined) {
				const raw = String(fields[key] ?? '');
				data[column] = /^\d+$/.test(raw) ? BigInt(raw) : null;
			}
		}

		for (const [key, column] of [
			['expiryDate', 'expiryDate'],
			['reviewDate', 'reviewDate']
		] as const) {
			if (fields[key] !== undefined) {
				const raw = String(fields[key] ?? '');
				const parsed = raw ? new Date(raw) : null;
				data[column] = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
			}
		}

		if (file) {
			const buffer = Buffer.from(await file.arrayBuffer());
			const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
			const fileExtension = extensionOf(file.name);
			const storedName = `${crypto.randomUUID()}.${fileExtension}`;
			const nextVersion = existing.version + 1;

			const uploadDir = join(process.cwd(), 'uploads', 'documents');
			await mkdir(uploadDir, { recursive: true });
			await writeFile(join(uploadDir, storedName), buffer);

			data.fileName = file.name.slice(0, 255);
			data.storedName = storedName;
			data.fileExtension = fileExtension;
			data.mimeType = file.type || 'application/octet-stream';
			data.fileSize = BigInt(file.size);
			data.checksum = checksum;
			data.version = nextVersion;
			data.storagePath = `/uploads/documents/${storedName}`;

			await prisma.documentVersion.create({
				data: {
					documentId: existing.id,
					versionNumber: nextVersion,
					fileName: storedName,
					checksum,
					uploadedBy: user.id
				}
			});
		}

		const document = await prisma.document.update({
			where: { id: existing.id },
			data,
			include: documentInclude
		});

		await createActivityLog(
			existing.id,
			user.id,
			file ? 'File Updated' : data.status ? 'Status Changed' : 'Document Updated',
			requestMeta(request),
			undefined,
			JSON.stringify({ status: data.status, version: document.version })
		);

		return json(serializeBigInt(document));
	} catch (error) {
		console.error('Error updating document:', error);
		return json({ error: 'Failed to update document' }, { status: 500 });
	}
}

export async function DELETE({ params, locals, request }: RequestEvent) {
	const user = locals.user;
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		if (!params.id) {
			return json({ error: 'ID is required' }, { status: 400 });
		}

		const document = await prisma.document.findUnique({ where: whereFor(params.id) });
		if (!document || document.isDeleted) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		await prisma.document.update({
			where: { id: document.id },
			data: { isDeleted: true, deletedAt: new Date() }
		});

		await createActivityLog(
			document.id,
			user.id,
			'Document Deleted',
			requestMeta(request),
			undefined,
			document.title
		);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting document:', error);
		return json({ error: 'Failed to delete document' }, { status: 500 });
	}
}
