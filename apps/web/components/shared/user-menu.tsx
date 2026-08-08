import { useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { LayoutGrid, LifeBuoy, LogOut, Mail, User } from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FounderSupportModal } from "./founder-support-modal";

export interface UserMenuProps {
  trigger: ReactNode;
}

export function UserMenu({ trigger }: UserMenuProps) {
  const router = useRouter();
  const { signOut } = useApp();
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuItem onSelect={() => void router.push("/home")}>
          <LayoutGrid />
          Home
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void router.push("/invites")}>
          <Mail />
          Invites
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void router.push("/account")}>
          <User />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setSupportOpen(true)}>
          <LifeBuoy />
          Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            signOut();
            void router.push("/login");
          }}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <FounderSupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
