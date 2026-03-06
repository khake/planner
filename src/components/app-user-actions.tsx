import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CurrentUserTag } from "@/components/current-user-tag";

export async function AppUserActions() {
  return (
    <>
      <CurrentUserTag />
      <Link href="/profile">
        <Button variant="outline" size="sm">
          โปรไฟล์
        </Button>
      </Link>
      <Link href="/logout">
        <Button variant="ghost" size="sm">
          Logout
        </Button>
      </Link>
    </>
  );
}
