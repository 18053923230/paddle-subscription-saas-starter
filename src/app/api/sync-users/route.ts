import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server-internal';

export async function POST(request: NextRequest) {
  console.log('Syncing users', request);
  try {
    const supabase = await createClient();

    // 获取所有认证用户
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const syncedUsers = [];
    const errors = [];

    // 为每个有邮箱的用户创建customer记录
    for (const user of users.users) {
      if (user.email) {
        try {
          // 生成一个唯一的customer_id（使用用户ID或邮箱的hash）
          const customerId = `cust_${user.id.replace(/-/g, '')}`;

          const { data: insertData, error: insertError } = await supabase

            .from('test_customers')
            .upsert(
              {
                customer_id: customerId,
                email: user.email,
              },
              {
                onConflict: 'customer_id',
              },
            )
            .select();

          console.log('insertData', insertData);

          if (insertError) {
            console.error(`Error inserting user ${user.email}:`, insertError);
            errors.push({ email: user.email, error: insertError.message });
          } else {
            syncedUsers.push({ email: user.email, customer_id: customerId });
          }
        } catch (error) {
          console.error(`Error processing user ${user.email}:`, error);
          errors.push({ email: user.email, error: 'Processing error' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedUsers,
      totalUsers: users.users.length,
      errors,
      message: `Successfully synced ${syncedUsers.length} users to test_customers table`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
