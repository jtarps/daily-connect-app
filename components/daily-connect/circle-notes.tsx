'use client';

import { useState } from 'react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquare, Plus, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CircleNote, Circle } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CircleNotesProps {
  circle: Circle;
}

export function CircleNotes({ circle }: CircleNotesProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Query for recent notes (last 10)
  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !circle) return null;
    return query(
      collection(firestore, 'circles', circle.id, 'notes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [firestore, circle]);

  const { data: notes, isLoading } = useCollection<CircleNote>(notesQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !message.trim()) return;

    setIsSaving(true);
    try {
      // Get user's name
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const authorName = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName.substring(0, 1)}.`
        : userData?.firstName || 'Someone';

      await addDoc(collection(firestore, 'circles', circle.id, 'notes'), {
        circleId: circle.id,
        authorId: user.uid,
        authorName,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Note posted!',
        description: 'Your message has been shared with the circle.',
      });

      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to post note:', error);
      toast({
        title: 'Error',
        description: 'Failed to post note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>Notes</span>
          {notes && notes.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {notes.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Circle Notes</DialogTitle>
          <DialogDescription>
            Leave messages for your circle members
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Notes List */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notes && notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="flex gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {note.authorName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{note.authorName}</p>
                      <span className="text-xs text-muted-foreground">
                        {note.createdAt?.toDate()
                          ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true })
                          : 'Just now'}
                      </span>
                    </div>
                    <p className="text-sm break-words">{note.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notes yet. Be the first to leave a message!</p>
              </div>
            )}
          </div>

          {/* Post Note Form */}
          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
            <Textarea
              placeholder="Leave a note for your circle..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSaving}
              maxLength={500}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {message.length}/500
              </span>
              <Button type="submit" disabled={isSaving || !message.trim()}>
                {isSaving ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Post Note
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
