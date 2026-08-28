/**
 * Admin-facing label for a message thread participant.
 * Guests always get a Guest signal; email shown when known.
 */
export function conversationParticipantLabel(row: {
  guestId?: string | null;
  userId?: string | null;
  customerEmail?: string | null;
}): { primary: string; isGuest: boolean } {
  const email = row.customerEmail?.trim() || null;
  if (row.guestId?.trim()) {
    return {
      isGuest: true,
      primary: email ?? "No email on file",
    };
  }
  return {
    isGuest: false,
    primary: email ?? (row.userId?.trim() ? "Account" : "Customer"),
  };
}
