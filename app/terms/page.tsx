import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban } from 'lucide-react';
import LegalLayout, { P, H3, UL, Note, type LegalSection } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Use | Drovo',
  description: 'The rules for using Drovo as a customer, vendor or rider.',
};

// ── Change these if anything below is not right for your business ──────────
const EMAIL = 'drovo@gmail.com';
const COMPANY = 'Drovo, operated by WealthyRealmint';   // use your registered company name
const UPDATED = '25 October 2026';
const VENDOR_COMMISSION = '12%';                         // Drovo’s cut of the item subtotal
// ───────────────────────────────────────────────────────────────────────────

const mail = (
  <a className="font-bold text-orange-600 hover:underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>
);
const strong = (t: string) => <strong className="text-gray-800">{t}</strong>;

/** A small card used in the “what is not allowed” lists */
function Rule({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
      <p className="flex items-center gap-2 text-sm font-black text-gray-900 mb-2">
        <span className="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0"><Ban className="w-3.5 h-3.5" /></span>
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map(t => (
          <li key={t} className="flex gap-2 text-[13px] leading-5 text-gray-600">
            <span className="mt-[7px] w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />{t}
          </li>
        ))}
      </ul>
    </div>
  );
}
function Rules({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3 mb-5">{children}</div>;
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{n}</span>
      <div>
        <p className="text-sm font-black text-gray-900">{title}</p>
        <p className="text-[14px] leading-6 text-gray-600">{text}</p>
      </div>
    </li>
  );
}

