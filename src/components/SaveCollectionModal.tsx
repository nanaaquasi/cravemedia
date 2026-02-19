"use client";

import { useState } from "react";
import Modal from "./Modal";

interface SaveCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { title: string; description?: string }) => void;
  defaultTitle: string;
  defaultDescription: string;
}

export default function SaveCollectionModal({
  isOpen,
  onClose,
  onConfirm,
  defaultTitle,
  defaultDescription,
}: SaveCollectionModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      title,
      description,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-1">
            Save Collection
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Organize these items into a permanent collection.
          </p>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <label
            htmlFor="collection-title"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
          >
            Collection Title
          </label>
          <input
            id="collection-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors text-white"
            placeholder="e.g. Weekend Movie Marathon"
            autoFocus
          />
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <label
            htmlFor="collection-description"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
          >
            Description (Optional)
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-colors text-white min-h-[100px] resize-none"
            placeholder="A short description of this collection..."
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 transition-all cursor-pointer"
          >
            Save Collection
          </button>
        </div>
      </form>
    </Modal>
  );
}
