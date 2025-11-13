import * as Handlebars from 'handlebars';

Handlebars.registerHelper('formatDate', function (date: Date, format?: string) {
  if (!date) return '';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (format === 'short') {
    options.month = 'short';
  } else if (format === 'time') {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Date(date).toLocaleDateString('pt-BR', options);
});

Handlebars.registerHelper(
  'ifEquals',
  function (arg1: unknown, arg2: unknown, options: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  },
);

Handlebars.registerHelper('capitalize', function (str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
});

Handlebars.registerHelper('currency', function (value: number) {
  if (typeof value !== 'number') return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
});

Handlebars.registerHelper(
  'pluralize',
  function (count: number, singular: string, plural: string) {
    return count === 1 ? singular : plural;
  },
);

Handlebars.registerHelper('currentYear', function () {
  return new Date().getFullYear();
});

export default Handlebars;
