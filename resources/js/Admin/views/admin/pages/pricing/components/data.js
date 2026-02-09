export const pricingPlanData = [{
  name: 'Starter Plan',
  subtitle: 'Best for freelancers and personal use',
  price: '$9',
  duration: 'monthly',
  planInfo: '1 project included',
  buttonText: 'Choose Starter',
  href: '',
  buttonClassName: 'btn-outline-primary',
  features: [{
    title: '1 active project',
    included: true
  }, {
    title: 'Access to all components',
    included: true
  }, {
    title: 'Email support',
    included: true
  }, {
    title: 'No team collaboration',
    included: false
  }, {
    title: 'No SaaS rights',
    included: false
  }]
}, {
  name: 'Professional',
  subtitle: 'Ideal for small teams and startups',
  price: '$29',
  duration: 'monthly',
  planInfo: 'Up to 5 projects',
  buttonText: 'Choose Professional',
  href: '',
  buttonClassName: 'btn-light',
  features: [{
    title: '5 active projects',
    included: true
  }, {
    title: 'Component + plugin access',
    included: true
  }, {
    title: 'Team collaboration',
    included: true
  }, {
    title: 'Priority email support',
    included: true
  }, {
    title: 'No resale rights',
    included: false
  }],
  isPopular: true
}, {
  name: 'Business',
  subtitle: 'For agencies and large teams',
  price: '$79',
  duration: 'monthly',
  planInfo: 'Unlimited projects',
  buttonText: 'Choose Business',
  href: '',
  buttonClassName: 'btn-dark',
  features: [{
    title: 'Unlimited projects',
    included: true
  }, {
    title: 'SaaS & client projects allowed',
    included: true
  }, {
    title: 'All premium components',
    included: true
  }, {
    title: 'Priority support',
    included: true
  }, {
    title: 'Team management tools',
    included: true
  }]
}, {
  name: 'Enterprise',
  subtitle: 'Custom plan for enterprises & high-scale use',
  price: 'Contact Us',
  duration: 'monthly',
  planInfo: 'Based on usage & team size',
  buttonText: 'Contact Sales',
  href: 'mailto:sales@example.com',
  buttonClassName: 'btn-outline-dark',
  features: [{
    title: 'Unlimited users & usage',
    included: true
  }, {
    title: 'White-label license',
    included: true
  }, {
    title: 'Custom integrations',
    included: true
  }, {
    title: 'SLA + NDA agreements',
    included: true
  }, {
    title: 'Dedicated manager & support',
    included: true
  }]
}];