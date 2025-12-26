// One-time setup endpoint to initialize database
// DELETE THIS FILE AFTER FIRST SUCCESSFUL RUN
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET(request: NextRequest) {
  // Verify secret to prevent unauthorized access
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run prisma db push
    const output = execSync('npx prisma db push --accept-data-loss', {
      encoding: 'utf-8',
      timeout: 120000,
      env: process.env as NodeJS.ProcessEnv,
    })

    return NextResponse.json({
      success: true,
      message: 'Database schema pushed successfully',
      output,
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
