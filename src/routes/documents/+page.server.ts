import { prisma } from '$lib/db';

function serializeBigInt(obj: any): any {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj === 'bigint') return obj.toString();
	if (obj instanceof Date) return obj.toISOString();
	if (Array.isArray(obj)) return obj.map(serializeBigInt);
	if (typeof obj === 'object') {
		const newObj: any = {};
		for (const key in obj) {
			newObj[key] = serializeBigInt(obj[key]);
		}
		return newObj;
	}
	return obj;
}

export async function load() {
	try {
		const [folders, documents, documentTypes] = await Promise.all([
			prisma.documentFolder.findMany({
				where: { deletedAt: null },
				include: {
					parentFolder: true,
					creator: {
						select: {
							id: true,
							firstname: true,
							lastname: true
						}
					}
				},
				orderBy: { name: 'asc' }
			}),
			prisma.document.findMany({
				where: { isDeleted: false },
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
			}),
			prisma.documentType.findMany({
				where: { deletedAt: null },
				orderBy: { name: 'asc' }
			})
		]);
		
		return { 
			folders: serializeBigInt(folders), 
			documents: serializeBigInt(documents), 
			documentTypes: serializeBigInt(documentTypes) 
		};
	} catch (error) {
		console.error('Error loading documents:', error);
		return { folders: [], documents: [], documentTypes: [] };
	}
}
