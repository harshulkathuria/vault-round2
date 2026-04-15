import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: Request, { params }: { params: { linkId: string } }) {
  try {
    const linkId = params.linkId;
    
    // 1. Validate Link
    const printLink = await prisma.printLink.findUnique({ where: { id: linkId } });
    if (!printLink) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    
    if (printLink.isPrinted) {
      return NextResponse.json({ error: 'This document has already been printed and destroyed.' }, { status: 410 });
    }
    
    if (new Date() > printLink.expiresAt) {
      return NextResponse.json({ error: 'This secure link has expired.' }, { status: 410 });
    }

    // 2. Fetch Encrypted Payload
    let fileBuffer: Buffer | null = null;
    
    if (printLink.fileUrl.startsWith('supabase://')) {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supaRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if(supaUrl && supaRole) {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supaUrl, supaRole);
        const actualPath = printLink.fileUrl.replace('supabase://', '');
        const { data, error } = await supabase.storage.from('secure-documents').download(actualPath);
        if(data) {
          fileBuffer = Buffer.from(await data.arrayBuffer());
        }
      }
    } else {
      // Local fallback
      const actualFileId = printLink.fileUrl.replace('local://', '');
      const filePath = join(process.cwd(), 'tmp_uploads', actualFileId);
      fileBuffer = await readFile(filePath);
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Encrypted document not found on storage' }, { status: 404 });
    }

    // Arraybuffer as base64 for easy transport (since size is usually < 2MB for ID cards)
    const base64Data = fileBuffer.toString('base64');

    // 3. Log access
    await prisma.auditLog.create({
      data: {
        linkId: printLink.id,
        action: 'accessed',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      serverKeyPart: printLink.encryptionKey,
      encryptedDocument: base64Data
    });

  } catch (error: any) {
    console.error('Verify Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
