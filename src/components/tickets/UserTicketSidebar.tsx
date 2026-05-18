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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={onSidebarClose}
          aria-hidden
        />
      )}

      <div
        className={`
        flex w-80 max-w-[85vw] flex-col overflow-hidden border-r border-[#d4af37]/25 bg-[#1a0f0e] shadow-2xl shadow-[#d4af37]/10 backdrop-blur-xl
        ${isCompact ? (showChatView ? "hidden" : "w-full max-w-full") : "fixed z-50 transition-all duration-500 ease-out md:relative md:z-auto"}
        ${!isCompact && (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}
        h-full
        before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-[#d4af37]/10 before:to-transparent
      `}
      >
        <div className="relative border-b border-[#d4af37]/25 bg-gradient-to-br from-[#241816]/90 via-[#1a0f0e]/95 to-[#140c0a]/95 px-4 py-6 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/5 to-transparent opacity-60" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isCompact && (
                <button
                  type="button"
                  onClick={onSidebarClose}
                  className="group cursor-pointer p-2.5 text-white/60 transition-colors hover:text-[#d4af37] md:hidden"
                  title="Close list"
                >
                  <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Legal messages
                </h2>
                <p className="text-[11px] text-white/40">Per advocate — pick a thread below</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateBack}
                className="group relative cursor-pointer overflow-hidden rounded-md border border-[#d4af37]/50 bg-gradient-to-r from-[#d4af37]/15 to-[#d4af37]/5 p-1.5 shadow-sm transition-all hover:border-[#d4af37] hover:shadow-[#d4af37]/25"
                title="Dashboard home"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/0 to-[#d4af37]/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <Home className="relative h-4 w-4 text-[#d4af37] transition-colors group-hover:text-white" />
              </button>
              {canCreateTicket && (
                <button
                  type="button"
                  onClick={onCreateTicket}
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-[#d4af37]/50 bg-gradient-to-r from-[#d4af37]/15 to-[#d4af37]/5 px-2 py-1 shadow-sm transition-all hover:border-[#d4af37] hover:shadow-[#d4af37]/25"
                  title="New message to your legal team"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/0 to-[#d4af37]/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative text-[11px] font-semibold tracking-wide text-[#d4af37] transition-colors group-hover:text-white">
                    New
                  </span>
                </button>
              )}
              {isCompact && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2.5 text-white/60 transition hover:scale-105 hover:bg-white/10 hover:text-white"
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3e2723] to-[#d4af37] shadow-lg shadow-[#d4af37]/25">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm text-white/50">No messages yet</p>
                <p className="mt-1 text-xs text-white/35">
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
                  className={`group relative w-full max-w-full cursor-pointer overflow-hidden border-b border-[#d4af37]/15 p-4 transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${
                    selectedTicket?.id === ticket.id
                      ? "bg-gradient-to-r from-[#3e2723]/80 to-[#d4af37]/25"
                      : "bg-transparent hover:bg-[#2a1815]/50"
                  }`}
                >
                  <div className="relative max-w-full min-w-0">
                    <div className="mb-2 flex w-full min-w-0 items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-white transition-colors group-hover:text-[#d4af37]">
                        {ticket.subject}
                      </h3>
                      {ticket.unreadCount > 0 && (
                        <span className="flex h-[22px] min-w-[22px] shrink-0 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#3e2723] px-2 text-xs font-bold text-white shadow-lg shadow-[#d4af37]/40">
                          {ticket.unreadCount}
                        </span>
                      )}
                    </div>
                    {ticket.lawyerName ? (
                      <p className="mb-2 truncate text-[11px] font-medium text-[#d4af37]/90">
                        {ticket.lawyerName}
                      </p>
                    ) : null}
                    <div className="flex w-full min-w-0 items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-white/50">
                        {formatTicketDate(ticket.recentActivity)}
                      </span>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize ${getStatusColor(ticket.status)} bg-current/10`}
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
