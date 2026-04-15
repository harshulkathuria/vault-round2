import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request, context: { params: Promise<{ linkId: string }> }) {
  try {
    const { linkId } = await context.params;
    
    // 1. Transactionally lock the link as printed
    const printLink = await prisma.printLink.update({
      where: { id: linkId },
      data: { isPrinted: true, printedAt: new Date() }
    });

    // 2. Destruct the File
    if (printLink.fileUrl.startsWith('supabase://')) {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supaRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supaUrl && supaRole) {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(supaUrl, supaRole);
        const actualPath = printLink.fileUrl.replace('supabase://', '');
        await supabase.storage.from('secure-documents').remove([actualPath]);
      }
    } else {
      // Local fallback
      const actualFileId = printLink.fileUrl.replace('local://', '');
      const filePath = join(process.cwd(), 'tmp_uploads', actualFileId);
      try {
        await unlink(filePath);
      } catch (e) {
        console.log("Could not clear local file (might already be deleted):", e);
      }
    }

    // 4. Log destruction
    await prisma.auditLog.create({
      data: {
        linkId: printLink.id,
        action: 'printed_and_deleted',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({ success: true, message: 'Document permanently destroyed' });

  } catch (error: any) {
    console.error('Destruct Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
