import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Redirect non-www to www with HTTPS (SEO: canonical domain, single redirect)
  if (url.hostname === 'minoanmystery.org') {
    url.hostname = 'www.minoanmystery.org';
    url.protocol = 'https:';
    return context.redirect(url.toString(), 301);
  }

  return next();
});
