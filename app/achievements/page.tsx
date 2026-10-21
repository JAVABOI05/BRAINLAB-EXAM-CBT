import { permanentRedirect } from "next/navigation";

export default function AchievementsRedirect() {
  permanentRedirect("/profile/achievements");
}
