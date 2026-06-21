import type { CommunicationEvent } from "./types";

const channelPhrases: Record<string, string> = {
  email: "Email sent to",
  sms: "Text sent to",
  phone: "Call logged with",
};

export function describeCommunicationEvent(event: CommunicationEvent, recipientName: string): string {
  const phrase = channelPhrases[event.channel] ?? "Message logged for";
  return `${phrase} ${recipientName}: "${event.body}"`;
}
