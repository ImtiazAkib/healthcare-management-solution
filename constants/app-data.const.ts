export const APP_DATA = {
  NAME: 'CareSync',
  SHORT_NAME: 'CareSync',
  TAGLINE: 'One record. Every clinician.',
  DESCRIPTION:
    'A unified healthcare management platform: patient records, appointments and queueing, prescriptions, diagnostics and billing in one place, with role-based dashboards for administrators, doctors, nurses, diagnostic staff and patients.',
  LOGO: {
    IMAGE_ALT: 'CareSync logo',
  },
  /*
    One facility in one country, so the app names its currency rather than carrying a table of
    them. `MINOR_UNIT_DIGITS` is the exponent every money helper works in: money is stored as
    an integer count of minor units (paisa), and `2` is what turns 50050 back into ৳500.50.
  */
  CURRENCY: {
    CODE: 'BDT',
    SYMBOL: '৳',
    MINOR_UNIT_DIGITS: 2,
  },
} as const;
