import { prisma } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { generatePublicId } from '$lib/utils';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extensionOf, validateUpload } from '$lib/server/uploads';

/**
 * Evidence upload for operational records (fuel receipts, GRNs, photo evidence).
 * Unlike the general DMS upload this is available to any signed-in operational user,
 * because attaching proof is part of the record they are allowed to create.
 */
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
		if (uploadError) return json({ error: uploadError }, { status: 400 });

		const title = String(formData.get('title') ?? '').trim() || file.name;
		const projectId = String(formData.get('projectId') ?? '');
		const siteId = String(formData.get('siteId') ?? '');
		const extension = extensionOf(file.name);
		const storedName = `${crypto.randomUUID()}.${extension}`;
		const buffer = Buffer.from(await file.arrayBuffer());
		const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

		const document = await prisma.document.create({
			data: {
				publicId: generatePublicId(),
				title: title.slice(0, 191),
				fileName: file.name.slice(0, 255),
				storedName,
				fileExtension: extension,
				mimeType: file.type || 'application/octet-stream',
				fileSize: BigInt(file.size),
				checksum,
				version: 1,
				status: 'Evidence',
				confidentiality: 'Internal',
				ownerId: user.id,
				projectId: /^\d+$/.test(projectId) ? BigInt(projectId) : null,
				siteId: /^\d+$/.test(siteId) ? BigInt(siteId) : null
			}
		});

		await prisma.documentVersion.create({
			data: {
				documentId: document.id,
				versionNumber: 1,
				fileName: storedName,
				checksum,
				uploadedBy: user.id
			}
		});

		const uploadDir = join(process.cwd(), 'uploads', 'documents');
		await mkdir(uploadDir, { recursive: true });
		await writeFile(join(uploadDir, storedName), buffer);
		await prisma.document.update({
			where: { id: document.id },
			data: { storagePath: `/uploads/documents/${storedName}` }
		});

		return json(
			{ success: true, data: { id: document.id.toString(), title: document.title } },
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error uploading evidence:', error);
		return json({ error: 'Failed to upload evidence' }, { status: 500 });
	}
}
