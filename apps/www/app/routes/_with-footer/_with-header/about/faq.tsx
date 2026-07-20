import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/www/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/www/components/ui/tabs';
import { GradientH1, H2, Lead, P } from '@/www/components/ui/typography';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_with-footer/_with-header/about/faq')({
  head: () => {
    const title = 'FAQ | The AI Study Bible';
    const description =
      'Find answers to frequently asked questions about The AI Study Bible - covering features, pricing, privacy, technical aspects, and more.';
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

type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  name: string;
  value: string;
  faqs: FAQItem[];
};

const faqCategories: FAQCategory[] = [
  {
    name: 'General',
    value: 'general',
    faqs: [
      {
        question: 'What is The AI Study Bible?',
        answer:
          'The AI Study Bible is a modern digital platform that combines traditional biblical study with artificial intelligence to provide deeper insights and understanding of scripture. It offers interactive study tools, AI-powered conversations, advanced semantic search, and personalized study experiences while maintaining respect for the sacred text.',
      },
      {
        question: 'What features are available?',
        answer:
          'Our platform includes: AI-powered insights and verse explanations, interactive conversations about scripture, advanced semantic search for discovering related verses, daily devotionals with personalized reflections, multiple Bible translations, verse highlighting, and seamless navigation between translations. We continuously add new features to enhance your study experience.',
      },
      {
        question: 'Can I use the app offline?',
        answer:
          'Yes, The AI Study Bible is available as a Progressive Web App (PWA) that you can install on your device. This allows you to access basic features and read the Bible offline. However, AI-powered features require an internet connection to function.',
      },
      {
        question: 'What Bible translations are available?',
        answer:
          'We currently offer multiple Bible translations to support your study needs. Our platform allows seamless navigation between different translations, helping you compare and understand scripture from various perspectives. The specific translations available may vary, and we regularly work to add more options.',
      },
    ],
  },
  {
    name: 'Technology & AI',
    value: 'technology',
    faqs: [
      {
        question: 'How does the AI Bible assistant work?',
        answer:
          'Our AI Bible assistant uses advanced natural language processing to understand your questions and provide scripture-grounded responses. It has been trained on biblical texts and theological resources to offer insightful, contextually relevant answers while maintaining theological accuracy.',
      },
      {
        question: 'How accurate are the AI-generated insights?',
        answer:
          'Our AI is designed to provide biblically sound insights based on scholarly research and traditional interpretations. We maintain high standards of accuracy by training our AI on trusted theological sources. However, we encourage users to view AI insights as study aids rather than definitive interpretations, and to always verify insights against Scripture and trusted theological resources.',
      },
      {
        question: 'What is vector similarity search?',
        answer:
          'This advanced search technology finds conceptually related passages beyond simple keyword matching. It uses AI to understand the meaning behind verses and helps you discover deeper connections in Scripture that might not be apparent through traditional word-based searches.',
      },
    ],
  },
  {
    name: 'Privacy & Support',
    value: 'privacy',
    faqs: [
      {
        question: 'Is my data private and secure?',
        answer:
          'Yes, we take your privacy and security seriously. We implement appropriate technical and organizational security measures to protect your personal information. We only collect necessary data to provide our services, and we never share your personal information without your consent. You can read our detailed privacy policy for more information about how we handle your data.',
      },
      {
        question: 'How can I get help or support?',
        answer:
          'If you need assistance, you can contact our support team at support@theaistudybible.com. We also welcome feedback and suggestions through our feedback form. For technical issues with installation or usage, check our installation guide or reach out to our support team directly.',
      },
      {
        question: 'What happens to my data if I cancel?',
        answer:
          'Your personal notes, highlights, and saved content remain accessible even if you downgrade to a free account. You can export your data at any time.',
      },
    ],
  },
  {
    name: 'Billing & Plans',
    value: 'billing',
    faqs: [
      {
        question: 'Do I need to pay to use the service?',
        answer:
          'We offer a Free plan for the core study experience and a Pro subscription with higher usage limits. You can start free and upgrade anytime.',
      },
      {
        question: 'What are the differences between Free and Pro plans?',
        answer:
          'Free and Pro Readers receive the same AI answer quality and access to every rights-verified Bible translation. Pro provides higher usage limits for the AI Scripture Assistant, Semantic Scripture Search, suggestions, and image generation.',
      },
      {
        question: 'When will I be charged for a Pro subscription?',
        answer:
          "Your 7-day free trial starts immediately when you sign up for Pro. You won't be charged until the trial ends, and you can cancel anytime before then at no cost.",
      },
      {
        question: 'How do I cancel my subscription?',
        answer:
          "You can cancel your subscription anytime from your account settings. If you cancel during the trial period, you won't be charged.",
      },
    ],
  },
];

function RouteComponent() {
  return (
    <>
      <div className='mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl'>
          <GradientH1>Frequently Asked Questions</GradientH1>
          <Lead className='mt-4 text-muted-foreground'>
            Find answers to common questions about The AI Study Bible platform. Can't find what
            you're looking for? Feel free to contact our support team at
            support@theaistudybible.com.
          </Lead>
        </div>

        <div className='mt-12 max-w-4xl'>
          <Tabs defaultValue='general' className='w-full'>
            <TabsList className='mb-8 grid h-fit w-full grid-cols-1 border border-border sm:grid-cols-2 md:grid-cols-4'>
              {faqCategories.map((category) => (
                <TabsTrigger
                  key={category.value}
                  value={category.value}
                  className='data-[state=active]:bg-muted data-[state=active]:text-foreground'
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {faqCategories.map((category) => (
              <TabsContent key={category.value} value={category.value}>
                <H2 className='mb-4 font-semibold text-2xl'>{category.name} Questions</H2>
                <Accordion type='multiple' className='rounded-md border border-border'>
                  {category.faqs.map((faq) => (
                    <AccordionItem
                      key={`${category.value}-${faq.question}`}
                      value={`${category.value}-${faq.question}`}
                      className='border-border'
                    >
                      <AccordionTrigger className='p-5 text-left hover:bg-muted/20'>
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className='bg-muted/5 p-5'>
                        <P className='text-muted-foreground'>{faq.answer}</P>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </>
  );
}
