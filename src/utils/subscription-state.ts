// 简单的订阅状态管理
const activeSubscriptions = new Map<string, number>();

/**
 * 设置订阅状态 - 用户点击提交付款时调用
 * @param email 用户邮箱
 */
export function setSubscriptionPending(email: string): void {
  const key = email.toLowerCase();
  activeSubscriptions.set(key, Date.now());
  console.log('🟢 [SUBSCRIPTION STATE] Set pending for:', email);
}

/**
 * 检查是否有待处理的订阅 - Webhook处理时调用
 * @param email 用户邮箱
 * @returns 是否有待处理的订阅
 */
export function hasSubscriptionPending(email: string): boolean {
  const key = email.toLowerCase();
  const timestamp = activeSubscriptions.get(key);

  if (!timestamp) {
    return false;
  }

  // 检查是否在5分钟内（防止过期状态）
  const isRecent = Date.now() - timestamp < 5 * 60 * 1000;

  if (!isRecent) {
    // 清理过期状态
    activeSubscriptions.delete(key);
    console.log('🟡 [SUBSCRIPTION STATE] Cleaned expired state for:', email);
    return false;
  }

  return true;
}

/**
 * 清除订阅状态 - 写入数据表后调用
 * @param email 用户邮箱
 */
export function clearSubscriptionPending(email: string): void {
  const key = email.toLowerCase();
  activeSubscriptions.delete(key);
  console.log('🟢 [SUBSCRIPTION STATE] Cleared state for:', email);
}

/**
 * 获取当前活跃的订阅状态（用于调试）
 */
export function getActiveSubscriptions(): Map<string, number> {
  return new Map(activeSubscriptions);
}
