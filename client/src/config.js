export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '+1234567890';

export function getWhatsAppLink(text = 'Hi, I want to place an ironing order with QuickIron') {
  const phone = WHATSAPP_NUMBER.replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${phone}?text=${encoded}`;
}