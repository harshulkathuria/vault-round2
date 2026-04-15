import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { fileId, serverKeyPart } = await request.json();
    const userIp = request.headers.get('x-forwarded-for') || 'unknown';

    if (!fileId || !serverKeyPart) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check rate limit: 10 per day per IP
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentPrints = await prisma.printLink.count({
      where: {
        uploaderIp: userIp,
        createdAt: { gte: today }
      }
    });

    if (recentPrints >= 10) {
      return NextResponse.json({ error: 'Daily limit of 10 secure links reached for this IP' }, { status: 429 });
    }

    // Set expiration (4 hours from now)
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    // Create PrintLink
    const printLink = await prisma.printLink.create({
      data: {
        fileUrl: fileId,
        encryptionKey: serverKeyPart,
        expiresAt: expiresAt,
        isPrinted: false,
        uploaderIp: userIp,
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        linkId: printLink.id,
        action: 'created',
        ip: userIp,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      linkId: printLink.id
    });

  } catch (error: any) {
    console.error('Link Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
