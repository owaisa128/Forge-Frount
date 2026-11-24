import React, {
  Suspense,
  createContext,
  lazy,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const Memberships = lazy(() => import("../pages/Memberships"));
const MembershipDialogContext = createContext(null);

export function useMembershipDialog() {
  return useContext(MembershipDialogContext);
}

export default function MembershipDialogProvider({ children }) {
  const [open, setOpen] = useState(false);
  const focusReturnRef = useRef(null);
  const openDialog = (focusTarget) => {
    focusReturnRef.current =
      typeof focusTarget?.focus === "function"
        ? focusTarget
        : document.activeElement;
    setOpen(true);
  };
  const restoreFocus = (event) => {
    event.preventDefault();
    if (typeof focusReturnRef.current?.focus === "function") {
      focusReturnRef.current.focus();
    }
    focusReturnRef.current = null;
  };

  return (
    <MembershipDialogContext.Provider value={openDialog}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={restoreFocus}
          className="grid max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-forma-border-subtle bg-forma-bg-base p-0 sm:max-h-[90dvh] sm:max-w-6xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>See what’s in every membership.</DialogTitle>
            <DialogDescription>
              Compare coaching plans, choose a billing interval, and update your
              membership.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
            <Suspense
              fallback={
                <p className="py-12 text-center text-forma-text-secondary" role="status">
                  Loading membership options…
                </p>
              }
            >
              <Memberships embedded onClose={() => setOpen(false)} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </MembershipDialogContext.Provider>
  );
}
