import { NextRequest, NextResponse } from 'next/server';
import { initDB, getUserCategories, createCategory, deleteCategory } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { defaultCategories } from '@/utils/expense-utils';

export async function GET(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userCategories = await getUserCategories(user.id);
    
    // If user has no categories, create default ones
    if (userCategories.length === 0) {
      for (const category of defaultCategories) {
        await createCategory(user.id, {
          id: uuidv4(),
          name: category.name,
          color: category.color,
          isDefault: true,
        });
      }
      // Fetch categories again after creating defaults
      const categories = await getUserCategories(user.id);
      return NextResponse.json({ categories });
    }
    
    return NextResponse.json({ categories: userCategories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const categoryData = await request.json();
    const category = {
      id: uuidv4(),
      ...categoryData,
      isDefault: false,
    };

    await createCategory(user.id, category);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDB();
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    await deleteCategory(user.id, id);
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
