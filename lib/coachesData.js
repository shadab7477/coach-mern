const CATEGORIES_DATA = [
  {
    id: 'health-wellness',
    slug: 'health-coach',
    name: 'Health Coach',
    tagline: 'Build sustainable vitality, nutrition & stress resilience',
    description: 'Transform your daily habits, improve sleep, manage chronic stress, and achieve lasting energy with certified lifestyle medicine and wellness guides.',
    iconName: 'HeartPulse',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    coachCount: 420,
    specialties: ['Holistic Nutrition', 'Stress & Burnout', 'Sleep Optimization', 'Habit Change', 'Gut Health'],
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'fitness-sports',
    slug: 'fitness-coach',
    name: 'Fitness Coach',
    tagline: 'Custom workouts, athletic conditioning & strength',
    description: 'Crush your physical fitness milestones with customized training routines, form correction, mobility work, and athletic conditioning.',
    iconName: 'Dumbbell',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    coachCount: 580,
    specialties: ['Strength & Hypertrophy', 'Functional Mobility', 'Weight Loss', 'Marathon & Endurance', 'Yoga & Posture'],
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'business',
    slug: 'business-coach',
    name: 'Business Coach',
    tagline: 'Scale operations, streamline revenue & build leadership',
    description: 'Scale your startup or SME with proven strategy, operational frameworks, cash-flow discipline, and founder accountability.',
    iconName: 'Briefcase',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    coachCount: 650,
    specialties: ['Startup Growth', 'Sales Systems', 'Operations & SOPs', 'Fundraising Prep', 'Team Delegation'],
    color: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'life',
    slug: 'life-coach',
    name: 'Life Coach',
    tagline: 'Clarity, self-confidence & personal purpose',
    description: 'Uncover clarity of direction, dismantle imposter syndrome, design fulfilling life routines, and conquer major life crossroads.',
    iconName: 'Sparkles',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    coachCount: 710,
    specialties: ['Goal Setting', 'Self-Esteem', 'Work-Life Harmony', 'Mindset Reset', 'Life Transitions'],
    color: 'from-rose-500 to-pink-600'
  },
  {
    id: 'career',
    slug: 'career-coach',
    name: 'Career Coach',
    tagline: 'Resume mastery, salary negotiations & promotions',
    description: 'Position yourself for career leaps, executive placements, interview brilliance, and confident salary negotiations.',
    iconName: 'TrendingUp',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    coachCount: 490,
    specialties: ['Executive Job Search', 'Interview Mastery', 'Resume & LinkedIn', 'Salary Negotiation', 'Career Pivot'],
    color: 'from-purple-600 to-indigo-600'
  },
  {
    id: 'financial',
    slug: 'financial-coach',
    name: 'Financial Coach',
    tagline: 'Budgeting systems, debt elimination & money mindset',
    description: 'Master your financial psychology, organize your cash flows, build emergency stability, and create wealthy money habits.',
    iconName: 'Coins',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    coachCount: 290,
    specialties: ['Debt-Free Strategy', 'Cash Flow Systems', 'Early Retirement Prep', 'Couples Finance', 'Money Mindset'],
    color: 'from-emerald-600 to-green-700'
  },
  {
    id: 'relationship',
    slug: 'relationship-coach',
    name: 'Relationship Coach',
    tagline: 'Healthy communication, dating & family dynamics',
    description: 'Develop deep emotional intelligence, strengthen partnership communication, navigate dating hurdles, and foster secure attachments.',
    iconName: 'HeartHandshake',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    coachCount: 310,
    specialties: ['Conflict Resolution', 'Couples Alignment', 'Conscious Dating', 'Family Dynamics', 'Emotional Safety'],
    color: 'from-red-500 to-rose-600'
  },
  {
    id: 'wellness',
    slug: 'wellness-coach',
    name: 'Wellness Coach',
    tagline: 'Mindfulness, emotional resilience & conscious living',
    description: 'Integrate breathwork, nervous system regulation, meditation, and daily mindful rituals for balanced living.',
    iconName: 'Leaf',
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80',
    coachCount: 240,
    specialties: ['Mindfulness & Meditation', 'Breathwork', 'Emotional Resilience', 'Digital Detox', 'Spiritual Alignment'],
    color: 'from-teal-500 to-cyan-600'
  }
];

const INITIAL_COACHES = [];

const TESTIMONIALS_DATA = [
  {
    id: 'test-1',
    name: 'Deepak Sharma',
    role: 'VP of Product at FinTech unicorn',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    coachName: 'Vikram Singh',
    coachCategory: 'Career Coach',
    content: 'CoachConnect removed all the guesswork from finding an authentic mentor. Within 2 months with Vikram, I transitioned from Senior PM to VP of Product with a 50% compensation increase. The verified credentials gave me 100% peace of mind.',
    rating: 5
  },
  {
    id: 'test-2',
    name: 'Aishwarya Roy',
    role: 'Founder, EcoBloom Studio',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    coachName: 'Rohit Mehta',
    coachCategory: 'Business Coach',
    content: 'Our revenue was completely stagnant for 9 months. Rohit provided an operational SOP checklist that allowed me to delegate our client onboarding. Our sales pipeline expanded 3x in 60 days. Highly recommend!',
    rating: 5
  },
  {
    id: 'test-3',
    name: 'Suresh Menon',
    role: 'Architect & Marathon Runner',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    coachName: 'Dr. Neha Sharma',
    coachCategory: 'Health Coach',
    content: 'Dr. Neha helped identify my chronic gut inflammation that was derailing my sleep and endurance training. I ran my personal best marathon time last month completely pain free.',
    rating: 5
  }
];

const FAQ_ITEMS = [
  {
    question: 'How are coaches verified on CoachConnect?',
    answer: 'Every coach submits primary identity documentation, verified academic degrees, and professional coaching credentials (e.g. ICF, NBHWC, NASM, CFA). Our moderation team manually audits all certificates before granting the Verified Coach badge.'
  },
  {
    question: 'How does session booking work?',
    answer: 'You can explore coach profiles, review their pricing and packages, and click "Book Session". Choose your preferred date and slot from the coach’s real-time calendar, complete the booking details, and receive an instant calendar invite and video link.'
  },
  {
    question: 'Can I do a free discovery call first?',
    answer: 'Yes! Many of our certified coaches offer a complimentary 20–30 minute discovery call so you can discuss your goals, ask questions, and ensure you have great chemistry before committing to a paid package.'
  },
  {
    question: 'What is the cancellation and rescheduling policy?',
    answer: 'You can reschedule or cancel any session with full refund up to 24 hours prior to the scheduled start time directly from your Client Dashboard. Emergency rescheduling is handled flexibly with your coach.'
  },
  {
    question: 'Are sessions conducted online or in person?',
    answer: 'We support 100% secure online video sessions (accessible from your browser or mobile), as well as in-person or hybrid options depending on the coach and your city.'
  },
  {
    question: 'Important Notice: Coaching vs Medical / Clinical Therapy',
    answer: 'Coaching provides guidance, accountability, and goal execution. Coaching is not a substitute for clinical psychiatry, licensed psychotherapy, or regulated medical/tax advice. If you require licensed clinical care, please consult a healthcare professional.'
  }
];

module.exports = { CATEGORIES_DATA, INITIAL_COACHES };
