import { Logo } from '@/www/components/branding/logo';
import { Logo as SpiritLedSoftwareLogo } from '@/www/components/branding/spirit-led-software/logo';
import { GitHub } from '@/www/components/ui/brand-icons';
import { Button } from '@/www/components/ui/button';
import { Separator } from '@/www/components/ui/separator';
import { Link } from '@tanstack/react-router';
import { Copyright } from 'lucide-react';

export const NavigationFooter = () => {
  return (
    <footer className='standalone:hidden bg-muted/30 py-2 text-muted-foreground sm:py-4'>
      <div className='container mx-auto px-4'>
        <div className='mb-6 flex flex-col items-center'>
          <Logo className='mb-4 h-8 sm:h-12' />
          <div className='mb-4 flex items-center gap-2 text-center text-xs sm:text-sm'>
            <Copyright className='inline-block' /> {new Date().getFullYear()}{' '}
            <a
              href='https://spiritledsoftware.com'
              target='_blank'
              className='inline-block'
              rel='noreferrer'
            >
              <SpiritLedSoftwareLogo className='h-5 sm:h-6' />
            </a>
            All rights reserved.
          </div>
        </div>

        <Separator className='my-4 h-[2px] bg-primary/20' />

        <div className='flex flex-col items-center gap-3'>
          <div className='grid grid-cols-3 xs:grid-cols-2 gap-2 text-center text-sm sm:flex sm:gap-2'>
            <Button variant='link' size='sm' asChild>
              <Link to='/about'>About</Link>
            </Button>
            <Button variant='link' size='sm' asChild>
              <a href='mailto:support@theaistudybible.com'>Contact</a>
            </Button>
            <Button variant='link' size='sm' asChild>
              <Link
                to={import.meta.env.VITE_DONATION_LINK}
                target='_blank'
                rel='noopener noreferrer'
              >
                Donate
              </Link>
            </Button>
            <Button variant='link' size='sm' asChild>
              <Link to='/privacy'>Privacy</Link>
            </Button>
            <Button variant='link' size='sm' asChild>
              <Link to='/terms'>Terms</Link>
            </Button>
            <Button variant='link' size='sm' asChild>
              <a
                href='https://github.com/spirit-led-software/theaistudybible'
                target='_blank'
                rel='noopener noreferrer'
              >
                <GitHub className='size-3' /> GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};
