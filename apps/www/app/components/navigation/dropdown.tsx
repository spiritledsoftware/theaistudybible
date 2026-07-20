import { useAuth } from '@/www/hooks/use-auth';
import { useBeforeLeave } from '@/www/hooks/use-before-leave';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  CreditCard,
  EllipsisVertical,
  FileText,
  HelpCircle,
  Info,
  Lightbulb,
  Mail,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export type NavigationDropdownProps = React.ComponentProps<typeof Button>;

export const NavigationDropdown = ({ children, ...props }: NavigationDropdownProps) => {
  const navigate = useNavigate();

  const { isAdmin } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  useBeforeLeave(() => setIsOpen(false));

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button {...props}>{children ?? <EllipsisVertical />}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side='top' className='w-[250px]'>
        <DropdownMenuItem
          className='flex w-full items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground focus:bg-primary/80 focus:text-primary-foreground'
          asChild
        >
          <Link to='/about/install'>Install</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>About</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className='w-[150px]'>
              {/**
               * Can't use regular links here because navigation link clicks are broken on mobile
               * TODO: Remove this once this issue is fixed: https://github.com/kobaltedev/kobalte/issues/446
               */}
              <DropdownMenuItem
                onSelect={() => navigate({ to: '/about' })}
                className='flex items-center gap-2'
              >
                <Info size={18} /> About
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: '/about/faq' })}>
                <HelpCircle size={18} /> FAQ
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: '/privacy' })}>
                <Shield size={18} /> Privacy
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: '/terms' })}>
                <FileText size={18} /> Terms
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => window.open('mailto:support@theaistudybible.com', '_blank')}
              >
                <Mail size={18} /> Contact
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => window.open(import.meta.env.VITE_DONATION_LINK, '_blank')}
              >
                <CreditCard size={18} /> Donate
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Bible</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to='/bible'>
              <BookOpen size={18} /> Read
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>AI</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to='/chat'>
              <MessageCircle size={18} /> Chat
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/devotion'>
              <Lightbulb size={18} /> Devotions
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to='/pro'>
              <CreditCard size={18} /> Upgrade to Pro
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className='flex items-center gap-2'>
              <Link to='/admin'>Admin</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
