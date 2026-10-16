import type { Metadata } from "next";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = { title: "Challenge Arena", description: "A future space for optional learning challenges and practice activities beyond standard exam preparation. No live leaderboard, competition or challenge scoring is active on this placeholder." };

export default function Page() {
  return <ComingSoonPage title={"Challenge Arena"} category={"Practice and challenges"} description={"A future space for optional learning challenges and practice activities beyond standard exam preparation. No live leaderboard, competition or challenge scoring is active on this placeholder."} requiresAuth={false} nextSteps={[{"label":"Open CBT portal","href":"/login"},{"label":"Learning resources","href":"/resources"}]} />;
}
