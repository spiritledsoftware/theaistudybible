import { useAuth } from '@/www/hooks/use-auth';
import { Link } from '@tanstack/react-router';
import {
  BookOpen,
  Bookmark,
  CreditCard,
  CreditCardIcon,
  Download,
  FileText,
  HelpCircle,
  Highlighter,
  Info,
  Lightbulb,
  Mail,
  MessageCircle,
  Notebook,
  Shield,
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../ui/navigation-menu';
import { H6, P } from '../ui/typography';

export type MenuProps = {
  orientation?: 'vertical' | 'horizontal';
};

export const Menu = (props: MenuProps) => {
  const { isAdmin } = useAuth();

  return (
    <NavigationMenu orientation={props.orientation} className='w-full gap-1'>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className='flex flex-row items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground focus:bg-primary/80 focus:text-primary-foreground'
          >
            <Link to='/about/install'>
              <Download className='text-primary-foreground' />
              Install
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='justify-between bg-transparent'>
            About
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid w-[500px] grid-cols-3 gap-2'>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/about'>
                    <H6 className='flex items-center gap-2'>
                      <Info />
                      About
                    </H6>
                    <P>Learn about our mission</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/about/faq'>
                    <H6 className='flex items-center gap-2'>
                      <HelpCircle />
                      FAQ
                    </H6>
                    <P>Frequently asked questions</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/privacy'>
                    <H6 className='flex items-center gap-2'>
                      <Shield />
                      Privacy
                    </H6>
                    <P>Learn about our privacy practices</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/terms'>
                    <H6 className='flex items-center gap-2'>
                      <FileText />
                      Terms
                    </H6>
                    <P>Learn about our terms of service</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <a href='mailto:support@theaistudybible.com'>
                    <H6 className='flex items-center gap-2'>
                      <Mail />
                      Contact
                    </H6>
                    <P>Contact us via email</P>
                  </a>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <a href={import.meta.env.VITE_DONATION_LINK}>
                    <H6 className='flex items-center gap-2'>
                      <CreditCard />
                      Donate
                    </H6>
                    <P>Support our mission</P>
                  </a>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='justify-between bg-transparent'>
            Bible
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid w-[400px] grid-cols-2 gap-2'>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/bible'>
                    <H6 className='flex items-center gap-2'>
                      <BookOpen />
                      Read
                    </H6>
                    <P>Read the Bible</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/profile/highlights'>
                    <H6 className='flex items-center gap-2'>
                      <Highlighter />
                      Highlights
                    </H6>
                    <P>View your highlights</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/profile/notes'>
                    <H6 className='flex items-center gap-2'>
                      <Notebook />
                      Notes
                    </H6>
                    <P>View your notes</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/profile/bookmarks'>
                    <H6 className='flex items-center gap-2'>
                      <Bookmark />
                      Bookmarks
                    </H6>
                    <P>View your bookmarks</P>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='justify-between bg-transparent'>
            AI
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid w-[500px] grid-cols-3 gap-2'>
              <li className='h-full w-full'>
                <NavigationMenuLink asChild>
                  <Link to='/chat'>
                    <H6 className='flex items-center gap-2'>
                      <MessageCircle />
                      Chat
                    </H6>
                    <P>Engage with AI about Christianity</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/devotion'>
                    <H6 className='flex items-center gap-2'>
                      <Lightbulb />
                      Devotions
                    </H6>
                    <P>View today's devotion</P>
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className='h-full w-full'>
                <NavigationMenuLink className='h-full w-full' asChild>
                  <Link to='/pro'>
                    <H6 className='flex items-center gap-2'>
                      <CreditCardIcon />
                      Pro
                    </H6>
                    <P>Unlock Pro AI features</P>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {isAdmin && (
          <NavigationMenuItem>
            <NavigationMenuLink asChild className='flex flex-row items-center gap-2 bg-transparent'>
              <Link to='/admin'>
                <Shield />
                Admin
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
};
