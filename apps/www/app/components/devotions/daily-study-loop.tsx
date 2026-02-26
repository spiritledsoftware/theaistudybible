import {
  completeDailyStudySession,
  saveDailyStudyNotes,
  startDailyStudySession,
} from '@/www/server/functions/daily-study-loop';
import { SignInButton } from '@/www/components/auth/sign-in-button';
import { Button } from '@/www/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/www/components/ui/card';
import { Input } from '@/www/components/ui/input';
import { Label } from '@/www/components/ui/label';
import { Separator } from '@/www/components/ui/separator';
import { Textarea } from '@/www/components/ui/textarea';
import { P } from '@/www/components/ui/typography';
import { useAuth } from '@/www/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

type DailyStudySession = Awaited<ReturnType<typeof startDailyStudySession>>['session'];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const DailyStudyLoopCard = () => {
  const { isSignedIn } = useAuth();
  const [goal, setGoal] = useState('');
  const [passageOrTopic, setPassageOrTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [session, setSession] = useState<DailyStudySession | null>(null);

  const startSessionMutation = useMutation({
    mutationFn: (input: { goal: string; passageOrTopic: string }) =>
      startDailyStudySession({ data: input }),
    onSuccess: ({ session }) => {
      setSession(session);
      setNotes(session.notes);
      toast.success('Daily study session started.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not start daily study session.'));
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: (input: { sessionId: string; notes: string }) =>
      saveDailyStudyNotes({ data: input }),
    onSuccess: ({ session }) => {
      setSession(session);
      toast.success('Notes saved.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not save notes.'));
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: (input: { sessionId: string }) => completeDailyStudySession({ data: input }),
    onSuccess: ({ session }) => {
      setSession(session);
      toast.success('Session recap generated.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not complete daily study session.'));
    },
  });

  const onStartSession = () => {
    if (!goal.trim() || !passageOrTopic.trim()) {
      toast.error('Please set a goal and select a passage or topic.');
      return;
    }

    startSessionMutation.mutate({
      goal: goal.trim(),
      passageOrTopic: passageOrTopic.trim(),
    });
  };

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Study Loop</CardTitle>
          <CardDescription>
            Plan your goal, study a passage or topic, save notes, and end with a recap.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <P>Sign in to save daily study sessions, notes, and recap history.</P>
          <SignInButton variant='outline'>Sign In to Start</SignInButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Study Loop</CardTitle>
        <CardDescription>
          Plan your goal, study a passage or topic, save notes, and end with a recap.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='daily-study-goal'>Daily Study Goal</Label>
            <Input
              id='daily-study-goal'
              placeholder='Example: Understand God’s peace in anxious moments'
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='daily-study-passage-topic'>Starting Passage or Topic</Label>
            <Input
              id='daily-study-passage-topic'
              placeholder='Example: Philippians 4:4-7'
              value={passageOrTopic}
              onChange={(event) => setPassageOrTopic(event.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={onStartSession}
          disabled={startSessionMutation.isPending || !goal.trim() || !passageOrTopic.trim()}
        >
          {startSessionMutation.isPending ? 'Starting...' : 'Start Daily Study'}
        </Button>

        {session && session.status !== 'failed' && (
          <>
            <Separator />
            <div className='space-y-4'>
              <div className='space-y-1'>
                <Label>Passage Context</Label>
                <P>{session.passageContext}</P>
              </div>

              <div className='space-y-1'>
                <Label>Concise Explanation</Label>
                <P>{session.conciseExplanation}</P>
              </div>

              <div className='space-y-1'>
                <Label>Reflection Prompt</Label>
                <P>{session.reflectionPrompt}</P>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='daily-study-notes'>Session Notes</Label>
                <Textarea
                  id='daily-study-notes'
                  placeholder='Write what stood out, prayers, and next actions.'
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      saveNotesMutation.mutate({ sessionId: session.id, notes });
                    }}
                    disabled={saveNotesMutation.isPending}
                  >
                    {saveNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                  </Button>
                  <Button
                    onClick={() => {
                      completeSessionMutation.mutate({ sessionId: session.id });
                    }}
                    disabled={completeSessionMutation.isPending}
                  >
                    {completeSessionMutation.isPending ? 'Generating Recap...' : 'End Session'}
                  </Button>
                </div>
              </div>

              {session.recap && (
                <div className='space-y-1 rounded-md border bg-muted/30 p-4'>
                  <Label>Session Recap</Label>
                  <P>{session.recap}</P>
                </div>
              )}

              <div className='rounded-md border bg-muted/30 p-3 text-sm'>
                Retention baseline captured: {session.dailyActiveStudyBaseline ? 'yes' : 'no'} |
                7-day return indicator: {session.returnedWithin7Days ? 'returning' : 'new'}
              </div>
            </div>
          </>
        )}
      </CardContent>
      {session && (
        <CardFooter>
          <Button
            variant='ghost'
            onClick={() => {
              setSession(null);
              setNotes('');
            }}
          >
            Start New Session
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
