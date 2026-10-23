// ============================================
// GLOBAL PASSWORD PROMPT MOUNT
// À monter une fois dans _layout.tsx. Écoute les requests du controller
// passwordPromptController et affiche le modal PasswordPromptModal en réponse.
// ============================================

import React, { useState, useEffect } from 'react';
import { PasswordPromptModal } from './PasswordPromptModal';
import { subscribeToPasswordRequests, respondToPasswordRequest, PasswordPromptRequest } from '@/lib/passwordPromptController';
import { traduire } from '@/lib/i18n/tr';

export const GlobalPasswordPromptMount: React.FC = () => {
  const [req, setReq] = useState<PasswordPromptRequest | null>(null);

  useEffect(() => {
    const unsub = subscribeToPasswordRequests((r) => {
      setReq(r);
    });
    return unsub;
  }, []);

  const handleSubmit = (value: string) => {
    if (req) {
      respondToPasswordRequest(req.id, value);
      setReq(null);
    }
  };

  const handleCancel = () => {
    if (req) {
      respondToPasswordRequest(req.id, null);
      setReq(null);
    }
  };

  if (!req) return null;

  return (
    <PasswordPromptModal
      visible={!!req}
      title={traduire(req.title)}
      message={req.message}
      confirmLabel={req.confirmLabel}
      minLength={req.minLength}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
