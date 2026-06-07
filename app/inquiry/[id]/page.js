// app/inquiry/[id]/page.js — Detail of one inquiry.
// If the inquiry belongs to a conversation with several bookings we show
// SplitDetail; otherwise Detail.
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Detail from "@/components/Detail";
import SplitDetail from "@/components/SplitDetail";
import { getInquiry, getConversation } from "@/lib/inquiries";
import { getStaff, getCurrentUser } from "@/lib/staff";

export const dynamic = "force-dynamic";

export default async function InquiryPage({ params }) {
  const { id } = await params;
  const item = await getInquiry(id);
  if (!item) notFound();

  const staff = await getStaff();
  const me = await getCurrentUser(staff);

  // Any siblings in the same conversation?
  let siblings = [item];
  if (item.conversationId) {
    siblings = await getConversation(item.conversationId);
  }

  return (
    <div className="db-app" style={{ fontSize: 13 }}>
      <Header staff={staff} me={me} active="inbox" />
      {siblings.length > 1 ? (
        <SplitDetail items={siblings} staff={staff} me={me} />
      ) : (
        <Detail item={item} staff={staff} me={me} />
      )}
    </div>
  );
}
