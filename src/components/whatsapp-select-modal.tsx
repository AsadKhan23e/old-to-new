'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { openWhatsApp, shareMessage } from '@/lib/whatsapp-service';
import { Share2, MessageSquare, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  message: string;
  title?: string;
  onSent?: () => void;
}

export function WhatsAppSelectModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  message,
  title = "Send Khata Reminder / واٹس ایپ منتخب کریں",
  onSent
}: WhatsAppSelectModalProps) {
  const { toast } = useToast();

  const handleSend = (appType: 'whatsapp' | 'business') => {
    openWhatsApp(customerPhone, message, appType);
    if (onSent) onSent();
    toast({
      title: appType === 'business' ? "Opening WhatsApp Business..." : "Opening WhatsApp...",
      description: `Message prepared for ${customerName}`
    });
    onClose();
  };

  const handleShareOther = async () => {
    const wasShared = await shareMessage(message, title);
    if (onSent) onSent();
    if (!wasShared) {
      toast({ title: "Copied to clipboard!", description: "Message text copied successfully." });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-[#25D366]">💬</span> {title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Select which WhatsApp app on your device to send this reminder to <strong>{customerName}</strong> ({customerPhone}):
          </DialogDescription>
        </DialogHeader>

        {/* Message preview snippet */}
        <div className="my-2 p-3 rounded-xl bg-muted/60 text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap border border-muted">
          {message}
        </div>

        <div className="space-y-3 pt-2">
          {/* Regular WhatsApp Button */}
          <Button
            type="button"
            onClick={() => handleSend('whatsapp')}
            className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Send with WhatsApp (Regular) / عام واٹس ایپ
          </Button>

          {/* WhatsApp Business Button */}
          <Button
            type="button"
            onClick={() => handleSend('business')}
            className="w-full h-12 bg-[#0F5E36] hover:bg-[#0c4c2c] text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Briefcase className="w-5 h-5 shrink-0" />
            Send with WhatsApp Business / بزنس واٹس ایپ
          </Button>

          {/* System Share Sheet / SMS / Other apps */}
          <Button
            type="button"
            variant="outline"
            onClick={handleShareOther}
            className="w-full h-11 text-sm rounded-xl flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share via Other Apps / ایس ایم ایس یا دیگر ایپس
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Cancel / منسوخ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
