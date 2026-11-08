import "../../arena/arena-theme.css";

export default function CompetitionAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="arena-admin min-h-screen">{children}</div>;
}
