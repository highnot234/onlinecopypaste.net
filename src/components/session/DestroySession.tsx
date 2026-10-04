'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Prominent "Destroy Session" button.
 * - Shows a confirmation Modal before destroying
 * - On confirm: calls destroySession(), clears sessionStorage, shows toast, redirects to /
 * - Styled as danger variant with warning text beneath
 */
export default function DestroySession() {
  const [showModal, setShowModal] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const { destroySession } = useSession();
  const { showToast } = useToast();
  const router = useRouter();

  const handleConfirm = async () => {
    setIsDestroying(true);
    try {
      await destroySession();
      showToast('Session destroyed. All data cleared.', 'success');
      router.push('/');
    } catch {
      showToast('Session destroy failed. Please try again.', 'error');
      setIsDestroying(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="danger"
          size="lg"
          onClick={() => setShowModal(true)}
          aria-label="Destroy session and delete all data"
        >
          <span aria-hidden="true">🔥</span>
          Destroy Session
        </Button>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Your session is temporary. Destroy when done to protect your privacy
          on shared computers.
        </p>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => !isDestroying && setShowModal(false)}
        title="Destroy Session?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            This will immediately:
          </p>
          <ul className="space-y-1 text-sm text-slate-400 list-disc list-inside">
            <li>Disconnect all paired devices</li>
            <li>Delete all transfer data from the server</li>
            <li>Invalidate your session credentials</li>
            <li>Prevent reconnection with the current code</li>
          </ul>
          <p className="text-xs text-slate-500">
            This action cannot be undone.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              variant="danger"
              size="md"
              loading={isDestroying}
              onClick={() => void handleConfirm()}
              className="flex-1"
            >
              Yes, Destroy
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={isDestroying}
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