const sections: LegalSection[] = [
  {
    id: 'welcome',
    title: 'Welcome, and what these terms are',
    body: (
      <>
        <P>
          These Terms of Use are the rules for using the Drovo website and apps (together, the “Platform”). They are a legal
          agreement between you and {COMPANY} (“Drovo”, “we”, “us”). They apply to everyone who uses the Platform: customers,
          vendors, riders, and people who are just browsing.
        </P>
        <P>
          By creating an account, placing an order, listing something for sale, or taking a delivery on Drovo, you are saying
          you have read these terms and you agree to them. If you don’t agree, please don’t use Drovo.
        </P>
        <P>
          If a rule here isn’t clear, write to {mail} and we’ll explain it. Our <Link className="font-bold text-orange-600 hover:underline" href="/privacy">Privacy Policy</Link> is
          part of these terms too, and it explains how we handle your personal information.
        </P>
      </>
    ),
  },
  {
    id: 'what-drovo-is',
    title: 'What Drovo is (and what it isn’t)',
    body: (
      <>
        <P>
          Drovo is a marketplace. We connect customers with restaurants and food vendors, fashion sellers, and property owners
          and agents, and we arrange for orders to be delivered by delivery riders.
        </P>
        <UL items={[
          <>{strong('Vendors are independent businesses.')} Restaurants, fashion sellers, property owners and agents run their own businesses. They are not Drovo employees and Drovo does not own, prepare, inspect or stock what they sell.</>,
          <>{strong('Riders are independent partners.')} They deliver orders using their own vehicle and are not Drovo employees.</>,
          <>{strong('Drovo provides the platform.')} We build and run the tools that let all these people find each other, place orders, pay safely and track deliveries.</>,
        ]} />
        <P>
          Because of this, we can’t promise that every product description, photo, price or availability is perfectly accurate,
          or that every meal, item or property will be exactly as described. We work hard to keep listings honest and we act when
          we find a problem, but the vendor is responsible for what they list and sell.
        </P>
      </>
    ),
  },
  {
    id: 'your-account',
    title: 'Your account',
    body: (
      <>
        <P>To use most of Drovo you need an account. When you make one, you agree that:</P>
        <UL items={[
          'You are at least 18 years old and able to make a legally binding agreement.',
          'Everything you tell us is true and complete, and you will keep it up to date. That includes your name, phone number, email address, delivery address and, for vendors and riders, your business, vehicle and bank details.',
          'You will verify your email address when we ask. Some parts of Drovo stay locked until you do.',
          'You will keep your password to yourself. You are responsible for everything that happens on your account, so if you think someone else has got in, change your password and tell us straight away.',
          'You will not pretend to be someone else, or open an account for someone without their permission.',
        ]} />
        <P>
          For safety, we temporarily lock a login after several wrong password attempts, and we may ask you to prove who you are,
          or ask for extra documents, if something looks unusual. If we think an account has been compromised, we may ask you to
          reset your password.
        </P>
        <P>
          You can close your account at any time from your account settings (customers) or by emailing us (vendors and riders).
          What happens to your information afterwards is explained in our Privacy Policy.
        </P>
      </>
    ),
  },
  {
    id: 'food',
    title: 'Ordering food',
    body: (
      <>
        <P>Customers can order meals and other food items from vendors listed on Drovo.</P>
        <UL items={[
          <>{strong('Customers')} should check the items, prices, delivery address and phone number before confirming an order. Placing an order is an offer to buy from the vendor. The order is only accepted when the vendor accepts it.</>,
          <>{strong('Food vendors')} must prepare each order as it was placed, keep their kitchen and packaging clean and safe, only sell food that is fresh and fit to eat, and tell customers about important details such as common allergens where they know of them. Vendors must follow all food safety and licensing rules that apply to them in Nigeria.</>,
          <>{strong('If a vendor can’t fulfil an order')} (for example, an item has run out), they should cancel it promptly so the customer can be refunded and order elsewhere. Please don’t leave customers waiting.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'fashion',
    title: 'Fashion marketplace',
    body: (
      <>
        <UL items={[
          'Fashion sellers must describe their products honestly: the correct size, colour, material, condition, price and availability, with photos that actually show the product they will send.',
          'Sellers must only sell items they are allowed to sell. Fake or imitation branded goods and stolen goods are not allowed.',
          'Once a seller accepts an order, they must fulfil it. If they can’t, they must cancel it so the customer is refunded.',
          'Customers should read the product details and choose the size, colour and options carefully before ordering. If something arrives damaged, wrong or not as described, report it through the app as soon as you can (see “Cancellations, refunds and problems”).',
        ]} />
      </>
    ),
  },
  {
    id: 'property',
    title: 'Property listings and viewings',
    body: (
      <>
        <P>
          Property owners and agents can advertise properties on Drovo, and interested people can send enquiries or request a
          viewing. Drovo only provides the place to advertise and get in touch.
        </P>
        <UL items={[
          'Owners and agents must give true, complete information about each property, including price, location, size and condition, and use real photos.',
          'You must only advertise a property if you own it or are properly authorised to represent it. Listing a property you have no right to is a serious breach and may be reported to the authorities.',
          'Drovo is not a party to any sale, rent or lease between you and another user, and we don’t inspect, verify or guarantee any property or the people behind a listing.',
          'If you are interested in a property, check the important details yourself before you commit: ownership documents, the person’s identity and authority, the real condition of the property, and the legal paperwork. Take advice from a lawyer or surveyor for any serious transaction.',
          'Please be careful about paying money to anyone you haven’t verified. If a listing or a person seems suspicious, report it to us.',
        ]} />
      </>
    ),
  },
  {
    id: 'delivery',
    title: 'Delivery and riders',
    body: (
      <>
        <H3>For customers</H3>
        <UL items={[
          'Give an accurate delivery address and a phone number you will answer. Drop your pin on the map so the rider can find you. Delays or failed deliveries caused by wrong details are on you.',
          'Be available to receive your order. If a rider can’t reach you or can’t deliver after a reasonable wait, the order may be closed and you may not be entitled to a refund for it.',
          'When your order arrives, please check it and confirm that you received it in the app. This lets the rider be paid. If something is missing or wrong, tell us before you confirm, or straight after.',
          'Delivery fees depend on the distance and are shown at checkout before you pay.',
        ]} />

        <H3>For riders</H3>
        <UL items={[
          'Handle every order with care. Never open, tamper with, swap or keep any part of an order.',
          'Deliver to the address on the order, treat customers and vendors with respect, and follow the delivery steps in the app (picked up, on the way, delivered).',
          'Keep your location sharing on while you are online or on a delivery, so the customer can follow the order and we can match you with nearby jobs.',
          'Follow all traffic and road safety laws, and hold any licence or papers the law requires for your vehicle. You are responsible for your own vehicle, fuel and safety.',
          'Do not carry anything that is on our prohibited list. If you think an order contains something it shouldn’t, don’t deliver it, and report it to us.',
          'Cash-on-delivery money belongs to Drovo and the vendor. You must pay it back to Drovo as the app asks, and we may deduct what you owe from your earnings or restrict your account until it’s settled.',
          'You may decline or release a job in line with the app’s rules, but please do it early and don’t leave an order stuck.',
        ]} />
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Prices, fees and payments',
    body: (
      <>
        <UL items={[
          'All prices are shown in Naira. The total you will pay, including the delivery fee, is shown at checkout before you confirm.',
          'You can pay by debit card or by bank transfer through Paystack, our payment partner, or choose cash on delivery where it is offered. Online payments are processed by Paystack, not by Drovo, and your card details never reach our servers.',
          'For bank transfers, you will be given a transfer account number that belongs to you. Please send the full amount of your order. If you send less, your order will not be marked as paid. If you send more, tell us, and we will deal with the difference.',
          'If a price changes before you pay, we will show you the new price and ask you to accept it before you go on.',
          'Where the amount you pay does not match your order, we may hold the order, ask you to pay the balance, or refund you.',
        ]} />
        <Note>
          Don’t pay anyone outside the Drovo platform for something you ordered on Drovo, and never share a payment code or
          password with anyone claiming to be from Drovo. We won’t ask for it.
        </Note>
      </>
    ),
  },
  {
    id: 'earnings',
    title: 'Vendor and rider earnings',
    body: (
      <>
        <UL items={[
          <>{strong('Vendors:')} Drovo charges a commission, currently {VENDOR_COMMISSION} of the item subtotal of each completed order. The rest of the item subtotal is what the vendor earns.</>,
          <>{strong('Riders:')} riders receive the delivery fee for their deliveries, less anything they owe Drovo (such as cash collected on delivery that hasn’t been paid back).</>,
          'Earnings are counted once an order is completed. Orders that are cancelled, refunded or in dispute don’t count, or may be taken back from your balance.',
          'Drovo pays vendors and riders to the bank account they have added and verified on their account. Please make sure those details are correct. A minimum payout amount may apply, and we decide when payouts are made.',
          'We may delay, hold or reduce a payout where we reasonably suspect fraud, where a refund or complaint is being looked into, or where you owe Drovo money.',
          'We may change our commission or fees. We’ll tell you in advance, and a change will only apply to orders placed after it takes effect.',
          'You are responsible for any tax that applies to what you earn through Drovo.',
        ]} />
      </>
    ),
  },
  {
    id: 'cancellations',
    title: 'Cancellations, refunds and problems with an order',
    body: (
      <>
        <P>Things go wrong sometimes. Here is how we handle it.</P>
        <UL items={[
          <>{strong('Cancelling an order:')} you can cancel before the vendor starts working on it. Once the vendor has accepted and is preparing your order, cancelling may no longer be possible, or may only be partly possible. If you need to cancel late, contact support and we’ll look at what’s fair.</>,
          <>{strong('If a vendor cancels')} a paid order, the customer is refunded in full. A cancelled order is shown on your orders page, with the reason given.</>,
          <>{strong('If an order is not delivered, is wrong, or arrives damaged or unsafe,')} report it in the app or email us as soon as you can, and don’t throw the order away or tamper with it. We’ll look into it with the vendor and the rider and, where it’s right to, refund you in full or in part.</>,
          <>{strong('How refunds are paid:')} refunds go back to the way you paid. How quickly the money shows up depends on your bank and the payment processor, and can take a few working days.</>,
          <>{strong('When a refund isn’t due:')} for example, where an order was made correctly and delivered as described, where you weren’t available to receive it, or where you gave a wrong address.</>,
          <>{strong('Property viewings:')} if you can’t attend, cancel the viewing request in good time so the owner or agent isn’t kept waiting.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'prohibited-items',
    title: 'What you can’t sell, order or deliver',
    body: (
      <>
        <P>
          To keep everyone safe, and to stay within the law, some things are not allowed on Drovo at all. This applies to every
          customer, vendor and rider, in every category. Nobody may list, sell, buy, order or deliver the following through Drovo:
        </P>
        <Rules>
          <Rule title="Illegal drugs and medicines" items={[
            'Narcotics and illegal drugs, including cannabis products',
            'Prescription-only medicines without a valid prescription',
            'Fake, counterfeit or expired medicines',
            'Any substance banned by the NDLEA',
          ]} />
          <Rule title="Weapons" items={[
            'Firearms, ammunition and parts',
            'Explosives and fireworks',
            'Tasers, stun guns and pepper spray',
            'Knives or machetes not meant for ordinary household use',
          ]} />
          <Rule title="Hazardous materials" items={[
            'Toxic, corrosive or radioactive substances',
            'Flammable liquids and gases',
            'Industrial chemicals and hazardous waste',
            'Biohazardous materials',
          ]} />
          <Rule title="Fake, stolen and illegal goods" items={[
            'Counterfeit or imitation branded products',
            'Pirated films, music, software or publications',
            'Stolen or smuggled goods',
            'Anything that breaks someone’s intellectual property rights',
          ]} />
          <Rule title="People and animals" items={[
            'Human organs, blood or body parts',
            'Live animals, unless we have approved it',
            'Endangered species and wildlife products',
            'Ivory, trophies and anything banned by wildlife laws',
          ]} />
          <Rule title="Adult and obscene material" items={[
            'Pornography and sexually explicit material',
            'Obscene publications or media',
            'Adult products the law doesn’t allow',
          ]} />
          <Rule title="Fraud and forgery" items={[
            'Counterfeit money and forged documents',
            'Fake identification',
            'Bank cards that don’t belong to the buyer',
            'Anything used for unlawful financial activity',
          ]} />
          <Rule title="Unsafe, expired or recalled items" items={[
            'Expired or adulterated food',
            'Recalled products',
            'Anything that poses a health or safety risk',
            'Perishable items that can’t be safely delivered',
          ]} />
          <Rule title="High-risk items" items={[
            'Precious metals, gemstones and bullion',
            'Large amounts of cash',
            'Lottery tickets where they are prohibited',
            'High-value collectibles needing special transport',
          ]} />
          <Rule title="Official materials" items={[
            'Government-issued ID documents',
            'Official stamps and seals',
            'Election materials',
            'Restricted government property',
          ]} />
        </Rules>
        <P>
          Anything else that is against Nigerian law, including items on the Nigeria Customs Service list of prohibited and
          restricted goods, or that we reasonably suspect is illegal, fake, fraudulent or unsafe, is also not allowed. We may also
          refuse an item that isn’t on this list if we decide it is too risky or can’t be handled safely on our platform.
        </P>
      </>
    ),
  },
  {
    id: 'category-rules',
    title: 'Extra rules for each category',
    body: (
      <>
        <H3>Food vendors</H3>
        <Rules>
          <Rule title="Not allowed" items={[
            'Food that is expired, spoiled or badly stored',
            'Food sold under a false description',
            'Watered-down or fake oils, spices and other ingredients',
            'Meat from protected or endangered animals',
            'Hiding something serious in a dish, such as a major allergen you know about',
          ]} />
        </Rules>

        <H3>Fashion sellers</H3>
        <Rules>
          <Rule title="Not allowed" items={[
            'Fake or imitation branded clothing, shoes and accessories',
            'Stolen goods',
            'Photos taken from other sellers or websites',
            'Items made from ivory or protected animals',
            'Items sold as new that are used or damaged, without saying so',
          ]} />
        </Rules>

        <H3>Property owners and agents</H3>
        <Rules>
          <Rule title="Not allowed" items={[
            'Listing a property you don’t own or aren’t authorised to represent',
            'Fake, copied or misleading photos and prices',
            'Forged ownership or title documents',
            'Asking people to send money before a genuine viewing or agreement',
            'Advertisements that unfairly discriminate against people',
          ]} />
        </Rules>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'How we expect everyone to behave',
    body: (
      <>
        <P>Use Drovo for what it is meant for, and play fair. You must not:</P>
        <UL items={[
          'Break any law or regulation, or use Drovo to help someone else do so.',
          'Commit fraud, give false information, or pretend to be someone else.',
          'Harass, threaten, insult or discriminate against customers, vendors, riders or our staff.',
          'Post misleading adverts, fake reviews, or fake orders (including placing orders you don’t mean to take).',
          'Try to get a refund or payout you aren’t entitled to, or misuse promotions or offers.',
          'Attack or interfere with the Platform: for example by hacking, scraping, overloading it, trying to get around its limits or security, or copying, reverse engineering or trying to take apart our software.',
          'Use Drovo for business purposes we haven’t agreed to, such as reselling our service.',
        ]} />
      </>
    ),
  },
  {
    id: 'content',
    title: 'Reviews and what you post',
    body: (
      <>
        <P>
          Vendors upload product photos, descriptions, logos and more. Customers leave reviews and ratings. You keep ownership of
          what you post, but by posting it on Drovo you give us permission to show, store and promote it on the Platform so that
          we can run the service. You promise that you own it or have the right to use it, and that it doesn’t break anyone else’s
          rights or the law.
        </P>
        <P>
          Reviews should be honest and based on a real experience. We may remove content that is fake, abusive, unlawful or
          against these terms.
        </P>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Our intellectual property',
    body: (
      <>
        <P>
          The Drovo name, logo, design, software and everything else we create belongs to us or our licensors and is protected by
          Nigerian law. You can use the Platform for your own personal use, but you can’t copy, sell, modify or reuse any part of
          it without our written permission.
        </P>
        <P>
          If you think something on Drovo breaks your rights, email {mail} with the details and we’ll look into it promptly.
        </P>
      </>
    ),
  },
  {
    id: 'suspension',
    title: 'When we can limit or close an account',
    body: (
      <>
        <P>
          We would rather help you fix a problem than close your account. But where there is reasonable evidence of fraud, serious
          misconduct, or a breach of these terms or our policies, we may act. Depending on how serious it is, we may take some or
          all of these steps:
        </P>
        <ol className="space-y-4 mb-5">
          <Step n={1} title="Remove the listing or content" text="Anything that breaks the rules comes down straight away." />
          <Step n={2} title="Send a warning" text="For a first, less serious breach, we’ll tell you in writing what went wrong." />
          <Step n={3} title="Suspend the account" text="For repeated or serious breaches, we may pause your account while we look into it. Payouts may be held in the meantime." />
          <Step n={4} title="Close the account permanently" text="For the most serious cases, like selling banned items, fraud or putting people in danger, we may close it for good and stop you from signing up again." />
          <Step n={5} title="Involve the authorities" text="Where the law requires it, or where someone may have been harmed, we may report the matter to the police or the relevant regulator, and take legal action." />
        </ol>
        <P>
          We may suspend an account straight away, without a warning, if it’s needed to keep people safe or stop a fraud. If you
          think we have made a mistake, write to us and we’ll review it fairly. Where the law gives you rights in this situation,
          those rights stay intact.
        </P>
      </>
    ),
  },
  {
    id: 'complaints',
    title: 'Complaints and disputes',
    body: (
      <>
        <P>
          If something goes wrong, tell us first. You can report a problem through the app, or email {mail}. Please include your
          order number and a short description of what happened, and photos if they help.
        </P>
        <P>
          We’ll look at what everyone involved says and work towards a fair outcome. Disagreements between a customer and a vendor
          or rider are mainly between them, but we will help where we can and we may decide on refunds or payouts for orders made
          through our platform.
        </P>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Our responsibility to you',
    body: (
      <>
        <P>
          We try hard to keep Drovo working, but we can’t promise it will always be available, fast, or free of errors. We provide
          the Platform “as is” and “as available”. We are not responsible for the quality, safety, legality or accuracy of what
          vendors sell, for the conduct of vendors, riders or other users, or for delays or interruptions we can’t reasonably control,
          such as network problems, power cuts or the failure of a payment or mapping service.
        </P>
        <P>
          To the extent the law allows, Drovo is not liable for indirect or knock-on losses, such as lost profit or lost business,
          or for loss caused by someone using your account because you didn’t keep your login details safe. For any other loss, our
          responsibility is limited to the amount you paid for the order that the claim is about.
        </P>
        <Note>
          None of this takes away rights you have under Nigerian law that can’t be limited, such as responsibility for death or
          personal injury caused by our negligence, or for fraud. Nothing in these terms is meant to remove your consumer rights.
        </Note>
        <P>
          You agree to cover Drovo for losses and claims that result from your breach of these terms, your breach of the law, or
          your misuse of the Platform or of what is delivered through it.
        </P>
      </>
    ),
  },
  {
    id: 'electronic',
    title: 'Communicating electronically',
    body: (
      <P>
        By using Drovo you agree that we can send you notices, receipts and other messages electronically: by email, in the app, or
        by push notification. These count as written communication. You also agree that electronic records, confirmations and
        signatures, such as accepting an order or these terms by tapping a button, are valid.
      </P>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <>
        <P>
          Drovo will keep changing, and so may these terms. When we make a change that matters, we’ll let you know in the app or by
          email, and we’ll update the date at the top of this page. If you keep using Drovo after a change takes effect, you accept
          the new terms. If you don’t agree, you can close your account.
        </P>
        <P>
          These terms start the day you begin using Drovo and last until you or we close your account. Sections that are meant to
          carry on afterwards, like those on payments owed, liability and disputes, will continue to apply.
        </P>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and the small print',
    body: (
      <>
        <P>
          These terms are governed by the laws of Nigeria. If we can’t sort out a dispute by talking, the Nigerian courts have
          exclusive jurisdiction.
        </P>
        <P>
          If a court decides that part of these terms isn’t valid or can’t be enforced, that part will be removed and the rest will
          stay in force. If we don’t enforce a rule straight away, it doesn’t mean we’ve given it up. These terms, together with
          our Privacy Policy, are the whole agreement between you and Drovo about using the Platform.
        </P>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <>
        <P>Need help, want to report a problem, or have a question about these terms? Reach our support team here:</P>
        <UL items={[
          <>Email: {mail}</>,
          <>You can also report an order problem from your orders page in the app.</>,
        ]} />
        <P>By using Drovo, you confirm that you have read these terms and that you agree to them.</P>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      variant="terms"
      title="Terms of Use"
      updated={UPDATED}
      intro="We know nobody loves reading terms and conditions, but these ones matter. They explain how Drovo works, what you can expect from us, and what we expect from you, whether you are ordering, selling or delivering. Please take a few minutes to read them."
      summary={[
        'Drovo is a marketplace: vendors and riders are independent, and we provide the platform.',
        'You must be 18 or over and give us true information.',
        'Pay through Drovo only, and check your order before you confirm it.',
        'If something goes wrong, tell us quickly and we will help put it right.',
        'Some items are banned for everyone, and breaking the rules can end your account.',
      ]}
      sections={sections}
      other={{ href: '/privacy', label: 'Privacy Policy' }}
      contactEmail={EMAIL}
    />
  );
}