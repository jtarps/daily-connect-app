"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, useAuth } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { deleteAccount } from "@/app/actions";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!user || !canDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAccount({ userId: user.uid });

      if (result.success) {
        // Sign out on client side
        if (auth) {
          try {
            await signOut(auth);
          } catch {
            // Auth account already deleted server-side, ignore
          }
        }
        toast({
          title: "Account deleted",
          description: "Your account and all data have been permanently removed.",
        });
        router.push("/");
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(newOpen) => {
      if (!isDeleting) {
        onOpenChange(newOpen);
        if (!newOpen) setConfirmText("");
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              This will <strong className="text-destructive">permanently delete</strong> your
              account and all associated data, including:
            </span>
            <span className="block text-sm">
              - Your profile and check-in history<br />
              - Your notification tokens<br />
              - Your membership in all circles<br />
              - Circles where you are the only member
            </span>
            <span className="block font-medium text-foreground">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
            Type <strong>DELETE</strong> to confirm
          </label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Account"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
