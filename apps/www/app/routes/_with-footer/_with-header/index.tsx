import { Icon } from '@/www/components/branding/icon';
import { Button } from '@/www/components/ui/button';
import { Card, CardContent } from '@/www/components/ui/card';
import { GradientH1, H2, H3, Muted, P } from '@/www/components/ui/typography';
import { useBibleStore } from '@/www/contexts/bible';
import { Link, Navigate, createFileRoute, redirect } from '@tanstack/react-router';
import {
  BookOpen,
  Check,
  Languages,
  MessageCircle,
  Search,
  Shield,
  Sunrise,
  Users,
} from 'lucide-react';

export const Route = createFileRoute('/_with-footer/_with-header/')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/bible' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const chapter = useBibleStore((state) => state.chapter);
  if (chapter !== null) {
    return <Navigate to='/bible' />;
  }

  return (
    <>
      {/* Hero Section */}
      <section className='relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden py-6 sm:py-10 md:py-16'>
        {/* Modern Background */}
        <div className='-z-10 absolute inset-0'>
          {/* Base gradient with more vibrant colors */}
          <div className='absolute inset-0 animate-gradient bg-[length:200%_200%] bg-gradient-to-b from-background via-primary/10 to-accent/10 dark:via-primary/20 dark:to-accent/20' />

          {/* Geometric elements */}
          <div className='absolute inset-0 opacity-30 dark:opacity-60'>
            {/* Diagonal lines */}
            <div className='-right-14 absolute top-0 h-[600px] w-[2px] rotate-[35deg] animate-pulse bg-primary/40 dark:bg-primary-foreground/70' />
            <div className='-right-28 absolute top-0 h-[600px] w-[3px] rotate-[35deg] animate-pulse bg-primary/30 [animation-delay:500ms] dark:bg-accent-foreground/60' />
            <div className='-right-48 absolute top-0 h-[600px] w-[1px] rotate-[35deg] animate-pulse bg-primary/25 [animation-delay:1000ms] dark:bg-primary-foreground/55' />

            {/* Circles */}
            <div className='-left-20 absolute top-20 h-40 w-40 animate-spin-slow rounded-full border-2 border-primary/25 dark:border-primary-foreground/60' />
            <div className='absolute top-60 left-40 h-16 w-16 animate-bounce-slow rounded-full border border-primary/30 dark:border-accent-foreground/70' />
            <div className='absolute top-24 right-1/4 h-24 w-24 animate-pulse rounded-full border-2 border-primary/30 dark:border-primary-foreground/60' />

            {/* Dots pattern */}
            <div className='absolute top-1/3 right-12 grid grid-cols-5 gap-4'>
              {Array(25)
                .fill(0)
                .map((_, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: Only way to do this
                    key={index}
                    className='h-1.5 w-1.5 animate-ping rounded-full bg-primary/40 dark:bg-primary-foreground/80'
                    style={{ animationDelay: `${index * 100}ms` }}
                  />
                ))}
            </div>
          </div>

          {/* Vibrant gradient orbs */}
          <div className='absolute top-1/4 left-1/3 h-[300px] w-[300px] animate-pulse rounded-full bg-primary/15 blur-[80px] dark:bg-primary-foreground/40' />
          <div className='absolute top-1/3 right-10 h-[250px] w-[250px] animate-pulse rounded-full bg-accent/20 blur-[80px] [animation-delay:700ms] dark:bg-accent-foreground/40' />
          <div className='absolute bottom-1/4 left-10 h-[200px] w-[200px] animate-pulse rounded-full bg-primary/15 blur-[60px] [animation-delay:1500ms] dark:bg-primary-foreground/35' />
        </div>

        <div className='container mx-auto px-4 sm:px-6 md:px-10'>
          {/* Mobile Icon at Top (Only visible on small screens) */}
          <div className='relative mb-8 flex justify-center md:hidden'>
            <div className='-z-10 absolute inset-0'>
              {/* Simplified glow for mobile */}
              <div className='absolute inset-0 animate-pulse'>
                <div className='absolute inset-0 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30' />
              </div>
            </div>
            <Icon className='z-0 w-1/2 max-w-[180px]' />
          </div>

          <div className='flex w-full flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-12'>
            <div className='w-full md:w-1/2'>
              {/* Hero Text */}
              <div className='flex flex-col items-center text-center md:items-start md:text-left'>
                <GradientH1 className='max-w-3xl animate-fade-in font-bold text-2xl tracking-tight sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl'>
                  <span className='inline-block animate-fade-in [animation-delay:300ms]'>
                    Unlock
                  </span>{' '}
                  <span className='inline-block animate-fade-in [animation-delay:400ms]'>
                    Scripture's
                  </span>{' '}
                  <span className='inline-block animate-fade-in bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent [animation-delay:500ms] dark:from-primary-foreground dark:to-accent-foreground'>
                    Hidden
                  </span>{' '}
                  <span className='inline-block animate-fade-in [animation-delay:600ms]'>
                    Wisdom
                  </span>
                </GradientH1>
                <Muted className='mt-3 max-w-xl animate-fade-in text-muted-foreground text-sm [animation-delay:200ms] sm:mt-4 sm:text-base md:text-lg lg:text-xl'>
                  AI-powered insights that transform your Bible study in minutes, not hours.
                </Muted>
              </div>

              <div className='mt-6 flex flex-col items-center gap-4 sm:mt-8 md:items-start'>
                <div className='flex w-full max-w-xs gap-3'>
                  <Button
                    size='default'
                    className='flex-1 animate-fade-in bg-gradient-to-r from-primary to-accent shadow-md transition-transform hover:scale-105 hover:opacity-90 hover:shadow-lg hover:shadow-primary/20 sm:size-lg dark:hover:shadow-primary/40'
                    asChild
                  >
                    <Link to='/pro'>Try Pro Free</Link>
                  </Button>
                  <Button
                    size='default'
                    variant='outline'
                    className='flex-1 animate-fade-in border-primary/20 shadow transition-transform [animation-delay:100ms] hover:scale-105 hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg sm:size-lg dark:border-primary-foreground/50 dark:bg-background/80 dark:text-primary-foreground dark:shadow-primary-foreground/20 dark:hover:border-primary-foreground/70 dark:hover:bg-primary-foreground/10'
                    asChild
                  >
                    <Link to='/bible'>Read Now</Link>
                  </Button>
                </div>
                <div className='flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm md:justify-start'>
                  <div className='flex items-center gap-1.5'>
                    <Check className='h-3 w-3 text-primary sm:h-4 sm:w-4' />
                    <Muted>No credit card required</Muted>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <Check className='h-3 w-3 text-primary sm:h-4 sm:w-4' />
                    <Muted>7-day free trial of Pro features</Muted>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Icon (Only visible on md screens and up) */}
            <div className='hidden w-full md:block md:w-1/2'>
              <div className='relative flex h-full items-center justify-center'>
                <div className='-z-10 absolute inset-0'>
                  {/* Multiple layers of glow */}
                  <div className='absolute inset-0 animate-pulse'>
                    <div className='absolute inset-0 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30' />
                  </div>
                  <div className='absolute inset-0 animate-pulse [animation-delay:75ms]'>
                    <div className='absolute inset-0 rounded-full bg-accent/15 blur-2xl dark:bg-accent/25' />
                  </div>
                  <div className='absolute inset-0 animate-pulse [animation-delay:150ms]'>
                    <div className='absolute inset-0 scale-90 rounded-full bg-primary/20 blur-xl dark:bg-primary/30' />
                  </div>
                </div>
                <Icon className='z-0 w-3/4 max-w-lg animate-float-up-down' />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Trust Indicators */}
      <section className='border-y bg-muted/30 py-5 md:py-6'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4'>
            <div className='flex animate-fade-in flex-col items-center justify-center text-center transition-all hover:scale-105 hover:animate-bounce-slow'>
              <Languages className='mb-2 h-5 w-5 text-primary sm:h-6 sm:w-6 dark:text-primary-foreground' />
              <H3 className='m-0 bg-gradient-to-r from-primary to-accent bg-clip-text font-bold text-lg text-transparent sm:text-xl dark:from-primary-foreground dark:to-accent-foreground'>
                7
              </H3>
              <P className='m-0 text-muted-foreground text-xs sm:text-sm'>Bible Translations</P>
              <Muted className='text-xs'>More Soon!</Muted>
            </div>
            <div className='flex animate-fade-in flex-col items-center justify-center text-center transition-all [animation-delay:100ms] hover:scale-105 hover:animate-bounce-slow'>
              <MessageCircle className='mb-2 h-5 w-5 text-primary sm:h-6 sm:w-6 dark:text-primary-foreground' />
              <H3 className='m-0 bg-gradient-to-r from-primary to-accent bg-clip-text font-bold text-lg text-transparent sm:text-xl dark:from-primary-foreground dark:to-accent-foreground'>
                24/7
              </H3>
              <P className='m-0 text-muted-foreground text-xs sm:text-sm'>AI Assistance</P>
            </div>
            <div className='flex animate-fade-in flex-col items-center justify-center text-center transition-all [animation-delay:200ms] hover:scale-105 hover:animate-bounce-slow'>
              <Shield className='mb-2 h-5 w-5 text-primary sm:h-6 sm:w-6 dark:text-primary-foreground' />
              <H3 className='m-0 bg-gradient-to-r from-primary to-accent bg-clip-text font-bold text-lg text-transparent sm:text-xl dark:from-primary-foreground dark:to-accent-foreground'>
                100%
              </H3>
              <P className='m-0 text-muted-foreground text-xs sm:text-sm'>Privacy Focused</P>
            </div>
            <div className='flex animate-fade-in flex-col items-center justify-center text-center transition-all [animation-delay:300ms] hover:scale-105 hover:animate-bounce-slow'>
              <Users className='mb-2 h-5 w-5 text-primary sm:h-6 sm:w-6 dark:text-primary-foreground' />
              <H3 className='m-0 bg-gradient-to-r from-primary to-accent bg-clip-text font-bold text-lg text-transparent sm:text-xl dark:from-primary-foreground dark:to-accent-foreground'>
                1,000+
              </H3>
              <P className='m-0 text-muted-foreground text-xs sm:text-sm'>Active Users</P>
            </div>
          </div>
        </div>
      </section>
      <section className='py-12'>
        <div className='container mx-auto px-4'>
          <H2 className='mb-6 text-center text-3xl sm:text-4xl'>
            Experience the Power of AI Bible Study
          </H2>
          <P className='mx-auto mb-8 max-w-2xl text-center text-muted-foreground'>
            Our AI-powered tools help you gain deeper insights, understand complex passages, and
            discover new connections in Scripture.
          </P>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4'>
            {/* Feature 1 */}
            <Card className='hover:-translate-y-1 animate-fade-in overflow-hidden border transition-all hover:scale-105 hover:border-primary hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/40'>
              <CardContent className='flex flex-col items-center p-4 text-center'>
                <div className='mb-3 animate-pulse rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-2 dark:from-primary/30 dark:to-accent/30'>
                  <BookOpen className='h-5 w-5 sm:h-6 sm:w-6 dark:text-primary-foreground' />
                </div>
                <H3 className='mb-1 font-semibold text-base sm:text-lg'>Deeper Understanding</H3>
                <P className='text-muted-foreground text-sm sm:text-base'>
                  Explore the Bible with AI-powered insights, highlighting verses, and seamless
                  navigation between translations.
                </P>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className='hover:-translate-y-1 animate-fade-in overflow-hidden border transition-all [animation-delay:100ms] hover:scale-105 hover:border-primary hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/40'>
              <CardContent className='flex flex-col items-center p-4 text-center'>
                <div className='mb-3 animate-pulse rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-2 [animation-delay:200ms] dark:from-primary/30 dark:to-accent/30'>
                  <MessageCircle className='h-5 w-5 sm:h-6 sm:w-6 dark:text-primary-foreground' />
                </div>
                <H3 className='mb-1 font-semibold text-base sm:text-lg'>AI Conversations</H3>
                <P className='text-muted-foreground text-sm sm:text-base'>
                  Engage in meaningful dialogues with AI bots for insightful explanations and
                  interpretations of any verse.
                </P>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className='hover:-translate-y-1 animate-fade-in overflow-hidden border transition-all [animation-delay:200ms] hover:scale-105 hover:border-primary hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/40'>
              <CardContent className='flex flex-col items-center p-4 text-center'>
                <div className='mb-3 animate-pulse rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-2 [animation-delay:400ms] dark:from-primary/30 dark:to-accent/30'>
                  <Search className='h-5 w-5 sm:h-6 sm:w-6 dark:text-primary-foreground' />
                </div>
                <H3 className='mb-1 font-semibold text-base sm:text-lg'>Advanced Search</H3>
                <P className='text-muted-foreground text-sm sm:text-base'>
                  Discover interconnected verses with our powerful vector search, uncovering deep
                  semantic relationships.
                </P>
              </CardContent>
            </Card>
            <Card className='hover:-translate-y-1 animate-fade-in overflow-hidden border transition-all [animation-delay:300ms] hover:scale-105 hover:border-primary hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/40'>
              <CardContent className='flex flex-col items-center p-4 text-center'>
                <div className='mb-3 animate-pulse rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-2 [animation-delay:600ms] dark:from-primary/30 dark:to-accent/30'>
                  <Sunrise className='h-5 w-5 sm:h-6 sm:w-6 dark:text-primary-foreground' />
                </div>
                <H3 className='mb-1 font-semibold text-base sm:text-lg'>Daily Devotions</H3>
                <P className='text-muted-foreground text-sm sm:text-base'>
                  Get a daily devotional with a verse of the day, a daily prayer, and a daily
                  reflection.
                </P>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <section className='py-10'>
        <div className='container mx-auto px-4'>
          <div className='animate-blur-in rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 p-6 shadow-lg transition-all hover:from-primary/15 hover:to-accent/15 sm:p-8 dark:from-primary/20 dark:to-accent/20 dark:shadow-primary/20 dark:hover:from-primary/25 dark:hover:to-accent/25'>
            <div className='mx-auto max-w-2xl text-center'>
              <H2 className='mb-4 animate-fade-in font-bold text-2xl tracking-tight sm:text-3xl'>
                Start Your Bible Discovery Journey Today
              </H2>
              <P className='mb-6 animate-fade-in text-muted-foreground [animation-delay:100ms]'>
                Join 1,000+ believers already experiencing Scripture in a whole new way.
              </P>
              <div className='flex flex-wrap justify-center gap-3'>
                <div className='flex w-full max-w-xs flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0'>
                  <Button
                    size='lg'
                    className='w-full animate-fade-in bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md transition-transform hover:scale-105 hover:opacity-90 hover:shadow-lg dark:shadow-primary/20 dark:hover:shadow-primary/40'
                    asChild
                  >
                    <Link to='/pro'>Try Pro Free</Link>
                  </Button>
                  <Button
                    size='lg'
                    variant='outline'
                    className='w-full animate-fade-in border-primary/20 shadow transition-transform [animation-delay:100ms] hover:scale-105 hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg sm:size-lg dark:border-primary-foreground/50 dark:bg-background/80 dark:text-primary-foreground dark:shadow-primary-foreground/20 dark:hover:border-primary-foreground/70 dark:hover:bg-primary-foreground/10'
                    asChild
                  >
                    <Link to='/bible'>Read Now</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
