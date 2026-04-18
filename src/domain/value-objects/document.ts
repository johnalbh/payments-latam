export const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'PP', 'TI'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type Document = {
  readonly type: DocumentType;
  readonly number: string;
};

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

// Provider-specific rules (length per type, checksum for NIT, etc.) live in each adapter.
// The domain only guarantees the shape is non-empty and within a sane length envelope.
const MAX_DOCUMENT_LENGTH = 20;

export function createDocument(type: DocumentType, number: string): Document {
  if (!isDocumentType(type)) {
    throw new RangeError(`Unsupported document type: ${String(type)}`);
  }
  const normalized = number.trim();
  if (normalized.length === 0) {
    throw new RangeError('Document.number cannot be empty');
  }
  if (normalized.length > MAX_DOCUMENT_LENGTH) {
    throw new RangeError(
      `Document.number too long (max ${MAX_DOCUMENT_LENGTH}): ${normalized.length}`,
    );
  }
  return { type, number: normalized };
}
