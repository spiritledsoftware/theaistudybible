import { Firefox, Safari } from '@/www/components/ui/brand-icons';
import { buttonVariants } from '@/www/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/www/components/ui/card';
import { Spinner } from '@/www/components/ui/spinner';
import { GradientH1, ListItem, OrderedList, P, Strong } from '@/www/components/ui/typography';
import { cn } from '@/www/lib/utils';
import { createFileRoute } from '@tanstack/react-router';
import { EllipsisVertical, Globe, HousePlus, MonitorUp, Plus, Share } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/_with-footer/_with-header/about/install')({
  head: () => {
    const title = 'Install The AI Study Bible - Access Scripture Anywhere';
    const description =
      'Learn how to install The AI Study Bible on your device. Get easy access to AI-powered Bible study tools, offline reading, and personalized insights on any platform.';

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { name: 'og:title', content: title },
        { name: 'og:description', content: description },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(true);
  const [userAgent, setUserAgent] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setUserAgent(navigator.userAgent.toLowerCase());
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    setIsLoading(false);
  }, []);

  const isIOS = useMemo(() => /iphone|ipad|ipod/.test(userAgent), [userAgent]);
  const isAndroid = useMemo(() => /android/.test(userAgent), [userAgent]);
  const isChrome = useMemo(
    () => /chrome/.test(userAgent) && !/edge|opr\//.test(userAgent),
    [userAgent],
  );
  const isFirefox = useMemo(() => /firefox/.test(userAgent), [userAgent]);
  const isSafari = useMemo(
    () => /safari/.test(userAgent) && !/chrome|opera|edge/.test(userAgent),
    [userAgent],
  );
  const isOpera = useMemo(() => /opr\/|opera/.test(userAgent), [userAgent]);
  const isEdge = useMemo(() => /edg/.test(userAgent), [userAgent]);
  const isMac = useMemo(() => /macintosh|mac os x/.test(userAgent), [userAgent]);
  const isWindows = useMemo(() => /windows/.test(userAgent), [userAgent]);

  return (
    <>
      <div className='mx-auto max-w-2xl p-4'>
        {isStandalone ? (
          <Card className='bg-green-100 text-green-800'>
            <CardHeader>
              <CardTitle>You've already installed the PWA!</CardTitle>
            </CardHeader>
            <CardContent>
              <P>You're currently using the app in standalone mode. Enjoy!</P>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className='mb-4'>
              <GradientH1>Install as an App</GradientH1>
              <P>Follow these steps to install our Progressive Web App on your device:</P>
            </div>

            {isIOS && isSafari && (
              <InstallInstructions
                icon={<Safari className='mr-2 inline-block size-6' />}
                steps={[
                  <ListItem key='1'>
                    Tap the Share button (<Share className='inline-block size-4' />) in Safari's
                    bottom menu
                  </ListItem>,
                  <ListItem key='2'>
                    Scroll down and tap <Strong>Add to Home Screen</Strong>
                  </ListItem>,
                  <ListItem key='3'>
                    Tap <Strong>Add</Strong> in the top right corner
                  </ListItem>,
                ]}
              />
            )}

            {isAndroid && isChrome && (
              <InstallInstructions
                icon={<Globe className='mr-2 inline-block size-6' />}
                steps={[
                  <ListItem key='1'>
                    Tap the menu icon (
                    <EllipsisVertical className='inline-block size-4' />) in the top right
                  </ListItem>,
                  <ListItem key='2'>
                    Tap <Strong>Add to Home screen</Strong>
                  </ListItem>,
                  <ListItem key='3'>
                    Tap <Strong>Add</Strong> on the popup
                  </ListItem>,
                ]}
              />
            )}

            {isChrome && (isMac || isWindows) && (
              <InstallInstructions
                icon={<Globe className='mr-2 inline-block size-6' />}
                steps={[
                  <ListItem key='1'>
                    Click the install icon in the address bar (
                    <MonitorUp className='inline-block size-4' />)
                  </ListItem>,
                  <ListItem key='2'>
                    Click <Strong>Install</Strong> in the popup
                  </ListItem>,
                ]}
              />
            )}

            {isFirefox && (isMac || isWindows) && (
              <InstallInstructions
                icon={<Firefox className='mr-2 inline-block size-6' />}
                steps={[
                  <ListItem key='1'>
                    Click the install icon in the address bar (
                    <HousePlus className='inline-block size-4' />)
                  </ListItem>,
                  <ListItem key='2'>
                    Click <Strong>Install</Strong> in the popup
                  </ListItem>,
                ]}
              />
            )}

            {isEdge && (isMac || isWindows) && (
              <InstallInstructions
                icon={<Globe className='mr-2 inline-block size-6' />}
                steps={[
                  <ListItem key='1'>
                    Click the install icon in the address bar (
                    <Plus className='inline-block size-4' />) or (
                    <Globe className='inline-block size-4' />)
                  </ListItem>,
                  <ListItem key='2'>
                    Click <Strong>Install</Strong> in the popup
                  </ListItem>,
                ]}
              />
            )}

            {isOpera && (isMac || isWindows) && (
              <InstallInstructions
                icon={<Globe className='mr-2 inline-block size-6' />}
                steps={[
                  <ListItem key='1'>
                    Click the install icon in the address bar (
                    <MonitorUp className='inline-block size-4' />)
                  </ListItem>,
                  <ListItem key='2'>
                    Click <Strong>Install</Strong> in the popup
                  </ListItem>,
                ]}
              />
            )}

            {isLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Spinner className='mr-2 inline-block size-4' />
                    Loading...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <P>Please wait while we check your browser for installation support.</P>
                </CardContent>
              </Card>
            )}

            {!isIOS &&
              !isAndroid &&
              !isChrome &&
              !isFirefox &&
              !isEdge &&
              !isOpera &&
              !isLoading && (
                <Card className='bg-yellow-100'>
                  <CardTitle>
                    <CardTitle>Unsupported Browser</CardTitle>
                  </CardTitle>
                  <CardContent>
                    <P>
                      Your current browser may not support PWA installation. Try using a modern
                      browser like Chrome, Firefox, or Edge for the best experience.
                    </P>
                  </CardContent>
                </Card>
              )}

            <Card className='mt-8 bg-blue-100 text-blue-800'>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <P>
                  If you're having trouble installing the PWA, please make sure you're using the
                  latest version of your browser. If you still need assistance, don't hesitate to
                  <a
                    className={cn(buttonVariants({ variant: 'link' }), 'inline-block w-fit px-0')}
                    href='mailto:support@theaistudybible.com'
                  >
                    contact our support team
                  </a>
                  .
                </P>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

function InstallInstructions(props: { icon: React.ReactNode; steps: React.ReactNode[] }) {
  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle>
          {props.icon}
          Installation Steps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <OrderedList>
          {props.steps.map((step) =>
            typeof step === 'string' ? (
              <li key={step} className='mb-1'>
                {step}
              </li>
            ) : (
              step
            ),
          )}
        </OrderedList>
      </CardContent>
    </Card>
  );
}
