"use client";

import { House, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/branding/brand-mark";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { t } = useI18n();
  const { state } = useSidebar();
  const pathname = usePathname();
  return (
    <>
      <div
        className={cn(
          "group/workspace-header flex h-12 flex-col justify-center",
          className,
        )}
      >
        {state === "collapsed" ? (
          <div className="group-has-data-[collapsible=icon]/sidebar-wrapper:-translate-y relative mx-auto flex size-8 items-center justify-center">
            <BrandMark
              label="Creeper"
              size={24}
              className="transition-opacity group-focus-within/workspace-header:opacity-0 group-hover/workspace-header:opacity-0"
            />
            <SidebarTrigger className="absolute inset-0 size-8 opacity-0 transition-opacity group-focus-within/workspace-header:opacity-100 group-hover/workspace-header:opacity-100" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Cross-zone navigation must load a new document, not Next RSC. */}
            <a
              href="/"
              aria-label={t.sidebar.personalSite}
              className="text-primary ml-2 flex items-center gap-2 font-semibold tracking-tight"
            >
              <BrandMark size={28} />
              Creeper
            </a>
            <SidebarTrigger />
          </div>
        )}
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={t.sidebar.personalSite}>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- The personal site owns a different Next runtime. */}
            <a
              href="/"
              aria-label={t.sidebar.personalSite}
              className="text-muted-foreground"
            >
              <House size={16} />
              <span>{t.sidebar.personalSite}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/chats/new"}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/chats/new">
              <MessageSquarePlus size={16} />
              <span>{t.sidebar.newChat}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
