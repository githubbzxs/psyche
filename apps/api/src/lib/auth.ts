export function requireUserId(request: any) {
  const userId = request.user?.id
  if (!userId) {
    throw new Error('未登录')
  }
  return userId
}
