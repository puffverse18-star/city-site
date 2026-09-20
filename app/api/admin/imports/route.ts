import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit
const ALLOWED_FILE_TYPES = ['csv', 'json'];

export async function GET(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_IMPORT_VIEW);
    if (!auth.authorized) {
      return auth.response;
    }

    const imports = canonicalStore.getImports();
    return NextResponse.json({ imports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_IMPORT_DRY_RUN);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { sourceCode, fileContent, fileType = 'csv', filename = 'flux_import.csv', isFullSnapshot } = body;

    // 1. Validation de présence
    if (!sourceCode || !fileContent) {
      return NextResponse.json(
        { error: 'sourceCode et fileContent sont requis.' },
        { status: 400 }
      );
    }

    // 2. Validation de type de fichier
    const normalizedFileType = String(fileType).toLowerCase().trim();
    if (!ALLOWED_FILE_TYPES.includes(normalizedFileType)) {
      return NextResponse.json(
        { error: `Format non supporté: "${fileType}". Formats autorisés: CSV, JSON.` },
        { status: 400 }
      );
    }

    // 3. Limite de taille stricte (Anti-DoS / Payload limit)
    const contentSizeBytes = Buffer.byteLength(String(fileContent), 'utf8');
    if (contentSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(contentSizeBytes / (1024 * 1024)).toFixed(2)} MB). La taille maximale autorisée est de 10 MB.` },
        { status: 413 }
      );
    }

    // 4. Assainissement du nom de fichier (Anti Path Traversal / Injection)
    const sanitizedFilename = String(filename)
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\.+/g, '')
      .trim() || 'import_sanitized.csv';

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    const importRecord = canonicalStore.createImportDryRun({
      sourceCode,
      fileContent,
      fileType: normalizedFileType as 'csv' | 'json',
      filename: sanitizedFilename,
      isFullSnapshot: Boolean(isFullSnapshot),
      adminUser,
    });

    return NextResponse.json(importRecord, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
