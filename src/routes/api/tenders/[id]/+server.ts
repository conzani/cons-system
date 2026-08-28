import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import type { RequestEvent } from '@sveltejs/kit';

const prisma = new PrismaClient();

// GET single tender by ID
export async function GET({ params }: RequestEvent) {
	try {
		if (!params.id) {
			return json({ success: false, error: 'Tender ID required' }, { status: 400 });
		}

		// Try to find by numeric ID first, then by publicId
		let tender;
		try {
			tender = await prisma.tender.findUnique({
				where: { id: BigInt(params.id || '0') },
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
					documents: {
						where: { isDeleted: false },
						include: {
							documentType: true,
							owner: { select: { id: true, firstname: true, lastname: true } }
						},
						orderBy: { createdAt: 'desc' }
					},
					teamMembers: {
						include: {
							employee: true
						}
					},
					requirements: {
						include: {
							assignee: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							}
						}
					},
					communications: {
						include: {
							sender: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							},
							recipient: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							}
						},
						orderBy: {
							createdAt: 'desc'
						}
					},
					workflowStages: {
						include: {
							completedByUser: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							}
						},
						orderBy: {
							stageOrder: 'asc'
						}
					}
				}
			});
		} catch (e) {
			// If BigInt conversion fails, try publicId
			tender = await prisma.tender.findUnique({
				where: { publicId: params.id },
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
					documents: {
						where: { isDeleted: false },
						include: {
							documentType: true,
							owner: { select: { id: true, firstname: true, lastname: true } }
						},
						orderBy: { createdAt: 'desc' }
					},
					teamMembers: {
						include: {
							employee: true
						}
					},
					requirements: {
						include: {
							assignee: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							}
						}
					},
					communications: {
						include: {
							sender: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							},
							recipient: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							}
						},
						orderBy: {
							createdAt: 'desc'
						}
					},
					workflowStages: {
						include: {
							completedByUser: {
								select: {
									id: true,
									firstname: true,
									lastname: true
								}
							}
						},
						orderBy: {
							stageOrder: 'asc'
						}
					}
				}
			});
		}

		if (!tender) {
			return json({ success: false, error: 'Tender not found' }, { status: 404 });
		}

		if (tender.workflowStages.length === 0) {
			await prisma.tenderWorkflowStage.createMany({
				data: [
					{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Opportunity', stageOrder: 1, status: 'Pending' },
					{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Qualification', stageOrder: 2, status: 'Pending' },
					{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Bid/No-Bid', stageOrder: 3, status: 'Pending' },
					{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Preparation', stageOrder: 4, status: 'Pending' },
					{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Approval', stageOrder: 5, status: 'Pending' },
					{ publicId: crypto.randomUUID(), tenderId: tender.id, stageName: 'Submission', stageOrder: 6, status: 'Pending' }
				]
			});
			tender = {
				...tender,
				workflowStages: await prisma.tenderWorkflowStage.findMany({ where: { tenderId: tender.id }, orderBy: { stageOrder: 'asc' } })
			};
		}

		// Convert BigInt to String for JSON serialization
		const serializedTender = JSON.parse(JSON.stringify(tender, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		));

		return json({ success: true, data: serializedTender });
	} catch (error) {
		console.error('Error fetching tender:', error);
		return json({ success: false, error: 'Failed to fetch tender' }, { status: 500 });
	}
}

// PUT update tender
export async function PUT({ params, request }: RequestEvent) {
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
			status,
			progress,
			bidManagerId,
			projectId,
			siteId
		} = body;

		// Try to find by numeric ID first, then by publicId
		let tender;
		try {
			tender = await prisma.tender.update({
				where: { id: BigInt(params.id || '0') },
				data: {
					...(title && { title }),
					...(client && { client }),
					...(tenderNumber && { tenderNumber }),
					...(tenderType && { tenderType }),
					...(source && { source }),
					...(description && { description }),
					...(location && { location }),
					...(value && { value: BigInt(value) }),
					...(closingDate && { closingDate: new Date(closingDate) }),
					...(submissionDate && { submissionDate: new Date(submissionDate) }),
					...(status && { status }),
					...(progress !== undefined && { progress }),
					// Handle bidManagerId: if empty string or null, set to null; otherwise convert to BigInt
					bidManagerId: bidManagerId && bidManagerId.trim() !== '' ? BigInt(bidManagerId) : null,
					...(projectId && { projectId: BigInt(projectId) }),
					...(siteId && { siteId: BigInt(siteId) })
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
		} catch (e) {
			// If BigInt conversion fails, try publicId
			tender = await prisma.tender.update({
				where: { publicId: params.id },
				data: {
					...(title && { title }),
					...(client && { client }),
					...(tenderNumber && { tenderNumber }),
					...(tenderType && { tenderType }),
					...(source && { source }),
					...(description && { description }),
					...(location && { location }),
					...(value && { value: BigInt(value) }),
					...(closingDate && { closingDate: new Date(closingDate) }),
					...(submissionDate && { submissionDate: new Date(submissionDate) }),
					...(status && { status }),
					...(progress !== undefined && { progress }),
					// Handle bidManagerId: if empty string or null, set to null; otherwise convert to BigInt
					bidManagerId: bidManagerId && bidManagerId.trim() !== '' ? BigInt(bidManagerId) : null,
					...(projectId && { projectId: BigInt(projectId) }),
					...(siteId && { siteId: BigInt(siteId) })
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
		}

		const serializedTender = JSON.parse(JSON.stringify(tender, (key, value) =>
			typeof value === 'bigint' ? value.toString() : value
		));

		return json({ success: true, data: serializedTender });
	} catch (error) {
		console.error('Error updating tender:', error);
		return json({ success: false, error: 'Failed to update tender' }, { status: 500 });
	}
}

// DELETE tender
export async function DELETE({ params }: RequestEvent) {
	try {
		await prisma.tender.delete({
			where: { publicId: params.id }
		});

		return json({ success: true, message: 'Tender deleted successfully' });
	} catch (error) {
		console.error('Error deleting tender:', error);
		return json({ success: false, error: 'Failed to delete tender' }, { status: 500 });
	}
}
