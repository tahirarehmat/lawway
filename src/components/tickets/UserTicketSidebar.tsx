"use client";

import React from "react";
import { ArrowLeft, Home, MessageCircle, X } from "lucide-react";
import type { Ticket } from "@/lib/ticketFirebase";

interface UserTicketSidebarProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  ticketsLoaded: boolean;
  isCompact: boolean;
  showChatView: boolean;
  sidebarOpen: boolean;
  onTicketSelect: (ticket: Ticket) => void;
  onCreateTicket: () => void;
  onClose?: () => void;
  onSidebarClose: () => void;
  onNavigateBack: () => void;
  formatTicketDate: (timestamp: unknown) => string;
  getStatusColor: (status: string) => string;
  canCreateTicket?: boolean;
}

const UserTicketSidebar: React.FC<UserTicketSidebarProps> = ({
  tickets,
  selectedTicket,
  ticketsLoaded,
  isCompact,
  showChatView,
  sidebarOpen,
  onTicketSelect,
  onCreateTicket,
  onClose,
  onSidebarClose,
  onNavigateBack,
  formatTicketDate,
  getStatusColor,
  canCreateTicket = true,
}) => {
  return (
    <>
      {sidebarOpen && !isCompact && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={onSidebarClose}
          aria-hidden
        />
      )}

      <div
        className={`
        flex w-80 max-w-[85vw] flex-col overflow-hidden border-r border-border bg-card
        ${isCompact ? (showChatView ? "hidden" : "w-full max-w-full") : "fixed z-50 transition-all duration-500 ease-out md:relative md:z-auto"}
        ${!isCompact && (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}
        h-full
      `}
      >
        <div className="border-b border-border bg-card px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isCompact && (
                <button
                  type="button"
                  onClick={onSidebarClose}
                  className="group cursor-pointer rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                  title="Close list"
                >
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Legal messages
                </h2>
                <p className="text-[11px] text-muted-foreground">Per advocate — pick a thread below</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateBack}
                className="cursor-pointer rounded-full border border-border p-1.5 text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground"
                title="Dashboard home"
              >
                <Home className="h-4 w-4" />
              </button>
              {canCreateTicket && (
                <button
                  type="button"
                  onClick={onCreateTicket}
                  className="cursor-pointer rounded-[10px] bg-primary px-3 py-1.5 shadow-xs transition-all hover:bg-primary/90"
                  title="New message to your legal team"
                >
                  <span className="text-[11px] font-semibold tracking-wide text-primary-foreground">
                    New
                  </span>
                </button>
              )}
              {isCompact && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="scrollbar-themed min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
          {tickets.length === 0 && ticketsLoaded ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <div className="w-full px-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-foreground">No messages yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start a conversation with your legal team
                </p>
              </div>
            </div>
          ) : ticketsLoaded ? (
            <div className="animate-in fade-in duration-300 w-full max-w-full">
              {tickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onTicketSelect(ticket)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onTicketSelect(ticket);
                  }}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`group relative w-full max-w-full cursor-pointer overflow-hidden border-b border-border p-4 transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${
                    selectedTicket?.id === ticket.id
                      ? "bg-primary/10"
                      : "bg-transparent hover:bg-muted"
                  }`}
                >
                  <div className="relative max-w-full min-w-0">
                    <div className="mb-2 flex w-full min-w-0 items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground">
                        {ticket.subject}
                      </h3>
                      {ticket.unreadCount > 0 && (
                        <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                          {ticket.unreadCount}
                        </span>
                      )}
                    </div>
                    {ticket.lawyerName ? (
                      <p className="mb-2 truncate text-[11px] font-medium text-muted-foreground">
                        {ticket.lawyerName}
                      </p>
                    ) : null}
                    <div className="flex w-full min-w-0 items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-muted-foreground">
                        {formatTicketDate(ticket.recentActivity)}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${getStatusColor(ticket.status)} bg-current/10`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default UserTicketSidebar;
