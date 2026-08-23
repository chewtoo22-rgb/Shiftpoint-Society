import Link from "next/link";
import { cookies } from "next/headers";
import styles from "./activity.module.css";
import { markActivitySeen } from "./actions";
import { getCurrentMember } from "@/lib/current-member";
import { getMemberActivity } from "@/lib/activity-repository";

const ACTIVITY_SEEN_COOKIE = "shiftpoint-activity-seen-at";

function timeAgo(date: Date) {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const reactionIcon = {
  LIKE: "♥",
  FIRE: "🔥",
  WRENCH: "🔧",
  RESPECT: "✦",
} as const;

export default async function ActivityPage() {
  const member = await getCurrentMember();
  const cookieStore = await cookies();
  const rawSeenAt = cookieStore.get(ACTIVITY_SEEN_COOKIE)?.value;
  const parsedSeenAt = rawSeenAt ? new Date(rawSeenAt) : null;
  const seenAt = parsedSeenAt && !Number.isNaN(parsedSeenAt.getTime()) ? parsedSeenAt : null;
  const activity = await getMemberActivity(member.id);
  const unreadCount = activity.filter((item) => !seenAt || item.createdAt > seenAt).length;

  return (
    <div className="shell">
      <section className={styles.header}>
        <div>
          <div className="eyebrow">YOUR SOCIETY // GARAGE SIGNALS</div>
          <h1 className={styles.title}>ACTIVITY</h1>
          <p className="lead">Reactions and wrench talk landing on your posts.</p>
        </div>
        {activity.length > 0 && (
          <div className={styles.seenControls}>
            <span>{unreadCount > 0 ? `${unreadCount} NEW SIGNAL${unreadCount === 1 ? "" : "S"}` : "ALL CAUGHT UP"}</span>
            {unreadCount > 0 && (
              <form action={markActivitySeen}>
                <button type="submit">MARK ALL SEEN</button>
              </form>
            )}
          </div>
        )}
      </section>

      {activity.length === 0 ? (
        <article className={`card ${styles.empty}`}>
          <span className="number">// QUIET</span>
          <h2>NO NEW SIGNALS YET</h2>
          <p>Drop something in the feed and the activity will show up here when the Society responds.</p>
          <Link className="garageButton" href="/feed">OPEN THE FEED</Link>
        </article>
      ) : (
        <section className={styles.stack}>
          {activity.map((item) => {
            const actorName = item.actor.displayName || item.actor.handle;
            const isComment = item.kind === "COMMENT";
            const isUnread = !seenAt || item.createdAt > seenAt;
            const icon = isComment ? "💬" : reactionIcon[item.detail as keyof typeof reactionIcon] ?? "✦";
            const action = isComment ? "commented on your post" : `hit your post with ${item.detail.toLowerCase()}`;

            return (
              <article className={`card ${styles.item} ${isUnread ? styles.unread : ""}`} key={item.id}>
                <div className={styles.icon}>{icon}</div>
                <div>
                  <div className={styles.meta}>
                    <Link href={`/u/${item.actor.handle}`}>{actorName}</Link>
                    <span>@{item.actor.handle} · {action} · {timeAgo(item.createdAt)}</span>
                    {isUnread && <strong className={styles.newBadge}>NEW</strong>}
                  </div>
                  {isComment && <p>“{item.detail}”</p>}
                  <div className={styles.postPreview}>{item.postBody}</div>
                  <Link className={styles.threadLink} href={`/feed/${item.postId}`}>
                    VIEW THREAD →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
