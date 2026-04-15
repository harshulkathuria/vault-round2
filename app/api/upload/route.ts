import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const iv = formData.get('iv') as string; // base64 encoded IV
    
    if (!file || !iv) {
      return NextResponse.json({ error: 'Missing file or IV payload' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileId = uuidv4();
    
    // Check if Supabase Storage environment variables are active
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let storagePath = '';

    if (supaUrl && supaRole) {
      // Supabase Storage Implementation
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supaUrl, supaRole);
      
      const { data, error } = await supabase.storage
        .from('secure-documents')
        .upload(`${fileId}.enc`, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: false
        });
        
      if (error) {
        console.error("Supabase storage error:", error);
        throw new Error("Failed to store file in Supabase");
      }
      storagePath = `supabase://${data.path}`;
    } else {
      // Local fallback for dev testing
      const tmpDir = join(process.cwd(), 'tmp_uploads');
      try { await mkdir(tmpDir, { recursive: true }); } catch (e) {}
      
      const filePath = join(tmpDir, `${fileId}.enc`);
      await writeFile(filePath, fileBuffer);
      storagePath = `local://${fileId}.enc`;
    }

    return NextResponse.json({ 
      success: true, 
      fileId, 
      storagePath,
      iv 
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
