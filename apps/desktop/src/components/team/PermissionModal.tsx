import { useState } from 'react';
import type { PendingPermission } from '../../hooks/usePermissions';

interface PermissionModalProps {
  permission: PendingPermission;
  onApprove: (requestId: string, reason?: string) => Promise<void>;
  onDeny: (requestId: string, reason?: string) => Promise<void>;
}

export default function PermissionModal({ permission, onApprove, onDeny }: PermissionModalProps) {
  const [responding, setResponding] = useState(false);
  const { message, payload } = permission;

  const handleApprove = async () => {
    setResponding(true);
    try {
      await onApprove(message.id);
    } finally {
      setResponding(false);
    }
  };

  const handleDeny = async () => {
    setResponding(true);
    try {
      await onDeny(message.id);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        {payload.is_destructive && (
          <span className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
        )}
        <span className="text-text-primary text-xs font-semibold">
          Permission Request
        </span>
        <span className="text-text-muted text-xs ml-auto">
          from {message.from_agent}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1">
        <div className="text-text-secondary text-xs">
          <span className="text-text-muted">Action:</span> {payload.action}
        </div>
        <div className="text-text-secondary text-xs">
          <span className="text-text-muted">Target:</span> {payload.target}
        </div>
        <div className="text-text-secondary text-xs">
          <span className="text-text-muted">Reason:</span> {payload.reason}
        </div>
      </div>

      {/* Destructive warning */}
      {payload.is_destructive && (
        <div className="px-2 py-1.5 bg-danger/10 border border-danger/30 rounded text-danger text-xs">
          This action is destructive and cannot be undone.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleApprove}
          disabled={responding}
          className="flex-1 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {responding ? '...' : 'Approve'}
        </button>
        <button
          onClick={handleDeny}
          disabled={responding}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
            payload.is_destructive
              ? 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80'
              : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80'
          }`}
        >
          {responding ? '...' : 'Deny'}
        </button>
      </div>
    </div>
  );
}
