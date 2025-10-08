import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackItems } from '@/lib/cosmos';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const feedbackItems = await getFeedbackItems(limit);
    
    return NextResponse.json({
      success: true,
      data: feedbackItems,
      count: feedbackItems.length
    });
  } catch (error) {
    console.error('Error fetching feedback items:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feedback items',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
