import type { Metadata } from 'next';
import LegalLayout, { P, H3, UL, Note, type LegalSection } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Drovo',
  description: 'How Drovo collects, uses, shares and protects your personal information.',
};

// ── Change these if anything below is not right for your business ──────────
const EMAIL = 'drovo@gmail.com';
const COMPANY = 'Drovo, operated by WealthyRealmint';   // use your registered company name
const LOCATION = 'Lagos, Nigeria';
const UPDATED = '25 October 2026';
const KEEP_YEARS = 'six (6)';                            // how long order / payment records are kept
// ───────────────────────────────────────────────────────────────────────────

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are and what this covers',
    body: (
      <>
        <P>
          Drovo is a marketplace. We connect you with local food vendors, fashion shops and property listings, and we get
          your orders to your door through independent riders. This policy covers the Drovo website, our apps, and every
          service we run through them, whether you use Drovo as a customer, a vendor or a rider.
        </P>
        <P>
          In this policy, “Drovo”, “we”, “us” and “our” mean {COMPANY}. “You” means anyone who visits or uses our platform.
          “Personal information” means anything that identifies you or can be linked to you, such as your name, phone number,
          email address or delivery address.
        </P>
        <P>
          We try to follow the Nigeria Data Protection Act, 2023 (NDPA) and the other data protection rules that apply to us.
          If something here is unclear, email us at <a className="font-bold text-orange-600 hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a> and we will explain it.
        </P>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'When we change this policy',
    body: (
      <>
        <P>
          Drovo is growing, and so are the things we build. When our practices change, or the law does, we will update this
          page and change the “last updated” date at the top. We will review the policy at least once a year.
        </P>
        <P>
          If we make a change that really affects you, such as using your information for something new, we will tell you in
          the app or by email before it takes effect. Please check back from time to time.
        </P>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'The information we collect',
    body: (
      <>
        <P>What we collect depends on how you use Drovo. We try to ask only for what we genuinely need.</P>

        <H3>Everyone</H3>
        <UL items={[
          'Your name, email address, phone number and password (your password is stored in a scrambled form, so we cannot read it).',
          'Your account details, such as your role (customer, vendor or rider), your city, and your notification choices.',
          'Technical details about how you connect: your IP address, browser or device type, and the pages and features you use.',
          'Messages you send us when you contact support or report a problem.',
        ]} />

        <H3>Customers</H3>
        <UL items={[
          'Delivery addresses you save, including the map pin you drop so a rider can find you.',
          'Your orders: what you ordered, from which vendor, when, the amounts, and whether it was delivered, cancelled or refunded.',
          'Payment details we receive back from Paystack: the payment reference, amount, status and channel (card or bank transfer). We never see or store your full card number.',
          'Your reviews and ratings.',
        ]} />

        <H3>Vendors</H3>
        <UL items={[
          'Your store details: store name, category, logo and cover images, phone number, address and map location.',
          'The products, prices and listings you add, and the orders you receive.',
          'Your bank details (bank, account number and account name) so we can pay you. We check the account with Paystack when you add it.',
          'Your earnings, commission and payout history.',
        ]} />

        <H3>Riders</H3>
        <UL items={[
          'Your vehicle type and plate number, the city you work in, and an emergency contact if you choose to add one.',
          'Your live location while you are online or on a delivery, so customers can follow their order and so we can match you with nearby jobs.',
          'Your deliveries, cash collected on delivery, earnings and payout history.',
          'Your bank details so we can pay you, checked with Paystack.',
        ]} />

        <P>
          If you give us information about another person, such as an emergency contact or a friend you are ordering for, we
          assume that person knows and has agreed. Please do not share someone’s details unless you are allowed to.
        </P>
      </>
    ),
  },
  {
    id: 'how-we-collect',
    title: 'How we collect it',
    body: (
      <>
        <P>We collect information in three ways:</P>
        <UL items={[
          <><strong className="text-gray-800">From you</strong>, when you sign up, fill in a form, save an address, place an order, add a bank account, or message us.</>,
          <><strong className="text-gray-800">Automatically</strong>, as you use Drovo: your device, IP address, location (with your permission) and how you move around the platform.</>,
          <><strong className="text-gray-800">From others</strong>, such as Paystack (confirming a payment or checking a bank account) and your browser (if you allow notifications).</>,
        ]} />
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use your information',
    body: (
      <>
        <P>We use your information to:</P>
        <UL items={[
          'Create and run your account, and confirm that you are who you say you are.',
          'Show you vendors near you, take your order, pass it to the vendor and a rider, and get it delivered.',
          'Process payments, refunds and payouts to vendors and riders.',
          'Send you updates about your orders, such as “your order is on the way”, plus receipts and security alerts.',
          'Give you support and sort out complaints and disputes.',
          'Spot and prevent fraud, abuse and illegal activity, and keep the platform safe for customers, vendors and riders.',
          'Understand how Drovo is used so we can fix problems and build better features.',
          'Meet our legal, tax and accounting duties, and defend our rights if there is a legal claim.',
          'Send you offers and news, but only if you have agreed (see “Messages and notifications” below).',
        ]} />
        <P>We do not use your information for anything else without asking you first.</P>
      </>
    ),
  },
  {
    id: 'legal-basis',
    title: 'Why we are allowed to use it',
    body: (
      <>
        <P>Under the NDPA we need a lawful reason to use your information. Ours are:</P>
        <UL items={[
          <><strong className="text-gray-800">To do what we promised you.</strong> We need your name, phone number and address to deliver your order. Without them we simply cannot do it.</>,
          <><strong className="text-gray-800">Your consent.</strong> For example, when you allow location access or turn on notifications. You can take your consent back at any time.</>,
          <><strong className="text-gray-800">The law.</strong> Some records, like payment and tax records, we must keep.</>,
          <><strong className="text-gray-800">Our legitimate interests.</strong> Keeping Drovo secure, preventing fraud and improving our service, as long as that does not override your rights.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'location',
    title: 'Your location',
    body: (
      <>
        <P>
          Location is central to how Drovo works. When you drop a pin or use “Use my location”, we save that point as your
          delivery spot so a rider can find your door. We use it to work out your delivery fee and to find vendors and riders
          close to you.
        </P>
        <P>
          Riders share their live location while they are online or carrying out a delivery. The customer for that order can
          see it on the tracking map until the order is finished.
        </P>
        <P>
          Your phone or browser asks for your permission first, and you can turn location off at any time in your device
          settings. Some features, like finding nearby vendors, will not work properly without it, but you can still type an
          address or drop a pin on the map by hand.
        </P>
        <P>
          When you search for a place on the map, the words you type are sent through our server to a mapping service
          (currently OpenStreetMap, and possibly Google Maps in future) to find matches. We do not send your name or account
          details along with it.
        </P>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and similar technology',
    body: (
      <>
        <P>
          We use small bits of data stored in your browser, such as cookies and local storage, to make Drovo work. These keep
          you logged in, remember your cart, and save what you typed at checkout (like your address) so you do not lose it if
          you refresh the page. They also help us keep your account secure.
        </P>
        <P>
          Right now we do not run third-party advertising trackers on Drovo. If that ever changes, we will update this page
          and ask for your permission where the law requires it.
        </P>
        <P>
          You can clear or block cookies in your browser settings. If you do, you may be logged out and parts of the site
          may stop working properly. Cookies on their own cannot tell us who you are, and they do not harm your device.
        </P>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payments',
    body: (
      <>
        <P>
          Payments on Drovo are handled by <strong className="text-gray-800">Paystack</strong>. When you pay by card, you type
          your card details into Paystack’s secure window, not ours, so your full card number never reaches Drovo’s servers.
          For bank transfers, Paystack gives you a transfer account number that belongs to you and tells us when your money
          arrives.
        </P>
        <P>
          What we keep is the payment reference, the amount, the status and the payment method, so we can match a payment to
          your order, handle refunds and answer questions.
        </P>
        <P>
          Vendors and riders add a bank account so Drovo can pay them. We use Paystack to confirm the account name, and we
          store the bank, account number and account name for payouts. Paystack has its own privacy policy, which applies to
          the information you give it.
        </P>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <P>
          <strong className="text-gray-800">We do not sell or rent your personal information.</strong> We share it only when
          it is needed to run Drovo, or when the law requires it:
        </P>
        <UL items={[
          <><strong className="text-gray-800">Vendors</strong> see your name, phone number, delivery address and what you ordered, so they can prepare your order.</>,
          <><strong className="text-gray-800">Riders</strong> see the pickup and delivery address, your phone number and your name so they can complete your delivery. You can see your rider’s name, vehicle and live location during delivery.</>,
          <><strong className="text-gray-800">Service providers</strong> that help us run the platform: Paystack (payments), Supabase (our database and sign-in), our hosting provider, our email provider, and map services. They may only use your information to do their job for us.</>,
          <><strong className="text-gray-800">Authorities and courts</strong>, when the law requires it or when we need to protect people, prevent fraud, or defend our legal rights.</>,
          <><strong className="text-gray-800">Another company</strong>, if Drovo is ever merged with or taken over by one. We would tell you and make sure your information stays protected.</>,
        ]} />
        <P>
          Where we share information with a service provider, we ask them to protect it and to use it only for the purpose we
          gave it to them.
        </P>
      </>
    ),
  },
  {
    id: 'vendors-and-others',
    title: 'Vendors, riders and other websites',
    body: (
      <>
        <P>
          Vendors on Drovo are independent businesses and riders are independent partners. When they receive your details to
          complete an order, they are expected to use them only for that order. This policy covers how Drovo handles your
          information. It does not cover how a vendor or rider runs their own business outside our platform.
        </P>
        <P>
          Drovo is not responsible for what a vendor says about their products. We do our best to keep listings honest, but
          we cannot guarantee that every description is complete or accurate. If something is wrong with an order, contact
          us and we will help sort it out.
        </P>
        <P>
          Our platform may link to other websites or services. They have their own privacy policies, and we are not
          responsible for how they handle your information. We suggest you read theirs before sharing anything.
        </P>
      </>
    ),
  },
  {
    id: 'messages',
    title: 'Messages and notifications',
    body: (
      <>
        <P>
          We send you messages about your orders and account: emails, in-app notifications and, if you allow them, browser or
          phone push notifications. Order updates, receipts and security messages are part of the service, so you will keep
          getting those while you have an account.
        </P>
        <P>
          You can choose which notifications you get in <strong className="text-gray-800">Settings</strong> inside your
          account. If we send you offers or news, you can say no at any time by changing your settings or using the
          “unsubscribe” link in the email.
        </P>
        <P>
          If you contact our support team, we may keep a record of the conversation so we can help you properly, check the
          quality of our service, and settle any disputes.
        </P>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Where we keep it and how we protect it',
    body: (
      <>
        <P>
          We protect your information with a mix of technical and organisational measures. Connections to Drovo are encrypted
          (look for the padlock and “https” in your address bar). Access to our database is controlled so that people can only
          see the data they are meant to see, and only our staff who need it to do their job can reach customer information.
          We also limit repeated login attempts and other suspicious activity to protect accounts from being guessed or abused.
        </P>
        <P>
          Our service providers may store information on servers outside Nigeria. When that happens, we make sure the transfer
          follows the NDPA and that suitable protections are in place.
        </P>
        <Note>
          No system on the internet is perfectly safe, so we cannot promise absolute security. You can help by using a strong,
          unique password, keeping it to yourself, and logging out on shared devices. Drovo will never ask you for your
          password or a payment code by phone, SMS or social media. If you think your account has been broken into, change
          your password and email us straight away.
        </Note>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <>
        <P>
          We keep your account information for as long as your account is open. If you delete your account, we remove or
          anonymise your personal details, except for what we are legally required, or have a real need, to keep.
        </P>
        <P>
          That means order, payment, refund and payout records are kept for up to {KEEP_YEARS} years after your last activity,
          because tax, accounting and dispute rules require it. Security logs, like login attempts, are kept only for a short
          time. When we no longer need information, we delete it or make it anonymous.
        </P>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <P>You are in control of your information. You have the right to:</P>
        <UL items={[
          'Know what personal information we hold about you and get a copy of it.',
          'Correct anything that is wrong or out of date. Much of this you can do yourself in your account.',
          'Ask us to delete your information, where we are not required to keep it.',
          'Ask us to limit how we use your information, or to stop using it for a particular purpose such as marketing.',
          'Take back a consent you gave us, such as location access or notifications.',
          'Ask for your information in a format that you can move to another service.',
        ]} />
        <P>
          To use any of these rights, email <a className="font-bold text-orange-600 hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a> from
          the email address on your account. We may need to confirm that it is really you first. We aim to reply within one
          month.
        </P>
        <P>
          If you are not happy with how we handled your information, please talk to us first and we will do our best to put
          it right. You also have the right to complain to the Nigeria Data Protection Commission (NDPC).
        </P>
      </>
    ),
  },
  {
    id: 'delete-account',
    title: 'Deleting your account',
    body: (
      <>
        <P>
          Customers can ask to delete their account from <strong className="text-gray-800">Settings</strong> in their account
          page. We will not be able to complete it while you have an order in progress, so please let those finish or cancel
          them first. You can change your mind and cancel the request before it is carried out.
        </P>
        <P>
          Vendors and riders who want to close their account should email us. We will first settle any money owed, either
          to you or to Drovo, such as cash a rider collected on delivery, before we close it.
        </P>
        <P>
          After deletion, we keep only the records described in “How long we keep it”.
        </P>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <P>
        Drovo is meant for people aged 18 and over. We do not knowingly collect information from children. If you believe a
        child has given us their information, please email us and we will delete it.
      </P>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <>
        <P>Questions, requests or worries about your privacy? We would like to hear from you.</P>
        <UL items={[
          <>Email: <a className="font-bold text-orange-600 hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a></>,
          <>Location: {LOCATION}</>,
        ]} />
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      variant="privacy"
      title="Privacy Policy"
      updated={UPDATED}
      intro="Drovo connects you with local vendors and gets your orders delivered. To do that, we need to know a few things about you. This page explains in plain language what we collect, why we collect it, who sees it, and what control you have. Please read it together with our Terms of Use."
      summary={[
        'We collect only what we need to run orders, deliveries and payments.',
        'We never sell your personal information.',
        'Your card details go straight to Paystack. They never touch our servers.',
        'Your location is used to find nearby vendors and to deliver to the right door.',
        'You can ask to see, fix or delete your information at any time.',
      ]}
      sections={sections}
      other={{ href: '/terms', label: 'Terms of Use' }}
      contactEmail={EMAIL}
    />
  );
}