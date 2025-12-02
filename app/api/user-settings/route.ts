import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getUserId } from '@/lib/auth-server';

export async function GET() {
  try {
    const userId = await getUserId();
    const db = await getDb();
    
    const settings = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    // If no settings exist, return defaults
    if (settings.length === 0) {
      return NextResponse.json({ 
        weekMapping: 'oddA',
        inspirationQuote: null,
        availableEquipment: null,
        weight: null,
        height: null,
        bodyfatPercentage: null,
        gender: null,
        age: null,
      });
    }

    const availableEquipment = settings[0].availableEquipment 
      ? JSON.parse(settings[0].availableEquipment) 
      : null;

    return NextResponse.json({ 
      weekMapping: settings[0].weekMapping,
      inspirationQuote: settings[0].inspirationQuote || null,
      availableEquipment,
      weight: settings[0].weight || null,
      height: settings[0].height || null,
      bodyfatPercentage: settings[0].bodyfatPercentage || null,
      gender: settings[0].gender !== null && settings[0].gender !== undefined ? settings[0].gender : null,
      age: settings[0].age !== null && settings[0].age !== undefined ? settings[0].age : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { weekMapping, inspirationQuote, availableEquipment, weight, height, bodyfatPercentage, gender, age } = body;

    const db = await getDb();
    const now = new Date().toISOString();

    // Validate weekMapping if provided
    if (weekMapping !== undefined && weekMapping !== 'oddA' && weekMapping !== 'oddB') {
      return NextResponse.json({ error: 'Invalid week mapping value' }, { status: 400 });
    }

    // Try to update existing settings
    const existing = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);

    const updateData: any = {
      updatedAt: now,
    };

    if (weekMapping !== undefined) {
      updateData.weekMapping = weekMapping;
    }

    if (inspirationQuote !== undefined) {
      updateData.inspirationQuote = inspirationQuote || null;
    }

    if (availableEquipment !== undefined) {
      updateData.availableEquipment = availableEquipment && availableEquipment.length > 0
        ? JSON.stringify(availableEquipment)
        : null;
    }

    if (weight !== undefined) {
      updateData.weight = weight || null;
    }

    if (height !== undefined) {
      updateData.height = height || null;
    }

    if (bodyfatPercentage !== undefined) {
      updateData.bodyfatPercentage = bodyfatPercentage || null;
    }

    if (gender !== undefined) {
      // Store as 0 (female), 1 (male), or null (not specified)
      updateData.gender = gender === null || gender === '' ? null : (gender === 'male' || gender === 1 ? 1 : 0);
    }

    if (age !== undefined) {
      updateData.age = age === null || age === '' ? null : parseInt(age);
    }

    if (existing.length > 0) {
      await db
        .update(schema.userSettings)
        .set(updateData)
        .where(eq(schema.userSettings.userId, userId));
    } else {
      // Insert new settings
      const insertData: any = {
        userId,
        weekMapping: weekMapping || 'oddA',
        inspirationQuote: inspirationQuote || null,
        updatedAt: now,
      };
      
      if (availableEquipment !== undefined) {
        insertData.availableEquipment = availableEquipment && availableEquipment.length > 0
          ? JSON.stringify(availableEquipment)
          : null;
      }

      if (weight !== undefined) {
        insertData.weight = weight || null;
      }

      if (height !== undefined) {
        insertData.height = height || null;
      }

      if (bodyfatPercentage !== undefined) {
        insertData.bodyfatPercentage = bodyfatPercentage || null;
      }

      if (gender !== undefined) {
        insertData.gender = gender === null || gender === '' ? null : (gender === 'male' || gender === 1 ? 1 : 0);
      }

      if (age !== undefined) {
        insertData.age = age === null || age === '' ? null : parseInt(age);
      }
      
      await db.insert(schema.userSettings).values(insertData);
    }

    // Get the saved availableEquipment value
    let savedAvailableEquipment = null;
    if (updateData.availableEquipment !== undefined) {
      // We just updated it, so use the updated value
      savedAvailableEquipment = updateData.availableEquipment 
        ? JSON.parse(updateData.availableEquipment) 
        : null;
    } else if (existing.length > 0 && existing[0].availableEquipment) {
      // Use existing value
      savedAvailableEquipment = JSON.parse(existing[0].availableEquipment);
    }

    return NextResponse.json({ 
      weekMapping: updateData.weekMapping || existing[0]?.weekMapping || 'oddA',
      inspirationQuote: updateData.inspirationQuote !== undefined 
        ? updateData.inspirationQuote 
        : (existing[0]?.inspirationQuote || null),
      availableEquipment: savedAvailableEquipment,
      weight: updateData.weight !== undefined 
        ? updateData.weight 
        : (existing[0]?.weight || null),
      height: updateData.height !== undefined 
        ? updateData.height 
        : (existing[0]?.height || null),
      bodyfatPercentage: updateData.bodyfatPercentage !== undefined 
        ? updateData.bodyfatPercentage 
        : (existing[0]?.bodyfatPercentage || null),
      gender: updateData.gender !== undefined 
        ? updateData.gender 
        : (existing[0]?.gender !== null && existing[0]?.gender !== undefined ? existing[0].gender : null),
      age: updateData.age !== undefined 
        ? updateData.age 
        : (existing[0]?.age !== null && existing[0]?.age !== undefined ? existing[0].age : null),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 });
  }
}

