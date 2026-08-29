import { FaWhatsapp, FaInstagram } from "react-icons/fa6";
import { SiGmail } from "react-icons/si";

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return <FaWhatsapp size={size} color="#25D366" />;
}

export function InstagramIcon({ size = 18 }: { size?: number }) {
  return <FaInstagram size={size} color="#E4405F" />;
}

export function GmailIcon({ size = 18 }: { size?: number }) {
  return <SiGmail size={size} color="#EA4335" />;
}

/** Outlook doesn't have a maintained icon in any open icon set — a small stand-in mark. */
export function OutlookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4" width="15" height="16" rx="2" fill="#0A66C2" />
      <circle cx="8.5" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.6" />
      <path d="M15 7h7.5A1.5 1.5 0 0 1 24 8.5v7A1.5 1.5 0 0 1 22.5 17H15V7Z" fill="#28A8EA" />
      <path d="M15 7h7.5A1.5 1.5 0 0 1 24 8.5v.2l-9 5.4V7Z" fill="#0364B8" />
    </svg>
  );
}
