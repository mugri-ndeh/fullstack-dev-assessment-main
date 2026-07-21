import { ReactNode } from "react";

// Minimal overlay modal. Click on the backdrop or the close button dismisses;
// content clicks are stopped from bubbling so the panel stays open.
const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div
      className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl my-8"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-fg-subtle hover:text-fg text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default Modal;
