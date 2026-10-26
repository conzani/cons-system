export type EvidenceUploadOptions = {
	title?: string;
	projectId?: string;
	siteId?: string;
};

/** Upload a file from the user's computer and return the created document id. */
export async function uploadEvidence(
	file: File,
	options: EvidenceUploadOptions = {}
): Promise<{ id: string; title: string }> {
	const formData = new FormData();
	formData.append('file', file);
	formData.append('title', options.title ?? file.name);
	if (options.projectId) formData.append('projectId', options.projectId);
	if (options.siteId) formData.append('siteId', options.siteId);

	const response = await fetch('/api/evidence', { method: 'POST', body: formData });
	const result = await response.json().catch(() => ({}));
	if (!response.ok || !result.success) {
		throw new Error(result.error ?? 'Upload failed');
	}
	return result.data;
}
