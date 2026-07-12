import { countUnreadNotifications, listNotifications } from '@/data/user/notifications';
import { NotificationBell } from './NotificationBell';

/** Server shell: fetches the current user's initial notifications for the header
 *  bell. Returns nothing for a signed-out visitor (both queries resolve empty). */
export async function NotificationBellShell() {
  const [initialNotifications, initialUnread] = await Promise.all([
    listNotifications(20),
    countUnreadNotifications(),
  ]);
  return (
    <NotificationBell
      initialNotifications={initialNotifications}
      initialUnread={initialUnread}
    />
  );
}
