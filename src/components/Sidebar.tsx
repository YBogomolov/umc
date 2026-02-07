import * as React from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { SessionMeta } from "@/store/types";

interface SessionItemProps {
  session: SessionMeta;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: SessionItemProps): React.ReactElement {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(session.name);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const handleStartEdit = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setEditName(session.name);
    setIsEditing(true);
  };

  const handleConfirmEdit = (): void => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== session.name) {
      onRename(session.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setEditName(session.name);
  };

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(session.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const dateStr = new Date(session.updatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "group flex cursor-pointer gap-2 rounded-md border p-2 transition-colors",
        isActive
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-muted-foreground/20 hover:bg-muted/50",
      )}
      onClick={() => onSelect(session.id)}
    >
      {/* Thumbnail */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {session.frontalThumbDataUrl ? (
          <img
            src={session.frontalThumbDataUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {isEditing ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
              className="h-6 px-1 text-xs"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={handleConfirmEdit}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={handleCancelEdit}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="truncate text-sm font-medium">{session.name}</span>
        )}
        <span className="text-xs text-muted-foreground">{dateStr}</span>
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex flex-shrink-0 flex-col justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={handleStartEdit}
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-5 w-5", confirmDelete && "text-destructive")}
            onClick={handleDeleteClick}
            title={confirmDelete ? "Click again to confirm" : "Delete"}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  onChangeApiKey: () => void;
}

function Sidebar({ onChangeApiKey }: SidebarProps): React.ReactElement {
  const sessions = useAppStore((s) => s.sessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const loadSession = useAppStore((s) => s.loadSession);
  const newSession = useAppStore((s) => s.newSession);
  const deleteSessionById = useAppStore((s) => s.deleteSessionById);
  const renameSession = useAppStore((s) => s.renameSession);

  const handleSelect = (id: string): void => {
    if (id !== currentSessionId) {
      loadSession(id);
    }
  };

  if (!sidebarOpen) {
    return (
      <div className="flex flex-shrink-0 flex-col border-r bg-muted/20 p-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
          title="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-r bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Sessions</span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={newSession}
            title="New session"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={toggleSidebar}
            title="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No sessions yet. Generate an image to start.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onSelect={handleSelect}
                onDelete={deleteSessionById}
                onRename={renameSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onChangeApiKey}
        >
          <Settings className="h-4 w-4" />
          Change API Key
        </Button>
      </div>
    </div>
  );
}

export { Sidebar };
