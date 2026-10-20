import { permanentRedirect } from "next/navigation";

// /redeem-access is consolidated into the unified /account/access hub
export default function RedeemAccessRedirectPage() {
  permanentRedirect("/account/access");
}
